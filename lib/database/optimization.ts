/**
 * Database optimization utilities
 */

import connectDB from '@/lib/mongodb';
import Chat from '@/lib/models/Chat';
import { logger } from '@/lib/logger';

export interface DatabaseStats {
  collections: {
    [collectionName: string]: {
      documentCount: number;
      avgDocSize: number;
      totalSize: number;
      indexCount: number;
      indexes: Array<{
        name: string;
        size: number;
        usage: number;
      }>;
    };
  };
  totalSize: number;
  indexEfficiency: number;
}

export interface OptimizationSuggestion {
  type: 'index' | 'query' | 'schema';
  priority: 'high' | 'medium' | 'low';
  description: string;
  collection: string;
  action: string;
  estimatedImpact: string;
}

export class DatabaseOptimizer {
  /**
   * Get comprehensive database statistics
   */
  static async getDatabaseStats(): Promise<Partial<DatabaseStats>> {
    try {
      await connectDB();
      const db = Chat.db;

      // Get collection stats
      const collections = await db.listCollections().toArray();
      const stats: DatabaseStats['collections'] = {};

      for (const collection of collections) {
        try {
          const collStats = await db.command({ collStats: collection.name });
          const indexes = await db.collection(collection.name).listIndexes().toArray();

          stats[collection.name] = {
            documentCount: collStats.count || 0,
            avgDocSize: collStats.avgObjSize || 0,
            totalSize: collStats.size || 0,
            indexCount: indexes.length,
            indexes: indexes.map(idx => ({
              name: idx.name,
              size: 0, // MongoDB doesn't easily provide index size in collStats
              usage: 0, // Would need to track this separately
            })),
          };
        } catch (error) {
          logger.warn(`Failed to get stats for collection ${collection.name}`, { error });
          stats[collection.name] = {
            documentCount: 0,
            avgDocSize: 0,
            totalSize: 0,
            indexCount: 0,
            indexes: [],
          };
        }
      }

      const totalSize = Object.values(stats).reduce((sum, stat) => sum + stat.totalSize, 0);

      return {
        collections: stats,
        totalSize,
        indexEfficiency: 0.85, // Placeholder - would need real calculation
      };
    } catch (error) {
      logger.error('Failed to get database stats', error as Error);
      return {};
    }
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  static async analyzeQueryPerformance(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    try {
      await connectDB();
      
      // Check if we have compound indexes for common queries
      const chatIndexes = await Chat.collection.listIndexes().toArray();
      const indexNames = chatIndexes.map(idx => JSON.stringify(idx.key));

      // Analyze common query patterns and suggest missing indexes
      const commonQueries = [
        {
          pattern: { userId: 1, updatedAt: -1, isArchived: 1 },
          description: 'User chats sorted by last activity with archive filter',
          priority: 'high' as const,
        },
        {
          pattern: { userId: 1, 'messages.timestamp': -1 },
          description: 'User chats sorted by latest message',
          priority: 'medium' as const,
        },
        {
          pattern: { userId: 1, tags: 1, isArchived: 1 },
          description: 'Tagged chats filtering',
          priority: 'low' as const,
        },
      ];

      for (const query of commonQueries) {
        const indexKey = JSON.stringify(query.pattern);
        if (!indexNames.includes(indexKey)) {
          suggestions.push({
            type: 'index',
            priority: query.priority,
            description: `Missing index for: ${query.description}`,
            collection: 'chats',
            action: `Create compound index: ${indexKey}`,
            estimatedImpact: `${query.priority === 'high' ? '30-50%' : '10-30%'} query performance improvement`,
          });
        }
      }

      // Check for unused or redundant indexes
      const redundantIndexes = this.findRedundantIndexes(chatIndexes);
      for (const redundant of redundantIndexes) {
        suggestions.push({
          type: 'index',
          priority: 'medium',
          description: `Redundant index detected`,
          collection: 'chats',
          action: `Consider removing index: ${redundant}`,
          estimatedImpact: 'Reduced storage and faster writes',
        });
      }

      // Schema optimization suggestions
      suggestions.push({
        type: 'schema',
        priority: 'low',
        description: 'Message array size optimization',
        collection: 'chats',
        action: 'Consider implementing message pagination for chats with >100 messages',
        estimatedImpact: 'Reduced memory usage and faster document loading',
      });

      return suggestions;
    } catch (error) {
      logger.error('Failed to analyze query performance', error as Error);
      return suggestions;
    }
  }

  /**
   * Find redundant indexes
   */
  private static findRedundantIndexes(indexes: any[]): string[] {
    const redundant: string[] = [];
    
    // Simple redundancy check - more sophisticated logic could be implemented
    for (let i = 0; i < indexes.length; i++) {
      for (let j = i + 1; j < indexes.length; j++) {
        const idx1 = indexes[i];
        const idx2 = indexes[j];
        
        // Check if one index is a prefix of another
        const keys1 = Object.keys(idx1.key);
        const keys2 = Object.keys(idx2.key);
        
        if (this.isIndexPrefix(keys1, keys2)) {
          redundant.push(idx1.name);
        } else if (this.isIndexPrefix(keys2, keys1)) {
          redundant.push(idx2.name);
        }
      }
    }
    
    return redundant;
  }

  /**
   * Check if one index is a prefix of another
   */
  private static isIndexPrefix(keys1: string[], keys2: string[]): boolean {
    if (keys1.length >= keys2.length) return false;
    
    for (let i = 0; i < keys1.length; i++) {
      if (keys1[i] !== keys2[i]) return false;
    }
    
    return true;
  }

  /**
   * Optimize chat document by removing old messages if too large
   */
  static async optimizeChatDocument(chatId: string, maxMessages = 200): Promise<boolean> {
    try {
      await connectDB();
      
      const chat = await Chat.findOne({ id: chatId });
      if (!chat || !chat.messages || chat.messages.length <= maxMessages) {
        return false; // No optimization needed
      }

      // Keep only the most recent messages
      const recentMessages = chat.messages.slice(-maxMessages);
      
      await Chat.updateOne(
        { id: chatId },
        { 
          $set: { 
            messages: recentMessages,
            'metadata.optimizedAt': new Date(),
            'metadata.originalMessageCount': chat.messages.length
          }
        }
      );

      logger.info('Chat document optimized', { 
        chatId, 
        originalCount: chat.messages.length, 
        newCount: recentMessages.length 
      });

      return true;
    } catch (error) {
      logger.error('Failed to optimize chat document', error as Error, { chatId });
      return false;
    }
  }

  /**
   * Clean up old archived chats
   */
  static async cleanupOldArchivedChats(daysOld = 365): Promise<number> {
    try {
      await connectDB();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Chat.deleteMany({
        isArchived: true,
        updatedAt: { $lt: cutoffDate }
      });

      logger.info('Old archived chats cleaned up', { 
        deletedCount: result.deletedCount,
        cutoffDate 
      });

      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Failed to cleanup old archived chats', error as Error);
      return 0;
    }
  }

  /**
   * Get slow query recommendations
   */
  static async getSlowQueryRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      // These would be based on actual profiling data in production
      recommendations.push('Consider using projection to limit returned fields in chat list queries');
      recommendations.push('Implement cursor-based pagination instead of skip/limit for large datasets');
      recommendations.push('Use aggregation pipelines for complex chat statistics');
      recommendations.push('Consider read preferences for non-critical queries');
      
      return recommendations;
    } catch (error) {
      logger.error('Failed to get slow query recommendations', error as Error);
      return recommendations;
    }
  }
}

/**
 * Utility function to run database optimization
 */
export async function runDatabaseOptimization(): Promise<{
  stats: Partial<DatabaseStats>;
  suggestions: OptimizationSuggestion[];
  recommendations: string[];
}> {
  const [stats, suggestions, recommendations] = await Promise.all([
    DatabaseOptimizer.getDatabaseStats(),
    DatabaseOptimizer.analyzeQueryPerformance(),
    DatabaseOptimizer.getSlowQueryRecommendations(),
  ]);

  return {
    stats,
    suggestions,
    recommendations,
  };
}