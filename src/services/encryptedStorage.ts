import CryptoJS from 'crypto-js';

// You should store this secret key securely, not in the code
// In production, consider using environment variables or a secure key management system
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'curriculum-vault-drive-default-key-change-in-production';

export class EncryptedStorage {
  private static encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  }

  private static decrypt(encryptedText: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return '';
    }
  }

  static setItem(key: string, value: string): void {
    try {
      const encryptedValue = this.encrypt(value);
      localStorage.setItem(key, encryptedValue);
    } catch (error) {
      console.error('Failed to encrypt and store data:', error);
      // Fallback to regular localStorage if encryption fails
      localStorage.setItem(key, value);
    }
  }

  static getItem(key: string): string | null {
    try {
      const encryptedValue = localStorage.getItem(key);
      if (!encryptedValue) return null;
      
      // Try to decrypt - if it fails, assume it's not encrypted (for backward compatibility)
      const decryptedValue = this.decrypt(encryptedValue);
      return decryptedValue || encryptedValue;
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      // Fallback to returning the raw value
      return localStorage.getItem(key);
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  static clear(): void {
    localStorage.clear();
  }

  // Helper method to migrate existing unencrypted data
  static migrateExistingData(keys: string[]): void {
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          // Try to decrypt - if it fails, it's probably unencrypted
          this.decrypt(value);
        } catch {
          // If decryption fails, re-encrypt the value
          this.setItem(key, value);
        }
      }
    });
  }
}

// List of sensitive keys that should be encrypted
export const SENSITIVE_KEYS = [
  'accessToken',
  'refreshToken',
  'userEmail',
  'userName',
  'userPicture',
  'userRole',
  'currentUser',
  'clientId',
  'clientSecret',
  'driveUrl'
];

// Convenience functions for common operations
export const encryptedStorage = {
  // User data
  setUserData: (email: string, name: string, picture: string, role: string) => {
    EncryptedStorage.setItem('userEmail', email);
    EncryptedStorage.setItem('userName', name);
    EncryptedStorage.setItem('userPicture', picture);
    EncryptedStorage.setItem('userRole', role);
  },

  getUserData: () => ({
    email: EncryptedStorage.getItem('userEmail'),
    name: EncryptedStorage.getItem('userName'),
    picture: EncryptedStorage.getItem('userPicture'),
    role: EncryptedStorage.getItem('userRole')
  }),

  // Tokens
  setTokens: (accessToken: string, refreshToken?: string) => {
    EncryptedStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      EncryptedStorage.setItem('refreshToken', refreshToken);
    }
  },

  getTokens: () => ({
    accessToken: EncryptedStorage.getItem('accessToken'),
    refreshToken: EncryptedStorage.getItem('refreshToken')
  }),

  // OAuth settings
  setOAuthSettings: (clientId: string, clientSecret: string, driveUrl: string) => {
    EncryptedStorage.setItem('clientId', clientId);
    EncryptedStorage.setItem('clientSecret', clientSecret);
    EncryptedStorage.setItem('driveUrl', driveUrl);
  },

  getOAuthSettings: () => ({
    clientId: EncryptedStorage.getItem('clientId'),
    clientSecret: EncryptedStorage.getItem('clientSecret'),
    driveUrl: EncryptedStorage.getItem('driveUrl')
  }),

  // Clear all sensitive data, with option to keep refresh token for soft logout
  clearUserData: (options?: { keepRefreshToken?: boolean }) => {
    if (options?.keepRefreshToken) {
      const refreshToken = EncryptedStorage.getItem('refreshToken');
      SENSITIVE_KEYS.forEach(key => {
        if (key !== 'refreshToken') EncryptedStorage.removeItem(key);
      });
      // Restore refresh token if it existed
      if (refreshToken) EncryptedStorage.setItem('refreshToken', refreshToken);
    } else {
      SENSITIVE_KEYS.forEach(key => EncryptedStorage.removeItem(key));
    }
  }
};
