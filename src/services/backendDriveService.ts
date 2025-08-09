// Service for public access to Google Drive via backend API
// This service communicates with our secure backend server

export interface BackendDriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  isFolder: boolean;
}

export interface BackendDriveResponse {
  success: boolean;
  data: BackendDriveFile[];
  count: number;
  folderId?: string;
  query?: string;
  error?: string;
  message?: string;
}

class BackendDriveService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }

  private async fetchWithErrorHandling(url: string): Promise<BackendDriveResponse> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: BackendDriveResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Backend request failed');
      }
      
      return data;
    } catch (error) {
      console.error('Backend API Error:', error);
      throw error;
    }
  }

  async getRootFolders(): Promise<BackendDriveFile[]> {
    try {
      console.log('📁 Fetching root folders from backend...');
      const url = `${this.baseUrl}/api/drive/folders`;
      const response = await this.fetchWithErrorHandling(url);
      
      console.log(`✅ Loaded ${response.count} items from Google Drive`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching root folders:', error);
      throw error;
    }
  }

  async getFolderContents(folderId: string): Promise<BackendDriveFile[]> {
    try {
      console.log(`📁 Fetching folder contents for: ${folderId}`);
      const url = `${this.baseUrl}/api/drive/folders/${folderId}`;
      const response = await this.fetchWithErrorHandling(url);
      
      console.log(`✅ Loaded ${response.count} items from folder`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching folder contents:', error);
      throw error;
    }
  }

  async searchFiles(query: string, folderId?: string): Promise<BackendDriveFile[]> {
    try {
      console.log(`🔍 Searching for "${query}"${folderId ? ` in folder ${folderId}` : ''}`);
      const params = new URLSearchParams({ q: query });
      if (folderId) {
        params.append('folderId', folderId);
      }
      
      const url = `${this.baseUrl}/api/drive/search?${params}`;
      const response = await this.fetchWithErrorHandling(url);
      
      console.log(`🔍 Found ${response.count} items matching "${query}"`);
      return response.data || [];
    } catch (error) {
      console.error('Error searching files:', error);
      throw error;
    }
  }

  async getFileById(fileId: string): Promise<BackendDriveFile | null> {
    try {
      console.log(`📄 Fetching file details for: ${fileId}`);
      const url = `${this.baseUrl}/api/drive/files/${fileId}`;
      const response = await this.fetchWithErrorHandling(url);
      
      // For single file endpoint, the data should be a single file object
      return (response.data as unknown as BackendDriveFile) || null;
    } catch (error) {
      console.error('Error fetching file by ID:', error);
      return null;
    }
  }

  async checkServiceStatus(): Promise<{ configured: boolean; message: string; folderId?: string }> {
    try {
      const url = `${this.baseUrl}/api/drive/status`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return {
          configured: false,
          message: `Backend server is not accessible (${response.status})`
        };
      }
      
      const data = await response.json();
      return {
        configured: data.configured || false,
        message: data.message || 'Unknown status',
        folderId: data.folderId
      };
    } catch (error) {
      return {
        configured: false,
        message: `Cannot connect to backend server: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Helper method to check if the service is properly configured
  async isConfigured(): Promise<boolean> {
    try {
      const status = await this.checkServiceStatus();
      return status.configured;
    } catch (error) {
      return false;
    }
  }

  // Format file size for display
  formatFileSize(sizeString?: string): string {
    if (!sizeString) return 'Unknown size';
    
    const size = parseInt(sizeString);
    if (isNaN(size)) return 'Unknown size';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let formattedSize = size;
    
    while (formattedSize >= 1024 && unitIndex < units.length - 1) {
      formattedSize /= 1024;
      unitIndex++;
    }
    
    return `${formattedSize.toFixed(1)} ${units[unitIndex]}`;
  }

  // Format date for display
  formatDate(dateString?: string): string {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  // Get the base URL for the backend
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Export singleton instance
export const backendDriveService = new BackendDriveService();
export default backendDriveService;
