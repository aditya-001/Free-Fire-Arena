import api from "../api/axiosInstance";

const userService = {
  getCurrentUser: () => api.get("/users/me"),
  updateProfile: (payload) =>
    api.put("/users/me", payload, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }),
  searchPlayers: (query) => api.get("/users/search", { params: { q: query } }),
  getUserById: (userId) => api.get(`/users/${userId}`),
  toggleFollow: (userId) => api.post(`/users/${userId}/follow`),
  getConversation: (userId) => api.get(`/messages/${userId}`),
  getNotifications: () => api.get("/users/me/notifications"),
  markNotificationsRead: () => api.patch("/users/me/notifications")
};

export default userService;
