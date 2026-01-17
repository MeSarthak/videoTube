import { memo } from 'react';

// Avatar component
const Avatar = memo(({ 
  src, 
  alt = 'User avatar', 
  size = 'md', 
  className = '' 
}) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };
  
  const avatarClass = `${sizes[size]} rounded-full object-cover bg-gray-200 ${className}`;
  
  // Use ternary for conditional render
  return src ? (
    <img 
      src={src} 
      alt={alt} 
      className={avatarClass}
      loading="lazy"
    />
  ) : (
    <div className={`${avatarClass} flex items-center justify-center text-gray-500`}>
      <svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
