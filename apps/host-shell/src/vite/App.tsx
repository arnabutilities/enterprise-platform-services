import { AnalyticsContainer } from '@/components/AnalyticsContainer';
import { LoginContainer } from '@/components/mfe-container-components/LoginContainer';
import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Divider,
  Grid,
  ListItemText,
  MenuItem,
  MenuList,
  Paper,
  styled,
  theme,
  ThemeProvider,
  Typography,
} from '@enterprise-platform/shared-ui';
import Copyright from '@enterprise-platform/shared-ui/src/components/Copyright';
import ShellAppBar from '@enterprise-platform/shared-ui/src/components/AppBar';
import { mfeRegistry } from '../config/mfeRegistry';
import { Link, useNavigate } from 'react-router-dom';

const StyledSidebar = styled(MenuList)(({ theme }) => ({
  padding: 0,
  borderRight: `1px solid ${theme.palette.divider}`,
  height: 'calc(100vh - 65px)', // Full height minus AppBar height
  width: '100%',
}));

const mfeRoutes: Record<string, string> = {
  analytics: '/configure-analytics-mfe',
  reports: '/reports',
  login: '/login',
};

const Home = lazy(() => Promise.resolve({ default: () => <div>Host Shell (Vite) Home</div> }));

export default function App() {
  const navigate = useNavigate();
  return (
    <React.Fragment>
      <ShellAppBar
        title="Host Shell"
        isLoggedIn={false}
        onMenuClick={() => {}}
        onLoginClick={() => navigate('/login')}
      />
      <Grid container spacing={0} sx={{ width: '100%' }}>
        <Grid size={2}>
          <Paper sx={{ width: 320 }}>
            <StyledSidebar dense>
              <Typography variant="h6" sx={{ padding: 2, color: 'text.secondary' }}>
                Microfrontends
              </Typography>
              <Divider />
              {Object.values(mfeRegistry).map((menu) => (
                <MenuItem key={menu.scope} component={Link} to={mfeRoutes[menu.scope] ?? '/'}>
                  <ListItemText primary={menu.name} sx={{ color: 'text.secondary' }} />
                </MenuItem>
              ))}
            </StyledSidebar>
          </Paper>
        </Grid>
        <Grid size={10}>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/configure-analytics-mfe" element={<AnalyticsContainer />} />
              <Route path="/login" element={<LoginContainer />} />
            </Routes>
          </Suspense>
        </Grid>
      </Grid>
      <Copyright />
    </React.Fragment>
  );
}
