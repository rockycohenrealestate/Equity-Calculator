import React from 'react';

interface ResultsCardProps {
  label: string;
  value: string;
  description?: string;
  colorClass?: string;
  icon?: React.ReactNode;
}

const ResultsCard: React.FC<ResultsCardProps> = ({ label, value, description, colorClass = "text-gray-900", icon }) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-start space-x-4 card">
      {icon && (
        <div className="bg-yellow-100 text-yellow-600 rounded-full p-2">
            {icon}
        </div>
      )}
      <div>
        <dt className="text-sm font-medium text-gray-500 truncate">{label}</dt>
        <dd className={`mt-1 text-3xl font-semibold tracking-tight ${colorClass}`}>{value}</dd>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
    </div>
  );
};

export default ResultsCard;