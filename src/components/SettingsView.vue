<template>
  <div class="settings-container" :class="{ 'fade-in': show }" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">
    <div class="settings-header">
      <!-- Header content if needed -->
    </div>
    <div class="dashboard-container">
      <nav class="settings-tabs-container">
        <div 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          class="nav-item"
          :class="{ active: activeTab === tab.id }"
        >
          <i :class="['nav-icon', tab.icon]"></i>
          <span class="nav-text">{{ $t(`settings.tabs.${tab.id}`) }}</span>
        </div>
      </nav>

      <main class="settings-main-content">
        <transition name="settings-fade" mode="out-in">
          <div :key="activeTab">
            <!-- Global Status Indicators -->
            <div v-if="loading && activeTab !== 'profile' && activeTab !== 'security' && activeTab !== 'maintenance'" class="loading-bar-global">
              <i class="fa-solid fa-spinner fa-spin"></i> {{ $t('common.loading') }}
            </div>
            
            <div v-if="error" class="error-msg-premium">
              <i class="fa-solid fa-circle-exclamation"></i> {{ error }}
            </div>

            <!-- Premium Profile Header (conditionally rendering title if not customized) -->
            <!-- <div v-if="activeTab !== 'security' && activeTab !== 'profile' && activeTab !== 'maintenance'" class="header-minimalist">
              <h1>{{ currentTabTitle }}</h1>
              <p>{{ currentTabDesc }}</p>
            </div> -->

            <!-- Profile Tab (Premium Redesign) -->
            <div v-if="activeTab === 'profile'" class="profile-tab-premium">
              <div class="profile-hero-premium">
                <div class="hero-bg-overlay"></div>
                <div class="hero-content">
                  <div class="profile-avatar-wrapper">
                    <div class="avatar-glow"></div>
                    <img :src="avatarPreview || (profile.avatar ? getFullUrl(profile.avatar) : defaultAvatar)" alt="Profile" class="avatar-img-premium">
                    <div class="avatar-edit-badge" @click="$refs.fileInput.click()">
                      <i class="fa-solid fa-camera"></i>
                    </div>
                    <input type="file" ref="fileInput" @change="onAvatarSelected" accept="image/*" style="display: none;">
                  </div>
                  <div class="profile-hero-text">
                    <h2>{{ profile.firstName }} {{ profile.lastName }}</h2>
                    <p>@{{ profile.username }} • {{ profile.email }}</p>
                  </div>
                </div>
              </div>

              <div class="profile-content-premium">
                <div class="premium-card profile-card">
                  <div class="card-title-row">
                    <span class="icon-circle"><i class="fa-solid fa-address-card"></i></span>
                    <h3>{{ $t('settings.profile.personal_info') }}</h3>
                  </div>

                  <form class="premium-form-grid" @submit.prevent="handleSave">
                    <div class="form-row">
                      <div class="form-floating-group">
                        <label>{{ $t('settings.profile.first_name') }}</label>
                        <div class="premium-input-wrapper">
                          <i class="fa-solid fa-user input-icon"></i>
                          <input type="text" v-model="profile.firstName" :placeholder="$t('settings.profile.first_name')">
                          <div class="input-focus-line"></div>
                        </div>
                      </div>
                      <div class="form-floating-group">
                        <label>{{ $t('settings.profile.last_name') }}</label>
                        <div class="premium-input-wrapper">
                          <i class="fa-solid fa-user-tag input-icon"></i>
                          <input type="text" v-model="profile.lastName" :placeholder="$t('settings.profile.last_name')">
                          <div class="input-focus-line"></div>
                        </div>
                      </div>
                    </div>

                    <div class="form-floating-group full-width">
                      <label>{{ $t('settings.profile.email') }}</label>
                      <div class="premium-input-wrapper">
                        <i class="fa-solid fa-envelope input-icon"></i>
                        <input type="email" v-model="profile.email" placeholder="name@example.com">
                        <div class="input-focus-line"></div>
                      </div>
                    </div>

                    <div class="form-row">
                      <div class="form-floating-group">
                        <label>{{ $t('settings.profile.username') }}</label>
                        <div class="premium-input-wrapper">
                          <i class="fa-solid fa-at input-icon"></i>
                          <input type="text" v-model="profile.username" :placeholder="$t('settings.profile.username')">
                          <div class="input-focus-line"></div>
                        </div>
                      </div>
                      <div class="form-floating-group">
                        <label>{{ $t('settings.profile.password') }}</label>
                        <div class="premium-input-wrapper">
                          <i class="fa-solid fa-signature input-icon"></i>
                          <input type="password" v-model="profile.password" :placeholder="$t('settings.profile.password_placeholder')">
                          <div class="input-focus-line"></div>
                        </div>
                      </div>
                    </div>

                    <div class="profile-actions-premium">
                      <button type="submit" class="premium-save-button" :class="{ 'btn-success': isSuccess }" :disabled="loading">
                        <div class="button-bg"></div>
                        <div class="button-content">
                          <span v-if="loading"><i class="fa-solid fa-spinner-third fa-spin"></i></span>
                          <span v-else-if="isSuccess"><i class="fa-solid fa-circle-check"></i> {{ $t('common.saved') }}</span>
                          <span v-else>{{ $t('settings.profile.save') }}</span>
                        </div>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <!-- Preferences Tab (Premium Redesign) -->
            <div v-if="activeTab === 'preferences'" class="preferences-tab-premium">
              <!-- Premium Header -->
              <div class="preferences-header-premium">
                <div class="header-overlay"></div>
                <div class="header-content-wrapper-premium">
                  <div class="header-visual">
                    <div class="sliders-container-premium">
                      <i class="fa-solid fa-sliders"></i>
                      <div class="sliders-glow-premium"></div>
                    </div>
                  </div>
                  <div class="header-text-premium tertiary">
                    <h2>{{ $t('settings.tabs.preferences') }}</h2>
                    <p>{{ $t('settings.tabs.preferences_desc') }}</p>
                  </div>
                </div>
              </div>

              <div class="preferences-grid-premium">
                <!-- Section: Language & Theme -->
                <div class="preferences-column">
                  <!-- Language Card -->
                  <div class="premium-card preferences-card">
                    <div class="card-title-row">
                      <span class="icon-circle secondary"><i class="fa-solid fa-language"></i></span>
                      <h3>{{ $t('settings.language') }}</h3>
                    </div>
                    <div class="premium-lang-grid">
                      <div 
                        class="premium-lang-card" 
                        :class="{ active: $i18n.locale === 'ar' }"
                        @click="changeLanguage('ar')"
                      >
                        <div class="lang-flag-wrapper">🇸🇦</div>
                        <div class="lang-info">
                          <span class="lang-title">العربية</span>
                          <span class="lang-status" v-if="$i18n.locale === 'ar'"><i class="fa-solid fa-circle-check"></i></span>
                        </div>
                        <div class="active-glow"></div>
                      </div>
                      <div 
                        class="premium-lang-card" 
                        :class="{ active: $i18n.locale === 'en' }"
                        @click="changeLanguage('en')"
                      >
                        <div class="lang-flag-wrapper">🇺🇸</div>
                        <div class="lang-info">
                          <span class="lang-title">English</span>
                          <span class="lang-status" v-if="$i18n.locale === 'en'"><i class="fa-solid fa-circle-check"></i></span>
                        </div>
                        <div class="active-glow"></div>
                      </div>
                    </div>
                  </div>

                  <!-- Theme Card -->
                  <div class="premium-card preferences-card">
                    <div class="card-title-row">
                      <span class="icon-circle secondary"><i class="fa-solid fa-palette"></i></span>
                      <h3>{{ $t('settings.theme') }}</h3>
                    </div>
                    <div class="premium-theme-grid">
                      <div 
                        v-for="mode in ['light', 'dark', 'system']" 
                        :key="mode"
                        class="premium-theme-card" 
                        :class="[mode, { active: currentTheme === mode }]"
                        @click="setTheme(mode)"
                      >
                        <div class="theme-visual-preview">
                          <div class="preview-header"></div>
                          <div class="preview-sidebar"></div>
                          <div class="preview-body"></div>
                        </div>
                        <div class="theme-label">
                          <i :class="mode === 'light' ? 'fa-solid fa-sun' : mode === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-desktop'"></i>
                          <span>{{ $t(`settings.theme_${mode}`) }}</span>
                        </div>
                        <div class="active-indicator" v-if="currentTheme === mode"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Section: Colors & Fonts -->
                <div class="preferences-column">
                  <!-- Primary Color Card -->
                  <div class="premium-card preferences-card">
                    <div class="card-title-row">
                      <span class="icon-circle secondary"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
                      <h3>{{ $t('settings.primary_color') }}</h3>
                    </div>
                    <div class="premium-color-grid">
                      <div 
                        v-for="color in availableColors" 
                        :key="color.id"
                        class="premium-color-option" 
                        :class="{ active: currentColorId === color.id }"
                        @click="setPrimaryColor(color)"
                      >
                        <div class="color-swatch-premium" :style="{ background: color.gradient ? `linear-gradient(135deg, ${color.gradient[0]}, ${color.gradient[1]})` : color.primary }">
                          <transition name="check-scale">
                            <i v-if="currentColorId === color.id" class="fa-solid fa-check"></i>
                          </transition>
                        </div>
                        <span class="color-name">{{ $t(`settings.colors.${color.id}`) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Font Card -->
                  <div class="premium-card preferences-card">
                    <div class="card-title-row">
                      <span class="icon-circle secondary"><i class="fa-solid fa-font"></i></span>
                      <h3>{{ $t('settings.font_family') }}</h3>
                    </div>
                    <div class="premium-font-list">
                      <div 
                        v-for="font in availableFonts" 
                        :key="font.id"
                        class="premium-font-card" 
                        :class="{ active: currentFontId === font.id }"
                        @click="setFontFamily(font)"
                        :style="{ fontFamily: font.value }"
                      >
                        <div class="font-preview-circle">Aa</div>
                        <div class="font-details">
                          <span class="font-name-label">{{ $t(`settings.fonts.${font.id}`) }}</span>
                          <span class="font-sample">{{ $i18n.locale === 'ar' ? 'الغرض من هذا الخط هو الجمال والوضوح' : 'The quick brown fox jumps over the lazy dog' }}</span>
                        </div>
                        <div class="active-radio" v-if="currentFontId === font.id">
                          <div class="radio-dot"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Maintenance Tab (Premium Redesign) -->
            <div v-if="activeTab === 'maintenance'" class="maintenance-tab-premium">
              <!-- Header — same pattern as security/profile tabs -->
              <div class="maintenance-header-premium">
                <div class="header-overlay"></div>
                <div class="header-content-wrapper">
                  <div class="header-visual">
                    <div class="tools-container">
                      <i class="fa-solid fa-screwdriver-wrench"></i>
                      <div class="tools-glow"></div>
                    </div>
                  </div>
                  <div class="header-text-premium secondary">
                    <h2>{{ $t('settings.maintenance.title') }}</h2>
                    <p>{{ $t('settings.maintenance.cleanup_desc') }}</p>
                  </div>
                </div>
              </div>

              <div class="maintenance-grid-premium">

                <!-- Cleanup Card -->
                <div class="premium-card maintenance-card-premium">
                  <div class="card-title-row">
                    <span class="icon-circle"><i class="fa-solid fa-broom-ball"></i></span>
                    <h3>{{ $t('settings.maintenance.data_cleanup') }}</h3>
                  </div>
                  <p class="card-desc">{{ $t('settings.maintenance.cleanup_action_desc') }}</p>
                  <div class="cleanup-actions">
                    <button class="premium-run-button" @click="runCleanup" :disabled="loading">
                      <div class="button-bg"></div>
                      <div class="button-content">
                        <span v-if="loading"><i class="fa-solid fa-spinner fa-spin"></i> {{ $t('settings.maintenance.cleaning') }}</span>
                        <span v-else><i class="fa-solid fa-bolt"></i> {{ $t('settings.maintenance.run_cleanup') }}</span>
                      </div>
                    </button>
                  </div>
                  <transition name="slide-fade">
                    <div v-if="maintenanceStatus" :class="['premium-status-toast', maintenanceStatus.type === 'success' ? 'success' : 'error']">
                      <div class="toast-icon">
                        <i :class="maintenanceStatus.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i>
                      </div>
                      <span class="toast-message">{{ maintenanceStatus.message }}</span>
                    </div>
                  </transition>
                </div>

                <!-- System Health Card -->
                <div class="premium-card maintenance-card-premium">
                  <div class="card-title-row">
                    <span class="icon-circle secondary"><i class="fa-solid fa-heart-pulse"></i></span>
                    <h3>{{ $t('settings.maintenance.system_health') }}</h3>
                  </div>
                  <div class="health-indicators-grid">
                    <div class="health-indicator">
                      <div class="indicator-label">
                        <i class="fa-solid fa-database"></i>
                        <span>{{ $t('settings.maintenance.db') }}</span>
                      </div>
                      <div class="indicator-status success">
                        <span class="dot"></span>
                        {{ $t('settings.maintenance.healthy') }}
                      </div>
                    </div>
                    <div class="health-indicator">
                      <div class="indicator-label">
                        <i class="fa-solid fa-memory"></i>
                        <span>{{ $t('settings.maintenance.cache') }}</span>
                      </div>
                      <div class="indicator-status success">
                        <span class="dot"></span>
                        {{ $t('settings.maintenance.optimized') }}
                      </div>
                    </div>
                    <div class="health-indicator">
                      <div class="indicator-label">
                        <i class="fa-solid fa-cloud-arrow-up"></i>
                        <span>{{ $t('settings.maintenance.last_backup') }}</span>
                      </div>
                      <div class="indicator-status info">
                        {{ $t('settings.maintenance.last_backup_val') }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Data Usage Card -->
                <div class="premium-card maintenance-card-premium" v-if="isSuperuser">
                  <div class="card-title-row">
                    <span class="icon-circle tertiary"><i class="fa-solid fa-chart-pie"></i></span>
                    <h3>{{ $t('settings.maintenance.data_usage') }}</h3>
                  </div>
                  <div class="usage-visual">
                    <div class="usage-bar-container">
                      <div class="usage-bar">
                        <div class="usage-progress" :style="{ width: usageStats.percentage + '%' }"></div>
                      </div>
                      <div class="usage-percentage-badge">{{ usageStats.percentage }}%</div>
                    </div>
                    <div class="usage-labels">
                      <div class="main-usage">
                        <span>{{ $t('settings.maintenance.actual_usage') }}: {{ usageStats.app_usage }}</span>
                        <span>{{ $t('settings.maintenance.capacity') }}: {{ usageStats.total_capacity }}</span>
                      </div>
                      <div class="usage-breakdown" v-if="usageStats.db_size !== '...'">
                        <small><i class="fa-solid fa-server"></i> {{ $t('settings.maintenance.db') }}: {{ usageStats.db_size }}</small>
                        <small><i class="fa-solid fa-folder-open"></i> {{ $t('settings.maintenance.media') }}: {{ usageStats.media_size }}</small>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <!-- Notifications Tab -->
            <div v-if="activeTab === 'notifications'" class="notifications-tab-container-premium">
              <NotificationsView />
            </div>

            <!-- Security Tab -->
            <div v-if="activeTab === 'security'" class="security-tab-container">
              <div class="security-header-premium">
                <div class="header-overlay"></div>
                <div class="header-content-wrapper">
                  <div class="header-visual">
                    <div class="shield-container">
                      <i class="fa-solid fa-shield-halved"></i>
                      <div class="shield-glow"></div>
                    </div>
                  </div>
                  <div class="header-text-premium">
                    <h2>{{ $t('settings.security.title') }}</h2>
                    <p>{{ $t('settings.security.desc') }}</p>
                  </div>
                </div>
              </div>

              <div class="security-grid-premium">

                <!-- Left Column: Password Management -->
                <div class="security-card-premium glass-morphic">
                  <div class="card-title-row">
                    <span class="icon-circle"><i class="fa-solid fa-user-lock"></i></span>
                    <h3>{{ $t('settings.security.change_password') }}</h3>
                  </div>
                  
                  <div class="password-form-premium">
                    <div class="form-floating-group">
                      <label>{{ $t('settings.security.current_password') }}</label>
                      <div class="premium-input-wrapper">
                        <i class="fa-solid fa-lock input-icon"></i>
                        <input type="password" v-model="security.currentPassword" placeholder="••••••••">
                        <div class="input-focus-line"></div>
                      </div>
                    </div>

                    <div class="form-floating-group">
                      <label>{{ $t('settings.security.new_password') }}</label>
                      <div class="premium-input-wrapper">
                        <i class="fa-solid fa-key input-icon"></i>
                        <input type="password" v-model="security.newPassword" placeholder="••••••••">
                        <div class="input-focus-line"></div>
                      </div>
                    </div>

                    <div class="form-floating-group">
                      <label>{{ $t('settings.security.confirm_password') }}</label>
                      <div class="premium-input-wrapper">
                        <i class="fa-solid fa-check-double input-icon"></i>
                        <input type="password" v-model="security.confirmPassword" placeholder="••••••••">
                        <div class="input-focus-line"></div>
                      </div>
                    </div>

                    <transition name="slide-fade">
                      <div v-if="securityStatus" :class="['premium-status-toast', securityStatus.type]">
                        <div class="toast-icon">
                          <i :class="securityStatus.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'"></i>
                        </div>
                        <span class="toast-message">{{ securityStatus.message }}</span>
                      </div>
                    </transition>

                    <button class="premium-save-button" @click="handlePasswordChange" :disabled="loading">
                      <div class="button-bg"></div>
                      <div class="button-content">
                        <span v-if="loading"><i class="fa-solid fa-spinner-third fa-spin"></i></span>
                        <span v-else>{{ $t('settings.security.update_password') }}</span>
                        <i class="fa-solid fa-arrow-right-long arrow-icon"></i>
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Right Column: Active Sessions -->
                <div class="security-side-column">
                  <div class="security-card-premium glass-morphic sessions-card">
                    <div class="card-title-row">
                      <span class="icon-circle secondary"><i class="fa-solid fa-server"></i></span>
                      <h3>{{ $t('settings.security.sessions_title') }}</h3>
                    </div>
                    
                    <div class="premium-sessions-list">
                      <div class="premium-session-card active">
                        <div class="session-device-visual">
                          <i class="fa-solid fa-laptop"></i>
                          <div class="active-pulse-ring"></div>
                        </div>
                        <div class="session-details-premium">
                          <h4>{{ $t('settings.security.this_device') }}</h4>
                          <p>Riyadh, SA • Chrome / Windows</p>
                          <div class="session-badge-active">
                           <span class="dot"></span>
                            {{ $t('common.active_now') }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="security-card-premium minimalist-card">
                    <div class="card-title-row">
                      <span class="icon-circle tertiary"><i class="fa-solid fa-lightbulb"></i></span>
                      <h3>{{ $t('common.security_tips') }}</h3>
                    </div>
                    <ul class="tips-list">
                      <li>{{ $t('common.tip_unique_password') }}</li>
                      <li>{{ $t('common.tip_no_share') }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- Placeholder for other tabs -->
            <div v-else-if="activeTab !== 'profile' && activeTab !== 'preferences' && activeTab !== 'notifications' && activeTab !== 'maintenance' && activeTab !== 'security'" class="placeholder-view">
              <div class="placeholder-icon">{{ currentTab.icon }}</div>
              <h3>{{ $t('settings.coming_soon.title') }}</h3>
              <p>{{ $t('settings.coming_soon.desc', { tab: $t(`settings.tabs.${currentTab.id}`) }) }}</p>
            </div>
          </div>
        </transition>
      </main>
    </div>
  </div>
</template>

<script>
import axios from '@/plugins/axios';
import NotificationsView from '../views/NotificationsView.vue';

export default {
  name: 'SettingsView',
  components: { NotificationsView },
  props: {
    permissions: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      show: false,
      loading: false,
      isSuccess: false,
      error: null,
      activeTab: 'profile',
      isSuperuser: localStorage.getItem('is_superuser') === 'true',
      maintenanceStatus: null,
      tabsList: [
        { id: 'profile', icon: 'fa-solid fa-user-gear' },
        { id: 'security', icon: 'fa-solid fa-shield-halved' },
        { id: 'notifications', icon: 'fa-solid fa-bell-concierge' },
        { id: 'preferences', icon: 'fa-solid fa-wand-magic-sparkles' },
        { id: 'maintenance', icon: 'fa-solid fa-database' }
      ],
      usageStats: {
        app_usage: '...',
        total_capacity: '...',
        db_size: '...',
        media_size: '...',
        percentage: 0
      },
      profile: {
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        email: '',
        avatar: null
      },
      security: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      securityStatus: null,
      avatarPreview: null,
      selectedFile: null,
      allProjects: [],
      currentTheme: localStorage.getItem('user_theme') || 'system',
      currentColorId: 'omnia',
      availableColors: [
        { id: 'omnia',    primary: '#3b82f6', hover: '#2563eb', bg: 'rgba(59,130,246,0.08)',   gradient: ['#22d3ee', '#3b82f6'] },
        { id: 'indigo',   primary: '#6366f1', hover: '#4338ca', bg: 'rgba(99,102,241,0.08)',   gradient: ['#818cf8', '#6366f1'] },
        { id: 'emerald',  primary: '#10b981', hover: '#059669', bg: 'rgba(16,185,129,0.08)',   gradient: ['#34d399', '#10b981'] },
        { id: 'rose',     primary: '#f43f5e', hover: '#e11d48', bg: 'rgba(244,63,94,0.08)',    gradient: ['#fb7185', '#f43f5e'] },
        { id: 'amber',    primary: '#f59e0b', hover: '#d97706', bg: 'rgba(245,158,11,0.08)',   gradient: ['#fbbf24', '#f59e0b'] },
        { id: 'ocean',    primary: '#0ea5e9', hover: '#0284c7', bg: 'rgba(14,165,233,0.08)',   gradient: ['#38bdf8', '#0ea5e9'] },
        { id: 'violet',   primary: '#8b5cf6', hover: '#7c3aed', bg: 'rgba(139,92,246,0.08)',   gradient: ['#a78bfa', '#8b5cf6'] },
        { id: 'pink',     primary: '#ec4899', hover: '#db2777', bg: 'rgba(236,72,153,0.08)',   gradient: ['#f472b6', '#ec4899'] },
      ],
      currentFontId: 'sans',
      availableFonts: [
        { id: 'sans', value: 'var(--font-sans)' },
        { id: 'outfit', value: 'var(--font-outfit)' },
        { id: 'montserrat', value: 'var(--font-montserrat)' },
        { id: 'poppins', value: 'var(--font-poppins)' },
        { id: 'roboto', value: 'var(--font-roboto)' },
        { id: 'serif', value: 'var(--font-serif)' },
        { id: 'mono', value: 'var(--font-mono)' },
        { id: 'arabic', value: 'var(--font-arabic)' }
      ]
    }
  },
  computed: {
    tabs() {
      return this.tabsList.filter(tab => {
        if (tab.id === 'maintenance') return this.isSuperuser;
        return true;
      });
    },
    currentTab() {
      return this.tabs.find(t => t.id === this.activeTab);
    },
    currentTabTitle() {
      return this.$t(`settings.tabs.${this.activeTab}`);
    },
    currentTabDesc() {
      return this.$t(`settings.tabs.${this.activeTab}_desc`);
    },
    defaultAvatar() {
      const name = (this.profile.firstName || this.profile.username || 'U').charAt(0);
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff`;
    }
  },
  mounted() {
    // Check if there's a specific tab requested in the URL
    if (this.$route.query.tab) {
      const requestedTab = this.$route.query.tab;
      if (this.tabs.some(t => t.id === requestedTab)) {
        this.activeTab = requestedTab;
      }
    }
    
    // Load current color id from localStorage if present
      const savedColor = localStorage.getItem('user_primary_color');
      if (savedColor) {
        try {
          const parsed = JSON.parse(savedColor);
          if (parsed.id) {
             this.currentColorId = parsed.id;
             this.setPrimaryColor(parsed);
          }
        } catch (e) {}
      }

      // Load current font from localStorage if present
      const savedFontId = localStorage.getItem('user_font_id');
      if (savedFontId) {
        const font = this.availableFonts.find(f => f.id === savedFontId);
        if (font) {
          this.currentFontId = font.id;
          this.setFontFamily(font);
        }
      }

      setTimeout(() => { this.show = true; }, 50);
    this.fetchProfile();
    this.fetchSystemUsage();
  },
  methods: {
    async refreshData() {
      await Promise.all([this.fetchProfile(), this.fetchSystemUsage()]);
    },
    async fetchSystemUsage() {
      if (localStorage.getItem('is_superuser') !== 'true') return;
      try {
        const response = await axios.get('/api/system/usage/');
        if (response.data.status === 'success') {
          this.usageStats = {
            app_usage: response.data.app_usage,
            total_capacity: response.data.total_capacity,
            db_size: response.data.db_size,
            media_size: response.data.media_size,
            percentage: response.data.percentage
          };
        }
      } catch (error) {
        console.error('Failed to fetch system usage:', error);
      }
    },
    async fetchProfile() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get('/api/profile/');
        console.log('Profile API Response:', response.data);
        const userData = response.data.user;
        this.allProjects = response.data.all_projects || [];
        
        this.profile = {
          username: userData.username || '',
          password: '', // Don't fetch password
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          email: userData.email || '',
          avatar: userData.avatar || null
        };
        this.originalUsername = userData.username;
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        this.error = this.$t('settings.messages.fetch_error');
      } finally {
        this.loading = false;
      }
    },
    async handleSave() {
      this.loading = true;
      try {
        const formData = new FormData();
        formData.append('oldUsername', this.originalUsername);
        formData.append('username', this.profile.username);
        formData.append('firstName', this.profile.firstName);
        formData.append('lastName', this.profile.lastName);
        formData.append('email', this.profile.email);
        
        if (this.profile.password) {
            formData.append('password', this.profile.password);
        }
        
        if (this.selectedFile) {
            formData.append('avatar', this.selectedFile);
        }

        const response = await axios.post('/api/profile/update/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        if (response.data.status === 'success') {
          this.successMsg = this.$t('settings.messages.save_success');
          const updatedUser = response.data.user;
          this.originalUsername = updatedUser.username;
          this.profile.avatar = updatedUser.avatar;
          this.selectedFile = null;
          
          localStorage.setItem('username', updatedUser.username);
          
          this.$emit('profile-updated', updatedUser);
          
          this.profile.password = ''; // Clear password field after save
          
          this.isSuccess = true;
          setTimeout(() => {
            this.isSuccess = false;
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to update profile:', error);
        this.error = this.$t('settings.messages.save_error');
      } finally {
        this.loading = false;
      }
    },
    onAvatarSelected(event) {
      const file = event.target.files[0];
      if (file) {
        this.selectedFile = file;
        this.avatarPreview = URL.createObjectURL(file);
      }
    },
    getFullUrl(path) {
      if (!path) return null;
      if (path.startsWith('http')) return path;
      return path; // DRF usually returns full URL if configured, but we can prepend API base if needed
    },
    changeLanguage(lang) {
      this.$i18n.locale = lang;
      // Direction is handled by App.vue watcher
    },
    setTheme(theme) {
      this.currentTheme = theme;
      localStorage.setItem('user_theme', theme);
      this.applyTheme(theme);
    },
    applyTheme(theme) {
      if (window.__applyTheme) {
        window.__applyTheme(theme);
      } else {
        const html = document.documentElement;
        if (theme === 'system') {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          html.setAttribute('data-theme', isDark ? 'dark' : 'light');
        } else {
          html.setAttribute('data-theme', theme);
        }
      }
      this.$emit('theme-changed', theme);
    },
    setPrimaryColor(color) {
      this.currentColorId = color.id;
      localStorage.setItem('user_primary_color', JSON.stringify(color));
      // Use global apply function from App.vue (handles glow, bg derivation, etc.)
      if (window.__applyColor) {
        window.__applyColor(color);
      } else {
        window.dispatchEvent(new CustomEvent('color-changed', { detail: color }));
      }
    },
    setFontFamily(font) {
      this.currentFontId = font.id;
      localStorage.setItem('user_font_id', font.id);
      if (window.__applyFont) {
        window.__applyFont(font.id);
      } else {
        window.dispatchEvent(new CustomEvent('font-changed', { detail: font.id }));
      }
    },
    async runCleanup() {
      this.loading = true;
      this.maintenanceStatus = null;
      try {
        const response = await axios.post('/api/cleanup/', { days: 7 });
        if (response.data.status === 'success') {
          this.maintenanceStatus = {
            type: 'success',
            message: this.$t('settings.maintenance.success')
          };
        } else {
          throw new Error(response.data.message || 'Unknown error');
        }
      } catch (error) {
        console.error('Cleanup failed:', error);
        this.maintenanceStatus = {
            type: 'error',
            message: this.$t('settings.maintenance.error')
        };
      } finally {
        this.loading = false;
      }
    },
    async handlePasswordChange() {
      if (!this.security.newPassword || this.security.newPassword.length < 4) {
        this.securityStatus = { type: 'error', message: 'Password must be at least 4 characters' };
        return;
      }
      if (this.security.newPassword !== this.security.confirmPassword) {
        this.securityStatus = { type: 'error', message: this.$t('settings.security.error_match') };
        return;
      }
      
      this.loading = true;
      this.securityStatus = null;
      try {
        const response = await axios.post('/api/security/change-password/', {
          currentPassword: this.security.currentPassword,
          newPassword: this.security.newPassword
        });
        
        if (response.data.status === 'success') {
          this.securityStatus = { type: 'success', message: this.$t('settings.security.success') };
          this.security.currentPassword = '';
          this.security.newPassword = '';
          this.security.confirmPassword = '';
        } else {
          throw new Error(response.data.message);
        }
      } catch (error) {
        console.error('Password change failed:', error);
        this.securityStatus = { 
          type: 'error', 
          message: error.response?.data?.message || this.$t('settings.security.error_current') 
        };
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>

<style scoped>
/* --- المتغيرات الأساسية للألوان والقياسات --- */
.settings-container {
  --primary-color: var(--primary);
  --primary-hover: var(--primary-hover-local);
  --bg-color: transparent;
  --card-bg: var(--bg-card);
  --text-main: var(--text-main);
  --text-secondary: var(--n500);
  --border-color: var(--border-color);
  --radius: 20px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  
  width: 100%;
  height: 100%;
  padding: 20px;
  opacity: 0;
  transform: translateY(10px);
  transition: var(--transition);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.settings-container.fade-in {
  opacity: 1;
  transform: translateY(0);
}

.dashboard-container {
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  backdrop-filter: blur(10px);
  width: 100%;
  flex: 1;
  min-height: 0;
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  overflow: hidden;
}

/* --- Premium Top Bar Tabs --- */
.settings-tabs-container {
  width: 100%;
  background: rgba(var(--bg-rgb), 0.4);
  backdrop-filter: blur(25px) saturate(200%);
  padding: 15px 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
  z-index: 10;
  overflow-x: auto;
  white-space: nowrap;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 22px;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 16px;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: -0.2px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  border: 1px solid transparent;
  gap: 12px;
  position: relative;
  overflow: hidden;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--primary-color);
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
  color: var(--primary-color) !important;
  border: 1px solid rgba(99, 102, 241, 0.2);
  transform: translateY(0);
  box-shadow: 0 10px 20px rgba(99, 102, 241, 0.1);
}

.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(circle at center, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
  z-index: -1;
}

.nav-icon {
  font-size: 1.3rem;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-gradient-end, var(--primary-hover)) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(99, 102, 241, 0.2));
  transition: transform 0.3s ease;
}

.nav-item.active .nav-icon {
  transform: scale(1.1) rotate(-5deg);
  filter: drop-shadow(0 4px 8px rgba(99, 102, 241, 0.4));
}

.nav-item:hover .nav-icon {
  animation: iconPulse 0.5s ease;
}

@keyframes iconPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1.1); }
}

[dir="rtl"] .nav-icon {
  margin: 0;
}

[dir="rtl"] .nav-icon {
  margin: 0;
}

/* --- Main Content --- */
.settings-main-content {
  flex: 1;
  min-height: 0;
  padding: 40px;
  overflow-y: auto;
  overflow-x: hidden;
  background: transparent;
}

.header {
  margin-bottom: 35px;
}

.header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 8px;
}

.header p {
  color: var(--text-secondary);
  font-size: 1.05rem;
}

/* --- Profile Header --- */
.profile-header {
  display: flex;
  align-items: center;
  gap: 25px;
  margin-bottom: 35px;
  padding-bottom: 35px;
  border-bottom: 1px solid var(--border-color);
}

.avatar-container {
  position: relative;
  width: 110px;
  height: 110px;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--bg-card);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.loading-bar {
  margin-top: 15px;
  color: var(--primary-color);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-msg {
  margin-top: 15px;
  color: #ef4444;
  background: #fef2f2;
  padding: 10px 15px;
  border-radius: 8px;
  border: 1px solid #fecaca;
  display: flex;
  align-items: center;
  gap: 10px;
}

.success-msg {
  margin-top: 15px;
  color: #10b981;
  background: #f0fdf4;
  padding: 10px 15px;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.upload-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  background: var(--primary-color);
  color: white;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
  font-size: 1.2rem;
  box-shadow: 0 4px 8px var(--primary-bg);
}

.upload-btn:hover {
  transform: scale(1.1) rotate(90deg);
  background: var(--primary-hover);
}

/* --- Form --- */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.full-width {
  grid-column: span 2;
}

label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
  margin-right: 4px;
}

input, textarea {
  padding: 14px 18px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-hover);
  font-size: 1rem;
  transition: var(--transition);
  outline: none;
  color: var(--text-main);
}

input:focus, textarea:focus {
  border-color: var(--primary-color);
  background: var(--bg-card);
  box-shadow: 0 0 0 4px var(--primary-bg);
  transform: translateY(-2px);
}

.project-select {
  padding: 14px 18px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-hover);
  font-size: 1rem;
  transition: var(--transition);
  outline: none;
  color: var(--text-main);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: left 20px center;
  background-size: 20px;
}

.project-select:focus {
  border-color: var(--primary-color);
  background-color: var(--bg-card);
  box-shadow: 0 0 0 4px var(--primary-bg);
}

/* --- Buttons --- */
.actions {
  margin-top: 40px;
  display: flex;
  justify-content: flex-end;
  gap: 18px;
  padding-top: 30px;
}

.btn {
  padding: 14px 30px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: var(--transition);
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
}

.btn-save {
  min-width: 140px;
}

.btn-success {
  background-color: #10b981 !important;
  color: white !important;
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  0% { transform: scale(0.95); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}



/* --- Placeholder --- */
.placeholder-view {
  padding: 80px 40px;
  text-align: center;
  color: var(--text-secondary);
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

/* --- Animations --- */
.settings-fade-enter-active,
.settings-fade-leave-active {
  transition: all 0.25s ease;
}

.settings-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.settings-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

@media (max-width: 768px) {
  .dashboard-container {
    flex-direction: column;
  }
  .settings-sidebar {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    padding: 15px;
    border-left: none;
    border-bottom: 1px solid var(--border-color);
  }
  .nav-item {
    white-space: nowrap;
    padding: 10px 15px;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .full-width {
    grid-column: span 1;
  }
}

/* Language Selector Styles */
.preferences-section h3 {
  margin-bottom: 20px;
  color: var(--text-main);
  font-size: 1.2rem;
}

.language-selector {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.lang-option {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 25px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  background: var(--bg-card);
  transition: all 0.2s ease;
  min-width: 180px;
}

.lang-option:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.lang-option.active {
  border-color: var(--primary-color);
  background: var(--primary-bg);
  box-shadow: 0 0 0 2px var(--primary-bg);
}

.flag {
  font-size: 1.8rem;
}

.lang-name {
  font-weight: 600;
  font-size: 1.05rem;
  color: var(--text-main);
}

/* Font Selector Styles */
.font-selector {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.font-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 15px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  background: var(--bg-card);
  transition: all 0.2s ease;
  min-width: 120px;
  text-align: center;
}

.font-option:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.font-option.active {
  border-color: var(--primary-color);
  background: var(--primary-bg);
}

.font-preview {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text-main);
}

/* Theme Selector Styles */
.theme-selector {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 15px;
  border: 2px solid var(--border-color);
  border-radius: 16px;
  cursor: pointer;
  background: var(--bg-card);
  transition: all 0.2s ease;
  min-width: 140px;
}

[data-theme="dark"] .theme-option {
  background: var(--slate-100);
}

.theme-option:hover {
  border-color: var(--primary-color);
  transform: translateY(-4px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.1);
}

.theme-option.active {
  border-color: var(--primary-color);
  background: var(--primary-bg);
  box-shadow: 0 0 0 2px var(--primary-bg);
}

.theme-preview {
  width: 100%;
  height: 60px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

/* ─── Premium Color Selector ─── */
.color-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.color-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.color-swatch {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.25s ease,
              outline 0.15s ease;
  outline: 3px solid transparent;
  outline-offset: 3px;
}

.color-option:hover .color-swatch {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 10px 24px rgba(0,0,0,0.2);
}

.color-option.active .color-swatch {
  transform: translateY(-4px) scale(1.08);
  outline: 3px solid var(--text-main);
  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
}

.check-mark {
  width: 26px;
  height: 26px;
  background: rgba(255,255,255,0.3);
  backdrop-filter: blur(4px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 700;
}

.check-pop-enter-active { animation: checkPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.check-pop-leave-active { animation: checkPopOut 0.2s ease; }
@keyframes checkPopIn  { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes checkPopOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0); opacity: 0; } }

.color-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 600;
  text-align: center;
  transition: color 0.2s ease;
}

.color-option.active .color-label {
  color: var(--text-main);
}

.theme-preview.light {
  background: #f8fafc;
}

.theme-preview.dark {
  background: #0f172a;
}

.theme-preview.system {
  background: linear-gradient(135deg, #f8fafc 50%, #0f172a 50%);
}

.theme-option span {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-main);
}

/* --- Maintenance Tab --- */
.maintenance-card {
  background: var(--bg-hover);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  border: 1px dashed var(--border-color);
  max-width: 600px;
  margin: 0 auto;
}

.maintenance-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.maintenance-card h3 {
  font-size: 1.5rem;
  margin-bottom: 15px;
  color: var(--text-main);
}

.maintenance-card p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 30px;
}

.run-btn {
  padding: 15px 40px;
  font-size: 1.1rem;
  background: #f43f5e !important;
  color: white !important;
}

.run-btn:hover {
  background: #e11d48 !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(244, 63, 94, 0.3);
}

.status-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px;
  border-radius: 12px;
  font-weight: 600;
}

/* --- Security Premium Styles --- */
.security-tab-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
  animation: slideInDown 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.security-header-premium {
  position: relative;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  border-radius: 24px;
  overflow: hidden;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(var(--primary-rgb, 0, 82, 204), 0.2);
}

.header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 70% 20%, rgba(255,255,255,0.1) 0%, transparent 40%);
  opacity: 0.6;
}

.header-content-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 30px;
  z-index: 1;
}

.shield-container {
  position: relative;
  width: 80px;
  height: 80px;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  color: white;
  border: 1px solid rgba(255,255,255,0.3);
}

.shield-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130%;
  height: 130%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%);
  filter: blur(25px);
  z-index: -1;
  animation: pulseGlow 3s infinite;
}

@keyframes pulseGlow {
  0%, 100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
}

.header-text-premium h2 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  color: white;
  letter-spacing: -0.5px;
}

.header-text-premium p {
  margin: 6px 0 0;
  color: rgba(255,255,255,0.9);
  font-size: 1.05rem;
}

.security-grid-premium {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 30px;
}

@media (max-width: 900px) {
  .security-grid-premium {
    grid-template-columns: 1fr;
  }
}

.security-card-premium {
  padding: 35px;
  border-radius: 28px;
  transition: all 0.3s ease;
  position: relative;
}

.glass-morphic {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
}

[data-theme="dark"] .glass-morphic {
  background: rgba(29, 33, 37, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 35px;
}

.icon-circle {
  width: 44px;
  height: 44px;
  background: rgba(var(--primary-rgb, 0, 82, 204), 0.1);
  color: var(--primary);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.icon-circle.secondary { color: var(--primary); background: var(--primary-bg); }
.icon-circle.tertiary  { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }

.card-title-row h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
}

.form-floating-group {
  margin-bottom: 25px;
}

.form-floating-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 10px;
  margin-left: 5px;
}

.premium-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 20px;
  color: var(--text-muted);
  font-size: 1rem;
  transition: all 0.3s ease;
}

.premium-input-wrapper input {
  width: 100%;
  padding: 16px 20px 16px 50px;
  background: var(--bg-hover);
  border: 2px solid transparent;
  border-radius: 16px;
  color: var(--text-main);
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-focus-line {
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary);
  transform: scaleX(0);
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border-radius: 2px;
}

.premium-input-wrapper input:focus {
  outline: none;
  background: var(--bg-card);
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  border-color: rgba(var(--primary-rgb, 0, 82, 204), 0.1);
}

.premium-input-wrapper input:focus + .input-focus-line {
  transform: scaleX(1);
}

.premium-status-toast {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 20px;
  border-radius: 16px;
  margin: 20px 0;
  font-weight: 600;
  animation: popIn 0.3s ease-out;
}

.premium-status-toast.error { background: rgba(244, 63, 94, 0.08); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); }
.premium-status-toast.success { background: rgba(16, 185, 129, 0.08); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }

.premium-save-button {
  position: relative;
  width: 100%;
  padding: 18px;
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  cursor: pointer;
  margin-top: 25px;
  border-radius: 18px;
  font-weight: 800;
  font-size: 1.05rem;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  box-shadow: 0 8px 25px rgba(var(--primary-rgb, 0, 82, 204), 0.3);
}

.premium-save-button:hover:not(:disabled) {
  transform: translateY(-4px);
  filter: brightness(1.1);
  box-shadow: 0 15px 35px rgba(var(--primary-rgb, 0, 82, 204), 0.4);
}

.premium-save-button:active:not(:disabled) {
  transform: translateY(-1px);
}

.premium-session-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 25px;
  background: var(--bg-hover);
  border-radius: 20px;
  border: 1px solid var(--border-color);
  transition: transform 0.3s ease;
}

.premium-session-card:hover {
  transform: scale(1.02);
}

.session-device-visual {
  position: relative;
  width: 56px;
  height: 56px;
  background: var(--bg-card);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.active-pulse-ring {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  background: #10b981;
  border-radius: 50%;
  border: 3px solid var(--bg-card);
}

.active-pulse-ring::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background: inherit;
  border-radius: inherit;
  animation: rippleRing 2s infinite;
}

@keyframes rippleRing {
  from { transform: scale(1); opacity: 0.8; }
  to { transform: scale(3); opacity: 0; }
}

.session-badge-active {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 800;
  margin-top: 10px;
}

.session-badge-active .dot {
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
}

.minimalist-card {
  margin-top: 30px;
  background: var(--bg-hover);
  border: 1px dashed var(--border-color);
}

.tips-list {
  padding-left: 20px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
}

.tips-list li {
  margin-bottom: 12px;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
/* --- Profile Premium Styles --- */
.profile-tab-premium {
  display: flex;
  flex-direction: column;
  gap: 30px;
  animation: slideInUp 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.profile-hero-premium {
  position: relative;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-radius: 28px;
  padding: 50px;
  display: flex;
  align-items: center;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0,0,0,0.15);
}

[data-theme="dark"] .profile-hero-premium {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

.hero-bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='rgba(255,255,255,0.03)' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.hero-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 35px;
  z-index: 2;
}

.profile-avatar-wrapper {
  position: relative;
  width: 130px;
  height: 130px;
}

.avatar-img-premium {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  border: 4px solid rgba(255,255,255,0.2);
  box-shadow: 0 8px 16px rgba(0,0,0,0.2);
}

.avatar-glow {
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  background: radial-gradient(circle, rgba(var(--primary-rgb, 0, 82, 204), 0.2) 0%, transparent 70%);
  border-radius: 50%;
  z-index: -1;
}

.avatar-edit-badge {
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 38px;
  height: 38px;
  background: var(--primary);
  color: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 4px solid #1e293b;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

[data-theme="dark"] .avatar-edit-badge {
  border-color: #0f172a;
}

.avatar-edit-badge:hover {
  transform: scale(1.1) rotate(10deg);
  background: var(--primary-hover);
}

.profile-hero-text h2 {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 800;
  color: white;
  letter-spacing: -1px;
}

.profile-hero-text p {
  margin: 8px 0 0;
  color: rgba(255,255,255,0.8);
  font-size: 1.1rem;
}

.profile-card {
  padding: 40px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  .hero-content {
    flex-direction: column;
    text-align: center;
  }
}

.profile-actions-premium {
  margin-top: 35px;
  display: flex;
  justify-content: flex-end;
}

.header-minimalist {
    padding-bottom: 30px;
}

@keyframes slideInUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideInDown {
  from { transform: translateY(-30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
/* --- Preferences Premium Styles --- */
.preferences-tab-premium {
  animation: slideInUp 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.preferences-grid-premium {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

@media (max-width: 1024px) {
  .preferences-grid-premium {
    grid-template-columns: 1fr;
  }
}

.preferences-column {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.preferences-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.preferences-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.12);
}

/* Language Cards */
.premium-lang-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 10px;
}

.premium-lang-card {
  position: relative;
  background: var(--n700);
  border-radius: 20px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  overflow: hidden;
}

[data-theme="light"] .premium-lang-card {
  background: #f8fafc;
}

.premium-lang-card:hover {
  background: var(--n600);
  border-color: rgba(255,255,255,0.1);
}

.premium-lang-card.active {
  background: var(--primary-bg-light, rgba(0, 82, 204, 0.1));
  border-color: var(--primary);
}

.lang-flag-wrapper {
  font-size: 2.5rem;
  transition: transform 0.3s ease;
}

.premium-lang-card:hover .lang-flag-wrapper {
  transform: scale(1.15) rotate(5deg);
}

.lang-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-title {
  font-weight: 700;
  font-size: 1.1rem;
}

.lang-status {
  color: var(--primary);
  font-size: 0.9rem;
}

/* Theme Cards */
.premium-theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 10px;
}

.premium-theme-card {
  background: var(--n700);
  border-radius: 20px;
  padding: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  text-align: center;
}

[data-theme="light"] .premium-theme-card {
  background: #f8fafc;
}

.premium-theme-card:hover {
  transform: translateY(-3px);
  background: var(--n600);
}

.premium-theme-card.active {
  border-color: var(--primary);
  background: var(--primary-bg-light, rgba(0, 82, 204, 0.1));
}

.theme-visual-preview {
  height: 60px;
  border-radius: 12px;
  margin-bottom: 10px;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.premium-theme-card.light .theme-visual-preview { background: #ffffff; }
.premium-theme-card.dark .theme-visual-preview { background: #1e293b; }
.premium-theme-card.system .theme-visual-preview { background: linear-gradient(135deg, #ffffff 50%, #1e293b 50%); }

.preview-header { height: 12px; background: rgba(0,0,0,0.1); }
.premium-theme-card.dark .preview-header { background: rgba(255,255,255,0.1); }

.theme-sidebar { position: absolute; left: 0; top: 12px; width: 15px; bottom: 0; background: rgba(0,0,0,0.05); }
.premium-theme-card.dark .theme-sidebar { background: rgba(255,255,255,0.05); }

.theme-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}

/* Color Palette */
.premium-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 15px;
  margin-top: 10px;
}

.premium-color-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.color-swatch-premium {
  width: 50px;
  height: 50px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.premium-color-option:hover .color-swatch-premium {
  transform: scale(1.1) rotate(5deg);
}

.premium-color-option.active .color-swatch-premium {
  box-shadow: 0 0 0 3px var(--bg-card), 0 0 0 6px var(--primary);
}

.color-name {
  font-size: 0.75rem;
  font-weight: 500;
  opacity: 0.8;
}

/* Font List */
.premium-font-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.premium-font-card {
  background: var(--n700);
  border-radius: 16px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

[data-theme="light"] .premium-font-card {
  background: #f8fafc;
}

.premium-font-card:hover {
  background: var(--n600);
}

.premium-font-card.active {
  border-color: var(--primary);
  background: var(--primary-bg-light, rgba(0, 82, 204, 0.1));
}

.font-preview-circle {
  width: 45px;
  height: 45px;
  background: var(--bg-body);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
  border: 1px solid var(--border-color);
}

.font-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.font-name-label {
  font-weight: 700;
  font-size: 1rem;
}

.font-sample {
  font-size: 0.75rem;
  opacity: 0.6;
  margin-top: 2px;
}

.active-radio {
  width: 22px;
  height: 22px;
  border: 2px solid var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-dot {
  width: 10px;
  height: 10px;
  background: var(--primary);
  border-radius: 50%;
  animation: checkPop 0.3s ease-out;
}

@keyframes checkScale {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
/* --- Maintenance Premium Styles --- */
.maintenance-tab-premium {
  animation: slideInUp 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.maintenance-header-premium {
  position: relative;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 28px;
  padding: 40px;
  margin-bottom: 30px;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(16, 185, 129, 0.2);
}

.header-text-premium.secondary h2 {
    color: white;
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
}

.header-text-premium.secondary p {
    color: rgba(255,255,255,0.8);
    margin-top: 5px;
}

.maintenance-header-premium .header-visual .tools-container {
  width: 70px;
  height: 70px;
  background: rgba(255,255,255,0.15);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  position: relative;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255,255,255,0.2);
}

.tools-glow {
    position: absolute;
    width: 100%; height: 100%;
    background: radial-gradient(circle, white 0%, transparent 70%);
    opacity: 0.1;
    animation: pulse 2s infinite;
}

.maintenance-grid-premium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 25px;
}

@media (max-width: 1100px) {
  .maintenance-grid-premium {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .maintenance-grid-premium {
    grid-template-columns: 1fr;
  }
}

.maintenance-card-premium {
  padding: 35px;
  border-radius: 28px;
  transition: all 0.3s ease;
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
}

[data-theme="dark"] .maintenance-card-premium {
  background: rgba(29, 33, 37, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.maintenance-card-premium:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.12);
}

.cleanup-actions {
  margin-top: 30px;
  margin-bottom: 15px;
}

.premium-run-button {
  width: 100%;
  padding: 18px;
  border-radius: 16px;
  border: none;
  background: #10b981;
  color: white;
  font-weight: 800;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  font-size: 1.1rem;
}

.premium-run-button:hover {
  transform: scale(1.02);
  background: #059669;
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
}

.premium-run-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.health-indicators-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 15px;
}

.health-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: var(--n700);
  border-radius: 16px;
  transition: transform 0.2s;
}

.health-indicator:hover {
    transform: scale(1.02);
}

[data-theme="light"] .health-indicator {
  background: #f8fafc;
}

.indicator-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 0.95rem;
}

.indicator-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 20px;
}

.indicator-status.success { 
    color: #10b981; 
    background: rgba(16, 185, 129, 0.1);
}

.indicator-status.info { 
    color: var(--primary); 
    background: var(--primary-bg);
}

.indicator-status .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 10px currentColor;
  animation: pulse 1.5s infinite;
}

.usage-visual {
  margin-top: 20px;
}

.usage-bar-container {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.usage-bar {
  flex: 1;
  height: 18px;
  background: rgba(0,0,0,0.2);
  border-radius: 9px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
}

.usage-progress {
  height: 100%;
  background: linear-gradient(90deg, #6366f1 0%, #06b6d4 100%);
  border-radius: 9px;
  min-width: 8px; /* High importance: ensures visibility even for 0.1% */
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
  transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.usage-percentage-badge {
    background: var(--primary-bg);
    color: var(--primary-color);
    padding: 2px 8px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 800;
    border: 1px solid var(--primary-color);
    white-space: nowrap;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.usage-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.card-desc {
    font-size: 1.05rem;
    color: var(--text-muted);
    line-height: 1.6;
    margin-top: 10px;
}

/* --- Preferences Premium Styles --- */
.preferences-header-premium {
  position: relative;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-gradient-end, var(--primary-hover)) 100%);
  border-radius: 28px;
  padding: 40px;
  margin-bottom: 30px;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(99, 102, 241, 0.2);
  transform: translateY(20px);
  opacity: 0;
  animation: slideInUpPremium 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.preferences-header-premium .header-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: url("https://www.transparenttextures.com/patterns/carbon-fibre.png");
  opacity: 0.05;
  pointer-events: none;
}

.header-content-wrapper-premium {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 25px;
}

.sliders-container-premium {
  width: 70px;
  height: 70px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  position: relative;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.sliders-glow-premium {
  position: absolute;
  inset: -5px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
  opacity: 0;
  animation: pulseGlow 3s infinite;
}

.header-text-premium.tertiary h2 {
  color: white;
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-text-premium.tertiary p {
  color: rgba(255, 255, 255, 0.9);
  margin: 5px 0 0 0;
  font-size: 1.1rem;
  font-weight: 500;
}

@keyframes slideInUpPremium {
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes pulseGlow {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.1); }
}

/* RTL Support for Header */
[dir="rtl"] .header-content-wrapper-premium {
  flex-direction: row;
}

</style>
