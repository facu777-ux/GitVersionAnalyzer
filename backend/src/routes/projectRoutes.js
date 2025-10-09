const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ProjectController = require('../controllers/ProjectController');

const router = express.Router();

// Configuración de multer para uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../temp'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB límite
  },
  fileFilter: (req, file, cb) => {
    // Validar tipos de archivo según README
    const allowedExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no soportado'), false);
    }
  }
});

// Rutas de proyectos
router.post('/upload', upload.single('projectFile'), ProjectController.uploadProject);
router.post('/analyze-folder', ProjectController.analyzeFolder);
router.get('/:projectId', ProjectController.getProject);
router.get('/:projectId/commits', ProjectController.getCommits);
router.get('/:projectId/stats', ProjectController.getStats);
router.delete('/:projectId', ProjectController.deleteProject);

module.exports = router;