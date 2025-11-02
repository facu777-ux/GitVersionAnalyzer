// Cliente API para comunicarse con el backend
class ApiClient {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.accessToken = null;
    
    // Intentar obtener ipcRenderer si está disponible (entorno Electron)
    try {
      const { ipcRenderer } = require('electron');
      this.ipcRenderer = ipcRenderer;
    } catch (e) {
      // No estamos en Electron, ipcRenderer no disponible
      this.ipcRenderer = null;
    }
  }

  // Obtener token desde el proceso principal de Electron
  async getAccessToken() {
    if (!this.accessToken && this.ipcRenderer) {
      try {
        this.accessToken = await this.ipcRenderer.invoke('get-access-token');
        console.log('[ApiClient] Token obtenido desde proceso principal:', this.accessToken ? '✓ Token presente' : '✗ Token no disponible');
      } catch (error) {
        console.error('[ApiClient] Error al obtener token:', error);
      }
    }
    return this.accessToken;
  }

  // Método genérico para hacer peticiones
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Obtener token de acceso si está disponible
    const token = await this.getAccessToken();
    
    const config = {
      credentials: 'include', // ← IMPORTANTE: Enviar cookies de sesión
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Si hay token, agregarlo al header de Authorization
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log(`[ApiClient] ✓ Token agregado al header Authorization para ${endpoint}`);
      console.log(`[ApiClient]   Token (primeros 20 chars): ${token.substring(0, 20)}...`);
    } else {
      console.warn(`[ApiClient] ⚠ No hay token disponible para ${endpoint}`);
    }

    console.log(`[ApiClient] → ${options.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, config);
      
      console.log(`[ApiClient] ← ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('[ApiClient] ✗ API request failed:', error);
      throw error;
    }
  }

  // Verificar estado del backend
  async healthCheck() {
    return this.request('/api/health');
  }

  // Analizar carpeta
  async analyzeFolder(folderPath) {
    return this.request('/api/projects/analyze-folder', {
      method: 'POST',
      body: JSON.stringify({ folderPath })
    });
  }

  // Subir y analizar archivo comprimido
  async uploadProject(file) {
    const formData = new FormData();
    formData.append('projectFile', file);

    const url = `${this.baseURL}/api/projects/upload`;
    
    // Obtener token de acceso si está disponible
    const token = await this.getAccessToken();
    
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include', // ← Enviar cookies
        headers: headers,
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  // Obtener commits de un proyecto
  async getCommits(projectId, page = 1, limit = 50) {
    return this.request(`/api/projects/${projectId}/commits?page=${page}&limit=${limit}`);
  }

  // Obtener estadísticas de un proyecto
  async getStats(projectId) {
    return this.request(`/api/projects/${projectId}/stats`);
  }

  // Obtener información de un proyecto
  async getProject(projectId) {
    return this.request(`/api/projects/${projectId}`);
  }

  // Eliminar proyecto
  async deleteProject(projectId) {
    return this.request(`/api/projects/${projectId}`, {
      method: 'DELETE'
    });
  }
}

// Exportar instancia global
window.apiClient = new ApiClient();

// Función auxiliar para verificar conexión con backend
async function checkBackendConnection() {
  try {
    await window.apiClient.healthCheck();
    return true;
  } catch (error) {
    console.error('Backend no disponible:', error);
    return false;
  }
}