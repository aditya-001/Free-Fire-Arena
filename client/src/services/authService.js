import api from "../api/axiosInstance";

const authService = {
  login: (payload) => api.post("/auth/login", payload),
  register: (payload) => api.post("/auth/register", payload),
  checkAvailability: (payload) => api.post("/auth/check-availability", payload),
  adminLogin: (payload) => api.post("/auth/admin-login", payload),
  adminRegister: (payload) => api.post("/auth/admin-register", payload)
};

export default authService;
