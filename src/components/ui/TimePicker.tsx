import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

interface TimePickerProps {
  defaultHour?: number;
  defaultMinute?: number;
  onChange: (hour: number, minute: number) => void;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  defaultHour = 2,
  defaultMinute = 0,
  onChange,
  className = ""
}) => {
  const [selectedHour, setSelectedHour] = React.useState(defaultHour);
  const [selectedMinute, setSelectedMinute] = React.useState(defaultMinute);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleHourChange = (hour: string) => {
    const hourNum = parseInt(hour);
    setSelectedHour(hourNum);
    onChange(hourNum, selectedMinute);
  };

  const handleMinuteChange = (minute: string) => {
    const minuteNum = parseInt(minute);
    setSelectedMinute(minuteNum);
    onChange(selectedHour, minuteNum);
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select value={selectedHour.toString()} onValueChange={handleHourChange}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hours.map(hour => (
            <SelectItem key={hour} value={hour.toString()}>
              {formatHour(hour)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={selectedMinute.toString()} onValueChange={handleMinuteChange}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {minutes.map(minute => (
            <SelectItem key={minute} value={minute.toString()}>
              {minute.toString().padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
