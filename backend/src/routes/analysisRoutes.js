const express = require('express');
const AnalysisController = require('../controllers/AnalysisController');

const router = express.Router();

// Rutas de análisis
router.post('/git-repo', AnalysisController.analyzeGitRepository);
router.post('/extract-archive', AnalysisController.extractAndAnalyze);
router.get('/status/:taskId', AnalysisController.getAnalysisStatus);

module.exports = router;