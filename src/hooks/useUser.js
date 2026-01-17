import useSWR from 'swr';
import { userService } from '../services/userService';

// SWR fetcher function - follows client-swr-dedup best practice
const fetcher = async (key, ...args) => {
  if (typeof key === 'function') {
    const response = await key(...args);
    return response.data;
  }
  return null;
};

// Hook to fetch channel profile
export const useChannelProfile = (username) => {
  const { data, error, isLoading, mutate } = useSWR(
    username ? ['channel', username] : null,
    () => fetcher(userService.getChannelProfile, username),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Dedupe requests within 1 minute
    }
  );

  return {
    channel: data,
    isLoading,
    isError: error,
    mutate,
  };
};

// Hook to fetch watch history
export const useWatchHistory = () => {
  const { data, error, isLoading, mutate } = useSWR(
    'watch-history',
    () => fetcher(userService.getWatchHistory),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    watchHistory: data,
    isLoading,
    isError: error,
    mutate,
  };
};
