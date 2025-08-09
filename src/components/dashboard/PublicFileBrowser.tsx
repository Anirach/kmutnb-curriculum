import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileItem } from './Dashboard';
import { 
  Folder, 
  FileText, 
  Download, 
  Eye,
  Home,
  ChevronRight
} from 'lucide-react';
import backendDriveService from '@/services/backendDriveService';

interface PublicFileBrowserProps {
  currentPath: string[];
  onPathChange: (path: string[], folderId?: string) => void;
  onFileSelect: (file: FileItem) => void;
  rootFolders: FileItem[];
  isLoading?: boolean;
}

export const PublicFileBrowser: React.FC<PublicFileBrowserProps> = ({
  currentPath,
  onPathChange,
  onFileSelect,
  rootFolders,
  isLoading = false
}) => {
  const formatFileSize = (size?: string) => {
    if (!size) return 'Unknown size';
    
    const sizeNum = parseInt(size);
    if (isNaN(sizeNum)) return 'Unknown size';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let formattedSize = sizeNum;
    
    while (formattedSize >= 1024 && unitIndex < units.length - 1) {
      formattedSize /= 1024;
      unitIndex++;
    }
    
    return `${formattedSize.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'ไม่ระบุวันที่';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'วันที่ไม่ถูกต้อง';
      
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'วันที่ไม่ถูกต้อง';
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'folder') {
      onPathChange([...currentPath, file.name], file.id);
    } else {
      onFileSelect(file);
    }
  };

  const handleDownload = (file: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.id) {
      const url = `${backendDriveService.getBaseUrl()}/api/drive/files/${file.id}/content`;
      window.open(url, '_blank');
    }
  };

  const handleView = (file: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.id) {
      const url = `${backendDriveService.getBaseUrl()}/api/drive/files/${file.id}/content`;
      window.open(url, '_blank');
    } else if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <div className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <Card className="flex-1">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            📁 ไฟล์และโฟลเดอร์ (โหมดสาธารณะ - อ่านอย่างเดียว)
          </CardTitle>
        </div>

        {/* Breadcrumb */}
        {currentPath.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 mt-2">
            <span
              className="cursor-pointer hover:text-blue-600"
              onClick={() => onPathChange([])}
            >
              🏠 Root
            </span>
            {currentPath.map((folder, index) => {
              const folderId = currentPath[index];
              return (
                <div key={index} className="flex items-center">
                  <span>/</span>
                  <span
                    className="cursor-pointer hover:text-blue-600"
                    onClick={() => onPathChange(currentPath.slice(0, index + 1))}
                  >
                    {folder}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rootFolders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>ไม่พบไฟล์หรือโฟลเดอร์</p>
              </div>
            ) : (
              rootFolders.map((file) => (
                <div key={file.id}>
                  {file.type === "folder" ? (
                    <div
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleFileClick(file)}
                    >
                      <div className="flex items-center space-x-3">
                        <Folder className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {file.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {file.lastModified ? formatDate(file.lastModified) : 'ไม่ระบุวันที่'}
                            {((Array.isArray(file.path) && file.path.length > 0) || 
                              (typeof file.path === 'string' && file.path !== '/')) && (
                              <span className="block text-xs text-blue-600 mt-1">
                                📁 {Array.isArray(file.path) ? file.path.join(' / ') : file.path}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleFileClick(file)}
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {file.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            📊 {file.size && formatFileSize(file.size)} • {file.lastModified ? formatDate(file.lastModified) : 'ไม่ระบุวันที่'}
                            {((Array.isArray(file.path) && file.path.length > 0) || 
                              (typeof file.path === 'string' && file.path !== '/')) && (
                              <span className="block text-xs text-blue-600 mt-1">
                                📁 {Array.isArray(file.path) ? file.path.join(' / ') : file.path}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons - read-only */}
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleView(file, e)}
                          title="ดูไฟล์"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDownload(file, e)}
                          title="ดาวน์โหลด"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
