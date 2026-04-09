const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const serializeAuthUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  uid: user.uid,
  bio: user.bio,
  profileImage: user.profileImage,
  skills: user.skills,
  achievements: user.achievements,
  followers: user.followers,
  following: user.following,
  location: user.location,
  stats: user.stats,
  role: user.role
});

const registerUser = async (req, res) => {
  const { username, email, password, uid, state, city } = req.body;

  if (!username || !email || !password || !uid) {
    return res.status(400).json({ message: "Please fill all required fields" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { uid }]
  });

  if (existingUser) {
    return res.status(409).json({ message: "Email or UID already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    uid,
    location: {
      state: state || "Uttar Pradesh",
      city: city || "Mathura"
    },
    notifications: [
      {
        title: "Welcome to Arena",
        body: "Your player profile is live. Join a tournament and start climbing."
      }
    ]
  });

  return res.status(201).json({
    token: generateToken(user._id),
    user: serializeAuthUser(user)
  });
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json({
    token: generateToken(user._id),
    user: serializeAuthUser(user)
  });
};

module.exports = { registerUser, loginUser };
