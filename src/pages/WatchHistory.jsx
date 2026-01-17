import { useWatchHistory } from '../hooks/useUser';
import VideoCard from '../components/video/VideoCard';
import VideoGrid from '../components/video/VideoGrid';

const WatchHistory = () => {
  const { watchHistory, isLoading, isError } = useWatchHistory();

  // Render video cards
  const videoCards = watchHistory?.map((video) => (
    <VideoCard key={video._id} video={video} />
  ));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Watch History</h1>
        <p className="text-gray-600 mt-1">Videos you've watched recently</p>
      </div>

      <VideoGrid 
        videos={videoCards} 
        loading={isLoading} 
        error={isError} 
      />
    </div>
  );
};

export default WatchHistory;
