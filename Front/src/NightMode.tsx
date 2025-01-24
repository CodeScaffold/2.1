import { useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';


function nightMode() {
    const [darkMode, setDarkMode] = useState(false);



    const lightTheme = createTheme({
        palette: {
            mode: 'light',
            background: {
                default: '#ffffff', // Light background
                paper: '#f9f9f9',  // Slightly darker paper for contrast
            },
            text: {
                primary: '#212121', // Dark text
                secondary: '#757575', // Subdued text
            },
            action: {
                hover: '#e0e0e0', // Hover effect for dropdown items
            },
        },
    });
    const darkTheme = createTheme({
        palette: {
            mode: 'dark',
        },
    });

    // Toggle between light and dark mode
    const handleThemeChange = () => {
        setDarkMode(!darkMode);
    };

    return (
        // Apply the selected theme using ThemeProvider
        <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Box textAlign="center">
                    <Typography variant="h4" gutterBottom>
                        {darkMode ? 'Dark Mode' : 'Light Mode'}
                    </Typography>
                    <Switch checked={darkMode} onChange={handleThemeChange} />
                </Box>
            </Box>
        </ThemeProvider>
    );
}

export default nightMode;