import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  Folder,
  FileText,
  Search,
  ArrowLeft,
  Trash2,
  Download,
  Edit,
  RotateCw,
  Share2,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useUser } from "@/contexts/UserContext";
import { FileItem, GoogleDriveFile } from "./Dashboard";
import { FolderActions, FolderActionsRef } from "./FolderActions";
import { toast } from "@/hooks/use-toast";
import { UserRole } from "@/types/user";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { encryptedStorage } from "@/services/encryptedStorage";

// Helper function to sort files: folders first, then files, both in ascending alphabetical order
const sortFiles = (files: FileItem[]): FileItem[] => {
  return files.sort((a, b) => {
    // Folders come first
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;

    // Within the same type, sort alphabetically by name (case-insensitive)
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
};

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  isDestructive = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  // Ensure description is never empty to avoid accessibility warnings
  const safeDescription = description || "กรุณายืนยันการดำเนินการ";
  // Create unique ID based on the dialog type to avoid conflicts
  const dialogId = React.useMemo(() => 
    `confirmation-dialog-${title.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`,
    [title]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={dialogId}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id={dialogId}>
            {safeDescription}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button 
            variant={isDestructive ? "destructive" : "default"} 
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface FileBrowserProps {
  currentPath: string[];
  onPathChange: (path: string[]) => void;
  onFileSelect: (file: FileItem) => void;
  rootFolders?: FileItem[];
  userRole?: UserRole;
  accessToken?: string;
  onInsufficientScopeError?: () => Promise<void>;
  onRefreshRootFolders?: () => Promise<void>;
}

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (email: string, role: "reader" | "writer") => Promise<void>;
  folderName: string;
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  onShare,
  folderName,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"reader" | "writer">("reader");
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    if (!email) {
      toast({
        title: "กรุณากรอกอีเมล",
        description: "กรุณาระบุอีเมลของผู้ใช้ที่ต้องการแชร์",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSharing(true);
      await onShare(email, role);
      toast({
        title: "แชร์โฟลเดอร์สำเร็จ",
        description: `แชร์โฟลเดอร์ "${folderName}" กับ ${email} แล้ว`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแชร์โฟลเดอร์ได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Create unique ID for this dialog
  const shareDialogId = React.useMemo(() => 
    `share-folder-dialog-${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={shareDialogId}>
        <DialogHeader>
          <DialogTitle>แชร์โฟลเดอร์ "{folderName}"</DialogTitle>
          <DialogDescription id={shareDialogId}>
            เพิ่มผู้ใช้งานอื่นให้สามารถเข้าถึงโฟลเดอร์นี้ได้
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">อีเมลผู้ใช้</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>สิทธิ์การเข้าถึง</Label>
            <div className="flex space-x-4">
              <Button
                variant={role === "reader" ? "default" : "outline"}
                onClick={() => setRole("reader")}
                className="flex-1"
              >
                อ่านอย่างเดียว
              </Button>
              <Button
                variant={role === "writer" ? "default" : "outline"}
                onClick={() => setRole("writer")}
                className="flex-1"
              >
                แก้ไขได้
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleShare} disabled={isSharing}>
            {isSharing ? "กำลังแชร์..." : "แชร์"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const FileBrowser = ({
  currentPath,
  onPathChange,
  onFileSelect,
  rootFolders,
  userRole,
  accessToken,
  onInsufficientScopeError,
  onRefreshRootFolders,
}: FileBrowserProps) => {
  const { hasPermission, user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const folderActionsRef = useRef<FolderActionsRef>(null);

  const [folderNameCache, setFolderNameCache] = useState<
    Record<string, string>
  >({});
  const [loadingFolderNames, setLoadingFolderNames] = useState<
    Record<string, boolean>
  >({});
  const [failedFolderNames, setFailedFolderNames] = useState<
    Record<string, boolean>
  >({});

  const [searchResults, setSearchResults] = useState<FileItem[] | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const { driveUrl } = encryptedStorage.getOAuthSettings();

  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FileItem | null>(null);
  
  // Confirmation dialogs state
  const [showDeleteFolderDialog, setShowDeleteFolderDialog] = useState(false);
  const [showDeleteFileDialog, setShowDeleteFileDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FileItem | null>(null);

  const fetchDirectChildren = useCallback(
    async (
      folderId: string,
      token: string,
      forceRefresh = false
    ): Promise<FileItem[]> => {
      let allFiles: FileItem[] = [];
      let pageToken: string | null = null;

      try {
        do {
          const cacheBuster = forceRefresh ? `&_t=${Date.now()}` : "";
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=nextPageToken, files(id,name,mimeType,size,modifiedTime,parents,webViewLink,webContentLink)&access_token=${token}&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true${
              pageToken ? "&pageToken=" + pageToken : ""
            }${cacheBuster}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                ...(forceRefresh && {
                  "Cache-Control": "no-cache",
                  Pragma: "no-cache",
                }),
              },
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);

            // Handle 401 Unauthorized - token expired
            if (response.status === 401) {
              if (onInsufficientScopeError) {
                await onInsufficientScopeError();
                return [];
              }
            }

            if (
              response.status === 403 &&
              errorData.error?.message?.includes(
                "insufficient authentication scopes"
              )
            ) {
              if (onInsufficientScopeError) {
                await onInsufficientScopeError();
                return [];
              }
            }

            throw new Error(
              `Google Drive API error: ${
                errorData.error?.message || response.statusText
              }`
            );
          }

          const data = await response.json();
          if (data.files && Array.isArray(data.files)) {
            const items: FileItem[] = data.files.map(
              (item: GoogleDriveFile) => ({
                id: item.id,
                name: item.name,
                type:
                  item.mimeType === "application/vnd.google-apps.folder"
                    ? "folder"
                    : "file",
                path: [],
                url: item.webViewLink,
                downloadUrl: item.webContentLink,
                size: item.size,
                lastModified: item.modifiedTime
                  ? new Date(item.modifiedTime).toLocaleDateString()
                  : undefined,
                parents: item.parents,
                mimeType: item.mimeType,
              })
            );
            allFiles = [...allFiles, ...items];
            pageToken = data.nextPageToken || null;
          } else {
            pageToken = null;
          }
        } while (pageToken);

        return sortFiles(allFiles);
      } catch (error) {
        throw error;
      }
    },
    [onInsufficientScopeError]
  );

  // แก้ไข useEffect สำหรับการโหลดไฟล์
  useEffect(() => {
    const loadFiles = async () => {
      if (!accessToken || searchQuery !== "") {
        return;
      }

      // If we're at the root level and have rootFolders from Dashboard, use them
      if (currentPath.length === 0 && rootFolders && rootFolders.length > 0) {
        setFiles(rootFolders);
        return;
      }

      const match = driveUrl?.match(/folders\/([a-zA-Z0-9_-]+)/);
      const rootFolderId = match ? match[1] : null;
      const targetFolderId =
        currentPath.length > 0
          ? currentPath[currentPath.length - 1]
          : rootFolderId;

      if (!targetFolderId) {
        setFiles([]);
        return;
      }

      try {
        const isRefresh = refreshTrigger > 0;
        const directChildren = await fetchDirectChildren(
          targetFolderId,
          accessToken,
          isRefresh
        );
        setFiles(directChildren);
      } catch (error) {
        setFiles([]);
      }
    };

    loadFiles();
  }, [
    currentPath,
    accessToken,
    driveUrl,
    searchQuery,
    fetchDirectChildren,
    rootFolders,
    refreshTrigger,
  ]);

  // Function to get folder path for search results
  const getFolderPath = useCallback(
    async (parents: string[] | undefined): Promise<string> => {
      if (!parents || parents.length === 0 || !accessToken) {
        return "";
      }

      try {
        // Get the immediate parent folder name
        const parentId = parents[0];
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${parentId}?fields=name,parents&supportsAllDrives=true&supportsTeamDrives=true`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          return data.name || "";
        }
      } catch (error) {
        // Silently fail, just return empty path
      }

      return "";
    },
    [accessToken]
  );

  // Optimized search function: single API call, batch resolve folder paths
  const searchAllFolders = useCallback(
    async (
      folderId: string,
      query: string,
      visited: Set<string> = new Set()
    ): Promise<FileItem[]> => {
      if (visited.has(folderId)) {
        return [];
      }
      visited.add(folderId);

      try {
        let allResults: FileItem[] = [];
        let pageToken: string | null = null;

        // 1. Search for matching files in the current folder
        do {
          const q = `'${folderId}' in parents and name contains '${query}' and trashed=false`;
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,webViewLink,webContentLink)&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken ? "&pageToken=" + pageToken : ""}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          if (!response.ok) {
            if (response.status === 401 && onInsufficientScopeError) {
              await onInsufficientScopeError();
              return [];
            }
            break;
          }
          const data = await response.json();
          if (data.files && Array.isArray(data.files)) {
            const items: FileItem[] = await Promise.all(
              data.files.map(async (item: GoogleDriveFile) => {
                const folderPath = await getFolderPath(item.parents);
                return {
                  id: item.id,
                  name: item.name,
                  type: item.mimeType === "application/vnd.google-apps.folder" ? "folder" : "file",
                  path: [],
                  url: item.webViewLink,
                  downloadUrl: item.webContentLink,
                  size: item.size,
                  lastModified: item.modifiedTime
                    ? new Date(item.modifiedTime).toLocaleDateString()
                    : undefined,
                  parents: item.parents,
                  mimeType: item.mimeType,
                  folderPath: folderPath,
                };
              })
            );
            allResults = [...allResults, ...items];
          }
          pageToken = data.nextPageToken || null;
        } while (pageToken);

        // 2. Get all subfolders and search them recursively in parallel
        const foldersResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false+and+mimeType='application/vnd.google-apps.folder'&fields=files(id)&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (foldersResponse.ok) {
          const foldersData = await foldersResponse.json();
          if (foldersData.files && Array.isArray(foldersData.files)) {
            const subfolderPromises = foldersData.files.map((folder: { id: string }) =>
              searchAllFolders(folder.id, query, visited)
            );
            const subfolderResults = await Promise.all(subfolderPromises);
            allResults = [...allResults, ...subfolderResults.flat()];
          }
        }

        return allResults;
      } catch (error) {
        return [];
      }
    },
    [accessToken, onInsufficientScopeError, getFolderPath]
  );

  // แยก useEffect สำหรับการค้นหา
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery || !accessToken) {
        setSearchResults(null);
        return;
      }

      if (searchQuery.length < 2) {
        // Only search if query is at least 2 characters to avoid too many results
        setSearchResults(null);
        return;
      }

      setLoadingSearch(true);
      try {
        // Get the root folder ID for searching
        const match = driveUrl?.match(/folders\/([a-zA-Z0-9_-]+)/);
        const rootFolderId = match ? match[1] : null;
        
        if (!rootFolderId) {
          // Fallback to searching current folder only
          const filteredResults = files.filter((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setSearchResults(filteredResults);
        } else {
          // Search recursively from root or current folder
          const searchFromId = currentPath.length > 0 
            ? currentPath[currentPath.length - 1] 
            : rootFolderId;
          
          const searchResults = await searchAllFolders(searchFromId, searchQuery);
          setSearchResults(searchResults);
        }
      } catch (error) {
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, accessToken, files, driveUrl, currentPath, searchAllFolders]);

  // แยก useEffect สำหรับการโหลดชื่อโฟลเดอร์
  useEffect(() => {
    const fetchFolderNames = async () => {
      if (!accessToken || currentPath.length === 0) return;

      const newFolderNames: Record<string, string> = {};
      const newLoadingStates: Record<string, boolean> = {};
      const newFailedStates: Record<string, boolean> = {};

      for (const folderId of currentPath) {
        if (
          !folderNameCache[folderId] &&
          !loadingFolderNames[folderId] &&
          !failedFolderNames[folderId]
        ) {
          newLoadingStates[folderId] = true;
          try {
            const response = await fetch(
              `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name&supportsAllDrives=true&supportsTeamDrives=true&access_token=${accessToken}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (response.ok) {
              const data = await response.json();
              newFolderNames[folderId] = data.name;
            } else {
              newFailedStates[folderId] = true;
            }
          } catch (error) {
            newFailedStates[folderId] = true;
          } finally {
            newLoadingStates[folderId] = false;
          }
        }
      }

      if (Object.keys(newFolderNames).length > 0) {
        setFolderNameCache((prev) => ({ ...prev, ...newFolderNames }));
      }
      if (Object.keys(newLoadingStates).length > 0) {
        setLoadingFolderNames((prev) => ({ ...prev, ...newLoadingStates }));
      }
      if (Object.keys(newFailedStates).length > 0) {
        setFailedFolderNames((prev) => ({ ...prev, ...newFailedStates }));
      }
    };

    fetchFolderNames();
  }, [
    currentPath,
    accessToken,
    folderNameCache,
    loadingFolderNames,
    failedFolderNames,
  ]);

  const handleRefresh = async () => {
    toast({
      title: "รีเฟรชไฟล์",
      description: "กำลังโหลดข้อมูลล่าสุดจาก Google Drive...",
    });

    // If we're at root level and have a root folder refresh handler, use it
    if (
      currentPath.length === 0 &&
      rootFolders &&
      rootFolders.length > 0 &&
      onRefreshRootFolders
    ) {
      try {
        await onRefreshRootFolders();
      } catch (error) {
        // Error refreshing root folders
      }
    } else {
      // Otherwise use the local refresh trigger
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const getParentIdForNewFolder = (): string | undefined => {
    if (currentPath.length === 0) {
      const { driveUrl } = encryptedStorage.getOAuthSettings();
      if (!driveUrl) {
        return undefined;
      }
      const match = driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (!match || !match[1]) {
        return undefined;
      }
      return match[1];
    } else {
      return currentPath[currentPath.length - 1];
    }
  };

  const addNewFolder = async (folderName: string) => {
    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    try {
      const parentId = getParentIdForNewFolder();

      if (!parentId) {
        throw new Error("ไม่สามารถระบุโฟลเดอร์หลักสำหรับสร้างโฟลเดอร์ได้");
      }

      const response = await fetch(
        "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&supportsTeamDrives=true",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: folderName.trim(),
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        // Check for insufficient scope error
        if (
          response.status === 403 &&
          errorData.error?.message?.includes(
            "insufficient authentication scopes"
          )
        ) {
          if (onInsufficientScopeError) {
            await onInsufficientScopeError();
            return;
          }
        }

        const errorMessage =
          errorData?.error?.message || response.statusText || "Unknown error";
        throw new Error(`เกิดข้อผิดพลาดในการสร้างโฟลเดอร์: ${errorMessage}`);
      }

      toast({
        title: "สร้างโฟลเดอร์สำเร็จ",
        description: `สร้างโฟลเดอร์ "${folderName}" ใน Google Drive เรียบร้อยแล้ว`,
      });

      handleRefresh();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description:
          error instanceof Error
            ? error.message
            : "ไม่สามารถสร้างโฟลเดอร์ใน Google Drive ได้",
        variant: "destructive",
      });
      throw error;
    }
  };

  const renameFolder = async (oldName: string, newName: string) => {
    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    try {
      const folderToRename = files.find(
        (f) => f.name === oldName && f.type === "folder"
      );
      if (!folderToRename?.id) {
        throw new Error("ไม่พบโฟลเดอร์ที่ต้องการเปลี่ยนชื่อ");
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderToRename.id}?supportsAllDrives=true&supportsTeamDrives=true`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newName.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        // Check for insufficient scope error
        if (
          response.status === 403 &&
          errorData.error?.message?.includes(
            "insufficient authentication scopes"
          )
        ) {
          if (onInsufficientScopeError) {
            await onInsufficientScopeError();
            return;
          }
        }

        throw new Error(
          `เกิดข้อผิดพลาดในการเปลี่ยนชื่อโฟลเดอร์: ${response.status} ${response.statusText}`
        );
      }

      toast({
        title: "เปลี่ยนชื่อโฟลเดอร์สำเร็จ",
        description: `เปลี่ยนชื่อโฟลเดอร์เป็น "${newName}" เรียบร้อยแล้ว`,
      });

      handleRefresh();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description:
          error instanceof Error
            ? error.message
            : "ไม่สามารถเปลี่ยนชื่อโฟลเดอร์ได้",
        variant: "destructive",
      });
      throw error;
    }
  };

  // เพิ่มฟังก์ชันสำหรับเปลี่ยนชื่อไฟล์
  const renameFile = async (fileId: string, newName: string) => {
    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&supportsTeamDrives=true`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newName.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        // Check for insufficient scope error
        if (
          response.status === 403 &&
          errorData.error?.message?.includes(
            "insufficient authentication scopes"
          )
        ) {
          if (onInsufficientScopeError) {
            await onInsufficientScopeError();
            return;
          }
        }

        const errorMessage =
          errorData?.error?.message || response.statusText || "Unknown error";
        throw new Error(`เกิดข้อผิดพลาดในการเปลี่ยนชื่อไฟล์: ${errorMessage}`);
      }

      toast({
        title: "เปลี่ยนชื่อไฟล์สำเร็จ",
        description: `เปลี่ยนชื่อไฟล์เป็น "${newName}" เรียบร้อยแล้ว`,
      });

      handleRefresh(); // รีเฟรชรายการหลังจากเปลี่ยนชื่อ
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description:
          error instanceof Error
            ? error.message
            : "ไม่สามารถเปลี่ยนชื่อไฟล์ได้",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    try {
      // Add support for shared drives and ensure proper permissions
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}?supportsAllDrives=true&supportsTeamDrives=true`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        // Handle 401 Unauthorized - token expired
        if (response.status === 401) {
          if (onInsufficientScopeError) {
            await onInsufficientScopeError();
            return;
          }
        }

        // Check for insufficient scope error
        if (
          response.status === 403 &&
          errorData?.error?.message?.includes(
            "insufficient authentication scopes"
          )
        ) {
          if (onInsufficientScopeError) {
            await onInsufficientScopeError();
            return;
          }
        }

        // Handle specific 404 not found errors
        if (response.status === 404) {
          const errorMessage = errorData?.error?.message || response.statusText;
          if (errorMessage.includes("File not found") || errorMessage.includes("not found")) {
            throw new Error("ไม่พบโฟลเดอร์ที่ต้องการลบ โฟลเดอร์อาจถูกลบไปแล้วหรือไม่มีอยู่จริง");
          } else {
            throw new Error(`ไม่พบโฟลเดอร์: ${errorMessage}`);
          }
        }

        // Handle specific 403 permission errors
        if (response.status === 403) {
          const errorMessage = errorData?.error?.message || response.statusText;
          if (errorMessage.includes("The user does not have sufficient permissions")) {
            throw new Error("คุณไม่มีสิทธิ์ในการลบโฟลเดอร์นี้ กรุณาติดต่อเจ้าของโฟลเดอร์");
          } else if (errorMessage.includes("File not found") || errorMessage.includes("does not exist")) {
            throw new Error("ไม่พบโฟลเดอร์ที่ต้องการลบ อาจถูกลบไปแล้ว");
          } else {
            throw new Error(`ไม่สามารถลบโฟลเดอร์ได้: ${errorMessage}`);
          }
        }

        throw new Error(
          `เกิดข้อผิดพลาดในการลบโฟลเดอร์: ${response.status} ${response.statusText}`
        );
      }

      toast({
        title: "ลบโฟลเดอร์สำเร็จ",
        description: `ลบโฟลเดอร์เรียบร้อยแล้ว`,
      });

      handleRefresh();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description:
          error instanceof Error ? error.message : "ไม่สามารถลบโฟลเดอร์ได้",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getFolderName = (folderId: string): string => {
    return (
      folderNameCache[folderId] ||
      (loadingFolderNames[folderId] ? "Loading..." : folderId)
    );
  };

  const handleItemClick = useCallback(
    async (item: FileItem) => {
      if (item.type === "folder") {
        const newPath = [...currentPath, item.id];
        onPathChange(newPath);
      } else {
        if (!accessToken) {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่พบ Access Token ไม่สามารถเปิดไฟล์ได้",
            variant: "destructive",
          });
          return;
        }

        try {
          let fileContentUrl: string;

          // สำหรับ Google Native files (Docs, Sheets, etc.)
          if (
            item.mimeType &&
            item.mimeType.startsWith("application/vnd.google-apps.")
          ) {
            // ใช้ export endpoint สำหรับ Google Docs
            fileContentUrl = `https://www.googleapis.com/drive/v3/files/${item.id}/export?mimeType=application/pdf`;
          } else {
            // ใช้ alt=media endpoint สำหรับไฟล์ทั่วไป
            fileContentUrl = `https://www.googleapis.com/drive/v3/files/${item.id}?alt=media`;
          }

          // ดึงเนื้อหาไฟล์โดยตรงจาก Google Drive API
          const response = await fetch(fileContentUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/pdf", // ระบุว่าเราต้องการ PDF
            },
          });

          if (!response.ok) {
            const errorText = await response.text();

            // Check for 401 Unauthorized - token expired
            if (response.status === 401) {
              if (onInsufficientScopeError) {
                await onInsufficientScopeError();
                return;
              }
            }

            // Check for insufficient scope error
            if (
              response.status === 403 &&
              errorText.includes("insufficient authentication scopes")
            ) {
              if (onInsufficientScopeError) {
                await onInsufficientScopeError();
                return;
              }
            }

            toast({
              title: "เกิดข้อผิดพลาดในการเปิดไฟล์",
              description: `ไม่สามารถดึงเนื้อหาไฟล์ได้: ${
                response.statusText || response.status
              }`,
              variant: "destructive",
            });
            return;
          }

          // รับเนื้อหาไฟล์เป็น Blob
          const fileBlob = await response.blob();
          const blobUrl = URL.createObjectURL(fileBlob);

          // ส่ง Blob URL และข้อมูล FileItem ไปให้ Dashboard/PDFViewer
          onFileSelect({ ...item, url: blobUrl });
        } catch (error) {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: `ไม่สามารถเปิดไฟล์ได้: ${
              error instanceof Error ? error.message : String(error)
            }`,
            variant: "destructive",
          });
        }
      }
    },
    [
      currentPath,
      onPathChange,
      onFileSelect,
      accessToken,
      onInsufficientScopeError,
    ]
  );

  const handleUpload = () => {
    if (!hasPermission("upload")) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to upload files.",
        variant: "destructive",
      });
      return;
    }

    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    const parentId =
      currentPath.length === 0
        ? getParentIdForNewFolder()
        : currentPath[currentPath.length - 1];

    if (!parentId) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถระบุโฟลเดอร์ปลายทางสำหรับการอัปโหลดได้",
        variant: "destructive",
      });
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const metadata = {
          name: file.name,
          parents: [parentId],
        };

        const form = new FormData();
        form.append(
          "metadata",
          new Blob([JSON.stringify(metadata)], { type: "application/json" })
        );
        form.append("file", file);

        try {
          const response = await fetch(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&supportsTeamDrives=true",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              body: form,
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);

            // Check for insufficient scope error
            if (
              response.status === 403 &&
              errorData.error?.message?.includes(
                "insufficient authentication scopes"
              )
            ) {
              if (onInsufficientScopeError) {
                await onInsufficientScopeError();
                return;
              }
            }

            const errorMessage =
              errorData?.error?.message ||
              response.statusText ||
              "Unknown error";
            throw new Error(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${errorMessage}`);
          }

          const result = await response.json();

          toast({
            title: "อัปโหลดสำเร็จ",
            description: `${file.name} อัปโหลดขึ้น Google Drive เรียบร้อยแล้ว`,
          });

          handleRefresh();
        } catch (error) {
          toast({
            title: "เกิดข้อผิดพลาด",
            description:
              error instanceof Error
                ? error.message
                : "ไม่สามารถอัปโหลดไฟล์ขึ้น Google Drive ได้",
            variant: "destructive",
          });
        }
      }
    };
    input.click();
  };

  const handleDelete = async (file: FileItem) => {
    if (!hasPermission("delete")) {
      toast({
        title: "ไม่มีสิทธิ์",
        description: "คุณไม่มีสิทธิ์ในการลบไฟล์",
        variant: "destructive",
      });
      return;
    }

    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog for file deletion
    setItemToDelete(file);
    setShowDeleteFileDialog(true);
  };

  const confirmDeleteFile = async () => {
    if (!itemToDelete) return;

    try {
      const isAdminUser = userRole === 'Admin';
      let deleteSuccessful = false;
      let finalResponse: Response | null = null;
      let finalErrorData: { error?: { message?: string; code?: string; domain?: string } } | null = null;

      // Method 1: Try DELETE first
      console.log('Method 1: Attempting DELETE operation for file:', itemToDelete.name, 'ID:', itemToDelete.id);
      console.log('User role:', userRole, 'Is admin:', isAdminUser);
      console.log('File details:', { 
        mimeType: itemToDelete.mimeType, 
        parents: itemToDelete.parents,
        currentPath: currentPath 
      });

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${itemToDelete.id}?supportsAllDrives=true&supportsTeamDrives=true`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        deleteSuccessful = true;
        console.log('Method 1: DELETE successful');
      } else {
        finalResponse = response;
        finalErrorData = await response.json().catch(() => null);
        console.log('Method 1: DELETE failed:', response.status, finalErrorData);
        console.log('Error details:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage: finalErrorData?.error?.message,
          errorCode: finalErrorData?.error?.code,
          errorDomain: finalErrorData?.error?.domain
        });
        
        // For 403 errors, skip the generic trash fallback and go to specialized error handling
        if (response.status === 403) {
          console.log('403 error detected, skipping generic trash fallback for specialized handling');
        } else {
          // Method 2: If DELETE failed with non-403 error, try PATCH to trash as fallback
          console.log('Method 2: Attempting PATCH to trash as fallback for non-403 error');
          const trashResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${itemToDelete.id}?supportsAllDrives=true&supportsTeamDrives=true`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                trashed: true,
              }),
            }
          );

          if (trashResponse.ok) {
            deleteSuccessful = true;
            console.log('Method 2: PATCH to trash successful');
            toast({
              title: "ย้ายไฟล์ไปถังขยะสำเร็จ",
              description: `ย้ายไฟล์ "${itemToDelete.name}" ไปถังขยะเรียบร้อยแล้ว`,
            });
            handleRefresh();
            return;
          } else {
            const trashErrorData = await trashResponse.json().catch(() => null);
            console.log('Method 2: PATCH to trash failed:', trashResponse.status, trashErrorData);
          }
        }
      }

      if (!deleteSuccessful && finalResponse) {
        console.log('All deletion methods failed for file, processing error response');
        const errorData = finalErrorData;
        console.log('Delete API Error:', { status: finalResponse.status, errorData });

        // Handle 401 Unauthorized - token expired
        if (finalResponse.status === 401) {
          if (onInsufficientScopeError) {
            await onInsufficientScopeError();
            return;
          }
        }

        // Check for insufficient scope error
        if (
          finalResponse.status === 403 &&
          errorData?.error?.message?.includes(
            "insufficient authentication scopes"
          )
        ) {
          if (onInsufficientScopeError) {
            await onInsufficientScopeError();
            return;
          }
        }

        // Handle specific 403 permission errors for files
        if (finalResponse.status === 403) {
          const errorMessage = errorData?.error?.message || finalResponse.statusText;
          console.log('403 Permission Error:', errorMessage);
          
          // For admin users with 403 errors, try alternative approaches
          if (isAdminUser) {
            console.log('Admin user detected, trying enhanced fallback methods for 403 error');
            console.log('Original error details:', {
              message: errorMessage,
              fullError: errorData,
              responseStatus: finalResponse.status
            });
            
            // Check for common Google Drive permission issues
            if (errorMessage.includes("The user does not have sufficient permissions") || 
                errorMessage.includes("insufficient permissions") ||
                errorMessage.includes("User does not have edit access")) {
              
              // Admin Method 1: Try to use a different API approach - files.update instead of files.delete
              console.log('Admin Method 1: Attempting files.update with trashed=true...');
              try {
                const updateResponse = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${itemToDelete.id}?supportsAllDrives=true&supportsTeamDrives=true`,
                  {
                    method: "PATCH",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      trashed: true,
                    }),
                  }
                );

                console.log('Admin Method 1 response:', updateResponse.status);
                
                if (updateResponse.ok) {
                  console.log('Admin Method 1 successful: File moved to trash');
                  toast({
                    title: "ย้ายไฟล์ไปถังขยะสำเร็จ",
                    description: `ย้ายไฟล์ "${itemToDelete.name}" ไปถังขยะเรียบร้อยแล้ว (Admin method)`,
                  });
                  handleRefresh();
                  return;
                } else {
                  const updateError = await updateResponse.json().catch(() => null);
                  console.log('Admin Method 1 failed:', updateResponse.status, updateError);
                }
              } catch (updateError) {
                console.log('Admin Method 1 exception:', updateError);
              }
              
              // Admin Method 2: Try to remove from parent and trash
              console.log('Admin Method 2: Attempting to remove parent relationship...');
              try {
                const currentParent = currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'root';
                console.log('Current parent for removal:', currentParent);
                
                const removeParentResponse = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${itemToDelete.id}?supportsAllDrives=true&removeParents=${currentParent}`,
                  {
                    method: "PATCH",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      trashed: true,
                    }),
                  }
                );

                console.log('Admin Method 2 response:', removeParentResponse.status);
                
                if (removeParentResponse.ok) {
                  console.log('Admin Method 2 successful: Parent removed and file trashed');
                  toast({
                    title: "ย้ายไฟล์ไปถังขยะสำเร็จ",
                    description: `ย้ายไฟล์ "${itemToDelete.name}" ไปถังขยะเรียบร้อยแล้ว (Admin advanced method)`,
                  });
                  handleRefresh();
                  return;
                } else {
                  const removeError = await removeParentResponse.json().catch(() => null);
                  console.log('Admin Method 2 failed:', removeParentResponse.status, removeError);
                }
              } catch (removeError) {
                console.log('Admin Method 2 exception:', removeError);
              }
              
              // Admin Method 3: Try to check file permissions first
              console.log('Admin Method 3: Checking file permissions...');
              try {
                const permResponse = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${itemToDelete.id}/permissions?supportsAllDrives=true`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  }
                );
                
                if (permResponse.ok) {
                  const permissions = await permResponse.json();
                  console.log('File permissions:', permissions);
                  
                  // Check if we have any write permissions
                  const hasWriteAccess = permissions.permissions?.some((perm: { role: string }) => 
                    perm.role === 'writer' || perm.role === 'owner'
                  );
                  
                  if (!hasWriteAccess) {
                    console.log('No write access detected for file');
                    toast({
                      title: "ข้อมูลสำหรับ Admin",
                      description: `ไฟล์ "${itemToDelete.name}" ไม่มีสิทธิ์เขียน กรุณาขอให้เจ้าของไฟล์เพิ่มสิทธิ์ Editor`,
                      variant: "destructive",
                    });
                    return;
                  }
                } else {
                  console.log('Cannot check file permissions:', permResponse.status);
                }
              } catch (permError) {
                console.log('Admin Method 3 exception:', permError);
              }
              
              // All admin methods failed - provide detailed guidance
              toast({
                title: "ข้อมูลสำหรับ Admin",
                description: `ไฟล์ "${itemToDelete.name}" ต้องการสิทธิ์พิเศษ:
1. ขอให้เจ้าของไฟล์เพิ่มคุณเป็น Editor หรือ Owner
2. ตรวจสอบว่าไฟล์อยู่ใน Shared Drive ที่คุณมีสิทธิ์
3. ลองจัดการใน Google Drive โดยตรง
4. ติดต่อ Google Workspace Admin ถ้าจำเป็น

รายละเอียดข้อผิดพลาด: ${errorMessage}`,
                variant: "destructive",
              });
              return;
            }
          } else {
            // Standard user error handling
            if (errorMessage.includes("The user does not have sufficient permissions") || 
                errorMessage.includes("insufficient permissions") ||
                errorMessage.includes("User does not have edit access")) {
              throw new Error("คุณไม่มีสิทธิ์ในการลบไฟล์นี้ กรุณาติดต่อเจ้าของไฟล์หรือขอสิทธิ์ Editor");
            }
          }
          
          if (errorMessage.includes("File not found") || errorMessage.includes("does not exist")) {
            throw new Error("ไม่พบไฟล์ที่ต้องการลบ อาจถูกลบไปแล้ว");
          } else if (errorMessage.includes("The file is in the trash")) {
            throw new Error("ไฟล์นี้อยู่ในถังขยะแล้ว");
          } else {
            // Generic 403 error with role-specific message
            const helpText = isAdminUser 
              ? " (Admin: ตรวจสอบว่าได้รับสิทธิ์ Editor หรือ Owner จากเจ้าของไฟล์ หรือลองใน Google Drive โดยตรง)" 
              : " กรุณาติดต่อ Admin หรือเจ้าของไฟล์";
            throw new Error(`ไม่สามารถลบไฟล์ได้: ${errorMessage}${helpText}`);
          }
        }

        throw new Error(
          `เกิดข้อผิดพลาดในการลบไฟล์: ${finalResponse.status} ${finalResponse.statusText}`
        );
      }

      if (deleteSuccessful) {
        toast({
          title: "ลบไฟล์สำเร็จ",
          description: `ลบไฟล์ "${itemToDelete.name}" เรียบร้อยแล้ว`,
        });

        handleRefresh();
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description:
          error instanceof Error ? error.message : "ไม่สามารถลบไฟล์ได้",
        variant: "destructive",
      });
    } finally {
      // Clean up all dialog states properly
      setShowDeleteFileDialog(false);
      setItemToDelete(null);
    }
  };

  const handleDownload = async (file: FileItem) => {
    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    try {
      let downloadUrl: string;

      // สำหรับ Google Native files (Docs, Sheets, etc.)
      if (
        file.mimeType &&
        file.mimeType.startsWith("application/vnd.google-apps.")
      ) {
        // ใช้ export endpoint สำหรับ Google Docs เป็น PDF
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/pdf`;
      } else {
        // ใช้ alt=media endpoint สำหรับไฟล์ทั่วไป
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
      }

      // ดึงเนื้อหาไฟล์โดยตรงจาก Google Drive API
      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/pdf", // ระบุว่าเราต้องการ PDF
        },
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Check for insufficient scope error
        if (
          response.status === 403 &&
          errorText.includes("insufficient authentication scopes")
        ) {
          if (onInsufficientScopeError) {
            await onInsufficientScopeError();
            return;
          }
        }

        toast({
          title: "เกิดข้อผิดพลาดในการดาวน์โหลด",
          description: `ไม่สามารถดาวน์โหลดไฟล์ได้: ${
            response.statusText || response.status
          }`,
          variant: "destructive",
        });
        return;
      }

      // รับเนื้อหาไฟล์เป็น Blob
      const fileBlob = await response.blob();
      const blobUrl = URL.createObjectURL(fileBlob);

      // สร้างลิงก์สำหรับดาวน์โหลด
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      toast({
        title: "ดาวน์โหลดสำเร็จ",
        description: `ดาวน์โหลด ${file.name} เรียบร้อยแล้ว`,
      });
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถดาวน์โหลดไฟล์ได้: ${
          error instanceof Error ? error.message : String(error)
        }`,
        variant: "destructive",
      });
    }
  };

  const handleView = async (file: FileItem) => {
    if (!hasPermission("view")) {
      toast({
        title: "ไม่มีสิทธิ์",
        description: "คุณไม่มีสิทธิ์ในการดูไฟล์",
        variant: "destructive",
      });
      return;
    }

    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    try {
      let fileUrl: string;

      // สำหรับ Google Native files (Docs, Sheets, etc.)
      if (
        file.mimeType &&
        file.mimeType.startsWith("application/vnd.google-apps.")
      ) {
        // ใช้ export endpoint สำหรับ Google Docs
        fileUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/pdf&access_token=${accessToken}`;
      } else {
        // ใช้ webViewLink สำหรับไฟล์ทั่วไป
        fileUrl = file.url || "";
      }

      if (!fileUrl) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถเปิดไฟล์ได้",
          variant: "destructive",
        });
        return;
      }

      // เปิดไฟล์ในแท็บใหม่
      window.open(fileUrl, "_blank");
      toast({
        title: "เปิดไฟล์",
        description: `เปิด ${file.name} ในแท็บใหม่`,
      });
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถเปิดไฟล์ได้: ${
          error instanceof Error ? error.message : String(error)
        }`,
        variant: "destructive",
      });
    }
  };

  const handleRenameFolder = (folderName: string) => {
    if (folderActionsRef.current) {
      folderActionsRef.current.openRenameDialog(folderName);
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    if (!hasPermission("delete")) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete folders.",
        variant: "destructive",
      });
      return;
    }

    const folderToDelete = files.find(
      (f) => f.name === folderName && f.type === "folder"
    );
    if (!folderToDelete?.id) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบโฟลเดอร์ที่ต้องการลบ",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog for folder deletion
    setItemToDelete(folderToDelete);
    setShowDeleteFolderDialog(true);
  };

  const confirmDeleteFolder = async () => {
    if (!itemToDelete) return;
    
    try {
      await deleteFolder(itemToDelete.id);
      handleRefresh();
    } catch (error) {
      // Error is already handled and shown in deleteFolder function
      // No need to show additional toast here
    } finally {
      // Clean up all dialog states properly
      setShowDeleteFolderDialog(false);
      setItemToDelete(null);
    }
  };

  // เพิ่มฟังก์ชันสำหรับจัดการการเปลี่ยนชื่อไฟล์ (เปิด prompt)
  const handleRenameFile = (file: FileItem) => {
    if (!hasPermission("rename")) {
      // Assuming 'rename' permission exists
      toast({
        title: "ไม่มีสิทธิ์",
        description: "คุณไม่มีสิทธิ์ในการเปลี่ยนชื่อไฟล์",
        variant: "destructive",
      });
      return;
    }

    const newName = window.prompt(
      `เปลี่ยนชื่อไฟล์ "${file.name}" เป็น:`,
      file.name
    );
    if (
      newName !== null &&
      newName.trim() !== "" &&
      newName.trim() !== file.name
    ) {
      renameFile(file.id, newName.trim());
    } else if (newName !== null && newName.trim() === "") {
      toast({
        title: "ข้อผิดพลาด",
        description: "ชื่อไฟล์ใหม่ต้องไม่ว่างเปล่า",
        variant: "destructive",
      });
    }
  };

  const handleShareFolder = async (
    email: string,
    role: "reader" | "writer"
  ) => {
    if (!selectedFolder || !accessToken) return;

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${selectedFolder.id}/permissions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: role,
            type: "user",
            emailAddress: email,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();

        // Check for insufficient scope error
        if (
          response.status === 403 &&
          error.error?.message?.includes("insufficient authentication scopes")
        ) {
          if (onInsufficientScopeError) {
            await onInsufficientScopeError();
            return;
          }
        }

        throw new Error(error.error?.message || "Failed to share folder");
      }

      toast({
        title: "แชร์โฟลเดอร์สำเร็จ",
        description: `แชร์โฟลเดอร์ "${selectedFolder.name}" กับ ${email} แล้ว`,
      });
    } catch (error) {
      throw error;
    }
  };

  // Grant Editor Access to current user for a file/folder
  const handleGrantEditorAccess = async (item: FileItem) => {
    if (!user?.email || !accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบข้อมูลผู้ใช้หรือ Access Token",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${item.id}/permissions?supportsAllDrives=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "writer",
            type: "user",
            emailAddress: user.email,
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        toast({
          title: "ไม่สามารถเพิ่มสิทธิ์ Editor ได้",
          description: error?.error?.message || response.statusText,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "เพิ่มสิทธิ์ Editor สำเร็จ",
        description: `คุณได้รับสิทธิ์ Editor สำหรับ "${item.name}" แล้ว`,
      });
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="flex-1 m-4 mr-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {currentPath.length === 0
              ? "Faculties"
              : getFolderName(currentPath[currentPath.length - 1])}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <FolderActions
              ref={folderActionsRef}
              currentPath={currentPath}
              onPathChange={onPathChange}
              onRefresh={handleRefresh}
              onAddFolder={addNewFolder}
              onRenameFolder={renameFolder}
              disabled={!accessToken}
              userRole={userRole as UserRole}
              accessToken={accessToken}
              files={files}
              rootFolders={rootFolders}
            />
            {hasPermission("upload") && (
              <Button
                onClick={handleUpload}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RotateCw className="w-4 h-4" />
            </Button>
            {currentPath.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPathChange(currentPath.slice(0, -1))}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span
            className="cursor-pointer hover:text-blue-600"
            onClick={() => onPathChange([])}
          >
            Faculties
          </span>
          {currentPath.map((folderId, index) => (
            <div key={index} className="flex items-center">
              <span>/</span>
              <span
                className="cursor-pointer hover:text-blue-600"
                onClick={() => onPathChange(currentPath.slice(0, index + 1))}
              >
                {/* Show folder name if available, otherwise show loading or fallback */}
                {folderNameCache[folderId]
                  ? folderNameCache[folderId]
                  : loadingFolderNames[folderId]
                  ? "Loading..."
                  : failedFolderNames[folderId]
                  ? "Unknown Folder"
                  : "Loading..."}
              </span>
            </div>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent>
        {loadingSearch ? (
          <div className="text-center py-8 text-gray-500">
            <RotateCw className="w-12 h-12 mx-auto mb-2 opacity-50 animate-spin" />
            <p>กำลังค้นหา...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Show search results if searching, otherwise show regular files */}
            {(searchResults !== null ? searchResults : files).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>
                  {searchQuery !== ""
                    ? "ไม่พบผลลัพธ์การค้นหา"
                    : currentPath.length === 0
                    ? "ไม่พบข้อมูลใน Root Folder นี้"
                    : "ไม่พบข้อมูลในโฟลเดอร์นี้"}
                </p>
              </div>
            ) : (
              (searchResults !== null ? searchResults : files).map((file) => (
                <div key={file.id}>
                  {file.type === "folder" ? (
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <div
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleItemClick(file)}
                        >
                          <div className="flex items-center space-x-3">
                            <Folder className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {file.name}
                              </p>
                            </div>
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        {hasPermission("upload") && (
                          <ContextMenuItem
                            onClick={() => handleRenameFolder(file.name)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Rename
                          </ContextMenuItem>
                        )}
                        {hasPermission("delete") && (
                          <ContextMenuItem
                            onClick={() => handleDeleteFolder(file.name)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </ContextMenuItem>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                  ) : (
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <div
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleItemClick(file)}
                        >
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-red-600" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {file.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {file.size} • Modified {file.lastModified}
                                {/* Show folder path for search results */}
                                {searchResults !== null && file.folderPath && (
                                  <span className="ml-2 text-blue-600">
                                    • in {file.folderPath}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* ไอคอน View, Download, Delete กลับมาแสดงตรงนี้ */}
                          <div className="flex items-center space-x-1">
                            {hasPermission("view") && file.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleView(file);
                                }}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file);
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {hasPermission("rename") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameFile(file);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {hasPermission("delete") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(file);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </ContextMenuTrigger>

                      <ContextMenuContent>
                        {hasPermission("rename") && (
                          <ContextMenuItem
                            onClick={() => handleRenameFile(file)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Rename
                          </ContextMenuItem>
                        )}
                        {hasPermission("delete") && (
                          <ContextMenuItem onClick={() => handleDelete(file)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </ContextMenuItem>
                        )}
                        {hasPermission("view") && file.url && (
                          <ContextMenuItem onClick={() => handleView(file)}>
                            <FileText className="w-4 h-4 mr-2" />
                            View
                          </ContextMenuItem>
                        )}
                        <ContextMenuItem onClick={() => handleDownload(file)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </ContextMenuItem>
                        {hasPermission("delete") && userRole === "Admin" && (
                          <ContextMenuItem onClick={() => handleGrantEditorAccess(file)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Grant Editor Access (to me)
                          </ContextMenuItem>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => {
          setShowShareDialog(false);
          setSelectedFolder(null);
        }}
        onShare={handleShareFolder}
        folderName={selectedFolder?.name || ""}
      />

      {/* Enhanced Conditional Rendering: Only render dialogs with complete, validated data */}
      {itemToDelete && itemToDelete.id && itemToDelete.name && itemToDelete.type && (
        <>
          {/* Folder Deletion Dialog */}
          {showDeleteFolderDialog && itemToDelete.type === "folder" && (
            <ConfirmationDialog
              isOpen={showDeleteFolderDialog}
              onClose={() => {
                setShowDeleteFolderDialog(false);
                setItemToDelete(null);
              }}
              onConfirm={confirmDeleteFolder}
              title="ยืนยันการลบโฟลเดอร์"
              description={`คุณต้องการลบโฟลเดอร์ "${itemToDelete.name}" ใช่หรือไม่?\n\nการลบโฟลเดอร์จะลบไฟล์ทั้งหมดภายในโฟลเดอร์ด้วย`}
              confirmText="ลบโฟลเดอร์"
              cancelText="ยกเลิก"
              isDestructive={true}
            />
          )}

          {/* File Deletion Dialog */}
          {showDeleteFileDialog && itemToDelete.type !== "folder" && (
            <ConfirmationDialog
              isOpen={showDeleteFileDialog}
              onClose={() => {
                setShowDeleteFileDialog(false);
                setItemToDelete(null);
              }}
              onConfirm={confirmDeleteFile}
              title="ยืนยันการลบไฟล์"
              description={`คุณต้องการลบไฟล์ "${itemToDelete.name}" ใช่หรือไม่?`}
              confirmText="ลบไฟล์"
              cancelText="ยกเลิก"
              isDestructive={true}
            />
          )}
        </>
      )}
    </Card>
  );
};
