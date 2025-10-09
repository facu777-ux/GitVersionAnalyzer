const extract = require('extract-zip');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

class FileExtractionService {

  // Extraer archivo comprimido según el tipo
  static async extractArchive(filePath, projectId) {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      const extractDir = path.join(__dirname, '../../../temp', `extracted_${projectId}`);
      
      // Asegurar que existe el directorio de extracción
      await fs.ensureDir(extractDir);

      switch (fileExtension) {
        case '.zip':
          return await this.extractZip(filePath, extractDir);
        
        case '.rar':
          return await this.extractRar(filePath, extractDir);
        
        case '.7z':
          return await this.extract7z(filePath, extractDir);
        
        case '.tar':
        case '.gz':
          return await this.extractTar(filePath, extractDir);
        
        default:
          throw new Error(`Formato de archivo no soportado: ${fileExtension}`);
      }

    } catch (error) {
      console.error('Error extracting archive:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Extraer archivo ZIP
  static async extractZip(filePath, extractDir) {
    try {
      await extract(filePath, { dir: extractDir });
      
      return {
        success: true,
        extractedPath: extractDir,
        type: 'zip'
      };

    } catch (error) {
      throw new Error(`Error extrayendo ZIP: ${error.message}`);
    }
  }

  // Extraer archivo RAR
  static async extractRar(filePath, extractDir) {
    return new Promise((resolve, reject) => {
      // Intentar usar WinRAR o unrar
      const rarProcess = spawn('unrar', ['x', filePath, extractDir], {
        shell: true
      });

      let errorOutput = '';

      rarProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      rarProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            extractedPath: extractDir,
            type: 'rar'
          });
        } else {
          reject(new Error(`Error extrayendo RAR: ${errorOutput || 'Código de salida: ' + code}`));
        }
      });

      rarProcess.on('error', (error) => {
        reject(new Error(`Error ejecutando unrar: ${error.message}`));
      });
    });
  }

  // Extraer archivo 7Z
  static async extract7z(filePath, extractDir) {
    const node7z = require('node-7z');
    
    return new Promise((resolve, reject) => {
      const extractStream = node7z.extract(filePath, extractDir, {
        $progress: true
      });

      extractStream.on('end', () => {
        resolve({
          success: true,
          extractedPath: extractDir,
          type: '7z'
        });
      });

      extractStream.on('error', (error) => {
        reject(new Error(`Error extrayendo 7Z: ${error.message}`));
      });
    });
  }

  // Extraer archivo TAR/GZ
  static async extractTar(filePath, extractDir) {
    const tar = require('tar-stream');
    const zlib = require('zlib');
    const fs = require('fs');
    
    return new Promise((resolve, reject) => {
      const extract = tar.extract();
      
      extract.on('entry', (header, stream, next) => {
        const filePath = path.join(extractDir, header.name);
        
        if (header.type === 'file') {
          // Asegurar que existe el directorio padre
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          
          const writeStream = fs.createWriteStream(filePath);
          stream.pipe(writeStream);
          
          writeStream.on('close', next);
          writeStream.on('error', next);
        } else if (header.type === 'directory') {
          fs.mkdirSync(filePath, { recursive: true });
          next();
        } else {
          stream.resume();
          next();
        }
      });

      extract.on('finish', () => {
        resolve({
          success: true,
          extractedPath: extractDir,
          type: 'tar'
        });
      });

      extract.on('error', (error) => {
        reject(new Error(`Error extrayendo TAR: ${error.message}`));
      });

      // Determinar si es comprimido con gzip
      const readStream = fs.createReadStream(filePath);
      
      if (path.extname(filePath).toLowerCase() === '.gz') {
        readStream.pipe(zlib.createGunzip()).pipe(extract);
      } else {
        readStream.pipe(extract);
      }
    });
  }

  // Limpiar archivos temporales
  static async cleanupExtracted(extractedPath) {
    try {
      if (await fs.pathExists(extractedPath)) {
        await fs.remove(extractedPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error cleaning up extracted files:', error);
      return false;
    }
  }

  // Obtener información del archivo antes de extraer
  static async getArchiveInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      
      return {
        name: path.basename(filePath),
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        type: fileExtension,
        created: stats.birthtime,
        modified: stats.mtime,
        supported: ['.zip', '.rar', '.7z', '.tar', '.gz'].includes(fileExtension)
      };

    } catch (error) {
      throw new Error(`Error obteniendo información del archivo: ${error.message}`);
    }
  }

  // Formatear tamaño de archivo
  static formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = FileExtractionService;