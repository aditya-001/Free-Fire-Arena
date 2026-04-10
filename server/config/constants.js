const TOURNAMENT_STATUS = Object.freeze(["upcoming", "live", "completed"]);
const TOURNAMENT_MODES = Object.freeze(["BR", "CS"]);
const MATCH_STATUS = Object.freeze(["live", "completed"]);

const TOURNAMENT_DEFAULTS = Object.freeze({
  GAME: "Free Fire",
  MAX_PLAYERS: 50,
  LIVE_WINDOW_MINUTES: 120,
  MAX_QUERY_LIMIT: 100
});

const API_MESSAGES = Object.freeze({
  HEALTH_OK: "Server is healthy",
  REGISTER_SUCCESS: "Account created successfully",
  LOGIN_SUCCESS: "Login successful",
  ADMIN_REGISTER_SUCCESS: "Admin account created successfully",
  ADMIN_LOGIN_SUCCESS: "Admin login successful",
  AVAILABILITY_FETCHED: "Availability checked",
  TOURNAMENT_CREATED: "Tournament created successfully",
  TOURNAMENT_JOINED: "Tournament joined successfully",
  TOURNAMENTS_FETCHED: "Tournaments fetched successfully",
  LEADERBOARD_FETCHED: "Leaderboard fetched successfully",
  MATCH_LEADERBOARD_FETCHED: "Match leaderboard fetched successfully",
  MATCH_HISTORY_FETCHED: "Match history fetched successfully",
  PLAYER_LEADERBOARD_FETCHED: "Player leaderboard fetched successfully",
  TEAM_LEADERBOARD_FETCHED: "Team leaderboard fetched successfully",
  LIVE_MATCH_UPDATED: "Live match updated successfully",
  MATCH_COMPLETED: "Match completed successfully",
  WALLET_ORDER_CREATED: "Wallet order created successfully",
  WALLET_PAYMENT_VERIFIED: "Payment verified and wallet updated",
  WALLET_BALANCE_FETCHED: "Wallet balance fetched successfully",
  WALLET_WITHDRAW_REQUESTED: "Withdrawal request submitted",
  WALLET_HISTORY_FETCHED: "Wallet transactions fetched successfully",
  WITHDRAW_APPROVED: "Withdrawal approved successfully",
  WITHDRAW_REJECTED: "Withdrawal rejected and amount refunded",
  ADMIN_TRANSACTIONS_FETCHED: "Admin transactions fetched successfully",
  USER_FETCHED: "User profile fetched successfully",
  USER_UPDATED: "User profile updated successfully",
  PLAYERS_FETCHED: "Players fetched successfully",
  NOTIFICATIONS_FETCHED: "Notifications fetched successfully",
  NOTIFICATIONS_MARKED_READ: "Notifications marked as read",
  FOLLOW_UPDATED: "Follow state updated",
  MESSAGES_FETCHED: "Messages fetched successfully"
});

const RATE_LIMIT = Object.freeze({
  WINDOW_MS: 15 * 60 * 1000,
  MAX_REQUESTS: 300,
  AUTH_MAX_REQUESTS: 40,
  WALLET_MAX_REQUESTS: 120
});

module.exports = {
  TOURNAMENT_STATUS,
  TOURNAMENT_MODES,
  MATCH_STATUS,
  TOURNAMENT_DEFAULTS,
  API_MESSAGES,
  RATE_LIMIT
};
