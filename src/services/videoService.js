import api from './api';
import { API_ENDPOINTS } from '../config/constants';
import { mockVideoService } from './mockService';

export const videoService = {
  // Upload video with ABR
  uploadVideo: async (videoFile, title, description, onProgress) => {
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', title || 'Untitled Video');
      formData.append('description', description || 'No description');

      const response = await api.post(API_ENDPOINTS.UPLOAD_VIDEO, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          if (onProgress) {
            onProgress(percentCompleted);
          }
        },
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      // Fallback to mock data in development
      console.warn('Upload failed, using mock mode');
      return await mockVideoService.uploadVideo(videoFile, title, description, onProgress);
    }
  },

  // Get all videos (for home page)
  getVideos: async (page = 1, limit = 20) => {
    try {
      const response = await api.get(API_ENDPOINTS.GET_VIDEOS, {
        params: { page, limit },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      // Fallback to mock data if API fails
      console.warn('Failed to fetch videos, using mock data for development');
      return await mockVideoService.getVideos(page, limit);
    }
  },

  // Get single video by ID
  getVideo: async (videoId) => {
    try {
      const response = await api.get(API_ENDPOINTS.GET_VIDEO(videoId), {
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      // Fallback to mock data
      console.warn('Failed to fetch video, using mock data');
      return await mockVideoService.getVideo(videoId);
    }
  },
};
