/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOG_LEVEL?: string;
  readonly MODE: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
