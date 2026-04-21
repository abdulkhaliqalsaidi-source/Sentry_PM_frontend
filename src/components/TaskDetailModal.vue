<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import axios from '@/plugins/axios';
import { useToast } from '@/composables/useToast';

const { t } = useI18n();
const { showToast } = useToast();

const props = defineProps({
  task: Object,
  isOpen: Boolean,
  userRole: {
    type: String,
    default: 'VIEWER'
  }
});
const emit = defineEmits(['close', 'update-task']);

const activeTab = ref('details'); // details, comments, history
const comments = ref([]);
const newComment = ref('');
const replyingTo = ref(null); // { id, author_name }
const newSubtask = ref('');
const showSubtaskForm = ref(false);
const subtaskForm = ref({ title: '', description: '', priority: 'MEDIUM', assigned_to: null, due_date: '' });
const workLogs = ref([]);
const showWorkLogForm = ref(false);
const workLogForm = ref({ hours: '', description: '', logged_at: new Date().toISOString().split('T')[0] });
const savingWorkLog = ref(false);
const mentionSuggestions = ref([]);
const mentionQuery = ref('');
const mentionIndex = ref(-1);
const commentTextarea = ref(null);
const isEditingTitle = ref(false);
const isEditingDescription = ref(false);
const isDetailsExpanded = ref(true);
const descriptionBuffer = ref('');
const loadingSave = ref(false);
const isSuccess = ref(false);
const projectMembers = ref([]);
const isAssigneeModalOpen = ref(false);
const isWatchersModalOpen = ref(false);
const assigneeSearch = ref('');
const watcherSearch = ref('');

const filteredProjectMembers = computed(() => {
    if (!assigneeSearch.value.trim()) return projectMembers.value;
    const q = assigneeSearch.value.toLowerCase();
    return projectMembers.value.filter(m => 
        m.username.toLowerCase().includes(q)
    );
});

const watchersList = computed(() => {
    if (!props.task?.watchers) return [];
    return projectMembers.value.filter(m => props.task.watchers.includes(m.id));
});

const filteredWatcherMembers = computed(() => {
    if (!watcherSearch.value.trim()) return projectMembers.value;
    const q = watcherSearch.value.toLowerCase();
    return projectMembers.value.filter(m => 
        m.username.toLowerCase().includes(q)
    );
});

const currentAssignee = computed(() => {
    return projectMembers.value.find(m => m.id === props.task?.assigned_to);
});

const renderedDescription = computed(() => {
    return DOMPurify.sanitize(marked.parse(descriptionBuffer.value || `*${t('common.none')}*`));
});

const safeMarkdown = (content) => DOMPurify.sanitize(marked.parse(content || ''));

const subtasks = computed(() => props.task?.subtasks || []);
const attachments = computed(() => props.task?.attachments || []);
const incomingLinks = computed(() => props.task?.incoming_links || []);
const outgoingLinks = computed(() => props.task?.outgoing_links || []);
const watchers = computed(() => props.task?.watchers || []);

const isSuperuser = computed(() => localStorage.getItem('is_superuser') === 'true');
const isAdmin = computed(() => isSuperuser.value || props.userRole === 'ADMIN');
const canEdit = computed(() => isAdmin.value || props.userRole === 'MEMBER');
const currentUserId = computed(() => parseInt(localStorage.getItem('user_id') || '0'));

const progress = computed(() => {
    if (!subtasks.value.length) return 0;
    const completed = subtasks.value.filter(s => s.is_completed).length;
    return Math.round((completed / subtasks.value.length) * 100);
});

// --- API Interactions ---
const API_BASE = '/api/pm';

const sprints = ref([]);
const epics = ref([]);
const projectStatuses = ref([]);
const isUpdatingStatus = ref(false);

const customFields = ref([]);
const projectVersions = ref([]);
const isUpdatingVersions = ref(false);

const fetchVersions = async () => {
    if (!props.task?.project) return;
    try {
        const res = await axios.get(`${API_BASE}/versions/`, { params: { project: props.task.project } });
        projectVersions.value = res.data;
    } catch (e) { console.error("Error fetching versions", e); }
};
const fetchCustomFields = async () => {
    if (!props.task?.project) return;
    try {
        const res = await axios.get(`${API_BASE}/custom-fields/`, { params: { project: props.task.project } });
        customFields.value = res.data;
    } catch (e) { console.error("Error fetching custom fields", e); }
};

const getTaskCustomFieldValue = (fieldId) => {
    if (!props.task?.custom_field_values) return '';
    const valObj = props.task.custom_field_values.find(v => v.custom_field === fieldId);
    if (!valObj) return '';
    
    const field = customFields.value.find(f => f.id === fieldId);
    if (!field) return '';

    if (field.field_type === 'TEXT' || field.field_type === 'CHOICE') return valObj.value_text || '';
    if (field.field_type === 'NUMBER') return valObj.value_number || '';
    if (field.field_type === 'DATE') return valObj.value_date || '';
    if (field.field_type === 'USER') return valObj.value_user || '';
    return '';
};

const updateCustomField = async (fieldId, newValue) => {
    const field = customFields.value.find(f => f.id === fieldId);
    if (!field) return; // guard: field not found
    if (field.required && (!newValue || newValue.toString().trim() === '')) {
        showToast(`${field.name} ${t('common.is_required') || 'is required'}`, 'error');
        emit('update-task'); // Reset UI
        return;
    }

    try {
        // Find if value already exists
        const existingVal = props.task.custom_field_values?.find(v => v.custom_field === fieldId);
        
        const payload = {
            task: props.task.id,
            custom_field: fieldId
        };
        if (field.field_type === 'TEXT' || field.field_type === 'CHOICE') payload.value_text = newValue.toString();
        if (field.field_type === 'NUMBER') payload.value_number = parseFloat(newValue);
        if (field.field_type === 'DATE') payload.value_date = newValue;
        if (field.field_type === 'USER') payload.value_user = newValue;

        if (existingVal) {
            await axios.patch(`${API_BASE}/task-custom-field-values/${existingVal.id}/`, payload);
        } else {
            await axios.post(`${API_BASE}/task-custom-field-values/`, payload);
        }
        emit('update-task');
    } catch (e) {
        console.error("Error updating custom field", e);
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
const fetchComments = async () => {
    if (!props.task?.id) return;
    try {
        const res = await axios.get(`${API_BASE}/comments/`, { params: { task: props.task.id } });
        comments.value = res.data;
    } catch (e) { console.error(e); }
};

const fetchSprints = async () => {
    if (!props.task?.project) return;
    try {
        const res = await axios.get(`${API_BASE}/sprints/`, { params: { project: props.task.project } });
        sprints.value = res.data;
    } catch (e) { console.error(e); }
};

const fetchEpics = async () => {
    if (!props.task?.project) return;
    try {
        const res = await axios.get(`${API_BASE}/epics/`, { params: { project: props.task.project } });
        epics.value = res.data;
    } catch (e) { console.error(e); }
};

const fetchStatuses = async () => {
    if (!props.task?.project) return;
    try {
        const res = await axios.get(`${API_BASE}/statuses/`, { params: { project: props.task.project } });
        projectStatuses.value = res.data;
    } catch (e) { console.error(e); }
};

const fetchProjectMembers = async () => {
    if (!props.task?.project) return;
    try {
        const res = await axios.get(`${API_BASE}/project-roles/`, { params: { project: props.task.project } });
        const roles = res.data;
        projectMembers.value = roles.map(r => ({ id: r.user, username: r.username }));
    } catch(e) { console.error("Error fetching project members", e); }
};

// Work Log
const fetchWorkLogs = async () => {
    if (!props.task?.id) return;
    try {
        const res = await axios.get(`${API_BASE}/work-logs/`, { params: { task: props.task.id } });
        workLogs.value = res.data;
    } catch (e) { console.error(e); }
};

watch(() => props.task, (newVal) => {
    if (newVal) {
        descriptionBuffer.value = newVal.description || '';
        fetchComments();
        fetchWorkLogs();
        fetchSprints();
        fetchEpics();
        fetchProjectMembers();
        fetchStatuses();
        fetchCustomFields();
        fetchVersions();
    }
}, { immediate: true });

watch(isAssigneeModalOpen, (isOpen) => {
    if (isOpen) {
        setTimeout(() => {
            const el = document.querySelector('.popover-search input');
            if (el) el.focus();
        }, 50);
    }
});

// Close dropdowns when clicking outside
const handleOutsideClick = (e) => {
    if (isAssigneeModalOpen.value && !e.target.closest('.dropdown-wrapper')) {
        isAssigneeModalOpen.value = false;
    }
    if (isWatchersModalOpen.value && !e.target.closest('.dropdown-wrapper')) {
        isWatchersModalOpen.value = false;
    }
};

onMounted(() => {
    document.addEventListener('mousedown', handleOutsideClick);
});

onUnmounted(() => {
    document.removeEventListener('mousedown', handleOutsideClick);
});

// --- Field Update Handlers ---
const updateField = async (field, value) => {
    try {
        await axios.patch(`${API_BASE}/tasks/${props.task.id}/`, { [field]: value });
        emit('update-task');
    } catch (e) { console.error(`Error updating ${field}`, e); }
};

const toggleWatcher = async (userId) => {
    let newWatchers = [...(props.task.watchers || [])];
    if (newWatchers.includes(userId)) {
        newWatchers = newWatchers.filter(id => id !== userId);
    } else {
        newWatchers.push(userId);
    }
    await updateWatchers(newWatchers);
};

const updateWatchers = async (watcherIds) => {
    try {
        await axios.post(`${API_BASE}/tasks/${props.task.id}/update-watchers/`, { watcher_ids: watcherIds });
        emit('update-task');
    } catch (e) { console.error('Error updating watchers', e); }
};

const updateSprint = async (sprintId) => {
    // Handle "null" string from select
    const val = sprintId === 'null' || !sprintId ? null : sprintId;
    try {
        await axios.patch(`${API_BASE}/tasks/${props.task.id}/`, { sprint: val });
        emit('update-task');
    } catch (e) { console.error(e); }
};

const updateStoryPoints = async (points) => {
    try {
        await axios.patch(`${API_BASE}/tasks/${props.task.id}/`, { story_points: points || 0 });
        emit('update-task');
    } catch (e) { console.error(e); }
};

const addVersionToTask = async (versionId) => {
    if (!versionId) return;
    // Check if already exists
    const exists = props.task.version_relations?.find(vr => vr.version === parseInt(versionId));
    if (exists) return;

    try {
        await axios.post(`${API_BASE}/task-versions/`, {
            task: props.task.id,
            version: versionId,
            relation_type: 'FIXED_IN'
        });
        emit('update-task');
    } catch (e) { console.error("Error adding version", e); }
};

const removeVersionFromTask = async (taskVersionId) => {
    try {
        await axios.delete(`${API_BASE}/task-versions/${taskVersionId}/`);
        emit('update-task');
    } catch (e) { console.error("Error removing version", e); }
};

const handleStatusChange = async (newStatusId) => {
    isUpdatingStatus.value = true;
    try {
        const oldCategory = props.task.status_details?.category;
        const newStatusObj = projectStatuses.value.find(s => s.id === parseInt(newStatusId) || s.id === newStatusId);
        const newCategory = newStatusObj?.category;

        const res = await axios.post(`${API_BASE}/tasks/${props.task.id}/update-status/`, { status_id: newStatusId });
        
        if (res.data) {
            // Reset time_spent to 0 if moving from DONE to a non-DONE category
            if (oldCategory === 'DONE' && newCategory !== 'DONE') {
                await axios.patch(`${API_BASE}/tasks/${props.task.id}/`, { time_spent: 0 });
            }
            emit('update-task');
        }
    } catch (e) {
        console.error("Error updating status", e);
        const errorMsg = e.response?.data?.error || t('kanban.messages.status_change_error');
        showToast(errorMsg, 'error');
        emit('update-task');
    } finally {
        isUpdatingStatus.value = false;
    }
};

const postComment = async () => {
    if (!newComment.value.trim()) return;
    try {
        await axios.post(`${API_BASE}/comments/`, {
            task: props.task.id,
            content: newComment.value,
            parent: replyingTo.value?.id || null,
        });
        newComment.value = '';
        replyingTo.value = null;
        mentionSuggestions.value = [];
        fetchComments();
        emit('update-task');
    } catch (e) { console.error(e); }
};

// @mention autocomplete
const onCommentInput = (e) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@(\w*)$/);
    if (match) {
        mentionQuery.value = match[1].toLowerCase();
        mentionSuggestions.value = projectMembers.value.filter(m =>
            m.username.toLowerCase().startsWith(mentionQuery.value)
        ).slice(0, 6);
        mentionIndex.value = -1;
    } else {
        mentionSuggestions.value = [];
    }
};

const insertMention = (username) => {
    const textarea = commentTextarea.value;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const val = newComment.value;
    const before = val.slice(0, cursor).replace(/@\w*$/, `@${username} `);
    newComment.value = before + val.slice(cursor);
    mentionSuggestions.value = [];
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(before.length, before.length); }, 0);
};

const onCommentKeydown = (e) => {
    if (!mentionSuggestions.value.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); mentionIndex.value = Math.min(mentionIndex.value + 1, mentionSuggestions.value.length - 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); mentionIndex.value = Math.max(mentionIndex.value - 1, 0); }
    if (e.key === 'Enter' && mentionIndex.value >= 0) { e.preventDefault(); insertMention(mentionSuggestions.value[mentionIndex.value].username); }
    if (e.key === 'Escape') { mentionSuggestions.value = []; }
};

const saveWorkLog = async () => {
    if (!workLogForm.value.hours || parseFloat(workLogForm.value.hours) <= 0) return;
    savingWorkLog.value = true;
    try {
        await axios.post(`${API_BASE}/work-logs/`, {
            task: props.task.id,
            hours: parseFloat(workLogForm.value.hours),
            description: workLogForm.value.description,
            logged_at: workLogForm.value.logged_at,
        });
        workLogForm.value = { hours: '', description: '', logged_at: new Date().toISOString().split('T')[0] };
        showWorkLogForm.value = false;
        fetchWorkLogs();
        emit('update-task');
    } catch (e) { console.error(e); } finally { savingWorkLog.value = false; }
};

const deleteWorkLog = async (id) => {
    try {
        await axios.delete(`${API_BASE}/work-logs/${id}/`);
        fetchWorkLogs();
        emit('update-task');
    } catch (e) { console.error(e); }
};

const addSubtask = async () => {
    if (!subtaskForm.value.title.trim()) return;
    try {
        await axios.post(`${API_BASE}/subtasks/`, {
            parent: props.task.id,
            title: subtaskForm.value.title,
            description: subtaskForm.value.description,
            priority: subtaskForm.value.priority,
            assigned_to: subtaskForm.value.assigned_to || null,
            due_date: subtaskForm.value.due_date || null,
        });
        subtaskForm.value = { title: '', description: '', priority: 'MEDIUM', assigned_to: null, due_date: '' };
        showSubtaskForm.value = false;
        emit('update-task');
    } catch (e) { console.error(e); }
};

const toggleSubtask = async (subtask) => {
    try {
        await axios.patch(`${API_BASE}/subtasks/${subtask.id}/`, { is_completed: !subtask.is_completed });
        emit('update-task');
    } catch (e) { console.error(e); }
};

const saveDescription = async () => {
    loadingSave.value = true;
    try {
        await axios.patch(`${API_BASE}/tasks/${props.task.id}/`, { description: descriptionBuffer.value });
        isSuccess.value = true;
        setTimeout(() => {
            isSuccess.value = false;
            isEditingDescription.value = false;
            emit('update-task');
        }, 1000);
    } catch (e) { console.error(e); } finally { loadingSave.value = false; }
};

// --- Attachments ---
const isUploading = ref(false);
const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    isUploading.value = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('task', props.task.id);

    try {
        await axios.post(`${API_BASE}/attachments/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        emit('update-task');
    } catch (e) {
        console.error("Upload failed", e);
    } finally {
        isUploading.value = false;
        event.target.value = ''; // Reset input
    }
};

const deleteAttachment = async (id) => {
    try {
        await axios.delete(`${API_BASE}/attachments/${id}/`);
        emit('update-task');
    } catch (e) { console.error(e); }
};

// --- Issue Linking ---
const linkType = ref('BLOCKS');
const linkTargetId = ref('');
const isLinking = ref(false);

const createIssueLink = async () => {
    if (!linkTargetId.value) return;
    isLinking.value = true;
    try {
        await axios.post(`${API_BASE}/issue-links/`, {
            from_task: props.task.id,
            to_task: linkTargetId.value,
            type: linkType.value
        });
        linkTargetId.value = '';
        emit('update-task');
    } catch (e) { console.error(e); } finally {
        isLinking.value = false;
    }
};

const deleteIssueLink = async (id) => {
    try {
        await axios.delete(`${API_BASE}/issue-links/${id}/`);
        emit('update-task');
    } catch (e) { console.error(e); }
};

const showDeleteConfirm = ref(false);

const deleteTask = () => {
    showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
    try {
        await axios.delete(`${API_BASE}/tasks/${props.task.id}/`);
        emit('update-task');
        emit('close');
    } catch (e) { console.error(e); }
};

const insertMarkdown = (syntax) => {
    const textarea = document.querySelector('.add-comment textarea');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newComment.value;
    
    let insertion = '';
    let cursorOffset = 0;
    
    switch (syntax) {
        case 'bold':
            insertion = `**${text.substring(start, end) || 'bold'}**`;
            cursorOffset = 2;
            break;
        case 'italic':
            insertion = `*${text.substring(start, end) || 'italic'}*`;
            cursorOffset = 1;
            break;
        case 'list':
            insertion = `\n- ${text.substring(start, end) || 'item'}`;
            cursorOffset = 3;
            break;
        case 'code':
            insertion = `\`${text.substring(start, end) || 'code'}\``;
            cursorOffset = 1;
            break;
    }
    
    newComment.value = text.substring(0, start) + insertion + text.substring(end);
    
    // Defer focus to allow Vue to update
    setTimeout(() => {
        textarea.focus();
        // Adjust cursor if no text was selected (wrapping placeholder)
        if (start === end) {
             const newCursor = start + insertion.length - cursorOffset;
             textarea.setSelectionRange(newCursor, newCursor);
        }
    }, 0);
};

const formatAttachmentUrl = (path) => {
    if (!path) return '#';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return path.startsWith('/') ? path : `/${path}`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return t('common.none');
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return t('common.invalid_date');
    return date.toLocaleString();
};

const activeProjectName = computed(() => {
    if (!props.task?.project_name) return props.task?.project ? `Project #${props.task.project}` : 'Project';
    return props.task.project_name;
});
</script>




<template>
    <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content ">
            <button class="close-btn" @click="$emit('close')">&times;</button>
            
            <div class="modal-header">
                <!-- Jira Breadcrumbs -->
                <div class="task-breadcrumbs">
                    <span class="task-type-header" :title="task.issue_type">
                        <i v-if="task.issue_type === 'BUG'" class="fa-solid fa-circle-exclamation text-danger"></i>
                        <i v-else-if="task.issue_type === 'STORY'" class="fa-solid fa-bookmark text-success"></i>
                        <i v-else class="fa-solid fa-square-check text-primary"></i>
                    </span>
                    <span class="breadcrumb-item">{{ activeProjectName }}</span>
                    <span class="breadcrumb-separator">/</span>
                    <span class="breadcrumb-item task-key">{{ task.project_key || t('common.task') }}-{{ task.id }}</span>
                </div>
                
                <div class="header-main-actions">
                    <h2 class="task-title-display" v-if="!isEditingTitle" @click="isEditingTitle = true">
                        {{ task.title }}
                    </h2>
                    <input 
                        v-else
                        class="title-input-edit" 
                        ref="titleEditInput"
                        :value="task.title" 
                        @blur="isEditingTitle = false; updateField('title', $event.target.value)" 
                        @keyup.enter="$event.target.blur()" 
                        :placeholder="t('kanban.task_title')"
                    />
                </div>

                    <div class="header-toolbar">
                        <div class="toolbar-left">
                            <button class="btn-toolbar"><i class="fa-solid fa-paperclip"></i> {{ t('kanban.attachments') }}</button>
                            <button class="btn-toolbar"><i class="fa-solid fa-link"></i> {{ t('kanban.link_issue') }}</button>
                            <button class="btn-toolbar"><i class="fa-solid fa-ellipsis"></i></button>
                        </div>
                        <div class="toolbar-right">
                             <button v-if="isSuperuser" class="btn-toolbar text-danger" @click="deleteTask" :title="t('common.delete')">
                                <i class="fa-solid fa-trash"></i> {{ t('common.delete') }}
                            </button>
                        </div>
                    </div>
            </div>

            <div class="modal-body jira-layout">
                <div class="main-column">
                    <!-- Description -->
                    <div class="section description-section">
                        <div class="section-header">
                            <h3><i class="fa-solid fa-align-left"></i> {{ $t('common.description') }}</h3>
                            <button v-if="canEdit && !isEditingDescription" @click="isEditingDescription = true" class="btn-text">
                                <i class="fa-solid fa-pen"></i> {{ t('common.edit') }}
                            </button>
                        </div>
                        
                        <div v-if="isEditingDescription" class="editor-wrapper">
                            <textarea v-model="descriptionBuffer" class="markdown-editor" rows="6" :placeholder="$t('kanban.description') + '...'"></textarea>
                            <div class="editor-actions">
                                <button @click="saveDescription" class="btn-primary btn-save" :class="{ 'btn-loading': loadingSave, 'btn-success': isSuccess }" :disabled="loadingSave">
                                    <span v-if="loadingSave"><i class="fa-solid fa-spinner fa-spin"></i></span>
                                    <span v-else-if="isSuccess"><i class="fa-solid fa-check"></i></span>
                                    <span v-else>{{ $t('kanban.save_changes') }}</span>
                                </button>
                                <button @click="isEditingDescription = false" class="btn-ghost">{{ $t('common.cancel') }}</button>
                            </div>
                        </div>
                        <div v-else class="markdown-preview" v-html="renderedDescription"></div>
                    </div>

                    <!-- Attachments -->
                    <div class="section attachments-section">
                        <h3><i class="fa-solid fa-paperclip"></i> {{ $t('kanban.attachments') }}</h3>
                        <div class="attachments-grid" v-if="attachments && attachments.length">
                            <div v-for="att in attachments" :key="att.id" class="attachment-card">
                                <a :href="formatAttachmentUrl(att.file)" target="_blank" class="attachment-link">
                                    <i class="fa-solid fa-file-lines"></i>
                                    <span class="filename" :title="att.file_name">{{ att.file_name }}</span>
                                </a>
                                <button v-if="isSuperuser || att.uploaded_by === currentUserId" 
                                        class="btn-icon text-danger" @click="deleteAttachment(att.id)" title="Delete">
                                    <i class="fa-solid fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="upload-zone">
                            <input type="file" id="file-upload" class="file-input" @change="handleFileUpload" :disabled="isUploading" />
                            <label for="file-upload" class="upload-label">
                                <i class="fa-solid fa-cloud-arrow-up"></i>
                                <span>{{ isUploading ? $t('kanban.uploading') : $t('kanban.drop_files') }}</span>
                            </label>
                        </div>
                    </div>

                    <!-- Issue Links -->
                    <div class="section issue-links-section">
                        <h3><i class="fa-solid fa-link"></i> {{ $t('kanban.issue_links') }}</h3>
                        
                        <!-- Create Link Form -->
                        <div v-if="canEdit" class="create-link-form">
                            <select v-model="linkType" class="link-type-select">
                                <option value="BLOCKS">{{ $t('kanban.link_types.blocks') }}</option>
                                <option value="IS_BLOCKED_BY">{{ $t('kanban.link_types.is_blocked_by') }}</option>
                                <option value="RELATES_TO">{{ $t('kanban.link_types.relates_to') }}</option>
                                <option value="DUPLICATES">{{ $t('kanban.link_types.duplicates') }}</option>
                            </select>
                            <input type="number" v-model="linkTargetId" :placeholder="$t('kanban.task_id_placeholder')" class="link-target-input" @keyup.enter="createIssueLink"/>
                            <button @click="createIssueLink" :disabled="isLinking || !linkTargetId" class="btn-secondary btn-sm">{{ $t('kanban.link') }}</button>
                        </div>

                        <!-- Existing Links -->
                        <div class="links-list" v-if="outgoingLinks.length || incomingLinks.length">
                            <div v-for="link in outgoingLinks" :key="'out-'+link.id" class="issue-link-card">
                                <span class="link-target">{{ t('common.task') }} #{{ link.to_task }}</span>
                                <button v-if="canEdit" class="btn-icon text-danger" @click="deleteIssueLink(link.id)"><i class="fa-solid fa-unlink"></i></button>
                            </div>
                            <div v-for="link in incomingLinks" :key="'in-'+link.id" class="issue-link-card">
                                <span class="link-label">
                                    {{ link.type === 'BLOCKS' ? t('kanban.link_types.is_blocked_by').toUpperCase() : 
                                       link.type === 'IS_BLOCKED_BY' ? t('kanban.link_types.blocks').toUpperCase() : 
                                       link.type.replace(/_/g, ' ') }}
                                </span>
                                <span class="link-target">{{ t('common.task') }} #{{ link.from_task }}</span>
                                <button v-if="canEdit" class="btn-icon text-danger" @click="deleteIssueLink(link.id)"><i class="fa-solid fa-unlink"></i></button>
                            </div>
                        </div>
                    </div>

                    <!-- Subtasks -->
                    <div class="section subtasks-section">
                        <h3><i class="fa-solid fa-list-check"></i> {{ $t('kanban.subtasks') }}</h3>
                        <div class="progress-bar">
                            <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
                        </div>
                        <span class="progress-text">{{ progress }}% {{ $t('common.done') }}</span>

                        <ul class="subtask-list">
                            <li v-for="st in subtasks" :key="st.id" class="subtask-item subtask-item-rich">
                                <input type="checkbox" :checked="st.is_completed" @change="toggleSubtask(st)" :disabled="!isAdmin">
                                <div class="subtask-info">
                                    <span :class="{ completed: st.is_completed }">{{ st.title }}</span>
                                    <div class="subtask-meta">
                                        <span v-if="st.priority" class="subtask-badge" :class="'priority-' + st.priority.toLowerCase()">
                                            {{ st.priority }}
                                        </span>
                                        <span v-if="st.assigned_to_name" class="subtask-badge assignee">
                                            <i class="fa-solid fa-user fa-xs"></i> {{ st.assigned_to_name }}
                                        </span>
                                        <span v-if="st.due_date" class="subtask-badge due">
                                            <i class="fa-solid fa-calendar fa-xs"></i> {{ st.due_date }}
                                        </span>
                                    </div>
                                </div>
                            </li>
                        </ul>
                        
                        <div v-if="isAdmin">
                            <button v-if="!showSubtaskForm" @click="showSubtaskForm = true" class="btn-add-subtask">
                                <i class="fa-solid fa-plus"></i> {{ $t('kanban.add_subtask') }}
                            </button>
                            <div v-else class="subtask-form">
                                <input v-model="subtaskForm.title" type="text" :placeholder="$t('kanban.subtask_title') || 'Subtask title'" class="subtask-input" autofocus />
                                <div class="subtask-form-row">
                                    <select v-model="subtaskForm.priority" class="subtask-select">
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                    <select v-model="subtaskForm.assigned_to" class="subtask-select">
                                        <option :value="null">{{ $t('kanban.unassigned') }}</option>
                                        <option v-for="m in projectMembers" :key="m.id" :value="m.id">{{ m.username }}</option>
                                    </select>
                                    <input v-model="subtaskForm.due_date" type="date" class="subtask-input" />
                                </div>
                                <div class="subtask-form-actions">
                                    <button @click="addSubtask" class="btn-primary btn-sm">{{ $t('common.save') }}</button>
                                    <button @click="showSubtaskForm = false" class="btn-ghost btn-sm">{{ $t('common.cancel') }}</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Comments -->
                    <div class="section comments-section">
                        <h3><i class="fa-solid fa-comments"></i> {{ $t('kanban.comments') }}</h3>
                        <div class="comments-list">
                            <div v-for="comment in comments" :key="comment.id" class="comment-item">
                                <div class="comment-avatar">
                                    {{ (comment.author_name || 'U')[0].toUpperCase() }}
                                </div>
                                <div class="comment-content-wrapper">
                                    <div class="comment-header">
                                        <span class="author">{{ comment.author_name || t('common.unknown') }}</span>
                                        <span class="date">{{ formatDate(comment.created_at) }}</span>
                                        <button v-if="canEdit" class="btn-reply-inline" @click="replyingTo = { id: comment.id, author_name: comment.author_name }">
                                            <i class="fa-solid fa-reply fa-xs"></i> {{ $t('kanban.reply') || 'Reply' }}
                                        </button>
                                    </div>
                                    <div class="comment-body" v-html="safeMarkdown(comment.content)"></div>

                                    <!-- Replies -->
                                    <div v-if="comment.replies && comment.replies.length" class="replies-list">
                                        <div v-for="reply in comment.replies" :key="reply.id" class="comment-item reply-item">
                                            <div class="comment-avatar sm">{{ (reply.author_name || 'U')[0].toUpperCase() }}</div>
                                            <div class="comment-content-wrapper">
                                                <div class="comment-header">
                                                    <span class="author">{{ reply.author_name }}</span>
                                                    <span class="date">{{ formatDate(reply.created_at) }}</span>
                                                </div>
                                                <div class="comment-body" v-html="safeMarkdown(reply.content)"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="canEdit" class="add-comment">
                            <!-- Reply indicator -->
                            <div v-if="replyingTo" class="reply-indicator">
                                <i class="fa-solid fa-reply fa-xs"></i>
                                {{ $t('kanban.replying_to') || 'Replying to' }} <strong>{{ replyingTo.author_name }}</strong>
                                <button @click="replyingTo = null" class="btn-cancel-reply"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="markdown-toolbar">
                                <button @click="insertMarkdown('bold')" :title="t('common.markdown.bold')"><i class="fa-solid fa-bold"></i></button>
                                <button @click="insertMarkdown('italic')" :title="t('common.markdown.italic')"><i class="fa-solid fa-italic"></i></button>
                                <button @click="insertMarkdown('list')" :title="t('common.markdown.list')"><i class="fa-solid fa-list-ul"></i></button>
                                <button @click="insertMarkdown('code')" :title="t('common.markdown.code')"><i class="fa-solid fa-code"></i></button>
                            </div>
                            <!-- @mention autocomplete -->
                            <div class="mention-wrapper">
                                <textarea
                                    ref="commentTextarea"
                                    v-model="newComment"
                                    :placeholder="$t('kanban.write_comment')"
                                    rows="3"
                                    @input="onCommentInput"
                                    @keydown="onCommentKeydown"
                                ></textarea>
                                <ul v-if="mentionSuggestions.length" class="mention-dropdown">
                                    <li
                                        v-for="(m, idx) in mentionSuggestions"
                                        :key="m.id"
                                        :class="{ active: idx === mentionIndex }"
                                        @mousedown.prevent="insertMention(m.username)"
                                    >
                                        <i class="fa-solid fa-at fa-xs"></i> {{ m.username }}
                                    </li>
                                </ul>
                            </div>
                            <button @click="postComment" class="btn-secondary">{{ $t('kanban.post') }}</button>
                        </div>
                    </div>

                    <!-- Work Log -->
                    <div class="section worklog-section">
                        <div class="section-header">
                            <h3><i class="fa-solid fa-clock"></i> {{ $t('kanban.work_log') || 'Work Log' }}</h3>
                            <button v-if="canEdit" @click="showWorkLogForm = !showWorkLogForm" class="btn-text">
                                <i class="fa-solid fa-plus"></i> {{ $t('kanban.log_time') || 'Log Time' }}
                            </button>
                        </div>

                        <!-- Time summary bar -->
                        <div class="time-summary" v-if="props.task">
                            <div class="time-bar-wrap">
                                <div class="time-bar-fill" :style="{
                                    width: props.task.time_estimate > 0
                                        ? Math.min((props.task.time_spent / props.task.time_estimate) * 100, 100) + '%'
                                        : '0%',
                                    background: props.task.time_spent > props.task.time_estimate && props.task.time_estimate > 0 ? '#ef4444' : 'var(--primary)'
                                }"></div>
                            </div>
                            <span class="time-label">
                                {{ props.task.time_spent || 0 }}h {{ $t('kanban.logged') || 'logged' }}
                                <span v-if="props.task.time_estimate > 0"> / {{ props.task.time_estimate }}h {{ $t('kanban.estimated') || 'estimated' }}</span>
                            </span>
                        </div>

                        <!-- Log form -->
                        <div v-if="showWorkLogForm" class="worklog-form">
                            <div class="worklog-form-row">
                                <input v-model="workLogForm.hours" type="number" step="0.5" min="0.5" :placeholder="$t('kanban.hours') || 'Hours'" class="worklog-input" />
                                <input v-model="workLogForm.logged_at" type="date" class="worklog-input" />
                            </div>
                            <input v-model="workLogForm.description" type="text" :placeholder="$t('kanban.work_description') || 'Description (optional)'" class="worklog-input full" />
                            <div class="worklog-form-actions">
                                <button @click="saveWorkLog" :disabled="savingWorkLog" class="btn-primary btn-sm">
                                    <i class="fa-solid fa-check"></i> {{ $t('common.save') }}
                                </button>
                                <button @click="showWorkLogForm = false" class="btn-ghost btn-sm">{{ $t('common.cancel') }}</button>
                            </div>
                        </div>

                        <!-- Log entries -->
                        <div class="worklog-list" v-if="workLogs.length">
                            <div v-for="log in workLogs" :key="log.id" class="worklog-entry">
                                <div class="worklog-avatar">{{ (log.username || 'U')[0].toUpperCase() }}</div>
                                <div class="worklog-details">
                                    <span class="worklog-user">{{ log.username }}</span>
                                    <span class="worklog-desc">{{ log.description || $t('kanban.no_description') || 'No description' }}</span>
                                    <span class="worklog-date">{{ log.logged_at }}</span>
                                </div>
                                <span class="worklog-hours">{{ log.hours }}h</span>
                                <button v-if="canEdit" @click="deleteWorkLog(log.id)" class="btn-icon text-danger btn-sm">
                                    <i class="fa-solid fa-trash fa-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Sidebar (Jira style details) -->
                <div class="sidebar-column">
                    <div class="status-panel">
                        <select 
                            :value="task.status" 
                            @change="handleStatusChange($event.target.value)"
                            class="jira-status-select"
                            :class="task.status_details?.category?.toLowerCase()"
                            :disabled="!isAdmin && !isUpdatingStatus"
                        >
                            <option v-for="s in projectStatuses" :key="s.id" :value="s.id">
                                {{ s.name }}
                            </option>
                        </select>
                    </div>

                    <div class="details-section">
                        <div class="details-section-header-static">
                            <h3>{{ t('kanban.details') }}</h3>
                        </div>
                        
                        <div class="details-content">
                            <div class="attr-item">
                                <label><i class="fa-solid fa-list-check"></i> {{ $t('kanban.issue_type') }}</label>
                                <div class="attr-value">
                                    <select :value="task.issue_type" @change="updateField('issue_type', $event.target.value)" class="attr-select" :disabled="!isAdmin">
                                        <option value="TASK">{{ t('kanban.issue_types.task') }}</option>
                                        <option value="STORY">{{ t('kanban.issue_types.story') }}</option>
                                        <option value="BUG">{{ t('kanban.issue_types.bug') }}</option>
                                    </select>
                                </div>
                            </div>

                            <div class="attr-item">
                                <label><i class="fa-solid fa-user-check"></i> {{ $t('kanban.assignee') }}</label>
                                <div class="attr-value">
                                    <div class="dropdown-wrapper">
                                        <div class="modern-assignee-toggle" @click="isAdmin ? isAssigneeModalOpen = !isAssigneeModalOpen : null" :class="{ 'is-active': isAssigneeModalOpen, 'disabled-toggle': !isAdmin }">
                                            <div class="assignee-avatar" v-if="currentAssignee">
                                                {{ currentAssignee.username[0].toUpperCase() }}
                                            </div>
                                            <div class="assignee-avatar unassigned" v-else>
                                                <i class="fa-solid fa-user-plus"></i>
                                            </div>
                                            <span class="assignee-name">{{ currentAssignee?.username || $t('common.unassigned') }}</span>
                                            <i class="fa-solid fa-chevron-down toggle-icon" :class="{ rotated: isAssigneeModalOpen }"></i>
                                        </div>
                                        <!-- Assignee Dropdown -->
                                        <div v-if="isAssigneeModalOpen" class="inline-dropdown">
                                            <div class="popover-search">
                                                <i class="fa-solid fa-magnifying-glass"></i>
                                                <input v-model="assigneeSearch" :placeholder="$t('common.search_members')" ref="assigneeSearchInput" />
                                            </div>
                                            <div class="popover-list">
                                                <div class="popover-item" @click="updateField('assigned_to', null); isAssigneeModalOpen = false" :class="{ selected: !task.assigned_to }">
                                                    <div class="item-avatar unassigned"><i class="fa-solid fa-user-slash"></i></div>
                                                    <span>{{ $t('common.unassigned') }}</span>
                                                </div>
                                                <div v-for="user in filteredProjectMembers" :key="user.id"
                                                     class="popover-item"
                                                     @click="updateField('assigned_to', user.id); isAssigneeModalOpen = false"
                                                     :class="{ selected: task.assigned_to === user.id }">
                                                    <div class="item-avatar">{{ user.username[0].toUpperCase() }}</div>
                                                    <span>{{ user.username }}</span>
                                                    <i v-if="task.assigned_to === user.id" class="fa-solid fa-check text-primary"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="attr-item">
                                <label><i class="fa-solid fa-tags"></i> {{ $t('kanban.labels') }}</label>
                                <div class="attr-value">
                                    <div class="labels-container" v-if="task.labels_details && task.labels_details.length">
                                        <span v-for="label in task.labels_details" :key="label.id" class="label-lozenge" :style="{ backgroundColor: label.color + '20', color: label.color }">
                                            {{ label.name }}
                                        </span>
                                    </div>
                                    <span v-else class="empty-val">{{ $t('common.none') }}</span>
                                </div>
                            </div>

                            <!-- Fix Versions Integration -->
                            <div class="attr-item">
                                <label><i class="fa-solid fa-code-branch"></i> {{ $t('releases.fix_versions') || 'Fix Versions' }}</label>
                                <div class="attr-value">
                                    <div class="version-tags-container">
                                        <div v-for="vr in task.version_relations" :key="vr.id" class="version-tag-elite">
                                            <span>{{ vr.version_name }}</span>
                                            <button v-if="isAdmin" @click="removeVersionFromTask(vr.id)" class="btn-remove-tag" :title="t('common.remove')">
                                                <i class="fa-solid fa-xmark"></i>
                                            </button>
                                        </div>
                                        <select v-if="isAdmin" @change="addVersionToTask($event.target.value); $event.target.value = ''" class="attr-select-add-elite">
                                            <option value="">+ {{ $t('common.add') }}</option>
                                            <option v-for="v in projectVersions" :key="v.id" :value="v.id">{{ v.name }} ({{ v.status }})</option>
                                        </select>
                                        <span v-else-if="!task.version_relations?.length" class="empty-val">{{ $t('common.none') }}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="attr-item">
                                <label><i class="fa-solid fa-arrow-up-wide-short"></i> {{ $t('kanban.priority') }}</label>
                                <div class="attr-value">
                                    <select :value="task.priority" @change="updateField('priority', $event.target.value)" class="attr-select" :disabled="!canEdit">
                                        <option value="LOW">{{ t('kanban.priorities.low') }}</option>
                                        <option value="MEDIUM">{{ t('kanban.priorities.medium') }}</option>
                                        <option value="HIGH">{{ t('kanban.priorities.high') }}</option>
                                        <option value="URGENT">{{ t('kanban.priorities.urgent') }}</option>
                                    </select>
                                </div>
                            </div>

                            <div class="attr-item">
                                <label><i class="fa-solid fa-user-pen"></i> {{ $t('kanban.reporter') }}</label>
                                <div class="attr-value">
                                    <select :value="task.reporter || ''" @change="updateField('reporter', $event.target.value || null)" class="attr-select" :disabled="!isAdmin">
                                        <option v-for="user in projectMembers" :key="user.id" :value="user.id">{{ user.username }}</option>
                                    </select>
                                </div>
                            </div>

                            <div class="attr-item">
                                <label><i class="fa-solid fa-eye"></i> {{ $t('kanban.watchers') }}</label>
                                <div class="attr-value">
                                    <div class="dropdown-wrapper">
                                        <div class="modern-watchers-toggle" @click="isAdmin ? isWatchersModalOpen = !isWatchersModalOpen : null" :class="{ 'disabled-toggle': !isAdmin }">
                                            <div class="watchers-stack" v-if="watchersList.length">
                                                <div v-for="w in watchersList.slice(0, 3)" :key="w.id" class="watcher-avatar-mini" :title="w.username">
                                                    {{ w.username[0].toUpperCase() }}
                                                </div>
                                                <div v-if="watchersList.length > 3" class="watcher-avatar-mini more">
                                                    +{{ watchersList.length - 3 }}
                                                </div>
                                            </div>
                                            <div class="watchers-count">
                                                <i class="fa-solid fa-eye"></i>
                                                <span>{{ task.watching_count || 0 }} {{ $t('common.watching') }}</span>
                                            </div>
                                        </div>
                                        <!-- Watchers Dropdown -->
                                        <div v-if="isWatchersModalOpen" class="inline-dropdown">
                                            <div class="popover-search">
                                                <i class="fa-solid fa-magnifying-glass"></i>
                                                <input v-model="watcherSearch" :placeholder="$t('common.search_members')" />
                                            </div>
                                            <div class="popover-list">
                                                <div v-for="user in filteredWatcherMembers" :key="user.id"
                                                     class="popover-item"
                                                     @click="toggleWatcher(user.id)"
                                                     :class="{ selected: (task.watchers || []).includes(user.id) }">
                                                    <div class="item-avatar">{{ user.username[0].toUpperCase() }}</div>
                                                    <span>{{ user.username }}</span>
                                                    <i v-if="(task.watchers || []).includes(user.id)" class="fa-solid fa-check text-primary"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Dynamic Custom Fields -->
                            <div v-if="customFields.length > 0" class="custom-fields-divider">
                                <span>{{ $t('projects.custom_fields') }}</span>
                            </div>

                            <div v-for="field in customFields" :key="field.id" class="attr-item custom-field-item">
                                <label><i :class="getFieldIconClass(field.field_type)"></i> {{ field.name }}</label>
                                <div class="attr-value">
                                    <select v-if="field.field_type === 'CHOICE'" 
                                            :value="getTaskCustomFieldValue(field.id)" 
                                            @change="updateCustomField(field.id, $event.target.value)"
                                            class="attr-select"
                                            :disabled="!canEdit">
                                        <option value="">{{ $t('common.none') }}</option>
                                        <option v-for="opt in field.options" :key="opt.id" :value="opt.value">{{ opt.value }}</option>
                                    </select>

                                    <input v-else-if="field.field_type === 'DATE'" 
                                           :value="getTaskCustomFieldValue(field.id)" 
                                           type="datetime-local" 
                                           @change="updateCustomField(field.id, $event.target.value)"
                                           class="attr-input"
                                           :disabled="!canEdit" />

                                    <input v-else-if="field.field_type === 'NUMBER'" 
                                           :value="getTaskCustomFieldValue(field.id)" 
                                           type="number" 
                                           @blur="updateCustomField(field.id, $event.target.value)"
                                           @keyup.enter="$event.target.blur()"
                                           class="attr-input"
                                           :disabled="!canEdit" />
                                    
                                    <select v-else-if="field.field_type === 'USER'"
                                            :value="getTaskCustomFieldValue(field.id)"
                                            @change="updateCustomField(field.id, $event.target.value)"
                                            class="attr-select"
                                            :disabled="!canEdit">
                                        <option value="">{{ $t('common.unassigned') }}</option>
                                        <option v-for="u in projectMembers" :key="u.id" :value="u.id">{{ u.username }}</option>
                                    </select>

                                    <input v-else 
                                           :value="getTaskCustomFieldValue(field.id)" 
                                           type="text" 
                                           @blur="updateCustomField(field.id, $event.target.value)"
                                           @keyup.enter="$event.target.blur()"
                                           class="attr-input"
                                           :disabled="!canEdit" />
                                </div>
                            </div>

                            <div class="attr-item">
                                <span class="attr-label"><i class="fa-solid fa-layer-group"></i> {{ $t('kanban.epic') }}</span>
                                <div class="attr-value">
                                    <select :value="task.epic" @change="updateField('epic', $event.target.value || null)" class="attr-select" :disabled="!isAdmin">
                                        <option :value="null">{{ $t('kanban.no_epic') }}</option>
                                        <option v-for="e in epics" :key="e.id" :value="e.id">
                                            {{ e.name }}
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div class="attr-item">
                                <label><i class="fa-solid fa-star"></i> {{ $t('kanban.story_points') || 'Story Points' }}</label>
                                <div class="attr-value">
                                    <input type="number" :value="task.story_points" @change="updateStoryPoints($event.target.value)" class="attr-input" :disabled="!isAdmin" />
                                </div>
                            </div>

                            <div class="attr-item">
                                <label><i class="fa-solid fa-running"></i> {{ $t('kanban.sprint') || 'Sprint' }}</label>
                                <div class="attr-value">
                                    <select :value="task.sprint" @change="updateSprint($event.target.value)" class="attr-select" :disabled="!isAdmin">
                                        <option :value="null">{{ $t('common.none') || 'None' }}</option>
                                        <option v-for="s in sprints" :key="s.id" :value="s.id">{{ s.name }}</option>
                                    </select>
                                </div>
                            </div>

                            <div class="attr-item">
                                <label><i class="fa-solid fa-calendar-day"></i> {{ $t('kanban.start_date') || 'Start Date' }}</label>
                                <div class="attr-value">
                                    <input type="date" :value="task.start_date ? task.start_date.split('T')[0] : ''" @change="updateField('start_date', $event.target.value || null)" class="attr-input" :disabled="!isAdmin" />
                                </div>
                            </div>

                            <div class="attr-item">
                                <label><i class="fa-solid fa-calendar-check"></i> {{ $t('kanban.end_date') || 'End Date' }}</label>
                                <div class="attr-value">
                                    <input type="date" :value="task.end_date ? task.end_date.split('T')[0] : ''" @change="updateField('end_date', $event.target.value || null)" class="attr-input" :disabled="!isAdmin" />
                                </div>
                            </div>

                            <div class="attr-item">
                                <label><i class="fa-solid fa-stopwatch"></i> {{ $t('kanban.time_spent') || 'Time Spent (hrs)' }}</label>
                                <div class="attr-value">
                                    <input type="number" step="0.5" min="0" :value="task.time_spent" @change="updateField('time_spent', parseFloat($event.target.value) || 0)" class="attr-input" :disabled="!canEdit" />
                                </div>
                            </div>

                            <div class="attr-item">
                                <label><i class="fa-solid fa-hourglass-start"></i> {{ $t('kanban.time_estimate') || 'Estimate (hrs)' }}</label>
                                <div class="attr-value">
                                    <input type="number" step="0.5" min="0" :value="task.time_estimate" @change="updateField('time_estimate', parseFloat($event.target.value) || 0)" class="attr-input" :disabled="!canEdit" />
                                </div>
                            </div>

                            <div class="attr-item">
                                <label><i class="fa-solid fa-server"></i> {{ $t('kanban.environment') || 'Environment' }}</label>
                                <div class="attr-value">
                                    <input type="text" :value="task.environment" @blur="updateField('environment', $event.target.value)" class="attr-input" :placeholder="$t('kanban.environment_placeholder') || 'e.g. Production'" :disabled="!isAdmin" />
                                </div>
                            </div>

                            <!-- Custom Fields Section for Details -->
                            <div v-for="field in customFields" :key="'cf-'+field.id" class="attr-item">
                                <label>
                                    <i :class="getFieldIconClass(field.field_type)"></i> 
                                    {{ field.name }} {{ field.required ? '*' : '' }}
                                </label>
                                <div class="attr-value">
                                    <!-- Choice Field -->
                                    <select v-if="field.field_type === 'CHOICE'" :value="getTaskCustomFieldValue(field.id)" @change="updateCustomField(field.id, $event.target.value)" class="attr-select" :disabled="!canEdit">
                                        <option value="">{{ $t('common.none') }}</option>
                                        <option v-for="opt in field.options" :key="opt.id" :value="opt.value">{{ opt.value }}</option>
                                    </select>

                                    <!-- Date Field -->
                                    <input v-else-if="field.field_type === 'DATE'" type="datetime-local" :value="getTaskCustomFieldValue(field.id)" @change="updateCustomField(field.id, $event.target.value)" class="attr-input" :disabled="!canEdit" />

                                    <!-- Number Field -->
                                    <input v-else-if="field.field_type === 'NUMBER'" type="number" :value="getTaskCustomFieldValue(field.id)" @blur="updateCustomField(field.id, $event.target.value)" class="attr-input" :disabled="!canEdit" />

                                    <!-- User Field -->
                                    <select v-else-if="field.field_type === 'USER'" :value="getTaskCustomFieldValue(field.id)" @change="updateCustomField(field.id, $event.target.value)" class="attr-select" :disabled="!canEdit">
                                         <option value="">{{ $t('common.unassigned') }}</option>
                                         <option v-for="user in projectMembers" :key="user.id" :value="user.id">{{ user.username }}</option>
                                    </select>

                                    <!-- Text Field (Default) -->
                                    <input v-else type="text" :value="getTaskCustomFieldValue(field.id)" @blur="updateCustomField(field.id, $event.target.value)" class="attr-input" :disabled="!canEdit" />
                                </div>
                            </div>

                            <div class="attr-item" v-if="task.sentry_error_id">
                                <label>Sentry Error</label>
                                <div class="attr-value">
                                    <button class="btn-secondary btn-sm" @click="$emit('view-error', task.sentry_error_id)">
                                        <i class="fa-solid fa-bug"></i> View Event
                                    </button>
                                </div>
                            </div>

                            <div class="attr-item">
                                <label>{{ $t('kanban.created') || 'Created' }}</label>
                                <div class="attr-value text-muted">{{ formatDate(task.created_at) }}</div>
                            </div>

                            <div class="attr-item">
                                <label>{{ $t('kanban.updated') || 'Updated' }}</label>
                                <div class="attr-value text-muted">{{ formatDate(task.updated_at) }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="showDeleteConfirm" class="confirm-backdrop" @click.self="showDeleteConfirm = false">
            <div class="confirm-card glass-card">
                <div class="confirm-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3>{{ $t('common.delete_confirm') || 'Delete Task?' }}</h3>
                <p>{{ $t('common.delete_warning') || 'Are you sure you want to delete this task? This action cannot be undone.' }}</p>
                <div class="confirm-actions">
                    <button @click="showDeleteConfirm = false" class="btn-ghost">{{ $t('common.cancel') || 'Cancel' }}</button>
                    <button @click="confirmDelete" class="btn-danger">{{ $t('common.delete') || 'Delete' }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ============================================================
   TASK DETAIL MODAL — Modern Premium Redesign
   Uses CSS variables: --primary, --bg-card, --border-color,
   --text-main, --text-muted, --bg-hover, --primary-bg,
   --radius-md, --radius-sm, --radius-lg
   ============================================================ */

/* ── Animations ─────────────────────────────────────────────── */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px) scale(0.99); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.94) translateY(8px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);   }
}
@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1);    }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Base Button Reset ──────────────────────────────────────── */
.btn-primary, .btn-secondary, .btn-ghost, .btn-text, .btn-danger {
    font-family: inherit;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    outline: none;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.01em;
    white-space: nowrap;
}

.btn-primary {
    background: var(--primary);
    color: #fff;
    border: none;
    padding: 8px 18px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);
}
.btn-primary:hover {
    filter: brightness(1.08);
    box-shadow: 0 4px 14px rgba(0,82,204,0.28);
    transform: translateY(-1px);
}
.btn-primary:active { transform: translateY(0); filter: brightness(0.97); }

.btn-secondary {
    background: var(--bg-hover);
    color: var(--text-main);
    border: 1px solid var(--border-color);
    padding: 8px 18px;
}
.btn-secondary:hover {
    background: var(--bg-card);
    border-color: var(--primary);
    color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-bg);
}

.btn-text {
    background: transparent;
    color: var(--text-muted);
    border: none;
    padding: 6px 12px;
    font-size: 13px;
}
.btn-text:hover {
    background: var(--bg-hover);
    color: var(--text-main);
}

.btn-ghost {
    background: transparent;
    color: var(--text-main);
    border: 1px solid var(--border-color);
    padding: 8px 18px;
}
.btn-ghost:hover {
    background: var(--bg-hover);
    border-color: var(--primary);
    color: var(--primary);
}

.btn-danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: #fff;
    border: none;
    padding: 8px 18px;
    box-shadow: 0 1px 3px rgba(239,68,68,0.2);
}
.btn-danger:hover {
    filter: brightness(1.08);
    box-shadow: 0 4px 14px rgba(239,68,68,0.35);
    transform: translateY(-1px);
}
.btn-danger:active { transform: translateY(0); }

.btn-sm {
    padding: 5px 12px;
    font-size: 12px;
}

.btn-icon {
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-muted);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s;
}
.btn-icon:hover {
    background: var(--bg-hover);
    border-color: var(--border-color);
    color: var(--text-main);
}

/* ── Modal Overlay & Container ──────────────────────────────── */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(9, 30, 66, 0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 4vh;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
}

.modal-content {
    background: var(--bg-card);
    width: 96%;
    max-width: 1080px;
    height: 91vh;
    border-radius: var(--radius-lg, 16px);
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow:
        0 0 0 1px var(--border-color),
        0 8px 24px rgba(0,0,0,0.08),
        0 24px 64px rgba(0,0,0,0.14);
    animation: slideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
}

/* ── Modal Header ───────────────────────────────────────────── */
.modal-header {
    padding: 20px 28px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-card);
    position: relative;
}

/* ── Close Button ───────────────────────────────────────────── */
.close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    font-size: 18px;
    color: var(--text-muted);
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s;
    line-height: 1;
}

[dir="rtl"] .close-btn {
    right: auto;
    left: 16px;
}

.close-btn:hover {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #dc2626;
    transform: scale(1.08);
}
[data-theme="dark"] .close-btn:hover {
    background: rgba(239,68,68,0.15);
    border-color: rgba(239,68,68,0.3);
    color: #f87171;
}

/* ── Breadcrumbs ────────────────────────────────────────────── */
.task-breadcrumbs {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
}

.project-icon-sm {
    width: 14px;
    height: 14px;
    border-radius: 3px;
}

.breadcrumb-item {
    color: var(--text-muted);
    transition: color 0.15s;
}
.breadcrumb-item:hover { color: var(--primary); cursor: pointer; }

.breadcrumb-separator {
    color: var(--border-color);
    font-size: 10px;
}

.task-key {
    text-transform: uppercase;
    font-weight: 700;
    color: var(--primary);
    font-size: 12px;
    letter-spacing: 0.04em;
    background: var(--primary-bg);
    padding: 2px 7px;
    border-radius: 4px;
}

.task-type-header {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    margin-inline-end: 6px;
}

/* ── Title Area ─────────────────────────────────────────────── */
.header-main-actions {
    margin: 2px 0;
    padding-inline-end: 44px;
}

[dir="rtl"] .header-main-actions {
    padding-inline-end: 0;
    padding-inline-start: 44px;
}

.task-title-display {
    font-size: 26px;
    font-weight: 700;
    color: var(--text-main);
    margin: 0;
    padding: 5px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    line-height: 1.3;
    transition: background 0.18s;
    margin-inline-start: -10px;
    letter-spacing: -0.01em;
}

[dir="rtl"] .task-title-display {
    margin-inline-start: -10px;
}

.task-title-display:hover {
    background: var(--bg-hover);
}

.title-input-edit {
    font-size: 26px;
    font-weight: 700;
    color: var(--text-main);
    width: 100%;
    border: 2px solid var(--primary);
    border-radius: var(--radius-sm);
    padding: 4px 10px;
    outline: none;
    background: var(--bg-card);
    box-shadow: 0 0 0 4px var(--primary-bg);
    letter-spacing: -0.01em;
    transition: box-shadow 0.18s;
}

/* ── Toolbar ────────────────────────────────────────────────── */
.header-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 2px;
}

.toolbar-left, .toolbar-right {
    display: flex;
    gap: 6px;
    align-items: center;
}

.btn-toolbar {
    background: transparent;
    border: 1px solid transparent;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.18s;
}

.btn-toolbar:hover {
    background: var(--bg-hover);
    border-color: var(--border-color);
    color: var(--text-main);
}

/* ── Body Layout ────────────────────────────────────────────── */
.modal-body.jira-layout {
    flex: 1;
    display: flex;
    gap: 0;
    padding: 0;
    overflow: hidden;
    min-height: 0;
}

.main-column {
    flex: 1.8;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: 28px 32px;
    border-inline-end: 1px solid var(--border-color);
    overflow-y: auto;
    align-self: stretch;
}

.sidebar-column {
    flex: 1;
    min-width: 280px;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 20px;
    background: var(--bg-hover);
    overflow-y: auto;
    align-self: stretch;
}

/* ── Sections ───────────────────────────────────────────────── */
.section {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.section h3 {
    font-size: 13px;
    font-weight: 700;
    margin: 0;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 7px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.section h3 i {
    color: var(--text-muted);
    font-size: 12px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* ── Markdown Preview & Editor ──────────────────────────────── */
.markdown-preview {
    font-size: 15px;
    line-height: 1.7;
    color: var(--text-main);
    padding: 0;
    min-height: 40px;
}

.editor-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
}

.editor-wrapper textarea {
    width: 100%;
    min-height: 160px;
    padding: 14px 16px;
    border: 1px solid var(--border-color);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    background: var(--bg-card);
    color: var(--text-main);
    font-family: inherit;
    font-size: 14px;
    margin-bottom: 0;
    outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
    line-height: 1.6;
    resize: vertical;
}

.editor-wrapper textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-bg);
}

/* ── Status Panel ───────────────────────────────────────────── */
.status-panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
    margin-bottom: 12px;
}

.jira-status-select {
    width: 100%;
    appearance: none;
    padding: 10px 14px;
    border-radius: var(--radius-md);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.05em;
    border: 1px solid var(--border-color);
    cursor: pointer;
    background-color: var(--bg-hover);
    color: var(--text-main);
    transition: all 0.18s;
    background-image: url('data:image/svg+xml;utf8,<svg fill="%236b7280" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>');
    background-repeat: no-repeat;
    background-position: calc(100% - 10px) center;
    padding-inline-end: 34px;
}

[dir="rtl"] .jira-status-select {
    background-position: 10px center;
    padding-inline-start: 34px;
    padding-inline-end: 14px;
}

.jira-status-select:hover {
    border-color: var(--primary);
    background-color: var(--bg-card);
}

.jira-status-select:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-bg);
    outline: none;
}

.jira-status-select.todo    { border-inline-start: 3px solid #94a3b8; }
.jira-status-select.inprogress { border-inline-start: 3px solid #3b82f6; }
.jira-status-select.done    { border-inline-start: 3px solid #22c55e; }

/* ── Details Section (Sidebar) ──────────────────────────────── */
.details-section {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    overflow: hidden;
    background: var(--bg-card);
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
}

.details-section-header-static {
    background: var(--bg-hover);
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}

.details-section-header-static h3 {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
}

.details-content {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: var(--bg-card);
    overflow-y: auto;
    flex: 1;
    min-height: 0;
}

/* ── Attribute Items ────────────────────────────────────────── */
.attr-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.attr-item label {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.attr-value {
    color: var(--text-main);
    display: flex;
    align-items: center;
    min-height: 32px;
    font-size: 13px;
}

.attr-select, .attr-input {
    width: 100%;
    border: 1px solid var(--border-color);
    background: var(--bg-hover);
    color: var(--text-main);
    font-size: 13px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.18s;
    outline: none;
    appearance: none;
    background-image: url('data:image/svg+xml;utf8,<svg fill="%236b7280" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>');
    background-repeat: no-repeat;
    background-position: calc(100% - 8px) center;
    padding-inline-end: 28px;
}

.attr-input {
    background-image: none;
    padding-inline-end: 10px;
}

[dir="rtl"] .attr-select {
    background-position: 8px center;
    padding-inline-start: 28px;
    padding-inline-end: 10px;
}

[data-theme="dark"] .attr-select {
    background-image: url('data:image/svg+xml;utf8,<svg fill="%239ca3af" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>');
}

.attr-select:hover, .attr-input:hover {
    background-color: var(--bg-card);
    border-color: var(--primary);
}

.attr-select:focus, .attr-input:focus {
    border-color: var(--primary);
    background-color: var(--bg-card);
    box-shadow: 0 0 0 3px var(--primary-bg);
    outline: none;
}

.empty-val {
    color: var(--text-muted);
    font-style: italic;
    font-size: 13px;
    padding: 0 4px;
}

/* ── Labels ─────────────────────────────────────────────────── */
.label-lozenge, .epic-lozenge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 20px;
    margin-inline-end: 5px;
    display: inline-block;
    margin-bottom: 4px;
    letter-spacing: 0.02em;
}

.labels-container {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
}

/* ── Attachments ────────────────────────────────────────────── */
.attachments-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
}

.attachment-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    padding: 9px 11px;
    border-radius: var(--radius-md);
    transition: all 0.18s;
    gap: 8px;
}

.attachment-card:hover {
    border-color: var(--primary);
    box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    background: var(--bg-card);
}

.attachment-link {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
    color: var(--text-main);
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
}

.attachment-link .filename {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.upload-zone {
    border: 2px dashed var(--border-color);
    border-radius: var(--radius-md);
    padding: 20px;
    text-align: center;
    color: var(--text-muted);
    transition: all 0.18s;
    background: transparent;
    cursor: pointer;
}

.upload-zone:hover {
    border-color: var(--primary);
    background: var(--primary-bg);
    color: var(--primary);
}

.upload-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 13px;
}

.upload-label i { font-size: 22px; }

.file-input { display: none; }

/* ── Comments ───────────────────────────────────────────────── */
.comments-list {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.comment-item {
    display: flex;
    gap: 12px;
    padding: 16px 0;
    border-bottom: 1px solid var(--border-color);
}
.comment-item:last-child { border-bottom: none; }

.comment-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
}

.comment-content-wrapper {
    flex: 1;
    min-width: 0;
}

.comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}

.author { font-weight: 700; font-size: 13px; color: var(--text-main); }
.date   { color: var(--text-muted); font-size: 11px; }

.comment-body {
    font-size: 14px;
    line-height: 1.65;
    color: var(--text-main);
}

/* ── Add Comment ────────────────────────────────────────────── */
.add-comment {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.markdown-toolbar {
    display: flex;
    gap: 2px;
    padding: 6px 10px;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    border-bottom: none;
}

.markdown-toolbar button {
    background: transparent;
    border: none;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.markdown-toolbar button:hover {
    background: var(--bg-card);
    color: var(--text-main);
}

.add-comment textarea {
    width: 100%;
    padding: 14px 16px;
    border: 1px solid var(--border-color);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    background: var(--bg-card);
    color: var(--text-main);
    font-size: 14px;
    outline: none;
    resize: vertical;
    min-height: 90px;
    transition: border-color 0.18s, box-shadow 0.18s;
    font-family: inherit;
    line-height: 1.6;
}

.add-comment textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-bg);
}

.add-comment .btn-secondary {
    align-self: flex-end;
    margin-top: 10px;
}

/* ── Subtasks ────────────────────────────────────────────────── */
.subtask-list {
    list-style: none;
    padding: 0;
    margin: 10px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.subtask-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    transition: all 0.18s;
}

.subtask-item:hover {
    border-color: var(--primary);
    background: var(--bg-card);
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.subtask-item input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--primary);
    border-radius: 4px;
    flex-shrink: 0;
}

.subtask-item span {
    font-size: 13px;
    color: var(--text-main);
    user-select: none;
    flex: 1;
}

.subtask-item span.completed {
    text-decoration: line-through;
    color: var(--text-muted);
}

.progress-bar {
    height: 6px;
    background: var(--bg-hover);
    border-radius: 3px;
    overflow: hidden;
    margin-top: 6px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary) 0%, #7c3aed 100%);
    border-radius: 3px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-text {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 600;
    display: inline-block;
    margin-top: 4px;
}

/* ── Issue Links ─────────────────────────────────────────────── */
.create-link-form {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
    align-items: stretch;
    flex-wrap: wrap;
}

.link-type-select, .link-target-input {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 9px 12px;
    font-size: 13px;
    background: var(--bg-card);
    color: var(--text-main);
    outline: none;
    transition: all 0.18s;
    font-family: inherit;
}

.link-type-select {
    flex: 1.5;
    cursor: pointer;
    appearance: none;
}

.link-target-input {
    flex: 1;
    min-width: 120px;
}

.link-type-select:focus, .link-target-input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-bg);
}

.links-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.issue-link-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-hover);
    transition: all 0.18s;
    gap: 10px;
}

.issue-link-card:hover {
    border-color: var(--primary);
    background: var(--bg-card);
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.link-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
}

.link-target {
    font-weight: 600;
    color: var(--primary);
    cursor: pointer;
    font-size: 13px;
    flex: 1;
}

.link-target:hover { text-decoration: underline; }

/* ── Modern Assignee UI ──────────────────────────────────────── */
.modern-assignee-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.18s;
    min-width: 180px;
    position: relative;
    user-select: none;
}

.modern-assignee-toggle:hover {
    background: var(--bg-card);
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-bg);
}

.modern-assignee-toggle.is-active {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-bg);
}

.disabled-toggle {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
}

.assignee-avatar {
    width: 22px;
    height: 22px;
    background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%);
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
}

.assignee-avatar.unassigned {
    background: var(--bg-hover);
    color: var(--text-muted);
    border: 1px dashed var(--border-color);
}

.assignee-name {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.toggle-icon {
    font-size: 9px;
    color: var(--text-muted);
    transition: transform 0.18s;
}

.modern-assignee-toggle.is-active .toggle-icon {
    transform: rotate(180deg);
}

/* ── Assignee / Watchers Dropdown ───────────────────────────── */
.dropdown-wrapper {
    position: relative;
    width: 100%;
}

.inline-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    inset-inline-start: 0;
    width: 240px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 16px 40px rgba(0,0,0,0.1);
    z-index: 500;
    overflow: hidden;
    animation: scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-header-mini {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    padding: 0 2px;
}

.modal-header-mini span {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-main);
}

.close-mini {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    width: 26px;
    height: 26px;
    border-radius: 50%;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s;
    font-size: 14px;
}

.close-mini:hover {
    background: var(--bg-hover);
    color: var(--text-main);
    border-color: var(--primary);
}

.popover-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    background: var(--bg-hover);
    border-radius: var(--radius-md);
    margin-bottom: 10px;
    border: 1px solid transparent;
    transition: all 0.18s;
}

.popover-search:focus-within {
    border-color: var(--primary);
    background: var(--bg-card);
    box-shadow: 0 0 0 3px var(--primary-bg);
}

.popover-search i {
    font-size: 12px;
    color: var(--text-muted);
}

.popover-search input {
    background: transparent;
    border: none;
    outline: none;
    font-size: 13px;
    width: 100%;
    color: var(--text-main);
}

.popover-list {
    max-height: 240px;
    overflow-y: auto;
    padding-inline-end: 2px;
}

.popover-list::-webkit-scrollbar { width: 4px; }
.popover-list::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
}

.popover-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.15s;
    margin-bottom: 2px;
    color: var(--text-main);
}

.popover-item:hover { background: var(--bg-hover); }

.popover-item.selected {
    background: var(--primary-bg);
}

.popover-item.selected span {
    color: var(--primary);
    font-weight: 600;
}

.popover-item .item-avatar {
    width: 30px;
    height: 30px;
    background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%);
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
}

.popover-item .item-avatar.unassigned {
    background: var(--bg-hover);
    color: var(--text-muted);
    border: 1px dashed var(--border-color);
}

.popover-item span {
    font-size: 13px;
    flex: 1;
}

.popover-item .selected-check {
    color: var(--primary);
    font-size: 12px;
}

/* ── Scrollbar ──────────────────────────────────────────────── */
.modal-body.jira-layout::-webkit-scrollbar { width: 6px; }
.modal-body.jira-layout::-webkit-scrollbar-track { background: transparent; }
.modal-body.jira-layout::-webkit-scrollbar-thumb {
    background-color: var(--border-color);
    border-radius: 3px;
}
.modal-body.jira-layout::-webkit-scrollbar-thumb:hover {
    background-color: var(--text-muted);
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
    .modal-body.jira-layout {
        flex-direction: column;
        gap: 0;
        padding: 0;
    }
    .main-column {
        padding: 20px 16px;
        border-inline-end: none;
        border-bottom: 1px solid var(--border-color);
    }
    .sidebar-column {
        min-width: 100%;
        max-width: 100%;
        padding: 16px;
    }
    .modal-content {
        width: 100%;
        height: 100dvh;
        border-radius: 0;
        max-width: 100%;
    }
    .modal-overlay {
        padding-top: 0;
        align-items: flex-start;
    }
    .close-btn {
        top: 12px;
        right: 12px;
    }
    [dir="rtl"] .close-btn {
        right: auto;
        left: 12px;
    }
    .create-link-form { flex-direction: column; }
    .task-title-display { font-size: 20px; }
    .title-input-edit  { font-size: 20px; }
}

/* ── Watchers ────────────────────────────────────────────────── */
.modern-watchers-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 10px;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.18s;
    user-select: none;
    max-width: fit-content;
}

.modern-watchers-toggle:hover {
    background: var(--bg-card);
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-bg);
}

.watchers-stack {
    display: flex;
    flex-direction: row-reverse;
}

.watcher-avatar-mini {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 700;
    border: 2px solid var(--bg-card);
    margin-inline-start: -7px;
}

.watcher-avatar-mini.more {
    background: var(--bg-hover);
    color: var(--text-muted);
    border-color: var(--border-color);
    z-index: 1;
}

.watcher-avatar-mini.empty {
    background: var(--bg-hover);
    color: var(--text-muted);
    border: 1px dashed var(--border-color);
}

.watchers-count {
    font-size: 12px;
    color: var(--text-main);
    font-weight: 500;
}

/* ── Delete Confirmation Modal ───────────────────────────────── */
.confirm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease-out;
}

.confirm-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 32px 28px;
    text-align: center;
    width: 380px;
    max-width: 92vw;
    box-shadow:
        0 0 0 1px var(--border-color),
        0 8px 24px rgba(0,0,0,0.1),
        0 24px 48px rgba(0,0,0,0.15);
    animation: scaleIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-theme="dark"] .confirm-card {
    background: #1e293b;
    border-color: rgba(255,255,255,0.08);
    box-shadow:
        0 0 0 1px rgba(255,255,255,0.06),
        0 24px 48px rgba(0,0,0,0.5);
}

.confirm-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    margin: 0 auto 18px;
}

.confirm-card h3 {
    margin: 0 0 10px;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-main);
}

.confirm-card p {
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.55;
    margin-bottom: 24px;
}

.confirm-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
}

.confirm-actions button { min-width: 110px; }

/* ── Version Tags ────────────────────────────────────────────── */
.version-tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    width: 100%;
}

.version-tag-elite {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--primary-bg);
    color: var(--primary);
    padding: 3px 9px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid rgba(0, 82, 204, 0.18);
    transition: all 0.18s;
    letter-spacing: 0.02em;
}

.btn-remove-tag {
    background: transparent;
    border: none;
    color: var(--primary);
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    opacity: 0.55;
    transition: opacity 0.18s;
    line-height: 1;
}

.btn-remove-tag:hover { opacity: 1; }

.attr-select-add-elite {
    border: 1px dashed var(--border-color);
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 20px;
    cursor: pointer;
    outline: none;
    transition: all 0.18s;
    appearance: none;
    max-width: 110px;
}

.attr-select-add-elite:hover {
    border-color: var(--primary);
    color: var(--primary);
    background: var(--primary-bg);
}

/* ── Subtask Rich Form ───────────────────────────────────────── */
.subtask-item-rich { align-items: flex-start; gap: 10px; }
.subtask-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.subtask-meta { display: flex; flex-wrap: wrap; gap: 5px; }
.subtask-badge {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 20px;
    background: var(--bg-hover);
    color: var(--text-muted);
    font-weight: 600;
    border: 1px solid var(--border-color);
}
.subtask-badge.priority-high   { background: rgba(239,68,68,.1);  color: #ef4444; border-color: rgba(239,68,68,.2); }
.subtask-badge.priority-medium { background: rgba(245,158,11,.1); color: #f59e0b; border-color: rgba(245,158,11,.2); }
.subtask-badge.priority-low    { background: rgba(16,185,129,.1); color: #10b981; border-color: rgba(16,185,129,.2); }
.subtask-badge.assignee        { background: var(--primary-bg);   color: var(--primary); border-color: rgba(0,82,204,.15); }
.subtask-badge.due             { background: var(--bg-hover);     color: var(--text-muted); }

.btn-add-subtask {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: 1px dashed var(--border-color);
    color: var(--text-muted);
    padding: 8px 14px;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 13px;
    margin-top: 8px;
    width: 100%;
    justify-content: center;
    transition: all 0.18s;
    font-family: inherit;
}
.btn-add-subtask:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-bg); }

.subtask-form {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 14px;
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.subtask-form-row { display: flex; gap: 8px; flex-wrap: wrap; }
.subtask-input {
    flex: 1;
    min-width: 120px;
    padding: 8px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-main);
    font-size: 13px;
    outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
    font-family: inherit;
}
.subtask-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-bg); }
.subtask-select {
    flex: 1;
    min-width: 100px;
    padding: 8px 10px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-main);
    font-size: 13px;
    outline: none;
    cursor: pointer;
    font-family: inherit;
}
.subtask-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-bg); }
.subtask-form-actions { display: flex; gap: 8px; }

/* ── Comment Threading & @mention ───────────────────────────── */
.btn-reply-inline {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    margin-inline-start: 6px;
    transition: all 0.15s;
    font-family: inherit;
}
.btn-reply-inline:hover { color: var(--primary); background: var(--primary-bg); }

.replies-list {
    margin-top: 10px;
    padding-inline-start: 14px;
    border-inline-start: 2px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.reply-item {
    background: var(--bg-hover);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    border: 1px solid var(--border-color);
}

.reply-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-muted);
    background: var(--bg-hover);
    padding: 5px 10px;
    border-radius: var(--radius-sm);
    margin-bottom: 6px;
    border: 1px solid var(--border-color);
}

.btn-cancel-reply {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    margin-inline-start: auto;
    font-size: 13px;
    transition: color 0.15s;
}
.btn-cancel-reply:hover { color: var(--text-main); }

.mention-wrapper { position: relative; }

.mention-dropdown {
    position: absolute;
    bottom: 100%;
    left: 0;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    list-style: none;
    padding: 4px 0;
    margin: 0 0 4px;
    min-width: 180px;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.mention-dropdown li {
    padding: 8px 14px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.15s;
}

.mention-dropdown li:hover,
.mention-dropdown li.active {
    background: var(--primary-bg);
    color: var(--primary);
}

/* ── Work Log ────────────────────────────────────────────────── */
.worklog-section .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.time-summary { margin-bottom: 12px; }

.time-bar-wrap {
    height: 6px;
    background: var(--bg-hover);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 5px;
    border: 1px solid var(--border-color);
}

.time-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary) 0%, #7c3aed 100%);
    border-radius: 3px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.time-label { font-size: 11px; color: var(--text-muted); font-weight: 500; }

.worklog-form {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 14px;
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.worklog-form-row { display: flex; gap: 8px; }

.worklog-input {
    flex: 1;
    padding: 8px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-main);
    font-size: 13px;
    outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
    font-family: inherit;
}
.worklog-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-bg); }
.worklog-input.full { width: 100%; }

.worklog-form-actions { display: flex; gap: 8px; }

.worklog-list { display: flex; flex-direction: column; gap: 6px; }

.worklog-entry {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--bg-hover);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    transition: border-color 0.18s;
}
.worklog-entry:hover { border-color: var(--primary); }

.worklog-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--primary-bg);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
    border: 1px solid rgba(0,82,204,0.15);
}

.worklog-details { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.worklog-user  { font-size: 13px; font-weight: 600; color: var(--text-main); }
.worklog-desc  { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.worklog-date  { font-size: 11px; color: var(--text-muted); }
.worklog-hours { font-size: 13px; font-weight: 700; color: var(--primary); white-space: nowrap; }

/* ── Custom Fields Divider ───────────────────────────────────── */
.custom-fields-divider {
    height: 1px;
    background: var(--border-color);
    margin: 8px 0;
    opacity: 0.6;
}

/* ── Glass Card ──────────────────────────────────────────────── */
.glass-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    backdrop-filter: blur(8px);
}

/* ── Utility Text Colors ─────────────────────────────────────── */
.text-danger  { color: #ef4444; }
.text-success { color: #22c55e; }
.text-primary { color: var(--primary); }
.text-muted   { color: var(--text-muted); }

/* ── Dark Theme Overrides ────────────────────────────────────── */
[data-theme="dark"] .modal-content {
    box-shadow:
        0 0 0 1px rgba(255,255,255,0.06),
        0 8px 24px rgba(0,0,0,0.3),
        0 24px 64px rgba(0,0,0,0.4);
}

[data-theme="dark"] .details-section {
    background: rgba(255,255,255,0.02);
}

[data-theme="dark"] .sidebar-column {
    background: rgba(255,255,255,0.02);
}

[data-theme="dark"] .subtask-item:hover,
[data-theme="dark"] .attachment-card:hover,
[data-theme="dark"] .issue-link-card:hover,
[data-theme="dark"] .worklog-entry:hover {
    background: rgba(255,255,255,0.04);
}

[data-theme="dark"] .version-tag-elite {
    border-color: rgba(99,102,241,0.25);
}

/* ── RTL Overrides ───────────────────────────────────────────── */
[dir="rtl"] .label-lozenge,
[dir="rtl"] .epic-lozenge {
    margin-inline-end: 0;
    margin-inline-start: 5px;
}

[dir="rtl"] .replies-list {
    padding-inline-start: 0;
    padding-inline-end: 14px;
    border-inline-start: none;
    border-inline-end: 2px solid var(--border-color);
}

[dir="rtl"] .btn-reply-inline {
    margin-inline-start: 0;
    margin-inline-end: 6px;
}

[dir="rtl"] .btn-cancel-reply {
    margin-inline-start: 0;
    margin-inline-end: auto;
}

[dir="rtl"] .watchers-stack {
    flex-direction: row;
}

[dir="rtl"] .watcher-avatar-mini {
    margin-inline-start: 0;
    margin-inline-end: -7px;
}
</style>
