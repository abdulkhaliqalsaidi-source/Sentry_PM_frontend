<template>
  <div class="state-loader" :style="{ width, height }">
    <div class="loader-ring">
      <div class="loader-orbit"></div>
      <div class="loader-orbit delay-1"></div>
      <div class="loader-orbit delay-2"></div>
      <div class="loader-core"></div>
    </div>
    <span v-if="label" class="loader-label">{{ label }}</span>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  width: { type: String, default: '120px' },
  height: { type: String, default: '120px' }
});
</script>

<style scoped>
.state-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  animation: fade-in 0.3s ease;
}

.loader-ring {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loader-orbit {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 4px solid transparent;
  border-top-color: #00DDB3;
  border-right-color: var(--primary-bg);
  animation: spin 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
  box-shadow: 0 0 12px rgba(0, 221, 179, 0.2);
}

.loader-orbit.delay-1 {
  inset: 6px;
  border-top-color: var(--primary);
  border-right-color: rgba(0, 221, 179, 0.3);
  animation-duration: 1.5s;
  animation-direction: reverse;
  box-shadow: 0 0 12px var(--primary-bg);
}

.loader-orbit.delay-2 {
  inset: 12px;
  border-top-color: #F048A5;
  border-right-color: rgba(240, 72, 165, 0.3);
  animation-duration: 1.8s;
  box-shadow: 0 0 12px rgba(240, 72, 165, 0.2);
}

.loader-core {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 20px #00DDB3, 0 0 40px var(--primary);
  animation: pulse 1s ease-in-out infinite alternate;
}

.loader-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  background: linear-gradient(90deg, var(--primary), #00DDB3, var(--primary));
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 30px #00DDB3, 0 0 60px var(--primary); }
}

@keyframes shimmer {
  to { background-position: 200% center; }
}
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
