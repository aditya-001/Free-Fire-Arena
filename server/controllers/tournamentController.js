const Tournament = require("../models/Tournament");
const User = require("../models/User");

const getTournaments = async (req, res) => {
  const onlyUpcoming = req.query.upcoming === "true";
  const limit = Number(req.query.limit || 0);

  const query = onlyUpcoming ? { dateTime: { $gte: new Date() } } : {};
  let tournamentQuery = Tournament.find(query)
    .populate("participants", "username uid profileImage")
    .populate("createdBy", "username")
    .sort({ dateTime: 1 });

  if (limit) {
    tournamentQuery = tournamentQuery.limit(limit);
  }

  const tournaments = await tournamentQuery;

  return res.json(tournaments);
};

const createTournament = async (req, res) => {
  const { name, entryFee, prizePool, dateTime } = req.body;

  if (
    !name ||
    entryFee === undefined ||
    prizePool === undefined ||
    !dateTime
  ) {
    return res.status(400).json({ message: "All tournament fields are required" });
  }

  const tournament = await Tournament.create({
    name,
    entryFee: Number(entryFee),
    prizePool: Number(prizePool),
    dateTime,
    createdBy: req.user._id
  });

  const populatedTournament = await Tournament.findById(tournament._id)
    .populate("participants", "username uid profileImage")
    .populate("createdBy", "username");

  await User.updateMany(
    {},
    {
      $push: {
        notifications: {
          title: "New tournament announced",
          body: `${name} is open for registrations now.`
        }
      }
    }
  );

  req.io.emit("tournament_update", {
    type: "created",
    tournament: populatedTournament
  });

  return res.status(201).json(populatedTournament);
};

const joinTournament = async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) {
    return res.status(404).json({ message: "Tournament not found" });
  }

  const alreadyJoined = tournament.participants.some((participant) =>
    participant.equals(req.user._id)
  );

  if (alreadyJoined) {
    return res.status(400).json({ message: "You have already joined this tournament" });
  }

  tournament.participants.push(req.user._id);
  await tournament.save();

  await User.findByIdAndUpdate(req.user._id, {
    $push: {
      notifications: {
        title: "Registration confirmed",
        body: `You joined ${tournament.name}. Good luck for the match.`
      }
    }
  });

  const populatedTournament = await Tournament.findById(tournament._id)
    .populate("participants", "username uid profileImage")
    .populate("createdBy", "username");

  req.io.emit("tournament_update", {
    type: "joined",
    tournament: populatedTournament,
    playerId: req.user._id
  });

  return res.json(populatedTournament);
};

module.exports = { getTournaments, createTournament, joinTournament };
