# INSTRUCCIONES PARA SUBIR A GITHUB

## 1. Instalar Git (si no lo tienes)

Descarga e instala Git desde: https://git-scm.com/download/windows

## 2. Configurar Git (primera vez)

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

## 3. Inicializar repositorio y hacer primer commit

```bash
# Inicializar repositorio Git
git init

# Agregar todos los archivos
git add .

# Hacer commit inicial con la nueva arquitectura
git commit -m "v2.0.0: Separación completa de Backend y Frontend

- ✅ Backend API Node.js/Express independiente
- ✅ Frontend Electron refactorizado para consumir API
- ✅ Servicios reales de análisis Git con simple-git
- ✅ Extracción de archivos comprimidos (.zip, .rar, .7z, .tar.gz)
- ✅ Endpoints REST completos
- ✅ Scripts para ejecutar backend y frontend por separado
- ✅ Documentación actualizada

BREAKING CHANGES:
- Arquitectura completamente nueva
- Requiere ejecutar backend y frontend por separado
- Backend en puerto 3001, frontend en Electron"
```

## 4. Crear repositorio en GitHub

1. Ve a https://github.com
2. Click en "New repository"
3. Nombre: `GitVersionAnalyzer`
4. Descripción: "Aplicación de escritorio para analizar versiones y historial de proyectos Git"
5. Público o Privado (según prefieras)
6. NO marcar "Initialize with README" (ya tienes uno)
7. Click "Create repository"

## 5. Conectar repositorio local con GitHub

```bash
# Agregar repositorio remoto (reemplaza URL con la tuya)
git remote add origin https://github.com/TU-USUARIO/GitVersionAnalyzer.git

# Cambiar a rama main (estándar actual)
git branch -M main

# Subir código
git push -u origin main
```

## 6. Crear release/tag para v2.0.0

```bash
# Crear tag
git tag -a v2.0.0 -m "Versión 2.0.0 - Arquitectura Backend/Frontend separada"

# Subir tag
git push origin v2.0.0
```

## 7. Comandos útiles para futuras actualizaciones

```bash
# Ver estado
git status

# Agregar cambios
git add .

# Commit
git commit -m "Descripción de cambios"

# Subir cambios
git push

# Crear nueva versión
git tag -a v2.1.0 -m "Descripción de la nueva versión"
git push origin v2.1.0
```