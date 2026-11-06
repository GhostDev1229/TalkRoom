import React from "react";
import { Link, useNavigate } from "react-router-dom";

import "../styles/LandingPage.css";

export default function LandingPage() {
  const router = useNavigate();

  return (
    <div className="landingPageContainer">
      <nav className="landingNavbar">
        <div className="navHeader">
          <span className="landingBrandIcon">T</span>
          <h2>TalkRoom</h2>
        </div>

        <div className="navlist">
          <button className="navTextButton" onClick={() => router("/aljk23")}>
            Join as Guest
          </button>

          <button className="navTextButton" onClick={() => router("/auth")}>
            Register
          </button>

          <button className="navLoginButton" onClick={() => router("/auth")}>
            Login <span>→</span>
          </button>
        </div>
      </nav>

      <main className="landingMainContainer">
        <div className="landingHeroContent">
          <div className="landingEyebrow">
            <span className="landingStatusDot"></span>
            YOUR SPACE TO CONNECT
          </div>

          <h1>
            Connect with
            <br />
            your <span>loved ones.</span>
          </h1>

          <p>
            Distance should never come between meaningful conversations. Bring
            everyone closer with seamless video calls and real-time messaging.
          </p>

          <div className="landingActions">
            <Link to="/auth" className="landingPrimaryButton">
              Get Started <span>→</span>
            </Link>

            <button
              className="landingSecondaryButton"
              onClick={() => router("/aljk23")}
            >
              Join as Guest
            </button>
          </div>

          <div className="landingHighlights">
            <div>
              <span className="highlightIcon">✦</span>
              HD Video Calls
            </div>
            <div>
              <span className="highlightIcon">✦</span>
              Live Messaging
            </div>
            <div>
              <span className="highlightIcon">✦</span>
              Easy Connections
            </div>
          </div>
        </div>

        <div className="landingHeroVisual">
          <div className="landingVisualGlow"></div>

          <div className="landingVisualCard">
            <img src="/mobile.png" alt="TalkRoom video calling interface" />
          </div>

          <div className="landingFloatingBadge landingBadgeTop">
            <span className="badgeLiveDot"></span>
            Live conversations
          </div>

          <div className="landingFloatingBadge landingBadgeBottom">
            <span>✦</span> Stay connected, anywhere.
          </div>
        </div>
      </main>

      <div className="landingBottomLine">
        <span>TalkRoom</span>
        <span>Made for better conversations.</span>
      </div>
    </div>
  );
}
