import api from './api';
import { API_ENDPOINTS } from '../config/constants';

export const videoService = {
  // Upload video with ABR
  uploadVideo: async (videoFile, title, description, onProgress) => {
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
    });

    return response.data;
  },

  // Get all videos (for home page)
  getVideos: async (page = 1, limit = 20) => {
    const response = await api.get(API_ENDPOINTS.GET_VIDEOS, {
      params: { page, limit },
    });
    return response.data;
  },

  // Get single video by ID
  getVideo: async (videoId) => {
    const response = await api.get(API_ENDPOINTS.GET_VIDEO(videoId));
    return response.data;
  },
};
