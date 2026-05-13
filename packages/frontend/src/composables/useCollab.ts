import { ref, onUnmounted } from 'vue';
import { BASE_URL } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';

interface CollabUser {
  userId: string;
  username: string;
  color: string;
}

interface CollabMessage {
  type: 'users' | 'state' | 'operation' | 'conflict';
  users?: CollabUser[];
  content?: string;
  currentVersion?: number;
  version?: number;
  message?: string;
}

export function useCollab(fileId: string, onContent?: (content: string) => void, onConflict?: (message: string) => void) {
  const connected = ref(false);
  const users = ref<CollabUser[]>([]);
  const version = ref(0);
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function wsUrl(): string | null {
    const auth = useAuthStore();
    if (!auth.token) return null;

    const apiBase = new URL(BASE_URL, window.location.origin);
    apiBase.protocol = apiBase.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${apiBase.origin}${apiBase.pathname}/collab/ws/${fileId}?token=${encodeURIComponent(auth.token)}`;
  }

  function connect(): void {
    const url = wsUrl();
    if (!url) return;

    ws = new WebSocket(url);

    ws.onopen = () => {
      connected.value = true;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as CollabMessage;
        switch (msg.type) {
          case 'users':
            users.value = msg.users || [];
            break;
          case 'state':
            version.value = msg.version || 0;
            if (msg.content !== undefined) onContent?.(msg.content);
            break;
          case 'operation':
            version.value = msg.currentVersion || version.value;
            if (msg.content !== undefined) onContent?.(msg.content);
            break;
          case 'conflict':
            version.value = msg.currentVersion || version.value;
            if (msg.content !== undefined) onContent?.(msg.content);
            onConflict?.(msg.message || 'Collaboration conflict');
            break;
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      connected.value = false;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  function disconnect(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    ws?.close();
    ws = null;
    connected.value = false;
    users.value = [];
  }

  function scheduleReconnect(): void {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 5000);
  }

  function sendContent(content: string): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'operation', opType: 'replace', content, version: version.value }));
    }
  }

  onUnmounted(() => {
    disconnect();
  });

  return { connected, users, version, connect, disconnect, sendContent };
}
