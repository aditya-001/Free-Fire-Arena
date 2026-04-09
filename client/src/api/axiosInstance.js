import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ff_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const resolveAsset = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${SERVER_URL}${path}`;
};

export default api;
