const bcrypt = require("bcryptjs");
const Tournament = require("../models/Tournament");
const User = require("../models/User");

const seedInitialData = async () => {
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
        password: passwordHashes[0],
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
        password: passwordHashes[1],
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
        password: passwordHashes[2],
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
        password: passwordHashes[3],
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
      await Tournament.insertMany([
        {
          name: "Booyah Night Showdown",
          entryFee: 49,
          prizePool: 5000,
          dateTime: new Date(Date.now() + 1000 * 60 * 60 * 24),
          participants: players.slice(0, 2).map((player) => player._id),
          createdBy: admin._id
        },
        {
          name: "All India Squad Clash",
          entryFee: 99,
          prizePool: 15000,
          dateTime: new Date(Date.now() + 1000 * 60 * 60 * 48),
          participants: players.map((player) => player._id),
          createdBy: admin._id
        },
        {
          name: "City Solo Rush",
          entryFee: 29,
          prizePool: 2500,
          dateTime: new Date(Date.now() + 1000 * 60 * 60 * 72),
          participants: players.slice(1).map((player) => player._id),
          createdBy: admin._id
        }
      ]);
    }
  }
};

module.exports = seedInitialData;
