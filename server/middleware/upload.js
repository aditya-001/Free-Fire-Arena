const path = require("path");
const fs = require("fs");
const multer = require("multer");

const resolveUploadDirectory = (file) => {
  const uploadRoot = path.join(__dirname, "..", "uploads");

  if (file.fieldname === "profileImage" || file.fieldname === "avatar") {
    return path.join(uploadRoot, "avatars");
  }

  return path.join(uploadRoot, "tournament");
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destinationPath = resolveUploadDirectory(file);
    fs.mkdirSync(destinationPath, { recursive: true });
    cb(null, destinationPath);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image uploads are allowed"));
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
