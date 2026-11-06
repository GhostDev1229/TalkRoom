# TalkRoom

A full-stack video conferencing application built with React, Express, MongoDB, Socket.IO and WebRTC.

## Backend setup

1. Open a terminal in `backend`.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set your own `MONGO_URI`.
4. Start the API and Socket.IO server with `npm run dev`.

The backend requires Node.js 20.6+ because its scripts use Node's built-in `--env-file` option.

## Frontend setup

1. Open another terminal in `frontend`.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` if you need to configure the backend URL. The default is `http://localhost:8000`.
4. Start React with `npm start`.

## Important security steps

- Never commit `.env` files.
- Use your own MongoDB database credentials; do not reuse credentials that were previously embedded in source code.
- Rotate any MongoDB password that was included in an earlier version of this project.
- Set `CLIENT_ORIGIN` to your deployed frontend origin(s) before production deployment.
- Use HTTPS in production. Browsers generally require a secure context for camera, microphone and screen-sharing APIs.

## WebRTC note

The app uses the Google public STUN server for peer discovery. For reliable calls across restrictive NATs/firewalls, configure a TURN server in `frontend/src/pages/VideoMeet.jsx` under `peerConfigConnections.iceServers`.
