<template>
    <div class="dashboard-wrapper">
        <!-- Sidebar -->
        <aside class="sidebar" :class="{ 'collapsed': isSidebarCollapsed, 'project-context': activeProjectId }">
            <div class="brand">
                <div class="brand-content" v-if="!activeProjectId">
                    <div class="logo-box">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="omnia-logo-svg">
                            <!-- Convergence lines -->
                            <path d="M4 4L10 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                            <path d="M20 4L14 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                            <path d="M4 20L10 14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                            <path d="M20 20L14 14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                            <path d="M12 20V15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                            <!-- Central Diamond -->
                            <path d="M12 8L16 12L12 16L8 12L12 8Z" fill="white"/>
                            <path d="M12 7L17 12L12 17L7 12L12 7Z" stroke="white" stroke-width="1.5" stroke-linejoin="round" stroke-opacity="0.8"/>
                        </svg>
                    </div>
                    <div class="brand-name" v-if="!isSidebarCollapsed">{{ $t('dashboard.brand') }}</div>
                </div>
                <!-- Project Context Header -->
                <div class="project-info-header" v-else @click="showProjectSwitcher = !showProjectSwitcher" v-click-outside="() => showProjectSwitcher = false">
                    <div class="project-avatar-sm" v-if="!isSidebarCollapsed">{{ activeProject?.name?.charAt(0) || 'P' }}</div>
                    <div class="project-details-sidebar" v-if="!isSidebarCollapsed">
                        <div class="project-name-sidebar">{{ activeProject?.name }}</div>
                        <div class="project-type-sidebar">{{ $t('common.software_project') }}</div>
                    </div>
                </div>

                <button class="btn-sidebar-toggle-brand parent-hover" @click="toggleSidebar" :title="isSidebarCollapsed ? $t('common.expand') : $t('common.collapse')">
                    <div class="toggle-outer">
                        <div class="toggle-inner">
                            <AnimatedIcon :name="toggleIcon" size="sm" />
                        </div>
                    </div>
                </button>
            </div>

            <!-- Resizable Handle (Jira Style) - Only the line remains for visual feedback -->
            <div class="sidebar-resizable-handle" style="pointer-events: none;">
                <div class="handle-line"></div>
            </div>
            
            <nav class="sidebar-nav">
                <!-- Global Nav Items -->
                <template v-if="!activeProjectId">
                    <router-link to="/dashboard" class="nav-item parent-hover" active-class="active" v-if="permissions.dashboard" :title="isSidebarCollapsed ? $t('common.dashboard') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="dashboard" />
                        </div>
                        <span class="nav-text">{{ $t('common.dashboard') }}</span>
                    </router-link>
                    <router-link to="/issues" class="nav-item parent-hover" active-class="active" v-if="permissions.issues" :title="isSidebarCollapsed ? $t('common.issues') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="issues" />
                            <div class="badge badge-sm badge-red pulse-badge" v-if="openIssuesCount > 0 && isSidebarCollapsed"></div>
                        </div>
                        <span class="nav-text">{{ $t('common.issues') }}</span>
                        <span class="badge badge-sm badge-red" v-if="openIssuesCount > 0 && !isSidebarCollapsed">{{ openIssuesCount }}</span>
                    </router-link>
                    <router-link to="/projects" class="nav-item parent-hover" active-class="active" :title="isSidebarCollapsed ? $t('common.projects') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="projects" />
                        </div>
                        <span class="nav-text">{{ $t('common.projects') }}</span>
                    </router-link>
                    
                    <div class="nav-divider"></div>
                    
                    <router-link to="/users" class="nav-item parent-hover" active-class="active" v-if="permissions.users" :title="isSidebarCollapsed ? $t('common.users') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="users" />
                        </div>
                        <span class="nav-text">{{ $t('common.users') }}</span>
                    </router-link>
                    <router-link to="/permissions" class="nav-item parent-hover" active-class="active" v-if="permissions.manage_permissions || permissions.users" :title="isSidebarCollapsed ? $t('common.permissions') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="permissions" />
                        </div>
                        <span class="nav-text">{{ $t('common.permissions') }}</span>
                    </router-link>
                    <router-link to="/settings" class="nav-item parent-hover" active-class="active" v-if="permissions.settings" :title="isSidebarCollapsed ? $t('common.settings') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="settings" />
                        </div>
                        <span class="nav-text">{{ $t('common.settings') }}</span>
                    </router-link>
                    
                    <router-link to="/plugins" class="nav-item parent-hover" active-class="active" v-if="isSuperuser" :title="isSidebarCollapsed ? $t('common.plugins') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="plugins" />
                        </div>
                        <span class="nav-text">{{ $t('common.plugins') }}</span>
                    </router-link>

                    <div class="nav-divider"></div>

                    <router-link to="/evaluations" class="nav-item parent-hover" active-class="active" v-if="permissions.evaluations" :title="isSidebarCollapsed ? $t('eval.evaluations') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="evaluations" />
                        </div>
                        <span class="nav-text">{{ $t('eval.evaluations') }}</span>
                    </router-link>
                    <router-link to="/performance" class="nav-item parent-hover" active-class="active" v-if="permissions.performance" :title="isSidebarCollapsed ? $t('perf.my_performance') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="performance" />
                        </div>
                        <span class="nav-text">{{ $t('perf.my_performance') }}</span>
                    </router-link>
                </template>

                <!-- Project Nav Items -->
                <template v-else>
                    <router-link :to="`/projects/${activeProjectId}/summary`" class="nav-item parent-hover" active-class="active" :title="isSidebarCollapsed ? $t('common.summary') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="summary" />
                        </div>
                        <span class="nav-text">{{ $t('common.summary') }}</span>
                    </router-link>
                    <router-link :to="`/projects/${activeProjectId}`" class="nav-item parent-hover" exact-active-class="active" :title="isSidebarCollapsed ? $t('common.board') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="board" />
                        </div>
                        <span class="nav-text">{{ $t('common.board') }}</span>
                    </router-link>
                    <router-link :to="`/projects/${activeProjectId}/backlog`" class="nav-item parent-hover" active-class="active" v-if="permissions.backlog" :title="isSidebarCollapsed ? $t('common.backlog') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="backlog" />
                        </div>
                        <span class="nav-text">{{ $t('common.backlog') }}</span>
                    </router-link>
                    <router-link :to="`/projects/${activeProjectId}/issues`" class="nav-item parent-hover" active-class="active" :title="isSidebarCollapsed ? $t('common.issues') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="issues" />
                        </div>
                        <span class="nav-text">{{ $t('common.issues') }}</span>
                    </router-link>
                    
                    <div class="nav-divider"></div>
                    
                    <div class="nav-section-label" v-if="!isSidebarCollapsed">{{ $t('common.development') }}</div>
                    <router-link :to="`/projects/${activeProjectId}/reports`" class="nav-item parent-hover" active-class="active" v-if="permissions.reports" :title="isSidebarCollapsed ? $t('kanban.reports') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="reports" />
                        </div>
                        <span class="nav-text">{{ $t('kanban.reports') }}</span>
                    </router-link>
                    <router-link :to="`/projects/${activeProjectId}/members`" class="nav-item parent-hover" active-class="active" v-if="permissions.members" :title="isSidebarCollapsed ? $t('projects.members') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="users" />
                        </div>
                        <span class="nav-text">{{ $t('projects.members') }}</span>
                    </router-link>
                    <router-link :to="`/projects/${activeProjectId}/chat`" class="nav-item parent-hover" active-class="active" v-if="permissions.chat" :title="isSidebarCollapsed ? $t('projects.chat') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="chat" />
                        </div>
                        <span class="nav-text">{{ $t('projects.chat') }}</span>
                    </router-link>
                    <router-link :to="`/projects/${activeProjectId}/docs`" class="nav-item parent-hover" active-class="active" v-if="permissions.docs" :title="isSidebarCollapsed ? $t('projects.docs') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="docs" />
                        </div>
                        <span class="nav-text">{{ $t('projects.docs') }}</span>
                    </router-link>

                    <div class="nav-divider"></div>
                    <div class="nav-section-label" v-if="!isSidebarCollapsed">{{ $t('common.system_addons') }}</div>
                    
                    <router-link :to="`/projects/${activeProjectId}/releases`" class="nav-item parent-hover" active-class="active" :title="isSidebarCollapsed ? $t('common.releases') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="releases" />
                        </div>
                        <span class="nav-text">{{ $t('common.releases') }}</span>
                    </router-link>
                    
                    <router-link :to="`/projects/${activeProjectId}/automation`" class="nav-item parent-hover" active-class="active" v-if="permissions.settings" :title="isSidebarCollapsed ? $t('common.automation') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="automation" />
                        </div>
                        <span class="nav-text">{{ $t('common.automation') }}</span>
                    </router-link>

                    <router-link :to="`/projects/${activeProjectId}/bottleneck`" class="nav-item parent-hover" active-class="active" v-if="permissions.reports" :title="isSidebarCollapsed ? $t('common.bottleneck') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="bottleneck" />
                        </div>
                        <span class="nav-text">{{ $t('common.bottleneck') }}</span>
                    </router-link>
                    
                    <router-link :to="`/projects/${activeProjectId}/custom-fields`" class="nav-item parent-hover" active-class="active" v-if="permissions.settings" :title="isSidebarCollapsed ? $t('common.custom_fields') : ''">
                        <div class="nav-icon-wrapper">
                            <AnimatedIcon name="custom-fields" />
                        </div>
                        <span class="nav-text">{{ $t('common.custom_fields') }}</span>
                    </router-link>

                    <div class="nav-spacer"></div>
                    
                    <router-link to="/dashboard" class="nav-item back-btn parent-hover" :title="isSidebarCollapsed ? $t('common.back_to_dashboard') : ''">
                        <div class="nav-icon-wrapper"><AnimatedIcon name="arrow-left" /></div>
                        <span class="nav-text">{{ $t('common.back_to_dashboard') }}</span>
                    </router-link>
                </template>
            </nav>

            <div class="sidebar-footer">
                <div class="user-profile" @click="$router.push('/settings')">
                    <div class="avatar">
                        <img v-if="avatar" :src="getFullUrl(avatar)" class="avatar-img" />
                        <template v-else>{{ userInitial }}</template>
                    </div>
                    <div class="user-info">
                        <div class="user-name">{{ userName }}</div>
                        <div class="user-role">{{ translatedRole }}</div>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content" :class="{ 'expanded': isSidebarCollapsed }">
            <!-- Header (Shared) — hidden for views with their own top bar -->
            <header class="top-header" v-if="!hideSharedHeader">

                <!-- Floating island bar -->
                <div class="hdr-island">

                    <!-- Theme -->
                    <button class="hdr-pill-btn" @click="toggleTheme" :title="$t('common.theme')">
                        <span class="hdr-pill-icon">
                            <AnimatedIcon :name="currentTheme === 'light' ? 'theme-sun' : currentTheme === 'dark' ? 'theme-moon' : 'theme-system'" />
                        </span>
                    </button>

                    <!-- Language -->
                    <button class="hdr-pill-btn hdr-lang" @click="toggleLanguage" :title="$t('common.language')">
                        <span class="hdr-pill-icon">
                            <AnimatedIcon name="language" />
                        </span>
                        <span class="hdr-lang-label">{{ currentLang.toUpperCase() }}</span>
                    </button>

                    <span class="hdr-sep"></span>

                    <!-- Refresh -->
                    <button class="hdr-pill-btn hdr-refresh-btn" @click="refreshData" :disabled="loading" :class="{'is-loading': loading}">
                        <span class="hdr-pill-icon">
                            <AnimatedIcon name="refresh" :class="{'anim-rotate': loading, 'trigger-infinite': loading}" />
                        </span>
                        <span class="hdr-refresh-label">{{ loading ? $t('common.updating') : $t('common.refresh') }}</span>
                    </button>

                    <span class="hdr-sep"></span>

                    <!-- Notifications -->
                    <div class="notification-wrapper" v-click-outside="closeNotificationMenu">
                        <button class="hdr-pill-btn hdr-notif-btn" @click="toggleNotificationMenu" :title="$t('notifications.title')">
                            <span class="hdr-pill-icon">
                                <AnimatedIcon name="bell" />
                            </span>
                            <span class="hdr-notif-dot" v-if="unreadNotificationsCount > 0">{{ unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount }}</span>
                        </button>
                        <transition name="dropdown-fade">
                            <div class="dropdown-menu-modern notification-dropdown" v-if="showNotificationMenu">
                                <div class="dropdown-header flex-between">
                                    <h4>{{ $t('notifications.title') }}</h4>
                                    <button class="btn-text-sm" @click="markAllNotificationsRead" v-if="unreadNotificationsCount > 0">{{ $t('notifications.mark_all_read') }}</button>
                                </div>
                                <div class="dropdown-body notification-list">
                                    <div v-if="notificationList.length === 0" class="empty-state-sm">
                                        <AnimatedIcon name="bell-slash" size="lg" />
                                        <p>{{ $t('notifications.empty') }}</p>
                                    </div>
                                    <div v-else class="notification-item" v-for="notif in notificationList" :key="notif.id" :class="{'unread': !notif.is_read}" @click="handleNotificationClick(notif)">
                                        <div class="notification-avatar">{{ notif.actor_name ? notif.actor_name.charAt(0).toUpperCase() : 'U' }}</div>
                                        <div class="notification-content">
                                            <p><strong>{{ notif.actor_name }}</strong> {{ $t(`notifications.${notif.verb.replace(/ /g, '_')}`) || notif.verb }} <strong>{{ notif.task_title || $t('notifications.a_task') }}</strong></p>
                                            <span class="notification-time">{{ formatTimeAgo(notif.created_at) }}</span>
                                        </div>
                                        <div class="unread-dot" v-if="!notif.is_read"></div>
                                    </div>
                                </div>
                                <div class="dropdown-footer">
                                    <button class="btn-primary-block" @click="goToAllNotifications">{{ $t('notifications.view_all') }}</button>
                                </div>
                            </div>
                        </transition>
                    </div>

                    <!-- Avatar / Profile -->
                    <button class="hdr-pill-btn hdr-avatar-btn" @click="$router.push('/settings')" :title="$t('common.settings')">
                        <span class="hdr-avatar-ring">
                            <img v-if="avatar" :src="getFullUrl(avatar)" class="hdr-avatar-img" />
                            <span v-else class="hdr-avatar-initial">{{ userInitial }}</span>
                        </span>
                        <span class="hdr-avatar-name">{{ userName.split(' ')[0] }}</span>
                    </button>

                    <span class="hdr-sep"></span>

                    <!-- Logout -->
                    <button class="hdr-pill-btn hdr-logout-btn" @click="logout" :title="$t('common.logout')">
                        <span class="hdr-pill-icon">
                            <AnimatedIcon name="logout" />
                        </span>
                    </button>

                </div>
            </header>

            <div class="route-view-container">
            <router-view v-slot="{ Component }">
                <component :is="Component" ref="currentView"
                    :totalEvents="totalEvents"
                    :openIssuesCount="openIssuesCount"
                    :uniqueProjects="uniqueProjects"
                    :codeIssues="codeIssues"
                    :networkIssues="networkIssues"
                    :permissions="permissions"
                    :issueEvents="issueEvents"
                    :expandedIssues="expandedIssues"
                    :projectId="activeProjectId"
                    :loading="loading"
                    
                    @toggle-expand="toggleExpand"
                    @delete-issue="deleteIssue"
                    @open-stack="openStack"
                    @open-replay="openReplay"
                    @show-url="showUrl"
                    @permissions-updated="fetchUserProfile"
                    @profile-updated="onProfileUpdated"
                    @view-error="handleViewError"
                    :projectStats="projectStats"
                />
            </router-view>
            </div>
            </main>

        <!-- Modals (Replay, Stack, URL) -->
        <!-- Dialogs use a shared modal-overlay structure -->
        <div v-if="replayDialog || stackDialog || urlDialog || confirmDialog" class="modal-backdrop" @click="closeAllModals">
            
            <!-- Replay Modal -->
            <div v-if="replayDialog" class="modal-window wide" @click.stop>
                <div class="modal-header">
                    <h3>{{ $t('common.replay') }}</h3>
                    <div class="modal-controls">
                        <div class="tab-group">
                            <button @click="activeTab = 'replay'" :class="{ active: activeTab === 'replay' }">{{ $t('issues.table.replay') }}</button>
                            <button v-if="networkTabVisible" @click="activeTab = 'network'" :class="{ active: activeTab === 'network' }">{{ $t('issues.table.endpoint') }} ({{ currentNetworkLogs.length }})</button>
                        </div>
                        <button v-if="activeTab === 'network' && currentNetworkLogs.length > 0" class="btn-icon" @click="copyNetworkLogs" :title="$t('common.copy')">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                        <button class="btn-close" @click="replayDialog = false"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </div>
                <div class="modal-body p-0">
                    <div v-show="activeTab === 'replay'" id="replay-player" class="player-container"></div>
                    <div v-show="activeTab === 'network'" class="network-logs-container">
                         <table class="logs-table">
                            <thead>
                                <tr>
                                    <th>{{ $t('issues.table.status') }}</th>
                                    <th>{{ $t('issues.table.method') }}</th>
                                    <th>{{ $t('issues.table.endpoint') }}</th>
                                    <th>{{ $t('issues.table.time') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(log, idx) in filteredNetworkLogs" :key="idx">
                                    <td><span class="badge" :class="log.status >= 400 ? 'badge-red' : 'badge-green'">{{ log.status }}</span></td>
                                    <td class="font-mono">{{ log.method }}</td>
                                    <td class="truncate">{{ log.url }}</td>
                                    <td>{{ log.duration }}ms</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Stack Trace Modal -->
            <div v-if="stackDialog" class="modal-window" @click.stop>
                <div class="modal-header">
                    <h3>{{ $t('common.stack_trace') }}</h3>
                    <div class="modal-controls">
                         <button class="btn-icon-sm parent-hover" @click="copyToClipboard(currentStack)" :title="$t('common.copy')">
                            <AnimatedIcon name="copy" size="sm" />
                        </button>
                        <button class="btn-close parent-hover" @click="stackDialog = false"><AnimatedIcon name="close" /></button>
                    </div>
                </div>
                <div class="modal-body">
                    <pre class="code-preview">{{ currentStack }}</pre>
                </div>
            </div>

            <!-- Premium Delete Confirmation Modal -->
            <transition name="modal-scale">
                <div v-if="confirmDialog" class="modal-window confirm-modal" @click.stop>
                    <div class="confirm-modal-content">
                        <div class="confirm-icon-wrapper">
                            <div class="pulse-ring"></div>
                            <AnimatedIcon name="trash" size="xl" />
                        </div>
                        <div class="confirm-text">
                            <h3>{{ $t('common.delete_confirm') }}?</h3>
                            <p>{{ $t('issues.table.messages.delete_confirm_desc') }}</p>
                        </div>
                        <div class="confirm-actions">
                            <button class="btn-modern btn-cancel" @click="confirmDialog = false">
                                <span>{{ $t('common.cancel') }}</span>
                            </button>
                            <button class="btn-modern btn-delete" @click="confirmDelete">
                                <span>{{ $t('common.yes_delete') }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </transition>

             <!-- URL Modal -->
            <div v-if="urlDialog" class="modal-window small" @click.stop>
                <div class="modal-header">
                    <h3>{{ $t('issues.table.endpoint') }}</h3>
                    <button class="btn-close parent-hover" @click="urlDialog = false"><AnimatedIcon name="close" /></button>
                </div>
                <div class="modal-body">
                    <div class="url-display">{{ currentUrl }}</div>
                    <div class="modal-footer">
                        <a :href="currentUrl" target="_blank" class="btn-primary-block">{{ $t('common.open_link') }}</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Global Loading Overlay with StateLoader -->
        <transition name="fade">
            <div v-if="loading" class="lottie-page-loading-overlay">
                <StateLoader :label="$t('common.loading')" width="60px" height="60px" />
            </div>
        </transition>

        <!-- Toast Notifications -->
        <div class="toast-container">
            <transition-group name="toast">
                <div v-for="note in notifications" :key="note.id" class="toast" :class="`toast-${note.type}`">
                    <AnimatedIcon name="success" v-if="note.type === 'success'" />
                    <AnimatedIcon name="error" v-if="note.type === 'error'" />
                    <span>{{ note.message }}</span>
                </div>
            </transition-group>
        </div>
    </div>
</template>

<script>
import axios from '@/plugins/axios';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
import StateLoader from '@/components/StateLoader.vue';
import StateEmpty from '@/components/StateEmpty.vue';
import AnimatedIcon from '@/components/AnimatedIcon.vue';
import { getWsBase } from '@/plugins/wsUrl';

export default {
    name: 'Dashboard',
    components: {
        StateLoader,
        StateEmpty,
        AnimatedIcon
    },
    data() {
        return {
            issues: [],
            loading: false,
            expandedIssues: {},
            issueEvents: {},
            replayDialog: false,
            stackDialog: false,
            urlDialog: false,
            currentStack: '',
            currentUrl: '',
            currentSessionEvents: null,
            currentNetworkLogs: [],
            currentConsoleLogs: [],
            activeTab: 'replay',
            networkTabVisible: false,
            notifications: [], // Toast notification queue
            notificationList: [],
            notificationWs: null,
            notificationReconnectTimer: null,
            showNotificationMenu: false,
            confirmDialog: false,
            pendingDeleteId: null,
            showAllIssues: true,
            activeIssuesTab: 'code',
            selectedProject: (localStorage.getItem('is_superuser') === 'true') ? 'All Projects' : (localStorage.getItem('user_project_name') || 'All Projects'),
            showProjectFilter: false,
            allProjectNames: [],
            showUserMenu: false, // Control user menu visibility
            isSidebarCollapsed: false,
            permissions: {
                dashboard: true,
                issues: true,
                users: false,
                settings: true,
                can_delete_issues: false,
                can_create_project: false,
                can_create_task: false,
                can_view_user_projects: false,
                backlog: true,
                reports: true,
                members: true,
                chat: true,
                docs: true,
                evaluations: false,
                performance: true,
                notifications: true,
                manage_permissions: false
            },
            allProjects: [],
            currentTheme: localStorage.getItem('user_theme') || 'system',
            currentLang: localStorage.getItem('user_language') || 'en',
            avatar: null,
            userRole: localStorage.getItem('user_role') || '',
        }
    },
    directives: {
        clickOutside: {
            mounted(el, binding) {
                el.clickOutsideEvent = function(event) {
                    if (!(el === event.target || el.contains(event.target))) {
                        binding.value(event);
                    }
                };
                document.body.addEventListener('click', el.clickOutsideEvent);
            },
            unmounted(el) {
                document.body.removeEventListener('click', el.clickOutsideEvent);
            }
        }
    },
    computed: {
        isSuperuser() {
            return localStorage.getItem('is_superuser') === 'true';
        },
        pageTitle() {
            const name = this.$route.name;
            if (name === 'Overview') return 'dashboard';
            if (name === 'ProjectSummary') return 'project_summary';
            if (name === 'Issues') return 'issues';
            if (name === 'ProjectIssues') return 'project_issues';
            if (name === 'Projects') return 'projects';
            if (name === 'ProjectBoard') return 'project_board';
            if (name === 'ProjectBacklog') return 'backlog';
            if (name === 'Users') return 'users';
            if (name === 'Settings') return 'settings';
            if (name === 'Permissions') return 'permissions';
            if (name === 'Evaluations') return 'evaluations';
            if (name === 'MyPerformance') return 'my_performance';
            if (name === 'Notifications') return 'notifications';
            if (name === 'ProjectReports') return 'reports';
            if (name === 'ProjectMembers') return 'members';
            if (name === 'ProjectChat') return 'chat';
            if (name === 'ProjectDocs') return 'docs';
            return 'dashboard';
        },
        currentRouteName() {
            return this.$t(`common.${this.pageTitle}`) || this.pageTitle;
        },
        hideSharedHeader() {
            // These routes have their own top bar
            const selfHeaderRoutes = [
                'ProjectBoard', 'ProjectBacklog', 'ProjectReports',
                'ProjectChat', 'ProjectDocs', 'AddProjectDoc', 'EditProjectDoc',
                'AutomationRules', 'BottleneckAnalysis', 'CustomFieldsConfig',
                'ProjectReleases', 'PluginsAdmin', 'ProjectMembers'
            ];
            return selfHeaderRoutes.includes(this.$route.name);
        },
        activeProjectId() {
            return this.$route.params.projectId;
        },
        activeProjectName() {
            if (!this.activeProjectId) return null;
            const project = this.allProjects.find(p => p.id == this.activeProjectId);
            if (project) return project.name;
            // Fallback to issues data if project list isn't ready
            const issueWithProject = this.issues.find(i => i.project_id == this.activeProjectId);
            return issueWithProject ? issueWithProject.project_name : this.$t('common.projects');
        },
        uniqueProjects() {
            if (this.isSuperuser && this.allProjectNames.length > 0) {
                return this.allProjectNames;
            }
            const projects = new Set(this.issues.map(i => i.project_name || this.$t('common.general')));
            return Array.from(projects);
        },
        openIssuesCount() {
            return this.issues.filter(i => i.status === 'open').length;
        },
        totalEvents() {
            return this.issues.reduce((acc, curr) => acc + curr.counter, 0);
        },
        networkIssues() {
            let filtered = this.issues.filter(i => i.title && (i.title.includes('NetworkError') || i.title.includes('HTTP') || i.title.includes('Fetch')));
            
            if (this.selectedProject !== 'All Projects') {
                filtered = filtered.filter(i => (i.project_name || 'General') === this.selectedProject);
            }
            return filtered;
        },
        codeIssues() {
            let filtered = this.issues.filter(i => !i.title || (!i.title.includes('NetworkError') && !i.title.includes('HTTP') && !i.title.includes('Fetch')));
            
            if (this.selectedProject !== 'All Projects') {
                filtered = filtered.filter(i => (i.project_name || 'General') === this.selectedProject);
            }
            return filtered;
        },
        filteredNetworkLogs() {
            const errors = this.currentNetworkLogs.filter(log => log.status >= 400 || log.status === 0);
            const uniqueErrors = [];
            const seen = new Set();
            errors.forEach(log => {
                const key = `${log.method}-${log.status}-${log.url}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueErrors.push(log);
                }
            });
            return uniqueErrors;
        },
        projectStats() {
            const stats = {};
            
            this.issues.forEach(issue => {
                const projectName = issue.project_name || this.$t('common.general');
                if (!stats[projectName]) {
                    const pmProject = this.allProjects.find(p => p.name === projectName);
                    stats[projectName] = {
                        name: projectName,
                        totalErrors: 0,
                        activeIssues: 0,
                        id: pmProject ? pmProject.id : issue.project
                    };
                }
                
                stats[projectName].totalErrors += issue.counter || 1;
                if (issue.status === 'open') {
                    stats[projectName].activeIssues += 1;
                }
            });
            
            return Object.values(stats);
        },
        unreadNotificationsCount() {
            return this.notificationList.filter(n => !n.is_read).length;
        },
        userName() {
            return localStorage.getItem('username') || this.$t('dashboard.admin_user');
        },
        userInitial() {
            const name = this.userName;
            return name ? name[0].toUpperCase() : 'U';
        },
        translatedRole() {
            if (!this.userRole) return this.$t('dashboard.role_admin');
            
            // Map common roles to translation keys
            const roleMappings = {
                'Super Admin': 'dashboard.role_super_admin',
                'User': 'dashboard.role_user',
                'Admin': 'dashboard.role_admin',
                'Administrator': 'dashboard.role_admin'
            };
            
            const key = roleMappings[this.userRole];
            return key ? this.$t(key) : this.userRole;
        },
        toggleIcon() {
            const isRtl = document.documentElement.dir === 'rtl';
            if (this.isSidebarCollapsed) {
                return 'chevron-right';
            }
            return 'chevron-left';
        }
    },
    watch: {
        activeProjectId(newVal, oldVal) {
            if (newVal !== oldVal) {
                console.log('Dashboard: Project changed to', newVal);
                if (newVal) {
                    const projectObj = this.allProjects.find(p => p.id == newVal);
                    if (projectObj) {
                        this.selectedProject = projectObj.name;
                    }
                } else {
                    this.selectedProject = this.isSuperuser ? 'All Projects' : (localStorage.getItem('user_project_name') || 'All Projects');
                }
                this.refreshData();
            }
        }
    },
    async mounted() {
        // Load permissions from localStorage if available
        const cachedPermissions = localStorage.getItem('user_permissions');
        if (cachedPermissions) {
            try {
                this.permissions = { ...this.permissions, ...JSON.parse(cachedPermissions) };
            } catch (e) {
                console.error("Error parsing permissions", e);
            }
        }
        
        // Fetch fresh profile data (including permissions) to handle superuser/role updates
        this.fetchUserProfile();
        
        // Ensure selectedProject is synced on mount for the correct initial filtering
        if (this.activeProjectId) {
            // We might not have allProjects yet, so we'll wait for refreshData to handle it,
            // but we can try to find it if we're coming from another route where it was loaded.
             const projectObj = this.allProjects.find(p => p.id == this.activeProjectId);
             if (projectObj) this.selectedProject = projectObj.name;
        }

        this.refreshData();
        this.fetchNotifications();
        this.connectNotificationWebSocket();
        
        window.addEventListener('click', this.handleOutsideClick);
        window.addEventListener('notifications-read', this.fetchNotifications);
    },
    beforeUnmount() {
        window.removeEventListener('click', this.handleOutsideClick);
        window.removeEventListener('notifications-read', this.fetchNotifications);
        if (this.notificationWs) {
            this.notificationWs.onclose = null;
            this.notificationWs.close();
        }
        if (this.notificationReconnectTimer) clearInterval(this.notificationReconnectTimer);
    },
    methods: {
        toggleSidebar() {
            this.isSidebarCollapsed = !this.isSidebarCollapsed;
        },
        forceNavigateTo(section) {
            console.log('Dashboard: Forcing navigation to', section);
            // Map legacy sections to routes
            const routeMap = {
                'overview': '/dashboard',
                'issues': '/issues',
                'projects': '/projects',
                'settings': '/settings',
                'users': '/users',
                'permissions': '/permissions'
            };
            const path = routeMap[section] || '/dashboard';
            this.$router.push(path);
        },
        onProfileUpdated(updatedUser) {
            console.log('Dashboard: Handling profile update', updatedUser);
            // Re-sync local state from localStorage (already updated by SettingsView)
            this.selectedProject = localStorage.getItem('user_project_name') || 'All Projects';
            
            // Update permissions if included
            if (updatedUser.permissions) {
                this.permissions = updatedUser.permissions;
                localStorage.setItem('user_permissions', JSON.stringify(updatedUser.permissions));
            }
            
            this.refreshData(); // Refresh with new project filter
        },
        handleOutsideClick(e) {
            this.showProjectFilter = false;
        },
        showToast(message, type = 'success') {
            const id = Date.now();
            this.notifications.push({ id, message, type });
            setTimeout(() => {
                this.notifications = this.notifications.filter(n => n.id !== id);
            }, 3000);
        },
        closeAllModals() {
            this.replayDialog = false;
            this.stackDialog = false;
            this.urlDialog = false;
            this.confirmDialog = false;
            this.pendingDeleteId = null;
        },
         async logout() {
            try {
                localStorage.clear();
                this.$router.push('/login');
                this.showToast(this.$t('auth.logout_success'), 'success');
            } catch (error) {
                console.error('Logout failed:', error);
                this.showToast(this.$t('auth.logout_error'), 'error');
            }
        },
        toggleUserMenu() {
            this.showUserMenu = !this.showUserMenu;
        },
        closeUserMenu() {
            this.showUserMenu = false;
        },
        toggleNotificationMenu() {
            this.showNotificationMenu = !this.showNotificationMenu;
            if (this.showNotificationMenu && this.notificationList.length === 0) {
                this.fetchNotifications();
            }
        },
        closeNotificationMenu() {
            this.showNotificationMenu = false;
        },
        connectNotificationWebSocket() {
            const username = localStorage.getItem('username');
            if (!username) return;

            if (this.notificationWs) {
                this.notificationWs.close();
            }

            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${getWsBase()}/ws/notifications/${username}/`;

            this.notificationWs = new WebSocket(wsUrl);

            this.notificationWs.onopen = () => {
                console.log('Notification WebSocket connected');
                if (this.notificationReconnectTimer) {
                    clearInterval(this.notificationReconnectTimer);
                    this.notificationReconnectTimer = null;
                }
            };

            this.notificationWs.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'notification' && data.data) {
                    // Check if already in list to prevent dupes
                    if (!this.notificationList.some(n => n.id === data.data.id)) {
                        this.notificationList.unshift(data.data);
                        this.showToast(this.$t('notifications.new_notification'), 'info');
                    }
                }
            };

            this.notificationWs.onclose = () => {
                console.log('Notification WebSocket disconnected. Reconnecting...');
                if (!this.notificationReconnectTimer) {
                    this.notificationReconnectTimer = setInterval(this.connectNotificationWebSocket, 5000);
                }
            };

            this.notificationWs.onerror = (error) => {
                console.error('Notification WS Error', error);
                this.notificationWs.close();
            };
        },
        async fetchNotifications() {
            try {
                const response = await axios.get('/api/pm/notifications/');
                this.notificationList = response.data;
            } catch (error) {
                console.error('Failed to fetch notifications', error);
            }
        },
        async markAllNotificationsRead() {
            try {
                await axios.post('/api/pm/notifications/mark-all-read/');
                this.notificationList.forEach(n => n.is_read = true);
            } catch (error) {
                console.error('Failed to mark notifications as read', error);
            }
        },
        handleNotificationClick(notif) {
            this.showNotificationMenu = false;
            if (!notif.is_read) {
                axios.patch(`/api/pm/notifications/${notif.id}/`, { is_read: true }).then(() => {
                    notif.is_read = true;
                });
            }
            if (notif.task) {
                this.$router.push({ name: 'ProjectBacklog', params: { projectId: notif.project_id }, query: { task: notif.task } });
            }
        },
        goToAllNotifications() {
            this.showNotificationMenu = false;
            this.$router.push('/settings?tab=notifications');
        },
        formatTimeAgo(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return this.$t('common.just_now');
            if (diffInSeconds < 3600) return this.$t('common.minutes_ago', { n: Math.floor(diffInSeconds / 60) });
            if (diffInSeconds < 86400) return this.$t('common.hours_ago', { n: Math.floor(diffInSeconds / 3600) });
            return this.$t('common.days_ago', { n: Math.floor(diffInSeconds / 86400) });
        },
        showToast(message, type = 'success') {
            const id = Date.now();
            this.notifications.push({ id, message, type });
            setTimeout(() => {
                this.notifications = this.notifications.filter(n => n.id !== id);
            }, 3000);
        },
        async refreshData() {
            this.loading = true;
            try {
                const routeProjectId = this.$route.params.projectId;
                const isSuper = this.isSuperuser;
                
                // Fetch all project names first to ensure we can filter by name if needed
                if (this.allProjects.length === 0) {
                    try {
                        const projRes = await axios.get('/api/pm/projects/');
                        this.allProjects = projRes.data;
                        this.allProjectNames = projRes.data.map(p => p.name);
                    } catch (e) {
                        console.error('Failed to fetch projects for filter', e);
                    }
                }

                let url = '/api/issues/';
                const params = new URLSearchParams();
                
                // If we are in a project-specific route, filter by project name
                if (routeProjectId) {
                    // Make sure projects are loaded so we can find the name
                    if (this.allProjects.length === 0) {
                         try {
                            const pRes = await axios.get('/api/pm/projects/');
                            this.allProjects = pRes.data;
                            this.allProjectNames = this.allProjects.map(p => p.name);
                        } catch (e) { console.error(e); }
                    }
                    
                    const projectObj = this.allProjects.find(p => p.id == routeProjectId);
                    if (projectObj && projectObj.name) {
                        params.set('project_name', projectObj.name);
                        this.selectedProject = projectObj.name;
                    } else {
                        params.set('project_id', routeProjectId);
                    }
                }
                
                if (params.toString()) url += '?' + params.toString();
                const res = await axios.get(url);
                this.issues = res.data;

                // Refresh the current child view's data
                const childView = this.$refs.currentView;
                if (childView && typeof childView.refreshData === 'function') {
                    await childView.refreshData();
                }
            } catch (e) {
                console.error("Failed to load issues", e);
                this.showToast(this.$t('issues.messages.fetch_error'), 'error');
            } finally {
                this.loading = false;
            }
        },
        async handleViewError(issueId) {
            console.log("Viewing error from task:", issueId);
            // 1. Navigate to issues — use project context if available
            const projectId = this.activeProjectId;
            if (projectId) {
                await this.$router.push(`/projects/${projectId}/issues`);
            } else {
                await this.$router.push('/issues');
            }
            
            // 2. Ensure we have the latest data
            if (this.issues.length === 0) {
                await this.refreshData();
            }

            // 3. Find the issue
            const issue = this.issues.find(i => i.id === issueId);
            
            if (issue) {
                // 4. Determine tab
                const isNetwork = issue.title && (issue.title.includes('NetworkError') || issue.title.includes('HTTP') || issue.title.includes('Fetch'));
                this.activeIssuesTab = isNetwork ? 'network' : 'code';

                // 5. Expand issue
                this.$nextTick(() => {
                    if (!this.expandedIssues[issue.id]) {
                        this.toggleExpand(issue.id);
                    }
                    
                    // 6. Scroll to issue
                    setTimeout(() => {
                        const element = document.getElementById(`issue-${issue.id}`);
                         if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            element.classList.add('highlight-pulse');
                            setTimeout(() => element.classList.remove('highlight-pulse'), 2000);
                        }
                    }, 500);
                });
            } else {
                this.showToast(this.$t('issues.messages.not_found'), "error");
            }
        },
        toggleExpand(issueId) {
            if (this.expandedIssues[issueId]) {
                this.expandedIssues[issueId] = false;
            } else {
                this.expandedIssues[issueId] = true;
                if (!this.issueEvents[issueId]) {
                    axios.get(`/api/issues/${issueId}/events/`)
                        .then(res => {
                            const data = res.data;
                            const validEvents = Array.isArray(data) ? data.filter(e => e) : [];
                            this.issueEvents = { ...this.issueEvents, [issueId]: validEvents };
                        })
                        .catch(err => {
                            console.error("Failed to fetch events", err);
                            this.issueEvents = { ...this.issueEvents, [issueId]: [] };
                        });
                }
            }
        },
        async fetchUserProfile() {
            try {
                const username = localStorage.getItem('username');
                if (!username) return;
                
                const response = await axios.get(`/api/profile?username=${username}`);
                if (response.data && response.data.user) {
                    if (response.data.user.permissions) {
                        this.permissions = response.data.user.permissions;
                        localStorage.setItem('user_permissions', JSON.stringify(this.permissions));
                        console.log('Refreshed permissions:', this.permissions);
                    }
                    if (response.data.user.avatar) {
                        this.avatar = response.data.user.avatar;
                    }
                    
                    // Update user role
                    let role = response.data.user.group_name;
                    if (response.data.user.is_superuser) {
                        role = 'Super Admin';
                    } else if (!role) {
                        role = 'User';
                    }
                    this.userRole = role;
                    localStorage.setItem('user_role', role);
                }
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            }
        },
        deleteIssue(issueId) {
            this.closeAllModals();
            this.pendingDeleteId = issueId;
            this.confirmDialog = true;
        },
        async confirmDelete() {
            if (!this.pendingDeleteId) return;
            const issueId = this.pendingDeleteId;
            
            try {
                const response = await axios.delete(`/api/issues/${issueId}/delete/`);
                if (response.data.status === 'success') {
                    this.showToast(this.$t('issues.messages.delete_success'), 'success');
                    this.issues = this.issues.filter(i => i.id !== issueId);
                    if (this.expandedIssues[issueId]) delete this.expandedIssues[issueId];
                }
            } catch (error) {
                console.error("Failed to delete issue:", error);
                if (error.response && error.response.status === 404) {
                    this.issues = this.issues.filter(i => i.id !== issueId);
                    delete this.expandedIssues[issueId];
                    this.showToast(this.$t('issues.messages.delete_success'), 'success'); // Treat 404 as already deleted
                } else {
                    this.showToast(this.$t('issues.messages.delete_error'), "error");
                }
            } finally {
                this.confirmDialog = false;
                this.pendingDeleteId = null;
            }
        },
        openReplay(eventId, initialTab = 'replay') {
            this.closeAllModals();
            this.replayDialog = true;
            this.activeTab = initialTab;
            this.networkTabVisible = (initialTab === 'network');
            this.currentNetworkLogs = [];
            this.currentConsoleLogs = [];

            setTimeout(() => {
                const container = document.getElementById('replay-player');
                if (!container) {
                    setTimeout(() => this.openReplay(eventId, initialTab), 200);
                    return;
                }
                container.innerHTML = '';

                axios.get(`/api/session/${eventId}/`)
                    .then(res => {
                        const data = res.data;
                        this.currentNetworkLogs = data.network_logs || [];
                        this.currentConsoleLogs = data.console_logs || [];

                        if (data.events && data.events.length > 0) {
                            console.log('📹 Replay: Received', data.events.length, 'events');
                            
                            // تحليل الأحداث
                            const eventTypes = {};
                            data.events.forEach(e => {
                                eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
                            });
                            console.log('📊 Event types:', eventTypes);
                            
                            const hasMeta = data.events.some(e => e.type === 4);
                            const hasSnapshot = data.events.some(e => e.type === 2);
                            
                            console.log('✅ Has Meta:', hasMeta, '| Has Snapshot:', hasSnapshot);
                            
                            let processedEvents = [...data.events];
                            
                            // إضافة Meta event إذا كان مفقوداً
                            if (!hasMeta) {
                                console.warn('⚠️ Replay: Missing Meta event, synthesizing...');
                                const firstEvent = data.events[0];
                                processedEvents.unshift({
                                    type: 4,
                                    data: { 
                                        width: 1920, 
                                        height: 1080, 
                                        href: window.location.origin 
                                    },
                                    timestamp: firstEvent.timestamp - 100
                                });
                            }
                            
                            // إضافة Full Snapshot إذا كان مفقوداً
                            if (!hasSnapshot) {
                                console.warn('⚠️ Replay: Missing Full Snapshot - creating placeholder');
                                const metaEvent = processedEvents.find(e => e.type === 4);
                                processedEvents.splice(1, 0, {
                                    type: 2,
                                    data: {
                                        node: {
                                            type: 0,
                                            childNodes: [{
                                                type: 1,
                                                name: 'html',
                                                publicId: '',
                                                systemId: '',
                                                id: 2
                                            }, {
                                                type: 2,
                                                tagName: 'html',
                                                attributes: { lang: 'ar' },
                                                childNodes: [{
                                                    type: 2,
                                                    tagName: 'head',
                                                    attributes: {},
                                                    childNodes: [],
                                                    id: 4
                                                }, {
                                                    type: 2,
                                                    tagName: 'body',
                                                    attributes: {},
                                                    childNodes: [{
                                                        type: 2,
                                                        tagName: 'div',
                                                        attributes: { 
                                                            id: 'app',
                                                            style: 'width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5;'
                                                        },
                                                        childNodes: [{
                                                            type: 3,
                                                            textContent: 'تسجيل الجلسة - Session Recording',
                                                            id: 7
                                                        }],
                                                        id: 6
                                                    }],
                                                    id: 5
                                                }],
                                                id: 3
                                            }],
                                            id: 1
                                        },
                                        initialOffset: { left: 0, top: 0 }
                                    },
                                    timestamp: (metaEvent?.timestamp || processedEvents[0].timestamp) + 50
                                });
                            }

                            const initPlayer = () => {
                                container.innerHTML = '';
                                
                                const metaEvent = processedEvents.find(e => e.type === 4);
                                const originalWidth = metaEvent?.data?.width || 1920;
                                const originalHeight = metaEvent?.data?.height || 1080;
                                
                                console.log('🖥️ Original dimensions:', originalWidth, 'x', originalHeight);
                                
                                // حساب الأبعاد بشكل متناسق
                                const containerElement = container.parentElement;
                                const availableWidth = containerElement ? containerElement.clientWidth - 80 : window.innerWidth * 0.85;
                                const availableHeight = window.innerHeight * 0.75;
                                
                                // حساب النسبة الأصلية
                                const aspectRatio = originalWidth / originalHeight;
                                
                                // حساب الأبعاد مع الحفاظ على النسبة
                                let playerWidth = Math.min(availableWidth, 1600);
                                let playerHeight = playerWidth / aspectRatio;
                                
                                // إذا كان الارتفاع أكبر من المتاح، نعيد الحساب
                                if (playerHeight > availableHeight) {
                                    playerHeight = availableHeight;
                                    playerWidth = playerHeight * aspectRatio;
                                }
                                
                                // التأكد من الحد الأدنى
                                playerWidth = Math.max(playerWidth, 800);
                                playerHeight = Math.max(playerHeight, 600);
                                
                                console.log('📐 Player dimensions:', Math.round(playerWidth), 'x', Math.round(playerHeight), '| Aspect ratio:', aspectRatio.toFixed(2));

                                try {
                                    this.rrPlayerInstance = new rrwebPlayer({
                                        target: container,
                                        props: {
                                            events: processedEvents,
                                            width: Math.round(playerWidth),
                                            height: Math.round(playerHeight),
                                            autoPlay: true,
                                            showController: true,
                                            skipInactive: false,
                                            speed: 1,
                                            replayerConfig: {
                                                UNSAFE_replayCanvas: true,
                                                mouseTail: {
                                                    duration: 500,
                                                    lineCap: 'round',
                                                    lineWidth: 2,
                                                    strokeStyle: 'red'
                                                }
                                            },
                                        },
                                    });

                                    console.log('✅ Player initialized successfully');

                                    // إزالة sandbox من iframe للسماح بتنفيذ rrweb
                                    setTimeout(() => {
                                        const iframe = container.querySelector('iframe');
                                        if (iframe) {
                                            iframe.removeAttribute('sandbox');
                                            // تطبيق الأبعاد على iframe مباشرة
                                            iframe.style.width = '100%';
                                            iframe.style.height = '100%';
                                            iframe.style.border = 'none';
                                            console.log('🔓 Iframe sandbox removed and styled');
                                        }
                                    }, 100);
                                    
                                    // عرض تحذير إذا كانت البيانات ناقصة
                                    if (!hasSnapshot) {
                                        const warning = document.createElement('div');
                                        warning.className = 'replay-warning-overlay';
                                        warning.innerHTML = `
                                            <i class="fa-solid fa-triangle-exclamation"></i> 
                                            <span>${this.$t('replay.partial_data') || 'تسجيل جزئي: بنية الصفحة الكاملة مفقودة'}</span>
                                        `;
                                        container.appendChild(warning);
                                    }
                                } catch (error) {
                                    console.error('❌ Player initialization failed:', error);
                                    container.innerHTML = `
                                        <div class="empty-replay-state">
                                            <i class="fa-solid fa-exclamation-circle"></i>
                                            <p>فشل تشغيل التسجيل</p>
                                            <small>${error.message}</small>
                                        </div>
                                    `;
                                }
                            };

                            initPlayer();

                            // مراقبة تغيير الحجم
                            if (window.ResizeObserver) {
                                const ro = new ResizeObserver(() => {
                                    if (this.replayDialog && container.clientWidth > 0 && !this._isResizing) {
                                        this._isResizing = true;
                                        setTimeout(() => {
                                            initPlayer();
                                            this._isResizing = false;
                                        }, 500);
                                    }
                                });
                                ro.observe(container);
                                this._replayResizeObserver = ro;
                            }

                        } else {
                            console.warn('⚠️ No events received');
                            container.innerHTML = `
                                <div class="empty-replay-state">
                                    <i class="fa-solid fa-video-slash"></i>
                                    <p>${this.$t('replay.no_recording') || 'لا يوجد تسجيل متاح'}</p>
                                </div>
                            `;
                        }
                    })
                    .catch(err => {
                        console.error('❌ Failed to load session:', err);
                        if (container) {
                            container.innerHTML = `
                                <div class="empty-replay-state">
                                    <i class="fa-solid fa-exclamation-triangle"></i>
                                    <p>${this.$t('replay.load_error') || 'خطأ في تحميل التسجيل'}</p>
                                    <small>${err.message}</small>
                                </div>
                            `;
                        }
                    });
            }, 100);
        },
        openStack(traceback) {
            this.closeAllModals();
            this.currentStack = traceback;
            this.stackDialog = true;
        },
        showUrl(url) {
            if (!url) return;
            this.closeAllModals();
            this.currentUrl = url;
            this.urlDialog = true;
        },
        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                if (text === this.currentStack) {
                    this.showToast(this.$t('issues.messages.stack_copied'), 'success');
                } else if (text === JSON.stringify(this.currentNetworkLogs, null, 2)) {
                    this.showToast(this.$t('issues.messages.logs_copied'), 'success');
                } else {
                    this.showToast(this.$t('general.copied_to_clipboard'), "success");
                }
            } catch (err) {
                console.error('Failed to copy keys: ', err);
                this.showToast(this.$t('general.copy_failed'), "error");
            }
        },
        copyNetworkLogs() {
            if (!this.currentNetworkLogs || this.currentNetworkLogs.length === 0) return;
            const text = JSON.stringify(this.currentNetworkLogs, null, 2);
            this.copyToClipboard(text);
        },
        toggleTheme() {
            if (this.currentTheme === 'system') {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                this.currentTheme = isDark ? 'light' : 'dark';
            } else {
                this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            }
            
            localStorage.setItem('user_theme', this.currentTheme);
            
            const html = document.documentElement;
            html.setAttribute('data-theme', this.currentTheme);
            
            this.showToast(`${this.$t('common.theme')}: ${this.currentTheme}`, 'success');
        },
        toggleLanguage() {
            const nextLang = this.currentLang === 'en' ? 'ar' : 'en';
            this.currentLang = nextLang;
            
            // This will trigger the watch in App.vue if it exists, 
            // but we should also update it directy in the i18n instance
            this.$i18n.locale = nextLang;
            localStorage.setItem('user_language', nextLang);
            
            // Update direction
            const dir = nextLang === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.dir = dir;
            document.documentElement.lang = nextLang;
            
            this.showToast(nextLang === 'ar' ? this.$t('settings.lang_ar') || 'اللغة: العربية' : this.$t('settings.lang_en') || 'Language: English', 'success');
        },
        getFullUrl(path) {
            if (!path) return null;
            if (path.startsWith('http')) return path;
            return path; // Proxy handles /media
        }
    }
}
</script>

<style scoped>
/* Scoped Styles for Dashboard */
.dashboard-wrapper {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background-color: var(--bg-body);
}

/* ─────────────────────────────────────────────────────────
   SIDEBAR LAYOUT & ANIMATIONS (Premium LottieFiles Design)
   ───────────────────────────────────────────────────────── */
.sidebar {
    width: 260px;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border-inline-end: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: relative;
    z-index: 1000;
    transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease;
    flex-shrink: 0;
    box-shadow: var(--glass-shadow);
    overflow: hidden;
}

.sidebar.collapsed {
    width: 78px;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.project-context {
    background: rgba(var(--bg-sidebar-rgb), 0.65);
}

/* Subtle gradient border effect for premium feel */
.sidebar::before {
    content: '';
    position: absolute;
    top: 0; bottom: 0; right: 0;
    width: 1px;
    background: linear-gradient(to bottom, transparent, var(--primary-bg), var(--lf-teal), transparent);
    opacity: 0.5;
    z-index: -1;
}

/* Sidebar Header Brand */
.brand {
    padding: 32px 24px;
    display: flex;
    align-items: center;
    gap: 14px;
    height: 80px;
    position: relative;
}

.brand-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
}

.logo-box {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, var(--primary-gradient-start, var(--primary)), var(--primary)); /* Brand gradient */
    color: white;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(255, 51, 102, 0.3);
    aspect-ratio: 1 / 1;
    overflow: hidden;
}

.omnia-logo-svg {
    width: 22px;
    height: 22px;
    color: white;
}

.brand-name {
    font-weight: 700;
    font-size: 16px;
    color: var(--text-main);
    letter-spacing: -0.02em;
    white-space: nowrap;
}

.sidebar.collapsed .brand {
    padding: 24px 0;
    justify-content: center;
}

.sidebar.collapsed .brand-content {
    justify-content: center;
}

/* Toggle Arrow Button */
.btn-sidebar-toggle-brand {
    position: absolute;
    inset-inline-end: -16px;
    top: 100px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 20;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s, box-shadow 0.2s, color 0.2s;
}

.btn-sidebar-toggle-brand:hover {
    background: linear-gradient(135deg, var(--primary), var(--primary-gradient-end, var(--primary-hover)));
    color: white;
    border-color: transparent;
    transform: scale(1.15);
    box-shadow: 0 6px 16px var(--primary-bg);
}

.btn-sidebar-toggle-brand .toggle-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

[dir="rtl"] .btn-sidebar-toggle-brand .animated-icon {
    transform: scaleX(-1);
}

/* Project Context Header */
.project-info-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 8px;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;
    width: 100%;
    overflow: hidden;
}
.project-info-header:hover {
    background: linear-gradient(135deg, var(--primary-bg), var(--primary-bg));
    transform: translateX(var(--hover-offset, 4px));
}

[dir="rtl"] .project-info-header:hover {
    --hover-offset: -4px;
}
.sidebar.collapsed .project-info-header {
    justify-content: center;
    padding: 4px;
}

/* Navigation Menu */
.sidebar-nav {
    flex-grow: 1;
    padding: 12px 14px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none; /* Hide scrollbar for premium look */
}
.sidebar-nav::-webkit-scrollbar { display: none; }

.nav-section-label {
    padding: 16px 12px 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.1em;
    white-space: nowrap;
    opacity: 1;
    transition: opacity 0.3s ease;
}

/* Standard Nav Item */
.nav-item {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 6px 10px;
    padding: 10px 14px;
    border-radius: 14px;
    color: var(--text-main);
    text-decoration: none;
    font-weight: 500;
    font-size: 14px;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
    border: 1px solid transparent;
}

.nav-icon-wrapper {
    width: 36px;
    height: 36px;
    flex: 0 0 36px; /* Lock dimensions */
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: transparent;
    transition: all 0.2s ease;
    color: var(--text-muted);
    min-width: 36px;
    min-height: 36px;
    aspect-ratio: 1 / 1;
    box-sizing: border-box;
}

/* Force nav SVG icons to a consistent visible size */
.nav-icon-wrapper .animated-icon,
.nav-icon-wrapper svg {
    width: 22px !important;
    height: 22px !important;
    display: block;
    flex-shrink: 0;
    aspect-ratio: 1 / 1;
}

.nav-item i,
.nav-item .animated-icon {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.nav-item:hover {
    background: var(--bg-hover);
    border-color: var(--primary-bg);
    transform: translateX(var(--hover-offset, 4px));
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

[dir="rtl"] .nav-item:hover {
    --hover-offset: -4px;
}

.nav-item:hover .nav-icon-wrapper {
    background: var(--primary-bg);
    color: var(--primary);
    box-shadow: 0 0 0 4px var(--primary-bg);
}

.nav-item:hover i,
.nav-item:hover .animated-icon {
    transform: scale(1.15) rotate(5deg);
}

.nav-item.active {
    background: linear-gradient(135deg, var(--primary), var(--primary-gradient-end, var(--primary-hover)));
    color: white;
    font-weight: 600;
    box-shadow: 0 8px 16px var(--primary-glow);
    border: none;
}

.nav-item.active .nav-icon-wrapper {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    backdrop-filter: blur(4px);
}

/* Active state: icon stroke becomes white */
.nav-item.active .nav-icon-wrapper .animated-icon,
.nav-item.active .nav-icon-wrapper svg {
    stroke: white;
    color: white;
}

.nav-item.active::before {
    display: none; /* Removed the old line indicator in favor of the new wrapper design */
}

.nav-divider {
    height: 1px;
    background: var(--border-color);
    margin: 8px 12px;
}

.nav-section-label {
    padding: 16px 12px 8px;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
}

.nav-item.disabled {
    opacity: 0.5;
    cursor: default;
}

.nav-spacer {
    flex: 1;
}

.back-btn {
    margin-top: auto;
    margin-bottom: 12px;
    border: 1px dashed #dfe1e6;
}

.back-btn:hover {
    border-style: solid;
    border-color: var(--primary);
}

.sidebar-footer {
    padding: 16px;
    border-top: 1px solid var(--glass-border);
}

.user-profile {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: var(--radius-md);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    background: var(--bg-hover);
    border: 1px solid transparent;
}

.user-profile:hover {
    background: var(--glass-bg);
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-bg);
}

.avatar {
    width: 36px;
    height: 36px;
    background-color: #5e6c84;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    overflow: hidden; /* For image clipping */
}

.avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-img-sm {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
}

.user-info .user-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-main);
}

.user-info .user-role {
    font-size: 11px;
    color: var(--text-muted);
}

.sidebar.collapsed .brand-name,
.sidebar.collapsed .nav-item .nav-text,
.sidebar.collapsed .nav-section-label,
.sidebar.collapsed .user-info {
    display: none;
}

/* Fix icon clipping when collapsed */
.sidebar.collapsed .nav-item {
    padding: 10px 0;
    justify-content: center;
    margin: 6px 0; /* Remove horizontal margin to prevent clipping */
    width: 100%;
}
.sidebar.collapsed .nav-icon-wrapper {
    margin: 0 auto;
    flex: 0 0 36px;
}

.main-content {
    flex: 1;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: transparent;
    min-width: 0;
    width: 0; /* force flex child to shrink properly */
}

.route-view-container {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    width: 100%;
}

.route-view-container > * {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    flex-shrink: 0;
}

/* Router view fills remaining height after header */
.main-content > .router-view-wrapper,
.main-content > *:not(.top-header) {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}

/* 
 Note: In the new premium design, flex layout handles the sidebar 
 space natively since we removed position: absolute from the sidebar 
 and replaced it with position: relative / flex-shrink: 0. 
 We just need to ensure .dashboard-wrapper is a proper flex row.
*/

/* ══════════════════════════════════════════════
   TOP HEADER — Floating Island (Linear/Vercel style)
   ══════════════════════════════════════════════ */
.top-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-shrink: 0;
    padding: 10px 20px;
    background: transparent;
    position: relative;
    z-index: 100;
}

/* The floating pill */
.hdr-island {
    display: flex;
    align-items: center;
    gap: 2px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    padding: 4px 6px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
}

[data-theme="dark"] .hdr-island {
    background: rgba(29, 33, 37, 0.95);
    border-color: rgba(255,255,255,0.07);
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}

/* Separator */
.hdr-sep {
    width: 1px;
    height: 18px;
    background: var(--border-color);
    margin: 0 4px;
    flex-shrink: 0;
    opacity: 0.6;
}

/* Base pill button */
.hdr-pill-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 8px;
    border-radius: 9px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
    position: relative;
    white-space: nowrap;
}

.hdr-pill-btn:hover {
    background: var(--bg-hover);
    color: var(--text-main);
}

.hdr-pill-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

/* Language button */
.hdr-lang-label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: inherit;
}

/* Refresh button */
.hdr-refresh-btn {
    padding: 0 10px;
    gap: 6px;
}

.hdr-refresh-label {
    font-size: 12px;
    font-weight: 700;
}

.hdr-refresh-btn:hover {
    background: var(--primary);
    color: white;
}

.hdr-refresh-btn.is-loading,
.hdr-refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
}

/* Notification button */
.hdr-notif-btn {
    padding: 0 8px;
}

.hdr-notif-dot {
    position: absolute;
    top: 3px;
    inset-inline-end: 3px;
    min-width: 15px;
    height: 15px;
    background: #ef4444;
    color: white;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    border: 1.5px solid var(--bg-card);
    line-height: 1;
    pointer-events: none;
}

/* Avatar button */
.hdr-avatar-btn {
    padding: 0 8px 0 4px;
    gap: 7px;
}

.hdr-avatar-ring {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    overflow: hidden;
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-gradient-end, var(--primary-hover)) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 3px var(--primary);
}

.hdr-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.hdr-avatar-initial {
    font-size: 11px;
    font-weight: 800;
    color: white;
    line-height: 1;
}

.hdr-avatar-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-main);
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.hdr-avatar-btn:hover .hdr-avatar-ring {
    box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 3px var(--primary), 0 0 12px var(--primary-glow);
}

/* Logout button */
.hdr-logout-btn:hover {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
}

.btn-action-icon.text-danger:hover {
    background: var(--danger-bg);
    color: var(--danger);
}

.action-label-sm {
    position: absolute;
    bottom: -2px;
    right: -2px;
    font-size: 8px;
    font-weight: 800;
    background: var(--primary);
    color: white;
    padding: 1px 3px;
    border-radius: 4px;
    line-height: 1;
}

.action-divider {
    width: 1px;
    height: 20px;
    background: var(--border-color);
    margin: 0 4px;
}

.user-avatar-sm-icon {
    width: 28px;
    height: 28px;
    background: var(--primary);
    color: white;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
}

/* Jira Resizable Handle Styles */
.sidebar-resizable-handle {
    position: absolute;
    top: 0;
    inset-inline-end: -2px;
    bottom: 0;
    width: 4px;
    cursor: col-resize;
    z-index: 10;
    transition: background 0.2s ease;
}

.sidebar-resizable-handle:hover,
.sidebar-resizable-handle.is-resizing {
    background: var(--primary);
}

.sidebar-resizable-handle .handle-line {
    position: absolute;
    top: 0;
    bottom: 0;
    inset-inline-start: 1px;
    width: 2px;
}
.sidebar.collapsed .sidebar-resizable-handle {
    inset-inline-end: -4px;
}

.notification-dot {
    position: absolute;
    top: 10px;
    inset-inline-end: 10px;
    width: 8px;
    height: 8px;
    background: var(--danger);
    border-radius: 50%;
    border: 2px solid var(--bg-card);
}

/* Stats Grid - Uiverse Style */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 24px;
    margin-bottom: 40px;
}

.uiverse-card {
    background: var(--bg-card);
    border-radius: 16px;
    padding: 24px;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    cursor: default;
}

.uiverse-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary);
}

.uiverse-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(to bottom, var(--indigo-500), var(--indigo-100));
    opacity: 0;
    transition: opacity 0.3s;
}

.uiverse-card:hover::before {
    opacity: 1;
}

.card-content {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
}

.card-icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    transition: transform 0.3s;
}

.uiverse-card:hover .card-icon-wrapper {
    transform: scale(1.1) rotate(5deg);
}

.bg-indigo { background: var(--indigo-500); color: white; }
.bg-red { background: var(--danger); color: white; }
.bg-green { background: var(--success); color: white; }
.bg-purple { background: #9333ea; color: white; }

[data-theme="light"] .bg-indigo { background: var(--indigo-50); color: var(--indigo-600); }
[data-theme="light"] .bg-red { background: var(--danger-bg); color: var(--danger); }
[data-theme="light"] .bg-green { background: var(--success-bg); color: var(--success); }
[data-theme="light"] .bg-purple { background: #f3e8ff; color: #9333ea; }

.card-data {
    display: flex;
    flex-direction: column;
}

.card-label {
    font-size: 14px;
    color: var(--slate-500);
    font-weight: 500;
}

.card-value {
    font-size: 32px;
    font-weight: 700;
    color: var(--text-main);
    line-height: 1.2;
}

.card-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
}

.trend {
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
}

.trend.up { color: var(--success); }
.trend.down { color: var(--danger); }
.trend.neutral { color: var(--indigo-500); }

.trend-label {
    font-size: 13px;
    color: var(--slate-400);
}



/* Modals */
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(4px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-window {
    background: var(--bg-card);
    border-radius: 16px;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-lg);
    width: 800px;
    max-width: 90vw;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    animation: modalSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
}

.modal-window.wide {
    width: 92vw;
    max-width: 1400px;
    max-height: 92vh;
}

.modal-body {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}

.modal-body.p-0 {
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}


@keyframes modalSlide {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-main);
}

.modal-controls {
    display: flex;
    align-items: center;
    gap: 16px;
}

.tab-group {
    background: var(--bg-hover);
    padding: 4px;
    border-radius: 8px;
    display: flex;
}

.tab-group button {
    padding: 6px 12px;
    border: none;
    background: transparent;
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
}

.tab-group button.active {
    background: var(--bg-card);
    color: var(--indigo-600);
    box-shadow: var(--shadow-sm);
}

/* Small Icon Button (e.g., Copy) */
.btn-icon-sm {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
}

.btn-icon-sm:hover {
    background: var(--bg-hover);
    color: var(--primary);
    border-color: var(--primary);
}

.btn-close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--slate-100);
    border: 1px solid var(--slate-200);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: var(--slate-600);
    cursor: pointer;
    transition: all 0.2s;
}

.btn-close:hover { 
    background: var(--danger-bg);
    color: var(--danger);
    transform: rotate(90deg);
}

/* Premium Confirm Modal Styles */
.confirm-modal {
    width: 440px;
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border-color);
}

.confirm-modal-content {
    padding: 40px 32px;
    text-align: center;
}

.confirm-icon-wrapper {
    width: 80px;
    height: 80px;
    background: var(--danger-bg);
    color: var(--danger);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    margin: 0 auto 24px;
    position: relative;
}

.pulse-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border: 4px solid var(--danger);
    opacity: 0.2;
    border-radius: 50%;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { transform: scale(1); opacity: 0.5; }
    70% { transform: scale(1.4); opacity: 0; }
    100% { transform: scale(1.4); opacity: 0; }
}

.confirm-text h3 {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-main);
    margin: 0 0 12px;
}

.confirm-text p {
    font-size: 15px;
    color: var(--text-muted);
    line-height: 1.6;
    margin: 0 0 32px;
}

.confirm-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
}

.btn-modern {
    flex: 1;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
}

.btn-cancel {
    background: var(--bg-hover);
    color: var(--text-muted);
}

.btn-cancel:hover {
    background: var(--slate-200);
    transform: translateY(-2px);
}

.btn-delete {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-delete:hover {
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
    transform: translateY(-2px);
}

.btn-delete:active {
    transform: translateY(0);
}

/* Modal Animations */
.modal-scale-enter-active, .modal-scale-leave-active {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-scale-enter-from {
    transform: scale(0.9) translateY(20px);
    opacity: 0;
}

.modal-scale-leave-to {
    transform: scale(0.95);
    opacity: 0;
}

/* Toast Notifications */
.toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column-reverse;
    gap: 12px;
    z-index: 99999;
    pointer-events: none;
}

.toast {
    pointer-events: auto;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-lg);
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
    font-size: 14px;
    min-width: 280px;
    border-left: 4px solid transparent;
    animation: toastSlide 0.3s ease-out;
}

@keyframes toastSlide {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

.toast-success {
    border-left-color: var(--success);
    color: var(--text-main);
}
.toast-success i,
.toast-success .animated-icon { color: var(--success); stroke: var(--success); }

.toast-error {
    border-left-color: var(--danger);
    color: var(--text-main);
}
.toast-error i,
.toast-error .animated-icon { color: var(--danger); stroke: var(--danger); }

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.modal-body {
    padding: 24px;
    max-height: 80vh;
    overflow-y: auto;
}
.modal-body.p-0 { padding: 0; }

.code-preview {
    background: var(--slate-900);
    color: var(--slate-200);
    padding: 16px;
    border-radius: 8px;
    font-family: var(--font-mono);
    font-size: 13px;
    white-space: pre-wrap;
    overflow-x: auto;
    margin: 0;
}

.url-display {
    background: var(--slate-50);
    padding: 16px;
    border-radius: 8px;
    font-family: var(--font-mono);
    word-break: break-all;
    border: 1px solid var(--slate-200);
    color: var(--slate-700);
    margin-bottom: 16px;
}



/* Network Logs Table in Modal */
.network-logs-container { padding: 24px; }
.logs-table {
    width: 100%;
    border-collapse: collapse;
}
.logs-table th {
    text-align: left;
    padding: 12px;
    border-bottom: 2px solid var(--slate-100);
    font-size: 12px;
    color: var(--slate-500);
    text-transform: uppercase;
}
.logs-table td {
    padding: 12px;
    border-bottom: 1px solid var(--slate-50);
    font-size: 13px;
}
.truncate {
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}



/* Header Adjustments */
.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--slate-100);
}

.panel-actions {
    display: flex;
    align-items: center;
    gap: 20px; /* Increased gap for better grouping */
}

/* --- UIverse Inspired Enhancements --- */

/* Glass Card & Animated Border */
.glass-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
    position: relative;
    overflow: hidden;
}

.animated-border {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 2px;
    background: linear-gradient(90deg, transparent, currentColor, transparent);
    animation: borderMove 3s linear infinite;
    opacity: 0.5;
}

@keyframes borderMove {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

.purple-glow .animated-border { color: #8b5cf6; }
.red-glow .animated-border { color: #ef4444; }
.green-glow .animated-border { color: #10b981; }
.blue-glow .animated-border { color: #3b82f6; }

/* Glass Refresh Button */
.glass-btn {
    position: relative;
    background: linear-gradient(135deg, var(--primary), var(--primary-hover));
    color: white !important;
    border: none !important;
    overflow: hidden;
    transition: all 0.3s ease;
}

.glow-effect {
    position: absolute;
    top: -50%; left: -50%; width: 200%; height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
    transition: transform 0.5s;
    pointer-events: none;
    opacity: 0;
}

.glass-btn:hover .glow-effect {
    transform: translate(10%, 10%);
    opacity: 1;
}

.glass-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px -10px var(--primary-bg);
}

/* Modern Animated Toggle */
.modern-toggle {
    cursor: pointer;
    display: inline-block;
}

.modern-toggle input { display: none; }

.toggle-slider {
    width: 120px;
    height: 36px;
    background: var(--bg-toggle);
    border-radius: 18px;
    position: relative;
    display: flex;
    align-items: center;
    padding: 2px;
    border: 1px solid var(--border-color);
    transition: all 0.3s ease;
}

.toggle-label {
    flex: 1;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    z-index: 1;
    transition: color 0.3s;
}

.toggle-knob {
    position: absolute;
    width: 56px;
    height: 30px;
    background: var(--bg-indicator);
    border-radius: 15px;
    box-shadow: var(--shadow-sm);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

input:checked + .toggle-slider .toggle-knob {
    transform: translateX(58px);
}

input:checked + .toggle-slider .right { color: var(--text-main); }
input:not(:checked) + .toggle-slider .left { color: var(--text-main); }

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
/* --- Tab Based Navigation --- */
.issues-tab-container {
    margin-bottom: 24px;
}

.modern-tabs {
    display: flex;
    background: var(--bg-toggle);
    padding: 6px;
    border-radius: 14px;
    position: relative;
    border: 1px solid var(--border-color);
}

.tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border: none;
    background: transparent;
    font-size: 15px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    z-index: 1;
    transition: color 0.3s;
}

.tab-btn.active {
    color: var(--text-main);
}

.tab-indicator {
    position: absolute;
    top: 6px;
    bottom: 6px;
    width: calc(50% - 6px);
    background: var(--bg-indicator);
    border-radius: 9px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-count {
    background: var(--bg-hover);
    color: var(--text-muted);
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
}

.tab-btn.active .tab-count {
    background: var(--primary);
    color: white;
}

/* Transitions */
.fade-slide-enter-active, .fade-slide-leave-active {
    transition: all 0.3s ease;
}

.fade-slide-enter-from {
    opacity: 0;
    transform: translateY(10px);
}

.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}
@keyframes highlightPulse {
    0% { background-color: var(--primary-bg); }
    50% { background-color: var(--primary-bg); }
    100% { background-color: transparent; }
}

.highlight-pulse {
    animation: highlightPulse 2s ease-out;
}
</style>

<style scoped>
/* Add styles for project wrapper */
.projects-wrapper {
    height: 100%;
    padding: 20px;
    overflow: auto;
    display: flex;
    flex-direction: column;
}

/* User Menu Styles */
.user-menu-wrapper {
    position: relative;
    margin-right: 16px;
    margin-left: 0;
}

.user-avatar-btn {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--primary), var(--primary-hover));
    color: white;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px var(--primary-bg);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
}

.user-avatar-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px -2px var(--primary-bg);
}

.user-dropdown {
    width: 200px;
    right: 0;
    top: calc(100% + 10px);
    padding: 8px;
}

.dropdown-header {
    padding: 12px 16px;
    background: var(--bg-hover);
    border-radius: 8px;
    margin-bottom: 8px;
}

.user-info-sm .name {
    font-weight: 600;
    color: var(--text-main);
    font-size: 0.9rem;
}

.user-info-sm .role {
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 2px;
}

.dropdown-divider {
    height: 1px;
    background: #e2e8f0;
    margin: 4px 8px;
}

.kanban-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
}

.kanban-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
}

.kanban-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-main);
}

.btn-back {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #4b5563;
    font-weight: 500;
    transition: all 0.2s;
}

.btn-back:hover {
    background: var(--bg-hover);
    color: var(--text-main);
    border-color: var(--border-color);
}

/* Existing Styles */


/* Custom Dropdown Menu (Shared) - Now using global style in style.css */

/* Dropdown Item (Shared) - Now using global style in style.css */

.dropdown-item i {
    width: 20px;
    text-align: center;
}

.dropdown-item.text-danger {
    color: #ef4444;
}

.dropdown-item.text-danger:hover {
    background: var(--danger-bg);
    color: var(--danger);
}

/* Dropdown Animation */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
    transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
}

/* Toast Notifications */
.toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 99999;
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
    pointer-events: none;
}

.toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    backdrop-filter: blur(12px);
    min-width: 220px;
    animation: toastSlideIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.toast-success {
    background: linear-gradient(135deg, #059669, #10b981);
    color: white;
}

.toast-error {
    background: linear-gradient(135deg, #dc2626, #ef4444);
    color: white;
}

.toast-enter-active {
    animation: toastSlideIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.toast-leave-active {
    animation: toastSlideOut 0.3s cubic-bezier(0.4, 0, 1, 1);
}

@keyframes toastSlideIn {
    from { opacity: 0; transform: translateX(40px); }
    to { opacity: 1; transform: translateX(0); }
}

@keyframes toastSlideOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(40px); }
}

/* Notification System */
.notification-wrapper {
    position: relative;
}

.notification-badge {
    position: absolute;
    top: -4px;
    inset-inline-end: -4px;
    font-size: 10px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    text-align: center;
    border: 2px solid var(--bg-body);
    box-sizing: content-box;
    line-height: 1;
}

/* Ensure pulse badge is a perfect circle */
.badge.pulse-badge {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    padding: 0;
    position: absolute;
    top: 4px;
    right: 4px;
}

.nav-item .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    padding: 0 6px;
}

.notification-dropdown {
    position: absolute;
    top: calc(100% + 12px);
    inset-inline-end: -10px; /* Aligned nicely with the bell */
    width: 380px;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 20px;
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05) inset;
    z-index: 99999;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transform-origin: top right;
}

[data-theme="dark"] .notification-dropdown {
    background: rgba(30, 41, 59, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}
[dir="rtl"] .notification-dropdown {
    transform-origin: top left;
}

.dropdown-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-card);
    flex-shrink: 0;
}

.dropdown-header h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-main);
}

.dropdown-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--border-color);
    background: var(--bg-body);
    text-align: center;
}

.dropdown-footer button {
    width: 100%;
    margin: 0;
}

.notification-list {
    max-height: 350px;
    overflow-y: auto;
    padding: 0;
    margin: 0;
}

.notification-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: background 0.2s;
    position: relative;
}

.notification-item:last-child {
    border-bottom: none;
}

.notification-item:hover {
    background: var(--bg-hover);
}

.notification-item.unread {
    background: var(--primary-bg);
}
.notification-item.unread:hover {
    background: var(--bg-hover);
}

.notification-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
}

.notification-content {
    flex: 1;
    min-width: 0;
}

.notification-content p {
    margin: 0 0 4px 0;
    font-size: 14px;
    color: var(--text-main);
    line-height: 1.4;
}

.notification-time {
    font-size: 12px;
    color: var(--text-muted);
}

.unread-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--primary);
    position: absolute;
    inset-inline-end: 20px;
    top: 50%;
    transform: translateY(-50%);
}

/* Session Replay Styles - إعادة تصميم كاملة */
.player-container {
    flex: 1;
    min-height: 500px;
    max-height: calc(92vh - 70px);
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
    overflow: auto;
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 20px;
}

.empty-replay-state {
    color: #94a3b8;
    padding: 80px 40px;
    text-align: center;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 100%;
}

.empty-replay-state i {
    font-size: 4rem;
    opacity: 0.4;
    color: #64748b;
}

.empty-replay-state p {
    font-size: 1.1rem;
    font-weight: 500;
    margin: 0;
}

.empty-replay-state small {
    font-size: 0.85rem;
    opacity: 0.7;
    max-width: 500px;
}

.replay-warning-overlay {
    position: absolute;
    top: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(251, 146, 60, 0.95) 100%);
    color: white;
    padding: 10px 20px;
    border-radius: 24px;
    font-size: 13px;
    font-weight: 600;
    pointer-events: none;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4);
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideDown 0.4s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
}

.replay-warning-overlay i {
    font-size: 16px;
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

/* تحسين مظهر مشغل rrweb */
:deep(.rr-player) {
    border-radius: 8px !important;
    border: none !important;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
    overflow: visible !important;
    background: #fff !important;
    max-width: 100% !important;
    margin: 0 auto !important;
    display: flex !important;
    flex-direction: column !important;
}

:deep(.rr-controller) {
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%) !important;
    backdrop-filter: blur(12px) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
    padding: 12px 16px !important;
}

:deep(.rr-player__frame) {
    background: #ffffff !important;
    border-radius: 8px 8px 0 0 !important;
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}

:deep(.rr-timeline) {
    background: rgba(255, 255, 255, 0.1) !important;
    border-radius: 4px !important;
}

:deep(.rr-timeline__time) {
    color: rgba(255, 255, 255, 0.9) !important;
    font-weight: 500 !important;
}

:deep(.rr-progress) {
    background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%) !important;
    border-radius: 4px !important;
}

:deep(.rr-controller__btns button) {
    color: rgba(255, 255, 255, 0.9) !important;
    transition: all 0.2s ease !important;
}

:deep(.rr-controller__btns button:hover) {
    color: #3b82f6 !important;
    transform: scale(1.1) !important;
}

/* تحسين iframe داخل المشغل - إزالة sandbox */
:deep(iframe) {
    border: none !important;
    border-radius: 8px 8px 0 0 !important;
    width: 100% !important;
    height: 100% !important;
    display: block !important;
}

/* تحسين replayer داخل iframe */
:deep(.replayer-wrapper) {
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: #ffffff !important;
}

:deep(.replayer-mouse) {
    pointer-events: none !important;
}

</style>
