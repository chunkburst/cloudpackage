import { ref, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

interface CollabUser {
  id: string;
  username: string;
  color: string;
}

interface CollabCursor {
  userId: string;
  username: string;
  x: number;
  y: number;
  color: string;
}

export function useCollab(fileId: string) {
  const connected = ref(false);
  const users = ref<CollabUser[]>([]);
  const cursors = ref<CollabCursor[]>([]);
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect(): void {
    const auth = useAuthStore();
    if (!auth.token) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/api/collab/ws/${fileId}?token=${auth.token}`;

    ws = new WebSocket(url);

    ws.onopen = () => {
      connected.value = true;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'users':
            users.value = msg.users;
            break;
          case 'cursor':
            cursors.value = msg.cursors;
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
    cursors.value = [];
  }

  function scheduleReconnect(): void {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 5000);
  }

  function sendOperation(op: { opType: string; position: number; text?: string; length?: number }): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'operation', ...op }));
    }
  }

  function sendCursor(x: number, y: number): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'cursor', x, y }));
    }
  }

  onUnmounted(() => {
    disconnect();
  });

  return { connected, users, cursors, connect, disconnect, sendOperation, sendCursor };
}
