import { v4 as uuidv4 } from 'uuid';
import type { UserSession, SessionStats } from '@/types/chat';

class SessionManager {
  private sessions = new Map<string, UserSession>();
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get or create a user session
   */
  getOrCreateSession(): string {
    // Periodically check and cleanup sessions to prevent memory leaks
    this.checkAndCleanup();
    
    // For now, we'll use a simple browser-based session
    // In production, this could be enhanced with proper authentication
    if (typeof window === 'undefined') {
      // Server-side: generate a temporary session
      return this.createSession();
    }

    // Client-side: check for existing session in localStorage
    let sessionId = localStorage.getItem('chat_session_id');
    
    if (!sessionId || !this.isValidSession(sessionId)) {
      sessionId = this.createSession();
      localStorage.setItem('chat_session_id', sessionId);
    }

    this.updateLastActive(sessionId);
    return sessionId;
  }

  /**
   * Create a new session
   */
  private createSession(): string {
    const sessionId = uuidv4();
    const session: UserSession = {
      id: sessionId,
      createdAt: new Date(),
      lastActive: new Date()
    };
    
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Check if a session is valid (not expired)
   */
  private isValidSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const now = new Date().getTime();
    const lastActive = session.lastActive.getTime();
    
    return (now - lastActive) < this.SESSION_TIMEOUT;
  }

  /**
   * Update last active timestamp for a session
   */
  private updateLastActive(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActive = new Date();
    }
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = new Date().getTime();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if ((now - session.lastActive.getTime()) > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): SessionStats {
    const now = new Date().getTime();
    let activeCount = 0;
    let expiredCount = 0;
    
    for (const session of this.sessions.values()) {
      if ((now - session.lastActive.getTime()) > this.SESSION_TIMEOUT) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }
    
    return {
      total: this.sessions.size,
      active: activeCount,
      expired: expiredCount,
    };
  }

  /**
   * Force cleanup if too many sessions are stored
   */
  private checkAndCleanup(): void {
    // Cleanup if we have too many sessions (memory management)
    if (this.sessions.size > 1000) {
      const cleaned = this.cleanupExpiredSessions();
      console.log(`Session cleanup: removed ${cleaned} expired sessions`);
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Note: Automatic cleanup is removed to prevent memory leaks in server environments.
// In production, consider implementing cleanup via a separate cron job or scheduled task.
// For development, cleanup can be called manually when needed.