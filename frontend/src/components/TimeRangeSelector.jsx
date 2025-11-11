import { Calendar, Clock } from 'lucide-react';

export default function TimeRangeSelector({ selectedRange, onRangeChange }) {
  const ranges = [
    { value: '1h', label: 'Last Hour', interval: 60 },
    { value: '6h', label: 'Last 6 Hours', interval: 360 },
    { value: '24h', label: 'Last 24 Hours', interval: 1440 },
    { value: '7d', label: 'Last 7 Days', interval: 10080 },
    { value: '30d', label: 'Last 30 Days', interval: 43200 },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Clock className="w-4 h-4" />
        <span className="font-medium">Time Range:</span>
      </div>
      <div className="flex gap-2">
        {ranges.map((range) => (
          <button
            key={range.value}
            onClick={() => onRangeChange(range)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              selectedRange === range.value
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}
