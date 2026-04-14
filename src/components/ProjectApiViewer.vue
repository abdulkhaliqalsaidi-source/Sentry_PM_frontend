<template>
  <div class="api-viewer-container">
    <div class="api-header">
      <div class="header-text">
        <h2 class="swagger-title">
          <span>Swagger</span> <span class="fw-normal">UI</span>
          <span class="swagger-version">1.0.0</span>
        </h2>
        <p class="subtitle">{{ $t('api_viewer.subtitle') }}</p>
      </div>
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input 
          type="text" 
          v-model="searchQuery" 
          :placeholder="$t('api_viewer.search_placeholder')" 
          class="search-input"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <transition-group name="staggered-list" tag="div" v-else-if="Object.keys(groupedApis).length > 0" class="swagger-ui">
      <!-- Loop through groups (tags) -->
      <div 
        v-for="(groupApis, appName, groupIndex) in groupedApis" 
        :key="appName"
        class="swagger-tag-group"
        :style="{ '--delay': Math.min(groupIndex * 0.1, 0.5) + 's' }"
      >
        <div class="swagger-tag-header" @click="toggleGroup(appName)">
          <div class="tag-title-container">
            <h3 class="tag-title">
              {{ appName === 'default' ? $t('api_viewer.general') : capitalize(appName) }}
            </h3>
            <span class="tag-description" v-if="appName !== 'default'">{{ $t('api_viewer.endpoints_related_to', { name: capitalize(appName) }) }}</span>
          </div>
          <button class="expand-tag-btn">
             <i class="fa-solid" :class="collapsedGroups.has(appName) ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
          </button>
        </div>
        
        <transition-group name="staggered-list" tag="div" class="swagger-tag-content" v-show="!collapsedGroups.has(appName)">
          <div 
            v-for="(api, index) in groupApis" 
            :key="api._uid" 
            class="swagger-api-item"
            :class="[api.method ? api.method.toLowerCase() : 'default', { 'is-expanded': expandedIds.has(api._uid) }]"
            :style="{ '--delay': Math.min(index * 0.05, 0.5) + 's' }"
          >
            <div class="api-summary" @click="toggleExpand(api._uid)">
              <div class="api-summary-left">
                <span class="method-chip">{{ api.method || 'UNKNOWN' }}</span>
                <span class="api-path" dir="ltr">{{ api.path.endsWith('/') ? api.path : api.path + '/' }}</span>
              </div>
              
              <div class="api-summary-right d-flex align-items-center gap-2">
                <button class="expand-btn delete-btn" @click.stop="deleteApi(api)" :title="$t('common.delete')">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
                <button class="expand-btn">
                  <i class="fa-solid" :class="expandedIds.has(api._uid) ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
              </div>
            </div>
            
            <div class="api-details" v-show="expandedIds.has(api._uid)">
              <div class="details-section" v-if="api.description">
                <div class="details-header">{{ $t('api_viewer.description') }}</div>
                <div class="description-content text-pre-wrap">{{ api.description }}</div>
              </div>
              <div class="details-section" v-else>
                <div class="description-content text-muted italic">{{ $t('api_viewer.no_documentation') }}</div>
              </div>

              <div class="details-section notes-section">
                <div class="details-header d-flex justify-content-between align-items-center">
                  <span>{{ $t('api_viewer.dev_notes') }}</span>
                  <button 
                    class="btn-icon" 
                    @click="toggleEditNotes(api._uid)"
                    :title="editingNotes[api._uid] ? $t('common.cancel') : $t('common.edit')"
                  >
                    <i class="fa-solid" :class="editingNotes[api._uid] ? 'fa-times' : 'fa-pen'"></i>
                  </button>
                </div>
                
                <div v-if="editingNotes[api._uid]" class="notes-editor">
                  <textarea 
                    v-model="api.tempNotes" 
                    class="notes-textarea" 
                    rows="4" 
                    :placeholder="$t('api_viewer.notes_placeholder')"
                  ></textarea>
                  <div class="notes-actions">
                    <button class="btn-save" @click="saveNotes(api)" :disabled="api.isSaving">
                      <i class="fa-solid fa-spinner fa-spin" v-if="api.isSaving"></i>
                      <span v-else>{{ $t('api_viewer.save_notes') }}</span>
                    </button>
                  </div>
                  <div class="notes-feedback" v-if="api.saveStatus">
                    <span :class="`text-${api.saveStatus.type}`">{{ api.saveStatus.message }}</span>
                  </div>
                </div>
                
                <div v-else class="notes-display">
                  <div v-if="api.notes" class="description-content text-pre-wrap">{{ api.notes }}</div>
                  <div v-else class="description-content text-muted italic">{{ $t('api_viewer.no_notes') }}</div>
                </div>
              </div>

              <div class="details-section meta-section">
                <div class="meta-info">
                  <i class="fa-solid fa-code-branch meta-icon"></i>
                  {{ $t('api_viewer.source_file') }}: <code>{{ api.app_name ? `${api.app_name}/views.py` : 'views.py' }}</code>
                </div>
              </div>
            </div>
          </div>
        </transition-group>
      </div>
    </transition-group>

    <div v-else class="empty-state card-glass">
      <i class="fa-solid fa-plug-circle-xmark empty-icon"></i>
      <h3>{{ $t('api_viewer.no_endpoints') }}</h3>
      <p>{{ $t('api_viewer.no_endpoints_desc') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import axios from '@/plugins/axios';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  projectId: {
    type: [Number, String],
    required: true
  }
});

const apis = ref([]);
const searchQuery = ref('');
const isLoading = ref(true);
const expandedIds = ref(new Set());
const collapsedGroups = ref(new Set());
const editingNotes = ref({});

const fetchApisFromDatabase = async () => {
  if (!props.projectId) return;
  isLoading.value = true;
  try {
    const response = await axios.get(`/api/pm/endpoints/?project=${props.projectId}`);
    let results = response.data.results !== undefined ? response.data.results : response.data;
    
    // Assign unique IDs for rendering state
    apis.value = results.map((api, index) => ({
      ...api,
      _uid: api.id || `temp-${index}`,
      tempNotes: api.notes || '',
      isSaving: false,
      saveStatus: null
    }));
  } catch (error) {
    console.error("خطأ في جلب بيانات الـ APIs من قاعدة البيانات:", error);
  } finally {
    isLoading.value = false;
  }
};

const groupedApis = computed(() => {
  let apisToProcess = apis.value;
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    apisToProcess = apisToProcess.filter(api => 
      (api.path && api.path.toLowerCase().includes(query)) || 
      (api.description && api.description.toLowerCase().includes(query)) ||
      (api.method && api.method.toLowerCase().includes(query)) ||
      (api.app_name && api.app_name.toLowerCase().includes(query)) ||
      (api.notes && api.notes.toLowerCase().includes(query))
    );
  }

  // Group by app_name
  const groups = {};
  apisToProcess.forEach(api => {
    const appName = api.app_name || 'default';
    if (!groups[appName]) groups[appName] = [];
    groups[appName].push(api);
  });
  
  return groups;
});

const toggleExpand = (id) => {
  const newExpanded = new Set(expandedIds.value);
  if (newExpanded.has(id)) {
    newExpanded.delete(id);
  } else {
    newExpanded.add(id);
  }
  expandedIds.value = newExpanded;
};

const toggleGroup = (appName) => {
  const newCollapsed = new Set(collapsedGroups.value);
  if (newCollapsed.has(appName)) {
    newCollapsed.delete(appName);
  } else {
    newCollapsed.add(appName);
  }
  collapsedGroups.value = newCollapsed;
};

const toggleEditNotes = (uid) => {
  editingNotes.value[uid] = !editingNotes.value[uid];
  if (editingNotes.value[uid]) {
    const apiIndex = apis.value.findIndex(a => a._uid === uid);
    if (apiIndex !== -1) {
       apis.value[apiIndex].tempNotes = apis.value[apiIndex].notes || '';
       apis.value[apiIndex].saveStatus = null;
    }
  }
};

const deleteApi = async (api) => {
  if (!api.id) return;
  if (!confirm(t('api_viewer.delete_confirm', { path: api.path }))) return;
  
  try {
    await axios.delete(`/api/pm/endpoints/${api.id}/`);
    apis.value = apis.value.filter(a => a.id !== api.id);
  } catch (error) {
    console.error("Error deleting API:", error);
    alert(t('api_viewer.delete_error'));
  }
};

const saveNotes = async (api) => {
  if (!api.id) return; // Cannot save if it's not in DB yet
  
  api.isSaving = true;
  api.saveStatus = null;
  
  try {
    const response = await axios.patch(`/api/pm/endpoints/${api.id}/`, {
      notes: api.tempNotes
    });
    
    api.notes = response.data.notes;
    api.saveStatus = { type: 'success', message: t('api_viewer.save_success') };
    
    // Auto-close after short delay
    setTimeout(() => {
      editingNotes.value[api._uid] = false;
      api.saveStatus = null;
    }, 1500);
    
  } catch (error) {
    console.error("Error saving notes:", error);
    api.saveStatus = { type: 'danger', message: t('api_viewer.save_error') };
  } finally {
    api.isSaving = false;
  }
};

const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Fetch data on mount
onMounted(() => {
  fetchApisFromDatabase();
});

// React to project changes if necessary
watch(() => props.projectId, () => {
  fetchApisFromDatabase();
});

defineExpose({
  fetchApisFromDatabase
});
</script>

<style scoped>
.api-viewer-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.api-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.swagger-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.swagger-title span:first-child {
  font-weight: 800;
}

.fw-normal {
  font-weight: 400;
}

.swagger-version {
  font-size: 0.75rem;
  background-color: #89bf04;
  color: #fff;
  padding: 0.1rem 0.5rem;
  border-radius: 12px;
  vertical-align: middle;
  font-family: monospace;
}

.subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0 1rem;
  width: 100%;
  max-width: 400px;
  height: 48px;
  transition: all 0.3s ease;
}

.search-box:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
}

.search-icon {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0.5rem 0.75rem;
  color: var(--text-primary);
  outline: none;
  font-family: inherit;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
}

.clear-btn:hover {
  color: var(--text-primary);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.swagger-ui {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  font-family: sans-serif;
}

/* Tag Groups */
.swagger-tag-group {
  display: flex;
  flex-direction: column;
}

.swagger-tag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(59, 65, 81, 0.3);
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.tag-title-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.tag-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.tag-description {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.expand-tag-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
}

.swagger-tag-content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Base method colors */
.swagger-api-item.get {
  --method-color: #61affe;
  --method-bg: rgba(97, 175, 254, 0.1);
  --method-bg-hover: rgba(97, 175, 254, 0.2);
}
.swagger-api-item.post {
  --method-color: #49cc90;
  --method-bg: rgba(73, 204, 144, 0.1);
  --method-bg-hover: rgba(73, 204, 144, 0.2);
}
.swagger-api-item.put {
  --method-color: #fca130;
  --method-bg: rgba(252, 161, 48, 0.1);
  --method-bg-hover: rgba(252, 161, 48, 0.2);
}
.swagger-api-item.delete {
  --method-color: #f93e3e;
  --method-bg: rgba(249, 62, 62, 0.1);
  --method-bg-hover: rgba(249, 62, 62, 0.2);
}
.swagger-api-item.patch {
  --method-color: #50e3c2;
  --method-bg: rgba(80, 227, 194, 0.1);
  --method-bg-hover: rgba(80, 227, 194, 0.2);
}
.swagger-api-item.default {
  --method-color: #999;
  --method-bg: rgba(153, 153, 153, 0.1);
  --method-bg-hover: rgba(153, 153, 153, 0.2);
}

.swagger-api-item {
  border: 1px solid var(--method-color);
  border-radius: 4px;
  background-color: var(--method-bg);
  margin-top: 0.5rem;
  overflow: hidden;
  transition: all 0.2s ease;
}

.swagger-api-item:hover {
  background-color: var(--method-bg-hover);
}

.swagger-api-item.is-expanded {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.api-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  cursor: pointer;
  user-select: none;
  min-height: 48px;
}

.api-summary-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Method chip */
.method-chip {
  background-color: var(--method-color);
  color: #fff;
  font-weight: 700;
  min-width: 80px;
  text-align: center;
  padding: 6px 15px;
  border-radius: 3px;
  text-transform: uppercase;
  font-size: 14px;
}

/* Path */
.api-path {
  font-weight: 600;
  font-family: monospace;
  font-size: 16px;
  color: var(--text-primary);
  white-space: nowrap;
}

.api-summary-right {
  display: flex;
  align-items: center;
}

.expand-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: color 0.2s;
}

.delete-btn:hover {
  color: var(--danger, #ef4444);
}

.api-details {
  border-top: 1px solid var(--method-color);
  padding: 1.5rem;
  background: var(--bg-primary);
  position: relative;
}

.details-section {
  margin-bottom: 1.5rem;
}

.details-section:last-child {
  margin-bottom: 0;
}

.details-header {
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
  text-transform: capitalize;
}

.description-content {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-primary);
}

.text-pre-wrap {
  white-space: pre-wrap;
  display: inline-block;
}

.text-muted {
  color: var(--text-muted);
}

.italic {
  font-style: italic;
}

/* Notes Section */
.notes-section {
  background: rgba(var(--primary-rgb), 0.03);
  border: 1px solid rgba(var(--primary-rgb), 0.1);
  border-radius: 8px;
  padding: 1.25rem;
}

.btn-icon {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(var(--text-secondary-rgb), 0.1);
  color: var(--primary);
}

.notes-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}

.notes-textarea {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.75rem;
  color: var(--text-primary);
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.notes-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
}

.notes-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-save {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-save:hover:not(:disabled) {
  background: var(--primary-dark, #0d6efd);
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.notes-feedback {
  font-size: 0.85rem;
  margin-top: 0.5rem;
  text-align: left;
}

.text-success { color: #28a745; }
.text-danger { color: #dc3545; }

.d-flex {
  display: flex;
}

.justify-content-between {
  justify-content: space-between;
}

.align-items-center {
  align-items: center;
}

.meta-section {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.meta-info {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.meta-icon {
  font-size: 0.9rem;
}

code {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  border: 1px dashed var(--border-color);
  border-radius: 12px;
}

.empty-icon {
  font-size: 3rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--text-secondary);
  max-width: 400px;
}

@media (max-width: 768px) {
  .api-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .search-box {
    max-width: 100%;
  }

  .api-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

/* Staggered List Animation */
.staggered-list-enter-active {
    animation: fadeInUp 0.5s ease backwards;
    animation-delay: var(--delay);
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
