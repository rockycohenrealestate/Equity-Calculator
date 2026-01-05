import React from 'react';

interface InputGroupProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: React.ReactNode;
  isPercent?: boolean;
  error?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, name, value, onChange, placeholder, icon, isPercent = false, error }) => {
  const errorInputClasses = 'border-red-500 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500';
  const defaultInputClasses = 'border-gray-300 bg-white text-gray-900 focus:border-yellow-500 focus:ring-yellow-500';

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative rounded-md shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-gray-500 sm:text-sm">
            {icon}
          </span>
        </div>
        <input
          type="number"
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          className={`block w-full rounded-md pl-10 pr-4 sm:text-sm ${error ? errorInputClasses : defaultInputClasses}`}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      </div>
       {error && (
        <p className="mt-1 text-xs text-red-600" id={`${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
};

export default InputGroup;