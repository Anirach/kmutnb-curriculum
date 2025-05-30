import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { FolderPlus, Edit, Trash2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { toast } from '@/hooks/use-toast';
import { FileItem } from './Dashboard';
import { UserRole } from '@/types/user';

interface FolderActionsProps {
  currentPath: string[];
  onPathChange: (path: string[]) => void;
  onRefresh: () => void;
  onAddFolder: (folderName: string) => Promise<void>; // กำหนด type ให้ถูกต้อง
  onRenameFolder?: (oldName: string, newName: string) => Promise<void>; // กำหนด type ให้ถูกต้อง
  disabled?: boolean;
  userRole?: UserRole;
  accessToken?: string;
  files?: FileItem[]; // อาจจะไม่จำเป็นต้องใช้ props นี้แล้วในอนาคต แต่เก็บไว้ก่อน
  rootFolders?: FileItem[]; // อาจจะไม่จำเป็นต้องใช้ props นี้แล้วในอนาคต แต่เก็บไว้ก่อน
}

export interface FolderActionsRef {
  openRenameDialog: (folderName: string) => void;
}

export const FolderActions = forwardRef<FolderActionsRef, FolderActionsProps>(
  ({ currentPath, onPathChange, onRefresh, onAddFolder, onRenameFolder, disabled, userRole, accessToken, files, rootFolders }, ref) => {
    const { hasPermission } = useUser();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renameFolderName, setRenameFolderName] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<string>('');

    // canManageFolders ควรใช้ hasPermission('create') หรือ 'write' ถ้ามี
    // ตามที่เห็นใน FileBrowser ใช้ hasPermission('upload') ซึ่งก็พอใช้ได้
    const canManageFolders = hasPermission('upload'); 

    useImperativeHandle(ref, () => ({
      openRenameDialog: (folderName: string) => {
        setSelectedFolder(folderName);
        setRenameFolderName(folderName);
        setIsRenameOpen(true);
      }
    }));

    // แก้ไขฟังก์ชัน handleCreateFolder ให้เรียกใช้ onAddFolder prop
    const handleCreateFolder = async () => {
      if (!canManageFolders) {
        toast({
          title: "ไม่มีสิทธิ์",
          description: "คุณไม่มีสิทธิ์ในการสร้างโฟลเดอร์",
          variant: "destructive",
        });
        return;
      }
      if (!newFolderName.trim()) {
        toast({
          title: "ชื่อไม่ถูกต้อง",
          description: "กรุณากรอกชื่อโฟลเดอร์",
          variant: "destructive",
        });
        return;
      }
       // ไม่ต้องเช็ค accessToken ที่นี่ เพราะ addNewFolder ใน FileBrowser จะเช็คเอง
      // และแสดง error ถ้าไม่มี

      try {
        // เรียกใช้ prop onAddFolder ที่ได้รับจาก FileBrowser
        // FileBrowser จะจัดการ logic การหา parentId และเรียก Google Drive API เอง
        await onAddFolder(newFolderName.trim());

        // รีเซ็ตค่าและปิด dialog
        setNewFolderName('');
        setIsCreateOpen(false);
        
        // ไม่ต้องเรียก toast หรือ onRefresh ที่นี่ เพราะ onAddFolder ใน FileBrowser ทำแล้ว

      } catch (e) {
        // Error จะถูกจัดการและแสดง toast โดย addNewFolder ใน FileBrowser แล้ว
        console.error('Error caught after calling onAddFolder:', e);
        // อาจจะไม่ต้องทำอะไรเพิ่มเติมที่นี่ หรืออาจจะ log error เฉยๆ
      }
    };

    // แก้ไขฟังก์ชัน handleRenameFolder ให้เรียกใช้ onRenameFolder prop
    const handleRenameFolder = async () => { // ทำให้เป็น async
      if (!hasPermission('rename')) { // ควรเช็ค permission 'rename'
        toast({
          title: "Access Denied",
          description: "You don't have permission to rename folders.",
          variant: "destructive",
        });
        return;
      }

      if (!renameFolderName.trim()) {
        toast({
          title: "Invalid Name",
          description: "Please enter a valid folder name.",
          variant: "destructive",
        });
        return;
      }

      if (renameFolderName.trim() === selectedFolder) {
        setIsRenameOpen(false);
        return;
      }

      // Call the callback to rename the folder
      if (onRenameFolder) {
        try {
           await onRenameFolder(selectedFolder, renameFolderName.trim()); // เรียกใช้ prop
            // ไม่ต้องแสดง toast หรือ onRefresh ที่นี่ เพราะ onRenameFolder ใน FileBrowser ทำแล้ว
        } catch (e) {
           console.error('Error caught after calling onRenameFolder:', e);
            // อาจจะไม่ต้องทำอะไรเพิ่มเติมที่นี่
        }
      }

      setRenameFolderName('');
      setIsRenameOpen(false);
      // onRefresh ถูกเรียกใน onRenameFolder ของ FileBrowser แล้ว
    };

    // handleDeleteFolder ยังคงอยู่ใน FolderActions
    // แต่มันควรจะเรียก prop ที่มาจาก FileBrowser เช่นกัน
    // FolderBrowser ควรมี prop ondeleteFolder ที่รับ folderId
    // แล้ว FolderActions ก็หา folderId จาก files หรือ rootFolders แล้วเรียก prop นั้น
    // แต่จากโค้ด FileBrowser ที่มีอยู่, FileBrowser มี handleDeleteFolder ที่รับ folderName
    // และ FolderActions นี้ก็มีการเรียก handleDeleteFolder(file.name) ใน ContextMenu
    // เราจะปรับแก้ให้ handleDeleteFolder ในนี้หา folderId แล้วเรียก prop onDeleteFolder
    // แต่เนื่องจาก prop onDeleteFolder ยังไม่มีใน FolderActionsProps
    // เราจะใช้ handleDeleteFolder ในนี้เรียก API โดยตรงไปก่อน (เหมือนเดิม)
    // หรือควรปรับแก้ให้ FileBrowser ส่ง prop onDeleteFolder มาให้
    // เพื่อให้ FolderActions เรียก prop นั้นแทน

    // จากโค้ด FileBrowser ล่าสุด มี handleDeleteFolder ที่รับ folderName และเรียก deleteFolder(folderToDelete.id)
    // ซึ่ง deleteFolder รับ folderId
    // ดังนั้น FolderActions ควรจะเรียก prop ที่ส่ง folderId ไปให้ FileBrowser
    // แต่ ContextMenuTrigger ใน FileBrowser เรียก handleDeleteFolder ใน FileBrowser โดยตรง
    // ส่วน ContextMenu ใน FolderActions (ซึ่งไม่ได้ใช้แล้วใน FileBrowser ล่าสุด) มี handleDeleteFolder ที่รับ folderName

    // งั้นเราจะละส่วน handleDeleteFolder ใน FolderActions นี้ไปก่อน เพราะ FileBrowser ล่าสุดจัดการ ContextMenu เองแล้ว
    // และ handleDeleteFolder ใน FileBrowser ก็เรียก deleteFolder ด้วย folderId ถูกต้องแล้ว


    const openRenameDialog = (folderName: string) => {
      setSelectedFolder(folderName);
      setRenameFolderName(folderName);
      setIsRenameOpen(true);
    };

    // ในส่วนของ render, ปุ่ม New Folder จะเรียก handleCreateFolder
    // Dialog สำหรับ Rename ก็เรียก handleRenameFolder
    // ContextMenu สำหรับ Rename/Delete ถูกย้ายไปจัดการใน FileBrowser แล้ว

    return (
      <div className="flex items-center space-x-2">
        {canManageFolders && !disabled && accessToken && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(true); // เปิด dialog เมื่อคลิก
                }}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby="create-folder-description">
              <DialogHeader>
                <DialogTitle>สร้างโฟลเดอร์ใหม่</DialogTitle>
                <DialogDescription id="create-folder-description">
                  กรอกชื่อโฟลเดอร์ที่ต้องการสร้าง
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">ชื่อโฟลเดอร์</label>
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="กรอกชื่อโฟลเดอร์"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button
                    onClick={() => {
                      handleCreateFolder();
                    }}
                  >
                    สร้าง
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Rename Dialog */}
        {hasPermission('rename') && ( // ควรแสดง dialog ถ้ามีสิทธิ์ rename
            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
            <DialogContent aria-describedby="rename-folder-description">
              <DialogHeader>
                <DialogTitle>Rename Folder</DialogTitle>
                <DialogDescription id="rename-folder-description">
                  Enter a new name for "{selectedFolder}".
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">New Name</label>
                  <Input
                    value={renameFolderName}
                    onChange={(e) => setRenameFolderName(e.target.value)}
                    placeholder="Enter new name"
                    onKeyPress={(e) => e.key === 'Enter' && handleRenameFolder()}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRenameFolder}>
                    Rename
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

      </div>
    );
  }
);

FolderActions.displayName = 'FolderActions';

// ContextMenu ถูกย้ายไปจัดการใน FileBrowser แล้ว ไม่จำเป็นต้องใช้ FolderContextMenu ที่นี่
// ลบทิ้งหรือคอมเมนต์ส่วนนี้ออก
/*
export const FolderContextMenu = ({
  folder,
  onRename,
  onDelete,
  children
}: {
  folder: FileItem;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
  children: React.ReactNode;
}) => {
  const { hasPermission } = useUser();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {hasPermission('upload') && (
          <ContextMenuItem onClick={() => onRename(folder.name)}>
            <Edit className="w-4 h-4 mr-2" />
            Rename
          </ContextMenuItem>
        )}
        {hasPermission('delete') && (
          <ContextMenuItem onClick={() => onDelete(folder.name)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
*/
