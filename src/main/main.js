const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Mantener referencia global de las ventanas
let mainWindow;
let loginWindow;
let currentUser = null;

function createLoginWindow() {
  // Crear la ventana de login
  loginWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false,
    titleBarStyle: 'default',
    resizable: false,
    center: true
  });

  // Cargar la pantalla de login
  loginWindow.loadFile(path.join(__dirname, '../renderer/login.html'));

  // Mostrar cuando esté listo
  loginWindow.once('ready-to-show', () => {
    loginWindow.show();
  });

  // Abrir DevTools en modo desarrollo
  if (process.argv.includes('--dev')) {
    loginWindow.webContents.openDevTools();
  }

  // Evento cuando se cierra la ventana de login
  loginWindow.on('closed', () => {
    loginWindow = null;
    // Si no hay usuario autenticado, cerrar la aplicación
    if (!currentUser) {
      app.quit();
    }
  });
}

function createMainWindow() {
  // Crear la ventana principal
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false, // No mostrar hasta que esté listo
    titleBarStyle: 'default'
  });

  // Cargar la interfaz principal
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Mostrar cuando esté listo
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Cerrar ventana de login si existe
    if (loginWindow) {
      loginWindow.close();
    }
  });

  // Abrir DevTools en modo desarrollo
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Evento cuando se cierra la ventana principal
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Este método será llamado cuando Electron haya terminado la inicialización
app.whenReady().then(() => {
  // Verificar si hay usuario guardado
  checkSavedUser().then(user => {
    if (user) {
      currentUser = user;
      createMainWindow();
    } else {
      createLoginWindow();
    }
  });
});

// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (currentUser) {
      createMainWindow();
    } else {
      createLoginWindow();
    }
  }
});

// Funciones auxiliares para manejo de usuarios
async function checkSavedUser() {
  try {
    const userDataPath = path.join(app.getPath('userData'), 'user-data.json');
    if (fs.existsSync(userDataPath)) {
      const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
      return userData;
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
  return null;
}

async function saveUserToFile(userData) {
  try {
    const userDataPath = path.join(app.getPath('userData'), 'user-data.json');
    fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
}

// IPC Handlers para autenticación
ipcMain.handle('save-user-data', async (event, userData) => {
  currentUser = userData;
  return await saveUserToFile(userData);
});

ipcMain.handle('get-user-data', async () => {
  return currentUser || await checkSavedUser();
});

ipcMain.on('user-authenticated', (event, userData) => {
  currentUser = userData;
  saveUserToFile(userData);
  createMainWindow();
});

ipcMain.handle('logout', async () => {
  try {
    const userDataPath = path.join(app.getPath('userData'), 'user-data.json');
    if (fs.existsSync(userDataPath)) {
      fs.unlinkSync(userDataPath);
    }
    currentUser = null;
    
    // Cerrar ventana principal y mostrar login
    if (mainWindow) {
      mainWindow.close();
    }
    createLoginWindow();
    
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
});

// IPC Handlers para comunicación con el renderer
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Seleccionar carpeta del proyecto'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Seleccionar archivo del proyecto',
    filters: [
      { name: 'Archivos comprimidos', extensions: ['zip', 'rar', '7z', 'tar', 'gz'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});