/// <reference types="vite/client" />

declare const __BUILD__: string

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SHOP_NAME: string
  readonly VITE_BOT_USERNAME?: string
  readonly VITE_ADMIN_PATH?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
