<template>
  <div class="login-inner">
    <div class="form-head">
      <div class="form-icon">
        <i class="fa-solid fa-bolt-lightning"></i>
      </div>
      <h2>{{ $t('auth.login_title') }}</h2>
      <p>{{ $t('auth.welcome_back') }}</p>
    </div>

    <form @submit.prevent="handleLogin" class="auth-form" novalidate>
      <div class="form-field" :class="{ focused: focusedField === 'username', filled: form.username }">
        <label>{{ $t('auth.username') }}</label>
        <div class="field-wrap">
          <i class="fa-solid fa-user field-ico"></i>
          <input
            v-model="form.username"
            type="text"
            :placeholder="$t('auth.username')"
            required
            autocomplete="username"
            @focus="focusedField = 'username'"
            @blur="focusedField = ''"
          />
        </div>
      </div>

      <div class="form-field" :class="{ focused: focusedField === 'password', filled: form.password }">
        <label>{{ $t('auth.password') }}</label>
        <div class="field-wrap">
          <i class="fa-solid fa-lock field-ico"></i>
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="$t('auth.password')"
            required
            autocomplete="current-password"
            @focus="focusedField = 'password'"
            @blur="focusedField = ''"
          />
          <button type="button" class="eye-btn" @click="showPassword = !showPassword" tabindex="-1">
            <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
          </button>
        </div>
      </div>

      <div class="form-options">
        <label class="checkbox-row">
          <input type="checkbox" v-model="rememberMe" class="sr-only">
          <span class="custom-check" :class="{ checked: rememberMe }">
            <i v-if="rememberMe" class="fa-solid fa-check"></i>
          </span>
          <span>{{ $t('auth.remember_me') }}</span>
        </label>
        <a href="#" class="link-muted">{{ $t('auth.forgot_password') }}</a>
      </div>

      <transition name="error-pop">
        <div v-if="errorMessage" class="error-banner">
          <i class="fa-solid fa-circle-exclamation"></i>
          {{ errorMessage }}
        </div>
      </transition>

      <button
        type="submit"
        class="auth-btn btn-save"
        :class="{ 'btn-loading': loading, 'btn-success': isSuccess }"
        :disabled="loading"
      >
        <span v-if="loading"><i class="fa-solid fa-spinner fa-spin"></i></span>
        <span v-else-if="isSuccess"><i class="fa-solid fa-check"></i></span>
        <span v-else>{{ $t('auth.login_action') }}</span>
      </button>
    </form>

    <p class="switch-link">
      {{ $t('auth.no_account') }}
      <a href="#" @click.prevent="$emit('flip')">{{ $t('auth.register_action') }}</a>
    </p>
  </div>
</template>

<script>
import axios from '../plugins/axios';

export default {
  name: 'Login',
  emits: ['flip', 'login-success'],
  data() {
    return {
      form: { username: '', password: '' },
      rememberMe: false,
      showPassword: false,
      focusedField: '',
      loading: false,
      isSuccess: false,
      errorMessage: '',
    };
  },
  methods: {
    async handleLogin() {
      this.loading = true;
      this.errorMessage = '';
      try {
        const response = await axios.post('/api/login/', this.form);
        if (response.data.status === 'success') {
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('username', response.data.username);
          
          // Store JWT Tokens
          localStorage.setItem('access_token', response.data.access);
          localStorage.setItem('refresh_token', response.data.refresh);
          
          // Store user role and superuser status
          const role = response.data.group_name || (response.data.is_superuser ? 'Super Admin' : 'User');
          localStorage.setItem('user_role', role);
          localStorage.setItem('is_superuser', response.data.is_superuser ? 'true' : 'false');

          if (response.data.project_id) {
            localStorage.setItem('user_project_id', response.data.project_id);
            localStorage.setItem('user_project_name', response.data.project_name || 'General');
          } else {
            localStorage.removeItem('user_project_id');
            localStorage.removeItem('user_project_name');
          }
          if (response.data.permissions) {
            localStorage.setItem('user_permissions', JSON.stringify(response.data.permissions));
          }

          this.isSuccess = true;
          setTimeout(() => {
            this.isSuccess = false;
            this.$emit('login-success');
          }, 1000);
        } else {
          this.loading = false;
        }
      } catch (error) {
        this.errorMessage = error.response?.data?.error || this.$t('auth.messages.invalid_credentials');
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
/* ── Container ── */
.login-inner {
  width: 100%;
  animation: formEntrance 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes formEntrance {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Header ── */
.form-head { text-align: center; margin-bottom: 36px; }

.form-icon {
  width: 58px;
  height: 58px;
  background: linear-gradient(135deg, var(--primary), #8b5cf6);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: white;
  margin: 0 auto 20px;
  box-shadow: 0 12px 32px var(--primary-bg);
  animation: iconBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
}

@keyframes iconBounce {
  from { transform: scale(0.5); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

.form-head h2 {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.form-head p {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
}

/* ── Fields ── */
.form-field {
  margin-bottom: 20px;
  position: relative;
}

.form-field label {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 8px;
  transition: color 0.2s;
}

.form-field.focused label {
  color: var(--primary);
}

.field-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.field-wrap input {
  width: 100%;
  padding: 13px 16px 13px 44px;
  background: var(--bg-hover);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  font-size: 0.95rem;
  color: var(--text-main);
  outline: none;
  transition: all 0.25s ease;
  box-sizing: border-box;
}

.field-wrap input::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}

.field-wrap input:focus {
  border-color: var(--primary);
  background: var(--bg-card);
  box-shadow: 0 0 0 4px var(--primary-bg);
}

.field-ico {
  position: absolute;
  left: 14px;
  font-size: 14px;
  color: var(--text-muted);
  pointer-events: none;
  transition: color 0.2s;
  z-index: 1;
}

.form-field.focused .field-ico {
  color: var(--primary);
}

.eye-btn {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: color 0.2s;
  font-size: 14px;
}

.eye-btn:hover { color: var(--text-main); }

/* ── Checkbox Row ── */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}

.sr-only { display: none; }

.custom-check {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 2px solid var(--border-color);
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: white;
  flex-shrink: 0;
  transition: all 0.2s;
}

.custom-check.checked {
  background: var(--primary);
  border-color: var(--primary);
}

.link-muted {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
  transition: opacity 0.2s;
}

.link-muted:hover { opacity: 0.75; }

/* ── Error ── */
.error-pop-enter-active { animation: errorPop 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.error-pop-leave-active { animation: errorPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) reverse; }

@keyframes errorPop {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.error-banner {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  font-size: 0.88rem;
  font-weight: 500;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ── Submit Button ── */
.auth-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary), #8b5cf6);
  color: white;
  box-shadow: 0 6px 20px var(--primary-bg);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 28px;
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px var(--primary-bg);
}

.auth-btn:active:not(:disabled) {
  transform: translateY(0);
}

/* ── Switch Link ── */
.switch-link {
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
}

.switch-link a {
  color: var(--primary);
  font-weight: 700;
  text-decoration: none;
  margin-left: 4px;
  transition: opacity 0.2s;
}

.switch-link a:hover { opacity: 0.8; }
</style>
