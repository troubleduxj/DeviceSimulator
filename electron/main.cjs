const { app, BrowserWindow, ipcMain, net: electronNet, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const log = require('electron-log');
const fs = require('fs');
const nodeNet = require('net');

// Log configuration
log.transports.file.level = 'info';
log.info('App starting...');

let mainWindow;
let pythonProcess;
let serverPort = 0;

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = nodeNet.createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
    server.on('error', (err) => {
        reject(err);
    });
  });
}

const isDev = !app.isPackaged;

async function startPythonSubprocess() {
  try {
    serverPort = await findAvailablePort();
  } catch (e) {
    log.error('Failed to find free port', e);
    serverPort = 8000; // Fallback
  }
  log.info(`Selected port: ${serverPort}`);

  if (isDev) {
    // Development: Run python script
    // Ensure we point to run_dist.py or main.py. run_dist.py is safer as it mocks the dist env
    const script = path.join(__dirname, '../backend/run_dist.py');
    log.info('Running in Development Mode');
    
    // Check for venv python first
    let pythonExecutable = 'python';
    const venvPython = path.join(__dirname, '../backend/venv/Scripts/python.exe');
    if (fs.existsSync(venvPython)) {
        pythonExecutable = venvPython;
        log.info(`Using venv python: ${pythonExecutable}`);
    } else {
        log.info(`Using system python: ${pythonExecutable}`);
    }

    pythonProcess = spawn(pythonExecutable, [script, '--port', serverPort], {
      cwd: path.join(__dirname, '../backend'),
    });
  } else {
    // Production: Run executable
    const exePath = path.join(process.resourcesPath, 'backend/server.exe');
    log.info(`Running in Production Mode. Exe path: ${exePath}`);
    if (!fs.existsSync(exePath)) {
        log.error(`Python executable not found at: ${exePath}`);
        dialog.showErrorBox('Error', `Python executable not found at: ${exePath}`);
        return;
    }
    pythonProcess = spawn(exePath, ['--port', serverPort], {
        cwd: path.dirname(exePath)
    });
  }

  pythonProcess.stdout.on('data', (data) => {
    log.info(`[Python]: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    log.error(`[Python Error]: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    log.info(`Python process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../public/icon.png'), // Set icon
    autoHideMenuBar: true, // Hide menu bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // sometimes needed for local file fetch
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000'); 
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await startPythonSubprocess();
  
  // Health check loop
  const healthCheckUrl = `http://127.0.0.1:${serverPort}/`; 
  let retries = 20;
  
  const checkServer = () => {
      const request = electronNet.request(healthCheckUrl);
      request.on('response', (response) => {
          log.info(`Backend is ready! Status: ${response.statusCode}`);
          createWindow();
      });
      request.on('error', (error) => {
          if (retries > 0) {
              retries--;
              log.info(`Backend not ready yet, retrying... (${retries})`);
              setTimeout(checkServer, 1000);
          } else {
              log.error('Backend failed to start.');
              dialog.showErrorBox('Error', 'Failed to start backend service. Please check logs.');
              app.quit();
          }
      });
      request.end();
  };
  
  checkServer();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    if (pythonProcess) {
        log.info('Killing python process...');
        pythonProcess.kill();
    }
});

ipcMain.handle('get-server-config', () => {
    return { port: serverPort, baseUrl: `http://127.0.0.1:${serverPort}` };
});
