<template>
    <div class="project-members-view-vibrant" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">
        <!-- Redesigned Floating Header -->
        <div class="header-floating glass-panel-premium">
            <div class="header-main">
                <button class="btn-back-vibrant" @click="$router.push(`/projects/${projectId}`)" :title="$t('common.back')">
                    <i class="fa-solid" :class="$i18n.locale === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left'"></i>
                </button>
                <div class="title-stack">
                    <h1>{{ $t('members.title') }}</h1>
                    <div class="subtitle">
                        <i class="fa-solid fa-shield-halved"></i>
                        <span>{{ $t('members.manage_access') }}</span>
                    </div>
                </div>
            </div>
            <div class="header-actions" v-if="canManageMembers || isSuperuser">
                <button class="btn-add-member-vibrant" @click="openAddMemberModal">
                    <div class="btn-inner">
                        <i class="fa-solid fa-plus-circle"></i>
                        <span>{{ $t('members.add_member') }}</span>
                    </div>
                    <div class="btn-glow"></div>
                </button>
            </div>
        </div>

        <div v-if="loading" class="loading-state">
            <div class="spinner-vibrant"></div>
            <p>{{ $t('members.loading') }}</p>
        </div>
        
        <div v-else class="content-vibrant">
            <transition-group name="staggered-cards" tag="div" class="members-grid-vibrant">
                <div v-if="projectRoles.length === 0" class="empty-state-vibrant glass-panel-premium" :key="'empty'">
                    <div class="empty-vis-orb">
                        <i class="fa-solid fa-users-slash ghost-pulse"></i>
                    </div>
                    <h3>{{ $t('members.no_members') }}</h3>
                    <p>{{ $t('members.no_members_desc') }}</p>
                    <button v-if="canManageMembers || isSuperuser" class="btn-add-first" @click="openAddMemberModal">
                        {{ $t('members.add_first_member') }}
                    </button>
                </div>
                
                <div v-for="(member, index) in paginatedRoles" 
                     :key="member.id" 
                     class="member-card-vibrant glass-panel-premium" 
                     :style="{ '--delay': Math.min(index * 0.08, 0.8) + 's' }">
                    
                    <div class="card-interior">
                        <div class="member-header-vibrant">
                            <div class="avatar-container">
                                <div class="user-avatar-vibrant" :style="getAvatarStyle(member.username)">
                                    {{ member.username[0].toUpperCase() }}
                                </div>
                                <div class="status-indicator-vibrant" title="Online"></div>
                            </div>
                            
                            <div class="member-meta">
                                <h4 class="username-vibrant">@{{ member.username }}</h4>
                                <div class="email-vibrant">
                                    <i class="fa-regular fa-envelope"></i>
                                    <span>{{ member.email }}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card-body-vibrant">
                            <div class="role-chip" :class="member.role.toLowerCase()">
                                <i :class="getRoleIcon(member.role)"></i>
                                <span class="role-text">{{ $t(`members.role_${member.role.toLowerCase()}`) }}</span>
                            </div>
                        </div>
                        
                        <div class="card-footer-vibrant" v-if="canManageMembers || isSuperuser">
                            <button class="action-btn-vibrant edit" @click="openEditRoleModal(member)">
                                <i class="fa-solid fa-pen-nib"></i>
                                <span>{{ $t('members.edit_role') }}</span>
                            </button>
                            <div class="footer-divider"></div>
                            <button class="action-btn-vibrant remove" @click="removeMember(member.id)">
                                <i class="fa-solid fa-user-minus"></i>
                                <span>{{ $t('members.remove') }}</span>
                            </button>
                        </div>
                    </div>
                    <!-- Decorative backglows -->
                    <div class="card-glow-bg"></div>
                </div>
            </transition-group>
            
            <ElitePagination 
                v-if="!loading && projectRoles.length > 0"
                :totalItems="projectRoles.length" 
                :itemsPerPage="itemsPerPage" 
                :currentPage="currentPage" 
                @update:currentPage="p => currentPage = p" 
                style="margin-top: 20px"
            />
        </div>

        <!-- Add/Edit Member Modal (Vibrant Glass Styling) -->
        <transition name="modal-bounce">
            <div v-if="showModal" class="modal-overlay-vibrant" @click.self="closeModal">
                <div class="modal-glass-container glass-panel-premium">
                    <div class="modal-header-vibrant">
                        <h2>{{ editingRole ? $t('members.edit_member_role') : $t('members.add_new_member') }}</h2>
                        <button class="btn-close-vibrant" @click="closeModal"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    
                    <div class="modal-body-vibrant">
                        <!-- User Selection -->
                        <div class="glass-form-group" v-if="!editingRole">
                            <label class="glass-label">{{ $t('members.select_user') }}</label>
                            <div class="glass-select-pod">
                                <i class="fa-solid fa-user-circle"></i>
                                <select v-model="formData.user">
                                    <option value="" disabled>{{ $t('members.choose_user') }}</option>
                                    <option v-for="u in availableUsers" :key="u.id" :value="u.id">
                                        {{ u.username }} &lt;{{ u.email }}&gt;
                                    </option>
                                </select>
                                <i class="fa-solid fa-chevron-down arrow"></i>
                            </div>
                        </div>
                        
                        <div class="glass-form-group" v-else>
                            <label class="glass-label">{{ $t('members.user') }}</label>
                            <div class="glass-input-pod disabled">
                                <i class="fa-solid fa-user-lock"></i>
                                <input type="text" :value="editingRole.username" disabled />
                            </div>
                        </div>
                        
                        <!-- Role Selection -->
                        <div class="glass-form-group">
                            <label class="glass-label">{{ $t('members.project_role') }}</label>
                            <div class="glass-select-pod">
                                <i class="fa-solid fa-shield-halved"></i>
                                <select v-model="formData.role">
                                    <option value="ADMIN">{{ $t('members.role_admin_desc') }}</option>
                                    <option value="MEMBER">{{ $t('members.role_member_desc') }}</option>
                                    <option value="VIEWER">{{ $t('members.role_viewer_desc') }}</option>
                                </select>
                                <i class="fa-solid fa-chevron-down arrow"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer-vibrant">
                        <button @click="closeModal" class="btn-secondary-vibrant">{{ $t('common.cancel') }}</button>
                        <button @click="saveRole" 
                                class="btn-primary-vibrant" 
                                :class="{ 'btn-loading': loadingSave, 'btn-success': isSuccess }" 
                                :disabled="!formData.role || (!editingRole && !formData.user) || loadingSave">
                            <span v-if="loadingSave"><i class="fa-solid fa-circle-notch fa-spin"></i></span>
                            <span v-else-if="isSuccess"><i class="fa-solid fa-check"></i></span>
                            <span v-else>
                                {{ editingRole ? $t('common.save') : $t('members.add_member') }}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </transition>

        <ConfirmModal 
          :isOpen="showDeleteConfirm" 
          :title="$t('members.remove_member')" 
          :message="$t('members.remove_member_confirm')" 
          :confirmText="$t('members.remove')" 
          :cancelText="$t('common.cancel')" 
          type="danger" 
          @confirm="confirmRemoveMember" 
          @cancel="showDeleteConfirm = false" 
        />

    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import ConfirmModal from '../components/ConfirmModal.vue';
import axios from '@/plugins/axios';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import ElitePagination from '@/components/ElitePagination.vue';

const { t } = useI18n();
const { canManageMembers, canViewMembers, isSuperuser } = usePermissions();
const { showToast } = useToast();

const API_BASE = '/api/pm';
const AUTH_API = '/api/pm';

const props = defineProps(['projectId']);
const route = useRoute();
const projectId = props.projectId || route.params.projectId;

const currentPage = ref(1);
const itemsPerPage = ref(12);

const loading = ref(true);
const projectRoles = ref([]);
const availableUsers = ref([]);
const showModal = ref(false);
const editingRole = ref(null);
const userRole = ref('VIEWER');
const isAdmin = ref(false);
const isSuperUser = ref(false);
const loadingSave = ref(false);
const isSuccess = ref(false);

const formData = ref({
    user: '',
    role: 'MEMBER'
});

const paginatedRoles = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return projectRoles.value.slice(start, start + itemsPerPage.value);
});

const fetchProjectRoles = async () => {
    loading.value = true;
    try {
        const res = await axios.get(`${API_BASE}/project-roles/?project=${projectId}`);
        projectRoles.value = res.data;
        const username = localStorage.getItem('username');
        isSuperUser.value = localStorage.getItem('is_superuser') === 'true';
        const myRoleDef = projectRoles.value.find(r => r.username === username);
        if (myRoleDef) {
            userRole.value = myRoleDef.role;
        } else {
            userRole.value = isSuperUser.value ? 'ADMIN' : 'VIEWER';
        }
        isAdmin.value = userRole.value === 'ADMIN' || isSuperUser.value;
    } catch (e) { console.error(e); }
    loading.value = false;
};

const fetchAllUsers = async () => {
    try {
        const res = await axios.get(`${AUTH_API}/all-users/`);
        availableUsers.value = res.data;
    } catch (e) { console.error(e); }
};

onMounted(() => {
    fetchProjectRoles();
    fetchAllUsers();
});

const openAddMemberModal = () => {
    editingRole.value = null;
    formData.value = { user: '', role: 'MEMBER' };
    showModal.value = true;
};

const openEditRoleModal = (member) => {
    editingRole.value = member;
    formData.value = { user: member.user, role: member.role };
    showModal.value = true;
};

const closeModal = () => {
    showModal.value = false;
    editingRole.value = null;
};

const saveRole = async () => {
    loadingSave.value = true;
    try {
        if (editingRole.value) {
            const res = await axios.patch(`${API_BASE}/project-roles/${editingRole.value.id}/`, {
                role: formData.value.role
            });
            fetchProjectRoles();
            isSuccess.value = true;
            setTimeout(() => { isSuccess.value = false; closeModal(); }, 1500);
        } else {
            const res = await axios.post(`${API_BASE}/project-roles/`, {
                project: projectId,
                user: formData.value.user,
                role: formData.value.role
            });
            fetchProjectRoles();
            isSuccess.value = true;
            setTimeout(() => { isSuccess.value = false; closeModal(); }, 1500);
        }
    } catch (e) {
        console.error(e);
        if (!editingRole.value) showToast(t('members.add_error'), 'error');
    } finally { loadingSave.value = false; }
};

const showDeleteConfirm = ref(false);
const memberToDelete = ref(null);

const removeMember = (id) => {
    memberToDelete.value = id;
    showDeleteConfirm.value = true;
};

const confirmRemoveMember = async () => {
    if (!memberToDelete.value) return;
    try {
        await axios.delete(`${API_BASE}/project-roles/${memberToDelete.value}/`);
        fetchProjectRoles();
    } catch (e) { console.error(e); } finally {
        showDeleteConfirm.value = false;
        memberToDelete.value = null;
    }
};

const getAvatarStyle = (username) => {
    const hues = [210, 260, 290, 340, 40, 160];
    const index = username.length % hues.length;
    const h = hues[index];
    return {
        background: `linear-gradient(135deg, hsl(${h}, 80%, 70%), hsl(${h + 30}, 80%, 55%))`,
        color: 'white',
        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };
};

const getRoleIcon = (role) => {
    switch(role) {
        case 'ADMIN': return 'fa-solid fa-crown';
        case 'MEMBER': return 'fa-solid fa-user-gear';
        case 'VIEWER': return 'fa-solid fa-eye';
        default: return 'fa-solid fa-user';
    }
};
</script>

<style scoped>
.project-members-view-vibrant {
    padding: 30px;
    min-height: 100vh;
    background: var(--bg-body);
    display: flex;
    flex-direction: column;
    gap: 30px;
    position: relative;
    overflow-x: hidden;
}

/* Floating Header */
.header-floating {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 30px;
    border-radius: 24px;
    margin-bottom: 10px;
    z-index: 10;
}

.header-main {
    display: flex;
    align-items: center;
    gap: 24px;
}

.btn-back-vibrant {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    background: var(--glass-bg);
    color: var(--text-main);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 1.1rem;
}

.btn-back-vibrant:hover {
    background: var(--primary);
    color: white;
    transform: translateX(-4px);
    border-color: var(--primary);
}

[dir="rtl"] .btn-back-vibrant:hover {
    transform: translateX(4px);
}

.title-stack h1 {
    margin: 0 0 6px 0;
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-main);
}

.subtitle {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: 0.95rem;
    font-weight: 500;
}

.subtitle i { color: var(--primary); font-size: 0.8rem; }

/* Add Member Button */
.btn-add-member-vibrant {
    position: relative;
    padding: 12px 24px;
    border-radius: 16px;
    border: none;
    background: var(--primary);
    color: white;
    font-weight: 700;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s;
    box-shadow: 0 10px 20px -5px var(--primary-glow);
}

.btn-inner {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 10px;
}

.btn-add-member-vibrant:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 15px 30px -8px var(--primary-glow);
}

.btn-glow {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.3s;
}

.btn-add-member-vibrant:hover .btn-glow { opacity: 1; }

/* Grid Layout */
.members-grid-vibrant {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 24px;
}

/* Redesigned Card */
.member-card-vibrant {
    position: relative;
    border-radius: 28px;
    padding: 24px;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
}

.member-card-vibrant:hover {
    transform: translateY(-8px);
    border-color: var(--primary);
}

.card-interior {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.member-header-vibrant {
    display: flex;
    align-items: center;
    gap: 20px;
}

.avatar-container {
    position: relative;
    flex-shrink: 0;
}

.user-avatar-vibrant {
    width: 68px;
    height: 68px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    font-weight: 800;
    box-shadow: 0 8px 16px -4px rgba(0,0,0,0.15);
}

.status-indicator-vibrant {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 14px;
    height: 14px;
    background: #10b981;
    border-radius: 50%;
    border: 3px solid var(--bg-surface);
}

.username-vibrant {
    margin: 0 0 4px 0;
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--text-main);
    letter-spacing: -0.02em;
}

.email-vibrant {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: var(--text-muted);
}

.role-chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.role-chip.admin { background: rgba(124, 58, 237, 0.1); color: var(--primary); border: 1px solid rgba(124, 58, 237, 0.2); }
.role-chip.member { background: rgba(37, 99, 235, 0.1); color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.2); }
.role-chip.viewer { background: rgba(148, 163, 184, 0.1); color: #64748b; border: 1px solid rgba(148, 163, 184, 0.2); }

.card-footer-vibrant {
    margin-top: 10px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-around;
}

.footer-divider {
    width: 1px;
    height: 24px;
    background: var(--border-color);
}

.action-btn-vibrant {
    background: transparent;
    border: none;
    padding: 8px 12px;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    transition: all 0.2s;
    color: var(--text-muted);
}

.action-btn-vibrant:hover {
    color: var(--text-main);
    background: var(--bg-hover);
}

.action-btn-vibrant.remove:hover {
    color: var(--ds-red);
    background: var(--ds-red-light);
}

.card-glow-bg {
    position: absolute;
    inset: 0;
    border-radius: 28px;
    background: radial-gradient(circle at top right, var(--primary-bg), transparent 70%);
    opacity: 0;
    transition: opacity 0.4s;
    pointer-events: none;
}

.member-card-vibrant:hover .card-glow-bg { opacity: 1; }

/* Empty State XL */
.empty-state-vibrant {
  grid-column: 1 / -1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin: 40px 0;
  padding: 140px 60px;
  gap: 32px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 48px;
  backdrop-filter: blur(30px);
  box-shadow: var(--shadow-2xl);
  text-align: center;
  animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.empty-vis-orb {
    position: relative;
    width: 160px;
    height: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 5.5rem;
    color: var(--primary);
    background: var(--primary-bg);
    border-radius: 45px;
    margin-bottom: 12px;
    box-shadow: 0 25px 50px -12px var(--primary-glow);
}

.empty-state-vibrant h3 {
    font-size: 2.8rem;
    font-weight: 900;
    margin: 0;
    color: var(--text-main);
    letter-spacing: -0.04em;
}

.empty-state-vibrant p {
    font-size: 1.3rem;
    max-width: 500px;
    color: var(--text-muted);
    font-weight: 600;
}

.ghost-pulse {
    animation: ghostFloat 3s ease-in-out infinite;
}

@keyframes ghostFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
}

@keyframes slideUpFade {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
}

.btn-add-first {
    background: var(--primary);
    color: white;
    border: none;
    padding: 14px 32px;
    border-radius: 16px;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 10px 20px -5px var(--primary-glow);
}

.btn-add-first:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 15px 30px -8px var(--primary-glow);
}

/* Modal Enhancements */
.modal-overlay-vibrant {
    position: fixed; inset: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: 2000;
    padding: 20px;
}

.modal-glass-container {
    width: 480px;
    max-width: 100%;
    border-radius: 32px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 30px;
    box-shadow: 0 40px 80px -20px rgba(0,0,0,0.3);
}

.modal-header-vibrant {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header-vibrant h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-main);
}

.btn-close-vibrant {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--bg-hover);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
}

.btn-close-vibrant:hover {
    transform: rotate(90deg);
    background: var(--ds-red-light);
    color: var(--ds-red);
}

.modal-body-vibrant {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.glass-form-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.glass-label {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-main);
    margin-left: 4px;
}

.glass-input-pod, .glass-select-pod {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--bg-body);
    border: 2px solid var(--border-color);
    border-radius: 18px;
    padding: 0 16px;
    transition: all 0.3s;
}

.glass-input-pod i, .glass-select-pod i {
    font-size: 1.2rem;
    color: var(--primary);
    opacity: 0.7;
}

.glass-input-pod input, .glass-select-pod select {
    flex: 1;
    border: none;
    background: transparent;
    padding: 16px 12px;
    font-size: 1rem;
    color: var(--text-main);
    font-weight: 600;
    outline: none;
}

.glass-select-pod select {
    appearance: none;
    cursor: pointer;
}

.glass-input-pod:focus-within, .glass-select-pod:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px var(--primary-bg);
}

.glass-input-pod.disabled {
    background: var(--bg-hover);
    opacity: 0.6;
}

.modal-footer-vibrant {
    display: flex;
    justify-content: flex-end;
    gap: 16px;
}

.btn-primary-vibrant {
    padding: 14px 28px;
    border-radius: 16px;
    background: var(--primary);
    color: white;
    border: none;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-primary-vibrant:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px -5px var(--primary-glow);
}

.btn-secondary-vibrant {
    padding: 14px 28px;
    border-radius: 16px;
    background: var(--bg-hover);
    color: var(--text-main);
    border: 1px solid var(--border-color);
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-secondary-vibrant:hover {
    background: var(--bg-card);
}

/* Global Glass Panel (Ensuring overrides if needed) */
.glass-panel-premium {
    background: var(--bg-card);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
}

/* Staggered Animations */
.staggered-cards-enter-active {
    animation: slideInUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) both;
    animation-delay: var(--delay);
}

@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.modal-bounce-enter-active {
    animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes bounceIn {
    from { opacity: 0; transform: scale(0.85) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

.loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
}

.spinner-vibrant {
    width: 40px;
    height: 40px;
    border: 4px solid var(--primary-bg);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* RTL Tweaks */
[dir="rtl"] .title-stack h1 { letter-spacing: normal; }
[dir="rtl"] .glass-select-pod .arrow { right: auto; left: 16px; }
[dir="rtl"] .footer-divider { transform: scaleX(-1); }
</style>
