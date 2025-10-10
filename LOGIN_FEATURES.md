# Pantalla de Login Integrada

## 🎯 **Nueva Funcionalidad: Sistema de Autenticación**

Se ha integrado una pantalla de login moderna que se presenta al abrir la aplicación.

### 🚀 **Funcionalidades de Login:**

#### **1. Conexión con GitHub**
- **Propósito**: Obtener automáticamente `user.name` y `user.email` para futuras funcionalidades de push
- **Implementación actual**: Simulación (mock) de autenticación OAuth
- **Datos obtenidos**:
  - Nombre del usuario
  - Email
  - Username de GitHub
  - Avatar URL

#### **2. Registro Manual**
- Permite al usuario ingresar manualmente:
  - Nombre completo
  - Email
  - Usuario de GitHub (opcional)

#### **3. Acceso como Invitado**
- **Acceso rápido** sin registro
- **Funcionalidades limitadas** (sin sincronización con GitHub)
- **Ideal para**: Pruebas rápidas y análisis básicos

### 🎨 **Características de Diseño:**

- **Interfaz moderna** con animaciones suaves
- **Estilos adaptados** a Git Version Analyzer
- **Responsive design** para diferentes tamaños de pantalla
- **Transiciones fluidas** entre formularios de login y registro

### 🔧 **Flujo de Autenticación:**

1. **Inicio de aplicación** → Pantalla de login
2. **Autenticación exitosa** → Datos guardados localmente
3. **Apertura de aplicación principal** con información del usuario
4. **Sesiones persistentes** → No requiere login en próximas aperturas
5. **Opción de logout** disponible en la aplicación principal

### 🗄️ **Persistencia de Datos:**

- **Ubicación**: `userData/user-data.json`
- **Datos guardados**:
  ```json
  {
    "name": "Nombre Usuario",
    "email": "email@ejemplo.com",
    "githubUsername": "usuario-github",
    "avatarUrl": "https://...",
    "accessType": "github|manual|guest"
  }
  ```

### 🚧 **Próximas Implementaciones:**

- **OAuth real con GitHub** (reemplazar simulación)
- **Funcionalidades de push automático** usando credenciales
- **Sincronización de análisis** con repositorios GitHub
- **Historial de proyectos** por usuario

### 📱 **Uso:**

1. **Abrir aplicación** → Pantalla de login aparece
2. **Elegir método**:
   - Click en GitHub icon para autenticación automática
   - Completar formulario manual
   - Click "Acceder como Invitado"
3. **Aplicación principal** se abre con datos del usuario
4. **Logout**: Botón en esquina superior de la aplicación principal

### 🔄 **Integración con Backend:**

La pantalla de login funciona independientemente del backend API. Una vez autenticado, el usuario puede usar todas las funcionalidades de análisis Git que requieren el backend en puerto 3001.