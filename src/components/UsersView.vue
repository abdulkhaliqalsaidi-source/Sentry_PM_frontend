<template>
  <div class="users-view-hyper hyper-glass" :class="{ 'fade-in': show }" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">
    
    <!-- Atmospheric Orbs -->
    <div class="bg-glow-orb orbit-7"></div>
    <div class="bg-glow-orb orbit-8"></div>

    <!-- Header & Search HUD -->
    <div class="users-header-hyper">
      <div class="h-content">
        <div class="icon-ring-hyper pulsing">
           <i class="fa-solid fa-users-gear"></i>
        </div>
        <div class="h-text">
          <h1>{{ $t('users.title') }}</h1>
          <p>{{ $t('users.subtitle') }}</p>
        </div>
      </div>
      
      <div class="h-actions-hud glass-morphic">
         <div class="cyber-search-box glass-stroke">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model="searchQuery" :placeholder="$t('common.search')" />
         </div>
         <button v-if="canManageUsers" class="btn-hyper primary" @click="openCreateModal">
            <i class="fa-solid fa-user-plus"></i>
            <span>{{ $t('users.create_user') }}</span>
         </button>
         <button class="btn-hyper ghost refresh-btn" @click="fetchUsers">
            <i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': loading }"></i>
         </button>
      </div>
    </div>

    <!-- Stats Grid (Liquid Wave) -->
    <div class="users-stats-hyper">
      <div class="stat-tile-hyper glass-morphic">
         <div class="tile-liquid blue"></div>
         <div class="tile-content">
            <div class="t-icon"><i class="fa-solid fa-users"></i></div>
            <div class="t-data">
               <span class="t-val">{{ users.length }}</span>
               <span class="t-lbl">{{ $t('users.total_users') }}</span>
            </div>
         </div>
         <div class="tile-glint"></div>
      </div>

      <div class="stat-tile-hyper glass-morphic">
         <div class="tile-liquid green"></div>
         <div class="tile-content">
            <div class="t-icon"><i class="fa-solid fa-layer-group"></i></div>
            <div class="t-data">
               <span class="t-val">{{ allGroups.length }}</span>
               <span class="t-lbl">{{ $t('users.total_groups') }}</span>
            </div>
         </div>
         <div class="tile-glint"></div>
      </div>

      <div class="stat-tile-hyper glass-morphic active-rate">
         <div class="tile-liquid purple"></div>
         <div class="tile-content">
            <div class="t-icon"><i class="fa-solid fa-bolt"></i></div>
            <div class="t-data">
               <span class="t-val">{{ activeUsersCount }}</span>
               <span class="t-lbl">{{ $t('common.active_now') }}</span>
            </div>
         </div>
         <div class="tile-glint"></div>
      </div>
    </div>

    <!-- Personnel Directory (List) -->
    <div class="personnel-directory glass-morphic">
      <div v-if="loading && users.length === 0" class="loading-directory">
        <div class="cyber-spinner"></div>
      </div>

      <div v-else-if="filteredUsers.length === 0" class="empty-directory-premium glass-morphic">
        <div class="ghost-user-orb">
            <i class="fa-solid fa-user-slash ghost-pulse"></i>
        </div>
        <h3>{{ $t('users.no_users') }}</h3>
        <p>{{ $t('users.no_users_desc') }}</p>
      </div>

      <div v-else class="directory-list">
        <div class="directory-header">
           <div class="col-user">{{ $t('users.table.user') }}</div>
           <div class="col-email">{{ $t('users.table.email') }}</div>
           <div class="col-group">{{ $t('users.table.group') }}</div>
           <div class="col-date">{{ $t('users.table.joined') }}</div>
           <div class="col-actions">{{ $t('users.table.actions') }}</div>
        </div>
        
        <transition-group name="stagger-user" tag="div" class="directory-items">
          <div v-for="(user, idx) in paginatedUsers" :key="user.id" 
               class="user-tile-hyper glass-stroke"
               :style="{ '--idx': idx }">
            <div class="tile-aura"></div>
            
            <div class="col-user user-id-cell">
              <div class="hexagon-avatar">
                <div class="hex-inner">{{ user.username[0].toUpperCase() }}</div>
                <div class="status-pulse" :class="{ active: user.is_active !== false }"></div>
                <div class="hex-glint"></div>
              </div>
              <div class="user-meta">
                <span class="u-name">{{ user.first_name }} {{ user.last_name }}</span>
                <span class="u-handle">@{{ user.username }}</span>
              </div>
            </div>

            <div class="col-email email-cell">{{ user.email }}</div>
            
            <div class="col-group">
              <div class="group-hud-badge" :class="{ 'admin-badge': user.group_name?.toLowerCase().includes('admin') }">
                <i class="fa-solid fa-shield-halved"></i>
                <span>{{ user.group_name || $t('users.default_group') }}</span>
              </div>
            </div>

            <div class="col-date date-cell">{{ formatDate(user.date_joined) || '-' }}</div>

            <div class="col-actions">
              <div class="hud-actions-mini">
                 <button v-if="canManageUsers" class="mini-btn tip" @click="openEditModal(user)"><i class="fa-solid fa-user-pen"></i></button>
                 <button v-if="canManageUsers" class="mini-btn danger" @click="confirmDelete(user)"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            </div>
          </div>
        </transition-group>
        <ElitePagination 
          v-if="!loading && filteredUsers.length > 0"
          :totalItems="filteredUsers.length" 
          :itemsPerPage="itemsPerPage" 
          :currentPage="currentPage" 
          @update:currentPage="p => currentPage = p" 
          style="margin-top: 20px"
        />
      </div>
    </div>

    <!-- Modals (Hyper-Premium) -->
    <transition name="modal-hyper">
      <div v-if="showEditModal" class="modal-overlay-hyper" @click="closeEditModal">
        <div class="modal-card-hyper edit-user-card glass-morphic" @click.stop>
          <div class="modal-head-row">
             <div class="head-icon-ring blue"><i class="fa-solid fa-user-pen"></i></div>
             <div class="head-text">
                <h3>{{ $t('users.edit_user') }}</h3>
                <p>@{{ editingUser?.username }}</p>
             </div>
             <button class="btn-close-hud" @click="closeEditModal">&times;</button>
          </div>
          
          <form @submit.prevent="saveUser" class="hyper-form">
            <div class="form-grid">
              <div class="form-group-hud">
                <label>{{ $t('users.first_name') }}</label>
                <div class="input-hud glass-stroke">
                   <i class="fa-solid fa-signature"></i>
                   <input v-model="editingUser.first_name" type="text" :placeholder="$t('users.first_name')">
                </div>
              </div>
              <div class="form-group-hud">
                <label>{{ $t('users.last_name') }}</label>
                <div class="input-hud glass-stroke">
                   <i class="fa-solid fa-signature"></i>
                   <input v-model="editingUser.last_name" type="text" :placeholder="$t('users.last_name')">
                </div>
              </div>
            </div>
            
            <div class="form-grid">
              <div class="form-group-hud">
                <label>{{ $t('users.username') }}</label>
                <div class="input-hud glass-stroke">
                   <i class="fa-solid fa-at"></i>
                   <input v-model="editingUser.username" type="text" :placeholder="$t('users.username')">
                </div>
              </div>
              <div class="form-group-hud">
                <label>{{ $t('users.table.email') }}</label>
                <div class="input-hud glass-stroke">
                   <i class="fa-solid fa-envelope"></i>
                   <input v-model="editingUser.email" type="email" placeholder="example@mail.com">
                </div>
              </div>
            </div>

            <div class="form-group-hud">
              <label>{{ $t('users.table.group') }}</label>
              <div class="select-hud glass-stroke">
                 <i class="fa-solid fa-user-shield"></i>
                 <select v-model="editingUser.group_id">
                    <option :value="null">{{ $t('users.default_group') }}</option>
                    <option v-for="group in allGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
                 </select>
                 <i class="fa-solid fa-chevron-down arrow"></i>
              </div>
            </div>

            <div class="modal-foot-hud">
               <button type="button" class="btn-hyper ghost" @click="closeEditModal">{{ $t('common.cancel') }}</button>
               <button type="submit" class="btn-hyper primary" :disabled="saving">
                  <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
                  <i v-else class="fa-solid fa-floppy-disk"></i>
                  <span>{{ $t('users.save_changes') }}</span>
               </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <transition name="modal-hyper">
      <div v-if="showDeleteConfirm" class="modal-overlay-hyper" @click="showDeleteConfirm = false">
        <div class="modal-card-hyper glass-morphic mini-modal" @click.stop>
          <div class="danger-ring pulsing"><i class="fa-solid fa-user-xmark"></i></div>
          <h3>{{ $t('users.delete_confirm_title') }}</h3>
          <p>{{ $t('users.delete_confirm_msg', { user: userToDelete?.username }) }}</p>
          <div class="modal-foot-hud center">
             <button class="btn-hyper ghost" @click="showDeleteConfirm = false">{{ $t('common.cancel') }}</button>
             <button class="btn-hyper danger" @click="deleteUser" :disabled="deleting">
                <i v-if="deleting" class="fa-solid fa-spinner fa-spin"></i>
                <span>{{ $t('users.confirm_delete') }}</span>
             </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="modal-hyper">
      <div v-if="showCreateModal" class="modal-overlay-hyper" @click="closeCreateModal">
        <div class="modal-card-hyper edit-user-card glass-morphic" @click.stop>
          <div class="modal-head-row">
             <div class="head-icon-ring blue"><i class="fa-solid fa-user-plus"></i></div>
             <div class="head-text">
                <h3>{{ $t('users.create_user') }}</h3>
                <p>{{ $t('users.new_user_subtitle') }}</p>
             </div>
             <button class="btn-close-hud" @click="closeCreateModal">&times;</button>
          </div>
          
          <form @submit.prevent="saveNewUser" class="hyper-form">
            <div class="form-grid">
              <div class="form-group-hud">
                <label>{{ $t('users.first_name') }}</label>
                <div class="input-hud glass-stroke">
                   <i class="fa-solid fa-signature"></i>
                   <input v-model="newUser.first_name" type="text" :placeholder="$t('users.first_name')">
                </div>
              </div>
              <div class="form-group-hud">
                <label>{{ $t('users.last_name') }}</label>
                <div class="input-hud glass-stroke">
                   <i class="fa-solid fa-signature"></i>
                   <input v-model="newUser.last_name" type="text" :placeholder="$t('users.last_name')">
                </div>
              </div>
            </div>
            
            <div class="form-grid">
              <div class="form-group-hud">
                <label>{{ $t('users.username') }}</label>
                <div class="input-hud glass-stroke">
                   <i class="fa-solid fa-at"></i>
                   <input v-model="newUser.username" type="text" :placeholder="$t('users.username')" required>
                </div>
              </div>
              <div class="form-group-hud">
                <label>{{ $t('users.password') }}</label>
                <div class="input-hud glass-stroke">
                   <i class="fa-solid fa-lock"></i>
                   <input v-model="newUser.password" type="password" :placeholder="$t('users.password')" required>
                </div>
              </div>
            </div>

            <div class="form-group-hud">
              <label>{{ $t('users.table.email') }}</label>
              <div class="input-hud glass-stroke">
                 <i class="fa-solid fa-envelope"></i>
                 <input v-model="newUser.email" type="email" placeholder="example@mail.com">
              </div>
            </div>

            <div class="form-group-hud">
              <label>{{ $t('users.table.group') }}</label>
              <div class="select-hud glass-stroke">
                 <i class="fa-solid fa-user-shield"></i>
                 <select v-model="newUser.group_id">
                    <option :value="null">{{ $t('users.default_group') }}</option>
                    <option v-for="group in allGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
                 </select>
                 <i class="fa-solid fa-chevron-down arrow"></i>
              </div>
            </div>

            <div class="modal-foot-hud">
               <button type="button" class="btn-hyper ghost" @click="closeCreateModal">{{ $t('common.cancel') }}</button>
               <button type="submit" class="btn-hyper primary" :disabled="saving">
                  <i v-if="saving" class="fa-solid fa-spinner fa-spin"></i>
                  <i v-else class="fa-solid fa-user-check"></i>
                  <span>{{ $t('users.create_user') }}</span>
               </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Global Messages -->
    <div class="hyper-toast-stack">
       <transition-group name="toast-slide">
          <div v-if="message" :key="message.id" class="h-toast glass-morphic" :class="message.type">
             <i :class="message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
             <span>{{ message.text }}</span>
          </div>
       </transition-group>
    </div>

  </div>
</template>

<script>
import axios from '@/plugins/axios';
import { usePermissions } from '@/composables/usePermissions';
import ElitePagination from '@/components/ElitePagination.vue';

export default {
  name: 'UsersView',
  components: {
    ElitePagination
  },
  data() {
    const perms = usePermissions();
    return {
      show: false,
      loading: false,
      saving: false,
      deleting: false,
      users: [],
      allProjects: [],
      allGroups: [],
      searchQuery: '',
      currentPage: 1,
      itemsPerPage: 10,
      showEditModal: false,
      showCreateModal: false,
      showDeleteConfirm: false,
      editingUser: null,
      newUser: {
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        group_id: null
      },
      userToDelete: null,
      message: null,
      canManageUsers: perms.isSuperuser.value,
    };
  },
  computed: {
    filteredUsers() {
      let filtered = this.users;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        filtered = this.users.filter(u => 
          u.username.toLowerCase().includes(q) || 
          u.email.toLowerCase().includes(q) ||
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
        );
      }
      return filtered;
    },
    paginatedUsers() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      return this.filteredUsers.slice(start, start + this.itemsPerPage);
    },
    activeUsersCount() {
       return this.users.filter(u => u.is_active !== false).length;
    }
  },
  watch: {
    searchQuery() {
      this.currentPage = 1;
    }
  },
  mounted() {
    setTimeout(() => { this.show = true; }, 50);
    this.fetchUsers();
    this.fetchProjects();
    this.fetchGroups();
  },
  methods: {
    async fetchUsers() {
      this.loading = true;
      try {
        const isSuperuser = localStorage.getItem('is_superuser') === 'true';
        const url = isSuperuser ? '/api/admin/users/' : '/api/pm/all-users/';
        const response = await axios.get(url);
        this.users = response.data;
      } catch { this.showMessage(this.$t('users.messages.fetch_error'), 'error'); } finally { this.loading = false; }
    },
    async fetchProjects() {
      try { const response = await axios.get('/api/public/projects/'); this.allProjects = response.data; } catch (e) { console.error(e); }
    },
    async fetchGroups() {
      const isSuperuser = localStorage.getItem('is_superuser') === 'true';
      if (!isSuperuser) return;
      try { const response = await axios.get('/api/admin/groups/'); this.allGroups = response.data; } catch (e) { console.error(e); }
    },
    openEditModal(user) { this.editingUser = { ...user }; this.showEditModal = true; },
    closeEditModal() { this.showEditModal = false; this.editingUser = null; },
    openCreateModal() { 
      this.newUser = { username: '', email: '', password: '', first_name: '', last_name: '', group_id: null };
      this.showCreateModal = true; 
    },
    closeCreateModal() { this.showCreateModal = false; },
    async saveNewUser() {
      this.saving = true;
      try {
        const response = await axios.post('/api/admin/users/create/', this.newUser);
        if (response.data.status === 'success') {
          this.showMessage(this.$t('users.messages.create_success'), 'success');
          this.fetchUsers();
          this.closeCreateModal();
        }
      } catch (e) { 
        const errorMsg = e.response?.data?.error || this.$t('users.messages.create_error');
        this.showMessage(errorMsg, 'error'); 
      } finally { this.saving = false; }
    },
    async saveUser() {
      this.saving = true;
      try {
        const response = await axios.post('/api/admin/users/update/', this.editingUser);
        if (response.data.status === 'success') {
          this.showMessage(this.$t('users.messages.update_success'), 'success');
          this.fetchUsers();
          this.closeEditModal();
        }
      } catch { this.showMessage(this.$t('users.messages.update_error'), 'error'); } finally { this.saving = false; }
    },
    confirmDelete(user) { this.userToDelete = user; this.showDeleteConfirm = true; },
    async deleteUser() {
      this.deleting = true;
      try {
        const response = await axios.delete(`/api/admin/users/${this.userToDelete.id}/delete/`);
        if (response.data.status === 'success') {
          this.showMessage(this.$t('users.messages.delete_success'), 'success');
          this.fetchUsers();
          this.showDeleteConfirm = false;
        }
      } catch { this.showMessage(this.$t('users.messages.delete_error'), 'error'); } finally { this.deleting = false; }
    },
    showMessage(text, type) {
      this.message = { id: Date.now(), text, type };
      setTimeout(() => { this.message = null; }, 4000);
    },
    formatDate(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString(this.$i18n.locale === 'ar' ? 'ar-SA' : 'en-US');
    }
  }
};
</script>

<style scoped>
.users-view-hyper {
  padding: 40px;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: var(--bg-body);
  display: flex;
  flex-direction: column;
  gap: 40px;
  font-family: 'Outfit', 'Inter', sans-serif;
}

/* Atmospheric Orbs */
.bg-glow-orb { position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.12; z-index: 0; }
.orbit-7 { width: 550px; height: 550px; background: #3b82f6; top: -5%; right: -5%; animation: orbit 30s infinite linear; }
.orbit-8 { width: 450px; height: 450px; background: #10b981; bottom: 10%; left: -10%; animation: orbit 25s infinite linear reverse; }

@keyframes orbit { from { transform: rotate(0deg) translate(80px) rotate(0deg); } to { transform: rotate(360deg) translate(80px) rotate(-360deg); } }

/* Header & Search HUD */
.users-header-hyper { display: flex; justify-content: space-between; align-items: center; z-index: 10; gap: 30px; }
.h-content { display: flex; align-items: center; gap: 24px; }
.icon-ring-hyper {
  width: 65px; height: 65px; border-radius: 22px; 
  background: rgba(59, 130, 246, 0.1); color: #3b82f6;
  display: flex; align-items: center; justify-content: center; font-size: 28px;
}
.pulsing { animation: hPulse 2s infinite; }
@keyframes hPulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59,130,246,0.4); } 50% { transform: scale(1.05); box-shadow: 0 0 20px 5px rgba(59,130,246,0.2); } }

.h-text h1 { margin: 0; font-size: 2.2rem; font-weight: 900; color: white; letter-spacing: -1px; }
.h-text p { margin: 4px 0 0 0; color: var(--text-muted); opacity: 0.7; font-size: 1.1rem; }

.h-actions-hud { display: flex; align-items: center; gap: 15px; padding: 10px 15px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); }
.cyber-search-box { display: flex; align-items: center; gap: 12px; padding: 0 18px; height: 48px; min-width: 300px; border-radius: 14px; background: rgba(0,0,0,0.2); }
.cyber-search-box i { color: var(--text-muted); }
.cyber-search-box input { background: transparent; border: none; color: white; font-weight: 600; outline: none; width: 100%; }

/* Stats Tiles */
.users-stats-hyper { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; z-index: 10; }
.stat-tile-hyper { padding: 30px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.05); position: relative; overflow: hidden; height: 160px; display: flex; align-items: center; }
.tile-liquid { position: absolute; inset: 0; opacity: 0.05; overflow: hidden; pointer-events: none; }
.tile-liquid:after {
  content: ""; position: absolute; top: 70%; left: -50%; width: 200%; height: 200%; background: currentColor;
  border-radius: 40%; animation: wave 10s infinite linear;
}
.tile-liquid.blue { color: #3b82f6; }
.tile-liquid.green { color: #10b981; }
.tile-liquid.purple { color: #8b5cf6; }

@keyframes wave { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.tile-content { display: flex; align-items: center; gap: 20px; position: relative; z-index: 2; }
.t-icon { width: 54px; height: 54px; border-radius: 16px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--text-main); }
.t-data { display: flex; flex-direction: column; line-height: 1; }
.t-val { font-size: 2.8rem; font-weight: 900; color: white; }
.t-lbl { font-size: 0.9rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-top: 8px; letter-spacing: 1px; }

/* Personnel Directory */
.personnel-directory { z-index: 10; padding: 20px; border-radius: 35px; border: 1px solid rgba(255,255,255,0.05); }
.directory-header { display: grid; grid-template-columns: 3fr 2fr 2fr 1.5fr 100px; align-items: center; padding: 20px 10px; color: var(--text-muted); font-weight: 900; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.col-actions { justify-self: center; text-align: center; }

.directory-items { display: flex; flex-direction: column; gap: 12px; padding-top: 15px; }
.user-tile-hyper {
  display: grid; grid-template-columns: 3fr 2fr 2fr 1.5fr 100px; align-items: center;
  padding: 15px 10px; border-radius: 20px; background: rgba(255,255,255,0.02);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative;
}
.tile-aura { position: absolute; inset: 0; pointer-events: none; z-index: 0; border-radius: 20px; }
.user-tile-hyper .col-actions { justify-self: center; }
.user-tile-hyper:hover { background: rgba(255,255,255,0.05); transform: scale(1.01); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }

/* Hexagon Avatar */
.hexagon-avatar {
  width: 50px; height: 50px; background: rgba(59, 130, 246, 0.2); 
  clip-path: polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%);
  display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; color: #3b82f6; position: relative;
}
.hex-inner { position: relative; z-index: 2; }
.status-pulse { 
  position: absolute; bottom: 5px; right: 5px; width: 10px; height: 10px; border-radius: 50%;
  background: #9ca3af; border: 2px solid #111; z-index: 3;
}
.status-pulse.active { background: #10b981; animation: sPulse 2s infinite; }
@keyframes sPulse { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.7); } 70% { box-shadow: 0 0 0 8px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }

.user-id-cell { display: flex; align-items: center; gap: 18px; }
.user-meta { display: flex; flex-direction: column; }
.u-name { font-weight: 800; color: white; font-size: 1.05rem; }
.u-handle { font-size: 0.8rem; color: var(--text-muted); opacity: 0.6; }

.group-hud-badge { padding: 4px 12px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; background: rgba(0,0,0,0.2); color: var(--text-muted); display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.05); }
.admin-badge { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border-color: rgba(139, 92, 246, 0.2); }

.date-cell { color: var(--text-muted); font-weight: 700; font-size: 0.9rem; }
.email-cell { color: var(--text-muted); font-weight: 600; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; }

/* Modals */
.modal-overlay-hyper { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-card-hyper { width: 100%; max-width: 550px; border-radius: 40px; border: 1px solid rgba(255,255,255,0.1); position: relative; overflow: hidden; animation: mIn 0.4s cubic-bezier(0.19, 1, 0.22, 1); box-sizing: border-box; }
.modal-card-hyper * { box-sizing: border-box; }
@keyframes mIn { from { transform: scale(0.9) translateY(40px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }

.modal-head-row { padding: 30px; display: flex; align-items: center; gap: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.head-icon-ring { width: 55px; height: 55px; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.head-icon-ring.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.head-text h3 { margin: 0; font-size: 1.4rem; font-weight: 900; }
.head-text p { margin: 2px 0 0 0; color: var(--text-muted); font-weight: 700; }

.hyper-form { padding: 30px; display: flex; flex-direction: column; gap: 24px; max-height: 80vh; overflow-y: auto; scrollbar-width: thin; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.form-group-hud label { display: block; font-weight: 800; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px; text-transform: uppercase; }
.input-hud, .select-hud { display: flex; align-items: center; gap: 15px; padding: 12px 20px; border-radius: 16px; background: rgba(0,0,0,0.2); }
.input-hud i, .select-hud i { color: var(--text-muted); font-size: 1.1rem; }
.input-hud input, .select-hud select { background: transparent; border: none; flex: 1; color: white; font-weight: 700; outline: none !important; -webkit-appearance: none; appearance: none; box-shadow: none !important; }
.input-hud:focus-within, .select-hud:focus-within { background: rgba(255,255,255,0.05); }
.select-hud .arrow { font-size: 0.8rem; pointer-events: none; }

.modal-foot-hud { display: flex; justify-content: flex-end; gap: 15px; margin-top: 10px; }
.modal-foot-hud.center { justify-content: center; }

/* Buttons */
.btn-hyper { padding: 12px 24px; border-radius: 15px; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.3s; }
.btn-hyper.primary { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; box-shadow: 0 10px 20px rgba(59,130,246,0.3); }
.btn-hyper.primary:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(59,130,246,0.4); }
.btn-hyper.ghost { background: rgba(255,255,255,0.05); color: var(--text-main); border: 1px solid rgba(255,255,255,0.1); }
.btn-hyper.danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
.btn-hyper.danger:hover { background: #ef4444; color: white; }

.hud-actions-mini { display: flex; gap: 10px; justify-content: center; }
.mini-btn { width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-muted); cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
.mini-btn:hover { background: var(--bg-hover); color: var(--primary); transform: scale(1.15); border-color: var(--primary); }
.mini-btn.danger:hover { color: white; background: #ef4444; border-color: #ef4444; }

/* Empty State */
.mini-modal { text-align: center; padding: 45px 30px; display: flex; flex-direction: column; align-items: center; gap: 20px; max-width: 480px; }
.danger-ring { width: 90px; height: 90px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 10px auto; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
.danger-ring.pulsing { animation: dangerPulse 2s infinite; }
@keyframes dangerPulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 50% { transform: scale(1.05); box-shadow: 0 0 20px 10px rgba(239, 68, 68, 0.1); } }
.mini-modal h3 { font-size: 1.8rem; font-weight: 900; color: white; margin: 0; }
.mini-modal p { font-size: 1.1rem; color: var(--text-muted); font-weight: 600; line-height: 1.5; margin: 0 0 15px 0; }

.empty-directory-premium {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  padding: 140px 60px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 48px;
  margin: 40px 0;
  max-width: 100%;
  backdrop-filter: blur(30px);
  box-shadow: var(--shadow-2xl);
  animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.ghost-user-orb {
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

.empty-directory-premium h3 {
  font-size: 2.8rem;
  font-weight: 900;
  color: var(--text-main);
  margin: 0 0 12px 0;
  letter-spacing: -0.04em;
}

.empty-directory-premium p {
  font-size: 1.3rem;
  color: var(--text-muted);
  max-width: 500px;
  line-height: 1.5;
  font-weight: 600;
}

@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.ghost-pulse {
  animation: ghostFloat 3s ease-in-out infinite;
}

@keyframes ghostFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

@keyframes ghostFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.empty-directory h3 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 900;
  color: white;
}

.empty-directory p {
  margin: 10px 0 0 0;
  color: var(--text-muted);
  font-weight: 700;
  opacity: 0.7;
}

/* Transitions */
.stagger-user-enter-active { animation: userIn 0.6s cubic-bezier(0.19, 1, 0.22, 1) backwards; animation-delay: calc(var(--idx) * 0.05s); }
@keyframes userIn { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }

/* RTL Fixes */
[dir="rtl"] .directory-header { text-align: right; }
[dir="rtl"] .col-actions { justify-self: center; text-align: center; }
[dir="rtl"] .col-date, [dir="rtl"] .col-email { text-align: right; }

/* Responsive Adjustments */
@media (max-width: 1200px) {
  .directory-header, .user-tile-hyper { grid-template-columns: 2fr 2fr 1.5fr 1fr; }
  .col-date { display: none; }
}

@media (max-width: 600px) {
  .form-grid { grid-template-columns: 1fr; }
  .modal-card-hyper { border-radius: 25px; }
  .hyper-form { padding: 20px; }
  .users-header-hyper { flex-direction: column; align-items: flex-start; gap: 20px; }
  .h-actions-hud { width: 100%; justify-content: space-between; }
  .cyber-search-box { min-width: unset; flex: 1; }
}
</style>
