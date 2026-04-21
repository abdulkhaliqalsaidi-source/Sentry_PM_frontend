<template>
    <div class="overview-v-refined" :class="{ 'v-ready': ready }" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">
        
        <!-- ════════════════════════════════
             GRAND GREETING FEATURE
        ════════════════════════════════ -->
        <div class="greeting-feature-v glass-morphic">
            <div class="g-content">
                <div class="g-icon-pod" :class="timeContext">
                    <i :class="timeIcon"></i>
                    <div class="g-glow-orb"></div>
                </div>
                <div class="g-text">
                    <h1>{{ currentGreeting }}, {{ username }}</h1>
                    <p>{{ $t('dashboard.welcome_desc') }}</p>
                </div>
            </div>
            <div class="g-meta-pill glass-morphic">
                <i class="fa-solid fa-calendar-alt"></i>
                <span>{{ currentDateLabel }}</span>
            </div>
            <div class="g-mesh-bg"></div>
        </div>

        <!-- ════════════════════════════════
             GLOBAL DASHBOARD (No Project)
        ════════════════════════════════ -->
        <template v-if="!projectId">

            <!-- 1. System Health & Errors -->
            <div class="cat-section-v">
                <div class="cat-header-v" style="margin-bottom: 5px;">
                    <h2><i class="fa-solid fa-microchip"></i> {{ $t('dashboard.system_errors_title') }}</h2>
                </div>

                <div class="stats-grid-v">
                    <!-- Total Errors -->
                    <div class="stat-card-premium-v red" @click="$router.push('/issues')">
                        <div class="s-icon-pod">
                            <LottieAnimation animationLink="" :loop="true" trigger="hover" width="32px" height="32px" fallbackIcon="fa-solid fa-circle-exclamation" />
                        </div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('dashboard.total_errors') }}</span>
                            <span class="s-val">{{ totalEvents }}</span>
                            <div class="s-footer">
                                <span class="badge danger"><i class="fa-solid fa-triangle-exclamation"></i> {{ $t('dashboard.needs_attention') }}</span>
                            </div>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>

                    <!-- Active Issues -->
                    <div class="stat-card-premium-v orange" @click="$router.push('/issues')">
                        <div class="s-icon-pod">
                            <LottieAnimation animationLink="" :loop="true" trigger="hover" width="32px" height="32px" fallbackIcon="fa-solid fa-fire-flame-curved" />
                        </div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('dashboard.active_issues') }}</span>
                            <span class="s-val">{{ openIssuesCount }}</span>
                            <div class="s-footer">
                                <span class="badge warning"><i class="fa-solid fa-circle-dot"></i> {{ $t('dashboard.open') }}</span>
                            </div>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>

                    <!-- Projects -->
                    <div class="stat-card-premium-v success" @click="$router.push('/projects')">
                        <div class="s-icon-pod">
                            <LottieAnimation animationLink="" :loop="true" trigger="hover" width="32px" height="32px" fallbackIcon="fa-solid fa-folder-tree" />
                        </div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('common.projects') }}</span>
                            <span class="s-val">{{ uniqueProjects.length }}</span>
                            <div class="s-footer">
                                <span class="badge progress"><i class="fa-solid fa-check-double"></i> {{ $t('dashboard.active') }}</span>
                            </div>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>
                </div>
            </div>

            <!-- 3. Project Management Orbitals -->
            <div class="cat-section-v">
                <div class="cat-header-v" style="margin-bottom: 5px;">
                    <h2><i class="fa-solid fa-briefcase"></i> {{ $t('dashboard.pm_stats_title') }}</h2>
                </div>
                <div class="stats-grid-v">
                    <!-- Members -->
                    <div class="stat-card-premium-v info">
                        <div class="s-icon-pod">
                            <LottieAnimation animationLink="https://cdn.lordicon.com/dxjqoygy.json" :loop="true" trigger="hover" width="32px" height="32px" fallbackIcon="fa-solid fa-user-group" />
                        </div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('dashboard.total_members') }}</span>
                            <span class="s-val">{{ stats.totalMembers }}</span>
                            <div class="s-footer"><span class="badge neutral">{{ $t('dashboard.across_projects') }}</span></div>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>

                    <!-- Total Tasks -->
                    <div class="stat-card-premium-v purple">
                        <div class="s-icon-pod">
                            <LottieAnimation animationLink="" :loop="true" trigger="hover" width="32px" height="32px" fallbackIcon="fa-solid fa-list-check" />
                        </div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('dashboard.total_tasks') }}</span>
                            <span class="s-val">{{ stats.totalTasks }}</span>
                            <div class="s-footer"><span class="badge success">{{ stats.doneTasks }} {{ $t('common.done') }}</span></div>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>

                    <!-- Sprints -->
                    <div class="stat-card-premium-v teal">
                        <div class="s-icon-pod">
                            <LottieAnimation animationLink="" :loop="true" trigger="hover" width="32px" height="32px" fallbackIcon="fa-solid fa-person-running" />
                        </div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('dashboard.active_sprints') }}</span>
                            <span class="s-val">{{ stats.activeSprints }}</span>
                            <div class="s-footer"><span class="badge neutral">{{ stats.totalSprints }} {{ $t('dashboard.total') }}</span></div>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>

                    <!-- Completion -->
                    <div class="stat-card-premium-v indigo">
                        <div class="s-icon-pod">
                            <LottieAnimation animationLink="" :loop="true" trigger="hover" width="32px" height="32px" fallbackIcon="fa-solid fa-chart-simple" />
                        </div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('dashboard.completion_rate') }}</span>
                            <span class="s-val">{{ completionRate }}%</span>
                            <div class="s-footer-progress">
                                <div class="prog-track"><div class="prog-fill" :style="{ width: completionRate + '%' }"></div></div>
                            </div>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>
                </div>
            </div>

            <!-- 4. Project Command breakdown -->
            <div v-if="projectStats?.length > 0" class="cat-section-v">
                <div class="cat-header-v" style="margin-bottom: 5px;">
                    <h2><i class="fa-solid fa-layer-group"></i> {{ $t('dashboard.project_breakdown') }}</h2>
                </div>
                <div class="project-list-grid-v">
                    <div v-for="(project, idx) in projectStats" :key="project.name" 
                         class="project-card-refined glass-morphic"
                         @click="$router.push(`/projects/${project.id}/summary`)"
                         :style="{ '--idx': idx }">
                        <div class="prj-h">
                            <div class="prj-avatar">{{ project.name.charAt(0).toUpperCase() }}</div>
                            <div class="prj-meta">
                                <h3>{{ project.name }}</h3>
                                <span class="prj-status"><i class="fa-solid fa-shield-halved"></i> {{ $t('dashboard.monitoring') }}</span>
                            </div>
                            <div class="prj-arrow"><i class="fa-solid fa-chevron-right"></i></div>
                        </div>
                        <div class="prj-body">
                            <div class="prj-metric">
                                <span class="l">{{ $t('dashboard.total_errors') }}</span>
                                <span class="v">{{ project.totalErrors }}</span>
                            </div>
                            <div class="prj-metric danger">
                                <span class="l">{{ $t('dashboard.active_issues') }}</span>
                                <span class="v">{{ project.activeIssues }}</span>
                            </div>
                        </div>
                        <div class="prj-footer">
                            <div class="prj-track"><div class="prj-fill" :style="{ width: project.activeIssues > 0 ? '60%' : '100%', background: project.activeIssues > 5 ? '#f43f5e' : '#10b981' }"></div></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 5. Performance & Team Excellence -->
            <div class="performance-grid-v" v-if="evalStats.evals.length > 0">
                
                <!-- Leaderboard Card -->
                <div class="card-v glass-morphic leaderboard-v">
                    <div class="card-h-v">
                        <h3><i class="fa-solid fa-ranking-star indigo" style="color:#6366f1;"></i> {{ $t('dashboard.leaderboard') }}</h3>
                        <span class="h-meta">{{ evalStats.periodName }}</span>
                    </div>
                    <div class="lb-rows-v">
                        <div v-for="(ev, idx) in evalStats.top5" :key="ev.id" class="lb-row-refined" :class="{ 'top-tier': idx < 3 }">
                            <div class="lb-r-rank">
                                <span v-if="idx === 0" class="mld gld"><i class="fa-solid fa-crown"></i></span>
                                <span v-else-if="idx === 1" class="mld slv"><i class="fa-solid fa-medal"></i></span>
                                <span v-else-if="idx === 2" class="mld brz"><i class="fa-solid fa-award"></i></span>
                                <span v-else class="idx-n">#{{ idx + 1 }}</span>
                            </div>
                            <div class="lb-r-avatar">{{ (ev.username || '?').charAt(0).toUpperCase() }}</div>
                            <div class="lb-r-body">
                                <span class="lb-r-user">{{ ev.username }}</span>
                                <div class="lb-r-track">
                                    <div class="lb-r-fill" :style="{ width: ev.score + '%', background: scoreColor(ev.score) }"></div>
                                </div>
                            </div>
                            <span class="lb-r-pts">{{ parseFloat(ev.score).toFixed(0) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Score Distribution Card -->
                <div class="card-v glass-morphic score-dist-v">
                    <div class="card-h-v">
                        <h3><i class="fa-solid fa-chart-line-up purple" style="color:#8b5cf6;"></i> {{ $t('dashboard.score_distribution') }}</h3>
                    </div>
                    <div class="dist-rows-v">
                        <div v-for="bucket in evalStats.scoreBuckets" :key="bucket.labelKey" class="dist-row-refined">
                            <div class="dist-r-meta">
                                <span class="dist-r-lbl">{{ $t(`dashboard.${bucket.labelKey}`) }}</span>
                                <span class="dist-r-cnt">{{ bucket.count }}</span>
                            </div>
                            <div class="dist-r-track">
                                <div class="dist-r-fill" :style="{ width: bucket.pct + '%', background: bucket.color }"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </template>

        <!-- ════════════════════════════════
             PROJECT-SPECIFIC DASHBOARD
        ════════════════════════════════ -->
        <template v-else>
            <!-- 1. System Health & Errors -->
            <div class="cat-section-v">
                <div class="cat-header-v">
                    <h2><i class="fa-solid fa-server"></i> {{ $t('dashboard.system_errors_title') }}</h2>
                </div>
                <div class="stats-grid-v">
                    <div class="stat-card-premium-v red">
                        <div class="s-icon-pod"><i class="fa-solid fa-bug"></i></div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('dashboard.total_errors') }}</span>
                            <span class="s-val">{{ totalEvents }}</span>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>
                    <div class="stat-card-premium-v orange">
                        <div class="s-icon-pod"><i class="fa-solid fa-circle-dot"></i></div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('dashboard.active_issues') }}</span>
                            <span class="s-val">{{ openIssuesCount }}</span>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>
                </div>
            </div>

            <!-- 2. Project Management Orbitals (Specific Project) -->
            <div class="cat-section-v">
                <div class="cat-header-v" style="margin-bottom: 5px;">
                    <h2><i class="fa-solid fa-briefcase"></i> {{ $t('dashboard.pm_stats_title') }}</h2>
                </div>
                <div class="stats-grid-v">
                    <!-- Members -->
                    <div class="stat-card-premium-v info" @click="$router.push(`/projects/${projectId}/members`)">
                        <div class="s-icon-pod">
                            <i class="fa-solid fa-users"></i>
                        </div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('dashboard.total_members') }}</span>
                            <span class="s-val">{{ stats.totalMembers }}</span>
                            <div class="s-footer"><span class="badge neutral">{{ $t('dashboard.active') }}</span></div>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>

                    <!-- Total Tasks -->
                    <div class="stat-card-premium-v purple" @click="$router.push(`/projects/${projectId}/backlog`)">
                        <div class="s-icon-pod">
                            <i class="fa-solid fa-list-check"></i>
                        </div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('dashboard.total_tasks') }}</span>
                            <span class="s-val">{{ stats.totalTasks }}</span>
                            <div class="s-footer"><span class="badge success">{{ stats.doneTasks }} {{ $t('common.done') }}</span></div>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>

                    <!-- Sprints -->
                    <div class="stat-card-premium-v teal" @click="$router.push(`/projects/${projectId}/`)">
                        <div class="s-icon-pod">
                            <i class="fa-solid fa-person-running"></i>
                        </div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('dashboard.active_sprints') }}</span>
                            <span class="s-val">{{ stats.activeSprints }}</span>
                            <div class="s-footer"><span class="badge neutral">{{ stats.totalSprints }} {{ $t('dashboard.total') }}</span></div>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>

                    <!-- Completion -->
                    <div class="stat-card-premium-v indigo">
                        <div class="s-icon-pod">
                            <i class="fa-solid fa-chart-pie"></i>
                        </div>
                        <div class="s-info">
                            <span class="s-lbl">{{ $t('dashboard.completion_rate') }}</span>
                            <span class="s-val">{{ completionRate }}%</span>
                            <div class="s-footer-progress">
                                <div class="prog-track"><div class="prog-fill" :style="{ width: completionRate + '%' }"></div></div>
                            </div>
                        </div>
                        <div class="s-card-glow"></div>
                        <div class="s-glint"></div>
                    </div>
                </div>
            </div>
        </template>

    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '@/plugins/axios';

const { t, locale } = useI18n();

const props = defineProps({
    totalEvents:    { type: Number,  default: 0 },
    openIssuesCount:{ type: Number,  default: 0 },
    uniqueProjects: { type: Array,   default: () => [] },
    projectId:      { type: [String, Number], default: null },
    projectStats:   { type: Array,   default: () => [] },
    codeIssues:     { type: Array,   default: () => [] },
    networkIssues:  { type: Array,   default: () => [] }
});

const ready = ref(false);
const username = ref(localStorage.getItem('username') || t('dashboard.command_user'));

// ── Time/Greeting Logic ──
const timeContext = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
});

const currentGreeting = computed(() => {
    if (timeContext.value === 'morning') return t('dashboard.greeting_morning');
    if (timeContext.value === 'afternoon') return t('dashboard.greeting_afternoon');
    return t('dashboard.greeting_evening');
});

const timeIcon = computed(() => {
    if (timeContext.value === 'morning') return 'fa-solid fa-sun';
    if (timeContext.value === 'afternoon') return 'fa-solid fa-cloud-sun';
    return 'fa-solid fa-moon';
});

const currentDateLabel = computed(() => {
    return new Date().toLocaleDateString(locale.value === 'ar' ? 'ar-SA' : 'en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
});

// ── Local stats state ──
const stats = ref({
    totalTasks:   0, doneTasks: 0, inProgressTasks: 0, todoTasks: 0,
    activeSprints: 0, totalSprints: 0, totalMembers: 0, avgEvalScore: 0,
});

const evalStats = ref({
    evals: [], top5: [], avgScore: 0, topPerformer: '—', topScore: 0, totalPoints: 0, periodName: '', scoreBuckets: [],
});

const completionRate = computed(() =>
    stats.value.totalTasks > 0 ? Math.round((stats.value.doneTasks / stats.value.totalTasks) * 100) : 0
);

const scoreColor = (score) => {
    if (score >= 90) return 'linear-gradient(90deg, #10b981, #34d399)';
    if (score >= 80) return 'linear-gradient(90deg, #3b82f6, #60a5fa)';
    if (score >= 70) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    return 'linear-gradient(90deg, #f43f5e, #fb7185)';
};

const fetchStats = async () => {
    try {
        const taskParams = props.projectId ? `?project=${props.projectId}` : '';
        const [tasksRes, sprintsRes] = await Promise.all([
            axios.get(`/api/pm/tasks/${taskParams}`),
            axios.get(`/api/pm/sprints/${taskParams}`),
        ]);

        const tasks   = tasksRes.data?.results   || tasksRes.data   || [];
        const sprints = sprintsRes.data?.results || sprintsRes.data || [];

        const getCategory = (task) => {
            const cat = task.status_details?.category;
            if (cat) return cat;
            const name = (task.status_details?.name || '').toLowerCase();
            if (['done', 'completed', 'closed'].includes(name)) return 'DONE';
            if (['in_progress', 'doing', 'in review', 'pending'].includes(name)) return 'IN_PROGRESS';
            return 'TO_DO';
        };

        stats.value.totalTasks      = tasks.length;
        stats.value.doneTasks       = tasks.filter(t => getCategory(t) === 'DONE').length;
        stats.value.activeSprints   = sprints.filter(s => s.status === 'ACTIVE').length;
        stats.value.totalSprints    = sprints.length;

        if (!props.projectId) {
            try {
                const rolesRes = await axios.get('/api/pm/project-roles/');
                const uniqueUsers = new Set((rolesRes.data?.results || rolesRes.data || []).map(r => r.user)).size;
                stats.value.totalMembers = uniqueUsers;
            } catch { /* skip */ }

            try {
                const evalRes = await axios.get('/api/pm/evaluations/');
                const evals = (evalRes.data?.results || evalRes.data || []);
                if (evals.length > 0) {
                    const latestP = evals[0].period;
                    const currentEvals = evals.filter(e => e.period === latestP);
                    evalStats.value.evals = currentEvals;
                    evalStats.value.periodName = currentEvals[0]?.period_name || t('dashboard.active_period');
                    evalStats.value.avgScore = currentEvals.reduce((s,e) => s + parseFloat(e.score || 0), 0) / currentEvals.length;
                    evalStats.value.top5 = [...currentEvals].sort((a,b) => b.score - a.score).slice(0, 5);
                    
                    const buckets = [
                        { labelKey: 'eval_exceptional', count: 0, color: '#10b981', min: 90, max: 100 },
                        { labelKey: 'eval_exceeds', count: 0, color: '#3b82f6', min: 80, max: 89.9 },
                        { labelKey: 'eval_meets', count: 0, color: '#f59e0b', min: 70, max: 79.9 },
                        { labelKey: 'eval_needs_improv', count: 0, color: '#f43f5e', min: 0, max: 69.9 },
                    ];
                    currentEvals.forEach(e => {
                        const score = parseFloat(e.score || 0);
                        const b = buckets.find(b => score >= b.min && score <= b.max);
                        if (b) b.count++;
                    });
                    buckets.forEach(b => b.pct = (b.count / currentEvals.length) * 100);
                    evalStats.value.scoreBuckets = buckets;
                }
            } catch { /* skip */ }
        } else {
            try {
                const rolesRes = await axios.get(`/api/pm/project-roles/?project=${props.projectId}`);
                stats.value.totalMembers = (rolesRes.data?.results || rolesRes.data || []).length;
            } catch { /* skip */ }
        }
    } catch (e) { console.error("Stats Fetch Error", e); }
};

onMounted(async () => {
    await fetchStats();
    setTimeout(() => ready.value = true, 100);
});
watch(() => props.projectId, fetchStats);
</script>

<style scoped>
.overview-v-refined {
    padding: 35px; min-height: 100%; display: flex; flex-direction: column; gap: 40px;
    background: var(--bg-body); position: relative;
    opacity: 0; transform: translateY(10px); transition: 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.overview-v-refined.v-ready { opacity: 1; transform: translateY(0); }

/* 1. Grand Greeting Header */
.greeting-feature-v {
    position: relative; padding: 45px; border-radius: 35px; display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(135deg, var(--primary), var(--indigo-800));
    border: 1px solid var(--glass-border); overflow: hidden;
    box-shadow: var(--shadow-lg);
}
.g-content { display: flex; align-items: center; gap: 30px; z-index: 2; }
.g-icon-pod {
    width: 80px; height: 80px; border-radius: 24px; display: flex; align-items: center; justify-content: center;
    font-size: 35px; color: white; position: relative;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
}
.g-icon-pod.morning { color: #fbbf24; }
.g-icon-pod.afternoon { color: #38bdf8; }
.g-icon-pod.evening { color: #fbbf24; }
.g-glow-orb { position: absolute; inset: -10px; background: white; filter: blur(25px); opacity: 0.1; }

.g-text h1 { margin: 0; font-size: 2.8rem; font-weight: 900; color: white; letter-spacing: -1.5px; }
.g-text p { margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.82); font-weight: 600; font-size: 1.1rem; }

.g-meta-pill { display: flex; align-items: center; gap: 12px; padding: 12px 24px; border-radius: 100px; color: white; font-weight: 800; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); z-index: 2; backdrop-filter: blur(10px); }
.g-mesh-bg { position: absolute; inset: 0; background: radial-gradient(circle at 10% 10%, rgba(255, 255, 255, 0.1), transparent 50%), radial-gradient(circle at 90% 90%, rgba(0, 0, 0, 0.05), transparent 50%); z-index: 1; }

/* 2. Refined Stat Grid */
.cat-section-v { display: flex; flex-direction: column; gap: 20px; }
.cat-header-v h2 { font-size: 1.3rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 12px; margin:0;}
.cat-header-v h2 i { color: var(--primary); }

.stats-grid-v { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; }
.stat-card-premium-v {
    padding: 30px; border-radius: 30px; background: var(--bg-card); display: flex; align-items: flex-start; gap: 22px;
    border: 1px solid var(--border-color); position: relative; overflow: hidden;
    cursor: pointer; transition: 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
    box-shadow: var(--shadow-sm);
}
.stat-card-premium-v:hover { transform: translateY(-8px); border-color: var(--primary-glow); box-shadow: var(--shadow-lg); }

.s-icon-pod {
    width: 60px; height: 60px; border-radius: 20px; display: flex; align-items: center; justify-content: center;
    background: var(--bg-hover); border: 1px solid var(--border-color); color: var(--primary); font-size: 22px; flex-shrink: 0;
}
.s-info { display: flex; flex-direction: column; flex: 1; }
.s-lbl { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
.s-val { font-size: 2.2rem; font-weight: 900; color: var(--text-main); margin: 4px 0 10px 0; font-family: var(--font-sans); line-height: 1; }

.badge { padding: 4px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; }
.badge.danger { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
.badge.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.badge.progress { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.badge.neutral { background: rgba(255,255,255,0.05); color: var(--text-muted); }
.badge.success { background: rgba(99, 102, 241, 0.1); color: #6366f1; }

.s-footer-progress { width: 100%; margin-top: 5px; }
.prog-track { height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; }
.prog-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #a855f7); border-radius: 10px; transition: 1s ease; }

.s-card-glow { position: absolute; bottom: -40px; right: -40px; width: 140px; height: 140px; border-radius: 50%; filter: blur(50px); opacity: 0.05; transition: 0.4s; z-index: 1; }
.stat-card-premium-v:hover .s-card-glow { opacity: 0.12; scale: 1.3; }

.red .s-card-glow { background: #f43f5e; }
.orange .s-card-glow { background: #f59e0b; }
.success .s-card-glow { background: #10b981; }
.info .s-card-glow { background: #3b82f6; }
.purple .s-card-glow { background: #8b5cf6; }
.teal .s-card-glow { background: #06b6d4; }
.indigo .s-card-glow { background: #6366f1; }

.s-glint { position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); transform: skewX(-30deg); transition: 0.6s; z-index: 2; }
.stat-card-premium-v:hover .s-glint { left: 150%; }

/* 3. Performance Grid (Leaderboard sync) */
.performance-grid-v { display: grid; grid-template-columns: 1.5fr 1fr; gap: 30px; }
.card-v { padding: 35px; border-radius: 35px; display: flex; flex-direction: column; gap: 30px; border: 1px solid var(--border-color); background: var(--bg-card); box-shadow: var(--shadow-md); transition: 0.4s; }
.card-v:hover { box-shadow: var(--shadow-lg); transform: translateY(-5px); border-color: var(--primary-glow); }
.card-h-v { display: flex; justify-content: space-between; align-items: center; }
.card-h-v h3 { margin: 0; font-size: 1.35rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 15px; }
.h-meta { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); background: var(--bg-hover); padding: 5px 15px; border-radius: 50px; }

.lb-rows-v { display: flex; flex-direction: column; gap: 15px; }
.lb-row-refined { display: flex; align-items: center; gap: 20px; padding: 18px 25px; border-radius: 24px; border: 1px solid transparent; transition: 0.3s; }
.lb-row-refined:hover { background: var(--bg-hover); border-color: var(--border-color); transform: scale(1.01); }
.lb-row-refined.top-tier { background: var(--primary-bg); border-color: var(--primary-glow); }

.lb-r-rank { width: 40px; display: flex; justify-content: center; }
.mld { font-size: 1.8rem; }
.mld.gld { color: #fbbf24; filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.3)); }
.mld.slv { color: #94a3b8; }
.mld.brz { color: #b45309; }
.idx-n { font-weight: 900; color: var(--text-muted); }

.lb-r-avatar { width: 48px; height: 48px; border-radius: 14px; background: var(--bg-hover); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-weight: 900; color: var(--primary); }
.lb-r-body { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.lb-r-user { font-weight: 800; color: var(--text-main); font-size: 1.1rem; }
.lb-r-track { height: 6px; background: var(--bg-hover); border-radius: 10px; overflow: hidden; }
.lb-r-fill { height: 100%; border-radius: 10px; transition: 1s ease; }
.lb-r-pts { font-weight: 900; font-size: 1.3rem; color: var(--primary); width: 45px; text-align: end; }

.dist-rows-v { display: flex; flex-direction: column; gap: 20px; }
.dist-row-refined { display: flex; flex-direction: column; gap: 10px; }
.dist-r-meta { display: flex; justify-content: space-between; font-weight: 800; font-size: 0.85rem; }
.dist-r-lbl { color: var(--text-muted); text-transform: uppercase; }
.dist-r-cnt { color: var(--text-main); }
.dist-r-track { height: 10px; background: var(--bg-hover); border-radius: 5px; overflow: hidden; }
.dist-r-fill { height: 100%; border-radius: 5px; transition: 1s ease; }

/* 4. Project List Refined */
.project-list-grid-v { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; }
.project-card-refined { 
    padding: 30px; border-radius: 30px; display: flex; flex-direction: column; gap: 25px;
    background: var(--bg-card); border: 1px solid var(--border-color); cursor: pointer; transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1);
    box-shadow: var(--shadow-sm);
}
.project-card-refined:hover { transform: translateY(-10px); border-color: var(--primary-glow); box-shadow: var(--shadow-lg); }

.prj-h { display: flex; align-items: center; gap: 20px; }
.prj-avatar { width: 52px; height: 52px; border-radius: 16px; background: linear-gradient(135deg, var(--primary), var(--indigo-800)); color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.3rem; }
.prj-meta { flex: 1; display: flex; flex-direction: column; }
.prj-meta h3 { margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text-main); }
.prj-status { font-size: 0.75rem; color: var(--ds-green); font-weight: 800; text-transform: uppercase; margin-top: 2px; display: flex; align-items: center; gap: 5px; }
.prj-arrow { color: var(--text-muted); opacity: 0.3; transition: 0.3s; }
.project-card-refined:hover .prj-arrow { transform: translateX(5px); opacity: 1; color: var(--primary); }

.prj-body { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.prj-metric { display: flex; flex-direction: column; padding: 12px; border-radius: 15px; background: var(--bg-hover); border: 1px solid var(--border-color); }
.prj-metric .v { font-size: 1.4rem; font-weight: 900; color: var(--text-main); font-family: var(--font-sans); }
.prj-metric .l { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2px; }
.prj-metric.danger .v { color: var(--ds-red); }

.prj-track { height: 6px; background: var(--bg-hover); border-radius: 10px; overflow: hidden; }
.prj-fill { height: 100%; transition: 1s ease; }

/* RTL Fine-tuning */
[dir="rtl"] .g-meta-pill i { margin-left: 0; margin-right: 0; }
[dir="rtl"] .prj-arrow { transform: rotate(180deg); }
[dir="rtl"] .project-card-refined:hover .prj-arrow { transform: rotate(180deg) translateX(-5px); }
[dir="rtl"] .lb-r-pts { text-align: start; }

@media (max-width: 1200px) {
    .performance-grid-v { grid-template-columns: 1fr; }
}
@media (max-width: 800px) {
    .greeting-feature-v { flex-direction: column; align-items: flex-start; gap: 20px; }
}
</style>
