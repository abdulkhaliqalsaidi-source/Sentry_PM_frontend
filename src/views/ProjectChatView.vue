<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ProjectChat from '../components/ProjectChat.vue';

const route = useRoute();
const projectId = computed(() => route.params.projectId);
</script>

<template>
    <div class="chat-view-container">
        <ProjectChat :project-id="projectId" />
    </div>
</template>

<style scoped>
.chat-view-container {
    height: 100%;
    width: 100%;
    padding: 24px;
    background: var(--bg-main);
}

/* Make the internal component stretch fully */
:deep(.project-chat) {
    height: 100%;
    max-height: calc(100vh - 120px); /* Adjust based on navbar/padding */
}
</style>
