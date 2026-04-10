const mongoose = require("mongoose");
const Match = require("../models/Match");
const Team = require("../models/Team");
const Tournament = require("../models/Tournament");
const AppError = require("../utils/AppError");

const BRACKET_SIZE = 8;
const ROUND_DEFINITIONS = Object.freeze([
  {
    key: "quarterfinal",
    label: "Quarter Final",
    shortLabel: "QF",
    order: 1,
    matchCount: 4,
    offsetMinutes: 0
  },
  {
    key: "semifinal",
    label: "Semi Final",
    shortLabel: "SF",
    order: 2,
    matchCount: 2,
    offsetMinutes: 45
  },
  {
    key: "final",
    label: "Final",
    shortLabel: "Final",
    order: 3,
    matchCount: 1,
    offsetMinutes: 90
  }
]);

const toObjectId = (value, fieldName) => {
  if (!value) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (typeof value === "object" && value._id) {
    return toObjectId(value._id, fieldName);
  }

  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  throw new AppError(`${fieldName} is invalid`, 400);
};

const normalizeObjectIdArray = (values = [], fieldName) => {
  if (!Array.isArray(values)) {
    throw new AppError(`${fieldName} must be an array`, 400);
  }

  const seen = new Set();
  const normalized = [];

  values.forEach((value) => {
    const objectId = toObjectId(value, fieldName);
    const key = String(objectId);

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push(objectId);
  });

  return normalized;
};

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

const shuffleArray = (values = []) => {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
  }

  return copy;
};

const createMatchLabel = (roundKey, matchOrder) => {
  const round = ROUND_DEFINITIONS.find((entry) => entry.key === roundKey);

  if (!round) {
    return `Match ${matchOrder}`;
  }

  return round.shortLabel === "Final" ? round.label : `${round.shortLabel} ${matchOrder}`;
};

const summarizeTeam = (team) => {
  if (!team) return null;

  return {
    _id: team._id || team,
    teamId: team.teamId || null,
    teamName: team.name || team.teamName || null
  };
};

const sortBracketSlots = (slots = []) =>
  [...(Array.isArray(slots) ? slots : [])].sort(
    (left, right) => Number(left.slotNumber || 0) - Number(right.slotNumber || 0)
  );

const buildParticipantsFromTeams = (teams = []) => {
  const participantSet = new Set();

  teams.forEach((team) => {
    (team?.players || []).forEach((playerId) => {
      participantSet.add(String(playerId));
    });
  });

  return [...participantSet].map((playerId) => new mongoose.Types.ObjectId(playerId));
};

const populateBracketMatches = (query) =>
  query
    .populate("selectedTeams", "teamId name players")
    .populate("qualifiedTeams", "teamId name")
    .populate("bracket.participantSlots.teamId", "teamId name")
    .populate(
      "bracket.participantSlots.sourceMatchId",
      "_id matchNumber bracket.round bracket.roundLabel bracket.matchOrder"
    )
    .populate("bracket.winnerTeamId", "teamId name");

const fetchBracketMatches = async (tournamentId) => {
  const normalizedTournamentId = toObjectId(tournamentId, "tournamentId");

  const matches = await populateBracketMatches(
    Match.find({
      tournamentId: normalizedTournamentId,
      "bracket.enabled": true
    }).sort({
      "bracket.roundOrder": 1,
      "bracket.matchOrder": 1,
      matchNumber: 1
    })
  ).lean();

  return matches;
};

const serializeBracketMatch = (match) => {
  const bracket = match?.bracket || {};
  const slots = sortBracketSlots(bracket.participantSlots).map((slot) => ({
    slotNumber: Number(slot.slotNumber || 0),
    sourceMatchId: slot.sourceMatchId?._id || slot.sourceMatchId || null,
    sourceMatchLabel:
      slot.sourceMatchId?.bracket?.round && slot.sourceMatchId?.bracket?.matchOrder
        ? createMatchLabel(slot.sourceMatchId.bracket.round, slot.sourceMatchId.bracket.matchOrder)
        : null,
    teamId: slot.teamId?._id || slot.teamId || null,
    team: slot.teamId ? summarizeTeam(slot.teamId) : null
  }));

  const readyTeams = slots.filter((slot) => slot.teamId);
  const winnerTeam = bracket.winnerTeamId ? summarizeTeam(bracket.winnerTeamId) : null;

  return {
    _id: match._id,
    matchNumber: Number(match.matchNumber || 0),
    matchLabel: createMatchLabel(bracket.round, bracket.matchOrder),
    round: bracket.round || null,
    roundLabel: bracket.roundLabel || null,
    roundOrder: Number(bracket.roundOrder || 0),
    matchOrder: Number(bracket.matchOrder || 0),
    status: match.status,
    ready: readyTeams.length === 2,
    completed: match.status === "completed",
    canReportWinner: readyTeams.length === 2 && match.status !== "completed",
    winnerTeamId: winnerTeam?._id || null,
    winnerTeam,
    nextMatchId: bracket.nextMatchId || null,
    nextMatchSlot: Number(bracket.nextMatchSlot || 0) || null,
    teams: slots
  };
};

const serializeBracket = (matches = []) => {
  const serializedMatches = matches.map(serializeBracketMatch);
  const rounds = ROUND_DEFINITIONS.map((round) => ({
    key: round.key,
    label: round.label,
    order: round.order,
    matches: serializedMatches.filter((match) => match.round === round.key)
  })).filter((round) => round.matches.length);

  const finalMatch = serializedMatches.find((match) => match.round === "final");

  return {
    enabled: Boolean(serializedMatches.length),
    size: BRACKET_SIZE,
    totalMatches: serializedMatches.length,
    completedMatches: serializedMatches.filter((match) => match.completed).length,
    champion: finalMatch?.winnerTeam || null,
    rounds
  };
};

const syncMatchTeamsFromBracketSlots = async (match) => {
  const slots = sortBracketSlots(match?.bracket?.participantSlots);
  const teamIds = slots
    .map((slot) => slot.teamId)
    .filter(Boolean)
    .map((teamId) => toObjectId(teamId, "teamId"));

  match.selectedTeams = teamIds;
  match.qualifiedTeams = [];
  match.results = [];
  match.isLocked = false;
  match.lockedAt = null;
  match.bracket.winnerTeamId = null;

  if (!teamIds.length) {
    match.participants = [];
    match.status = "pending";
    return;
  }

  const teams = await Team.find({ _id: { $in: teamIds } }).select("_id players").lean();
  match.participants = buildParticipantsFromTeams(teams);
  match.status = teamIds.length === 2 ? "live" : "pending";
};

const assertTournamentExists = async (tournamentId) => {
  const normalizedTournamentId = toObjectId(tournamentId, "tournamentId");
  const tournament = await Tournament.findById(normalizedTournamentId)
    .select("_id title mode startTime dateTime status")
    .lean();

  if (!tournament) {
    throw new AppError("Tournament not found", 404);
  }

  return tournament;
};

const assertCsTournament = async (tournamentId) => {
  const tournament = await assertTournamentExists(tournamentId);

  if (String(tournament.mode || "").toUpperCase() !== "CS") {
    throw new AppError("Bracket system is only available for CS tournaments", 400);
  }

  return tournament;
};

const getTournamentBracket = async (tournamentId) => {
  await assertTournamentExists(tournamentId);
  const matches = await fetchBracketMatches(tournamentId);
  return serializeBracket(matches);
};

const createTournamentBracket = async (payload = {}, io) => {
  const tournament = await assertCsTournament(payload.tournamentId);
  const teamIds = normalizeObjectIdArray(payload.teamIds || payload.selectedTeams || [], "teamIds");

  if (teamIds.length !== BRACKET_SIZE) {
    throw new AppError(`Exactly ${BRACKET_SIZE} teams are required to create the bracket`, 400);
  }

  const existingBracket = await Match.exists({
    tournamentId: tournament._id,
    "bracket.enabled": true
  });

  if (existingBracket) {
    throw new AppError("Bracket already exists for this tournament", 409);
  }

  const teams = await Team.find({ _id: { $in: teamIds } })
    .select("_id teamId name players")
    .lean();

  if (teams.length !== teamIds.length) {
    throw new AppError("One or more selected teams were not found", 404);
  }

  teams.forEach((team) => {
    if (!Array.isArray(team.players) || !team.players.length) {
      throw new AppError(`Team ${team.name} has no registered players`, 400);
    }
  });

  const teamById = new Map(teams.map((team) => [String(team._id), team]));
  const orderedTeams = teamIds.map((teamId) => teamById.get(String(teamId)));
  const shuffledTeams = shuffleArray(orderedTeams);

  const requestedStartTime = normalizeText(payload.startTime);
  const baseStartTime = requestedStartTime
    ? new Date(requestedStartTime)
    : new Date(tournament.startTime || tournament.dateTime || Date.now());

  if (Number.isNaN(baseStartTime.getTime())) {
    throw new AppError("startTime is invalid", 400);
  }

  const lastMatch = await Match.findOne({ tournamentId: tournament._id })
    .sort({ matchNumber: -1 })
    .select("matchNumber")
    .lean();

  const nextMatchNumber = Number(lastMatch?.matchNumber || 0) + 1;
  const bracketMatchIds = Array.from({ length: 7 }, () => new mongoose.Types.ObjectId());

  const quarterDef = ROUND_DEFINITIONS[0];
  const semiDef = ROUND_DEFINITIONS[1];
  const finalDef = ROUND_DEFINITIONS[2];
  const matchesToInsert = [];

  for (let index = 0; index < quarterDef.matchCount; index += 1) {
    const firstTeam = shuffledTeams[index * 2];
    const secondTeam = shuffledTeams[index * 2 + 1];
    const nextMatchIndex = 4 + Math.floor(index / 2);
    const nextMatchSlot = index % 2 === 0 ? 1 : 2;

    matchesToInsert.push({
      _id: bracketMatchIds[index],
      tournamentId: tournament._id,
      matchNumber: nextMatchNumber + index,
      mode: "CS",
      status: "live",
      startTime: new Date(baseStartTime.getTime() + quarterDef.offsetMinutes * 60 * 1000),
      participants: buildParticipantsFromTeams([firstTeam, secondTeam]),
      selectedTeams: [firstTeam._id, secondTeam._id],
      qualifiedTeams: [],
      results: [],
      isLocked: false,
      lockedAt: null,
      bracket: {
        enabled: true,
        round: quarterDef.key,
        roundLabel: quarterDef.label,
        roundOrder: quarterDef.order,
        matchOrder: index + 1,
        nextMatchId: bracketMatchIds[nextMatchIndex],
        nextMatchSlot,
        participantSlots: [
          {
            slotNumber: 1,
            sourceMatchId: null,
            teamId: firstTeam._id
          },
          {
            slotNumber: 2,
            sourceMatchId: null,
            teamId: secondTeam._id
          }
        ],
        winnerTeamId: null
      }
    });
  }

  for (let index = 0; index < semiDef.matchCount; index += 1) {
    matchesToInsert.push({
      _id: bracketMatchIds[4 + index],
      tournamentId: tournament._id,
      matchNumber: nextMatchNumber + 4 + index,
      mode: "CS",
      status: "pending",
      startTime: new Date(baseStartTime.getTime() + semiDef.offsetMinutes * 60 * 1000),
      participants: [],
      selectedTeams: [],
      qualifiedTeams: [],
      results: [],
      isLocked: false,
      lockedAt: null,
      bracket: {
        enabled: true,
        round: semiDef.key,
        roundLabel: semiDef.label,
        roundOrder: semiDef.order,
        matchOrder: index + 1,
        nextMatchId: bracketMatchIds[6],
        nextMatchSlot: index + 1,
        participantSlots: [
          {
            slotNumber: 1,
            sourceMatchId: bracketMatchIds[index * 2],
            teamId: null
          },
          {
            slotNumber: 2,
            sourceMatchId: bracketMatchIds[index * 2 + 1],
            teamId: null
          }
        ],
        winnerTeamId: null
      }
    });
  }

  matchesToInsert.push({
    _id: bracketMatchIds[6],
    tournamentId: tournament._id,
    matchNumber: nextMatchNumber + 6,
    mode: "CS",
    status: "pending",
    startTime: new Date(baseStartTime.getTime() + finalDef.offsetMinutes * 60 * 1000),
    participants: [],
    selectedTeams: [],
    qualifiedTeams: [],
    results: [],
    isLocked: false,
    lockedAt: null,
    bracket: {
      enabled: true,
      round: finalDef.key,
      roundLabel: finalDef.label,
      roundOrder: finalDef.order,
      matchOrder: 1,
      nextMatchId: null,
      nextMatchSlot: null,
      participantSlots: [
        {
          slotNumber: 1,
          sourceMatchId: bracketMatchIds[4],
          teamId: null
        },
        {
          slotNumber: 2,
          sourceMatchId: bracketMatchIds[5],
          teamId: null
        }
      ],
      winnerTeamId: null
    }
  });

  await Match.insertMany(matchesToInsert);

  const bracket = await getTournamentBracket(tournament._id);

  io?.emit("tournament_update", {
    type: "bracket_created",
    tournamentId: String(tournament._id),
    bracket
  });

  return bracket;
};

const saveBracketMatchResult = async (payload = {}, io) => {
  const matchId = toObjectId(payload.matchId, "matchId");
  const winnerTeamId = toObjectId(payload.winnerTeamId, "winnerTeamId");

  const match = await Match.findById(matchId);

  if (!match) {
    throw new AppError("Bracket match not found", 404);
  }

  if (!match.bracket?.enabled) {
    throw new AppError("This match is not part of a bracket", 400);
  }

  if (match.status === "completed" || match.isLocked) {
    throw new AppError("Bracket result is already locked", 400);
  }

  const slots = sortBracketSlots(match.bracket.participantSlots);
  const activeTeamIds = slots
    .map((slot) => slot.teamId)
    .filter(Boolean)
    .map((teamId) => String(teamId));

  if (activeTeamIds.length !== 2) {
    throw new AppError("Both teams must be available before declaring a winner", 400);
  }

  if (!activeTeamIds.includes(String(winnerTeamId))) {
    throw new AppError("winnerTeamId must belong to this bracket match", 400);
  }

  const loserTeamId =
    activeTeamIds.find((teamId) => teamId !== String(winnerTeamId)) || null;

  match.results = [
    {
      teamId: winnerTeamId,
      totalKills: 0,
      booyah: true,
      rank: 1,
      players: []
    }
  ];

  if (loserTeamId) {
    match.results.push({
      teamId: new mongoose.Types.ObjectId(loserTeamId),
      totalKills: 0,
      booyah: false,
      rank: 2,
      players: []
    });
  }

  match.qualifiedTeams = [winnerTeamId];
  match.status = "completed";
  match.isLocked = true;
  match.lockedAt = new Date();
  match.bracket.winnerTeamId = winnerTeamId;
  await match.save();

  if (match.bracket.nextMatchId) {
    const nextMatch = await Match.findById(match.bracket.nextMatchId);

    if (!nextMatch || !nextMatch.bracket?.enabled) {
      throw new AppError("Next bracket match could not be found", 404);
    }

    nextMatch.bracket.participantSlots = sortBracketSlots(nextMatch.bracket.participantSlots).map((slot) => ({
      slotNumber: Number(slot.slotNumber || 0),
      sourceMatchId: slot.sourceMatchId || null,
      teamId:
        Number(slot.slotNumber || 0) === Number(match.bracket.nextMatchSlot || 0)
          ? winnerTeamId
          : slot.teamId || null
    }));

    await syncMatchTeamsFromBracketSlots(nextMatch);
    await nextMatch.save();
  } else if (match.bracket.round === "final") {
    await Tournament.findByIdAndUpdate(match.tournamentId, {
      $set: {
        status: "completed"
      }
    });
  }

  const bracket = await getTournamentBracket(match.tournamentId);

  io?.emit("tournament_update", {
    type: "bracket_updated",
    tournamentId: String(match.tournamentId),
    bracket
  });

  return bracket;
};

module.exports = {
  getTournamentBracket,
  createTournamentBracket,
  saveBracketMatchResult
};
