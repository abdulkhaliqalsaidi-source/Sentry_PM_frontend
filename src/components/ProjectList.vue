<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from '@/plugins/axios';
import { usePermissions } from '@/composables/usePermissions';
import ElitePagination from '@/components/ElitePagination.vue';

const props = defineProps({
    permissions: {
        type: Object,
        default: () => ({})
    }
});

const { canCreateProject, canViewUsers, isSuperuser } = usePermissions();
const emit = defineEmits(['select-project', 'select-project-full']);
const projects = ref([]);
const showCreateModal = ref(false);
const newProjectName = ref('');
const newProjectDesc = ref('');
const isEditing = ref(false);
const editingProjectId = ref(null);
const showDeleteConfirm = ref(false);
const projectToDelete = ref(null);
const loadingSave = ref(false);
const isSuccess = ref(false);
const show = ref(false);

const currentPage = ref(1);
const itemsPerPage = ref(12);

const activeProjectsCount = computed(() => projects.value.length); // Placeholder for status-based count
const delayedProjectsCount = computed(() => projects.value.filter(p => (new Date() - new Date(p.created_at)) > 60*60*24*30*1000).length); // Example logic

const paginatedProjects = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return projects.value.slice(start, start + itemsPerPage.value);
});

// Fetch projects
const fetchProjects = async () => {
    try {
        const username = localStorage.getItem('username') || '';
        const response = await axios.get('/api/pm/projects/', { params: { username } });
        projects.value = response.data;
    } catch (e) {
        console.error("Error fetching projects:", e);
    }
};

const openCreateModal = () => {
    isEditing.value = false;
    editingProjectId.value = null;
    newProjectName.value = '';
    newProjectDesc.value = '';
    showCreateModal.value = true;
};

const openEditModal = (project) => {
    isEditing.value = true;
    editingProjectId.value = project.id;
    newProjectName.value = project.name;
    newProjectDesc.value = project.description;
    showCreateModal.value = true;
};

const saveProject = async () => {
    if (isEditing.value) {
        await updateProject();
    } else {
        await createProject();
    }
};

const createProject = async () => {
    if(!newProjectName.value) return;
    const ownerId = localStorage.getItem('user_id'); 
    loadingSave.value = true;
    try {
        await axios.post('/api/pm/projects/', {
            name: newProjectName.value,
            description: newProjectDesc.value,
            owner: ownerId
        });
        await fetchProjects();
        isSuccess.value = true;
        setTimeout(() => { isSuccess.value = false; showCreateModal.value = false; }, 1000);
    } catch (e) {
        console.error("Error creating project:", e);
    } finally { loadingSave.value = false; }
};

const updateProject = async () => {
    if(!newProjectName.value || !editingProjectId.value) return;
    loadingSave.value = true;
    try {
        await axios.patch(`/api/pm/projects/${editingProjectId.value}/`, {
            name: newProjectName.value,
            description: newProjectDesc.value
        });
        await fetchProjects();
        isSuccess.value = true;
        setTimeout(() => { isSuccess.value = false; showCreateModal.value = false; }, 1000);
    } catch (e) {
        console.error("Error updating project:", e);
    } finally { loadingSave.value = false; }
};

const confirmDelete = (project) => { projectToDelete.value = project; showDeleteConfirm.value = true; };
const deleteProject = async () => {
    if(!projectToDelete.value) return;
    try {
        await axios.delete(`/api/pm/projects/${projectToDelete.value.id}/`);
        await fetchProjects();
        showDeleteConfirm.value = false;
        projectToDelete.value = null;
    } catch (e) { console.error("Error deleting project:", e); }
};

onMounted(() => { setTimeout(() => { show.value = true; }, 50); fetchProjects(); });
defineExpose({ refreshData: fetchProjects });
</script>

<template>
  <div class="project-list-hyper hyper-glass" :class="{ 'fade-in': show }" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">
    
    <!-- Atmospheric Orbs -->
    <div class="bg-glow-orb orbit-3"></div>
    <div class="bg-glow-orb orbit-4"></div>

    <!-- Command Header HUD -->
    <div class="projects-header-hyper">
      <div class="h-content">
        <div class="icon-ring-hyper pulsing">
           <i class="fa-solid fa-layer-group"></i>
        </div>
        <div class="h-text">
          <h1>{{ $t('projects.my_projects') }}</h1>
          <p>{{ $t('projects.manage_track') }}</p>
        </div>
      </div>
      
      <div class="h-stats-hud glass-morphic">
         <div class="stat-mini">
            <span class="v">{{ projects.length }}</span>
            <span class="l">{{ $t('projects.total') }}</span>
         </div>
         <div class="stat-divider"></div>
         <div class="stat-mini urgent">
            <span class="v">{{ delayedProjectsCount }}</span>
            <span class="l">{{ $t('projects.delayed') }}</span>
         </div>
         <button v-if="canCreateProject" @click="openCreateModal" class="btn-hyper primary btn-new">
            <i class="fa-solid fa-plus-circle"></i>
            <span>{{ $t('projects.new_project') }}</span>
         </button>
      </div>
    </div>

    <!-- Projects Grid (Perspective Shuffle) -->
    <div class="projects-grid-hyper">
      <div v-if="projects.length === 0" class="empty-hall-p-premium glass-morphic">
        <div class="ghost-box-orb">
          <i class="fa-solid fa-folder-open ghost-pulse"></i>
        </div>
        <h3>{{ $t('projects.no_projects') }}</h3>
        <p>{{ $t('projects.manage_track') }}</p>
      </div>

      <transition-group name="shuffled-grid" tag="div" class="grid-inner">
        <div v-for="(project, idx) in paginatedProjects" :key="project.id" 
             class="project-card-premium glass-morphic"
             :style="{ '--idx': idx }"
             @click="$emit('select-project', project.id); $emit('select-project-full', project)">
          
          <div class="card-aura"></div>
          
          <div class="card-head">
            <div class="p-hexagon" :class="'color-' + (project.id % 5)">
              <i class="fa-solid fa-cube"></i>
              <div class="status-pulse cyan"></div>
              <div class="hex-glint"></div>
            </div>
            <div class="p-title-block">
              <h3>{{ project.name }}</h3>
              <div class="p-id-tag">#{{ project.id.toString().slice(-4) }}</div>
            </div>
          </div>

          <div class="p-description">
            <p>{{ project.description || $t('projects.no_description') }}</p>
          </div>

          <div class="p-stats-mini">
             <div class="stat-chip total" v-tooltip="$t('projects.total_tasks')">
                <div class="chip-icon"><i class="fa-solid fa-layer-group"></i></div>
                <div class="chip-content">
                   <span class="v">{{ project.total_tasks }}</span>
                   <span class="l">{{ $t('projects.total_tasks') }}</span>
                </div>
             </div>
             <div class="stat-chip done" v-tooltip="$t('projects.done')">
                <div class="chip-icon"><i class="fa-solid fa-check-double"></i></div>
                <div class="chip-content">
                   <span class="v">{{ project.completed_tasks }}</span>
                   <span class="l">{{ $t('projects.done') }}</span>
                </div>
             </div>
             <div class="stat-chip progress" v-tooltip="$t('projects.in_progress')">
                <div class="chip-icon"><i class="fa-solid fa-person-digging"></i></div>
                <div class="chip-content">
                   <span class="v">{{ project.in_progress_tasks }}</span>
                   <span class="l">{{ $t('projects.in_progress') }}</span>
                </div>
             </div>
          </div>

          <div class="p-health-hud">
             <div class="health-label">
                <span>{{ $t('projects.health') }}</span>
                <span class="pct" :class="{ 'pct-warn': project.health < 50, 'pct-ok': project.health >= 75 }">{{ project.health }}%</span>
             </div>
             <div class="health-bar-liquid glass-stroke">
                <div class="liquid-fill" :style="{ width: project.health + '%' }" :class="{ 'fill-warn': project.health < 50, 'fill-ok': project.health >= 75 }">
                   <div class="liquid-wave"></div>
                   <div class="liquid-glare"></div>
                </div>
             </div>
          </div>

          <div class="card-footer-p">
             <div class="p-meta">
                <i class="fa-regular fa-clock"></i>
                <span>{{ new Date(project.created_at).toLocaleDateString() }}</span>
             </div>
             
             <div class="p-actions-hud" @click.stop>
                <button v-if="canViewUsers || isSuperuser" class="mini-btn tip" @click="openEditModal(project)"><i class="fa-solid fa-pen-to-square"></i></button>
                <button v-if="canViewUsers || isSuperuser" class="mini-btn danger" @click="confirmDelete(project)"><i class="fa-solid fa-trash-can"></i></button>
                <div class="action-divider" v-if="canViewUsers || isSuperuser"></div>
                <div class="view-chevron"><i class="fa-solid fa-chevron-right"></i></div>
             </div>
          </div>
          <div class="card-glint-sweep"></div>
        </div>
      </transition-group>
      <ElitePagination 
          v-if="projects.length > 0"
          :totalItems="projects.length" 
          :itemsPerPage="itemsPerPage" 
          :currentPage="currentPage" 
          @update:currentPage="p => currentPage = p" 
          style="margin-top: 20px"
      />
    </div>

    <!-- Create/Edit Modal (Perspective HUD) -->
    <transition name="modal-hyper">
      <div v-if="showCreateModal" class="modal-overlay-hyper" @click="showCreateModal = false">
        <div class="modal-card-hyper glass-morphic" @click.stop>
          <div class="modal-header-hud">
             <div class="head-icon-ring blue"><i class="fa-solid fa-layer-group"></i></div>
             <div class="head-text">
                <h3>{{ isEditing ? $t('projects.edit') : $t('projects.create_new') }}</h3>
                <p>{{ isEditing ? project.name : $t('projects.manage_track') }}</p>
             </div>
             <button class="btn-close-hud" @click="showCreateModal = false">&times;</button>
          </div>
          
          <div class="hyper-form">
             <div class="form-group-hud">
                <label>{{ $t('projects.name') }}</label>
                <div class="input-hud glass-stroke">
                   <i class="fa-solid fa-signature"></i>
                   <input v-model="newProjectName" :placeholder="$t('projects.enter_name')" />
                </div>
             </div>
             <div class="form-group-hud">
                <label>{{ $t('projects.description') }}</label>
                <div class="input-hud glass-stroke textarea">
                   <i class="fa-solid fa-align-left"></i>
                   <textarea v-model="newProjectDesc" :placeholder="$t('projects.enter_description')"></textarea>
                </div>
             </div>
             
             <div class="modal-foot-hud">
                <button class="btn-hyper ghost" @click="showCreateModal = false">{{ $t('projects.cancel') }}</button>
                <button @click="saveProject" class="btn-hyper primary" :class="{ 'success': isSuccess }" :disabled="loadingSave">
                   <i v-if="loadingSave" class="fa-solid fa-spinner fa-spin"></i>
                   <i v-else-if="isSuccess" class="fa-solid fa-check"></i>
                   <i v-else class="fa-solid fa-cloud-arrow-up"></i>
                   <span>{{ isEditing ? $t('projects.update') : $t('projects.create') }}</span>
                </button>
             </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Delete Confirmation -->
    <transition name="modal-hyper">
      <div v-if="showDeleteConfirm" class="modal-overlay-hyper" @click="showDeleteConfirm = false">
        <div class="modal-card-hyper glass-morphic mini-modal" @click.stop>
          <div class="danger-ring pulsing"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h3>{{ $t('common.delete_confirm') }}</h3>
          <p>{{ $t('users.delete_confirm', { user: projectToDelete?.name }) }}</p>
          <div class="modal-foot-hud center">
             <button class="btn-hyper ghost" @click="showDeleteConfirm = false">{{ $t('common.cancel') }}</button>
             <button @click="deleteProject" class="btn-hyper danger">{{ $t('common.yes_delete') }}</button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
.project-list-hyper {
  padding: 40px; min-height: 100vh; position: relative; overflow-x: hidden; overflow-y: auto;
  display: flex; flex-direction: column; gap: 40px; font-family: var(--font-sans);
  background: transparent;
}

/* Background Accents */
.bg-glow-orb { position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.12; z-index: 0; }
.orbit-3 { width: 500px; height: 500px; background: var(--primary); top: -5%; left: -5%; animation: orbit 30s infinite linear; }
.orbit-4 { width: 400px; height: 400px; background: var(--ds-indigo); bottom: 5%; right: -5%; animation: orbit 25s infinite linear reverse; }

@keyframes orbit { from { transform: rotate(0deg) translate(80px) rotate(0deg); } to { transform: rotate(360deg) translate(80px) rotate(-360deg); } }

/* Header HUD */
.projects-header-hyper { display: flex; justify-content: space-between; align-items: center; z-index: 10; gap: 30px; }
.h-content { display: flex; align-items: center; gap: 24px; }
.icon-ring-hyper {
  width: 65px; height: 65px; border-radius: 22px; 
  background: var(--primary-bg); color: var(--primary);
  display: flex; align-items: center; justify-content: center; font-size: 28px;
  border: 1px solid var(--primary-glow);
}
.pulsing { animation: hPulse 2s infinite; }
@keyframes hPulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 var(--primary-glow); } 50% { transform: scale(1.05); box-shadow: 0 0 20px 5px var(--primary-glow); } }

.h-text h1 { margin: 0; font-size: 2.2rem; font-weight: 900; color: var(--text-main); letter-spacing: -1px; }
.h-text p { margin: 4px 0 0 0; color: var(--text-muted); opacity: 0.8; font-size: 1.1rem; }

.h-stats-hud { display: flex; align-items: center; gap: 25px; padding: 12px 25px; border-radius: 24px; border: 1px solid var(--border-color); background: var(--bg-card); box-shadow: var(--shadow-sm); }
.stat-mini { display: flex; flex-direction: column; align-items: center; }
.stat-mini .v { font-size: 1.6rem; font-weight: 900; color: var(--text-main); }
.stat-mini .l { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-top: 2px; }
.stat-mini.urgent .v { color: var(--ds-red); }
.stat-divider { width: 1px; height: 40px; background: var(--border-color); }

/* Projects Grid */
.projects-grid-hyper { z-index: 10; }
.grid-inner { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px; }

.project-card-premium {
  padding: 30px; border-radius: 30px; border: 1px solid var(--border-color);
  background: var(--bg-card);
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 25px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer;
  box-shadow: var(--shadow-sm);
}
.project-card-premium:hover { transform: translateY(-10px) scale(1.02); border-color: var(--primary-glow); box-shadow: var(--shadow-lg); }

.card-head { display: flex; align-items: center; gap: 20px; }
.p-hexagon {
  width: 60px; height: 60px; position: relative;
  clip-path: polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%);
  display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.p-hexagon.color-0 { background: var(--primary-bg); color: var(--primary); }
.p-hexagon.color-1 { background: rgba(244, 63, 94, 0.1); color: var(--ds-red); }
.p-hexagon.color-2 { background: rgba(16, 185, 129, 0.1); color: var(--ds-green); }
.p-hexagon.color-3 { background: rgba(245, 158, 11, 0.1); color: var(--ds-yellow); }
.p-hexagon.color-4 { background: rgba(139, 92, 246, 0.1); color: var(--ds-indigo); }

.status-pulse { position: absolute; bottom: 8px; right: 8px; width: 10px; height: 10px; border-radius: 50%; z-index: 2; }
.status-pulse.cyan { background: #06b6d4; box-shadow: 0 0 10px #06b6d4; animation: sPulse 2s infinite; }

.p-title-block h3 { margin: 0; font-size: 1.3rem; font-weight: 800; color: var(--text-main); line-height: 1.2; }
.p-id-tag { font-family: monospace; font-size: 0.8rem; color: var(--text-muted); opacity: 0.7; margin-top: 4px; }

.p-description p { margin: 0; font-size: 0.95rem; color: var(--text-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* Stats Mini Chips */
.p-stats-mini { display: flex; gap: 12px; flex-wrap: wrap; }
.stat-chip { 
  display: flex; align-items: center; gap: 10px; padding: 8px 16px; 
  border-radius: 16px; background: var(--bg-hover); 
  border: 1px solid var(--border-color); transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-sm); cursor: help;
}
.stat-chip:hover { transform: translateY(-2px); border-color: var(--primary-glow); background: var(--bg-card); box-shadow: var(--shadow-md); }

.chip-icon { 
  width: 32px; height: 32px; border-radius: 10px; 
  display: flex; align-items: center; justify-content: center; 
  font-size: 0.9rem; background: rgba(255, 255, 255, 0.05);
}
.chip-content { display: flex; flex-direction: column; line-height: 1.1; }
.chip-content .v { font-size: 1.1rem; font-weight: 900; color: var(--text-main); }
.chip-content .l { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }

.stat-chip.total { border-left: 3px solid var(--primary); }
.stat-chip.total .chip-icon { color: var(--primary); background: var(--primary-bg); }

.stat-chip.done { border-left: 3px solid var(--ds-green); }
.stat-chip.done .chip-icon { color: var(--ds-green); background: rgba(16, 185, 129, 0.1); }

.stat-chip.progress { border-left: 3px solid var(--ds-yellow); }
.stat-chip.progress .chip-icon { color: var(--ds-yellow); background: rgba(245, 158, 11, 0.1); }

[dir="rtl"] .stat-chip { border-left: none; border-right: 3px solid transparent; }
[dir="rtl"] .stat-chip.total { border-right-color: var(--primary); }
[dir="rtl"] .stat-chip.done { border-right-color: var(--ds-green); }
[dir="rtl"] .stat-chip.progress { border-right-color: var(--ds-yellow); }

/* Health HUD */
.p-health-hud { display: flex; flex-direction: column; gap: 10px; }
.health-label { display: flex; justify-content: space-between; font-weight: 800; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; }
.health-label .pct { color: #10b981; }
.health-label .pct.pct-warn { color: var(--ds-red); }
.health-label .pct.pct-ok { color: var(--ds-green); }

.health-bar-liquid { height: 10px; border-radius: 100px; background: var(--bg-hover); overflow: hidden; position: relative; border: 1px solid var(--border-color); }
.liquid-fill { height: 100%; background: linear-gradient(90deg, var(--ds-green), #34d399); border-radius: 100px; position: relative; transition: width 0.8s cubic-bezier(0.19, 1, 0.22, 1); }
.liquid-fill.fill-warn { background: linear-gradient(90deg, var(--ds-red), #f87171); }
.liquid-fill.fill-ok { background: linear-gradient(90deg, var(--ds-green), #34d399); }
.liquid-wave {
  position: absolute; top: 0; left: 0; width: 200%; height: 100%;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Cpath d='M 0 50 Q 200 0 400 50 Q 600 100 800 50 L 800 600 L 0 600 Z' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E");
  background-size: 100% 100%; animation: liquidMove 4s infinite linear;
}
@keyframes liquidMove { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.liquid-glare { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); animation: glareMove 3s infinite linear; }
@keyframes glareMove { from { transform: translateX(-100%); } to { transform: translateX(100%); } }

.card-footer-p { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 20px; border-top: 1px solid var(--border-color); }
.p-meta { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-muted); font-weight: 700; }

.p-actions-hud { display: flex; align-items: center; gap: 10px; background: var(--bg-hover); padding: 5px 12px; border-radius: 100px; border: 1px solid var(--border-color); }
.mini-btn { width: 34px; height: 34px; border-radius: 10px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
.mini-btn:hover { background: var(--bg-card); color: var(--primary); transform: scale(1.1); box-shadow: var(--shadow-sm); }
.mini-btn.danger:hover { color: var(--ds-red); }

.action-divider { width: 1px; height: 18px; background: var(--border-color); margin: 0 4px; }
.view-chevron { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 0.8rem; transition: 0.3s; }
.project-card-premium:hover .view-chevron { transform: translateX(5px); }
[dir="rtl"] .project-card-premium:hover .view-chevron { transform: translateX(-5px) rotate(180deg); }

/* Glint Sweep */
.card-glint-sweep {
  position: absolute; inset: 0; background: linear-gradient(135deg, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%);
  transform: translateX(-100%); transition: transform 0.6s ease-in-out; pointer-events: none;
}
.project-card-premium:hover .card-glint-sweep { transform: translateX(100%); }

/* Modals */
.modal-overlay-hyper { position: fixed; inset: 0; background: var(--bg-overlay); backdrop-filter: var(--glass-blur); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-card-hyper { width: 550px; border-radius: 40px; border: 1px solid var(--border-color); position: relative; overflow: hidden; animation: mIn 0.4s cubic-bezier(0.19, 1, 0.22, 1); perspective: 1000px; background: var(--bg-card); box-shadow: var(--shadow-2xl); }
@keyframes mIn { from { transform: rotateX(-15deg) translateY(40px); opacity: 0; } to { transform: rotateX(0deg) translateY(0); opacity: 1; } }

/* Delete Confirmation Mini Modal */
.mini-modal { text-align: center; padding: 45px 30px; display: flex; flex-direction: column; align-items: center; gap: 20px; max-width: 480px; }
.danger-ring { width: 90px; height: 90px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 10px auto; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
.danger-ring.pulsing { animation: dangerPulse 2s infinite; }
@keyframes dangerPulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 50% { transform: scale(1.05); box-shadow: 0 0 20px 10px rgba(239, 68, 68, 0.1); } }
.mini-modal h3 { font-size: 1.8rem; font-weight: 900; color: white; margin: 0; }
.mini-modal p { font-size: 1.1rem; color: var(--text-muted); font-weight: 600; line-height: 1.5; margin: 0 0 15px 0; }


.modal-header-hud { padding: 30px; display: flex; align-items: center; gap: 20px; border-bottom: 1px solid var(--border-color); }
.head-icon-ring { width: 55px; height: 55px; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 1px solid var(--border-color); }
.head-icon-ring.blue { background: var(--primary-bg); color: var(--primary); border-color: var(--primary-glow); }
.head-text h3 { margin: 0; font-size: 1.4rem; font-weight: 900; color: var(--text-main); }
.head-text p { margin: 2px 0 0 0; color: var(--text-muted); font-weight: 700; }

.hyper-form { padding: 30px; display: flex; flex-direction: column; gap: 24px; }
.form-group-hud label { display: block; font-weight: 800; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px; text-transform: uppercase; }
.input-hud { display: flex; align-items: center; gap: 15px; padding: 12px 20px; border-radius: 16px; background: var(--bg-hover); border: 1px solid var(--border-color); }
.input-hud i { color: var(--text-muted); font-size: 1.1rem; }
.input-hud input, .input-hud textarea { background: transparent; border: none; flex: 1; color: var(--text-main); font-weight: 700; outline: none; }
.input-hud.textarea { align-items: flex-start; }
.input-hud textarea { min-height: 100px; resize: none; margin-top: 5px; }

.modal-foot-hud { display: flex; justify-content: flex-end; gap: 15px; margin-top: 10px; }
.modal-foot-hud.center { justify-content: center; }

/* Buttons */
.btn-hyper { padding: 12px 24px; border-radius: 15px; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.3s; }
.btn-hyper.primary { background: linear-gradient(135deg, var(--primary), var(--indigo-800)); color: white; box-shadow: 0 10px 20px var(--primary-glow); }
.btn-hyper.primary:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 15px 30px var(--primary-glow); }
.btn-hyper.ghost { background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-color); }
.btn-hyper.danger { background: rgba(239, 68, 68, 0.1); color: var(--ds-red); border: 1px solid rgba(239, 68, 68, 0.2); }
.btn-hyper.danger:hover { background: var(--ds-red); color: white; }

/* Shuffled Grid Animation */
.shuffled-grid-enter-active { animation: pShuffle 0.6s cubic-bezier(0.19, 1, 0.22, 1) backwards; animation-delay: var(--delay); }
@keyframes pShuffle { from { opacity: 0; transform: perspective(1000px) rotateY(-20deg) scale(0.9) translateY(40px); } to { opacity: 1; transform: perspective(1000px) rotateY(0deg) scale(1) translateY(0); } }

/* Empty state */
.empty-hall-p-premium {
  grid-column: 1 / -1;
  width: 100%;
  padding: 140px 60px;
  text-align: center;
  border-radius: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  gap: 32px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  max-width: 100%;
  margin: 40px 0;
  backdrop-filter: blur(30px);
  box-shadow: var(--shadow-2xl);
  animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.ghost-box-orb {
  width: 160px;
  height: 160px;
  background: var(--primary-bg);
  border-radius: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5.5rem;
  color: var(--primary);
  margin-bottom: 12px;
  box-shadow: 0 25px 50px -12px var(--primary-glow);
}

.empty-hall-p-premium h3 {
  margin: 0;
  font-size: 2.8rem;
  font-weight: 900;
  color: var(--text-main);
  letter-spacing: -0.04em;
}

.empty-hall-p-premium p {
  margin: 0;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 1.3rem;
  max-width: 500px;
  line-height: 1.5;
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

@keyframes sPulse { 0% { box-shadow: 0 0 0 0 rgba(6,182,212,0.7); } 70% { box-shadow: 0 0 0 10px rgba(6,182,212,0); } 100% { box-shadow: 0 0 0 0 rgba(6,182,212,0); } }
</style>
