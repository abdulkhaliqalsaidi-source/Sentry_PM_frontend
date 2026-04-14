<template>
  <div class="state-empty" :style="{ width, height }">
    <div class="empty-icon-container">
      <div class="empty-glow"></div>
      <!-- SVG Box Icon -->
      <svg class="empty-svg pulse-anim" viewBox="0 0 64 64" fill="none">
        <path d="M32 12L12 22V42L32 52L52 42V22L32 12Z" stroke="var(--primary)" stroke-width="3" stroke-linejoin="round"/>
        <path d="M32 12L32 32M12 22L32 32M52 22L32 32" stroke="#00DDB3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="float-dot dot-1" d="M16 14 A2 2 0 1 1 16 10 A2 2 0 1 1 16 14 Z" fill="#F048A5" />
        <path class="float-dot dot-2" d="M48 54 A2 2 0 1 1 48 50 A2 2 0 1 1 48 54 Z" fill="#4A90F5" />
      </svg>
    </div>
  </div>
</template>

<script setup>
defineProps({
  width: { type: String, default: '140px' },
  height: { type: String, default: '140px' }
});
</script>

<style scoped>
.state-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  animation: fade-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.empty-icon-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-glow {
  position: absolute;
  width: 60%;
  height: 60%;
  background: radial-gradient(circle, var(--primary-bg) 0%, rgba(0, 221, 179, 0) 70%);
  animation: breathe 3s ease-in-out infinite alternate;
}

.empty-svg {
  width: 70%;
  height: 70%;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 8px 16px var(--primary-bg));
}

.pulse-anim {
  animation: float-box 4s ease-in-out infinite;
}

.float-dot {
  animation: float-dot 3s ease-in-out infinite alternate;
  transform-origin: center;
}
.dot-2 {
  animation-delay: -1.5s;
  animation-duration: 4s;
}

@keyframes float-box {
  0%   { transform: translateY(0); }
  50%  { transform: translateY(-8px); filter: drop-shadow(0 14px 24px rgba(0, 221, 179, 0.3)); }
  100% { transform: translateY(0); }
}

@keyframes breathe {
  0%   { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.4); opacity: 1; }
}

@keyframes float-dot {
  0%   { transform: translateY(0) scale(1); }
  100% { transform: translateY(-15px) scale(1.4); }
}

@keyframes fade-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
