<template>
  <div class="perf-page-hyper hyper-glass" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">

    <div v-if="!canViewPerformance && !isSuperuser" class="perm-wall">
      <i class="fa-solid fa-lock"></i>
      <h3>غير مصرح</h3>
      <p>ليس لديك صلاحية للوصول لصفحة الأداء</p>
    </div>
    <template v-else>
    <div class="bg-pulse-orb orbit-3"></div>
    <div class="bg-pulse-orb orbit-4"></div>

    <!-- Header Section -->
    <div class="perf-header-hyper">
      <div class="header-left">
        <div class="profile-hexagon">
          <div class="hex-glint"></div>
          <div class="hex-avatar">{{ username.charAt(0).toUpperCase() }}</div>
        </div>
        <div class="header-text">
          <h1>{{ $t('perf.my_performance') }}</h1>
          <p class="user-handle">@{{ username.toLowerCase() }}</p>
        </div>
      </div>
      
      <div class="header-actions">
        <div class="custom-dropdown-hyper" v-click-outside="() => showPeriodDropdown = false">
          <button class="dropdown-trigger-hyper glass-stroke" @click="showPeriodDropdown = !showPeriodDropdown">
            <i class="fa-solid fa-calendar-check select-icon"></i>
            <span class="selected-val">{{ selectedPeriodName || $t('eval.select_period') }}</span>
            <i class="fa-solid fa-chevron-down select-caret" :class="{ rotate: showPeriodDropdown }"></i>
          </button>
          
          <transition name="dropdown-hyper">
            <div v-if="showPeriodDropdown" class="dropdown-menu-hyper glass-morphic">
              <div v-for="p in periods" :key="p.id" 
                   class="dropdown-item-hyper" 
                   :class="{ active: selectedPeriodId === p.id }"
                   @click="selectPeriod(p)">
                <i class="fa-solid fa-calendar-day"></i>
                <span>{{ p.name }}</span>
              </div>
              <div v-if="!periods.length" class="dropdown-empty-hyper">
                {{ $t('common.no_data') }}
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Page States -->
    <div v-if="loading" class="state-container">
      <div class="cyber-loader"></div>
    </div>

    <div v-else-if="!selectedPeriodId" class="state-container-premium glass-morphic">
      <div class="ghost-orb-v ghost-pulse">
        <i class="fa-solid fa-calendar-days"></i>
      </div>
      <h3>{{ $t('eval.select_period_hint') }}</h3>
    </div>

    <div v-else-if="!myEval" class="state-container-premium glass-morphic">
      <div class="ghost-orb-v danger ghost-pulse">
        <i class="fa-solid fa-box-open"></i>
      </div>
      <h3>{{ $t('perf.no_eval_yet') }}</h3>
      <p>{{ $t('perf.ask_manager') }}</p>
    </div>

    <!-- Main Analytics Hub -->
    <template v-else>
      <div class="analytics-hero">
        <!-- SCORE HUDRING -->
        <div class="hud-hero-card glass-morphic score-main">
          <div class="hud-ring-container">
             <svg class="hud-svg" viewBox="0 0 140 140">
                <circle class="hud-track" cx="70" cy="70" r="62" />
                <circle class="hud-progress" cx="70" cy="70" r="62"
                        :stroke="scoreColorHUD(myEval.score)"
                        :style="{ strokeDashoffset: 390 - (390 * myEval.score / 100) }" />
             </svg>
             <div class="hud-score-center">
                <span class="score-val" :style="{ color: scoreColorHUD(myEval.score) }">{{ myEval.score.toFixed(0) }}</span>
                <span class="score-percent">%</span>
             </div>
             <div class="hud-particles"></div>
          </div>
          <div class="hud-meta">
            <span class="hud-label">{{ $t('perf.composite_score') }}</span>
            <div class="grade-badge" :style="{ background: scoreColorHUD(myEval.score) }">
              {{ grade(myEval.score) }}
            </div>
          </div>
          <div class="pulse-aura" :style="{ '--aura-color': scoreColorHUD(myEval.score) }"></div>
        </div>

        <!-- POINTS ENERGY CARD -->
        <div class="hud-hero-card glass-morphic points-box">
          <div class="energy-icon" :style="{ color: '#f59e0b' }">
             <i class="fa-solid fa-bolt-lightning"></i>
             <div class="icon-glow"></div>
          </div>
          <div class="energy-data">
             <span class="val">{{ myEval.points }}</span>
             <span class="lbl">{{ $t('perf.points') }}</span>
          </div>
          <div class="points-micro-breakdown">
             <div class="pm-chip success"><i class="fa-solid fa-plus"></i> {{ $t('perf.on_time_bonus') }}</div>
             <div class="pm-chip danger"><i class="fa-solid fa-minus"></i> {{ $t('perf.bug_penalty') }}</div>
          </div>
        </div>

        <!-- RANK SHIELD CARD -->
        <div class="hud-hero-card glass-morphic rank-box highlighting">
          <div class="shield-container" :class="rankClass(myRank - 1)">
             <i class="fa-solid fa-shield-halved"></i>
             <span class="rank-number">#{{ myRank }}</span>
          </div>
          <div class="rank-details">
             <span class="rank-lbl">{{ $t('perf.team_rank') }}</span>
             <span class="rank-count">{{ rankEmoji }} {{ $t('perf.out_of', { n: totalInPeriod }) }}</span>
          </div>
          <div class="rank-shine"></div>
        </div>
      </div>

      <!-- KPI METRIC GRID -->
      <div class="metric-section">
        <div class="section-title-hyper">
          <i class="fa-solid fa-chart-simple"></i>
          <h2>{{ $t('perf.kpi_breakdown') }}</h2>
        </div>

        <transition-group name="stagger" tag="div" class="metric-grid">
          <div v-for="(detail, idx) in myEval.details" :key="detail.id"
               class="metric-tile glass-morphic"
               :style="{ '--delay': idx * 0.1 + 's' }">
            
            <div class="tile-head">
              <div class="type-pill" :class="detail.kpi_type.toLowerCase()">
                <i :class="detail.kpi_type === 'AUTOMATED' ? 'fa-solid fa-robot' : 'fa-solid fa-user-pen'"></i>
                {{ detail.kpi_type === 'AUTOMATED' ? $t('eval.automated') : $t('eval.manual') }}
              </div>
              <div class="weight-tag">×{{ detail.kpi_weight.toFixed(1) }}</div>
            </div>

            <h3 class="metric-name">{{ $t('kpi.' + detail.kpi_name.toLowerCase().replace(/[\s-]/g, '_')) }}</h3>
            
            <div class="metric-hud-bar">
               <div class="bar-hud-track">
                  <div class="bar-hud-fill" :style="{ width: detail.score + '%', background: scoreColorHUD(detail.score) }">
                     <div class="liquid-ripple"></div>
                     <div class="shine-sweep"></div>
                  </div>
               </div>
               <div class="bar-val-premium" :style="{ color: scoreColorHUD(detail.score) }">
                  {{ detail.score.toFixed(1) }}%
               </div>
            </div>

            <div v-if="detail.raw_value" class="raw-data-tag">
               <i class="fa-solid fa-microchip"></i> {{ detail.raw_value }}
            </div>

            <div v-if="detail.notes" class="comment-bubble-glass">
               <i class="fa-solid fa-quote-left"></i>
               <p>{{ detail.notes }}</p>
            </div>
          </div>
        </transition-group>
      </div>

      <!-- FEEDBACK testimonial BLOCK -->
      <div class="feedback-testimonial glass-morphic" v-if="myEval.manager_notes">
        <div class="feedback-header">
          <div class="manager-avatar-sm">
            <i class="fa-solid fa-user-tie"></i>
          </div>
          <div class="feedback-header-text">
            <h4>{{ $t('eval.manager_notes') }}</h4>
            <span class="date">{{ myEval.period_name }}</span>
          </div>
        </div>
        <div class="feedback-body">
          <i class="fa-solid fa-quote-left quote-icon-heavy"></i>
          <p>{{ myEval.manager_notes }}</p>
        </div>
        <div class="feedback-stroke-glow"></div>
      </div>
    </template>

  </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '@/plugins/axios';
import { usePermissions } from '@/composables/usePermissions';

const API      = '/api/pm';
const username = localStorage.getItem('username') || '';
const { t }    = useI18n();
const { canViewPerformance, isSuperuser } = usePermissions();

// ── State ──────────────────────────────────────────────────────────────
const periods         = ref([]);
const selectedPeriodId = ref('');
const myEval          = ref(null);
const allInPeriod     = ref([]);
const loading         = ref(false);
const showPeriodDropdown = ref(false);

// ── Computed ───────────────────────────────────────────────────────────
const myRank = computed(() => {
  const sorted = [...allInPeriod.value].sort((a, b) => (b.score || 0) - (a.score || 0));
  const pos = sorted.findIndex(e => e.username === username);
  return pos === -1 ? '?' : pos + 1;
});
const totalInPeriod = computed(() => allInPeriod.value.length);
const selectedPeriodName = computed(() => {
  const p = periods.value.find(p => p.id === selectedPeriodId.value);
  return p ? p.name : '';
});
const rankEmoji = computed(() => {
  const r = myRank.value;
  if (r === 1) return '🥇';
  if (r === 2) return '🥈';
  if (r === 3) return '🥉';
  return '🏅';
});

// ── Helpers ────────────────────────────────────────────────────────────
function scoreColorHUD(score) {
  if (score >= 80) return '#10b981'; // Green
  if (score >= 60) return '#f59e0b'; // Amber
  return '#ef4444'; // Red
}

function grade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

function rankClass(idx) {
  if (idx === 0) return 'gold';
  if (idx === 1) return 'silver';
  if (idx === 2) return 'bronze';
  return '';
}

// ── Actions ────────────────────────────────────────────────────────────
async function loadPeriods() {
  const res = await axios.get(`${API}/eval-periods/`);
  periods.value = res.data;
  if (res.data.length && !selectedPeriodId.value) {
    selectedPeriodId.value = res.data[0].id;
  }
}

function selectPeriod(period) {
  selectedPeriodId.value = period.id;
  showPeriodDropdown.value = false;
  loadMyEval();
}

async function loadMyEval() {
  if (!selectedPeriodId.value) { myEval.value = null; return; }
  loading.value = true;
  try {
    const [meRes, allRes] = await Promise.all([
      axios.get(`${API}/evaluations/?period=${selectedPeriodId.value}`),
      axios.get(`${API}/evaluations/?period=${selectedPeriodId.value}&all=true`)
    ]);
    myEval.value    = meRes.data[0] || null;
    allInPeriod.value = allRes.data;
  } finally { loading.value = false; }
}

onMounted(async () => {
  await loadPeriods();
  if (selectedPeriodId.value) await loadMyEval();
});
</script>

<style scoped>
.perf-page-hyper {
  padding: 40px;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: var(--bg-body);
  display: flex;
  flex-direction: column;
  gap: 40px;
  font-family: 'Outfit', 'Inter', sans-serif;
}

/* Background Orbs */
.bg-pulse-orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.12; z-index: 0; }
.orbit-3 { width: 500px; height: 500px; background: #6366f1; top: 10%; right: -5%; animation: orbit 25s infinite linear; }
.orbit-4 { width: 400px; height: 400px; background: #c026d3; bottom: 10%; left: -5%; animation: orbit 20s infinite linear reverse; }

@keyframes orbit { from { transform: rotate(0deg) translate(80px) rotate(0deg); } to { transform: rotate(360deg) translate(80px) rotate(-360deg); } }

/* Header Hyper */
.perf-header-hyper { display: flex; justify-content: space-between; align-items: center; z-index: 100; position: relative; padding-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 24px; }
.profile-hexagon {
  width: 75px; height: 75px; background: linear-gradient(135deg, #6366f1, #06b6d4);
  clip-path: polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%);
  display: flex; align-items: center; justify-content: center; position: relative;
}
.hex-avatar { font-size: 32px; font-weight: 900; color: white; }
.hex-glint { position: absolute; inset: 0; background: linear-gradient(45deg, transparent, rgba(255,255,255,0.4), transparent); animation: glint 4s infinite; }
@keyframes glint { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }

.header-text h1 { margin: 0; font-size: 2.3rem; font-weight: 950; color: var(--text-main); letter-spacing: -1px; }
.user-handle { margin: 4px 0 0 0; color: var(--primary); font-weight: 800; opacity: 0.8; font-size: 1.1rem; }

/* Period Select Hyper */
.custom-dropdown-hyper { position: relative; min-width: 240px; }
.dropdown-trigger-hyper {
  display: flex; align-items: center; padding: 10px 22px; border-radius: 100px;
  background: transparent; border: 1px solid rgba(255,255,255,0.08);
  width: 100%; cursor: pointer; transition: all 0.3s; color: var(--text-main);
  font-weight: 800; font-size: 1rem;
}
.dropdown-trigger-hyper:hover { background: rgba(255,255,255,0.03); border-color: var(--primary-glow); }
.select-icon { margin-right: 12px; color: var(--primary); font-size: 1.1rem; }
.select-caret { margin-left: auto; font-size: 0.8rem; opacity: 0.5; transition: transform 0.3s; }
.select-caret.rotate { transform: rotate(180deg); }

.dropdown-menu-hyper {
  position: absolute; top: calc(100% + 15px); left: 0; width: 100%;
  border-radius: 25px; padding: 10px; z-index: 9999;
  box-shadow: 0 15px 45px rgba(0,0,0,0.4);
  display: flex; flex-direction: column; gap: 5px;
  background: rgba(255,255,255,0.03); backdrop-filter: blur(25px);
  border: 1.5px solid rgba(255,255,255,0.08);
}

.dropdown-item-hyper {
  display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-radius: 15px;
  cursor: pointer; transition: all 0.2s; color: var(--text-muted); font-weight: 700;
}
.dropdown-item-hyper:hover { background: rgba(255,255,255,0.05); color: var(--primary); transform: translateX(8px); }
.dropdown-item-hyper.active { background: var(--primary-bg); color: var(--primary); border-left: 3px solid var(--primary); }

.dropdown-empty-hyper { padding: 20px; text-align: center; color: var(--text-muted); font-style: italic; }

/* Transitions */
.dropdown-hyper-enter-active, .dropdown-hyper-leave-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.dropdown-hyper-enter-from, .dropdown-hyper-leave-to { opacity: 0; transform: translateY(-15px) scale(0.95); }

/* States */
/* Empty States Premium XL */
.state-container-premium {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  padding: 140px 60px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 48px;
  margin: 40px 0;
  max-width: 100%;
  backdrop-filter: blur(30px);
  box-shadow: var(--shadow-2xl);
  animation: slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  gap: 32px;
}

.ghost-orb-v {
  width: 160px;
  height: 160px;
  background: var(--primary-bg);
  border-radius: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5.5rem;
  color: var(--primary);
  margin-bottom: 8px;
  box-shadow: 0 25px 50px -12px var(--primary-glow);
}

.ghost-orb-v.danger {
  color: #ef4444;
  background: rgba(239, 44, 44, 0.05);
  box-shadow: 0 25px 50px -12px rgba(239, 44, 44, 0.3);
}

.state-container-premium h3 {
  font-size: 2.8rem;
  font-weight: 950;
  color: var(--text-main);
  margin: 0;
  letter-spacing: -0.04em;
}

.state-container-premium p {
  font-size: 1.3rem;
  color: var(--text-muted);
  max-width: 500px;
  line-height: 1.5;
  font-weight: 600;
  margin: 0;
}

.ghost-pulse {
  animation: ghostFloat 3s ease-in-out infinite;
}

@keyframes ghostFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

@keyframes slideInUp {
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Analytics Hero */
.analytics-hero { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; z-index: 10; }
.hud-hero-card { padding: 35px; border-radius: 35px; min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; position: relative; overflow: hidden; }

/* HUD Score Ring */
.score-main { border: 1px solid rgba(255,255,255,0.05); }
.hud-ring-container { position: relative; width: 140px; height: 140px; }
.hud-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.hud-track { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 8; }
.hud-progress { fill: none; stroke-width: 8; stroke-linecap: round; stroke-dasharray: 390; transition: stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1); }

.hud-score-center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; line-height: 1; }
.hud-score-center .score-val { font-size: 3rem; font-weight: 950; }
.hud-score-center .score-percent { font-size: 1rem; font-weight: 800; opacity: 0.5; margin-top: 5px; }

.hud-meta { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.hud-label { font-size: 0.85rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
.grade-badge { padding: 4px 14px; border-radius: 100px; font-weight: 950; color: white; font-size: 1.1rem; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }

.pulse-aura { position: absolute; width: 100%; height: 100%; border-radius: 50%; background: var(--aura-color); opacity: 0.05; filter: blur(40px); animation: auraBloom 4s infinite alternate; }
@keyframes auraBloom { from { transform: scale(0.8); opacity: 0.03; } to { transform: scale(1.2); opacity: 0.07; } }

/* Points energy */
.energy-icon { font-size: 3.2rem; position: relative; }
.icon-glow { position: absolute; inset: 10px; background: currentColor; filter: blur(25px); opacity: 0.4; }
.energy-data { display: flex; flex-direction: column; align-items: center; }
.energy-data .val { font-size: 3.5rem; font-weight: 950; color: var(--text-main); }
.energy-data .lbl { font-size: 0.9rem; font-weight: 800; opacity: 0.5; text-transform: uppercase; }
.points-micro-breakdown { display: flex; gap: 10px; width: 100%; justify-content: center; }
.pm-chip { padding: 5px 12px; border-radius: 10px; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 6px; }
.pm-chip.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.pm-chip.danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

/* Rank Shield */
.shield-container { position: relative; font-size: 5rem; color: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; }
.rank-number { position: absolute; font-size: 2.2rem; font-weight: 950; color: var(--text-main); }
.shield-container.gold { color: rgba(255, 215, 0, 0.15); filter: drop-shadow(0 0 10px rgba(255,215,0,0.1)); }
.shield-container.gold .rank-number { color: #ffd700; }

.rank-details { display: flex; flex-direction: column; align-items: center; }
.rank-lbl { font-size: 0.85rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; }
.rank-count { font-size: 1.2rem; font-weight: 800; color: var(--text-main); margin-top: 5px; }

/* KPI Section */
.section-title-hyper { display: flex; align-items: center; gap: 15px; margin-bottom: 5px; }
.section-title-hyper i { font-size: 22px; color: var(--primary); }
.section-title-hyper h2 { margin: 0; font-size: 1.4rem; font-weight: 900; }

.metric-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.metric-tile { padding: 30px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 20px; transition: all 0.3s; }
.metric-tile:hover { transform: translateY(-8px); border-color: rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.2); }

.tile-head { display: flex; justify-content: space-between; align-items: center; }
.type-pill { padding: 4px 12px; border-radius: 50px; font-size: 0.78rem; font-weight: 800; display: flex; align-items: center; gap: 6px; }
.type-pill.automated { background: rgba(99, 102, 241, 0.1); color: #818cf8; }
.type-pill.manual { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.weight-tag { font-weight: 900; color: var(--text-muted); font-size: 0.85rem; opacity: 0.5; }

.metric-name { margin: 0; font-size: 1.2rem; font-weight: 850; color: var(--text-main); }

.metric-hud-bar { display: flex; align-items: center; gap: 20px; }
.bar-hud-track { flex: 1; height: 12px; background: rgba(0,0,0,0.3); border-radius: 100px; overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.05); }
.bar-hud-fill { height: 100%; border-radius: 100px; position: relative; transition: width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1); }

.liquid-ripple { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); width: 30%; animation: liquidMove 3s infinite linear; }
@keyframes liquidMove { 0% { left: -100%; } 100% { left: 200%; } }

.bar-val-premium { font-weight: 900; font-size: 1.1rem; min-width: 55px; }

.raw-data-tag { font-size: 0.85rem; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 8px; }
.comment-bubble-glass { padding: 15px; background: rgba(255,255,255,0.03); border-radius: 15px; font-style: italic; display: flex; gap: 12px; color: var(--text-muted); font-size: 0.9rem; border-left: 3px solid rgba(255,255,255,0.1); }
.comment-bubble-glass i { opacity: 0.3; }

/* Testimonial Feedback */
.feedback-testimonial { padding: 40px; border-radius: 35px; border: 1px solid rgba(255,255,255,0.05); position: relative; overflow: hidden; }
.feedback-header { display: flex; align-items: center; gap: 20px; margin-bottom: 25px; }
.manager-avatar-sm { width: 50px; height: 50px; border-radius: 15px; background: var(--primary-bg); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 20px; }
.feedback-header-text h4 { margin: 0; font-size: 1.25rem; font-weight: 900; }
.feedback-header-text .date { font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }

.feedback-body { position: relative; z-index: 10; padding-left: 20px; }
.quote-icon-heavy { position: absolute; left: -20px; top: -10px; font-size: 3rem; color: var(--primary); opacity: 0.1; }
.feedback-body p { margin: 0; font-size: 1.1rem; line-height: 1.8; color: var(--text-main); font-weight: 500; }

.feedback-stroke-glow { 
  position: absolute; inset: 0; border: 1px solid transparent; border-radius: inherit; 
  background: linear-gradient(135deg, var(--primary), transparent) border-box; 
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0); 
  mask-composite: exclude;
  -webkit-mask-composite: destination-out; 
  opacity: 0.3; 
}

/* RTL Adjust */
[dir="rtl"] .select-icon { margin-left:12px; margin-right: 0; }
[dir="rtl"] .select-caret { margin-right: auto; margin-left: 0; }
[dir="rtl"] .comment-bubble-glass { border-left: none; border-right: 3px solid rgba(255,255,255,0.1); }
[dir="rtl"] .quote-icon-heavy { left: auto; right: -20px; transform: scaleX(-1); }
[dir="rtl"] .dropdown-item-hyper:hover { transform: translateX(-8px); }
[dir="rtl"] .dropdown-item-hyper.active { border-left: none; border-right: 3px solid var(--primary); }

[data-theme="dark"] .dropdown-menu-hyper {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
[data-theme="dark"] .dropdown-item-hyper:hover { background: rgba(255, 255, 255, 0.05); }
[data-theme="dark"] .dropdown-item-hyper.active { background: rgba(99, 102, 241, 0.15); color: #818cf8; }

/* Stagger animation */
.stagger-enter-active { animation: tileIn 0.6s cubic-bezier(0.19, 1, 0.22, 1) backwards; animation-delay: var(--delay); }
@keyframes tileIn { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

.perm-wall {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; padding: 120px 40px; text-align: center; color: var(--text-muted);
}
.perm-wall i { font-size: 3rem; color: #ef4444; opacity: 0.5; }
.perm-wall h3 { font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin: 0; }
.perm-wall p { font-size: 0.95rem; margin: 0; }
</style>
