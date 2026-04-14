<template>
  <Teleport to="body">
    <div v-if="show" class="celebration-root" @click="$emit('done')">
      <!-- Confetti particles -->
      <div v-for="n in 60" :key="n" class="confetti-piece" :style="confettiStyle(n)"></div>

      <!-- Center check card -->
      <div class="celebration-card">
        <div class="check-ring">
          <div class="check-icon">
            <svg viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="24" stroke="currentColor" stroke-width="3"/>
              <path d="M14 26 L22 34 L38 18" stroke="currentColor" stroke-width="3.5"
                    stroke-linecap="round" stroke-linejoin="round"
                    :style="{ strokeDasharray: 40, strokeDashoffset: animated ? 0 : 40 }" />
            </svg>
          </div>
        </div>
        <p class="celebration-text">{{ label }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  show: { type: Boolean, default: false },
  label: { type: String, default: '🎉 Task Done!' }
});

defineEmits(['done']);

const animated = ref(false);

watch(() => props.show, (val) => {
  if (val) {
    setTimeout(() => { animated.value = true; }, 60);
  } else {
    animated.value = false;
  }
});

const COLORS = ['var(--primary)','#00DDB3','#F048A5','#4A90F5','#FFD700','#FF6B35','#ffffff'];

function confettiStyle(n) {
  const seed = n * 137.508;
  const left  = (seed % 100).toFixed(1);
  const delay = ((seed * 0.07) % 1.6).toFixed(2);
  const dur   = (1.2 + (seed * 0.017) % 1.0).toFixed(2);
  const color = COLORS[n % COLORS.length];
  const size  = 6 + (n % 8);
  const rotate= (n * 47) % 360;
  const isRect = n % 3 !== 0;
  return {
    left: `${left}%`,
    top: '-10px',
    width: isRect ? `${size}px` : `${size - 2}px`,
    height: isRect ? `${Math.round(size * 0.5)}px` : `${size - 2}px`,
    borderRadius: isRect ? '2px' : '50%',
    background: color,
    animationDelay: `${delay}s`,
    animationDuration: `${dur}s`,
    transform: `rotate(${rotate}deg)`,
  };
}
</script>

<style scoped>
.celebration-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
  cursor: pointer;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(2px);
  animation: cel-bg-in 0.25s ease both;
}
@keyframes cel-bg-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Confetti */
.confetti-piece {
  position: fixed;
  will-change: transform, opacity;
  animation: confetti-fall linear forwards;
}
@keyframes confetti-fall {
  0%   { transform: translateY(-10px) rotate(0deg);    opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateY(105vh) rotate(720deg);  opacity: 0; }
}

/* Center card */
.celebration-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  animation: card-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  pointer-events: none;
}
@keyframes card-pop {
  from { transform: scale(0.5); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

.check-ring {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #00DDB3);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 18px rgba(0,221,179,0.15),
              0 0 0 36px rgba(0,221,179,0.06),
              0 0 60px rgba(0,221,179,0.4);
  animation: ring-pulse 0.7s ease 0.3s both;
}
@keyframes ring-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(0,221,179,0.6); }
  100% { box-shadow: 0 0 0 50px rgba(0,221,179,0); }
}

.check-icon {
  width: 60px;
  height: 60px;
  color: #fff;
}
.check-icon svg { width: 100%; height: 100%; }
.check-icon path {
  transition: stroke-dashoffset 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.3s;
}

.celebration-text {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  text-align: center;
  text-shadow: 0 2px 12px rgba(0,0,0,0.4);
  letter-spacing: 0.02em;
  animation: card-pop 0.4s ease 0.1s both;
  margin: 0;
}
</style>
