const express = require('express');
const router = express.Router();
const gitHubAuthService = require('../services/GitHubAuthService');
const gitHubCloneService = require('../services/GitHubCloneService');
const gitService = require('../services/GitService');

/**
 * GET /api/auth/github
 * Inicia el flujo de autenticación con GitHub
 */
router.get('/github', (req, res) => {
  try {
    console.log('🔐 Iniciando flujo de autenticación con GitHub...');
    const authUrl = gitHubAuthService.getAuthorizationUrl();
    console.log('✓ URL de autorización generada correctamente');
    res.json({ url: authUrl });
  } catch (error) {
    console.error('✗ Error al generar URL de autenticación:', error);
    res.status(500).json({ error: 'Error al iniciar autenticación con GitHub' });
  }
});

/**
 * GET /api/auth/github/callback
 * Callback de GitHub después de la autorización
 */
router.get('/github/callback', async (req, res) => {
  const { code, error } = req.query;

  console.log('🔄 Callback de GitHub recibido');

  // Si el usuario canceló o hubo un error
  if (error) {
    console.log('✗ Usuario canceló o error en autorización:', error);
    return res.redirect(`http://localhost:3000/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    console.log('✗ No se recibió código de autorización');
    return res.redirect('http://localhost:3000/login?error=no_code');
  }

  try {
    console.log('🔑 Intercambiando código por token de acceso...');
    // Intercambiar código por token de acceso
    const accessToken = await gitHubAuthService.getAccessToken(code);
    console.log('✓ Token de acceso obtenido');

    console.log('👤 Obteniendo información del usuario...');
    // Obtener información del usuario
    const userInfo = await gitHubAuthService.getUserInfo(accessToken);
    console.log(`✓ Usuario autenticado: ${userInfo.username} (${userInfo.name})`);

    // Guardar en sesión
    req.session.user = {
      ...userInfo,
      accessToken: accessToken,
      loginType: 'github',
    };

    console.log('✓ Sesión de usuario creada correctamente');
    console.log('↪ Redirigiendo a Electron...');

    // Redirigir a la aplicación con éxito
    // Codificamos los datos del usuario en base64 para pasarlos a Electron
    const userData = Buffer.from(JSON.stringify(req.session.user)).toString('base64');
    res.redirect(`http://localhost:3000/auth-success?data=${userData}`);
  } catch (error) {
    console.error('✗ Error en callback de GitHub:', error);
    res.redirect(`http://localhost:3000/login?error=${encodeURIComponent('auth_failed')}`);
  }
});

/**
 * GET /api/auth/user
 * Obtiene la información del usuario autenticado
 */
router.get('/user', (req, res) => {
  if (!req.session.user) {
    console.log('⚠ Intento de acceso sin autenticación');
    return res.status(401).json({ error: 'No autenticado' });
  }

  console.log(`✓ Información de usuario solicitada: ${req.session.user.username || req.session.user.name}`);

  // No devolver el token de acceso al frontend
  const { accessToken, ...userWithoutToken } = req.session.user;
  res.json(userWithoutToken);
});

/**
 * POST /api/auth/logout
 * Cierra la sesión del usuario
 */
router.post('/logout', (req, res) => {
  const username = req.session.user?.username || req.session.user?.name || 'Usuario';
  console.log(`👋 Cerrando sesión de: ${username}`);
  
  req.session.destroy((err) => {
    if (err) {
      console.log('✗ Error al cerrar sesión:', err);
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    console.log('✓ Sesión cerrada exitosamente');
    res.json({ message: 'Sesión cerrada exitosamente' });
  });
});

/**
 * GET /api/auth/repositories
 * Obtiene los repositorios del usuario autenticado
 */
router.get('/repositories', async (req, res) => {
  // Verificación detallada de autenticación
  console.log('\n🔍 [DEBUG] Verificando autenticación para /api/auth/repositories');
  console.log('  ├─ req.session existe:', !!req.session);
  console.log('  ├─ req.session.user existe:', !!(req.session && req.session.user));
  console.log('  ├─ req.session.user.accessToken existe:', !!(req.session && req.session.user && req.session.user.accessToken));
  
  if (req.session && req.session.user) {
    console.log('  ├─ Usuario en sesión:', req.session.user.username || req.session.user.name);
    console.log('  ├─ Login Type:', req.session.user.loginType);
    console.log('  ├─ Access Token (primeros 20 chars):', req.session.user.accessToken ? req.session.user.accessToken.substring(0, 20) + '...' : 'N/A');
  }
  
  if (!req.session.user || !req.session.user.accessToken) {
    console.log('  └─ ❌ FALLO: Sin autenticación válida\n');
    return res.status(401).json({ 
      error: 'No autenticado',
      details: 'Se requiere autenticación con GitHub para acceder a los repositorios'
    });
  }

  const username = req.session.user.username || req.session.user.name;
  console.log(`  └─ ✅ Autenticación válida para: ${username}\n`);
  console.log(`📚 Obteniendo repositorios de: ${username}`);

  try {
    const { page = 1, perPage = 30 } = req.query;
    console.log(`  ↳ Página: ${page}, Por página: ${perPage}`);
    
    const repos = await gitHubAuthService.getUserRepositories(
      req.session.user.accessToken,
      parseInt(page),
      parseInt(perPage)
    );
    
    console.log(`✓ ${repos.length} repositorios encontrados`);
    res.json(repos);
  } catch (error) {
    console.error('✗ Error al obtener repositorios:', error.message);
    console.error('  Stack:', error.stack);
    res.status(500).json({ 
      error: 'Error al obtener repositorios',
      details: error.message 
    });
  }
});

/**
 * GET /api/auth/repository/:owner/:repo
 * Obtiene un repositorio específico
 */
router.get('/repository/:owner/:repo', async (req, res) => {
  if (!req.session.user || !req.session.user.accessToken) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const { owner, repo } = req.params;
    const repository = await gitHubAuthService.getRepository(
      req.session.user.accessToken,
      owner,
      repo
    );
    res.json(repository);
  } catch (error) {
    console.error('Error al obtener repositorio:', error);
    res.status(500).json({ error: 'Error al obtener repositorio' });
  }
});

/**
 * GET /api/auth/repository/:owner/:repo/commits
 * Obtiene los commits de un repositorio
 */
router.get('/repository/:owner/:repo/commits', async (req, res) => {
  if (!req.session.user || !req.session.user.accessToken) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const { owner, repo } = req.params;
    const { branch = 'main', page = 1, perPage = 30 } = req.query;
    
    const commits = await gitHubAuthService.getRepositoryCommits(
      req.session.user.accessToken,
      owner,
      repo,
      branch,
      parseInt(page),
      parseInt(perPage)
    );
    res.json(commits);
  } catch (error) {
    console.error('Error al obtener commits:', error);
    res.status(500).json({ error: 'Error al obtener commits' });
  }
});

/**
 * POST /api/auth/repository/clone-and-analyze
 * Clona un repositorio de GitHub y lo analiza
 */
router.post('/repository/clone-and-analyze', async (req, res) => {
  if (!req.session.user || !req.session.user.accessToken) {
    console.log('⚠ Intento de clonar repositorio sin autenticación');
    return res.status(401).json({ error: 'No autenticado' });
  }

  const { cloneUrl, repoName, fullClone = false } = req.body;

  if (!cloneUrl || !repoName) {
    console.log('✗ Parámetros incompletos para clonar repositorio');
    return res.status(400).json({ error: 'cloneUrl y repoName son requeridos' });
  }

  const username = req.session.user.username || req.session.user.name;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 CLONANDO Y ANALIZANDO REPOSITORIO`);
  console.log(`${'='.repeat(60)}`);
  console.log(`👤 Usuario: ${username}`);
  console.log(`📁 Repositorio: ${repoName}`);
  console.log(`🔗 URL: ${cloneUrl}`);
  console.log(`📊 Tipo de clon: ${fullClone ? 'Completo' : 'Superficial (--depth 1)'}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    console.log('⏳ Clonando repositorio...');
    // Clonar el repositorio
    const cloneResult = fullClone 
      ? await gitHubCloneService.cloneRepositoryFull(cloneUrl, repoName, req.session.user.accessToken)
      : await gitHubCloneService.cloneRepository(cloneUrl, repoName, req.session.user.accessToken);

    console.log(`✓ Repositorio clonado en: ${cloneResult.path}`);
    console.log(`⚙️  Analizando repositorio...`);

    // Analizar el repositorio clonado
    const analysis = await gitService.analyzeRepository(cloneResult.path);

    console.log(`✓ Análisis completado`);
    console.log(`  ↳ Commits: ${analysis.commits?.length || 0}`);
    console.log(`  ↳ Branches: ${analysis.branches?.length || 0}`);
    console.log(`  ↳ Archivos: ${analysis.totalFiles || 0}`);

    // Agregar información del clon
    const result = {
      ...analysis,
      cloneId: cloneResult.id,
      clonePath: cloneResult.path,
      isGitHubRepo: true,
      repoName: repoName
    };

    console.log(`✓ Respuesta enviada al cliente\n`);
    res.json(result);
  } catch (error) {
    console.error('✗ Error clonando y analizando repositorio:', error.message);
    res.status(500).json({ 
      error: 'Error al clonar y analizar repositorio',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/auth/repository/cleanup/:cloneId
 * Limpia un repositorio clonado
 */
router.delete('/repository/cleanup/:clonePath', async (req, res) => {
  try {
    const { clonePath } = req.params;
    const decodedPath = decodeURIComponent(clonePath);
    
    const cleaned = await gitHubCloneService.cleanupClone(decodedPath);
    
    if (cleaned) {
      res.json({ message: 'Repositorio limpiado exitosamente' });
    } else {
      res.status(404).json({ error: 'Repositorio no encontrado' });
    }
  } catch (error) {
    console.error('Error limpiando repositorio:', error);
    res.status(500).json({ error: 'Error al limpiar repositorio' });
  }
});

/**
 * GET /api/auth/repository/cloned
 * Obtiene la lista de repositorios clonados
 */
router.get('/repository/cloned', async (req, res) => {
  try {
    const repos = await gitHubCloneService.getClonedRepositories();
    res.json(repos);
  } catch (error) {
    console.error('Error obteniendo repositorios clonados:', error);
    res.status(500).json({ error: 'Error al obtener repositorios clonados' });
  }
});

/**
 * DELETE /api/auth/repository/cleanup-all
 * Limpia todos los repositorios clonados
 */
router.delete('/repository/cleanup-all', async (req, res) => {
  try {
    const count = await gitHubCloneService.cleanupAllClones();
    res.json({ message: `${count} repositorios limpiados`, count });
  } catch (error) {
    console.error('Error limpiando todos los repositorios:', error);
    res.status(500).json({ error: 'Error al limpiar repositorios' });
  }
});

module.exports = router;
