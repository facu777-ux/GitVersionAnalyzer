const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class GitHubCloneService {
  constructor() {
    this.tempDir = path.join(__dirname, '../../../temp/github-clones');
    // Asegurar que el directorio temporal existe
    fs.ensureDirSync(this.tempDir);
  }

  /**
   * Clona un repositorio de GitHub y retorna la ruta local
   * @param {string} cloneUrl - URL del repositorio para clonar
   * @param {string} repoName - Nombre del repositorio
   * @param {string} accessToken - Token de acceso de GitHub (opcional)
   * @returns {Promise<{path: string, id: string}>}
   */
  async cloneRepository(cloneUrl, repoName, accessToken = null) {
    try {
      // Generar ID único para este clon
      const cloneId = uuidv4();
      const clonePath = path.join(this.tempDir, `${repoName}-${cloneId}`);

      // Si hay token, modificar la URL para incluirlo
      let authCloneUrl = cloneUrl;
      if (accessToken && cloneUrl.startsWith('https://')) {
        authCloneUrl = cloneUrl.replace('https://', `https://${accessToken}@`);
      }

      console.log(`Clonando repositorio ${repoName} en ${clonePath}...`);

      const git = simpleGit();
      await git.clone(authCloneUrl, clonePath, ['--depth', '1']);

      console.log(`✓ Repositorio clonado exitosamente: ${clonePath}`);

      return {
        path: clonePath,
        id: cloneId,
        name: repoName
      };
    } catch (error) {
      console.error('Error clonando repositorio:', error);
      throw new Error(`No se pudo clonar el repositorio: ${error.message}`);
    }
  }

  /**
   * Clona un repositorio completo (sin shallow clone)
   * @param {string} cloneUrl - URL del repositorio
   * @param {string} repoName - Nombre del repositorio
   * @param {string} accessToken - Token de acceso
   * @returns {Promise<{path: string, id: string}>}
   */
  async cloneRepositoryFull(cloneUrl, repoName, accessToken = null) {
    try {
      const cloneId = uuidv4();
      const clonePath = path.join(this.tempDir, `${repoName}-${cloneId}`);

      let authCloneUrl = cloneUrl;
      if (accessToken && cloneUrl.startsWith('https://')) {
        authCloneUrl = cloneUrl.replace('https://', `https://${accessToken}@`);
      }

      console.log(`Clonando repositorio completo ${repoName}...`);

      const git = simpleGit();
      await git.clone(authCloneUrl, clonePath);

      console.log(`✓ Repositorio completo clonado: ${clonePath}`);

      return {
        path: clonePath,
        id: cloneId,
        name: repoName
      };
    } catch (error) {
      console.error('Error clonando repositorio completo:', error);
      throw new Error(`No se pudo clonar el repositorio: ${error.message}`);
    }
  }

  /**
   * Limpia un repositorio clonado
   * @param {string} clonePath - Ruta del repositorio clonado
   */
  async cleanupClone(clonePath) {
    try {
      if (await fs.pathExists(clonePath)) {
        await fs.remove(clonePath);
        console.log(`✓ Repositorio eliminado: ${clonePath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error limpiando repositorio:', error);
      return false;
    }
  }

  /**
   * Limpia todos los repositorios clonados
   */
  async cleanupAllClones() {
    try {
      const files = await fs.readdir(this.tempDir);
      let cleaned = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        await fs.remove(filePath);
        cleaned++;
      }

      console.log(`✓ ${cleaned} repositorios limpiados`);
      return cleaned;
    } catch (error) {
      console.error('Error limpiando todos los repositorios:', error);
      return 0;
    }
  }

  /**
   * Obtiene la lista de repositorios clonados
   */
  async getClonedRepositories() {
    try {
      const files = await fs.readdir(this.tempDir);
      const repos = [];

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          repos.push({
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          });
        }
      }

      return repos;
    } catch (error) {
      console.error('Error obteniendo repositorios clonados:', error);
      return [];
    }
  }
}

module.exports = new GitHubCloneService();
