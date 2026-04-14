<template>
  <div class="signup-inner">
    <div class="form-head">
      <div class="form-icon">
        <i class="fa-solid fa-user-plus"></i>
      </div>
      <h2>{{ $t('auth.register_title') }}</h2>
      <p>{{ $t('auth.join_us') }}</p>
    </div>

    <form @submit.prevent="registerUser" class="auth-form" novalidate>
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
            autocomplete="new-password"
            @focus="focusedField = 'password'"
            @blur="focusedField = ''"
          />
          <button type="button" class="eye-btn" @click="showPassword = !showPassword" tabindex="-1">
            <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
          </button>
        </div>
      </div>

      <!-- Password Strength Meter -->
      <div v-if="form.password" class="strength-row">
        <div class="strength-bar">
          <div class="strength-fill" :class="strengthClass" :style="{ width: strengthWidth }"></div>
        </div>
        <span class="strength-label" :class="strengthClass">{{ strengthLabel }}</span>
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
        <span v-else>{{ $t('auth.create_account') }}</span>
      </button>
    </form>

    <p class="switch-link">
      {{ $t('auth.already_have_account') }}
      <a href="#" @click.prevent="$emit('flip')">{{ $t('auth.login_action') }}</a>
    </p>
  </div>
</template>

<script>
import axios from '@/plugins/axios';

export default {
  name: 'Signup',
  emits: ['flip'],
  data() {
    return {
      form: { username: '', password: '' },
      showPassword: false,
      focusedField: '',
      loading: false,
      isSuccess: false,
      errorMessage: '',
    };
  },
  computed: {
    passwordStrength() {
      const p = this.form.password;
      if (!p) return 0;
      let s = 0;
      if (p.length >= 8) s++;
      if (/[A-Z]/.test(p)) s++;
      if (/[0-9]/.test(p)) s++;
      if (/[^A-Za-z0-9]/.test(p)) s++;
      return s;
    },
    strengthWidth() {
      return `${(this.passwordStrength / 4) * 100}%`;
    },
    strengthClass() {
      const map = ['', 'weak', 'fair', 'good', 'strong'];
      return map[this.passwordStrength] || '';
    },
    strengthLabel() {
      const map = ['', this.$t('auth.strength.weak'), this.$t('auth.strength.fair'), this.$t('auth.strength.good'), this.$t('auth.strength.strong')];
      return map[this.passwordStrength] || '';
    },
  },
  methods: {
    async registerUser() {
      this.loading = true;
      this.errorMessage = '';
      try {
        await axios.post('/api/register/', this.form);
        this.isSuccess = true;
        setTimeout(() => {
          this.isSuccess = false;
          this.loading = false;
          this.$emit('flip');
        }, 1200);
      } catch (error) {
        this.errorMessage = error.response?.data?.error || this.$t('auth.messages.register_failed');
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
/* Reuse identical pattern to Login.vue */
.signup-inner {
  width: 100%;
  animation: formEntrance 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes formEntrance {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

.form-head { text-align: center; margin-bottom: 36px; }

.form-icon {
  width: 58px;
  height: 58px;
  background: linear-gradient(135deg, #14b8a6, #06b6d4);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: white;
  margin: 0 auto 20px;
  box-shadow: 0 12px 32px rgba(20, 184, 166, 0.35);
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

.form-field { margin-bottom: 20px; position: relative; }

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

.form-field.focused label { color: #14b8a6; }

.field-wrap { position: relative; display: flex; align-items: center; }

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

.field-wrap input::placeholder { color: var(--text-muted); opacity: 0.6; }

.field-wrap input:focus {
  border-color: #14b8a6;
  background: var(--bg-card);
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
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

.form-field.focused .field-ico { color: #14b8a6; }

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

/* Strength Meter */
.strength-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: -12px;
  margin-bottom: 16px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: var(--border-color);
  border-radius: 99px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease, background 0.4s ease;
}

.strength-fill.weak   { background: #ef4444; }
.strength-fill.fair   { background: #f97316; }
.strength-fill.good   { background: #eab308; }
.strength-fill.strong { background: #22c55e; }

.strength-label {
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.strength-label.weak   { color: #ef4444; }
.strength-label.fair   { color: #f97316; }
.strength-label.good   { color: #eab308; }
.strength-label.strong { color: #22c55e; }

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

.auth-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, #14b8a6, #06b6d4);
  color: white;
  box-shadow: 0 6px 20px rgba(20, 184, 166, 0.35);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 28px;
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(20, 184, 166, 0.45);
}

.auth-btn:active:not(:disabled) { transform: translateY(0); }

.switch-link {
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
}

.switch-link a {
  color: #14b8a6;
  font-weight: 700;
  text-decoration: none;
  margin-left: 4px;
  transition: opacity 0.2s;
}

.switch-link a:hover { opacity: 0.8; }
</style>
