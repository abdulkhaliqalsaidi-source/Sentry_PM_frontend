<template>
  <div class="vp-editor-view" v-if="projectTitle" dir="rtl">
    <!-- Premium Header -->
    <header class="vp-editor-header glass">
      <div class="header-container">
        <div class="header-breadcrumb">
          <div class="bc-section">
            <i class="fa-solid fa-file-pen bc-icon"></i>
            <span class="bc-text">{{ projectTitle }}</span>
          </div>
          <i class="fa-solid fa-chevron-left bc-sep"></i>
          <span class="bc-current">{{ isEditing ? 'تعديل التوثيق' : 'إضافة توثيق جديد' }}</span>
        </div>
        
        <div class="header-actions">
          <!-- Online editors indicator -->
          <div v-if="collab && collab.onlineUsers.value.size > 0" class="collab-avatars">
            <div
              v-for="u in [...collab.onlineUsers.value].filter(u => u !== collab.currentUsername())"
              :key="u"
              class="collab-avatar"
              :title="u"
            >{{ u[0].toUpperCase() }}</div>
            <span class="collab-label">يعمل على المستند</span>
          </div>
          <span v-if="lastSavedAt" class="autosave-indicator">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            حُفظ تلقائياً {{ formatSavedAt(lastSavedAt) }}
          </span>
          <button v-if="isEditing" @click="deleteDocument" class="btn btn-danger">
            <i class="fa-solid fa-trash-can"></i> حذف
          </button>
          <button @click="router.back()" class="btn btn-outline">
            <i class="fa-solid fa-xmark"></i> إلغاء
          </button>
          <button @click="saveDocument" class="btn btn-primary btn-save" :class="{ 'btn-loading': loadingSave, 'btn-success': isSuccess }" :disabled="loadingSave">
            <span v-if="loadingSave"><i class="fa-solid fa-spinner fa-spin"></i></span>
            <span v-else-if="isSuccess"><i class="fa-solid fa-check"></i></span>
            <span v-else><i class="fa-solid fa-check"></i> {{ isEditing ? 'تحديث التوثيق' : 'حفظ التوثيق' }}</span>
          </button>
        </div>
      </div>
    </header>

    <div class="vp-editor-body">
      <!-- Draft Recovery Banner -->
      <div v-if="hasDraft" class="draft-banner">
        <div class="draft-banner-content">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <span>يوجد مسودة محفوظة من جلسة سابقة. هل تريد استرجاعها؟</span>
        </div>
        <div class="draft-banner-actions">
          <button @click="restoreDraft" class="draft-btn restore">
            <i class="fa-solid fa-rotate-left"></i> استرجاع
          </button>
          <button @click="discardDraft" class="draft-btn discard">
            <i class="fa-solid fa-trash"></i> تجاهل
          </button>
        </div>
      </div>
      <div class="vp-editor-card">
        <!-- Form Section -->
        <div class="vp-form-grid">
          <div class="form-group full-width">
            <label class="elite-label">عنوان الصفحة</label>
            <input 
              type="text" 
              v-model="doc.title" 
              class="elite-input title-input" 
              placeholder="مثلاً: دليل التهيئة الأولية..." 
            />
          </div>

          <div class="form-group">
            <label class="elite-label">التوثيق الأب (اختياري)</label>
            <div class="select-wrapper">
              <select v-model="doc.parent" class="elite-select">
                <option :value="null">-- هذا القسم رئيسي --</option>
                <option v-for="p in possibleParents" :key="p.id" :value="p.id">
                  {{ p.displayTitle }}
                </option>
              </select>
              <i class="fa-solid fa-chevron-down select-icon"></i>
            </div>
          </div>

          <div class="form-group">
            <label class="elite-label">الترتيب</label>
            <input 
              type="number" 
              v-model="doc.order" 
              class="elite-input" 
              placeholder="0" 
            />
          </div>

          <div class="form-group full-width">
            <label class="elite-label">التصنيفات (Tags)</label>
            <div class="tags-selector">
              <div class="tags-selected">
                <span
                  v-for="tag in selectedTags"
                  :key="tag.id"
                  class="tag-chip-editor"
                  :style="{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '55' }"
                >
                  {{ tag.name }}
                  <button @click="removeTag(tag.id)" class="tag-remove-btn">&times;</button>
                </span>
                <input
                  v-model="tagInput"
                  class="tag-input-inline"
                  placeholder="أضف تصنيفاً..."
                  @keyup.enter="addOrCreateTag"
                  @input="filterTagSuggestions"
                />
              </div>
              <div v-if="tagSuggestions.length > 0" class="tag-suggestions">
                <div
                  v-for="s in tagSuggestions"
                  :key="s.id"
                  class="tag-suggestion-item"
                  @click="selectTag(s)"
                >
                  <span class="tag-dot" :style="{ background: s.color }"></span>
                  {{ s.name }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Editor Toolbar Info -->
        <div class="editor-info">
          <i class="fa-brands fa-markdown markdown-icon"></i>
          <span>اكتب المحتوى بتنسيق Markdown. سيتم الحفظ تلقائياً في السجل عند الضغط على حفظ.</span>
          <div class="templates-trigger" style="margin-inline-start:auto">
            <button class="template-toggle-btn" @click="showTemplates = !showTemplates">
              <i class="fa-solid fa-wand-sparkles"></i> قوالب جاهزة
            </button>
            <transition name="dropdown-v">
              <div v-if="showTemplates" class="templates-dropdown">
                <div
                  v-for="tpl in docTemplates"
                  :key="tpl.name"
                  class="template-item"
                  @click="applyTemplate(tpl)"
                >
                  <i :class="tpl.icon"></i>
                  <div>
                    <div class="tpl-name">{{ tpl.name }}</div>
                    <div class="tpl-desc">{{ tpl.desc }}</div>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- Markdown Editor -->
        <div class="markdown-editor-container" dir="ltr">
          <MdEditor 
            v-model="doc.content" 
            language="en-US" 
            :theme="currentTheme" 
            height="calc(100vh - 380px)" 
            class="sentry-md-editor"
            editor-id="sentry-editor"
            preview-theme="github"
            preview-class="markdown-body"
            @upload-img="handleUploadImg"
            @change="collab && collab.sendTyping(true)"
          />
        </div>
        <div v-if="collab && collab.typingUsers.value.size > 0" class="typing-bar">
          <span class="typing-dots"><span></span><span></span><span></span></span>
          <span>{{ [...collab.typingUsers.value].join('، ') }} يكتب الآن...</span>
        </div>
      </div>
    </div>
    <ConfirmModal 
      :isOpen="showDeleteConfirm" 
      title="تأكيد الحذف" 
      message="هل أنت متأكد من حذف هذا التوثيق؟ لا يمكن التراجع عن هذا الإجراء." 
      confirmText="حذف" 
      cancelText="إلغاء" 
      type="danger" 
      @confirm="confirmDeleteDocument" 
      @cancel="showDeleteConfirm = false" 
    />

    <!-- Toast Notifications -->
    <Teleport to="body">
      <transition-group name="toast" tag="div" class="toast-holder">
        <div v-for="t in toasts" :key="t.id" class="premium-toast" :class="t.type">
          <div class="toast-icon">
            <i :class="t.type === 'success' ? 'fa-solid fa-circle-check' : t.type === 'info' ? 'fa-solid fa-circle-info' : 'fa-solid fa-triangle-exclamation'"></i>
          </div>
          <div class="toast-content">
            <span>{{ t.message }}</span>
          </div>
        </div>
      </transition-group>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import axios from '@/plugins/axios';
import { useRoute, useRouter } from 'vue-router';
import { MdEditor } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import 'github-markdown-css/github-markdown.css';
import ConfirmModal from '../components/ConfirmModal.vue';
import { useDocCollaboration } from '../composables/useDocCollaboration';

const route = useRoute();
const router = useRouter();
const currentProjectId = route.params.projectId;

const currentTheme = ref(document.documentElement.getAttribute('data-theme') || 'light');
let themeObserver = null;

const isEditing = ref(false);
const loadingSave = ref(false);
const isSuccess = ref(false);
const docIdToEdit = route.params.docId;

// ── Collaboration (only when editing existing doc) ─────────────
const collab = docIdToEdit
  ? useDocCollaboration(currentProjectId, docIdToEdit)
  : null;

const projectTitle = ref('');
const doc = ref({
  project: currentProjectId,
  parent: null,
  title: '',
  content: '# عنوان الدرس...\n\nابدأ بكتابة المحتوى هنا...',
  order: 0,
  tags: []
});

const possibleParents = ref([]);

// ── Tags ──────────────────────────────────────────────────────────────
const allTags = ref([]);
const selectedTags = ref([]);
const tagInput = ref('');
const tagSuggestions = ref([]);

const fetchTags = async () => {
  try {
    const res = await axios.get(`/api/pm/doc-tags/?project_id=${currentProjectId}`);
    allTags.value = res.data;
  } catch {}
};

const filterTagSuggestions = () => {
  const q = tagInput.value.toLowerCase();
  if (!q) { tagSuggestions.value = []; return; }
  tagSuggestions.value = allTags.value.filter(
    t => t.name.toLowerCase().includes(q) && !selectedTags.value.find(s => s.id === t.id)
  );
};

const selectTag = (tag) => {
  if (!selectedTags.value.find(t => t.id === tag.id))
    selectedTags.value.push(tag);
  tagInput.value = '';
  tagSuggestions.value = [];
};

const removeTag = (id) => {
  selectedTags.value = selectedTags.value.filter(t => t.id !== id);
};

const addOrCreateTag = async () => {
  const name = tagInput.value.trim();
  if (!name) return;
  const existing = allTags.value.find(t => t.name.toLowerCase() === name.toLowerCase());
  if (existing) { selectTag(existing); return; }
  try {
    const colors = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const res = await axios.post('/api/pm/doc-tags/', { project: currentProjectId, name, color });
    allTags.value.push(res.data);
    selectTag(res.data);
  } catch {}
};

const fetchPossibleParents = async () => {
    try {
        const response = await axios.get(`/api/pm/docs/?project_id=${currentProjectId}`);
        // Create a flat list with indentation to show hierarchy
        const allDocs = response.data;
        const result = [];
        const currentDocId = parseInt(docIdToEdit);

        const formatTree = (items, level = 0) => {
            items.forEach(item => {
                if (item.id === currentDocId) return; // Skip self
                result.push({
                    ...item,
                    displayTitle: "—".repeat(level) + " " + item.title
                });
                const children = allDocs.filter(d => d.parent === item.id);
                if (children.length > 0) {
                    formatTree(children, level + 1);
                }
            });
        };

        const roots = allDocs.filter(d => d.parent === null);
        formatTree(roots);
        possibleParents.value = result;
    } catch (err) {
        console.error(err);
    }
}

const fetchProjectDetails = async () => {
    try {
        const res = await axios.get(`/api/pm/projects/${currentProjectId}/`);
        projectTitle.value = res.data.name;
    } catch(err) { console.error(err); }
}

const fetchDocToEdit = async () => {
    if(!docIdToEdit) return;
    isEditing.value = true;
    try {
        const res = await axios.get(`/api/pm/docs/${docIdToEdit}/`);
        doc.value.title = res.data.title;
        doc.value.content = res.data.content;
        doc.value.parent = res.data.parent;
        doc.value.order = res.data.order;
        doc.value.tags = res.data.tags || [];
        selectedTags.value = res.data.tags_details || [];
    } catch(err) { console.error(err); }
}

const showDeleteConfirm = ref(false);

// ── Templates ──────────────────────────────────────────────────────────
const showTemplates = ref(false);
const docTemplates = [
  {
    name: 'دليل البدء السريع',
    desc: 'خطوات التثبيت والإعداد',
    icon: 'fa-solid fa-rocket',
    content: `# دليل البدء السريع

## المتطلبات
- Node.js >= 18
- Python >= 3.10

## التثبيت
\`\`\`bash
git clone https://github.com/your/repo.git
cd repo
npm install
\`\`\`

## التشغيل
\`\`\`bash
npm run dev
\`\`\`

## الخطوات التالية
- [ ] إعداد متغيرات البيئة
- [ ] تهيئة قاعدة البيانات
- [ ] تشغيل الاختبارات
`
  },
  {
    name: 'توثيق API',
    desc: 'وصف endpoint مع أمثلة',
    icon: 'fa-solid fa-plug',
    content: `# اسم الـ API

## الوصف
وصف مختصر لما يفعله هذا الـ endpoint.

## المسار
\`\`\`
POST /api/v1/resource/
\`\`\`

## المعاملات (Parameters)

| الاسم | النوع | مطلوب | الوصف |
|-------|-------|--------|-------|
| name  | string | ✅ | اسم المورد |
| value | number | ❌ | القيمة الافتراضية |

## مثال على الطلب
\`\`\`json
{
  "name": "example",
  "value": 42
}
\`\`\`

## مثال على الاستجابة
\`\`\`json
{
  "id": 1,
  "name": "example",
  "created_at": "2025-01-01T00:00:00Z"
}
\`\`\`

## رموز الأخطاء
| الكود | المعنى |
|-------|--------|
| 400 | بيانات غير صحيحة |
| 401 | غير مصرح |
| 404 | غير موجود |
`
  },
  {
    name: 'سجل التغييرات',
    desc: 'Changelog للإصدارات',
    icon: 'fa-solid fa-list-check',
    content: `# سجل التغييرات

## [غير مُصدَر]

## [1.0.0] - ${new Date().toISOString().split('T')[0]}

### ✨ جديد
- ميزة أولى
- ميزة ثانية

### 🐛 إصلاحات
- إصلاح مشكلة كذا

### ⚠️ تغييرات جوهرية
- لا يوجد
`
  },
  {
    name: 'معمارية النظام',
    desc: 'وصف هيكل المشروع',
    icon: 'fa-solid fa-sitemap',
    content: `# معمارية النظام

## نظرة عامة
وصف مختصر للنظام وهدفه.

## المكونات الرئيسية

\`\`\`mermaid
graph TD
    A[Frontend Vue.js] --> B[API Gateway]
    B --> C[Backend Django]
    C --> D[(Database)]
    C --> E[Cache Redis]
\`\`\`

## طبقات التطبيق

| الطبقة | التقنية | الوصف |
|--------|---------|-------|
| Frontend | Vue 3 | واجهة المستخدم |
| Backend | Django | منطق الأعمال |
| Database | PostgreSQL | تخزين البيانات |

## تدفق البيانات
1. المستخدم يرسل طلب من الـ Frontend
2. يمر عبر الـ API Gateway
3. يعالجه الـ Backend
4. يُخزَّن في قاعدة البيانات
`
  },
  {
    name: 'تقرير خطأ / Bug',
    desc: 'قالب توثيق المشاكل',
    icon: 'fa-solid fa-bug',
    content: `# تقرير خطأ

## الوصف
وصف واضح للمشكلة.

## خطوات إعادة الإنتاج
1. اذهب إلى ...
2. اضغط على ...
3. لاحظ الخطأ

## السلوك المتوقع
ما الذي كان يجب أن يحدث؟

## السلوك الفعلي
ما الذي حدث بالفعل؟

## البيئة
- النظام: Windows / macOS / Linux
- المتصفح: Chrome 120
- الإصدار: v1.0.0

## لقطة الشاشة
<!-- أضف صورة هنا إن وجدت -->
`
  },
];

const applyTemplate = (tpl) => {
  doc.value.content = tpl.content;
  if (!doc.value.title) doc.value.title = tpl.name;
  showTemplates.value = false;
  toast(`تم تطبيق قالب "${tpl.name}"`, 'success');
};

// ── Toast ──────────────────────────────────────────────────────────────
const toasts = ref([]);
let toastCounter = 0;
const toast = (message, type = 'success') => {
  const id = ++toastCounter;
  toasts.value.push({ id, message, type });
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 3500);
};

// ── Autosave ───────────────────────────────────────────────────────────
const draftKey = `doc_draft_${currentProjectId}_${docIdToEdit || 'new'}`;
const hasDraft = ref(false);
const lastSavedAt = ref(null);
let autosaveTimer = null;

const saveDraft = () => {
  localStorage.setItem(draftKey, JSON.stringify({
    title: doc.value.title,
    content: doc.value.content,
    parent: doc.value.parent,
    order: doc.value.order,
    savedAt: new Date().toISOString()
  }));
  lastSavedAt.value = new Date();
};

const clearDraft = () => {
  localStorage.removeItem(draftKey);
  hasDraft.value = false;
};

const restoreDraft = () => {
  const raw = localStorage.getItem(draftKey);
  if (!raw) return;
  const draft = JSON.parse(raw);
  doc.value.title   = draft.title;
  doc.value.content = draft.content;
  doc.value.parent  = draft.parent;
  doc.value.order   = draft.order;
  hasDraft.value = false;
  toast('تم استرجاع المسودة المحفوظة', 'info');
};

const discardDraft = () => {
  clearDraft();
  // reload original from server if editing
  if (isEditing.value) fetchDocToEdit();
  else doc.value = { project: currentProjectId, parent: null, title: '', content: '# عنوان الدرس...\n\nابدأ بكتابة المحتوى هنا...', order: 0 };
};

const checkForDraft = () => {
  const raw = localStorage.getItem(draftKey);
  if (raw) hasDraft.value = true;
};

const startAutosave = () => {
  autosaveTimer = setInterval(saveDraft, 30000);
};

const formatSavedAt = (date) => {
  if (!date) return '';
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
};

// Warn before leaving with unsaved changes
const handleBeforeUnload = (e) => {
  saveDraft();
  e.preventDefault();
  e.returnValue = '';
};

const deleteDocument = () => {
    showDeleteConfirm.value = true;
}

const confirmDeleteDocument = async () => {
    try {
        await axios.delete(`/api/pm/docs/${docIdToEdit}/`);
        router.push(`/projects/${currentProjectId}/docs`);
    } catch (error) {
        console.error('Delete error:', error);
        toast('حدث خطأ أثناء الحذف', 'error');
    } finally {
        showDeleteConfirm.value = false;
    }
}

const saveDocument = async () => {
    if(!doc.value.title || !doc.value.content) {
        toast('يرجى إدخال العنوان والمحتوى', 'error');
        return;
    }
    loadingSave.value = true;
    try {
        const payload = { ...doc.value, tags: selectedTags.value.map(t => t.id) };
        if(isEditing.value) {
            await axios.put(`/api/pm/docs/${docIdToEdit}/`, payload);
        } else {
            await axios.post('/api/pm/docs/', payload);
        }
        isSuccess.value = true;
        clearDraft();
        if (collab) collab.broadcastDocUpdated(doc.value.title);
        toast(isEditing.value ? 'تم تحديث التوثيق بنجاح' : 'تم حفظ التوثيق بنجاح', 'success');
        setTimeout(() => {
           isSuccess.value = false;
           router.push(`/projects/${currentProjectId}/docs`);
        }, 1200);
    } catch (error) {
        console.error('Save error:', error);
        toast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
        loadingSave.value = false;
    }
};

onMounted(() => {
    fetchProjectDetails();
    fetchDocToEdit();
    fetchPossibleParents();
    fetchTags();
    checkForDraft();
    startAutosave();
    window.addEventListener('beforeunload', handleBeforeUnload);
    if (collab) collab.connect();

    themeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                currentTheme.value = document.documentElement.getAttribute('data-theme') || 'light';
            }
        });
    });
    themeObserver.observe(document.documentElement, { attributes: true });
});

/**
 * Handle image uploads from the MdEditor toolbar.
 * Receives an array of File objects + a callback to insert the Markdown into the editor.
 */
const handleUploadImg = async (files, callback) => {
    const urls = [];
    for (const file of files) {
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await axios.post('/api/pm/upload-image/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            urls.push(res.data.url);
        } catch (err) {
            console.error('Image upload failed:', err);
        }
    }
    // callback receives array of { url, alt?, title? } objects
    callback(urls.map(url => ({ url, alt: 'image', title: 'image' })));
};

onUnmounted(() => {
    if (themeObserver) themeObserver.disconnect();
    if (autosaveTimer) clearInterval(autosaveTimer);
    window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Inter:wght@400;500;600&display=swap');

.vp-editor-view {
  font-family: 'Inter', 'Tajawal', sans-serif;
  background-color: var(--bg-body);
  color: var(--text-main);
  min-height: 100%;
}

/* Header & Glassmorphism */
.vp-editor-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 72px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
}

.header-container {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bc-section {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary);
  font-weight: 600;
}

.bc-icon { font-size: 20px; }
.bc-sep { font-size: 10px; color: var(--text-muted); }
.bc-current { font-weight: 700; color: var(--text-main); font-size: 16px; }

.header-actions {
  display: flex;
  gap: 12px;
}

/* Form Layout */
.vp-editor-body {
  padding: 24px;
  display: flex;
  justify-content: center;
}

.vp-editor-card {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 32px;
  box-shadow: var(--shadow-md);
}

.vp-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.full-width { grid-column: span 2; }

.form-group { display: flex; flex-direction: column; gap: 8px; }

.elite-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  padding-right: 4px;
}

.elite-input, .elite-select {
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-main);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.title-input { font-size: 20px; font-weight: 700; padding: 16px; border-color: transparent; background: var(--bg-hover); }
.title-input:focus { border-color: var(--primary); background: var(--bg-surface); }

.elite-input:focus, .elite-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-bg);
}

.select-wrapper { position: relative; width: 100%; }
.elite-select { appearance: none; padding-left: 40px; }
.select-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; font-size: 12px; }

/* Editor Stylings */
.editor-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--primary-bg);
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--primary);
}

.markdown-icon { font-size: 20px; }

/* Templates */
.templates-trigger { position: relative; }
.template-toggle-btn {
  padding: 8px 16px; border-radius: 10px; border: 1px solid var(--border-color);
  background: var(--bg-surface); color: var(--text-main); cursor: pointer;
  font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 6px;
  transition: 0.2s;
}
.template-toggle-btn:hover { background: var(--bg-hover); border-color: var(--primary); color: var(--primary); }
.templates-dropdown {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 1000;
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px;
  box-shadow: var(--shadow-lg); min-width: 320px; padding: 8px; display: flex; flex-direction: column; gap: 4px;
}
.template-item {
  padding: 12px 14px; border-radius: 10px; cursor: pointer; display: flex; align-items: flex-start; gap: 12px;
  transition: 0.2s;
}
.template-item:hover { background: var(--bg-hover); }
.template-item i { font-size: 1.2rem; color: var(--primary); margin-top: 2px; }
.tpl-name { font-size: 0.9rem; font-weight: 700; color: var(--text-main); }
.tpl-desc { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }
.dropdown-v-enter-active, .dropdown-v-leave-active { transition: all 0.2s ease; }
.dropdown-v-enter-from, .dropdown-v-leave-to { opacity: 0; transform: translateY(-10px); }

.markdown-editor-container {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.sentry-md-editor { border: none !important; }

:deep(.markdown-body) {
  font-family: inherit !important;
  color: var(--text-main) !important;
  background: transparent !important;
  padding: 24px !important;
}

:deep(.markdown-body h1), :deep(.markdown-body h2), :deep(.markdown-body h3) {
  border-bottom: none !important;
  font-weight: 600 !important;
}

:deep(.markdown-body table) {
  display: table !important;
  width: 100% !important;
  background-color: var(--bg-card) !important;
  border-collapse: collapse !important;
  border: 1px solid var(--border-color) !important;
  color: var(--text-main) !important;
}

:deep(.markdown-body table tr) {
  background-color: var(--bg-card) !important;
  border-top: 1px solid var(--border-color) !important;
}

:deep(.markdown-body table tr:nth-child(2n)) {
  background-color: var(--bg-hover) !important;
}

:deep(.markdown-body table th), :deep(.markdown-body table td) {
  border: 1px solid var(--border-color) !important;
  padding: 12px 16px !important;
}

:deep(.markdown-body table th) {
  background-color: var(--bg-hover) !important;
  color: var(--text-main) !important;
  font-weight: 700 !important;
}

:deep(.markdown-body pre) {
  background-color: #0d1117 !important;
  border-radius: 12px !important;
  padding: 20px !important;
  border: 1px solid var(--border-color) !important;
}

:deep(.md-editor) {
  --md-bk-color: var(--bg-card);
  --md-color: var(--text-main);
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.vp-editor-card {
  animation: fadeIn 0.4s ease-out;
}

/* Tags selector */
.tags-selector { position: relative; }
.tags-selected {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  padding: 8px 12px; border-radius: 12px; border: 2px solid var(--border-color);
  background: var(--bg-surface); min-height: 44px; cursor: text;
  transition: 0.2s;
}
.tags-selected:focus-within { border-color: var(--primary); }
.tag-chip-editor {
  display: flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px;
  font-size: 0.78rem; font-weight: 700; border: 1px solid;
}
.tag-remove-btn { background: none; border: none; cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 2px; opacity: 0.7; }
.tag-remove-btn:hover { opacity: 1; }
.tag-input-inline { border: none; outline: none; background: transparent; font-size: 0.88rem; color: var(--text-main); min-width: 120px; flex: 1; }
.tag-suggestions {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 100;
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px;
  box-shadow: var(--shadow-md); padding: 6px; display: flex; flex-direction: column; gap: 2px;
}
.tag-suggestion-item {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px;
  cursor: pointer; font-size: 0.88rem; font-weight: 600; transition: 0.15s;
}
.tag-suggestion-item:hover { background: var(--bg-hover); }
.tag-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

/* Draft Banner */
.draft-banner {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  padding: 14px 20px; margin: 0 0 20px; border-radius: 14px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
  color: var(--text-main);
}
.draft-banner-content { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 0.9rem; }
.draft-banner-content i { color: var(--primary); font-size: 1.1rem; }
.draft-banner-actions { display: flex; gap: 10px; }
.draft-btn { padding: 8px 16px; border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; border: none; transition: 0.2s; }
.draft-btn.restore { background: var(--primary); color: white; }
.draft-btn.restore:hover { opacity: 0.85; }
.draft-btn.discard { background: var(--bg-hover); color: var(--text-muted); border: 1px solid var(--border-color); }
.draft-btn.discard:hover { color: #ef4444; border-color: #ef4444; }

/* Autosave indicator */
.autosave-indicator { font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.autosave-indicator i { color: #22c55e; }

/* Collab avatars */
.collab-avatars { display: flex; align-items: center; gap: 6px; }
.collab-avatar {
  width: 30px; height: 30px; border-radius: 50%; background: var(--primary);
  color: white; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--bg-card); margin-inline-start: -6px;
}
.collab-avatar:first-child { margin-inline-start: 0; }
.collab-label { font-size: 0.78rem; color: var(--text-muted); margin-inline-start: 6px; }

/* Typing bar */
.typing-bar {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px; margin-top: 8px;
  font-size: 0.82rem; color: var(--text-muted); font-style: italic;
}
.typing-dots { display: flex; gap: 3px; }
.typing-dots span {
  width: 5px; height: 5px; border-radius: 50%; background: var(--primary);
  animation: typingBounce 1.2s infinite ease-in-out;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }

/* Toast */
.toast-holder { position: fixed; bottom: 40px; right: 40px; z-index: 100000; display: flex; flex-direction: column; gap: 15px; pointer-events: none; }
.premium-toast {
  padding: 16px 24px; border-radius: 20px; display: flex; align-items: center; gap: 16px;
  min-width: 320px; background: var(--bg-card); border: 1.5px solid var(--border-color);
  box-shadow: 0 20px 50px rgba(0,0,0,0.15); backdrop-filter: blur(25px);
  animation: toastInV 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.premium-toast.success { border-left: 5px solid #22c55e; }
.premium-toast.error   { border-left: 5px solid #ef4444; }
.premium-toast.info    { border-left: 5px solid var(--primary); }
.toast-icon { font-size: 1.2rem; }
.premium-toast.success .toast-icon { color: #22c55e; }
.premium-toast.error   .toast-icon { color: #ef4444; }
.premium-toast.info    .toast-icon { color: var(--primary); }
.toast-content { font-size: 0.9rem; font-weight: 600; color: var(--text-main); }
@keyframes toastInV { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
[dir="rtl"] .premium-toast { border-left: none; border-right: 5px solid; animation-name: toastInVRTL; }
@keyframes toastInVRTL { from { opacity: 0; transform: translateX(-100px); } to { opacity: 1; transform: translateX(0); } }
</style>
