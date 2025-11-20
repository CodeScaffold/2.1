import React, { useState, useEffect } from "react";
import { alpha } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Box,
    CssBaseline,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Drawer,
    IconButton,
    CircularProgress, Avatar, Typography,
} from "@mui/material";
import {
    CurrencyExchange as CurrencyExchangeIcon,
    Archive as ArchiveIcon,
    Filter1 as Filter1Icon,
    Filter2 as Filter2Icon,
    AttachMoney as AttachMoneyIcon,
    History as HistoryIcon,
    Logout as LogoutIcon,
    Dashboard as DashboardIcon,
    Pending as PendingIcon,
    Payment as PaymentIcon,
} from "@mui/icons-material";
import MenuIcon from "@mui/icons-material/Menu";
import CodeIcon from "@mui/icons-material/Code";
// Import your existing authentication context
import { useOpoAuth } from "./OpoAuth.tsx";
// import SafetyCheckIcon from '@mui/icons-material/SafetyCheck';

const drawerWidth = 280;

const SideAndAppBar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Get the user's role from your existing OpoAuth context
    const { user, logout } = useOpoAuth();

    // Use effect to handle initial loading state
    useEffect(() => {
        // If user is null, we've completed loading (but not authenticated)
        // If user has data, we've completed loading and are authenticated
        // If user is undefined, we're still loading
        if (user !== undefined) {
            setIsLoading(false);
        }

        // For debugging
        // console.log("Current user:", user);
    }, [user]);

    const handleLogout = () => {
        // Clear localStorage
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("token");
        localStorage.removeItem("agentName");

        // Call the logout function from context if available
        if (logout) {
            logout();
        }

        // Navigate to sign in
        navigate("/signin");
    };

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    // Show loading indicator while authentication is in progress
    if (isLoading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    // Default to empty role if user is null
    const userRole = user?.role || "";

    // Common styles for list items to achieve rounded highlight
    const listItemButtonSx = {
        borderRadius: 2,
        mx: 1, // Horizontal margin
        mb: 1, // Bottom margin
        "&.Mui-selected": {
            backgroundColor: "rgba(255, 255, 255, 0.2)", // Highlight color
        },
        "&.Mui-selected:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.3)",
        },
    };

    const drawerContent = (
        <Box>
            {userRole !== "risk_agent" && (
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        p: 2,
                    }}
                >
                    <img
                        src="/logo.webp"
                        alt="Logo"
                        style={{ height: 60, cursor: "pointer", marginBottom: 8 }}
                        onClick={() => navigate("/support")}
                    />
                </Box>
            )}

            {(userRole === "opofinance_support" || userRole === "admin") && (
                <List>
                    <ListItemButton
                        sx={listItemButtonSx}
                        selected={location.pathname === "/support"}
                        onClick={() => navigate("/support")}
                    >
                        <ListItemIcon>
                            <DashboardIcon />
                        </ListItemIcon>
                        <ListItemText primary="Dashboard" />
                    </ListItemButton>
                </List>
            )}

            <Divider />

            {/* OPO FINANCE SECTION - Only visible to opofinance_support role or admin */}
            {(userRole === "opofinance_support" || userRole === "admin") && (
                <>
                    <List
                    >
                        <ListItemButton
                            sx={listItemButtonSx}
                            selected={location.pathname === "/Compensation"}
                            onClick={() => navigate("/Compensation")}
                        >
                            <ListItemIcon>
                                <CurrencyExchangeIcon />
                            </ListItemIcon>
                            <ListItemText primary="Compensation" />
                        </ListItemButton>
                        <ListItemButton
                            sx={listItemButtonSx}
                            selected={location.pathname === "/Archive"}
                            onClick={() => navigate("/Archive")}
                        >
                            <ListItemIcon>
                                <ArchiveIcon />
                            </ListItemIcon>
                            <ListItemText primary="Archive" />
                        </ListItemButton>
                    </List>
                    <Divider />
                </>
            )}

            {/* FORFX SECTION - Only visible to risk_agent role or admin */}
            {(userRole === "risk_agent" || userRole === "admin") && (
                <>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            p: 2,
                        }}
                    >
                        <img
                            src="/forfx%20logo.svg"
                            alt="Forfx Logo"
                            style={{ height: 40, cursor: "pointer" }}
                            onClick={() => navigate("/risk")}
                        />
                    </Box>
                    <List>
                        <ListItemButton
                            sx={listItemButtonSx}
                            selected={location.pathname === "/risk"}
                            onClick={() => navigate("/risk")}
                        >
                            <ListItemIcon>
                                <DashboardIcon />
                            </ListItemIcon>
                            <ListItemText primary="Dashboard" />
                        </ListItemButton>
                    </List>
                    <Divider />
                    <List
                    >
                        <ListItemButton
                            sx={{ ...listItemButtonSx, pl: 4 }}
                            selected={location.pathname === "/statement/phase1"}
                            onClick={() => navigate("/statement/phase1")}
                        >
                            <ListItemIcon>
                                <Filter1Icon />
                            </ListItemIcon>
                            <ListItemText primary="Phase 1" />
                        </ListItemButton>
                        <ListItemButton
                            sx={{ ...listItemButtonSx, pl: 4 }}
                            selected={location.pathname === "/statement/phase2"}
                            onClick={() => navigate("/statement/phase2")}
                        >
                            <ListItemIcon>
                                <Filter2Icon />
                            </ListItemIcon>
                            <ListItemText primary="Phase 2" />
                        </ListItemButton>
                        <ListItemButton
                            sx={{ ...listItemButtonSx, pl: 4 }}
                            selected={location.pathname === "/statement/funded"}
                            onClick={() => navigate("/statement/funded")}
                        >
                            <ListItemIcon>
                                <AttachMoneyIcon />
                            </ListItemIcon>
                            <ListItemText primary="Funded" />
                        </ListItemButton>
                        <ListItemButton
                            sx={{ ...listItemButtonSx, pl: 4 }}
                            selected={location.pathname === "/upgrade-pending"}
                            onClick={() => navigate("/upgrade-pending")}
                        >
                            <ListItemIcon>
                                <PendingIcon />
                            </ListItemIcon>
                            <ListItemText primary="Upgrade Pending" />
                        </ListItemButton>
                        <ListItemButton
                            sx={{ ...listItemButtonSx, pl: 4 }}
                            selected={location.pathname === "/payouts"}
                            onClick={() => navigate("/payouts")}
                        >
                            <ListItemIcon>
                                <PaymentIcon />
                            </ListItemIcon>
                            <ListItemText primary="Payouts" />
                        </ListItemButton>
                        <ListItemButton
                            sx={{ ...listItemButtonSx, pl: 4 }}
                            selected={location.pathname === "/forfxreports"}
                            onClick={() => navigate("/forfxreports")}
                        >
                            <ListItemIcon>
                                <HistoryIcon />
                            </ListItemIcon>
                            <ListItemText primary="ForFx Reports" />
                        </ListItemButton>
                        <ListItemButton
                            sx={{ ...listItemButtonSx, pl: 4 }}
                            selected={location.pathname === "/clients"}
                            onClick={() => navigate("/clients")}
                        >
                            <ListItemIcon>
                                <Avatar sx={{ width: 24, height: 24 }}>C</Avatar>
                            </ListItemIcon>
                            <ListItemText primary="Clients" />
                        </ListItemButton>
                    </List>
                    <Divider sx={{ my: 1 }} />
                </>
            )}


            {/* LOGOUT - Visible to all roles */}
            <ListItemButton sx={listItemButtonSx} onClick={handleLogout}>
                <ListItemIcon>
                    <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Logout" />
            </ListItemButton>
            <Divider />
            <ListItemButton sx={{ ...listItemButtonSx, pl: 4 }}>
                <ListItemIcon>
                    <CodeIcon />
                </ListItemIcon>
                <ListItemText primary="Version 1.7.7" />
            </ListItemButton>
            <Divider />
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0.8 }}>
                Release notes
              </Typography>
              <List dense disablePadding>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText
                    primary="Added new MT5 server"
                    primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText
                    primary="Archive now uses auth"
                    primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  />
                </ListItem>
                  <ListItem sx={{ py: 0 }}>
                      <ListItemText
                          primary="Margin calculation modified for JPY Pairs"
                          primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      />
                  </ListItem>
                <ListItem sx={{ py: 0 }}>
                    <ListItemText
                        primary="Timezone Adjusted To Dynamic Logic"
                        primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                    />
                </ListItem>
              </List>
            </Box>
        </Box>
    );

    return (
        <Box
            sx={{
                display: "flex",
                backgroundColor: (theme) => alpha(theme.palette.background.default, 0.3),
                color: "text.primary",
            }}
        >
            <CssBaseline />
            {/* Mobile AppBar Icon */}
            <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{
                    display: { xs: "block", md: "none" },
                    position: "fixed",
                    top: 8,
                    left: 8,
                    zIndex: 1300,
                }}
            >
                <MenuIcon />
            </IconButton>

            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: "block", md: "none" },
                    "& .MuiDrawer-paper": {
                        boxSizing: "border-box",
                        width: drawerWidth,
                        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.3),
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            <Box
                component="nav"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    display: { xs: "none", md: "block" },
                }}
            >
                <Box
                    sx={{
                        width: drawerWidth,
                        position: "fixed",
                        top: 0,
                        left: 0,
                        height: "100vh",
                        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.3),
                        boxShadow: 3,
                        overflowY: "auto",
                    }}
                >
                    {drawerContent}
                </Box>
            </Box>
        </Box>
    );
};

export default SideAndAppBar;