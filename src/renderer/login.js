const { ipcRenderer } = require('electron');

// Elementos del DOM
const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');
const guestAccessBtn = document.getElementById('guestAccess');
const githubLoginBtn = document.getElementById('githubLogin');
const githubRegisterBtn = document.getElementById('githubRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Event Listeners para el toggle de formularios
registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// Event Listeners para acceso de GitHub
githubLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleGitHubLogin();
});

githubRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleGitHubLogin();
});

// Event Listener para acceso de invitado
guestAccessBtn.addEventListener('click', () => {
    handleGuestAccess();
});

// Event Listeners para formularios
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleManualLogin();
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleManualRegister();
});

// Función para manejar login con GitHub
async function handleGitHubLogin() {
    try {
        showLoading('Conectando con GitHub...');
        
        // Obtener URL de autenticación del backend
        const response = await fetch('http://localhost:3001/api/auth/github', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error al obtener URL de autenticación');
        }
        
        const data = await response.json();
        
        // Abrir URL de autenticación en el navegador externo
        require('electron').shell.openExternal(data.url);
        
        // Mostrar mensaje al usuario
        hideLoading();
        showInfo('Se ha abierto el navegador para autenticarte con GitHub. Una vez autorizado, volverás a la aplicación.');
        
        // Escuchar el evento de autenticación exitosa desde el proceso principal
        ipcRenderer.once('github-auth-success', (event, userData) => {
            console.log('Autenticación exitosa:', userData);
            proceedToMainApp(userData);
        });
        
        ipcRenderer.once('github-auth-error', (event, error) => {
            console.error('Error de autenticación:', error);
            showError('Error al autenticar con GitHub: ' + error);
        });
        
    } catch (error) {
        console.error('Error en autenticación GitHub:', error);
        hideLoading();
        showError('Error al conectar con GitHub. Intenta de nuevo.');
    }
}

// Función para manejar acceso como invitado
function handleGuestAccess() {
    const userData = {
        name: 'Usuario Invitado',
        email: '',
        githubUsername: '',
        avatarUrl: '',
        accessType: 'guest'
    };
    
    // Proceder a la aplicación principal
    proceedToMainApp(userData);
}

// Función para manejar login manual
async function handleManualLogin() {
    const email = document.getElementById('loginEmail').value;
    const github = document.getElementById('loginGithub').value;
    
    if (!email && !github) {
        showError('Por favor, proporciona al menos un email o usuario de GitHub');
        return;
    }
    
    const userData = {
        name: github || email.split('@')[0],
        email: email,
        githubUsername: github,
        avatarUrl: '',
        accessType: 'manual'
    };
    
    // Guardar datos del usuario
    await saveUserData(userData);
    
    // Proceder a la aplicación principal
    proceedToMainApp(userData);
}

// Función para manejar registro manual
async function handleManualRegister() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const github = document.getElementById('registerGithub').value;
    
    if (!name || !email) {
        showError('Por favor, completa todos los campos obligatorios');
        return;
    }
    
    const userData = {
        name: name,
        email: email,
        githubUsername: github || '',
        avatarUrl: '',
        accessType: 'manual'
    };
    
    // Guardar datos del usuario
    await saveUserData(userData);
    
    // Proceder a la aplicación principal
    proceedToMainApp(userData);
}

// Función para simular autenticación con GitHub (mock)
async function simulateGitHubAuth() {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Datos simulados de usuario de GitHub
            resolve({
                name: 'Desarrollador GitHub',
                email: 'developer@github.com',
                login: 'github-user',
                avatar_url: 'https://github.com/identicons/user.png'
            });
        }, 2000);
    });
}

// Función para guardar datos del usuario
async function saveUserData(userData) {
    try {
        // Enviar datos al proceso principal de Electron
        await ipcRenderer.invoke('save-user-data', userData);
        console.log('Datos de usuario guardados:', userData);
    } catch (error) {
        console.error('Error guardando datos del usuario:', error);
    }
}

// Función para proceder a la aplicación principal
function proceedToMainApp(userData) {
    // Enviar datos del usuario al proceso principal
    ipcRenderer.send('user-authenticated', userData);
    
    // Redirigir a la aplicación principal
    window.location.href = 'index.html';
}

// Función para mostrar loading
function showLoading(message) {
    // Crear overlay de loading
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        font-size: 1.2rem;
    `;
    
    loadingOverlay.innerHTML = `
        <div style="text-align: center;">
            <div style="margin-bottom: 20px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
            </div>
            <div>${message}</div>
        </div>
    `;
    
    document.body.appendChild(loadingOverlay);
}

// Función para ocultar loading
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// Función para mostrar información
function showInfo(message) {
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3498db;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        max-width: 400px;
    `;
    infoDiv.textContent = message;
    
    document.body.appendChild(infoDiv);
    
    setTimeout(() => {
        infoDiv.remove();
    }, 10000);
}

// Función para mostrar errores
function showError(message) {
    // Crear elemento de error
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Remover error después de 5 segundos
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('Login screen initialized');
    
    // Verificar si ya hay un usuario autenticado
    checkExistingAuth();
});

// Función para verificar autenticación existente
async function checkExistingAuth() {
    try {
        const existingUser = await ipcRenderer.invoke('get-user-data');
        if (existingUser) {
            // Si ya hay un usuario autenticado, ir directamente a la app
            proceedToMainApp(existingUser);
        }
    } catch (error) {
        console.log('No hay usuario autenticado previamente');
    }
}