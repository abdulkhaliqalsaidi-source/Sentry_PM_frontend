import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ar from './locales/ar.json'

const i18n = createI18n({
    legacy: false, // Use Composition API
    globalInjection: true, // Allow usage of $t and $i18n in Options API
    locale: localStorage.getItem('user_language') || 'en', // Default locale
    fallbackLocale: 'en',
    messages: {
        en,
        ar
    }
})

export default i18n
