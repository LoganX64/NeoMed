import axios from "axios";
import { getSessionUser } from "../auth/session";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
});

API.interceptors.request.use((config) => {
  const user = getSessionUser();
  if (user?.id) {
    config.headers = config.headers || {};
    config.headers["x-user-id"] = String(user.id);
  }
  return config;
});

export default API;
