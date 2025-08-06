import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, FileText, Shield, Users, ArrowRight, Eye, Lock } from 'lucide-react';
import { useAuthActions } from '@/contexts/AuthActionsContext';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { encryptedStorage } from '@/services/encryptedStorage';

interface LandingPageProps {
  onLoginClick: () => void;
}

export const LandingPage = ({ onLoginClick }: LandingPageProps) => {
  const { handleGoogleLogin } = useAuthActions();
  const { setUser } = useUser();
  const navigate = useNavigate();

  const handleLoginClick = async () => {
    try {
      await handleGoogleLogin();
    } catch (error) {
      // Fallback to login form for invitation-based registration or error handling
      onLoginClick();
    }
  };

  const handlePublicAccess = async () => {
    console.log('Public access button clicked');
    
    try {
      // Only clear current user data, keep admin credentials for public access
      localStorage.removeItem('currentUser');
      console.log('Cleared current user data');
      
      // Set up a public user with Viewer role (read-only privileges)
      const publicUser = {
        id: 'public-user',
        email: 'public@curriculum.local',
        name: 'Public User',
        role: 'Viewer' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Created public user:', publicUser);
      
      // Set the user in context and localStorage
      setUser(publicUser);
      localStorage.setItem('currentUser', JSON.stringify(publicUser));
      
      console.log('Set user data, context should update now');
      console.log('Authentication flow complete - Dashboard should render with admin credentials');
      
    } catch (error) {
      console.error('Error in handlePublicAccess:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="mx-auto w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-6">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Curriculum Vault Drive
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            ระบบจัดการเอกสารหลักสูตรที่เชื่อมต่อกับ Google Drive 
            เพื่อการเข้าถึงและจัดการไฟล์ที่มีประสิทธิภาพ
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={handlePublicAccess}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Eye className="w-5 h-5 mr-2" />
              สืบค้นข้อมูลหลักสูตร
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              onClick={handleLoginClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Lock className="w-5 h-5 mr-2" />
              Admin Login
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg mb-2">การใช้งาน</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 text-sm">
                ดูไฟล์ และเอกสารจากโฟลเดอร์
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg mb-2">จัดการเอกสาร</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 text-sm">
                เข้าถึงและจัดการเอกสารหลักสูตรได้อย่างง่ายดาย 
                ผ่านการเชื่อมต่อกับ Google Drive
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg mb-2">ความปลอดภัย</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 text-sm">
                ระบบควบคุมสิทธิ์การเข้าถึงที่ปลอดภัย 
                พร้อมการยืนยันตัวตนผ่าน Google Authen
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-lg mb-2">การจัดการผู้ใช้</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription className="text-gray-600 text-sm">
                ระบบจัดการผู้ใช้และสิทธิ์การเข้าถึง <br />
                ผ่านการยีนยันตัวตน
                </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How it Works Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            วิธีการใช้งาน
          </h2>
          
          {/* Authenticated Access Workflow */}
          <div>
            <h3 className="text-2xl font-semibold text-center text-green-600 mb-8">
              🔒 การเข้าถึงโดยการยืนยันตัวตน
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  1
                </div>
                <h4 className="text-xl font-semibold mb-3">เข้าสู่ระบบ</h4>
                <p className="text-gray-600">
                  Admin Login
                  
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  2
                </div>
                <h4 className="text-xl font-semibold mb-3">สิทธิ์ทั่วไป</h4>
                <p className="text-gray-600">
                  เข้าถึงเอกสาร และ ดาวน์โหลดไฟล์
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  3
                </div>
                <h4 className="text-xl font-semibold mb-3">สิทธิ์เต็มรูปแบบ</h4>
                <p className="text-gray-600">
                  แก้ไข ลบ แชร์ไฟล์ สร้างโฟลเดอร์และ
                  จัดการระบบ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p>&copy; 2025 Curriculum Vault Drive. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
