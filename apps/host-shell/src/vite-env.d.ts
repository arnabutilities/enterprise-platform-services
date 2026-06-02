/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BFF_URL?: string;
  readonly VITE_ALLOWED_MESSAGE_ORIGINS?: string;
  readonly VITE_LOGIN_URL?: string;
  readonly VITE_ANALYTICS_URL?: string;
  readonly VITE_REPORTS_URL?: string;
  readonly NEXT_PUBLIC_LOGIN_URL?: string;
  readonly NEXT_PUBLIC_ANALYTICS_URL?: string;
  readonly NEXT_PUBLIC_REPORTS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
