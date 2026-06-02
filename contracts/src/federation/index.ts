export * from './analytics-mfe';
export * from './login-mfe';
export * from './reports-mfe';

export interface MFEModuleContract {
  name: string;
  version: string;
  requiredHostVersion: string;
  exposes: Record<string, string>;
  requires: Record<string, string>;
}

export interface MFERegistry {
  [mfeName: string]: MFEModuleContract;
}
