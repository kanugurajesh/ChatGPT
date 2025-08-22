import { v4 as uuidv4 } from 'uuid';

interface UserSession {
  id: string;
  createdAt: Date;
  lastActive: Date;
}

class SessionManager {
  private sessions = new Map<string, UserSession>();
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get or create a user session
   */
  getOrCreateSession(): string {
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
  cleanupExpiredSessions(): void {
    const now = new Date().getTime();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if ((now - session.lastActive.getTime()) > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Clean up expired sessions periodically
if (typeof window === 'undefined') {
  // Server-side cleanup every hour
  setInterval(() => {
    sessionManager.cleanupExpiredSessions();
  }, 60 * 60 * 1000);
}