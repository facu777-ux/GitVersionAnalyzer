# Git Version Analyzer

Una aplicación de escritorio moderna para analizar el historial y versiones de proyectos Git.

## Arquitectura

El proyecto está dividido en dos componentes principales:

### 🎯 **Frontend (Electron App)**
- Interfaz de usuario moderna con Electron
- Drag & drop para cargar proyectos fácilmente
- Consume API REST del backend

### 🔧 **Backend (Node.js API)**
- API REST para análisis de repositorios Git
- Servicios de extracción de archivos comprimidos
- Lógica de negocio separada del frontend

## Características

- � **Sistema de autenticación moderno**: Login con GitHub, registro manual o acceso como invitado
- �🔍 **Análisis completo de repositorios Git**: Visualiza commits, ramas y estadísticas
- 📁 **Soporte múltiples formatos**: Carpetas, .zip, .rar, .7z, .tar.gz
- 🎯 **Interfaz intuitiva**: Drag & drop para cargar proyectos fácilmente
- 📊 **Visualización de datos**: Historial de commits y información del proyecto
- ⚡ **Basado en Electron**: Aplicación nativa multiplataforma
- 🌐 **API REST**: Backend separado para máxima flexibilidad
- 👤 **Gestión de usuarios**: Persistencia de sesión y datos de usuario

## Funcionalidades Planificadas

### Versión 1.0 (Básica)
- [x] Interfaz principal con carga de archivos
- [ ] Análisis básico de repositorios Git
- [ ] Lista de commits y información del proyecto
- [ ] Soporte para archivos comprimidos

### Futuras Versiones
- [ ] OAuth real con GitHub para push automático
- [ ] Visualización gráfica del árbol de commits
- [ ] Estadísticas avanzadas (líneas de código, archivos modificados)
- [ ] Comparación entre versiones específicas
- [ ] Exportación de reportes
- [ ] Temas personalizables
- [ ] Sincronización de análisis con GitHub

## Requisitos

- Node.js 16 o superior
- npm o yarn
- Git (para analizar repositorios)

## Instalación y Desarrollo

### Instalación Completa
```bash
# Clonar el repositorio
git clone <url-del-repo>
cd GitVersionAnalyzer

# Instalar todas las dependencias (frontend y backend)
npm run install:all
```

### Ejecutar en Desarrollo

#### Opción 1: Ejecutar ambos componentes automáticamente
```bash
npm run dev:full
```

#### Opción 2: Ejecutar por separado

**Backend API:**
```bash
npm run backend
# El servidor estará disponible en http://localhost:3001
```

**Frontend Electron (en otra terminal):**
```bash
npm run dev
```

### Ejecutar en Producción
```bash
# Backend
npm run backend

# Frontend (en otra terminal)
npm start
```

### Construir para Distribución
```bash
npm run build
```

## Estructura del Proyecto

```
GitVersionAnalyzer/
├── backend/                # Backend API (Node.js/Express)
│   ├── src/
│   │   ├── controllers/    # Controladores de API
│   │   ├── services/       # Servicios de análisis Git
│   │   ├── routes/         # Rutas de la API
│   │   └── utils/          # Utilidades del backend
│   ├── package.json        # Dependencias del backend
│   └── server.js           # Servidor principal
├── src/
│   ├── main/               # Proceso principal de Electron
│   │   └── main.js         # Configuración de la aplicación
│   └── renderer/           # Interfaz de usuario
│       ├── index.html      # Página principal
│       ├── styles.css      # Estilos
│       ├── renderer.js     # Lógica del frontend
│       └── apiClient.js    # Cliente para consumir API
├── assets/                 # Recursos estáticos
├── temp/                   # Archivos temporales
├── docs/                   # Documentación
└── package.json            # Configuración principal
```

## Tecnologías Utilizadas

### Frontend
- **Framework**: Electron
- **UI**: HTML5, CSS3, JavaScript (ES6+)
- **Cliente API**: Fetch API para consumir backend

### Backend
- **Framework**: Node.js + Express
- **Análisis Git**: simple-git
- **Extracción de archivos**: extract-zip, node-7z, tar-stream
- **Uploads**: multer
- **CORS**: cors para comunicación entre frontend y backend

### Herramientas de Desarrollo
- **Concurrentemente**: concurrently para ejecutar backend y frontend
- **Build**: electron-builder para distribución

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## Roadmap

- **v2.0**: ✅ Arquitectura Backend/Frontend separada
- **v2.1**: Visualización gráfica de commits  
- **v2.2**: Estadísticas avanzadas
- **v3.0**: Comparación de versiones y exportación de reportes

## Versionado

Este proyecto usa [Semantic Versioning](https://semver.org/). Para las versiones disponibles, mira los [tags en este repositorio](../../tags).

Ver [CHANGELOG.md](CHANGELOG.md) para la lista de cambios en cada versión.

## Contribuir

Ver [GITHUB_SETUP.md](GITHUB_SETUP.md) para instrucciones de cómo subir este proyecto a GitHub.

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request