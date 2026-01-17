import { useParams, Link } from 'react-router-dom';
import { useVideo } from '../hooks/useVideo';
import VideoPlayer from '../components/video/VideoPlayer';
import Avatar from '../components/common/Avatar';
import Spinner from '../components/common/Spinner';
import { formatRelativeTime } from '../utils/dateHelpers';
import { formatNumber } from '../utils/helpers';

const Watch = () => {
  const { id } = useParams();
  const { video, isLoading, isError } = useVideo(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !video) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Video not found</h2>
        <p className="mt-2 text-gray-600">The video you're looking for doesn't exist or has been removed.</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Video Player */}
          <VideoPlayer
            src={video.masterPlaylist}
            poster={video.thumbnail}
          />

          {/* Video Info */}
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <Link to={`/channel/${video.owner?.username}`}>
                  <Avatar 
                    src={video.owner?.avatar} 
                    alt={video.owner?.username}
                    size="lg"
                  />
                </Link>
                <div>
                  <Link 
                    to={`/channel/${video.owner?.username}`}
                    className="font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {video.owner?.fullname || video.owner?.username}
                  </Link>
                  <p className="text-sm text-gray-600">
                    {video.owner?.subscribersCount ? 
                      `${formatNumber(video.owner.subscribersCount)} subscribers` : 
                      'No subscribers yet'
                    }
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  <span>Like</span>
                </button>
                
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="mt-4 bg-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span>{formatRelativeTime(video.createdAt)}</span>
              </div>
              <p className="text-gray-900 whitespace-pre-wrap">
                {video.description || 'No description provided.'}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar - Related Videos */}
        <div className="lg:col-span-1">
          <h3 className="font-semibold text-gray-900 mb-4">Related Videos</h3>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">No related videos available yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Watch;
