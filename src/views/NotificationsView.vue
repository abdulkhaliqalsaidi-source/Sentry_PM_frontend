<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from '@/plugins/axios';
import { useI18n } from 'vue-i18n';
import ConfirmModal from '../components/ConfirmModal.vue';
import ElitePagination from '@/components/ElitePagination.vue';

const { t } = useI18n();

const notifications = ref([]);
const loading = ref(true);
const filter = ref('ALL'); // ALL, UNREAD, MENTIONS, ASSIGNED

const currentPage = ref(1);
const itemsPerPage = ref(10);

const paginatedNotifications = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return notifications.value.slice(start, start + itemsPerPage.value);
});

const currentUserId = computed(() => localStorage.getItem('user_id'));
const username = computed(() => localStorage.getItem('username') || '');

const fetchNotifications = async () => {
    loading.value = true;
    try {
        const params = new URLSearchParams();
        
        if (filter.value === 'UNREAD') {
            params.set('is_read', 'false');
        } else if (filter.value === 'MENTIONS') {
            params.set('type', 'MENTION');
        } else if (filter.value === 'ASSIGNED') {
            params.set('type', 'ASSIGNMENT');
        }
        
        const response = await axios.get('/api/pm/notifications/?' + params.toString());
        notifications.value = response.data;
    } catch (error) {
        console.error('Failed to fetch notifications', error);
    } finally {
        loading.value = false;
    }
};

const markAllAsRead = async () => {
    try {
        await axios.post('/api/pm/notifications/mark-all-read/');
        fetchNotifications();
        window.dispatchEvent(new Event('notifications-read'));
    } catch (error) {
        console.error('Failed to mark all as read', error);
    }
};

const markAsRead = async (id, currentStatus) => {
    if (currentStatus) return;
    
    try {
        await axios.patch(`/api/pm/notifications/${id}/`, { is_read: true });
        const notif = notifications.value.find(n => n.id === id);
        if (notif) notif.is_read = true;
        window.dispatchEvent(new Event('notifications-read'));
    } catch (error) {
         console.error('Failed to mark as read', error);
    }
};

const showDeleteAllConfirm = ref(false);

const deleteAllNotifications = () => {
    showDeleteAllConfirm.value = true;
};

const confirmDeleteAllNotifications = async () => {
    try {
        await axios.delete('/api/pm/notifications/delete-all/');
        fetchNotifications();
    } catch (error) {
        console.error('Failed to delete all notifications', error);
    } finally {
        showDeleteAllConfirm.value = false;
    }
};

const deleteNotification = async (id) => {
    try {
        await axios.delete(`/api/pm/notifications/${id}/`);
        notifications.value = notifications.value.filter(n => n.id !== id);
    } catch (error) {
        console.error('Failed to delete notification', error);
    }
};

const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
        return date.toLocaleDateString();
    } else if (days > 0) {
        return t('common.days_ago', { n: days });
    } else if (hours > 0) {
        return t('common.hours_ago', { n: hours });
    } else if (minutes > 0) {
        return t('common.minutes_ago', { n: minutes });
    } else {
        return t('common.just_now');
    }
};

const getIconForType = (type) => {
    switch (type) {
        case 'ASSIGNMENT': return { icon: 'user-plus', color: '#0052CC' };
        case 'COMMENT': return { icon: 'comment', color: '#FF991F' };
        case 'STATUS_CHANGE': return { icon: 'check-circle', color: '#36B37E' };
        case 'MENTION': return { icon: 'at', color: '#6554C0' };
        default: return { icon: 'bell', color: '#42526E' };
    }
};

watch(filter, () => {
    currentPage.value = 1;
    fetchNotifications();
});

onMounted(() => {
    fetchNotifications();
});
</script>

<template>
  <div class="notifications-premium-wrapper">
    <!-- Premium Header -->
    <div class="notifications-header-premium">
      <div class="header-overlay"></div>
      <div class="header-content">
        <div class="header-visual">
          <div class="bell-container">
            <i class="fa-solid fa-bell"></i>
            <div class="bell-ring"></div>
            <div class="bell-glow"></div>
          </div>
        </div>
        <div class="header-text">
          <h1>{{ t('notifications.title') }}</h1>
          <p>{{ t('notifications.desc') }}</p>
        </div>
        <div class="header-actions-premium">
           <button class="premium-action-btn delete" @click="deleteAllNotifications" v-if="notifications.length > 0">
             <i class="fa-solid fa-trash-can"></i>
             <span>{{ t('notifications.delete_all') }}</span>
           </button>
           <button class="premium-action-btn mark-read" @click="markAllAsRead">
             <i class="fa-solid fa-check-double"></i>
             <span>{{ t('notifications.mark_all_read') }}</span>
           </button>
        </div>
      </div>
    </div>

    <div class="notifications-layout-premium">
      <!-- Sidebar Filters -->
      <aside class="notifications-sidebar-premium glass-morphic">
        <div class="sidebar-section">
          <div 
            class="premium-filter-item" 
            :class="{ active: filter === 'ALL' }" 
            @click="filter = 'ALL'"
          >
            <div class="filter-icon-bg"><i class="fa-solid fa-inbox"></i></div>
            <span class="filter-label">{{ t('notifications.filters.all') }}</span>
            <div class="active-indicator" v-if="filter === 'ALL'"></div>
          </div>
          
          <div 
            class="premium-filter-item" 
            :class="{ active: filter === 'UNREAD' }" 
            @click="filter = 'UNREAD'"
          >
            <div class="filter-icon-bg unread"><i class="fa-solid fa-circle-dot"></i></div>
            <span class="filter-label">{{ t('notifications.filters.unread') }}</span>
            <div class="active-indicator" v-if="filter === 'UNREAD'"></div>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <div class="sidebar-section">
          <h4 class="section-title">{{ t('notifications.categories') }}</h4>
          <div 
            class="premium-filter-item" 
            :class="{ active: filter === 'ASSIGNED' }" 
            @click="filter = 'ASSIGNED'"
          >
            <div class="filter-icon-bg"><i class="fa-solid fa-user-tag"></i></div>
            <span class="filter-label">{{ t('notifications.filters.assigned') }}</span>
            <div class="active-indicator" v-if="filter === 'ASSIGNED'"></div>
          </div>

          <div 
            class="premium-filter-item" 
            :class="{ active: filter === 'MENTIONS' }" 
            @click="filter = 'MENTIONS'"
          >
            <div class="filter-icon-bg"><i class="fa-solid fa-at"></i></div>
            <span class="filter-label">{{ t('notifications.filters.mentions') }}</span>
            <div class="active-indicator" v-if="filter === 'MENTIONS'"></div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="notifications-content-premium">
        <div v-if="loading" class="premium-loading-state">
          <div class="spinner-premium"></div>
          <p>{{ t('common.loading') }}</p>
        </div>
        
        <div v-else-if="notifications.length === 0" class="premium-empty-state-xl glass-morphic">
          <div class="empty-visual-orb ghost-pulse">
            <i class="fa-solid fa-bell-slash"></i>
          </div>
          <h3>{{ t('notifications.quiet_title') }}</h3>
          <p>{{ t('notifications.quiet_desc') }}</p>
        </div>
        
        <transition-group name="staggered-premium" tag="div" v-else class="premium-notif-list">
          <div 
            v-for="(notif, index) in paginatedNotifications" 
            :key="notif.id"
            class="premium-notif-card glass-morphic"
            :class="{ 'is-unread': !notif.is_read }"
            :style="{ '--index': index }"
            @click="markAsRead(notif.id, notif.is_read)"
          >
            <div class="notif-user-avatar">
              <div class="avatar-circle">
                {{ (notif.actor_username || 'U')[0].toUpperCase() }}
              </div>
              <div class="type-badge" :style="{ backgroundColor: getIconForType(notif.type).color }">
                <i :class="['fa-solid', 'fa-' + getIconForType(notif.type).icon]"></i>
              </div>
            </div>
            
            <div class="notif-body-premium">
              <div class="notif-main-text">
                <span class="username">{{ notif.actor_username || t('common.system') }}</span>
                <span class="verb">{{ notif.verb ? t('notifications.verbs.' + notif.verb.replace(/ /g, '_')) : '' }}</span>
                <router-link 
                    v-if="notif.task_details" 
                    :to="{ name: 'ProjectBacklog', params: { projectId: notif.task_details.project_id }, query: { task: notif.task_details.id }}"
                    class="premium-task-link"
                    @click.stop
                >
                    {{ notif.task_details.title }}
                </router-link>
              </div>
              
              <div class="notif-footer-premium">
                <span class="time-ago"><i class="fa-regular fa-clock"></i> {{ formatTimeAgo(notif.created_at) }}</span>
              </div>

              <button class="delete-btn-premium" @click.stop="deleteNotification(notif.id)" :title="t('common.delete')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
            <div class="unread-glow" v-if="!notif.is_read"></div>
          </div>
        </transition-group>
        <ElitePagination 
          v-if="!loading && notifications.length > 0"
          :totalItems="notifications.length" 
          :itemsPerPage="itemsPerPage" 
          :currentPage="currentPage" 
          @update:currentPage="p => currentPage = p" 
        />
      </main>
    </div>

    <ConfirmModal 
      :isOpen="showDeleteAllConfirm" 
      :title="t('notifications.delete_all')" 
      :message="t('notifications.confirm_confirm_delete_all')" 
      :confirmText="t('common.delete')" 
      :cancelText="t('common.cancel')" 
      type="danger" 
      @confirm="confirmDeleteAllNotifications" 
      @cancel="showDeleteAllConfirm = false" 
    />
  </div>
</template>

<style scoped>
.notifications-premium-wrapper {
  display: flex;
  flex-direction: column;
  gap: 25px;
  animation: slideInUp 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
}

/* Premium Header */
.notifications-header-premium {
  position: relative;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 28px;
  padding: 40px;
  display: flex;
  align-items: center;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(79, 70, 229, 0.2);
}

.header-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='rgba(255,255,255,0.05)' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.header-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 30px;
  z-index: 2;
  width: 100%;
}

.header-visual {
  position: relative;
}

.bell-container {
  width: 70px;
  height: 70px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.bell-ring {
  position: absolute;
  width: 100%; height: 100%;
  border: 2px solid white;
  border-radius: 20px;
  animation: bellRipple 2s infinite;
}

.header-text h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  color: white;
  letter-spacing: -0.5px;
}

.header-text p {
  margin: 5px 0 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
}

.header-actions-premium {
  margin-left: auto;
  display: flex;
  gap: 12px;
}

[dir="rtl"] .header-actions-premium {
  margin-left: 0;
  margin-right: auto;
}

.premium-action-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 10px 18px;
  border-radius: 14px;
  color: white;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.premium-action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* Layout */
.notifications-layout-premium {
  display: flex;
  gap: 25px;
}

.glass-morphic {
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: 24px;
}

.notifications-sidebar-premium {
  width: 280px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: fit-content;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  margin: 15px 12px 10px;
  letter-spacing: 1px;
}

.premium-filter-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 14px 18px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  color: var(--text-main);
}

.filter-icon-bg {
  width: 36px;
  height: 36px;
  background: var(--n700);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 0.3s ease;
}

.premium-filter-item:hover {
  background: var(--n600);
}

.premium-filter-item.active {
  background: rgba(var(--primary-rgb, 79, 70, 229), 0.1);
  color: var(--primary);
}

.premium-filter-item.active .filter-icon-bg {
  background: var(--primary);
  color: white;
}

.premium-filter-item.active .filter-icon-bg.unread {
  background: #f59e0b;
}

.active-indicator {
  position: absolute;
  right: 15px;
  width: 6px;
  height: 6px;
  background: var(--primary);
  border-radius: 50%;
}

[dir="rtl"] .active-indicator {
  right: auto;
  left: 15px;
}

.sidebar-divider {
  height: 1px;
  background: var(--border-color);
  margin: 10px 12px;
}

/* Main Content */
.notifications-content-premium {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.premium-notif-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.premium-notif-card {
  position: relative;
  display: flex;
  gap: 20px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.premium-notif-card:hover {
  transform: translateX(5px) translateY(-2px);
  border-color: var(--primary);
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}

[dir="rtl"] .premium-notif-card:hover {
  transform: translateX(-5px) translateY(-2px);
}

.notif-user-avatar {
  position: relative;
}

.avatar-circle {
  width: 54px;
  height: 54px;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #475569;
}

.type-badge {
  position: absolute;
  bottom: -6px;
  right: -6px;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  border: 3px solid var(--bg-card);
}

[dir="rtl"] .type-badge {
  right: auto;
  left: -6px;
}

.notif-body-premium {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notif-main-text {
  font-size: 1.05rem;
  line-height: 1.5;
  color: var(--text-main);
}

.username { font-weight: 700; color: var(--text-main); }
.verb { color: var(--text-muted); margin: 0 6px; }
.premium-task-link {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
  background: rgba(var(--primary-rgb, 79, 70, 229), 0.05);
  padding: 2px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.premium-task-link:hover {
  background: rgba(var(--primary-rgb, 79, 70, 229), 0.1);
  text-decoration: underline;
}

.notif-footer-premium {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 4px;
}

.time-ago {
  font-size: 0.85rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.delete-btn-premium {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

[dir="rtl"] .delete-btn-premium {
  right: auto;
  left: 24px;
}

.premium-notif-card:hover .delete-btn-premium {
  opacity: 1;
}

.delete-btn-premium:hover {
  background: rgba(239, 44, 44, 0.1);
  color: #ef4444;
}

.unread-glow {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 4px;
  background: var(--primary);
  box-shadow: 0 0 15px var(--primary);
}

[dir="rtl"] .unread-glow {
  left: auto;
  right: 0;
}

/* Empty State XL */
.premium-empty-state-xl {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  padding: 140px 60px;
  text-align: center;
  gap: 32px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 48px;
  margin: 40px 0;
  max-width: 100%;
  backdrop-filter: blur(30px);
  box-shadow: var(--shadow-2xl);
  animation: slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.empty-visual-orb {
  width: 160px;
  height: 160px;
  background: var(--primary-bg);
  border-radius: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5.5rem;
  color: var(--primary);
  margin-bottom: 24px;
  box-shadow: 0 25px 50px -12px var(--primary-glow);
}

.premium-empty-state-xl h3 {
  font-size: 2.8rem;
  font-weight: 900;
  color: var(--text-main);
  margin: 0 0 16px 0;
  letter-spacing: -0.04em;
}

.premium-empty-state-xl p {
  font-size: 1.3rem;
  color: var(--text-muted);
  max-width: 500px;
  line-height: 1.5;
  font-weight: 600;
}

.ghost-pulse {
  animation: ghostFloat 3s ease-in-out infinite;
}

@keyframes ghostFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.premium-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px;
  gap: 20px;
  color: var(--text-muted);
}

.spinner-premium {
  width: 40px;
  height: 40px;
  border: 4px solid var(--n700);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes bellRipple {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.5); opacity: 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slideInUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Staggered Animation */
.staggered-premium-enter-active {
  animation: premiumFadeIn 0.5s ease backwards;
  animation-delay: calc(var(--index) * 0.05s);
}

@keyframes premiumFadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
