const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Crucial: Set the safe SQLite database path inside the system's safe userData folder
// before importing/loading the backend server so it initializes in the right place!
const userDataPath = app.getPath('userData');
const dbDir = path.join(userDataPath, 'data');
const dbPath = path.join(dbDir, 'pos.db');

// Ensure the local database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Seed database on first launch if it doesn't exist yet
if (!fs.existsSync(dbPath)) {
  const seedDbPath = path.join(__dirname, '../backend/server/data/pos.db');
  if (fs.existsSync(seedDbPath)) {
    try {
      fs.copyFileSync(seedDbPath, dbPath);
      console.log('Database successfully seeded on first launch!');
      
      // Also copy WAL files if they exist to keep state clean
      const seedWal = seedDbPath + '-wal';
      const destWal = dbPath + '-wal';
      if (fs.existsSync(seedWal)) {
        fs.copyFileSync(seedWal, destWal);
      }
      const seedShm = seedDbPath + '-shm';
      const destShm = dbPath + '-shm';
      if (fs.existsSync(seedShm)) {
        fs.copyFileSync(seedShm, destShm);
      }
    } catch (err) {
      console.error('Error seeding database:', err);
    }
  }
}

process.env.OMNISYSTEM_DB_PATH = dbPath;
process.env.NODE_ENV = 'production'; // Force production behaviors

const { startServer } = require('../backend/server');

let mainWindow;

async function createWindow() {
  // Start the backend server first
  try {
    await startServer();
  } catch (error) {
    console.error('Failed to start local Express server:', error);
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1366, width),
    height: Math.min(850, height),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'نظام إدارة المبيعات والمخزون المتكامل - OmniSystem Pro',
    autoHideMenuBar: true,
  });

  // Load the local Express server url
  mainWindow.loadURL('http://127.0.0.1:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single Instance Lock to prevent multiple backend servers starting on port 3000
const isSingleInstance = app.requestSingleInstanceLock();

if (!isSingleInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('ready', () => {
    createWindow();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
