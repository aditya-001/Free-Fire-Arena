const User = require("../models/User");

const seedInitialData = async () => {
  const usersMissingUid = await User.find({
    $or: [{ uid: { $exists: false } }, { uid: null }, { uid: "" }]
  }).select("_id gameId");

  if (!usersMissingUid.length) {
    return;
  }

  const updateOperations = usersMissingUid
    .filter((user) => typeof user.gameId === "string" && user.gameId.trim())
    .map((user) =>
      User.updateOne({ _id: user._id }, { $set: { uid: user.gameId.trim() } })
    );

  if (updateOperations.length) {
    await Promise.all(updateOperations);
  }
};

module.exports = seedInitialData;
