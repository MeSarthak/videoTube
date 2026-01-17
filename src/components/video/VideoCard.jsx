import { memo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import { formatDuration } from '../../utils/helpers';
import { formatRelativeTime } from '../../utils/dateHelpers';

// VideoCard component - using rerender-memo best practice
const VideoCard = memo(({ video }) => {
  // Use ternary for conditional render
  return video ? (
    <Link to={`/watch/${video._id}`}>
      <Card hover className="cursor-pointer">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-200">
          <img
            src={video.thumbnail || '/placeholder-video.jpg'}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {video.duration ? (
            <span className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.duration)}
            </span>
          ) : null}
        </div>

        {/* Video Info */}
        <div className="p-3">
          <div className="flex gap-3">
            {/* Channel Avatar */}
            <Avatar 
              src={video.owner?.avatar} 
              alt={video.owner?.username} 
              size="md"
            />

            {/* Title and Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">
                {video.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {video.owner?.username || 'Unknown'}
              </p>
              {video.createdAt ? (
                <p className="text-xs text-gray-500 mt-1">
                  {formatRelativeTime(video.createdAt)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  ) : null;
});

VideoCard.displayName = 'VideoCard';

export default VideoCard;
