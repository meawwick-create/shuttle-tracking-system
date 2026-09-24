import { useState, useEffect } from 'react';
import { getTimeAgoText } from '../utils/dateUtils';

/**
 * Custom Hook for relative time ago text
 * @param {Date|string|null} lastRecordedDate
 */
export function useRelativeTime(lastRecordedDate) {
  const [timeAgo, setTimeAgo] = useState('กำลังดึงข้อมูล...');

  useEffect(() => {
    const update = () => {
      if (lastRecordedDate) {
        setTimeAgo(getTimeAgoText(lastRecordedDate));
      } else {
        setTimeAgo('กำลังดึงข้อมูล...');
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [lastRecordedDate]);

  return timeAgo;
}

/**
 * Custom Hook for digital clock & time ago
 */
export function useClock(lastRecordedDate) {
  const [currentTime, setCurrentTime] = useState('--:--:--');
  const timeAgo = useRelativeTime(lastRecordedDate);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('th-TH', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return { currentTime, timeAgo };
}
