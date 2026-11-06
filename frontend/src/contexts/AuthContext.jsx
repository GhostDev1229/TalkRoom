import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: `${server}/api/v1/users`,
  timeout: 15000,
});

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState({});
  const navigate = useNavigate();

  const handleRegister = async (name, username, password) => {
    const response = await client.post("/register", {
      name: name.trim(),
      username: username.trim(),
      password,
    });
    if (response.status === httpStatus.CREATED) return response.data.message;
    throw new Error(response.data?.message || "Registration failed");
  };

  const handleLogin = async (username, password) => {
    const response = await client.post("/login", {
      username: username.trim(),
      password,
    });
    if (response.status === httpStatus.OK && response.data?.token) {
      localStorage.setItem("token", response.data.token);
      setUserData({ username: username.trim() });
      navigate("/home");
      return response.data;
    }
    throw new Error(response.data?.message || "Login failed");
  };

  const getHistoryOfUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Please log in to view your meeting history.");
    const response = await client.get("/get_all_activity", { params: { token } });
    return response.data;
  };

  const addToUserHistory = async (meetingCode) => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Please log in before joining a meeting.");
    const response = await client.post("/add_to_activity", {
      token,
      meeting_code: meetingCode,
    });
    return response.data;
  };

  const value = {
    userData,
    setUserData,
    addToUserHistory,
    getHistoryOfUser,
    handleRegister,
    handleLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
