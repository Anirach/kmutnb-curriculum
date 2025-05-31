# Google Shared Drive Integration Documentation

## Overview
This document describes the complete application flow for integrating with Google Shared Drive in the KMUTNB Curriculum Vault application. The system provides secure access to Google Drive files and folders with role-based permissions and comprehensive error handling.

## Architecture Components

### 1. Authentication Flow
- **OAuth 2.0 Integration**: Uses Google OAuth 2.0 for secure authentication
- **Token Management**: Handles access tokens, refresh tokens, and automatic token refresh
- **Role-Based Access**: Assigns roles based on email addresses (Admin/Viewer)

### 2. Core Services

#### UserService (`/src/services/userService.ts`)
- Manages Google OAuth settings (Client ID, Client Secret, Drive URL)
- Handles environment variable configuration
- Provides settings persistence via encrypted storage

#### EncryptedStorage (`/src/services/encryptedStorage.ts`)
- Secure storage for sensitive data (tokens, credentials)
- Automatic data encryption/decryption
- Safe token management with cleanup options

### 3. User Roles and Permissions

| Role | View | Upload | Delete | Rename | Drive Config |
|------|------|--------|--------|--------|--------------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Content Manager** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ |

## Application Flow

### Phase 1: Initial Setup and Configuration

#### 1.1 Environment Configuration
```typescript
// Environment Variables (.env)
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_GOOGLE_CLIENT_SECRET=your-client-secret
VITE_GOOGLE_DRIVE_URL=https://drive.google.com/drive/folders/[FOLDER_ID]
VITE_GOOGLE_API_KEY=your-api-key
```

#### 1.2 Admin Configuration Interface
- Admin users can configure OAuth settings via UI
- Real-time validation of Drive URL format
- Test access functionality to verify configuration

### Phase 2: Authentication Process

#### 2.1 OAuth Initialization
```typescript
// OAuth URL Generation
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?
  client_id=${clientId}&
  redirect_uri=${redirectUri}&
  response_type=code&
  scope=${encodeURIComponent(scope)}&
  access_type=offline&
  prompt=consent`
```

#### 2.2 Required OAuth Scopes
- `https://www.googleapis.com/auth/drive` - Full Drive access
- `https://www.googleapis.com/auth/userinfo.email` - User email
- `https://www.googleapis.com/auth/userinfo.profile` - User profile

#### 2.3 Token Exchange Process
1. User authorizes application
2. Receive authorization code
3. Exchange code for access/refresh tokens
4. Store tokens securely
5. Validate user profile and assign role

### Phase 3: Drive Integration

#### 3.1 File Operations
```typescript
// Fetch Files from Drive
const response = await fetch(
  `https://www.googleapis.com/drive/v3/files?
   q='${folderId}'+in+parents+and+trashed=false&
   fields=files(id,name,mimeType,size,modifiedTime,parents,webViewLink)&
   supportsAllDrives=true&
   includeItemsFromAllDrives=true`,
  {
    headers: { Authorization: `Bearer ${accessToken}` }
  }
);
```

#### 3.2 Supported Operations

**Read Operations:**
- List folder contents
- Download files (PDF, Google Docs, Sheets, etc.)
- Preview files in embedded viewer

**Write Operations (Admin/Manager only):**
- Create new folders
- Upload files
- Rename files/folders
- Delete files/folders
- Share folders with specific users

#### 3.3 Google Docs Conversion
- Automatic conversion of Google Docs to PDF for viewing
- Support for native Google file formats (Docs, Sheets, Slides)
- Proper MIME type handling

### Phase 4: Error Handling & Recovery

#### 4.1 Authentication Errors
```typescript
// Token Expiration Handling
if (response.status === 401) {
  if (refreshToken) {
    await refreshAccessToken(refreshToken);
    // Retry original request
  } else {
    handleTokenExpired(); // Redirect to login
  }
}
```

#### 4.2 Permission Errors
```typescript
// Insufficient Scope Error
if (response.status === 403 && 
    errorData.error?.message?.includes("insufficient authentication scopes")) {
  await handleInsufficientScopeError(); // Re-authenticate with proper scopes
}
```

#### 4.3 Drive API Specific Errors
- **403 Forbidden**: Permission denied or insufficient scopes
- **404 Not Found**: File/folder doesn't exist or no access
- **400 Bad Request**: Invalid parameters or malformed request
- **429 Rate Limited**: Too many requests, implement retry logic

### Phase 5: Advanced Features

#### 5.1 Shared Drive Support
- Full support for Google Shared Drives (Team Drives)
- Proper permission handling for shared resources
- Organization-level file management

#### 5.2 Real-time Updates
- Automatic token refresh mechanism
- Session management with encrypted storage
- Graceful handling of network interruptions

#### 5.3 Security Features
- Encrypted storage of sensitive data
- Role-based access control
- Secure token handling with automatic cleanup

## API Integration Points

### Google Drive API v3 Endpoints

#### Authentication
- **Token Exchange**: `POST https://oauth2.googleapis.com/token`
- **Token Refresh**: `POST https://oauth2.googleapis.com/token`
- **User Info**: `GET https://www.googleapis.com/oauth2/v2/userinfo`

#### File Operations
- **List Files**: `GET https://www.googleapis.com/drive/v3/files`
- **Get File**: `GET https://www.googleapis.com/drive/v3/files/{fileId}`
- **Create File**: `POST https://www.googleapis.com/drive/v3/files`
- **Update File**: `PATCH https://www.googleapis.com/drive/v3/files/{fileId}`
- **Delete File**: `DELETE https://www.googleapis.com/drive/v3/files/{fileId}`
- **Download File**: `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media`

#### Permissions
- **Share File**: `POST https://www.googleapis.com/drive/v3/files/{fileId}/permissions`
- **List Permissions**: `GET https://www.googleapis.com/drive/v3/files/{fileId}/permissions`

## Implementation Guidelines

### 1. Setting up Google OAuth Credentials

#### Step 1: Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing project
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Configure authorized redirect URIs

#### Step 2: Environment Configuration
```bash
# .env file
VITE_GOOGLE_CLIENT_ID=your-oauth-client-id
VITE_GOOGLE_CLIENT_SECRET=your-oauth-client-secret
VITE_GOOGLE_DRIVE_URL=https://drive.google.com/drive/folders/your-folder-id
VITE_GOOGLE_API_KEY=your-api-key (optional)
```

#### Step 3: Authorized Redirect URIs
- Development: `http://localhost:8080/auth/callback`
- Production: `https://yourdomain.com/auth/callback`

### 2. Code Implementation Structure

#### Main Components
```
src/
├── components/
│   ├── auth/
│   │   └── AuthCallback.tsx          # Handles OAuth callback
│   └── dashboard/
│       ├── Dashboard.tsx             # Main dashboard component
│       ├── FileBrowser.tsx           # File management interface
│       ├── Header.tsx                # Navigation and user info
│       └── PDFViewer.tsx            # Embedded file viewer
├── services/
│   ├── userService.ts               # User and OAuth management
│   └── encryptedStorage.ts          # Secure data storage
├── contexts/
│   ├── UserContext.tsx              # User state management
│   └── AuthActionsContext.tsx       # Authentication actions
└── types/
    └── user.ts                      # User and permission types
```

### 3. Role Management Implementation

#### Admin Email Configuration
```typescript
// Dashboard.tsx - Admin email list
const adminEmails = [
  'admin@example.com',
  'manager@example.com'
];

// Automatic role assignment
const userRole = adminEmails.includes(email.toLowerCase()) ? 'Admin' : 'Viewer';
```

#### Permission Checking
```typescript
// Role-based permission validation
const hasPermission = (action: 'view' | 'upload' | 'delete' | 'rename') => {
  return ROLE_PERMISSIONS[user.role].permissions[action];
};
```

### 4. Error Handling Best Practices

#### Comprehensive Error Handling
```typescript
try {
  const response = await driveApiCall();
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    
    // Handle specific error types
    switch (response.status) {
      case 401:
        await handleTokenExpired();
        break;
      case 403:
        if (errorData?.error?.message?.includes("insufficient authentication scopes")) {
          await handleInsufficientScopeError();
        } else {
          await handlePermissionDenied();
        }
        break;
      case 404:
        handleFileNotFound();
        break;
      default:
        handleGenericError(errorData);
    }
  }
} catch (error) {
  handleNetworkError(error);
}
```

## Security Considerations

### 1. Token Security
- Store tokens in encrypted storage only
- Implement automatic token cleanup on logout
- Use HTTPS for all API communications
- Never log sensitive token information

### 2. Permission Model
- Implement least-privilege principle
- Regular audit of user permissions
- Role-based access control enforcement
- Secure admin-only configuration access

### 3. Data Protection
- Encrypt sensitive data at rest
- Secure API communication channels
- Implement proper session management
- Regular security audits and updates

## Troubleshooting Guide

### Common Issues

#### 1. Authentication Failures
**Problem**: OAuth redirect fails or tokens invalid
**Solution**: 
- Verify redirect URIs in Google Console
- Check client ID/secret configuration
- Ensure proper scope permissions

#### 2. Permission Denied Errors
**Problem**: 403 errors when accessing files
**Solution**:
- Verify user has access to shared drive
- Check OAuth scopes include drive access
- Confirm folder permissions in Google Drive

#### 3. File Download Issues
**Problem**: Cannot download or preview files
**Solution**:
- Check file permissions in Google Drive
- Verify MIME type handling for Google Docs
- Ensure proper API endpoint usage

### Debug Tools

#### Token Validation
```typescript
// Test access token validity
const validateToken = async (token: string) => {
  const response = await fetch(
    'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token
  );
  return response.ok;
};
```

#### Drive Access Test
```typescript
// Test drive folder access
const testDriveAccess = async (folderId: string) => {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.ok;
};
```

## Deployment Considerations

### Production Environment
1. **Environment Variables**: Secure storage of OAuth credentials
2. **HTTPS Required**: All OAuth redirects must use HTTPS
3. **Domain Verification**: Authorized domains in Google Console
4. **Rate Limiting**: Implement proper API rate limiting
5. **Monitoring**: Log API usage and error patterns

### Performance Optimization
1. **Token Caching**: Cache valid tokens to reduce auth requests
2. **API Batching**: Batch multiple file operations when possible
3. **Lazy Loading**: Load file contents on demand
4. **Error Recovery**: Implement retry mechanisms for transient failures

---

*This documentation provides a complete guide for implementing and maintaining Google Shared Drive integration in the KMUTNB Curriculum Vault application.*
