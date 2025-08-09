const { google } = require('googleapis');

class GoogleDriveService {
  constructor() {
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    this.initializeAuth();
  }

  initializeAuth() {
    try {
      // Parse the private key from environment variable
      const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
        ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')
        : null;

      if (!privateKey || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        throw new Error('Missing service account credentials');
      }

      // Create JWT client for service account authentication
      this.auth = new google.auth.JWT(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        null,
        privateKey,
        ['https://www.googleapis.com/auth/drive.readonly']
      );

      // Initialize Google Drive API
      this.drive = google.drive({ version: 'v3', auth: this.auth });

      console.log('✅ Google Drive Service Account initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive service:', error.message);
      throw error;
    }
  }

  async getFolderContents(folderId = null) {
    try {
      const targetFolderId = folderId || this.folderId;
      
      if (!targetFolderId) {
        throw new Error('No folder ID provided');
      }

      console.log(`📁 Fetching contents for folder: ${targetFolderId}`);

      const response = await this.drive.files.list({
        q: `'${targetFolderId}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,parents,webViewLink,webContentLink,size,modifiedTime,thumbnailLink)',
        orderBy: 'folder,name'
      });

      const files = response.data.files || [];
      console.log(`📄 Found ${files.length} items in folder`);

      return files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        parents: file.parents,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        size: file.size,
        modifiedTime: file.modifiedTime,
        thumbnailLink: file.thumbnailLink,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder'
      }));

    } catch (error) {
      console.error('❌ Error fetching folder contents:', error.message);
      throw new Error(`Failed to fetch folder contents: ${error.message}`);
    }
  }

  async searchFiles(query, folderId = null) {
    try {
      const targetFolderId = folderId || this.folderId;
      
      console.log(`🔍 Searching for "${query}" in folder: ${targetFolderId}`);

      // Search within the specified folder
      const searchQuery = `name contains '${query}' and '${targetFolderId}' in parents and trashed=false`;

      const response = await this.drive.files.list({
        q: searchQuery,
        fields: 'files(id,name,mimeType,parents,webViewLink,webContentLink,size,modifiedTime,thumbnailLink)',
        orderBy: 'folder,name'
      });

      const files = response.data.files || [];
      console.log(`🔍 Found ${files.length} items matching "${query}"`);

      return files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        parents: file.parents,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        size: file.size,
        modifiedTime: file.modifiedTime,
        thumbnailLink: file.thumbnailLink,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder'
      }));

    } catch (error) {
      console.error('❌ Error searching files:', error.message);
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  async getFileById(fileId) {
    try {
      console.log(`📄 Fetching file details for: ${fileId}`);

      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,parents,webViewLink,webContentLink,size,modifiedTime,thumbnailLink'
      });

      const file = response.data;
      
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        parents: file.parents,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        size: file.size,
        modifiedTime: file.modifiedTime,
        thumbnailLink: file.thumbnailLink,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder'
      };

    } catch (error) {
      console.error('❌ Error fetching file:', error.message);
      throw new Error(`Failed to fetch file: ${error.message}`);
    }
  }

  async getFolderInfo(folderId = null) {
    try {
      const targetFolderId = folderId || this.folderId;
      return await this.getFileById(targetFolderId);
    } catch (error) {
      console.error('❌ Error fetching folder info:', error.message);
      throw new Error(`Failed to fetch folder info: ${error.message}`);
    }
  }

  // Utility method to format file size
  formatFileSize(sizeString) {
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

  // Check if service is properly configured
  isConfigured() {
    return !!(this.auth && this.drive && this.folderId);
  }

  // NEW: Stream file content (handles Google Docs export to PDF)
  async getFileContent(fileId) {
    try {
      // Get basic metadata first
      const metaRes = await this.drive.files.get({
        fileId,
        fields: 'id,name,mimeType',
        supportsAllDrives: true
      });
      const file = metaRes.data;

      // Google Docs types require export
      const isGoogleDoc = file.mimeType && file.mimeType.startsWith('application/vnd.google-apps');

      if (isGoogleDoc) {
        // Map Google formats to exportable MIME types (default to PDF)
        let exportMime = 'application/pdf';
        switch (file.mimeType) {
          case 'application/vnd.google-apps.document':
            exportMime = 'application/pdf';
            break;
          case 'application/vnd.google-apps.spreadsheet':
            exportMime = 'application/pdf';
            break;
          case 'application/vnd.google-apps.presentation':
            exportMime = 'application/pdf';
            break;
          default:
            exportMime = 'application/pdf';
        }

        const exportRes = await this.drive.files.export(
          { fileId, mimeType: exportMime },
          { responseType: 'stream' }
        );

        return {
          stream: exportRes.data,
          mimeType: exportMime,
          name: file.name.endsWith('.pdf') ? file.name : `${file.name}.pdf`
        };
      }

      // Regular binary file download
      const downloadRes = await this.drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
      );

      return {
        stream: downloadRes.data,
        mimeType: file.mimeType || 'application/octet-stream',
        name: file.name
      };
    } catch (error) {
      console.error('❌ Error fetching file content:', error.message);
      throw new Error(`Failed to fetch file content: ${error.message}`);
    }
  }
}

module.exports = GoogleDriveService;
