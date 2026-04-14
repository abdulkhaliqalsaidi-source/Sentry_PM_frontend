import { ref, onUnmounted } from 'vue';

/**
 * Composable for real-time doc collaboration via WebSocket.
 * Handles: presence, typing indicators, comments, doc-update notifications.
 */
export function useDocCollaboration(projectId, docId) {
  const onlineUsers   = ref(new Set());
  const typingUsers   = ref(new Set());
  const comments      = ref([]);
  const isConnected   = ref(false);
  const docUpdatedBy  = ref(null); // { username, title } when someone else saves

  let ws = null;
  let typingTimer = null;
  let reconnectTimer = null;

  const currentUsername = () => localStorage.getItem('username') || '';

  // ── Connect ────────────────────────────────────────────────────
  const connect = (initialComments = []) => {
    comments.value = initialComments;
    _open();
  };

  const _open = () => {
    if (ws) { ws.onclose = null; ws.close(); }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('access_token') || '';
    ws = new WebSocket(
      `${proto}//${window.location.host}/ws/projects/${projectId}/docs/${docId}/?token=${token}`
    );

    ws.onopen = () => { isConnected.value = true; };

    ws.onclose = () => {
      isConnected.value = false;
      reconnectTimer = setTimeout(_open, 4000);
    };

    ws.onerror = () => ws.close();

    ws.onmessage = ({ data }) => {
      try { _handle(JSON.parse(data)); } catch {}
    };
  };

  const _handle = (msg) => {
    switch (msg.type) {
      case 'presence': {
        const set = new Set(onlineUsers.value);
        if (msg.is_online) set.add(msg.username);
        else set.delete(msg.username);
        onlineUsers.value = set;
        break;
      }
      case 'typing': {
        const set = new Set(typingUsers.value);
        if (msg.is_typing) set.add(msg.username);
        else set.delete(msg.username);
        typingUsers.value = set;
        break;
      }
      case 'comment_added':
        if (!comments.value.find(c => c.id === msg.comment.id))
          comments.value.push(msg.comment);
        break;
      case 'comment_deleted':
        comments.value = comments.value.filter(c => c.id !== msg.comment_id);
        break;
      case 'doc_updated':
        docUpdatedBy.value = { username: msg.username, title: msg.title };
        // Auto-clear after 5s
        setTimeout(() => { docUpdatedBy.value = null; }, 5000);
        break;
    }
  };

  // ── Send helpers ───────────────────────────────────────────────
  const _send = (payload) => {
    if (ws?.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify(payload));
  };

  const sendTyping = (isTyping) => {
    _send({ type: 'typing', is_typing: isTyping });
    if (isTyping) {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => _send({ type: 'typing', is_typing: false }), 3000);
    }
  };

  const addComment = (content) => {
    _send({ type: 'add_comment', content });
  };

  const deleteComment = (commentId) => {
    _send({ type: 'delete_comment', comment_id: commentId });
  };

  const broadcastDocUpdated = (title) => {
    _send({ type: 'doc_updated', title });
  };

  // ── Cleanup ────────────────────────────────────────────────────
  const disconnect = () => {
    clearTimeout(reconnectTimer);
    clearTimeout(typingTimer);
    if (ws) { ws.onclose = null; ws.close(); ws = null; }
    isConnected.value = false;
  };

  onUnmounted(disconnect);

  return {
    onlineUsers, typingUsers, comments, isConnected, docUpdatedBy,
    connect, disconnect,
    sendTyping, addComment, deleteComment, broadcastDocUpdated,
    currentUsername,
  };
}
