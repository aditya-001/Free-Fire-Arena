const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const serializeAuthUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  phone: user.phone,
  gameId: user.gameId,
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
  const { username, email, phone, password, gameId, state, city } = req.body;

  if (!username || !email || !phone || !password || !gameId) {
    return res.status(400).json({ message: "Please fill all required fields" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { gameId }, { phone }, { username }]
  });

  if (existingUser) {
    return res.status(409).json({ message: "Email, Phone, gameId or Username already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    email,
    phone,
    password: hashedPassword,
    gameId,
    location: {
      state: state || "State",
      city: city || "City"
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
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Identifier and password are required" });
  }

  // Find user by email, phone, username, or gameId
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: identifier },
      { username: identifier },
      { gameId: identifier }
    ]
  });

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

const adminRegister = async (req, res) => {
  const { username, email, phone, password, adminKey } = req.body;

  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: "Invalid secure admin key" });
  }

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username }, { phone }]
  });

  if (existingUser) {
    return res.status(409).json({ message: "Admin details already used" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await User.create({
    username,
    email,
    phone,
    gameId: `ADMIN-${Date.now()}`,
    password: hashedPassword,
    role: "admin"
  });

  return res.status(201).json({
    token: generateToken(admin._id),
    user: serializeAuthUser(admin)
  });
};

const adminLogin = async (req, res) => {
  const { adminId, password } = req.body;

  if (!adminId || !password) {
    return res.status(400).json({ message: "Admin Identifier and passcode are required" });
  }

  const admin = await User.findOne({
    role: "admin",
    $or: [
      { username: adminId },
      { email: adminId.toLowerCase() },
      { gameId: adminId }
    ]
  });

  if (!admin) {
    return res.status(401).json({ message: "UNAUTHORIZED: Admin not found" });
  }

  const passwordMatch = await bcrypt.compare(password, admin.password);

  if (!passwordMatch) {
    return res.status(401).json({ message: "UNAUTHORIZED: Incorrect passcode" });
  }

  return res.json({
    token: generateToken(admin._id),
    user: serializeAuthUser(admin)
  });
};

module.exports = { registerUser, loginUser, adminRegister, adminLogin };
