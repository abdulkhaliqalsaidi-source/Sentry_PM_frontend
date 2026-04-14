<template>
  <div class="lottie-wrapper" 
       :style="{ width, height, position: 'relative' }"
       @mouseenter="handleMouseEnter"
       @mouseleave="handleMouseLeave">
    
    <!-- 1. The Static/Fallback Icon (Visible by default, hidden when Lottie is ready) -->
    <div v-if="fallbackIcon && !isLoaded" 
         class="icon-layer fallback-layer">
      <i :class="fallbackIcon" :style="{ fontSize: iconSize }"></i>
    </div>

    <!-- 2. The Lottie Animation (Hidden until fully loaded and validated) -->
    <div v-if="animationLink && isValidated && !loadError" 
         class="icon-layer lottie-layer"
         :style="{ opacity: isLoaded ? 1 : 0 }">
      <Vue3Lottie
        v-bind="lottieProps"
        ref="lottieRef"
        @on-animation-loaded="onAnimationLoaded"
        @on-error="onAnimationError"
      />
    </div>

    <!-- 3. Final Fallback if everything fails (No link or 404) -->
    <div v-if="(!animationLink || loadError) && !fallbackIcon" class="icon-layer error-layer">
      <i class="fa-solid fa-circle-question" :style="{ fontSize: iconSize }"></i>
    </div>

    <div v-if="label" class="lottie-label">{{ label }}</div>
  </div>
</template>

<script>
import { Vue3Lottie } from 'vue3-lottie';

export default {
  name: 'LottieAnimation',
  components: { Vue3Lottie },
  props: {
    animationData: { type: Object, default: null },
    animationLink: { type: String, default: '' },
    loop: { type: [Boolean, Number], default: true },
    autoPlay: { type: Boolean, default: true },
    speed: { type: Number, default: 1 },
    width: { type: String, default: '200px' },
    height: { type: String, default: '200px' },
    pauseOnHover: { type: Boolean, default: false },
    trigger: { type: String, default: 'play' }, 
    fallbackIcon: { type: String, default: '' },
    direction: { type: String, default: 'forward' },
    backgroundColor: { type: String, default: 'transparent' },
    label: { type: String, default: '' }
  },
  data() {
    return {
      loadError: false,
      isLoaded: false,
      isValidated: false
    }
  },
  computed: {
    iconSize() {
      return (typeof this.width === 'string' && this.width.includes('px')) ? this.width : '20px';
    },
    lottieProps() {
      const props = {
        loop: this.loop,
        autoPlay: this.autoPlay && this.trigger !== 'hover',
        speed: this.speed,
        width: '100%',
        height: '100%',
        pauseOnHover: this.pauseOnHover,
        direction: this.direction,
        backgroundColor: this.backgroundColor
      };
      
      if (this.animationData) props.animationData = this.animationData;
      else if (this.animationLink) props.animationLink = this.animationLink;
      
      return props;
    }
  },
  watch: {
    animationLink: {
      immediate: true,
      handler(newVal) {
        if (!newVal) {
          this.isValidated = false;
          this.loadError = false;
          this.isLoaded = false;
          return;
        }
        this.validateAndLoad(newVal);
      }
    }
  },
  methods: {
    async validateAndLoad(link) {
      if (!link) return;
      this.isValidated = false;
      this.loadError = false;
      this.isLoaded = false;

      try {
        // Validation with no-cors might not give us status, so we use regular fetch
        // and catch the 404 to avoid passing junk to the player
        const response = await fetch(link, { method: 'GET', cache: 'force-cache' });
        
        if (!response.ok) {
           throw new Error('404');
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('application/json') && !contentType.includes('text/plain')) {
           throw new Error('Invalid Content Type');
        }

        this.isValidated = true;
      } catch (err) {
        this.loadError = true;
        this.isValidated = false;
      }
    },
    onAnimationLoaded() {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        this.isLoaded = true;
        this.loadError = false;
      }, 100);
    },
    onAnimationError(e) {
      this.loadError = true;
      this.isLoaded = false;
    },
    handleMouseEnter() {
      if (this.trigger === 'hover' && this.$refs.lottieRef && this.isLoaded) {
        this.$refs.lottieRef.play();
      }
    },
    handleMouseLeave() {
      if (this.trigger === 'hover' && this.$refs.lottieRef && this.isLoaded) {
        if (this.loop === false) {
          this.$refs.lottieRef.stop();
        } else {
          this.$refs.lottieRef.pause();
        }
      }
    }
  }
}
</script>

<style scoped>
.lottie-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  overflow: visible;
}

.icon-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease;
  pointer-events: none; /* Let the wrapper handle triggers */
}

.lottie-layer {
  z-index: 2;
  pointer-events: none;
}

.fallback-layer {
  z-index: 1;
  color: inherit;
}

.error-layer {
  z-index: 0;
  color: var(--text-muted);
}

.lottie-label {
  position: absolute;
  bottom: -18px;
  font-size: 10px;
  white-space: nowrap;
  color: var(--text-muted);
}
</style>
