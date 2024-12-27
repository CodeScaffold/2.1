import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SideAndAppBar from "./SideAndAppBar";
import StatementParser from './StatementParser';
import SignIn from './SignIn';
import Box from '@mui/material/Box';
import { useState } from 'react';
import Archive from "./components/Archive";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('isAuthenticated') === 'true');

    const handleSignIn = () => {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
    };



    const queryClient = new QueryClient();

    return (
        <QueryClientProvider client={queryClient}>
        <Router>
            <Routes>
                <Route path="/signin" element={<SignIn onSignIn={handleSignIn} />} />
                {isAuthenticated ? (
                    <Route
                        path="/*"
                        element={
                            <Box sx={{ display: 'flex' }}>
                                <SideAndAppBar />
                                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                                    <Routes>
                                        <Route path="/" element={<Navigate to="/" />} />
                                        <Route path="Statement" element={<StatementParser />} />
                                        <Route path="Archive" element={<Archive />} />
                                    </Routes>
                                </Box>
                            </Box>
                        }
                    />
                ) : (
                    <Route path="*" element={<Navigate to="/signin" />} />
                )}
            </Routes>
        </Router>
        </QueryClientProvider>
    );
}

export default App;