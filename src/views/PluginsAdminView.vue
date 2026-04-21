<template>
  <div class="plugins-root" :dir="isRTL ? 'rtl' : 'ltr'">

    <!-- Header -->
    <header class="plugins-header">
      <div class="header-start">
        <button class="btn-back" @click="$router.push('/')">
          <i :class="isRTL ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left'"></i>
        </button>
        <div>
          <div class="breadcrumb-row">
            <span class="bc-parent">الإدارة</span>
            <i class="fa-solid fa-chevron-right bc-sep"></i>
            <span class="bc-current">إضافات النظام</span>
          </div>
          <p class="header-sub">إدارة وتفعيل إضافات المنصة</p>
        </div>
      </div>
      <div class="header-end">
        <button class="btn-refresh" @click="refresh" :class="{ spinning: loading }" title="تحديث">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
        <button class="btn-add" @click="openModal()">
          <i class="fa-solid fa-plus"></i> إضافة Plugin
        </button>
      </div>
    </header>

    <!-- Stats Bar -->
    <div class="stats-bar" v-if="!loading && !error">
      <div class="stat-chip">
        <i class="fa-solid fa-puzzle-piece"></i>
        <span>{{ plugins.length }} إضافة</span>
      </div>
      <div class="stat-chip active">
        <span class="dot-live"></span>
        <span>{{ activeCount }} مفعّلة</span>
      </div>
      <div class="stat-chip loaded">
        <i class="fa-solid fa-bolt"></i>
        <span>{{ loadedPlugins.length }} محمّلة</span>
      </div>
      <div class="search-wrap">
        <i class="fa-solid fa-search"></i>
        <input v-model="search" placeholder="بحث..." class="search-input" />
      </div>
    </div>

    <main class="plugins-main">

      <!-- Loading -->
      <div v-if="loading" class="center-state">
        <div class="loader-ring"></div>
        <span>جاري التحميل...</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="center-state error">
        <i class="fa-solid fa-circle-exclamation"></i>
        <p>{{ error }}</p>
        <button class="btn-add" @click="refresh">إعادة المحاولة</button>
      </div>

      <!-- Empty -->
      <div v-else-if="filtered.length === 0 && plugins.length === 0" class="center-state empty">
        <div class="empty-orb">
          <div class="orb-ring"></div>
          <i class="fa-solid fa-plug"></i>
        </div>
        <h3>لا توجد إضافات بعد</h3>
        <p>أضف أول إضافة لتوسيع وظائف المنصة</p>
        <button class="btn-add" @click="openModal()">
          <i class="fa-solid fa-plus"></i> إضافة Plugin
        </button>
      </div>

      <!-- No search results -->
      <div v-else-if="filtered.length === 0" class="center-state empty">
        <i class="fa-solid fa-magnifying-glass" style="font-size:2rem;opacity:0.3"></i>
        <p>لا توجد نتائج لـ "{{ search }}"</p>
      </div>

      <!-- Cards Grid -->
      <div v-else>
        <div class="cards-grid">
          <div
            v-for="plugin in paginatedPlugins"
            :key="plugin.id"
          class="plugin-card"
          :class="{ 'card-on': plugin.enabled, 'card-expanded': expanded === plugin.id }"
        >
          <!-- Card Header -->
          <div class="card-top">
            <div class="card-icon" :class="plugin.enabled ? 'icon-on' : 'icon-off'">
              <i class="fa-solid fa-plug"></i>
            </div>
            <div class="card-info">
              <div class="card-name-row">
                <span class="card-name">{{ plugin.name }}</span>
                <span class="version-tag">v{{ plugin.version }}</span>
                <span v-if="loadedPlugins.includes(plugin.name)" class="live-tag">
                  <span class="live-dot"></span> محمّل
                </span>
              </div>
              <p class="card-desc">{{ plugin.description || 'لا يوجد وصف' }}</p>
            </div>
            <div class="card-controls">
              <label class="pill-toggle" :class="{ 'toggle-on': plugin.enabled }">
                <input type="checkbox" v-model="plugin.enabled" @change="togglePlugin(plugin)" />
                <span class="pill-track">
                  <span class="pill-thumb"></span>
                  <span class="pill-label-on">ON</span>
                  <span class="pill-label-off">OFF</span>
                </span>
              </label>
            </div>
          </div>

          <!-- Entry Point Row -->
          <div class="card-entry" @click="copyEntry(plugin.entry_point)">
            <i class="fa-solid fa-terminal"></i>
            <code>{{ plugin.entry_point }}</code>
            <i class="fa-regular fa-copy copy-icon" :class="{ copied: copiedEntry === plugin.entry_point }"></i>
          </div>

          <!-- Expand Details -->
          <div class="card-footer">
            <button class="btn-expand" @click="expanded = expanded === plugin.id ? null : plugin.id">
              <i class="fa-solid" :class="expanded === plugin.id ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
              {{ expanded === plugin.id ? 'إخفاء' : 'تفاصيل' }}
            </button>
            <div class="footer-actions">
              <button class="btn-icon-sm edit" @click="openModal(plugin)" title="تعديل">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-icon-sm danger" @click="deletePlugin(plugin)" title="حذف">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>

          <!-- Expanded Details -->
          <transition name="expand">
            <div v-if="expanded === plugin.id" class="card-details">
              <div class="detail-row">
                <span class="detail-label">الحالة</span>
                <span class="detail-val" :class="plugin.enabled ? 'val-green' : 'val-gray'">
                  {{ plugin.enabled ? 'مفعّل' : 'معطّل' }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">محمّل في الذاكرة</span>
                <span class="detail-val" :class="loadedPlugins.includes(plugin.name) ? 'val-green' : 'val-gray'">
                  {{ loadedPlugins.includes(plugin.name) ? 'نعم' : 'لا' }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Entry Point</span>
                <code class="detail-code" dir="ltr">{{ plugin.entry_point }}</code>
              </div>
              <div class="detail-row" v-if="plugin.description">
                <span class="detail-label">الوصف</span>
                <span class="detail-val">{{ plugin.description }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">تاريخ الإضافة</span>
                <span class="detail-val">{{ formatDate(plugin.created_at) }}</span>
              </div>
            </div>
          </transition>
        </div>
        </div>
        <ElitePagination 
          :totalItems="filtered.length" 
          :itemsPerPage="itemsPerPage" 
          :currentPage="currentPage" 
          @update:currentPage="p => currentPage = p" 
        />
      </div>
    </main>

    <!-- Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
          <div class="modal-card">
            <div class="modal-top">
              <div class="modal-title">
                <div class="modal-icon"><i class="fa-solid fa-plug"></i></div>
                <span>{{ editingPlugin ? 'تعديل الإضافة' : 'إضافة Plugin جديد' }}</span>
              </div>
              <button class="btn-close" @click="showModal = false"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div class="modal-body">
              <div class="field-grid">
                <div class="field">
                  <label>اسم الإضافة <span class="req">*</span></label>
                  <input v-model="form.name" class="field-input" placeholder="my-plugin" :disabled="!!editingPlugin" />
                </div>
                <div class="field">
                  <label>الإصدار <span class="req">*</span></label>
                  <input v-model="form.version" class="field-input" placeholder="1.0.0" />
                </div>
              </div>
              <div class="field">
                <label>Entry Point <span class="req">*</span></label>
                <input v-model="form.entry_point" class="field-input mono" dir="ltr" placeholder="plugins.my_plugin" />
                <span class="field-hint">مسار الملف بنقاط — مثال: plugins.examples.logger_plugin</span>
              </div>
              <div class="field">
                <label>الوصف</label>
                <input v-model="form.description" class="field-input" placeholder="وصف مختصر..." />
              </div>
              <div class="field-toggle">
                <span>تفعيل فوراً</span>
                <label class="pill-toggle" :class="{ 'toggle-on': form.enabled }">
                  <input type="checkbox" v-model="form.enabled" />
                  <span class="pill-track">
                    <span class="pill-thumb"></span>
                    <span class="pill-label-on">ON</span>
                    <span class="pill-label-off">OFF</span>
                  </span>
                </label>
              </div>
            </div>

            <div class="modal-bottom">
              <button class="btn-ghost" @click="showModal = false">إلغاء</button>
              <button class="btn-save" @click="savePlugin" :disabled="saving">
                <i class="fa-solid fa-spinner fa-spin" v-if="saving"></i>
                <span v-else>{{ editingPlugin ? 'تحديث' : 'حفظ' }}</span>
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <transition-group name="toast" tag="div" class="toast-stack">
        <div v-for="t in toasts" :key="t.id" class="toast-item" :class="t.type">
          <i :class="t.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i>
          {{ t.msg }}
        </div>
      </transition-group>
    </Teleport>

  </div>
</template>

<script>
import axios from '@/plugins/axios';
import ElitePagination from '@/components/ElitePagination.vue';

export default {
  name: 'PluginsAdminView',
  components: { ElitePagination },
  data() {
    return {
      plugins: [], loadedPlugins: [],
      loading: true, error: null,
      search: '', expanded: null,
      showModal: false, saving: false,
      editingPlugin: null,
      copiedEntry: null,
      toasts: [], _toastId: 0,
      currentPage: 1, itemsPerPage: 12,
      form: { name: '', version: '1.0.0', description: '', entry_point: '', enabled: false }
    };
  },
  computed: {
    isRTL() { return this.$i18n.locale === 'ar'; },
    activeCount() { return this.plugins.filter(p => p.enabled).length; },
    filtered() {
      if (!this.search) return this.plugins;
      const q = this.search.toLowerCase();
      return this.plugins.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.entry_point.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    },
    paginatedPlugins() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      return this.filtered.slice(start, start + this.itemsPerPage);
    }
  },
  watch: {
    search() {
      this.currentPage = 1;
    }
  },
  mounted() { this.refresh(); },
  methods: {
    async refresh() {
      this.loading = true; this.error = null;
      try {
        const [p, l] = await Promise.all([
          axios.get('/api/pm/plugins/'),
          axios.get('/api/pm/plugins/loaded/').catch(() => ({ data: { loaded: [] } }))
        ]);
        this.plugins = p.data;
        this.loadedPlugins = l.data.loaded || [];
      } catch (e) {
        this.error = e.response?.data?.detail || 'فشل تحميل الإضافات';
      } finally { this.loading = false; }
    },

    async togglePlugin(plugin) {
      try {
        await axios.patch(`/api/pm/plugins/${plugin.id}/`, { enabled: plugin.enabled });
        const l = await axios.get('/api/pm/plugins/loaded/').catch(() => ({ data: { loaded: [] } }));
        this.loadedPlugins = l.data.loaded || [];
        this.toast(plugin.enabled ? `تم تفعيل ${plugin.name}` : `تم تعطيل ${plugin.name}`, plugin.enabled ? 'success' : 'info');
      } catch (e) {
        plugin.enabled = !plugin.enabled;
        this.toast('فشل تغيير الحالة', 'error');
      }
    },

    async deletePlugin(plugin) {
      if (!confirm(`حذف "${plugin.name}"؟`)) return;
      try {
        await axios.delete(`/api/pm/plugins/${plugin.id}/`);
        this.plugins = this.plugins.filter(p => p.id !== plugin.id);
        this.toast(`تم حذف ${plugin.name}`, 'success');
      } catch { this.toast('فشل الحذف', 'error'); }
    },

    openModal(plugin = null) {
      this.editingPlugin = plugin;
      this.form = plugin
        ? { name: plugin.name, version: plugin.version, description: plugin.description || '', entry_point: plugin.entry_point, enabled: plugin.enabled }
        : { name: '', version: '1.0.0', description: '', entry_point: '', enabled: false };
      this.showModal = true;
    },

    async savePlugin() {
      if (!this.form.name || !this.form.version || !this.form.entry_point) {
        this.toast('يرجى ملء الحقول المطلوبة', 'error'); return;
      }
      this.saving = true;
      try {
        if (this.editingPlugin) {
          const res = await axios.patch(`/api/pm/plugins/${this.editingPlugin.id}/`, this.form);
          const idx = this.plugins.findIndex(p => p.id === this.editingPlugin.id);
          if (idx !== -1) this.plugins[idx] = res.data;
          this.toast('تم التحديث', 'success');
        } else {
          const res = await axios.post('/api/pm/plugins/', this.form);
          this.plugins.push(res.data);
          this.toast(`تم إضافة ${res.data.name}`, 'success');
        }
        this.showModal = false;
        const l = await axios.get('/api/pm/plugins/loaded/').catch(() => ({ data: { loaded: [] } }));
        this.loadedPlugins = l.data.loaded || [];
      } catch (e) {
        this.toast(e.response?.data?.name?.[0] || 'فشل الحفظ', 'error');
      } finally { this.saving = false; }
    },

    copyEntry(entry) {
      navigator.clipboard?.writeText(entry);
      this.copiedEntry = entry;
      setTimeout(() => { this.copiedEntry = null; }, 1500);
    },

    formatDate(d) {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    toast(msg, type = 'success') {
      const id = ++this._toastId;
      this.toasts.push({ id, msg, type });
      setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 3000);
    }
  }
};
</script>

<style scoped>
/* Root */
.plugins-root { display:flex; flex-direction:column; height:100%; background:var(--bg-body); color:var(--text-main); font-family:'Inter','Tajawal',sans-serif; overflow:hidden; }

/* Header */
.plugins-header { display:flex; align-items:center; justify-content:space-between; padding:0 28px; height:68px; background:var(--bg-card); border-bottom:1px solid var(--border-color); flex-shrink:0; }
.header-start { display:flex; align-items:center; gap:16px; }
.btn-back { width:36px; height:36px; border-radius:10px; border:1px solid var(--border-color); background:transparent; color:var(--text-muted); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.2s; }
.btn-back:hover { background:var(--bg-hover); color:var(--primary); border-color:var(--primary); }
.breadcrumb-row { display:flex; align-items:center; gap:8px; }
.bc-parent { font-size:.82rem; color:var(--text-muted); font-weight:600; }
.bc-sep { font-size:.6rem; opacity:.35; }
.bc-current { font-size:.9rem; font-weight:800; color:var(--text-main); }
.header-sub { font-size:.78rem; color:var(--text-muted); margin:2px 0 0; }
.header-end { display:flex; align-items:center; gap:10px; }
.btn-refresh { width:36px; height:36px; border-radius:10px; border:1px solid var(--border-color); background:transparent; color:var(--text-muted); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.3s; }
.btn-refresh:hover { color:var(--primary); border-color:var(--primary); }
.btn-refresh.spinning i { animation:spin .6s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.btn-add { padding:9px 20px; border-radius:10px; background:#6366f1; color:white; border:none; font-weight:700; font-size:.88rem; cursor:pointer; display:flex; align-items:center; gap:8px; transition:.2s; }
.btn-add:hover { background:#4f46e5; transform:translateY(-1px); }

/* Stats Bar */
.stats-bar { display:flex; align-items:center; gap:10px; padding:14px 28px; background:var(--bg-card); border-bottom:1px solid var(--border-color); flex-shrink:0; flex-wrap:wrap; }
.stat-chip { display:flex; align-items:center; gap:6px; padding:6px 14px; border-radius:20px; font-size:.8rem; font-weight:700; background:var(--bg-hover); border:1px solid var(--border-color); color:var(--text-muted); }
.stat-chip.active { background:#6366f115; border-color:#6366f140; color:#6366f1; }
.stat-chip.loaded { background:#10b98115; border-color:#10b98140; color:#10b981; }
.dot-live { width:7px; height:7px; border-radius:50%; background:#6366f1; animation:livePulse 1.5s infinite; }
@keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
.search-wrap { display:flex; align-items:center; gap:8px; padding:7px 14px; border-radius:20px; background:var(--bg-hover); border:1px solid var(--border-color); margin-inline-start:auto; }
.search-wrap i { color:var(--text-muted); font-size:.85rem; }
.search-input { background:transparent; border:none; outline:none; color:var(--text-main); font-size:.85rem; width:160px; }

/* Main */
.plugins-main { flex:1; overflow-y:auto; padding:24px 28px; }

/* Center States */
.center-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:80px 20px; text-align:center; color:var(--text-muted); }
.center-state.error { color:#ef4444; }
.center-state.error i { font-size:2.5rem; }
.loader-ring { width:44px; height:44px; border-radius:50%; border:3px solid var(--border-color); border-top-color:#6366f1; animation:spin .8s linear infinite; }
.empty-orb { position:relative; width:100px; height:100px; display:flex; align-items:center; justify-content:center; margin-bottom:8px; }
.orb-ring { position:absolute; inset:0; border-radius:50%; background:#6366f1; opacity:.15; animation:orbPulse 2s infinite; }
.empty-orb i { position:relative; font-size:2.2rem; color:#6366f1; }
@keyframes orbPulse { 0%{transform:scale(1);opacity:.3} 100%{transform:scale(2);opacity:0} }
.center-state h3 { font-size:1.4rem; font-weight:800; margin:0; color:var(--text-main); }
.center-state p { margin:0; font-size:.9rem; }

/* Cards Grid */
.cards-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(380px, 1fr)); gap:18px; }

/* Plugin Card */
.plugin-card {
  background:var(--bg-card); border:1.5px solid var(--border-color); border-radius:18px;
  overflow:hidden; transition:all .25s cubic-bezier(.4,0,.2,1);
}
.plugin-card:hover { border-color:#6366f140; box-shadow:0 8px 24px rgba(99,102,241,.08); transform:translateY(-2px); }
.card-on { border-color:#6366f150; background:color-mix(in srgb,#6366f1 3%,var(--bg-card)); }

/* Card Top */
.card-top { display:flex; align-items:flex-start; gap:14px; padding:18px 18px 12px; }
.card-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; transition:.3s; }
.icon-on { background:linear-gradient(135deg,#6366f1,#4f46e5); color:white; box-shadow:0 6px 16px #6366f140; }
.icon-off { background:var(--bg-hover); color:var(--text-muted); }
.card-info { flex:1; min-width:0; }
.card-name-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px; }
.card-name { font-weight:800; font-size:.95rem; }
.version-tag { background:#6366f115; color:#6366f1; padding:2px 8px; border-radius:20px; font-size:.68rem; font-weight:800; }
.live-tag { display:flex; align-items:center; gap:4px; background:#10b98115; color:#10b981; padding:2px 8px; border-radius:20px; font-size:.68rem; font-weight:800; }
.live-dot { width:6px; height:6px; border-radius:50%; background:#10b981; animation:livePulse 1.5s infinite; }
.card-desc { font-size:.82rem; color:var(--text-muted); margin:0; line-height:1.5; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* Pill Toggle */
.card-controls { flex-shrink:0; }
.pill-toggle { position:relative; display:inline-block; cursor:pointer; }
.pill-toggle input { display:none; }
.pill-track {
  display:flex; align-items:center; width:72px; height:30px; border-radius:30px;
  background:var(--border-color); padding:3px; transition:.3s; position:relative; overflow:hidden;
}
.toggle-on .pill-track { background:#6366f1; }
.pill-thumb { width:24px; height:24px; border-radius:50%; background:white; transition:.3s; box-shadow:0 2px 6px rgba(0,0,0,.2); position:relative; z-index:2; }
.toggle-on .pill-thumb { transform:translateX(42px); }
.pill-label-on, .pill-label-off { position:absolute; font-size:.6rem; font-weight:800; transition:.3s; }
.pill-label-on { left:8px; color:white; opacity:0; }
.pill-label-off { right:8px; color:var(--text-muted); opacity:1; }
.toggle-on .pill-label-on { opacity:1; }
.toggle-on .pill-label-off { opacity:0; }

/* Entry Row */
.card-entry {
  display:flex; align-items:center; gap:8px; padding:8px 18px;
  background:var(--bg-hover); border-top:1px solid var(--border-color);
  cursor:pointer; transition:.2s;
}
.card-entry:hover { background:color-mix(in srgb,#6366f1 8%,var(--bg-hover)); }
.card-entry i:first-child { color:#6366f1; font-size:.8rem; flex-shrink:0; }
.card-entry code { flex:1; font-size:.75rem; color:var(--text-main); font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.copy-icon { font-size:.75rem; color:var(--text-muted); transition:.2s; flex-shrink:0; }
.copied { color:#10b981 !important; }

/* Card Footer */
.card-footer { display:flex; align-items:center; justify-content:space-between; padding:10px 18px; border-top:1px solid var(--border-color); }
.btn-expand { background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:.8rem; font-weight:700; display:flex; align-items:center; gap:6px; padding:4px 8px; border-radius:8px; transition:.2s; }
.btn-expand:hover { background:var(--bg-hover); color:var(--text-main); }
.footer-actions { display:flex; gap:6px; }
.btn-icon-sm { width:30px; height:30px; border-radius:8px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:.8rem; transition:.2s; }
.btn-icon-sm.edit { background:var(--bg-hover); color:var(--text-muted); }
.btn-icon-sm.edit:hover { background:#6366f115; color:#6366f1; }
.btn-icon-sm.danger { background:var(--bg-hover); color:var(--text-muted); }
.btn-icon-sm.danger:hover { background:#fef2f2; color:#ef4444; }

/* Expanded Details */
.card-details { padding:14px 18px; border-top:1px solid var(--border-color); background:var(--bg-hover); display:flex; flex-direction:column; gap:10px; }
.detail-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.detail-label { font-size:.78rem; font-weight:700; color:var(--text-muted); flex-shrink:0; }
.detail-val { font-size:.82rem; font-weight:600; color:var(--text-main); }
.val-green { color:#10b981; }
.val-gray { color:var(--text-muted); }
.detail-code { font-size:.72rem; font-family:monospace; background:var(--bg-card); padding:3px 8px; border-radius:6px; color:#6366f1; }

/* Expand transition */
.expand-enter-active, .expand-leave-active { transition:all .25s ease; max-height:300px; overflow:hidden; }
.expand-enter-from, .expand-leave-to { max-height:0; opacity:0; }

/* Modal */
.modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.5); backdrop-filter:blur(6px); z-index:10000; display:flex; align-items:center; justify-content:center; }
.modal-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:22px; width:500px; max-width:95vw; box-shadow:0 32px 80px rgba(0,0,0,.25); }
.modal-top { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--border-color); }
.modal-title { display:flex; align-items:center; gap:12px; font-weight:800; font-size:1rem; }
.modal-icon { width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg,#6366f1,#4f46e5); color:white; display:flex; align-items:center; justify-content:center; }
.btn-close { background:none; border:none; cursor:pointer; color:var(--text-muted); font-size:1.1rem; padding:4px; border-radius:6px; transition:.2s; }
.btn-close:hover { background:var(--bg-hover); color:var(--text-main); }
.modal-body { padding:22px 24px; display:flex; flex-direction:column; gap:16px; }
.field-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.field { display:flex; flex-direction:column; gap:6px; }
.field label { font-size:.8rem; font-weight:700; color:var(--text-muted); }
.req { color:#ef4444; }
.field-input { padding:10px 14px; border-radius:10px; border:1.5px solid var(--border-color); background:var(--bg-hover); color:var(--text-main); font-size:.9rem; outline:none; transition:.2s; font-family:inherit; }
.field-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px #6366f115; }
.field-input.mono { font-family:monospace; }
.field-input:disabled { opacity:.5; cursor:not-allowed; }
.field-hint { font-size:.72rem; color:var(--text-muted); margin-top:2px; }
.field-toggle { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:10px; background:var(--bg-hover); border:1px solid var(--border-color); font-size:.88rem; font-weight:700; }
.modal-bottom { display:flex; justify-content:flex-end; gap:10px; padding:16px 24px; border-top:1px solid var(--border-color); }
.btn-ghost { padding:9px 20px; border-radius:10px; border:1px solid var(--border-color); background:transparent; color:var(--text-main); cursor:pointer; font-weight:600; transition:.2s; }
.btn-ghost:hover { background:var(--bg-hover); }
.btn-save { padding:9px 24px; border-radius:10px; background:#6366f1; color:white; border:none; cursor:pointer; font-weight:700; display:flex; align-items:center; gap:8px; transition:.2s; }
.btn-save:hover { background:#4f46e5; }
.btn-save:disabled { opacity:.6; cursor:not-allowed; }

/* Modal transition */
.modal-fade-enter-active, .modal-fade-leave-active { transition:all .25s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity:0; }
.modal-fade-enter-from .modal-card, .modal-fade-leave-to .modal-card { transform:scale(.95) translateY(10px); }

/* Toast */
.toast-stack { position:fixed; bottom:32px; right:32px; z-index:99999; display:flex; flex-direction:column; gap:10px; pointer-events:none; }
.toast-item { display:flex; align-items:center; gap:10px; padding:12px 20px; border-radius:14px; font-size:.88rem; font-weight:700; background:var(--bg-card); border:1.5px solid var(--border-color); box-shadow:0 12px 32px rgba(0,0,0,.15); backdrop-filter:blur(20px); animation:toastIn .4s cubic-bezier(.16,1,.3,1); }
.toast-item.success { border-color:#10b98150; color:#10b981; }
.toast-item.error { border-color:#ef444450; color:#ef4444; }
.toast-item.info { border-color:#6366f150; color:#6366f1; }
@keyframes toastIn { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
.toast-enter-active, .toast-leave-active { transition:all .3s ease; }
.toast-enter-from, .toast-leave-to { opacity:0; transform:translateX(40px); }
</style>
