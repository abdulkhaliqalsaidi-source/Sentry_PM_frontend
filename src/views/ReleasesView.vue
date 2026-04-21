<template>
  <div class="releases-universe" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">
    
    <!-- Top Bar -->
    <header class="floating-top-bar">
      <div class="bar-left">
        <button class="btn-back-orb" @click="$router.push(`/projects/${projectId}`)">
          <i :class="$i18n.locale === 'ar' ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left'"></i>
        </button>
        <div class="elite-breadcrumbs">
          <span class="crumb" @click="$router.push('/projects')">{{ $t('common.projects') }}</span>
          <i class="fa-solid fa-chevron-right sep" :style="$i18n.locale === 'ar' ? 'transform:rotate(180deg)' : ''"></i>
          <span class="crumb">{{ projectDetails?.name || '...' }}</span>
          <i class="fa-solid fa-chevron-right sep" :style="$i18n.locale === 'ar' ? 'transform:rotate(180deg)' : ''"></i>
          <span class="crumb active">{{ $t('releases.title') }}</span>
        </div>
      </div>

      <div class="bar-right">
        <div class="action-orbs">
          <button @click="openAddModal" class="btn-create-release" v-if="canManageReleases">
            <i class="fas fa-plus"></i>
            <span>{{ $t('releases.newRelease') }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="main-stage overflow-y-auto custom-scrollbar">
      <div class="content-padding p-4 md:p-10">
        <!-- Empty State: Pulsing Orb (Rocket) -->
        <div v-if="!loading && versions.length === 0" class="premium-empty-state">
          <div class="pulsing-orb-container mb-10">
            <div class="orb-pulse primary-pulse"></div>
            <div class="orb-core primary-core">
               <i class="fas fa-rocket text-5xl"></i>
            </div>
          </div>
          <h2 class="empty-title-elite">{{ $t('releases.emptyTitle') }}</h2>
          <p class="empty-desc-elite">{{ $t('releases.emptyDesc') }}</p>
          <button @click="openAddModal" class="btn-elite-solid primary mt-10">
            <AnimatedIcon name="plus" size="xs" /> {{ $t('releases.createFirst') }}
          </button>
        </div>

        <!-- Versions Table -->
        <div v-else-if="!loading">
        <div class="elite-table-panel max-w-7xl mx-auto" :style="{ '--grid-cols': '1.5fr 140px 140px 140px 1.5fr 180px' }">
          <div class="elite-table-header">
            <span>{{ $t('releases.name') }}</span>
            <span class="text-center">{{ $t('common.status') }}</span>
            <span class="text-center">{{ $t('releases.start') }}</span>
            <span class="text-center">{{ $t('releases.release') }}</span>
            <span>{{ $t('releases.notes') }}</span>
            <span class="text-center">{{ $t('common.actions') }}</span>
          </div>

          <div v-for="version in paginatedVersions" :key="version.id" class="elite-table-row animate-slide-in">
            <!-- Name Col -->
            <div class="elite-table-cell">
              <div class="elite-table-cell-icon primary">
                <i class="fas fa-rocket"></i>
              </div>
              <div class="flex flex-col">
                <span class="main-text">{{ version.name }}</span>
                <span class="text-[0.65rem] opacity-50 uppercase tracking-widest font-black">{{ $t('common.version') }}</span>
              </div>
            </div>

            <!-- Status Col -->
            <div class="elite-table-cell justify-center">
               <span :class="getStatusClass(version.status)" class="status-pill-elite shrink-0">
                  {{ version.status }}
               </span>
            </div>

            <!-- Start Date Col -->
            <div class="elite-table-cell justify-center">
               <span class="date-text-elite">{{ version.start_date || '-' }}</span>
            </div>

            <!-- Release Date Col -->
            <div class="elite-table-cell justify-center">
               <span class="date-text-elite">{{ version.release_date || '-' }}</span>
            </div>

            <!-- Notes Col -->
            <div class="elite-table-cell">
               <span class="sub-text m-0 truncate-2-lines" :title="version.release_note?.description">
                  {{ version.release_note?.description || '-' }}
               </span>
            </div>

            <!-- Actions Col -->
            <div class="elite-table-cell justify-center gap-4">
              <button v-if="version.status === 'UNRELEASED' && canManageReleases" @click="updateStatus(version, 'RELEASED')" class="btn-elite-icon success" :title="$t('releases.ship')">
                <i class="fas fa-paper-plane"></i>
              </button>
              <button v-if="canManageReleases" class="btn-elite-icon" @click="editVersion(version)" :title="$t('common.edit')">
                <AnimatedIcon name="edit" size="xs" />
              </button>
              <button v-if="canManageReleases" @click="deleteVersion(version.id)" class="btn-elite-icon danger" :title="$t('common.delete')">
                <AnimatedIcon name="trash" size="xs" />
              </button>
            </div>
          </div>
        </div>
        <ElitePagination 
          :totalItems="versions.length" 
          :itemsPerPage="itemsPerPage" 
          :currentPage="currentPage" 
          @update:currentPage="p => currentPage = p" 
        />
        </div>

        <!-- Skeleton Loader -->
        <div v-else class="elite-table-panel max-w-7xl mx-auto opacity-50">
            <div class="elite-table-header">
                <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
                <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 ml-auto mr-auto"></div>
                <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 ml-auto"></div>
            </div>
            <div v-for="i in 5" :key="i" class="elite-table-row">
                <div class="h-10 bg-gray-100 dark:bg-gray-900 rounded w-full animate-pulse"></div>
            </div>
        </div>
      </div>
    </main>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
       <transition name="modal-fade">
         <div v-if="showAddModal" class="elite-modal-backdrop" @click.self="showAddModal = false">
            <div class="elite-modal-window medium glassmorphism animate-pop">
               <div class="modal-header-elite primary">
                   <div class="modal-icon-orb"><i class="fas fa-rocket"></i></div>
                   <h3>{{ isEditing ? $t('releases.editVersion') : $t('releases.newRelease') }}</h3>
                </div>
                
                <div class="modal-body-elite scrollable custom-scrollbar flex flex-col gap-8">
                   <!-- Version Name Node -->
                   <div class="elite-input-group">
                      <label>{{ $t('releases.name') }} <span class="text-orange-500">*</span></label>
                      <div class="elite-input-wrapper">
                         <i class="fas fa-tag elite-input-icon"></i>
                         <input v-model="newVersion.name" type="text" class="elite-input-field has-icon" :placeholder="$t('releases.name_placeholder') || 'e.g. v1.2.0-stable'" />
                      </div>
                   </div>
                   
                   <!-- Dates Grid -->
                   <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div class="elite-input-group">
                        <label>{{ $t('releases.start') }}</label>
                        <div class="elite-input-wrapper">
                           <i class="fas fa-calendar-alt elite-input-icon"></i>
                           <input v-model="newVersion.start_date" type="date" class="elite-input-field has-icon" />
                        </div>
                      </div>
                      <div class="elite-input-group">
                        <label>{{ $t('releases.release') }}</label>
                        <div class="elite-input-wrapper">
                           <i class="fas fa-calendar-check elite-input-icon"></i>
                           <input v-model="newVersion.release_date" type="date" class="elite-input-field has-icon" />
                        </div>
                      </div>
                   </div>
   
                   <!-- Detailed Notes Node -->
                   <div class="elite-input-group">
                     <label>{{ $t('releases.notes') }}</label>
                     <textarea v-model="newVersion.notes" rows="5" class="elite-input-field-multi" :placeholder="$t('releases.notesPlaceholder') || 'Describe the key changes...'"></textarea>
                   </div>
                </div>

                <div class="modal-footer-elite">
                   <button @click="showAddModal = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
                   <button @click="saveVersion" class="btn-elite-solid primary" :disabled="loadingSave">
                      <span v-if="loadingSave" class="spinner-tiny"></span>
                      <i v-else class="fas fa-paper-plane" :class="$i18n.locale === 'ar' ? 'ml-2' : 'mr-2'"></i>
                      {{ loadingSave ? '...' : (isEditing ? $t('common.save') : $t('releases.ship')) }}
                   </button>
                </div>
            </div>
         </div>
       </transition>
    </Teleport>
  </div>
</template>

<script>
import axios from '@/plugins/axios';
import AnimatedIcon from '@/components/AnimatedIcon.vue';
import ElitePagination from '@/components/ElitePagination.vue';
import { usePermissions } from '@/composables/usePermissions';

export default {
  name: 'ReleasesView',
  props: ['projectId'],
  components: { AnimatedIcon, ElitePagination },
  data() {
    const perms = usePermissions();
    return {
      projectDetails: null,
      versions: [],
      loading: true,
      loadingSave: false,
      showAddModal: false,
      currentPage: 1, itemsPerPage: 10,
      isEditing: false,
      editingVersionId: null,
      newVersion: { name: '', start_date: '', release_date: '', notes: '' },
      canManageReleases: perms.canManageReleases.value || perms.isSuperuser.value,
    }
  },
  computed: {
    paginatedVersions() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      return this.versions.slice(start, start + this.itemsPerPage);
    }
  },
  mounted() {
    this.fetchProject();
    this.fetchVersions();
  },
  methods: {
    async fetchProject() {
       try {
         const res = await axios.get(`/api/pm/projects/${this.projectId}/`);
         this.projectDetails = res.data;
       } catch (e) {
         console.error(e);
       }
    },
    async fetchVersions() {
      this.loading = true;
      try {
        const res = await axios.get(`/api/pm/versions/?project=${this.projectId}&t=${Date.now()}`);
        this.versions = res.data;
      } catch (err) {
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    getStatusClass(status) {
        const map = {
            'UNRELEASED': 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
            'RELEASED': 'bg-green-500/10 text-green-500 border border-green-500/20',
            'ARCHIVED': 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
        }
        return map[status] || 'bg-gray-100 text-gray-700'
    },
    openAddModal() {
        this.isEditing = false;
        this.editingVersionId = null;
        this.newVersion = { name: '', start_date: '', release_date: '', notes: '' };
        this.showAddModal = true;
    },
    editVersion(version) {
        this.isEditing = true;
        this.editingVersionId = version.id;
        this.newVersion = {
            name: version.name,
            start_date: version.start_date || '',
            release_date: version.release_date || '',
            notes: version.release_note?.description || ''
        };
        this.showAddModal = true;
    },
    async updateStatus(version, newStatus) {
        try {
            await axios.patch(`/api/pm/versions/${version.id}/`, { status: newStatus });
            this.fetchVersions();
        } catch(e) {
            console.error(e)
        }
    },
    async deleteVersion(id) {
        if(confirm(this.$t('releases.delete_confirm') || 'Delete this version completely?')) {
            await axios.delete(`/api/pm/versions/${id}/`);
            this.fetchVersions();
        }
    },
    async saveVersion() {
      if(!this.newVersion.name) return;
      this.loadingSave = true;
      try {
        const verObj = { project: this.projectId, name: this.newVersion.name };
        if(this.newVersion.start_date) verObj.start_date = this.newVersion.start_date;
        if(this.newVersion.release_date) verObj.release_date = this.newVersion.release_date;

        let v;
        if(this.isEditing) {
            const res = await axios.patch(`/api/pm/versions/${this.editingVersionId}/`, verObj);
            v = res.data;
        } else {
            verObj.status = 'UNRELEASED';
            const res = await axios.post('/api/pm/versions/', verObj);
            v = res.data;
        }

        if(this.newVersion.notes) {
            if (v.release_note) {
                await axios.patch(`/api/pm/release-notes/${v.release_note.id}/`, { description: this.newVersion.notes });
            } else {
                await axios.post('/api/pm/release-notes/', { version: v.id, description: this.newVersion.notes });
            }
        }
        
        this.showAddModal = false;
        this.fetchVersions();
      } catch(e) {
        console.error(e);
      } finally {
        this.loadingSave = false;
      }
    }
  }
}
</script>

<style scoped>
.releases-universe {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--bg-body);
  color: var(--text-main);
  font-family: var(--font-family);
}

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
  position: sticky;
  top: 0;
}

.main-stage { flex: 1; min-height: 0; }
.bar-left { display: flex; align-items: center; gap: 20px; }

.elite-breadcrumbs { display: flex; align-items: center; gap: 12px; }
.crumb { 
    font-size: 0.9rem; 
    font-weight: 700; 
    color: var(--text-muted); 
    cursor: pointer; 
    transition: all 0.3s ease;
}
.crumb:hover { color: var(--primary); }
.crumb.active { color: var(--text-main); font-weight: 900; }
.sep { opacity: 0.2; font-size: 0.7rem; }

.btn-create-release {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--primary);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    font-family: var(--font-family);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 14px var(--primary-glow);
    white-space: nowrap;
}
.btn-create-release:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px var(--primary-glow);
    filter: brightness(1.08);
}
.btn-create-release:active {
    transform: translateY(0);
    filter: brightness(0.97);
}

/* Empty State Styling */
.premium-empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 160px 40px; text-align: center; max-width: 900px; margin: 0 auto;
}

.pulsing-orb-container { 
    position: relative; 
    width: 140px; 
    height: 140px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
}
.orb-pulse { 
    position: absolute; 
    inset: -20px; 
    border-radius: 50%; 
    opacity: 0.2; 
    animation: orbPulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; 
}
.orb-pulse.primary-pulse { background: radial-gradient(circle, var(--primary) 0%, transparent 70%); }

.orb-core { 
    position: relative; 
    width: 90px; 
    height: 90px; 
    border-radius: 30px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    color: white; 
    background: var(--primary);
    box-shadow: 0 20px 40px var(--primary-glow);
    transform: rotate(45deg);
}
.orb-core i { transform: rotate(-45deg); }

@keyframes orbPulse {
  0% { transform: scale(0.8); opacity: 0; }
  50% { opacity: 0.4; }
  100% { transform: scale(1.8); opacity: 0; }
}

.empty-title-elite { 
    font-size: 3.5rem; 
    font-weight: 1000; 
    color: var(--text-main); 
    margin-bottom: 16px; 
    letter-spacing: -3px; 
    line-height: 0.9; 
}
.empty-desc-elite { 
    font-size: 1.3rem; 
    color: var(--text-muted); 
    max-width: 550px; 
    line-height: 1.7; 
}

/* Table Enhancements */
.date-text-elite {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--text-muted);
}

.status-pill-elite {
  border-radius: 8px; 
  font-size: 0.7rem; 
  font-weight: 900;
  text-transform: uppercase; 
  letter-spacing: 0.1em;
  padding: 6px 12px;
  display: inline-flex; 
  align-items: center; 
  justify-content: center;
}

.truncate-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.animate-slide-in {
    animation: slideIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    opacity: 0;
    transform: translateY(10px);
}

@keyframes slideIn {
    to { opacity: 1; transform: translateY(0); }
}

</style>
