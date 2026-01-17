import { memo } from 'react';

// Card component
const Card = memo(({ children, className = '', hover = false }) => {
  const baseClass = 'bg-white rounded-lg shadow-md overflow-hidden';
  const hoverClass = hover ? 'transition-transform hover:scale-105 hover:shadow-lg' : '';
  
  return (
    <div className={`${baseClass} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
