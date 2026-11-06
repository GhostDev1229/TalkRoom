import React, { useCallback, useContext, useEffect, useState } from "react";

import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import withAuth from "../utils/withAuth";

import {
  Button,
  IconButton,
  Card,
  CardContent,
  Typography,
} from "@mui/material";

import HomeIcon from "@mui/icons-material/Home";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import "../styles/History.css";

function History() {
  const { getHistoryOfUser } = useContext(AuthContext);

  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchHistory = useCallback(async () => {
    try {
      setError("");
      const history = await getHistoryOfUser();
      setMeetings(Array.isArray(history) ? history : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load meeting history.",
      );
    } finally {
      setLoading(false);
    }
  }, [getHistoryOfUser]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleString();
  };

  return (
    <div className="historyPageContainer">
      {/* NAVBAR */}

      <nav className="historyNavbar">
        <div className="historyBrand">
          <span className="historyBrandIcon">T</span>
          <h2>TalkRoom</h2>
        </div>

        <Button
          className="historyHomeButton"
          onClick={() => navigate("/home")}
          startIcon={<HomeIcon />}
        >
          Back to Home
        </Button>
      </nav>

      {/* MAIN CONTENT */}

      <main className="historyMainContent">
        <div className="historyPageHeading">
          <div className="historyHeadingIcon">
            <VideocamOutlinedIcon />
          </div>

          <div>
            <span className="historyEyebrow">YOUR ACTIVITY</span>

            <h1>Meeting History</h1>

            <p>Revisit your previous conversations and meeting sessions.</p>
          </div>
        </div>

        {/* MEETING COUNT */}

        {!loading && !error && (
          <div className="historyStats">
            <div className="historyStatIcon">
              <CalendarMonthOutlinedIcon />
            </div>

            <div>
              <span>Total meetings</span>
              <strong>{meetings.length}</strong>
            </div>
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="historyStateCard">
            <div className="historyLoader"></div>
            <h3>Loading your meetings...</h3>
            <p>Please wait while we retrieve your history.</p>
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="historyStateCard historyErrorCard">
            <h3>Something went wrong</h3>
            <p>{error}</p>

            <Button
              className="historyRetryButton"
              onClick={() => {
                setLoading(true);
                fetchHistory();
              }}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* EMPTY STATE */}

        {!loading && !error && meetings.length === 0 && (
          <div className="historyStateCard">
            <div className="historyEmptyIcon">
              <VideocamOutlinedIcon />
            </div>

            <h3>No meetings yet</h3>

            <p>
              Your meeting history will appear here once you join a meeting.
            </p>

            <Button
              className="historyRetryButton"
              onClick={() => navigate("/home")}
              endIcon={<ArrowForwardRoundedIcon />}
            >
              Join a Meeting
            </Button>
          </div>
        )}

        {/* MEETING LIST */}

        {!loading && !error && meetings.length > 0 && (
          <div className="historyMeetingList">
            {meetings.map((meeting, index) => (
              <Card
                key={meeting._id || `${meeting.meetingCode}-${meeting.date}`}
                className="historyMeetingCard"
                elevation={0}
              >
                <CardContent className="historyCardContent">
                  <div className="historyCardIcon">
                    <VideocamOutlinedIcon />
                  </div>

                  <div className="historyMeetingDetails">
                    <span className="historyMeetingLabel">
                      MEETING {String(index + 1).padStart(2, "0")}
                    </span>

                    <Typography className="historyMeetingCode">
                      {meeting.meetingCode || "Unknown meeting"}
                    </Typography>

                    <div className="historyMeetingDate">
                      <CalendarMonthOutlinedIcon />
                      <span>{formatDate(meeting.date)}</span>
                    </div>
                  </div>

                  <IconButton
                    className="historyMeetingAction"
                    aria-label="Join this meeting"
                    onClick={() => {
                      if (meeting.meetingCode) {
                        navigate(`/${encodeURIComponent(meeting.meetingCode)}`);
                      }
                    }}
                    disabled={!meeting.meetingCode}
                  >
                    <ArrowForwardRoundedIcon />
                  </IconButton>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="historyFooter">
        <span>TalkRoom © 2026</span>
        <span>Made for better conversations.</span>
      </footer>
    </div>
  );
}

export default withAuth(History);
