import * as React from 'react';
import {
  Menubar,
  MenuRoot,
  MenuTrigger,
  MenuPortal,
  MenuPositioner,
  MenuPopup,
  MenuItem,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
} from './Menubar';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { Divider } from '@mui/material';

export type MFEMenuBarProps = {
  title: string;
  menus?: MenuItemType[];
};

export type MenuItemType = {
  label: string;
  submenu?: MenuItemType[];
  action?: () => void;
};

const getMenu = (submenu: MenuItemType[], menuType: 'root' | 'submenu') => {
  if (!submenu) return null;
  if (menuType === 'submenu') {
    return submenu.map((item) => {
      if (!item.submenu) {
        return (
          <MenuItem key={`${item.label}-menu-item`} onClick={item.action}>
            {item.label}
          </MenuItem>
        );
      }
      return (
        <MenuSubmenuRoot key={`${item.label}-submenu-root-item`}>
          <MenuSubmenuTrigger>{item.label}</MenuSubmenuTrigger>
          <MenuPortal>
            <MenuPositioner alignOffset={-4}>
              <MenuPopup>{getMenu(item.submenu || [], 'submenu')}</MenuPopup>
            </MenuPositioner>
          </MenuPortal>
        </MenuSubmenuRoot>
      );
    });
  }
  if (menuType === 'root') {
    return submenu.map((item) => (
      <MenuRoot key={`${item.label}-menu-root-item`}>
        <MenuTrigger>{item.label}</MenuTrigger>
        <MenuPortal>
          <MenuPositioner alignOffset={-4}>
            <MenuPopup>{getMenu(item.submenu || [], 'submenu')}</MenuPopup>
          </MenuPositioner>
        </MenuPortal>
      </MenuRoot>
    ));
  }
};

export default function MFEMenubar({ title, menus }: MFEMenuBarProps) {
  return (
    <Grid container spacing={2} sx={{ alignItems: 'center', padding: 1, width: '100%', rowGap: 0 }}>
      <Grid size={8}>
        <Typography noWrap>{title}</Typography>
      </Grid>
      <Grid size={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Menubar>{getMenu(menus || [], 'root')}</Menubar>
      </Grid>
      <Divider sx={{ width: '100%' }} />
    </Grid>
  );
}
