import { createApp } from 'vue'
import './style.css'
import './animations.css'
import './validation.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import LottieAnimation from './components/LottieAnimation.vue'

const app = createApp(App)
app.use(router)
app.use(i18n)
app.component('LottieAnimation', LottieAnimation)

// Global v-click-outside directive
app.directive('click-outside', {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent);
  },
});

app.mount('#app')
