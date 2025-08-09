// Service for public access to Google Drive using API key
// This service fetches data from the public Google Drive folder

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
  modifiedTime?: string;
}

export interface GoogleDriveResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

class PublicGoogleDriveService {
  private apiKey: string;
  private folderId: string;
  private fallbackMode: boolean = false;

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    // Extract folder ID from the drive URL
    const driveUrl = import.meta.env.VITE_GOOGLE_DRIVE_URL;
    this.folderId = this.extractFolderIdFromUrl(driveUrl);
    
    if (!this.apiKey) {
      console.warn('VITE_GOOGLE_API_KEY is not set in environment variables - using fallback mode');
      this.fallbackMode = true;
    }
    if (!this.folderId) {
      console.warn('Could not extract folder ID from VITE_GOOGLE_DRIVE_URL');
    }
  }

  private extractFolderIdFromUrl(url: string): string {
    // Extract folder ID from Google Drive URL
    // https://drive.google.com/drive/folders/1eLeKxe0QNZvzneFs_ZpP7YJIIMV-nlvD?usp=sharing
    const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  }

  async getRootFolders(): Promise<GoogleDriveFile[]> {
    // If API key is not available or we're in fallback mode, return mock data
    if (this.fallbackMode || !this.apiKey) {
      return this.getFallbackData();
    }

    try {
      // First, try to verify if we can access the folder itself
      const folderCheckUrl = `https://www.googleapis.com/drive/v3/files/${this.folderId}?fields=id,name,mimeType&key=${this.apiKey}`;
      
      const folderCheck = await fetch(folderCheckUrl);
      if (!folderCheck.ok) {
        console.error('Cannot access the main folder. Status:', folderCheck.status);
        if (folderCheck.status === 403) {
          console.warn('Access denied - switching to fallback mode');
          this.fallbackMode = true;
          return this.getFallbackData();
        }
        throw new Error(`Google Drive API error: ${folderCheck.status} ${folderCheck.statusText}`);
      }
      
      // If folder is accessible, fetch its contents
      const url = `https://www.googleapis.com/drive/v3/files?q='${this.folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,parents,webViewLink,webContentLink,size,modifiedTime)&key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Cannot fetch folder contents. Status:', response.status);
        if (response.status === 403) {
          console.warn('Access denied - switching to fallback mode');
          this.fallbackMode = true;
          return this.getFallbackData();
        }
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
      }
      
      const data: GoogleDriveResponse = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error fetching root folders:', error);
      console.warn('Switching to fallback mode due to API error');
      this.fallbackMode = true;
      return this.getFallbackData();
    }
  }

  // Fallback data when API is not accessible
  private getFallbackData(): GoogleDriveFile[] {
    return [
      {
        id: 'fallback-1',
        name: 'หลักสูตรวิศวกรรมศาสตร์',
        mimeType: 'application/vnd.google-apps.folder',
        webViewLink: `https://drive.google.com/drive/folders/${this.folderId}`,
        modifiedTime: new Date().toISOString()
      },
      {
        id: 'fallback-2',
        name: 'หลักสูตรครุศาสตร์อุตสาหกรรม',
        mimeType: 'application/vnd.google-apps.folder',
        webViewLink: `https://drive.google.com/drive/folders/${this.folderId}`,
        modifiedTime: new Date().toISOString()
      },
      {
        id: 'fallback-3',
        name: 'หลักสูตรเทคโนโลยีสารสนเทศ',
        mimeType: 'application/vnd.google-apps.folder',
        webViewLink: `https://drive.google.com/drive/folders/${this.folderId}`,
        modifiedTime: new Date().toISOString()
      }
    ];
  }

  async getFolderContents(folderId: string): Promise<GoogleDriveFile[]> {
    // If in fallback mode, return mock folder contents
    if (this.fallbackMode || !this.apiKey) {
      return this.getFallbackFolderContents(folderId);
    }

    try {
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,parents,webViewLink,webContentLink,size,modifiedTime)&key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('API access failed, switching to fallback mode');
        this.fallbackMode = true;
        return this.getFallbackFolderContents(folderId);
      }
      
      const data: GoogleDriveResponse = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error fetching folder contents:', error);
      this.fallbackMode = true;
      return this.getFallbackFolderContents(folderId);
    }
  }

  private getFallbackFolderContents(folderId: string): GoogleDriveFile[] {
    // Return different mock data based on folder ID
    const mockFiles: GoogleDriveFile[] = [
      {
        id: `${folderId}-file-1`,
        name: 'หลักสูตร_2567.pdf',
        mimeType: 'application/pdf',
        webViewLink: `https://drive.google.com/file/d/${folderId}-file-1/view`,
        webContentLink: `https://drive.google.com/uc?id=${folderId}-file-1&export=download`,
        size: '2048576',
        modifiedTime: new Date().toISOString()
      },
      {
        id: `${folderId}-file-2`,
        name: 'แผนการเรียน_ภาค1.pdf',
        mimeType: 'application/pdf',
        webViewLink: `https://drive.google.com/file/d/${folderId}-file-2/view`,
        webContentLink: `https://drive.google.com/uc?id=${folderId}-file-2&export=download`,
        size: '1536000',
        modifiedTime: new Date().toISOString()
      }
    ];

    return mockFiles;
  }

  async searchFiles(query: string): Promise<GoogleDriveFile[]> {
    // If in fallback mode, return filtered mock data
    if (this.fallbackMode || !this.apiKey) {
      const allFiles = [
        ...this.getFallbackData(),
        ...this.getFallbackFolderContents('search-results')
      ];
      return allFiles.filter(file => 
        file.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    try {
      // Search within the main folder and its subfolders
      const url = `https://www.googleapis.com/drive/v3/files?q=name+contains+'${query}'+and+'${this.folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,parents,webViewLink,webContentLink,size,modifiedTime)&key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('Search API access failed, switching to fallback mode');
        this.fallbackMode = true;
        const allFiles = [
          ...this.getFallbackData(),
          ...this.getFallbackFolderContents('search-results')
        ];
        return allFiles.filter(file => 
          file.name.toLowerCase().includes(query.toLowerCase())
        );
      }
      
      const data: GoogleDriveResponse = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error searching files:', error);
      this.fallbackMode = true;
      const allFiles = [
        ...this.getFallbackData(),
        ...this.getFallbackFolderContents('search-results')
      ];
      return allFiles.filter(file => 
        file.name.toLowerCase().includes(query.toLowerCase())
      );
    }
  }

  async getFileById(fileId: string): Promise<GoogleDriveFile | null> {
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,parents,webViewLink,webContentLink,size,modifiedTime&key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
      }
      
      const file: GoogleDriveFile = await response.json();
      return file;
    } catch (error) {
      console.error('Error fetching file by ID:', error);
      return null;
    }
  }

  // Helper method to check if the service is properly configured
  isConfigured(): boolean {
    return !!(this.apiKey && this.folderId && !this.fallbackMode);
  }

  // Get configuration status and instructions
  getConfigurationStatus(): { 
    configured: boolean, 
    hasApiKey: boolean, 
    hasFolderId: boolean, 
    inFallbackMode: boolean,
    instructions?: string 
  } {
    const status = {
      configured: this.isConfigured(),
      hasApiKey: !!this.apiKey,
      hasFolderId: !!this.folderId,
      inFallbackMode: this.fallbackMode,
      instructions: undefined as string | undefined
    };

    if (!status.configured) {
      let instructions = 'To enable real Google Drive integration:\n';
      
      if (!status.hasApiKey) {
        instructions += '1. Get a Google Drive API key from Google Cloud Console\n';
        instructions += '2. Add VITE_GOOGLE_API_KEY to your .env file\n';
      }
      
      if (!status.hasFolderId) {
        instructions += '3. Ensure VITE_GOOGLE_DRIVE_URL contains a valid Google Drive folder URL\n';
      }
      
      if (status.inFallbackMode) {
        instructions += '4. Make sure the Google Drive folder is publicly shared\n';
        instructions += '5. Enable Google Drive API for your API key in Google Cloud Console\n';
      }
      
      status.instructions = instructions;
    }

    return status;
  }

  // Get the main folder ID
  getMainFolderId(): string {
    return this.folderId;
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
}

// Export singleton instance
export const publicGoogleDriveService = new PublicGoogleDriveService();
export default publicGoogleDriveService;
