import { memo } from 'react';

// Textarea component
const Textarea = memo(({ 
  label, 
  error, 
  rows = 4, 
  className = '', 
  required = false,
  ...props 
}) => {
  const textareaClass = `w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-vertical ${
    error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
  } ${className}`;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        className={textareaClass}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
