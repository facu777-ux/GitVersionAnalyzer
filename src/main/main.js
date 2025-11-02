const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Mantener referencia global de las ventanas
let mainWindow;
let loginWindow;
let currentUser = null;

// Servidor local para capturar el callback de GitHub
let callbackServer = null;

function createLoginWindow() {
  // Crear la ventana de login
  loginWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false,
    titleBarStyle: 'default',
    resizable: true,
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
  // Iniciar servidor para callback de GitHub OAuth
  startCallbackServer();
  
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
  // Cerrar servidor de callback
  if (callbackServer) {
    callbackServer.close();
    callbackServer = null;
  }
  
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

// Servidor para capturar callback de GitHub OAuth
function startCallbackServer() {
  if (callbackServer) return;
  
  callbackServer = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost:3000');
    
    // Manejar ruta /auth-success con datos del usuario
    if (url.pathname === '/auth-success') {
      const userData = url.searchParams.get('data');
      
      if (userData) {
        try {
          // Decodificar datos del usuario desde base64
          const decodedData = JSON.parse(Buffer.from(userData, 'base64').toString('utf8'));
          
          // Responder al navegador
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Autenticación exitosa</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                }
                .container {
                  text-align: center;
                  padding: 40px;
                  background: rgba(255, 255, 255, 0.1);
                  border-radius: 10px;
                  backdrop-filter: blur(10px);
                }
                h1 { margin: 0 0 20px 0; }
                p { margin: 10px 0; opacity: 0.9; }
                .checkmark {
                  font-size: 64px;
                  animation: scaleIn 0.5s ease-out;
                }
                @keyframes scaleIn {
                  from { transform: scale(0); }
                  to { transform: scale(1); }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="checkmark">✓</div>
                <h1>¡Autenticación exitosa!</h1>
                <p>Ya puedes cerrar esta ventana y volver a la aplicación.</p>
              </div>
              <script>
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
            </html>
          `);
          
          // Guardar usuario y notificar a la ventana de login
          currentUser = decodedData;
          saveUserToFile(decodedData);
          
          if (loginWindow && !loginWindow.isDestroyed()) {
            loginWindow.webContents.send('github-auth-success', decodedData);
          }
          
        } catch (error) {
          console.error('Error procesando datos de autenticación:', error);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error en la autenticación');
          
          if (loginWindow && !loginWindow.isDestroyed()) {
            loginWindow.webContents.send('github-auth-error', 'Error procesando datos');
          }
        }
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });
  
  callbackServer.listen(3000, () => {
    console.log('🔐 Servidor de callback OAuth escuchando en puerto 3000');
  });
  
  callbackServer.on('error', (error) => {
    console.error('Error en servidor de callback:', error);
  });
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

ipcMain.handle('get-access-token', async () => {
  // Retornar solo el token de acceso si el usuario está autenticado con GitHub
  if (currentUser && currentUser.accessToken) {
    return currentUser.accessToken;
  }
  return null;
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