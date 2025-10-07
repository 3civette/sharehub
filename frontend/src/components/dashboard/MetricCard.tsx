'use client';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

export default function MetricCard({ title, value, trend, icon }: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend || trend === 'neutral') return null;

    return trend === 'up' ? (
      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {getTrendIcon()}
          </div>
        </div>
        {icon && (
          <div className="ml-4 text-blue-500 opacity-80">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
