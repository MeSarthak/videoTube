import { useParams, Link } from 'react-router-dom';
import { useChannelProfile } from '../hooks/useUser';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { formatNumber } from '../utils/helpers';

const Channel = () => {
  const { username } = useParams();
  const { channel, isLoading, isError } = useChannelProfile(username);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !channel) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Channel not found</h2>
        <p className="mt-2 text-gray-600">The channel you're looking for doesn't exist.</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg overflow-hidden">
        {channel.coverImage ? (
          <img
            src={channel.coverImage}
            alt="Channel cover"
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      {/* Channel Info */}
      <div className="mt-6">
        <div className="flex items-start gap-6">
          <Avatar 
            src={channel.avatar} 
            alt={channel.username}
            size="xl"
            className="border-4 border-white shadow-lg"
          />

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{channel.fullname}</h1>
            <p className="text-gray-600 mt-1">@{channel.username}</p>
            
            <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
              <span>{formatNumber(channel.subscribersCount || 0)} subscribers</span>
              <span>{formatNumber(channel.subscribedToCount || 0)} subscribed</span>
            </div>

            <div className="mt-4">
              <Button variant={channel.isSubscribed ? 'secondary' : 'primary'}>
                {channel.isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Content */}
      <div className="mt-8">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            <button className="px-1 py-4 border-b-2 border-blue-600 font-medium text-blue-600">
              Videos
            </button>
            <button className="px-1 py-4 border-b-2 border-transparent font-medium text-gray-600 hover:text-gray-900">
              About
            </button>
          </nav>
        </div>

        <div className="mt-6">
          <p className="text-gray-600">No videos uploaded yet.</p>
        </div>
      </div>
    </div>
  );
};

export default Channel;
