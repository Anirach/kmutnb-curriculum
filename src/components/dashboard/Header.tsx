import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, LogOut, User } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
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

  const handleLogout = async () => {
    try {
      // Soft logout: clear all sensitive data except refresh token
      encryptedStorage.clearUserData({ keepRefreshToken: true });

      // ล้างข้อมูลจาก IndexedDB
      await userService.logout();
      setUser(null);
      toast({
        title: "ออกจากระบบสำเร็จ",
        description: "ขอบคุณที่ใช้งานระบบ",
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
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
