// API Configuration
export const API_BASE_URL = 'https://videotube-backend-bhcfgygwgea7dwbz.centralindia-01.azurewebsites.net/api/v1';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  REGISTER: '/users/register',
  LOGIN: '/users/login',
  LOGOUT: '/users/logout',
  REFRESH_TOKEN: '/users/refresh-token',
  
  // User endpoints
  CHANGE_PASSWORD: '/users/changePassword',
  UPDATE_ACCOUNT: '/users/updateAccountDetails',
  UPDATE_AVATAR: '/users/updateAvatar',
  UPDATE_COVER: '/users/updateCoverImage',
  GET_CHANNEL: (username) => `/users/channel/${username}`,
  GET_WATCH_HISTORY: '/users/watch-history',
  
  // Video endpoints
  UPLOAD_VIDEO: '/videos/upload-abr',
  GET_VIDEOS: '/videos',
  GET_VIDEO: (id) => `/videos/${id}`,
};

// App Configuration
export const APP_CONFIG = {
  MAX_UPLOAD_SIZE: 500 * 1024 * 1024, // 500MB
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  TOKEN_REFRESH_INTERVAL: 14 * 60 * 1000, // 14 minutes
};
