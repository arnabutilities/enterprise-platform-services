import React, { Suspense, lazy, type ComponentType } from 'react';

interface RemoteComponentProps {
  scope: string;
  module: string;
  fallback?: ComponentType<any>;
  [key: string]: any;
}

const componentCache = new Map<string, React.LazyExoticComponent<ComponentType<any>>>();

export function RemoteComponent({
  scope,
  module,
  fallback: Fallback,
  ...props
}: RemoteComponentProps) {
  const cacheKey = `${scope}/${module}`;

  let RemoteComp = componentCache.get(cacheKey);

  if (!RemoteComp) {
    RemoteComp = lazy(async () => {
      try {
        const remoteScope = (window as any)[scope];

        if (!remoteScope) {
          throw new Error(`Remote scope '${scope}' not loaded`);
        }

        await remoteScope.init((window as any).__webpack_share_scopes__?.default);
        const factory = await remoteScope.get(module);
        const comp = factory();

        return { default: comp.default || comp };
      } catch (error) {
        console.error(`Failed to load ${scope}/${module}:`, error);
        throw error;
      }
    });

    componentCache.set(cacheKey, RemoteComp);
  }

  const loading = Fallback ? (
    <Fallback {...props} />
  ) : (
    <div className="remote-loading">Loading {scope}...</div>
  );

  return (
    <Suspense fallback={loading}>
      <RemoteComp {...props} />
    </Suspense>
  );
}
