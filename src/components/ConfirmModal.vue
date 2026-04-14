<template>
  <div class="modal-backdrop" v-if="isOpen" @click.self="cancel">
    <div class="confirm-modal-v2">
      <div class="confirm-modal-content">
        <!-- Icon section -->
        <div class="confirm-icon-wrapper" :class="typeClass">
          <div class="pulse-ring"></div>
          <i :class="iconClass"></i>
        </div>
        
        <!-- Text section -->
        <div class="confirm-text">
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
        </div>
        
        <!-- Actions -->
        <div class="confirm-actions">
          <button class="btn-modern btn-cancel" @click="cancel">
            {{ cancelText || $t('common.cancel') || 'Cancel' }}
          </button>
          <button class="btn-modern" :class="'btn-' + type" @click="confirm">
            {{ confirmText || $t('common.confirm') || 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfirmModal',
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    confirmText: {
      type: String,
      default: ''
    },
    cancelText: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'danger', // danger, warning, primary
      validator: value => ['danger', 'warning', 'primary'].includes(value)
    }
  },
  computed: {
    typeClass() {
      return `icon-${this.type}`;
    },
    iconClass() {
      switch (this.type) {
        case 'danger': return 'fa-solid fa-trash-can';
        case 'warning': return 'fa-solid fa-triangle-exclamation';
        default: return 'fa-solid fa-circle-info';
      }
    }
  },
  methods: {
    confirm() {
      this.$emit('confirm');
    },
    cancel() {
      this.$emit('cancel');
    }
  }
}
</script>

<style scoped>
/* Modal Backdrop uses global .modal-backdrop if available, but we recreate here for safety */
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.5); /* slightly darker backdrop */
    backdrop-filter: blur(8px);
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.confirm-modal-v2 {
    width: 440px;
    background: var(--bg-card, #ffffff);
    border-radius: 20px;
    border: 1px solid var(--border-color, #e2e8f0);
    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.15);
    animation: modalScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
}

@keyframes modalScaleIn {
    from { transform: scale(0.9) translateY(20px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
}

.confirm-modal-content {
    padding: 40px 32px;
    text-align: center;
}

.confirm-icon-wrapper {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    margin: 0 auto 24px;
    position: relative;
}

.icon-danger {
    background: var(--danger-bg, #fee2e2);
    color: var(--danger, #ef4444);
}

.icon-warning {
    background: var(--warning-bg, #fef3c7);
    color: var(--warning, #f59e0b);
}

.icon-primary {
    background: var(--primary-bg);
    color: var(--primary);
}

.pulse-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    opacity: 0.2;
    animation: pulseIcon 2s infinite;
}

.icon-danger .pulse-ring { border: 4px solid var(--danger, #ef4444); }
.icon-warning .pulse-ring { border: 4px solid var(--warning, #f59e0b); }
.icon-primary .pulse-ring { border: 4px solid var(--primary); }

@keyframes pulseIcon {
    0% { transform: scale(1); opacity: 0.5; }
    70% { transform: scale(1.4); opacity: 0; }
    100% { transform: scale(1.4); opacity: 0; }
}

.confirm-text h3 {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-main, #1e293b);
    margin: 0 0 12px;
}

.confirm-text p {
    font-size: 15px;
    color: var(--text-muted, #64748b);
    line-height: 1.6;
    margin: 0 0 32px;
}

.confirm-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
}

.btn-modern {
    flex: 1;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
}

.btn-cancel {
    background: var(--bg-hover, #f1f5f9);
    color: var(--text-muted, #475569);
}

.btn-cancel:hover {
    background: var(--slate-200, #e2e8f0);
    transform: translateY(-2px);
}

.btn-danger {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}
.btn-danger:hover {
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
    transform: translateY(-2px);
}

.btn-warning {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}
.btn-warning:hover {
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
    transform: translateY(-2px);
}

.btn-primary {
    background: linear-gradient(135deg, var(--primary), var(--primary-hover));
    color: white;
    box-shadow: 0 4px 12px var(--primary-bg);
}
.btn-primary:hover {
    box-shadow: 0 6px 20px var(--primary-bg);
    transform: translateY(-2px);
}
</style>
