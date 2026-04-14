<template>
  <svg
    :class="['animated-icon', `icon-${name}`, animationClass, sizeClass]"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeW"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- DASHBOARD: House icon -->
    <template v-if="name === 'dashboard'">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </template>

    <!-- ISSUES / BUG: Target / bug icon -->
    <template v-else-if="name === 'issues' || name === 'bug'">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
    </template>

    <!-- PROJECTS / FOLDER: Grid layout icon -->
    <template v-else-if="name === 'projects' || name === 'folder'">
      <rect x="2" y="3" width="9" height="9" rx="2" />
      <rect x="13" y="3" width="9" height="9" rx="2" />
      <rect x="2" y="14" width="9" height="7" rx="2" />
      <rect x="13" y="14" width="9" height="7" rx="2" />
    </template>

    <!-- USERS: People icon -->
    <template v-else-if="name === 'users'">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </template>

    <!-- PERMISSIONS / SHIELD: Shield lock icon -->
    <template v-else-if="name === 'permissions' || name === 'shield'">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </template>

    <!-- SETTINGS: Gear icon -->
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </template>

    <!-- EVALUATIONS / STAR: Star icon -->
    <template v-else-if="name === 'evaluations' || name === 'star'">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </template>

    <!-- PERFORMANCE / BOLT: Lightning bolt -->
    <template v-else-if="name === 'performance' || name === 'bolt'">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </template>

    <!-- SUMMARY / CHART: Bar chart -->
    <template v-else-if="name === 'summary' || name === 'chart'">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </template>

    <!-- BOARD / KANBAN: Kanban columns -->
    <template v-else-if="name === 'board' || name === 'kanban'">
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="3" width="5" height="11" rx="1" />
      <rect x="17" y="3" width="5" height="15" rx="1" />
    </template>

    <!-- BACKLOG / LIST: Checklist -->
    <template v-else-if="name === 'backlog' || name === 'list'">
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <polyline points="4 6 5 7 7 5" />
      <polyline points="4 12 5 13 7 11" />
      <polyline points="4 18 5 19 7 17" />
    </template>

    <!-- REPORTS / TRENDING-UP -->
    <template v-else-if="name === 'reports' || name === 'trending-up'">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </template>

    <!-- CHAT / MESSAGE -->
    <template v-else-if="name === 'chat' || name === 'message'">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </template>

    <!-- DOCS / BOOK -->
    <template v-else-if="name === 'docs' || name === 'book'">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="12" y2="11" />
    </template>

    <!-- ARROW LEFT / BACK -->
    <template v-else-if="name === 'arrow-left' || name === 'back'">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </template>

    <!-- ARROW RIGHT -->
    <template v-else-if="name === 'arrow-right' || name === 'forward'">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </template>

    <!-- CHEVRONS -->
    <template v-else-if="name === 'chevron-down'">
      <polyline points="6 9 12 15 18 9" />
    </template>
    <template v-else-if="name === 'chevron-up'">
      <polyline points="18 15 12 9 6 15" />
    </template>
    <template v-else-if="name === 'chevron-left'">
      <polyline points="15 18 9 12 15 6" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <polyline points="9 18 15 12 9 6" />
    </template>

    <!-- SEARCH -->
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </template>

    <!-- LANGUAGE / GLOBE -->
    <template v-else-if="name === 'language' || name === 'globe'">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </template>

    <!-- CALENDAR -->
    <template v-else-if="name === 'calendar'">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </template>

    <!-- HASH / NUMBER -->
    <template v-else-if="name === 'hash' || name === 'number'">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </template>

    <!-- THEME: SUN -->
    <template v-else-if="name === 'theme-sun' || name === 'sun'">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </template>

    <!-- THEME: MOON -->
    <template v-else-if="name === 'theme-moon' || name === 'moon'">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </template>

    <!-- THEME: SYSTEM -->
    <template v-else-if="name === 'theme-system' || name === 'circle-half-stroke'">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v20c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="currentColor" />
    </template>

    <!-- BELL / NOTIFICATIONS -->
    <template v-else-if="name === 'bell' || name === 'notifications'">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </template>

    <!-- BELL SLASH -->
    <template v-else-if="name === 'bell-slash'">
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
      <path d="M18 8a6 6 0 0 0-9.33-5" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </template>

    <!-- LOGOUT -->
    <template v-else-if="name === 'logout'">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </template>

    <!-- REFRESH -->
    <template v-else-if="name === 'refresh'">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </template>

    <!-- CHECK -->
    <template v-else-if="name === 'check'">
      <polyline points="20 6 9 17 4 12" />
    </template>

    <!-- SUCCESS / CHECK CIRCLE -->
    <template v-else-if="name === 'success' || name === 'check-circle'">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </template>

    <!-- ERROR / X CIRCLE -->
    <template v-else-if="name === 'error' || name === 'x-circle'">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </template>

    <!-- CLOSE / X -->
    <template v-else-if="name === 'close' || name === 'x'">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </template>

    <!-- COPY -->
    <template v-else-if="name === 'copy'">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </template>

    <!-- TRASH / DELETE -->
    <template v-else-if="name === 'trash' || name === 'delete'">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </template>

    <!-- EDIT / PENCIL -->
    <template v-else-if="name === 'edit' || name === 'pencil'">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </template>

    <!-- PLUS -->
    <template v-else-if="name === 'plus'">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </template>

    <!-- MORE VERTICAL / HORIZONTAL -->
    <template v-else-if="name === 'more-vertical'">
      <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'more-horizontal'">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </template>

    <!-- PLAY -->
    <template v-else-if="name === 'play'">
      <polygon points="5 3 19 12 5 21 5 3" />
    </template>

    <!-- EYE -->
    <template v-else-if="name === 'eye'">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </template>

    <!-- EYE OFF -->
    <template v-else-if="name === 'eye-off'">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </template>

    <!-- USER -->
    <template v-else-if="name === 'user'">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </template>

    <!-- RELEASES / TAG -->
    <template v-else-if="name === 'releases' || name === 'tag'">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </template>

    <!-- AUTOMATION / ZAP -->
    <template v-else-if="name === 'automation' || name === 'zap'">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </template>

    <!-- CUSTOM FIELDS / SLIDERS -->
    <template v-else-if="name === 'custom-fields' || name === 'sliders'">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </template>

    <!-- PLUGINS / PUZZLE -->
    <template v-else-if="name === 'plugins' || name === 'puzzle'">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
      <line x1="17.5" y1="15" x2="9" y2="15" />
    </template>

    <!-- BOTTLENECK / FILTER-X -->
    <template v-else-if="name === 'bottleneck'">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      <line x1="18" y1="18" x2="22" y2="22" />
      <line x1="22" y1="18" x2="18" y2="22" />
    </template>

    <!-- DEFAULT: Question Mark -->
    <template v-else>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </template>
  </svg>
</template>

<script>
export default {
  name: 'AnimatedIcon',
  props: {
    name: {
      type: String,
      required: true,
      default: 'question'
    },
    animation: {
      type: String,
      default: ''
    },
    trigger: {
      type: String,
      default: 'hover'
    },
    // Sizes: 'xs', 'sm', 'md', 'lg', 'xl'
    size: {
      type: String,
      default: 'md'
    }
  },
  computed: {
    animationClass() {
      if (!this.animation) {
        if (['settings', 'refresh'].includes(this.name)) return `anim-rotate trigger-${this.trigger}`;
        if (['bell', 'notifications'].includes(this.name)) return `anim-shake trigger-${this.trigger}`;
        if (['issues', 'bug', 'error'].includes(this.name)) return `anim-pulse trigger-${this.trigger}`;
        if (['success', 'check'].includes(this.name)) return `anim-draw trigger-${this.trigger}`;
        if (['trash', 'delete'].includes(this.name)) return `anim-shake trigger-${this.trigger}`;
        return `anim-bounce trigger-${this.trigger}`;
      }
      return `anim-${this.animation} trigger-${this.trigger}`;
    },
    sizeClass() {
      return `icon-${this.size}`;
    },
    strokeW() {
      const map = { xs: 2.5, sm: 2.5, md: 2.2, lg: 2, xl: 1.8 };
      return map[this.size] || 2.2;
    }
  }
}
</script>

<style scoped>
.animated-icon {
  display: block;
  flex: 0 0 auto;
  aspect-ratio: 1 / 1;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.25s ease;
}

/* Sizes */
.icon-xs { width: 16px; height: 16px; }
.icon-sm { width: 20px; height: 20px; }
.icon-md { width: 24px; height: 24px; }
.icon-lg { width: 28px; height: 28px; }
.icon-xl { width: 40px; height: 40px; }

/* ── Bounce (default nav hover) */
.animated-icon.anim-bounce.trigger-hover:hover,
.parent-hover:hover .animated-icon.anim-bounce.trigger-hover {
  transform: translateY(-3px) scale(1.1);
}

/* ── Rotate (settings, refresh) */
.animated-icon.anim-rotate.trigger-hover:hover,
.parent-hover:hover .animated-icon.anim-rotate.trigger-hover {
  transform: rotate(90deg) scale(1.05);
}

/* ── Pulse (bell, bug) */
.animated-icon.anim-pulse.trigger-hover:hover,
.parent-hover:hover .animated-icon.anim-pulse.trigger-hover {
  animation: svgPulse 0.6s cubic-bezier(0.4, 0, 0.6, 1) both;
}
@keyframes svgPulse {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.2); }
  60%  { transform: scale(0.95); }
  100% { transform: scale(1); }
}

/* ── Shake (trash, bell) */
.animated-icon.anim-shake.trigger-hover:hover,
.parent-hover:hover .animated-icon.anim-shake.trigger-hover {
  animation: svgShake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes svgShake {
  10%, 90%   { transform: translate3d(-1px, 0, 0); }
  20%, 80%   { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
  40%, 60%   { transform: translate3d(3px, 0, 0); }
}

/* ── Spin (loading state) */
.animated-icon.anim-rotate.trigger-infinite {
  animation: svgSpin 1.5s linear infinite;
}
@keyframes svgSpin { 100% { transform: rotate(360deg); } }

/* ── Draw (success/check) */
.animated-icon.anim-draw.trigger-hover:hover,
.parent-hover:hover .animated-icon.anim-draw.trigger-hover {
  stroke-dasharray: 200;
  stroke-dashoffset: 0;
  animation: svgDraw 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
@keyframes svgDraw {
  from { stroke-dashoffset: 200; }
  to   { stroke-dashoffset: 0; }
}
</style>
