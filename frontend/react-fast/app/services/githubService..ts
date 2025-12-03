interface GitHubFile {
  name: string;
  path: string;
  content: string;
  size: number;
  repo: string;
  url: string;
}

interface FetchFilesRequest {
  files: Array<{
    owner: string;
    repo: string;
    path: string;
  }>;
}

export class GitHubService {
  static async getRepos(fetchWithAuth: any) {
    return await fetchWithAuth('/api/github/repos?per_page=100');
  }

  static async getRepoContents(
    owner: string,
    repo: string,
    path: string,
    fetchWithAuth: any
  ) {
    return await fetchWithAuth(
      `${import.meta.env.VITE_API_BASE_URL}/api/github/repos/${owner}/${repo}/contents?path=${encodeURIComponent(path)}`
    );
  }

  static async fetchFiles(
    files: FetchFilesRequest['files'],
    fetchWithAuth: any
  ): Promise<{ files: GitHubFile[] }> {
    return await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/github/files/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ files })
    });
  }

  static async checkConnection(fetchWithAuth: any) {
    return await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/github/status`);
  }
}