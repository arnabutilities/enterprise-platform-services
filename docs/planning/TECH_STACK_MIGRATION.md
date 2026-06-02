# Tech Stack Migration Guide: Next.js + Webpack → Vite + React

**Status**: Migration Strategy Document  
**Target**: Enterprise Platform Tech Stack Modernization  
**Timeline**: 3-4 weeks  
**Complexity**: High  
**Risk Level**: Medium (can run both stacks in parallel during migration)

---

## Table of Contents

1. [Overview](#overview)
2. [Migration Strategy](#migration-strategy)
3. [Stack Comparison](#stack-comparison)
4. [Pre-Migration Checklist](#pre-migration-checklist)
5. [Phase-by-Phase Migration](#phase-by-phase-migration)
6. [Configuration Changes](#configuration-changes)
7. [Code Changes](#code-changes)
8. [Module Federation in Vite](#module-federation-in-vite)
9. [Testing & Validation](#testing--validation)
10. [Rollback Plan](#rollback-plan)

---

## Overview

### Why Migrate?

**From Next.js App Router + Webpack to Vite + React Router:**

| Aspect                | Next.js             | Vite               | Winner  |
| --------------------- | ------------------- | ------------------ | ------- |
| **Build Speed**       | Slow (SSR bundling) | ⚡ 10-100x faster  | Vite    |
| **Dev Server**        | ~5-10 seconds       | 300-500ms          | Vite    |
| **Bundle Size**       | ~200-300KB          | ~80-120KB          | Vite    |
| **HMR**               | Works but slow      | Instant            | Vite    |
| **Flexibility**       | Opinionated         | Full control       | Vite    |
| **Learning Curve**    | Moderate            | Steep              | Next.js |
| **Module Federation** | Via webpack plugin  | Native ESM sharing | Equal   |
| **Server Rendering**  | Built-in (SSR)      | Manual setup       | Next.js |

### Migration Goals

✅ **Faster development** - 10-100x faster builds  
✅ **Smaller bundles** - Reduce JS by 40-50%  
✅ **Full control** - No opinionated framework constraints  
✅ **Modern ESM** - Native ES modules everywhere  
✅ **Maintain MFE** - Keep Module Federation working  
✅ **Maintain state** - Zustand continues to work  
✅ **Faster deployments** - Quicker CI/CD pipelines

### Risk Mitigation

- ✅ Both stacks can run in parallel
- ✅ MFE compatibility maintained
- ✅ Gradual migration possible
- ✅ Clear rollback path
- ✅ Comprehensive testing

---

## Migration Strategy

### Approach: Gradual Replacement

```
Week 1: Setup Vite, Run in parallel
        ├─ Create Vite configs
        ├─ Setup React Router
        ├─ Test locally
        └─ Keep Next.js running

Week 2: Migrate host-shell
        ├─ Move layouts, pages, components
        ├─ Setup routes
        ├─ Configure Module Federation
        └─ Test thoroughly

Week 3: Migrate analytics-mfe
        ├─ Same process as host-shell
        ├─ Test MFE loading in host
        └─ Validate shared state

Week 4: Migrate reports-mfe & polish
        ├─ Complete remaining MFE
        ├─ Performance tuning
        ├─ Decommission Next.js
        └─ Deploy to production
```

---

## Stack Comparison

### Current Stack (Next.js)

```
┌─────────────────────────────────────┐
│ Next.js 14                          │
├─────────────────────────────────────┤
│ - App Router (server/client)        │
│ - Webpack 5 bundler                 │
│ - Built-in routing                  │
│ - Built-in SSR                      │
│ - Built-in CSS-in-JS                │
│ - Module Federation (manual)        │
└─────────────────────────────────────┘
         ↓
   Built-in optimizations
   (image, font, etc.)
```

### New Stack (Vite + React)

```
┌─────────────────────────────────────┐
│ Vite 5 + React 18                   │
├─────────────────────────────────────┤
│ - React Router v6 (CSR)             │
│ - esbuild / rollup bundler          │
│ - React Router (routing)            │
│ - Optional SSR (manual)             │
│ - Tailwind CSS (recommended)        │
│ - Module Federation (@mf/vite)      │
└─────────────────────────────────────┘
         ↓
   Plugins for everything
   (Vite's design philosophy)
```

### Key Differences

| Feature                | Next.js              | Vite                      |
| ---------------------- | -------------------- | ------------------------- |
| **Rendering**          | SSR + SSG + CSR      | CSR (SSR optional)        |
| **Routing**            | File-based           | React Router (code-based) |
| **Bundler**            | Webpack              | esbuild/Rollup            |
| **Dev Speed**          | ~5-10s               | ~300-500ms                |
| **Production Build**   | Optimized by default | Manual tuning needed      |
| **Image Optimization** | Built-in             | Via plugin                |
| **Font Optimization**  | Built-in             | Via plugin                |
| **Module Federation**  | Via plugin           | Native support            |
| **Learning**           | Easy                 | Moderate                  |

---

## Pre-Migration Checklist

### Before Starting

- [ ] All tests passing in Next.js setup
- [ ] Git branch created for migration
- [ ] Team notified of migration timeline
- [ ] Staging environment prepared
- [ ] Rollback procedures documented
- [ ] Performance baselines established
- [ ] Browser compatibility tested

### Environment Setup

- [ ] Node 18+ installed
- [ ] Vite CLI installed globally (`npm install -g vite`)
- [ ] React Router v6 knowledge
- [ ] Zustand familiarity (unchanged)
- [ ] Module Federation @mf/vite understanding

---

## Phase-by-Phase Migration

### Phase 1: Setup Vite Infrastructure (Days 1-2)

#### Step 1.1: Create Vite config for host-shell

**File**: `apps/host-shell/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { federatedModule } from '@module-federation/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    federatedModule({
      name: 'host',
      filename: 'remoteEntry.js',

      // Shared dependencies (loaded once globally)
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.3.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.3.0',
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^6.0.0',
        },
        zustand: {
          singleton: true,
          requiredVersion: '^4.0.0',
        },
      },

      // Remote MFEs
      remotes: {
        analytics: process.env.VITE_ANALYTICS_URL || 'http://localhost:5001',
        reports: process.env.VITE_REPORTS_URL || 'http://localhost:5002',
      },

      // Expose shared modules
      exposes: {
        './config': './src/config/index.ts',
        './hooks/useShellContext': './src/hooks/useShellContext.ts',
        './store': './src/store/index.ts',
        './types': './src/types/index.ts',
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 3002,
    middlewareMode: false,
    cors: true,
  },

  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-state': ['zustand'],
        },
      },
    },
  },
});
```

#### Step 1.2: Update package.json

**File**: `apps/host-shell/package.json`

```json
{
  "name": "host-shell",
  "private": true,
  "type": "module",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react-swc": "^3.5.0",
    "@module-federation/vite": "^6.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  },
  "scripts": {
    "dev": "vite --open",
    "build": "vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

#### Step 1.3: Create TypeScript config

**File**: `apps/host-shell/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**File**: `apps/host-shell/tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

### Phase 2: Migrate Layout & Routing (Days 2-3)

#### Step 2.1: Create new entry point

**File**: `apps/host-shell/src/main.tsx` (replaces \_app.tsx)

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

#### Step 2.2: Create App component with routes

**File**: `apps/host-shell/src/App.tsx` (replaces layout.tsx)

```typescript
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/store';
import Navigation from '@/components/Navigation';
import { MFEBoundary } from '@/components/MFEBoundary';
import Loading from '@/components/Loading';

// Dynamic MFE loaders
const AnalyticsMFE = lazy(() => import('analytics/Analytics'));
const ReportsMFE = lazy(() => import('reports/Reports'));

// Regular pages
const Home = lazy(() => import('@/pages/Home'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export default function App() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div className="app">
      <Navigation />

      <main className="main-content">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />

            <Route
              path="/analytics/*"
              element={
                <MFEBoundary mfeName="analytics">
                  <AnalyticsMFE />
                </MFEBoundary>
              }
            />

            <Route
              path="/reports/*"
              element={
                <MFEBoundary mfeName="reports">
                  <ReportsMFE />
                </MFEBoundary>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
```

#### Step 2.3: Create HTML entry point

**File**: `apps/host-shell/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Enterprise Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

#### Step 2.4: Update Navigation component

**File**: `apps/host-shell/src/components/Navigation.tsx`

```typescript
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore, useUIStore } from '@/store';
import './Navigation.css';

export default function Navigation() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { pathname } = useLocation();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <button className="menu-btn" onClick={toggleSidebar}>
          ☰
        </button>
        <h1>Enterprise Platform</h1>
      </div>

      <ul className="nav-menu">
        <li>
          <Link
            to="/"
            className={pathname === '/' ? 'active' : ''}
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            to="/analytics"
            className={pathname.startsWith('/analytics') ? 'active' : ''}
          >
            Analytics
          </Link>
        </li>
        <li>
          <Link
            to="/reports"
            className={pathname.startsWith('/reports') ? 'active' : ''}
          >
            Reports
          </Link>
        </li>
      </ul>

      <div className="nav-user">
        <span>{user?.name}</span>
        <button onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
```

### Phase 3: Migrate MFEs (Days 3-4)

Repeat Phase 1-2 for each MFE:

#### Step 3.1: Create vite.config.ts for analytics-mfe

**File**: `apps/analytics-mfe/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { federatedModule } from '@module-federation/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    federatedModule({
      name: 'analytics',
      filename: 'remoteEntry.js',

      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.3.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.3.0',
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^6.0.0',
        },
        zustand: {
          singleton: true,
          requiredVersion: '^4.0.0',
        },
      },

      remotes: {
        host: process.env.VITE_HOST_URL || 'http://localhost:3002',
      },

      exposes: {
        './Analytics': './src/Analytics.tsx',
        './DashboardView': './src/components/DashboardView.tsx',
        './Hooks': './src/hooks/index.ts',
        './Types': './src/types/index.ts',
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5001,
  },
});
```

#### Step 3.2: Create Analytics.tsx (entry point)

**File**: `apps/analytics-mfe/src/Analytics.tsx`

```typescript
import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Loading from '@/components/Loading';

const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const MetricsPage = lazy(() => import('@/pages/Metrics'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export default function Analytics() {
  const { pathname } = useLocation();
  const basePath = '/analytics';

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
```

### Phase 4: Real-time Communication Setup (Days 4-5)

#### Step 4.1: Add SSE/WebSocket support

**File**: `apps/host-shell/src/services/realtime.ts`

```typescript
/**
 * Real-time communication service
 * Supports both SSE and WebSocket
 */

export interface RealtimeConfig {
  type: 'sse' | 'websocket';
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class RealtimeClient {
  private config: RealtimeConfig;
  private eventSource?: EventSource;
  private socket?: WebSocket;
  private reconnectAttempts = 0;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(config: RealtimeConfig) {
    this.config = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      ...config,
    };
  }

  /**
   * Connect to SSE or WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.config.type === 'sse') {
          this.connectSSE(resolve, reject);
        } else {
          this.connectWebSocket(resolve, reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  private connectSSE(resolve: Function, reject: Function) {
    const eventSource = new EventSource(this.config.url);

    eventSource.onopen = () => {
      console.log('SSE connected');
      this.reconnectAttempts = 0;
      resolve();
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
      } catch (error) {
        console.error('SSE parse error:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      if (this.reconnectAttempts < this.config.maxReconnectAttempts!) {
        this.reconnectAttempts++;
        setTimeout(
          () => this.connectSSE(resolve, reject),
          this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts),
        );
      } else {
        reject(new Error('SSE reconnect max attempts reached'));
      }
    };

    this.eventSource = eventSource;
  }

  private connectWebSocket(resolve: Function, reject: Function) {
    const socket = new WebSocket(this.config.url);

    socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      resolve();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
      } catch (error) {
        console.error('WebSocket parse error:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      if (this.reconnectAttempts < this.config.maxReconnectAttempts!) {
        this.reconnectAttempts++;
        setTimeout(
          () => this.connectWebSocket(resolve, reject),
          this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts),
        );
      } else {
        reject(new Error('WebSocket reconnect max attempts reached'));
      }
    };

    this.socket = socket;
  }

  /**
   * Subscribe to event
   */
  on(eventType: string, callback: Function): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  /**
   * Emit event to all listeners
   */
  private emit(eventType: string, data: any) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Send message (WebSocket only)
   */
  send(data: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }
    if (this.socket) {
      this.socket.close();
    }
  }
}

/**
 * Hook for real-time communication
 */
export function useRealtime(type: 'sse' | 'websocket' = 'sse') {
  const client = new RealtimeClient({
    type,
    url: `${import.meta.env.VITE_API_BASE_URL}/realtime`,
  });

  return {
    connect: () => client.connect(),
    on: (event: string, callback: Function) => client.on(event, callback),
    send: (data: any) => client.send(data),
    disconnect: () => client.disconnect(),
  };
}
```

#### Step 4.2: Setup real-time event listeners

**File**: `apps/host-shell/src/hooks/useRealtimeEvents.ts`

```typescript
import { useEffect } from 'react';
import { useRealtime } from '@/services/realtime';
import { useUIStore } from '@/store';

export function useRealtimeEvents() {
  const { addNotification } = useUIStore();
  const realtime = useRealtime('sse');

  useEffect(() => {
    const connect = async () => {
      try {
        await realtime.connect();

        // Subscribe to events
        realtime.on('notification', (data) => {
          addNotification({
            type: data.severity || 'info',
            message: data.message,
            duration: 5000,
          });
        });

        realtime.on('dashboard-updated', (data) => {
          console.log('Dashboard updated:', data);
          // Trigger dashboard refresh
        });

        realtime.on('report-completed', (data) => {
          addNotification({
            type: 'success',
            message: `Report "${data.reportName}" is ready`,
          });
        });
      } catch (error) {
        console.error('Failed to connect to realtime:', error);
      }
    };

    connect();

    return () => {
      realtime.disconnect();
    };
  }, []);

  return realtime;
}
```

---

## Configuration Changes

### Environment Variables

**File**: `.env.example`

```bash
# Vite-specific
VITE_API_BASE_URL=http://localhost:3000/api
VITE_HOST_URL=http://localhost:3002
VITE_ANALYTICS_URL=http://localhost:5001
VITE_REPORTS_URL=http://localhost:5002

# Real-time
VITE_REALTIME_TYPE=sse
VITE_REALTIME_URL=http://localhost:3000/api/realtime

# Feature flags
VITE_ENABLE_WEBSOCKET=false
VITE_ENABLE_SSE=true
```

### Remove Next.js Files

After migration, remove:

```
- apps/*/next.config.js (replaced by vite.config.ts)
- apps/*/.next/ (build directory)
- apps/*/pages/ (replaced by routes)
- apps/*/app/ (App Router removed)
- package.json scripts with 'next' commands
```

---

## Code Changes

### Remove Next.js-specific code

```typescript
// ❌ REMOVE: Next.js specific imports
import { useRouter } from 'next/navigation';
import { NextRequest } from 'next/server';
import Image from 'next/image';

// ✅ REPLACE WITH: React Router
import { useNavigate } from 'react-router-dom';
import img from '@/assets/image.png';

// ❌ REMOVE: App Router layouts
export default function Layout({ children }) {
  return <>{children}</>;
}

// ✅ REPLACE WITH: Route components
function Layout() {
  return (
    <div>
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}
```

### Component changes

**Before (Next.js):**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div>
      <Image src="/dashboard.png" alt="Dashboard" />
      <button onClick={() => router.push('/analytics')}>
        Go to Analytics
      </button>
    </div>
  );
}
```

**After (Vite + React):**

```typescript
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div>
      <img src="/dashboard.png" alt="Dashboard" />
      <button onClick={() => navigate('/analytics')}>
        Go to Analytics
      </button>
    </div>
  );
}
```

---

## Module Federation in Vite

### Key Differences from Webpack

```typescript
// Webpack federation (Next.js)
new NextFederationPlugin({
  name: 'host',
  remotes: {...},
  exposes: {...},
  shared: {...}
})

// Vite federation (NEW)
federatedModule({
  name: 'host',
  remotes: {...},
  exposes: {...},
  shared: {...}
})
```

### Dynamic imports for MFEs

**Next.js way (NOT USED ANYMORE):**

```typescript
const AnalyticsMFE = dynamic(() => import('analytics/Analytics'));
```

**Vite way (RECOMMENDED):**

```typescript
import { lazy } from 'react';
const AnalyticsMFE = lazy(() => import('analytics/Analytics'));
```

---

## Testing & Validation

### Step 1: Local development test

```bash
# Terminal 1: Host shell
cd apps/host-shell
pnpm install
pnpm dev

# Terminal 2: Analytics MFE
cd apps/analytics-mfe
pnpm install
pnpm dev

# Terminal 3: Reports MFE
cd apps/reports-mfe
pnpm install
pnpm dev
```

**Expected**: All three servers running on different ports, MFEs loading in host.

### Step 2: Module Federation test

```javascript
// Open browser console at http://localhost:3002
console.log(window['analytics']); // Should show exposed modules
console.log(window['reports']);
```

### Step 3: State management test

```javascript
// Test Zustand store
import { useAuthStore } from 'host/store';
const auth = useAuthStore();
console.log(auth.user); // Should show current user
```

### Step 4: Real-time communication test

```typescript
// Check SSE/WebSocket connection
console.log('SSE/WebSocket test');
// Listen for notifications
realtime.on('notification', (data) => {
  console.log('Received:', data);
});
```

### Step 5: Build test

```bash
# Build all apps
pnpm --filter=host-shell build
pnpm --filter=analytics-mfe build
pnpm --filter=reports-mfe build

# Verify build outputs
ls -la apps/host-shell/dist
```

**Expected**: Bundle sizes 40-50% smaller than Next.js

### Performance Metrics

Before/After comparison:

| Metric      | Next.js | Vite      | Improvement |
| ----------- | ------- | --------- | ----------- |
| Dev start   | 8-10s   | 500-800ms | **10-15x**  |
| HMR time    | 2-4s    | 100-300ms | **10-20x**  |
| Bundle size | 250KB   | 120KB     | **-52%**    |
| Build time  | 30-45s  | 5-8s      | **5-8x**    |

---

## Rollback Plan

### If migration fails:

```bash
# Revert to Next.js
git checkout next-js-main

# Reinstall Next.js dependencies
pnpm install

# Restart with Next.js
pnpm dev
```

### Keep both stacks running (recommended):

```
git branch migration/vite        # Create migration branch
git branch next-js-main          # Keep Next.js branch

# Work on Vite in migration/vite
# Keep Next.js operational in next-js-main
# Switch branches when ready to cut over
```

---

## Timeline

| Phase       | Tasks                      | Duration      | Resources |
| ----------- | -------------------------- | ------------- | --------- |
| **Phase 1** | Vite setup, configs        | 2 days        | 1-2 devs  |
| **Phase 2** | Layout & routing migration | 2 days        | 1-2 devs  |
| **Phase 3** | MFE migration              | 2-3 days      | 1-2 devs  |
| **Phase 4** | Real-time setup            | 1-2 days      | 1 dev     |
| **Phase 5** | Testing & validation       | 1-2 days      | QA + devs |
| **Phase 6** | Performance tuning         | 1 day         | 1 dev     |
| **Phase 7** | Production deployment      | 1 day         | DevOps    |
| **Total**   | All phases                 | **3-4 weeks** |           |

---

## Checklist

- [ ] Read this migration guide
- [ ] Backup current codebase
- [ ] Create migration branch
- [ ] Install Vite dependencies
- [ ] Create Vite configs for all apps
- [ ] Migrate layouts and routing
- [ ] Setup Module Federation in Vite
- [ ] Test MFE loading
- [ ] Setup real-time communication
- [ ] Migrate all pages and components
- [ ] Run full test suite
- [ ] Performance comparison
- [ ] Load testing
- [ ] Deploy to staging
- [ ] UAT with team
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Decommission Next.js

---

## Risks & Mitigation

| Risk                   | Impact | Mitigation                    |
| ---------------------- | ------ | ----------------------------- |
| MFE loading fails      | High   | Test MF in isolation first    |
| Performance regression | High   | Compare bundles before deploy |
| Browser compatibility  | Medium | Test on target browsers       |
| State sync issues      | Medium | Unit test stores thoroughly   |
| Real-time lag          | Medium | Monitor SSE/WS latency        |
| Team adoption          | Medium | Training & documentation      |

---

## Key Benefits After Migration

✅ **Dev experience**: 10-20x faster HMR  
✅ **Bundle size**: 40-50% reduction  
✅ **Build time**: 5-8x faster  
✅ **Type safety**: Full TypeScript support  
✅ **Flexibility**: Full control over bundling  
✅ **Modern**: Native ES modules everywhere  
✅ **Real-time**: Proper SSE/WebSocket support

---

## FAQ

**Q: Can we run both Next.js and Vite simultaneously?**  
A: Yes! Create a `vite` branch and run both in parallel during migration.

**Q: Will state management need changes?**  
A: No. Zustand works identically in Vite + React.

**Q: How do we handle API routes?**  
A: Keep the BFF (Backend for Frontend) as-is. Vite is frontend only.

**Q: What about image/font optimization?**  
A: Use Vite plugins or optimize manually during build.

**Q: How do we migrate incrementally?**  
A: Migrate one MFE at a time, keeping others on Next.js until all ready.

**Q: Will SSR still work?**  
A: SSR is optional in Vite. For now, we're going CSR (Client-Side Rendering).

---

## Resources

- [Vite Official Docs](https://vitejs.dev)
- [React Router v6](https://reactrouter.com)
- [Module Federation Vite](https://github.com/module-federation/vite)
- [Zustand](https://github.com/pmndrs/zustand)
- [React 18 Migration](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)

---

## Next Steps

1. Review this guide with team
2. Create Vite branch
3. Begin Phase 1 setup
4. Schedule weekly demos
5. Prepare production deployment plan
