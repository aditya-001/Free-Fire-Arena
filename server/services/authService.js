const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const AppError = require("../utils/AppError");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");
const normalizeEmail = (value) => normalizeText(value).toLowerCase();
const isDuplicateKeyError = (error) => error?.code === 11000;

const serializeAuthUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  phone: user.phone,
  gameId: user.gameId,
  uid: user.uid || user.gameId,
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

const registerUser = async (payload) => {
  try {
    const username = normalizeText(payload?.username);
    const email = normalizeEmail(payload?.email);
    const phone = normalizeText(payload?.phone);
    const password = normalizeText(payload?.password);
    const gameId = normalizeText(payload?.gameId || payload?.uid || payload?.ffGameId);
    const state = normalizeText(payload?.state);
    const city = normalizeText(payload?.city);

    const safeUsername = escapeRegex(username);
    const safeGameId = escapeRegex(gameId);

    const existingUser = await User.findOne({
      $or: [
        { email },
        { phone },
        { username: { $regex: `^${safeUsername}$`, $options: "i" } },
        { gameId: { $regex: `^${safeGameId}$`, $options: "i" } },
        { uid: { $regex: `^${safeGameId}$`, $options: "i" } }
      ]
    });

    if (existingUser) {
      throw new AppError("Email, Phone, gameId or Username already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      phone,
      password: hashedPassword,
      gameId,
      uid: gameId,
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

    return {
      token: generateToken(user._id),
      user: serializeAuthUser(user)
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("Email, Phone, gameId or Username already exists", 409);
    }

    throw error;
  }
};

const checkRegistrationAvailability = async (payload) => {
  const username = normalizeText(payload?.username);
  const email = normalizeEmail(payload?.email);
  const gameId = normalizeText(payload?.gameId || payload?.uid || payload?.ffGameId);
  const phone = normalizeText(payload?.phone);

  const usernamePromise = username
    ? User.exists({ username: { $regex: `^${escapeRegex(username)}$`, $options: "i" } })
    : Promise.resolve(null);

  const emailPromise = email ? User.exists({ email }) : Promise.resolve(null);

  const gameIdPromise = gameId
    ? User.exists({
        $or: [
          { gameId: { $regex: `^${escapeRegex(gameId)}$`, $options: "i" } },
          { uid: { $regex: `^${escapeRegex(gameId)}$`, $options: "i" } }
        ]
      })
    : Promise.resolve(null);

  const phonePromise = phone ? User.exists({ phone }) : Promise.resolve(null);

  const [usernameExists, emailExists, gameIdExists, phoneExists] = await Promise.all([
    usernamePromise,
    emailPromise,
    gameIdPromise,
    phonePromise
  ]);

  return {
    usernameAvailable: username ? !Boolean(usernameExists) : null,
    emailAvailable: email ? !Boolean(emailExists) : null,
    gameIdAvailable: gameId ? !Boolean(gameIdExists) : null,
    phoneAvailable: phone ? !Boolean(phoneExists) : null
  };
};

const loginUser = async (payload) => {
  const rawIdentifier =
    payload?.identifier ??
    payload?.email ??
    payload?.username ??
    payload?.phone ??
    payload?.gameId ??
    payload?.uid;
  const identifier = normalizeText(rawIdentifier);
  const password = normalizeText(payload?.password);

  const safeIdentifier = escapeRegex(identifier);

  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: identifier },
      { username: { $regex: `^${safeIdentifier}$`, $options: "i" } },
      { gameId: { $regex: `^${safeIdentifier}$`, $options: "i" } },
      { uid: { $regex: `^${safeIdentifier}$`, $options: "i" } }
    ]
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  if (user.isBanned) {
    throw new AppError("Account is banned. Contact support.", 403);
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  return {
    token: generateToken(user._id),
    user: serializeAuthUser(user)
  };
};

const adminRegister = async (payload) => {
  try {
    const username = normalizeText(payload?.username);
    const email = normalizeEmail(payload?.email);
    const phone = normalizeText(payload?.phone);
    const password = normalizeText(payload?.password);
    const adminKey = normalizeText(payload?.adminKey);

    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      throw new AppError("Invalid secure admin key", 403);
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { phone }]
    });

    if (existingUser) {
      throw new AppError("Admin details already used", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminGameId = `ADMIN-${Date.now()}`;

    const admin = await User.create({
      username,
      email,
      phone,
      gameId: adminGameId,
      uid: adminGameId,
      password: hashedPassword,
      role: "admin"
    });

    return {
      token: generateToken(admin._id),
      user: serializeAuthUser(admin)
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("Admin details already used", 409);
    }

    throw error;
  }
};

const adminLogin = async (payload) => {
  const adminId = normalizeText(payload?.adminId);
  const password = normalizeText(payload?.password);

  const safeAdminId = escapeRegex(adminId);

  const admin = await User.findOne({
    role: "admin",
    $or: [
      { username: { $regex: `^${safeAdminId}$`, $options: "i" } },
      { email: adminId.toLowerCase() },
      { gameId: { $regex: `^${safeAdminId}$`, $options: "i" } },
      { uid: { $regex: `^${safeAdminId}$`, $options: "i" } }
    ]
  });

  if (!admin) {
    throw new AppError("UNAUTHORIZED: Admin not found", 401);
  }

  if (admin.isBanned) {
    throw new AppError("UNAUTHORIZED: Admin account is disabled", 403);
  }

  const passwordMatch = await bcrypt.compare(password, admin.password);

  if (!passwordMatch) {
    throw new AppError("UNAUTHORIZED: Incorrect passcode", 401);
  }

  return {
    token: generateToken(admin._id),
    user: serializeAuthUser(admin)
  };
};

module.exports = {
  registerUser,
  checkRegistrationAvailability,
  loginUser,
  adminRegister,
  adminLogin
};
