'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

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
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-500" />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-card p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-brandInk/70 mb-1">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-brandBlack">{value}</p>
            {getTrendIcon()}
          </div>
        </div>
        {icon && (
          <div className="ml-4 text-primary opacity-80">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
