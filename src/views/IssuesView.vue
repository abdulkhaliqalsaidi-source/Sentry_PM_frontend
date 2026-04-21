<script>
import StateLoader from '@/components/StateLoader.vue';
import StateEmpty from '@/components/StateEmpty.vue';
import ElitePagination from '@/components/ElitePagination.vue';
import axios from '@/plugins/axios';

export default {
    name: 'IssuesView',
    components: {
        StateEmpty,
        ElitePagination
    },
    props: {
        codeIssues: { type: Array, default: () => [] },
        networkIssues: { type: Array, default: () => [] },
        uniqueProjects: { type: Array, default: () => [] },
        permissions: { type: Object, default: () => ({}) },
        issueEvents: { type: Object, default: () => ({}) },
        expandedIssues: { type: Object, default: () => ({}) },
        projectId: { type: String, default: null },
        loading: { type: Boolean, default: false }
    },
    data() {
        return {
            currentPage: 1, itemsPerPage: 10,
            activeIssuesTab: 'code',
            selectedProject: 'all',
            showProjectFilter: false,
            selectedStatus: 'all',
            showStatusFilter: false,
            showAllIssues: true,
            availableProjects: [],
            show: false
        }
    },
    watch: {
        activeIssuesTab() {
            this.currentPage = 1;
        }
    },
    async mounted() {
        setTimeout(() => { this.show = true; }, 50);
        await this.fetchProjects();
        if (this.projectId) {
            const project = this.availableProjects.find(p => p.id == this.projectId);
            if (project) this.selectedProject = project.name;
        }
        document.addEventListener('click', this.closeDropdowns);
    },
    beforeUnmount() {
        document.removeEventListener('click', this.closeDropdowns);
    },
    methods: {
        closeDropdowns() {
            this.showProjectFilter = false;
            this.showStatusFilter = false;
        },
        async fetchProjects() {
            try {
                const response = await axios.get('/api/pm/projects/');
                this.availableProjects = response.data;
            } catch (error) { console.error("Failed to fetch projects", error); }
        },
        toggleExpand(id) { this.$emit('toggle-expand', id); },
        deleteIssue(id) { this.$emit('delete-issue', id); },
        openStack(traceback) { this.$emit('open-stack', traceback); },
        openReplay(id, type = 'code') { this.$emit('open-replay', id, type); },
        showUrl(url) { this.$emit('show-url', url); }
    },
    computed: {
        filteredCodeIssues() {
            let issues = this.codeIssues;
            if (this.selectedProject !== 'all' && !this.projectId) {
                issues = issues.filter(issue => (issue.project_name || 'General') === this.selectedProject);
            }
            if (this.selectedStatus !== 'all') {
                const statusValue = this.selectedStatus === 'open' ? 'open' : 'resolved';
                issues = issues.filter(issue => issue.status === statusValue);
            }
            return issues;
        },
        filteredNetworkIssues() {
            let issues = this.networkIssues;
            if (this.selectedProject !== 'all' && !this.projectId) {
                issues = issues.filter(issue => (issue.project_name || 'Frontend') === this.selectedProject);
            }
            if (this.selectedStatus !== 'all') {
                 const statusValue = this.selectedStatus === 'open' ? 'open' : 'resolved';
                 issues = issues.filter(issue => issue.status === statusValue);
            }
            return issues;
        },
        paginatedIssues() {
            const issues = this.activeIssuesTab === 'code' ? this.filteredCodeIssues : this.filteredNetworkIssues;
            const start = (this.currentPage - 1) * this.itemsPerPage;
            return issues.slice(start, start + this.itemsPerPage);
        },
        activeTabLength() {
            return this.activeIssuesTab === 'code' ? this.filteredCodeIssues.length : this.filteredNetworkIssues.length;
        },
        resolvedCount() {
            return this.codeIssues.filter(i => i.status === 'resolved').length + this.networkIssues.filter(i => i.status === 'resolved').length;
        },
        openCount() {
            return this.codeIssues.filter(i => i.status === 'open').length + this.networkIssues.filter(i => i.status === 'open').length;
        }
    }
}
</script>

<template>
    <div class="issues-page-vibrant" :class="{ 'v-show': show, 'project-context': projectId }" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'" :style="{ '--grid-cols': projectId ? '2.5fr 1fr 1.5fr 1.2fr 80px' : '2.5fr 1.2fr 1fr 1.5fr 1.2fr 80px' }">
        
        <!-- Header Section (Vibrant & Glossy) -->
        <div class="issues-header-glossy">
            <div class="header-content">
                <div class="icon-glow purple">
                    <i class="fa-solid fa-shield-virus"></i>
                    <div class="glow-orb"></div>
                </div>
                <div class="header-text">
                    <h1>{{ $t('issues.exception_explorer') }}</h1>
                    <p>{{ $t('issues.manage_track_desc') }}</p>
                </div>
            </div>

            <!-- Dashboard Pill Actions -->
            <div class="header-actions">
                <div class="action-pill-hud glass-morphic">
                    <div v-if="!projectId" class="hud-item" @click.stop="showProjectFilter = !showProjectFilter; showStatusFilter = false">
                        <i class="fa-solid fa-filter"></i>
                        <span>{{ selectedProject === 'all' ? $t('common.all_projects') : selectedProject }}</span>
                        <transition name="drop-v">
                            <div v-if="showProjectFilter" class="hud-dropdown glass-morphic" @click.stop>
                                <div class="drop-item" :class="{ active: selectedProject === 'all' }" @click="selectedProject = 'all'; showProjectFilter = false">{{ $t('common.all_projects') }}</div>
                                <div v-for="proj in uniqueProjects" :key="proj" class="drop-item" :class="{ active: selectedProject === proj }" @click="selectedProject = proj; showProjectFilter = false">{{ proj }}</div>
                            </div>
                        </transition>
                    </div>
                    <div v-if="!projectId" class="hud-divider"></div>
                    <div class="hud-item" @click.stop="showStatusFilter = !showStatusFilter; showProjectFilter = false">
                        <i class="fa-solid fa-list-check"></i>
                        <span>{{ selectedStatus === 'all' ? $t('common.all_statuses') : (selectedStatus === 'open' ? $t('common.open') : $t('common.resolved')) }}</span>
                        <transition name="drop-v">
                            <div v-if="showStatusFilter" class="hud-dropdown glass-morphic" @click.stop>
                                <div class="drop-item" :class="{ active: selectedStatus === 'all' }" @click="selectedStatus = 'all'; showStatusFilter = false">{{ $t('common.all_statuses') }}</div>
                                <div class="drop-item" :class="{ active: selectedStatus === 'open' }" @click="selectedStatus = 'open'; showStatusFilter = false">{{ $t('common.open') }}</div>
                                <div class="drop-item" :class="{ active: selectedStatus === 'resolved' }" @click="selectedStatus = 'resolved'; showStatusFilter = false">{{ $t('common.resolved') }}</div>
                            </div>
                        </transition>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mini Stats Grid (Vibrant Cards) -->
        <div class="stats-dashboard-v" v-if="!loading">
            <div class="stat-card-v glass-morphic purple">
                <div class="s-icon"><i class="fa-solid fa-bug"></i></div>
                <div class="s-info">
                    <span class="s-val">{{ filteredCodeIssues.length + filteredNetworkIssues.length }}</span>
                    <span class="s-lbl">{{ $t('issues.total_issues') }}</span>
                </div>
                <div class="s-glow"></div>
            </div>
            <div class="stat-card-v glass-morphic green">
                <div class="s-icon"><i class="fa-solid fa-check-circle"></i></div>
                <div class="s-info">
                    <span class="s-val">{{ resolvedCount }}</span>
                    <span class="s-lbl">{{ $t('common.resolved') }}</span>
                </div>
                <div class="s-glow"></div>
            </div>
            <div class="stat-card-v glass-morphic orange" :class="{ 'pulse-hazard': openCount > 0 }">
                <div class="s-icon"><i class="fa-solid fa-bolt-lightning"></i></div>
                <div class="s-info">
                    <span class="s-val">{{ openCount }}</span>
                    <span class="s-lbl">{{ $t('common.open') }}</span>
                </div>
                <div class="s-glow"></div>
            </div>
        </div>

        <!-- Navigation Tabs (Leaderboard Pattern) -->
        <div class="vibrant-tabs-container">
            <div class="vibrant-tabs-card glass-morphic">
                <button class="v-tab" :class="{ active: activeIssuesTab === 'code' }" @click="activeIssuesTab = 'code'">
                    <i class="fa-solid fa-code"></i>
                    <span>{{ $t('issues.code_exceptions') }}</span>
                    <div class="v-tab-badge" v-if="filteredCodeIssues.length">{{ filteredCodeIssues.length }}</div>
                </button>
                <div class="tab-spacer"></div>
                <button class="v-tab" :class="{ active: activeIssuesTab === 'network' }" @click="activeIssuesTab = 'network'">
                    <i class="fa-solid fa-tower-broadcast"></i>
                    <span>{{ $t('issues.network_failures') }}</span>
                    <div class="v-tab-badge" v-if="filteredNetworkIssues.length">{{ filteredNetworkIssues.length }}</div>
                </button>
                <div class="v-tab-indicator" :style="{ transform: activeIssuesTab === 'code' ? 'translateX(0)' : ($i18n.locale === 'ar' ? 'translateX(-100%)' : 'translateX(100%)') }"></div>
            </div>
        </div>

        <!-- Diagnostics Panel (Vibrant Rows) -->
        <div class="diagnostics-panel-v glass-morphic">
            <div v-if="loading" class="v-loader">
                <StateLoader />
            </div>

            <div v-else-if="(activeIssuesTab === 'code' ? filteredCodeIssues : filteredNetworkIssues).length === 0" class="v-empty-premium glass-morphic">
                <div class="empty-vis-orb-v ghost-pulse">
                    <i class="fa-solid fa-cloud-sun"></i>
                </div>
                <h3>{{ activeIssuesTab === 'code' ? $t('issues.no_exceptions') : $t('issues.no_network_failures') }}</h3>
                <p>{{ activeIssuesTab === 'code' ? $t('issues.great_job') : $t('issues.all_successful') }}</p>
            </div>

            <div v-else class="diagnostics-list-v">
                <div class="v-list-header">
                    <span class="col-diag">{{ $t('issues.table.error') }}</span>
                    <span v-if="!projectId" class="col-proj">{{ $t('issues.table.project') }}</span>
                    <span class="col-count">{{ $t('issues.table.events') }}</span>
                    <span class="col-date">{{ $t('issues.table.last_seen') }}</span>
                    <span class="col-status">{{ $t('issues.table.status') }}</span>
                    <span class="col-actions"></span>
                </div>

                <transition-group name="v-list" tag="div" class="v-list-rows">
                    <div v-for="(item, idx) in paginatedIssues" 
                         :key="item.id" 
                         class="v-row glass-row" 
                         :class="{ 'hazard-row': item.status === 'open', 'expanded': expandedIssues[item.id] }"
                         :style="{ '--idx': idx }">
                        
                        <div class="row-main" @click="toggleExpand(item.id)">
                            <div class="col-diag diag-cell">
                                <div class="diag-icon-hex" :class="item.status === 'open' ? 'red' : 'green'">
                                    <i :class="item.status === 'open' ? 'fa-solid fa-bug' : 'fa-solid fa-check-circle'"></i>
                                </div>
                                <div class="diag-text">
                                    <span class="title">{{ item.title }}</span>
                                    <span class="hash">IDX-{{ item.hash_id.substring(0, 8).toUpperCase() }}</span>
                                </div>
                            </div>

                            <div v-if="!projectId" class="col-proj">
                                <div class="v-badge glass-morphic">{{ item.project_name || $t('common.general') }}</div>
                            </div>

                            <div class="col-count">
                                <span class="v-count-badge">{{ item.counter }}</span>
                            </div>

                            <div class="col-date v-date-text">
                                {{ new Date(item.last_seen).toLocaleString() }}
                            </div>

                            <div class="col-status">
                                <div class="v-status-tag" :class="item.status">
                                    <span class="dot"></span>
                                    {{ item.status === 'open' ? $t('common.open') : $t('common.resolved') }}
                                </div>
                            </div>

                            <div class="col-actions">
                                <div class="v-action-beads">
                                    <button v-if="permissions.can_delete_issues" class="bead-btn danger" @click.stop="deleteIssue(item.id)">
                                        <i class="fa-solid fa-trash-can"></i>
                                    </button>
                                    <div class="v-expand-chevron" :class="{ rotated: expandedIssues[item.id] }">
                                        <i class="fa-solid fa-chevron-down"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Diagnostic Deep-Dive (Manual Review Style) -->
                        <transition name="v-expand">
                            <div v-if="expandedIssues[item.id]" class="row-details">
                                <div class="details-inner-v glass-morphic shadow-inner">
                                    <div class="details-head-v">
                                        <h4><i class="fa-solid fa-microchip"></i> {{ $t('issues.deep_dive_title') }}</h4>
                                        <div v-if="item.status === 'resolved'" class="resolver-pill-v">
                                            <div class="u-avatar">{{ item.resolved_by_name?.charAt(0).toUpperCase() || 'S' }}</div>
                                            <span>{{ $t('issues.table.resolved_by') }} {{ item.resolved_by_name || $t('common.system') }}</span>
                                        </div>
                                    </div>

                                    <div v-if="!issueEvents[item.id]" class="v-shimmer-diag"></div>
                                    <div v-else class="v-event-card glass-morphic">
                                        <div class="ev-time-v">{{ new Date(issueEvents[item.id][0].timestamp).toLocaleTimeString() }}</div>
                                        <div class="ev-meta-v">
                                            <span class="ev-url-v" @click.stop="showUrl(issueEvents[item.id][0].url)">{{ issueEvents[item.id][0].url || 'Internal Module' }}</span>
                                        </div>
                                        <div class="ev-actions-v">
                                            <button class="v-btn-xs primary" @click.stop="openReplay(issueEvents[item.id][0].id)">
                                                <i class="fa-solid fa-play"></i> {{ $t('issues.replay_failure') }}
                                            </button>
                                            <button v-if="activeIssuesTab === 'code'" class="v-btn-xs ghost" @click.stop="openStack(issueEvents[item.id][0].traceback)">
                                                <i class="fa-solid fa-layer-group"></i> {{ $t('common.stack_trace') }}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </transition>
                        <div class="hazard-edge" v-if="item.status === 'open'"></div>
                    </div>
                </transition-group>
                <div style="margin-top: 15px;">
                    <ElitePagination 
                        :totalItems="activeTabLength" 
                        :itemsPerPage="itemsPerPage" 
                        :currentPage="currentPage" 
                        @update:currentPage="p => currentPage = p" 
                    />
                </div>
            </div>
        </div>

    </div>
</template>

<style scoped>
.issues-page-vibrant {
    padding: 30px; min-height: 100vh; display: flex; flex-direction: column; gap: 30px;
    background: transparent;
    font-family: var(--font-sans);
    opacity: 0; transform: translateY(10px); transition: 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.issues-page-vibrant.v-show { opacity: 1; transform: translateY(0); }

/* Header Glossy */
.issues-header-glossy { display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; position: relative; z-index: 100; }
.header-content { display: flex; align-items: center; gap: 20px; }
.icon-glow {
    width: 60px; height: 60px; border-radius: 18px; display: flex; align-items: center; justify-content: center;
    font-size: 26px; color: white; position: relative;
}
.icon-glow.purple { background: linear-gradient(135deg, var(--primary), var(--indigo-800)); box-shadow: 0 10px 30px var(--primary-glow); }
.glow-orb { position: absolute; inset: -5px; background: inherit; filter: blur(15px); opacity: 0.3; z-index: -1; }

.header-text h1 { margin: 0; font-size: 2.2rem; font-weight: 900; color: var(--text-main); letter-spacing: -1px; }
.header-text p { margin: 0; font-size: 1rem; color: var(--text-muted); opacity: 0.8; }

.action-pill-hud { display: flex; align-items: center; padding: 6px 20px; border-radius: 100px; border: 1px solid var(--border-color); background: var(--bg-card); box-shadow: var(--shadow-sm); }
.hud-item { display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--text-main); font-weight: 700; position: relative; }
.hud-item:hover { color: var(--primary); }
.hud-divider { width: 1px; height: 24px; background: var(--border-color); margin: 0 15px; }

.hud-dropdown { position: absolute; top: calc(100% + 15px); inset-inline-start: 0; width: 220px; padding: 10px; border-radius: 20px; border: 1px solid var(--border-color); z-index: 1000; box-shadow: var(--shadow-lg); background: var(--bg-card); backdrop-filter: var(--glass-blur); }
.drop-item { padding: 10px 15px; border-radius: 12px; color: var(--text-muted); font-weight: 700; transition: 0.2s; }
.drop-item:hover { background: var(--bg-hover); color: var(--primary); }
.drop-item.active { background: var(--primary-bg); color: var(--primary); }

/* Stats V Dashboard */
.stats-dashboard-v { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.stat-card-v { 
    padding: 24px; border-radius: 24px; display: flex; align-items: center; gap: 20px; 
    position: relative; overflow: hidden; transition: 0.3s;
    background: var(--bg-card); border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
}
.stat-card-v:hover { transform: translateY(-5px); box-shadow: var(--shadow-md); border-color: var(--primary-glow); }
.stat-card-v.purple { border-left: 4px solid var(--primary); }
.stat-card-v.green { border-left: 4px solid var(--ds-green); }
.stat-card-v.orange { border-left: 4px solid var(--ds-yellow); }

.s-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: white; background: var(--bg-hover); }
.purple .s-icon { color: var(--primary); }
.green .s-icon { color: var(--ds-green); }
.orange .s-icon { color: var(--ds-yellow); }

.s-info { display: flex; flex-direction: column; line-height: 1; z-index: 2; }
.s-val { font-size: 2rem; font-weight: 900; color: var(--text-main); }
.s-lbl { font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px; }
.s-glow { position: absolute; bottom: -20px; right: -20px; width: 100px; height: 100px; background: currentColor; filter: blur(40px); opacity: 0.05; }

.pulse-hazard { animation: hazardPulse 2s infinite; }
@keyframes hazardPulse { 0%, 100% { box-shadow: inset 0 0 0 0 rgba(245,158,11,0); } 50% { box-shadow: inset 0 0 40px rgba(245,158,11,0.05); border-color: var(--ds-yellow); } }

/* Vibrant Tabs */
.vibrant-tabs-card { display: flex; position: relative; padding: 6px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-card); box-shadow: var(--shadow-sm); }
.v-tab {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 12px; height: 48px;
    border: none; background: transparent; color: var(--text-muted); font-weight: 700; cursor: pointer; z-index: 2; transition: 0.3s;
}
.v-tab.active { color: white; }
.v-tab i { font-size: 1.1rem; }
.v-tab-badge { background: var(--bg-hover); padding: 2px 10px; border-radius: 100px; font-size: 0.75rem; color: var(--text-muted); }
.v-tab.active .v-tab-badge { background: white; color: var(--primary); }
.v-tab-indicator {
    position: absolute; top: 6px; bottom: 6px; left: 6px; width: calc(50% - 6px);
    background: linear-gradient(135deg, var(--primary), var(--indigo-800)); border-radius: 14px; z-index: 1;
    transition: transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

/* Diagnostics Panel */
.diagnostics-panel-v { border-radius: 30px; overflow: hidden; background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-md); }
.v-list-header { display: grid; grid-template-columns: var(--grid-cols, 2.5fr 1.2fr 1fr 1.5fr 1.2fr 80px); padding: 20px 30px; border-bottom: 1px solid var(--border-color); font-size: 0.8rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; background: var(--bg-hover); }

.v-list-rows { display: flex; flex-direction: column; }
.v-row { border-bottom: 1px solid var(--border-color); transition: 0.3s; position: relative; }
.v-row:hover { background: var(--bg-hover); }
.v-row.hazard-row { border-right: 4px solid var(--ds-red); }
[dir="rtl"] .v-row.hazard-row { border-right: none; border-left: 4px solid #f43f5e; }

.row-main { display: grid; grid-template-columns: var(--grid-cols, 2.5fr 1.2fr 1fr 1.5fr 1.2fr 80px); align-items: center; padding: 20px 30px; cursor: pointer; }

.diag-cell { display: flex; align-items: center; gap: 20px; }
.diag-icon-hex {
    width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}
.diag-icon-hex.red { background: rgba(244, 63, 94, 0.1); color: var(--ds-red); }
.diag-icon-hex.green { background: rgba(16, 185, 129, 0.1); color: var(--ds-green); }
.diag-text { display: flex; flex-direction: column; }
.diag-text .title { font-weight: 800; color: var(--text-main); font-size: 1.05rem; line-height: 1.3; }
.diag-text .hash { font-family: monospace; font-size: 0.75rem; color: var(--text-muted); opacity: 0.7; margin-top: 2px; }

.v-badge { padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); background: var(--bg-hover); border: 1px solid var(--border-color); }
.v-count-badge { font-family: 'JetBrains Mono', monospace; font-weight: 900; color: var(--text-main); background: var(--bg-card); padding: 4px 10px; border-radius: 8px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); }
.v-date-text { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }

.v-status-tag { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; background: var(--bg-hover); border: 1px solid var(--border-color); }
.v-status-tag .dot { width: 8px; height: 8px; border-radius: 50%; }
.v-status-tag.open { color: var(--ds-red); border-color: rgba(244, 63, 94, 0.2); }
.v-status-tag.open .dot { background: var(--ds-red); box-shadow: 0 0 10px var(--ds-red); }
.v-status-tag.resolved { color: var(--ds-green); border-color: rgba(16, 185, 129, 0.2); }
.v-status-tag.resolved .dot { background: var(--ds-green); }

.v-action-beads { display: flex; align-items: center; gap: 15px; justify-content: flex-end; }
.bead-btn { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-muted); cursor: pointer; transition: 0.2s; }
.bead-btn:hover { transform: scale(1.1); color: var(--primary); border-color: var(--primary); }
.bead-btn.danger:hover { background: var(--ds-red); color: white; border-color: var(--ds-red); }
.v-expand-chevron { color: var(--text-muted); transition: 0.3s; }
.v-expand-chevron.rotated { transform: rotate(180deg); color: var(--primary); }

/* Details Expansion Vibrant */
.row-details { padding: 0 20px 20px 20px; }
.details-inner-v { padding: 25px; border-radius: 20px; background: var(--bg-hover); border: 1px solid var(--border-color); box-shadow: inset 0 2px 10px rgba(0,0,0,0.02); }
.details-head-v { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.details-head-v h4 { margin: 0; font-size: 0.9rem; font-weight: 900; text-transform: uppercase; color: var(--text-muted); }
.resolver-pill-v { display: flex; align-items: center; gap: 10px; padding: 4px 12px; border-radius: 100px; background: var(--primary-bg); color: var(--primary); font-weight: 800; font-size: 0.8rem; border: 1px solid var(--primary-glow); }
.u-avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; }

.v-event-card { display: flex; align-items: center; gap: 20px; padding: 20px; border-radius: 18px; position: relative; background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); }
.ev-time-v { font-family: monospace; font-size: 0.9rem; color: var(--primary); font-weight: 800; }
.ev-url-v { color: var(--text-main); font-weight: 700; cursor: pointer; opacity: 0.8; transition: 0.2s; }
.ev-url-v:hover { opacity: 1; text-decoration: underline; color: var(--primary); }
.ev-actions-v { margin-inline-start: auto; display: flex; gap: 10px; }

.v-btn-xs { padding: 10px 18px; border-radius: 12px; border: none; font-weight: 800; cursor: pointer; transition: 0.2s; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; }
.v-btn-xs.primary { background: linear-gradient(135deg, var(--primary), var(--indigo-800)); color: white; box-shadow: 0 4px 12px var(--primary-glow); }
.v-btn-xs.ghost { background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-color); }
.v-btn-xs.ghost:hover { border-color: var(--primary); color: var(--primary); }

/* List Animations */
.v-list-enter-active { animation: vIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards; animation-delay: calc(var(--idx) * 0.04s); }
@keyframes vIn { from { opacity: 0; transform: translateY(20px); scale: 0.95; } to { opacity: 1; transform: translateY(0); scale: 1; } }

/* Drop Transition */
.drop-v-enter-active, .drop-v-leave-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.drop-v-enter-from { opacity: 0; transform: translateY(-12px) scale(0.92); }
.drop-v-leave-to { opacity: 0; transform: translateY(-8px) scale(0.96); }

/* RTL Fixes */
[dir="rtl"] .v-tab-indicator { right: 6px; left: auto; }
[dir="rtl"] .ev-actions-v { margin-right: auto; margin-left: 0; }
[dir="rtl"] .v-action-beads { justify-content: flex-start; }

/* Empty State XL */
.v-empty-premium {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    padding: 140px 60px;
    text-align: center;
    gap: 32px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 48px;
    margin: 40px 0;
    max-width: 100%;
    backdrop-filter: blur(30px);
    box-shadow: var(--shadow-2xl);
    animation: slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.empty-vis-orb-v {
    width: 160px;
    height: 160px;
    background: var(--primary-bg);
    border-radius: 45px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 5.5rem;
    color: var(--primary);
    margin-bottom: 8px;
    box-shadow: 0 25px 50px -12px var(--primary-glow);
}

.v-empty-premium h3 {
    font-size: 2.8rem;
    font-weight: 900;
    color: var(--text-main);
    margin: 0;
    letter-spacing: -0.04em;
}

.v-empty-premium p {
    font-size: 1.3rem;
    color: var(--text-muted);
    max-width: 500px;
    line-height: 1.5;
    font-weight: 600;
    margin: 0;
}

.ghost-pulse {
    animation: ghostFloat 3s ease-in-out infinite;
}

@keyframes ghostFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
}

@keyframes slideInUp {
    from { transform: translateY(40px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

@media (max-width: 1100px) {
    .v-list-header, .row-main { grid-template-columns: 2fr 1fr 1fr 80px; }
    .col-date, .col-status { display: none; }
}
</style>
