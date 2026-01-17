import { memo, forwardRef } from 'react';

// Input component - using rerender-memo best practice
const Input = memo(
  forwardRef(({ 
    label, 
    error, 
    type = 'text', 
    className = '', 
    required = false,
    ...props 
  }, ref) => {
    const inputClass = `w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
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
        <input
          ref={ref}
          type={type}
          className={inputClass}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  })
);

Input.displayName = 'Input';

export default Input;
