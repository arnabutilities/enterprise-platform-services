import React, { Suspense, lazy, type ComponentType } from 'react';

export interface RemoteModuleConfig {
  scope: string;
  module: string;
  shareScope?: string;
}

const remoteModules = new Map<string, Promise<any>>();

async function loadRemoteModule(config: RemoteModuleConfig): Promise<any> {
  const key = `${config.scope}/${config.module}`;

  if (remoteModules.has(key)) {
    return remoteModules.get(key);
  }

  const modulePromise = (async () => {
    try {
      const scope = (window as any)[config.scope];

      if (!scope) {
        throw new Error(
          `Remote scope '${config.scope}' not found. Ensure the remote MFE is loaded.`,
        );
      }

      await scope.init((window as any).__webpack_share_scopes__?.default);

      const factory = await scope.get(config.module);
      return factory();
    } catch (error) {
      console.error(`Failed to load remote module ${config.scope}/${config.module}:`, error);
      throw error;
    }
  })();

  remoteModules.set(key, modulePromise);
  return modulePromise;
}

export function createRemoteComponent(config: RemoteModuleConfig, fallback?: ComponentType) {
  const LazyRemoteComponent = lazy(async () => {
    try {
      const module = await loadRemoteModule(config);
      return { default: module.default || module };
    } catch (error) {
      console.error('Failed to load remote component:', error);
      return {
        default: () => (
          <div className="remote-error">
            Failed to load {config.scope}/{config.module}
          </div>
        ),
      };
    }
  });

  return (props: any) => (
    <Suspense
      fallback={
        fallback ? (
          React.createElement(fallback, props)
        ) : (
          <div className="remote-loading">Loading module...</div>
        )
      }
    >
      <LazyRemoteComponent {...props} />
    </Suspense>
  );
}

export { loadRemoteModule };
