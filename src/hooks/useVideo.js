import useSWR from 'swr';
import { videoService } from '../services/videoService';

// SWR fetcher function
const fetcher = async (key, ...args) => {
  if (typeof key === 'function') {
    const response = await key(...args);
    return response.data;
  }
  return null;
};

// Hook to fetch videos list
export const useVideos = (page = 1, limit = 20) => {
  const { data, error, isLoading, mutate } = useSWR(
    ['videos', page, limit],
    () => fetcher(videoService.getVideos, page, limit),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
    }
  );

  return {
    videos: data,
    isLoading,
    isError: error,
    mutate,
  };
};

// Hook to fetch single video
export const useVideo = (videoId) => {
  const { data, error, isLoading, mutate } = useSWR(
    videoId ? ['video', videoId] : null,
    () => fetcher(videoService.getVideo, videoId),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    video: data,
    isLoading,
    isError: error,
    mutate,
  };
};
