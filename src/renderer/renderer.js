const { ipcRenderer, shell } = require('electron');
const path = require('path');

console.log('[Renderer.js] 🚀 Script cargado, buscando elementos del DOM...');

// Elementos del DOM - Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Elementos del DOM - Local
const localSection = document.getElementById('localSection');
const uploadArea = document.getElementById('uploadArea');
const selectFolderBtn = document.getElementById('selectFolderBtn');
const selectFileBtn = document.getElementById('selectFileBtn');

console.log('[Renderer.js] Elementos DOM encontrados:');
console.log('  ├─ tabButtons:', tabButtons.length);
console.log('  ├─ localSection:', !!localSection);
console.log('  ├─ uploadArea:', !!uploadArea);
console.log('  ├─ selectFolderBtn:', !!selectFolderBtn);
console.log('  └─ selectFileBtn:', !!selectFileBtn);

// Elementos del DOM - GitHub
const githubSection = document.getElementById('githubSection');
const githubTab = document.getElementById('githubTab');
const reposGrid = document.getElementById('reposGrid');
const reposLoading = document.getElementById('reposLoading');
const reposEmpty = document.getElementById('reposEmpty');
const reposError = document.getElementById('reposError');
const reposErrorMessage = document.getElementById('reposErrorMessage');
const refreshReposBtn = document.getElementById('refreshReposBtn');
const retryReposBtn = document.getElementById('retryReposBtn');
const repoSearchInput = document.getElementById('repoSearchInput');
const repoSortSelect = document.getElementById('repoSortSelect');

// Elementos del DOM - Análisis
const analysisSection = document.getElementById('analysisSection');
const loadingSection = document.getElementById('loadingSection');
const uploadSection = localSection; // uploadSection es lo mismo que localSection
const newProjectBtn = document.getElementById('newProjectBtn');
const projectName = document.getElementById('projectName');
const projectInfo = document.getElementById('projectInfo');
const commitsList = document.getElementById('commitsList');
const loadingMessage = document.getElementById('loadingMessage');

// Elementos del DOM - Usuario
const userInfo = document.getElementById('userInfo');

// Estado de la aplicación
let currentProject = null;
let currentUser = null;
let allRepositories = [];
let filteredRepositories = [];

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    console.log('[Renderer] Inicializando aplicación...');
    
    // Obtener datos del usuario autenticado
    try {
        currentUser = await ipcRenderer.invoke('get-user-data');
        console.log('[Renderer] Usuario obtenido:', currentUser);
        
        if (currentUser) {
            console.log('[Renderer] ✓ Usuario autenticado:', currentUser.username || currentUser.name);
            console.log('[Renderer] ✓ Login type:', currentUser.loginType);
            console.log('[Renderer] ✓ Access Token presente:', !!currentUser.accessToken);
            setupUserInterface();
        } else {
            console.warn('[Renderer] ⚠ No hay usuario autenticado');
        }
    } catch (error) {
        console.error('[Renderer] ✗ Error obteniendo datos del usuario:', error);
    }
    
    // Tabs - Cambio entre Local y GitHub
    console.log('[Init] Conectando event listeners para tabs...');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
    
    // Botones de selección local
    console.log('[Init] Conectando event listeners para proyectos locales...');
    console.log('[Init]   selectFolderBtn:', selectFolderBtn ? '✓ Encontrado' : '✗ NO encontrado');
    console.log('[Init]   selectFileBtn:', selectFileBtn ? '✓ Encontrado' : '✗ NO encontrado');
    
    if (selectFolderBtn) {
        selectFolderBtn.addEventListener('click', selectFolder);
        console.log('[Init]   ✓ Event listener agregado a selectFolderBtn');
    } else {
        console.error('[Init]   ✗ ERROR: selectFolderBtn no existe en el DOM!');
    }
    
    if (selectFileBtn) {
        selectFileBtn.addEventListener('click', selectFile);
        console.log('[Init]   ✓ Event listener agregado a selectFileBtn');
    } else {
        console.error('[Init]   ✗ ERROR: selectFileBtn no existe en el DOM!');
    }
    
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', resetToUpload);
        console.log('[Init]   ✓ Event listener agregado a newProjectBtn');
    }

    // Botones de GitHub
    console.log('[Init] Conectando event listeners para GitHub...');
    if (refreshReposBtn) {
        refreshReposBtn.addEventListener('click', loadGitHubRepositories);
        console.log('[Init]   ✓ Event listener agregado a refreshReposBtn');
    }
    if (retryReposBtn) {
        retryReposBtn.addEventListener('click', loadGitHubRepositories);
        console.log('[Init]   ✓ Event listener agregado a retryReposBtn');
    }
    
    // Búsqueda y filtrado de repos
    console.log('[Init] Conectando event listeners para búsqueda y filtrado...');
    if (repoSearchInput) {
        repoSearchInput.addEventListener('input', filterRepositories);
        console.log('[Init]   ✓ Event listener agregado a repoSearchInput');
    }
    if (repoSortSelect) {
        repoSortSelect.addEventListener('change', sortAndDisplayRepositories);
        console.log('[Init]   ✓ Event listener agregado a repoSortSelect');
    }

    // Drag and Drop
    console.log('[Init] Configurando Drag and Drop...');
    setupDragAndDrop();
    
    console.log('[Init] ✅ Inicialización completa\n');
    
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
    console.log('📂 Botón "Seleccionar Carpeta" clickeado');
    try {
        console.log('⏳ Invocando diálogo de selección de carpeta...');
        const folderPath = await ipcRenderer.invoke('select-folder');
        console.log('✓ Carpeta seleccionada:', folderPath);
        
        if (folderPath) {
            handleFileOrFolder(folderPath);
        } else {
            console.log('⚠ Usuario canceló la selección de carpeta');
        }
    } catch (error) {
        console.error('✗ Error selecting folder:', error);
        showError('Error al seleccionar la carpeta');
    }
}

// Seleccionar archivo
async function selectFile() {
    console.log('📄 Botón "Seleccionar Archivo" clickeado');
    try {
        console.log('⏳ Invocando diálogo de selección de archivo...');
        const filePath = await ipcRenderer.invoke('select-file');
        console.log('✓ Archivo seleccionado:', filePath);
        
        if (filePath) {
            handleFileOrFolder(filePath);
        } else {
            console.log('⚠ Usuario canceló la selección de archivo');
        }
    } catch (error) {
        console.error('✗ Error selecting file:', error);
        showError('Error al seleccionar el archivo');
    }
}

// Manejar archivo o carpeta seleccionada
async function handleFileOrFolder(itemPath) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('[handleFileOrFolder] 📦 Iniciando procesamiento de proyecto local');
    console.log('[handleFileOrFolder] 📍 Ruta:', itemPath);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    showLoading();
    
    try {
        updateLoadingMessage('Verificando conexión con el backend...');
        console.log('[handleFileOrFolder] 🔍 Verificando conexión con backend...');
        
        // Verificar que el backend esté disponible
        const backendAvailable = await checkBackendConnection();
        console.log('[handleFileOrFolder] Backend disponible:', backendAvailable);
        
        if (!backendAvailable) {
            throw new Error('Backend no disponible. Asegúrate de que el servidor esté ejecutándose en http://localhost:3001');
        }

        updateLoadingMessage('Verificando el proyecto...');
        console.log('[handleFileOrFolder] ✓ Backend conectado, verificando tipo de archivo...');
        
        // Determinar si es archivo o carpeta
        const fs = require('fs');
        const stats = fs.statSync(itemPath);
        console.log('[handleFileOrFolder] 📊 Estadísticas del archivo:');
        console.log('  ├─ Es directorio:', stats.isDirectory());
        console.log('  ├─ Es archivo:', stats.isFile());
        console.log('  └─ Tamaño:', stats.size, 'bytes');
        
        let result;
        if (stats.isDirectory()) {
            console.log('[handleFileOrFolder] 📂 Procesando como DIRECTORIO (repositorio Git)');
            updateLoadingMessage('Analizando repositorio Git...');
            console.log('[handleFileOrFolder] → Llamando a apiClient.analyzeFolder()...');
            result = await window.apiClient.analyzeFolder(itemPath);
            console.log('[handleFileOrFolder] ← Respuesta recibida:', result);
        } else {
            console.log('[handleFileOrFolder] 📄 Procesando como ARCHIVO comprimido');
            updateLoadingMessage('Subiendo y extrayendo archivo...');
            
            // Para archivos, necesitamos crear un objeto File
            console.log('[handleFileOrFolder] 📖 Leyendo archivo del sistema...');
            const fileBuffer = fs.readFileSync(itemPath);
            const fileName = require('path').basename(itemPath);
            console.log('[handleFileOrFolder] 📝 Archivo leído:');
            console.log('  ├─ Nombre:', fileName);
            console.log('  ├─ Tamaño buffer:', fileBuffer.length, 'bytes');
            console.log('  └─ Tipo:', typeof fileBuffer);
            
            console.log('[handleFileOrFolder] 🔨 Creando objeto File...');
            const file = new File([fileBuffer], fileName);
            console.log('[handleFileOrFolder] ✓ File creado:', file.name, '|', file.size, 'bytes');
            
            console.log('[handleFileOrFolder] → Llamando a apiClient.uploadProject()...');
            result = await window.apiClient.uploadProject(file);
            console.log('[handleFileOrFolder] ← Respuesta recibida:', result);
        }
        
        console.log('[handleFileOrFolder] 🎯 Resultado del análisis:');
        console.log('  ├─ Success:', result.success);
        console.log('  ├─ Error:', result.error || 'ninguno');
        console.log('  └─ Project ID:', result.project?.id || 'N/A');
        
        if (result.success) {
            console.log('[handleFileOrFolder] ✅ Análisis exitoso, mostrando resultados...');
            showAnalysis(result.project);
        } else {
            throw new Error(result.error || 'Error desconocido en el análisis');
        }
        
        console.log('[handleFileOrFolder] ✓ Procesamiento completado exitosamente\n');
        
    } catch (error) {
        console.error('[handleFileOrFolder] ❌ ERROR en procesamiento:', error);
        console.error('[handleFileOrFolder] Stack trace:', error.stack);
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
    console.log('[showSection] Cambiando a sección:', section);
    
    // Ocultar todas las secciones de contenido
    localSection.style.display = 'none';
    githubSection.style.display = 'none';
    analysisSection.style.display = 'none';
    loadingSection.style.display = 'none';
    
    // Mostrar la sección solicitada
    switch(section) {
        case 'upload':
        case 'local':
            localSection.style.display = 'block';
            break;
        case 'github':
            githubSection.style.display = 'block';
            break;
        case 'analysis':
            analysisSection.style.display = 'block';
            break;
        case 'loading':
            loadingSection.style.display = 'flex';
            break;
        default:
            console.warn('[showSection] Sección desconocida:', section);
            localSection.style.display = 'block';
    }
}

function showLoading() {
    console.log('[showLoading] Mostrando pantalla de carga...');
    showSection('loading');
}

function resetToUpload() {
    console.log('[resetToUpload] Volviendo a la pantalla de upload...');
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

// ========================================
// FUNCIONES PARA TABS Y USUARIO
// ========================================

function switchTab(tabName) {
    // Actualizar botones activos
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Actualizar contenido activo
    tabContents.forEach(content => {
        if (content.dataset.content === tabName) {
            content.classList.add('active');
            content.style.display = 'block';
        } else {
            content.classList.remove('active');
            content.style.display = 'none';
        }
    });
    
    // Si se cambia a la pestaña de GitHub, cargar repositorios
    if (tabName === 'github' && allRepositories.length === 0) {
        loadGitHubRepositories();
    }
}

function setupUserInterface() {
    if (!currentUser) return;
    
    // Mostrar información del usuario en el header
    const userInfoHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            ${currentUser.avatar ? `
                <img src="${currentUser.avatar}" alt="${currentUser.name}" class="user-avatar" />
            ` : ''}
            <div class="user-details">
                <div class="user-name">${currentUser.name || currentUser.username || 'Usuario'}</div>
                <div class="user-type">${getUserTypeLabel(currentUser.accessType || currentUser.loginType)}</div>
            </div>
            <button class="logout-btn" onclick="handleLogout()">Cerrar sesión</button>
        </div>
    `;
    
    userInfo.innerHTML = userInfoHTML;
    
    // Habilitar o deshabilitar tab de GitHub según el tipo de usuario
    if (currentUser.accessType === 'github' || currentUser.loginType === 'github') {
        githubTab.disabled = false;
        githubTab.style.opacity = '1';
        githubTab.style.cursor = 'pointer';
    } else {
        githubTab.disabled = true;
        githubTab.style.opacity = '0.5';
        githubTab.style.cursor = 'not-allowed';
        githubTab.title = 'Inicia sesión con GitHub para acceder a tus repositorios';
    }
}

function getUserTypeLabel(type) {
    const labels = {
        'github': '🐙 GitHub',
        'manual': '✏️ Manual',
        'guest': '👤 Invitado'
    };
    return labels[type] || '👤 Usuario';
}

async function handleLogout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        try {
            await ipcRenderer.invoke('logout');
            // La ventana de login se abrirá automáticamente desde el proceso principal
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            showError('Error al cerrar sesión');
        }
    }
}

// ========================================
// FUNCIONES PARA GITHUB REPOSITORIES
// ========================================

async function loadGitHubRepositories() {
    console.log('[loadGitHubRepositories] Iniciando carga de repositorios...');
    
    // Verificar que el usuario esté autenticado con GitHub
    if (!currentUser || (currentUser.accessType !== 'github' && currentUser.loginType !== 'github')) {
        console.warn('[loadGitHubRepositories] Usuario no autenticado con GitHub');
        showReposError('Debes iniciar sesión con GitHub para ver tus repositorios');
        return;
    }
    
    console.log('[loadGitHubRepositories] ✓ Usuario autenticado con GitHub:', currentUser.username || currentUser.name);
    
    // Mostrar loading
    showReposLoading();
    
    try {
        console.log('[loadGitHubRepositories] Llamando a API /api/auth/repositories...');
        
        // Usar apiClient que automáticamente agrega el token
        const repositories = await window.apiClient.request('/api/auth/repositories', {
            method: 'GET'
        });
        
        console.log('[loadGitHubRepositories] ✓ Repositorios recibidos:', repositories.length);
        
        allRepositories = repositories;
        filteredRepositories = repositories;
        
        if (repositories.length === 0) {
            showReposEmpty();
        } else {
            sortAndDisplayRepositories();
        }
        
    } catch (error) {
        console.error('[loadGitHubRepositories] ✗ Error cargando repositorios:', error);
        showReposError('No se pudieron cargar los repositorios. Verifica tu conexión con el backend.');
    }
}

function showReposLoading() {
    reposGrid.style.display = 'none';
    reposEmpty.style.display = 'none';
    reposError.style.display = 'none';
    reposLoading.style.display = 'block';
}

function showReposEmpty() {
    reposGrid.style.display = 'none';
    reposLoading.style.display = 'none';
    reposError.style.display = 'none';
    reposEmpty.style.display = 'block';
}

function showReposError(message) {
    reposGrid.style.display = 'none';
    reposLoading.style.display = 'none';
    reposEmpty.style.display = 'none';
    reposError.style.display = 'block';
    reposErrorMessage.textContent = message;
}

function showReposGrid() {
    reposLoading.style.display = 'none';
    reposEmpty.style.display = 'none';
    reposError.style.display = 'none';
    reposGrid.style.display = 'grid';
}

function filterRepositories() {
    const searchTerm = repoSearchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredRepositories = allRepositories;
    } else {
        filteredRepositories = allRepositories.filter(repo => {
            return repo.name.toLowerCase().includes(searchTerm) ||
                   (repo.description && repo.description.toLowerCase().includes(searchTerm)) ||
                   (repo.language && repo.language.toLowerCase().includes(searchTerm));
        });
    }
    
    sortAndDisplayRepositories();
}

function sortAndDisplayRepositories() {
    const sortBy = repoSortSelect.value;
    
    // Ordenar repositorios
    const sorted = [...filteredRepositories].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'stars':
                return b.stars - a.stars;
            case 'updated':
            default:
                return new Date(b.updatedAt) - new Date(a.updatedAt);
        }
    });
    
    displayRepositories(sorted);
}

function displayRepositories(repositories) {
    if (repositories.length === 0) {
        showReposEmpty();
        return;
    }
    
    showReposGrid();
    
    reposGrid.innerHTML = repositories.map(repo => `
        <div class="repo-card" data-repo-url="${repo.cloneUrl}" data-repo-name="${repo.name}" data-repo-owner="${repo.fullName.split('/')[0]}">
            <div class="repo-card-header">
                <div>
                    <h4 class="repo-name">
                        📦 ${repo.name}
                    </h4>
                    ${repo.private ? '<span class="repo-visibility">🔒 Privado</span>' : '<span class="repo-visibility">🌍 Público</span>'}
                </div>
            </div>
            
            ${repo.description ? `
                <p class="repo-description">${repo.description}</p>
            ` : ''}
            
            <div class="repo-stats">
                ${repo.language ? `
                    <div class="repo-stat repo-language">
                        <span class="language-dot" style="background: ${getLanguageColor(repo.language)}"></span>
                        ${repo.language}
                    </div>
                ` : ''}
                <div class="repo-stat">⭐ ${repo.stars}</div>
                <div class="repo-stat">🍴 ${repo.forks}</div>
                ${repo.openIssues > 0 ? `<div class="repo-stat">🐛 ${repo.openIssues}</div>` : ''}
            </div>
            
            <div class="repo-footer">
                <span class="repo-updated">Actualizado ${formatDate(repo.updatedAt)}</span>
                <div class="repo-actions">
                    <button class="repo-action-btn" onclick="viewRepoOnGitHub('${repo.url}')">
                        Ver en GitHub
                    </button>
                    <button class="repo-action-btn" onclick="analyzeGitHubRepo('${repo.fullName}', '${repo.cloneUrl}', '${repo.name}')">
                        Analizar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function getLanguageColor(language) {
    const colors = {
        'JavaScript': '#f1e05a',
        'TypeScript': '#2b7489',
        'Python': '#3572A5',
        'Java': '#b07219',
        'C': '#555555',
        'C++': '#f34b7d',
        'C#': '#178600',
        'Go': '#00ADD8',
        'Rust': '#dea584',
        'Ruby': '#701516',
        'PHP': '#4F5D95',
        'Swift': '#ffac45',
        'Kotlin': '#F18E33',
        'HTML': '#e34c26',
        'CSS': '#563d7c',
        'Vue': '#41b883',
        'React': '#61dafb'
    };
    return colors[language] || '#0070f3';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'hoy';
    if (diffDays === 1) return 'ayer';
    if (diffDays < 7) return `hace ${diffDays} días`;
    if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`;
    if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)} meses`;
    return `hace ${Math.floor(diffDays / 365)} años`;
}

function viewRepoOnGitHub(url) {
    shell.openExternal(url);
}

async function analyzeGitHubRepo(fullName, cloneUrl, repoName) {
    if (confirm(`¿Deseas analizar el repositorio "${repoName}"?\n\nSe clonará temporalmente para su análisis.`)) {
        showLoading();
        updateLoadingMessage('Clonando repositorio desde GitHub...');
        
        try {
            // Llamar al endpoint para clonar y analizar
            const response = await fetch('http://localhost:3001/api/auth/repository/clone-and-analyze', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cloneUrl: cloneUrl,
                    repoName: repoName,
                    fullClone: false // Clon superficial para análisis rápido
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            updateLoadingMessage('Analizando repositorio...');
            const analysisData = await response.json();
            
            // Guardar el proyecto actual
            currentProject = {
                ...analysisData,
                name: repoName,
                source: 'github'
            };
            
            // Actualizar UI con los resultados
            projectName.textContent = `📦 ${repoName}`;
            updateProjectInfo(analysisData);
            
            if (analysisData.commits && analysisData.commits.length > 0) {
                updateCommitsList(analysisData.commits);
            }
            
            showSection('analysis');
            
        } catch (error) {
            console.error('Error analizando repositorio:', error);
            showError('Error al analizar el repositorio de GitHub: ' + error.message);
            resetToUpload();
        }
    }
}

// Hacer funciones globales para los eventos onclick del HTML
window.viewRepoOnGitHub = viewRepoOnGitHub;
window.analyzeGitHubRepo = analyzeGitHubRepo;
window.handleLogout = handleLogout;