const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// IMPORTANT: get a writable user directory
let USER_DATA_PATH;

try {
  const { app } = require("electron");
  USER_DATA_PATH = app.getPath("userData");
} catch (e) {

  USER_DATA_PATH = path.join(process.env.APPDATA || process.cwd(), "video-scheduler-app");
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Use a WRITABLE location (works in the packaged EXE)
const VIDEOS_DIR = path.join(USER_DATA_PATH, "videos");
const SCHEDULE_FILE = path.join(USER_DATA_PATH, "schedules.json");

// Ensure folders/files exist
if (!fs.existsSync(USER_DATA_PATH)) fs.mkdirSync(USER_DATA_PATH, { recursive: true });
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
if (!fs.existsSync(SCHEDULE_FILE)) fs.writeFileSync(SCHEDULE_FILE, "[]");

// Multer storage (save to user data folder)
const storage = multer.diskStorage({
  destination: VIDEOS_DIR,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Upload video
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    name: req.file.filename,
    url: `http://localhost:${PORT}/videos/${req.file.filename}`
  });
});

// Serve videos from user data folder
app.use("/videos", express.static(VIDEOS_DIR));

// Save schedules
app.post("/schedules", (req, res) => {
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// Load schedules
app.get("/schedules", (req, res) => {
  const data = fs.readFileSync(SCHEDULE_FILE);
  res.json(JSON.parse(data));
});

app.listen(PORT, () => {
  console.log("Backend running on http://localhost:" + PORT);
  console.log("User data folder:", USER_DATA_PATH);
});
