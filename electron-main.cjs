const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Usa path.join de forma mais segura para Windows
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  mainWindow.loadFile(indexPath).catch(err => {
    console.error("Erro ao carregar arquivo:", err);
  });
  
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Evita múltiplas instâncias abertas que travam o Windows
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

  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
