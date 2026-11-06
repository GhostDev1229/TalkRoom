import React, { useContext, useState } from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";

import { Button, TextField } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import { AuthContext } from "../contexts/AuthContext";

import "../styles/Home.css";

function HomeComponent() {
  const navigate = useNavigate();

  const [meetingCode, setMeetingCode] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const { addToUserHistory } = useContext(AuthContext);

  const handleJoinVideoCall = async (event) => {
    event?.preventDefault();

    const code = meetingCode.trim();

    if (!code) {
      setError("Please enter a meeting code.");
      return;
    }

    try {
      setJoining(true);
      setError("");

      await addToUserHistory(code);
      navigate(`/${encodeURIComponent(code)}`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to join the meeting.",
      );
    } finally {
      setJoining(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth", { replace: true });
  };

  return (
    <div className="homePageContainer">
      {/* NAVBAR */}

      <nav className="homeNavbar">
        <div className="homeBrand">
          <span className="homeBrandIcon">T</span>
          <h2>TalkRoom</h2>
        </div>

        <div className="homeNavActions">
          <button
            className="homeHistoryButton"
            onClick={() => navigate("/history")}
          >
            <RestoreIcon />
            <span>History</span>
          </button>

          <Button className="homeLogoutButton" onClick={handleLogout}>
            Logout <span>↗</span>
          </Button>
        </div>
      </nav>

      {/* MAIN CONTENT */}

      <main className="homeMainContainer">
        <section className="homeLeftPanel">
          <div className="homeWelcomeBadge">
            <span className="homeOnlineDot"></span>
            YOUR PERSONAL MEETING SPACE
          </div>

          <h1>
            Your conversations.
            <br />
            Your <span>people.</span>
            <br />
            One place.
          </h1>

          <p className="homeDescription">
            Create meaningful connections, meet your team, and stay close to the
            people who matter. Your next conversation starts here.
          </p>

          <div className="homeMeetingCard">
            <div className="homeMeetingCardHeader">
              <div>
                <h3>Join a meeting</h3>
                <p>Enter a meeting code to get started.</p>
              </div>

              <span className="homeMeetingIcon">↗</span>
            </div>

            <form className="homeMeetingForm" onSubmit={handleJoinVideoCall}>
              <TextField
                value={meetingCode}
                onChange={(event) => {
                  setMeetingCode(event.target.value);
                  if (error) setError("");
                }}
                id="meeting-code"
                label="Meeting Code"
                variant="outlined"
                fullWidth
                autoComplete="off"
              />

              <Button
                type="submit"
                variant="contained"
                disabled={joining}
                className="homeJoinButton"
              >
                {joining ? "Joining..." : "Join Meeting →"}
              </Button>
            </form>

            {error && (
              <p className="homeErrorMessage" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="homeFeatureRow">
            <div>
              <span>✦</span>
              HD Video
            </div>

            <div>
              <span>✦</span>
              Live Chat
            </div>

            <div>
              <span>✦</span>
              Screen Sharing
            </div>
          </div>
        </section>

        {/* RIGHT VISUAL */}

        <section className="homeRightPanel">
          <div className="homeVisualGlow"></div>

          <div className="homeVisualCircle homeCircleOne"></div>
          <div className="homeVisualCircle homeCircleTwo"></div>

          <div className="homeIllustration">
            <img src="/logo3.png" alt="TalkRoom video meeting illustration" />
          </div>

          <div className="homeFloatingCard homeFloatingTop">
            <span className="homeFloatingIcon">✦</span>
            <div>
              <strong>Stay connected</strong>
              <p>Wherever life takes you</p>
            </div>
          </div>

          <div className="homeFloatingCard homeFloatingBottom">
            <span className="homeFloatingLive"></span>
            <div>
              <strong>Ready when you are</strong>
              <p>Start your next conversation</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="homeFooter">
        <span>TalkRoom © 2026</span>
        <span>Made for better conversations.</span>
      </footer>
    </div>
  );
}

export default withAuth(HomeComponent);
