const GitService = require('../services/GitService');
const FileExtractionService = require('../services/FileExtractionService');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');

class ProjectController {

  // Subir y analizar archivo comprimido
  static async uploadProject(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó archivo' });
      }

      const projectId = uuidv4();
      const filePath = req.file.path;
      const originalName = req.file.originalname;

      // Extraer archivo
      const extractionResult = await FileExtractionService.extractArchive(filePath, projectId);
      
      if (!extractionResult.success) {
        return res.status(400).json({ error: extractionResult.error });
      }

      // Analizar repositorio Git
      const analysisResult = await GitService.analyzeRepository(extractionResult.extractedPath);

      // Limpiar archivo temporal
      await fs.remove(filePath);

      const projectData = {
        id: projectId,
        name: path.parse(originalName).name,
        originalFile: originalName,
        path: extractionResult.extractedPath,
        createdAt: new Date().toISOString(),
        ...analysisResult
      };

      res.json({
        success: true,
        project: projectData
      });

    } catch (error) {
      console.error('Error uploading project:', error);
      res.status(500).json({ 
        error: 'Error al procesar el archivo',
        details: error.message 
      });
    }
  }

  // Analizar carpeta directamente
  static async analyzeFolder(req, res) {
    try {
      const { folderPath } = req.body;

      if (!folderPath) {
        return res.status(400).json({ error: 'Ruta de carpeta requerida' });
      }

      // Verificar que la carpeta existe
      const exists = await fs.pathExists(folderPath);
      if (!exists) {
        return res.status(404).json({ error: 'Carpeta no encontrada' });
      }

      const projectId = uuidv4();
      
      // Analizar repositorio Git
      const analysisResult = await GitService.analyzeRepository(folderPath);

      const projectData = {
        id: projectId,
        name: path.basename(folderPath),
        path: folderPath,
        createdAt: new Date().toISOString(),
        ...analysisResult
      };

      res.json({
        success: true,
        project: projectData
      });

    } catch (error) {
      console.error('Error analyzing folder:', error);
      res.status(500).json({ 
        error: 'Error al analizar la carpeta',
        details: error.message 
      });
    }
  }

  // Obtener información del proyecto
  static async getProject(req, res) {
    try {
      const { projectId } = req.params;
      
      // Aquí podrías implementar cache o base de datos
      // Por ahora retornamos datos básicos
      
      res.json({
        success: true,
        project: {
          id: projectId,
          message: 'Implementar cache/DB para persistir proyectos'
        }
      });

    } catch (error) {
      console.error('Error getting project:', error);
      res.status(500).json({ 
        error: 'Error al obtener el proyecto',
        details: error.message 
      });
    }
  }

  // Obtener commits del proyecto
  static async getCommits(req, res) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      // Implementar lógica para obtener commits paginados
      res.json({
        success: true,
        commits: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0
        },
        message: 'Implementar obtención de commits desde cache/DB'
      });

    } catch (error) {
      console.error('Error getting commits:', error);
      res.status(500).json({ 
        error: 'Error al obtener commits',
        details: error.message 
      });
    }
  }

  // Obtener estadísticas del proyecto
  static async getStats(req, res) {
    try {
      const { projectId } = req.params;

      // Implementar lógica para obtener estadísticas
      res.json({
        success: true,
        stats: {
          totalCommits: 0,
          totalBranches: 0,
          totalAuthors: 0,
          linesOfCode: 0
        },
        message: 'Implementar estadísticas desde cache/DB'
      });

    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ 
        error: 'Error al obtener estadísticas',
        details: error.message 
      });
    }
  }

  // Eliminar proyecto
  static async deleteProject(req, res) {
    try {
      const { projectId } = req.params;

      // Implementar limpieza de archivos temporales y cache
      res.json({
        success: true,
        message: 'Proyecto eliminado correctamente'
      });

    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ 
        error: 'Error al eliminar el proyecto',
        details: error.message 
      });
    }
  }
}

module.exports = ProjectController;