<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from '@/plugins/axios';
import { usePermissions } from '@/composables/usePermissions';
import {
  Chart as ChartJS, Title, Tooltip, Legend, BarElement,
  CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler
} from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'vue-chartjs';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement, Filler);

const props = defineProps(['projectId', 'projectName']);
const router = useRouter();
const { t } = useI18n();
const { canViewReports } = usePermissions();

const activeReport = ref('nr_status');

const reportTypes = computed(() => [
    { id: 'nr_status',        name: t('reports.status_distribution'),     icon: 'fa-circle-half-stroke', group: 'numerical' },
    { id: 'nr_priority',      name: t('reports.priority_distribution'),   icon: 'fa-angles-up',          group: 'numerical' },
    { id: 'nr_workload',      name: t('reports.workload'),                 icon: 'fa-users',              group: 'numerical' },
    { id: 'nr_epics',         name: t('reports.epic_progress_summary'),   icon: 'fa-layer-group',        group: 'numerical' },
    { id: 'nr_sprints',       name: t('reports.sprint_summary'),          icon: 'fa-stopwatch',          group: 'numerical' },
    { id: 'burndown',         name: t('reports.sprint_burndown'),         icon: 'fa-fire',               group: 'charts' },
    { id: 'burnup',           name: t('reports.sprint_burnup'),           icon: 'fa-arrow-trend-up',     group: 'charts' },
    { id: 'velocity',         name: t('reports.sprint_velocity'),         icon: 'fa-bolt',               group: 'charts' },
    { id: 'workload',         name: t('reports.assignee_workload'),       icon: 'fa-chart-bar',          group: 'charts' },
    { id: 'priority',         name: t('reports.priority_distribution'),   icon: 'fa-chart-pie',          group: 'charts' },
    { id: 'issue_type',       name: t('reports.issue_type_distribution'), icon: 'fa-shapes',             group: 'charts' },
    { id: 'epic_progress',    name: t('reports.epic_progress'),           icon: 'fa-layer-group',        group: 'charts' },
    { id: 'time_tracking',    name: t('reports.time_tracking'),           icon: 'fa-clock',              group: 'charts' },
    { id: 'created_resolved', name: t('reports.created_vs_resolved'),     icon: 'fa-chart-area',         group: 'charts' }
]);

// Which filters each report needs
const reportFilterConfig = {
    nr_status:        ['startDate', 'endDate', 'assignee', 'sprint', 'epic'],
    nr_priority:      ['startDate', 'endDate', 'assignee', 'sprint', 'epic'],
    nr_workload:      ['sprint', 'epic'],
    nr_epics:         ['sprint'],
    nr_sprints:       [],
    burndown:         ['sprint'],
    burnup:           ['sprint'],
    velocity:         [],
    workload:         ['sprint', 'epic'],
    priority:         ['startDate', 'endDate', 'sprint', 'epic'],
    issue_type:       ['startDate', 'endDate', 'sprint', 'epic'],
    epic_progress:    ['sprint'],
    time_tracking:    ['sprint', 'assignee'],
    created_resolved: ['startDate', 'endDate'],
};

const activeFilters = computed(() => reportFilterConfig[activeReport.value] || []);
const hasFilter = (key) => activeFilters.value.includes(key);

const pendingFilters = ref({ startDate: '', endDate: '', assignee: '', sprint: '', epic: '' });
const filters = ref({ startDate: '', endDate: '', assignee: '', sprint: '', epic: '' });
const showReport = ref(false);
const loading = ref(true);
const loadingReport = ref(false);

const tasks = ref([]);
const sprints = ref([]);
const epics = ref([]);
const users = ref([]);
const statuses = ref([]);

const API_BASE = '/api/pm';

const activeFiltersCount = computed(() => {
    const f = pendingFilters.value;
    return activeFilters.value.filter(k => f[k]).length;
});

const applyReport = async () => {
    filters.value = { ...pendingFilters.value };
    showReport.value = true;
    await fetchFilteredTasks();
};

const resetFilters = () => {
    pendingFilters.value = { startDate: '', endDate: '', assignee: '', sprint: '', epic: '' };
    filters.value = { startDate: '', endDate: '', assignee: '', sprint: '', epic: '' };
    showReport.value = false;
};

const selectReport = (id) => {
    if (activeReport.value !== id) {
        activeReport.value = id;
        showReport.value = false;
        pendingFilters.value = { startDate: '', endDate: '', assignee: '', sprint: '', epic: '' };
        filters.value = { startDate: '', endDate: '', assignee: '', sprint: '', epic: '' };
    }
};

const fetchMetadata = async () => {
    loading.value = true;
    try {
        const [sprintsRes, epicsRes, statusesRes] = await Promise.all([
            axios.get(`${API_BASE}/sprints/?project=${props.projectId}`),
            axios.get(`${API_BASE}/epics/?project=${props.projectId}`),
            axios.get(`${API_BASE}/statuses/?project=${props.projectId}`)
        ]);
        sprints.value  = sprintsRes.data;
        epics.value    = epicsRes.data;
        statuses.value = statusesRes.data;
        let projectName = props.projectName;
        if (!projectName) {
            const projRes = await axios.get(`${API_BASE}/projects/${props.projectId}/`);
            projectName = projRes.data.name;
        }
        if (projectName) {
            const usersRes = await axios.get(`${API_BASE}/project-users/?project_name=${encodeURIComponent(projectName)}`);
            users.value = usersRes.data;
        }
    } catch (e) {
        console.error('Failed to fetch report metadata', e);
    } finally {
        loading.value = false;
    }
};

const fetchFilteredTasks = async () => {
    loadingReport.value = true;
    try {
        const f = filters.value;
        const params = new URLSearchParams();
        params.set('project', props.projectId);
        if (f.sprint)    params.set('sprint', f.sprint === 'unassigned' ? 'null' : f.sprint);
        if (f.assignee)  params.set('assigned_to', f.assignee);
        if (f.epic && f.epic !== 'unassigned') params.set('epic', f.epic);
        if (f.startDate) params.set('created_after', f.startDate);
        if (f.endDate)   params.set('created_before', f.endDate);
        const res = await axios.get(`${API_BASE}/tasks/?${params.toString()}`);
        const data = res.data;
        tasks.value = Array.isArray(data) ? data : (data.results || []);
    } catch (e) {
        console.error('Failed to fetch filtered tasks', e);
    } finally {
        loadingReport.value = false;
    }
};

onMounted(() => { fetchMetadata(); });

const getStatusCategory = (statusId) => {
    const st = statuses.value.find(s => s.id === statusId);
    return st ? st.category : 'TO_DO';
};
const isDone = (task) => getStatusCategory(task.status) === 'DONE';
const filteredTasks = computed(() => tasks.value);

const displaySprint = computed(() => {
    if (filters.value.sprint && filters.value.sprint !== 'unassigned') {
        return sprints.value.find(s => s.id == filters.value.sprint);
    }
    return sprints.value.find(s => s.status === 'ACTIVE');
});

const displaySprintTasks = computed(() => {
    if (!displaySprint.value) return [];
    return filteredTasks.value.filter(t => t.sprint === displaySprint.value.id);
});

const summaryStats = computed(() => {
    const t_ = filteredTasks.value;
    const done       = t_.filter(t => isDone(t)).length;
    const inProgress = t_.filter(t => ['IN_PROGRESS', 'PENDING', 'IN_REVIEW'].includes(getStatusCategory(t.status))).length;
    const todo       = t_.filter(t => getStatusCategory(t.status) === 'TO_DO').length;
    const totalPts   = t_.reduce((s, t) => s + (parseFloat(t.story_points) || 0), 0);
    const donePts    = t_.filter(t => isDone(t)).reduce((s, t) => s + (parseFloat(t.story_points) || 0), 0);
    const rate       = t_.length > 0 ? Math.round((done / t_.length) * 100) : 0;
    return { total: t_.length, done, inProgress, todo, totalPts: Math.round(totalPts), donePts: Math.round(donePts), rate };
});

const statusBreakdown = computed(() => {
    const map = {};
    statuses.value.forEach(s => { map[s.id] = { id: s.id, name: s.name, color: s.color || 'var(--primary)', category: s.category, count: 0 }; });
    filteredTasks.value.forEach(t => { if (map[t.status]) map[t.status].count++; });
    return Object.values(map).filter(s => s.count > 0).sort((a, b) => b.count - a.count);
});

const priorityBreakdown = computed(() => {
    const priorities = [
        { key: 'URGENT', label: t('kanban.priorities.urgent'),  color: '#ef4444', icon: 'fa-angles-up',  count: 0, done: 0 },
        { key: 'HIGH',   label: t('kanban.priorities.high'),    color: '#f97316', icon: 'fa-angle-up',   count: 0, done: 0 },
        { key: 'MEDIUM', label: t('kanban.priorities.medium'),  color: '#eab308', icon: 'fa-minus',      count: 0, done: 0 },
        { key: 'LOW',    label: t('kanban.priorities.low'),     color: '#10b981', icon: 'fa-angle-down', count: 0, done: 0 },
    ];
    filteredTasks.value.forEach(t => {
        const p = priorities.find(p => p.key === t.priority);
        if (p) { p.count++; if (isDone(t)) p.done++; }
    });
    return priorities.filter(p => p.count > 0);
});

const userBreakdown = computed(() => {
    const map = {};
    filteredTasks.value.forEach(t => {
        const key = t.assigned_to || 'unassigned';
        if (!map[key]) {
            const userObj = users.value.find(u => u.id === t.assigned_to);
            map[key] = {
                id: key,
                name: userObj ? `${userObj.first_name} ${userObj.last_name}`.trim() || userObj.username : t('kanban.unassigned'),
                username: userObj?.username || '-',
                total: 0, done: 0, inProgress: 0, todo: 0, points: 0
            };
        }
        map[key].total++;
        const cat = getStatusCategory(t.status);
        if (cat === 'DONE') map[key].done++;
        else if (['IN_PROGRESS', 'PENDING', 'IN_REVIEW'].includes(cat)) map[key].inProgress++;
        else map[key].todo++;
        map[key].points += parseFloat(t.story_points) || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
});

const epicBreakdown = computed(() => {
    return epics.value.map(epic => {
        const epicTasks = filteredTasks.value.filter(t => t.epic === epic.id);
        const done     = epicTasks.filter(t => isDone(t)).length;
        const inProg   = epicTasks.filter(t => ['IN_PROGRESS', 'PENDING', 'IN_REVIEW'].includes(getStatusCategory(t.status))).length;
        const todo     = epicTasks.filter(t => getStatusCategory(t.status) === 'TO_DO').length;
        const totalPts = epicTasks.reduce((s, t) => s + (parseFloat(t.story_points) || 0), 0);
        const donePts  = epicTasks.filter(t => isDone(t)).reduce((s, t) => s + (parseFloat(t.story_points) || 0), 0);
        const pct = epicTasks.length > 0 ? Math.round((done / epicTasks.length) * 100) : 0;
        return { ...epic, total: epicTasks.length, done, inProgress: inProg, todo, totalPts: Math.round(totalPts), donePts: Math.round(donePts), pct };
    }).filter(e => e.total > 0).sort((a, b) => b.pct - a.pct);
});

const sprintBreakdown = computed(() => {
    return sprints.value.map(sprint => {
        const sprintTasks = tasks.value.filter(t => t.sprint === sprint.id);
        const done     = sprintTasks.filter(t => isDone(t)).length;
        const total    = sprintTasks.length;
        const totalPts = sprintTasks.reduce((s, t) => s + (parseFloat(t.story_points) || 0), 0);
        const donePts  = sprintTasks.filter(t => isDone(t)).reduce((s, t) => s + (parseFloat(t.story_points) || 0), 0);
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const statusColor = sprint.status === 'ACTIVE' ? '#10b981' : sprint.status === 'COMPLETED' ? 'var(--primary)' : '#94a3b8';
        const statusLabel = sprint.status === 'ACTIVE' ? t('reports.sprint_active') : sprint.status === 'COMPLETED' ? t('reports.sprint_completed') : t('reports.sprint_planned');
        return { ...sprint, total, done, totalPts: Math.round(totalPts), donePts: Math.round(donePts), pct, statusColor, statusLabel };
    }).filter(s => s.total > 0).sort((a, b) => {
        const order = { ACTIVE: 0, PLANNED: 1, COMPLETED: 2 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9);
    });
});

const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } }
};
const stackedBarOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: { x: { stacked: true }, y: { stacked: true } },
    plugins: { legend: { position: 'bottom' } }
};

const burndownData = computed(() => {
    if (!displaySprint.value) return null;
    const start = new Date(displaySprint.value.start_date);
    const end   = displaySprint.value.end_date ? new Date(displaySprint.value.end_date) : new Date(start.getTime() + 14 * 86400000);
    const days  = Math.max(1, Math.ceil((end - start) / 86400000));
    let totalPoints = 0, completedPoints = 0;
    displaySprintTasks.value.forEach(t => {
        const pts = parseFloat(t.story_points) || 1;
        totalPoints += pts;
        if (isDone(t)) completedPoints += pts;
    });
    if (totalPoints === 0) totalPoints = displaySprintTasks.value.length || 1;
    const labels = [], idealData = [], actualData = [];
    const now = new Date();
    const daysElapsed = Math.max(0, Math.min(days, Math.ceil((now - start) / 86400000)));
    for (let i = 0; i <= days; i++) {
        labels.push(new Date(start.getTime() + i * 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        idealData.push(totalPoints - (totalPoints * (i / days)));
        if (i <= daysElapsed) actualData.push(totalPoints - (completedPoints * (i / Math.max(daysElapsed, 1))));
    }
    return {
        labels,
        datasets: [
            { label: t('reports.ideal_burndown'), data: idealData, borderColor: '#cbd5e1', borderDash: [5,5], tension: 0, fill: false, pointRadius: 0 },
            { label: t('reports.actual_remaining'), data: actualData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.1, fill: true, pointBackgroundColor: '#ef4444' }
        ]
    };
});

const burnupData = computed(() => {
    if (!displaySprint.value) return null;
    const start = new Date(displaySprint.value.start_date);
    const end   = displaySprint.value.end_date ? new Date(displaySprint.value.end_date) : new Date(start.getTime() + 14 * 86400000);
    const days  = Math.max(1, Math.ceil((end - start) / 86400000));
    let totalPoints = 0, completedPoints = 0;
    displaySprintTasks.value.forEach(t => {
        const pts = parseFloat(t.story_points) || 1;
        totalPoints += pts;
        if (isDone(t)) completedPoints += pts;
    });
    if (totalPoints === 0) totalPoints = displaySprintTasks.value.length || 1;
    const labels = [], scopeData = [], actualCompletedData = [];
    const now = new Date();
    const daysElapsed = Math.max(0, Math.min(days, Math.ceil((now - start) / 86400000)));
    for (let i = 0; i <= days; i++) {
        labels.push(new Date(start.getTime() + i * 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        scopeData.push(totalPoints);
        if (i <= daysElapsed) actualCompletedData.push(completedPoints * (i / Math.max(daysElapsed, 1)));
    }
    return {
        labels,
        datasets: [
            { label: t('reports.total_scope'), data: scopeData, borderColor: '#94a3b8', borderDash: [5,5], tension: 0, fill: false, pointRadius: 0 },
            { label: t('reports.completed_work'), data: actualCompletedData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.1, fill: true, pointBackgroundColor: '#10b981' }
        ]
    };
});

const velocityData = computed(() => {
    const completedSprints = sprints.value
        .filter(s => s.status === 'COMPLETED' || s.status === 'ACTIVE')
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const labels = [], committed = [], completed = [];
    completedSprints.slice(-5).forEach(s => {
        labels.push(s.name);
        const sprintTasks = tasks.value.filter(t => t.sprint === s.id);
        let commitPts = 0, compPts = 0;
        sprintTasks.forEach(t => {
            const pts = parseFloat(t.story_points) || 1;
            commitPts += pts;
            if (isDone(t)) compPts += pts;
        });
        committed.push(commitPts);
        completed.push(compPts);
    });
    return {
        labels,
        datasets: [
            { label: t('reports.committed'), backgroundColor: '#cbd5e1', data: committed, borderRadius: 4 },
            { label: t('reports.completed'), backgroundColor: '#10b981', data: completed, borderRadius: 4 }
        ]
    };
});

const workloadData = computed(() => {
    const activeTasks = filteredTasks.value.filter(t => !isDone(t));
    const labels = [], todoData = [], inProgressData = [];
    users.value.forEach(u => {
        labels.push(u.username);
        const userTasks = activeTasks.filter(t => t.assigned_to === u.id);
        todoData.push(userTasks.filter(t => getStatusCategory(t.status) === 'TO_DO').length);
        inProgressData.push(userTasks.filter(t => ['IN_PROGRESS', 'PENDING', 'IN_REVIEW'].includes(getStatusCategory(t.status))).length);
    });
    labels.push(t('kanban.unassigned'));
    const unassigned = activeTasks.filter(t => !t.assigned_to);
    todoData.push(unassigned.filter(t => getStatusCategory(t.status) === 'TO_DO').length);
    inProgressData.push(unassigned.filter(t => ['IN_PROGRESS', 'PENDING', 'IN_REVIEW'].includes(getStatusCategory(t.status))).length);
    return {
        labels,
        datasets: [
            { label: t('kanban.columns.to_do'), backgroundColor: '#94a3b8', data: todoData },
            { label: t('kanban.columns.in_progress'), backgroundColor: '#3b82f6', data: inProgressData }
        ]
    };
});

const priorityData = computed(() => {
    const counts = { URGENT: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    filteredTasks.value.forEach(t => { if (counts[t.priority] !== undefined) counts[t.priority]++; });
    return {
        labels: [t('kanban.priorities.urgent'), t('kanban.priorities.high'), t('kanban.priorities.medium'), t('kanban.priorities.low')],
        datasets: [{ data: [counts.URGENT, counts.HIGH, counts.MEDIUM, counts.LOW], backgroundColor: ['#ef4444','#f97316','#eab308','#10b981'], borderWidth: 0, hoverOffset: 4 }]
    };
});

const issueTypeData = computed(() => {
    const counts = { BUG: 0, STORY: 0, TASK: 0 };
    filteredTasks.value.forEach(t => { if (counts[t.issue_type] !== undefined) counts[t.issue_type]++; });
    return {
        labels: [t('kanban.issue_types.bug'), t('kanban.issue_types.story'), t('kanban.issue_types.task')],
        datasets: [{ data: [counts.BUG, counts.STORY, counts.TASK], backgroundColor: ['#ef4444','#10b981','#3b82f6'], borderWidth: 0, hoverOffset: 4 }]
    };
});

const epicProgress = computed(() => {
    return epics.value.map(epic => {
        const epicTasks = filteredTasks.value.filter(t => t.epic === epic.id);
        let total = 0, completed = 0;
        epicTasks.forEach(t => {
            const pts = parseFloat(t.story_points) || 1;
            total += pts;
            if (isDone(t)) completed += pts;
        });
        return { ...epic, progress: total > 0 ? Math.round((completed / total) * 100) : 0, totalTasks: epicTasks.length, completedTasks: epicTasks.filter(t => isDone(t)).length };
    }).sort((a, b) => b.progress - a.progress);
});

const timeTrackingData = computed(() => {
    const labels = [], timeSpentData = [];
    users.value.forEach(u => {
        labels.push(u.username);
        timeSpentData.push(filteredTasks.value.filter(t => t.assigned_to === u.id).reduce((s, t) => s + (parseFloat(t.time_spent) || 0), 0));
    });
    return {
        labels,
        datasets: [{ label: t('reports.time_spent_hours'), backgroundColor: '#8b5cf6', data: timeSpentData, borderRadius: 4 }]
    };
});

const createdVsResolvedData = computed(() => {
    const labels = [], createdData = [], resolvedData = [];
    const now = new Date();
    const dateBuckets = {};
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dateBuckets[dateStr] = { created: 0, resolved: 0 };
        labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    }
    filteredTasks.value.forEach(t => {
        if (!t.created_at) return;
        const cDate = new Date(t.created_at).toISOString().split('T')[0];
        if (dateBuckets[cDate]) dateBuckets[cDate].created++;
        if (isDone(t)) {
            const doneDate = t.end_date ? new Date(t.end_date).toISOString().split('T')[0] : now.toISOString().split('T')[0];
            if (dateBuckets[doneDate]) dateBuckets[doneDate].resolved++;
        }
    });
    Object.values(dateBuckets).forEach(val => { createdData.push(val.created); resolvedData.push(val.resolved); });
    return {
        labels,
        datasets: [
            { label: t('reports.created_issues'), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', data: createdData, tension: 0.3, fill: true },
            { label: t('reports.resolved_issues'), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', data: resolvedData, tension: 0.3, fill: true }
        ]
    };
});
</script>


<template>
    <div class="reports-layout" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">
        <!-- Sidebar -->
        <div class="reports-sidebar">
            <div class="sidebar-header">
                <button class="btn-back" @click="router.push(`/projects/${projectId}`)">
                    <i class="fa-solid" :class="$i18n.locale === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left'"></i>
                    {{ $t("common.back_to_project") }}
                </button>
            </div>
            <h3 class="sidebar-title">{{ $t("reports.agile_reports") }}</h3>
            <div class="nav-group-label">{{ $t("reports.numerical_reports") }}</div>
            <ul class="nav-list" style="margin-bottom:8px">
                <li v-for="report in reportTypes.filter(r => r.group === 'numerical')" :key="report.id"
                    class="nav-item" :class="{ active: activeReport === report.id }"
                    @click="selectReport(report.id)">
                    <i :class="['fa-solid', report.icon]"></i>
                    <span>{{ report.name }}</span>
                </li>
            </ul>
            <div class="nav-group-label">{{ $t("reports.charts") }}</div>
            <ul class="nav-list">
                <li v-for="report in reportTypes.filter(r => r.group === 'charts')" :key="report.id"
                    class="nav-item" :class="{ active: activeReport === report.id }"
                    @click="selectReport(report.id)">
                    <i :class="['fa-solid', report.icon]"></i>
                    <span>{{ report.name }}</span>
                </li>
            </ul>
        </div>

        <!-- Main -->
        <div class="reports-main">
            <!-- Filter Bar -->
            <div class="filters-bar" v-if="!loading">
                <div class="filters-row">
                    <!-- Date range -->
                    <div class="filter-group date-filter-group" v-if="hasFilter('startDate') || hasFilter('endDate')">
                        <label>{{ $t("common.date_range") }}</label>
                        <div class="date-inputs">
                            <input type="date" v-model="pendingFilters.startDate" class="form-input" />
                            <span>-</span>
                            <input type="date" v-model="pendingFilters.endDate" class="form-input" />
                        </div>
                    </div>
                    <!-- Assignee -->
                    <div class="filter-group" v-if="hasFilter('assignee')">
                        <label>{{ $t("kanban.assignee") }}</label>
                        <select v-model="pendingFilters.assignee" class="form-input">
                            <option value="">{{ $t("common.all") }}</option>
                            <option value="unassigned">{{ $t("kanban.unassigned") }}</option>
                            <option v-for="user in users" :key="user.id" :value="user.id">
                                {{ user.first_name }} {{ user.last_name }} (@{{ user.username }})
                            </option>
                        </select>
                    </div>
                    <!-- Sprint -->
                    <div class="filter-group" v-if="hasFilter('sprint')">
                        <label>{{ $t("kanban.sprint") }}</label>
                        <select v-model="pendingFilters.sprint" class="form-input">
                            <option value="">{{ $t("common.all") }}</option>
                            <option value="unassigned">{{ $t("reports.backlog_only") }}</option>
                            <option v-for="sprint in sprints" :key="sprint.id" :value="sprint.id">
                                {{ sprint.name }}
                            </option>
                        </select>
                    </div>
                    <!-- Epic -->
                    <div class="filter-group" v-if="hasFilter('epic')">
                        <label>{{ $t("kanban.epic") }}</label>
                        <select v-model="pendingFilters.epic" class="form-input">
                            <option value="">{{ $t("common.all") }}</option>
                            <option value="unassigned">{{ $t("kanban.unassigned") }}</option>
                            <option v-for="epic in epics" :key="epic.id" :value="epic.id">
                                {{ epic.name }}
                            </option>
                        </select>
                    </div>
                    <!-- No filters notice -->
                    <div v-if="activeFilters.length === 0" class="no-filters-notice">
                        <i class="fa-solid fa-circle-info"></i>
                        {{ $t("reports.show_report") }}
                    </div>
                </div>
                <div class="filters-actions">
                    <button class="btn-reset" @click="resetFilters" v-if="showReport">
                        <i class="fa-solid fa-rotate-left"></i> {{ $t("reports.reset") }}
                    </button>
                    <button class="btn-show-report" @click="applyReport" :disabled="loadingReport">
                        <span v-if="loadingReport" class="btn-spinner"></span>
                        <i v-else class="fa-solid fa-chart-bar"></i>
                        {{ loadingReport ? $t("common.loading") : $t("reports.show_report") }}
                        <span class="filter-badge" v-if="activeFiltersCount > 0 && !loadingReport">{{ activeFiltersCount }}</span>
                    </button>
                </div>
            </div>

            <!-- Placeholder -->
            <div v-if="!loading && !showReport" class="report-placeholder-elite">
                <div class="placeholder-icon-orb">
                    <i class="fa-solid fa-chart-bar ghost-pulse"></i>
                </div>
                <h3>{{ $t("reports.placeholder_title") }}</h3>
                <p>{{ $t("reports.filter_hint") }}</p>
                <button class="btn-show-report-elite" @click="applyReport">
                    <i class="fa-solid fa-bolt"></i> {{ $t("reports.show_now") }}
                </button>
            </div>

            <div v-if="loading" class="loading">{{ $t("common.loading") }}</div>

            <div v-else-if="showReport" class="report-content-container">

                <!-- KPI row for chart reports -->
                <div v-if="!activeReport.startsWith('nr_')" class="kpi-row">
                    <div class="kpi-card">
                        <div class="kpi-icon" style="background:var(--primary-bg);color:var(--primary)"><i class="fa-solid fa-list-check"></i></div>
                        <div class="kpi-body"><div class="kpi-value">{{ summaryStats.total }}</div><div class="kpi-label">{{ $t("reports.total_tasks") }}</div></div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-icon" style="background:rgba(16,185,129,.12);color:#10b981"><i class="fa-solid fa-circle-check"></i></div>
                        <div class="kpi-body"><div class="kpi-value">{{ summaryStats.done }}</div><div class="kpi-label">{{ $t("reports.completed") }}</div></div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-icon" style="background:rgba(59,130,246,.12);color:#3b82f6"><i class="fa-solid fa-spinner"></i></div>
                        <div class="kpi-body"><div class="kpi-value">{{ summaryStats.inProgress }}</div><div class="kpi-label">{{ $t("reports.in_progress") }}</div></div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-icon" style="background:rgba(148,163,184,.12);color:#94a3b8"><i class="fa-solid fa-clock"></i></div>
                        <div class="kpi-body"><div class="kpi-value">{{ summaryStats.todo }}</div><div class="kpi-label">{{ $t("reports.to_do") }}</div></div>
                    </div>
                    <div class="kpi-card kpi-highlight">
                        <div class="kpi-icon" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fa-solid fa-percent"></i></div>
                        <div class="kpi-body"><div class="kpi-value">{{ summaryStats.rate }}%</div><div class="kpi-label">{{ $t("reports.completion_rate") }}</div></div>
                        <div class="kpi-progress-bar"><div class="kpi-progress-fill" :style="{ width: summaryStats.rate + '%' }"></div></div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-icon" style="background:rgba(245,158,11,.12);color:#f59e0b"><i class="fa-solid fa-star"></i></div>
                        <div class="kpi-body"><div class="kpi-value">{{ summaryStats.donePts }} / {{ summaryStats.totalPts }}</div><div class="kpi-label">{{ $t("reports.story_points_label") }}</div></div>
                    </div>
                </div>

                <!-- NR: Status -->
                <div v-if="activeReport === 'nr_status'" class="nr-fullscreen-card">
                    <div class="nr-page-header">
                        <i class="fa-solid fa-circle-half-stroke"></i>
                        <div><h2>{{ $t("reports.status_distribution_title") }}</h2><p>{{ $t("reports.status_distribution_desc") }}</p></div>
                        <span class="nr-total-badge large">{{ summaryStats.total }} {{ $t("reports.tasks_unit") }}</span>
                        <div class="nr-top-kpi" style="border-color:#10b981"><div class="nr-top-kpi-val" style="color:#10b981">{{ summaryStats.done }}</div><div class="nr-top-kpi-lbl">{{ $t("reports.completed_stat") }}</div></div>
                        <div class="nr-top-kpi" style="border-color:#3b82f6"><div class="nr-top-kpi-val" style="color:#3b82f6">{{ summaryStats.inProgress }}</div><div class="nr-top-kpi-lbl">{{ $t("reports.in_progress_stat") }}</div></div>
                        <div class="nr-top-kpi" style="border-color:#94a3b8"><div class="nr-top-kpi-val" style="color:#94a3b8">{{ summaryStats.todo }}</div><div class="nr-top-kpi-lbl">{{ $t("reports.todo_stat") }}</div></div>
                        <div class="nr-top-kpi" style="border-color:var(--primary)"><div class="nr-top-kpi-val" style="color:var(--primary)">{{ summaryStats.rate }}%</div><div class="nr-top-kpi-lbl">{{ $t("reports.completion_rate") }}</div></div>
                    </div>
                    <div class="nr-card" style="margin-top:20px">
                        <div class="nr-card-body">
                            <div v-if="statusBreakdown.length === 0" class="nr-empty">{{ $t("reports.no_data") }}</div>
                            <div v-for="s in statusBreakdown" :key="s.id" class="nr-status-row large">
                                <div class="nr-status-dot" :style="{ background: s.color }"></div>
                                <span class="nr-status-name">{{ s.name }}</span>
                                <div class="nr-bar-wrap" style="height:12px">
                                    <div class="nr-bar-fill" :style="{ width: (summaryStats.total > 0 ? (s.count/summaryStats.total*100) : 0)+'%', background: s.color }"></div>
                                </div>
                                <span class="nr-count">{{ s.count }}</span>
                                <span class="nr-pct">{{ summaryStats.total > 0 ? Math.round(s.count/summaryStats.total*100) : 0 }}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- NR: Priority -->
                <div v-if="activeReport === 'nr_priority'" class="nr-fullscreen-card">
                    <div class="nr-page-header">
                        <i class="fa-solid fa-angles-up"></i>
                        <div><h2>{{ $t("reports.priority_distribution_title") }}</h2><p>{{ $t("reports.priority_distribution_desc") }}</p></div>
                        <span class="nr-total-badge large">{{ summaryStats.total }} {{ $t("reports.tasks_unit") }}</span>
                    </div>
                    <div class="nr-priority-grid">
                        <div v-if="priorityBreakdown.length === 0" class="nr-empty">{{ $t("reports.no_data") }}</div>
                        <div v-for="p in priorityBreakdown" :key="p.key" class="nr-priority-full-card" :style="{ borderTopColor: p.color }">
                            <div class="nr-pfc-header">
                                <span class="nr-priority-badge" :style="{ background: p.color+'20', color: p.color, borderColor: p.color+'40' }">
                                    <i class="fa-solid" :class="p.icon"></i> {{ p.label }}
                                </span>
                                <span class="nr-pfc-rate" :style="{ color: p.color }">{{ p.count > 0 ? Math.round(p.done/p.count*100) : 0 }}%</span>
                            </div>
                            <div class="nr-pfc-nums">
                                <div><div class="nr-sprint-val">{{ p.count }}</div><div class="nr-sprint-key">{{ $t("reports.total_label") }}</div></div>
                                <div><div class="nr-sprint-val green">{{ p.done }}</div><div class="nr-sprint-key">{{ $t("reports.completed_label") }}</div></div>
                                <div><div class="nr-sprint-val gray">{{ p.count - p.done }}</div><div class="nr-sprint-key">{{ $t("reports.remaining_label") }}</div></div>
                            </div>
                            <div class="nr-bar-wrap" style="height:10px;margin-top:8px">
                                <div class="nr-bar-fill" :style="{ width: (p.count > 0 ? p.done/p.count*100 : 0)+'%', background: p.color }"></div>
                            </div>
                            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
                                {{ summaryStats.total > 0 ? Math.round(p.count/summaryStats.total*100) : 0 }}% {{ $t("reports.of_total") }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- NR: Workload -->
                <div v-if="activeReport === 'nr_workload'" class="nr-fullscreen-card">
                    <div class="nr-page-header">
                        <i class="fa-solid fa-users"></i>
                        <div><h2>{{ $t("reports.workload_title") }}</h2><p>{{ $t("reports.workload_desc") }}</p></div>
                        <span class="nr-total-badge large">{{ userBreakdown.length }} {{ $t("reports.users_unit") }}</span>
                    </div>
                    <div class="nr-card" style="margin-top:20px">
                        <div class="nr-card-body no-pad">
                            <table class="nr-table">
                                <thead><tr>
                                    <th>{{ $t("reports.user_label") }}</th>
                                    <th class="center">{{ $t("reports.total_label") }}</th>
                                    <th class="center">{{ $t("reports.completed_label") }}</th>
                                    <th class="center">{{ $t("reports.in_progress_stat") }}</th>
                                    <th class="center">{{ $t("reports.todo_stat") }}</th>
                                    <th class="center">{{ $t("reports.story_points_label") }}</th>
                                    <th style="min-width:160px">{{ $t("reports.completion_rate") }}</th>
                                </tr></thead>
                                <tbody>
                                    <tr v-if="userBreakdown.length === 0"><td colspan="7" class="nr-empty-row">{{ $t("reports.no_data") }}</td></tr>
                                    <tr v-for="u in userBreakdown" :key="u.id">
                                        <td>
                                            <div class="nr-user-cell">
                                                <div class="nr-avatar" :style="{ background: ['var(--primary)','#10b981','#f59e0b','#3b82f6','#ec4899'][(u.name.charCodeAt(0)||0)%5] }">{{ u.name.charAt(0).toUpperCase() }}</div>
                                                <div><div class="nr-user-name">{{ u.name }}</div><div class="nr-user-sub">@{{ u.username }}</div></div>
                                            </div>
                                        </td>
                                        <td class="center"><span class="nr-num">{{ u.total }}</span></td>
                                        <td class="center"><span class="nr-num green">{{ u.done }}</span></td>
                                        <td class="center"><span class="nr-num blue">{{ u.inProgress }}</span></td>
                                        <td class="center"><span class="nr-num gray">{{ u.todo }}</span></td>
                                        <td class="center"><span class="nr-num amber">{{ Math.round(u.points) }}</span></td>
                                        <td>
                                            <div class="nr-inline-bar">
                                                <div class="nr-inline-fill" :style="{ width: (u.total > 0 ? u.done/u.total*100 : 0)+'%' }"></div>
                                                <span class="nr-inline-pct">{{ u.total > 0 ? Math.round(u.done/u.total*100) : 0 }}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- NR: Epics -->
                <div v-if="activeReport === 'nr_epics'" class="nr-fullscreen-card">
                    <div class="nr-page-header">
                        <i class="fa-solid fa-layer-group"></i>
                        <div><h2>{{ $t("reports.epic_progress_title") }}</h2><p>{{ $t("reports.epic_progress_desc") }}</p></div>
                        <span class="nr-total-badge large">{{ epicBreakdown.length }} {{ $t("reports.epics_unit") }}</span>
                    </div>
                    <div class="nr-epic-grid">
                        <div v-if="epicBreakdown.length === 0" class="nr-empty">{{ $t("reports.no_data") }}</div>
                        <div v-for="e in epicBreakdown" :key="e.id" class="nr-epic-full-card" :style="{ borderTopColor: e.color }">
                            <div class="nr-efc-header">
                                <span class="nr-epic-dot large" :style="{ background: e.color }"></span>
                                <span style="font-weight:700;flex:1">{{ e.name }}</span>
                                <div class="nr-sprint-stat"><div class="nr-sprint-val">{{ e.total }}</div><div class="nr-sprint-key">{{ $t("reports.total_label") }}</div></div>
                                <div class="nr-sprint-stat"><div class="nr-sprint-val green">{{ e.done }}</div><div class="nr-sprint-key">{{ $t("reports.completed_label") }}</div></div>
                                <div class="nr-sprint-stat"><div class="nr-sprint-val blue">{{ e.inProgress }}</div><div class="nr-sprint-key">{{ $t("reports.in_progress_stat") }}</div></div>
                                <div class="nr-sprint-stat"><div class="nr-sprint-val amber">{{ e.donePts }}/{{ e.totalPts }}</div><div class="nr-sprint-key">{{ $t("reports.story_points_label") }}</div></div>
                            </div>
                            <div class="nr-bar-wrap" style="height:12px;margin-top:8px">
                                <div class="nr-bar-fill" :style="{ width: e.pct+'%', background: e.color }"></div>
                            </div>
                            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;text-align:right">{{ e.pct }}%</div>
                        </div>
                    </div>
                </div>

                <!-- NR: Sprints -->
                <div v-if="activeReport === 'nr_sprints'" class="nr-fullscreen-card">
                    <div class="nr-page-header">
                        <i class="fa-solid fa-stopwatch"></i>
                        <div><h2>{{ $t("reports.sprint_summary_title") }}</h2><p>{{ $t("reports.sprint_summary_desc") }}</p></div>
                        <span class="nr-total-badge large">{{ sprintBreakdown.length }} {{ $t("reports.sprints_unit") }}</span>
                    </div>
                    <div class="nr-sprint-grid">
                        <div v-if="sprintBreakdown.length === 0" class="nr-empty">{{ $t("reports.no_data") }}</div>
                        <div v-for="s in sprintBreakdown" :key="s.id" class="nr-epic-full-card" :style="{ borderTopColor: s.statusColor }">
                            <div class="nr-efc-header" style="flex-direction:column;align-items:flex-start">
                                <div style="display:flex;align-items:center;gap:8px;width:100%;margin-bottom:12px">
                                    <h3 style="margin:0;font-weight:700;flex:1">{{ s.name }}</h3>
                                    <span class="nr-sprint-status" :style="{ background: s.statusColor+'20', color: s.statusColor }">{{ s.statusLabel }}</span>
                                </div>
                                <div style="display:flex;gap:16px;width:100%;flex-wrap:wrap">
                                    <div class="nr-sprint-stat"><div class="nr-sprint-val" style="font-size:28px">{{ s.total }}</div><div class="nr-sprint-key">{{ $t("reports.total_tasks_label") }}</div></div>
                                    <div class="nr-sprint-stat"><div class="nr-sprint-val green" style="font-size:28px">{{ s.done }}</div><div class="nr-sprint-key">{{ $t("reports.completed_label") }}</div></div>
                                    <div class="nr-sprint-stat"><div class="nr-sprint-val amber" style="font-size:28px">{{ s.donePts }}</div><div class="nr-sprint-key">{{ $t("reports.points_done_label") }}</div></div>
                                    <div class="nr-sprint-stat"><div class="nr-sprint-val violet" style="font-size:28px">{{ s.pct }}%</div><div class="nr-sprint-key">{{ $t("reports.completion_rate") }}</div></div>
                                </div>
                            </div>
                            <div class="nr-bar-wrap" style="height:14px;border-radius:8px;margin-top:12px">
                                <div class="nr-bar-fill" :style="{ width: s.pct+'%', background: s.statusColor, borderRadius:'8px' }"></div>
                            </div>
                            <div style="font-size:11px;color:var(--text-muted);margin-top:6px;display:flex;justify-content:space-between">
                                <span v-if="s.start_date">{{ $t("reports.starts_at") }} {{ new Date(s.start_date).toLocaleDateString() }}</span>
                                <span v-if="s.end_date">{{ $t("reports.ends_at") }} {{ new Date(s.end_date).toLocaleDateString() }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chart: Burndown -->
                <div v-if="activeReport === 'burndown'" class="report-card full-width-card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-fire"></i> {{ $t("reports.sprint_burndown") }}</h3>
                        <span class="badge" v-if="displaySprint">{{ displaySprint.name }}</span>
                        <span class="badge empty" v-else>{{ $t("kanban.no_active_sprint") }}</span>
                    </div>
                    <div class="card-body chart-container large-chart" v-if="displaySprint && burndownData">
                        <Line :data="burndownData" :options="chartOptions" />
                    </div>
                    <div class="card-body empty-state" v-else>
                        <i class="fa-solid fa-chart-line"></i>
                        <p>{{ $t("reports.start_sprint_to_see") }}</p>
                    </div>
                </div>

                <!-- Chart: Burnup -->
                <div v-if="activeReport === 'burnup'" class="report-card full-width-card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-arrow-trend-up"></i> {{ $t("reports.sprint_burnup") }}</h3>
                        <span class="badge" v-if="displaySprint">{{ displaySprint.name }}</span>
                        <span class="badge empty" v-else>{{ $t("kanban.no_active_sprint") }}</span>
                    </div>
                    <div class="card-body chart-container large-chart" v-if="displaySprint && burnupData">
                        <Line :data="burnupData" :options="chartOptions" />
                    </div>
                    <div class="card-body empty-state" v-else>
                        <i class="fa-solid fa-chart-line"></i>
                        <p>{{ $t("reports.start_sprint_to_see") }}</p>
                    </div>
                </div>

                <!-- Chart: Velocity -->
                <div v-if="activeReport === 'velocity'" class="report-card full-width-card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-bolt"></i> {{ $t("reports.sprint_velocity") }}</h3>
                    </div>
                    <div class="card-body chart-container large-chart">
                        <Bar :data="velocityData" :options="chartOptions" />
                    </div>
                </div>

                <!-- Chart: Workload -->
                <div v-if="activeReport === 'workload'" class="report-card full-width-card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-users"></i> {{ $t("reports.assignee_workload") }}</h3>
                    </div>
                    <div class="card-body chart-container large-chart">
                        <Bar :data="workloadData" :options="stackedBarOptions" />
                    </div>
                </div>

                <!-- Chart: Priority -->
                <div v-if="activeReport === 'priority'" class="report-card full-width-card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-angles-up"></i> {{ $t("reports.priority_distribution") }}</h3>
                    </div>
                    <div class="card-body chart-container large-pie-chart">
                        <Doughnut :data="priorityData" :options="chartOptions" />
                    </div>
                </div>

                <!-- Chart: Issue Type -->
                <div v-if="activeReport === 'issue_type'" class="report-card full-width-card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-shapes"></i> {{ $t("reports.issue_type_distribution") }}</h3>
                    </div>
                    <div class="card-body chart-container large-pie-chart">
                        <Pie :data="issueTypeData" :options="chartOptions" />
                    </div>
                </div>

                <!-- Chart: Epic Progress -->
                <div v-if="activeReport === 'epic_progress'" class="report-card full-width-card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-layer-group"></i> {{ $t("reports.epic_progress") }}</h3>
                    </div>
                    <div class="card-body epic-list">
                        <div v-if="epicProgress.length === 0" class="empty-state">
                            <i class="fa-solid fa-box-open"></i>
                            <p>{{ $t("reports.no_epics") }}</p>
                        </div>
                        <div v-else class="epic-progress-item" v-for="epic in epicProgress" :key="epic.id">
                            <div class="epic-info">
                                <span class="epic-color" :style="{ backgroundColor: epic.color }"></span>
                                <span class="epic-name">{{ epic.name }}</span>
                                <span class="epic-stats">{{ epic.completedTasks }} / {{ epic.totalTasks }} {{ $t("kanban.tasks") }}</span>
                            </div>
                            <div class="progress-wrapper">
                                <div class="progress-bar"><div class="progress-fill" :style="{ width: epic.progress+'%', backgroundColor: epic.color }"></div></div>
                                <span class="progress-text">{{ epic.progress }}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chart: Time Tracking -->
                <div v-if="activeReport === 'time_tracking'" class="report-card full-width-card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-clock"></i> {{ $t("reports.time_tracking") }}</h3>
                    </div>
                    <div class="card-body chart-container large-chart">
                        <Bar :data="timeTrackingData" :options="chartOptions" />
                    </div>
                </div>

                <!-- Chart: Created vs Resolved -->
                <div v-if="activeReport === 'created_resolved'" class="report-card full-width-card">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-chart-area"></i> {{ $t("reports.created_vs_resolved") }}</h3>
                    </div>
                    <div class="card-body chart-container large-chart">
                        <Line :data="createdVsResolvedData" :options="chartOptions" />
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>

<style scoped>
.reports-layout { display:flex; height:100%; background:transparent; overflow:hidden; font-family:var(--font-sans); }
.reports-sidebar { width:260px; background:var(--bg-card); border-inline-end:1px solid var(--border-color); padding:24px 16px; display:flex; flex-direction:column; box-shadow:var(--shadow-sm); z-index:20; overflow-y:auto; }
.sidebar-header { margin-bottom:32px; }
.btn-back { display:flex; align-items:center; gap:8px; background:transparent; border:none; cursor:pointer; font-size:.95rem; font-weight:600; color:var(--text-muted); padding:8px 12px; border-radius:8px; transition:all .2s; }
.btn-back:hover { background:var(--bg-hover); color:var(--text-main); }
.sidebar-title { font-size:.85rem; text-transform:uppercase; letter-spacing:.1em; color:var(--text-muted); font-weight:800; margin:0 0 16px 12px; opacity:.7; }
.nav-group-label { font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:var(--text-muted); padding:12px 12px 4px; font-weight:700; opacity:.7; }
.nav-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:4px; }
.nav-item { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:12px; cursor:pointer; transition:all .2s; color:var(--text-main); font-weight:500; font-size:.95rem; }
.nav-item i { width:20px; text-align:center; color:var(--text-muted); transition:color .2s; }
.nav-item:hover { background:var(--bg-hover); }
.nav-item.active { background:var(--primary-bg); color:var(--primary); font-weight:800; box-shadow:0 4px 12px var(--primary-glow); }
.nav-item.active i { color:var(--primary); }
.reports-main { flex:1; overflow-y:auto; padding:32px 40px; display:flex; flex-direction:column; background:transparent; }
.filters-bar { display:flex; flex-direction:column; gap:16px; background:var(--bg-card); padding:16px 24px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:24px; box-shadow:var(--shadow-sm); }
.filters-row { display:flex; flex-wrap:wrap; gap:20px; flex:1; align-items:flex-end; }
.filter-group { display:flex; flex-direction:column; gap:6px; flex:1; min-width:180px; }
.filter-group label { font-size:.8rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; }
.date-filter-group { min-width:320px; flex:2; }
.date-inputs { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.form-input { background:var(--bg-hover); border:1px solid var(--border-color); color:var(--text-main); padding:8px 12px; border-radius:12px; font-size:.95rem; transition:all .2s; outline:none; width:100%; font-weight:700; }
.form-input:focus { border-color:var(--primary); box-shadow:0 0 0 4px var(--primary-glow); }
.filters-actions { display:flex; align-items:center; gap:10px; padding-top:4px; flex-shrink:0; }
.btn-show-report { display:inline-flex; align-items:center; gap:8px; padding:11px 24px; background:linear-gradient(135deg,var(--primary),var(--primary-hover)); color:white; border:none; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px var(--primary-glow); transition:all .2s; white-space:nowrap; }
.btn-show-report:hover { transform:translateY(-2px); box-shadow:0 8px 20px var(--primary-glow); }
.btn-show-report:disabled { opacity:.75; cursor:not-allowed; transform:none !important; }
.btn-reset { display:inline-flex; align-items:center; gap:6px; padding:10px 16px; background:var(--bg-hover); color:var(--text-muted); border:1px solid var(--border-color); border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; white-space:nowrap; }
.btn-reset:hover { background:var(--bg-card); color:var(--text-main); }
.filter-badge { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; background:white; color:var(--primary); font-size:11px; font-weight:800; }
.btn-spinner { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,.4); border-top-color:white; animation:spin .7s linear infinite; display:inline-block; flex-shrink:0; }
@keyframes spin { to { transform:rotate(360deg); } }
.no-filters-notice { display:flex; align-items:center; gap:8px; color:var(--text-muted); font-size:13px; padding:8px 0; }
.report-placeholder-elite { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; text-align:center; padding:140px 60px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:48px; margin:40px 0; box-shadow:var(--shadow-2xl); animation:slideUpFade .8s cubic-bezier(.16,1,.3,1); }
.placeholder-icon-orb { width:160px; height:160px; background:var(--primary-bg); border-radius:45px; display:flex; align-items:center; justify-content:center; font-size:5.5rem; color:var(--primary); margin-bottom:32px; box-shadow:0 25px 50px -12px var(--primary-glow); }
.ghost-pulse { animation:ghostFloat 3s ease-in-out infinite; }
@keyframes ghostFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
@keyframes slideUpFade { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
.btn-show-report-elite { background:var(--primary); color:white; border:none; padding:14px 32px; border-radius:16px; font-weight:800; font-size:1rem; cursor:pointer; transition:all .3s; display:flex; align-items:center; gap:12px; box-shadow:0 10px 25px -5px var(--primary-glow); }
.btn-show-report-elite:hover { transform:translateY(-3px) scale(1.02); }
.report-content-container { max-width:1200px; margin:0 auto; padding-bottom:40px; width:100%; }
.kpi-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:14px; margin-bottom:24px; }
.kpi-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:20px; padding:16px; display:flex; align-items:center; gap:14px; overflow:hidden; position:relative; transition:transform .2s,box-shadow .2s; animation:kpiIn .4s cubic-bezier(.16,1,.3,1) both; box-shadow:var(--shadow-sm); }
.kpi-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); }
@keyframes kpiIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
.kpi-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0; }
.kpi-body { flex:1; min-width:0; }
.kpi-value { font-size:1.5rem; font-weight:800; color:var(--text-main); line-height:1.1; letter-spacing:-.03em; }
.kpi-label { font-size:11.5px; color:var(--text-muted); font-weight:500; margin-top:2px; }
.kpi-progress-bar { position:absolute; bottom:0; left:0; right:0; height:4px; background:var(--border-color); }
.kpi-progress-fill { height:100%; background:linear-gradient(90deg,var(--primary),var(--primary-hover)); border-radius:2px; transition:width .8s cubic-bezier(.4,0,.2,1); }
.report-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column; overflow:hidden; min-height:500px; }
.full-width-card { width:100%; }
.card-header { padding:20px 24px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background:var(--n20); }
.card-header h3 { margin:0; font-size:1.15rem; font-weight:600; color:var(--text-main); display:flex; align-items:center; gap:12px; }
.card-header h3 i { color:var(--primary); }
.card-body { padding:32px; flex:1; display:flex; flex-direction:column; }
.chart-container { position:relative; width:100%; display:flex; justify-content:center; align-items:center; }
.large-chart { height:450px; }
.large-pie-chart { height:400px; }
.badge { background:var(--primary-bg); color:var(--primary); padding:6px 14px; border-radius:99px; font-size:.85rem; font-weight:700; }
.badge.empty { background:var(--n30); color:var(--text-muted); }
.empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); text-align:center; height:100%; min-height:350px; background:rgba(var(--primary-rgb),.02); border-radius:20px; border:1px dashed var(--border-color); margin:10px; }
.empty-state i { font-size:3rem; margin-bottom:16px; opacity:.5; }
.epic-list { display:flex; flex-direction:column; gap:20px; }
.epic-progress-item { display:flex; flex-direction:column; gap:12px; background:var(--bg-hover); padding:20px; border-radius:12px; }
.epic-info { display:flex; align-items:center; gap:16px; }
.epic-color { width:16px; height:16px; border-radius:4px; flex-shrink:0; }
.epic-name { font-weight:600; font-size:1.1rem; color:var(--text-main); flex:1; }
.epic-stats { font-size:.95rem; color:var(--text-muted); font-weight:500; }
.progress-wrapper { display:flex; align-items:center; gap:16px; }
.progress-bar { flex:1; height:12px; background:var(--n30); border-radius:99px; overflow:hidden; }
.progress-fill { height:100%; border-radius:99px; transition:width 1s ease; }
.progress-text { font-size:1rem; font-weight:700; color:var(--text-main); min-width:45px; text-align:right; }
.nr-fullscreen-card { display:flex; flex-direction:column; gap:0; animation:kpiIn .35s cubic-bezier(.16,1,.3,1) both; }
.nr-page-header { display:flex; align-items:flex-start; gap:16px; margin-bottom:24px; padding-bottom:20px; border-bottom:2px solid var(--border-color); flex-wrap:wrap; }
.nr-page-header > i { font-size:28px; color:var(--primary); margin-top:4px; flex-shrink:0; }
.nr-page-header h2 { font-size:1.4rem; font-weight:800; color:var(--text-main); margin:0 0 4px 0; letter-spacing:-.02em; }
.nr-page-header p { font-size:13px; color:var(--text-muted); margin:0; }
.nr-page-header > div:first-of-type { flex:1; min-width:200px; }
.nr-total-badge { background:var(--primary-bg); color:var(--primary); padding:2px 10px; border-radius:20px; font-size:12px; font-weight:600; }
.nr-total-badge.large { padding:6px 16px; font-size:14px; border-radius:24px; font-weight:700; white-space:nowrap; flex-shrink:0; }
.nr-top-kpi { background:var(--bg-card); border:1.5px solid; border-radius:12px; padding:12px 16px; text-align:center; transition:transform .2s; flex-shrink:0; }
.nr-top-kpi:hover { transform:translateY(-2px); }
.nr-top-kpi-val { font-size:2rem; font-weight:900; line-height:1; letter-spacing:-.04em; }
.nr-top-kpi-lbl { font-size:12px; color:var(--text-muted); margin-top:4px; font-weight:500; }
.nr-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:14px; overflow:hidden; animation:kpiIn .4s cubic-bezier(.16,1,.3,1) both; }
.nr-card-body { padding:16px 20px; display:flex; flex-direction:column; gap:12px; }
.nr-card-body.no-pad { padding:0; }
.nr-empty,.nr-empty-row { text-align:center; color:var(--text-muted); font-size:13px; padding:24px 0; }
.nr-bar-wrap { flex:1; height:6px; background:var(--border-color); border-radius:99px; overflow:hidden; min-width:60px; }
.nr-bar-fill { height:100%; border-radius:99px; transition:width .8s cubic-bezier(.4,0,.2,1); min-width:4px; }
.nr-status-row { display:flex; align-items:center; gap:10px; padding:4px 0; }
.nr-status-row.large { padding:8px 0; }
.nr-status-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.nr-status-name { font-size:13px; color:var(--text-main); min-width:90px; font-weight:500; }
.nr-status-row.large .nr-status-name { min-width:130px; font-size:14px; }
.nr-count { font-size:14px; font-weight:700; color:var(--text-main); min-width:28px; text-align:center; }
.nr-status-row.large .nr-count { font-size:18px; }
.nr-pct { font-size:12px; color:var(--text-muted); min-width:34px; text-align:right; font-weight:600; }
.nr-status-row.large .nr-pct { font-size:13px; min-width:44px; }
.nr-priority-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; margin-top:4px; }
.nr-priority-full-card { background:var(--bg-card); border:1px solid var(--border-color); border-top:4px solid; border-radius:12px; padding:18px; display:flex; flex-direction:column; gap:12px; animation:kpiIn .4s cubic-bezier(.16,1,.3,1) both; }
.nr-pfc-header { display:flex; justify-content:space-between; align-items:center; }
.nr-pfc-rate { font-size:22px; font-weight:900; }
.nr-pfc-nums { display:flex; justify-content:space-around; text-align:center; }
.nr-priority-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:6px; border:1px solid; font-size:12px; font-weight:700; min-width:70px; justify-content:center; white-space:nowrap; }
.nr-table { width:100%; border-collapse:collapse; font-size:13.5px; }
.nr-table thead tr { background:var(--bg-sidebar); border-bottom:2px solid var(--border-color); }
.nr-table th { padding:12px 16px; text-align:right; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); white-space:nowrap; }
.nr-table th.center { text-align:center; }
.nr-table td { padding:12px 16px; border-bottom:1px solid var(--border-color); color:var(--text-main); vertical-align:middle; }
.nr-table td.center { text-align:center; }
.nr-table tbody tr:last-child td { border-bottom:none; }
.nr-table tbody tr:hover { background:var(--bg-hover); }
.nr-num { font-size:15px; font-weight:800; color:var(--text-main); }
.nr-num.green { color:#10b981; } .nr-num.blue { color:#3b82f6; } .nr-num.gray { color:#94a3b8; } .nr-num.amber { color:#f59e0b; } .nr-num.violet { color:#8b5cf6; }
.nr-user-cell { display:flex; align-items:center; gap:10px; }
.nr-avatar { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:white; flex-shrink:0; }
.nr-user-name { font-size:13.5px; font-weight:600; color:var(--text-main); }
.nr-user-sub { font-size:11.5px; color:var(--text-muted); }
.nr-inline-bar { display:flex; align-items:center; gap:8px; }
.nr-inline-fill { height:6px; background:linear-gradient(90deg,var(--primary),#8b5cf6); border-radius:99px; flex:none; min-width:0; transition:width .7s ease; }
.nr-inline-pct { font-size:12px; font-weight:700; color:var(--text-muted); white-space:nowrap; }
.nr-epic-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; margin-top:4px; }
.nr-epic-full-card { background:var(--bg-card); border:1px solid var(--border-color); border-top:4px solid; border-radius:12px; padding:18px; animation:kpiIn .4s cubic-bezier(.16,1,.3,1) both; }
.nr-efc-header { display:flex; align-items:center; gap:10px; margin-bottom:4px; flex-wrap:wrap; }
.nr-epic-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.nr-epic-dot.large { width:14px; height:14px; display:inline-block; }
.nr-sprint-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; margin-top:4px; }
.nr-sprint-stat { text-align:center; }
.nr-sprint-val { font-size:20px; font-weight:800; color:var(--text-main); line-height:1.1; }
.nr-sprint-val.green { color:#10b981; } .nr-sprint-val.amber { color:#f59e0b; } .nr-sprint-val.violet { color:#8b5cf6; } .nr-sprint-val.blue { color:#3b82f6; } .nr-sprint-val.gray { color:#94a3b8; }
.nr-sprint-key { font-size:11px; color:var(--text-muted); font-weight:500; margin-top:2px; }
.nr-sprint-status { font-size:11px; font-weight:700; padding:3px 10px; border-radius:6px; white-space:nowrap; }
.loading { padding:40px; text-align:center; color:var(--text-muted); }
</style>
