<template>
  <div class="evaluation-page glass-page" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">

    <!-- Permission Guard -->
    <div v-if="!canViewEvaluations && !isSuperuser" class="perm-wall">
      <i class="fa-solid fa-lock"></i>
      <h3>غير مصرح</h3>
      <p>ليس لديك صلاحية للوصول لصفحة التقييمات</p>
    </div>
    <template v-else>
    <!-- Header Section -->
    <div class="eval-header-premium">
      <div class="header-content">
        <div class="eval-icon-glow">
          <i class="fa-solid fa-award"></i>
        </div>
        <div class="header-text">
          <h1>{{ $t('eval.title') }}</h1>
          <p>{{ $t('eval.subtitle') }}</p>
        </div>
      </div>
      
      <div class="header-actions">
        <div class="action-pill glass-morphic">
          <div class="custom-dropdown-v" v-click-outside="() => showPeriodDropdown = false">
            <button class="dropdown-trigger-v" @click="showPeriodDropdown = !showPeriodDropdown">
              <i class="fa-solid fa-calendar-alt"></i>
              <span>{{ selectedPeriodName || $t('eval.select_period') }}</span>
              <i class="fa-solid fa-chevron-down" :class="{ rotate: showPeriodDropdown }"></i>
            </button>
            <transition name="dropdown-v">
              <div v-if="showPeriodDropdown" class="dropdown-menu-v glass-morphic">
                <div v-for="p in periods" :key="p.id" 
                     class="dropdown-item-v" 
                     :class="{ active: selectedPeriodId === p.id }"
                     @click="selectPeriod(p)">
                  <i class="fa-solid fa-calendar-check"></i>
                  <span>{{ p.name }}</span>
                </div>
                <div v-if="!periods.length" class="dropdown-empty-v">
                  {{ $t('common.no_data') }}
                </div>
              </div>
            </transition>
          </div>
          <button v-if="(selectedPeriodId !== '' && selectedPeriodId !== null) && (canManageEvaluations || isSuperuser)" 
                  class="btn-icon-danger" 
                  style="flex-shrink: 0; margin-left: 10px;"
                  :title="$t('eval.delete_period')"
                  @click="showDeleteConfirmModal = true">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>

        <div class="button-group">
          <button v-if="canManageEvaluations || isSuperuser" class="btn-premium ghost" @click="openGenYearModal">
            <i class="fa-solid fa-calendar-check"></i>
            <span>{{ $t('eval.generate_year') }}</span>
          </button>
          <button v-if="canManageEvaluations || isSuperuser" class="btn-premium primary" @click="openAddPeriodModal">
            <i class="fa-solid fa-calendar-plus"></i>
            <span>{{ $t('eval.add_period') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Dashboard -->
    <div class="stats-dashboard" v-if="evaluations.length">
      <div class="stat-card-premium glass-morphic">
        <div class="stat-icon purple"><i class="fa-solid fa-user-group"></i></div>
        <div class="stat-info">
          <span class="stat-value">{{ evaluations.length }}</span>
          <span class="stat-label">{{ $t('eval.developers') }}</span>
        </div>
        <div class="stat-glow"></div>
      </div>
      
      <div class="stat-card-premium glass-morphic">
        <div class="stat-icon green"><i class="fa-solid fa-chart-line"></i></div>
        <div class="stat-info">
          <span class="stat-value">{{ avgScore.toFixed(1) }}%</span>
          <span class="stat-label">{{ $t('eval.avg_score') }}</span>
        </div>
        <div class="stat-glow"></div>
      </div>

      <div class="stat-card-premium glass-morphic highlighted">
        <div class="stat-icon gold"><i class="fa-solid fa-crown"></i></div>
        <div class="stat-info">
          <span class="stat-value">{{ topPerformer?.username || '—' }}</span>
          <span class="stat-label">{{ $t('eval.top_performer') }}</span>
        </div>
        <div class="stat-glow"></div>
      </div>
    </div>

    <!-- Main Leaderboard Panel -->
    <div class="leaderboard-panel glass-morphic" v-if="selectedPeriodId">
      <div class="panel-header-premium">
        <div class="panel-title">
          <i class="fa-solid fa-ranking-stars"></i>
          <h2>{{ $t('eval.team_comparison') }}</h2>
        </div>
        <button class="btn-premium-small ghost" @click="createEvalForAll">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>{{ $t('eval.auto_calculate_all') }}</span>
        </button>
      </div>

      <div v-if="loadingEvaluations" class="loading-state">
        <div v-for="i in 5" :key="i" class="skeleton-leaderboard"></div>
      </div>

      <div v-else-if="evaluations.length === 0" class="empty-state-premium">
        <div class="empty-icon-box">
          <i class="fa-solid fa-users-slash"></i>
        </div>
        <h3>{{ $t('eval.no_evals') }}</h3>
        <button class="btn-premium primary" @click="openAddEvalModal">
          <i class="fa-solid fa-user-plus"></i>
          <span>{{ $t('eval.add_eval') }}</span>
        </button>
      </div>

      <div v-else class="leaderboard-container">
        <transition-group name="list" tag="div" class="leaderboard-rows">
          <div v-for="(ev, idx) in sortedEvaluations" :key="ev.id" class="leaderboard-row" :class="{ 'top-row': idx < 3 }">
            <div class="rank-container">
              <div class="medal-badge" :class="rankClass(idx)">
                <span v-if="idx < 3" class="medal-icon">
                   <i v-if="idx === 0" class="fa-solid fa-medal gold"></i>
                   <i v-if="idx === 1" class="fa-solid fa-medal silver"></i>
                   <i v-if="idx === 2" class="fa-solid fa-medal bronze"></i>
                </span>
                <span v-else class="rank-num">#{{ idx + 1 }}</span>
              </div>
            </div>

            <div class="user-profile">
              <div class="user-avatar-premium">
                {{ ev.username ? ev.username.charAt(0).toUpperCase() : 'U' }}
              </div>
              <div class="user-details">
                <span class="user-name">{{ ev.username || $t('common.unknown') }}</span>
                <span class="user-role">{{ ev.points }} {{ $t('eval.pts') }}</span>
              </div>
            </div>

            <div class="score-display">
              <div class="score-track">
                <div class="score-fill-premium" 
                     :style="{ width: (ev.score || 0) + '%', background: scoreColor(ev.score || 0) }">
                  <div class="score-glow"></div>
                </div>
              </div>
              <div class="score-val-premium" :style="{ color: scoreColorRaw(ev.score || 0) }">
                {{ (ev.score || 0).toFixed(1) }}%
              </div>
            </div>

            <div class="row-actions">
              <button class="action-btn tip" :title="$t('eval.auto_calculate_all')" @click="calcMetrics(ev)">
                <i class="fa-solid fa-microchip"></i>
              </button>
              <button v-if="canManageEvaluations || isSuperuser" class="action-btn success" :title="$t('eval.manual_review')" @click="openManualModal(ev)">
                <i class="fa-solid fa-sliders"></i>
              </button>
              <button v-if="canManageEvaluations || isSuperuser" class="action-btn danger" :title="$t('common.delete')" @click="deleteEvaluation(ev.id)">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </transition-group>

        <div class="panel-footer-premium">
           <button v-if="canManageEvaluations || isSuperuser" class="btn-add-member" @click="openAddEvalModal">
             <i class="fa-solid fa-circle-plus"></i>
             <span>{{ $t('eval.add_member_eval') }}</span>
           </button>
        </div>
      </div>
    </div>

    <!-- Empty Landing State -->
    <div v-else class="landing-state-premium">
      <div class="floating-icons">
        <i class="fa-solid fa-chart-pie"></i>
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-fire"></i>
      </div>
      <div class="landing-card glass-morphic">
        <div class="landing-icon-main">
          <i class="fa-solid fa-calendar-days"></i>
        </div>
        <h2>{{ $t('eval.select_period_hint') }}</h2>
        <p>{{ $t('eval.select_period_desc') }}</p>
      </div>
    </div>

    <!-- ─── Premium Modals (Vibrant Glass Refined) ─── -->
    
    <!-- Modal: New Period -->
    <transition name="v-modal">
      <div v-if="showPeriodModal" class="v-modal-overlay" @click.self="showPeriodModal = false">
        <div class="v-modal-card glass-morphic">
          <div class="v-glint"></div>
          <div class="m-header-v">
            <div class="m-icon-pod pulsing-ring">
               <i class="fa-solid fa-calendar-plus"></i>
            </div>
            <div class="m-text">
               <h3>{{ $t('eval.add_period') }}</h3>
               <p>{{ $t('eval.select_period_desc') }}</p>
            </div>
            <button class="m-close-v" @click="showPeriodModal = false">&times;</button>
          </div>
          
          <div class="m-body-v">
            <div class="input-pod-v glass-stroke">
               <label><i class="fa-solid fa-tag"></i> {{ $t('eval.period_name') }}</label>
               <input v-model="newPeriod.name" :placeholder="$t('eval.period_name_placeholder')" />
            </div>
            
            <div class="m-row-v">
               <div class="input-pod-v glass-stroke">
                  <label><i class="fa-solid fa-calendar-day"></i> {{ $t('issues.table.time') }} ({{ $t('issues.table.last_occurred') }})</label>
                  <input type="date" v-model="newPeriod.start_date" />
               </div>
               <div class="input-pod-v glass-stroke">
                  <label><i class="fa-solid fa-calendar-check"></i> {{ $t('issues.table.time') }} ({{ $t('common.done') }})</label>
                  <input type="date" v-model="newPeriod.end_date" />
               </div>
            </div>
          </div>
          
          <div class="m-footer-v">
            <button class="btn-premium ghost" @click="showPeriodModal = false">{{ $t('common.cancel') }}</button>
            <button class="btn-premium primary" @click="savePeriod" :disabled="!newPeriod.name">
               <i class="fa-solid fa-cloud-arrow-up"></i>
               <span>{{ $t('common.save') }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modal: Generate Year -->
    <transition name="v-modal">
      <div v-if="showGenYearModal" class="v-modal-overlay" @click.self="showGenYearModal = false">
        <div class="v-modal-card glass-morphic">
          <div class="v-glint"></div>
          <div class="m-header-v">
            <div class="m-icon-pod pulsing-ring purple">
               <i class="fa-solid fa-calendar-check"></i>
            </div>
            <div class="m-text">
               <h3>{{ $t('eval.generate_year') }}</h3>
               <p>{{ $t('eval.toast_year_gen') }}</p>
            </div>
            <button class="m-close-v" @click="showGenYearModal = false">&times;</button>
          </div>
          <div class="m-body-v">
             <div class="input-pod-v glass-stroke">
                <label><i class="fa-solid fa-arrow-up-9-1"></i> {{ $t('eval.period_name') }} ({{ $t('common.system') }})</label>
                <input type="number" v-model="genYearValue" />
             </div>
          </div>
          <div class="m-footer-v">
            <button class="btn-premium ghost" @click="showGenYearModal = false">{{ $t('common.cancel') }}</button>
            <button class="btn-premium primary" @click="generateYear">
               <span>{{ $t('common.confirm') }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modal: Add Eval Member -->
    <transition name="v-modal">
      <div v-if="showEvalModal" class="v-modal-overlay" @click.self="showEvalModal = false">
        <div class="v-modal-card glass-morphic">
          <div class="v-glint"></div>
          <div class="m-header-v">
            <div class="m-icon-pod pulsing-ring blue">
               <i class="fa-solid fa-user-plus"></i>
            </div>
            <div class="m-text">
               <h3>{{ $t('eval.add_member_eval') }}</h3>
               <p>{{ $t('eval.username_label') }}</p>
            </div>
            <button class="m-close-v" @click="showEvalModal = false">&times;</button>
          </div>
          <div class="m-body-v">
             <div class="input-pod-v glass-stroke">
                <label><i class="fa-solid fa-user"></i> {{ $t('eval.username_label') }}</label>
                <input v-model="newEval.username" :placeholder="$t('eval.username_placeholder')" />
             </div>
          </div>
          <div class="m-footer-v">
            <button class="btn-premium ghost" @click="showEvalModal = false">{{ $t('common.cancel') }}</button>
            <button class="btn-premium primary" @click="saveEval" :disabled="!newEval.username">
               <span>{{ $t('common.save') }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modal: Manual Review (Privilege Factory) -->
    <transition name="v-modal">
      <div v-if="showManualModal" class="v-modal-overlay" @click.self="showManualModal = false">
        <div class="v-modal-card wide glass-morphic">
          <div class="v-glint"></div>
          <div class="m-header-v">
            <div class="m-icon-pod pulsing-ring green">
               <i class="fa-solid fa-user-check"></i>
            </div>
            <div class="m-text">
               <h3>{{ $t('eval.manual_review') }}</h3>
               <p>{{ editingEval?.username }}</p>
            </div>
            <button class="m-close-v" @click="showManualModal = false">&times;</button>
          </div>
          
          <div class="m-body-v scrollable" v-if="editingEval">
            <div v-for="kpi in manualKPIs" :key="kpi.id" class="kpi-score-card-v glass-morphic">
              <div class="kpi-head-v">
                <div class="k-title">
                  <h4>{{ $t('kpi.' + kpi.name.toLowerCase().replace(/[\s-]/g, '_')) }}</h4>
                  <p>{{ $t('kpi.' + kpi.name.toLowerCase().replace(/[\s-]/g, '_') + '_desc') }}</p>
                </div>
                <div class="k-score-v">
                   <div class="v-num">{{ manualScores[kpi.id] || 0 }}%</div>
                </div>
              </div>
              
              <div class="stars-pod-v">
                <button v-for="n in 5" :key="n" 
                        class="star-node"
                        :class="{ active: manualScores[kpi.id] / 20 >= n }"
                        @click="manualScores[kpi.id] = n * 20">
                  <i class="fa-solid fa-star"></i>
                </button>
              </div>
              
              <div class="k-input-pod glass-stroke">
                <i class="fa-solid fa-quote-left"></i>
                <input v-model="manualNotes[kpi.id]" :placeholder="$t('eval.notes_placeholder')" />
              </div>
            </div>

            <div class="mgr-notes-pod-v">
              <label><i class="fa-solid fa-comment-dots"></i> {{ $t('eval.manager_notes') }}</label>
              <textarea v-model="editingEval.manager_notes" class="glass-textarea-v" rows="3"></textarea>
            </div>
          </div>
          
          <div class="m-footer-v">
            <button class="btn-premium ghost" @click="showManualModal = false">{{ $t('common.cancel') }}</button>
            <button class="btn-premium primary" @click="saveManualReview">
               <i class="fa-solid fa-circle-check"></i>
               <span>{{ $t('common.save') }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modal: Delete Confirm -->
    <transition name="v-modal">
      <div v-if="showDeleteConfirmModal" class="v-modal-overlay" @click.self="showDeleteConfirmModal = false">
        <div class="v-modal-card glass-morphic m-danger">
          <div class="m-header-v">
            <div class="m-icon-pod pulsing-ring danger">
               <i class="fa-solid fa-trash-can"></i>
            </div>
            <div class="m-text">
               <h3>{{ $t('eval.delete_period') }}</h3>
               <p>{{ $t('eval.delete_period_confirm') }}</p>
            </div>
            <button class="m-close-v" @click="showDeleteConfirmModal = false">&times;</button>
          </div>
          <div class="m-footer-v">
            <button class="btn-premium ghost" @click="showDeleteConfirmModal = false">{{ $t('common.cancel') }}</button>
            <button class="btn-premium danger" @click="deletePeriod">
               <i class="fa-solid fa-trash"></i>
               <span>{{ $t('common.delete') }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>


    <!-- Toast Component Handled Externally or via CSS in this file -->
    <transition-group name="toast" tag="div" class="toast-holder">
      <div v-for="t in toasts" :key="t.id" class="premium-toast" :class="t.type">
        <div class="toast-icon">
          <i :class="t.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"></i>
        </div>
        <div class="toast-content">
          <span>{{ t.message }}</span>
        </div>
      </div>
    </transition-group>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '@/plugins/axios';
import { usePermissions } from '@/composables/usePermissions';

const API = '/api/pm';
const AUTH_API = '/api/admin';

// ── State ──────────────────────────────────────────────────────────────
const { t } = useI18n();
const { canViewEvaluations, isSuperuser } = usePermissions();
const periods            = ref([]);
const selectedPeriodId   = ref('');
const evaluations        = ref([]);
const manualKPIs         = ref([]);
const loadingEvaluations = ref(false);
const toasts             = ref([]);

const showPeriodModal = ref(false);
const showGenYearModal= ref(false);
const showEvalModal   = ref(false);
const showManualModal = ref(false);
const showDeleteConfirmModal = ref(false);
const showPeriodDropdown = ref(false);

const editingEval     = ref(null);
const manualScores    = ref({});
const manualNotes     = ref({});

const genYearValue = ref(new Date().getFullYear());
const newPeriod = ref({ name: '', start_date: '', end_date: '' });
const newEval   = ref({ username: '' });

// ── Computed ───────────────────────────────────────────────────────────
const sortedEvaluations = computed(() =>
  [...evaluations.value].sort((a, b) => (b.score || 0) - (a.score || 0))
);
const avgScore = computed(() => {
  if (!evaluations.value.length) return 0;
  return evaluations.value.reduce((s, e) => s + (e.score || 0), 0) / evaluations.value.length;
});
const topPerformer = computed(() => sortedEvaluations.value[0] || null);
const selectedPeriodName = computed(() => {
  const p = periods.value.find(p => p.id === selectedPeriodId.value);
  return p ? p.name : '';
});

// ── Toast helper ───────────────────────────────────────────────────────
let toastCounter = 0;
function toast(message, type = 'success') {
  const id = ++toastCounter;
  toasts.value.push({ id, message, type });
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 3500);
}

// ── Fetchers ───────────────────────────────────────────────────────────
async function loadPeriods() {
  const res = await axios.get(`${API}/eval-periods/`);
  periods.value = res.data;
  // Auto-select the first period if not selected
  if (periods.value.length > 0 && !selectedPeriodId.value) {
    selectedPeriodId.value = periods.value[0].id;
    loadEvaluations();
  }
}

function selectPeriod(period) {
  selectedPeriodId.value = period.id;
  showPeriodDropdown.value = false;
  loadEvaluations();
}

async function loadEvaluations() {
  if (!selectedPeriodId.value) { evaluations.value = []; return; }
  loadingEvaluations.value = true;
  try {
    const res = await axios.get(`${API}/evaluations/?period=${selectedPeriodId.value}`);
    evaluations.value = res.data;
  } finally { loadingEvaluations.value = false; }
}

async function loadManualKPIs() {
  const res = await axios.get(`${API}/kpis/?type=MANUAL`);
  manualKPIs.value = res.data;
}

// ── Helpers ────────────────────────────────────────────────────────────
function rankClass(idx) {
  return idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';
}
function scoreColor(score) {
  if (score >= 80) return 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
  if (score >= 60) return 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
  return 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
}
function scoreColorRaw(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

// ── Actions ────────────────────────────────────────────────────────────
function openAddPeriodModal() { newPeriod.value = { name: '', start_date: '', end_date: '' }; showPeriodModal.value = true; }
function openGenYearModal()   { genYearValue.value = new Date().getFullYear(); showGenYearModal.value = true; }
function openAddEvalModal()   { newEval.value = { username: '' }; showEvalModal.value = true; }

async function savePeriod() {
  try {
    await axios.post(`${API}/eval-periods/`, newPeriod.value);
    await loadPeriods();
    showPeriodModal.value = false;
    toast(t('eval.toast_period_created'));
  } catch { toast(t('eval.toast_err_period'), 'error'); }
}

async function deletePeriod() {
  try {
    await axios.delete(`${API}/eval-periods/${selectedPeriodId.value}/`);
    selectedPeriodId.value = '';
    evaluations.value = [];
    showDeleteConfirmModal.value = false;
    await loadPeriods();
    toast(t('eval.toast_period_deleted'));
  } catch {
    toast(t('eval.toast_err_delete_period'), 'error');
  }
}

async function generateYear() {
  try {
    await axios.post(`${API}/eval-periods/generate-year/`, { year: genYearValue.value });
    await loadPeriods();
    showGenYearModal.value = false;
    toast(t('eval.toast_year_gen'));
  } catch { toast(t('eval.toast_err_year'), 'error'); }
}

async function saveEval() {
  try {
    const usersRes = await axios.get(`${AUTH_API}/users/`);
    const user = usersRes.data.find(u => u.username === newEval.value.username);
    if (!user) { toast(t('eval.toast_user_not_found') || 'User not found.', 'error'); return; }
    await axios.post(`${API}/evaluations/`, { user: user.id, period: selectedPeriodId.value });
    await loadEvaluations();
    showEvalModal.value = false;
    toast(t('eval.toast_eval_added'));
  } catch { toast(t('eval.toast_err_eval'), 'error'); }
}

async function calcMetrics(ev) {
  try {
    const res = await axios.post(`${API}/evaluations/${ev.id}/calculate-metrics/`);
    const msg = t('eval.toast_metrics_calc', { user: ev.username });
    toast(msg);
  } catch { toast(t('eval.toast_calc_failed'), 'error'); }
}

async function createEvalForAll() {
  const periodObj = periods.value.find(p => p.id == selectedPeriodId.value);
  if (!periodObj) return;
  try {
    let users = [];
    if (periodObj.project) {
      const res = await axios.get(`${API}/project-roles/?project=${periodObj.project}`);
      users = res.data.map(r => ({ id: r.user, username: r.username }));
    } else {
      const res = await axios.get(`${AUTH_API}/users/`);
      users = res.data;
    }
    for (const user of users) {
      const exists = evaluations.value.find(e => e.user === user.id || e.username === user.username);
      if (!exists) {
        await axios.post(`${API}/evaluations/`, { user: user.id, period: selectedPeriodId.value });
      }
    }
    await loadEvaluations();
    for (const ev of evaluations.value) { await calcMetrics(ev); }
    toast(t('eval.toast_all_calc') || 'All metrics calculated!');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function openManualModal(ev) {
  editingEval.value = { ...ev };
  manualScores.value = {};
  manualNotes.value  = {};
  ev.details.filter(d => d.kpi_type === 'MANUAL').forEach(d => {
    manualScores.value[d.kpi] = d.score;
    manualNotes.value[d.kpi]  = d.notes;
  });
  showManualModal.value = true;
}

async function saveManualReview() {
  try {
    for (const kpi of manualKPIs.value) {
      const score = manualScores.value[kpi.id] || 0;
      const notes = manualNotes.value[kpi.id]  || '';
      const existing = editingEval.value.details.find(d => d.kpi === kpi.id);
      if (existing) {
        await axios.patch(`${API}/eval-details/${existing.id}/`, { score, notes });
      } else {
        await axios.post(`${API}/eval-details/`, { evaluation: editingEval.value.id, kpi: kpi.id, score, notes });
      }
    }
    await axios.patch(`${API}/evaluations/${editingEval.value.id}/`, {
      manager_notes: editingEval.value.manager_notes
    });
    const res = await axios.post(`${API}/evaluations/${editingEval.value.id}/calculate-metrics/`);
    const idx = evaluations.value.findIndex(e => e.id === editingEval.value.id);
    if (idx !== -1) evaluations.value[idx] = res.data;
    showManualModal.value = false;
    toast(t('eval.toast_review_saved'));
  } catch { toast(t('eval.toast_err_review'), 'error'); }
}

async function deleteEvaluation(id) {
  if (!confirm(t('common.delete_confirm') || 'Are you sure?')) return;
  try {
    await axios.delete(`${API}/evaluations/${id}/`);
    evaluations.value = evaluations.value.filter(e => e.id !== id);
    toast(t('common.deleted_success') || 'Deleted successfully');
  } catch {
    toast(t('common.delete_error') || 'Error deleting.', 'error');
  }
}

onMounted(async () => {
  await loadPeriods();
  await loadManualKPIs();
});
</script>

<style scoped>
:root {
  --primary-glow: rgba(99, 102, 241, 0.4);
}

.evaluation-page {
  padding: 30px;
  min-height: 100vh;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 30px;
  font-family: var(--font-sans);
}

/* ──────────────────────────────────────────────────────────────────────────
   PREMIUM HEADER
   ────────────────────────────────────────────────────────────────────────── */
.eval-header-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  position: relative;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.eval-icon-glow {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--primary), var(--ds-indigo));
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  box-shadow: 0 10px 30px var(--primary-glow);
  position: relative;
}

.eval-icon-glow::after {
  content: '';
  position: absolute;
  inset: -5px;
  background: inherit;
  filter: blur(15px);
  opacity: 0.3;
  z-index: -1;
}

.header-text h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 950;
  color: var(--text-main);
  letter-spacing: -0.5px;
}

.header-text p {
  margin: 0;
  color: var(--text-muted);
  font-size: 1rem;
  opacity: 0.8;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.action-pill {
  display: flex;
  align-items: center;
  padding: 8px 12px 8px 20px;
  border-radius: 100px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s;
  position: relative;
}

.custom-dropdown-v {
  position: relative;
  min-width: 200px;
}

.dropdown-trigger-v {
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-main);
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  width: 100%;
  padding: 4px 0;
  outline: none;
}

.dropdown-trigger-v i:first-child {
  color: var(--primary);
  font-size: 1.1rem;
}

.dropdown-trigger-v i.fa-chevron-down {
  margin-left: auto;
  font-size: 0.8rem;
  opacity: 0.5;
  transition: transform 0.3s;
}

.dropdown-trigger-v i.rotate { transform: rotate(180deg); }

.btn-icon-danger {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown-menu-v {
  position: absolute;
  top: calc(100% + 15px);
  left: 0;
  width: 100%;
  min-width: 260px;
  border-radius: 20px;
  padding: 10px;
  z-index: 9999;
  box-shadow: 0 15px 45px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.dropdown-item-v {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-muted);
  font-weight: 600;
}

.dropdown-item-v i { font-size: 0.95rem; opacity: 0.7; }

.dropdown-item-v:hover {
  background: var(--bg-hover);
  color: var(--primary);
  transform: translateX(5px);
}

.dropdown-item-v.active {
  background: var(--primary-bg);
  color: var(--primary);
}

.dropdown-empty-v {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-style: italic;
}

/* Animations */
.dropdown-v-enter-active, .dropdown-v-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dropdown-v-enter-from, .dropdown-v-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.btn-icon-danger {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-danger:hover {
  background: var(--ds-red);
  color: white;
  transform: scale(1.1);
}

.button-group {
  display: flex;
  gap: 12px;
}

.btn-premium {
  padding: 12px 24px;
  border-radius: 16px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: none;
}

.btn-premium.primary {
  background: linear-gradient(135deg, var(--primary), var(--indigo-800));
  color: white;
  box-shadow: 0 4px 15px var(--primary-glow);
}

.btn-premium.primary:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 10px 25px var(--primary-glow);
}

.btn-premium.ghost:hover {
  background: var(--primary-bg);
  border-color: var(--primary-glow);
  color: var(--primary);
}

.btn-premium-small {
  padding: 8px 18px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: none;
}

.btn-premium-small.ghost {
  background: var(--bg-hover);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

.btn-premium-small.ghost:hover {
  background: var(--primary-bg);
  border-color: var(--primary-glow);
  color: var(--primary);
  transform: translateY(-2px);
}

/* ──────────────────────────────────────────────────────────────────────────
   STATS DASHBOARD
   ────────────────────────────────────────────────────────────────────────── */
.stats-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.stat-card-premium {
  padding: 24px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.stat-card-premium:hover {
  transform: translateY(-5px);
  border-color: var(--primary-glow);
}

.stat-card-premium.highlighted {
  border: 2px solid var(--ds-yellow);
  background: var(--bg-card);
}

.stat-icon {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: white;
}

.stat-icon.purple { background: linear-gradient(135deg, var(--ds-indigo), var(--primary)); }
.stat-icon.green  { background: linear-gradient(135deg, var(--ds-green), #06b6d4); }
.stat-icon.gold   { background: linear-gradient(135deg, var(--ds-yellow), #d97706); }

.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 1.8rem; font-weight: 900; color: var(--text-main); line-height: 1; }
.stat-label { font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 4px; letter-spacing: 0.5px; }

.stat-glow {
  position: absolute;
  bottom: -20px;
  right: -20px;
  width: 100px;
  height: 100px;
  background: currentColor;
  filter: blur(50px);
  opacity: 0.1;
}

/* ──────────────────────────────────────────────────────────────────────────
   LEADERBOARD PANEL
   ────────────────────────────────────────────────────────────────────────── */
.leaderboard-panel {
  border-radius: 30px;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

.panel-header-premium {
  padding: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border-color);
}

.panel-title { display: flex; align-items: center; gap: 15px; }
.panel-title i { font-size: 24px; color: var(--primary); }
.panel-title h2 { margin: 0; font-size: 1.4rem; font-weight: 950; color: var(--text-main); }

.leaderboard-rows {
  padding: 10px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 80px 1.5fr 2fr 120px;
  align-items: center;
  gap: 20px;
  padding: 15px 25px;
  border-radius: 20px;
  transition: all 0.3s;
}

.leaderboard-row:hover {
  background: var(--bg-hover);
  transform: scale(1.01);
}

.leaderboard-row.top-row {
  background: var(--primary-bg);
  border: 1px solid var(--primary-glow);
}

/* Rank Medals */
.medal-badge {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
}

.medal-icon i { font-size: 1.8rem; }
.medal-icon i.gold { color: var(--ds-yellow); filter: drop-shadow(0 4px 8px rgba(255, 215, 0, 0.4)); }
.medal-icon i.silver { color: #94a3b8; filter: drop-shadow(0 4px 8px rgba(148, 163, 184, 0.4)); }
.medal-icon i.bronze { color: #b45309; filter: drop-shadow(0 4px 8px rgba(180, 83, 9, 0.4)); }

.rank-num { font-weight: 950; font-size: 1.1rem; color: var(--text-muted); }

/* User Profile */
.user-profile { display: flex; align-items: center; gap: 15px; }
.user-avatar-premium {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--primary-bg);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.2rem;
  border: 1px solid var(--primary-glow);
  backdrop-filter: blur(5px);
  position: relative;
  overflow: hidden;
}

.user-avatar-premium::before {
  content: '';
  position: absolute;
  inset: 0;
  background: inherit;
  opacity: 0.2;
}

.user-details { display: flex; flex-direction: column; }
.user-name { font-weight: 700; color: var(--text-main); font-size: 1.1rem; }
.user-role { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; margin-top: 2px; }

/* Score Display */
.score-display { display: flex; align-items: center; gap: 15px; }
.score-track {
  flex: 1;
  height: 12px;
  background: var(--bg-hover);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.score-fill-premium {
  height: 100%;
  border-radius: 10px;
  position: relative;
  transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.score-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

.score-val-premium { font-weight: 900; font-size: 1.1rem; min-width: 60px; text-align: right; }

/* Actions */
.row-actions { display: flex; gap: 10px; }
.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-hover);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  transform: scale(1.1);
  background: var(--primary-bg);
  color: var(--primary);
  border-color: var(--primary-glow);
}

.action-btn.tip {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border-color: rgba(99, 102, 241, 0.2);
}

.action-btn.tip:hover {
  background: var(--primary) !important;
  color: white !important;
  box-shadow: 0 0 15px var(--primary-glow);
}

.action-btn.success:hover { background: rgba(16, 185, 129, 0.1); color: var(--ds-green); border-color: var(--ds-green); }
.action-btn.danger:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: #ef4444; }

.panel-footer-premium { padding: 25px; display: flex; justify-content: center; }
.btn-add-member {
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  padding: 14px 35px;
  color: var(--text-muted);
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s;
  box-shadow: var(--shadow-sm);
}

.btn-add-member:hover {
  border-color: var(--primary-glow);
  color: var(--primary);
  background: var(--primary-bg);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--primary-glow);
}

.empty-state-premium {
  padding: 80px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 25px;
  min-height: 400px;
}

.empty-icon-box {
  width: 110px;
  height: 110px;
  background: var(--primary-bg);
  color: var(--primary);
  border-radius: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 45px;
  margin-bottom: 5px;
  box-shadow: 0 15px 45px var(--primary-glow);
  position: relative;
  animation: float 6s infinite ease-in-out;
}

.empty-icon-box::after {
  content: '';
  position: absolute;
  inset: -10px;
  background: var(--primary-bg);
  filter: blur(25px);
  z-index: -1;
  opacity: 0.4;
}

.empty-state-premium h3 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 950;
  color: var(--text-main);
  letter-spacing: -0.5px;
}

/* ──────────────────────────────────────────────────────────────────────────
   EMPTY & LANDING STATES
   ────────────────────────────────────────────────────────────────────────── */
.landing-state-premium {
  min-height: 50vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.landing-card {
  padding: 50px;
  border-radius: 35px;
  text-align: center;
  max-width: 500px;
  z-index: 10;
}

.landing-icon-main {
  width: 90px;
  height: 90px;
  background: var(--primary-bg);
  color: var(--primary);
  border-radius: 30px;
  margin: 0 auto 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  box-shadow: 0 15px 35px rgba(99, 102, 241, 0.2);
}

.landing-card h2 { font-size: 1.8rem; font-weight: 900; color: var(--text-main); margin-bottom: 10px; }
.landing-card p { color: var(--text-muted); font-size: 1.1rem; line-height: 1.6; }

.floating-icons i { position: absolute; opacity: 0.1; font-size: 5rem; z-index: 1; }
.floating-icons i:nth-child(1) { top: 10%; left: 10%; animation: float 6s infinite; }
.floating-icons i:nth-child(2) { bottom: 15%; left: 20%; animation: float 8s infinite 1s; }
.floating-icons i:nth-child(3) { top: 20%; right: 15%; animation: float 7s infinite 0.5s; }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-30px) rotate(10deg); }
}

/* ──────────────────────────────────────────────────────────────────────────
   PREMIUM MODALS (VIBRANT GLASS REFINE)
   ────────────────────────────────────────────────────────────────────────── */
.v-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: var(--glass-blur);
    z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 25px;
}

.v-modal-card {
    width: 550px; max-width: 100%; border-radius: 40px; background: var(--bg-card);
    border: 1px solid var(--border-color); box-shadow: var(--shadow-2xl);
    position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 0;
    animation: vModalIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.v-modal-card.wide { width: 850px; }
.v-modal-card.m-danger { border-color: rgba(244, 63, 94, 0.2); }

@keyframes vModalIn { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

/* Glint Effect */
.v-glint {
    position: absolute; top: 0; left: -150%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
    transform: skewX(-20deg); pointer-events: none; animation: vGlint 6s infinite;
}
@keyframes vGlint { 0% { left: -150%; } 30%, 100% { left: 150%; } }

.m-header-v {
    padding: 35px 40px; display: flex; align-items: center; gap: 25px; border-bottom: 1px solid var(--border-color);
    background: var(--bg-hover); position: relative;
}
.m-icon-pod {
    width: 65px; height: 65px; border-radius: 20px; background: var(--primary-bg); color: var(--primary);
    display: flex; align-items: center; justify-content: center; font-size: 28px;
}
.m-icon-pod.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.m-icon-pod.blue { background: rgba(6, 182, 212, 0.1); color: #06b6d4; }
.m-icon-pod.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.m-icon-pod.danger { background: rgba(244, 63, 94, 0.1); color: var(--ds-red); }

.pulsing-ring { animation: mPulse 2s infinite; }
@keyframes mPulse { 
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99,102,241,0.3); } 
    50% { transform: scale(1.05); box-shadow: 0 0 20px 5px rgba(99,102,241,0.15); } 
}

.m-text h3 { margin: 0; font-size: 1.6rem; font-weight: 950; color: var(--text-main); letter-spacing: -0.8px; }
.m-text p { margin: 4px 0 0 0; color: var(--text-muted); font-weight: 600; font-size: 0.95rem; }

.m-close-v {
    position: absolute; top: 25px; right: 25px; width: 40px; height: 40px; border-radius: 50%;
    border: none; background: transparent; color: var(--text-muted); font-size: 24px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: 0.3s;
}
.m-close-v:hover { background: var(--bg-hover); color: var(--ds-red); transform: rotate(90deg); }

.m-body-v { padding: 40px; display: flex; flex-direction: column; gap: 25px; }
.m-body-v.scrollable { max-height: 55vh; overflow-y: auto; padding-right: 30px; }
.m-row-v { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

/* Input Pods */
.input-pod-v {
    display: flex; flex-direction: column; gap: 12px; padding: 20px 25px; border-radius: 22px;
    background: var(--bg-card); border: 1px solid var(--border-color); transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.input-pod-v:focus-within { border-color: var(--primary); background: var(--primary-bg); box-shadow: 0 0 0 4px var(--primary-bg); }
.input-pod-v label { display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.input-pod-v input { background: transparent; border: none; font-weight: 800; color: var(--text-main); outline: none; font-size: 1.1rem; width: 100%; }

/* KPI Cards Refined */
.kpi-score-card-v {
    padding: 25px; border-radius: 28px; background: var(--bg-card); border: 1px solid var(--border-color);
    margin-bottom: 20px; display: flex; flex-direction: column; gap: 20px;
}
.kpi-head-v { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
.k-title h4 { margin: 0; font-size: 1.1rem; font-weight: 950; color: var(--text-main); }
.k-title p { margin: 4px 0 0 0; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; line-height: 1.4; opacity: 0.8; }

.k-score-v {
    width: 60px; height: 60px; border-radius: 18px; background: var(--primary-bg); color: var(--primary);
    display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem;
}

.stars-pod-v { display: flex; gap: 12px; justify-content: center; padding: 10px; }
.star-node { background: transparent; border: none; font-size: 2.2rem; color: var(--bg-hover); cursor: pointer; transition: 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.star-node.active { color: #f59e0b; filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.4)); transform: scale(1.1); }
.star-node:hover { transform: scale(1.25); }

.k-input-pod {
    display: flex; align-items: center; gap: 15px; padding: 14px 20px; border-radius: 15px;
    background: var(--bg-hover); border: 1px solid var(--border-color);
}
.k-input-pod i { color: var(--text-muted); opacity: 0.5; }
.k-input-pod input { background: transparent; border: none; flex: 1; font-weight: 700; color: var(--text-main); outline: none; font-size: 0.95rem; }

.mgr-notes-pod-v { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; }
.mgr-notes-pod-v label { display: flex; align-items: center; gap: 10px; font-weight: 900; color: var(--text-muted); text-transform: uppercase; font-size: 0.85rem; }
.glass-textarea-v {
    background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px;
    padding: 20px; color: var(--text-main); font-weight: 700; font-size: 1rem; outline: none; transition: 0.3s; line-height: 1.6;
}
.glass-textarea-v:focus { border-color: var(--primary); background: var(--primary-bg); box-shadow: 0 0 0 4px var(--primary-bg); }

.m-footer-v {
    padding: 30px 40px; display: flex; justify-content: flex-end; gap: 15px; background: var(--bg-hover);
    border-top: 1px solid var(--border-color);
}

/* Toast Modern Refined */
.toast-holder { position: fixed; bottom: 40px; right: 40px; z-index: 100000; display: flex; flex-direction: column; gap: 15px; }
.premium-toast {
    padding: 20px 30px; border-radius: 25px; display: flex; align-items: center; gap: 20px;
    min-width: 350px; background: var(--bg-card); border: 1.5px solid var(--border-color);
    box-shadow: 0 20px 50px rgba(0,0,0,0.15); backdrop-filter: blur(25px);
    animation: toastInV 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.premium-toast.success { border-left: 5px solid var(--ds-green); }
.premium-toast.error { border-left: 5px solid var(--ds-red); }

@keyframes toastInV { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }

/* RTL Fixes */
[dir="rtl"] .m-close-v { right: auto; left: 25px; }
[dir="rtl"] .m-footer-v { justify-content: flex-start; }
[dir="rtl"] .premium-toast { border-left: none; border-right: 5px solid currentColor; }

/* ──────────────────────────────────────────────────────────────────────────
   DARK MODE OVERRIDES (Vibrant-Glass Refined)
   ────────────────────────────────────────────────────────────────────────── */
[data-theme="dark"] .leaderboard-panel {
    background: rgba(15, 23, 42, 0.4);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}

[data-theme="dark"] .panel-header-premium {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .leaderboard-row:hover {
    background: rgba(255, 255, 255, 0.05);
}

[data-theme="dark"] .leaderboard-row.top-row {
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(99, 102, 241, 0.1));
    border-color: rgba(124, 58, 237, 0.3);
    box-shadow: inset 0 0 20px rgba(124, 58, 237, 0.1);
}

[data-theme="dark"] .medal-badge {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .score-track {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .user-avatar-premium {
    background: rgba(124, 58, 237, 0.12);
    color: #a78bfa;
    border-color: rgba(124, 58, 237, 0.3);
}

[data-theme="dark"] .action-pill {
    background: rgba(15, 23, 42, 0.6);
    border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .period-select-premium {
    color: #e2e8f0;
}

[data-theme="dark"] .stat-card-premium {
    background: rgba(30, 41, 59, 0.4);
    border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .stat-card-premium.highlighted {
    border-color: rgba(245, 158, 11, 0.4);
    background: rgba(245, 158, 11, 0.05);
}

/* Modal Dark Adjustments */
[data-theme="dark"] .v-modal-card {
    background: rgba(15, 23, 42, 0.85);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 30px 100px rgba(0, 0, 0, 0.6);
}

[data-theme="dark"] .m-header-v {
    background: rgba(255, 255, 255, 0.02);
    border-bottom-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .input-pod-v, 
[data-theme="dark"] .kpi-score-card-v,
[data-theme="dark"] .k-input-pod,
[data-theme="dark"] .glass-textarea-v {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .m-footer-v {
    background: rgba(255, 255, 255, 0.02);
    border-top-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .star-node {
    color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .star-node.active {
    color: #fbbf24;
    filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.6));
}

[data-theme="dark"] .empty-icon-box {
    background: rgba(124, 58, 237, 0.15);
    border: 1px solid rgba(124, 58, 237, 0.3);
    color: #a78bfa;
    box-shadow: 0 15px 50px rgba(124, 58, 237, 0.2);
}

[data-theme="dark"] .empty-icon-box::after {
    background: rgba(124, 58, 237, 0.2);
}

[data-theme="dark"] .btn-premium-small.ghost {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--text-main);
}

[data-theme="dark"] .btn-premium-small.ghost:hover {
    background: rgba(124, 58, 237, 0.15);
    border-color: rgba(124, 58, 237, 0.3);
    color: #a78bfa;
}

[data-theme="dark"] .action-btn.tip {
    background: rgba(124, 58, 237, 0.15);
    border-color: rgba(124, 58, 237, 0.3);
    color: #a78bfa;
}

[data-theme="dark"] .action-btn.tip:hover {
    background: var(--primary) !important;
    color: white !important;
}

[data-theme="dark"] .action-pill {
    background: rgba(30, 41, 59, 0.4);
    border-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .dropdown-menu-v {
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

[data-theme="dark"] .dropdown-item-v:hover {
    background: rgba(255, 255, 255, 0.05);
}

[data-theme="dark"] .dropdown-item-v.active {
    background: rgba(124, 58, 237, 0.15);
    color: #a78bfa;
}

[data-theme="dark"] .btn-add-member {
    background: rgba(124, 58, 237, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
}

[data-theme="dark"] .btn-add-member:hover {
    border-color: rgba(124, 58, 237, 0.4);
    color: #a78bfa;
}

[data-theme="dark"] .user-avatar-premium {
    background: rgba(124, 58, 237, 0.15);
}

.perm-wall {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; padding: 120px 40px; text-align: center; color: var(--text-muted);
}
.perm-wall i { font-size: 3rem; color: #ef4444; opacity: 0.5; }
.perm-wall h3 { font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin: 0; }
.perm-wall p { font-size: 0.95rem; margin: 0; }
</style>

