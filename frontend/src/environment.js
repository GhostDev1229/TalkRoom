// Set REACT_APP_SERVER_URL in frontend/.env for a deployed backend.
// Local development defaults to the Express server on port 8000.
const server = (process.env.REACT_APP_SERVER_URL || "http://localhost:8000").replace(/\/$/, "");

export default server;
