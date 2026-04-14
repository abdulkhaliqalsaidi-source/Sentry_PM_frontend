/**
 * usePermissions - central permissions composable.
 * Reads from localStorage and provides reactive helpers.
 */
import { computed } from 'vue';

const getPerms = () => {
  try {
    return JSON.parse(localStorage.getItem('user_permissions') || '{}');
  } catch {
    return {};
  }
};

export function usePermissions() {
  const isSuperuser = computed(() => localStorage.getItem('isSuperuser') === 'true');

  const can = (perm) => {
    if (isSuperuser.value) return true;
    return !!getPerms()[perm];
  };

  // ── Screens ────────────────────────────────────────────────────
  const canViewDashboard     = computed(() => can('dashboard'));
  const canViewIssues        = computed(() => can('issues'));
  const canViewUsers         = computed(() => can('users'));
  const canViewSettings      = computed(() => can('settings'));
  const canViewBacklog       = computed(() => can('backlog'));
  const canViewReports       = computed(() => can('reports'));
  const canViewMembers       = computed(() => can('members'));
  const canViewChat          = computed(() => can('chat'));
  const canViewDocs          = computed(() => can('docs'));
  const canViewEvaluations   = computed(() => can('evaluations'));
  const canViewPerformance   = computed(() => can('performance'));
  const canViewNotifications = computed(() => can('notifications'));
  const canManagePermissions = computed(() => can('manage_permissions'));

  // ── Issues ─────────────────────────────────────────────────────
  const canDeleteIssues      = computed(() => can('can_delete_issues'));

  // ── Projects ───────────────────────────────────────────────────
  const canCreateProject     = computed(() => can('can_create_project'));
  const canEditProject       = computed(() => can('can_edit_project'));
  const canDeleteProject     = computed(() => can('can_delete_project'));
  const canViewUserProjects  = computed(() => can('can_view_user_projects'));

  // ── Tasks ──────────────────────────────────────────────────────
  const canCreateTask        = computed(() => can('can_create_task'));
  const canEditTask          = computed(() => can('can_edit_task'));
  const canDeleteTask        = computed(() => can('can_delete_task'));

  // ── Members ────────────────────────────────────────────────────
  const canManageMembers     = computed(() => can('can_manage_members'));

  // ── Docs ───────────────────────────────────────────────────────
  const canCreateDoc         = computed(() => can('can_create_doc'));
  const canEditDoc           = computed(() => can('can_edit_doc'));
  const canDeleteDoc         = computed(() => can('can_delete_doc'));

  // ── Releases ───────────────────────────────────────────────────
  const canManageReleases    = computed(() => can('can_manage_releases'));

  // ── Evaluations ────────────────────────────────────────────────
  const canManageEvaluations = computed(() => can('can_manage_evaluations'));

  // ── Sprints & Epics ────────────────────────────────────────────
  const canManageSprints     = computed(() => can('can_manage_sprints'));
  const canManageEpics       = computed(() => can('can_manage_epics'));

  return {
    isSuperuser, can,
    canViewDashboard, canViewIssues, canViewUsers, canViewSettings,
    canViewBacklog, canViewReports, canViewMembers, canViewChat,
    canViewDocs, canViewEvaluations, canViewPerformance,
    canViewNotifications, canManagePermissions,
    canDeleteIssues,
    canCreateProject, canEditProject, canDeleteProject, canViewUserProjects,
    canCreateTask, canEditTask, canDeleteTask,
    canManageMembers,
    canCreateDoc, canEditDoc, canDeleteDoc,
    canManageReleases,
    canManageEvaluations,
    canManageSprints, canManageEpics,
  };
}
