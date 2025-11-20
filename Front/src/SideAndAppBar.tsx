import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useState } from 'react';
import { Archive, Logout } from "@mui/icons-material";
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import ArchiveIcon from '@mui/icons-material/Archive';
import Filter1Icon from '@mui/icons-material/Filter1';
import Filter2Icon from '@mui/icons-material/Filter2';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HistoryIcon from '@mui/icons-material/History';
import StatementParser from "./StatementParser.tsx";
import ResultTable from "../src/components/ResultTable.tsx";
import { Route, Routes, useNavigate } from 'react-router-dom';
import InputSection from '../src/components/InputSection.tsx';

const drawerWidth = 240;

const openedMixin = (theme: Theme): CSSObject => ({
    width: drawerWidth,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: `calc(${theme.spacing(7)} + 1px)`,
    [theme.breakpoints.up('sm')]: {
        width: `calc(${theme.spacing(8)} + 1px)`,
    },
});

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
}));

interface AppBarProps extends MuiAppBarProps {
    open?: boolean;
}

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

const Drawer = styled(MuiDrawer, {
    shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
        ...openedMixin(theme),
        '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
        ...closedMixin(theme),
        '& .MuiDrawer-paper': closedMixin(theme),
    }),
}));



export default function MiniDrawer() {
    // Remove dark mode state and toggle logic
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const theme = useTheme();

    const CompensationPage = () => (
        <div>
            <InputSection />
            <ResultTable />
        </div>
    );

    const handleDrawerOpen = () => {
        setOpen(true);
    };

    const handleDrawerClose = () => {
        setOpen(false);
    };

    const handleLogout = () => {
        // Clear authentication and redirect to SignIn page
        localStorage.removeItem('isAuthenticated');
        navigate('/signIn');
    };

    return (

            <Box sx={{ display: 'flex' }}>
                <CssBaseline />
                <AppBar position="fixed" open={open}>
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            onClick={handleDrawerOpen}
                            edge="start"
                            sx={{ marginRight: 5, ...(open && { display: 'none' }) }}
                        >
                            <MenuIcon />
                        </IconButton>

                        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                            <img
                                src="/logo.webp"
                                alt="Logo"
                                onClick={() => navigate("/")}
                                style={{ marginRight: 60, height: "60px", marginTop: "10px", cursor: "pointer" }}
                            />
                        </Typography>
                        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                            <img
                                src="/forfx%20logo.svg"
                                alt="forfxLogo"
                                onClick={() => navigate("/")}
                                style={{ marginRight: 1050, height: "40px", marginTop: "10px", cursor: "pointer" }}
                            />
                        </Typography>
                        {/* Removed dark mode toggle button */}
                    </Toolbar>
                </AppBar>
                <Drawer variant="permanent" open={open}>
                    <DrawerHeader>
                        <IconButton onClick={handleDrawerClose}>
                            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                        </IconButton>
                    </DrawerHeader>
                    <Divider />
                    <List>
                        {['Compensation', 'Archive'].map((text, index) => (
                            <ListItem key={text} disablePadding sx={{ display: "block" }}>
                                <ListItemButton
                                    sx={{
                                        minHeight: 48,
                                        justifyContent: open ? "initial" : "center",
                                        px: 2.5,
                                    }}
                                    onClick={() => navigate(index === 0 ? "/compensation" : "/archive")}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            mr: open ? 3 : "auto",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {index % 2 === 0 ? <CurrencyExchangeIcon /> : <ArchiveIcon />}
                                    </ListItemIcon>
                                    <ListItemText primary={text} sx={{ opacity: open ? 1 : 0 }} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    <Divider />
                    <List>
                        {['Phase 1', 'Phase 2', 'Funded', 'History'].map((text, index) => (
                            <ListItem key={text} disablePadding sx={{ display: 'block' }}>
                                <ListItemButton
                                    sx={{
                                        minHeight: 48,
                                        justifyContent: open ? 'initial' : 'center',
                                        px: 2.5,
                                    }}
                                    onClick={() => {
                                        if (index === 0) navigate('/phase1');
                                        else if (index === 1) navigate('/phase2');
                                        // Add navigation for 'Funded' and 'History' if needed
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            mr: open ? 3 : 'auto',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {index === 0 && <Filter1Icon />}
                                        {index === 1 && <Filter2Icon />}
                                        {index === 2 && <AttachMoneyIcon />}
                                        {index === 3 && <HistoryIcon />}
                                    </ListItemIcon>
                                    <ListItemText primary={text} sx={{ opacity: open ? 1 : 0 }} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    <Divider />
                    <ListItemButton onClick={handleLogout}>
                        <ListItemIcon>
                            <Logout />
                        </ListItemIcon>
                        <ListItemText primary="Logout" />
                    </ListItemButton>
                </Drawer>
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        transition: theme.transitions.create('margin', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.leavingScreen,
                        }),
                    }}
                >
                    <DrawerHeader />
                    <Routes>
                        <Route path="/compensation" element={<CompensationPage />} />
                        <Route path="/archive" element={<Archive />} />
                        <Route path="/phase1" element={<StatementParser />} />
                        <Route path="/phase2" element={<StatementParser />} />
                        {/* Add more routes as needed */}
                    </Routes>
                </Box>
            </Box>

    );
}
