const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const isDev = require('electron-is-dev');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    titleBarStyle: 'hiddenInset', // Mac style
    backgroundColor: '#000000',
  });

  if (isDev) {
    // In dev, we wait for Vite to serve
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In prod, we load the index.html
    // Note: The path depends on where electron/main.js ends up relative to dist/
    // Assuming structure:
    // root/
    //   dist/ (frontend)
    //   electron/main.js
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  const backendDist = path.join(__dirname, '../back/dist/main.js');
  
  // Check if backend dist exists
  try {
    require.resolve(backendDist);
  } catch (e) {
    console.error('Backend dist not found at:', backendDist);
    return;
  }

  console.log('Starting backend process...');
  serverProcess = fork(backendDist, [], {
    env: { 
      ...process.env, 
      PORT: '3001',
      NODE_ENV: isDev ? 'development' : 'production'
    },
    stdio: 'inherit'
  });

  serverProcess.on('message', (msg) => {
    console.log('Backend message:', msg);
  });
  
  serverProcess.on('error', (err) => {
    console.error('Backend failed:', err);
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
