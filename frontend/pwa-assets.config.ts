import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the app icons in public/ from public/pwa-icon.svg.
// Run after changing the source image: npm run generate:icons
const brown = '#8a4b16'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Icons that get cropped (Android masks, iPhone home screen) get the brand colour as padding.
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: brown } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: brown } },
  },
  images: ['public/pwa-icon.svg'],
})
