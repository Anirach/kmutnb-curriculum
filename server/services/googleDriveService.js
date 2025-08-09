const { google } = require('googleapis');

class GoogleDriveService {
  constructor() {
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    this.folderCache = new Map(); // Cache folder info
    this.pathCache = new Map();   // Cache folder paths
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
      
      console.log(`🔍 Starting optimized search for "${query}" in folder: ${targetFolderId}`);
      const startTime = Date.now();

      // Strategy 1: Try Google Drive's global search first (fastest)
      try {
        console.log('🚀 Attempting global Drive search...');
        const globalResults = await this.globalDriveSearch(query, targetFolderId);
        if (globalResults.length > 0) {
          console.log(`✅ Global search found ${globalResults.length} results in ${Date.now() - startTime}ms`);
          return globalResults;
        }
      } catch (error) {
        console.log('⚠️ Global search failed, falling back to recursive search');
      }

      // Strategy 2: Optimized recursive search with parallel processing
      const results = await this.optimizedRecursiveSearch(query, targetFolderId);
      
      console.log(`🔍 Optimized search completed: ${results.length} items found in ${Date.now() - startTime}ms`);
      return results;

    } catch (error) {
      console.error('❌ Error searching files:', error.message);
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  async searchFilesRecursive(query, folderId, depth = 0) {
    const maxDepth = 8; // Limit depth for performance
    if (depth > maxDepth) {
      console.warn(`⚠️ Maximum search depth (${maxDepth}) reached for folder ${folderId}`);
      return [];
    }

    const indent = '  '.repeat(depth);
    console.log(`${indent}🔍 Searching in folder: ${folderId} (depth: ${depth})`);

    let allResults = [];

    try {
      // Search for both files AND folders matching the query in parallel
      const [fileResponse, matchingFolderResponse, allFoldersResponse] = await Promise.all([
        // Search for files
        this.drive.files.list({
          q: `name contains '${query}' and '${folderId}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`,
          fields: 'files(id,name,mimeType,parents,webViewLink,webContentLink,size,modifiedTime,thumbnailLink)',
          orderBy: 'name'
        }),
        // Search for folders that match the query
        this.drive.files.list({
          q: `name contains '${query}' and '${folderId}' in parents and trashed=false and mimeType = 'application/vnd.google-apps.folder'`,
          fields: 'files(id,name,mimeType,parents,webViewLink,webContentLink,modifiedTime,thumbnailLink)',
          orderBy: 'name'
        }),
        // Get all folders to recurse into
        this.drive.files.list({
          q: `'${folderId}' in parents and trashed=false and mimeType = 'application/vnd.google-apps.folder'`,
          fields: 'files(id,name)',
          orderBy: 'name'
        })
      ]);

      const files = fileResponse.data.files || [];
      const matchingFolders = matchingFolderResponse.data.files || [];
      const allFolders = allFoldersResponse.data.files || [];

      console.log(`${indent}� Found ${files.length} files, ${matchingFolders.length} matching folders`);

      // Get folder path once for performance
      const folderPath = folderId !== this.folderId ? await this.buildFilePath(folderId) : '/';

      // Add found files to results
      for (const file of files) {
        allResults.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          parents: file.parents,
          webViewLink: file.webViewLink,
          webContentLink: file.webContentLink,
          size: file.size,
          modifiedTime: file.modifiedTime,
          thumbnailLink: file.thumbnailLink,
          isFolder: false,
          path: folderPath
        });
      }

      // Add found folders to results
      for (const folder of matchingFolders) {
        allResults.push({
          id: folder.id,
          name: folder.name,
          mimeType: folder.mimeType,
          parents: folder.parents,
          webViewLink: folder.webViewLink,
          webContentLink: folder.webContentLink,
          modifiedTime: folder.modifiedTime,
          thumbnailLink: folder.thumbnailLink,
          isFolder: true,
          path: folderPath
        });
      }

      // Process subfolders in batches for better performance
      const batchSize = 3;
      for (let i = 0; i < allFolders.length; i += batchSize) {
        const batch = allFolders.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(folder => this.searchFilesRecursive(query, folder.id, depth + 1))
        );
        
        for (const subResults of batchResults) {
          allResults.push(...subResults);
        }
      }

    } catch (error) {
      console.error(`${indent}❌ Error searching in folder ${folderId}:`, error.message);
      // Continue with other folders even if one fails
    }

    return allResults;
  }

  // New: Global Drive search (fastest when it works)
  async globalDriveSearch(query, rootFolderId) {
    try {
      // Search all files/folders globally, then filter by ancestry
      const response = await this.drive.files.list({
        q: `name contains '${query}' and trashed=false`,
        fields: 'files(id,name,mimeType,parents,webViewLink,webContentLink,size,modifiedTime,thumbnailLink)',
        orderBy: 'name',
        pageSize: 1000 // Get more results in one call
      });

      const allItems = response.data.files || [];
      console.log(`🌐 Global search found ${allItems.length} total items`);

      // Filter items that are descendants of our root folder
      const validItems = [];
      for (const item of allItems) {
        if (await this.isDescendantOf(item.id, rootFolderId)) {
          const path = await this.getOptimizedPath(item.parents?.[0]);
          validItems.push({
            id: item.id,
            name: item.name,
            mimeType: item.mimeType,
            parents: item.parents,
            webViewLink: item.webViewLink,
            webContentLink: item.webContentLink,
            size: item.size,
            modifiedTime: item.modifiedTime,
            thumbnailLink: item.thumbnailLink,
            isFolder: item.mimeType === 'application/vnd.google-apps.folder',
            path: path
          });
        }
      }

      return validItems;
    } catch (error) {
      console.error('Global search failed:', error.message);
      throw error;
    }
  }

  // New: Optimized recursive search with bulk operations
  async optimizedRecursiveSearch(query, rootFolderId) {
    console.log('🔄 Starting bulk folder structure analysis...');
    
    // Step 1: Build complete folder structure in bulk
    const folderStructure = await this.buildFolderStructureBulk(rootFolderId);
    console.log(`📁 Analyzed ${folderStructure.size} folders in structure`);

    // Step 2: Search all folders in parallel batches
    const allFolderIds = Array.from(folderStructure.keys());
    const batchSize = 10; // Increase batch size for better performance
    const allResults = [];

    console.log(`🔍 Searching ${allFolderIds.length} folders in batches of ${batchSize}...`);

    for (let i = 0; i < allFolderIds.length; i += batchSize) {
      const batch = allFolderIds.slice(i, i + batchSize);
      console.log(`   Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allFolderIds.length/batchSize)}...`);
      
      const batchPromises = batch.map(folderId => this.searchInSingleFolder(query, folderId));
      const batchResults = await Promise.all(batchPromises);
      
      for (const results of batchResults) {
        allResults.push(...results);
      }
    }

    // Step 3: Add paths to results using cached structure
    const resultsWithPaths = allResults.map(item => ({
      ...item,
      path: this.pathCache.get(item.parents?.[0]) || '/'
    }));

    return resultsWithPaths;
  }

  // New: Build complete folder structure in bulk
  async buildFolderStructureBulk(rootFolderId, maxDepth = 6) {
    const folderStructure = new Map();
    const queue = [{ id: rootFolderId, depth: 0, path: '/' }];
    
    while (queue.length > 0) {
      const currentBatch = queue.splice(0, 15); // Process 15 folders at once
      
      if (currentBatch[0].depth >= maxDepth) {
        console.log(`⚠️ Reached maximum depth ${maxDepth}, stopping traversal`);
        break;
      }

      const batchPromises = currentBatch.map(async ({ id, depth, path }) => {
        try {
          const response = await this.drive.files.list({
            q: `'${id}' in parents and trashed=false and mimeType = 'application/vnd.google-apps.folder'`,
            fields: 'files(id,name)',
            pageSize: 1000
          });

          const folders = response.data.files || [];
          folderStructure.set(id, { folders, path, depth });
          
          // Cache the path for this folder
          this.pathCache.set(id, path);

          // Add subfolders to queue
          for (const folder of folders) {
            const subPath = path === '/' ? `/${folder.name}` : `${path}/${folder.name}`;
            queue.push({ id: folder.id, depth: depth + 1, path: subPath });
          }

          return folders.length;
        } catch (error) {
          console.error(`Error processing folder ${id}:`, error.message);
          return 0;
        }
      });

      const results = await Promise.all(batchPromises);
      const totalFolders = results.reduce((sum, count) => sum + count, 0);
      console.log(`   Processed batch: found ${totalFolders} subfolders`);
    }

    return folderStructure;
  }

  // New: Search in a single folder (optimized)
  async searchInSingleFolder(query, folderId) {
    try {
      // Search for both files and folders in one call using OR operator
      const response = await this.drive.files.list({
        q: `name contains '${query}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,parents,webViewLink,webContentLink,size,modifiedTime,thumbnailLink)',
        orderBy: 'name',
        pageSize: 1000
      });

      const items = response.data.files || [];
      
      return items.map(item => ({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        parents: item.parents,
        webViewLink: item.webViewLink,
        webContentLink: item.webContentLink,
        size: item.size,
        modifiedTime: item.modifiedTime,
        thumbnailLink: item.thumbnailLink,
        isFolder: item.mimeType === 'application/vnd.google-apps.folder'
      }));

    } catch (error) {
      console.error(`Error searching folder ${folderId}:`, error.message);
      return [];
    }
  }

  // New: Check if item is descendant of root (with caching)
  async isDescendantOf(itemId, rootFolderId) {
    if (itemId === rootFolderId) return true;
    
    // Use cache if available
    const cacheKey = `${itemId}->${rootFolderId}`;
    if (this.folderCache.has(cacheKey)) {
      return this.folderCache.get(cacheKey);
    }

    try {
      const item = await this.drive.files.get({
        fileId: itemId,
        fields: 'parents'
      });

      if (!item.data.parents || item.data.parents.length === 0) {
        this.folderCache.set(cacheKey, false);
        return false;
      }

      const parentId = item.data.parents[0];
      if (parentId === rootFolderId) {
        this.folderCache.set(cacheKey, true);
        return true;
      }

      // Recursively check parent
      const result = await this.isDescendantOf(parentId, rootFolderId);
      this.folderCache.set(cacheKey, result);
      return result;

    } catch (error) {
      this.folderCache.set(cacheKey, false);
      return false;
    }
  }

  // New: Optimized path building
  async getOptimizedPath(folderId) {
    if (!folderId || folderId === this.folderId) return '/';
    
    // Check cache first
    if (this.pathCache.has(folderId)) {
      return this.pathCache.get(folderId);
    }

    // Build path and cache it
    const path = await this.buildFilePath(folderId);
    this.pathCache.set(folderId, path);
    return path;
  }

  // Helper method to build file path for better context
  async buildFilePath(folderId) {
    if (!folderId || folderId === this.folderId) {
      return '/';
    }

    try {
      const folder = await this.drive.files.get({
        fileId: folderId,
        fields: 'name,parents'
      });

      const parentPath = folder.data.parents?.[0] 
        ? await this.buildFilePath(folder.data.parents[0])
        : '/';

      return parentPath === '/' 
        ? `/${folder.data.name}`
        : `${parentPath}/${folder.data.name}`;
        
    } catch (error) {
      console.error('Error building file path:', error.message);
      return '/unknown';
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

  // Add cache clearing method
  clearCaches() {
    this.folderCache.clear();
    this.pathCache.clear();
    console.log('🧹 Cleared search caches');
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
