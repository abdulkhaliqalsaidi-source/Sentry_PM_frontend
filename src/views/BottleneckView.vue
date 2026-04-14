<template>
  <div class="bottleneck-view" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">

    <!-- Top Bar -->
    <header class="top-bar">
      <div class="bar-left">
        <button class="btn-back" @click="$router.push(`/projects/${projectId}`)">
          <i :class="$i18n.locale === 'ar' ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left'"></i>
        </button>
        <div class="breadcrumbs">
          <span class="crumb" @click="$router.push('/projects')">{{ $t('common.projects') }}</span>
          <i class="fa-solid fa-chevron-right sep"></i>
          <span class="crumb">{{ projectName || '...' }}</span>
          <i class="fa-solid fa-chevron-right sep"></i>
          <span class="crumb active">🔍 {{ $t('bottleneck.title') }}</span>
        </div>
      </div>
      <div class="bar-right">
        <button @click="fetchData" class="btn-refresh" :class="{ spinning: loading }">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner-lg"></div>
      <p>{{ $t('common.loading') }}</p>
    </div>

    <main v-else class="main-content custom-scrollbar">

      <!-- Health Score Banner -->
      <div class="health-banner" :class="healthClass">
        <div class="health-score-ring">
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="8"/>
            <circle cx="40" cy="40" r="34" fill="none" :stroke="healthColor" stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="`${(data.health_score / 100) * 213.6} 213.6`"
              transform="rotate(-90 40 40)"
              style="transition: stroke-dasharray .8s ease"/>
          </svg>
          <span class="score-num">{{ data.health_score }}</span>
        </div>
        <div class="health-info">
          <h2>{{ $t('bottleneck.health_score') }}</h2>
          <p>{{ healthMessage }}</p>
        </div>
        <div class="health-stats">
          <div class="hstat" v-for="s in summaryStat" :key="s.key">
            <span class="hstat-val" :style="{ color: s.color }">{{ s.val }}</span>
            <span class="hstat-label">{{ $t('bottleneck.' + s.key) }}</span>
          </div>
        </div>
      </div>

      <!-- Config Bar -->
      <div class="config-bar">
        <div class="config-item">
          <label>{{ $t('bottleneck.overload_threshold') }}</label>
          <input type="number" v-model.number="config.overload_threshold" min="1" max="20" @change="fetchData" />
          <span>{{ $t('bottleneck.tasks_per_person') }}</span>
        </div>
        <div class="config-item">
          <label>{{ $t('bottleneck.stale_after') }}</label>
          <input type="number" v-model.number="config.stale_days" min="1" max="60" @change="fetchData" />
          <span>{{ $t('bottleneck.days') }}</span>
        </div>
        <div class="config-item">
          <label>{{ $t('bottleneck.wip_limit') }}</label>
          <input type="number" v-model.number="config.wip_limit" min="1" max="50" @change="fetchData" />
          <span>{{ $t('bottleneck.tasks_per_column') }}</span>
        </div>
      </div>

      <div class="grid-2">

        <!-- Overloaded Assignees -->
        <div class="bn-card" :class="{ 'has-issues': data.overloaded_assignees.length }">
          <div class="card-header">
            <div class="card-icon red"><i class="fa-solid fa-fire"></i></div>
            <div>
              <h3>{{ $t('bottleneck.overloaded') }}</h3>
              <p>{{ $t('bottleneck.overloaded_desc') }}</p>
            </div>
            <span class="badge-count red">{{ data.overloaded_assignees.length }}</span>
          </div>
          <div v-if="data.overloaded_assignees.length" class="card-body">
            <div v-for="a in data.overloaded_assignees" :key="a.username" class="assignee-row">
              <div class="avatar-sm">{{ a.username[0].toUpperCase() }}</div>
              <div class="assignee-info">
                <span class="assignee-name">{{ a.username }}</span>
                <div class="task-pills">
                  <span v-for="t in a.tasks.slice(0,3)" :key="t.id" class="task-pill" :class="'p-' + t.priority.toLowerCase()">
                    #{{ t.id }} {{ t.title.slice(0, 25) }}{{ t.title.length > 25 ? '…' : '' }}
                  </span>
                  <span v-if="a.tasks.length > 3" class="task-pill more">+{{ a.tasks.length - 3 }}</span>
                </div>
              </div>
              <div class="load-bar-wrap">
                <div class="load-bar" :style="{ width: Math.min((a.count / 10) * 100, 100) + '%', background: a.count >= 6 ? '#ef4444' : '#f59e0b' }"></div>
                <span class="load-num">{{ a.count }}</span>
              </div>
            </div>
          </div>
          <div v-else class="card-empty"><i class="fa-solid fa-circle-check"></i> {{ $t('bottleneck.no_issues') }}</div>
        </div>

        <!-- Blocked Tasks -->
        <div class="bn-card" :class="{ 'has-issues': data.blocked_tasks.length }">
          <div class="card-header">
            <div class="card-icon orange"><i class="fa-solid fa-ban"></i></div>
            <div>
              <h3>{{ $t('bottleneck.blocked') }}</h3>
              <p>{{ $t('bottleneck.blocked_desc') }}</p>
            </div>
            <span class="badge-count orange">{{ data.blocked_tasks.length }}</span>
          </div>
          <div v-if="data.blocked_tasks.length" class="card-body">
            <div v-for="t in data.blocked_tasks" :key="t.id" class="task-row">
              <span class="task-id">#{{ t.id }}</span>
              <span class="task-title">{{ t.title }}</span>
              <span class="priority-badge" :class="'p-' + t.priority.toLowerCase()">{{ t.priority }}</span>
              <span class="block-count"><i class="fa-solid fa-link-slash fa-xs"></i> {{ t.blocked_by_count }}</span>
            </div>
          </div>
          <div v-else class="card-empty"><i class="fa-solid fa-circle-check"></i> {{ $t('bottleneck.no_issues') }}</div>
        </div>

        <!-- Overdue Tasks -->
        <div class="bn-card" :class="{ 'has-issues': data.overdue_tasks.length }">
          <div class="card-header">
            <div class="card-icon red"><i class="fa-solid fa-clock"></i></div>
            <div>
              <h3>{{ $t('bottleneck.overdue') }}</h3>
              <p>{{ $t('bottleneck.overdue_desc') }}</p>
            </div>
            <span class="badge-count red">{{ data.overdue_tasks.length }}</span>
          </div>
          <div v-if="data.overdue_tasks.length" class="card-body">
            <div v-for="t in data.overdue_tasks.slice(0, 8)" :key="t.id" class="task-row">
              <span class="task-id">#{{ t.id }}</span>
              <span class="task-title">{{ t.title }}</span>
              <span class="priority-badge" :class="'p-' + t.priority.toLowerCase()">{{ t.priority }}</span>
              <span class="overdue-days red-text">{{ t.days_overdue }} {{ $t('bottleneck.days_overdue') }}</span>
            </div>
          </div>
          <div v-else class="card-empty"><i class="fa-solid fa-circle-check"></i> {{ $t('bottleneck.no_issues') }}</div>
        </div>

        <!-- Stale Tasks -->
        <div class="bn-card" :class="{ 'has-issues': data.stale_tasks.length }">
          <div class="card-header">
            <div class="card-icon yellow"><i class="fa-solid fa-hourglass-half"></i></div>
            <div>
              <h3>{{ $t('bottleneck.stale') }}</h3>
              <p>{{ $t('bottleneck.stale_desc') }}</p>
            </div>
            <span class="badge-count yellow">{{ data.stale_tasks.length }}</span>
          </div>
          <div v-if="data.stale_tasks.length" class="card-body">
            <div v-for="t in data.stale_tasks.slice(0, 8)" :key="t.id" class="task-row">
              <span class="task-id">#{{ t.id }}</span>
              <span class="task-title">{{ t.title }}</span>
              <span class="status-chip">{{ t.status_name }}</span>
              <span class="stale-days yellow-text">{{ t.days_stale }} {{ $t('bottleneck.days_stale') }}</span>
            </div>
          </div>
          <div v-else class="card-empty"><i class="fa-solid fa-circle-check"></i> {{ $t('bottleneck.no_issues') }}</div>
        </div>

        <!-- WIP per Column -->
        <div class="bn-card" :class="{ 'has-issues': data.wip_exceeded.length }">
          <div class="card-header">
            <div class="card-icon purple"><i class="fa-solid fa-layer-group"></i></div>
            <div>
              <h3>{{ $t('bottleneck.wip') }}</h3>
              <p>{{ $t('bottleneck.wip_desc') }}</p>
            </div>
            <span class="badge-count purple">{{ data.wip_exceeded.length }} {{ $t('bottleneck.exceeded') }}</span>
          </div>
          <div v-if="data.wip_columns.length" class="card-body">
            <div v-for="col in data.wip_columns" :key="col.status_name" class="wip-row">
              <div class="wip-dot" :style="{ background: col.color }"></div>
              <span class="wip-name">{{ col.status_name }}</span>
              <div class="wip-bar-wrap">
                <div class="wip-bar" :style="{
                  width: Math.min((col.count / (config.wip_limit * 2)) * 100, 100) + '%',
                  background: col.count > config.wip_limit ? '#ef4444' : '#10b981'
                }"></div>
              </div>
              <span class="wip-count" :class="{ 'red-text': col.count > config.wip_limit }">{{ col.count }}</span>
              <span v-if="col.count > config.wip_limit" class="wip-exceeded-badge">⚠ {{ $t('bottleneck.exceeded') }}</span>
            </div>
          </div>
          <div v-else class="card-empty"><i class="fa-solid fa-circle-check"></i> {{ $t('bottleneck.no_issues') }}</div>
        </div>

        <!-- Unassigned High Priority -->
        <div class="bn-card" :class="{ 'has-issues': data.unassigned_high_priority.length }">
          <div class="card-header">
            <div class="card-icon orange"><i class="fa-solid fa-user-slash"></i></div>
            <div>
              <h3>{{ $t('bottleneck.unassigned') }}</h3>
              <p>{{ $t('bottleneck.unassigned_desc') }}</p>
            </div>
            <span class="badge-count orange">{{ data.unassigned_high_priority.length }}</span>
          </div>
          <div v-if="data.unassigned_high_priority.length" class="card-body">
            <div v-for="t in data.unassigned_high_priority" :key="t.id" class="task-row">
              <span class="task-id">#{{ t.id }}</span>
              <span class="task-title">{{ t.title }}</span>
              <span class="status-chip">{{ t.status }}</span>
            </div>
          </div>
          <div v-else class="card-empty"><i class="fa-solid fa-circle-check"></i> {{ $t('bottleneck.no_issues') }}</div>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '@/plugins/axios';

const props = defineProps(['projectId', 'projectName']);
const { t } = useI18n();

const loading = ref(true);
const data = ref({
  health_score: 100,
  overloaded_assignees: [],
  blocked_tasks: [],
  overdue_tasks: [],
  stale_tasks: [],
  wip_columns: [],
  wip_exceeded: [],
  unassigned_high_priority: [],
});

const config = ref({ overload_threshold: 3, stale_days: 7, wip_limit: 5 });

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await axios.get(`/api/pm/projects/${props.projectId}/bottleneck/`, {
      params: {
        overload_threshold: config.value.overload_threshold,
        stale_days: config.value.stale_days,
        wip_limit: config.value.wip_limit,
      }
    });
    data.value = res.data;
    config.value = res.data.config;
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
};

const healthClass = computed(() => {
  const s = data.value.health_score;
  if (s >= 75) return 'health-good';
  if (s >= 45) return 'health-warn';
  return 'health-bad';
});

const healthColor = computed(() => {
  const s = data.value.health_score;
  if (s >= 75) return '#10b981';
  if (s >= 45) return '#f59e0b';
  return '#ef4444';
});

const healthMessage = computed(() => {
  const s = data.value.health_score;
  if (s >= 75) return t('bottleneck.health_good');
  if (s >= 45) return t('bottleneck.health_warn');
  return t('bottleneck.health_bad');
});

const summaryStat = computed(() => [
  { key: 'overloaded', val: data.value.overloaded_assignees.length, color: '#ef4444' },
  { key: 'blocked',    val: data.value.blocked_tasks.length,         color: '#f97316' },
  { key: 'overdue',    val: data.value.overdue_tasks.length,          color: '#ef4444' },
  { key: 'stale',      val: data.value.stale_tasks.length,            color: '#f59e0b' },
  { key: 'wip',        val: data.value.wip_exceeded.length,           color: '#a855f7' },
  { key: 'unassigned', val: data.value.unassigned_high_priority.length, color: '#f97316' },
]);

onMounted(fetchData);
</script>

<style scoped>
.bottleneck-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--bg-body); color: var(--text-main); }

/* Top Bar */
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 68px; border-bottom: 1px solid var(--border-color); background: var(--bg-card); flex-shrink: 0; }
.bar-left { display: flex; align-items: center; gap: 14px; }
.btn-back { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border-color); background: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: .2s; }
.btn-back:hover { border-color: var(--primary); color: var(--primary); }
.breadcrumbs { display: flex; align-items: center; gap: 8px; }
.crumb { font-size: .85rem; font-weight: 600; color: var(--text-muted); cursor: pointer; }
.crumb:hover { color: var(--primary); }
.crumb.active { color: var(--text-main); font-weight: 800; }
.sep { opacity: .25; font-size: .65rem; }
.btn-refresh { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border-color); background: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: .3s; }
.btn-refresh:hover { color: var(--primary); border-color: var(--primary); }
.btn-refresh.spinning i { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Loading */
.loading-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--text-muted); }
.spinner-lg { width: 48px; height: 48px; border: 4px solid var(--border-color); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; }

/* Main */
.main-content { flex: 1; overflow-y: auto; padding: 28px 32px; display: flex; flex-direction: column; gap: 24px; }

/* Health Banner */
.health-banner { display: flex; align-items: center; gap: 28px; padding: 24px 32px; border-radius: 20px; border: 1px solid; }
.health-good { background: rgba(16,185,129,.08); border-color: rgba(16,185,129,.25); }
.health-warn { background: rgba(245,158,11,.08); border-color: rgba(245,158,11,.25); }
.health-bad  { background: rgba(239,68,68,.08);  border-color: rgba(239,68,68,.25); }
.health-score-ring { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
.health-score-ring svg { width: 80px; height: 80px; }
.score-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 900; color: var(--text-main); }
.health-info { flex: 1; }
.health-info h2 { font-size: 1.1rem; font-weight: 800; margin-bottom: 4px; }
.health-info p { font-size: .88rem; color: var(--text-muted); }
.health-stats { display: flex; gap: 20px; flex-wrap: wrap; }
.hstat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.hstat-val { font-size: 1.4rem; font-weight: 900; }
.hstat-label { font-size: .7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; white-space: nowrap; }

/* Config Bar */
.config-bar { display: flex; gap: 20px; flex-wrap: wrap; padding: 14px 20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; }
.config-item { display: flex; align-items: center; gap: 8px; font-size: .85rem; }
.config-item label { color: var(--text-muted); font-weight: 600; }
.config-item input { width: 56px; padding: 5px 8px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-size: .85rem; text-align: center; }
.config-item span { color: var(--text-muted); font-size: .8rem; }

/* Grid */
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
@media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }

/* Cards */
.bn-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; transition: border-color .2s; }
.bn-card.has-issues { border-color: rgba(239,68,68,.3); }
.card-header { display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-bottom: 1px solid var(--border-color); }
.card-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: .95rem; flex-shrink: 0; }
.card-icon.red    { background: rgba(239,68,68,.15);  color: #ef4444; }
.card-icon.orange { background: rgba(249,115,22,.15); color: #f97316; }
.card-icon.yellow { background: rgba(245,158,11,.15); color: #f59e0b; }
.card-icon.purple { background: rgba(168,85,247,.15); color: #a855f7; }
.card-header h3 { font-size: .95rem; font-weight: 800; margin-bottom: 2px; }
.card-header p  { font-size: .75rem; color: var(--text-muted); }
.badge-count { margin-left: auto; padding: 4px 10px; border-radius: 20px; font-size: .75rem; font-weight: 800; flex-shrink: 0; }
.badge-count.red    { background: rgba(239,68,68,.15);  color: #ef4444; }
.badge-count.orange { background: rgba(249,115,22,.15); color: #f97316; }
.badge-count.yellow { background: rgba(245,158,11,.15); color: #f59e0b; }
.badge-count.purple { background: rgba(168,85,247,.15); color: #a855f7; }
.card-body { padding: 14px 20px; display: flex; flex-direction: column; gap: 10px; max-height: 280px; overflow-y: auto; }
.card-empty { padding: 24px 20px; text-align: center; color: #10b981; font-size: .88rem; font-weight: 600; }

/* Assignee Row */
.assignee-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-color); }
.assignee-row:last-child { border-bottom: none; }
.avatar-sm { width: 30px; height: 30px; border-radius: 50%; background: var(--primary-bg); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 700; flex-shrink: 0; }
.assignee-info { flex: 1; }
.assignee-name { font-size: .88rem; font-weight: 700; display: block; margin-bottom: 4px; }
.task-pills { display: flex; flex-wrap: wrap; gap: 4px; }
.task-pill { font-size: .7rem; padding: 2px 8px; border-radius: 10px; background: var(--bg-secondary); color: var(--text-muted); }
.task-pill.p-high   { background: rgba(239,68,68,.1);  color: #ef4444; }
.task-pill.p-medium { background: rgba(245,158,11,.1); color: #f59e0b; }
.task-pill.p-low    { background: rgba(16,185,129,.1); color: #10b981; }
.task-pill.more     { background: var(--bg-tertiary); }
.load-bar-wrap { display: flex; align-items: center; gap: 6px; width: 80px; flex-shrink: 0; }
.load-bar { height: 6px; border-radius: 3px; transition: width .4s; }
.load-num { font-size: .8rem; font-weight: 800; color: var(--text-main); }

/* Task Row */
.task-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: .85rem; }
.task-row:last-child { border-bottom: none; }
.task-id { color: var(--text-muted); font-size: .75rem; flex-shrink: 0; }
.task-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.priority-badge { font-size: .7rem; padding: 2px 8px; border-radius: 10px; font-weight: 700; flex-shrink: 0; }
.p-high   { background: rgba(239,68,68,.15);  color: #ef4444; }
.p-medium { background: rgba(245,158,11,.15); color: #f59e0b; }
.p-low    { background: rgba(16,185,129,.15); color: #10b981; }
.status-chip { font-size: .7rem; padding: 2px 8px; border-radius: 10px; background: var(--bg-secondary); color: var(--text-muted); flex-shrink: 0; }
.block-count { font-size: .75rem; color: #f97316; flex-shrink: 0; }
.overdue-days, .stale-days { font-size: .75rem; font-weight: 700; flex-shrink: 0; }
.red-text    { color: #ef4444; }
.yellow-text { color: #f59e0b; }

/* WIP Row */
.wip-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--border-color); }
.wip-row:last-child { border-bottom: none; }
.wip-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.wip-name { width: 120px; font-size: .85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wip-bar-wrap { flex: 1; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }
.wip-bar { height: 100%; border-radius: 3px; transition: width .4s; }
.wip-count { font-size: .85rem; font-weight: 800; width: 24px; text-align: right; flex-shrink: 0; }
.wip-exceeded-badge { font-size: .68rem; color: #ef4444; font-weight: 700; flex-shrink: 0; }
</style>
