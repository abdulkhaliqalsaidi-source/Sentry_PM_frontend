<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/plugins/axios';
import draggable from 'vuedraggable';
import TaskRow from '../components/TaskRow.vue';
import TaskDetailModal from '../components/TaskDetailModal.vue';
import AnimatedIcon from '../components/AnimatedIcon.vue';
import { usePermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { canCreateTask, canViewReports, canViewMembers, canViewSettings, isSuperuser, canManageSprints, canManageEpics } = usePermissions();
const { showToast } = useToast();
const projectId = route.params.projectId;

const plannedSprints = computed(() => {
    return allSprints.value.filter(s => s.status === 'PLANNED' && s.id !== sprintToComplete.value?.id);
});

const emits = defineEmits(['view-error']);

const allSprints = ref([]);
const showCompletedSprints = ref(false);
const sprints = computed(() => {
    return allSprints.value.filter(s => s.status !== 'COMPLETED' || showCompletedSprints.value);
});
const backlogTasks = ref([]);
const sprintsTasks = ref({});
const projectStatuses = ref([]);
const projectDetails = ref(null);
const versions = ref([]);
const loading = ref(true);

const API_BASE = '/api/pm';

const epics = ref([]);
const activeEpicFilter = ref(null);
const newEpicName = ref('');
const showEpicInput = ref(false);

const showDeleteConfirm = ref(false);
const sprintToDelete = ref(null);

const selectedTask = ref(null);
const isModalOpen = ref(false);

// Task Creation Modals
const showCreateModal = ref(false);
const isSuccess = ref(false);
const loadingSave = ref(false);

const openTaskModal = (task) => {
    selectedTask.value = task;
    isModalOpen.value = true;
};

const handleTaskUpdatedInModal = async () => {
    await fetchData(); 
    if (selectedTask.value) {
        try {
            const res = await axios.get(`${API_BASE}/tasks/${selectedTask.value.id}/`);
            selectedTask.value = res.data;
        } catch (e) {
            console.error("Failed to refresh selected task details", e);
        }
    }
};

const userRole = ref('VIEWER');
const isAdmin = ref(false);
const isSuperUser = ref(false);

const fetchProjectRole = async () => {
    isSuperUser.value = localStorage.getItem('is_superuser') === 'true';
    try {
        const res = await axios.get(`${API_BASE}/project-roles/`, {
            params: { project: projectId }
        });
        const roles = res.data;
        if (roles.length > 0) {
            userRole.value = roles[0].role;
        } else {
            userRole.value = isSuperUser.value ? 'ADMIN' : 'VIEWER';
        }
    } catch(e) { 
        console.error("Error fetching role", e); 
        userRole.value = isSuperUser.value ? 'ADMIN' : 'VIEWER';
    }
    
    isAdmin.value = isSuperUser.value || userRole.value === 'ADMIN';
};

const canManageBacklog = computed(() => {
    return isAdmin.value || userRole.value === 'MANAGER' || userRole.value === 'MEMBER';
});

const fetchData = async () => {
    loading.value = true;
    try {
        const [projRes, sprintsRes, epicsRes, statusesRes] = await Promise.all([
            axios.get(`${API_BASE}/projects/${projectId}/`),
            axios.get(`${API_BASE}/sprints/?project=${projectId}`),
            axios.get(`${API_BASE}/epics/?project=${projectId}`),
            axios.get(`${API_BASE}/statuses/?project=${projectId}`)
        ]);

        projectDetails.value = projRes.data;
        allSprints.value = sprintsRes.data;
        epics.value = epicsRes.data;
        projectStatuses.value = statusesRes.data;

        allSprints.value.forEach(s => {
            if (!sprintsTasks.value[s.id]) sprintsTasks.value[s.id] = [];
        });

        const archived = showCompletedSprints.value;
        
        const backlogRes = await axios.get(`${API_BASE}/tasks/`, {
            params: { project: projectId, sprint: 'null', archived }
        });
        backlogTasks.value = backlogRes.data;

        for (const sprint of sprints.value) {
            const res = await axios.get(`${API_BASE}/tasks/`, {
                params: { project: projectId, sprint: sprint.id, archived }
            });
            sprintsTasks.value[sprint.id] = res.data;
        }
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const fetchVersions = async () => {
    try {
        const res = await axios.get(`${API_BASE}/versions/?project=${projectId}`);
        versions.value = res.data;
    } catch (e) { console.error(e); }
};

const createEpic = async () => {
    if (!newEpicName.value.trim()) return;
    try {
        await axios.post(`${API_BASE}/epics/`, {
            project: projectId,
            name: newEpicName.value,
            color: '#' + Math.floor(Math.random()*16777215).toString(16)
        });
        newEpicName.value = '';
        showEpicInput.value = false;
        fetchData();
    } catch (e) { console.error(e); }
};

const showDeleteEpicConfirm = ref(false);
const epicToDelete = ref(null);

const deleteEpic = (epicId) => {
    epicToDelete.value = epicId;
    showDeleteEpicConfirm.value = true;
};

const confirmDeleteEpic = async () => {
    if (!epicToDelete.value) return;
    try {
        await axios.delete(`${API_BASE}/epics/${epicToDelete.value}/`);
        showDeleteEpicConfirm.value = false;
        epicToDelete.value = null;
        fetchData();
    } catch (e) { console.error(e); }
};

const filterByEpic = (epic) => {
    activeEpicFilter.value = activeEpicFilter.value === epic?.id ? null : epic?.id;
};

const filteredBacklogTasks = computed(() => {
    if (!activeEpicFilter.value) return backlogTasks.value;
    return backlogTasks.value.filter(t => t.epic === activeEpicFilter.value);
});

const getFilteredSprintTasks = (sprintId) => {
    const tasks = sprintsTasks.value[sprintId] || [];
    if (!activeEpicFilter.value) return tasks;
    return tasks.filter(t => t.epic === activeEpicFilter.value);
};

const onDropToEpic = async (evt, epicId) => {
    if (evt.added) {
         const task = evt.added.element;
         await updateTaskEpic(task.id, epicId);
         fetchData();
    }
};

const updateTaskEpic = async (taskId, epicId) => {
    try {
        await axios.patch(`${API_BASE}/tasks/${taskId}/`, { epic: epicId });
    } catch (e) { console.error(e); }
};

onMounted(async () => {
    await fetchProjectRole();
    await fetchData();
    await fetchVersions();
    await fetchCustomFields();
    await fetchProjectUsers();
});

const showCreateSprintModal = ref(false);
const newSprintName = ref('');

const openCreateSprintModal = () => {
    newSprintName.value = `Sprint ${sprints.value.length + 1}`;
    showCreateSprintModal.value = true;
};

const createSprint = async () => {
    if (!newSprintName.value.trim()) return;
    try {
        await axios.post(`${API_BASE}/sprints/`, {
            project: projectId,
            name: newSprintName.value,
            status: 'PLANNED'
        });
        showCreateSprintModal.value = false;
        fetchData();
    } catch (e) { console.error(e); }
};

const showStartSprintModal = ref(false);
const sprintToStart = ref(null);
const sprintFormData = ref({ duration: '2', start_date: '', end_date: '' });

const openStartSprintModal = (sprint) => {
    sprintToStart.value = sprint;
    const now = new Date();
    sprintFormData.value.start_date = now.toISOString().slice(0, 16);
    const end = new Date(now.getTime() + (2 * 7 * 24 * 60 * 60 * 1000));
    sprintFormData.value.end_date = end.toISOString().slice(0, 16);
    showStartSprintModal.value = true;
};

const confirmStartSprint = async () => {
    if (!sprintToStart.value) return;
    try {
        await axios.patch(`${API_BASE}/sprints/${sprintToStart.value.id}/`, {
            start_date: sprintFormData.value.start_date,
            end_date: sprintFormData.value.end_date
        });
        await axios.post(`${API_BASE}/sprints/${sprintToStart.value.id}/start/`);
        showStartSprintModal.value = false;
        fetchData();
    } catch (e) { console.error(e); }
};

const showCompleteSprintConfirm = ref(false);
const sprintToComplete = ref(null);
const moveTasksTo = ref('backlog');

const incompleteTasksCount = computed(() => {
    if (!sprintToComplete.value) return 0;
    const tasks = sprintsTasks.value[sprintToComplete.value.id] || [];
    return tasks.filter(t => {
        const statuses = projectStatuses.value || [];
        const status = statuses.find(s => s.id === t.status);
        return status && status.category !== 'DONE';
    }).length;
});

const completeSprint = (sprint) => {
    sprintToComplete.value = sprint;
    showCompleteSprintConfirm.value = true;
};

const confirmCompleteSprint = async () => {
    if (!sprintToComplete.value) return;
    try {
        await axios.post(`${API_BASE}/sprints/${sprintToComplete.value.id}/complete/`, {
            move_to: moveTasksTo.value === 'backlog' ? null : moveTasksTo.value
        });
        await fetchData();
        showCompleteSprintConfirm.value = false;
    } catch (e) { console.error(e); }
};

const deleteSprint = (sprintId) => {
    sprintToDelete.value = sprintId;
    showDeleteConfirm.value = true;
};

const confirmDeleteSprint = async () => {
    if (!sprintToDelete.value) return;
    try {
        await axios.delete(`${API_BASE}/sprints/${sprintToDelete.value}/`);
        showDeleteConfirm.value = false;
        fetchData();
    } catch (e) { console.error(e); }
};

const newTask = ref({
    title: '',
    description: '',
    priority: 'MEDIUM',
    issue_type: 'TASK',
    start_date: '',
    end_date: '',
    version: '',
    custom_fields: {}
});

const customFields = ref([]);
const projectUsers = ref([]);

const fetchCustomFields = async () => {
    try {
        const res = await axios.get(`${API_BASE}/custom-fields/?project=${projectId}`);
        customFields.value = res.data;
    } catch (e) {
        console.error("Error fetching custom fields", e);
    }
};

const fetchProjectUsers = async () => {
    try {
        if (!projectDetails.value) return;
        const res = await axios.get(`${API_BASE}/project-users/`, {
            params: { project_name: projectDetails.value.name }
        });
        projectUsers.value = res.data;
    } catch (e) {
        console.error("Error fetching project users", e);
    }
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
            showToast(`${field.name} ${t('common.is_required') || 'is required'}`, 'error');
            return;
        }
    }

    loadingSave.value = true;
    try {
        const taskRes = await axios.post(`${API_BASE}/tasks/`, {
            project: projectId,
            title: newTask.value.title,
            description: newTask.value.description,
            status: projectStatuses.value.find(s => s.category === 'TO_DO')?.id || projectStatuses.value[0]?.id,
            priority: newTask.value.priority,
            issue_type: newTask.value.issue_type,
            start_date: newTask.value.start_date || null,
            end_date: newTask.value.end_date || null
        });

        const createdTask = taskRes.data;

        // --- Link to Version ---
        if (newTask.value.version) {
            await axios.post(`${API_BASE}/task-versions/`, {
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
                if (field.field_type === 'TEXT' || field.field_type === 'CHOICE') payload.value_text = val.toString();
                if (field.field_type === 'NUMBER') payload.value_number = parseFloat(val);
                if (field.field_type === 'DATE') payload.value_date = val;
                if (field.field_type === 'USER') payload.value_user = val;

                valuePromises.push(axios.post(`${API_BASE}/task-custom-field-values/`, payload));
            }
        }
        if (valuePromises.length > 0) {
            await Promise.all(valuePromises);
        }

        await fetchData();
        isSuccess.value = true;
        setTimeout(() => { isSuccess.value = false; showCreateModal.value = false; }, 800);
    } catch (error) { 
        console.error(error); 
        showToast(t('common.error_occurred') || 'An error occurred.', 'error');
    } finally { loadingSave.value = false; }
};

const onDragChange = async (evt, sprintId) => {
    if (evt.added) {
        const task = evt.added.element;
        await updateTaskSprint(task.id, sprintId);
    }
};

const updateTaskSprint = async (taskId, sprintId) => {
    try {
        await axios.patch(`${API_BASE}/tasks/${taskId}/`, { sprint: sprintId });
    } catch (e) { console.error(e); }
};

const goBack = () => router.push(`/projects/${projectId}`);
watch(showCompletedSprints, () => fetchData());
</script>

<template>
    <div class="backlog-universe" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">
        <aside class="floating-sidebar">
            <div class="sidebar-header-elite">
                <div class="elite-title">
                    <div class="icon-orb">
                        <AnimatedIcon name="epics" size="xs" />
                    </div>
                    <h3>{{ $t('epics.title') }}</h3>
                </div>
                <button v-if="canManageEpics || isSuperuser" class="btn-create-orb" @click="showEpicInput = !showEpicInput">
                    <AnimatedIcon name="plus" size="xs" />
                </button>
            </div>

            <div v-if="showEpicInput" class="epic-input-zone">
                <div class="glass-input-pod">
                    <input v-model="newEpicName" @keyup.enter="createEpic" :placeholder="$t('epics.name') + '...'" class="elite-input-transparent" />
                    <button class="btn-check-orb" @click="createEpic"><AnimatedIcon name="check" size="xxs" /></button>
                </div>
            </div>

            <div class="epics-scroller">
                <div class="epic-island-item" :class="{ active: activeEpicFilter === null }" @click="filterByEpic(null)">
                    <div class="epic-indicator all"></div>
                    <span class="epic-label">{{ $t('kanban.all_issues') }}</span>
                </div>
                <div v-for="epic in epics" :key="epic.id" class="epic-island-item" :class="{ active: activeEpicFilter === epic.id }" @click="filterByEpic(epic)">
                    <draggable class="epic-drop-overlay" :list="[]" group="tasks" item-key="id" @change="(e) => onDropToEpic(e, epic.id)" ghost-class="ghost-hidden" :disabled="!canManageBacklog" handle=".drag-handle-v">
                        <template #item="{ element }"><span></span></template>
                    </draggable>
                    <div class="epic-indicator" :style="{ background: epic.color }"></div>
                    <span class="epic-label">{{ epic.name }}</span>
                    <button v-if="canManageEpics || isSuperuser" class="btn-delete-epic" @click.stop="deleteEpic(epic.id)"><AnimatedIcon name="trash" size="xxs" /></button>
                </div>
            </div>
        </aside>

        <main class="main-stage">
            <header class="floating-top-bar">
                <div class="bar-left">
                    <button class="btn-back-orb" @click="goBack">
                        <i :class="$i18n.locale === 'ar' ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left'"></i>
                    </button>
                    <div class="elite-breadcrumbs">
                        <span class="crumb">{{ $t('common.projects') }}</span>
                        <i class="fa-solid fa-chevron-right sep" :style="$i18n.locale === 'ar' ? 'transform:scaleX(-1)' : ''"></i>
                        <span class="crumb">{{ projectDetails?.name }}</span>
                        <i class="fa-solid fa-chevron-right sep" :style="$i18n.locale === 'ar' ? 'transform:scaleX(-1)' : ''"></i>
                        <span class="crumb active">{{ $t('kanban.backlog') }}</span>
                    </div>
                </div>

                <div class="bar-right">
                    <div class="btn-group-glass">
                        <button class="btn-glass-action" @click="router.push(`/projects/${projectId}`)"><AnimatedIcon name="dashboard" size="xs" /></button>
                        <button v-if="canViewReports" class="btn-glass-action" @click="router.push(`/projects/${projectId}/reports`)"><AnimatedIcon name="reports" size="xs" /></button>
                        <button v-if="isAdmin || isSuperuser" class="btn-glass-action" @click="router.push(`/projects/${projectId}/members`)"><AnimatedIcon name="members" size="xs" /></button>
                    </div>
                    <button class="btn-archive-toggle" :class="{ active: showCompletedSprints }" @click="showCompletedSprints = !showCompletedSprints"><AnimatedIcon name="docs" size="xs" /></button>
                    <div class="action-orbs">
                        <button v-if="canCreateTask" class="btn-main-orb success" @click="openCreateModal"><AnimatedIcon name="plus" size="xs" /></button>
                        <button v-if="isAdmin || isSuperuser" class="btn-main-orb primary" @click="openCreateSprintModal"><AnimatedIcon name="backlog" size="xs" /></button>
                    </div>
                </div>
            </header>

            <div v-if="loading" class="loading-overlay"><div class="spinner-v"></div></div>
            <div v-else class="islands-container">
                <section v-for="sprint in sprints" :key="sprint.id" class="island-node">
                    <div class="island-header">
                        <div class="island-info">
                            <div class="sprint-title-wrap">
                                <h3>{{ sprint.name }}</h3>
                                <span class="status-badge-elite" :class="sprint.status.toLowerCase()">{{ $t('kanban.columns.' + sprint.status.toLowerCase()) }}</span>
                            </div>
                            <span class="task-count-elite">{{ getFilteredSprintTasks(sprint.id).length }} {{ $t('kanban.tasks') }}</span>
                        </div>
                        <div class="island-actions">
                            <button v-if="sprint.status === 'PLANNED' && (canManageSprints || isSuperuser)" class="btn-elite-action start" @click="openStartSprintModal(sprint)">{{ $t('kanban.start_sprint') }}</button>
                            <button v-if="sprint.status === 'ACTIVE' && (canManageSprints || isSuperuser)" class="btn-elite-action complete" @click="completeSprint(sprint)">{{ $t('kanban.complete_sprint') }}</button>
                            <button v-if="canManageSprints || isSuperuser" class="btn-elite-icon trash" @click="deleteSprint(sprint.id)"><AnimatedIcon name="trash" size="xs" /></button>
                        </div>
                    </div>
                    <draggable v-if="sprintsTasks[sprint.id]" v-model="sprintsTasks[sprint.id]" :group="canManageBacklog ? 'tasks' : { name: 'tasks', put: false }" item-key="id" animation="300" class="island-tasks-area" @change="(e) => onDragChange(e, sprint.id)" ghost-class="ghost-task-elite" :disabled="!canManageBacklog" handle=".drag-handle-v">
                        <template #item="{ element }"><TaskRow v-if="!activeEpicFilter || element.epic === activeEpicFilter" :task="element" @click="openTaskModal(element)" /></template>
                    </draggable>
                </section>

                <section class="island-node backlog">
                    <div class="island-header">
                        <div class="island-info"><h3>{{ $t('kanban.backlog') }}</h3><span class="task-count-elite">{{ filteredBacklogTasks.length }} {{ $t('kanban.tasks') }}</span></div>
                    </div>
                    <draggable v-model="backlogTasks" :group="canManageBacklog ? 'tasks' : { name: 'tasks', pull: false, put: false }" item-key="id" animation="300" class="island-tasks-area" @change="(e) => onDragChange(e, null)" ghost-class="ghost-task-elite" :disabled="!canManageBacklog" handle=".drag-handle-v">
                        <template #item="{ element }"><TaskRow v-if="!activeEpicFilter || element.epic === activeEpicFilter" :task="element" @click="openTaskModal(element)" /></template>
                    </draggable>
                </section>
            </div>
        </main>

        <Teleport to="body">
            <!-- Delete Sprint Confirm -->
            <div v-if="showDeleteConfirm" class="elite-modal-backdrop" @click.self="showDeleteConfirm = false">
                <div class="elite-modal-window">
                    <div class="modal-header-elite danger">
                        <div class="modal-icon-orb"><i class="fa-solid fa-trash"></i></div>
                        <h3>{{ $t('common.delete_confirm') }}</h3>
                    </div>
                    <div class="modal-body-elite">
                        <p>{{ $t('common.delete_warning_sprint') }}</p>
                    </div>
                    <div class="modal-footer-elite">
                        <button @click="showDeleteConfirm = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
                        <button @click="confirmDeleteSprint" class="btn-elite-solid danger">{{ $t('common.delete') }}</button>
                    </div>
                </div>
            </div>

            <TaskDetailModal v-if="selectedTask" :task="selectedTask" :is-open="isModalOpen" :userRole="userRole" @close="isModalOpen = false" @update-task="handleTaskUpdatedInModal" />

            <!-- Create Sprint Modal -->
            <div v-if="showCreateSprintModal" class="elite-modal-backdrop" @click.self="showCreateSprintModal = false">
                <div class="elite-modal-window">
                    <div class="modal-header-elite primary">
                        <div class="modal-icon-orb"><i class="fa-solid fa-plus"></i></div>
                        <h3>{{ $t('kanban.create_sprint') }}</h3>
                    </div>
                    <div class="modal-body-elite">
                        <div class="elite-input-group">
                            <label><i class="fa-solid fa-pen-nib"></i> {{ $t('kanban.sprint_name') }}</label>
                            <input v-model="newSprintName" class="elite-input-field" auto-focus />
                        </div>
                    </div>
                    <div class="modal-footer-elite">
                        <button @click="showCreateSprintModal = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
                        <button @click="createSprint" class="btn-elite-solid primary">{{ $t('common.create') }}</button>
                    </div>
                </div>
            </div>

            <!-- Start Sprint Modal -->
            <div v-if="showStartSprintModal" class="elite-modal-backdrop" @click.self="showStartSprintModal = false">
                <div class="elite-modal-window large">
                    <div class="modal-header-elite start">
                        <div class="modal-icon-orb"><i class="fa-solid fa-rocket"></i></div>
                        <h3>{{ $t('kanban.start') }}</h3>
                    </div>
                    <div class="modal-body-elite">
                        <div class="elite-input-group">
                            <label><i class="fa-solid fa-clock"></i> {{ $t('kanban.duration') }}</label>
                            <select v-model="sprintFormData.duration" class="elite-select-field">
                                <option value="1">{{ $t('kanban.1_week') }}</option>
                                <option value="2">{{ $t('kanban.2_weeks') }}</option>
                                <option value="4">{{ $t('kanban.4_weeks') }}</option>
                                <option value="custom">{{ $t('kanban.custom') }}</option>
                            </select>
                        </div>
                        <div class="elite-grid-2">
                            <div class="elite-input-group">
                                <label><i class="fa-solid fa-calendar-day"></i> {{ $t('kanban.start_date') }}</label>
                                <input type="datetime-local" v-model="sprintFormData.start_date" class="elite-input-field" />
                            </div>
                            <div class="elite-input-group">
                                <label><i class="fa-solid fa-calendar-check"></i> {{ $t('kanban.end_date') }}</label>
                                <input type="datetime-local" v-model="sprintFormData.end_date" class="elite-input-field" :disabled="sprintFormData.duration !== 'custom'" />
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer-elite">
                        <button @click="showStartSprintModal = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
                        <button @click="confirmStartSprint" class="btn-elite-solid success">{{ $t('kanban.start_sprint') }}</button>
                    </div>
                </div>
            </div>

            <!-- Complete Sprint Modal -->
            <div v-if="showCompleteSprintConfirm" class="elite-modal-backdrop" @click.self="showCompleteSprintConfirm = false">
                <div class="elite-modal-window">
                    <div class="modal-header-elite success">
                        <div class="modal-icon-orb"><i class="fa-solid fa-flag-checkered"></i></div>
                        <h3>{{ $t('kanban.complete_sprint_title') }}</h3>
                    </div>
                    <div class="modal-body-elite">
                        <div class="elite-banner">
                            <i class="fa-solid fa-circle-info"></i>
                            <div>
                                {{ $t('kanban.complete_sprint_msg') }} 
                                <strong>{{ incompleteTasksCount }}</strong> 
                                {{ $t('kanban.incomplete_tasks_msg') }}
                            </div>
                        </div>
                        <div class="elite-input-group">
                            <label><i class="fa-solid fa-arrow-right-to-bracket"></i> {{ $t('kanban.move_to') }}</label>
                            <select v-model="moveTasksTo" class="elite-select-field">
                                <option value="backlog">{{ $t('kanban.backlog') }}</option>
                                <option v-for="s in plannedSprints" :key="s.id" :value="s.id">{{ s.name }}</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer-elite">
                        <button @click="showCompleteSprintConfirm = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
                        <button @click="confirmCompleteSprint" class="btn-elite-solid success">{{ $t('kanban.complete_sprint') }}</button>
                    </div>
                </div>
            </div>

            <!-- Delete Epic Confirm -->
            <div v-if="showDeleteEpicConfirm" class="elite-modal-backdrop" @click.self="showDeleteEpicConfirm = false">
                <div class="elite-modal-window">
                    <div class="modal-header-elite danger">
                        <div class="modal-icon-orb"><i class="fa-solid fa-trash"></i></div>
                        <h3>{{ $t('epics.delete_confirm') }}</h3>
                    </div>
                    <div class="modal-body-elite">
                        <p>{{ $t('epics.delete_msg') }}</p>
                    </div>
                    <div class="modal-footer-elite">
                        <button @click="showDeleteEpicConfirm = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
                        <button @click="confirmDeleteEpic" class="btn-elite-solid danger">{{ $t('common.delete') }}</button>
                    </div>
                </div>
            </div>
            <div v-if="showCreateModal" class="elite-modal-backdrop" @click.self="showCreateModal = false">
                <div class="elite-modal-window large">
                    <div class="modal-header-elite success">
                        <div class="modal-icon-orb"><i class="fa-solid fa-plus-circle"></i></div>
                        <h3>{{ $t('kanban.create_task') }}</h3>
                    </div>
                    
                    <div class="modal-body-elite scrollable custom-scrollbar">
                        <!-- Full Width Title -->
                        <div class="elite-input-group">
                            <label><i class="fa-solid fa-heading"></i> {{ $t('kanban.task_title') }} *</label>
                            <input v-model="newTask.title" class="elite-input-field" :placeholder="$t('kanban.task_title') + '...'" auto-focus />
                        </div>

                        <!-- Full Width Description -->
                        <div class="elite-input-group">
                            <label><i class="fa-solid fa-align-left"></i> {{ $t('kanban.description') }}</label>
                            <textarea v-model="newTask.description" class="elite-input-field-multi" rows="4" :placeholder="$t('kanban.description') + '...'"></textarea>
                        </div>

                        <!-- Two Column Layout for Metadata -->
                        <div class="elite-grid-2">
                            <div class="elite-input-group">
                                <label><i class="fa-solid fa-signal"></i> {{ $t('kanban.priority') }}</label>
                                <select v-model="newTask.priority" class="elite-select-field">
                                    <option value="LOW">{{ $t('kanban.priorities.low') }}</option>
                                    <option value="MEDIUM">{{ $t('kanban.priorities.medium') }}</option>
                                    <option value="HIGH">{{ $t('kanban.priorities.high') }}</option>
                                    <option value="URGENT">{{ $t('kanban.priorities.urgent') }}</option>
                                </select>
                            </div>
                            
                            <div class="elite-input-group">
                                <!-- Placeholder for better alignment or future field like Issue Type -->
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
                        <div v-if="customFields.length > 0" class="custom-fields-divider-elite">
                            <span>{{ $t('projects.custom_fields') || 'Custom Fields' }}</span>
                        </div>

                        <div class="elite-grid-2">
                            <div v-for="field in customFields" :key="field.id" class="elite-input-group">
                                <label>
                                    <i :class="getFieldIconClass(field.field_type)"></i> 
                                    {{ field.name }} {{ field.required ? '*' : '' }}
                                </label>

                                <select v-if="field.field_type === 'CHOICE'" v-model="newTask.custom_fields[field.id]" class="elite-select-field">
                                    <option value="">{{ $t('common.select') || 'Select' }}...</option>
                                    <option v-for="opt in field.options" :key="opt.id" :value="opt.value">{{ opt.value }}</option>
                                </select>

                                <input v-else-if="field.field_type === 'DATE'" v-model="newTask.custom_fields[field.id]" type="datetime-local" class="elite-input-field" />

                                <input v-else-if="field.field_type === 'NUMBER'" v-model="newTask.custom_fields[field.id]" type="number" class="elite-input-field" :placeholder="field.name + '...'" />

                                <select v-else-if="field.field_type === 'USER'" v-model="newTask.custom_fields[field.id]" class="elite-select-field">
                                    <option value="">{{ $t('common.select_user') || 'Select User' }}...</option>
                                    <option v-for="user in projectUsers" :key="user.id" :value="user.id">{{ user.username }}</option>
                                </select>

                                <input v-else v-model="newTask.custom_fields[field.id]" type="text" class="elite-input-field" :placeholder="field.name + '...'" />
                            </div>
                        </div>

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
                            {{ loadingSave ? '...' : $t('common.create') }}
                        </button>
                        <div v-if="isSuccess" class="success-indicator-orb animate-pop">
                            <i class="fa-solid fa-check"></i> {{ $t('common.saved') }}
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
/* =========================================
   BACKLOG VIEW - System-Consistent Styling
   Uses the same design tokens as all other views
   ========================================= */

.backlog-universe {
    display: flex;
    width: 100%;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
    color: var(--text-main);
    background: var(--bg-body);
}

/* =========================================
   EPICS SIDEBAR
   ========================================= */
.floating-sidebar {
    width: 260px;
    flex-shrink: 0;
    border-inline-end: 1px solid var(--border-color);
    background: var(--bg-card);
    display: flex;
    flex-direction: column;
    padding: 24px 16px;
    overflow: hidden;
    min-height: 0;
}

.sidebar-header-elite {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 0 8px;
}

.elite-title {
    display: flex;
    align-items: center;
    gap: 10px;
}

.icon-orb {
    width: 32px;
    height: 32px;
    background: var(--primary-bg);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary);
}

.elite-title h3 {
    font-size: 0.75rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-muted);
    margin: 0;
}

.btn-create-orb {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    color: var(--primary);
    cursor: pointer;
    transition: 0.25s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-create-orb:hover {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
    transform: rotate(90deg);
}

/* Epic Input Pod */
.epic-input-zone {
    margin-bottom: 12px;
    padding: 0 4px;
}

.glass-input-pod {
    display: flex;
    align-items: center;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    overflow: hidden;
    transition: 0.2s;
}

.glass-input-pod:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-bg);
}

.elite-input-transparent {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    padding: 10px 12px;
    color: var(--text-main);
    font-size: 0.9rem;
}

.btn-check-orb {
    width: 36px;
    height: 36px;
    background: var(--primary);
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: 0.2s;
}

.btn-check-orb:hover { background: var(--primary-hover); }

/* Epics List */
.epics-scroller {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.epic-island-item {
    padding: 10px 12px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    border: 1px solid transparent;
}

.epic-island-item:hover {
    background: var(--bg-hover);
    transform: translateX(4px);
}

[dir="rtl"] .epic-island-item:hover { transform: translateX(-4px); }

.epic-island-item.active {
    background: var(--primary-bg);
    border-color: var(--primary-bg);
}

.epic-island-item.active .epic-label { color: var(--primary); }

.epic-indicator {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
}

.epic-indicator.all { background: var(--text-muted); }

.epic-label {
    flex: 1;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.btn-delete-epic {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.2s;
    opacity: 0;
}

.epic-island-item:hover .btn-delete-epic { opacity: 1; }
.btn-delete-epic:hover { background: var(--danger-bg); color: var(--danger); }

.epic-drop-overlay {
    position: absolute;
    inset: 0;
    z-index: 0;
}

/* =========================================
   MAIN CONTENT STAGE
   ========================================= */
.main-stage {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-body);
}

/* Top Bar */
.floating-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    height: 64px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-card);
    flex-shrink: 0;
}

.bar-left {
    display: flex;
    align-items: center;
    gap: 16px;
}

.btn-back-orb {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: 0.25s;
}

.btn-back-orb:hover {
    background: var(--bg-hover);
    color: var(--text-main);
    border-color: var(--primary);
}

.elite-breadcrumbs {
    display: flex;
    align-items: center;
    gap: 8px;
}

.crumb {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    transition: 0.2s;
}

.crumb:hover { color: var(--primary); }

.crumb.active {
    color: var(--text-main);
    font-weight: 800;
}

.sep {
    opacity: 0.35;
    font-size: 0.65rem;
}

.rtl-flip { transform: scaleX(-1); }

[dir="rtl"] .rtl-flip { transform: scaleX(1); }

.btn-back-orb i {
    font-size: 0.85rem;
}

.bar-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.btn-group-glass {
    display: flex;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 3px;
    gap: 2px;
}

.btn-glass-action {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-glass-action:hover {
    background: var(--bg-card);
    color: var(--primary);
}

.btn-archive-toggle {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: 0.25s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-archive-toggle.active {
    background: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.3);
    color: #f59e0b;
}

.action-orbs {
    display: flex;
    gap: 8px;
}

.btn-main-orb {
    padding: 0 18px;
    height: 38px;
    border-radius: 10px;
    border: none;
    color: white;
    font-weight: 700;
    font-size: 0.875rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: 0.25s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.btn-main-orb.success { background: #10b981; }
.btn-main-orb.success:hover { background: #059669; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
.btn-main-orb.primary { background: var(--primary); }
.btn-main-orb.primary:hover { background: var(--primary-hover); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }

/* =========================================
   LOADING STATE
   ========================================= */
.loading-overlay {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 0.95rem;
    font-weight: 600;
}

/* =========================================
   SPRINT & BACKLOG ISLANDS
   ========================================= */
.islands-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px 32px;
    padding-bottom: 48px;
}

.island-node {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    overflow: hidden;
    transition: border-color 0.3s;
    flex-shrink: 0;
}

.island-node:hover { border-color: var(--primary-bg); }

.island-node.backlog {
    border-style: dashed;
    opacity: 0.9;
}

.island-node.backlog:hover { opacity: 1; }

.island-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
    background: linear-gradient(to right, var(--bg-hover), transparent);
}

[dir="rtl"] .island-header {
    background: linear-gradient(to left, var(--bg-hover), transparent);
}

.island-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.sprint-title-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
}

.island-info h3 {
    font-size: 1.1rem;
    font-weight: 800;
    margin: 0;
    color: var(--text-main);
}

.status-badge-elite {
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.65rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: var(--bg-hover);
    color: var(--text-muted);
    border: 1px solid var(--border-color);
}

.status-badge-elite.active {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border-color: rgba(34, 197, 94, 0.25);
}

.status-badge-elite.planned {
    background: var(--primary-bg);
    color: var(--primary);
    border-color: var(--primary-bg);
}

.task-count-elite {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
}

.island-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.btn-elite-action {
    padding: 8px 18px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.8rem;
    border: none;
    cursor: pointer;
    transition: 0.2s;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.btn-elite-action.start { background: var(--primary); color: white; }
.btn-elite-action.start:hover { background: var(--primary-hover); }
.btn-elite-action.complete { background: #10b981; color: white; }
.btn-elite-action.complete:hover { background: #059669; }

.btn-elite-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    cursor: pointer;
    transition: 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-elite-icon.trash:hover {
    background: var(--danger-bg);
    border-color: var(--danger);
    color: var(--danger);
}

.island-tasks-area {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px;
    min-height: 52px;
}

.island-empty-state {
    padding: 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--text-muted);
    opacity: 0.5;
    font-size: 0.9rem;
    font-weight: 600;
}

/* =========================================
   MODALS - System-consistent
   ========================================= */
.elite-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: backdrop-in 0.2s ease;
}

@keyframes backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

.elite-modal-window {
    width: 480px;
    max-width: 92vw;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    animation: modal-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    overflow: hidden;
}

@keyframes modal-in {
    from { opacity: 0; transform: scale(0.94) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header-elite {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px;
    border-bottom: 1px solid var(--border-color);
}

.modal-header-elite h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--text-main);
}

.modal-icon-orb {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.modal-header-elite.danger .modal-icon-orb {
    background: var(--danger-bg);
    color: var(--danger);
}

.modal-header-elite.primary .modal-icon-orb {
    background: var(--primary-bg);
    color: var(--primary);
}

.modal-header-elite.success .modal-icon-orb {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.modal-header-elite.start .modal-icon-orb {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
}

.modal-body-elite {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.modal-body-elite p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.95rem;
    line-height: 1.6;
}

.modal-body-elite.scrollable {
    overflow-y: auto;
    max-height: 60vh;
}

.elite-banner {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 14px 18px;
    font-size: 0.9rem;
    color: var(--text-muted);
    line-height: 1.6;
}

.elite-banner strong { color: var(--primary); }

.elite-input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.elite-input-group label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-main);
}

.elite-input-field,
.elite-select-field,
.elite-input-field-multi {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 12px 14px;
    color: var(--text-main);
    font-size: 0.95rem;
    width: 100%;
    transition: 0.2s;
    box-sizing: border-box;
}

.elite-input-field:focus,
.elite-select-field:focus,
.elite-input-field-multi:focus {
    border-color: var(--primary);
    outline: none;
    box-shadow: 0 0 0 3px var(--primary-bg);
    background: var(--bg-card);
}

.elite-input-field:disabled { opacity: 0.5; cursor: not-allowed; }

.elite-select-field option { background: var(--bg-card); }

.elite-row {
    display: flex;
    gap: 16px;
}

.elite-input-group.half { flex: 1; }

.modal-footer-elite {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid var(--border-color);
    background: var(--bg-hover);
}

.btn-elite-glass {
    padding: 9px 20px;
    border-radius: 10px;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: 0.2s;
}

.btn-elite-glass:hover {
    background: var(--bg-hover);
    color: var(--text-main);
    border-color: var(--text-muted);
}

.btn-elite-solid {
    padding: 9px 24px;
    border-radius: 10px;
    border: none;
    color: white;
    font-weight: 800;
    font-size: 0.9rem;
    cursor: pointer;
    transition: 0.2s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.btn-elite-solid:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-elite-solid.danger { background: var(--danger); }
.btn-elite-solid.danger:hover { filter: brightness(1.1); }
.btn-elite-solid.primary { background: var(--primary); }
.btn-elite-solid.primary:hover { background: var(--primary-hover); }
.btn-elite-solid.success { background: #10b981; }
.btn-elite-solid.success:hover { background: #059669; }

/* Success indicator */
.success-indicator-orb {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #10b981;
    font-weight: 700;
}

/* =========================================
   GHOST / DRAG STATE
   ========================================= */
.ghost-task-elite {
    opacity: 0.4;
    background: var(--primary-bg);
    border: 2px dashed var(--primary);
    border-radius: 12px;
}

/* =========================================
   SCROLLBAR
   ========================================= */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 6px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
/* =========================================
   MODAL ELITE UPDATES
   ========================================= */
.elite-modal-window.large {
    max-width: 650px;
    width: 95%;
}

.elite-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    width: 100%;
}

.elite-input-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-muted);
}

.elite-input-group label i {
    color: var(--primary);
    font-size: 1rem;
    opacity: 0.8;
}

[dir="rtl"] .elite-input-group label i {
    margin-left: 2px;
}

.spinner-tiny {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.animate-pop {
    animation: popIndicator 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes popIndicator {
    0% { transform: scale(0.8); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

@media (max-width: 680px) {
    .elite-grid-2 { grid-template-columns: 1fr; gap: 10px; }
}
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

