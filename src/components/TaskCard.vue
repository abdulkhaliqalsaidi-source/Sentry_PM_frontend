<template>
  <div class="task-card-premium" :class="{ 'is-dragging': isDragging }" @click="$emit('click')">
    <div class="card-glint"></div>
    
    <div class="task-header-v">
      <div class="h-left">
        <div class="type-pod" :class="task.issue_type.toLowerCase()">
          <i v-if="task.issue_type === 'BUG'" class="fa-solid fa-circle-exclamation"></i>
          <i v-else-if="task.issue_type === 'STORY'" class="fa-solid fa-bookmark"></i>
          <i v-else class="fa-solid fa-square-check"></i>
        </div>
        <span class="task-id-v">#{{ task.id }}</span>
      </div>
      <div class="h-right">
        <div class="drag-handle-v" :title="$t('kanban.drag_to_move')">
            <i class="fa-solid fa-grip-vertical"></i>
        </div>
      </div>
    </div>

    <div class="task-content">
      <h4 class="task-title-v">{{ task.title }}</h4>
      
      <div v-if="task.start_date || task.end_date" class="task-meta-row">
          <div class="meta-pill date">
            <i class="fa-regular fa-calendar-days"></i>
            <span>{{ formatDateShort(task.start_date) }} - {{ formatDateShort(task.end_date) }}</span>
          </div>
      </div>

      <div class="badges-row-v" v-if="(task.epic_details) || (task.labels_details && task.labels_details.length)">
        <div v-if="task.epic_details" class="epic-tag" :style="{ '--e-color': task.epic_details.color }">
            {{ task.epic_details.name }}
        </div>
        <div class="labels-h-list" v-if="task.labels_details && task.labels_details.length">
            <span v-for="label in task.labels_details" :key="label.id" class="label-dot" :style="{ '--l-color': label.color }" :title="label.name">
            </span>
        </div>
      </div>
    </div>

    <div class="task-footer-v">
      <div class="f-left">
        <div class="priority-pod" :class="task.priority.toLowerCase()" :title="priorityName">
           <i :class="'fa-solid ' + priorityIcon"></i>
        </div>
        <div class="indicators-h">
            <div v-if="task.comments_count > 0" class="ind-item" :title="$t('kanban.comments')">
                <i class="fa-regular fa-comment"></i>
                <span>{{ task.comments_count }}</span>
            </div>
            <div class="ind-item time" :title="$t('kanban.time_spent')">
                <i class="fa-solid fa-hourglass-half"></i>
                <span>{{ task.time_spent || 0 }}h</span>
            </div>
            <div v-if="task.incoming_links && task.incoming_links.some(l => l.type === 'BLOCKS')" class="ind-item blocked" :title="$t('kanban.blocked')">
                <i class="fa-solid fa-ban"></i>
            </div>
        </div>
      </div>

      <div class="f-right">
        <span v-if="task.story_points" class="sp-pill">{{ task.story_points }}</span>
        <div class="assignees-orbit" v-if="task.assignee_names && task.assignee_names.length">
          <div v-for="name in task.assignee_names.slice(0, 3)" :key="name" class="member-av" :title="name">
            {{ name.charAt(0).toUpperCase() }}
          </div>
          <div v-if="task.assignee_names.length > 3" class="member-av plus">+{{ task.assignee_names.length - 3 }}</div>
        </div>
        <div class="member-av unassigned" v-else :title="$t('common.unassigned')">
            <i class="fa-solid fa-user-plus"></i>
        </div>
      </div>
    </div>

    <!-- Error Action HUD -->
    <div class="error-action-hud" v-if="task.sentry_error_id" @click.stop="$emit('view-error', task.sentry_error_id)">
        <i class="fa-solid fa-bug"></i>
        <span>{{ $t('kanban.view_error_event') }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  isDragging: {
    type: Boolean,
    default: false
  },
  userRole: {
    type: String,
    default: 'VIEWER'
  }
});

const emits = defineEmits(['view-error']);

const priorityColor = computed(() => {
  switch (props.task.priority) {
    case 'URGENT': case 'HIGH': return 'var(--danger)'; 
    case 'MEDIUM': return 'var(--warning)'; 
    case 'LOW': return 'var(--success)'; 
    default: return 'var(--n100)';
  }
});

const priorityIcon = computed(() => {
  switch (props.task.priority) {
    case 'URGENT': case 'HIGH': return 'fa-angles-up'; 
    case 'LOW': return 'fa-angles-down'; 
    default: return 'fa-grip-lines';
  }
});

const priorityName = computed(() => {
  switch (props.task.priority) {
    case 'URGENT': return t('kanban.priorities.urgent');
    case 'CRITICAL': return t('kanban.priorities.critical');
    case 'HIGH': return t('kanban.priorities.high');
    case 'LOW': return t('kanban.priorities.low');
    default: return t('kanban.priorities.medium');
  }
});

const formatDateShort = (dateString) => {
    if (!dateString) return '...';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '...';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
</script>

<style scoped>
.task-card-premium {
  padding: 20px; background: var(--bg-card); 
  border: 1px solid var(--border-color); border-radius: 24px;
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 15px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer;
  box-shadow: var(--shadow-sm); z-index: 1;
}
.task-card-premium:hover { transform: translateY(-5px) scale(1.02); border-color: var(--primary-glow); box-shadow: var(--shadow-lg); }
.task-card-premium.is-dragging { opacity: 0.4; transform: rotate(2deg) scale(0.95); box-shadow: var(--shadow-2xl); cursor: grabbing; }

.card-glint { position: absolute; inset: 0; background: linear-gradient(135deg, transparent 45%, rgba(255,255,255,0.05) 50%, transparent 55%); transform: translateX(-100%); transition: transform 0.6s ease; pointer-events: none; }
.task-card-premium:hover .card-glint { transform: translateX(100%); }

.task-header-v { display: flex; justify-content: space-between; align-items: center; }
.h-left { display: flex; align-items: center; gap: 10px; }
.type-pod { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; background: var(--bg-hover); border: 1px solid var(--border-color); }
.type-pod.bug { color: var(--ds-red); border-color: rgba(244, 63, 94, 0.2); }
.type-pod.story { color: var(--ds-green); border-color: rgba(16, 185, 129, 0.2); }
.type-pod.task { color: var(--primary); border-color: var(--primary-glow); }

.task-id-v { font-family: monospace; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); opacity: 0.6; }

.drag-handle-v { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); opacity: 0; transition: 0.2s; cursor: grab; }
.task-card-premium:hover .drag-handle-v { opacity: 0.4; }
.drag-handle-v:hover { opacity: 1 !important; color: var(--primary); }

.task-title-v { margin: 0; font-size: 1.05rem; font-weight: 750; color: var(--text-main); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.task-meta-row { display: flex; flex-wrap: wrap; gap: 8px; }
.meta-pill { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 750; background: var(--bg-hover); color: var(--text-muted); border: 1px solid var(--border-color); }
.meta-pill.date i { font-size: 0.7rem; color: var(--primary); }

.badges-row-v { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.epic-tag { font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 6px; background: color-mix(in srgb, var(--e-color), transparent 90%); color: var(--e-color); border: 1px solid color-mix(in srgb, var(--e-color), transparent 80%); }
.labels-h-list { display: flex; gap: 5px; }
.label-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--l-color); box-shadow: 0 0 6px var(--l-color); }

.task-footer-v { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 15px; border-top: 1px dashed var(--border-color); }
.f-left { display: flex; align-items: center; gap: 15px; }
.priority-pod { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; background: var(--bg-hover); border: 1px solid var(--border-color); }
.priority-pod.urgent, .priority-pod.high { color: var(--ds-red); border-color: rgba(244, 63, 94, 0.2); }
.priority-pod.medium { color: var(--ds-yellow); border-color: rgba(245, 158, 11, 0.2); }
.priority-pod.low { color: var(--ds-green); border-color: rgba(16, 185, 129, 0.2); }

.indicators-h { display: flex; gap: 10px; }
.ind-item { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); }
.ind-item i { font-size: 0.8rem; }
.ind-item.blocked { color: var(--ds-red); }

.f-right { display: flex; align-items: center; gap: 10px; }
.sp-pill { padding: 2px 8px; border-radius: 100px; background: var(--primary-bg); color: var(--primary); font-size: 0.7rem; font-weight: 900; font-family: monospace; border: 1px solid var(--primary-glow); }

.assignees-orbit { display: flex; flex-direction: row-reverse; }
.member-av { 
  width: 28px; height: 28px; border-radius: 10px; background: linear-gradient(135deg, var(--primary), var(--indigo-800));
  color: white; font-size: 0.75rem; font-weight: 900; display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--bg-card); margin-left: -10px; transition: transform 0.2s;
}
.member-av:hover { transform: translateY(-5px) scale(1.1); z-index: 5; }
.member-av.unassigned { background: var(--bg-hover); color: var(--text-muted); border-style: dashed; margin-left: 0; }
.member-av.plus { background: var(--bg-hover); color: var(--text-main); font-size: 0.65rem; }

.error-action-hud { 
    margin-top: 5px; padding: 10px; border-radius: 12px; background: rgba(244, 63, 94, 0.08); 
    border: 1px solid rgba(244, 63, 94, 0.15); display: flex; align-items: center; justify-content: center; gap: 10px;
    color: var(--ds-red); font-size: 0.75rem; font-weight: 900; transition: 0.2s;
}
.error-action-hud:hover { background: var(--ds-red); color: white; border-color: var(--ds-red); transform: scale(1.02); }

[dir="rtl"] .member-av { margin-left: 0; margin-right: -10px; }
[dir="rtl"] .drag-handle-v { transform: rotate(180deg); }
</style>
