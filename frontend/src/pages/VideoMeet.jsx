import React, { useCallback, useEffect, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import io from "socket.io-client";

import { Badge, IconButton, TextField, Button, Tooltip } from "@mui/material";

import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GroupsIcon from "@mui/icons-material/Groups";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import LockIcon from "@mui/icons-material/Lock";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";

import styles from "../styles/videoComponent.module.css";
import server from "../environment";

const peerConfigConnections = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VideoMeetComponent() {
  const navigate = useNavigate();
  const { url: meetingCode } = useParams();

  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const lobbyVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const messagesEndRef = useRef(null);

  const peersRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const makingOfferRef = useRef({});
  const isLeavingRef = useRef(false);
  const isJoiningRef = useRef(false);

  const [username, setUsername] = useState("");
  const [askForUsername, setAskForUsername] = useState(true);

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const [screenSharing, setScreenSharing] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);

  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  // Detect screen-sharing support.
  useEffect(() => {
    setScreenAvailable(Boolean(navigator.mediaDevices?.getDisplayMedia));
  }, []);

  // Lobby camera preview.
  useEffect(() => {
    if (!askForUsername || !lobbyVideoRef.current) return;

    const stream = localStreamRef.current;

    if (!stream) return;

    lobbyVideoRef.current.srcObject = stream;

    lobbyVideoRef.current.play().catch((err) => {
      console.warn("Lobby video playback error:", err);
    });
  }, [askForUsername]);

  // Attach local camera or screen-sharing stream.
  useEffect(() => {
    if (askForUsername) return;

    const videoElement = localVideoRef.current;
    const stream = screenStreamRef.current || localStreamRef.current;

    if (!videoElement || !stream) {
      console.error("Local video element or stream is missing.");
      return;
    }

    videoElement.srcObject = stream;

    videoElement.onloadedmetadata = () => {
      videoElement.play().catch((err) => {
        console.error("Local video playback error:", err);
      });
    };

    console.log("Local video attached:", stream);

    return () => {
      videoElement.onloadedmetadata = null;
    };
  }, [askForUsername, screenSharing]);

  // Scroll to newest chat message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, chatOpen]);

  // Update remote participant video.
  const updateRemoteVideo = useCallback((socketId, stream) => {
    setVideos((current) => {
      const existing = current.find((item) => item.socketId === socketId);

      if (existing) {
        return current.map((item) =>
          item.socketId === socketId ? { ...item, stream } : item,
        );
      }

      return [...current, { socketId, stream }];
    });
  }, []);

  // Send WebRTC signal.
  const sendSignal = useCallback((socketId, payload) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("signal", socketId, payload);
    } else {
      console.warn("Cannot send WebRTC signal: socket is disconnected.");
    }
  }, []);

  // Remove a participant.
  const removePeer = useCallback((socketId) => {
    peersRef.current[socketId]?.close();

    delete peersRef.current[socketId];
    delete pendingCandidatesRef.current[socketId];
    delete makingOfferRef.current[socketId];

    setVideos((current) =>
      current.filter((item) => item.socketId !== socketId),
    );
  }, []);

  // Create WebRTC peer connection.
  const createPeerConnection = useCallback(
    (socketId, shouldInitiate = false) => {
      if (!socketId || socketId === socketRef.current?.id) {
        return null;
      }

      if (peersRef.current[socketId]) {
        return peersRef.current[socketId];
      }

      console.log(
        shouldInitiate
          ? "Creating initiating peer connection:"
          : "Creating receiving peer connection:",
        socketId,
      );

      const peer = new RTCPeerConnection(peerConfigConnections);

      peersRef.current[socketId] = peer;
      pendingCandidatesRef.current[socketId] = [];
      makingOfferRef.current[socketId] = false;

      // Add local audio tracks.
      const audioTracks = localStreamRef.current?.getAudioTracks() || [];

      audioTracks.forEach((track) => {
        peer.addTrack(track, localStreamRef.current);
      });

      // Add local video or screen-sharing track.
      const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];

      if (screenTrack) {
        peer.addTrack(screenTrack, screenStreamRef.current);
      } else if (cameraTrack) {
        peer.addTrack(cameraTrack, localStreamRef.current);
      }

      // ICE candidate handling.
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(socketId, {
            ice: event.candidate,
          });
        }
      };

      // Only the newly joined participant initiates negotiation.
      peer.onnegotiationneeded = async () => {
        if (!shouldInitiate) {
          console.log("Waiting for incoming offer from:", socketId);
          return;
        }

        if (
          makingOfferRef.current[socketId] ||
          peer.signalingState !== "stable"
        ) {
          return;
        }

        try {
          makingOfferRef.current[socketId] = true;

          console.log("Creating WebRTC offer for:", socketId);

          const offer = await peer.createOffer();

          if (peer.signalingState !== "stable") return;

          await peer.setLocalDescription(offer);

          sendSignal(socketId, {
            sdp: peer.localDescription,
          });
        } catch (err) {
          console.error("Negotiation error:", err);
        } finally {
          makingOfferRef.current[socketId] = false;
        }
      };

      // Receive remote audio and video.
      peer.ontrack = (event) => {
        console.log("Remote track received:", socketId, event.track.kind);

        let remoteStream = event.streams?.[0];

        // Combine tracks when the browser does not provide a stream.
        if (!remoteStream) {
          const existing = videos.find((item) => item.socketId === socketId);

          remoteStream = existing?.stream || new MediaStream();
          remoteStream.addTrack(event.track);
        }

        updateRemoteVideo(socketId, remoteStream);
      };

      // Connection state.
      peer.onconnectionstatechange = () => {
        console.log("Peer connection:", socketId, peer.connectionState);

        if (
          peer.connectionState === "failed" ||
          peer.connectionState === "closed"
        ) {
          removePeer(socketId);
        }
      };

      peer.oniceconnectionstatechange = () => {
        console.log("ICE connection:", socketId, peer.iceConnectionState);
      };

      return peer;
    },
    [sendSignal, updateRemoteVideo, removePeer, videos],
  );

  // Handle SDP and ICE signals.
  const handleSignal = useCallback(
    async (fromId, payload) => {
      try {
        const signal =
          typeof payload === "string" ? JSON.parse(payload) : payload;

        const peer = createPeerConnection(fromId, false);

        if (!peer) return;

        if (signal.sdp) {
          const description = new RTCSessionDescription(signal.sdp);

          await peer.setRemoteDescription(description);

          const queuedCandidates = pendingCandidatesRef.current[fromId] || [];

          for (const candidate of queuedCandidates) {
            try {
              await peer.addIceCandidate(candidate);
            } catch (err) {
              console.warn("Queued ICE candidate error:", err);
            }
          }

          pendingCandidatesRef.current[fromId] = [];

          if (description.type === "offer") {
            console.log("Received offer from:", fromId);

            const answer = await peer.createAnswer();

            await peer.setLocalDescription(answer);

            sendSignal(fromId, {
              sdp: peer.localDescription,
            });

            console.log("Answer sent to:", fromId);
          }
        }

        if (signal.ice) {
          const candidate = new RTCIceCandidate(signal.ice);

          if (peer.remoteDescription) {
            await peer.addIceCandidate(candidate);
          } else {
            pendingCandidatesRef.current[fromId].push(candidate);
          }
        }
      } catch (err) {
        console.error("Signaling error:", err);
      }
    },
    [createPeerConnection, sendSignal],
  );

  // Chat messages.
  const addMessage = useCallback((data, sender, socketIdSender) => {
    setMessages((current) => [...current, { sender, data }]);

    if (socketIdSender !== socketRef.current?.id) {
      setNewMessages((count) => count + 1);
    }
  }, []);

  // Connect to Socket.IO server.
  const connectToSocketServer = useCallback(() => {
    if (socketRef.current) return;

    const socket = io(server, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to TalkRoom:", socket.id);

      socket.emit("join-call", meetingCode);
    });

    // Existing participants are sent to the newly joined user.
    socket.on("all-users", (users) => {
      console.log("Existing participants:", users);

      const uniqueUsers = [...new Set(users || [])];

      uniqueUsers.forEach((socketId) => {
        if (socketId !== socket.id) {
          // New participant initiates the connection.
          createPeerConnection(socketId, true);
        }
      });
    });

    // Existing participants receive notification of the newcomer.
    socket.on("user-joined", (socketId) => {
      console.log("New participant joined:", socketId);

      if (socketId !== socket.id) {
        // Existing participant waits for the incoming offer.
        createPeerConnection(socketId, false);
      }
    });

    socket.on("signal", handleSignal);

    socket.on("chat-message", addMessage);

    socket.on("user-left", (socketId) => {
      console.log("Participant left:", socketId);
      removePeer(socketId);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setError("Unable to connect to meeting server.");
    });
  }, [meetingCode, createPeerConnection, handleSignal, addMessage, removePeer]);

  // Join meeting and initialize camera.
  const connect = async () => {
    console.log("STEP 1: Join button clicked");

    if (isJoiningRef.current || socketRef.current) {
      console.log("JOIN BLOCKED:", {
        isJoining: isJoiningRef.current,
        socketExists: Boolean(socketRef.current),
        isLeaving: isLeavingRef.current,
      });
      return;
    }

    isLeavingRef.current = false;

    if (!username.trim()) {
      setError("Please enter your name.");
      return;
    }

    isJoiningRef.current = true;
    setJoining(true);
    setError("");

    try {
      console.log("STEP 2: Checking camera availability");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia is unavailable. Check localhost/HTTPS.");
      }

      console.log("STEP 3: Requesting camera and microphone");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("STEP 4: Camera permission granted");
      console.log("STREAM:", stream);
      console.log("VIDEO TRACKS:", stream.getVideoTracks());
      console.log("AUDIO TRACKS:", stream.getAudioTracks());

      if (!stream.getVideoTracks().length) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Camera opened but no video track was returned.");
      }

      localStreamRef.current = stream;

      setVideoEnabled(true);
      setAudioEnabled(true);

      console.log("STEP 5: Changing lobby to meeting screen");

      setAskForUsername(false);

      console.log("STEP 6: Connecting to Socket.IO");

      connectToSocketServer();
    } catch (err) {
      console.error("JOIN FAILED:", err);
      console.error("ERROR NAME:", err.name);
      console.error("ERROR MESSAGE:", err.message);

      setError(err.message || "Unable to join meeting.");
    } finally {
      isJoiningRef.current = false;
      setJoining(false);
    }
  };

  // Toggle camera.
  const handleVideo = () => {
    const nextValue = !videoEnabled;

    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = nextValue;
    });

    setVideoEnabled(nextValue);
  };

  // Toggle microphone.
  const handleAudio = () => {
    const nextValue = !audioEnabled;

    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = nextValue;
    });

    setAudioEnabled(nextValue);
  };

  // Stop screen sharing and restore camera.
  const stopScreenShare = useCallback(() => {
    const screenStream = screenStreamRef.current;

    if (!screenStream) return;

    screenStream.getTracks().forEach((track) => {
      track.stop();
    });

    screenStreamRef.current = null;

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;

    Object.values(peersRef.current).forEach((peer) => {
      const sender = peer
        .getSenders()
        .find((item) => item.track?.kind === "video");

      if (sender) {
        sender.replaceTrack(cameraTrack).catch((err) => {
          console.error("Camera restoration error:", err);
        });
      }
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;

      localVideoRef.current.play().catch((err) => {
        console.error("Camera playback error:", err);
      });
    }

    setScreenSharing(false);
  }, []);

  // Screen sharing.
  const handleScreen = async () => {
    if (!screenAvailable) return;

    if (screenSharing) {
      stopScreenShare();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      screenStreamRef.current = stream;

      const screenTrack = stream.getVideoTracks()[0];

      Object.values(peersRef.current).forEach((peer) => {
        const sender = peer
          .getSenders()
          .find((item) => item.track?.kind === "video");

        if (sender) {
          sender.replaceTrack(screenTrack).catch((err) => {
            console.error("Screen track replacement error:", err);
          });
        } else {
          peer.addTrack(screenTrack, stream);
        }
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;

        localVideoRef.current.play().catch((err) => {
          console.error("Screen playback error:", err);
        });
      }

      screenTrack.onended = () => {
        stopScreenShare();
      };

      setScreenSharing(true);
    } catch (err) {
      console.error("Screen sharing error:", err);

      if (err.name !== "NotAllowedError") {
        setError("Unable to start screen sharing.");
      }
    }
  };

  // Cleanup meeting resources.
  const cleanupMeeting = useCallback((markLeaving = true) => {
    if (markLeaving) {
      if (isLeavingRef.current) return;

      isLeavingRef.current = true;
    }

    console.log(
      markLeaving
        ? "Leaving meeting and cleaning resources..."
        : "React cleanup: releasing meeting resources...",
    );

    socketRef.current?.disconnect();
    socketRef.current = null;

    Object.values(peersRef.current).forEach((peer) => {
      peer.close();
    });

    peersRef.current = {};
    pendingCandidatesRef.current = {};
    makingOfferRef.current = {};

    localStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    screenStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    localStreamRef.current = null;
    screenStreamRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (lobbyVideoRef.current) {
      lobbyVideoRef.current.srcObject = null;
    }

    if (markLeaving) {
      setVideos([]);
    }
  }, []);

  // Leave meeting.
  const handleEndCall = () => {
    cleanupMeeting(true);
    navigate("/", { replace: true });
  };

  // Send chat message.
  const sendMessage = (event) => {
    event.preventDefault();

    const text = message.trim();

    if (!text || !socketRef.current?.connected) return;

    socketRef.current.emit("chat-message", text, username.trim());

    setMessage("");
  };

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      cleanupMeeting(false);
    };
  }, [cleanupMeeting]);

  return (
    <div className={styles.appShell}>
      {askForUsername ? (
        <main className={styles.lobbyPage}>
          <header className={styles.lobbyTopbar}>
            <button
              className={styles.backButton}
              onClick={() => navigate("/home")}
              type="button"
            >
              <ArrowBackIcon />
              <span>Back to home</span>
            </button>

            <div className={styles.brand}>
              <span className={styles.brandMark}>
                <VideoCallIcon />
              </span>
              <span>TalkRoom</span>
            </div>

            <span className={styles.secureLabel}>
              <LockIcon />
              Secure meeting
            </span>
          </header>

          <section className={styles.lobbyContent}>
            <div className={styles.lobbyInfo}>
              <span className={styles.eyebrow}>
                <span className={styles.statusDot} />
                YOUR MEETING IS READY
              </span>

              <h1>
                Your space to
                <span> connect.</span>
              </h1>

              <p className={styles.lobbyDescription}>
                Get ready to meet, share ideas and connect with people wherever
                they are.
              </p>

              <div className={styles.meetingCodeCard}>
                <div>
                  <span className={styles.mutedLabel}>MEETING CODE</span>
                  <strong>{meetingCode}</strong>
                </div>
                <LockIcon />
              </div>

              <div className={styles.nameField}>
                <label htmlFor="username">Your display name</label>

                <TextField
                  id="username"
                  className={styles.nameInput}
                  fullWidth
                  placeholder="Enter your name"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") connect();
                  }}
                  size="medium"
                  autoComplete="name"
                  sx={{
                    "& .MuiInputBase-root": {
                      color: "#ffffff",
                    },
                    "& .MuiInputBase-input": {
                      color: "#ffffff",
                      WebkitTextFillColor: "#ffffff",
                      caretColor: "#b69aff",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      color: "#b8b4ca",
                      WebkitTextFillColor: "#b8b4ca",
                      opacity: 1,
                    },
                  }}
                />
              </div>

              <Button
                className={styles.joinButton}
                variant="contained"
                fullWidth
                onClick={connect}
                disabled={joining}
              >
                {joining ? "Connecting..." : "Join meeting"}
                {!joining && <VideoCallIcon />}
              </Button>

              {error && (
                <p className={styles.lobbyError} role="alert">
                  {error}
                </p>
              )}

              <p className={styles.privacyNote}>
                <LockIcon />
                Your meeting is private and secure.
              </p>
            </div>

            <div className={styles.previewArea}>
              <div className={styles.previewGlow} />

              <div className={styles.previewCard}>
                <div className={styles.previewHeader}>
                  <div>
                    <span className={styles.previewLiveDot} />
                    <span>Camera preview</span>
                  </div>
                  <span className={styles.previewTag}>YOU</span>
                </div>

                <div className={styles.previewVideoWrapper}>
                  <video ref={lobbyVideoRef} autoPlay muted playsInline />

                  <div className={styles.previewPlaceholder}>
                    <div className={styles.previewPlaceholderIcon}>
                      <VideocamIcon />
                    </div>
                    <strong>Ready when you are</strong>
                    <span>Your camera will activate after you join.</span>
                  </div>
                </div>

                <div className={styles.previewFooter}>
                  <span>
                    <VideocamIcon />
                    Camera
                  </span>
                  <span>
                    <MicIcon />
                    Microphone
                  </span>
                  <span>
                    <SignalCellularAltIcon />
                    Ready to connect
                  </span>
                </div>
              </div>

              <div className={styles.floatingNote}>
                <AutoAwesomeIcon />
                <div>
                  <strong>Better together</strong>
                  <span>Connect from anywhere</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className={styles.meetVideoContainer}>
          <header className={styles.meetingHeader}>
            <div className={styles.brand}>
              <span className={styles.brandMark}>
                <VideoCallIcon />
              </span>
              <span>TalkRoom</span>
            </div>

            <div className={styles.meetingDetails}>
              <span className={styles.meetingLiveDot} />
              <span>Live meeting</span>
              <span className={styles.meetingDivider} />
              <span className={styles.meetingCodeText}>{meetingCode}</span>
            </div>

            <div className={styles.participantCount}>
              <GroupsIcon />
              <span>{videos.length + 1}</span>
              <span className={styles.participantText}>Participants</span>
            </div>
          </header>

          <section
            className={`${styles.meetingWorkspace} ${
              chatOpen ? styles.chatIsOpen : ""
            }`}
          >
            <div className={styles.videoStage}>
              <div className={styles.stageHeading}>
                <div>
                  <span className={styles.stageEyebrow}>
                    <span className={styles.statusDot} />
                    YOUR SESSION
                  </span>
                  <h2>Meeting room</h2>
                  <p>You're connected and ready to collaborate.</p>
                </div>

                <span className={styles.stageParticipantCount}>
                  <GroupsIcon />
                  {videos.length + 1} in call
                </span>
              </div>

              <div
                className={`${styles.conferenceView} ${
                  videos.length === 0 ? styles.singleParticipant : ""
                }`}
              >
                <div className={styles.videoTile}>
                  <video
                    className={styles.meetUserVideo}
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                  />

                  {!videoEnabled && !screenSharing && (
                    <div className={styles.videoOffOverlay}>
                      <div className={styles.avatarCircle}>
                        {username.trim().charAt(0).toUpperCase()}
                      </div>
                      <span>Camera is off</span>
                    </div>
                  )}

                  <div className={styles.videoNameTag}>
                    <span className={styles.nameStatusDot} />
                    {username || "You"} (You)
                  </div>

                  {screenSharing && (
                    <span className={styles.sharingTag}>
                      <ScreenShareIcon />
                      Presenting
                    </span>
                  )}

                  <span className={styles.localBadge}>YOU</span>
                </div>

                {videos.map((item, index) => (
                  <div className={styles.videoTile} key={item.socketId}>
                    <video
                      className={styles.remoteVideo}
                      ref={(element) => {
                        if (
                          element &&
                          item.stream &&
                          element.srcObject !== item.stream
                        ) {
                          element.srcObject = item.stream;

                          element.play().catch((err) => {
                            console.warn("Remote video playback error:", err);
                          });
                        }
                      }}
                      autoPlay
                      playsInline
                    />

                    <div className={styles.videoNameTag}>
                      <span className={styles.nameStatusDot} />
                      Participant {index + 1}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className={styles.meetingError} role="alert">
                  <span>{error}</span>
                  <button
                    onClick={() => setError("")}
                    type="button"
                    aria-label="Dismiss error"
                  >
                    <CloseIcon />
                  </button>
                </div>
              )}

              <div className={styles.meetingControls}>
                <div className={styles.controlGroup}>
                  <div className={styles.controlItem}>
                    <Tooltip
                      title={
                        audioEnabled ? "Mute microphone" : "Unmute microphone"
                      }
                    >
                      <IconButton
                        className={`${styles.controlButton} ${
                          !audioEnabled ? styles.controlDisabled : ""
                        }`}
                        aria-label="Toggle microphone"
                        onClick={handleAudio}
                      >
                        {audioEnabled ? <MicIcon /> : <MicOffIcon />}
                      </IconButton>
                    </Tooltip>
                    <span>{audioEnabled ? "Mute" : "Unmute"}</span>
                  </div>

                  <div className={styles.controlItem}>
                    <Tooltip
                      title={
                        videoEnabled ? "Turn camera off" : "Turn camera on"
                      }
                    >
                      <IconButton
                        className={`${styles.controlButton} ${
                          !videoEnabled ? styles.controlDisabled : ""
                        }`}
                        aria-label="Toggle camera"
                        onClick={handleVideo}
                      >
                        {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                      </IconButton>
                    </Tooltip>
                    <span>{videoEnabled ? "Camera" : "Camera off"}</span>
                  </div>

                  {screenAvailable && (
                    <div className={styles.controlItem}>
                      <Tooltip
                        title={screenSharing ? "Stop sharing" : "Share screen"}
                      >
                        <IconButton
                          className={`${styles.controlButton} ${
                            screenSharing ? styles.controlActive : ""
                          }`}
                          aria-label="Toggle screen sharing"
                          onClick={handleScreen}
                        >
                          {screenSharing ? (
                            <StopScreenShareIcon />
                          ) : (
                            <ScreenShareIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                      <span>{screenSharing ? "Stop sharing" : "Share"}</span>
                    </div>
                  )}

                  <div className={styles.controlItem}>
                    <Badge badgeContent={newMessages} max={999} color="warning">
                      <IconButton
                        className={`${styles.controlButton} ${
                          chatOpen ? styles.controlActive : ""
                        }`}
                        aria-label="Toggle chat"
                        onClick={() => {
                          setChatOpen((open) => !open);
                          setNewMessages(0);
                        }}
                      >
                        <ChatIcon />
                      </IconButton>
                    </Badge>
                    <span>Chat</span>
                  </div>
                </div>

                <div className={styles.controlSeparator} />

                <div className={styles.controlItem}>
                  <Tooltip title="Leave meeting">
                    <IconButton
                      className={styles.endCallButton}
                      aria-label="End call"
                      onClick={handleEndCall}
                    >
                      <CallEndIcon />
                    </IconButton>
                  </Tooltip>
                  <span>Leave</span>
                </div>
              </div>
            </div>

            {chatOpen && (
              <aside className={styles.chatRoom}>
                <div className={styles.chatHeader}>
                  <div className={styles.chatTitle}>
                    <div className={styles.chatIcon}>
                      <ChatIcon />
                    </div>
                    <div>
                      <h2>Live chat</h2>
                      <span>{messages.length} messages</span>
                    </div>
                  </div>

                  <IconButton
                    className={styles.closeChatButton}
                    aria-label="Close chat"
                    onClick={() => setChatOpen(false)}
                  >
                    <CloseIcon />
                  </IconButton>
                </div>

                <div className={styles.chattingDisplay}>
                  {messages.length > 0 ? (
                    messages.map((item, index) => {
                      const isOwnMessage = item.sender === username.trim();

                      return (
                        <div
                          className={`${styles.message} ${
                            isOwnMessage ? styles.ownMessage : ""
                          }`}
                          key={`${index}-${item.sender}`}
                        >
                          <span className={styles.messageSender}>
                            {isOwnMessage ? "You" : item.sender}
                          </span>

                          <div className={styles.messageBubble}>
                            <p>{item.data}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.emptyChat}>
                      <div className={styles.emptyChatIcon}>
                        <ChatIcon />
                      </div>
                      <h3>Start a conversation</h3>
                      <p>Send a message to everyone in this meeting.</p>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <form className={styles.chattingArea} onSubmit={sendMessage}>
                  <TextField
                    className={styles.chatInput}
                    fullWidth
                    size="small"
                    placeholder="Write a message..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    autoComplete="off"
                    inputProps={{
                      "aria-label": "Chat message",
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        color: "#ffffff",
                      },
                      "& .MuiInputBase-input": {
                        color: "#ffffff",
                        WebkitTextFillColor: "#ffffff",
                        caretColor: "#b69aff",
                      },
                      "& .MuiInputBase-input::placeholder": {
                        color: "#b8b4ca",
                        WebkitTextFillColor: "#b8b4ca",
                        opacity: 1,
                      },
                    }}
                  />

                  <Button
                    className={styles.sendButton}
                    type="submit"
                    variant="contained"
                    disabled={!message.trim()}
                    aria-label="Send message"
                  >
                    <SendIcon />
                  </Button>
                </form>

                <p className={styles.chatFooter}>
                  Messages are shared with everyone in this meeting.
                </p>
              </aside>
            )}
          </section>
        </main>
      )}
    </div>
  );
}
