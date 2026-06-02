'use client';

import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from '@/runtime/ErrorBoundary';
import { AnalyticsContainer } from '@/components/mfe-container-components/AnalyticsContainer';
import { LoginContainer } from '@/components/mfe-container-components/LoginContainer';
import { ReportsContainer } from '@/components/mfe-container-components/ReportsContainer';
import '@/styles/globals.css';

interface ShellProps {
  children: ReactNode;
}

type ShellRoute = 'home' | 'analytics' | 'reports' | 'login';

const routeMap: Record<string, ShellRoute> = {
  '/home': 'home',
  '/analytics': 'analytics',
  '/reports': 'reports',
  '/login': 'login',
};

function getRouteFromPathname(pathname: string): ShellRoute {
  return routeMap[pathname] ?? 'home';
}

export function Shell({ children }: ShellProps) {
  const [activeRoute, setActiveRoute] = useState<ShellRoute>('home');

  useEffect(() => {
    const syncRoute = () => {
      setActiveRoute(getRouteFromPathname(window.location.pathname));
    };

    syncRoute();
    window.addEventListener('popstate', syncRoute);

    return () => {
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  useEffect(() => {
    const handleMfeMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'analytics.filters.changed') {
        return;
      }

      window.localStorage.setItem('analytics-event', JSON.stringify(event.data));
      window.dispatchEvent(new CustomEvent('analytics.filters.changed', { detail: event.data }));

      document.querySelectorAll<HTMLIFrameElement>('iframe[data-mfe-frame]').forEach((frame) => {
        if (frame.contentWindow !== event.source) {
          frame.contentWindow?.postMessage(event.data, '*');
        }
      });
    };

    window.addEventListener('message', handleMfeMessage);
    return () => window.removeEventListener('message', handleMfeMessage);
  }, []);

  const navigateTo = (path: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.history.pushState({}, '', path);
    setActiveRoute(getRouteFromPathname(path));
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="shell-error">
          <h1>Failed to load shell</h1>
        </div>
      }
    >
      <div className="shell-layout">
        <header className="shell-header">
          <nav className="shell-nav">
            <a className="shell-brand" href="/" onClick={navigateTo('/')}>
              Host Shell
            </a>
            <div className="shell-nav-tabs">
              <a
                className={`nav-tab ${activeRoute === 'home' ? 'active' : ''}`}
                href="/home"
                onClick={navigateTo('/home')}
              >
                Home
              </a>
              <a
                className={`nav-tab ${activeRoute === 'analytics' ? 'active' : ''}`}
                href="/analytics"
                onClick={navigateTo('/analytics')}
              >
                Analytics
              </a>
              <a
                className={`nav-tab ${activeRoute === 'reports' ? 'active' : ''}`}
                href="/reports"
                onClick={navigateTo('/reports')}
              >
                Reports
              </a>
              <a
                className={`nav-tab ${activeRoute === 'login' ? 'active' : ''}`}
                href="/login"
                onClick={navigateTo('/login')}
              >
                Login
              </a>
            </div>
          </nav>
        </header>
        <main className="shell-main">
          {activeRoute === 'home' && children}
          {activeRoute === 'analytics' && <AnalyticsContainer />}
          {activeRoute === 'reports' && <ReportsContainer />}
          {activeRoute === 'login' && <LoginContainer />}
        </main>
      </div>
    </ErrorBoundary>
  );
}
