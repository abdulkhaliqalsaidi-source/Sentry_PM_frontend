<template>
  <div class="custom-fields-universe" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">
    
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
          <span class="crumb active">{{ $t('customFields.title') }}</span>
        </div>
      </div>

      <div class="bar-right">
        <div class="action-orbs">
          <button v-if="activeTab === 'fields'" @click="openAddModal" class="btn-create-field">
            <i class="fas fa-plus"></i>
            <span>{{ $t('customFields.addField') }}</span>
          </button>
          <button v-if="activeTab === 'statuses'" @click="openAddStatusModal" class="btn-create-field">
            <i class="fas fa-plus"></i>
            <span>{{ $t('customFields.addStatus') || 'Add Status' }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Tabs -->
    <div class="config-tabs">
      <button class="config-tab" :class="{ active: activeTab === 'fields' }" @click="activeTab = 'fields'">
        <i class="fas fa-list-ul"></i>
        <span>{{ $t('customFields.title') }}</span>
      </button>
      <button class="config-tab" :class="{ active: activeTab === 'statuses' }" @click="activeTab = 'statuses'">
        <i class="fas fa-columns"></i>
        <span>{{ $t('customFields.statuses') || 'Statuses' }}</span>
      </button>
    </div>

    <main class="main-stage overflow-y-auto custom-scrollbar">
      <div class="content-padding p-4 md:p-10">
        <!-- ── Fields Tab ── -->
        <template v-if="activeTab === 'fields'">
        <!-- Empty State: Pulsing Orb -->
        <div v-if="!loading && fields.length === 0" class="premium-empty-state">
          <div class="pulsing-orb-container mb-10">
            <div class="orb-pulse primary-pulse"></div>
            <div class="orb-core primary-core">
               <AnimatedIcon name="list" size="xl" />
            </div>
          </div>
          <h2 class="empty-title-elite">{{ $t('customFields.emptyTitle') }}</h2>
          <p class="empty-desc-elite">{{ $t('customFields.emptyDesc') }}</p>
          <button @click="openAddModal" class="btn-elite-solid primary mt-10">
            <AnimatedIcon name="plus" size="xs" /> {{ $t('customFields.addField') }}
          </button>
        </div>

        <!-- Fields Table -->
        <div v-else-if="!loading" class="elite-table-panel max-w-7xl mx-auto" :style="{ '--grid-cols': '80px 1.5fr 1fr 120px 1.5fr 80px' }">
          <div class="elite-table-header">
            <span class="text-center"></span>
            <span>{{ $t('customFields.name') }}</span>
            <span>{{ $t('customFields.type') }}</span>
            <span class="text-center">{{ $t('customFields.required') }}</span>
            <span>{{ $t('customFields.details') }}</span>
            <span class="text-center">{{ $t('common.actions') }}</span>
          </div>

          <div v-for="field in fields" :key="field.id" class="elite-table-row animate-slide-in">
            <!-- Icon Col -->
            <div class="elite-table-cell justify-center">
              <div class="elite-table-cell-icon primary">
                <AnimatedIcon :name="getFieldIconName(field.field_type)" size="xs" />
              </div>
            </div>

            <!-- Name Col -->
            <div class="elite-table-cell">
              <span class="main-text">{{ field.name }}</span>
            </div>

            <!-- Type Col -->
            <div class="elite-table-cell">
               <span class="field-type-badge">{{ field.field_type }}</span>
            </div>

            <!-- Required Col -->
            <div class="elite-table-cell justify-center">
               <span v-if="field.required" class="required-dot active" :title="$t('customFields.required')"></span>
               <span v-else class="required-dot" :title="$t('common.optional')"></span>
            </div>

            <!-- Details Col -->
            <div class="elite-table-cell">
               <div v-if="field.field_type === 'CHOICE' && field.options" class="field-options-count">
                  <i class="fas fa-list-ul" style="color:var(--primary)"></i> {{ field.options.length }} {{ $t('customFields.options') }}
               </div>
               <span v-else class="field-options-empty">-</span>
            </div>

            <!-- Actions Col -->
            <div class="elite-table-cell justify-center" style="gap:8px">
              <button @click="openEditModal(field)" class="btn-elite-icon" :title="$t('common.edit')">
                <AnimatedIcon name="edit" size="xs" />
              </button>
              <button @click="deleteField(field.id)" class="btn-elite-icon danger" :title="$t('common.delete')">
                <AnimatedIcon name="trash" size="xs" />
              </button>
            </div>
          </div>
        </div>

        <!-- Skeleton Loader -->
        <div v-else class="elite-table-panel max-w-7xl mx-auto opacity-50">
            <div class="elite-table-header">
                <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-12"></div>
                <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32 ml-10"></div>
                <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 ml-auto"></div>
            </div>
            <div v-for="i in 5" :key="i" class="elite-table-row">
                <div class="h-10 bg-gray-100 dark:bg-gray-900 rounded w-full animate-pulse"></div>
            </div>
        </div>
        </template>

        <!-- ── Statuses Tab ── -->
        <template v-if="activeTab === 'statuses'">
          <div class="statuses-config max-w-3xl mx-auto">
            <p class="statuses-hint">{{ $t('customFields.statusesHint') || 'Drag to reorder statuses' }}</p>
            <draggable
              v-model="statuses"
              item-key="id"
              handle=".drag-handle-status"
              animation="200"
              @end="saveStatusOrder"
              class="statuses-list"
            >
              <template #item="{ element: st }">
                <div class="status-row-config">
                  <i class="fas fa-grip-vertical drag-handle-status"></i>
                  <span class="status-color-dot" :style="{ background: st.color }"></span>
                  <span class="status-name-config">{{ st.name }}</span>
                  <span class="status-category-badge">{{ st.category }}</span>
                  <div class="status-row-actions">
                    <button @click="openEditStatusModal(st)" class="btn-elite-icon" :title="$t('common.edit')">
                      <i class="fas fa-pen"></i>
                    </button>
                    <button @click="deleteStatus(st.id)" class="btn-elite-icon danger" :title="$t('common.delete')">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </template>
            </draggable>
          </div>
        </template>
      </div>
    </main>

    <!-- Status Add/Edit Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showStatusModal" class="elite-modal-backdrop" @click.self="showStatusModal = false">
          <div class="elite-modal-window medium glassmorphism animate-pop">
            <div class="modal-header-elite primary">
              <div class="modal-icon-orb"><i class="fas fa-columns"></i></div>
              <h3>{{ editingStatus.id ? $t('common.edit') : ($t('customFields.addStatus') || 'Add Status') }}</h3>
            </div>
            <div class="modal-body-elite scrollable custom-scrollbar flex flex-col gap-10">
              <div class="elite-input-group">
                <label>{{ $t('customFields.name') }} <span class="required-star">*</span></label>
                <div class="elite-input-wrapper">
                  <i class="fas fa-tag elite-input-icon"></i>
                  <input v-model="editingStatus.name" type="text" class="elite-input-field has-icon" placeholder="e.g. In Review" />
                </div>
              </div>
              <div class="elite-input-group">
                <label>{{ $t('customFields.type') || 'Category' }}</label>
                <div class="elite-input-wrapper">
                  <i class="fas fa-layer-group elite-input-icon"></i>
                  <select v-model="editingStatus.category" class="elite-select-field has-icon">
                    <option value="TO_DO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PENDING">Pending</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>
              <div class="elite-input-group">
                <label>{{ $t('common.color') || 'Color' }}</label>
                <div class="elite-input-wrapper" style="align-items:center;gap:12px">
                  <input type="color" v-model="editingStatus.color" style="width:40px;height:40px;border:none;background:none;cursor:pointer;padding:0" />
                  <span style="font-size:0.85rem;color:var(--text-muted)">{{ editingStatus.color }}</span>
                </div>
              </div>
            </div>
            <div class="modal-footer-elite h-[100px]">
              <button @click="showStatusModal = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
              <button @click="saveStatus" class="btn-elite-solid primary" :disabled="loadingSave">
                <span v-if="loadingSave" class="spinner-tiny"></span>
                <i v-else class="fas fa-check-circle mr-2"></i>
                {{ loadingSave ? '...' : $t('common.save') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Edit Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showEditModal" class="elite-modal-backdrop" @click.self="showEditModal = false">
          <div class="elite-modal-window medium glassmorphism animate-pop">
            <div class="modal-header-elite primary">
              <div class="modal-icon-orb"><AnimatedIcon name="edit" size="xs" /></div>
              <h3>{{ $t('customFields.editField') || $t('common.edit') }}</h3>
            </div>
            <div class="modal-body-elite scrollable custom-scrollbar flex flex-col gap-10">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div class="elite-input-group">
                  <label>{{ $t('customFields.name') }} <span class="required-star">*</span></label>
                  <div class="elite-input-wrapper">
                    <i class="fas fa-signature elite-input-icon"></i>
                    <input v-model="editField.name" type="text" class="elite-input-field has-icon" />
                  </div>
                </div>
                <div class="elite-input-group">
                  <label>{{ $t('customFields.type') }}</label>
                  <div class="elite-input-wrapper">
                    <i :class="getFieldIconClass(editField.field_type)" class="elite-input-icon"></i>
                    <select v-model="editField.field_type" class="elite-select-field has-icon">
                      <option value="TEXT">{{ $t('customFields.types.text') }}</option>
                      <option value="NUMBER">{{ $t('customFields.types.number') }}</option>
                      <option value="DATE">{{ $t('customFields.types.date') }}</option>
                      <option value="USER">{{ $t('customFields.types.user') }}</option>
                      <option value="CHOICE">{{ $t('customFields.types.choice') }}</option>
                    </select>
                  </div>
                </div>
              </div>
              <transition name="fade">
                <div v-if="editField.field_type === 'CHOICE'" class="elite-input-group animate-slide-in">
                  <label>{{ $t('customFields.options') }}</label>
                  <div class="elite-input-wrapper">
                    <i class="fas fa-list-ol elite-input-icon"></i>
                    <input v-model="editField.optionsStr" type="text" class="elite-input-field has-icon" placeholder="Option 1, Option 2, Option 3" />
                  </div>
                  <p class="text-[0.65rem] text-gray-400 mt-2 font-bold uppercase tracking-widest pl-1">{{ $t('customFields.optionsHint') }}</p>
                </div>
              </transition>
              <div class="elite-toggle-island primary-island mt-2">
                <div class="island-main">
                  <div class="island-icon"><i class="fas fa-shield-alt"></i></div>
                  <div class="island-text">
                    <span class="title">{{ $t('customFields.requiredField') }}</span>
                    <span class="desc">{{ $t('customFields.requiredDesc') }}</span>
                  </div>
                </div>
                <label class="premium-switch">
                  <input type="checkbox" v-model="editField.required">
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>
            <div class="modal-footer-elite h-[100px]">
              <button @click="showEditModal = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
              <button @click="updateField" class="btn-elite-solid primary" :disabled="loadingSave">
                <span v-if="loadingSave" class="spinner-tiny"></span>
                <i v-else class="fas fa-check-circle mr-2"></i>
                {{ loadingSave ? '...' : $t('common.save') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Elite Modal -->
    <Teleport to="body">
       <transition name="modal-fade">
         <div v-if="showAddModal" class="elite-modal-backdrop" @click.self="showAddModal = false">
            <div class="elite-modal-window medium glassmorphism animate-pop">
               <div class="modal-header-elite primary">
                  <div class="modal-icon-orb"><AnimatedIcon name="plus" size="xs" /></div>
                  <h3>{{ $t('customFields.addField') }}</h3>
               </div>
               
               <div class="modal-body-elite scrollable custom-scrollbar flex flex-col gap-10">
                   <!-- Name & Type Grid -->
                   <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div class="elite-input-group">
                         <label>{{ $t('customFields.name') }} <span class="required-star">*</span></label>
                         <div class="elite-input-wrapper">
                            <i class="fas fa-signature elite-input-icon"></i>
                            <input v-model="newField.name" type="text" class="elite-input-field has-icon" :placeholder="$t('customFields.name_placeholder') || 'e.g. Priority Level'" />
                         </div>
                      </div>
                      <div class="elite-input-group">
                         <label>{{ $t('customFields.type') }}</label>
                         <div class="elite-input-wrapper">
                            <i :class="getFieldIconClass(newField.field_type)" class="elite-input-icon"></i>
                            <select v-model="newField.field_type" class="elite-select-field has-icon">
                              <option value="TEXT">{{ $t('customFields.types.text') }}</option>
                              <option value="NUMBER">{{ $t('customFields.types.number') }}</option>
                              <option value="DATE">{{ $t('customFields.types.date') }}</option>
                              <option value="USER">{{ $t('customFields.types.user') }}</option>
                              <option value="CHOICE">{{ $t('customFields.types.choice') }}</option>
                            </select>
                         </div>
                      </div>
                   </div>
   
                   <!-- Options Multi-Input (Only if CHOICE) -->
                   <transition name="fade">
                      <div v-if="newField.field_type === 'CHOICE'" class="elite-input-group animate-slide-in">
                        <label>{{ $t('customFields.options') }}</label>
                        <div class="elite-input-wrapper">
                           <i class="fas fa-list-ol elite-input-icon"></i>
                           <input v-model="newField.optionsStr" type="text" class="elite-input-field has-icon" placeholder="Option 1, Option 2, Option 3" />
                        </div>
                        <p class="text-[0.65rem] text-gray-400 mt-2 font-bold uppercase tracking-widest pl-1">{{ $t('customFields.optionsHint') }}</p>
                      </div>
                   </transition>
   
                   <!-- Required Toggle Block (Glass Island) -->
                   <div class="elite-toggle-island primary-island mt-2">
                       <div class="island-main">
                        <div class="island-icon"><i class="fas fa-shield-alt"></i></div>
                        <div class="island-text">
                          <span class="title">{{ $t('customFields.requiredField') }}</span>
                          <span class="desc">{{ $t('customFields.requiredDesc') }}</span>
                        </div>
                      </div>
                      <label class="premium-switch">
                         <input type="checkbox" v-model="newField.required">
                         <span class="switch-slider"></span>
                      </label>
                   </div>
                </div>

                <div class="modal-footer-elite h-[100px]">
                   <button @click="showAddModal = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
                   <button @click="saveField" class="btn-elite-solid primary" :disabled="loadingSave">
                     <span v-if="loadingSave" class="spinner-tiny"></span>
                     <i v-else class="fas fa-check-circle mr-2" :class="{ 'ml-2 mr-0': $i18n.locale === 'ar' }"></i>
                     {{ loadingSave ? '...' : $t('customFields.activate') }}
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
import draggable from 'vuedraggable';

export default {
  name: 'CustomFieldsConfigView',
  props: ['projectId'],
  components: { AnimatedIcon, draggable },
  data() {
    return {
      projectDetails: null,
      fields: [],
      statuses: [],
      loading: true,
      loadingSave: false,
      activeTab: 'fields',
      showAddModal: false,
      showEditModal: false,
      showStatusModal: false,
      editingStatus: { id: null, name: '', category: 'TO_DO', color: '#64748B' },
      editField: { id: null, name: '', field_type: 'TEXT', required: false, optionsStr: '' },
      newField: { name: '', field_type: 'TEXT', required: false, optionsStr: '' }
    }
  },
  mounted() {
    this.fetchProject();
    this.fetchFields();
    this.fetchStatuses();
  },
  methods: {
    async fetchProject() {
       try {
         const res = await axios.get(`/api/pm/projects/${this.projectId}/`);
         this.projectDetails = res.data;
       } catch (e) { console.error(e); }
    },
    async fetchStatuses() {
      try {
        const res = await axios.get(`/api/pm/statuses/?project=${this.projectId}`);
        this.statuses = res.data;
      } catch (e) { console.error(e); }
    },
    openAddStatusModal() {
      this.editingStatus = { id: null, name: '', category: 'TO_DO', color: '#64748B' };
      this.showStatusModal = true;
    },
    openEditStatusModal(st) {
      this.editingStatus = { ...st };
      this.showStatusModal = true;
    },
    async saveStatus() {
      if (!this.editingStatus.name) return;
      this.loadingSave = true;
      try {
        if (this.editingStatus.id) {
          await axios.patch(`/api/pm/statuses/${this.editingStatus.id}/`, {
            name: this.editingStatus.name,
            category: this.editingStatus.category,
            color: this.editingStatus.color,
          });
        } else {
          await axios.post(`/api/pm/statuses/`, {
            project: this.projectId,
            name: this.editingStatus.name,
            category: this.editingStatus.category,
            color: this.editingStatus.color,
            order: this.statuses.length + 1,
          });
        }
        this.showStatusModal = false;
        await this.fetchStatuses();
      } catch (e) { console.error(e); } finally { this.loadingSave = false; }
    },
    async deleteStatus(id) {
      if (!confirm(this.$t('common.delete_confirm') || 'Delete this status?')) return;
      try {
        await axios.delete(`/api/pm/statuses/${id}/`);
        await this.fetchStatuses();
      } catch (e) { console.error(e); }
    },
    async saveStatusOrder() {
      try {
        const items = this.statuses.map((s, i) => ({ id: s.id, order: i + 1 }));
        await axios.post(`/api/pm/statuses/reorder/`, { items });
      } catch (e) { console.error(e); }
    },
    async fetchFields() {
      this.loading = true;
      try {
        const res = await axios.get(`/api/pm/custom-fields/?project=${this.projectId}&t=${Date.now()}`);
        this.fields = res.data;
      } catch (err) {
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    getFieldIconName(type) {
      const map = {
        'TEXT': 'docs',
        'NUMBER': 'hash',
        'DATE': 'calendar',
        'USER': 'user',
        'CHOICE': 'list'
      }
      return map[type] || 'plus'
    },
    getFieldIconClass(type) {
      const map = {
        'TEXT': 'fas fa-align-left',
        'NUMBER': 'fas fa-hashtag',
        'DATE': 'fas fa-calendar-alt',
        'USER': 'fas fa-user-tag',
        'CHOICE': 'fas fa-list-ul'
      }
      return map[type] || 'fas fa-plus'
    },
    openAddModal() {
        this.newField = { name: '', field_type: 'TEXT', required: false, optionsStr: '' };
        this.showAddModal = true;
    },
    async saveField() {
      if(!this.newField.name) return;
      this.loadingSave = true;
      try {
        const res = await axios.post(`/api/pm/custom-fields/`, {
            project: this.projectId,
            name: this.newField.name,
            field_type: this.newField.field_type,
            required: this.newField.required
        });
        const createdField = res.data;
        if(this.newField.field_type === 'CHOICE' && this.newField.optionsStr) {
          const opts = this.newField.optionsStr.split(',').map(s => s.trim()).filter(Boolean);
          for(let opt of opts) {
            await axios.post(`/api/pm/custom-field-options/`, { custom_field: createdField.id, value: opt });
          }
        }
        this.showAddModal = false;
        this.fetchFields();
      } catch (err) {
        console.error(err)
      } finally {
        this.loadingSave = false;
      }
    },
    async deleteField(id) {
      if(confirm(this.$t('customFields.delete_confirm') || 'Are you sure you want to delete this custom field?')) {
        try {
          await axios.delete(`/api/pm/custom-fields/${id}/`);
          this.fetchFields();
        } catch (e) {
          console.error(e)
        }
      }
    },
    openEditModal(field) {
      this.editField = {
        id: field.id,
        name: field.name,
        field_type: field.field_type,
        required: field.required,
        optionsStr: field.options ? field.options.map(o => o.value || o).join(', ') : ''
      };
      this.showEditModal = true;
    },
    async updateField() {
      if (!this.editField.name) return;
      this.loadingSave = true;
      try {
        await axios.patch(`/api/pm/custom-fields/${this.editField.id}/`, {
          name: this.editField.name,
          field_type: this.editField.field_type,
          required: this.editField.required,
        });
        this.showEditModal = false;
        this.fetchFields();
      } catch (err) {
        console.error(err);
      } finally {
        this.loadingSave = false;
      }
    }
  }
}
</script>

<style scoped>
.custom-fields-universe {
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
}

.main-stage { flex: 1; min-height: 0; }
.bar-left { display: flex; align-items: center; gap: 20px; }

.btn-back-orb {
  width: 44px; height: 44px; border-radius: 12px; background: transparent;
  border: 1px solid var(--border-color); color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: 0.3s;
}
.btn-back-orb:hover { background: var(--bg-hover); color: var(--primary); border-color: var(--primary); }

.elite-breadcrumbs { display: flex; align-items: center; gap: 12px; }
.crumb { font-size: 0.9rem; font-weight: 700; color: var(--text-muted); cursor: pointer; transition: 0.3s; }
.crumb:hover { color: var(--primary); }
.crumb.active { color: var(--text-main); font-weight: 900; }
.sep { opacity: 0.2; font-size: 0.7rem; }

/* Create button */
.btn-create-field {
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
.btn-create-field:hover { transform: translateY(-2px); box-shadow: 0 8px 20px var(--primary-glow); filter: brightness(1.08); }
.btn-create-field:active { transform: translateY(0); filter: brightness(0.97); }

/* Empty State */
.premium-empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 160px 40px; text-align: center; max-width: 900px; margin: 0 auto;
}

.pulsing-orb-container { position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; }
.orb-pulse {
  position: absolute; inset: -20px; border-radius: 50%; opacity: 0.2;
  animation: orbPulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.orb-pulse.primary-pulse { background: radial-gradient(circle, var(--primary) 0%, transparent 70%); }

.orb-core {
  position: relative; width: 90px; height: 90px; border-radius: 30px;
  display: flex; align-items: center; justify-content: center; color: white;
  background: var(--primary);
  box-shadow: 0 20px 40px var(--primary-glow);
  transform: rotate(45deg);
}
.orb-core :deep(svg), .orb-core i { transform: rotate(-45deg); }

@keyframes orbPulse {
  0% { transform: scale(0.8); opacity: 0; }
  50% { opacity: 0.4; }
  100% { transform: scale(1.8); opacity: 0; }
}

.empty-title-elite { font-size: 3.5rem; font-weight: 1000; color: var(--text-main); margin-bottom: 16px; letter-spacing: -3px; line-height: 0.9; }
.empty-desc-elite { font-size: 1.3rem; color: var(--text-muted); max-width: 550px; line-height: 1.7; }

/* Table cells */
.field-type-badge {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--primary);
  background: var(--primary-bg);
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid var(--primary-glow);
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.field-options-count {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.7rem; font-weight: 700;
  color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em;
}

.field-options-empty {
  font-size: 0.7rem; font-weight: 700;
  color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em;
}

/* Required star */
.required-star { color: var(--primary); }

/* Toggle island */
.elite-toggle-island.primary-island {
  background: var(--primary-bg);
  border: 1px solid var(--primary-glow);
}

/* Switch */
.premium-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.premium-switch input { opacity: 0; width: 0; height: 0; }
.switch-slider {
  position: absolute; inset: 0;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 24px; cursor: pointer; transition: 0.3s;
}
.switch-slider::before {
  content: ''; position: absolute;
  width: 18px; height: 18px; left: 2px; top: 2px;
  background: #fff; border-radius: 50%; transition: 0.3s;
}
.premium-switch input:checked + .switch-slider {
  background: var(--primary);
  border-color: var(--primary);
  box-shadow: 0 0 12px var(--primary-glow);
}
.premium-switch input:checked + .switch-slider::before { transform: translateX(20px); }

.animate-slide-in {
  animation: slideIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  opacity: 0;
}
@keyframes slideIn { to { opacity: 1; } }

.required-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--border-color);
  display: inline-block;
}
.required-dot.active {
  background: var(--primary);
  box-shadow: 0 0 10px var(--primary-glow);
}

/* Config Tabs */
.config-tabs {
  display: flex;
  gap: 4px;
  padding: 0 40px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
}
.config-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -1px;
}
.config-tab:hover { color: var(--primary); }
.config-tab.active { color: var(--primary); border-bottom-color: var(--primary); }

/* Statuses Config */
.statuses-config { padding: 8px 0; }
.statuses-hint { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px; }
.statuses-list { display: flex; flex-direction: column; gap: 8px; }
.status-row-config {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  transition: box-shadow 0.2s;
}
.status-row-config:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.drag-handle-status { color: var(--text-muted); cursor: grab; font-size: 1rem; }
.drag-handle-status:active { cursor: grabbing; }
.status-color-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.status-name-config { font-weight: 700; font-size: 0.95rem; color: var(--text-main); flex: 1; }
.status-category-badge {
  font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--primary); background: var(--primary-bg); padding: 3px 10px; border-radius: 20px;
}
.status-row-actions { display: flex; gap: 6px; }

</style>
