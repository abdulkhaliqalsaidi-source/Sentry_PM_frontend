<script>
import ProjectList from '../components/ProjectList.vue'

export default {
    name: 'ProjectsView',
    props: ['permissions'],
    components: {
        ProjectList
    },
    methods: {
        selectPmProject(projectId) {
            // Navigate to Kanban board via router
            this.$router.push(`/projects/${projectId}`);
        },
        selectPmProjectFull(project) {
             this.$router.push(`/projects/${project.id}`);
        }
    }
}
</script>

<template>
    <div class="projects-wrapper">
        <ProjectList :permissions="permissions" @select-project="selectPmProject" @select-project-full="selectPmProjectFull" />
    </div>
</template>

<style scoped>
.projects-wrapper {
    height: 100%;
}
</style>
