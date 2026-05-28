import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api" 
    : "/api");

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Token attach
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Response interceptor to handle 401 errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't redirect if we are already on the login page or the request is for login
      const isLoginRequest = error.config.url.includes("/auth/login");
      const isLoginPage = window.location.pathname === "/";

      if (!isLoginRequest && !isLoginPage) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("name");
        localStorage.removeItem("permissions");
        localStorage.removeItem("rolePermissions");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
