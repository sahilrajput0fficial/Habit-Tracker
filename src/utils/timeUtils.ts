// Time and timezone utilities
import { DateTime } from 'luxon';

// Time format conversion utilities for 12-hour and 24-hour formats

export interface Time12Hour {
  hour: number; // 1-12
  minute: number; // 0-59
  isAM: boolean;
}

export interface Time24Hour {
  hour: number; // 0-23
  minute: number; // 0-59
}

/**
 * Convert 24-hour time string (HH:MM) to 12-hour format
 */
export function convert24To12(time24: string): Time12Hour {
  const [hourStr, minuteStr] = time24.split(':');
  const hour24 = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const isAM = hour24 < 12;

  return { hour: hour12, minute, isAM };
}

/**
 * Convert 12-hour format to 24-hour time string (HH:MM)
 */
export function convert12To24(time12: Time12Hour): string {
  let hour24 = time12.hour;

  if (time12.hour === 12) {
    hour24 = time12.isAM ? 0 : 12;
  } else if (!time12.isAM) {
    hour24 += 12;
  }

  return `${hour24.toString().padStart(2, '0')}:${time12.minute.toString().padStart(2, '0')}`;
}

/**
 * Parse a time string and return Time12Hour format
 * Accepts both 12-hour (e.g., "2:30 PM") and 24-hour (e.g., "14:30") formats
 */
export function parseTimeTo12Hour(timeString: string): Time12Hour {
  // Check if it's already in 24-hour format (HH:MM)
  if (/^\d{1,2}:\d{2}$/.test(timeString)) {
    return convert24To12(timeString);
  }

  // Check if it's in 12-hour format with AM/PM
  const match = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const isAM = match[3].toUpperCase() === 'AM';

    return { hour, minute, isAM };
  }

  // Default fallback
  return { hour: 9, minute: 0, isAM: true };
}

/**
 * Format Time12Hour to display string (e.g., "9:00 AM")
 */
export function format12HourTime(time12: Time12Hour): string {
  return `${time12.hour}:${time12.minute.toString().padStart(2, '0')} ${time12.isAM ? 'AM' : 'PM'}`;
}

/**
 * Validate Time12Hour object
 */
export function isValidTime12Hour(time: Time12Hour): boolean {
  return (
    time.hour >= 1 && time.hour <= 12 &&
    time.minute >= 0 && time.minute <= 59 &&
    typeof time.isAM === 'boolean'
  );
}

/**
 * Get current time in 12-hour format
 */
export function getCurrentTime12Hour(): Time12Hour {
  const now = new Date();
  const hour24 = now.getHours();
  const minute = now.getMinutes();

  return convert24To12(`${hour24}:${minute}`);
}

// ---- Timezone helpers ----

/** Return the browser-detected IANA timezone, e.g., 'America/Los_Angeles' */
export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Given a local time-of-day (HH:MM) and a target IANA timezone, compute the next Date (in system timezone)
 * at which that local time occurs in that timezone.
 */
export function nextDateTimeInZone(timeHHMM: string, timeZone: string): Date {
  const [h, m] = timeHHMM.split(':').map(Number);

  // Now in target zone
  const nowZ = DateTime.now().setZone(timeZone);
  let nextZ = nowZ.set({ hour: h, minute: m, second: 0, millisecond: 0 });

  if (nextZ <= nowZ) {
    nextZ = nextZ.plus({ days: 1 });
  }

  // Convert to JS Date (system zone) for scheduling setTimeout
  return new Date(nextZ.toJSDate().getTime());
}

/** Convert a local time-of-day in a zone to the next UTC instant ISO string */
export function nextUtcInstantFromLocalTime(timeHHMM: string, timeZone: string): string {
  const dt = nextDateTimeInZone(timeHHMM, timeZone);
  return new Date(dt).toISOString();
}

/** Format a HH:MM time as 12-hour with AM/PM in the given timezone (for display) */
export function formatTimeInZone(timeHHMM: string, timeZone: string): string {
  const target = DateTime.now().setZone(timeZone);
  const [h, m] = timeHHMM.split(':').map(Number);
  const dt = target.set({ hour: h, minute: m, second: 0, millisecond: 0 });
  return dt.toFormat('h:mm a');
}

/** Return current offset minutes for a zone, useful to detect DST changes */
export function getZoneOffsetMinutes(timeZone: string): number {
  return DateTime.now().setZone(timeZone).offset; // minutes
}

/** Safe list of timezones; tries Intl.supportedValuesOf('timeZone') then fallback */
export function getAllTimeZones(): string[] {
  const fallback = [
    'UTC',
    'Etc/GMT',
    'Europe/London',
    'Europe/Paris',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Asia/Dubai',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Sao_Paulo',
    'Australia/Sydney'
  ];

  const IntlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof IntlAny.supportedValuesOf === 'function') {
    try {
      const list = IntlAny.supportedValuesOf!('timeZone');
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {
      // ignore unsupported environments
    }
  }
  return fallback;
}
