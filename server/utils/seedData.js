const bcrypt = require("bcryptjs");
const Tournament = require("../models/Tournament");
const User = require("../models/User");
const Team = require("../models/Team");
const Match = require("../models/Match");

const seedInitialData = async () => {
  const usersMissingUid = await User.find({
    $or: [{ uid: { $exists: false } }, { uid: null }, { uid: "" }]
  }).select("_id gameId");

  if (usersMissingUid.length) {
    await Promise.all(
      usersMissingUid.map((user) =>
        User.updateOne({ _id: user._id }, { $set: { uid: user.gameId } })
      )
    );
  }

  const userCount = await User.countDocuments();

  if (!userCount) {
    const passwordHashes = await Promise.all([
      bcrypt.hash("admin123", 10),
      bcrypt.hash("player123", 10),
      bcrypt.hash("player123", 10),
      bcrypt.hash("player123", 10)
    ]);

    const users = await User.insertMany([
      {
        username: "ArenaAdmin",
        email: "admin@freefire.gg",
        phone: "9000000001",
        password: passwordHashes[0],
        gameId: "FF-ADMIN-001",
        uid: "FF-ADMIN-001",
        bio: "Hosting custom rooms, clan scrims and elite events.",
        skills: ["Strategist", "Coach"],
        achievements: ["Tournament Director", "Verified Host"],
        role: "admin",
        location: { state: "Delhi", city: "New Delhi" },
        stats: { points: 980, wins: 34, matches: 78 },
        notifications: [
          {
            title: "Welcome to Arena",
            body: "You are ready to manage Free Fire tournaments."
          }
        ],
        matchHistory: [
          { matchName: "Elite Scrim", placement: 1, kills: 7, points: 18 }
        ]
      },
      {
        username: "RaistarX",
        email: "raistar@freefire.gg",
        phone: "9000000002",
        password: passwordHashes[1],
        gameId: "FF-RAI-201",
        uid: "FF-RAI-201",
        bio: "Fast rushes, clutch revives and close-range domination.",
        skills: ["Rusher", "Clutch"],
        achievements: ["MVP", "Top Fragger"],
        location: { state: "Maharashtra", city: "Mumbai" },
        stats: { points: 920, wins: 27, matches: 73 },
        notifications: [
          {
            title: "Tournament reminder",
            body: "Squad Clash finals start tonight at 9:00 PM."
          }
        ],
        matchHistory: [
          { matchName: "Squad Clash", placement: 2, kills: 5, points: 14 },
          { matchName: "Solo Cup", placement: 1, kills: 9, points: 20 }
        ]
      },
      {
        username: "SniperNova",
        email: "nova@freefire.gg",
        phone: "9000000003",
        password: passwordHashes[2],
        gameId: "FF-NOVA-335",
        uid: "FF-NOVA-335",
        bio: "Long-range specialist with calm zone control.",
        skills: ["Sniper", "IGL"],
        achievements: ["Sharp Shooter"],
        location: { state: "Uttar Pradesh", city: "Mathura" },
        stats: { points: 860, wins: 22, matches: 69 },
        notifications: [
          {
            title: "Achievement unlocked",
            body: "Sharp Shooter badge has been added to your profile."
          }
        ],
        matchHistory: [
          { matchName: "State Knockout", placement: 3, kills: 4, points: 11 }
        ]
      },
      {
        username: "ZoneHunter",
        email: "zone@freefire.gg",
        phone: "9000000004",
        password: passwordHashes[3],
        gameId: "FF-ZONE-187",
        uid: "FF-ZONE-187",
        bio: "Mastering rotations, end-games and objective play.",
        skills: ["Support", "Zone Control"],
        achievements: ["Rotation King"],
        location: { state: "Karnataka", city: "Bengaluru" },
        stats: { points: 830, wins: 19, matches: 64 },
        notifications: [
          {
            title: "New room available",
            body: "Register for the weekend blitz tournament."
          }
        ],
        matchHistory: [
          { matchName: "Weekend Blitz", placement: 4, kills: 3, points: 9 }
        ]
      }
    ]);

    users[1].following = [users[2]._id];
    users[1].followers = [users[3]._id];
    users[2].followers = [users[1]._id];
    users[3].following = [users[1]._id];

    await Promise.all(users.map((user) => user.save()));
  }

  const tournamentCount = await Tournament.countDocuments();

  if (!tournamentCount) {
    const admin = await User.findOne({ role: "admin" });
    const players = await User.find({ role: "user" }).limit(3);

    if (admin) {
      const playerIds = players.map((player) => player._id);
      const pairIds = playerIds.slice(0, 2);
      const tailIds = playerIds.slice(1);
      const now = Date.now();

      await Tournament.insertMany([
        {
          title: "Booyah Night Showdown",
          mode: "BR",
          game: "Free Fire",
          entryFee: 49,
          prizePool: 5000,
          maxPlayers: 48,
          joinedPlayers: pairIds,
          status: "upcoming",
          startTime: new Date(now + 1000 * 60 * 60 * 24),
          createdBy: admin._id
        },
        {
          title: "All India Squad Clash",
          mode: "CS",
          game: "Free Fire",
          entryFee: 99,
          prizePool: 15000,
          maxPlayers: 60,
          joinedPlayers: playerIds,
          status: "live",
          startTime: new Date(now - 1000 * 60 * 20),
          createdBy: admin._id
        },
        {
          title: "City Solo Rush",
          mode: "BR",
          game: "Free Fire",
          entryFee: 29,
          prizePool: 2500,
          maxPlayers: 40,
          joinedPlayers: tailIds,
          status: "upcoming",
          startTime: new Date(now + 1000 * 60 * 60 * 72),
          createdBy: admin._id
        },
        {
          title: "Weekend Knockout Finals",
          mode: "CS",
          game: "Free Fire",
          entryFee: 59,
          prizePool: 8000,
          maxPlayers: 50,
          joinedPlayers: playerIds,
          status: "completed",
          startTime: new Date(now - 1000 * 60 * 60 * 6),
          createdBy: admin._id
        }
      ]);
    }
  }

  const teamCount = await Team.countDocuments();
  if (!teamCount) {
    const users = await User.find({ role: "user" }).limit(6).select("_id");

    if (users.length >= 2) {
      const firstHalf = users.slice(0, Math.ceil(users.length / 2)).map((item) => item._id);
      const secondHalf = users.slice(Math.ceil(users.length / 2)).map((item) => item._id);

      await Team.insertMany([
        {
          name: "Alpha Predators",
          players: firstHalf
        },
        {
          name: "Blaze Reapers",
          players: secondHalf.length ? secondHalf : firstHalf
        }
      ]);
    }
  }

  const matchCount = await Match.countDocuments();
  if (!matchCount) {
    const tournaments = await Tournament.find({}).limit(10).select(
      "_id mode status startTime dateTime joinedPlayers participants"
    );
    const teams = await Team.find({}).select("_id");

    const matchesToInsert = tournaments.map((tournament, index) => {
      const participants = Array.isArray(tournament.joinedPlayers) && tournament.joinedPlayers.length
        ? tournament.joinedPlayers
        : Array.isArray(tournament.participants)
          ? tournament.participants
          : [];

      const shouldComplete = tournament.status === "completed";
      const results = shouldComplete
        ? participants.slice(0, 10).map((userId, rankIndex) => ({
            user: userId,
            teamId: teams.length ? teams[rankIndex % teams.length]._id : null,
            kills: Math.max(1, 8 - rankIndex),
            booyah: rankIndex === 0,
            rank: rankIndex + 1
          }))
        : [];

      return {
        tournamentId: tournament._id,
        matchNumber: 1,
        mode: tournament.mode || "BR",
        status: shouldComplete ? "completed" : "live",
        startTime: tournament.startTime || tournament.dateTime || new Date(),
        participants,
        results
      };
    });

    if (matchesToInsert.length) {
      await Match.insertMany(matchesToInsert);
    }
  }
};

module.exports = seedInitialData;
