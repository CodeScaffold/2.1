import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CssBaseline from '@mui/material/CssBaseline';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MuiCard from '@mui/material/Card';
import { createTheme, styled, ThemeProvider } from '@mui/material/styles';
import Divider from "@mui/material/Divider";
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from "react";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import IconButton from "@mui/material/IconButton";

const Card = styled(MuiCard)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
        maxWidth: '500px',
    },
    boxShadow:
        'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
}));

const SignInContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: theme.spacing(2),
    position: 'relative',
}));

export default function SignIn({ onSignIn }: { onSignIn: () => void }) {
    const [emailError, setEmailError] = React.useState(false);
    const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
    const [passwordError, setPasswordError] = React.useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
    const navigate = useNavigate();

    const [darkMode, setDarkMode] = useState(() => {
        // Check for saved mode in localStorage
        const savedMode = localStorage.getItem('darkMode');
        return savedMode === 'true';
    });

    useEffect(() => {
        // Persist dark mode in localStorage
        localStorage.setItem('darkMode', darkMode.toString());
    }, [darkMode]);

    const lightTheme = createTheme({
        palette: {
            mode: 'light',
        },
    });

    const darkTheme = createTheme({
        palette: {
            mode: 'dark',
        },
    });

    const handleThemeChange = () => {
        setDarkMode(!darkMode);
    };

    // Dummy hardcoded credentials for testing
    const dummyUser = {
        email: "user@example.com",
        password: "password123",
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = data.get('email') as string;
        const password = data.get('password') as string;

        // Check credentials
        if (email === dummyUser.email && password === dummyUser.password) {
            localStorage.setItem('isAuthenticated', 'true');
            onSignIn(); // Simulate login
            navigate("/Statement"); // Redirect to protected route
        } else {
            setEmailError(true);
            setEmailErrorMessage('Invalid email or password.');
            setPasswordError(true);
            setPasswordErrorMessage('Invalid email or password.');
        }
    };

    return (
        <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
            <CssBaseline />
            <SignInContainer>
                <IconButton
                    onClick={handleThemeChange}
                    color="inherit"
                    sx={{ position: 'absolute', top: 16, right: 16 }}
                >
                    {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>

                <Card>
                    <Typography component="h1" variant="h4" sx={{ fontSize: '2rem', textAlign: 'center', mb: 2 }}>
                        Sign in
                    </Typography>
                        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}>
                            <FormControl>
                                <FormLabel htmlFor="email">Email</FormLabel>
                                <TextField
                                    error={emailError}
                                    helperText={emailErrorMessage}
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="user@example.com"
                                    autoComplete="email"
                                    autoFocus
                                    required
                                    fullWidth
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel htmlFor="password">Password</FormLabel>
                                <TextField
                                    error={passwordError}
                                    helperText={passwordErrorMessage}
                                    name="password"
                                    placeholder="••••••"
                                    type="password"
                                    id="password"
                                    autoComplete="current-password"
                                    required
                                    fullWidth
                                />
                            </FormControl>
                            <FormControlLabel
                                control={<Checkbox value="remember" color="primary" />}
                                label="Remember me"
                            />
                            <Button type="submit" fullWidth variant="contained">
                                Sign in
                            </Button>
                        </Box>
                    <Divider sx={{ my: 2 }}>or</Divider>
                    <Button type="button" fullWidth variant="outlined">
                        Sign in with Google
                    </Button>
                </Card>
            </SignInContainer>
        </ThemeProvider>
    );
}