import { Time12Hour, convert12To24, convert24To12, isValidTime12Hour } from '../utils/timeUtils';

interface TimePicker12HourProps {
  value: string; // 24-hour format HH:MM
  onChange: (time24: string) => void;
  className?: string;
}

export function TimePicker12Hour({ value, onChange, className = '' }: TimePicker12HourProps) {
  const time12 = convert24To12(value);

  const handleHourChange = (hour: number) => {
    const newTime12: Time12Hour = { ...time12, hour };
    if (isValidTime12Hour(newTime12)) {
      onChange(convert12To24(newTime12));
    }
  };

  const handleMinuteChange = (minute: number) => {
    const newTime12: Time12Hour = { ...time12, minute };
    if (isValidTime12Hour(newTime12)) {
      onChange(convert12To24(newTime12));
    }
  };

  const handleAmPmChange = (isAM: boolean) => {
    const newTime12: Time12Hour = { ...time12, isAM };
    if (isValidTime12Hour(newTime12)) {
      onChange(convert12To24(newTime12));
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Hour Select */}
      <select
        value={time12.hour}
        onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center font-mono"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
          <option key={hour} value={hour}>
            {hour.toString().padStart(2, '0')}
          </option>
        ))}
      </select>

      <span className="text-gray-500 dark:text-gray-400">:</span>

      {/* Minute Select */}
      <select
        value={time12.minute}
        onChange={(e) => handleMinuteChange(parseInt(e.target.value, 10))}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center font-mono"
      >
        {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
          <option key={minute} value={minute}>
            {minute.toString().padStart(2, '0')}
          </option>
        ))}
      </select>

      {/* AM/PM Toggle */}
      <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
        <button
          type="button"
          onClick={() => handleAmPmChange(true)}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            time12.isAM
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => handleAmPmChange(false)}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            !time12.isAM
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          PM
        </button>
      </div>
    </div>
  );
}
