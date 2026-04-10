import api from "../api/axiosInstance";

const tournamentService = {
  getTournaments: (params = {}) => api.get("/tournaments", { params }),
  getLiveTournaments: (params = {}) => api.get("/tournaments/live", { params }),
  getUpcomingTournaments: (params = {}) => api.get("/tournaments/upcoming", { params }),
  createTournament: (payload) => api.post("/tournaments", payload),
  joinTournament: (tournamentId) => api.post(`/tournaments/${tournamentId}/join`)
};

export default tournamentService;
