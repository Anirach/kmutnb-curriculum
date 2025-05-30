import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // ตรวจสอบว่ามี code ใน URL หรือไม่
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    if (!code) {
      console.error('No authorization code found');
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบรหัสการยืนยันตัวตน กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    // ตรวจสอบว่าเป็นการล็อกอินหรือการเชื่อมต่อ Google Drive
    const state = location.state as { type?: 'login' | 'drive' } | null;
    const isDriveConnection = state?.type === 'drive';

    // redirect ไปที่ Dashboard พร้อมกับ code
    navigate('/', { 
      replace: true,
      state: { 
        code,
        type: isDriveConnection ? 'drive' : 'login'
      }
    });
  }, [navigate, location.state, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังดำเนินการเข้าสู่ระบบ...</p>
      </div>
    </div>
  );
}; 