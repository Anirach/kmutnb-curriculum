import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './Header';
import { FileBrowser } from './FileBrowser';
import { PDFViewer } from './PDFViewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { userService } from '@/services/userService';
import { UserRole } from '@/types/user';
import { AuthActionsProvider } from '@/contexts/AuthActionsContext';
import { Label } from '@/components/ui/label';
import { encryptedStorage, SENSITIVE_KEYS, EncryptedStorage } from '@/services/encryptedStorage';

export interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string[];
  url?: string;
  downloadUrl?: string;
  size?: string;
  lastModified?: string;
  parents?: string[];
  mimeType?: string;
}

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
}

// List of admin email addresses - users not in this list will be assigned 'Viewer' role
const adminEmails = ['anirach.m@fitm.kmutnb.ac.th', 'chutharat.m@op.kmutnb.ac.th'];

// Helper function to sort files: folders first, then files, both in ascending alphabetical order
const sortFiles = (files: FileItem[]): FileItem[] => {
  return files.sort((a, b) => {
    // Folders come first
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    
    // Within the same type, sort alphabetically by name (case-insensitive)
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
};

interface ValidateAccessTokenParams {
  token: string;
  email?: string | null;
  role?: string | null;
}

type ValidateAccessTokenFunction = (params: ValidateAccessTokenParams) => Promise<boolean>;

export const Dashboard = () => {
  const { user, setUser } = useUser();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [rootFolders, setRootFolders] = useState<FileItem[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Refs for token refresh management
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  // Debug useEffect to monitor rootFolders state
  useEffect(() => {
  }, [rootFolders, currentPath, accessToken, user]);

  // Clear token refresh interval
  const clearTokenRefreshInterval = useCallback(() => {
    if (intervalRef.current) {
      console.log('Clearing token refresh interval');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleTokenExpired = useCallback(() => {
    setIsLoggingOut(true);
    
    // Clear token refresh interval
    clearTokenRefreshInterval();
    
    // ล้างข้อมูลทั้งหมดใน encrypted storage และ localStorage
    encryptedStorage.clearUserData();
    
    // ล้างข้อมูลที่ไม่ sensitive ใน localStorage
    const nonSensitiveKeys = ['returnPath', 'currentUser'];
    nonSensitiveKeys.forEach(key => localStorage.removeItem(key));
    
    // รีเซ็ต state ทั้งหมด
    setAccessToken(null);
    setRefreshToken(null);
    setUserEmail(null);
    setUserRole(null);
    setUser(null);
    setRootFolders([]);
    setCurrentPath([]);
    setSelectedFile(null);
    
    // ใช้ setTimeout เพื่อให้ animation ทำงานเสร็จก่อน
    setTimeout(() => {
      setIsLoggingOut(false);
      window.location.href = '/';
    }, 300);
  }, [setUser, clearTokenRefreshInterval]);

  const refreshAccessToken = useCallback(async (token: string) => {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshingRef.current) {
      console.log('Token refresh already in progress, skipping...');
      return;
    }

    isRefreshingRef.current = true;
    
    const settings = await userService.getGoogleDriveSettings();
    if (!settings.clientId || !settings.clientSecret) {
      console.error('Cannot refresh token: Missing client settings');
      isRefreshingRef.current = false;
      handleTokenExpired();
      throw new Error('Missing client settings for token refresh');
    }

    try {
      console.log('Refreshing access token...');
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: settings.clientId,
          client_secret: settings.clientSecret,
          refresh_token: token,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();
      if (data.error) {
        console.error('Error refreshing token:', data.error);
        throw new Error(data.error);
      }

      console.log('Token refreshed successfully');
      setAccessToken(data.access_token);
      encryptedStorage.setTokens(data.access_token, data.refresh_token);
      if (data.refresh_token) {
         setRefreshToken(data.refresh_token);
      }
      
      return data.access_token;

    } catch (error) {
      console.error('Error refreshing token:', error);
      handleTokenExpired();
      throw error;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [handleTokenExpired]);

  // Setup automatic token refresh every 50 minutes (before 1-hour expiry)
  const setupTokenRefreshInterval = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only setup if we have a refresh token
    if (refreshToken) {
      console.log('Setting up token refresh interval (50 minutes)');
      intervalRef.current = setInterval(async () => {
        try {
          console.log('Automatic token refresh triggered');
          await refreshAccessToken(refreshToken);
        } catch (error) {
          console.error('Automatic token refresh failed:', error);
        }
      }, 50 * 60 * 1000); // 50 minutes in milliseconds
    }
  }, [refreshToken, refreshAccessToken]);

  const validateAccessToken = useCallback<ValidateAccessTokenFunction>(async ({ token, email, role }) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token);

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      const data = await response.json();
      const expirationTime = data.expires_in * 1000 + Date.now();

      if (expirationTime > Date.now()) {
        setAccessToken(token);
        if (email) {
          setUserEmail(email);
        }
        const determinedRole = role || (email && adminEmails.includes(email.toLowerCase()) ? 'Admin' : 'Viewer');
        if (determinedRole) {
          setUserRole(determinedRole as UserRole);
          if (user && user.role !== determinedRole) {
            setUser({ ...user, role: determinedRole as UserRole });
          } else if (!user && email) {
            // Check if user exists in localStorage from CurriculumApp
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
              } catch (error) {
                console.error('Error parsing stored user:', error);
                // Fallback to creating minimal user object
                const userData = encryptedStorage.getUserData();
                const displayName = userData.name || 'User';
                
                const newUser = {
                  id: 'oauth-user',
                  email: email,
                  name: displayName,
                  picture: (userData.picture && userData.picture !== 'null' && userData.picture !== 'undefined' && userData.picture !== '') ? userData.picture : undefined,
                  role: determinedRole as UserRole,
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                setUser(newUser);
                localStorage.setItem('currentUser', JSON.stringify(newUser));
              }
            } else {
              // Create minimal user object only if no stored user exists
              const userData = encryptedStorage.getUserData();
              const displayName = userData.name || 'User';
              
              const newUser = {
                id: 'oauth-user',
                email: email,
                name: displayName,
                picture: (userData.picture && userData.picture !== 'null' && userData.picture !== 'undefined' && userData.picture !== '') ? userData.picture : undefined,
                role: determinedRole as UserRole,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              setUser(newUser);
              localStorage.setItem('currentUser', JSON.stringify(newUser));
            }
          }
        }
        
        // Setup automatic token refresh
        setupTokenRefreshInterval();
        return true;
      } else if (refreshToken) {
        await refreshAccessToken(refreshToken);
        return true;
      } else {
        handleTokenExpired();
        return false;
      }
    } catch (error) {
      console.error('Error validating token:', error);
      if (refreshToken) {
        try {
          await refreshAccessToken(refreshToken);
          return true;
        } catch (refreshError) {
          console.error('Refresh token failed:', refreshError);
          handleTokenExpired();
          return false;
        }
      } else {
        handleTokenExpired();
        return false;
      }
    }
  }, [refreshToken, refreshAccessToken, handleTokenExpired, setUser, user, setUserEmail, setUserRole, setupTokenRefreshInterval]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      const settings = await userService.getGoogleDriveSettings();
      
      if (!settings || !settings.clientId || !settings.clientSecret) {
        if (user && user.role === 'Admin') {
          toast({
            title: "กรุณาตั้งค่า Google OAuth",
            description: "กรุณากรอก Google OAuth Client ID และ Client Secret",
            variant: "destructive",
          });
          setShowConfig(true);
        } else {
          toast({
            title: "ไม่สามารถเข้าสู่ระบบได้",
            description: "กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า Google OAuth",
            variant: "destructive",
          });
        }
        return;
      }

      localStorage.setItem('returnPath', window.location.pathname);

      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error during Google login:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const handleSaveDriveUrl = async () => {
    if (!inputUrl) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "กรุณาระบุ URL ของ Google Drive",
        variant: "destructive",
      });
      return;
    }

    try {
      const match = inputUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (!match) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "รูปแบบ URL ของ Google Drive ไม่ถูกต้อง กรุณาตรวจสอบ",
          variant: "destructive",
        });
        return;
      }

      const settings = {
        clientId,
        clientSecret,
        driveUrl: inputUrl
      };
      await userService.setGoogleDriveSettings(settings);

      setDriveUrl(inputUrl);
      encryptedStorage.setOAuthSettings(clientId, clientSecret, inputUrl);

      if (accessToken) {
        const folderId = match[1];
        await fetchFiles(folderId);
      }

      toast({
        title: "บันทึกการตั้งค่าสำเร็จ",
        description: "บันทึกการตั้งค่า Google Drive เรียบร้อยแล้ว",
      });
    } catch (error) {
      console.error('Error saving drive URL:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการตั้งค่าได้",
        variant: "destructive",
      });
    }
  };

  const handleTestAccess = useCallback(async () => {
    if (!clientId || !clientSecret || !inputUrl) {
      setTestResult('Error: Missing Client ID, Client Secret, or Drive Folder URL');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      if (!accessToken) {
        setTestResult('Error: No access token available. Please log in first.');
        return;
      }

      const isValid = await validateAccessToken({ token: accessToken, email: userEmail, role: userRole });
      if (!isValid) {
        setTestResult('Error: Invalid or expired access token. Please log in again.');
        return;
      }

      const folderIdMatch = inputUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
      const folderId = folderIdMatch ? folderIdMatch[1] : inputUrl;

      if (!folderId) {
        setTestResult('Error: Invalid Google Drive Folder URL.');
        return;
      }

      const currentToken = accessToken;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );

      const data = await response.json();

      if (response.ok) {
        if (data.files && Array.isArray(data.files)) {
           setTestResult(`Access successful! Found ${data.files.length} items in the folder.`);
        } else {
           setTestResult('Access successful, but no items found in the folder.');
        }
      } else if (response.status === 401) {
        if (refreshToken) {
          try {
            const newToken = await refreshAccessToken(refreshToken);
            const retryResponse = await fetch(
              `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name)`,
              { headers: { Authorization: `Bearer ${newToken}` } }
            );
            const retryData = await retryResponse.json();
            if (retryResponse.ok) {
              if (retryData.files && Array.isArray(retryData.files)) {
                 setTestResult(`Access successful! Found ${retryData.files.length} items in the folder.`);
              } else {
                 setTestResult('Access successful, but no items found in the folder.');
              }
            } else {
              setTestResult(`Error testing access: ${retryData.error?.message || retryResponse.statusText}. Please ensure you have access to this folder.`);
            }
          } catch (refreshError) {
            setTestResult(`Error refreshing token: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}. Please log in again.`);
          }
        } else {
          setTestResult('Error: Access token expired and no refresh token available. Please log in again.');
        }
      } else {
        setTestResult(`Error testing access: ${data.error?.message || response.statusText}. Please ensure you have access to this folder.`);
      }
    } catch (error) {
      console.error('Error during access test:', error);
      setTestResult(`An error occurred during test: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTesting(false);
    }
  }, [clientId, clientSecret, inputUrl, accessToken, refreshToken, validateAccessToken, refreshAccessToken, userEmail, userRole]);

  const handleInsufficientScopeError = useCallback(async () => {
    setAccessToken(null);
    setRefreshToken(null);
    
    toast({
      title: "จำเป็นต้องเข้าสู่ระบบใหม่",
      description: "กรุณาเข้าสู่ระบบอีกครั้งเพื่อเข้าถึง Google Drive",
      variant: "destructive",
    });

    try {
      const settings = await userService.getGoogleDriveSettings();
      if (!settings || !settings.clientId || !settings.clientSecret) {
        if (user && user.role === 'Admin') {
          toast({
            title: "กรุณาตั้งค่า Google OAuth",
            description: "กรุณากรอก Google OAuth Client ID และ Client Secret",
            variant: "destructive",
          });
          setShowConfig(true);
        } else {
          toast({
            title: "ไม่สามารถเข้าสู่ระบบได้",
            description: "กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า Google OAuth",
            variant: "destructive",
          });
        }
        return;
      }

      localStorage.setItem('returnPath', window.location.pathname);

      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(JSON.stringify({ type: 'reauth' }))}`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error during re-authentication:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  }, [user, toast, setAccessToken, setRefreshToken]);

  const fetchFiles = useCallback(async (targetFolderId: string, forceRefresh = false) => {
    if (!targetFolderId) {
      setRootFolders([]);
      return;
    }

    if (!accessToken) {
      setRootFolders([]);
      return;
    }

    try {
      // Add cache-busting parameter when refreshing
      const cacheBuster = forceRefresh ? `&_t=${Date.now()}` : '';
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${targetFolderId}' in parents and trashed=false&fields=files(id,name,mimeType,size,modifiedTime,parents,webViewLink,webContentLink)${cacheBuster}`,
        { 
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            // Force no-cache when refreshing
            ...(forceRefresh && { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' })
          } 
        }
      );

      if (response.status === 401) {
        if (refreshToken) {
          try {
            const newToken = await refreshAccessToken(refreshToken);
            return fetchFiles(targetFolderId);
          } catch (error) {
            console.error('❌ Error refreshing token during fetchFiles:', error);
            handleTokenExpired();
            setRootFolders([]);
            toast({
              title: "เข้าสู่ระบบล้มเหลว",
              description: "ไม่สามารถรีเฟรช Access Token ได้ กรุณาเข้าสู่ระบบใหม่",
              variant: "destructive",
            });
            return;
          }
        } else {
          handleTokenExpired();
          setRootFolders([]);
          toast({
            title: "Session หมดอายุ",
            description: "กรุณาเข้าสู่ระบบใหม่",
            variant: "destructive",
          });
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Google Drive API error during fetchFiles:', response.status, errorData);
        
        if (response.status === 403 && errorData.error?.message?.includes('insufficient authentication scopes')) {
          await handleInsufficientScopeError();
          return;
        }
        
        throw new Error(`Google Drive API error: ${errorData.error.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.files || !Array.isArray(data.files)) {
        setRootFolders([]);
        return;
      }

      const items: FileItem[] = (data as GoogleDriveResponse).files.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
        path: [],
        url: item.mimeType !== 'application/vnd.google-apps.folder' ? item.webViewLink : undefined,
        downloadUrl: item.webContentLink,
        size: item.size,
        lastModified: item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString() : undefined,
        parents: item.parents,
        mimeType: item.mimeType,
      }));
      
      const sortedItems = sortFiles(items);
      
      setRootFolders(sortedItems);
    } catch (error) {
      console.error('❌ Error fetching files:', error);
      setRootFolders([]);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถดึงข้อมูลจาก Google Drive ได้: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  }, [accessToken, refreshToken, toast, handleTokenExpired, refreshAccessToken, handleInsufficientScopeError]);

  const handleConnectGoogleDrive = useCallback(async () => {
    try {
      const settings = await userService.getGoogleDriveSettings();
      if (!settings || !settings.clientId || !settings.clientSecret) {
        if (user && user.role === 'Admin') {
          toast({
            title: "กรุณาตั้งค่า Google Drive",
            description: "กรุณากรอก Google OAuth Client ID และ Client Secret",
            variant: "destructive",
          });
          setShowConfig(true);
        } else {
          toast({
            title: "ไม่สามารถเชื่อมต่อ Google Drive",
            description: "กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า Google Drive",
            variant: "destructive",
          });
        }
        return;
      }

      localStorage.setItem('returnPath', window.location.pathname);

      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(JSON.stringify({ type: 'drive' }))}`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting to Google Drive:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อ Google Drive ได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await userService.getGoogleDriveSettings();
        
        if (settings) {
          if (settings.clientId) {
            setClientId(settings.clientId);
          }
          if (settings.clientSecret) {
            setClientSecret(settings.clientSecret);
          }
          if (settings.driveUrl) {
            setDriveUrl(settings.driveUrl);
            setInputUrl(settings.driveUrl);
            
            // Store all OAuth settings in encrypted storage
            encryptedStorage.setOAuthSettings(
              settings.clientId || clientId, 
              settings.clientSecret || clientSecret, 
              settings.driveUrl
            );
            
            const { accessToken } = encryptedStorage.getTokens();
            if (accessToken) {
              const match = settings.driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
              const folderId = match ? match[1] : null;
              if (folderId) {
                fetchFiles(folderId);
              } else {
                console.error('Invalid driveUrl format:', settings.driveUrl);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading Google Drive settings:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดการตั้งค่า Google Drive ได้",
          variant: "destructive",
        });
      }
    };
    loadSettings();
  }, [toast, fetchFiles, clientId, clientSecret]);

  useEffect(() => {
    const loadUserSessionFromStorage = async () => {
      try {
        // Get data from encrypted storage - DO NOT handle OAuth here (CurriculumApp handles it)
        const { accessToken: storedAccessToken, refreshToken: storedRefreshToken } = encryptedStorage.getTokens();
        const { email: storedEmail } = encryptedStorage.getUserData();
        const { clientId: storedClientId, clientSecret: storedClientSecret, driveUrl: storedDriveUrl } = encryptedStorage.getOAuthSettings();

        if (!clientId && storedClientId) setClientId(storedClientId);
        if (!clientSecret && storedClientSecret) setClientSecret(storedClientSecret);
        if (!driveUrl && storedDriveUrl) {
          setDriveUrl(storedDriveUrl);
          setInputUrl(storedDriveUrl);
        }
        if (storedAccessToken) setAccessToken(storedAccessToken);
        if (storedRefreshToken) setRefreshToken(storedRefreshToken);
        if (storedEmail) setUserEmail(storedEmail);
        if (storedEmail) {
          setUserRole(adminEmails.includes(storedEmail.toLowerCase()) ? 'Admin' : 'Viewer');
        }

        // Clean up URL params if they exist (but don't process them - CurriculumApp handles OAuth)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('code')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // If we have stored tokens, validate them
        if (storedAccessToken) {
          const storedRole = storedEmail ? (adminEmails.includes(storedEmail.toLowerCase()) ? 'Admin' : 'Viewer') : null;
          const params: ValidateAccessTokenParams = {
            token: storedAccessToken,
            email: storedEmail,
            role: storedRole
          };
          await validateAccessToken(params);
        }

      } catch (error) {
        console.error('Error loading user session:', error);
        // Don't call handleTokenExpired here - let CurriculumApp handle auth errors
      }
    };

    loadUserSessionFromStorage();
  }, [validateAccessToken, setUser, toast, clientId, clientSecret, driveUrl]);

  useEffect(() => {
    const match = driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    const initialFolderId = match ? match[1] : null;

    if (!driveUrl) {
      setRootFolders([]);
      return;
    }

    if (!accessToken) {
      setRootFolders([]);
      return;
    }

    const folderIdToFetch = currentPath.length > 0 
      ? currentPath[currentPath.length - 1]
      : initialFolderId;

    if (folderIdToFetch) {
      fetchFiles(folderIdToFetch);
    } else {
      setRootFolders([]);
    }

  }, [driveUrl, accessToken, currentPath, fetchFiles]);

  useEffect(() => {
    const autoLoadDriveUrlFromEnv = async () => {
      if (accessToken && !driveUrl) {
        
        try {
          const settings = await userService.getGoogleDriveSettings();
          
          if (settings?.driveUrl) {
            
            setDriveUrl(settings.driveUrl);
            setInputUrl(settings.driveUrl);
            // Store driveUrl in encrypted storage instead of localStorage
            encryptedStorage.setOAuthSettings(clientId, clientSecret, settings.driveUrl);
            
            const match = settings.driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
            const folderId = match ? match[1] : null;
            if (folderId) {
              fetchFiles(folderId);
            }
          }
        } catch (error) {
          console.error('❌ Error auto-loading drive URL from environment:', error);
        }
      }
    };

    autoLoadDriveUrlFromEnv();
  }, [accessToken, driveUrl, fetchFiles, clientId, clientSecret]);

  // Token refresh interval management
  useEffect(() => {
    // Setup token refresh interval when we have both access and refresh tokens
    if (accessToken && refreshToken) {
      setupTokenRefreshInterval();
    }

    // Cleanup on unmount
    return () => {
      clearTokenRefreshInterval();
    };
  }, [accessToken, refreshToken, setupTokenRefreshInterval, clearTokenRefreshInterval]);

  const handlePathChange = useCallback((path: string[]) => {
    setCurrentPath(path);
    setSelectedFile(null);
  }, []);

  const handleItemClick = useCallback((item: FileItem) => {
    if (item.type === 'folder') {
      setSelectedFile(null);
    } else {
      setSelectedFile(item);
    }
  }, []);

  const handleGoBack = useCallback(() => {
    setCurrentPath(prevPath => prevPath.slice(0, -1));
    setSelectedFile(null);
  }, []);

  const handleRefreshRootFolders = useCallback(async () => {
    const match = driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    const rootFolderId = match ? match[1] : null;
    
    if (rootFolderId && currentPath.length === 0) {
      // Only refresh root folders if we're at the root level
      await fetchFiles(rootFolderId, true); // Force refresh
    }
  }, [driveUrl, currentPath, fetchFiles]);

  const LoadingScreen = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 transition-opacity duration-300">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังออกจากระบบ...</p>
      </div>
    </div>
  );

  if (isLoggingOut) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <AuthActionsProvider handleGoogleLogin={handleGoogleLogin}>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 transition-opacity duration-300">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังตรวจสอบการเข้าสู่ระบบ...</p>
          </div>
        </div>
      </AuthActionsProvider>
    );
  }

  return (
    <AuthActionsProvider handleGoogleLogin={handleGoogleLogin}>
      <div className="min-h-screen bg-gray-50 transition-opacity duration-300">
        <Header 
          onConnectDrive={handleConnectGoogleDrive}
          accessToken={accessToken}
        />
        <Dialog open={showConfig} onOpenChange={setShowConfig}>
          <DialogContent aria-describedby="dialog-description">
            <DialogHeader>
              <DialogTitle>ตั้งค่า Google Drive</DialogTitle>
              <DialogDescription id="dialog-description">
                {user.role === 'Admin'
                  ? "ตั้งค่า Google OAuth Client ID และ Client Secret สำหรับการเชื่อมต่อกับ Google Drive"
                  : "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถตั้งค่าได้"}
              </DialogDescription>
            </DialogHeader>
            {user.role === 'Admin' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Google OAuth Client ID</Label>
                  <Input
                    id="clientId"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Enter your Google OAuth Client ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Google OAuth Client Secret</Label>
                  <Input
                    id="clientSecret"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Enter your Google OAuth Client Secret"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driveUrl">Google Drive Folder URL</Label>
                  <Input
                    id="driveUrl"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="Enter the URL of the Google Drive folder"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button onClick={handleGoogleLogin} variant="outline">
                    Login with Google
                  </Button>
                  <Button onClick={handleTestAccess} disabled={isTesting || !accessToken}>
                    Test Access
                  </Button>
                  <Button onClick={handleSaveDriveUrl}>Save Settings</Button>
                </div>
                {testResult && (
                  <div className={`p-2 rounded ${testResult.startsWith('Access successful') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {testResult}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        <div className="flex h-[calc(100vh-64px)]">
          <div className="flex-1 flex">
            <FileBrowser
              currentPath={currentPath}
              onPathChange={handlePathChange}
              onFileSelect={setSelectedFile}
              rootFolders={rootFolders}
              userRole={user.role}
              accessToken={accessToken}
              onInsufficientScopeError={handleInsufficientScopeError}
              onRefreshRootFolders={handleRefreshRootFolders}
            />
            {selectedFile && selectedFile.type === 'file' && (
              <PDFViewer file={selectedFile} onClose={() => setSelectedFile(null)} />
            )}
          </div>
        </div>
      </div>
    </AuthActionsProvider>
  );
};
