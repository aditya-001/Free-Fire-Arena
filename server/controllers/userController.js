const User = require("../models/User");

const parseArrayInput = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean);
    }
  } catch (error) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const serializeProfile = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  phone: user.phone,
  bio: user.bio,
  profileImage: user.profileImage,
  gameId: user.gameId || user.uid,
  uid: user.gameId || user.uid,
  walletBalance: user.walletBalance ?? 0,
  skills: user.skills,
  followers: user.followers,
  following: user.following,
  achievements: user.achievements,
  notifications: user.notifications,
  location: user.location,
  stats: user.stats,
  role: user.role,
  matchHistory: user.matchHistory,
  createdAt: user.createdAt
});

const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password")
    .populate("followers", "username gameId profileImage")
    .populate("following", "username gameId profileImage");

  return res.json(serializeProfile(user));
};

const updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const { username, bio, gameId, uid, skills, achievements, state, city } = req.body;

  if (username) user.username = username;
  if (bio !== undefined) user.bio = bio;
  if (gameId || uid) user.gameId = gameId || uid;
  if (skills !== undefined) user.skills = parseArrayInput(skills);
  if (achievements !== undefined) user.achievements = parseArrayInput(achievements);
  if (state) user.location.state = state;
  if (city) user.location.city = city;
  if (req.file) user.profileImage = `/uploads/${req.file.filename}`;

  await user.save();

  const updatedUser = await User.findById(user._id)
    .select("-password")
    .populate("followers", "username gameId profileImage")
    .populate("following", "username gameId profileImage");

  return res.json(serializeProfile(updatedUser));
};

const searchPlayers = async (req, res) => {
  const query = req.query.q?.trim() || "";

  const users = await User.find({
    $or: [
      { username: { $regex: query, $options: "i" } },
      { gameId: { $regex: query, $options: "i" } },
      { uid: { $regex: query, $options: "i" } }
    ]
  })
    .select("username gameId bio profileImage skills followers following location stats")
    .limit(12);

  return res.json(users);
};

const toggleFollow = async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user._id);

  if (!targetUser) {
    return res.status(404).json({ message: "Player not found" });
  }

  if (targetUser._id.equals(currentUser._id)) {
    return res.status(400).json({ message: "You cannot follow yourself" });
  }

  const isFollowing = currentUser.following.some((item) => item.equals(targetUser._id));

  if (isFollowing) {
    currentUser.following = currentUser.following.filter((item) => !item.equals(targetUser._id));
    targetUser.followers = targetUser.followers.filter((item) => !item.equals(currentUser._id));
  } else {
    currentUser.following.push(targetUser._id);
    targetUser.followers.push(currentUser._id);
    targetUser.notifications.unshift({
      title: "New follower",
      body: `${currentUser.username} started following you.`
    });
  }

  await Promise.all([currentUser.save(), targetUser.save()]);

  return res.json({
    following: !isFollowing,
    followersCount: targetUser.followers.length,
    followingCount: currentUser.following.length
  });
};

const getUserById = async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("-password")
    .populate("followers", "username gameId profileImage")
    .populate("following", "username gameId profileImage");

  if (!user) {
    return res.status(404).json({ message: "Player not found" });
  }

  return res.json(serializeProfile(user));
};

const getNotifications = async (req, res) => {
  const user = await User.findById(req.user._id).select("notifications");
  return res.json(user.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
};

const markNotificationsRead = async (req, res) => {
  const user = await User.findById(req.user._id);
  user.notifications = user.notifications.map((notification) => ({
    ...notification.toObject(),
    read: true
  }));
  await user.save();
  return res.json({ success: true });
};

module.exports = {
  getCurrentUser,
  updateProfile,
  searchPlayers,
  toggleFollow,
  getUserById,
  getNotifications,
  markNotificationsRead
};
