import React, { useEffect } from 'react';
import {
  Button,
  Card,
  CardActions,
  CardContent,
  ContentCut,
  Details,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Grid,
  Icon,
  IconButton,
  Info,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  MoreVert,
  Paper,
  Radio,
  RadioGroup,
  Settings,
  TextField,
  Typography,
} from '@enterprise-platform/shared-ui';
import { CrawlerAgent } from '@enterprise-platform/shared-types';
import MFEMenubar from '@enterprise-platform/shared-ui/src/components/MFEMenuBar/MFEMenuBar';

const agents: CrawlerAgent[] = [
  {
    id: 'agent-1',
    name: 'Web Crawler Agent',
    crawler: {
      id: 'crawler-1',
      name: 'Facebook Crawler',
      type: 'web',
      version: '1.0.0',
      status: 'idle',
      settings: {
        userAgent: 'MyWebCrawler/1.0',
        websiteUrl: 'https://example.com',
        request: {},
        crawlDelay: 1,
        maxDepth: 2,
        maxPages: 100,
      },
    },
  },
  {
    id: 'agent-2',
    name: 'API Crawler Agent',
    crawler: {
      id: 'crawler-2',
      name: 'API Crawler',
      type: 'api',
      version: '1.0.0',
      status: 'running',
      settings: {
        userAgent: 'MyWebCrawler/1.0',
        websiteUrl: 'https://example.com',
        request: {},
        crawlDelay: 1,
        maxDepth: 2,
        maxPages: 100,
      },
    },
  },
];

const getCardOptions = (
  agent: CrawlerAgent,
  anchorEl: null | HTMLElement,
  setAnchorEl: React.Dispatch<React.SetStateAction<null | HTMLElement>>,
) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);
  return (
    <>
      <IconButton
        size="small"
        id={`${agent.id}-menu-button`}
        aria-controls={open ? `${agent.id}-menu-button` : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleClick}
      >
        {' '}
        <MoreVert />{' '}
      </IconButton>
      <Menu
        id={`${agent.id}-menu`}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            'aria-labelledby': `${agent.id}-menu-button`,
          },
        }}
      >
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <Info fontSize="small" />
          </ListItemIcon>
          <ListItemText> Observe </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <Details fontSize="small" />
          </ListItemIcon>
          <ListItemText> Data Details </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText> Settings </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

const NewAgentModal = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (isOpen: boolean) => void;
}) => {
  const handleClose = () => {
    setOpen(false);
  };
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries((formData as any).entries());
    const email = formJson.email;
    handleClose();
  };
  return (
    <>
      <Dialog open={open} PaperComponent={Paper} onClose={handleClose}>
        <DialogTitle>New Agent</DialogTitle>
        <DialogContent>
          <DialogContentText>
            To create a new crawler agent, please enter the agent name below. This will help you
            identify and manage your crawler agents effectively.
          </DialogContentText>
          <DialogContentText sx={{ marginTop: 2 }}>
            After creating the agent, you can configure its settings, such as the type of crawler,
            target website, crawl depth, and other parameters to suit your needs.
          </DialogContentText>
          <form onSubmit={handleSubmit} id="subscription-form">
            <TextField
              autoFocus
              required
              margin="dense"
              id="name"
              name="name"
              label="Agent Name"
              type="text"
              fullWidth
              variant="standard"
            />
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  autoFocus
                  required
                  margin="dense"
                  id="crawlername"
                  name="crawlername"
                  label="Crawler Name"
                  type="text"
                  fullWidth
                  variant="standard"
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  autoFocus
                  required
                  margin="dense"
                  id="weburl"
                  name="weburl"
                  label="Web URL"
                  type="text"
                  fullWidth
                  variant="standard"
                />
              </Grid>
              <Grid size={6}>
                <RadioGroup defaultValue="web" name="crawlerType">
                  <FormControlLabel value="web" control={<Radio />} label="Web Crawler" />
                  <FormControlLabel value="api" control={<Radio />} label="API Crawler" />
                  <FormControlLabel value="database" control={<Radio />} label="Database Crawler" />
                </RadioGroup>
              </Grid>
              <Grid size={6}>
                <TextField
                  autoFocus
                  required
                  margin="dense"
                  id="crawlingdelay"
                  name="crawlingdelay"
                  label="Crawling Delay (seconds)"
                  type="text"
                  fullWidth
                  variant="standard"
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" form="subscription-form">
            Create Agent
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const getStatusColor = (status: string): 'success' | 'error' | 'info' | 'warning' => {
  switch (status) {
    case 'running':
      return 'success';
    case 'idle':
      return 'error';
    default:
      return 'warning';
  }
};

export function Analytics() {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [newCrawler, setNewCrawler] = React.useState<boolean>(false);
  const menuItems = [
    {
      label: 'Agents',
      submenu: [
        {
          label: 'Create New Agent',
          action: () => {
            setNewCrawler(true);
            console.log('Create new agent', newCrawler);
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'What is a Crawler Agent?',
          action: () => {
            console.log('Create new agent');
          },
        },
      ],
    },
  ];
  return (
    <>
      <MFEMenubar title="Analytics Dashboard" menus={menuItems} />
      <Grid container spacing={2} sx={{ padding: 2 }}>
        {agents.map((agent) => (
          <Grid size={2} key={agent.id}>
            <Card variant="outlined" key={agent.id} sx={{ width: `100%` }}>
              <CardContent>
                <Typography
                  gutterBottom
                  noWrap
                  sx={{ color: 'text.secondary', fontSize: 14 }}
                  title={agent.name + ', ' + agent.crawler.name}
                >
                  {agent.name}, {agent.crawler.name}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
                  Type: {agent.crawler.type}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
                  Version: {agent.crawler.version}
                </Typography>
              </CardContent>
              <CardActions sx={{ alignItems: 'right', justifyContent: 'space-between' }}>
                <Button size="small" color={getStatusColor(agent.crawler.status)}>
                  {agent.crawler.status.toUpperCase()}
                </Button>
                {getCardOptions(agent, anchorEl, setAnchorEl)}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      <NewAgentModal open={newCrawler} setOpen={setNewCrawler} />
    </>
  );
}

export default Analytics;
