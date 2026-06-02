# Host Theme Sharing Across Microfrontends

Guide for using the host shell theme consistently across every Module Federation remote (`login-mfe`, `analytics-mfe`, `reports-mfe`, and future MFEs).

## Related documents

- [Module Federation implementation](./MODULE_FEDERATION_IMPLEMENTATION.md) — remote loading and shared packages
- [Auth token sharing across MFEs](../auth/auth-token-sharing-across-mfes.md) — parallel pattern for cross-MFE concerns
- Theme source: `packages/shared-ui/src/theme.ts`
- Host entry: `apps/host-shell/src/main.tsx`

---

## 1. Architecture overview

```mermaid
flowchart TB
  subgraph shared [packages/shared-ui]
    ThemeDef[theme.ts — single MUI theme]
    Components[Shared MUI components + icons]
  end

  subgraph host [apps/host-shell]
    TP[ThemeProvider theme={theme}]
    CB[CssBaseline]
    Layout[Shell layout + MFELoader]
  end

  subgraph remotes [MFE remotes]
    Login[login-mfe]
    Analytics[analytics-mfe]
    Reports[reports-mfe]
  end

  ThemeDef --> TP
  ThemeDef --> Components
  Components --> Login
  Components --> Analytics
  Components --> Reports
  TP --> Layout
  Layout --> Login
  Layout --> Analytics
  Layout --> Reports
```

### Principles

| Principle                                | Implementation                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| Single source of truth                   | Theme defined once in `@enterprise-platform/shared-ui`                        |
| Host owns the provider                   | `ThemeProvider` wraps the entire shell in `host-shell/src/main.tsx`           |
| Remotes inherit via React context        | MFE components rendered inside the host tree receive the same theme           |
| Import UI from shared package            | Use `@enterprise-platform/shared-ui` for MUI exports, icons, and theme tokens |
| No duplicate providers in federated mode | Remotes loaded by the host should not wrap another `ThemeProvider`            |
| Standalone dev uses the same theme       | When running an MFE alone, wrap with the shared `theme` for visual parity     |

---

## 2. How theme propagation works

MUI's `ThemeProvider` uses React context. When the host renders a remote component via `MFELoader`, that component becomes a child of the host's provider tree — so all MUI components inside the remote automatically receive the host theme.

```text
host-shell (main.tsx)
└── ThemeProvider theme={theme}          ← host owns this
    └── CssBaseline
        └── BrowserRouter
            └── Shell / MFELoader
                └── login-mfe / Analytics  ← inherit theme from context
                    └── Button, Typography, etc.
```

This works because:

1. Remotes import MUI components from `@enterprise-platform/shared-ui` (re-exported from `@mui/material`).
2. Those components call MUI's `useTheme()` internally, reading from the nearest `ThemeProvider` ancestor — which is the host's.
3. React and the DOM are shared; only JavaScript modules are federated.

---

## 3. The shared theme package

### 3.1 Location

```
packages/shared-ui/
├── src/
│   ├── theme.ts          ← createTheme() definition
│   ├── index.ts          ← exports theme, ThemeProvider, MUI components
│   └── components/       ← shared shell components (AppBar, Menubar, etc.)
└── package.json
```

### 3.2 Current theme definition

```typescript
// packages/shared-ui/src/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: '#556cd6' },
    secondary: { main: '#19857b' },
    error: { main: red.A400 },
    background: { default: '#fff', paper: '#f5f5f5' },
  },
});
```

`cssVariables: true` enables MUI CSS variable theming, which simplifies future light/dark mode toggles.

### 3.3 What shared-ui exports

```typescript
import {
  theme,
  ThemeProvider,
  CssBaseline,
  Button,
  Typography,
  useTheme,
  styled,
} from '@enterprise-platform/shared-ui';
```

The package re-exports all of `@mui/material` plus the platform theme, shared icons, and shell components.

---

## 4. Host shell setup

The host is responsible for applying the theme at the root of the application.

### 4.1 Wrap the app with ThemeProvider

```tsx
// apps/host-shell/src/main.tsx
import { CssBaseline, theme, ThemeProvider } from '@enterprise-platform/shared-ui';

function HostShellLayout() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {/* routes, MFELoader, shell layout */}
    </ThemeProvider>
  );
}
```

`CssBaseline` normalizes browser defaults and applies the theme's background and typography globally.

### 4.2 Keep ThemeProvider above all remotes

Place `ThemeProvider` as high as possible — above `BrowserRouter`, layout, and every `MFELoader` call. Do not wrap individual remotes with separate providers unless you intentionally want a different theme for one MFE.

### 4.3 Use shared components in the shell

The host shell already uses shared-ui for layout chrome:

```tsx
// apps/host-shell/src/vite/App.tsx
import { Divider, Grid, Paper, styled, Typography } from '@enterprise-platform/shared-ui';
import ShellAppBar from '@enterprise-platform/shared-ui/src/components/AppBar';

const StyledSidebar = styled(MenuList)(({ theme }) => ({
  borderRight: `1px solid ${theme.palette.divider}`,
}));
```

Use `theme.palette.*` and `theme.spacing()` in styled components rather than hardcoded hex values.

---

## 5. Microfrontend setup

### 5.1 Add the shared-ui dependency

Every MFE that uses platform styling needs the workspace package:

```json
// apps/<mfe>/package.json
{
  "dependencies": {
    "@enterprise-platform/shared-ui": "workspace:*"
  }
}
```

Current MFEs using shared-ui: `login-mfe`, `analytics-mfe`.

### 5.2 Import components from shared-ui

```tsx
// apps/analytics-mfe/src/components/Analytics.tsx
import { Button, Card, Typography, Grid } from '@enterprise-platform/shared-ui';
```

Do **not** import directly from `@mui/material` in MFE code — always go through `@enterprise-platform/shared-ui` so version alignment and future theme hooks stay centralized.

### 5.3 Federated mode — no ThemeProvider in remotes

When the MFE is loaded by the host via Module Federation, **do not** add a `ThemeProvider` in the remote entry component:

```tsx
// apps/login-mfe/src/vite/App.tsx — federated entry
import { Login } from '@/components/Login';

export default function App(props: LoginRemoteProps) {
  return <Login {...props} />; // ✅ no ThemeProvider here
}
```

The host's provider already wraps this component.

### 5.4 Standalone dev mode — add ThemeProvider locally

When running an MFE on its own dev server (e.g. `login-mfe` on port 5003), there is no host provider. Wrap the app with the same shared theme so local development matches production:

```tsx
// apps/login-mfe/src/main.tsx — standalone dev only
import { CssBaseline, theme, ThemeProvider } from '@enterprise-platform/shared-ui';

ReactDOM.createRoot(root).render(
  <ThemeProvider theme={theme}>
    <CssBaseline enableColorScheme />
    <BrowserRouter>
      <App bffBaseUrl="http://localhost:4000" />
    </BrowserRouter>
  </ThemeProvider>,
);
```

Use the **same** `theme` import — never define a local copy in the MFE.

---

## 6. Using theme tokens in MFE components

### 6.1 `sx` prop (preferred for one-off styles)

```tsx
<Button
  sx={{
    py: 1.5,
    bgcolor: 'primary.main',
    '&:hover': { bgcolor: 'primary.dark' },
  }}
>
  Submit
</Button>
```

### 6.2 `useTheme()` hook

```tsx
import { useTheme } from '@enterprise-platform/shared-ui';

function StatusBadge({ active }: { active: boolean }) {
  const theme = useTheme();
  return (
    <span style={{ color: active ? theme.palette.success.main : theme.palette.text.secondary }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
```

### 6.3 `styled()` with theme callback

```tsx
import { styled, Box } from '@enterprise-platform/shared-ui';

const CardContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(3),
}));
```

### 6.4 Shared shell components

Reuse platform components that already follow the theme:

| Component     | Import path                                                           | Used in       |
| ------------- | --------------------------------------------------------------------- | ------------- |
| `ShellAppBar` | `@enterprise-platform/shared-ui/src/components/AppBar`                | host-shell    |
| `MFEMenubar`  | `@enterprise-platform/shared-ui/src/components/MFEMenuBar/MFEMenuBar` | analytics-mfe |
| `Copyright`   | `@enterprise-platform/shared-ui/src/components/Copyright`             | host-shell    |

---

## 7. Customizing the platform theme

### 7.1 Change global tokens

Edit `packages/shared-ui/src/theme.ts`:

```typescript
export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: '#005dac' }, // update brand color
    secondary: { main: '#19857b' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
});
```

All apps that import `theme` from shared-ui pick up the change on rebuild. No per-MFE edits required.

### 7.2 Extend the theme with component overrides

```typescript
export const theme = createTheme({
  cssVariables: true,
  palette: {
    /* ... */
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});
```

### 7.3 Per-tenant or dynamic themes (advanced)

For runtime theme switching (e.g. dark mode toggle in the host):

1. Store mode preference in host state (Zustand or React state).
2. Build the theme with `createTheme({ palette: { mode: 'dark' } })` or toggle CSS variables.
3. Pass the dynamic theme to the host `ThemeProvider`.
4. All remotes update automatically — no prop drilling to MFEs required.

Keep dynamic theme construction in `packages/shared-ui` (e.g. export `createAppTheme(mode)` alongside the default `theme`).

---

## 8. Module Federation shared dependencies

To avoid duplicate MUI/Emotion instances (which break theme context), share styling libraries as federation singletons alongside React.

### 8.1 Recommended vite.config.ts shared block

Apply to **host and every remote**:

```typescript
federation({
  name: 'host', // or 'login', 'analytics', etc.
  shared: {
    react: { singleton: true, requiredVersion: '^18.3.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.3.0' },
    '@mui/material': { singleton: true },
    '@emotion/react': { singleton: true },
    '@emotion/styled': { singleton: true },
  },
});
```

Current apps only share `react` and `react-dom`. Adding MUI and Emotion as singletons is recommended before production to prevent subtle theme/context mismatches.

---

## 9. Checklist for new MFEs

- [ ] Add `"@enterprise-platform/shared-ui": "workspace:*"` to `package.json`
- [ ] Import MUI components from `@enterprise-platform/shared-ui`, not `@mui/material` directly
- [ ] Do **not** wrap federated entry with `ThemeProvider`
- [ ] Add `ThemeProvider` + `CssBaseline` in standalone `main.tsx` for local dev
- [ ] Use `theme.palette.*`, `theme.spacing()`, and `sx` shorthand — avoid hardcoded colors
- [ ] Share `@mui/material` and `@emotion/*` as federation singletons in `vite.config.ts`
- [ ] Verify visual consistency by loading the MFE inside the host at `http://localhost:3002`

---

## 10. Anti-patterns

| Anti-pattern                                  | Problem                                                 | Fix                                         |
| --------------------------------------------- | ------------------------------------------------------- | ------------------------------------------- |
| Hardcoded hex colors in MFE styled components | Breaks when theme changes; inconsistent with host       | Use `theme.palette.*` or `sx` tokens        |
| Separate `ThemeProvider` per remote in host   | Theme overrides don't propagate; CSS variable conflicts | Single provider at host root                |
| Local `createTheme()` copy in an MFE          | Drift from platform branding                            | Import `theme` from shared-ui               |
| Direct `@mui/material` imports                | Version skew across apps                                | Import via `@enterprise-platform/shared-ui` |
| Missing `ThemeProvider` in standalone dev     | MFE looks unstyled when run alone                       | Wrap standalone entry with shared theme     |

Example of hardcoded colors to avoid (from current login-mfe styled components):

```tsx
// ❌ hardcoded
background-color: #eeeeee;

// ✅ theme-aware
backgroundColor: theme.palette.background.default,
```

---

## 11. Troubleshooting

### MFE looks unstyled or uses default MUI blue

**Cause:** MFE running standalone without `ThemeProvider`, or remote loaded outside the host tree.

**Fix:** Wrap standalone `main.tsx` with `ThemeProvider theme={theme}`. Confirm the MFE is rendered inside the host's provider when federated.

### Theme changes in shared-ui not reflected in an MFE

**Cause:** Dev server cache or MFE not importing from shared-ui.

**Fix:** Restart dev servers. Confirm imports use `@enterprise-platform/shared-ui`, not a local theme file.

### Inconsistent styling between host and remote

**Cause:** Hardcoded colors in the MFE, or duplicate MUI instances from missing federation singletons.

**Fix:** Replace hardcoded values with theme tokens. Add `@mui/material` and `@emotion/*` to federation `shared` config.

### `useTheme()` returns default theme inside a remote

**Cause:** Nested `ThemeProvider` in the remote overrides the host, or Emotion/MUI loaded twice.

**Fix:** Remove the remote's `ThemeProvider`. Enable MUI/Emotion federation singletons.

---

## 12. Quick reference

| Task                  | Where                             | How                                                       |
| --------------------- | --------------------------------- | --------------------------------------------------------- |
| Define platform theme | `packages/shared-ui/src/theme.ts` | Edit `createTheme()`                                      |
| Apply theme globally  | `apps/host-shell/src/main.tsx`    | `<ThemeProvider theme={theme}>`                           |
| Use MUI in an MFE     | Any remote component              | `import { Button } from '@enterprise-platform/shared-ui'` |
| Access theme in code  | Any component under host provider | `useTheme()` or `styled(({ theme }) => ...)`              |
| Dev an MFE standalone | `apps/<mfe>/src/main.tsx`         | Wrap with same `ThemeProvider`                            |
| Load remote in host   | `MFELoader` in host containers    | Remote inherits host theme automatically                  |
