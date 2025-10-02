/**
 * This file contains constants that are used throughout the application
 * to avoid hardcoding strings in multiple places
 */

// Error message constants
export const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized access',
  MISSING_FIELDS: 'Missing required fields',
  SERVER_ERROR: 'Internal server error',
  DUPLICATE_USER: 'User already exists',
};

// Success message constants
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
};

// API endpoint constants
export const API_ENDPOINTS = {
  USERS: '/users',
  HOSPITALS: '/hospitals',
  DOCTORS: '/doctors',
  TOKENS: '/tokens',
};

export const S3KeyPrefixes = {
  USERS_PROFILE_PIC: 'users_profile_pic',
}

export const OTP_COMMENT_NAME = 'auth_otp'