<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from '@/plugins/axios';
import draggable from 'vuedraggable';
import TaskCard from './TaskCard.vue';
import TaskDetailModal from './TaskDetailModal.vue';
import CelebrationOverlay from './CelebrationOverlay.vue';
import StateLoader from './StateLoader.vue';
import StateEmpty from './StateEmpty.vue';
import { usePermissions } from '@/composables/usePermissions';

const router = useRouter();
const { t } = useI18n();
const { canCreateTask } = usePermissions();
const props = defineProps(['projectId', 'projectName', 'permissions']);
const emits = defineEmits(['view-error']);

const goBack = () => {
    router.push('/projects');
};
const tasks = ref([]);
const groupedTasks = ref({});
const versions = ref([]);
const loading = ref(true);
const isAdmin = ref(false);
const isSuperUser = ref(false);
const projectUsers = ref([]);
const assigningTaskId = ref(null);
const assigneeSearch = ref('');

const filteredProjectUsers = computed(() => {
    if (!assigneeSearch.value.trim()) return projectUsers.value;
    const q = assigneeSearch.value.toLowerCase();
    return projectUsers.value.filter(u => u.username.toLowerCase().includes(q));
});
const epics = ref([]);
const filters = ref({
    epic: null,
    assignee: null,
    priority: null,
    search: ''
});

const quickFilters = ref({
    myIssues: false,
    highPriority: false
});

const epicFilterOpen = ref(false);
const assigneeFilterOpen = ref(false);
const priorityFilterOpen = ref(false);



const toggleMyIssues = () => {
    quickFilters.value.myIssues = !quickFilters.value.myIssues;
    if (quickFilters.value.myIssues) {
        const myName = localStorage.getItem('username');
        const me = projectUsers.value.find(u => u.username === myName);
        if (me) filters.value.assignee = me.id;
    } else {
        filters.value.assignee = null;
    }
    fetchTasks();
};

const toggleHighPriority = () => {
    quickFilters.value.highPriority = !quickFilters.value.highPriority;
    filters.value.priority = quickFilters.value.highPriority ? 'HIGH' : null;
    fetchTasks();
};

let debounceTimer = null;
const debounceFetch = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        fetchTasks();
    }, 300);
};

const allColumns = ref([]);

const showAllColumns = ref(false);

const visibleColumns = computed(() => {
  const isPending = (c) => c.category === 'PENDING' || c.title.toLowerCase().includes('pending') || c.title.includes('معلق');

  if (showAllColumns.value) {
    const cols = [...allColumns.value];
    return cols.sort((a, b) => {
      // For Admins: TO_DO category first
      if (a.category === 'TO_DO' && b.category !== 'TO_DO') return -1;
      if (a.category !== 'TO_DO' && b.category === 'TO_DO') return 1;
      return 0;
    });
  }

  // For Members: Show IN_PROGRESS + DONE columns + Pending, with Pending first
  // Exclusion: Hide "Approved" (تمت المراجعة)
  const filtered = allColumns.value.filter(col => {
    const isApproved = col.category === 'DONE' && (col.title.toLowerCase().includes('approved') || col.title.includes('تمت المراجعة'));
    if (isApproved) return false;
    
    return col.category === 'IN_PROGRESS' || col.category === 'DONE' || col.category === 'PENDING' || col.category === 'IN_REVIEW' || isPending(col);
  });

  return filtered.sort((a, b) => {
    if (isPending(a) && !isPending(b)) return -1;
    if (!isPending(a) && isPending(b)) return 1;
    return 0;
  });
});

const userRole = ref('VIEWER');

const checkAdmin = async () => {
  const isSuper = localStorage.getItem('is_superuser') === 'true';
  isSuperUser.value = isSuper;
  
  try {
      const res = await axios.get('/api/pm/project-roles/', { params: { project: props.projectId } });
      const roles = res.data;
      if (roles.length > 0) {
          userRole.value = roles[0].role;
      } else {
          userRole.value = isSuper ? 'ADMIN' : 'VIEWER';
      }
  } catch (e) {
      console.error("Error fetching project role", e);
      userRole.value = isSuper ? 'ADMIN' : 'VIEWER';
  }

  isAdmin.value = isSuperUser.value || userRole.value === 'ADMIN';
  showAllColumns.value = isAdmin.value; // Default to showing all for admins
  await fetchStatuses(); // Fetch statuses after checking role
};

const fetchStatuses = async () => {
    try {
        const response = await axios.get('/api/pm/statuses/', { params: { project: props.projectId } });
        const data = response.data;
        allColumns.value = data.map(s => {
            let displayTitle = s.name;
            const nameLower = s.name.toLowerCase();
            
            // Mapping API status names to translation keys
            if (nameLower.includes('to do')) displayTitle = t('kanban.columns.to_do');
            else if (nameLower.includes('pending') || nameLower.includes('معلق')) displayTitle = t('kanban.columns.pending');
            else if (nameLower.includes('in progress')) displayTitle = t('kanban.columns.in_progress');
            else if (nameLower.includes('done')) displayTitle = t('kanban.columns.done');
            else if (nameLower.includes('approved')) displayTitle = t('kanban.columns.approved');

            return {
                id: s.id,
                title: displayTitle,
                status: s.id,
                color: s.color,
                category: s.category
            };
        });
        
        // Initialize groupedTasks object
        const grouped = {};
        data.forEach(s => { grouped[s.id] = []; });
        groupedTasks.value = grouped;
    } catch (e) {
        console.error("Error fetching statuses", e);
    }
};

const fetchTasks = async (silent = false) => {
  if (!props.projectId) {
    loading.value = false;
    return;
  }
  if (!silent) loading.value = true;
  try {
    // Fetch Epics for filter loop
    if (epics.value.length === 0) {
        const epicsRes = await axios.get('/api/pm/epics/', { params: { project: props.projectId } });
        epics.value = epicsRes.data;
    }

    // Phase 2: Fetch Active Sprint first
    const sprintsRes = await axios.get('/api/pm/sprints/', { params: { project: props.projectId } });
    const sprints = sprintsRes.data;
    const activeSprint = sprints.find(s => s.status === 'ACTIVE');
    const activeSprintId = activeSprint ? activeSprint.id : null;

    if (!activeSprintId) {
        tasks.value = [];
        loading.value = false;
        return;
    }

    // Build Query Params
    const params = {
        project: props.projectId,
        sprint: activeSprintId,
    };
    
    if (filters.value.epic) params.epic = filters.value.epic;
    if (filters.value.priority) params.priority = filters.value.priority;
    if (filters.value.assignee) params.assigned_to = filters.value.assignee;
    if (filters.value.search) params.search = filters.value.search;

    const response = await axios.get('/api/pm/tasks/', { params });
    const data = response.data;
    tasks.value = data;
    
    // Group tasks by status ID
    const grouped = {};
    allColumns.value.forEach(col => { grouped[col.id] = []; });
    
    data.forEach(task => {
      const statusKey = task.status || task.status_details?.id;
      if (statusKey && grouped[statusKey]) {
        grouped[statusKey].push(task);
      } else if (allColumns.value.length > 0) {
        // fallback to first column
        grouped[allColumns.value[0].id].push(task);
      }
    });
    groupedTasks.value = grouped;
  } catch (error) {
    console.error("Error fetching tasks:", error);
  } finally {
    loading.value = false;
  }
};

const fetchVersions = async () => {
    try {
        const res = await axios.get('/api/pm/versions/', { params: { project: props.projectId } });
        versions.value = res.data;
    } catch (e) { console.error("Error fetching versions", e); }
};

const projectDetails = ref(null);

const fetchProjectDetails = async () => {
    if (!props.projectId) return;
    try {
        const response = await axios.get(`/api/pm/projects/${props.projectId}/`);
        projectDetails.value = response.data;
        fetchProjectUsers();
    } catch (error) {
        console.error("Error fetching project details:", error);
    }
};

const fetchProjectUsers = async () => {
  const name = props.projectName || (projectDetails.value ? projectDetails.value.name : null);
  if (!name) return;
  
  try {
    const response = await axios.get('/api/pm/project-users/', { 
        params: { project_name: name } 
    });
    projectUsers.value = response.data;
  } catch (error) {
    console.error("Error fetching project users:", error);
  }
};

const updateTaskStatus = async (taskId, newStatusId, timeSpent = null) => {
  try {
    const body = { status_id: newStatusId };
    await axios.post(`/api/pm/tasks/${taskId}/update-status/`, body);
    
    if (timeSpent !== null) {
        await axios.patch(`/api/pm/tasks/${taskId}/`, { time_spent: timeSpent });
    }
    return true;
  } catch (error) {
    console.error("Failed to update task status", error);
    const errorMsg = error.response?.data?.error || t('kanban.messages.failed_to_update_status');
    alert(errorMsg);
    fetchTasks(); // Reload to revert UI
    return false;
  }
};

const showTimeModal = ref(false);
const timeSpent = ref(0);
const pendingTaskMove = ref(null);
const showCelebration = ref(false);

const triggerCelebration = () => {
    showCelebration.value = true;
    setTimeout(() => { showCelebration.value = false; }, 1800);
};

const onDragChange = async (evt, newStatusId) => {
  if (evt.added) {
    const task = evt.added.element;
    const targetCol = allColumns.value.find(c => c.id === newStatusId);
    const oldCol = allColumns.value.find(c => c.id === task.status);
    const oldCategory = oldCol ? oldCol.category : task.status_details?.category;
    
    // Check if moving to a DONE category status
    if (targetCol && targetCol.category === 'DONE' && oldCategory !== 'DONE') {
        pendingTaskMove.value = { task, oldStatus: task.status, newStatus: newStatusId };
        timeSpent.value = 0;
        showTimeModal.value = true;
        return;
    }

    const oldStatusId = task.status;
    
    const success = await updateTaskStatus(task.id, newStatusId);
    if (success) {
        task.status = newStatusId;
        // If moving FROM DONE to anywhere else
        if (oldCategory === 'DONE' && targetCol.category !== 'DONE') {
            await axios.patch(`/api/pm/tasks/${task.id}/`, { time_spent: 0 });
            task.time_spent = 0;
        }
    }
  }
};

const handleTimeSubmit = async () => {
    if (pendingTaskMove.value) {
        const { task, newStatus } = pendingTaskMove.value;
        const timeVal = parseFloat(timeSpent.value);
        await updateTaskStatus(task.id, newStatus, timeVal);
        task.status = newStatus;
        task.time_spent = timeVal;
        triggerCelebration();
    }
    showTimeModal.value = false;
    pendingTaskMove.value = null;
};

const cancelTimeEntry = () => {
    if (pendingTaskMove.value) {
        const { task, oldStatus, newStatus } = pendingTaskMove.value;
        // Revert: Remove from new column, add back to old column
        const newCol = groupedTasks.value[newStatus];
        const oldCol = groupedTasks.value[oldStatus];
        
        const idx = newCol.indexOf(task);
        if (idx !== -1) {
            newCol.splice(idx, 1);
            oldCol.push(task);
        }
    }
    showTimeModal.value = false;
    pendingTaskMove.value = null;
};

const toggleAssignDropdown = (taskId) => {
  if (assigningTaskId.value === taskId) {
    assigningTaskId.value = null;
    assigneeSearch.value = '';
  } else {
    assigningTaskId.value = taskId;
    assigneeSearch.value = '';
    setTimeout(() => {
        const el = document.querySelector('.assign-dropdown .popover-search input');
        if (el) el.focus();
    }, 50);
  }
};

const confirmAssign = async (taskId, userId = null) => {
  assigningTaskId.value = null;
  try {
    await axios.post(`/api/pm/tasks/${taskId}/assign/`, { assigned_to: userId });
    await fetchTasks();
  } catch (error) {
    console.error("Failed to assign task", error);
  }
};

const showDetailModal = ref(false);
const selectedTask = ref(null);

const handleTaskUpdate = async () => {
    await fetchTasks(true); // Update the board in the background (silent)
    // Refresh selected task if open
    if (selectedTask.value) {
        try {
            const res = await axios.get(`/api/pm/tasks/${selectedTask.value.id}/`);
            selectedTask.value = res.data;
        } catch (e) {
            console.error("Failed to refresh selected task details", e);
        }
    }
};

const openEditModal = (task) => {
  // Allow everyone to view details
  selectedTask.value = task;
  showDetailModal.value = true;
};



// Only re-fetch when projectId actually changes (not on the initial mount)
watch(() => props.projectId, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    fetchTasks();
    if (props.projectName) {
        fetchProjectUsers();
    } else {
        fetchProjectDetails();
    }
  }
});

onMounted(async () => {
  await checkAdmin(); // sets up columns via fetchStatuses()
  // Run tasks + users/details in parallel — single set of requests
  await Promise.all([
    fetchTasks(),
    fetchCustomFields(),
    fetchVersions(),
    props.projectName ? fetchProjectUsers() : fetchProjectDetails()
  ]);
});

defineExpose({
  async refreshData() {
    await fetchTasks();
    if (props.projectName) {
      await fetchProjectUsers();
    } else {
      await fetchProjectDetails();
    }
  }
});

const showCreateModal = ref(false);
const loadingSave = ref(false);
const isSuccess = ref(false);
const newTask = ref({
    title: '',
    description: '',
    priority: 'MEDIUM',
    issue_type: 'TASK',
    start_date: '',
    end_date: '',
    version: '',
    custom_fields: {} // Store fieldId: value
});

const customFields = ref([]);
const fetchCustomFields = async () => {
    try {
        const res = await axios.get(`/api/pm/custom-fields/?project=${props.projectId}`);
        customFields.value = res.data;
    } catch (e) {
        console.error("Error fetching custom fields", e);
    }
};

const openCreateModal = () => {
    newTask.value = {
        title: '',
        description: '',
        priority: 'MEDIUM',
        issue_type: 'TASK',
        start_date: '',
        end_date: '',
        version: '',
        custom_fields: {}
    };
    // Pre-fill custom fields with empty values to ensure reactivity
    customFields.value.forEach(f => {
        newTask.value.custom_fields[f.id] = '';
    });
    showCreateModal.value = true;
};

const createTask = async () => {
    if (!newTask.value.title) return;

    // --- Validation for Custom Fields ---
    for (const field of customFields.value) {
        const val = newTask.value.custom_fields[field.id];
        if (field.required && (!val || val.toString().trim() === '')) {
            alert(`${field.name} ${t('common.is_required') || 'is required'}`);
            return;
        }
    }
    
    let defaultStatusId = null;
    const todoCol = allColumns.value.find(c => c.category === 'TO_DO');
    if (todoCol) {
        defaultStatusId = todoCol.id;
    } else if (allColumns.value.length > 0) {
        defaultStatusId = allColumns.value[0].id;
    }

    // If still null, fetch statuses now
    if (!defaultStatusId) {
        try {
            const res = await axios.get('/api/pm/statuses/', { params: { project: props.projectId } });
            if (res.data.length > 0) {
                const todo = res.data.find(s => s.category === 'TO_DO') || res.data[0];
                defaultStatusId = todo.id;
            }
        } catch (e) { console.error('Could not fetch statuses', e); }
    }
    
    loadingSave.value = true;
    try {
        const taskRes = await axios.post('/api/pm/tasks/', {
            project: props.projectId,
            title: newTask.value.title,
            description: newTask.value.description,
            status: defaultStatusId, 
            priority: newTask.value.priority,
            issue_type: newTask.value.issue_type,
            start_date: newTask.value.start_date || null,
            end_date: newTask.value.end_date || null
        });

        const createdTask = taskRes.data;

        // --- Link to Version ---
        if (newTask.value.version) {
            await axios.post('/api/pm/task-versions/', {
                task: createdTask.id,
                version: newTask.value.version,
                relation_type: 'FIXED_IN'
            });
        }

        // --- Save Custom Field Values ---
        const valuePromises = [];
        for (const field of customFields.value) {
            const val = newTask.value.custom_fields[field.id];
            if (val !== undefined && val !== null && val !== '') {
                const payload = {
                    task: createdTask.id,
                    custom_field: field.id
                };
                // Map based on type
                if (field.field_type === 'TEXT' || field.field_type === 'CHOICE') payload.value_text = val.toString();
                if (field.field_type === 'NUMBER') payload.value_number = parseFloat(val);
                if (field.field_type === 'DATE') payload.value_date = val;
                if (field.field_type === 'USER') payload.value_user = val;

                valuePromises.push(axios.post('/api/pm/task-custom-field-values/', payload));
            }
        }
        if (valuePromises.length > 0) {
            await Promise.all(valuePromises);
        }

        await fetchTasks();
        isSuccess.value = true;
        setTimeout(() => {
            isSuccess.value = false;
            showCreateModal.value = false;
        }, 1000);
    } catch (error) {
        console.error("Failed to create task", error);
        alert(t('common.error_occurred') || 'An error occurred while creating the task.');
    } finally { loadingSave.value = false; }
};

const getFieldIconClass = (field_type) => {
    switch (field_type) {
        case 'TEXT': return 'fa-solid fa-font';
        case 'NUMBER': return 'fa-solid fa-hashtag';
        case 'DATE': return 'fa-solid fa-calendar-day';
        case 'USER': return 'fa-solid fa-user-tag';
        case 'CHOICE': return 'fa-solid fa-list-ul';
        default: return 'fa-solid fa-plus-square';
    }
};

// Computed ref to the task currently being assigned
const currentAssigningTask = computed(() => {
  if (!assigningTaskId.value) return null;
  for (const colTasks of Object.values(groupedTasks.value)) {
    const found = colTasks.find(t => t.id === assigningTaskId.value);
    if (found) return found;
  }
  return null;
});

</script>

<template>
  <div class="kanban-board" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">

    <!-- Task Complete Celebration Overlay -->
    <CelebrationOverlay
      :show="showCelebration"
      :label="$t('kanban.task_done')"
      @done="showCelebration = false"
    />

    <div class="board-controls-premium">
        <div class="controls-left-v">
            <button class="btn-back-premium" @click="goBack">
                <i class="fa-solid fa-chevron-left"></i>
                <span>{{ $t('common.back') }}</span>
            </button>
            
            <button v-if="canCreateTask" class="btn-create-premium" @click="openCreateModal">
                <i class="fa-solid fa-plus"></i>
                <span>{{ $t('kanban.create_task') }}</span>
            </button>
            
            <div class="quick-filters-v">
                <button class="q-filter-pill" :class="{ 'active': quickFilters.myIssues }" @click="toggleMyIssues">
                    <i class="fa-solid fa-user-check"></i>
                    <span>{{ $t('kanban.only_my_issues') }}</span>
                </button>
                <button class="q-filter-pill" :class="{ 'active': quickFilters.highPriority }" @click="toggleHighPriority">
                    <i class="fa-solid fa-fire-flame-curved"></i>
                    <span>{{ $t('kanban.high_priority') }}</span>
                </button>
                <button v-if="isAdmin" class="q-filter-pill" :class="{ 'active': showAllColumns }" @click="showAllColumns = !showAllColumns">
                    <i :class="showAllColumns ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
                    <span>{{ showAllColumns ? $t('kanban.compact_view') : $t('kanban.show_all_columns') }}</span>
                </button>
            </div>
        </div>
        
        <div class="controls-right-v filters-glance">
            <!-- Search -->
            <div class="search-pod">
                <i class="fa-solid fa-magnifying-glass search-icon-v"></i>
                <input 
                    v-model="filters.search" 
                    @input="debounceFetch" 
                    type="text" 
                    :placeholder="$t('kanban.search_placeholder')" 
                    class="search-input-v"
                />
            </div>

            <!-- Epic Filter Custom Dropdown -->
            <div class="custom-dropdown-wrapper" tabindex="0" @blur="epicFilterOpen = false">
                <div class="filter-select" :class="{ 'is-open': epicFilterOpen }" @click="epicFilterOpen = !epicFilterOpen">
                    <span class="dropdown-label">{{ filters.epic ? epics.find(e => e.id === filters.epic)?.name || $t('kanban.all_epics') : $t('kanban.all_epics') }}</span>
                    <i class="fa-solid fa-chevron-down dropdown-chevron"></i>
                </div>
                <transition name="dropdown-fade">
                    <div class="custom-dropdown-menu" v-if="epicFilterOpen">
                        <div class="dropdown-item" @click="filters.epic = null; fetchTasks(); epicFilterOpen = false" :class="{ 'active': filters.epic === null }">
                            <i class="fa-solid fa-layer-group"></i>
                            <span>{{ $t('kanban.all_epics') }}</span>
                        </div>
                        <div class="dropdown-item" v-for="epic in epics" :key="epic.id" @click="filters.epic = epic.id; fetchTasks(); epicFilterOpen = false" :class="{ 'active': filters.epic === epic.id }">
                            <i class="fa-solid fa-bookmark"></i>
                            <span>{{ epic.name }}</span>
                        </div>
                    </div>
                </transition>
            </div>

            <!-- Assignee Filter Custom Dropdown -->
            <div class="custom-dropdown-wrapper" tabindex="0" @blur="assigneeFilterOpen = false">
                <div class="filter-select" :class="{ 'is-open': assigneeFilterOpen }" @click="assigneeFilterOpen = !assigneeFilterOpen">
                    <span class="dropdown-label">
                        {{ 
                            filters.assignee === null ? $t('kanban.all_assignees') : 
                            (filters.assignee === 'unassigned' ? $t('kanban.unassigned') : 
                            projectUsers.find(u => u.id === filters.assignee)?.username || $t('kanban.all_assignees')) 
                        }}
                    </span>
                    <i class="fa-solid fa-chevron-down dropdown-chevron"></i>
                </div>
                <transition name="dropdown-fade">
                    <div class="custom-dropdown-menu" v-if="assigneeFilterOpen">
                        <div class="dropdown-item" @click="filters.assignee = null; fetchTasks(); assigneeFilterOpen = false" :class="{ 'active': filters.assignee === null }">
                            <i class="fa-solid fa-users"></i>
                            <span>{{ $t('kanban.all_assignees') }}</span>
                        </div>
                        <div class="dropdown-item" @click="filters.assignee = 'unassigned'; fetchTasks(); assigneeFilterOpen = false" :class="{ 'active': filters.assignee === 'unassigned' }">
                            <i class="fa-solid fa-user-slash"></i>
                            <span>{{ $t('kanban.unassigned') }}</span>
                        </div>
                        <div class="dropdown-item" v-for="user in projectUsers" :key="user.id" @click="filters.assignee = user.id; fetchTasks(); assigneeFilterOpen = false" :class="{ 'active': filters.assignee === user.id }">
                            <div class="mini-avatar">{{ user.username[0].toUpperCase() }}</div>
                            <span>{{ user.username }}</span>
                        </div>
                    </div>
                </transition>
            </div>

            <!-- Priority Filter Custom Dropdown -->
            <div class="custom-dropdown-wrapper" tabindex="0" @blur="priorityFilterOpen = false">
                <div class="filter-select" :class="{ 'is-open': priorityFilterOpen }" @click="priorityFilterOpen = !priorityFilterOpen">
                    <span class="dropdown-label">
                        {{ 
                            filters.priority === null ? $t('kanban.all_priorities') : 
                            (filters.priority === 'HIGH' ? $t('kanban.priorities.high') : 
                            (filters.priority === 'MEDIUM' ? $t('kanban.priorities.medium') : 
                            (filters.priority === 'LOW' ? $t('kanban.priorities.low') : filters.priority))) 
                        }}
                    </span>
                    <i class="fa-solid fa-chevron-down dropdown-chevron"></i>
                </div>
                <transition name="dropdown-fade">
                    <div class="custom-dropdown-menu" v-if="priorityFilterOpen">
                        <div class="dropdown-item" @click="filters.priority = null; fetchTasks(); priorityFilterOpen = false" :class="{ 'active': filters.priority === null }">
                            <i class="fa-solid fa-flag"></i>
                            <span>{{ $t('kanban.all_priorities') }}</span>
                        </div>
                        <div class="dropdown-item" @click="filters.priority = 'HIGH'; fetchTasks(); priorityFilterOpen = false" :class="{ 'active': filters.priority === 'HIGH' }">
                            <i class="fa-solid fa-circle-exclamation text-red-500"></i>
                            <span>{{ $t('kanban.priorities.high') }}</span>
                        </div>
                        <div class="dropdown-item" @click="filters.priority = 'MEDIUM'; fetchTasks(); priorityFilterOpen = false" :class="{ 'active': filters.priority === 'MEDIUM' }">
                            <i class="fa-solid fa-circle-exclamation text-yellow-500"></i>
                            <span>{{ $t('kanban.priorities.medium') }}</span>
                        </div>
                        <div class="dropdown-item" @click="filters.priority = 'LOW'; fetchTasks(); priorityFilterOpen = false" :class="{ 'active': filters.priority === 'LOW' }">
                            <i class="fa-solid fa-circle-exclamation text-blue-500"></i>
                            <span>{{ $t('kanban.priorities.low') }}</span>
                        </div>
                    </div>
                </transition>
            </div>
        </div>
    </div>
    <div v-if="loading" class="loading lottie-loading">
        <StateLoader :label="$t('kanban.loading')" />
    </div>
    <div v-else class="board-layout">
      <div class="board-columns">
        <div v-if="tasks.length === 0 && !loading" class="no-sprint-message lottie-empty-state">
            <StateEmpty />
            <h3>{{ $t('kanban.no_active_sprint') }}</h3>
            <p>{{ $t('kanban.no_sprint_desc') }}</p>
            <button class="btn-primary" @click="router.push(`/projects/${projectId}/backlog`)">{{ $t('kanban.go_to_backlog') }}</button>
        </div>
        <div v-else v-for="col in visibleColumns" :key="col.id" class="kanban-column-premium" :class="{ 'wip-limit-reached': ['IN_PROGRESS','PENDING','IN_REVIEW'].includes(col.category) && groupedTasks[col.id].length > 5 }">
        <div class="column-header-v" :style="{ '--col-color': col.color }">
            <div class="h-main">
              <div class="status-indicator"></div>
              <h3 class="col-title">{{ col.title }}</h3>
            </div>
            <div class="count-pod" :class="{ 'urgent': ['IN_PROGRESS','PENDING','IN_REVIEW'].includes(col.category) && groupedTasks[col.id].length > 5 }">
                {{ groupedTasks[col.id].length }}
            </div>
        </div>
        
        <draggable
            v-model="groupedTasks[col.id]"
            :group="userRole === 'VIEWER' ? { name: 'tasks', put: false, pull: false } : 'tasks'"
            item-key="id"
            @change="(e) => onDragChange(e, col.id)"
            class="drag-area"
            :animation="200"
            ghost-class="ghost-card"
            handle=".drag-handle-v"
            :force-fallback="true"
            :fallback-tolerance="1"
            chosen-class="chosen-card"
            drag-class="dragging-card"
            :delay="0"
            :disabled="userRole === 'VIEWER'"
        >
            <template #item="{ element }">
              <div class="task-wrapper">
                <TaskCard 
                  :task="element" 
                  :is-admin="isAdmin"
                  :user-role="userRole" 
                  @click="openEditModal(element)" 
                  @view-error="$emit('view-error', $event)"
                />
                <!-- Admin: Show assign button on To Do category tasks -->
                <div v-if="isAdmin && col.category === 'TO_DO'" class="assign-actions">
                  <!-- Assign button only -->
                  <button class="btn-assign" @click.stop="toggleAssignDropdown(element.id)">
                    <i class="fa-solid fa-user-plus"></i> {{ $t('kanban.assign') }}
                  </button>
                </div>
              </div>
            </template>
        </draggable>
        </div>
      </div>
    </div>

    <!-- Teleported Assign Modal: always renders at body level, never inside task card -->
    <Teleport to="body">
      <transition name="assignee-modal">
        <div v-if="assigningTaskId" class="assignee-overlay-global" @click.self="assigningTaskId = null">
          <div class="assignee-modal-global">
            <!-- Header -->
            <div class="am-header">
              <div class="am-title">
                <i class="fa-solid fa-user-plus"></i>
                <span>{{ $t('kanban.assign_to') }}</span>
              </div>
              <button class="am-close" @click="assigningTaskId = null">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <!-- Search -->
            <div class="am-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input
                v-model="assigneeSearch"
                :placeholder="$t('common.search_members')"
                autofocus
              />
            </div>
            <!-- Member List -->
            <div class="am-list">
              <div
                class="am-item"
                :class="{ 'am-item--selected': !currentAssigningTask?.assigned_to }"
                @click="confirmAssign(assigningTaskId, null)"
              >
                <div class="am-avatar am-avatar--empty">
                  <i class="fa-solid fa-user-slash"></i>
                </div>
                <div class="am-info">
                  <span class="am-name">{{ $t('common.unassigned') }}</span>
                  <span class="am-role">{{ $t('kanban.no_assignee') }}</span>
                </div>
                <i v-if="!currentAssigningTask?.assigned_to" class="fa-solid fa-check am-check"></i>
              </div>
              <div
                v-for="user in filteredProjectUsers"
                :key="user.id"
                class="am-item"
                :class="{ 'am-item--selected': currentAssigningTask?.assigned_to === user.id }"
                @click="confirmAssign(assigningTaskId, user.id)"
              >
                <div class="am-avatar">{{ user.username[0].toUpperCase() }}</div>
                <div class="am-info">
                  <span class="am-name">{{ user.username }}</span>
                  <span class="am-role">{{ user.email || $t('projects.members') }}</span>
                </div>
                <i v-if="currentAssigningTask?.assigned_to === user.id" class="fa-solid fa-check am-check"></i>
              </div>
              <div v-if="filteredProjectUsers.length === 0 && assigneeSearch" class="am-empty">
                <i class="fa-solid fa-magnifying-glass"></i>
                <span>{{ $t('common.no_results') }}</span>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Task Detail Modal -->
    <TaskDetailModal 
        :is-open="showDetailModal"
        :task="selectedTask"
        :user-role="userRole"
        @close="showDetailModal = false"
        @update-task="handleTaskUpdate"
    />
    <!-- Time Spent Modal -->
    <!-- Time Spent Modal -->
    <div v-if="showTimeModal" class="elite-modal-backdrop" @click.self="cancelTimeEntry">
        <div class="elite-modal-window compact">
            <div class="modal-header-elite primary">
                <div class="modal-icon-orb"><i class="fa-solid fa-clock"></i></div>
                <h3>{{ $t('kanban.time_spent') }}</h3>
            </div>
            <div class="modal-body-elite">
                <div class="elite-input-group">
                    <label><i class="fa-solid fa-stopwatch"></i> {{ $t('kanban.enter_time') }} ({{ $t('kanban.hours') || 'hours' }})</label>
                    <div class="elite-input-with-suffix">
                        <input type="number" v-model="timeSpent" class="elite-input-field" step="0.5" autofocus />
                        <span class="elite-suffix">{{ $t('kanban.hours') }}</span>
                    </div>
                    <p class="elite-hint">{{ $t('kanban.time_hint') || 'Enter total hours spent on this task' }}</p>
                </div>
            </div>
            <div class="modal-footer-elite">
                <button @click="cancelTimeEntry" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
                <button @click="handleTimeSubmit" class="btn-elite-solid primary">{{ $t('kanban.confirm') }}</button>
            </div>
        </div>
    </div>
  </div>

    <!-- Create Task Modal -->
    <div v-if="showCreateModal" class="elite-modal-backdrop" @click.self="showCreateModal = false">
        <div class="elite-modal-window large">
             <div class="modal-header-elite success">
                 <div class="modal-icon-orb"><i class="fa-solid fa-plus-circle"></i></div>
                <h3>{{ $t('kanban.new_task') }}</h3>
            </div>
            
            <div class="modal-body-elite scrollable custom-scrollbar">
                <!-- Single Column for Title -->
                <div class="elite-input-group">
                    <label><i class="fa-solid fa-heading"></i> {{ $t('kanban.title') }} *</label>
                    <input v-model="newTask.title" type="text" class="elite-input-field" :placeholder="$t('kanban.title') + '...'" auto-focus />
                </div>

                <!-- Single Column for Description -->
                <div class="elite-input-group">
                    <label><i class="fa-solid fa-align-left"></i> {{ $t('kanban.description') }}</label>
                    <textarea v-model="newTask.description" class="elite-input-field-multi" rows="4" :placeholder="$t('kanban.description') + '...'"></textarea>
                </div>

                <!-- Grid for Priority and Metadata -->
                <div class="elite-grid-2">
                    <div class="elite-input-group">
                        <label><i class="fa-solid fa-signal"></i> {{ $t('kanban.priority') }}</label>
                         <select v-model="newTask.priority" class="elite-select-field">
                            <option value="LOW">{{ $t('kanban.priorities.low') }}</option>
                            <option value="MEDIUM">{{ $t('kanban.priorities.medium') }}</option>
                            <option value="HIGH">{{ $t('kanban.priorities.high') }}</option>
                            <option value="CRITICAL">{{ $t('kanban.priorities.critical') }}</option>
                        </select>
                    </div>

                    <div class="elite-input-group">
                        <label><i class="fa-solid fa-tag"></i> {{ $t('kanban.issue_type') }}</label>
                        <select class="elite-select-field" disabled>
                            <option value="TASK" selected>{{ $t('kanban.issue_types.task') }}</option>
                        </select>
                    </div>
                </div>

                <div class="elite-grid-2">
                    <div class="elite-input-group">
                        <label><i class="fa-solid fa-code-branch"></i> {{ $t('releases.fix_versions') || 'Fix Version' }}</label>
                        <select v-model="newTask.version" class="elite-select-field">
                            <option value="">{{ $t('common.none') }}</option>
                            <option v-for="v in versions" :key="v.id" :value="v.id">{{ v.name }}</option>
                        </select>
                    </div>
                </div>
                
                <!-- Dynamic Custom Fields Section -->
                <div v-if="customFields.length > 0" class="custom-fields-elite-divider">
                    <span>{{ $t('projects.custom_fields') || 'Custom Fields' }}</span>
                </div>

                <div class="elite-grid-2">
                    <div v-for="field in customFields" :key="field.id" class="elite-input-group">
                        <label>
                            <i :class="getFieldIconClass(field.field_type)"></i> 
                            {{ field.name }} {{ field.required ? '*' : '' }}
                        </label>

                        <!-- Choice Field -->
                        <select v-if="field.field_type === 'CHOICE'" v-model="newTask.custom_fields[field.id]" class="elite-select-field">
                            <option value="">{{ $t('common.select') || 'Select' }}...</option>
                            <option v-for="opt in field.options" :key="opt.id" :value="opt.value">{{ opt.value }}</option>
                        </select>

                        <!-- Date Field -->
                        <input v-else-if="field.field_type === 'DATE'" v-model="newTask.custom_fields[field.id]" type="datetime-local" class="elite-input-field" />

                        <!-- Number Field -->
                        <input v-else-if="field.field_type === 'NUMBER'" v-model="newTask.custom_fields[field.id]" type="number" class="elite-input-field" :placeholder="field.name + '...'" />

                        <!-- User Field (Basic select for now, ideally an autocomplete) -->
                        <select v-else-if="field.field_type === 'USER'" v-model="newTask.custom_fields[field.id]" class="elite-select-field">
                             <option value="">{{ $t('common.select_user') || 'Select User' }}...</option>
                             <option v-for="user in projectUsers" :key="user.id" :value="user.id">{{ user.username }}</option>
                        </select>

                        <!-- Text Field (Default) -->
                        <input v-else v-model="newTask.custom_fields[field.id]" type="text" class="elite-input-field" :placeholder="field.name + '...'" />
                    </div>
                </div>

                <!-- Grid for Dates -->
                <div class="elite-grid-2">
                    <div class="elite-input-group">
                        <label><i class="fa-solid fa-calendar-plus"></i> {{ $t('kanban.start_date') }}</label>
                        <input v-model="newTask.start_date" type="datetime-local" class="elite-input-field" />
                    </div>
                    <div class="elite-input-group">
                        <label><i class="fa-solid fa-calendar-check"></i> {{ $t('kanban.end_date') }}</label>
                        <input v-model="newTask.end_date" type="datetime-local" class="elite-input-field" />
                    </div>
                </div>
            </div>

            <div class="modal-footer-elite">
                <button v-if="!isSuccess" @click="showCreateModal = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
                <button v-if="!isSuccess" @click="createTask" class="btn-elite-solid success" :disabled="loadingSave">
                    <span v-if="loadingSave" class="spinner-tiny"></span>
                    {{ loadingSave ? '...' : $t('projects.create') }}
                </button>
                <div v-if="isSuccess" class="success-indicator-orb animate-pop">
                    <i class="fa-solid fa-check"></i> {{ $t('common.saved') }}
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.kanban-board {
  display: flex;
  flex-direction: column;
  padding: 30px 40px;
  background-color: transparent; 
  min-height: calc(100vh - 80px);
}

/* --- Board Controls --- */
.board-controls-premium {
    padding: 0 0 35px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 25px;
}

.controls-left-v, .controls-right-v {
    display: flex;
    gap: 15px;
    align-items: center;
}

/* --- Search Pod --- */
.search-pod {
    position: relative;
    display: flex;
    align-items: center;
}
.search-icon-v {
    position: absolute;
    left: 18px;
    color: var(--text-muted);
    font-size: 0.9rem;
    pointer-events: none;
    transition: color 0.3s;
}
.search-input-v {
    padding: 12px 20px 12px 45px;
    border: 1px solid var(--border-color);
    border-radius: 18px;
    font-size: 0.95rem;
    font-weight: 700;
    width: 250px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--bg-hover);
    color: var(--text-main);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}
.search-input-v:focus {
    outline: none;
    border-color: var(--primary);
    background: var(--bg-card);
    width: 380px;
    box-shadow: 0 0 20px var(--primary-glow);
}
.search-input-v:focus + .search-icon-v { color: var(--primary); }

/* --- Buttons --- */
.btn-back-premium {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 20px; border-radius: 18px;
    background: var(--bg-card); color: var(--text-main);
    border: 1px solid var(--border-color); font-weight: 850;
    transition: 0.3s; cursor: pointer;
}
.btn-back-premium:hover { transform: translateX(-5px); border-color: var(--primary); background: var(--bg-hover); }

.btn-create-premium {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 24px; border-radius: 18px;
    background: linear-gradient(135deg, var(--primary), var(--indigo-600));
    color: white; border: none; font-weight: 850;
    transition: 0.3s; cursor: pointer;
    box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
}
.btn-create-premium:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.4); }

.quick-filters-v { display: flex; gap: 10px; padding: 0 15px; border-left: 2px solid var(--border-color); }
.q-filter-pill {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 18px; border-radius: 100px;
    background: var(--bg-hover); color: var(--text-muted);
    border: 1px solid transparent; font-weight: 800; font-size: 0.85rem;
    transition: 0.3s; cursor: pointer;
}
.q-filter-pill:hover { background: var(--bg-card); border-color: var(--border-color); color: var(--text-main); }
.q-filter-pill.active { background: var(--primary-bg); color: var(--primary); border-color: var(--primary-glow); }

/* --- Board Columns --- */
.board-columns {
    display: flex;
    gap: 2rem;
    overflow-x: auto;
    padding: 10px 0 20px;
    min-width: 0;
    align-items: flex-start;
    scrollbar-width: thin;
    scrollbar-color: var(--primary-glow) transparent;
}

.kanban-column-premium {
  background: color-mix(in srgb, var(--bg-card), transparent 40%);
  backdrop-filter: blur(10px);
  width: 340px;
  flex: 0 0 340px;
  padding: 20px;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  border: 1px solid var(--border-color);
  min-height: 400px;
  animation: colEntry 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.board-columns > div:nth-child(1) { animation-delay: 0.05s; }
.board-columns > div:nth-child(2) { animation-delay: 0.1s; }
.board-columns > div:nth-child(3) { animation-delay: 0.15s; }
.board-columns > div:nth-child(4) { animation-delay: 0.2s; }
.board-columns > div:nth-child(5) { animation-delay: 0.25s; }

@keyframes colEntry {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.kanban-column-premium:hover { border-color: var(--primary-glow); background: color-mix(in srgb, var(--bg-card), transparent 20%); }

.column-header-v {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
}
.h-main { display: flex; align-items: center; gap: 12px; }
.status-indicator { width: 10px; height: 10px; border-radius: 50%; background: var(--col-color); box-shadow: 0 0 10px var(--col-color); }
.col-title { margin: 0; font-size: 0.85rem; font-weight: 950; color: var(--text-main); text-transform: uppercase; letter-spacing: 1px; }

.count-pod {
    background: var(--bg-hover); padding: 4px 12px; border-radius: 12px;
    font-size: 0.8rem; color: var(--text-muted); font-weight: 950;
    border: 1px solid var(--border-color);
}
.count-pod.urgent { background: var(--ds-red); color: white; border-color: var(--ds-red); animation: pulse-red 2s infinite; }

@keyframes pulse-red {
  0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(244, 63, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
}

.drag-area { min-height: 250px; flex-grow: 1; display: flex; flex-direction: column; gap: 15px; }

/* Compact Mode */
.board-columns.compact-mode .kanban-column-premium {
    width: 280px;
    flex: 0 0 280px;
    padding: 15px;
}
.board-columns.compact-mode :deep(.task-card-premium) {
    padding: 12px 15px;
    gap: 8px;
}
.board-columns.compact-mode :deep(.task-title-v) {
    font-size: 0.9rem;
}
.board-columns.compact-mode :deep(.task-footer-v) {
    padding-top: 10px;
}

.ghost-card { opacity: 0.2; transform: scale(0.95); border: 2px dashed var(--primary) !important; background: var(--primary-bg) !important; }
.chosen-card { transform: scale(1.05) rotate(1deg); z-index: 100; box-shadow: var(--shadow-2xl) !important; }

/* Custom Dropdowns */
.custom-dropdown-wrapper { position: relative; outline: none; }
.filter-select {
    display: flex; align-items: center; gap: 10px; padding: 10px 18px;
    background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px;
    cursor: pointer; transition: 0.3s; color: var(--text-main); font-weight: 850; font-size: 0.85rem;
}
.filter-select:hover { background: var(--bg-hover); transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--primary); }
.filter-select.is-open { border-color: var(--primary); box-shadow: 0 0 15px var(--primary-glow); }

.dropdown-label { white-space: nowrap; }
.dropdown-chevron { font-size: 10px; color: var(--text-muted); transition: 0.3s; }
.filter-select.is-open .dropdown-chevron { transform: rotate(180deg); color: var(--primary); }

.custom-dropdown-menu {
    position: absolute; top: calc(100% + 10px); right: 0; min-width: 220px;
    background: color-mix(in srgb, var(--bg-card), transparent 10%);
    backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px; box-shadow: var(--shadow-2xl); z-index: 1000;
    padding: 10px; display: flex; flex-direction: column; gap: 5px;
    animation: dropFade 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 15px;
    border-radius: 12px; cursor: pointer; transition: 0.2s; color: var(--text-muted);
    font-weight: 750; font-size: 0.85rem;
}
.dropdown-item i { width: 16px; text-align: center; font-size: 0.9rem; opacity: 0.7; }
.dropdown-item:hover { background: var(--bg-hover); color: var(--text-main); transform: translateX(5px); }
.dropdown-item.active { background: var(--primary-bg); color: var(--primary); }

.mini-avatar { 
    width: 24px; height: 24px; border-radius: 6px; 
    background: linear-gradient(135deg, var(--primary), var(--indigo-600));
    color: white; font-size: 0.75rem; font-weight: 900; 
    display: flex; align-items: center; justify-content: center;
}

@keyframes dropFade { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

/* RTL Support */
[dir="rtl"] .custom-dropdown-menu { right: auto; left: 0; }
[dir="rtl"] .dropdown-item:hover { transform: translateX(-5px); }
[dir="rtl"] .search-icon-v { left: auto; right: 18px; }
[dir="rtl"] .search-input-v { padding: 12px 45px 12px 20px; }
[dir="rtl"] .btn-back-premium i { transform: rotate(180deg); }
[dir="rtl"] .quick-filters-v { border-left: none; border-right: 2px solid var(--border-color); }

/* Task Wrapper */
.task-wrapper {
  position: relative;
  margin-bottom: 5px;
}

/* Assign Button */
.assign-actions {
  position: relative;
  margin-top: 6px;
}

.btn-assign {
  width: 100%;
  padding: 8px 12px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 850;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
}

.btn-assign:hover {
  transform: translateY(-2px);
  background: var(--primary-hover);
  box-shadow: 0 5px 15px var(--primary-glow);
}

/* Assign Modal Overlay */
.assignee-selection-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(9, 30, 66, 0.4); backdrop-filter: blur(4px);
    z-index: 2000; display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.15s ease-out;
}

/* ── transition for assignee modal ─── */
.assignee-modal-enter-active { animation: am-enter 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }
.assignee-modal-leave-active { animation: am-enter 0.18s ease reverse both; }
@keyframes am-enter {
  from { opacity:0; transform: scale(0.88) translateY(20px); }
  to   { opacity:1; transform: scale(1)    translateY(0);    }
}

/* ── Global assignee overlay (teleported to body) ─── */
.assignee-overlay-global {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px); z-index: 12000;
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.3s ease;
}

.assignee-modal-global {
  background: color-mix(in srgb, var(--bg-card), transparent 15%);
  backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
  width: 350px; max-width: 90vw; max-height: 80vh; border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.1); 
  box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden; 
  display: flex; flex-direction: column;
}

.am-header { 
    padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; 
    border-bottom: 1px solid var(--border-color);
}
.am-title { display: flex; align-items: center; gap: 10px; font-weight: 950; font-size: 0.95rem; color: var(--text-main); }
.am-title i { color: var(--primary); font-size: 1.1rem; filter: drop-shadow(0 0 5px var(--primary-glow)); }
.am-close { 
    background: var(--bg-hover); border: 1px solid var(--border-color); color: var(--text-muted); padding: 6px; border-radius: 10px; cursor: pointer; transition: 0.2s; 
}
.am-close:hover { background: var(--ds-red); color: white; border-color: var(--ds-red); transform: rotate(90deg); }

.am-search { padding: 10px 20px; position: relative; }
.am-search i { position: absolute; left: 35px; top: 50%; transform: translateY(-50%); color: var(--text-muted); opacity: 0.6; pointer-events: none; }
.am-search input {
    width: 100%; padding: 8px 15px 8px 35px; border-radius: 12px;
    background: var(--bg-hover); border: 1px solid var(--border-color); color: var(--text-main);
    font-weight: 800; font-size: 0.8rem; transition: 0.3s;
}
.am-search input:focus { outline: none; border-color: var(--primary); background: var(--bg-card); box-shadow: 0 0 20px var(--primary-glow); }

.am-list { padding: 10px 15px 25px; overflow-y: auto; flex-grow: 1; display: flex; flex-direction: column; gap: 8px; }
.am-list::-webkit-scrollbar { width: 6px; }
.am-list::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }

.am-item {
    display: flex; align-items: center; gap: 12px; padding: 8px 15px; border-radius: 16px; transition: 0.2s; cursor: pointer; border: 1px solid transparent;
}
.am-item:hover { background: var(--bg-hover); border-color: var(--border-color); transform: translateX(5px); }
.am-item--selected { background: var(--primary-bg); border-color: var(--primary-glow); }

.am-avatar {
    width: 40px; height: 40px; border-radius: 12px;
    background: linear-gradient(135deg, var(--primary), var(--indigo-800));
    color: white; font-weight: 950; font-size: 0.9rem; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}
.am-avatar--empty { background: var(--bg-hover); color: var(--text-muted); border: 1px dashed var(--border-color); box-shadow: none; }

.am-info { flex-grow: 1; display: flex; flex-direction: column; gap: 3px; }
.am-name { font-weight: 900; font-size: 1rem; color: var(--text-main); }
.am-role { font-size: 0.75rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; }

.am-check { color: var(--primary); font-size: 1.1rem; filter: drop-shadow(0 0 5px var(--primary-glow)); }
.am-empty { padding: 60px 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; color: var(--text-muted); }
.am-empty i { font-size: 2rem; opacity: 0.2; }

/* RTL support for Assign Modal */
[dir="rtl"] .am-search i { left: auto; right: 35px; }
[dir="rtl"] .am-search input { padding: 8px 35px 8px 15px; }
[dir="rtl"] .am-item:hover { transform: translateX(-5px); }

/* =========================================
   MODAL ELITE SYSTEM
   ========================================= */
.elite-modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000; animation: fadeIn 0.3s ease;
}

.elite-modal-window {
    background: var(--bg-card); border-radius: 28px;
    width: 100%; border: 1px solid var(--border-color);
    box-shadow: var(--shadow-2xl); overflow: hidden;
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.elite-modal-window.large { max-width: 650px; }
.elite-modal-window.compact { max-width: 450px; }

.modal-header-elite {
    padding: 24px 30px; display: flex; align-items: center; gap: 15px;
    border-bottom: 1px solid var(--border-color);
}
.modal-header-elite h3 { margin: 0; font-size: 1.2rem; font-weight: 900; color: var(--text-main); }

.modal-icon-orb {
    width: 40px; height: 40px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.2rem;
}
.modal-header-elite.success .modal-icon-orb { background: var(--success-bg); color: var(--ds-green); }
.modal-header-elite.primary .modal-icon-orb { background: var(--primary-bg); color: var(--primary); }

.modal-body-elite { padding: 30px; max-height: 70vh; overflow-y: auto; }

.elite-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.elite-input-group { margin-bottom: 25px; }
.elite-input-group label {
    display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
    font-size: 0.85rem; font-weight: 850; color: var(--text-muted);
}
.elite-input-group label i { color: var(--primary); opacity: 0.8; }

.elite-input-field, .elite-select-field, .elite-input-field-multi {
    width: 100%; padding: 14px 18px; border-radius: 16px;
    border: 1px solid var(--border-color); background: var(--bg-hover);
    color: var(--text-main); font-weight: 700; transition: 0.3s;
}
.elite-input-field:focus, .elite-select-field:focus, .elite-input-field-multi:focus {
    border-color: var(--primary); background: var(--bg-card); box-shadow: 0 0 20px var(--primary-glow); outline: none;
}

.elite-input-with-suffix { position: relative; display: flex; align-items: center; }
.elite-suffix { position: absolute; right: 18px; font-weight: 800; font-size: 0.85rem; color: var(--text-muted); opacity: 0.6; }
[dir="rtl"] .elite-suffix { right: auto; left: 18px; }

.elite-hint { margin: 8px 0 0; font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }

.modal-footer-elite {
    padding: 20px 30px; background: var(--bg-hover);
    border-top: 1px solid var(--border-color);
    display: flex; justify-content: flex-end; gap: 15px;
}

.btn-elite-glass {
    padding: 12px 24px; border-radius: 14px; background: var(--bg-card);
    border: 1px solid var(--border-color); color: var(--text-muted);
    font-weight: 850; cursor: pointer; transition: 0.25s;
}
.btn-elite-glass:hover { background: var(--bg-hover); border-color: var(--primary); color: var(--text-main); }

.btn-elite-solid {
    padding: 12px 24px; border-radius: 14px; border: none;
    color: white; font-weight: 850; cursor: pointer; transition: 0.25s;
}
.btn-elite-solid.success { background: linear-gradient(135deg, var(--ds-green), #059669); box-shadow: 0 5px 15px rgba(16, 185, 129, 0.3); }
.btn-elite-solid.primary { background: linear-gradient(135deg, var(--primary), var(--indigo-800)); box-shadow: 0 5px 15px var(--primary-glow); }

.spinner-tiny { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
.animate-pop { animation: popIndicator 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes popIndicator { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }

@media (max-width: 680px) {
    .elite-grid-2 { grid-template-columns: 1fr; gap: 10px; }
}

/* Empty State Premium Styling */
.no-sprint-message {
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
    animation: fadeIn 0.8s ease-out;
}

.no-sprint-message h3 {
    font-size: 2.8rem;
    font-weight: 950;
    color: var(--text-main);
    margin: 24px 0 16px;
    letter-spacing: -0.04em;
}

.no-sprint-message p {
    font-size: 1.3rem;
    color: var(--text-muted);
    max-width: 500px;
    margin-bottom: 40px;
    line-height: 1.5;
    font-weight: 600;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--indigo-600));
  color: white; border: none; padding: 14px 28px; border-radius: 16px;
  font-weight: 900; cursor: pointer; transition: 0.3s;
}
.btn-primary:hover { transform: translateY(-3px); box-shadow: 0 10px 20px var(--primary-glow); }

.btn-secondary {
  background: var(--bg-card); color: var(--text-muted);
  border: 1px solid var(--border-color); padding: 14px 28px; border-radius: 16px;
  font-weight: 900; cursor: pointer; transition: 0.3s;
}
.btn-secondary:hover { background: var(--bg-hover); color: var(--text-main); border-color: var(--primary); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

/* Member List (Assignee Modal) is styled above in .am-* classes */
.custom-fields-elite-divider {
    display: flex; align-items: center; gap: 15px; margin: 30px 0 20px;
}
.custom-fields-elite-divider::before, .custom-fields-elite-divider::after {
    content: ''; flex: 1; height: 1px; background: var(--border-color); opacity: 0.5;
}
.custom-fields-elite-divider span {
    font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: var(--primary);
}
</style>

