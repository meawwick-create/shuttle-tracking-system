/**
 * Date & Time Utility Functions
 */

/**
 * Parses MySQL DATETIME string ("YYYY-MM-DD HH:mm:ss") safely into a JS Date object.
 * @param {string} sqlDateStr
 * @returns {Date|null}
 */
export function parseSqlDate(sqlDateStr) {
  if (!sqlDateStr) return null;
  const isoStr = sqlDateStr.replace(' ', 'T');
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns human-readable relative time string in Thai.
 * @param {Date|string} date
 * @returns {string}
 */
export function getTimeAgoText(date) {
  if (!date) return 'กำลังดึงข้อมูล...';
  const target = typeof date === 'string' ? parseSqlDate(date) : date;
  if (!target) return 'ไม่มีข้อมูล';

  const diffSec = Math.max(0, Math.floor((Date.now() - target.getTime()) / 1000));

  if (diffSec < 5) return 'เมื่อสักครู่';
  if (diffSec < 60) return `${diffSec} วินาทีที่แล้ว`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours} ชั่วโมงที่แล้ว`;
}

/**
 * Extracts "HH:mm:ss" from SQL datetime.
 * @param {string} sqlDateStr
 * @returns {string}
 */
export function formatTimeOnly(sqlDateStr) {
  if (!sqlDateStr) return '-';
  const parts = sqlDateStr.split(' ');
  return parts[1] || sqlDateStr;
}
