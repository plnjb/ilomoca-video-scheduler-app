const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;
let server; // Will hold the Express server

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js") // optional if you need IPC
    }
  });

  mainWindow.loadFile("frontend/index.html");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function startBackend() {
  // Import backend server modules
  const express = require("express");
  const multer = require("multer");
  const cors = require("cors");

  const PORT = 3001;
  
  // Get writable user directory
  const USER_DATA_PATH = app.getPath("userData");
  const VIDEOS_DIR = path.join(USER_DATA_PATH, "videos");
  const SCHEDULE_FILE = path.join(USER_DATA_PATH, "schedules.json");
  const PLAYLIST_FILE = path.join(USER_DATA_PATH, "playlist.json");

  // Ensure folders/files exist
  if (!fs.existsSync(USER_DATA_PATH)) fs.mkdirSync(USER_DATA_PATH, { recursive: true });
  if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  if (!fs.existsSync(SCHEDULE_FILE)) fs.writeFileSync(SCHEDULE_FILE, "[]");
  if (!fs.existsSync(PLAYLIST_FILE)) fs.writeFileSync(PLAYLIST_FILE, "[]");

  // Create Express app
  const expressApp = express();
  expressApp.use(cors());
  expressApp.use(express.json());

  // Multer storage
  const storage = multer.diskStorage({
    destination: VIDEOS_DIR,
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    }
  });

  const upload = multer({ storage });

  // Routes
  expressApp.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    res.json({
      name: req.file.originalname,  // Use original filename for display
      filename: req.file.filename,   // Keep server filename for reference
      url: `http://localhost:${PORT}/videos/${req.file.filename}`
    });
  });

  expressApp.use("/videos", express.static(VIDEOS_DIR));

  expressApp.post("/schedules", (req, res) => {
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  });

  expressApp.get("/schedules", (req, res) => {
    const data = fs.readFileSync(SCHEDULE_FILE);
    res.json(JSON.parse(data));
  });

  // Playlist endpoints
  expressApp.post("/playlist", (req, res) => {
    fs.writeFileSync(PLAYLIST_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  });

  expressApp.get("/playlist", (req, res) => {
    const data = fs.readFileSync(PLAYLIST_FILE);
    res.json(JSON.parse(data));
  });

  // Start server
  server = expressApp.listen(PORT, () => {
    console.log("Backend running on http://localhost:" + PORT);
    console.log("User data folder:", USER_DATA_PATH);
  });

  server.on("error", (err) => {
    console.error("Server error:", err);
    dialog.showErrorBox(
      "Backend Error",
      "The local server failed to start. The app may not work correctly."
    );
  });
}

app.whenReady().then(() => {
  startBackend();
  
  // Wait a moment for backend to start before opening window
  setTimeout(() => {
    createWindow();
  }, 500);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (server) {
    server.close();
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("quit", () => {
  if (server) {
    server.close();
  }
});