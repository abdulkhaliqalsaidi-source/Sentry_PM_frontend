<template>
  <div class="auth-page">
    <!-- Language Switcher -->
    <button class="lang-switcher-btn parent-hover" @click="toggleLanguage" :title="$t('common.language') || 'Switch Language'">
      <AnimatedIcon name="language" />
      <span class="lang-label">{{ currentLang.toUpperCase() }}</span>
    </button>

    <!-- Canvas: geometric particles + grid -->
    <canvas ref="particleCanvas" class="particles-canvas"></canvas>

    <div class="auth-split">
      <!-- LEFT: Brand Panel with concept image background -->
      <div class="auth-brand-panel">
        <!-- Grid mesh at bottom -->
        <div class="grid-mesh"></div>

        <div class="brand-content">
          <div class="brand-logo-wrap">
            <div class="brand-logo">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 48px; height: 48px;">
                <path d="M4 4L10 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                <path d="M20 4L14 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                <path d="M4 20L10 14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                <path d="M20 20L14 14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                <path d="M12 20V15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                <path d="M12 8L16 12L12 16L8 12L12 8Z" fill="white"/>
                <path d="M12 7L17 12L12 17L7 12L12 7Z" stroke="white" stroke-width="1.5" stroke-linejoin="round" stroke-opacity="0.8"/>
              </svg>
            </div>
            <div class="brand-pulse"></div>
          </div>
          <h1 class="brand-name">Omnia</h1>
          <p class="brand-tagline">{{ $t('auth.brand_tagline') }}</p>

          <div class="brand-features">
            <div class="feat-item">
              <i class="fa-solid fa-bug-slash"></i>
              <span>{{ $t('auth.feat_error_tracking') }}</span>
            </div>
            <div class="feat-item">
              <i class="fa-solid fa-chart-line"></i>
              <span>{{ $t('auth.feat_performance') }}</span>
            </div>
            <div class="feat-item">
              <i class="fa-solid fa-users"></i>
              <span>{{ $t('auth.feat_collaboration') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Form Panel -->
      <div class="auth-form-panel">
        <div class="form-panel-inner">
          <transition name="auth-slide" mode="out-in">
            <Login
              v-if="!isFlipped"
              key="login"
              @flip="isFlipped = true"
              @login-success="handleLoginSuccess"
            />
            <Signup
              v-else
              key="signup"
              @flip="isFlipped = false"
            />
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Login from './Login.vue';
import Signup from './Signup.vue';
import AnimatedIcon from './AnimatedIcon.vue';

export default {
  name: 'AuthView',
  components: { Login, Signup, AnimatedIcon },
  data() {
    return { isFlipped: false };
  },
  computed: {
    currentLang() {
      return this.$i18n.locale;
    }
  },
  mounted() {
    this.initParticles();
  },
  beforeUnmount() {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    if (this._resizeObs) this._resizeObs.disconnect();
  },
  methods: {
    handleLoginSuccess() { this.$router.push('/'); },

    toggleLanguage() {
      const nextLang = this.currentLang === 'en' ? 'ar' : 'en';
      this.$i18n.locale = nextLang;
      localStorage.setItem('user_language', nextLang);
      
      // Update direction and lang attributes
      const dir = nextLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.dir = dir;
      document.documentElement.lang = nextLang;
    },

    initParticles() {
      const canvas = this.$refs.particleCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      const resize = () => {
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      };
      this._resizeObs = new ResizeObserver(resize);
      this._resizeObs.observe(canvas);
      resize();

      const getThemeColor = (varName, fallback) => {
        const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        return val || fallback;
      };

      const primaryColor = getThemeColor('--primary', '#8b5cf6');
      const primaryBgColor = getThemeColor('--primary-bg', 'rgba(124,58,237,0.1)');

      // ── Geometric shapes (triangles, cubes, orbs) ──
      const shapes = Array.from({ length: 26 }, (_, i) => {
        const types = ['triangle', 'diamond', 'circle', 'square'];
        return {
          type:  types[i % types.length],
          x:     Math.random(),
          y:     Math.random(),
          size:  Math.random() * 22 + 8,
          vx:    (Math.random() - 0.5) * 0.00015,
          vy:    (Math.random() - 0.5) * 0.00015,
          rot:   Math.random() * Math.PI * 2,
          vrot:  (Math.random() - 0.5) * 0.005,
          alpha: Math.random() * 0.35 + 0.1,
          color: ['#a78bfa', primaryColor, '#c4b5fd', '#7dd3fc', '#e0e7ff'][Math.floor(Math.random()*5)],
        };
      });

      // ── Glowing orbs (large background blobs) ──
      const orbs = [
        { x: 0.25, y: 0.3,  r: 0.22, color: primaryBgColor },
        { x: 0.75, y: 0.7,  r: 0.18, color: 'rgba(139,92,246,0.15)' },
        { x: 0.5,  y: 0.85, r: 0.14, color: 'rgba(167,139,250,0.12)' },
      ];

      const draw = () => {
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Draw glowing orbs
        orbs.forEach(o => {
          const grd = ctx.createRadialGradient(o.x*w, o.y*h, 0, o.x*w, o.y*h, o.r*w);
          grd.addColorStop(0, o.color);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(o.x*w, o.y*h, o.r*w, 0, Math.PI*2);
          ctx.fill();
        });

        // Draw & move geometric shapes
        shapes.forEach(s => {
          s.x   += s.vx;  s.y   += s.vy; s.rot += s.vrot;
          if (s.x < 0) s.x = 1; if (s.x > 1) s.x = 0;
          if (s.y < 0) s.y = 1; if (s.y > 1) s.y = 0;

          const sx = s.x * w, sy = s.y * h;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(s.rot);
          ctx.globalAlpha = s.alpha;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 1.5;

          switch (s.type) {
            case 'triangle': {
              const r = s.size;
              ctx.beginPath();
              ctx.moveTo(0, -r);
              ctx.lineTo(r * 0.866, r * 0.5);
              ctx.lineTo(-r * 0.866, r * 0.5);
              ctx.closePath();
              ctx.stroke();
              break;
            }
            case 'diamond': {
              const r = s.size * 0.9;
              ctx.beginPath();
              ctx.moveTo(0, -r); ctx.lineTo(r * 0.6, 0);
              ctx.lineTo(0, r);  ctx.lineTo(-r * 0.6, 0);
              ctx.closePath();
              ctx.stroke();
              break;
            }
            case 'square': {
              const r = s.size * 0.7;
              ctx.strokeRect(-r, -r, r*2, r*2);
              break;
            }
            case 'circle': {
              // Filled glowing orb
              ctx.fillStyle = s.color;
              ctx.beginPath();
              ctx.arc(0, 0, s.size * 0.5, 0, Math.PI*2);
              ctx.fill();
              break;
            }
          }

          ctx.restore();
          ctx.globalAlpha = 1;
        });

        this._animFrame = requestAnimationFrame(draw);
      };

      draw();
    },
  },
};
</script>

<style scoped>
.auth-page {
  position: fixed;
  inset: 0;
  display: flex;
  background: var(--bg-card);
  overflow: hidden;
}

.particles-canvas {
  position: absolute;
  top: 0; left: 0;
  width: 50%; height: 100%;
  z-index: 2;
  pointer-events: none;
}

/* ── Split Layout ── */
.auth-split {
  display: flex;
  width: 100%; height: 100%;
  position: relative;
  z-index: 2;
}

/* ── Left: Brand Panel ── */
.auth-brand-panel {
  flex: 0 0 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  position: relative;
  overflow: hidden;
  /* Deep purple gradient matching the concept image */
  background:
    radial-gradient(ellipse at 30% 20%, rgba(120,80,255,0.55) 0%, transparent 55%),
    radial-gradient(ellipse at 75% 80%, rgba(80,40,200,0.45) 0%, transparent 55%),
    radial-gradient(ellipse at 10% 80%, rgba(60,20,160,0.35) 0%, transparent 55%),
    linear-gradient(145deg, #12006b 0%, #1e0a8c 25%, #2d0e8e 50%, #1a054e 75%, #0e0030 100%);
}

/* Grid mesh overlay (bottom of concept image) */
.grid-mesh {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 45%;
  background-image:
    linear-gradient(rgba(140,100,255,0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(140,100,255,0.18) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
  -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
  z-index: 1;
}

/* Inner glow top-right */
.auth-brand-panel::before {
  content: '';
  position: absolute;
  top: -80px; right: -80px;
  width: 380px; height: 380px;
  background: radial-gradient(circle, rgba(180,120,255,0.25) 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

/* Inner glow bottom-left */
.auth-brand-panel::after {
  content: '';
  position: absolute;
  bottom: -60px; left: -60px;
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(80,40,220,0.3) 0%, transparent 70%);
  pointer-events: none;
  z-index: 1;
}

/* Glassmorphism card around brand content */
.brand-content {
  text-align: center;
  color: white;
  z-index: 3;
  position: relative;
  padding: 44px 36px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 28px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 30px 60px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.06);
  animation: brandFadeIn 0.9s cubic-bezier(0.16,1,0.3,1) both;
}

@keyframes brandFadeIn {
  from { opacity: 0; transform: translateY(40px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.brand-logo-wrap {
  position: relative;
  width: 90px; height: 90px;
  margin: 0 auto 28px;
}

.brand-logo {
  width: 90px; height: 90px;
  background: linear-gradient(135deg, #FF3366, var(--primary));
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  color: white;
  box-shadow: 0 0 0 0 rgba(255, 51, 102, 0.5), 0 20px 50px var(--primary-bg);
  position: relative;
  z-index: 2;
  animation: logoPulse 3s ease-in-out infinite alternate;
}

@keyframes logoPulse {
  from { box-shadow: 0 20px 50px var(--primary-bg), 0 0 0 0 rgba(124,58,237,0.3); }
  to   { box-shadow: 0 20px 60px var(--primary-bg), 0 0 0 20px rgba(124,58,237,0); }
}

.brand-pulse {
  position: absolute;
  inset: -10px;
  border-radius: 34px;
  border: 2px solid rgba(167,139,250,0.4);
  animation: pulseRing 2.5s ease-out infinite;
  z-index: 1;
}

@keyframes pulseRing {
  0%   { transform: scale(1);    opacity: 0.7; }
  100% { transform: scale(1.4);  opacity: 0; }
}

.brand-name {
  font-size: 2.8rem;
  font-weight: 900;
  letter-spacing: -1px;
  margin: 0 0 10px;
  background: linear-gradient(to right, #e9d5ff, #c4b5fd, #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-tagline {
  font-size: 1rem;
  color: rgba(255,255,255,0.55);
  margin-bottom: 36px;
  letter-spacing: 0.02em;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.feat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  color: rgba(255,255,255,0.82);
  font-size: 0.88rem;
  font-weight: 500;
  transition: background 0.2s, transform 0.2s;
  animation: featSlideIn 0.7s cubic-bezier(0.16,1,0.3,1) both;
}

.feat-item:nth-child(1) { animation-delay: 0.2s; }
.feat-item:nth-child(2) { animation-delay: 0.35s; }
.feat-item:nth-child(3) { animation-delay: 0.5s; }

@keyframes featSlideIn {
  from { opacity: 0; transform: translateX(-18px); }
  to   { opacity: 1; transform: translateX(0); }
}

.feat-item:hover {
  background: rgba(255,255,255,0.1);
  transform: translateX(5px);
}

.feat-item i {
  font-size: 1rem;
  color: #c4b5fd;
  width: 20px;
  text-align: center;
}

/* ── Right: Form Panel ── */
.auth-form-panel {
  flex: 0 0 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--bg-card);
}

.form-panel-inner {
  width: 100%;
  max-width: 420px;
}

/* ── Slide Transition ── */
.auth-slide-enter-active,
.auth-slide-leave-active {
  transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}
.auth-slide-enter-from { opacity: 0; transform: translateY(28px) scale(0.97); }
.auth-slide-leave-to   { opacity: 0; transform: translateY(-20px) scale(0.97); }

/* ── Responsive ── */
@media (max-width: 768px) {
  .auth-brand-panel { display: none; }
  .particles-canvas  { display: none; }
  .auth-form-panel   { flex: 0 0 100%; }
}

/* ── Language Switcher ── */
.lang-switcher-btn {
  position: absolute;
  top: 30px;
  right: 30px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  color: var(--text-main);
  cursor: pointer;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: var(--shadow-sm);
}

.lang-switcher-btn:hover {
  background: var(--bg-card);
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  color: var(--primary);
}

.lang-label {
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--text-main);
}

[dir="rtl"] .lang-switcher-btn {
  right: auto;
  left: 30px;
}

@media (max-width: 768px) {
  .lang-switcher-btn {
    top: 20px;
    right: 20px;
    background: rgba(var(--bg-card-rgb), 0.8);
    border: 1px solid var(--border-color);
    color: var(--text-main);
  }
  .lang-label {
    color: var(--text-main);
  }
  [dir="rtl"] .lang-switcher-btn {
    right: auto;
    left: 20px;
  }
}
</style>
