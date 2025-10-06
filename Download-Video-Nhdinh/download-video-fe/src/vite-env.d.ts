// vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  // thêm các biến môi trường khác ở đây
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}