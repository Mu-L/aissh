const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

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

  if (!app.isPackaged) {
    // In dev, we wait for Vite to serve
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In prod, we load the index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  let backendDist;
  
  if (app.isPackaged) {
    // In production, backend is bundled in extraResources
    backendDist = path.join(process.resourcesPath, 'backend/index.js');
  } else {
    // In development
    backendDist = path.join(__dirname, '../back/dist/main.js');
  }
  
  console.log('Backend dist path:', backendDist);
  
  // Check if backend dist exists
  if (!fs.existsSync(backendDist)) {
    console.error('Backend dist not found at:', backendDist);
    // In ASAR, fs.existsSync might work differently, but Electron handles it
  }

  console.log('Starting backend process...');
  try {
    const backendRoot = path.dirname(path.dirname(backendDist));
    serverProcess = fork(backendDist, [], {
      cwd: backendRoot,
      env: { 
        ...process.env, 
        PORT: '3001',
        NODE_ENV: app.isPackaged ? 'production' : 'development'
      },
      stdio: 'inherit'
    });

    serverProcess.on('message', (msg) => {
      console.log('Backend message:', msg);
    });
    
    serverProcess.on('error', (err) => {
      console.error('Backend process error:', err);
    });

    serverProcess.on('exit', (code, signal) => {
      console.log(`Backend process exited with code ${code} and signal ${signal}`);
    });
  } catch (err) {
    console.error('Failed to fork backend process:', err);
  }
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
