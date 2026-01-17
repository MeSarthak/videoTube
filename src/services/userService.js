import api from './api';
import { API_ENDPOINTS } from '../config/constants';

export const userService = {
  // Update account details
  updateAccount: async (fullname, email) => {
    const response = await api.patch(API_ENDPOINTS.UPDATE_ACCOUNT, {
      fullname,
      email,
    });
    
    // Update user in localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUser = { ...currentUser, ...response.data.data };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    return response.data;
  },

  // Update avatar
  updateAvatar: async (avatarFile) => {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    const response = await api.patch(API_ENDPOINTS.UPDATE_AVATAR, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    // Update user in localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUser = { ...currentUser, avatar: response.data.data.avatar };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    return response.data;
  },

  // Update cover image
  updateCoverImage: async (coverImageFile) => {
    const formData = new FormData();
    formData.append('coverImage', coverImageFile);

    const response = await api.patch(API_ENDPOINTS.UPDATE_COVER, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    // Update user in localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUser = { ...currentUser, coverImage: response.data.data.coverImage };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    return response.data;
  },

  // Get channel profile
  getChannelProfile: async (username) => {
    const response = await api.get(API_ENDPOINTS.GET_CHANNEL(username));
    return response.data;
  },

  // Get watch history
  getWatchHistory: async () => {
    const response = await api.get(API_ENDPOINTS.GET_WATCH_HISTORY);
    return response.data;
  },
};
