import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import SideAndAppBar from "./SideAndAppBar";
import SignIn from "./SignIn";
import Box from "@mui/material/Box";
import Archive from "./components/Archive";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTheme } from "@mui/material/styles";
import { ThemeProvider } from "@mui/material/styles";
import { alpha, useTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Dashboard from "./components/Dashboard";
import InputSection from "./components/InputSection.tsx";
import ResultTable from "./components/ResultTable.tsx";
import StatementParserWrapper from "./utils/ParserWrapper";
import Reports from "./components/report/Reports";
import { OpoAuthProvider, useOpoAuth } from "./OpoAuth";
import { SnackbarProvider } from "notistack";
import { UpgradePendingTable } from "./utils/UpgradePendingTable";
import Payouts from "./components/Payouts.tsx";
import OpoDashboard from "./components/opoDashboard";
import { MarginApiProvider } from "./api/useMarginApi.tsx";
import { ClientsList } from './components/ClientsList';
import { ClientDetail } from './components/ClientDetail';
import { CircularProgress } from "@mui/material";

const APP_BG_URL = '/login-bg.jpg';

// Loading component to show while checking authentication
const LoadingScreen = () => (
    <Box
        sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundImage: `url(${APP_BG_URL})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
        }}
    >
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                p: 4,
                borderRadius: 2,
                bgcolor: 'rgba(0, 0, 0, 0.7)',
            }}
        >
            <CircularProgress size={40} sx={{ color: 'white' }} />
            <Box sx={{ color: 'white', fontSize: '1.1rem' }}>
                Loading...
            </Box>
        </Box>
    </Box>
);

// Redirects "/" to the appropriate route based on auth state
function HomeRedirect() {
    const { user, isLoading, isAuthenticated } = useOpoAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/signin" replace />;
    }

    if (user.role === "risk_agent") {
        return <Navigate to="/risk" replace />;
    }

    return <Navigate to="/support" replace />;
}

const CompensationPage = () => (
    <div>
        <InputSection />
        <ResultTable />
    </div>
);

const darkTheme = createTheme({
    palette: {
        mode: "dark",
        background: {
            default: "rgba(44, 44, 44, 0.5)", // 70% opaque background
            paper:   "rgba(44, 44, 44, 0.5)", // 70% opaque card surfaces
        },
        text: {
            primary: "#FFFFFF", // full white for key text
            secondary: "#CCCCCC", // lighter secondary text
        },
    },
});

// Component to handle route protection based on user role
const ProtectedRoute = ({
                            children,
                            allowedRoles = []
                        }: {
    children: React.ReactNode,
    allowedRoles?: string[]
}) => {
    const { user, isLoading, isAuthenticated } = useOpoAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/signin" replace />;
    }

    const hasPermission = allowedRoles.length === 0 ||
        allowedRoles.includes(user.role) ||
        user.role === "admin";

    if (!hasPermission) {
        console.warn(`User ${user.email} with role ${user.role} attempted to access route requiring roles: ${allowedRoles.join(', ')}`);
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

function App() {
    const queryClient = new QueryClient();

    // MainLayout component with the sidebar and background image
    const MainLayout = ({ children }: { children: React.ReactNode }) => {
        const theme = useTheme();
        return (
            <Box
                sx={{
                    position: 'relative',
                    display: 'flex',
                    minHeight: '100vh',
                    width: '100%',
                    backgroundImage: `url(${APP_BG_URL})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: alpha(theme.palette.background.paper, 0.7),
                    backgroundBlendMode: 'overlay',
                }}
            >
                <SideAndAppBar />
                <Box component="main" sx={{ flexGrow: 1, p: 3, position: 'relative', zIndex: 1 }}>
                    {children}
                </Box>
            </Box>
        );
    };

    // App content wrapper that handles the initial loading state
    const AppContent = () => {
        const { isLoading } = useOpoAuth();

        if (isLoading) {
            return <LoadingScreen />;
        }

        return (
            <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/signin" element={<SignIn />} />

                <Route
                    path="/support"
                    element={
                        <ProtectedRoute allowedRoles={['opofinance_support']}>
                            <MainLayout>
                                <OpoDashboard />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/risk"
                    element={
                        <ProtectedRoute allowedRoles={['risk_agent']}>
                            <MainLayout>
                                <Dashboard />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* OPO Finance routes */}
                <Route
                    path="/Compensation"
                    element={
                        <ProtectedRoute allowedRoles={['opofinance_support']}>
                            <MainLayout>
                                <CompensationPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/Archive"
                    element={
                        <ProtectedRoute allowedRoles={['opofinance_support']}>
                            <MainLayout>
                                <Archive />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* ForFx routes */}
                <Route
                    path="/statement/:phase"
                    element={
                        <ProtectedRoute allowedRoles={['risk_agent']}>
                            <MainLayout>
                                <StatementParserWrapper />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/clients"
                    element={
                        <ProtectedRoute allowedRoles={['risk_agent']}>
                            <MainLayout>
                                <ClientsList />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/clients/:id"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <ClientDetail />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/payouts"
                    element={
                        <ProtectedRoute allowedRoles={['risk_agent']}>
                            <MainLayout>
                                <Payouts />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/upgrade-pending"
                    element={
                        <ProtectedRoute allowedRoles={['risk_agent']}>
                            <MainLayout>
                                <UpgradePendingTable />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/forfxreports"
                    element={
                        <ProtectedRoute allowedRoles={['risk_agent']}>
                            <MainLayout>
                                <Reports />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        );
    };

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <SnackbarProvider>
                <QueryClientProvider client={queryClient}>
                    <OpoAuthProvider>
                        <MarginApiProvider>
                            <Router>
                                <AppContent />
                            </Router>
                        </MarginApiProvider>
                    </OpoAuthProvider>
                </QueryClientProvider>
            </SnackbarProvider>
        </ThemeProvider>
    );
}

export default App;