import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from '@/locales/en'
import { zh } from '@/locales/zh-CN'

const STORAGE_KEY = 'client-dashboard-lang'
const LEGACY_STORAGE_KEY = 'kelly-lang'

function storedLanguage(): 'en' | 'zh-CN' {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (saved === 'en' || saved === 'zh-CN') return saved
  } catch {
    /* private mode */
  }
  return 'zh-CN'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-CN': { translation: zh },
  },
  lng: storedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

function applyLanguage(lng: string) {
  const code = lng.startsWith('zh') ? 'zh-CN' : 'en'
  document.documentElement.lang = code
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    /* private mode */
  }
}

applyLanguage(i18n.language)
i18n.on('languageChanged', applyLanguage)

export function isZh(): boolean {
  return i18n.language.startsWith('zh')
}

export default i18n
