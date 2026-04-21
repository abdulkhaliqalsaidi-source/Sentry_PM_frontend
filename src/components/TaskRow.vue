<template>
    <div class="task-row-v" :class="{ 'is-selected': isSelected }">
        <div class="task-leading-v">
            <div class="drag-handle-v">
                <AnimatedIcon name="more-vertical" size="xs" />
            </div>
            <div class="task-type-badge-v" :class="task.issue_type?.toLowerCase()">
                <AnimatedIcon :name="getTaskIcon(task.issue_type)" size="xs" />
            </div>
            <div class="task-content-v">
                <span class="task-key-v">{{ task.project_name }}-{{ task.id }}</span>
                <span class="task-title-v">{{ task.title }}</span>
            </div>
        </div>

        <div class="task-trailing-v">
            <div v-if="task.epic_details" class="epic-pill-v" :style="{ '--epic-color': task.epic_details.color }">
                {{ task.epic_details.name }}
            </div>
            
            <div class="priority-pill-v" :class="task.priority?.toLowerCase()">
                <AnimatedIcon :name="getPriorityIcon(task.priority)" size="xs" />
                <span>{{ $t(`kanban.priorities.${task.priority?.toLowerCase()}`) }}</span>
            </div>

            <div class="assignee-wrap-v">
                <div v-if="task.assigned_to_name" class="avatar-v" :title="task.assigned_to_name">
                   {{ task.assigned_to_name[0].toUpperCase() }}
                </div>
                <div v-else class="avatar-v unassigned">
                    <AnimatedIcon name="user" size="xs" />
                </div>
            </div>

            <div class="status-pill-v" :class="task.status_details?.category.toLowerCase()">
                <span class="status-dot"></span>
                <span class="status-text-v">{{ task.status_details?.name }}</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import AnimatedIcon from './AnimatedIcon.vue';

const props = defineProps(['task', 'isSelected']);

const getTaskIcon = (type) => {
    switch(type) {
        case 'BUG': return 'bug';
        case 'STORY': return 'story';
        default: return 'task';
    }
};

const getPriorityIcon = (priority) => {
    switch(priority) {
        case 'URGENT': case 'HIGH': return 'priority-high';
        case 'LOW': return 'priority-low';
        default: return 'priority-medium';
    }
};
</script>

<style scoped>
.task-row-v {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-radius: 10px;
    background: var(--bg-hover);
    border: 1px solid transparent;
    transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    min-height: 48px;
}

.task-row-v:hover {
    background: var(--bg-hover);
    border-color: var(--border-color);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: 10;
}

.task-row-v.is-selected {
    background: var(--primary-bg);
    border-color: var(--primary);
}

.task-leading-v {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    min-width: 0;
}

.drag-handle-v {
    color: var(--text-muted);
    opacity: 0.3;
    transition: 0.3s;
    cursor: grab;
    display: flex;
}

.task-row-v:hover .drag-handle-v {
    opacity: 1;
    color: var(--primary);
}

.drag-handle-v :deep(.animated-icon) {
    pointer-events: none;
}

.task-type-badge-v {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-hover);
    transition: 0.3s;
}

.task-type-badge-v.bug { color: var(--danger); background: var(--danger-bg); }
.task-type-badge-v.story { color: var(--success); background: var(--success-bg); }

.task-content-v {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
    flex: 1;
}

.task-key-v {
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--text-muted);
    letter-spacing: 0.05em;
    min-width: 75px;
    flex-shrink: 0;
    opacity: 0.7;
}

.task-title-v {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.task-trailing-v {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-shrink: 0;
}

.epic-pill-v {
    padding: 4px 14px;
    border-radius: 50px;
    font-size: 0.65rem;
    font-weight: 900;
    color: var(--epic-color);
    background: color-mix(in srgb, var(--epic-color), transparent 90%);
    border: 1px solid color-mix(in srgb, var(--epic-color), transparent 80%);
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.priority-pill-v {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.priority-pill-v.urgent, .priority-pill-v.high { color: var(--danger); }
.priority-pill-v.medium { color: var(--warning); }
.priority-pill-v.low { color: var(--success); }

.avatar-v {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 900;
    border: 2px solid white;
    box-shadow: var(--shadow-sm);
}

.avatar-v.unassigned {
    background: var(--bg-hover);
    color: var(--text-muted);
    border: 1px dashed var(--border-color);
    box-shadow: none;
}

.status-pill-v {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px;
    border-radius: 12px;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-muted);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--text-muted), transparent 90%);
}

.status-pill-v.todo .status-dot { background: var(--text-muted); }
.status-pill-v.in_progress { background: var(--primary-bg); border-color: var(--primary); }
.status-pill-v.in_progress .status-dot { 
    background: var(--primary); 
    box-shadow: 0 0 10px var(--primary);
}
.status-pill-v.done { background: var(--success-bg); border-color: var(--success); }
.status-pill-v.done .status-dot { background: var(--success); }

.status-text-v {
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--text-main);
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

[dir="rtl"] .task-trailing-v {
    flex-direction: row;
}
</style>
