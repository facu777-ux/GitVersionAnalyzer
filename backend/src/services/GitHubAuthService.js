const axios = require('axios');

class GitHubAuthService {
  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID;
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET;
    this.callbackUrl = process.env.GITHUB_CALLBACK_URL;
  }

  /**
   * Genera la URL de autorización de GitHub
   */
  getAuthorizationUrl() {
    const scopes = 'read:user,repo'; // Permisos: leer perfil y repos
    return `https://github.com/login/oauth/authorize?client_id=${this.clientId}&redirect_uri=${this.callbackUrl}&scope=${scopes}`;
  }

  /**
   * Intercambia el código de autorización por un token de acceso
   */
  async getAccessToken(code) {
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.callbackUrl,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error_description || 'Error al obtener token de acceso');
      }

      return response.data.access_token;
    } catch (error) {
      console.error('Error al obtener token de acceso:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene la información del usuario de GitHub
   */
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return {
        id: response.data.id,
        username: response.data.login,
        name: response.data.name || response.data.login,
        email: response.data.email,
        avatar: response.data.avatar_url,
        bio: response.data.bio,
        publicRepos: response.data.public_repos,
        followers: response.data.followers,
        following: response.data.following,
      };
    } catch (error) {
      console.error('Error al obtener información del usuario:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene los repositorios del usuario
   */
  async getUserRepositories(accessToken, page = 1, perPage = 30) {
    try {
      const response = await axios.get('https://api.github.com/user/repos', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: {
          sort: 'updated',
          direction: 'desc',
          page: page,
          per_page: perPage,
        },
      });

      return response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        defaultBranch: repo.default_branch,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
      }));
    } catch (error) {
      console.error('Error al obtener repositorios:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene un repositorio específico
   */
  async getRepository(accessToken, owner, repo) {
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return {
        id: response.data.id,
        name: response.data.name,
        fullName: response.data.full_name,
        description: response.data.description,
        private: response.data.private,
        url: response.data.html_url,
        cloneUrl: response.data.clone_url,
        language: response.data.language,
        stars: response.data.stargazers_count,
        forks: response.data.forks_count,
        openIssues: response.data.open_issues_count,
        defaultBranch: response.data.default_branch,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        pushedAt: response.data.pushed_at,
      };
    } catch (error) {
      console.error('Error al obtener repositorio:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene los commits de un repositorio
   */
  async getRepositoryCommits(accessToken, owner, repo, branch = 'main', page = 1, perPage = 30) {
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: {
          sha: branch,
          page: page,
          per_page: perPage,
        },
      });

      return response.data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date,
          username: commit.author?.login,
          avatar: commit.author?.avatar_url,
        },
        committer: {
          name: commit.commit.committer.name,
          email: commit.commit.committer.email,
          date: commit.commit.committer.date,
        },
        url: commit.html_url,
      }));
    } catch (error) {
      console.error('Error al obtener commits:', error.message);
      throw error;
    }
  }
}

module.exports = new GitHubAuthService();
