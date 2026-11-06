import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { AuthContext } from "../contexts/AuthContext";
import { Snackbar, Alert } from "@mui/material";

import "../styles/Authentication.css";

const defaultTheme = createTheme();

export default function Authentication() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [formState, setFormState] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const { handleRegister, handleLogin } = React.useContext(AuthContext);

  const handleAuth = async (event) => {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password || (formState === 1 && !name.trim())) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      if (formState === 0) {
        await handleLogin(username, password);
      } else {
        const result = await handleRegister(name, username, password);

        setMessage(result || "Registration successful. Please sign in.");

        setOpen(true);
        setFormState(0);
        setName("");
        setUsername("");
        setPassword("");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const changeForm = (nextState) => {
    setFormState(nextState);
    setError("");
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Grid
        container
        component="main"
        className="authMainContainer"
        sx={{ minHeight: "100vh" }}
      >
        <CssBaseline />

        {/* LEFT HERO SECTION */}

        <Grid item xs={false} sm={4} md={7} className="authHeroPanel">
          <div className="authHeroOverlay">
            <div className="authBrand">
              <span className="authBrandIcon">T</span>
              <span className="authBrandName">TalkRoom</span>
            </div>

            <div className="authHeroContent">
              <span className="authEyebrow">
                <span className="authLiveDot"></span>
                CONNECT. COMMUNICATE. COLLABORATE.
              </span>

              <h1>
                Conversations
                <br />
                that bring
                <br />
                <span>people closer.</span>
              </h1>

              <p>
                Experience seamless video meetings, real-time conversations and
                meaningful connections wherever you are.
              </p>

              <div className="authFeatureList">
                <div className="authFeature">
                  <span className="authFeatureIcon">✦</span>
                  <span>HD Video Meetings</span>
                </div>

                <div className="authFeature">
                  <span className="authFeatureIcon">✦</span>
                  <span>Real-time Messaging</span>
                </div>

                <div className="authFeature">
                  <span className="authFeatureIcon">✦</span>
                  <span>Secure Connections</span>
                </div>
              </div>
            </div>

            <div className="authFooterText">Made for better conversations.</div>
          </div>
        </Grid>

        {/* RIGHT AUTHENTICATION PANEL */}

        <Grid
          item
          xs={12}
          sm={8}
          md={5}
          component={Paper}
          elevation={0}
          square
          className="authFormPanel"
        >
          <Box className="authFormWrapper">
            <div className="authMobileBrand">
              <span className="authBrandIcon">T</span>
              <span>TalkRoom</span>
            </div>

            <Avatar className="authAvatar">
              <LockOutlinedIcon />
            </Avatar>

            <div className="authHeading">
              <h2>
                {formState === 0 ? "Welcome back!" : "Create your account"}
              </h2>

              <p>
                {formState === 0
                  ? "Sign in to continue your conversations."
                  : "Join TalkRoom and start connecting."}
              </p>
            </div>

            {/* SIGN IN / SIGN UP SWITCH */}

            <div className="authTabs">
              <Button
                className={formState === 0 ? "activeTab" : ""}
                variant={formState === 0 ? "contained" : "text"}
                onClick={() => changeForm(0)}
                disabled={loading}
              >
                Sign In
              </Button>

              <Button
                className={formState === 1 ? "activeTab" : ""}
                variant={formState === 1 ? "contained" : "text"}
                onClick={() => changeForm(1)}
                disabled={loading}
              >
                Sign Up
              </Button>
            </div>

            {/* AUTHENTICATION FORM */}

            <Box
              component="form"
              noValidate
              onSubmit={handleAuth}
              className="authForm"
            >
              {formState === 1 && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="full-name"
                  label="Full Name"
                  name="name"
                  value={name}
                  autoFocus
                  onChange={(event) => setName(event.target.value)}
                />
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                value={username}
                autoFocus={formState === 0}
                onChange={(event) => setUsername(event.target.value)}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                value={password}
                type="password"
                autoComplete={
                  formState === 0 ? "current-password" : "new-password"
                }
                onChange={(event) => setPassword(event.target.value)}
                id="password"
              />

              {error && (
                <div className="authError" role="alert">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                className="authSubmitButton"
              >
                {loading
                  ? "Please wait..."
                  : formState === 0
                    ? "Sign In →"
                    : "Create Account →"}
              </Button>
            </Box>

            <div className="authBottomText">
              By continuing, you agree to use TalkRoom responsibly and
              respectfully.
            </div>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
      >
        <Alert severity="success" onClose={() => setOpen(false)}>
          {message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
