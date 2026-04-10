import api from "../api/axiosInstance";

const tournamentService = {
  getTournaments: (params = {}) => api.get("/tournaments", { params }),
  getLiveTournaments: (params = {}) => api.get("/tournaments/live", { params }),
  getUpcomingTournaments: (params = {}) => api.get("/tournaments/upcoming", { params }),
  getTournamentDetails: (tournamentId) => api.get(`/tournaments/${tournamentId}`),
  createTournament: (payload) => api.post("/tournaments", payload),
  joinTournament: (tournamentId) => api.post(`/tournaments/${tournamentId}/join`),
  registerTournament: (formData) =>
    api.post("/tournament/register", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }),
  createTournamentPaymentOrder: (payload) => api.post("/tournament/payment/create-order", payload),
  verifyTournamentPayment: (payload) => api.post("/tournament/payment/verify", payload)
};

export default tournamentService;
