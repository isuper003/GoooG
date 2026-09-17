/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_WRITE_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
