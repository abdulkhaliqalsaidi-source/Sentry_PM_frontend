import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../components/Dashboard.vue'
import AuthView from '../components/AuthView.vue'
import TestSimulator from '../components/TestSimulator.vue'

// Views
import Overview from '../views/Overview.vue'
import IssuesView from '../views/IssuesView.vue'
import ProjectsView from '../views/ProjectsView.vue'
import KanbanBoard from '../components/KanbanBoard.vue'
import SettingsView from '../components/SettingsView.vue'
import UsersView from '../components/UsersView.vue'
import PermissionsView from '../components/PermissionsView.vue'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: AuthView
    },
    {
        path: '/test-simulator',
        name: 'TestSimulator',
        component: TestSimulator,
        meta: { requiresAuth: true }
    },
    {
        path: '/',
        component: Dashboard,
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                redirect: '/dashboard'
            },
            {
                path: 'dashboard',
                name: 'Overview',
                component: Overview,
                meta: { permission: 'dashboard' }
            },
            {
                path: 'issues',
                name: 'Issues',
                component: IssuesView,
                meta: { permission: 'issues' }
            },
            {
                path: 'projects',
                name: 'Projects',
                component: ProjectsView
            },
            {
                path: 'projects/:projectId',
                name: 'ProjectBoard',
                component: KanbanBoard,
                props: true,
                meta: { hideHeader: true }
            },
            {
                path: 'projects/:projectId/summary',
                name: 'ProjectSummary',
                component: Overview,
                props: true
            },
            {
                path: 'projects/:projectId/issues',
                name: 'ProjectIssues',
                component: IssuesView,
                props: true
            },
            {
                path: 'projects/:projectId/backlog',
                name: 'ProjectBacklog',
                component: () => import('../views/BacklogView.vue'),
                props: true,
                meta: { permission: 'backlog', hideHeader: true }
            },
            {
                path: 'projects/:projectId/reports',
                name: 'ProjectReports',
                component: () => import('../views/ReportsView.vue'),
                props: true,
                meta: { permission: 'reports', hideHeader: true }
            },
            {
                path: 'projects/:projectId/members',
                name: 'ProjectMembers',
                component: () => import('../views/ProjectMembersView.vue'),
                props: true,
                meta: { permission: 'members', hideHeader: true }
            },
            {
                path: 'projects/:projectId/chat',
                name: 'ProjectChat',
                component: () => import('../views/ProjectChatView.vue'),
                props: true,
                meta: { permission: 'chat', hideHeader: true }
            },
            {
                path: 'projects/:projectId/docs',
                name: 'ProjectDocs',
                component: () => import('../views/DocViewer.vue'),
                props: true,
                meta: { permission: 'docs', hideHeader: true }
            },
            {
                path: 'projects/:projectId/docs/add',
                name: 'AddProjectDoc',
                component: () => import('../views/AdminDocEditor.vue'),
                props: true,
                meta: { permission: 'docs', hideHeader: true }
            },
            {
                path: 'projects/:projectId/docs/:docId/edit',
                name: 'EditProjectDoc',
                component: () => import('../views/AdminDocEditor.vue'),
                props: true,
                meta: { permission: 'docs', hideHeader: true }
            },
            {
                path: 'settings',
                name: 'Settings',
                component: SettingsView,
                meta: { permission: 'settings' }
            },
            {
                path: 'users',
                name: 'Users',
                component: UsersView,
                meta: { permission: 'users', requiresAuth: true }
            },
            {
                path: 'permissions',
                name: 'Permissions',
                component: PermissionsView,
                meta: { permission: 'manage_permissions', requiresAuth: true }
            },
            {
                path: 'evaluations',
                name: 'Evaluations',
                component: () => import('../views/EvaluationView.vue'),
                meta: { permission: 'evaluations' }
            },
            {
                path: 'performance',
                name: 'MyPerformance',
                component: () => import('../views/PerformanceView.vue'),
                meta: { permission: 'performance' }
            },
            {
                path: 'projects/:projectId/custom-fields',
                name: 'CustomFieldsConfig',
                component: () => import('../views/CustomFieldsConfigView.vue'),
                props: true,
                meta: { permission: 'settings', hideHeader: true }
            },
            {
                path: 'projects/:projectId/automation',
                name: 'AutomationRules',
                component: () => import('../views/AutomationRulesView.vue'),
                props: true,
                meta: { permission: 'settings', hideHeader: true }
            },
            {
                path: 'projects/:projectId/bottleneck',
                name: 'BottleneckAnalysis',
                component: () => import('../views/BottleneckView.vue'),
                props: true,
                meta: { permission: 'reports', hideHeader: true }
            },
            {
                path: 'projects/:projectId/releases',
                name: 'ProjectReleases',
                component: () => import('../views/ReleasesView.vue'),
                props: true,
                meta: { permission: 'reports', hideHeader: true }
            },
            {
                path: 'plugins',
                name: 'PluginsAdmin',
                component: () => import('../views/PluginsAdminView.vue'),
                meta: { permission: 'settings', hideHeader: true }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Ordered list of fallback routes when the target is blocked
const FALLBACK_ROUTES = [
    { path: '/dashboard', perm: 'dashboard' },
    { path: '/projects', perm: null },          // always accessible
    { path: '/issues', perm: 'issues' },
    { path: '/evaluations', perm: 'evaluations' },
    { path: '/performance', perm: 'performance' },
    { path: '/settings', perm: 'settings' },
]

router.beforeEach((to, from, next) => {
    let isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
    const isSuperuser = localStorage.getItem('is_superuser') === 'true'

    if (isAuthenticated) {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
            localStorage.clear()
            isAuthenticated = false
        }
        // FIX #12: check token expiry on every navigation, not just every 5s
        const expiry = localStorage.getItem('session_expiry_time')
        if (expiry && Date.now() > parseInt(expiry, 10)) {
            localStorage.clear()
            isAuthenticated = false
        }
    }

    if (to.meta.requiresAuth && !isAuthenticated) {
        return next('/login')
    }
    if (to.path === '/login' && isAuthenticated) {
        return next('/')
    }

    const requiredPerm = to.meta?.permission
    if (requiredPerm && !isSuperuser) {
        const perms = JSON.parse(localStorage.getItem('user_permissions') || '{}')
        if (!perms[requiredPerm]) {
            window.dispatchEvent(new CustomEvent('permission-denied', {
                detail: { message: 'ليس لديك صلاحية للوصول لهذه الصفحة' }
            }));
            for (const fallback of FALLBACK_ROUTES) {
                if (!fallback.perm || perms[fallback.perm]) {
                    if (to.path !== fallback.path) {
                        return next(fallback.path)
                    }
                    break
                }
            }
        }
    }

    next()
})

export default router
