/**
 * Environment variable validation and configuration
 */

interface EnvironmentConfig {
  MONGODB_URI: string;
  MEM0_API_KEY?: string;
  CLERK_SECRET_KEY?: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  NODE_ENV: 'development' | 'production' | 'test';
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
}

class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private config: EnvironmentConfig | null = null;

  private constructor() {}

  static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  /**
   * Validate and get environment configuration
   */
  getConfig(): EnvironmentConfig {
    if (this.config) {
      return this.config;
    }

    const requiredVars = ['MONGODB_URI'];
    const missingVars: string[] = [];

    // Check required environment variables
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}. ` +
        `Please check your .env.local file or environment configuration.`
      );
    }

    // Validate NODE_ENV
    const nodeEnv = process.env.NODE_ENV as string;
    if (!['development', 'production', 'test'].includes(nodeEnv)) {
      console.warn(`Invalid NODE_ENV: ${nodeEnv}. Defaulting to 'development'.`);
    }

    this.config = {
      MONGODB_URI: process.env.MONGODB_URI!,
      MEM0_API_KEY: process.env.MEM0_API_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NODE_ENV: (['development', 'production', 'test'].includes(nodeEnv) 
        ? nodeEnv 
        : 'development') as 'development' | 'production' | 'test',
      GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    };

    return this.config;
  }

  /**
   * Check if a specific service is configured
   */
  isServiceConfigured(service: 'memory' | 'auth' | 'ai'): boolean {
    const config = this.getConfig();
    
    switch (service) {
      case 'memory':
        const hasMemoryKey = !!config.MEM0_API_KEY;
        if (!hasMemoryKey) {
          console.warn('Memory service not configured: MEM0_API_KEY environment variable is missing');
        }
        return hasMemoryKey;
      case 'auth':
        return !!(config.CLERK_SECRET_KEY && config.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
      case 'ai':
        return !!config.GOOGLE_GENERATIVE_AI_API_KEY;
      default:
        return false;
    }
  }

  /**
   * Get service status for debugging
   */
  getServiceStatus() {
    return {
      memory: this.isServiceConfigured('memory'),
      auth: this.isServiceConfigured('auth'),
      ai: this.isServiceConfigured('ai'),
      database: !!this.getConfig().MONGODB_URI,
    };
  }
}

// Export singleton instance
export const env = EnvironmentValidator.getInstance();

// Export types
export type { EnvironmentConfig };