<template>
  <div class="permissions-universe" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">

    <!-- Top Bar -->
    <header class="floating-top-bar">
      <div class="bar-left">
        <div class="elite-breadcrumbs">
          <span class="crumb active">{{ $t('permissions.title') }}</span>
        </div>
      </div>
      <div class="bar-right">
        <button v-if="currentView === 'list'" @click="openEditor(null)" class="btn-create-field">
          <i class="fas fa-plus"></i>
          <span>{{ $t('permissions.new_group') }}</span>
        </button>
        <template v-else>
          <button @click="currentView = 'list'" class="btn-back-orb">
            <i :class="$i18n.locale === 'ar' ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left'"></i>
          </button>
          <span class="editor-title-pill">{{ editingGroup.name || '...' }}</span>
        </template>
      </div>
    </header>

    <main class="main-stage overflow-y-auto custom-scrollbar">
      <div class="content-padding  p-4 md:p-10 ">

        <!-- LIST VIEW -->
        <template v-if="currentView === 'list'">

          <!-- Loading -->
          <div v-if="loading && groups.length === 0" class="premium-empty-state">
            <div class="pulsing-orb-container mb-10">
              <div class="orb-pulse primary-pulse"></div>
              <div class="orb-core primary-core">
                <AnimatedIcon name="permissions" size="xl" />
              </div>
            </div>
          </div>

          <!-- Empty -->
          <div v-else-if="groups.length === 0" class="premium-empty-state">
            <div class="pulsing-orb-container mb-10">
              <div class="orb-pulse primary-pulse"></div>
              <div class="orb-core primary-core">
                <AnimatedIcon name="permissions" size="xl" />
              </div>
            </div>
            <h2 class="empty-title-elite">{{ $t('permissions.no_groups') }}</h2>
            <p class="empty-desc-elite">{{ $t('common.no_data') }}</p>
            <button @click="openEditor(null)" class="btn-elite-solid primary mt-10">
              <i class="fas fa-plus"></i> {{ $t('permissions.new_group') }}
            </button>
          </div>

          <!-- Groups Table -->
          <div v-else class="elite-table-panel max-w-7xl mx-auto" :style="{ '--grid-cols': '60px 1fr 120px 200px 120px' }">
            <div class="elite-table-header">
              <span></span>
              <span>{{ $t('permissions.group_name') }}</span>
              <span class="text-center">{{ $t('permissions.member_suffix') }}</span>
              <span>{{ $t('permissions.access_rights') }}</span>
              <span class="text-center">{{ $t('common.actions') }}</span>
            </div>

            <div v-for="(group, idx) in groups" :key="group.id"
                 class="elite-table-row animate-slide-in"
                 :style="{ animationDelay: idx * 0.05 + 's' }"
                 @click="openEditor(group)"
                 style="cursor:pointer">

              <div class="elite-table-cell justify-center">
                <div class="elite-table-cell-icon primary">
                  <AnimatedIcon name="permissions" size="xs" />
                </div>
              </div>

              <div class="elite-table-cell">
                <span class="main-text">{{ group.name }}</span>
              </div>

              <div class="elite-table-cell justify-center">
                <span class="member-count-badge">
                  <i class="fas fa-users"></i> {{ group.user_count || 0 }}
                </span>
              </div>

              <div class="elite-table-cell" style="gap:6px;flex-wrap:wrap">
                <span v-if="group.can_view_dashboard" class="p-chip active">{{ $t('permissions.perms.dashboard') }}</span>
                <span v-if="group.can_view_issues" class="p-chip active">{{ $t('permissions.perms.issues') }}</span>
                <span v-if="group.can_manage_permissions" class="p-chip active">{{ $t('common.permissions') }}</span>
                <span v-if="!group.can_view_dashboard && !group.can_view_issues && !group.can_manage_permissions" class="p-chip">—</span>
              </div>

              <div class="elite-table-cell justify-center" style="gap:8px">
                <button @click.stop="openEditor(group)" class="btn-elite-icon" :title="$t('common.edit')">
                  <AnimatedIcon name="edit" size="xs" />
                </button>
                <button @click.stop="confirmDelete(group)" class="btn-elite-icon danger" :title="$t('common.delete')">
                  <AnimatedIcon name="trash" size="xs" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- EDITOR VIEW -->
        <template v-else>
          <div class="editor-layout max-w-7xl mx-auto">

            <!-- Sidebar -->
            <div class="editor-sidebar">
              <div class="elite-table-panel" style="--grid-cols:1fr">
                <div class="elite-table-header">
                  <span>{{ $t('permissions.group_name') }}</span>
                </div>
                <div style="padding:20px">
                  <div class="elite-input-group">
                    <div class="elite-input-wrapper">
                      <i class="fas fa-shield-alt elite-input-icon"></i>
                      <input v-model="editingGroup.name"
                             type="text"
                             class="elite-input-field has-icon"
                             :placeholder="$t('permissions.placeholders.group_name')" />
                    </div>
                  </div>
                </div>
              </div>

              <div class="rights-summary-card">
                <div class="rights-num">{{ activePermissionsCount }}</div>
                <div class="rights-lbl">{{ $t('permissions.access_rights') }}</div>
              </div>
            </div>

            <!-- Permissions Grid -->
            <div class="perm-grid">
              <div v-for="cat in permissionCategories" :key="cat.id" class="perm-card elite-table-panel" style="--grid-cols:1fr">
                <div class="perm-card-header" :style="{ borderColor: cat.color }">
                  <div class="perm-card-icon" :style="{ background: cat.color + '20', color: cat.color }">
                    <AnimatedIcon :name="cat.icon" size="xs" />
                  </div>
                  <span>{{ $t(cat.label) }}</span>
                </div>
                <div class="perm-card-body">
                  <div v-for="perm in cat.perms" :key="perm.key"
                       class="perm-row"
                       :class="{ enabled: editingGroup[perm.key] }">
                    <div class="perm-meta">
                      <span class="perm-title">{{ $t(perm.title) }}</span>
                      <span class="perm-desc">{{ $t(perm.desc) }}</span>
                    </div>
                    <label class="premium-switch">
                      <input type="checkbox" v-model="editingGroup[perm.key]">
                      <span class="switch-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Floating Save Bar -->
          <div class="floating-save-bar">
            <div class="save-status" :class="{ saving, success: isSuccess }">
              <template v-if="saving">
                <i class="fas fa-spinner fa-spin"></i> {{ $t('common.saving') }}...
              </template>
              <template v-else-if="isSuccess">
                <i class="fas fa-check-circle"></i> {{ $t('common.saved') }}
              </template>
              <template v-else>
                <i class="fas fa-shield-alt"></i> {{ activePermissionsCount }} {{ $t('permissions.access_rights') }}
              </template>
            </div>
            <div style="display:flex;gap:12px">
              <button @click="currentView = 'list'" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
              <button @click="saveGroup" class="btn-elite-solid primary" :disabled="saving">
                <span v-if="saving" class="spinner-tiny"></span>
                <i v-else class="fas fa-check-circle"></i>
                {{ saving ? '...' : $t('permissions.save') }}
              </button>
            </div>
          </div>
        </template>

      </div>
    </main>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showDeleteConfirm" class="elite-modal-backdrop" @click.self="showDeleteConfirm = false">
          <div class="elite-modal-window small glassmorphism animate-pop">
            <div class="modal-header-elite danger">
              <div class="modal-icon-orb danger-orb"><i class="fas fa-trash-can"></i></div>
              <h3>{{ $t('permissions.delete_group_title') }}</h3>
            </div>
            <div class="modal-body-elite" style="padding:24px 28px">
              <p style="color:var(--text-muted);margin:0">
                {{ $t('permissions.delete_group_msg', { group: groupToDelete?.name }) }}
              </p>
            </div>
            <div class="modal-footer-elite">
              <button @click="showDeleteConfirm = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
              <button @click="deleteGroup" class="btn-elite-solid danger" :disabled="deleting">
                <span v-if="deleting" class="spinner-tiny"></span>
                <i v-else class="fas fa-trash"></i>
                {{ deleting ? '...' : $t('common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Toast -->
    <div class="toast-stack">
      <transition name="toast-slide">
        <div v-if="message" :key="message.id" class="toast-item" :class="message.type">
          <i :class="message.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'"></i>
          <span>{{ message.text }}</span>
        </div>
      </transition>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '@/plugins/axios';
import AnimatedIcon from '@/components/AnimatedIcon.vue';

const { t, locale } = useI18n();

const ready = ref(false);
const loading = ref(false);
const saving = ref(false);
const isSuccess = ref(false);
const deleting = ref(false);
const groups = ref([]);
const currentView = ref('list');
const showDeleteConfirm = ref(false);
const editingGroup = ref({});
const groupToDelete = ref(null);
const message = ref(null);

const permissionCategories = [
  {
    id: 'dash', label: 'permissions.perms.dashboard', icon: 'dashboard', color: '#6366f1',
    perms: [{ key: 'can_view_dashboard', title: 'permissions.perms.dashboard', desc: 'permissions.perms.dashboard_desc' }]
  },
  {
    id: 'issues', label: 'permissions.perms.issues', icon: 'issues', color: '#ef4444',
    perms: [
      { key: 'can_view_issues', title: 'permissions.perms.issues', desc: 'permissions.perms.issues_desc' },
      { key: 'can_delete_issues', title: 'permissions.perms.delete_issues', desc: 'permissions.perms.delete_issues_desc' }
    ]
  },
  {
    id: 'users', label: 'permissions.perms.users', icon: 'users', color: '#10b981',
    perms: [
      { key: 'can_view_users', title: 'permissions.perms.users', desc: 'permissions.perms.users_desc' },
      { key: 'can_view_user_projects', title: 'permissions.perms.view_user_projects', desc: 'permissions.perms.view_user_projects_desc' }
    ]
  },
  {
    id: 'projects', label: 'common.projects', icon: 'projects', color: '#06b6d4',
    perms: [
      { key: 'can_create_project', title: 'permissions.perms.create_project', desc: 'permissions.perms.create_project_desc' },
      { key: 'can_edit_project', title: 'permissions.perms.edit_project', desc: 'permissions.perms.edit_project_desc' },
      { key: 'can_delete_project', title: 'permissions.perms.delete_project', desc: 'permissions.perms.delete_project_desc' },
    ]
  },
  {
    id: 'tasks', label: 'common.tasks', icon: 'board', color: '#3b82f6',
    perms: [
      { key: 'can_create_task', title: 'permissions.perms.create_task', desc: 'permissions.perms.create_task_desc' },
      { key: 'can_edit_task', title: 'permissions.perms.edit_task', desc: 'permissions.perms.edit_task_desc' },
      { key: 'can_delete_task', title: 'permissions.perms.delete_task', desc: 'permissions.perms.delete_task_desc' },
    ]
  },
  {
    id: 'backlog', label: 'permissions.perms.view_backlog', icon: 'backlog', color: '#8b5cf6',
    perms: [
      { key: 'can_view_backlog', title: 'permissions.perms.view_backlog', desc: 'permissions.perms.view_backlog_desc' },
      { key: 'can_manage_sprints', title: 'permissions.perms.manage_sprints', desc: 'permissions.perms.manage_sprints_desc' },
      { key: 'can_manage_epics', title: 'permissions.perms.manage_epics', desc: 'permissions.perms.manage_epics_desc' },
    ]
  },
  {
    id: 'members', label: 'permissions.perms.view_members', icon: 'users', color: '#f59e0b',
    perms: [
      { key: 'can_view_members', title: 'permissions.perms.view_members', desc: 'permissions.perms.view_members_desc' },
      { key: 'can_manage_members', title: 'permissions.perms.manage_members', desc: 'permissions.perms.manage_members_desc' },
    ]
  },
  {
    id: 'docs', label: 'permissions.perms.view_docs', icon: 'docs', color: '#06b6d4',
    perms: [
      { key: 'can_view_docs', title: 'permissions.perms.view_docs', desc: 'permissions.perms.view_docs_desc' },
      { key: 'can_create_doc', title: 'permissions.perms.create_doc', desc: 'permissions.perms.create_doc_desc' },
      { key: 'can_edit_doc', title: 'permissions.perms.edit_doc', desc: 'permissions.perms.edit_doc_desc' },
      { key: 'can_delete_doc', title: 'permissions.perms.delete_doc', desc: 'permissions.perms.delete_doc_desc' },
    ]
  },
  {
    id: 'releases', label: 'common.releases', icon: 'releases', color: '#f97316',
    perms: [
      { key: 'can_manage_releases', title: 'permissions.perms.manage_releases', desc: 'permissions.perms.manage_releases_desc' },
    ]
  },
  {
    id: 'eval', label: 'eval.title', icon: 'evaluations', color: '#fbbf24',
    perms: [
      { key: 'can_view_evaluations', title: 'permissions.perms.view_evaluations', desc: 'permissions.perms.view_evaluations_desc' },
      { key: 'can_manage_evaluations', title: 'permissions.perms.manage_evaluations', desc: 'permissions.perms.manage_evaluations_desc' },
      { key: 'can_view_performance', title: 'permissions.perms.view_performance', desc: 'permissions.perms.view_performance_desc' },
    ]
  },
  {
    id: 'admin', label: 'common.permissions', icon: 'permissions', color: '#8b5cf6',
    perms: [
      { key: 'can_view_settings', title: 'permissions.perms.settings', desc: 'permissions.perms.settings_desc' },
      { key: 'can_view_reports', title: 'permissions.perms.view_reports', desc: 'permissions.perms.view_reports_desc' },
      { key: 'can_view_chat', title: 'permissions.perms.view_chat', desc: 'permissions.perms.view_chat_desc' },
      { key: 'can_view_notifications', title: 'permissions.perms.view_notifications', desc: 'permissions.perms.view_notifications_desc' },
      { key: 'can_manage_permissions', title: 'permissions.perms.manage_permissions', desc: 'permissions.perms.manage_permissions_desc' },
    ]
  }
];

const ALL_PERM_KEYS = [
  'can_view_dashboard','can_view_issues','can_view_users','can_view_settings',
  'can_delete_issues','can_create_project','can_edit_project','can_delete_project',
  'can_create_task','can_edit_task','can_delete_task','can_view_user_projects',
  'can_view_backlog','can_manage_sprints','can_manage_epics','can_view_reports',
  'can_view_members','can_manage_members','can_view_chat','can_view_docs',
  'can_create_doc','can_edit_doc','can_delete_doc','can_manage_releases',
  'can_view_evaluations','can_manage_evaluations','can_view_performance',
  'can_view_notifications','can_manage_permissions',
];

const activePermissionsCount = computed(() => {
  if (!editingGroup.value) return 0;
  return ALL_PERM_KEYS.filter(k => editingGroup.value[k]).length;
});

const fetchGroups = async () => {
  loading.value = true;
  try {
    const res = await axios.get('/api/admin/groups/');
    groups.value = res.data;
  } catch { showMessage(t('common.fetch_error'), 'error'); } finally { loading.value = false; }
};

const openEditor = (group) => {
  if (group) {
    editingGroup.value = { ...group };
  } else {
    editingGroup.value = {
      name: '',
      can_view_dashboard: true, can_view_issues: true, can_view_users: false, can_view_settings: false,
      can_delete_issues: false, can_create_project: false, can_edit_project: false, can_delete_project: false,
      can_create_task: false, can_edit_task: true, can_delete_task: false, can_view_user_projects: false,
      can_view_backlog: true, can_manage_sprints: false, can_manage_epics: false,
      can_view_reports: true, can_view_members: true, can_manage_members: false, can_view_chat: true,
      can_view_docs: true, can_create_doc: false, can_edit_doc: false, can_delete_doc: false,
      can_manage_releases: false, can_view_evaluations: false, can_manage_evaluations: false,
      can_view_performance: true, can_view_notifications: true, can_manage_permissions: false,
    };
  }
  currentView.value = 'editor';
};

const saveGroup = async () => {
  if (!editingGroup.value.name) {
    showMessage(locale.value === 'ar' ? 'يرجى إدخال اسم المجموعة' : 'Please enter group name', 'error');
    return;
  }
  saving.value = true;
  try {
    const res = await axios.post('/api/admin/groups/update/', editingGroup.value);
    if (res.data.status === 'success') {
      showMessage(locale.value === 'ar' ? 'تم حفظ المجموعة بنجاح' : 'Group saved successfully', 'success');
      fetchGroups();
      isSuccess.value = true;
      setTimeout(() => { isSuccess.value = false; currentView.value = 'list'; }, 1000);
    } else {
      const err = res.data.errors ? Object.values(res.data.errors).flat().join(', ') : 'Unknown error';
      showMessage(err, 'error');
    }
  } catch (e) {
    const err = e.response?.data?.errors ? Object.values(e.response.data.errors).flat().join(', ') : (locale.value === 'ar' ? 'فشل في حفظ المجموعة' : 'Failed to save group');
    showMessage(err, 'error');
  } finally { saving.value = false; }
};

const confirmDelete = (group) => { groupToDelete.value = group; showDeleteConfirm.value = true; };

const deleteGroup = async () => {
  deleting.value = true;
  try {
    const res = await axios.delete(`/api/admin/groups/${groupToDelete.value.id}/delete/`);
    if (res.data.status === 'success') {
      showMessage(locale.value === 'ar' ? 'تم حذف المجموعة بنجاح' : 'Group deleted successfully', 'success');
      fetchGroups();
      showDeleteConfirm.value = false;
    }
  } finally { deleting.value = false; }
};

const showMessage = (text, type) => {
  message.value = { id: Date.now(), text, type };
  setTimeout(() => { message.value = null; }, 4000);
};

onMounted(() => { fetchGroups(); });
</script>

<style scoped>
.permissions-universe {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--bg-body);
  color: var(--text-main);
  font-family: var(--font-family);
}

/* Top Bar */
.floating-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  height: 80px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
  backdrop-filter: blur(25px);
  z-index: 50;
  flex-shrink: 0;
}
.bar-left { display: flex; align-items: center; gap: 20px; }
.bar-right { display: flex; align-items: center; gap: 12px; }

.elite-breadcrumbs { display: flex; align-items: center; gap: 12px; }
.crumb { font-size: 0.9rem; font-weight: 700; color: var(--text-muted); }
.crumb.active { color: var(--text-main); font-weight: 900; }

.btn-back-orb {
  width: 44px; height: 44px; border-radius: 12px; background: transparent;
  border: 1px solid var(--border-color); color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: 0.3s;
}
.btn-back-orb:hover { background: var(--bg-hover); color: var(--primary); border-color: var(--primary); }

.editor-title-pill {
  font-size: 0.85rem; font-weight: 700;
  background: var(--primary-bg); color: var(--primary);
  padding: 6px 14px; border-radius: 20px;
  border: 1px solid var(--primary-glow);
}

.btn-create-field {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px; background: var(--primary); color: #fff;
  border: none; border-radius: 12px; font-size: 14px; font-weight: 700;
  font-family: var(--font-family); cursor: pointer;
  transition: all 0.2s; box-shadow: 0 4px 14px var(--primary-glow);
}
.btn-create-field:hover { transform: translateY(-2px); filter: brightness(1.08); }

/* Main */
.main-stage { flex: 1; min-height: 0; }

/* Empty State */
.premium-empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 160px 40px; text-align: center; max-width: 900px; margin: 0 auto;
}
.pulsing-orb-container { position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; }
.orb-pulse { position: absolute; inset: -20px; border-radius: 50%; opacity: 0.2; animation: orbPulse 3s cubic-bezier(0.4,0,0.6,1) infinite; }
.orb-pulse.primary-pulse { background: radial-gradient(circle, var(--primary) 0%, transparent 70%); }
.orb-core { position: relative; width: 90px; height: 90px; border-radius: 30px; display: flex; align-items: center; justify-content: center; color: white; background: var(--primary); box-shadow: 0 20px 40px var(--primary-glow); transform: rotate(45deg); }
.orb-core :deep(svg), .orb-core i { transform: rotate(-45deg); }
@keyframes orbPulse { 0% { transform: scale(0.8); opacity: 0; } 50% { opacity: 0.4; } 100% { transform: scale(1.8); opacity: 0; } }
.empty-title-elite { font-size: 3.5rem; font-weight: 1000; color: var(--text-main); margin-bottom: 16px; letter-spacing: -3px; }
.empty-desc-elite { font-size: 1.3rem; color: var(--text-muted); max-width: 550px; line-height: 1.7; }
.mt-10 { margin-top: 24px; }

/* Table */
.member-count-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.75rem; font-weight: 700; color: var(--primary);
  background: var(--primary-bg); padding: 4px 10px; border-radius: 20px;
  border: 1px solid var(--primary-glow);
}
.p-chip {
  padding: 3px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: 800;
  background: var(--bg-hover); color: var(--text-muted);
  border: 1px solid var(--border-color);
}
.p-chip.active { border-color: var(--primary); color: var(--primary); background: var(--primary-bg); }

.animate-slide-in { animation: slideIn 0.5s cubic-bezier(0.2,0.8,0.2,1) forwards; opacity: 0; }
@keyframes slideIn { to { opacity: 1; } }

/* Editor Layout */
.editor-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: start;
  padding-bottom: 120px;
}
.editor-sidebar { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 20px; }

.rights-summary-card {
  background: linear-gradient(135deg, var(--primary), #4f46e5);
  border-radius: 20px; padding: 32px 24px;
  display: flex; flex-direction: column; align-items: center;
  box-shadow: 0 15px 35px var(--primary-glow);
}
.rights-num { font-size: 3.5rem; font-weight: 950; color: white; line-height: 1; }
.rights-lbl { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: rgba(255,255,255,0.8); margin-top: 8px; letter-spacing: 0.1em; }

/* Perm Grid */
.perm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}
.perm-card { border-radius: 20px; overflow: hidden; }
.perm-card-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 20px;
  background: var(--bg-hover);
  border-bottom: 2px solid;
  font-size: 0.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--text-main);
}
.perm-card-icon {
  width: 32px; height: 32px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.perm-card-body { padding: 12px; display: flex; flex-direction: column; gap: 8px; }

.perm-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-radius: 14px;
  background: var(--bg-hover); border: 1px solid var(--border-color);
  transition: 0.2s;
}
.perm-row:hover { background: var(--bg-card); }
.perm-row.enabled { border-color: var(--primary-glow); background: var(--primary-bg); }
.perm-meta { flex: 1; display: flex; flex-direction: column; gap: 2px; padding-inline-end: 16px; }
.perm-title { font-weight: 700; font-size: 0.9rem; color: var(--text-main); }
.perm-desc { font-size: 0.75rem; color: var(--text-muted); }

/* Switch */
.premium-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.premium-switch input { opacity: 0; width: 0; height: 0; }
.switch-slider { position: absolute; inset: 0; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 24px; cursor: pointer; transition: 0.3s; }
.switch-slider::before { content: ''; position: absolute; width: 18px; height: 18px; left: 2px; top: 2px; background: #fff; border-radius: 50%; transition: 0.3s; }
.premium-switch input:checked + .switch-slider { background: var(--primary); border-color: var(--primary); box-shadow: 0 0 12px var(--primary-glow); }
.premium-switch input:checked + .switch-slider::before { transform: translateX(20px); }

/* Floating Save Bar */
.floating-save-bar {
  position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 32px;
  padding: 14px 28px; border-radius: 100px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  backdrop-filter: blur(20px); z-index: 100;
}
.save-status {
  display: flex; align-items: center; gap: 10px;
  font-weight: 700; color: var(--text-muted);
  padding-inline-end: 28px; border-inline-end: 1px solid var(--border-color);
  white-space: nowrap;
}
.save-status.saving { color: var(--primary); }
.save-status.success { color: #10b981; }

/* Modal */
.elite-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.elite-modal-window { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 24px; width: 100%; display: flex; flex-direction: column; overflow: hidden; }
.elite-modal-window.small { max-width: 480px; }
.modal-header-elite { display: flex; align-items: center; gap: 14px; padding: 24px 28px; border-bottom: 1px solid var(--border-color); }
.modal-header-elite.danger { background: rgba(239,68,68,0.05); }
.modal-icon-orb { width: 40px; height: 40px; border-radius: 12px; background: var(--primary); display: flex; align-items: center; justify-content: center; color: #fff; }
.modal-icon-orb.danger-orb { background: #ef4444; }
.modal-header-elite h3 { font-size: 1.1rem; font-weight: 800; color: var(--text-main); }
.modal-body-elite { flex: 1; }
.modal-footer-elite { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 20px 28px; border-top: 1px solid var(--border-color); }

/* Buttons */
.btn-elite-glass { padding: 10px 22px; border-radius: 10px; border: 1px solid var(--border-color); background: transparent; color: var(--text-main); font-weight: 600; cursor: pointer; transition: .2s; font-family: var(--font-family); }
.btn-elite-glass:hover { background: var(--bg-hover); }
.btn-elite-solid { display: flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: 10px; border: none; font-weight: 700; cursor: pointer; transition: .2s; font-family: var(--font-family); }
.btn-elite-solid.primary { background: var(--primary); color: #fff; box-shadow: 0 4px 14px var(--primary-glow); }
.btn-elite-solid.primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
.btn-elite-solid.danger { background: #ef4444; color: #fff; }
.btn-elite-solid.danger:hover:not(:disabled) { filter: brightness(1.1); }
.btn-elite-solid:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-elite-icon { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--border-color); background: transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: .2s; }
.btn-elite-icon:hover { background: var(--primary-bg); color: var(--primary); border-color: var(--primary-glow); }
.btn-elite-icon.danger:hover { background: rgba(239,68,68,.1); color: #ef4444; border-color: rgba(239,68,68,.2); }

.spinner-tiny { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Toast */
.toast-stack { position: fixed; bottom: 32px; right: 32px; z-index: 9999; }
[dir="rtl"] .toast-stack { right: auto; left: 32px; }
.toast-item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-radius: 14px;
  font-weight: 700; font-size: 0.9rem;
  background: var(--bg-card); border: 1px solid var(--border-color);
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}
.toast-item.success { border-color: #10b981; color: #10b981; }
.toast-item.error { border-color: #ef4444; color: #ef4444; }

.toast-slide-enter-active, .toast-slide-leave-active { transition: all 0.3s; }
.toast-slide-enter-from { opacity: 0; transform: translateY(20px); }
.toast-slide-leave-to { opacity: 0; transform: translateY(20px); }

/* Modal Animations */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity .2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.animate-pop { animation: pop .25s cubic-bezier(.34,1.56,.64,1); }
@keyframes pop { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.glassmorphism { backdrop-filter: blur(20px); }

/* Input */
.elite-input-group { display: flex; flex-direction: column; gap: 6px; }
.elite-input-wrapper { position: relative; }
.elite-input-icon { position: absolute; inset-inline-start: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem; pointer-events: none; }
.elite-input-field { width: 100%; padding: 10px 14px; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-main); font-size: 0.95rem; box-sizing: border-box; font-family: var(--font-family); }
.elite-input-field.has-icon { padding-inline-start: 38px; }
.elite-input-field:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-bg); }

@media (max-width: 900px) {
  .editor-layout { grid-template-columns: 1fr; }
  .editor-sidebar { position: static; }
  .perm-grid { grid-template-columns: 1fr; }
}
</style>
