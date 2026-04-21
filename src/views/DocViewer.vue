<template>
  <div v-if="!canViewDocs && !isSu" class="perm-wall-docs">
    <i class="fa-solid fa-lock"></i>
    <h3>غير مصرح</h3>
    <p>ليس لديك صلاحية للوصول للتوثيق</p>
  </div>
  <div v-else class="glass-docs-canvas" v-if="projectTitle" :dir="isRTL ? 'rtl' : 'ltr'">
    
    <!-- ── PREMIUM FLOATING HEADER ── -->
    <header class="docs-header-island glass-panel-premium">
      <div class="header-container">
        <div class="header-left">
          <div class="glass-breadcrumb">
             <router-link to="/dashboard" class="bc-home-icon"><i class="fa-solid fa-house-chimney"></i></router-link>
             <i class="fa-solid fa-chevron-left bc-arrow" v-if="isRTL"></i>
             <i class="fa-solid fa-chevron-right bc-arrow" v-else></i>
             <span class="bc-project-name">{{ projectTitle }}</span>
             <template v-if="currentDoc">
               <i class="fa-solid fa-chevron-left bc-arrow" v-if="isRTL"></i>
               <i class="fa-solid fa-chevron-right bc-arrow" v-else></i>
               <span class="bc-doc-title">{{ currentDoc.title }}</span>
             </template>
          </div>
        </div>

        <div class="header-right">
          <div class="action-group">
            <div class="export-group">
              <button class="glass-btn-vibrant secondary" :disabled="isExportingFull" @click="showProjectExportMenu = !showProjectExportMenu">
                <i class="fa-solid" :class="isExportingFull ? 'fa-circle-notch fa-spin' : 'fa-file-export'"></i>
                <span class="btn-text hide-tablet">{{ isExportingFull ? t('common.preparing') : 'تصدير المشروع' }}</span>
                <i class="fa-solid fa-chevron-down" style="font-size:0.7rem;opacity:0.6"></i>
              </button>
              <transition name="dropdown-v">
                <div v-if="showProjectExportMenu" class="export-dropdown glass-panel-premium" style="left:0;right:auto;min-width:200px">
                  <button @click="exportFullProjectToPDF(); showProjectExportMenu=false" class="export-item">
                    <i class="fa-solid fa-file-pdf" style="color:#ef4444"></i> تصدير PDF
                  </button>
                  <button @click="exportFullProjectToWord(); showProjectExportMenu=false" class="export-item">
                    <i class="fa-solid fa-file-word" style="color:#2563eb"></i> تصدير Word (.docx)
                  </button>
                </div>
              </transition>
            </div>
            
            <div class="glass-divider-v"></div>
            
            <button class="glass-btn-vibrant outline" @click="triggerZipUpload" :disabled="isExtracting">
              <i class="fa-solid" :class="isExtracting ? 'fa-circle-notch fa-spin' : 'fa-wand-magic-sparkles'"></i>
              <span class="btn-text hide-tablet">{{ isExtracting ? t('common.extracting') : t('docs.extract_api') || 'استخراج API' }}</span>
            </button>
            <input type="file" ref="zipInput" accept=".zip" style="display: none" @change="uploadDjangoZip" />
            
            <div class="glass-divider-v"></div>
            
            <router-link v-if="canCreateDoc || isSu" :to="`/projects/${currentProjectId}/docs/add`" class="glass-btn-vibrant primary">
              <i class="fa-solid fa-plus-circle"></i> 
              <span class="btn-text hide-tablet">{{ t('docs.add_page') || 'إضافة توثيق' }}</span>
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <div class="docs-main-layout">
      <!-- ── PREMIUM FLOATING SIDEBAR ── -->
      <aside class="docs-sidebar-island glass-panel-premium">
        <div class="sidebar-top">
          <div class="glass-search-pod">
            <i class="fa-solid fa-search"></i>
            <input type="text" v-model="searchQuery" :placeholder="t('common.search_placeholder') || 'بحث سريع...'" />
          </div>
          <!-- Tags filter -->
          <div class="tags-filter-row" v-if="projectTags.length > 0">
            <button
              v-for="tag in projectTags"
              :key="tag.id"
              class="tag-chip"
              :class="{ active: activeTagId === tag.id }"
              :style="{ '--tag-color': tag.color }"
              @click="toggleTagFilter(tag.id)"
            >{{ tag.name }}</button>
          </div>
        </div>
        
        <nav class="sidebar-nav-vibrant">
          <div v-if="isLoadingDocs" class="sidebar-loader">
             <div class="premium-spinner primary"></div>
          </div>
          <div v-else class="nav-content-stack">
            <div class="nav-group-header">
              <i class="fa-solid fa-book-open"></i>
              <span>{{ t('docs.documents') || 'المستندات' }}</span>
            </div>
            
            <div class="nav-tree-container" v-if="!searchQuery">
              <SidebarItem 
                v-for="(doc, idx) in roots" 
                :key="doc.id" 
                :doc="doc" 
                :active-id="activeDocId" 
                :is-rtl="isRTL"
                :expanded-ids="expandedIds"
                :level="0"
                draggable="true"
                @dragstart="onDragStart($event, doc, idx)"
                @dragover.prevent="onDragOver($event, idx)"
                @drop="onDrop($event, idx)"
                @select="selectDocument"
                @toggle="toggleExpand"
              />
            </div>

            <!-- Search Results -->
            <div class="nav-tree-container" v-else>
              <div v-if="searchResults.length === 0" class="search-empty">
                <i class="fa-solid fa-magnifying-glass"></i>
                <span>لا توجد نتائج</span>
              </div>
              <div
                v-for="doc in searchResults"
                :key="doc.id"
                class="search-result-pod"
                :class="{ active: activeDocId === doc.id }"
                @click="selectDocument(doc)"
              >
                <div class="search-result-title">
                  <i class="fa-solid fa-file-lines"></i>
                  <span v-html="highlightMatch(doc.title, searchQuery)"></span>
                </div>
                <p v-if="doc.snippet" class="search-result-snippet" v-html="highlightMatch(doc.snippet, searchQuery)"></p>
              </div>
            </div>
            
            <div class="nav-api-shortcut" :class="{ 'active': viewMode === 'apis' }" @click="showApiViewer">
              <div class="shortcut-content">
                <i class="fa-solid fa-laptop-code"></i>
                <span>{{ t('docs.extracted_apis') || 'واجهات API المستخرجة' }}</span>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      <!-- ── MAIN CONTENT AREA ── -->
      <main class="docs-content-root">
        <div class="content-vibrant-grid">
          
          <div class="doc-main-card glass-panel-premium">
            <div class="doc-header-v" v-if="currentDoc">
              <div class="doc-meta-v" v-if="viewMode !== 'apis'">
                <div class="status-glow-pill" v-if="currentDoc.is_published">
                  <span class="glow-dot"></span>
                  <span>{{ t('docs.published') || 'منشور' }}</span>
                </div>
                <span class="last-updated-v">{{ t('docs.last_updated') || 'آخر تحديث' }}: {{ formatDate(currentDoc.updated_at) }}</span>
              </div>
              
              <h1 class="doc-main-title">{{ currentDoc.title }}</h1>
              <!-- Tags -->
              <div class="doc-tags-row" v-if="currentDoc.tags_details && currentDoc.tags_details.length > 0">
                <span
                  v-for="tag in currentDoc.tags_details"
                  :key="tag.id"
                  class="doc-tag-badge"
                  :style="{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '55' }"
                >{{ tag.name }}</span>
              </div>
              
              <div class="doc-action-bar" v-if="viewMode !== 'apis'">
                <!-- Collaborators presence -->
                <div class="collab-presence" v-if="collaborators.length > 0">
                  <div v-for="u in collaborators" :key="u" class="collab-avatar" :title="u">
                    {{ u.charAt(0).toUpperCase() }}
                  </div>
                  <span class="collab-typing" v-if="typingUser">{{ typingUser }} يكتب...</span>
                </div>

                <router-link v-if="canEditDoc || isSu" :to="`/projects/${currentProjectId}/docs/${activeDocId}/edit`" class="glass-doc-action">
                  <i class="fa-solid fa-pen-nib"></i> <span>{{ t('common.edit') }}</span>
                </router-link>
                <button class="glass-doc-action" @click="openHistoryDialog">
                  <i class="fa-solid fa-history"></i> <span>{{ t('docs.history') || 'سجل المراجعات' }}</span>
                </button>
                <button class="glass-doc-action" @click="exportToPDF">
                  <i class="fa-solid fa-file-pdf"></i> <span>PDF</span>
                </button>
                <div class="export-group">
                  <button class="glass-doc-action" @click="showExportMenu = !showExportMenu">
                    <i class="fa-solid fa-download"></i> <span>تصدير</span>
                    <i class="fa-solid fa-chevron-down" style="font-size:0.7rem;opacity:0.6"></i>
                  </button>
                  <transition name="dropdown-v">
                    <div v-if="showExportMenu" class="export-dropdown glass-panel-premium">
                      <button @click="exportToPDF(); showExportMenu=false" class="export-item">
                        <i class="fa-solid fa-file-pdf"></i> PDF
                      </button>
                      <button @click="exportToWord(); showExportMenu=false" class="export-item">
                        <i class="fa-solid fa-file-word"></i> Word (.docx)
                      </button>
                      <button @click="exportToMarkdown(); showExportMenu=false" class="export-item">
                        <i class="fa-brands fa-markdown"></i> Markdown (.md)
                      </button>
                    </div>
                  </transition>
                </div>
                <button class="glass-doc-action" @click="commentsOpen = !commentsOpen">
                  <i class="fa-solid fa-comments"></i>
                  <span>تعليقات</span>
                  <span v-if="comments.length > 0" class="comment-badge">{{ comments.length }}</span>
                </button>

                <div class="export-group">
                  <button class="glass-doc-action" @click="showCopyMoveMenu = !showCopyMoveMenu">
                    <i class="fa-solid fa-copy"></i> <span>نسخ/نقل</span>
                  </button>
                  <transition name="dropdown-v">
                    <div v-if="showCopyMoveMenu" class="export-dropdown glass-panel-premium">
                      <div class="copy-move-project-list">
                        <p style="font-size:0.8rem;color:var(--text-muted);padding:8px 14px 4px;margin:0">اختر المشروع:</p>
                        <div
                          v-for="p in allProjects"
                          :key="p.id"
                          class="copy-move-project-item"
                        >
                          <span>{{ p.name }}</span>
                          <div style="display:flex;gap:6px">
                            <button class="export-item" @click="copyDoc(p.id); showCopyMoveMenu=false" title="نسخ">
                              <i class="fa-solid fa-copy"></i>
                            </button>
                            <button class="export-item" @click="moveDoc(p.id); showCopyMoveMenu=false" title="نقل">
                              <i class="fa-solid fa-right-left"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </transition>
                </div>
                
                <div class="spacer"></div>
                
                <button v-if="canDeleteDoc || isSu" class="glass-doc-action danger" @click="confirmDelete">
                  <i class="fa-solid fa-trash-alt"></i> <span>{{ t('common.delete') }}</span>
                </button>
              </div>

              <!-- Doc updated banner -->
              <div v-if="docUpdatedBy" class="doc-updated-banner">
                <i class="fa-solid fa-rotate"></i>
                <span>{{ docUpdatedBy }} قام بتحديث هذا المستند</span>
                <button @click="reloadDoc" class="banner-reload-btn">تحديث</button>
                <button @click="docUpdatedBy = null" class="banner-close-btn"><i class="fa-solid fa-times"></i></button>
              </div>
            </div>

            <div class="doc-render-body" v-if="viewMode === 'docs' && currentDoc">
              <article class="markdown-body-vibrant" v-html="sanitizedHtml"></article>

              <!-- Comments Panel -->
              <transition name="slide-up">
                <div v-if="commentsOpen" class="comments-panel glass-panel-premium">
                  <div class="comments-header">
                    <h4><i class="fa-solid fa-comments"></i> التعليقات</h4>
                    <button @click="commentsOpen = false" class="btn-close-modal"><i class="fa-solid fa-times"></i></button>
                  </div>
                  <div class="comments-list">
                    <div v-if="isLoadingComments" class="comments-loader">
                      <div class="premium-spinner primary"></div>
                    </div>
                    <div v-else-if="comments.length === 0" class="comments-empty">
                      <i class="fa-regular fa-comment-dots"></i>
                      <span>لا توجد تعليقات بعد</span>
                    </div>
                    <div v-for="c in comments" :key="c.id" class="comment-item">
                      <div class="comment-avatar">{{ c.author.charAt(0).toUpperCase() }}</div>
                      <div class="comment-body">
                        <div class="comment-meta">
                          <span class="comment-author">@{{ c.author }}</span>
                          <span class="comment-date">{{ formatDate(c.created_at) }}</span>
                          <button v-if="c.author === currentUsername" class="comment-delete-btn" @click="deleteComment(c.id)">
                            <i class="fa-solid fa-trash-alt"></i>
                          </button>
                        </div>
                        <p class="comment-text">{{ c.content }}</p>
                      </div>
                    </div>
                  </div>
                  <div class="comment-input-row">
                    <input
                      v-model="newComment"
                      type="text"
                      placeholder="اكتب تعليقاً..."
                      class="comment-input"
                      @keyup.enter="sendComment"
                    />
                    <button class="comment-send-btn" @click="sendComment" :disabled="!newComment.trim()">
                      <i class="fa-solid fa-paper-plane"></i>
                    </button>
                  </div>
                </div>
              </transition>
            </div>

            <div v-else-if="viewMode === 'apis'" class="doc-render-body api-mode">
              <ProjectApiViewer :project-id="currentProjectId" ref="apiViewerRef" />
            </div>

            <div v-else-if="viewMode === 'docs'" class="empty-docs-state-xl glass-morphic">
              <div class="empty-glow-ring ghost-pulse">
                <i class="fa-solid fa-book-journal-whills"></i>
              </div>
              <h3>{{ t('docs.ready_to_browse') || 'جاهز لاستعراض التوثيق؟' }}</h3>
              <p>{{ t('docs.select_page_hint') || 'اختر صفحة من القائمة الجانبية أو ابدأ بإنشاء توثيق جديد لمشروعك.' }}</p>
              <router-link v-if="canCreateDoc || isSu" :to="`/projects/${currentProjectId}/docs/add`" class="glass-btn-vibrant primary large mt-6">
                {{ t('docs.start_now') || 'ابدأ الآن' }}
              </router-link>
            </div>
          </div>

          <!-- ── TABLE OF CONTENTS (TOC) ── -->
          <aside class="docs-toc-island glass-panel-premium" v-if="currentDoc && tocItems.length > 0">
            <div class="toc-header">
              <i class="fa-solid fa-list-ul"></i>
              <span>{{ t('docs.on_this_page') || 'في هذه الصفحة' }}</span>
            </div>
            <nav class="toc-nav-v">
              <ul class="toc-list-v">
                <li 
                  v-for="item in tocItems" 
                  :key="item.id" 
                  :class="['toc-item-v', 'lv-' + item.level, { active: activeHeading === item.id }]"
                  @click="scrollToHeading(item.id)"
                >
                  <span class="toc-bullet" v-if="item.level > 2"></span>
                  {{ item.text }}
                </li>
              </ul>
            </nav>
          </aside>
        </div>
      </main>
    </div>

    <!-- ── MODALS (REVISIONS) ── -->
    <Teleport to="body">
      <transition name="fade-blur">
        <div v-if="historyDialog" class="glass-modal-overlay" @click.self="historyDialog = false">
          <div class="glass-modal-container glass-panel-premium">
            <div class="modal-header-v">
              <h3><i class="fa-solid fa-history"></i> {{ t('docs.revisions') || 'المراجعات السابقة' }}</h3>
              <button @click="historyDialog = false" class="btn-close-modal"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="modal-body-v">
              <div v-if="isLoadingHistory" class="modal-loader">
                <div class="premium-spinner primary"></div>
              </div>
              <div v-else class="revision-timeline-v">
                <div v-for="rev in revisions" :key="rev.id" class="rev-item-v glass-panel-premium">
                  <div class="rev-info-c">
                    <span class="rev-user-v">@{{ rev.editor_name || 'محرر' }}</span>
                    <span class="rev-date-v">{{ formatDate(rev.created_at) }}</span>
                  </div>
                  <div class="rev-actions-v">
                    <button class="btn-rev preview" @click="viewOldRevision(rev.content)"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-rev restore" @click="restoreRevision(rev.content)"><i class="fa-solid fa-undo"></i></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Version Preview Dialog -->
    <Teleport to="body">
       <transition name="fade-blur">
         <div v-if="oldVersionDialog" class="glass-modal-overlay" @click.self="oldVersionDialog = false">
          <div class="glass-modal-container large glass-panel-premium">
            <div class="modal-header-v">
              <h3>{{ t('docs.preview_revision') || 'معاينة النسخة' }}</h3>
              <button @click="oldVersionDialog = false" class="btn-close-modal"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="modal-body-v preview-area">
               <article class="markdown-body-vibrant" v-html="oldVersionHtml"></article>
            </div>
          </div>
        </div>
       </transition>
    </Teleport>

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

    <!-- Confirm Modals -->
    <ConfirmModal 
      :isOpen="showDeleteConfirm" 
      :title="t('common.confirm_delete') || 'تأكيد الحذف'" 
      :message="t('docs.delete_doc_confirm') || 'هل أنت متأكد من حذف هذه الصفحة؟ لا يمكن التراجع عن هذا الإجراء.'" 
      :confirmText="t('common.delete')" 
      :cancelText="t('common.cancel')" 
      type="danger" 
      @confirm="executeDelete" 
      @cancel="showDeleteConfirm = false" 
    />

    <ConfirmModal 
      :isOpen="showRestoreConfirm" 
      :title="t('docs.restore_confirm_title') || 'استعادة المراجعة'" 
      :message="t('docs.restore_confirm_body') || 'سيتم استبدال المحتوى الحالي بالنسخة المختارة. هل أنت متأكد؟'" 
      :confirmText="t('common.restore') || 'استعادة'" 
      :cancelText="t('common.cancel')" 
      type="primary" 
      @confirm="executeRestore" 
      @cancel="showRestoreConfirm = false" 
    />
  </div>
</template>

<script>
// Recursive Sidebar Item Component
const SidebarItem = {
  name: 'SidebarItem',
  props: ['doc', 'activeId', 'isRtl', 'expandedIds', 'level'],
  emits: ['select', 'toggle'],
  template: `
    <div class="nav-v-tree-row" :style="{ '--nav-depth': level || 0 }">
      <div 
        @click="$emit('select', doc)"
        class="tree-link-pod"
        :class="{ active: activeId === doc.id, 'has-kids': doc.children?.length > 0 }"
      >
        <div class="pod-inner">
          <div 
            v-if="doc.children?.length > 0" 
            class="toggle-chevron" 
            @click.stop="$emit('toggle', doc.id)"
            :class="{ expanded: expandedIds.has(doc.id) }"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </div>
          <div v-else class="file-bullet"></div>
          
          <span class="pod-title">{{ doc.title }}</span>
        </div>
      </div>
      
      <transition name="dropdown-v">
        <div v-if="doc.children?.length > 0 && expandedIds.has(doc.id)" class="tree-sub-group">
          <SidebarItem 
            v-for="child in doc.children" 
            :key="child.id" 
            :doc="child" 
            :active-id="activeId" 
            :is-rtl="isRtl"
            :expanded-ids="expandedIds"
            :level="(level || 0) + 1"
            @select="$emit('select', $event)"
            @toggle="$emit('toggle', $event)"
          />
        </div>
      </transition>
    </div>
  `
};

export default {
  components: { SidebarItem }
};
</script>

<script setup>
import { ref, onMounted, computed, watch, nextTick, onUnmounted } from 'vue';
import axios from '@/plugins/axios';
import { useRoute, useRouter } from 'vue-router';
import ProjectApiViewer from '../components/ProjectApiViewer.vue';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import 'github-markdown-css/github-markdown.css';
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';
import ConfirmModal from '../components/ConfirmModal.vue';
import { useI18n } from 'vue-i18n';
import { usePermissions } from '@/composables/usePermissions';
import { getWsBase } from '@/plugins/wsUrl';

const { t } = useI18n();
const { canViewDocs, isSuperuser: isSu, canCreateDoc, canEditDoc, canDeleteDoc } = usePermissions();

// Lazy-load mermaid on first use
let _mermaid = null;
async function getMermaid() {
  if (!_mermaid) {
    const mod = await import('mermaid');
    _mermaid = mod.default;
    _mermaid.initialize({
      startOnLoad: false,
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'neutral',
      securityLevel: 'loose',
      flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
      themeVariables: {
        darkMode: document.documentElement.getAttribute('data-theme') === 'dark',
        background: 'transparent',
        mainBkg: 'transparent',
      }
    });
  }
  return _mermaid;
}

const md = new MarkdownIt({ 
  html: true, 
  linkify: true, 
  typographer: true,
  breaks: true 
}).set({
  highlight: function (str, lang) {
    if (lang === 'mermaid') {
      return `<pre class="mermaid">${str}</pre>`;
    }
    return ''; // use internal code highlight
  }
});

// ── Custom Embeds (YouTube, Figma) ────────────────────────────────────
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = token.attrGet('href');
  
  // YouTube embed: [youtube](https://www.youtube.com/watch?v=VIDEO_ID)
  if (href && href.match(/youtube\.com\/watch\?v=|youtu\.be\//)) {
    const videoId = href.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
    if (videoId) {
      return `<div class="embed-container youtube-embed">
        <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>`;
    }
  }
  
  // Figma embed: [figma](https://www.figma.com/file/...)
  if (href && href.includes('figma.com/file/')) {
    return `<div class="embed-container figma-embed">
      <iframe src="https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(href)}" allowfullscreen></iframe>
    </div>`;
  }
  
  return self.renderToken(tokens, idx, options);
};

// Skip link_close for embeds
const originalLinkClose = md.renderer.rules.link_close || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_close = (tokens, idx, options, env, self) => {
  const openToken = tokens[idx - 2];
  if (openToken && openToken.type === 'link_open') {
    const href = openToken.attrGet('href');
    if (href && (href.includes('youtube.com') || href.includes('youtu.be') || href.includes('figma.com'))) {
      return ''; // Already rendered in link_open
    }
  }
  return originalLinkClose(tokens, idx, options, env, self);
};

const route = useRoute();
const router = useRouter();
const currentProjectId = ref(route.params.projectId);

const projectTitle = ref('');
const documents = ref([]);
const searchQuery = ref('');
const currentDoc = ref(null);
const activeDocId = ref(null);
const isLoadingDocs = ref(false);
const isRTL = ref(document.documentElement.dir === 'rtl');
const expandedIds = ref(new Set());
const activeHeading = ref('');
const isExportingFull = ref(false);
const showProjectExportMenu = ref(false);
const isExtracting = ref(false);
const zipInput = ref(null);
const viewMode = ref('docs'); // 'docs' or 'apis'
const apiViewerRef = ref(null);

const historyDialog = ref(false);
const isLoadingHistory = ref(false);
const revisions = ref([]);
const oldVersionDialog = ref(false);
const oldVersionHtml = ref('');

const showDeleteConfirm = ref(false);
const showExportMenu = ref(false);

// ── Toast ──────────────────────────────────────────────────────────────
const toasts = ref([]);
let toastCounter = 0;
const toast = (message, type = 'success') => {
  const id = ++toastCounter;
  toasts.value.push({ id, message, type });
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 3500);
};

// ── Real-time Collaboration ────────────────────────────────────────────
const collaborators = ref([]);
const typingUser = ref(null);
const docUpdatedBy = ref(null);
const commentsOpen = ref(false);
const comments = ref([]);
const newComment = ref('');
const isLoadingComments = ref(false);
const currentUsername = localStorage.getItem('username') || '';
let docSocket = null;
let typingTimer = null;

const connectDocSocket = (docId) => {
  if (docSocket) docSocket.close();
  const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
  const wsBase = getWsBase();
  docSocket = new WebSocket(`${wsBase}/ws/projects/${currentProjectId.value}/docs/${docId}/?token=${token}`);

  docSocket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'presence') {
      if (data.is_online) {
        if (!collaborators.value.includes(data.username) && data.username !== currentUsername)
          collaborators.value.push(data.username);
      } else {
        collaborators.value = collaborators.value.filter(u => u !== data.username);
      }
    } else if (data.type === 'typing') {
      typingUser.value = data.is_typing ? data.username : null;
      if (data.is_typing) {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => { typingUser.value = null; }, 3000);
      }
    } else if (data.type === 'comment_added') {
      if (!comments.value.find(c => c.id === data.comment.id))
        comments.value.push(data.comment);
    } else if (data.type === 'comment_deleted') {
      comments.value = comments.value.filter(c => c.id !== data.comment_id);
    } else if (data.type === 'doc_updated') {
      docUpdatedBy.value = data.username;
    }
  };

  docSocket.onclose = () => {
    collaborators.value = [];
    typingUser.value = null;
  };
};

const fetchComments = async (docId) => {
  isLoadingComments.value = true;
  try {
    const res = await axios.get(`/api/pm/doc-comments/?document=${docId}`);
    comments.value = res.data;
  } catch (e) { console.error(e); }
  finally { isLoadingComments.value = false; }
};

const sendComment = () => {
  const content = newComment.value.trim();
  if (!content || !docSocket || docSocket.readyState !== WebSocket.OPEN) return;
  docSocket.send(JSON.stringify({ type: 'add_comment', content }));
  newComment.value = '';
};

const deleteComment = (id) => {
  if (!docSocket || docSocket.readyState !== WebSocket.OPEN) return;
  docSocket.send(JSON.stringify({ type: 'delete_comment', comment_id: id }));
};

const reloadDoc = async () => {
  docUpdatedBy.value = null;
  const res = await axios.get(`/api/pm/docs/${activeDocId.value}/`);
  currentDoc.value = res.data;
  nextTick(() => initMermaid());
};

const processedData = computed(() => {
  if (!currentDoc.value || !currentDoc.value.content) return { html: '', toc: [] };
  
  let rawHtml = md.render(currentDoc.value.content);
  
  const items = [];
  let headingCount = 0;
  
  const processedHtml = rawHtml.replace(/<h([2-4])(.*?)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, content) => {
    const id = `heading-${headingCount}`;
    const text = content.replace(/<[^>]*>?/gm, '').trim(); 
    items.push({ id, text, level: parseInt(level) });
    headingCount++;
    return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
  });
  
  return {
    html: DOMPurify.sanitize(processedHtml, { ADD_ATTR: ['id'] }),
    toc: items
  };
});

const sanitizedHtml = computed(() => processedData.value.html);
const tocItems = computed(() => processedData.value.toc);

const scrollToHeading = (id) => {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    activeHeading.value = id;
  }
};

const searchResults = computed(() => {
    if (!searchQuery.value) return null;
    const q = searchQuery.value.toLowerCase();
    return documents.value.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.content && d.content.toLowerCase().includes(q))
    ).map(d => {
        // Build a short content snippet around the match
        let snippet = null;
        if (d.content && d.content.toLowerCase().includes(q) && !d.title.toLowerCase().includes(q)) {
            const idx = d.content.toLowerCase().indexOf(q);
            const start = Math.max(0, idx - 40);
            const end = Math.min(d.content.length, idx + q.length + 40);
            snippet = (start > 0 ? '...' : '') + d.content.slice(start, end) + (end < d.content.length ? '...' : '');
        }
        return { ...d, snippet };
    });
});

const roots = computed(() => {
    if (searchQuery.value) return [];
    return documents.value.filter(d => d.parent === null);
});

const toggleExpand = (id) => {
    if (expandedIds.value.has(id)) expandedIds.value.delete(id);
    else expandedIds.value.add(id);
};

const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="search-highlight">$1</mark>');
};

const formatDate = (dateStr) => {
    if(!dateStr) return '';
    return new Date(dateStr).toLocaleString(isRTL.value ? 'ar-EG' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const initMermaid = async () => {
    try {
        await nextTick();
        const mermaid = await getMermaid();
        await mermaid.run({
            querySelector: '.mermaid'
        });
    } catch (e) {
        console.warn('Mermaid initialization warning:', e);
    }
};

const fetchProjectDetails = async () => {
    try {
        const res = await axios.get(`/api/pm/projects/${currentProjectId.value}/`);
        projectTitle.value = res.data.name;
    } catch(err) { console.error(err); }
};

const fetchProjectDocuments = async () => {
  isLoadingDocs.value = true;
  try {
    const response = await axios.get(`/api/pm/docs/?project_id=${currentProjectId.value}`);
    documents.value = response.data;
    
    if (documents.value.length > 0) {
      const targetId = route.params.docId || documents.value[0].id;
      const found = documents.value.find(d => d.id == targetId);
      if (found) {
          selectDocument(found);
      } else {
          selectDocument(documents.value[0]);
      }
    }
  } catch (error) {
    console.error('Error fetching docs:', error);
  } finally {
    isLoadingDocs.value = false;
  }
};

const showApiViewer = () => {
    viewMode.value = 'apis';
    currentDoc.value = {
        title: t('docs.extracted_apis') || 'واجهات برمجة التطبيقات (APIs)',
        updated_at: new Date().toISOString()
    };
    activeDocId.value = null;
    
    if (apiViewerRef.value && apiViewerRef.value.fetchApisFromDatabase) {
        apiViewerRef.value.fetchApisFromDatabase();
    }
};

const selectDocument = (doc) => {
  currentDoc.value = doc;
  activeDocId.value = doc.id;
  viewMode.value = 'docs';
  commentsOpen.value = false;
  comments.value = [];
  docUpdatedBy.value = null;
  collaborators.value = [];

  let parentId = doc.parent;
  const newExpanded = new Set(expandedIds.value);
  while (parentId) {
    newExpanded.add(parentId);
    const parentDoc = documents.value.find(d => d.id === parentId);
    parentId = parentDoc ? parentDoc.parent : null;
  }
  expandedIds.value = newExpanded;

  connectDocSocket(doc.id);
  fetchComments(doc.id);

  nextTick(() => {
    initMermaid();
  });
};

const openHistoryDialog = async () => {
  if (!activeDocId.value) return;
  historyDialog.value = true;
  isLoadingHistory.value = true;
  try {
    const response = await axios.get(`/api/pm/docs/${activeDocId.value}/history/`);
    revisions.value = response.data;
  } catch (error) {
    console.error('History fetch error:', error);
  } finally {
    isLoadingHistory.value = false;
  }
};

const viewOldRevision = (oldContent) => {
  oldVersionHtml.value = DOMPurify.sanitize(md.render(oldContent));
  oldVersionDialog.value = true;
};

const showRestoreConfirm = ref(false);
const revisionToRestore = ref(null);

const restoreRevision = (oldContent) => {
  revisionToRestore.value = oldContent;
  showRestoreConfirm.value = true;
};

const executeRestore = async () => {
  if (!revisionToRestore.value) return;
  try {
    const username = localStorage.getItem('username') || '';
    await axios.put(`/api/pm/docs/${activeDocId.value}/`, {
      ...currentDoc.value,
      content: revisionToRestore.value
    });
    currentDoc.value.content = revisionToRestore.value;
    historyDialog.value = false;
    toast('تم استعادة النسخة بنجاح', 'success');
  } catch (error) {
    toast('حدث خطأ أثناء الاستعادة', 'error');
  } finally {
    showRestoreConfirm.value = false;
    revisionToRestore.value = null;
  }
};

const triggerZipUpload = () => {
    if (zipInput.value) zipInput.value.click();
};

const uploadDjangoZip = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    isExtracting.value = true;
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        await axios.post(`/api/pm/projects/${currentProjectId.value}/extract-api/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        toast('تم استخراج التوثيق والواجهات بنجاح!', 'success');
        await fetchProjectDocuments();
        showApiViewer();
    } catch (error) {
        console.error('Extraction error:', error);
        toast(error.response?.data?.error || 'حدث خطأ أثناء رفع وتحليل الملف.', 'error');
    } finally {
        isExtracting.value = false;
        if (zipInput.value) zipInput.value.value = '';
    }
};

const exportToPDF = async () => {
  if (!currentDoc.value) return;

  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; top: 0; left: -9999px; width: 794px;
    background: #ffffff; color: #1a1a1a;
    font-family: 'Arial', 'Tajawal', sans-serif;
    font-size: 15px; line-height: 1.7; padding: 40px 48px;
    direction: ${isRTL.value ? 'rtl' : 'ltr'};
  `;

  container.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      h1 { font-size: 28px; font-weight: 900; margin: 0 0 8px; color: #111; }
      h2 { font-size: 22px; font-weight: 700; margin: 28px 0 10px; color: #222; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
      h3 { font-size: 18px; font-weight: 700; margin: 20px 0 8px; color: #333; }
      h4 { font-size: 15px; font-weight: 700; margin: 16px 0 6px; }
      p  { margin: 0 0 14px; }
      a  { color: #3b82f6; text-decoration: underline; }
      code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: monospace; }
      pre { background: #1e293b; color: #e2e8f0; padding: 16px 20px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 13px; }
      pre code { background: none; padding: 0; color: inherit; }
      blockquote { border-${isRTL.value ? 'right' : 'left'}: 4px solid #3b82f6; margin: 16px 0; padding: 10px 16px; background: #eff6ff; color: #1e40af; border-radius: 0 8px 8px 0; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
      th { background: #f1f5f9; font-weight: 700; padding: 10px 14px; border: 1px solid #cbd5e1; text-align: ${isRTL.value ? 'right' : 'left'}; }
      td { padding: 9px 14px; border: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #f8fafc; }
      img { max-width: 100%; height: auto; border-radius: 6px; margin: 12px 0; }
      ul, ol { padding-${isRTL.value ? 'right' : 'left'}: 24px; margin: 0 0 14px; }
      li { margin-bottom: 6px; }
      hr { border: none; border-top: 2px solid #e5e7eb; margin: 24px 0; }
      .doc-title-block { border-bottom: 3px solid #3b82f6; padding-bottom: 16px; margin-bottom: 28px; }
      .doc-meta { font-size: 12px; color: #6b7280; margin-top: 6px; }
    </style>
    <div class="doc-title-block">
      <h1>${currentDoc.value.title}</h1>
      <div class="doc-meta">${t('docs.last_updated') || 'آخر تحديث'}: ${formatDate(currentDoc.value.updated_at)}</div>
    </div>
    <div class="doc-body">${sanitizedHtml.value}</div>
  `;

  document.body.appendChild(container);

  const opt = {
    margin: 10,
    filename: `${currentDoc.value.title || 'document'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
      logging: false,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf().set(opt).from(container).save();
    toast('تم تصدير PDF بنجاح', 'success');
  } catch (err) {
    console.error('PDF export error:', err);
    toast('فشل تصدير PDF', 'error');
  } finally {
    document.body.removeChild(container);
  }
};

const exportToWord = async () => {
  if (!currentDoc.value) return;
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isRTL.value ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
          h1, h2, h3 { color: #333; }
          code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
          pre { background: #f4f4f4; padding: 12px; border-radius: 6px; overflow-x: auto; }
          table { border-collapse: collapse; width: 100%; margin: 16px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: ${isRTL.value ? 'right' : 'left'}; }
          th { background: #f4f4f4; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${currentDoc.value.title}</h1>
        ${sanitizedHtml.value}
      </body>
      </html>
    `;
    const blob = await asBlob(htmlContent);
    saveAs(blob, `${currentDoc.value.title || 'document'}.docx`);
    toast('تم تصدير Word بنجاح', 'success');
  } catch (err) {
    console.error('Word export error:', err);
    toast('فشل تصدير Word', 'error');
  }
};

const exportToMarkdown = () => {
  if (!currentDoc.value) return;
  const content = `# ${currentDoc.value.title}\n\n${currentDoc.value.content}`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${currentDoc.value.title || 'document'}.md`);
  toast('تم تصدير Markdown بنجاح', 'success');
};

const exportFullProjectToPDF = async () => {
  if (isExportingFull.value) return;
  isExportingFull.value = true;

  try {
    const allDocsToPrint = [];
    const traverse = (docs) => {
      docs.forEach(d => {
        allDocsToPrint.push(d);
        if (d.children?.length) traverse(d.children);
      });
    };
    traverse(roots.value);

    const dir = isRTL.value ? 'rtl' : 'ltr';
    const align = isRTL.value ? 'right' : 'left';

    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: fixed; top: 0; left: -9999px; width: 794px;
      background: #ffffff; color: #1a1a1a;
      font-family: Arial, Tajawal, sans-serif;
      font-size: 15px; line-height: 1.7; direction: ${dir};
    `;

    const sharedStyles = `
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        h1 { font-size: 26px; font-weight: 900; margin: 0 0 8px; }
        h2 { font-size: 20px; font-weight: 700; margin: 24px 0 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
        h3 { font-size: 17px; font-weight: 700; margin: 18px 0 6px; }
        p  { margin: 0 0 12px; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: monospace; }
        pre { background: #1e293b; color: #e2e8f0; padding: 14px 18px; border-radius: 8px; margin: 14px 0; font-size: 13px; }
        pre code { background: none; padding: 0; color: inherit; }
        table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 14px; }
        th { background: #f1f5f9; font-weight: 700; padding: 9px 12px; border: 1px solid #cbd5e1; text-align: ${align}; }
        td { padding: 8px 12px; border: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        img { max-width: 100%; height: auto; margin: 10px 0; }
        ul, ol { padding-${align}: 22px; margin: 0 0 12px; }
        li { margin-bottom: 5px; }
        hr { border: none; border-top: 2px solid #e5e7eb; margin: 20px 0; }
      </style>
    `;

    // Cover page
    tempContainer.innerHTML = `
      ${sharedStyles}
      <div style="text-align:center; padding: 120px 40px; page-break-after: always;">
        <h1 style="font-size:42px; margin-bottom:12px; color:#111;">${projectTitle.value}</h1>
        <p style="font-size:18px; color:#6b7280; margin:0;">توثيق المشروع الكامل</p>
        <p style="margin-top:40px; font-size:13px; color:#9ca3af;">${new Date().toLocaleDateString(isRTL.value ? 'ar-EG' : 'en-US', { year:'numeric', month:'long', day:'numeric' })}</p>
      </div>
    `;

    for (const [i, doc] of allDocsToPrint.entries()) {
      const section = document.createElement('div');
      section.style.cssText = `padding: 40px 48px; ${i > 0 ? 'page-break-before: always;' : ''}`;
      section.innerHTML = `
        <h1 style="border-bottom: 3px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px;">${doc.title}</h1>
        ${DOMPurify.sanitize(md.render(doc.content || ''))}
      `;
      tempContainer.appendChild(section);
    }

    // ── APIs section ──────────────────────────────────────────────
    let endpoints = [];
    try {
      const res = await axios.get(`/api/pm/endpoints/?project=${currentProjectId.value}`);
      const raw = res.data.results !== undefined ? res.data.results : res.data;
      endpoints = Array.isArray(raw) ? raw : [];
    } catch {}

    if (endpoints.length > 0) {
      const methodColors = { GET:'#61affe', POST:'#49cc90', PUT:'#fca130', PATCH:'#50e3c2', DELETE:'#f93e3e' };
      const groups = {};
      endpoints.forEach(ep => {
        const g = ep.app_name || 'General';
        if (!groups[g]) groups[g] = [];
        groups[g].push(ep);
      });

      const apiSection = document.createElement('div');
      apiSection.style.cssText = 'padding: 40px 48px; page-break-before: always;';

      let apisHtml = `<h1 style="border-bottom:3px solid #3b82f6; padding-bottom:12px; margin-bottom:20px;">واجهات API المستخرجة</h1>`;

      for (const [groupName, eps] of Object.entries(groups)) {
        apisHtml += `<h2 style="font-size:16px; font-weight:700; margin:20px 0 10px; text-transform:capitalize;">${groupName}</h2>`;
        apisHtml += `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;">
          <thead><tr>
            <th style="background:#f1f5f9;padding:7px 10px;border:1px solid #cbd5e1;text-align:${align};width:75px;">Method</th>
            <th style="background:#f1f5f9;padding:7px 10px;border:1px solid #cbd5e1;text-align:${align};">Path</th>
            <th style="background:#f1f5f9;padding:7px 10px;border:1px solid #cbd5e1;text-align:${align};">Description</th>
            <th style="background:#f1f5f9;padding:7px 10px;border:1px solid #cbd5e1;text-align:${align};">Notes</th>
          </tr></thead><tbody>`;
        eps.forEach((ep, idx) => {
          const color = methodColors[ep.method?.toUpperCase()] || '#999';
          const bg = idx % 2 === 0 ? '#fff' : '#f8fafc';
          apisHtml += `<tr style="background:${bg};">
            <td style="padding:6px 10px;border:1px solid #e2e8f0;vertical-align:top;">
              <span style="background:${color};color:#fff;padding:2px 7px;border-radius:3px;font-weight:700;font-size:10px;font-family:monospace;">${ep.method||''}</span>
            </td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;vertical-align:top;font-family:monospace;font-size:11px;color:#1e40af;direction:ltr;">${ep.path||''}</td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;vertical-align:top;">${ep.description||'—'}</td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;vertical-align:top;">${ep.notes||'—'}</td>
          </tr>`;
        });
        apisHtml += `</tbody></table>`;
      }

      apiSection.innerHTML = apisHtml;
      tempContainer.appendChild(apiSection);
    }

    document.body.appendChild(tempContainer);

    const opt = {
      margin: 0,
      filename: `${projectTitle.value}_Documentation.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794, windowWidth: 794, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    };

    await (await import('html2pdf.js')).default().set(opt).from(tempContainer).save();
    toast('تم تصدير PDF المشروع بنجاح', 'success');
    document.body.removeChild(tempContainer);

  } catch (err) {
    console.error('PDF Project Export error:', err);
    toast('فشل تصدير PDF', 'error');
  } finally {
    isExportingFull.value = false;
  }
};

const exportFullProjectToWord = async () => {
  if (isExportingFull.value) return;
  isExportingFull.value = true;

  try {
    const allDocsToPrint = [];
    const traverse = (docs) => {
      docs.forEach(d => {
        allDocsToPrint.push(d);
        if (d.children?.length) traverse(d.children);
      });
    };
    traverse(roots.value);

    // ── Fetch APIs ────────────────────────────────────────────────
    let endpoints = [];
    try {
      const res = await axios.get(`/api/pm/endpoints/?project=${currentProjectId.value}`);
      const raw = res.data.results !== undefined ? res.data.results : res.data;
      endpoints = Array.isArray(raw) ? raw : [];
    } catch {}

    const dir = isRTL.value ? 'rtl' : 'ltr';
    const align = isRTL.value ? 'right' : 'left';

    let body = `
      <div style="text-align:center; padding: 60px 0 40px; border-bottom: 3px solid #3b82f6; margin-bottom: 40px;">
        <h1 style="font-size:32px; margin:0 0 8px;">${projectTitle.value}</h1>
        <p style="font-size:14px; color:#6b7280; margin:0;">
          ${new Date().toLocaleDateString(isRTL.value ? 'ar-EG' : 'en-US', { year:'numeric', month:'long', day:'numeric' })}
        </p>
      </div>
    `;

    // ── Docs sections ─────────────────────────────────────────────
    for (const [i, doc] of allDocsToPrint.entries()) {
      body += `
        <div style="margin-bottom: 48px; ${i > 0 ? 'border-top: 1px solid #e5e7eb; padding-top: 36px;' : ''}">
          <h1 style="font-size:22px; font-weight:900; margin:0 0 16px; color:#111; border-bottom:2px solid #3b82f6; padding-bottom:8px;">${doc.title}</h1>
          ${DOMPurify.sanitize(md.render(doc.content || ''))}
        </div>
      `;
    }

    // ── APIs section ──────────────────────────────────────────────
    if (endpoints.length > 0) {
      // Group by app_name
      const groups = {};
      endpoints.forEach(ep => {
        const g = ep.app_name || 'General';
        if (!groups[g]) groups[g] = [];
        groups[g].push(ep);
      });

      const methodColors = { GET:'#61affe', POST:'#49cc90', PUT:'#fca130', PATCH:'#50e3c2', DELETE:'#f93e3e' };

      let apisHtml = `
        <div style="border-top: 1px solid #e5e7eb; padding-top: 36px; margin-top: 48px;">
          <h1 style="font-size:22px; font-weight:900; margin:0 0 20px; color:#111; border-bottom:2px solid #3b82f6; padding-bottom:8px;">
            واجهات API المستخرجة
          </h1>
      `;

      for (const [groupName, eps] of Object.entries(groups)) {
        apisHtml += `
          <h2 style="font-size:16px; font-weight:700; margin:20px 0 10px; color:#374151; text-transform:capitalize;">
            ${groupName}
          </h2>
          <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:12px;">
            <thead>
              <tr>
                <th style="background:#f1f5f9; padding:8px 10px; border:1px solid #cbd5e1; text-align:${align}; width:80px;">Method</th>
                <th style="background:#f1f5f9; padding:8px 10px; border:1px solid #cbd5e1; text-align:${align};">Path</th>
                <th style="background:#f1f5f9; padding:8px 10px; border:1px solid #cbd5e1; text-align:${align};">Description</th>
                <th style="background:#f1f5f9; padding:8px 10px; border:1px solid #cbd5e1; text-align:${align};">Notes</th>
              </tr>
            </thead>
            <tbody>
        `;
        eps.forEach((ep, idx) => {
          const color = methodColors[ep.method?.toUpperCase()] || '#999';
          const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
          apisHtml += `
            <tr style="background:${bg};">
              <td style="padding:7px 10px; border:1px solid #e2e8f0; vertical-align:top;">
                <span style="background:${color}; color:#fff; padding:2px 8px; border-radius:3px; font-weight:700; font-size:11px; font-family:monospace;">
                  ${ep.method || ''}
                </span>
              </td>
              <td style="padding:7px 10px; border:1px solid #e2e8f0; vertical-align:top; font-family:monospace; font-size:11px; color:#1e40af; direction:ltr;">
                ${ep.path || ''}
              </td>
              <td style="padding:7px 10px; border:1px solid #e2e8f0; vertical-align:top; color:#374151;">
                ${ep.description || '<span style="color:#9ca3af;font-style:italic;">—</span>'}
              </td>
              <td style="padding:7px 10px; border:1px solid #e2e8f0; vertical-align:top; color:#374151;">
                ${ep.notes || '<span style="color:#9ca3af;font-style:italic;">—</span>'}
              </td>
            </tr>
          `;
        });
        apisHtml += `</tbody></table>`;
      }
      apisHtml += `</div>`;
      body += apisHtml;
    }

    const htmlContent = `<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.8; color: #1a1a1a; direction: ${dir}; margin: 0; padding: 0; }
  h1 { font-size: 20px; font-weight: 900; margin: 20px 0 10px; color: #111; }
  h2 { font-size: 17px; font-weight: 700; margin: 18px 0 8px; color: #222; }
  h3 { font-size: 15px; font-weight: 700; margin: 14px 0 6px; color: #333; }
  h4 { font-size: 13px; font-weight: 700; margin: 10px 0 4px; }
  p  { margin: 0 0 10px; }
  a  { color: #3b82f6; text-decoration: none; }
  code { background: #f3f4f6; padding: 1px 5px; border-radius: 3px; font-size: 12px; font-family: "Courier New", monospace; }
  pre { background: #f3f4f6; padding: 10px 14px; border-radius: 4px; margin: 10px 0; font-size: 11px; white-space: pre-wrap; word-break: break-all; }
  pre code { background: none; padding: 0; }
  blockquote { border-${align}: 3px solid #3b82f6; margin: 12px 0; padding: 6px 12px; background: #eff6ff; color: #1e40af; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th { background: #f1f5f9; font-weight: 700; padding: 7px 10px; border: 1px solid #cbd5e1; text-align: ${align}; }
  td { padding: 6px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  img { max-width: 100%; height: auto; display: block; margin: 8px 0; }
  ul, ol { padding-${align}: 18px; margin: 0 0 10px; }
  li { margin-bottom: 4px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
  strong { font-weight: 700; }
  em { font-style: italic; }
</style>
</head>
<body>${body}</body>
</html>`;

    const blob = await asBlob(htmlContent, {
      orientation: 'portrait',
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
    });
    saveAs(blob, `${projectTitle.value}_Documentation.docx`);
    toast('تم تصدير Word بنجاح', 'success');

  } catch (err) {
    console.error('Word project export error:', err);
    toast('فشل تصدير Word', 'error');
  } finally {
    isExportingFull.value = false;
  }
};

const confirmDelete = () => { showDeleteConfirm.value = true; };
const executeDelete = async () => {
    try {
        await axios.delete(`/api/pm/docs/${activeDocId.value}/`);
        showDeleteConfirm.value = false;
        toast('تم حذف الصفحة بنجاح', 'success');
        fetchProjectDocuments();
    } catch (e) {
        console.error(e);
        toast('حدث خطأ أثناء حذف الصفحة', 'error');
    }
};

// ── Tags ──────────────────────────────────────────────────────────────
const projectTags = ref([]);
const activeTagId = ref(null);

const fetchProjectTags = async () => {
  try {
    const res = await axios.get(`/api/pm/doc-tags/?project_id=${currentProjectId.value}`);
    projectTags.value = res.data;
  } catch {}
};

const toggleTagFilter = async (tagId) => {
  activeTagId.value = activeTagId.value === tagId ? null : tagId;
  isLoadingDocs.value = true;
  try {
    const params = { project_id: currentProjectId.value };
    if (activeTagId.value) params.tag = activeTagId.value;
    const res = await axios.get('/api/pm/docs/', { params });
    documents.value = res.data;
  } catch {} finally { isLoadingDocs.value = false; }
};

// ── Drag & Drop reorder ────────────────────────────────────────────────
let dragSrcIdx = null;

const onDragStart = (e, doc, idx) => {
  dragSrcIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
};

const onDragOver = (e, idx) => {
  e.dataTransfer.dropEffect = 'move';
};

const onDrop = async (e, targetIdx) => {
  if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;
  const reordered = [...roots.value];
  const [moved] = reordered.splice(dragSrcIdx, 1);
  reordered.splice(targetIdx, 0, moved);
  // Update order locally
  reordered.forEach((d, i) => { d.order = i; });
  // Persist
  try {
    await axios.post('/api/pm/docs/reorder/', {
      items: reordered.map(d => ({ id: d.id, order: d.order, parent: d.parent }))
    });
    toast('تم تحديث الترتيب', 'success');
  } catch { toast('فشل حفظ الترتيب', 'error'); }
  dragSrcIdx = null;
};

// ── Copy / Move ────────────────────────────────────────────────────────
const allProjects = ref([]);
const showCopyMoveMenu = ref(false);

const fetchAllProjects = async () => {
  try {
    const res = await axios.get('/api/pm/projects/');
    allProjects.value = res.data;
  } catch {}
};

const copyDoc = async (targetProjectId) => {
  try {
    await axios.post(`/api/pm/docs/${activeDocId.value}/copy/`, { target_project_id: targetProjectId });
    toast('تم نسخ المستند بنجاح', 'success');
  } catch { toast('فشل نسخ المستند', 'error'); }
};

const moveDoc = async (targetProjectId) => {
  try {
    await axios.post(`/api/pm/docs/${activeDocId.value}/move/`, { target_project_id: targetProjectId });
    toast('تم نقل المستند بنجاح', 'success');
    fetchProjectDocuments();
  } catch { toast('فشل نقل المستند', 'error'); }
};

onMounted(() => {
  fetchProjectDetails();
  fetchProjectDocuments();
  fetchProjectTags();
  fetchAllProjects();
});

watch(() => route.params.docId, (newId) => {
  if (newId) {
    const found = documents.value.find(d => d.id == newId);
    if (found) selectDocument(found);
  }
});

onUnmounted(() => {
  if (docSocket) docSocket.close();
  clearTimeout(typingTimer);
});
</script>

<style scoped>
.glass-docs-canvas {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-body);
  color: var(--text-main);
  font-family: 'Inter', 'Tajawal', sans-serif;
  overflow: hidden;
}

.glass-panel-premium {
  background: var(--bg-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

/* Header Island */
.docs-header-island {
  margin: 20px 24px 10px;
  padding: 14px 28px;
  border-radius: 20px;
  z-index: 1000;
}
.header-container { display: flex; justify-content: space-between; align-items: center; }

.glass-breadcrumb { display: flex; align-items: center; gap: 14px; }
.bc-home-icon { color: var(--primary); font-size: 1.2rem; transition: 0.3s; }
.bc-home-icon:hover { transform: scale(1.1); color: var(--primary-hover); }
.bc-arrow { font-size: 0.8rem; opacity: 0.4; }
.bc-project-name { font-weight: 800; font-size: 1.1rem; }
.bc-doc-title { opacity: 0.7; font-weight: 600; }

.header-right .action-group { display: flex; align-items: center; gap: 12px; }

.glass-btn-vibrant {
  height: 42px; padding: 0 20px; border-radius: 12px; border: none; font-weight: 700; font-size: 0.9rem;
  display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.glass-btn-vibrant.primary { background: var(--primary); color: white; box-shadow: 0 8px 16px -4px var(--primary-glow); }
.glass-btn-vibrant.primary:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -6px var(--primary-glow); }

.glass-btn-vibrant.outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-main); }
.glass-btn-vibrant.outline:hover { background: var(--bg-hover); border-color: var(--primary); color: var(--primary); }

.glass-btn-vibrant.secondary { background: var(--bg-hover); color: var(--text-main); }
.glass-btn-vibrant.secondary:hover { background: var(--border-color); }

.theme-toggle-btn {
  width: 42px; height: 42px; border-radius: 12px; border: none; cursor: pointer; color: var(--text-main);
  display: flex; align-items: center; justify-content: center; font-size: 1.1rem; transition: 0.3s;
}
.theme-toggle-btn:hover { background: var(--primary); color: white; transform: rotate(15deg); }

.glass-divider-v { width: 1px; height: 24px; background: var(--border-color); margin: 0 4px; }

/* Main Layout */
.docs-main-layout {
  flex: 1; display: flex; gap: 20px; padding: 10px 24px 20px; overflow: hidden;
}

/* Sidebar Island */
.docs-sidebar-island {
  width: 320px; border-radius: 24px; display: flex; flex-direction: column; flex-shrink: 0; padding: 20px; gap: 20px;
}

.glass-search-pod {
  display: flex; align-items: center; gap: 12px; padding: 12px 18px; background: var(--bg-hover); border-radius: 15px; border: 1px solid var(--border-color);
}
.glass-search-pod input { flex: 1; background: transparent; border: none; outline: none; color: var(--text-main); font-weight: 600; font-size: 0.9rem; }

.sidebar-nav-vibrant { flex: 1; overflow-y: auto; scrollbar-width: thin; }
.nav-content-stack { display: flex; flex-direction: column; gap: 12px; }

.nav-group-header { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; padding: 0 10px; }

.nav-tree-container { display: flex; flex-direction: column; gap: 4px; }

/* Recursive Pod Styling */
:deep(.nav-v-tree-row) { display: flex; flex-direction: column; gap: 4px; }
:deep(.tree-link-pod) {
  padding: 10px 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-inline-start: calc(var(--nav-depth) * 16px);
}
:deep(.tree-link-pod:hover) { background: var(--bg-hover); transform: translateX(4px); }
:deep(.tree-link-pod.active) { background: var(--primary-bg); color: var(--primary); border: 1px solid var(--primary-border); }

:deep(.pod-inner) { display: flex; align-items: center; gap: 12px; }
:deep(.toggle-chevron) { width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; opacity: 0.5; transition: 0.3s; }
:deep(.toggle-chevron.expanded) { transform: rotate(90deg); opacity: 1; color: var(--primary); }
:deep(.file-bullet) { width: 6px; height: 6px; border-radius: 50%; background: var(--border-color); margin: 0 4px; }
:deep(.active .file-bullet) { background: var(--primary); box-shadow: 0 0 8px var(--primary-glow); }
:deep(.pod-title) { font-size: 0.92rem; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.nav-api-shortcut {
  margin-top: 10px; padding: 12px 14px; border-radius: 15px; cursor: pointer; transition: 0.3s;
  background: var(--bg-hover); border: 1px solid var(--border-color);
}
.nav-api-shortcut:hover { border-color: var(--primary); transform: translateY(-2px); }
.nav-api-shortcut.active { background: var(--primary); color: white; border-color: transparent; box-shadow: var(--glass-shadow); }
.shortcut-content { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 0.9rem; }

/* Content Root */
.docs-content-root { flex: 1; overflow: hidden; }
.content-vibrant-grid { display: flex; gap: 20px; height: 100%; }

.doc-main-card {
  flex: 1; border-radius: 24px; padding: 40px; display: flex; flex-direction: column; gap: 30px; overflow-y: auto; scrollbar-width: thin;
}

.doc-header-v { display: flex; flex-direction: column; gap: 16px; }

.doc-meta-v { display: flex; align-items: center; gap: 20px; }
.status-glow-pill {
  padding: 6px 14px; border-radius: 20px; background: rgba(16, 185, 129, 0.1); color: #10b981; font-weight: 800; font-size: 0.75rem;
  display: flex; align-items: center; gap: 8px; border: 1px solid rgba(16, 185, 129, 0.3);
}
.glow-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981; }
.last-updated-v { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }

.doc-main-title { font-size: 2.8rem; font-weight: 900; color: var(--text-main); letter-spacing: -1.5px; line-height: 1.1; }

.doc-action-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.glass-doc-action {
  height: 38px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-hover);
  color: var(--text-muted); cursor: pointer; transition: 0.2s; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;
}
.glass-doc-action:hover { border-color: var(--primary); color: var(--primary); background: var(--bg-card); transform: translateY(-2px); }
.glass-doc-action.danger:hover { border-color: var(--ds-red); color: var(--ds-red); background: var(--ds-red-light); }
.spacer { flex: 1; }

.doc-render-body { flex: 1; }

/* Markdown Theming Overrides */
.markdown-body-vibrant {
  color: var(--text-main); font-size: 1.15rem; line-height: 1.8;
}
:deep(.markdown-body-vibrant h2) { font-size: 2rem; font-weight: 800; border-bottom: 2px solid var(--border-color); padding-bottom: 15px; margin-top: 50px; }
:deep(.markdown-body-vibrant a) { color: var(--primary); text-decoration: none; font-weight: 700; border-bottom: 2px solid transparent; transition: 0.2s; }
:deep(.markdown-body-vibrant a:hover) { border-bottom-color: var(--primary); }
:deep(.markdown-body-vibrant pre) { background: var(--bg-hover) !important; border-radius: 16px !important; border: 1px solid var(--border-color) !important; padding: 24px !important; }
:deep(.markdown-body-vibrant blockquote) { padding-inline-start: 24px; border-inline-start: 6px solid var(--primary); color: var(--text-muted); font-style: italic; background: var(--bg-hover); border-radius: 0 12px 12px 0; padding: 16px 24px; }

/* TOC Island */
.docs-toc-island {
  width: 280px; border-radius: 24px; flex-shrink: 0; padding: 24px; display: flex; flex-direction: column; gap: 20px; align-self: flex-start;
  position: sticky; top: 0;
}
.toc-header { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.toc-nav-v { overflow-y: auto; }
.toc-list-v { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 4px; }

.toc-item-v {
  padding: 8px 12px; border-radius: 10px; font-size: 0.9rem; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: 0.2s;
}
.toc-item-v:hover { color: var(--primary); background: var(--bg-hover); }
.toc-item-v.active { color: var(--primary); font-weight: 800; background: var(--primary-bg); }
.toc-item-v.lv-3 { padding-inline-start: 24px; font-size: 0.85rem; }
.toc-item-v.lv-4 { padding-inline-start: 36px; font-size: 0.8rem; }

.toc-bullet { display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: var(--primary); margin-inline-end: 8px; vertical-align: middle; }

/* Empty State XL Styling */
.empty-docs-state-xl {
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

.empty-glow-ring {
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

.empty-docs-state-xl h3 {
  font-size: 2.8rem;
  font-weight: 900;
  color: var(--text-main);
  margin: 0;
  letter-spacing: -0.04em;
}

.empty-docs-state-xl p {
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

/* Modals Modern Redesign */
.glass-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(10px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px;
}
.glass-modal-container {
  width: 100%; max-width: 600px; max-height: 85vh; border-radius: 30px; display: flex; flex-direction: column; position: relative;
  box-shadow: 0 30px 60px -12px rgba(0,0,0,0.4);
}
.glass-modal-container.large { max-width: 1000px; }

.modal-header-v { padding: 24px 32px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.modal-header-v h3 { font-size: 1.4rem; font-weight: 900; margin: 0; display: flex; align-items: center; gap: 12px; }

.modal-body-v { flex: 1; overflow-y: auto; padding: 24px 32px; }

.revision-timeline-v { display: flex; flex-direction: column; gap: 12px; }
.rev-item-v {
  padding: 18px 24px; border-radius: 18px; display: flex; justify-content: space-between; align-items: center;
}
.rev-info-c { display: flex; flex-direction: column; gap: 4px; }
.rev-user-v { font-weight: 800; font-size: 1rem; color: var(--primary); }
.rev-date-v { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }

.rev-actions-v { display: flex; gap: 10px; }
.btn-rev {
  width: 42px; height: 42px; border-radius: 12px; border: none; cursor: pointer; transition: 0.2s;
  display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
}
.btn-rev.preview { border: 1px solid var(--border-color); background: var(--bg-hover); color: var(--text-muted); }
.btn-rev.preview:hover { border-color: var(--primary); color: var(--primary); }
.btn-rev.restore { background: var(--primary); color: white; }
.btn-rev.restore:hover { transform: scale(1.05); box-shadow: 0 8px 16px -4px var(--primary-glow); }

.btn-close-modal { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--bg-hover); color: var(--text-muted); cursor: pointer; transition: 0.2s; }
.btn-close-modal:hover { background: var(--ds-red-light); color: var(--ds-red); transform: rotate(90deg); }

/* Animations */
.fade-blur-enter-active, .fade-blur-leave-active { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-blur-enter-from, .fade-blur-leave-to { opacity: 0; transform: scale(0.9) translateY(20px); filter: blur(10px); }

.dropdown-v-enter-active, .dropdown-v-leave-active { transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.dropdown-v-enter-from, .dropdown-v-leave-to { opacity: 0; transform: translateY(-10px); }

/* Responsive adjustments */
@media (max-width: 1280px) {
  .docs-toc-island { display: none; }
}
@media (max-width: 1024px) {
  .hide-tablet { display: none; }
  .docs-sidebar-island { width: 260px; }
}

/* RTL Tweaks */
[dir="rtl"] .doc-main-title { font-weight: 900; letter-spacing: 0; }
[dir="rtl"] .bc-arrow { transform: scaleX(-1); }
[dir="rtl"] .toggle-chevron { transform: scaleX(-1); }
[dir="rtl"] .toggle-chevron.expanded { transform: rotate(-90deg) scaleX(-1); }

/* Collaboration */
.collab-presence { display: flex; align-items: center; gap: 6px; }
.collab-avatar {
  width: 30px; height: 30px; border-radius: 50%; background: var(--primary);
  color: white; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--bg-card); margin-inline-start: -6px;
}
.collab-avatar:first-child { margin-inline-start: 0; }
.collab-typing { font-size: 0.78rem; color: var(--text-muted); font-style: italic; margin-inline-start: 8px; }
.comment-badge {
  background: var(--primary); color: white; border-radius: 10px;
  padding: 1px 7px; font-size: 0.72rem; font-weight: 700;
}

/* Doc updated banner */
.doc-updated-banner {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px; margin-top: 12px;
  border-radius: 12px; background: color-mix(in srgb, #f59e0b 12%, transparent);
  border: 1px solid color-mix(in srgb, #f59e0b 30%, transparent);
  font-size: 0.88rem; font-weight: 600; color: var(--text-main);
}
.doc-updated-banner i { color: #f59e0b; }
.banner-reload-btn { margin-inline-start: auto; padding: 5px 14px; border-radius: 8px; background: #f59e0b; color: white; border: none; cursor: pointer; font-weight: 700; font-size: 0.82rem; }
.banner-close-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; }

/* Comments Panel */
.comments-panel {
  margin-top: 32px; border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 16px;
}
.comments-header { display: flex; align-items: center; justify-content: space-between; }
.comments-header h4 { display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 700; margin: 0; }
.comments-list { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; }
.comments-loader, .comments-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px; color: var(--text-muted); font-size: 0.85rem; }
.comments-empty i { font-size: 2rem; opacity: 0.3; }
.comment-item { display: flex; gap: 12px; }
.comment-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--primary); color: white; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.comment-body { flex: 1; }
.comment-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.comment-author { font-weight: 700; font-size: 0.85rem; color: var(--primary); }
.comment-date { font-size: 0.75rem; color: var(--text-muted); }
.comment-delete-btn { margin-inline-start: auto; background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 0.75rem; padding: 2px 6px; border-radius: 6px; transition: 0.2s; }
.comment-delete-btn:hover { color: #ef4444; background: #fef2f2; }
.comment-text { font-size: 0.88rem; color: var(--text-main); line-height: 1.5; margin: 0; }
.comment-input-row { display: flex; gap: 10px; }
.comment-input { flex: 1; padding: 10px 16px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-hover); color: var(--text-main); font-size: 0.9rem; outline: none; transition: 0.2s; }
.comment-input:focus { border-color: var(--primary); }
.comment-send-btn { width: 42px; height: 42px; border-radius: 12px; background: var(--primary); color: white; border: none; cursor: pointer; font-size: 1rem; transition: 0.2s; }
.comment-send-btn:hover { opacity: 0.85; }
.comment-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Slide up transition */
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(20px); }

/* Tags filter */
.tags-filter-row { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 0 0; }
.tag-chip {
  padding: 4px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; cursor: pointer;
  border: 1.5px solid var(--tag-color, var(--border-color)); color: var(--tag-color, var(--text-muted));
  background: transparent; transition: 0.2s;
}
.tag-chip.active,
.tag-chip:hover { background: var(--tag-color, var(--primary)); color: white; }

/* Doc tags in header */
.doc-tags-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.doc-tag-badge { padding: 3px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; border: 1px solid; }

/* Copy/Move */
.copy-move-project-list { max-height: 240px; overflow-y: auto; }
.copy-move-project-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px; font-size: 0.88rem; font-weight: 600; color: var(--text-main);
  border-bottom: 1px solid var(--border-color);
}
.copy-move-project-item:last-child { border-bottom: none; }

/* Export dropdown */
.export-group { position: relative; }
.export-dropdown {
  position: absolute; top: calc(100% + 8px); left: 0; z-index: 1000;
  border-radius: 14px; padding: 8px; min-width: 180px;
  display: flex; flex-direction: column; gap: 2px;
}
.export-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border-radius: 10px; border: none; background: transparent; cursor: pointer;
  color: var(--text-main); font-size: 0.88rem; font-weight: 600; width: 100%; text-align: start;
  transition: 0.2s;
}
.export-item:hover { background: var(--bg-hover); color: var(--primary); }
.export-item i { width: 16px; text-align: center; }
.dropdown-v-enter-active, .dropdown-v-leave-active { transition: all 0.2s ease; }
.dropdown-v-enter-from, .dropdown-v-leave-to { opacity: 0; transform: translateY(-8px); }

/* Embeds */
.embed-container {
  position: relative; width: 100%; margin: 24px 0; border-radius: 12px; overflow: hidden;
  box-shadow: var(--shadow-md); border: 1px solid var(--border-color);
}
.youtube-embed { padding-bottom: 56.25%; /* 16:9 */ }
.figma-embed { padding-bottom: 75%; /* 4:3 */ }
.embed-container iframe {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
}

/* Search Results */
.search-result-pod {
  padding: 10px 14px; border-radius: 12px; cursor: pointer;
  transition: all 0.2s; border: 1px solid transparent; margin-bottom: 4px;
}
.search-result-pod:hover { background: var(--bg-hover); }
.search-result-pod.active { background: var(--primary-bg); border-color: var(--primary-border); }
.search-result-title { display: flex; align-items: center; gap: 8px; font-size: 0.92rem; font-weight: 650; }
.search-result-title i { color: var(--primary); font-size: 0.85rem; flex-shrink: 0; }
.search-result-snippet {
  font-size: 0.78rem; color: var(--text-muted); margin: 4px 0 0 22px;
  line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
:deep(.search-highlight) {
  background: color-mix(in srgb, var(--primary) 25%, transparent);
  color: var(--primary); border-radius: 3px; padding: 0 2px; font-weight: 700;
}
.search-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px; color: var(--text-muted); font-size: 0.85rem; }
.search-empty i { font-size: 1.5rem; opacity: 0.4; }

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

.perm-wall-docs {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; height: 100%; min-height: 400px; text-align: center; color: var(--text-muted);
}
.perm-wall-docs i { font-size: 3rem; color: #ef4444; opacity: 0.4; }
.perm-wall-docs h3 { font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin: 0; }
.perm-wall-docs p { font-size: 0.95rem; margin: 0; }
</style>
