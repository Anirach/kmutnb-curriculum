import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, LogOut, User } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { userService } from '@/services/userService';
import { encryptedStorage } from '@/services/encryptedStorage';

export const Header = ({ 
  onConnectDrive,
  accessToken
}: { 
  onConnectDrive?: () => Promise<void>;
  accessToken?: string | null;
}) => {
  const { user, setUser } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      console.log('Logout button clicked for user:', user?.email);
      
      // Check if this is a public user
      const isPublicUser = user?.email === 'public@curriculum.local';
      
      if (isPublicUser) {
        // For public users, completely clear everything and redirect
        console.log('Public user logout - clearing all storage including encrypted data');
        
        // Clear user from context
        setUser(null);
        
        // Clear all storage completely
        localStorage.clear();
        sessionStorage.clear();
        
        // IMPORTANT: Also clear encrypted storage to prevent auto-login
        encryptedStorage.clearUserData();
        
        // Clear tokens and OAuth settings completely for public logout
        try {
          // Clear all encrypted storage keys
          const keys = ['userData', 'tokens', 'oauthSettings', 'accessToken', 'refreshToken', 'clientId', 'clientSecret', 'driveUrl'];
          keys.forEach(key => {
            localStorage.removeItem(`encrypted_${key}`);
          });
        } catch (error) {
          console.log('Error clearing encrypted storage:', error);
        }
        
        console.log('All storage cleared - redirecting to landing page');
        
        // Immediate redirect without any delay
        window.location.href = '/';
        return;
      }
      
            // For admin users, do the full logout process with immediate redirect
      console.log('Admin user logout - full cleanup and immediate redirect');
      
      // Clear user from context immediately
      setUser(null);
      
      // Get the Google API credentials before clearing everything
      const { accessToken, refreshToken } = encryptedStorage.getTokens();
      const { clientId, clientSecret, driveUrl } = encryptedStorage.getOAuthSettings();
      
      // Clear all localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all encrypted storage completely
      encryptedStorage.clearUserData();
      
      // Restore only the Google API credentials for future public access
      if (accessToken && refreshToken) {
        encryptedStorage.setTokens(accessToken, refreshToken);
      }
      if (clientId && clientSecret && driveUrl) {
        encryptedStorage.setOAuthSettings(clientId, clientSecret, driveUrl);
      }
      
      // Set logout flag AFTER clearing everything to prevent immediate auto-login
      localStorage.setItem('justLoggedOut', 'true');
      console.log('Set justLoggedOut flag to prevent auto-login');
      
      console.log('Admin data cleared, immediate redirect to landing page');
      
      // Show brief success message
      toast({
        title: "ออกจากระบบสำเร็จ",
        description: "ขอบคุณที่ใช้งานระบบ",
      });
      
      // Immediate redirect to prevent getting stuck in loading state
      window.location.href = '/';
      
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200">
        <div className="mx-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-semibold text-gray-900">Curriculum Vault Drive</span>
            </div>
          </div>
          {user && (
            <>
              <div className="flex items-center space-x-4 mr-2">
                {!accessToken && onConnectDrive && (
                  <Button variant="outline" size="sm" onClick={onConnectDrive}>
                    เชื่อมต่อ Google Drive
                  </Button>
                )}
                <div className="flex items-center space-x-2">
                  {user.role === 'Admin' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Admin
                    </span>
                  )}
                  <Avatar>
                    <AvatarImage 
                      src={user.picture?.replace(/=s\d+-c$/, '') || user.picture}
                      alt={user.name}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                      {user.name
                        .split(' ')
                        .map(name => name.charAt(0))
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    </div>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  ออกจากระบบ
                </Button>
              </div>
            </>
          )}
        </div>
      </header>
    </>
  );
};
