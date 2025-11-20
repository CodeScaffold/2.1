import * as React from "react";
const FORFX_LOGO_URL = '/forfx logo.svg';
const OPO_LOGO_URL = '/logo.webp';
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CssBaseline from "@mui/material/CssBaseline";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import MuiCard from "@mui/material/Card";
import { createTheme, styled, ThemeProvider, useTheme } from "@mui/material/styles";
import Divider from "@mui/material/Divider";
import { useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { useOpoAuth } from "./OpoAuth";
import GoogleIcon from '@mui/icons-material/Google';

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  [theme.breakpoints.up("sm")]: {
    maxWidth: "500px",
  },
  borderRadius: theme.spacing(2),  // rounded corners
  boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.5)", // stronger shadow
  zIndex: 1,  // ensure card is above background
}));

const SignInContainer = styled(Box)(({ theme }) => ({
  position: "relative",         // ensure container is the positioning context
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  padding: theme.spacing(2),
  overflow: "hidden",           // prevent scrollbars from pseudo‐element
  backgroundImage: "url('/login-bg.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  filter: "brightness(50%)",  // darken for contrast; adjust as needed
}));

export default function SignIn() {
  const auth = useOpoAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const navigate = useNavigate();

  // Load remembered email if it exists
  React.useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Only a dark theme, no toggling
  const darkTheme = createTheme({
    palette: {
      mode: "dark",
    },
  });

  const theme = useTheme();

  const validateForm = () => {
    let isValid = true;

    // Reset errors
    setEmailError("");
    setPasswordError("");

    // Validate email
    if (!email) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Email address is invalid");
      isValid = false;
    }

    // Validate password
    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("Attempting login with email:", email);

    // Clear any previous errors
    setError("");

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");
    console.log("Starting auth.login...");
    try {
      const result = await auth.login(email, password);
      if (result.success) {
        // Determine role: prefer returned user, fall back to auth state
        const role = result.user?.role ?? auth.user?.role;
        console.log("Determined role:", role);
        if (role === "risk_agent") {
          navigate("/risk");
        } else {
          navigate("/support");
        }
      } else {
        setError(result.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Connection error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError("");
  };

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRememberMe(e.target.checked);
  };

  return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <SignInContainer>
          <Card>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,              // theme spacing unit
                mb: 2,               // margin-bottom to separate from text
              }}
            >
              <Box
                  component="img"
                  src={OPO_LOGO_URL}
                  alt="OpoFinance Logo"
                  sx={{ height: 60, width: 'auto' }}
              />
              <Box
                component="img"
                src={FORFX_LOGO_URL}
                alt="ForFX Logo"
                sx={{ height: 48, width: 'auto' }}
              />
            </Box>
            <Typography
                component="h1"
                variant="h4"
                sx={{ fontSize: "1.5rem", textAlign: "center", mb: 2 }}
            >
              Time to level up.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
            )}

            <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  gap: 3,
                }}
            >
              <TextField
                id="email"
                type="email"
                name="email"
                placeholder="Email address"
                variant="filled"
                error={!!emailError}
                helperText={emailError}
                value={email}
                onChange={handleEmailChange}
                fullWidth
                disabled={isLoading}
                InputProps={{ disableUnderline: true }}
                sx={{
                  '& .MuiFilledInput-root': {
                    borderRadius: theme.shape.borderRadius,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                  },
                  '& .MuiFilledInput-root::before, & .MuiFilledInput-root::after': {
                    borderRadius: theme.shape.borderRadius,
                  },
                  '& .MuiFilledInput-input': {
                    textAlign: 'center',
                    fontSize: '1.25rem',  // larger text
                  },
                }}
              />
              <TextField
                id="password"
                type="password"
                name="password"
                placeholder="Password"
                variant="filled"
                error={!!passwordError}
                helperText={passwordError}
                value={password}
                onChange={handlePasswordChange}
                fullWidth
                disabled={isLoading}
                InputProps={{ disableUnderline: true }}
                sx={{
                  '& .MuiFilledInput-root': {
                    borderRadius: theme.shape.borderRadius,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                  },
                  '& .MuiFilledInput-root::before, & .MuiFilledInput-root::after': {
                    borderRadius: theme.shape.borderRadius,
                  },
                  '& .MuiFilledInput-input': {
                    textAlign: 'center',
                    fontSize: '1.25rem',  // larger text
                  },
                }}
              />
              <FormControlLabel
                  control={
                    <Checkbox
                        checked={rememberMe}
                        onChange={handleRememberMeChange}
                        value="remember"
                        color="primary"
                        disabled={isLoading}
                    />
                  }
                  label="Remember me"
              />
              <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoading}
                  sx={{
                    background: 'linear-gradient(90deg, #6A5AFF 0%, #3C37FF 100%)',
                    color: '#fff',
                    borderRadius: theme.shape.borderRadius,
                    fontWeight: 'bold',
                    py: 1.5,
                    mt: 1,
                  }}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon sx={{ color: '#4285F4' }} />}
                onClick={() => {/* implement Google flow */}}
                sx={{
                  backgroundColor: '#fff',
                  color: 'rgba(0,0,0,0.87)',
                  textTransform: 'none',
                  mt: 2,
                  borderRadius: theme.shape.borderRadius,
                  borderColor: 'rgba(0,0,0,0.2)',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
              >
                Sign in with Google
              </Button>
            </Box>
            <Divider sx={{ my: 2 }}></Divider>
          </Card>
        </SignInContainer>
      </ThemeProvider>
  );
}