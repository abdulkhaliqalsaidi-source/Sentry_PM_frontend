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
                props: true
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
                meta: { permission: 'backlog' }
            },
            {
                path: 'projects/:projectId/reports',
                name: 'ProjectReports',
                component: () => import('../views/ReportsView.vue'),
                props: true,
                meta: { permission: 'reports' }
            },
            {
                path: 'projects/:projectId/members',
                name: 'ProjectMembers',
                component: () => import('../views/ProjectMembersView.vue'),
                props: true,
                meta: { permission: 'members' }
            },
            {
                path: 'projects/:projectId/chat',
                name: 'ProjectChat',
                component: () => import('../views/ProjectChatView.vue'),
                props: true,
                meta: { permission: 'chat' }
            },
            {
                path: 'projects/:projectId/docs',
                name: 'ProjectDocs',
                component: () => import('../views/DocViewer.vue'),
                props: true,
                meta: { permission: 'docs' }
            },
            {
                path: 'projects/:projectId/docs/add',
                name: 'AddProjectDoc',
                component: () => import('../views/AdminDocEditor.vue'),
                props: true
            },
            {
                path: 'projects/:projectId/docs/:docId/edit',
                name: 'EditProjectDoc',
                component: () => import('../views/AdminDocEditor.vue'),
                props: true
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
                meta: { permission: 'users' }
            },
            {
                path: 'permissions',
                name: 'Permissions',
                component: PermissionsView,
                meta: { permission: 'manage_permissions' }
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
                meta: { permission: 'settings' }
            },
            {
                path: 'projects/:projectId/automation',
                name: 'AutomationRules',
                component: () => import('../views/AutomationRulesView.vue'),
                props: true,
                meta: { permission: 'settings' }
            },
            {
                path: 'projects/:projectId/bottleneck',
                name: 'BottleneckAnalysis',
                component: () => import('../views/BottleneckView.vue'),
                props: true,
                meta: { permission: 'reports' }
            },
            {
                path: 'projects/:projectId/releases',
                name: 'ProjectReleases',
                component: () => import('../views/ReleasesView.vue'),
                props: true,
                meta: { permission: 'reports' }
            },
            {
                path: 'plugins',
                name: 'PluginsAdmin',
                component: () => import('../views/PluginsAdminView.vue'),
                meta: { permission: 'settings' }
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
            // Fire permission denied event for UI feedback
            window.dispatchEvent(new CustomEvent('permission-denied', {
                detail: { message: 'ليس لديك صلاحية للوصول لهذه الصفحة' }
            }));
            // Find the first route the user CAN access
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
