
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, FileText } from 'lucide-react';
import { FileItem } from './Dashboard';

interface PDFViewerProps {
  file: FileItem;
  onClose: () => void;
}

export const PDFViewer = ({ file, onClose }: PDFViewerProps) => {
  const handleDownload = () => {
    // In a real app, this would download the actual file
    const link = document.createElement('a');
    link.href = file.url || '/sample.pdf';
    link.download = file.name;
    link.click();
  };

  return (
    <Card className="flex-1 m-4 ml-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            <FileText className="w-5 h-5 mr-2 text-red-600" />
            {file.name}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button onClick={handleDownload} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={onClose} size="sm" variant="outline">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          {file.size} • Modified {file.lastModified}
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="h-[calc(100vh-200px)] border rounded-lg overflow-hidden">
          <iframe
            src={file.url || '/sample.pdf'}
            className="w-full h-full"
            title={file.name}
          />
        </div>
      </CardContent>
    </Card>
  );
};
