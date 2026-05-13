import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../env.js';

interface OperationLogEntry {
  type: 'replace';
  position: number;
  text: string;
  userId: string;
  version: number;
  timestamp: number;
}

interface OperationMessage {
  type: 'operation';
  opType?: 'replace';
  content?: string;
  version?: number;
}

interface UserSession {
  userId: string;
  ws: WebSocket;
  color: string;
  username: string;
}

const USER_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

export class CollaborationRoom extends DurableObject {
  private sessions: Map<string, UserSession>;
  private documentContent: string;
  private version: number;
  private operations: OperationLogEntry[];

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();
    this.documentContent = '';
    this.version = 0;
    this.operations = [];

    // Restore state from storage on wake
    void ctx.blockConcurrencyWhile(async () => {
      const content = await ctx.storage.get<string>('content');
      if (content !== undefined) this.documentContent = content;

      const version = await ctx.storage.get<number>('version');
      if (version !== undefined) this.version = version;

      const ops = await ctx.storage.get<OperationLogEntry[]>('operations');
      if (ops !== undefined) this.operations = ops;
    });
  }

  // HTTP endpoint — WebSocket upgrade
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'anonymous';
    const username = url.searchParams.get('username') || 'Anonymous';

    if (request.headers.get('Upgrade') !== 'websocket') {
      // REST endpoint: get document state
      if (request.method === 'GET') {
        return new Response(
          JSON.stringify({
            content: this.documentContent,
            version: this.version,
            activeUsers: this.sessions.size,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    // Store session info on the accepted WebSocket
    const colorIdx = this.sessions.size % USER_COLORS.length;
    const session: UserSession = {
      userId,
      ws: server,
      color: USER_COLORS[colorIdx],
      username,
    };
    this.sessions.set(userId, session);

    this.broadcastUserList();
    this.sendState(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    try {
      const msg = JSON.parse(message) as OperationMessage;
      if (msg.type !== 'operation') return;

      const sender = this.findSessionByWs(ws);
      if (!sender) return;

      if (msg.version !== this.version) {
        ws.send(
          JSON.stringify({
            type: 'conflict',
            currentVersion: this.version,
            content: this.documentContent,
            message: 'Document has been modified. Reload content.',
          })
        );
        return;
      }

      const op: OperationLogEntry = {
        type: 'replace',
        position: 0,
        text: msg.content || '',
        userId: sender.userId,
        version: this.version,
        timestamp: Date.now(),
      };

      this.applyOperation(op);
      this.operations.push(op);

      if (this.operations.length > 500) {
        this.operations = this.operations.slice(-500);
      }

      this.broadcastOperation(op);
      await this.ctx.storage.setAlarm(Date.now() + 30000);
    } catch (err) {
      console.error('CollabRoom message error:', err);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const session = this.findSessionByWs(ws);
    if (session) {
      this.sessions.delete(session.userId);
      this.broadcastUserList();
    }
  }

  async webSocketError(_ws: WebSocket, err: unknown): Promise<void> {
    console.error('CollabRoom WebSocket error:', err);
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.put('content', this.documentContent);
    await this.ctx.storage.put('version', this.version);
    await this.ctx.storage.put('operations', this.operations.slice(-200));

    if (this.sessions.size > 0) {
      await this.ctx.storage.setAlarm(Date.now() + 30000);
    }

    if (this.sessions.size === 0) {
      const lastOp = this.operations[this.operations.length - 1];
      if (lastOp && Date.now() - lastOp.timestamp > 3600000) {
        await this.ctx.storage.deleteAll();
      }
    }
  }

  // ==============================
  // Private helpers
  // ==============================

  private applyOperation(op: OperationLogEntry): void {
    if (op.type === 'replace') {
      this.documentContent = op.text;
      this.version++;
    }
  }

  private broadcastOperation(op: OperationLogEntry): void {
    const msg = JSON.stringify({
      type: 'operation',
      content: op.text,
      userId: op.userId,
      version: op.version,
      currentVersion: this.version,
      timestamp: op.timestamp,
    });

    for (const session of this.sessions.values()) {
      try {
        session.ws.send(msg);
      } catch {
        // Session may be dead
      }
    }
  }

  private sendState(ws: WebSocket): void {
    ws.send(JSON.stringify({
      type: 'state',
      content: this.documentContent,
      version: this.version,
    }));
  }

  private broadcastUserList(): void {
    const users = Array.from(this.sessions.values()).map((s) => ({
      userId: s.userId,
      username: s.username,
      color: s.color,
    }));

    const msg = JSON.stringify({ type: 'users', users });

    for (const session of this.sessions.values()) {
      try {
        session.ws.send(msg);
      } catch {
        // Session may be dead
      }
    }
  }

  private findSessionByWs(ws: WebSocket): UserSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.ws === ws) return session;
    }
    return undefined;
  }
}
