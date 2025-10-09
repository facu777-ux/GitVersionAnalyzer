const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs-extra');

class GitService {

  // Analizar repositorio Git completo
  static async analyzeRepository(repoPath) {
    try {
      // Verificar si es un repositorio Git válido
      const git = simpleGit(repoPath);
      const isRepo = await git.checkIsRepo();

      if (!isRepo) {
        throw new Error('La carpeta no contiene un repositorio Git válido');
      }

      // Obtener información básica del repositorio
      const status = await git.status();
      const branches = await git.branch(['--all']);
      const tags = await git.tags();
      
      // Obtener log de commits
      const log = await git.log(['--all', '--graph', '--oneline', '--decorate']);
      
      // Obtener información detallada de commits recientes
      const detailedCommits = await this.getDetailedCommits(git, 50);
      
      // Calcular estadísticas
      const stats = await this.calculateRepositoryStats(git, repoPath);

      return {
        isGitRepository: true,
        status: {
          current: status.current,
          tracking: status.tracking,
          ahead: status.ahead,
          behind: status.behind,
          staged: status.staged.length,
          modified: status.modified.length,
          deleted: status.deleted.length,
          created: status.created.length
        },
        branches: {
          all: branches.all,
          current: branches.current,
          total: branches.all.length
        },
        tags: {
          all: tags.all,
          latest: tags.latest,
          total: tags.all.length
        },
        commits: detailedCommits,
        totalCommits: log.total,
        stats: stats,
        lastAnalyzed: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error analyzing Git repository:', error);
      
      // Si no es un repositorio Git, buscar en subdirectorios
      const subRepos = await this.findGitRepositories(repoPath);
      
      if (subRepos.length > 0) {
        return {
          isGitRepository: false,
          hasSubRepositories: true,
          subRepositories: subRepos,
          message: 'Se encontraron repositorios Git en subdirectorios'
        };
      }

      return {
        isGitRepository: false,
        hasSubRepositories: false,
        error: error.message,
        message: 'No se encontró repositorio Git válido'
      };
    }
  }

  // Obtener commits detallados
  static async getDetailedCommits(git, limit = 50) {
    try {
      const log = await git.log({
        maxCount: limit,
        format: {
          hash: '%H',
          date: '%ai',
          message: '%s',
          author_name: '%an',
          author_email: '%ae'
        }
      });

      const commits = [];
      
      for (const commit of log.all) {
        // Obtener archivos modificados en cada commit
        const diffSummary = await git.diffSummary([`${commit.hash}^`, commit.hash]);
        
        commits.push({
          hash: commit.hash,
          shortHash: commit.hash.substring(0, 7),
          message: commit.message,
          author: {
            name: commit.author_name,
            email: commit.author_email
          },
          date: commit.date,
          files: {
            total: diffSummary.files.length,
            insertions: diffSummary.insertions,
            deletions: diffSummary.deletions,
            changed: diffSummary.files.map(file => ({
              file: file.file,
              changes: file.changes,
              insertions: file.insertions,
              deletions: file.deletions
            }))
          }
        });
      }

      return commits;

    } catch (error) {
      console.error('Error getting detailed commits:', error);
      return [];
    }
  }

  // Calcular estadísticas del repositorio
  static async calculateRepositoryStats(git, repoPath) {
    try {
      const log = await git.log(['--all']);
      const authors = new Set();
      const fileExtensions = new Map();
      
      // Contar autores únicos
      log.all.forEach(commit => {
        authors.add(commit.author_email);
      });

      // Analizar archivos del proyecto
      const files = await this.getProjectFiles(repoPath);
      files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (ext) {
          fileExtensions.set(ext, (fileExtensions.get(ext) || 0) + 1);
        }
      });

      // Obtener líneas de código (aproximación básica)
      const linesOfCode = await this.countLinesOfCode(repoPath);

      return {
        totalAuthors: authors.size,
        totalFiles: files.length,
        fileTypes: Object.fromEntries(fileExtensions),
        linesOfCode: linesOfCode,
        authors: Array.from(authors),
        firstCommit: log.all[log.all.length - 1]?.date,
        lastCommit: log.all[0]?.date
      };

    } catch (error) {
      console.error('Error calculating repository stats:', error);
      return {
        totalAuthors: 0,
        totalFiles: 0,
        fileTypes: {},
        linesOfCode: 0,
        authors: [],
        error: error.message
      };
    }
  }

  // Buscar repositorios Git en subdirectorios
  static async findGitRepositories(basePath) {
    const gitRepos = [];
    
    try {
      const items = await fs.readdir(basePath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory()) {
          const itemPath = path.join(basePath, item.name);
          
          // Verificar si es un repositorio Git
          const git = simpleGit(itemPath);
          const isRepo = await git.checkIsRepo();
          
          if (isRepo) {
            gitRepos.push({
              name: item.name,
              path: itemPath,
              relativePath: path.relative(basePath, itemPath)
            });
          }
        }
      }
    } catch (error) {
      console.error('Error finding Git repositories:', error);
    }

    return gitRepos;
  }

  // Obtener lista de archivos del proyecto
  static async getProjectFiles(projectPath) {
    const files = [];
    
    const walk = async (dir) => {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        // Ignorar carpetas .git
        if (item.name === '.git') continue;
        
        if (item.isDirectory()) {
          await walk(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    };

    try {
      await walk(projectPath);
    } catch (error) {
      console.error('Error getting project files:', error);
    }

    return files;
  }

  // Contar líneas de código (aproximación básica)
  static async countLinesOfCode(projectPath) {
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.php', '.rb', '.go', '.rs'];
    let totalLines = 0;

    try {
      const files = await this.getProjectFiles(projectPath);
      
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        
        if (codeExtensions.includes(ext)) {
          const content = await fs.readFile(file, 'utf8');
          const lines = content.split('\n').length;
          totalLines += lines;
        }
      }
    } catch (error) {
      console.error('Error counting lines of code:', error);
    }

    return totalLines;
  }
}

module.exports = GitService;