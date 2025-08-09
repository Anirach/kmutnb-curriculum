const express = require('express');
const GoogleDriveService = require('../services/googleDriveService');

const router = express.Router();
const driveService = new GoogleDriveService();

// Middleware to check if service is configured
const checkServiceConfiguration = (req, res, next) => {
  if (!driveService.isConfigured()) {
    return res.status(500).json({
      error: 'Service not configured',
      message: 'Google Drive service is not properly configured. Please check server environment variables.'
    });
  }
  next();
};

// Get root folder contents
router.get('/folders', checkServiceConfiguration, async (req, res) => {
  try {
    const files = await driveService.getFolderContents();
    res.json({
      success: true,
      data: files,
      count: files.length
    });
  } catch (error) {
    console.error('Error in /folders:', error);
    res.status(500).json({
      error: 'Failed to fetch folders',
      message: error.message
    });
  }
});

// Get specific folder contents
router.get('/folders/:folderId', checkServiceConfiguration, async (req, res) => {
  try {
    const { folderId } = req.params;
    const files = await driveService.getFolderContents(folderId);
    res.json({
      success: true,
      data: files,
      count: files.length,
      folderId: folderId
    });
  } catch (error) {
    console.error(`Error in /folders/${req.params.folderId}:`, error);
    res.status(500).json({
      error: 'Failed to fetch folder contents',
      message: error.message
    });
  }
});

// Search files
router.get('/search', checkServiceConfiguration, async (req, res) => {
  try {
    const { q: query, folderId } = req.query;
    
    if (!query) {
      return res.status(400).json({
        error: 'Missing query parameter',
        message: 'Please provide a search query using the "q" parameter'
      });
    }

    const files = await driveService.searchFiles(query, folderId);
    res.json({
      success: true,
      data: files,
      count: files.length,
      query: query,
      folderId: folderId || 'root'
    });
  } catch (error) {
    console.error('Error in /search:', error);
    res.status(500).json({
      error: 'Failed to search files',
      message: error.message
    });
  }
});

// Get file details
router.get('/files/:fileId', checkServiceConfiguration, async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await driveService.getFileById(fileId);
    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error(`Error in /files/${req.params.fileId}:`, error);
    res.status(500).json({
      error: 'Failed to fetch file',
      message: error.message
    });
  }
});

// Get folder info
router.get('/info/:folderId?', checkServiceConfiguration, async (req, res) => {
  try {
    const { folderId } = req.params;
    const folderInfo = await driveService.getFolderInfo(folderId);
    res.json({
      success: true,
      data: folderInfo
    });
  } catch (error) {
    console.error('Error in /info:', error);
    res.status(500).json({
      error: 'Failed to fetch folder info',
      message: error.message
    });
  }
});

// Health check for the drive service
router.get('/status', (req, res) => {
  const isConfigured = driveService.isConfigured();
  res.json({
    success: true,
    configured: isConfigured,
    message: isConfigured ? 'Google Drive service is ready' : 'Google Drive service needs configuration',
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || 'Not set'
  });
});

// Stream file content to client (download or inline viewing)
router.get('/files/:fileId/content', checkServiceConfiguration, async (req, res) => {
  try {
    const { fileId } = req.params;
    const content = await driveService.getFileContent(fileId);

    res.setHeader('Content-Type', content.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(content.name)}"`);

    content.stream
      .on('error', (err) => {
        console.error('Stream error:', err);
        res.status(500).end('Stream error');
      })
      .pipe(res);
  } catch (error) {
    console.error(`Error in /files/${req.params.fileId}/content:`, error);
    res.status(500).json({
      error: 'Failed to fetch file content',
      message: error.message
    });
  }
});

module.exports = router;
