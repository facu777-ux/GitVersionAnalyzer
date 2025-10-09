// Cliente API para comunicarse con el backend
class ApiClient {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
  }

  // Método genérico para hacer peticiones
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
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
    
    try {
      const response = await fetch(url, {
        method: 'POST',
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