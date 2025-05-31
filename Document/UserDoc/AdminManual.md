# KMUTNB Curriculum System – Admin Manual

## Table of Contents
- [KMUTNB Curriculum System – Admin Manual](#kmutnb-curriculum-system--admin-manual)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Admin Login](#admin-login)
  - [User Management](#user-management)
  - [Google Drive Integration](#google-drive-integration)
  - [File \& Folder Management](#file--folder-management)
  - [Permissions \& Roles](#permissions--roles)
  - [Troubleshooting](#troubleshooting)
  - [Best Practices](#best-practices)

---

## Overview
This manual provides step-by-step instructions for administrators to manage the KMUTNB Curriculum System, including user access, file management, and integration with Google Drive.

## Admin Login
- Access the system via the main login page.
- Use your admin credentials (provided by the system owner or IT department).
- If you forget your password or cannot log in, contact the system owner for a reset.

## User Management
- Navigate to the user management section (if available).
- Add, edit, or remove users as required.
- Assign roles: `Admin`, `Editor`, or `Viewer`.
- Only Admins can grant or revoke admin privileges.

## Google Drive Integration
- The system uses Google Drive for file storage.
- Ensure the system is connected to the correct Google Drive or Shared Drive.
- If you need to change the connected drive, update the Drive URL in the system settings.
- Make sure the OAuth credentials (Client ID/Secret) are valid and have the correct scopes.

## File & Folder Management
- **Upload Files:** Use the upload button to add new files (PDFs, documents, etc.) to the selected folder.
- **Create Folders:** Use the "Add Folder" button to organize files.
- **Rename/Delete:** Right-click (or use the context menu) on files/folders to rename or delete them.
- **Move Files:** Drag and drop or use the context menu to move files between folders.
- **Search:** Use the search bar to find files/folders within the current drive/subtree.

## Permissions & Roles
- **Admin:** Full access to all features, including user and file management.
- **Editor:** Can upload, edit, and delete files/folders but cannot manage users.
- **Viewer:** Can only view and download files.
- To change a user's role, go to the user management section and edit their role.

## Troubleshooting
- **CORS/Access Errors:** Ensure your Google OAuth token is valid. If you see CORS errors, re-authenticate or check your Google API settings.
- **File Not Found:** The file may have been deleted or moved. Refresh the file list.
- **Insufficient Permissions:** Make sure you are logged in as an Admin and have the correct Google Drive permissions.
- **API Quota Exceeded:** If you hit Google API limits, wait and try again later or contact IT support.

## Best Practices
- Regularly back up important files.
- Remove unused users and files to keep the system organized.
- Review permissions periodically to ensure security.
- Keep your browser and system updated for best compatibility.

---

For further assistance, contact the IT support team or system owner.
