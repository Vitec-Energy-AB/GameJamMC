import { v4 as uuidv4 } from 'uuid';

export class SessionManager {
  private sessions: Map<string, string> = new Map();

  createSession(socketId: string): string {
    const sessionId = uuidv4();
    this.sessions.set(socketId, sessionId);
    return sessionId;
  }

  getSession(socketId: string): string | null {
    return this.sessions.get(socketId) ?? null;
  }

  removeSession(socketId: string): void {
    this.sessions.delete(socketId);
  }
}
