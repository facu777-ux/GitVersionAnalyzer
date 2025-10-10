const { ipcRenderer } = require('electron');
const path = require('path');

// Elementos del DOM
const uploadSection = document.getElementById('uploadSection');
const analysisSection = document.getElementById('analysisSection');
const loadingSection = document.getElementById('loadingSection');
const uploadArea = document.getElementById('uploadArea');
const selectFolderBtn = document.getElementById('selectFolderBtn');
const selectFileBtn = document.getElementById('selectFileBtn');
const newProjectBtn = document.getElementById('newProjectBtn');
const projectName = document.getElementById('projectName');
const projectInfo = document.getElementById('projectInfo');
const commitsList = document.getElementById('commitsList');
const loadingMessage = document.getElementById('loadingMessage');

// Estado de la aplicación
let currentProject = null;
let currentUser = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Obtener datos del usuario autenticado
    try {
        currentUser = await ipcRenderer.invoke('get-user-data');
        if (currentUser) {
            setupUserInterface();
        }
    } catch (error) {
        console.error('Error obteniendo datos del usuario:', error);
    }
    
    // Botones de selección
    selectFolderBtn.addEventListener('click', selectFolder);
    selectFileBtn.addEventListener('click', selectFile);
    newProjectBtn.addEventListener('click', resetToUpload);

    // Drag and Drop
    setupDragAndDrop();
    
    // Verificar conexión con backend al inicializar
    checkBackendStatus().then(connected => {
        if (!connected) {
            showError('⚠️ Backend no disponible. Asegúrate de ejecutar el servidor backend en http://localhost:3001');
        }
    });
}

// Configurar interfaz de usuario
function setupUserInterface() {
    if (!currentUser) return;
    
    // Crear elemento de información del usuario en el header
    const header = document.querySelector('.app-header');
    if (header && !document.getElementById('userInfo')) {
        const userInfo = document.createElement('div');
        userInfo.id = 'userInfo';
        userInfo.innerHTML = `
            <div class="user-info">
                <div class="user-details">
                    <span class="user-name">👤 ${currentUser.name}</span>
                    ${currentUser.githubUsername ? `<span class="github-user">🐙 ${currentUser.githubUsername}</span>` : ''}
                    <span class="access-type">${getAccessTypeLabel(currentUser.accessType)}</span>
                </div>
                <button class="logout-btn" onclick="handleLogout()">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </button>
            </div>
        `;
        
        // Agregar estilos para la información del usuario
        if (!document.getElementById('userStyles')) {
            const style = document.createElement('style');
            style.id = 'userStyles';
            style.textContent = `
                .user-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 10px 20px;
                    border-radius: 10px;
                    margin-top: 20px;
                    backdrop-filter: blur(10px);
                }
                .user-details {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .user-name, .github-user, .access-type {
                    font-size: 0.9rem;
                    color: rgba(255, 255, 255, 0.9);
                }
                .access-type {
                    font-size: 0.8rem;
                    opacity: 0.7;
                }
                .logout-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 8px 15px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all 0.3s ease;
                }
                .logout-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `;
            document.head.appendChild(style);
        }
        
        header.appendChild(userInfo);
    }
}

function getAccessTypeLabel(accessType) {
    switch (accessType) {
        case 'github': return '🔗 Conectado con GitHub';
        case 'manual': return '📝 Registro Manual';
        case 'guest': return '👻 Usuario Invitado';
        default: return '';
    }
}

// Función para cerrar sesión
window.handleLogout = async function() {
    try {
        const success = await ipcRenderer.invoke('logout');
        if (success) {
            console.log('Sesión cerrada exitosamente');
        }
    } catch (error) {
        console.error('Error cerrando sesión:', error);
    }
}

// Configurar Drag and Drop
function setupDragAndDrop() {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const file = files[0];
            if (file.type || file.size === 0) { // Es un archivo o carpeta
                handleFileOrFolder(file.path);
            }
        }
    });
}

// Seleccionar carpeta
async function selectFolder() {
    try {
        const folderPath = await ipcRenderer.invoke('select-folder');
        if (folderPath) {
            handleFileOrFolder(folderPath);
        }
    } catch (error) {
        console.error('Error selecting folder:', error);
        showError('Error al seleccionar la carpeta');
    }
}

// Seleccionar archivo
async function selectFile() {
    try {
        const filePath = await ipcRenderer.invoke('select-file');
        if (filePath) {
            handleFileOrFolder(filePath);
        }
    } catch (error) {
        console.error('Error selecting file:', error);
        showError('Error al seleccionar el archivo');
    }
}

// Manejar archivo o carpeta seleccionada
async function handleFileOrFolder(itemPath) {
    showLoading();
    
    try {
        updateLoadingMessage('Verificando conexión con el backend...');
        
        // Verificar que el backend esté disponible
        const backendAvailable = await checkBackendConnection();
        if (!backendAvailable) {
            throw new Error('Backend no disponible. Asegúrate de que el servidor esté ejecutándose en http://localhost:3001');
        }

        updateLoadingMessage('Verificando el proyecto...');
        
        // Determinar si es archivo o carpeta
        const fs = require('fs');
        const stats = fs.statSync(itemPath);
        
        let result;
        if (stats.isDirectory()) {
            updateLoadingMessage('Analizando repositorio Git...');
            result = await window.apiClient.analyzeFolder(itemPath);
        } else {
            updateLoadingMessage('Subiendo y extrayendo archivo...');
            // Para archivos, necesitamos crear un objeto File
            const fileBuffer = fs.readFileSync(itemPath);
            const fileName = require('path').basename(itemPath);
            const file = new File([fileBuffer], fileName);
            result = await window.apiClient.uploadProject(file);
        }
        
        if (result.success) {
            showAnalysis(result.project);
        } else {
            throw new Error(result.error || 'Error desconocido en el análisis');
        }
        
    } catch (error) {
        console.error('Error processing item:', error);
        showError('Error al procesar el proyecto: ' + error.message);
        resetToUpload();
    }
}

// Simular análisis (temporal)
// Verificar estado de conexión con el backend
async function checkBackendStatus() {
    try {
        const health = await window.apiClient.healthCheck();
        console.log('Backend conectado:', health);
        return true;
    } catch (error) {
        console.error('Backend desconectado:', error);
        return false;
    }
}

// Mostrar análisis
function showAnalysis(data) {
    currentProject = data;
    
    // Actualizar nombre del proyecto
    projectName.textContent = data.name;
    
    // Actualizar información del proyecto
    updateProjectInfo(data);
    
    // Actualizar lista de commits
    updateCommitsList(data.commits);
    
    // Mostrar sección de análisis
    showSection('analysis');
}

// Actualizar información del proyecto
function updateProjectInfo(data) {
    const isGitRepo = data.isGitRepository;
    
    if (isGitRepo) {
        // Proyecto con repositorio Git válido
        projectInfo.innerHTML = `
            <div class="info-item">
                <span class="info-label">Ruta:</span>
                <span class="info-value">${data.path}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Total de Commits:</span>
                <span class="info-value">${data.totalCommits || 0}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Rama Actual:</span>
                <span class="info-value">${data.branches?.current || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Total de Ramas:</span>
                <span class="info-value">${data.branches?.total || 0}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Último Análisis:</span>
                <span class="info-value">${new Date(data.lastAnalyzed).toLocaleString()}</span>
            </div>
            ${data.stats ? `
            <div class="info-item">
                <span class="info-label">Autores:</span>
                <span class="info-value">${data.stats.totalAuthors}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Archivos:</span>
                <span class="info-value">${data.stats.totalFiles}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Líneas de Código:</span>
                <span class="info-value">${data.stats.linesOfCode}</span>
            </div>
            ` : ''}
        `;
    } else {
        // Proyecto sin repositorio Git
        projectInfo.innerHTML = `
            <div class="info-item">
                <span class="info-label">Estado:</span>
                <span class="info-value">❌ No es un repositorio Git válido</span>
            </div>
            <div class="info-item">
                <span class="info-label">Ruta:</span>
                <span class="info-value">${data.path}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Mensaje:</span>
                <span class="info-value">${data.message || data.error}</span>
            </div>
            ${data.hasSubRepositories ? `
            <div class="info-item">
                <span class="info-label">Sub-repositorios encontrados:</span>
                <span class="info-value">${data.subRepositories.length}</span>
            </div>
            ` : ''}
        `;
    }
}

// Actualizar lista de commits
function updateCommitsList(commits) {
    if (!commits || commits.length === 0) {
        commitsList.innerHTML = `
            <div class="no-commits">
                <p>No se encontraron commits en este proyecto</p>
            </div>
        `;
        return;
    }

    commitsList.innerHTML = commits.map(commit => `
        <div class="commit-item">
            <div class="commit-hash">${commit.shortHash || commit.hash?.substring(0, 7)}</div>
            <div class="commit-message">${commit.message}</div>
            <div class="commit-meta">
                <span>👤 ${commit.author?.name || commit.author}</span>
                <span>📅 ${new Date(commit.date).toLocaleDateString()}</span>
                <span>📄 ${commit.files?.total || commit.files || 0} archivos</span>
                ${commit.files?.insertions ? `<span>➕ ${commit.files.insertions}</span>` : ''}
                ${commit.files?.deletions ? `<span>➖ ${commit.files.deletions}</span>` : ''}
            </div>
        </div>
    `).join('');
}

// Utilidades de UI
function showSection(section) {
    uploadSection.style.display = section === 'upload' ? 'block' : 'none';
    analysisSection.style.display = section === 'analysis' ? 'block' : 'none';
    loadingSection.style.display = section === 'loading' ? 'flex' : 'none';
}

function showLoading() {
    showSection('loading');
}

function resetToUpload() {
    currentProject = null;
    showSection('upload');
}

function updateLoadingMessage(message) {
    loadingMessage.textContent = message;
}

function showError(message) {
    alert(message); // Temporal, luego implementaremos un modal mejor
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}