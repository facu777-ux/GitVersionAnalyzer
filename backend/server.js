require('dotenv').config(); // Cargar variables de entorno

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs-extra');

// Importar rutas
const projectRoutes = require('./src/routes/projectRoutes');
const analysisRoutes = require('./src/routes/analysisRoutes');
const authRoutes = require('./src/routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

// Generador de ID de transacción único
function generateTransactionId() {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Logger estructurado mejorado
function logRequest(logData) {
  const { level, timestamp, transactionId, user, action, metadata, auth } = logData;
  
  // Determinar color según nivel
  let levelColor = colors.cyan;
  let levelIcon = 'ℹ';
  if (level === 'INFO') { levelColor = colors.green; levelIcon = '✓'; }
  if (level === 'WARN') { levelColor = colors.yellow; levelIcon = '⚠'; }
  if (level === 'ERROR') { levelColor = colors.red; levelIcon = '✗'; }
  if (level === 'DEBUG') { levelColor = colors.blue; levelIcon = '🔍'; }
  
  // Línea principal del log
  console.log('\n' + colors.gray + '─'.repeat(80) + colors.reset);
  console.log(
    `${levelColor}${levelIcon} [${level}]${colors.reset}`,
    `${colors.dim}${timestamp}${colors.reset}`,
    `${colors.cyan}[${transactionId}]${colors.reset}`
  );
  
  // Información de la acción
  console.log(
    `  ${colors.bright}${action.method}${colors.reset}`,
    `${colors.blue}${action.endpoint}${colors.reset}`
  );
  
  // Información de autenticación
  if (auth) {
    if (auth.authenticated) {
      console.log(
        `  ${colors.green}👤 Usuario:${colors.reset}`,
        `${colors.white}${auth.userId}${colors.reset}`,
        `${colors.dim}(${auth.loginType})${colors.reset}`
      );
      if (auth.sessionId) {
        console.log(`  ${colors.gray}   Session: ${auth.sessionId}${colors.reset}`);
      }
      if (auth.authMethod) {
        console.log(`  ${colors.gray}   Auth Method: ${auth.authMethod}${colors.reset}`);
      }
    } else {
      console.log(`  ${colors.yellow}⚠ Sin autenticación${colors.reset}`);
      if (auth.hasAuthHeader !== undefined) {
        console.log(`  ${colors.gray}   Authorization Header: ${auth.hasAuthHeader ? 'Presente' : 'Ausente'}${colors.reset}`);
      }
      if (auth.hasSession !== undefined) {
        console.log(`  ${colors.gray}   Session Cookie: ${auth.hasSession ? 'Presente' : 'Ausente'}${colors.reset}`);
      }
    }
  }
  
  // Usuario (si existe)
  if (user) {
    console.log(
      `  ${colors.magenta}👤 IP:${colors.reset} ${user.ip}`,
      `${colors.dim}| Role: ${user.role || 'N/A'}${colors.reset}`
    );
  }
  
  // Metadata de la petición
  if (metadata) {
    if (metadata.query && Object.keys(metadata.query).length > 0) {
      console.log(`  ${colors.cyan}📝 Query Params:${colors.reset}`, JSON.stringify(metadata.query));
    }
    if (metadata.body && Object.keys(metadata.body).length > 0) {
      console.log(`  ${colors.cyan}📦 Body:${colors.reset}`, JSON.stringify(metadata.body, null, 2));
    }
    if (metadata.userAgent) {
      console.log(`  ${colors.gray}🖥  User-Agent: ${metadata.userAgent.substring(0, 60)}...${colors.reset}`);
    }
  }
}

// Middleware de logging personalizado
app.use((req, res, next) => {
  // Generar ID de transacción
  req.transactionId = generateTransactionId();
  req.startTime = Date.now();
  
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Determinar estado de autenticación
  const hasSession = !!(req.session && req.session.user);
  const hasAuthHeader = !!(req.headers.authorization && req.headers.authorization.startsWith('Bearer '));
  
  const authInfo = {
    authenticated: hasSession,
    hasSession: hasSession,
    hasAuthHeader: hasAuthHeader,
    userId: hasSession ? (req.session.user.username || req.session.user.name) : null,
    loginType: hasSession ? req.session.user.loginType : null,
    sessionId: req.sessionID,
    authMethod: hasSession ? 'session' : (hasAuthHeader ? 'bearer-token' : 'none')
  };
  
  const logData = {
    level: 'INFO',
    timestamp: timestamp,
    transactionId: req.transactionId,
    user: {
      ip: ip,
      role: hasSession ? (req.session.user.role || 'user') : 'anonymous'
    },
    action: {
      method: req.method,
      endpoint: req.url,
      module: req.url.split('/')[2] || 'unknown'
    },
    auth: authInfo,
    metadata: {
      query: req.query,
      body: req.url.includes('/auth/') ? '[SENSITIVE DATA]' : req.body,
      userAgent: req.get('user-agent') || 'Unknown'
    }
  };
  
  logRequest(logData);
  
  next();
});

// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    // Permitir Electron (sin origin) y localhost
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('file://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'git-version-analyzer-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true solo con HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Middleware para soportar autenticación por token (desde Electron)
app.use(async (req, res, next) => {
  // Si ya hay usuario en sesión, continuar
  if (req.session && req.session.user) {
    return next();
  }

  // Verificar si hay token en el header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remover "Bearer "
    
    console.log(`  ${colors.blue}🔐 Intentando autenticación por Bearer Token...${colors.reset}`);
    console.log(`  ${colors.gray}   Token: ${token.substring(0, 20)}...${colors.reset}`);
    
    try {
      // Importar GitHubAuthService para verificar el token
      const gitHubAuthService = require('./src/services/GitHubAuthService');
      const userInfo = await gitHubAuthService.getUserInfo(token);
      
      // Crear una sesión temporal con los datos del usuario
      req.session.user = {
        ...userInfo,
        accessToken: token,
        loginType: 'github'
      };
      
      console.log(`  ${colors.green}✓ Token validado exitosamente${colors.reset}`);
      console.log(`  ${colors.green}✓ Usuario autenticado: ${userInfo.username} (${userInfo.name})${colors.reset}`);
      console.log(`  ${colors.gray}   Email: ${userInfo.email || 'N/A'}${colors.reset}`);
    } catch (error) {
      console.log(`  ${colors.red}✗ Error al validar token:${colors.reset} ${error.message}`);
      console.log(`  ${colors.yellow}⚠ Continuando sin autenticación${colors.reset}`);
    }
  } else if (!req.session || !req.session.user) {
    console.log(`  ${colors.yellow}⚠ No se encontró método de autenticación válido${colors.reset}`);
  }
  
  next();
});

// Crear directorio temporal si no existe
const tempDir = path.join(__dirname, '../temp');
fs.ensureDirSync(tempDir);

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analysis', analysisRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
  console.log(`${colors.green}✓ Health check solicitado${colors.reset}`);
  res.json({ 
    status: 'OK', 
    message: 'Git Version Analyzer Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Middleware para capturar respuestas
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    const statusCode = res.statusCode;
    const duration = Date.now() - req.startTime;
    
    let levelColor = colors.green;
    let levelIcon = '✓';
    let level = 'INFO';
    
    if (statusCode >= 400 && statusCode < 500) {
      levelColor = colors.yellow;
      levelIcon = '⚠';
      level = 'WARN';
    } else if (statusCode >= 500) {
      levelColor = colors.red;
      levelIcon = '✗';
      level = 'ERROR';
    }
    
    // Log de respuesta
    console.log(
      `  ${levelColor}${levelIcon} Response:${colors.reset}`,
      `${colors.white}${statusCode}${colors.reset}`,
      `${colors.dim}| Duration: ${duration}ms${colors.reset}`
    );
    
    // Si hay error, mostrar el mensaje
    if (statusCode >= 400) {
      try {
        const responseData = JSON.parse(data);
        if (responseData.error) {
          console.log(`  ${colors.red}❌ Error:${colors.reset} ${responseData.error}`);
        }
        if (responseData.message) {
          console.log(`  ${colors.yellow}💬 Message:${colors.reset} ${responseData.message}`);
        }
      } catch (e) {
        // Si no es JSON, ignorar
      }
    }
    
    console.log(colors.gray + '─'.repeat(80) + colors.reset);
    
    originalSend.call(this, data);
  };
  next();
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(`${colors.red}✗ ERROR:${colors.reset}`, err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}${colors.green}🚀 Git Version Analyzer Backend${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`${colors.cyan}📍 Puerto:${colors.reset} ${PORT}`);
  console.log(`${colors.cyan}🌐 URL:${colors.reset} http://localhost:${PORT}`);
  console.log(`${colors.cyan}� Health:${colors.reset} http://localhost:${PORT}/api/health`);
  console.log(`${colors.cyan}📅 Hora:${colors.reset} ${new Date().toLocaleString('es-ES')}`);
  console.log('='.repeat(60));
  console.log(`${colors.yellow}⚡ Servidor listo para recibir peticiones...${colors.reset}\n`);
});

module.exports = app;