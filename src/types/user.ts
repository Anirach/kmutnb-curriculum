export type UserRole = 'Admin' | 'Viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermission {
  role: UserRole;
  permissions: {
    view: boolean;
    upload: boolean;
    delete: boolean;
    rename: boolean;
  };
}

export const ROLE_PERMISSIONS: Record<UserRole, UserPermission> = {
  Admin: {
    role: 'Admin',
    permissions: {
      view: true,
      upload: true,
      delete: true,
      rename: true,
    },
  },
  Viewer: {
    role: 'Viewer',
    permissions: {
      view: true,
      upload: false,
      delete: false,
      rename: false,
    },
  },
}; 