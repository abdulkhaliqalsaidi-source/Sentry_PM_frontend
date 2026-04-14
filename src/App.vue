<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { locale } = useI18n();
const router = useRouter();

// ── Global 403 Permission Denied Toast ────────────────────────────────
const permDeniedMsg = ref('');
const showPermDenied = ref(false);
let permDeniedTimer = null;

const handlePermDenied = (e) => {
  permDeniedMsg.value = e.detail?.message || 'ليس لديك صلاحية لهذا الإجراء';
  showPermDenied.value = true;
  clearTimeout(permDeniedTimer);
  permDeniedTimer = setTimeout(() => { showPermDenied.value = false; }, 4000);
};

let sessionCheckInterval;

const checkSession = () => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (isAuthenticated) {
        const expiryTime = localStorage.getItem('session_expiry_time');
        
        // Debug info in console
        const timeLeft = expiryTime ? (parseInt(expiryTime, 10) - Date.now()) : 0;
        console.log(`[Auth Check] Session expires in: ${Math.round(timeLeft / 1000)} seconds.`);
        
        if (expiryTime && Date.now() > parseInt(expiryTime, 10)) {
            // Session expired, clear storage
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('username');
            localStorage.removeItem('user_role');
            localStorage.removeItem('is_superuser');
            localStorage.removeItem('user_project_id');
            localStorage.removeItem('user_project_name');
            localStorage.removeItem('user_permissions');
            localStorage.removeItem('session_expiry_time');
            
            if (router.currentRoute.value.path !== '/login') {
                router.push('/login');
            }
        }
    }
};


const updateDirection = (lang) => {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
};

const applyColor = (colorConfig) => {
  if (!colorConfig) return;
  const html = document.documentElement;
  try {
    const config = typeof colorConfig === 'string' ? JSON.parse(colorConfig) : colorConfig;
    const primary = config.primary;
    if (!primary || primary.startsWith('var(')) return; // skip CSS vars

    html.style.setProperty('--primary', primary);

    const hover = config.hover || primary;
    html.style.setProperty('--primary-hover', hover);
    html.style.setProperty('--primary-hover-local', hover);

    // Derive rgba values from hex
    const hex = primary.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0,2), 16);
      const g = parseInt(hex.slice(2,4), 16);
      const b = parseInt(hex.slice(4,6), 16);
      const bg   = config.bg   || `rgba(${r},${g},${b},0.08)`;
      const glow = `rgba(${r},${g},${b},0.3)`;
      html.style.setProperty('--primary-bg',   bg);
      html.style.setProperty('--primary-glow', glow);
      // Update indigo vars used in some components
      html.style.setProperty('--indigo-500', primary);
      html.style.setProperty('--indigo-600', hover);
    }

    if (config.gradient?.length === 2) {
      html.style.setProperty('--primary-gradient-start', config.gradient[0]);
      html.style.setProperty('--primary-gradient-end',   config.gradient[1]);
      html.style.setProperty('--lf-grad-main', `linear-gradient(135deg, ${config.gradient[0]} 0%, ${config.gradient[1]} 100%)`);
    }
  } catch (e) {
    console.error('Failed to apply color config', e);
  }
};

const applyFont = (fontId) => {
  const fontMap = {
    sans:        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    outfit:      "'Outfit', sans-serif",
    montserrat:  "'Montserrat', sans-serif",
    poppins:     "'Poppins', sans-serif",
    roboto:      "'Roboto', sans-serif",
    arabic:      "'Tajawal', sans-serif",
    serif:       "'Georgia', 'Times New Roman', serif",
    mono:        "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  };
  const value = fontMap[fontId] || fontMap.sans;
  document.documentElement.style.setProperty('--font-family', value);
  document.body.style.fontFamily = value;
};

const applyTheme = (theme) => {
  const html = document.documentElement;
  if (!theme || theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } else {
    html.setAttribute('data-theme', theme);
  }
};

watch(locale, (newLang) => {
  console.log('Language changed to:', newLang);
  updateDirection(newLang);
  localStorage.setItem('user_language', newLang);
});

onMounted(() => {
  updateDirection(locale.value);
  const savedTheme = localStorage.getItem('user_theme') || 'system';
  applyTheme(savedTheme);
  
  const savedColor = localStorage.getItem('user_primary_color');
  if (savedColor) {
    try {
      const parsed = JSON.parse(savedColor);
      // Migrate old colors that used CSS vars
      if (parsed.primary?.startsWith('var(')) {
        // Reset to default blue
        const defaultColor = { id: 'omnia', primary: '#3b82f6', hover: '#2563eb', bg: 'rgba(59,130,246,0.08)', gradient: ['#22d3ee', '#3b82f6'] };
        localStorage.setItem('user_primary_color', JSON.stringify(defaultColor));
        applyColor(defaultColor);
      } else {
        applyColor(parsed);
      }
    } catch(e) {
      applyColor({ primary: '#3b82f6', hover: '#2563eb', gradient: ['#22d3ee', '#3b82f6'] });
    }
  } else {
    applyColor({ primary: '#3b82f6', hover: '#2563eb', gradient: ['#22d3ee', '#3b82f6'] });
  }

  const savedFont = localStorage.getItem('user_font_id') || 'sans';
  applyFont(savedFont);

  // Expose globally so SettingsView can call them directly
  window.__applyColor = applyColor;
  window.__applyFont  = applyFont;
  window.__applyTheme = applyTheme;

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('user_theme') || 'system') === 'system') applyTheme('system');
  });

  // Listen for settings changes from other components via custom events
  window.addEventListener('theme-changed',  (e) => applyTheme(e.detail));
  window.addEventListener('color-changed',  (e) => applyColor(e.detail));
  window.addEventListener('font-changed',   (e) => applyFont(e.detail));
  window.addEventListener('permission-denied', handlePermDenied);

  sessionCheckInterval = setInterval(checkSession, 5000);
});

onUnmounted(() => {
  if (sessionCheckInterval) clearInterval(sessionCheckInterval);
  window.removeEventListener('permission-denied', handlePermDenied);
});
</script>

<template>
  <div class="app-container">
    <router-view />

    <!-- Global Permission Denied Toast -->
    <Teleport to="body">
      <transition name="perm-toast">
        <div v-if="showPermDenied" class="global-perm-toast">
          <i class="fa-solid fa-lock"></i>
          <span>{{ permDeniedMsg }}</span>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: var(--font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-container {
  width: 100%;
  margin: 0;
  padding: 0;
}

/* Global Permission Denied Toast */
.global-perm-toast {
  position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
  z-index: 999999; display: flex; align-items: center; gap: 10px;
  padding: 14px 24px; border-radius: 14px;
  background: #1e1e2e; color: #ef4444;
  border: 1.5px solid #ef444440;
  box-shadow: 0 16px 40px rgba(0,0,0,0.3);
  font-size: 0.9rem; font-weight: 700;
  font-family: 'Inter', 'Tajawal', sans-serif;
  white-space: nowrap;
}
.global-perm-toast i { font-size: 1rem; }
.perm-toast-enter-active, .perm-toast-leave-active { transition: all 0.3s ease; }
.perm-toast-enter-from, .perm-toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>
