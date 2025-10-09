const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

// Importar rutas
const projectRoutes = require('./src/routes/projectRoutes');
const analysisRoutes = require('./src/routes/analysisRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Crear directorio temporal si no existe
const tempDir = path.join(__dirname, '../temp');
fs.ensureDirSync(tempDir);

// Rutas
app.use('/api/projects', projectRoutes);
app.use('/api/analysis', analysisRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Git Version Analyzer Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Git Version Analyzer Backend running on port ${PORT}`);
  console.log(`📊 API Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app;