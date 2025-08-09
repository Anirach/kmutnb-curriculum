import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicFileBrowser } from './dashboard/PublicFileBrowser';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileItem } from './dashboard/Dashboard';
import { ArrowLeft, FileText, Folder, Search, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { publicGoogleDriveService, GoogleDriveFile } from '@/services/publicGoogleDriveService';
import backendDriveService, { BackendDriveFile } from '@/services/backendDriveService';

export const PublicDashboard = () => {
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [rootFolders, setRootFolders] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);
  const [folderIdMap, setFolderIdMap] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Convert Google Drive file to FileItem (works with both API types)
  const convertToFileItem = useCallback((file: GoogleDriveFile | BackendDriveFile, path: string[] = []): FileItem => {
    return {
      id: file.id,
      name: file.name,
      type: file.mimeType === 'application/vnd.google-apps.folder' || (file as BackendDriveFile).isFolder ? 'folder' : 'file',
      path: [...path],
      url: file.webViewLink,
      downloadUrl: file.webContentLink,
      size: file.size ? backendDriveService.formatFileSize(file.size) : undefined,
      lastModified: file.modifiedTime,
      parents: file.parents,
      mimeType: file.mimeType
    };
  }, []);

  // Get real data from Google Drive via backend
  const initializePublicAccess = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching data from backend Google Drive service...');
      
      // Check if backend service is available
      const serviceStatus = await backendDriveService.checkServiceStatus();
      
      if (!serviceStatus.configured) {
        console.warn('Backend service not configured, trying fallback...');
        // If backend is not available, fall back to the old direct API service
        const configStatus = publicGoogleDriveService.getConfigurationStatus();
        
        if (configStatus.inFallbackMode) {
          console.warn('Using fallback demo data');
          toast({
            title: "โหมดสาธิต",
            description: "กำลังใช้ข้อมูลตัวอย่าง เนื่องจากไม่สามารถเชื่อมต่อ Google Drive ได้",
            variant: "default",
          });
        }
        
        const driveFiles = await publicGoogleDriveService.getRootFolders();
        const fileItems: FileItem[] = driveFiles.map(file => convertToFileItem(file));
        
        const newFolderIdMap = new Map<string, string>();
        driveFiles.forEach(file => {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            newFolderIdMap.set(file.name, file.id);
          }
        });
        
        setFolderIdMap(newFolderIdMap);
        setRootFolders(fileItems);
        setAccessToken('demo-mode');
        
        toast({
          title: "โหมดสาธิต",
          description: `ใช้ข้อมูลตัวอย่าง (${fileItems.length} รายการ)`,
          variant: "default",
        });
        
        return;
      }
      
      // Use backend service for real Google Drive data
      const driveFiles = await backendDriveService.getRootFolders();
      
      if (driveFiles.length === 0) {
        console.warn('No files found in Google Drive');
      }

      // Convert to FileItem format and create folder ID mapping
      const fileItems: FileItem[] = driveFiles.map(file => convertToFileItem(file));
      
      // Create mapping of folder names to their IDs for navigation
      const newFolderIdMap = new Map<string, string>();
      driveFiles.forEach(file => {
        if (file.isFolder) {
          newFolderIdMap.set(file.name, file.id);
        }
      });
      
      setFolderIdMap(newFolderIdMap);
      setRootFolders(fileItems);
      setAccessToken('backend-service');
      
      toast({
        title: "เชื่อมต่อสำเร็จ",
        description: `โหลดข้อมูลจาก Google Drive แล้ว (${fileItems.length} รายการ)`,
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error initializing public access:', error);
      const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถเข้าถึงระบบได้ในขณะนี้';
      setError(errorMessage);
      
      toast({
        title: "ข้อผิดพลาด",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [convertToFileItem, toast]);

  // Handle search via backend service
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      
      // Try backend service first
      const serviceStatus = await backendDriveService.checkServiceStatus();
      let driveFiles: (GoogleDriveFile | BackendDriveFile)[] = [];
      
      if (serviceStatus.configured) {
        driveFiles = await backendDriveService.searchFiles(query);
      } else {
        // Fallback to direct API service
        driveFiles = await publicGoogleDriveService.searchFiles(query);
      }
      
      const searchFileItems: FileItem[] = driveFiles.map(file => 
        convertToFileItem(file, ['Search Results'])
      );
      setSearchResults(searchFileItems);
      
      toast({
        title: "ผลการค้นหา",
        description: `พบ ${searchFileItems.length} ไฟล์`,
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error searching files:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "การค้นหาล้มเหลว กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [convertToFileItem, toast]);

  // Handle file selection
  const handleFileSelect = useCallback((file: FileItem) => {
    setSelectedFile(file);
  }, []);

  // Handle path change with backend Google Drive navigation
  const handlePathChange = useCallback(async (path: string[], directFolderId?: string) => {
    try {
      setCurrentPath(path);
      setIsLoading(true);
      
      if (path.length === 0) {
        // Back to root - reload initial folders
        await initializePublicAccess();
        return;
      }
      
      // Get the folder ID - either from parameter or from mapping
      let folderId = directFolderId;
      if (!folderId) {
        const folderName = path[path.length - 1];
        folderId = folderIdMap.get(folderName);
      }
      
      if (!folderId) {
        console.warn(`No folder ID found for: ${path[path.length - 1]}`);
        toast({
          title: "ข้อผิดพลาด",
          description: `ไม่พบโฟลเดอร์: ${path[path.length - 1]}`,
          variant: "destructive",
        });
        return;
      }
      
      // Try backend service first, then fallback to direct API
      const serviceStatus = await backendDriveService.checkServiceStatus();
      let driveFiles: (GoogleDriveFile | BackendDriveFile)[] = [];
      
      if (serviceStatus.configured) {
        driveFiles = await backendDriveService.getFolderContents(folderId);
      } else {
        driveFiles = await publicGoogleDriveService.getFolderContents(folderId);
      }
      
      const fileItems: FileItem[] = driveFiles.map(file => convertToFileItem(file, path));
      
      // Update folder ID mapping for sub-folders
      const newFolderIdMap = new Map(folderIdMap);
      driveFiles.forEach(file => {
        const isFolder = serviceStatus.configured ? 
          (file as BackendDriveFile).isFolder : 
          file.mimeType === 'application/vnd.google-apps.folder';
        
        if (isFolder) {
          newFolderIdMap.set(file.name, file.id);
        }
      });
      
      setFolderIdMap(newFolderIdMap);
      setRootFolders(fileItems);
      
    } catch (error) {
      console.error('Error changing path:', error);
      toast({
        title: "ข้อผิดพลาด", 
        description: "ไม่สามารถโหลดเนื้อหาโฟลเดอร์ได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [folderIdMap, convertToFileItem, initializePublicAccess, toast]);

  // Initialize public access on component mount
  useEffect(() => {
    initializePublicAccess();
  }, [initializePublicAccess]);

  // Handle back to landing page
  const handleBackToLanding = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-0">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">📚</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">KMUTNB Curriculum System</h1>
                <p className="text-sm text-gray-500">ระบบสืบค้นหลักสูตร - เข้าถึงแบบสาธารณะ</p>
              </div>
            </div>

            {/* Status and Back Button */}
            <div className="flex items-center gap-4">
              {/* Configuration Status */}
              {accessToken === 'backend-service' && (
                <div className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  ✅ Connected to Google Drive
                </div>
              )}
              {accessToken === 'demo-mode' && (
                <div className="text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  🔄 Demo Mode - Sample Data
                </div>
              )}
              
              {/* Back to Landing */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBackToLanding}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับหน้าหลัก
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        {/* Search Section */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border w-full max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ค้นหาไฟล์และโฟลเดอร์
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="พิมพ์คำค้นหา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery);
                }
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg w-full max-w-2xl">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Path Breadcrumb */}
        {currentPath.length > 0 && (
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border w-full max-w-4xl">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <button 
                onClick={() => {
                  setCurrentPath([]);
                  initializePublicAccess();
                }}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                🏠 หน้าหลัก
              </button>
              {currentPath.map((folder, index) => (
                <div key={index} className="flex items-center">
                  <span>/</span>
                  <button
                    onClick={() => handlePathChange(currentPath.slice(0, index + 1))}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {folder}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content - File Browser and PDF Viewer Side by Side */}
        <div className="flex h-[calc(100vh-280px)]">
          <div className="flex-1 flex">
            <div className="bg-white rounded-lg shadow-sm border flex-1">
              <PublicFileBrowser
                currentPath={currentPath}
                onPathChange={handlePathChange}
                onFileSelect={handleFileSelect}
                rootFolders={searchQuery && searchResults.length > 0 ? searchResults : rootFolders}
                isLoading={isLoading}
              />
            </div>
            {selectedFile && selectedFile.type === 'file' && (
              <div className="w-1/2 ml-4 bg-white rounded-lg shadow-sm border flex flex-col">
                {/* PDF Viewer Header */}
                <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold truncate">{selectedFile.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedFile.id) {
                            const url = `${backendDriveService.getBaseUrl()}/api/drive/files/${selectedFile.id}/content`;
                            window.open(url, '_blank');
                            toast({
                              title: "การดาวน์โหลด",
                              description: "เริ่มดาวน์โหลดไฟล์แล้ว",
                              variant: "default",
                            });
                          } else if (selectedFile.downloadUrl) {
                            window.open(selectedFile.downloadUrl, '_blank');
                            toast({
                              title: "การดาวน์โหลด",
                              description: "เริ่มดาวน์โหลดไฟล์แล้ว",
                              variant: "default",
                            });
                          } else {
                            toast({
                              title: "ข้อผิดพลาด",
                              description: "ไม่สามารถดาวน์โหลดไฟล์นี้ได้",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={!selectedFile.id && !selectedFile.downloadUrl}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        ดาวน์โหลด
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
                        ปิด
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="block">📁 โหมดการเข้าถึงสาธารณะ - อ่านอย่างเดียว</span>
                    <span className="block text-xs text-gray-500">
                      📊 ขนาดไฟล์: {selectedFile.size || 'ไม่ระบุ'} | 
                      📅 แก้ไขล่าสุด: {selectedFile.lastModified ? publicGoogleDriveService.formatDate(selectedFile.lastModified) : 'ไม่ระบุ'}
                    </span>
                  </div>
                </div>
                
                {/* PDF Viewer Content */}
                <div className="flex-1 overflow-hidden">
                  {selectedFile.mimeType?.includes('pdf') || selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={selectedFile.id ? `${backendDriveService.getBaseUrl()}/api/drive/files/${selectedFile.id}/content` : selectedFile.url}
                      className="w-full h-full border-0"
                      title={selectedFile.name}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-gray-50">
                      <FileText className="w-16 h-16 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">ไม่สามารถแสดงตัวอย่างได้</h3>
                      <p className="text-gray-500 text-center mb-4">
                        ไฟล์ประเภท {selectedFile.mimeType || 'ไม่ทราบ'} ไม่สามารถแสดงตัวอย่างในเบราว์เซอร์ได้
                      </p>
                      <p className="text-sm text-gray-400">
                        กรุณาดาวน์โหลดไฟล์เพื่อดูเนื้อหา
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
