<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import axios from '@/plugins/axios';
import { useI18n } from 'vue-i18n';
import StateLoader from './StateLoader.vue';
import StateEmpty from './StateEmpty.vue';
import 'emoji-picker-element';
import { getWsBase } from '@/plugins/wsUrl';

const props = defineProps({
    projectId: { type: [String, Number], required: true }
});

const { t } = useI18n();
const messages           = ref([]);
const newMessage         = ref('');
const loading            = ref(true);
const messagesContainer  = ref(null);
const currentUsername    = computed(() => localStorage.getItem('username') || '');

const onlineUsers    = ref(new Set());
const typingUsers    = ref(new Set());
const replyingTo     = ref(null);
const editingMessage = ref(null);
const attachmentFile = ref(null);
const fileInput      = ref(null);
const showEmojiPicker = ref(false);
const emojiPopover   = ref(null);
const emojiAnchor    = ref(null);
const emojiPos       = ref({ bottom: '60px', left: '16px' });
const searchQuery    = ref('');
const showSearch     = ref(false);
const isConnected    = ref(false);
const contextMenu    = ref({ visible: false, x: 0, y: 0, msg: null });

let typingTimeout  = null;
let ws             = null;
let reconnectTimer = null;

// ── Emoji picker ────────────────────────────────────────────────
const insertEmoji = (emoji) => {
    newMessage.value += emoji;
    showEmojiPicker.value = false;
};

const onEmojiPick = (e) => {
    insertEmoji(e.detail.unicode);
};

const toggleEmojiPicker = (e) => {
    if (!showEmojiPicker.value) {
        const btn  = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const pickerW = 290;
        // Keep picker within viewport horizontally
        let left = rect.left;
        if (left + pickerW > window.innerWidth - 8) {
            left = window.innerWidth - pickerW - 8;
        }
        if (left < 8) left = 8;
        emojiPos.value = {
            bottom: (window.innerHeight - rect.top + 8) + 'px',
            left:   left + 'px',
        };
    }
    showEmojiPicker.value = !showEmojiPicker.value;
};

// ── Avatar helpers ───────────────────────────────────────────────
const getAvatarStyle = (username) => {
    const hues = [210, 260, 290, 340, 40, 160, 180, 320];
    const h = hues[(username || '?').charCodeAt(0) % hues.length];
    return { background: `linear-gradient(135deg, hsl(${h},75%,65%), hsl(${h+30},75%,50%))`, color: 'white' };
};
const getInitials = (name) => (name || '?').slice(0, 2).toUpperCase();

// ── Filtered & grouped messages ──────────────────────────────────
const filteredMessages = computed(() => {
    if (!searchQuery.value.trim()) return messages.value;
    const q = searchQuery.value.toLowerCase();
    return messages.value.filter(m => m.content?.toLowerCase().includes(q));
});

const formatTime = (ds) => new Date(ds).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const formatDate = (ds) => {
    const d = new Date(ds), today = new Date(), yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t('messages.today');
    if (d.toDateString() === yesterday.toDateString()) return t('messages.yesterday');
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
};

const groupedMessages = computed(() => {
    const groups = []; let lastDate = null;
    filteredMessages.value.forEach(msg => {
        const label = formatDate(msg.created_at);
        if (label !== lastDate) { groups.push({ type: 'date', label }); lastDate = label; }
        groups.push({ type: 'msg', msg });
    });
    return groups;
});

// ── Reactions helpers ────────────────────────────────────────────
const getReactionSummary = (msg) => {
    if (!msg.reactions?.length) return [];
    const map = {};
    msg.reactions.forEach(r => {
        if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
        map[r.emoji].count++;
        map[r.emoji].users.push(r.username || r.user);
    });
    return Object.values(map);
};
const iReacted = (msg, emoji) => msg.reactions?.some(r => (r.username || r.user) === currentUsername.value && r.emoji === emoji);

// ── WebSocket ────────────────────────────────────────────────────
const connectWebSocket = () => {
    if (ws) { ws.onclose = null; ws.close(); }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('access_token') || '';
    const wsUrl = `${getWsBase()}/ws/projects/${props.projectId}/chat/?token=${token}&username=${currentUsername.value}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        isConnected.value = true;
        if (reconnectTimer) { clearInterval(reconnectTimer); reconnectTimer = null; }
    };

    ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'presence':
                if (data.is_online) onlineUsers.value.add(data.username);
                else onlineUsers.value.delete(data.username);
                break;
            case 'typing':
                if (data.username !== currentUsername.value) {
                    if (data.is_typing) typingUsers.value.add(data.username);
                    else typingUsers.value.delete(data.username);
                }
                break;
            case 'message_deleted': {
                const m = messages.value.find(m => m.id === data.message_id);
                if (m) { m.is_deleted = true; m.content = ''; }
                break;
            }
            case 'message_edited': {
                const m = messages.value.find(m => m.id === data.message_id);
                if (m) { m.content = data.content; m.is_edited = true; }
                break;
            }
            case 'reaction': {
                const m = messages.value.find(m => m.id === data.message_id);
                if (m) {
                    if (!m.reactions) m.reactions = [];
                    if (data.added) {
                        if (!m.reactions.some(r => r.username === data.username && r.emoji === data.emoji))
                            m.reactions.push({ emoji: data.emoji, username: data.username });
                    } else {
                        m.reactions = m.reactions.filter(r => !(r.username === data.username && r.emoji === data.emoji));
                    }
                }
                break;
            }
            case 'message': {
                const msgData = data.data || data;
                if (msgData.id && !messages.value.some(m => m.id === msgData.id)) {
                    messages.value.push(msgData);
                    await nextTick(); scrollToBottom();
                }
                break;
            }
        }
    };

    ws.onclose = () => {
        isConnected.value = false;
        onlineUsers.value.clear(); typingUsers.value.clear();
        if (!reconnectTimer) reconnectTimer = setInterval(connectWebSocket, 5000);
    };
    ws.onerror = () => ws.close();
};

// ── Typing ───────────────────────────────────────────────────────
const handleTyping = () => {
    if (ws?.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'typing', username: currentUsername.value, is_typing: true }));
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        if (ws?.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: 'typing', username: currentUsername.value, is_typing: false }));
    }, 2000);
};

// ── Fetch messages ───────────────────────────────────────────────
const fetchMessages = async (isInitial = false) => {
    if (isInitial) loading.value = true;
    try {
        const res = await axios.get(`/api/pm/messages/?project=${props.projectId}`);
        messages.value = Array.isArray(res.data) ? res.data : (res.data.results || []);
        await nextTick(); scrollToBottom();
    } catch (e) { console.error('Failed to fetch messages', e); }
    finally { if (isInitial) loading.value = false; }
};

// ── File handling ────────────────────────────────────────────────
const triggerFileInput = () => fileInput.value?.click();
const onFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert(t('messages.file_too_large')); return; }
    attachmentFile.value = file;
};
const removeAttachment = () => { attachmentFile.value = null; if (fileInput.value) fileInput.value.value = ''; };

// ── Reply / Edit ─────────────────────────────────────────────────
const cancelReply = () => replyingTo.value = null;
const cancelEdit  = () => { editingMessage.value = null; newMessage.value = ''; };
const setReply    = (msg) => { replyingTo.value = msg; editingMessage.value = null; newMessage.value = ''; hideContextMenu(); };
const setEdit     = (msg) => { editingMessage.value = msg; replyingTo.value = null; newMessage.value = msg.content; hideContextMenu(); };

// ── Delete ───────────────────────────────────────────────────────
const deleteMessage = (msgId) => {
    if (!confirm(t('common.delete_confirm'))) return;
    if (ws?.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'delete_message', username: currentUsername.value, message_id: msgId }));
    hideContextMenu();
};

// ── Reaction ─────────────────────────────────────────────────────
const sendReaction = (msgId, emoji) => {
    if (ws?.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'reaction', username: currentUsername.value, message_id: msgId, emoji }));
    showEmojiPicker.value = false;
};

// ── Context menu ─────────────────────────────────────────────────
const showContextMenu = (e, msg) => { e.preventDefault(); contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, msg }; };
const hideContextMenu = () => { contextMenu.value.visible = false; };

// ── Send ─────────────────────────────────────────────────────────
const sendMessage = async () => {
    if (!newMessage.value.trim() && !attachmentFile.value) return;
    clearTimeout(typingTimeout);
    if (ws?.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'typing', username: currentUsername.value, is_typing: false }));

    if (editingMessage.value) {
        if (ws?.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: 'edit_message', username: currentUsername.value, message_id: editingMessage.value.id, content: newMessage.value.trim() }));
        cancelEdit(); return;
    }

    const content = newMessage.value.trim();
    const replyId = replyingTo.value?.id || null;
    newMessage.value = '';
    const fileToSend = attachmentFile.value;
    removeAttachment(); cancelReply();

    if (fileToSend) {
        const fd = new FormData();
        fd.append('project', props.projectId);
        fd.append('content', content);
        if (replyId) fd.append('reply_to', replyId);
        fd.append('attachment', fileToSend);
        try { await axios.post('/api/pm/messages/', fd); fetchMessages(); }
        catch (e) { console.error(e); }
    } else if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', username: currentUsername.value, content, reply_to_id: replyId }));
    } else {
        try { await axios.post('/api/pm/messages/', { project: props.projectId, content, reply_to: replyId }); fetchMessages(); }
        catch (e) { console.error(e); newMessage.value = content; }
    }
};

const scrollToBottom = () => {
    nextTick(() => { if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight; });
};

const isImageUrl = (url) => /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(url || '');
const openImage  = (url) => window.open(url, '_blank');
const formatFileSize = (b) => {
    if (!b) return '';
    const s = ['B','KB','MB','GB'], i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(1) + ' ' + s[i];
};

onMounted(() => { fetchMessages(true); connectWebSocket(); document.addEventListener('click', hideContextMenu); });
onUnmounted(() => {
    if (ws) { ws.onclose = null; ws.close(); }
    if (reconnectTimer) clearInterval(reconnectTimer);
    document.removeEventListener('click', hideContextMenu);
});
watch(() => props.projectId, () => { fetchMessages(true); connectWebSocket(); });
</script>

<template>
    <div class="glass-chat" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">

        <!-- HEADER -->
        <header class="chat-header">
            <div class="chat-header-left">
                <div class="chat-icon-orb"><i class="fa-solid fa-comments"></i></div>
                <div class="chat-header-info">
                    <span class="chat-title">{{ t('messages.team_chat') }}</span>
                    <span class="chat-subtitle" v-if="typingUsers.size > 0">
                        <span class="typing-dots"><span></span><span></span><span></span></span>
                        {{ Array.from(typingUsers).join(', ') }} {{ t('messages.typing_one') }}
                    </span>
                    <span class="chat-subtitle" v-else>
                        <span class="presence-dot" :class="{ online: isConnected }"></span>
                        {{ isConnected ? `${onlineUsers.size || 1} ${t('messages.connected')}` : t('messages.connecting') }}
                    </span>
                </div>
            </div>
            <div class="chat-header-actions">
                <button class="chat-hdr-btn" :class="{ active: showSearch }" @click="showSearch = !showSearch">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </button>
                <button class="chat-hdr-btn" @click="fetchMessages()">
                    <i class="fa-solid fa-rotate-right"></i>
                </button>
            </div>
        </header>

        <!-- SEARCH -->
        <transition name="slide-down">
            <div class="chat-search-bar" v-if="showSearch">
                <i class="fa-solid fa-search"></i>
                <input v-model="searchQuery" :placeholder="t('messages.search_messages')" />
                <button v-if="searchQuery" @click="searchQuery = ''"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </transition>

        <!-- MESSAGES -->
        <div class="chat-messages" ref="messagesContainer" @click="showEmojiPicker = false">
            <div v-if="loading" class="chat-center-state">
                <StateLoader :label="t('common.loading')" />
            </div>

            <div v-else-if="messages.length === 0" class="chat-empty">
                <StateEmpty width="100px" height="100px" />
                <h3>{{ t('messages.no_messages') }}</h3>
                <p>{{ t('messages.start_conversation') }}</p>
            </div>

            <template v-else>
                <template v-for="(item, idx) in groupedMessages" :key="idx">
                    <!-- Date separator -->
                    <div v-if="item.type === 'date'" class="chat-date-sep">
                        <span>{{ item.label }}</span>
                    </div>

                    <!-- Message row -->
                    <div v-else class="chat-msg-row" :class="{ 'is-mine': item.msg.sender_username === currentUsername }"
                        @contextmenu.prevent="showContextMenu($event, item.msg)">

                        <!-- Avatar (others only) -->
                        <div class="chat-avatar" v-if="item.msg.sender_username !== currentUsername"
                            :style="getAvatarStyle(item.msg.sender_username)">
                            {{ getInitials(item.msg.sender_username) }}
                        </div>

                        <div class="chat-bubble" :class="{
                            'bubble-mine': item.msg.sender_username === currentUsername,
                            'bubble-deleted': item.msg.is_deleted
                        }">
                            <!-- Sender name -->
                            <div class="bubble-sender" v-if="item.msg.sender_username !== currentUsername && !item.msg.is_deleted">
                                @{{ item.msg.sender_username }}
                            </div>

                            <!-- Reply context -->
                            <div class="bubble-reply" v-if="item.msg.reply_to_details && !item.msg.is_deleted">
                                <div class="reply-bar"></div>
                                <div class="reply-body">
                                    <span class="reply-author">@{{ item.msg.reply_to_details.sender_username }}</span>
                                    <p class="reply-text">{{ item.msg.reply_to_details.is_deleted ? '🚫 ' + t('messages.deleted_msg') : item.msg.reply_to_details.content }}</p>
                                </div>
                            </div>

                            <!-- Deleted notice -->
                            <div class="bubble-deleted-notice" v-if="item.msg.is_deleted">
                                <i class="fa-solid fa-ban"></i> {{ t('messages.deleted_msg') }}
                            </div>

                            <!-- Text -->
                            <div class="bubble-text" v-else-if="item.msg.content">{{ item.msg.content }}</div>

                            <!-- Attachment -->
                            <div class="bubble-attachment" v-if="item.msg.attachment && !item.msg.is_deleted">
                                <div class="attach-img" v-if="isImageUrl(item.msg.attachment)" @click="openImage(item.msg.attachment)">
                                    <img :src="item.msg.attachment" />
                                    <div class="attach-img-overlay"><i class="fa-solid fa-expand"></i></div>
                                </div>
                                <a v-else :href="item.msg.attachment" target="_blank" class="attach-file">
                                    <i class="fa-solid fa-file"></i>
                                    <span>{{ item.msg.attachment.split('/').pop() }}</span>
                                    <i class="fa-solid fa-arrow-down"></i>
                                </a>
                            </div>

                            <!-- Reactions display -->
                            <div class="bubble-reactions" v-if="getReactionSummary(item.msg).length">
                                <button v-for="r in getReactionSummary(item.msg)" :key="r.emoji"
                                    class="reaction-chip" :class="{ 'reacted': iReacted(item.msg, r.emoji) }"
                                    @click.stop="sendReaction(item.msg.id, r.emoji)"
                                    :title="r.users.join(', ')">
                                    {{ r.emoji }} <span>{{ r.count }}</span>
                                </button>
                            </div>

                            <!-- Footer -->
                            <div class="bubble-footer">
                                <span class="bubble-time">{{ formatTime(item.msg.created_at) }}</span>
                                <span class="bubble-edited" v-if="item.msg.is_edited && !item.msg.is_deleted">{{ t('messages.edited') }}</span>
                                <i class="fa-solid fa-check-double bubble-ticks" v-if="item.msg.sender_username === currentUsername && !item.msg.is_deleted"></i>
                            </div>

                            <!-- Hover actions -->
                            <div class="bubble-actions" v-if="!item.msg.is_deleted">
                                <button @click.stop="setReply(item.msg)" :title="t('common.reply')"><i class="fa-solid fa-reply"></i></button>
                                <button @click.stop="sendReaction(item.msg.id, '👍')" :title="t('messages.react')"><i class="fa-regular fa-face-smile"></i></button>
                                <button v-if="item.msg.sender_username === currentUsername" @click.stop="setEdit(item.msg)"><i class="fa-solid fa-pen"></i></button>
                                <button v-if="item.msg.sender_username === currentUsername" @click.stop="deleteMessage(item.msg.id)" class="btn-danger-action"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                </template>
            </template>
        </div>

        <!-- INPUT AREA -->
        <div class="chat-input-area">

            <!-- Reply/Edit context bar -->
            <transition name="slide-up">
                <div class="chat-context-bar" v-if="replyingTo || editingMessage">
                    <i class="fa-solid" :class="editingMessage ? 'fa-pen' : 'fa-reply'"></i>
                    <div class="context-bar-text">
                        <span class="context-bar-label">{{ editingMessage ? t('common.edit') : `${t('common.reply')} @${replyingTo?.sender_username}` }}</span>
                        <span class="context-bar-preview">{{ (editingMessage?.content || replyingTo?.content || '').slice(0, 80) }}</span>
                    </div>
                    <button @click="editingMessage ? cancelEdit() : cancelReply()"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </transition>

            <!-- Attachment preview -->
            <transition name="slide-up">
                <div class="chat-attach-preview" v-if="attachmentFile">
                    <i class="fa-solid fa-paperclip"></i>
                    <span>{{ attachmentFile.name }}</span>
                    <small>{{ formatFileSize(attachmentFile.size) }}</small>
                    <button @click="removeAttachment"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </transition>

            <!-- Main input -->
            <div class="chat-input-row">
                <button class="input-action-btn" @click.stop="showEmojiPicker = !showEmojiPicker" :class="{ active: showEmojiPicker }">
                    <i class="fa-regular fa-face-smile"></i>
                </button>

                <!-- Emoji picker — anchored above input area -->
                <transition name="pop-up">
                    <div v-if="showEmojiPicker" class="emoji-popover" @click.stop>
                        <emoji-picker @emoji-click="onEmojiPick"></emoji-picker>
                    </div>
                </transition>
                <button class="input-action-btn" @click="triggerFileInput">
                    <i class="fa-solid fa-paperclip"></i>
                </button>
                <input type="file" ref="fileInput" @change="onFileSelected" style="display:none" />

                <textarea
                    v-model="newMessage"
                    :placeholder="t('messages.type_placeholder')"
                    @input="handleTyping"
                    @keydown.enter.exact.prevent="sendMessage"
                    rows="1"
                    class="chat-textarea"
                ></textarea>

                <button class="chat-send-btn" @click="sendMessage"
                    :disabled="!newMessage.trim() && !attachmentFile"
                    :class="{ 'is-edit': editingMessage }">
                    <i class="fa-solid" :class="editingMessage ? 'fa-check' : 'fa-paper-plane'"></i>
                </button>
            </div>
        </div>

        <!-- Context menu -->
        <teleport to="body">
            <transition name="fade">
                <div v-if="contextMenu.visible" class="chat-ctx-menu"
                    :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" @click.stop>
                    <button class="ctx-btn" @click="setReply(contextMenu.msg)">
                        <i class="fa-solid fa-reply"></i> {{ t('common.reply') }}
                    </button>
                    <template v-if="contextMenu.msg?.sender_username === currentUsername && !contextMenu.msg?.is_deleted">
                        <button class="ctx-btn" @click="setEdit(contextMenu.msg)">
                            <i class="fa-solid fa-pen"></i> {{ t('common.edit') }}
                        </button>
                        <div class="ctx-sep"></div>
                        <button class="ctx-btn ctx-danger" @click="deleteMessage(contextMenu.msg?.id)">
                            <i class="fa-solid fa-trash"></i> {{ t('common.delete') }}
                        </button>
                    </template>
                </div>
            </transition>
        </teleport>
    </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   CHAT — Modern Telegram/iMessage-inspired design
   ═══════════════════════════════════════════════════════════ */

.glass-chat {
    display: flex; flex-direction: column;
    height: 100%; overflow: hidden;
    background: var(--bg-body);
}

/* ── Header ─────────────────────────────────────────────── */
.chat-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 20px; flex-shrink: 0;
    background: var(--bg-card); border-bottom: 1px solid var(--border-color);
    backdrop-filter: blur(20px);
}
.chat-header-left { display: flex; align-items: center; gap: 12px; }
.chat-icon-orb {
    width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--primary), #a78bfa);
    color: white; display: flex; align-items: center; justify-content: center;
    font-size: 1rem; box-shadow: 0 4px 14px var(--primary-glow);
}
.chat-title    { font-size: 0.95rem; font-weight: 800; color: var(--text-main); display: block; }
.chat-subtitle { font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 5px; margin-top: 1px; }
.presence-dot  { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); flex-shrink: 0; transition: background 0.3s; }
.presence-dot.online { background: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,0.25); animation: presencePulse 2s infinite; }
@keyframes presencePulse { 0%,100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.25); } 50% { box-shadow: 0 0 0 4px rgba(34,197,94,0.1); } }
.chat-header-actions { display: flex; gap: 4px; }
.chat-hdr-btn {
    width: 34px; height: 34px; border-radius: 9px; border: none;
    background: transparent; color: var(--text-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.9rem; transition: all 0.15s;
}
.chat-hdr-btn:hover  { background: var(--bg-hover); color: var(--text-main); }
.chat-hdr-btn.active { background: var(--primary); color: white; }

.typing-dots { display: flex; gap: 2px; align-items: center; }
.typing-dots span { width: 4px; height: 4px; border-radius: 50%; background: var(--primary); animation: typingBounce 1.2s infinite; }
.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes typingBounce { 0%,60%,100% { transform: translateY(0); opacity: 0.6; } 30% { transform: translateY(-4px); opacity: 1; } }

/* ── Search ─────────────────────────────────────────────── */
.chat-search-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 16px; flex-shrink: 0;
    background: var(--bg-hover); border-bottom: 1px solid var(--border-color);
    font-size: 0.85rem; color: var(--text-muted);
}
.chat-search-bar input { flex: 1; background: transparent; border: none; outline: none; color: var(--text-main); font-size: 0.85rem; font-family: inherit; }
.chat-search-bar button { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; }

/* ── Messages ───────────────────────────────────────────── */
.chat-messages {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 16px 20px; display: flex; flex-direction: column; gap: 2px;
    scrollbar-width: thin; scrollbar-color: var(--border-color) transparent;
}
.chat-center-state { flex: 1; display: flex; align-items: center; justify-content: center; }
.chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 40px; }
.chat-empty h3 { font-size: 1rem; font-weight: 700; color: var(--text-main); margin: 0; }
.chat-empty p  { font-size: 0.85rem; color: var(--text-muted); margin: 0; }

/* Date separator */
.chat-date-sep {
    display: flex; align-items: center; gap: 10px;
    margin: 16px 0 8px; font-size: 0.68rem; font-weight: 700;
    color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;
}
.chat-date-sep::before, .chat-date-sep::after { content: ''; flex: 1; height: 1px; background: var(--border-color); }
.chat-date-sep span { background: var(--bg-hover); padding: 3px 10px; border-radius: 20px; border: 1px solid var(--border-color); white-space: nowrap; }

/* Message row */
.chat-msg-row {
    display: flex; gap: 8px; align-items: flex-end;
    max-width: 72%; position: relative;
    animation: msgIn 0.18s ease;
}
@keyframes msgIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.chat-msg-row.is-mine { align-self: flex-end; flex-direction: row-reverse; }

/* Avatar */
.chat-avatar {
    width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.68rem; font-weight: 800; color: white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

/* Bubble */
.chat-bubble {
    position: relative;
    background: var(--bg-card); border: 1px solid var(--border-color);
    border-radius: 18px 18px 18px 4px;
    padding: 9px 13px 7px; max-width: 100%; min-width: 60px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06); transition: box-shadow 0.15s;
}
.chat-bubble:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.bubble-mine { background: var(--primary); border-color: transparent; border-radius: 18px 18px 4px 18px; box-shadow: 0 2px 10px var(--primary-glow); }
.bubble-deleted { opacity: 0.45; pointer-events: none; }

.bubble-sender { font-size: 0.7rem; font-weight: 800; color: var(--primary); margin-bottom: 3px; }
.bubble-mine .bubble-sender { color: rgba(255,255,255,0.75); }

/* Reply */
.bubble-reply { display: flex; gap: 7px; align-items: stretch; background: rgba(0,0,0,0.05); border-radius: 8px; padding: 5px 9px; margin-bottom: 7px; overflow: hidden; }
.bubble-mine .bubble-reply { background: rgba(255,255,255,0.12); }
.reply-bar { width: 2.5px; border-radius: 2px; background: var(--primary); flex-shrink: 0; }
.bubble-mine .reply-bar { background: rgba(255,255,255,0.8); }
.reply-body { min-width: 0; }
.reply-author { font-size: 0.68rem; font-weight: 800; color: var(--primary); display: block; }
.bubble-mine .reply-author { color: rgba(255,255,255,0.85); }
.reply-text { font-size: 0.75rem; color: var(--text-muted); margin: 1px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
.bubble-mine .reply-text { color: rgba(255,255,255,0.6); }

.bubble-deleted-notice { font-size: 0.82rem; color: var(--text-muted); font-style: italic; display: flex; align-items: center; gap: 5px; }
.bubble-text { font-size: 0.88rem; line-height: 1.55; white-space: pre-wrap; word-break: break-word; color: var(--text-main); }
.bubble-mine .bubble-text { color: white; }

/* Attachment */
.bubble-attachment { margin-top: 7px; }
.attach-img { position: relative; cursor: zoom-in; border-radius: 10px; overflow: hidden; max-width: 220px; }
.attach-img img { width: 100%; display: block; }
.attach-img-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.1rem; opacity: 0; transition: opacity 0.15s; }
.attach-img:hover .attach-img-overlay { opacity: 1; }
.attach-file { display: inline-flex; align-items: center; gap: 7px; padding: 7px 11px; border-radius: 9px; background: rgba(0,0,0,0.06); color: inherit; text-decoration: none; font-size: 0.82rem; font-weight: 600; max-width: 200px; }
.attach-file span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bubble-mine .attach-file { background: rgba(255,255,255,0.15); color: white; }

/* Reactions */
.bubble-reactions { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 5px; }
.reaction-chip { display: inline-flex; align-items: center; gap: 3px; padding: 1px 7px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 0.78rem; cursor: pointer; transition: all 0.15s; line-height: 1.6; }
.reaction-chip:hover { border-color: var(--primary); transform: scale(1.05); }
.reaction-chip.reacted { background: var(--primary-bg); border-color: var(--primary); color: var(--primary); }
.reaction-chip span { font-size: 0.7rem; font-weight: 700; }

/* Footer */
.bubble-footer { display: flex; align-items: center; gap: 5px; margin-top: 3px; justify-content: flex-end; }
.bubble-time   { font-size: 0.65rem; color: var(--text-muted); }
.bubble-edited { font-size: 0.62rem; color: var(--text-muted); font-style: italic; }
.bubble-ticks  { font-size: 0.65rem; color: rgba(255,255,255,0.65); }
.bubble-mine .bubble-time   { color: rgba(255,255,255,0.55); }
.bubble-mine .bubble-edited { color: rgba(255,255,255,0.55); }

/* Hover actions */
.bubble-actions {
    position: absolute; top: -18px; display: none; gap: 2px; align-items: center;
    background: var(--bg-card); border: 1px solid var(--border-color);
    border-radius: 10px; padding: 3px 5px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12); z-index: 20;
}
.chat-msg-row:not(.is-mine) .bubble-actions { inset-inline-end: 0; }
.chat-msg-row.is-mine       .bubble-actions { inset-inline-start: 0; }
.chat-bubble:hover .bubble-actions { display: flex; }
.bubble-actions button { width: 24px; height: 24px; border-radius: 6px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; transition: all 0.12s; }
.bubble-actions button:hover { background: var(--bg-hover); color: var(--primary); }
.btn-danger-action:hover { color: #ef4444 !important; background: rgba(239,68,68,0.08) !important; }

/* ── Input area ─────────────────────────────────────────── */
.chat-input-area { flex-shrink: 0; padding: 10px 16px 14px; background: var(--bg-card); border-top: 1px solid var(--border-color); }

.chat-context-bar { display: flex; align-items: center; gap: 9px; padding: 7px 11px; margin-bottom: 7px; background: var(--primary-bg); border-radius: 10px; border-inline-start: 3px solid var(--primary); }
.context-bar-text { flex: 1; min-width: 0; }
.context-bar-label   { font-size: 0.72rem; font-weight: 800; color: var(--primary); display: block; }
.context-bar-preview { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.chat-context-bar > i      { color: var(--primary); font-size: 0.8rem; flex-shrink: 0; }
.chat-context-bar > button { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; font-size: 0.85rem; }

.chat-attach-preview { display: flex; align-items: center; gap: 7px; padding: 5px 11px; margin-bottom: 7px; background: var(--bg-hover); border-radius: 9px; font-size: 0.8rem; color: var(--text-main); }
.chat-attach-preview small  { color: var(--text-muted); font-size: 0.72rem; }
.chat-attach-preview button { background: none; border: none; color: var(--text-muted); cursor: pointer; margin-inline-start: auto; }

/* Emoji popover — anchored above emoji button via parent position:relative */
.emoji-popover {
    position: absolute;
    bottom: calc(100% + 8px);
    inset-inline-start: 0;
    z-index: 9999;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1);
    border: 1px solid var(--border-color);
}

emoji-picker {
    --background: var(--bg-card);
    --border-color: var(--border-color);
    --border-radius: 0;
    --button-active-background: var(--primary-bg);
    --button-hover-background: var(--bg-hover);
    --category-emoji-padding: 0.25rem;
    --category-emoji-size: 0.85rem;
    --category-font-color: var(--text-muted);
    --category-font-size: 0.65rem;
    --emoji-padding: 0.22rem;
    --emoji-size: 1.05rem;
    --indicator-color: var(--primary);
    --indicator-height: 2px;
    --input-border-color: var(--border-color);
    --input-border-radius: 8px;
    --input-font-color: var(--text-main);
    --input-placeholder-color: var(--text-muted);
    --outline-color: var(--primary);
    --skintone-border-radius: 50%;
    width: 290px; height: 260px;
}
[data-theme="dark"] emoji-picker {
    --background: #1D2125; --border-color: #353C44;
    --button-active-background: rgba(59,130,246,0.15);
    --button-hover-background: #22272B;
    --category-font-color: #8C9BAB;
    --input-font-color: #B3B9C4;
    --input-placeholder-color: #8C9BAB;
}

/* Input row */
.chat-input-row { display: flex; align-items: flex-end; gap: 6px; background: var(--bg-hover); border: 1.5px solid var(--border-color); border-radius: 14px; padding: 5px 6px; transition: border-color 0.2s, box-shadow 0.2s; position: relative; }
.chat-input-row:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-bg); }

.input-action-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.95rem; transition: all 0.15s; }
.input-action-btn:hover, .input-action-btn.active { color: var(--primary); background: var(--primary-bg); }

.chat-textarea { flex: 1; background: transparent; border: none; outline: none; color: var(--text-main); font-size: 0.88rem; font-family: inherit; resize: none; max-height: 100px; line-height: 1.5; padding: 5px 0; }
.chat-textarea::placeholder { color: var(--text-muted); }

.chat-send-btn { width: 34px; height: 34px; border-radius: 10px; border: none; background: var(--primary); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.85rem; transition: all 0.2s; box-shadow: 0 3px 10px var(--primary-glow); }
.chat-send-btn:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 5px 16px var(--primary-glow); }
.chat-send-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }
.chat-send-btn.is-edit { background: #22c55e; box-shadow: 0 3px 10px rgba(34,197,94,0.3); }

/* Context menu */
.chat-ctx-menu { position: fixed; z-index: 9999; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 5px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); min-width: 150px; animation: ctxIn 0.15s cubic-bezier(0.175,0.885,0.32,1.275); }
@keyframes ctxIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
.ctx-btn { display: flex; align-items: center; gap: 9px; width: 100%; padding: 7px 11px; border: none; background: transparent; color: var(--text-main); font-size: 0.84rem; font-weight: 600; cursor: pointer; border-radius: 7px; text-align: start; transition: background 0.12s; font-family: inherit; }
.ctx-btn i { width: 14px; text-align: center; color: var(--text-muted); }
.ctx-btn:hover { background: var(--bg-hover); }
.ctx-danger { color: #ef4444; }
.ctx-danger i { color: #ef4444; }
.ctx-danger:hover { background: rgba(239,68,68,0.07); }
.ctx-sep { height: 1px; background: var(--border-color); margin: 3px 0; }

/* Transitions */
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.18s ease; }
.slide-down-enter-from,   .slide-down-leave-to     { opacity: 0; transform: translateY(-6px); }
.slide-up-enter-active,   .slide-up-leave-active   { transition: all 0.18s ease; }
.slide-up-enter-from,     .slide-up-leave-to       { opacity: 0; transform: translateY(6px); }
.pop-up-enter-active,     .pop-up-leave-active     { transition: all 0.18s cubic-bezier(0.175,0.885,0.32,1.275); }
.pop-up-enter-from,       .pop-up-leave-to         { opacity: 0; transform: scale(0.88) translateY(8px); }
.fade-enter-active,       .fade-leave-active       { transition: opacity 0.12s; }
.fade-enter-from,         .fade-leave-to           { opacity: 0; }
</style>
