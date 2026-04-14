<template>
  <slot v-if="allowed" />
  <div v-else-if="showFallback" class="perm-denied">
    <i class="fa-solid fa-lock"></i>
    <p>{{ message || 'ليس لديك صلاحية للوصول لهذا القسم' }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { usePermissions } from '@/composables/usePermissions';

const props = defineProps({
  perm: { type: String, required: true },
  showFallback: { type: Boolean, default: false },
  message: { type: String, default: '' }
});

const { can } = usePermissions();
const allowed = computed(() => can(props.perm));
</script>

<style scoped>
.perm-denied {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 60px 20px; color: var(--text-muted); text-align: center;
}
.perm-denied i { font-size: 2.5rem; opacity: 0.3; }
.perm-denied p { font-size: 0.9rem; font-weight: 600; margin: 0; }
</style>
