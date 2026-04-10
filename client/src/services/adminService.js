import api from "../api/axiosInstance";

const adminService = {
  login: (payload) => api.post("/admin/login", payload),
  getDashboard: () => api.get("/admin/dashboard"),

  createTournament: (payload) => api.post("/admin/tournament/create", payload),
  getTournaments: (params = {}) => api.get("/admin/tournaments", { params }),
  updateTournament: (id, payload) => api.put(`/admin/tournament/${id}`, payload),
  deleteTournament: (id) => api.delete(`/admin/tournament/${id}`),

  registerTeam: (payload) => api.post("/admin/team/register", payload),
  getTeams: (params = {}) => api.get("/admin/teams", { params }),

  createMatch: (payload) => api.post("/admin/match/create", payload),
  saveQualifiedTeams: (payload) => api.post("/admin/match/qualified-teams", payload),
  getMatch: (id) => api.get(`/admin/match/${id}`),
  getMatches: (params = {}) => api.get("/admin/matches", { params }),
  addRoomDetails: (payload) => api.post("/admin/match/add-room", payload),
  updateMatch: (payload) => api.post("/admin/match/update", payload),
  editMatch: (id, payload) => api.put(`/admin/match/edit/${id}`, payload),
  endMatch: (payload) => api.post("/admin/match/end", payload),

  getUsers: (params = {}) => api.get("/admin/users", { params }),
  banUser: (payload) => api.put("/admin/user/ban", payload),

  getTransactions: (params = {}) => api.get("/admin/transactions", { params }),
  approveWithdraw: (payload) => api.post("/admin/withdraw/approve", payload)
};

export default adminService;
