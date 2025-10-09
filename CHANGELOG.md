# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-10-09

### ✨ Agregado
- **Backend API independiente** con Node.js + Express
- **Cliente API** en frontend para consumir servicios del backend
- **Servicios reales de análisis Git** usando simple-git
- **Extracción de archivos comprimidos** (.zip, .rar, .7z, .tar.gz)
- **Endpoints REST completos**:
  - `POST /api/projects/analyze-folder` - Analizar carpetas
  - `POST /api/projects/upload` - Subir archivos comprimidos
  - `GET /api/projects/:id/commits` - Obtener commits
  - `GET /api/projects/:id/stats` - Estadísticas del proyecto
  - `GET /api/health` - Health check
- **Scripts de desarrollo**:
  - `npm run backend` - Solo backend
  - `npm run dev` - Solo frontend
  - `npm run dev:full` - Ambos componentes
  - `npm run install:all` - Instalar todas las dependencias

### 🔄 Cambiado
- **Arquitectura completamente refactorizada**: Backend y Frontend separados
- **Frontend Electron** ahora consume API REST en lugar de lógica local
- **Estructura de proyecto** reorganizada con carpetas separadas
- **README.md** actualizado con nueva arquitectura e instrucciones
- **Versión** actualizada a 2.0.0 reflejando cambios arquitectónicos importantes

### 🛠️ Técnico
- **Backend**: Node.js, Express, simple-git, multer, cors
- **Frontend**: Electron (sin cambios), nuevo apiClient.js
- **Servicios**:
  - GitService: Análisis completo de repositorios
  - FileExtractionService: Extracción de archivos comprimidos
- **Controladores**: ProjectController, AnalysisController
- **API REST** completa con manejo de errores

### 💥 BREAKING CHANGES
- Requiere ejecutar backend y frontend por separado
- Backend debe estar ejecutándose en puerto 3001
- Estructura de datos de respuesta modificada
- Scripts de npm completamente cambiados

### 🚀 Migración desde v1.x
1. Instalar dependencias del backend: `npm run install:all`
2. Ejecutar backend: `npm run backend`
3. Ejecutar frontend: `npm run dev` (en otra terminal)
4. O ejecutar ambos: `npm run dev:full`

---

## [1.0.0] - 2025-10-09

### ✨ Agregado
- Aplicación Electron básica
- Interfaz de usuario con drag & drop
- Simulación de análisis de repositorios
- Diseño inicial de la interfaz
- Estructura básica del proyecto

### 📋 Funcionalidades Planificadas (v1.0)
- [x] Interfaz principal con carga de archivos
- [ ] Análisis básico de repositorios Git (completado en v2.0.0)
- [ ] Lista de commits y información del proyecto (completado en v2.0.0)
- [ ] Soporte para archivos comprimidos (completado en v2.0.0)