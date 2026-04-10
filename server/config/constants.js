const TOURNAMENT_STATUS = Object.freeze(["upcoming", "live", "completed"]);
const TOURNAMENT_MODES = Object.freeze(["BR", "CS"]);
const MATCH_STATUS = Object.freeze(["pending", "live", "completed"]);

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
  ADMIN_DASHBOARD_FETCHED: "Admin dashboard fetched successfully",
  ADMIN_TOURNAMENT_UPDATED: "Tournament updated successfully",
  ADMIN_TOURNAMENT_TIME_UPDATED: "Tournament registration time updated successfully",
  ADMIN_TOURNAMENT_TIME_INCREASED: "Tournament registration time increased successfully",
  ADMIN_TOURNAMENT_STARTED: "Tournament started successfully",
  ADMIN_TOURNAMENT_REGISTRATION_CLOSED: "Tournament registration closed successfully",
  ADMIN_TOURNAMENT_REGISTRATION_OPENED: "Tournament registration opened successfully",
  ADMIN_TOURNAMENT_REGISTRATIONS_FETCHED: "Tournament registrations fetched successfully",
  ADMIN_TOURNAMENT_REGISTRATION_REVIEWED: "Tournament registration reviewed successfully",
  ADMIN_TOURNAMENT_MATCH_ASSIGNED: "Tournament match assigned successfully",
  ADMIN_TOURNAMENT_DELETED: "Tournament deleted successfully",
  ADMIN_TOURNAMENTS_FETCHED: "Admin tournaments fetched successfully",
  ADMIN_MATCH_CREATED: "Match created successfully",
  ADMIN_MATCH_FETCHED: "Match fetched successfully",
  ADMIN_MATCH_ROOM_UPDATED: "Match room details saved successfully",
  ADMIN_MATCHES_FETCHED: "Admin matches fetched successfully",
  ADMIN_TEAM_REGISTERED: "Team registered successfully",
  ADMIN_TEAMS_FETCHED: "Teams fetched successfully",
  ADMIN_MATCH_QUALIFIED_TEAMS_SAVED: "Qualified teams saved successfully",
  ADMIN_MATCH_RESULT_UPDATED: "Match result updated successfully",
  ADMIN_MATCH_RESULT_EDITED: "Match result edited successfully",
  ADMIN_BRACKET_FETCHED: "Tournament bracket fetched successfully",
  ADMIN_BRACKET_CREATED: "Tournament bracket created successfully",
  ADMIN_BRACKET_RESULT_SAVED: "Bracket result saved successfully",
  ADMIN_USERS_FETCHED: "Admin users fetched successfully",
  ADMIN_USER_BAN_UPDATED: "User moderation status updated",
  ADMIN_WITHDRAW_DECISION_SAVED: "Withdrawal decision saved",
  AVAILABILITY_FETCHED: "Availability checked",
  TOURNAMENT_CREATED: "Tournament created successfully",
  TOURNAMENT_REGISTERED: "Tournament registration saved successfully",
  TOURNAMENT_PAYMENT_ORDER_CREATED: "Tournament payment order created successfully",
  TOURNAMENT_PAYMENT_VERIFIED: "Tournament payment verified and slot booked successfully",
  TOURNAMENT_JOINED: "Tournament joined successfully",
  TOURNAMENTS_FETCHED: "Tournaments fetched successfully",
  TOURNAMENT_DETAILS_FETCHED: "Tournament details fetched successfully",
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
