import { useVideos } from '../hooks/useVideo';
import VideoCard from '../components/video/VideoCard';
import VideoGrid from '../components/video/VideoGrid';

const Home = () => {
  const { videos, isLoading, isError, mutate } = useVideos();

  // Render video cards
  const videoCards = videos?.map((video) => (
    <VideoCard key={video._id} video={video} />
  ));

  const handleRetry = () => {
    mutate();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Discover Videos</h1>
        <p className="text-gray-600 mt-1">Watch the latest content from creators</p>
      </div>

      <VideoGrid 
        videos={videoCards} 
        loading={isLoading} 
        error={isError}
        onRetry={handleRetry}
      />
    </div>
  );
};

export default Home;
