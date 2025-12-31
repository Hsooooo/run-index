// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  runtimeConfig: {
    kmaServiceKey: process.env.KMA_SERVICE_KEY || 'https://api.example.com',
  },
})
