'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';

type RemoteContainer = {
  get: (module: string) => Promise<() => unknown>;
  init?: (shareScope?: unknown) => Promise<unknown> | unknown;
};

type MFELoaderProps = {
  scope: string;
  module: string;
  remoteUrl: string;
  fallback?: ReactNode;
  componentProps?: Record<string, unknown>;
};

declare global {
  interface Window {
    __webpack_share_scopes__?: Record<string, unknown>;
    __webpack_init_sharing__?: (scope: string) => Promise<void>;
    [key: string]: any;
  }
}

const remoteEntryCache = new Map<string, Promise<RemoteContainer>>();
const initializedContainers = new WeakSet<RemoteContainer>();

async function loadRemoteComponent(scope: string, module: string, remoteUrl: string) {
  const remoteEntryUrl =
    remoteUrl.replace(/\/remoteEntry\.js\/?$/, '/remoteEntry.js').replace(/\/$/, '') +
    '/remoteEntry.js';

  let container = window[scope] as RemoteContainer | undefined;

  if (!container) {
    let loader = remoteEntryCache.get(remoteEntryUrl);

    if (!loader) {
      loader = (async () => {
        let remoteEntry: unknown;

        try {
          remoteEntry = await import(/* @vite-ignore */ remoteEntryUrl);
        } catch (importError) {
          throw new Error(`Failed to import remote entry: ${remoteEntryUrl} - ${importError}`);
        }

        const importedContainer =
          remoteEntry &&
          typeof remoteEntry === 'object' &&
          'get' in remoteEntry &&
          typeof (remoteEntry as RemoteContainer).get === 'function'
            ? (remoteEntry as RemoteContainer)
            : null;

        const loadedContainer = window[scope] ?? importedContainer;

        if (!loadedContainer) {
          throw new Error(
            `Remote scope "${scope}" is not available after importing: ${remoteEntryUrl}`,
          );
        }

        window[scope] = loadedContainer;
        return loadedContainer;
      })();

      remoteEntryCache.set(remoteEntryUrl, loader);
    }

    container = await loader;
  }

  if (!container || typeof container.get !== 'function') {
    throw new Error(`Remote container ${scope} is not initialized.`);
  }

  if (typeof window.__webpack_init_sharing__ === 'function') {
    await window.__webpack_init_sharing__('default');
  }

  if (typeof container.init === 'function' && !initializedContainers.has(container)) {
    await container.init(window.__webpack_share_scopes__?.default ?? {});
    initializedContainers.add(container);
  }

  const factory = await container.get(module);
  const Module = factory();
  return (
    Module && typeof Module === 'object' && 'default' in Module && Module.default
      ? Module.default
      : Module
  ) as React.ComponentType<any>;
}

export function MFELoader({ scope, module, remoteUrl, fallback, componentProps }: MFELoaderProps) {
  const [RemoteComponent, setRemoteComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    loadRemoteComponent(scope, module, remoteUrl)
      .then((Component) => {
        if (mounted) {
          setRemoteComponent(() => Component);
        }
      })
      .catch((loadError) => {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      });

    return () => {
      mounted = false;
    };
  }, [scope, module, remoteUrl]);

  if (error) {
    return (
      <div className="mfe-error">
        <h2>Remote load failed</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!RemoteComponent) {
    return <div className="mfe-loading">Loading remote module...</div>;
  }

  return (
    <Suspense fallback={fallback ?? <div>Loading remote module...</div>}>
      <RemoteComponent {...componentProps} />
    </Suspense>
  );
}
