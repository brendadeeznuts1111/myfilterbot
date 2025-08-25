/**
 * Timezone Utility Functions
 * Provides timezone conversion and validation for the dashboard
 */

import { dashboardConfigService } from '../services/dashboard-config-service';

/**
 * Format a date with the specified timezone
 */
export function formatWithTimezone(date: Date, timezone?: string): string {
  const tz = timezone || getCurrentTimezone();

  const options: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  };

  try {
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error(`Invalid timezone: ${tz}, falling back to UTC`);
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: 'UTC',
    }).format(date);
  }
}

/**
 * Get the current configured timezone
 */
export function getCurrentTimezone(): string {
  const appConfig = dashboardConfigService.getConfig('app');
  return appConfig?.app?.timezone || process.env.TZ || 'UTC';
}

/**
 * Get current time in specified timezone
 */
export function getCurrentTimeInTimezone(timezone?: string): string {
  const tz = timezone || getCurrentTimezone();
  const now = new Date();

  const options: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  try {
    return new Intl.DateTimeFormat('en-US', options).format(now);
  } catch (error) {
    console.error(`Invalid timezone: ${tz}`);
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: 'UTC',
    }).format(now);
  }
}

/**
 * Get timezone offset in minutes
 */
export function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const tzString = now.toLocaleString('en-US', { timeZone: timezone });
    const utcString = now.toLocaleString('en-US', { timeZone: 'UTC' });

    const tzDate = new Date(tzString);
    const utcDate = new Date(utcString);

    return (utcDate.getTime() - tzDate.getTime()) / (1000 * 60);
  } catch (error) {
    console.warn(`Invalid timezone: ${timezone}, returning 0 offset`);
    return 0;
  }
}

/**
 * Validate if a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get list of common timezones
 */
export function getCommonTimezones(): {
  value: string;
  label: string;
  offset: string;
}[] {
  const timezones = [
    { value: 'UTC', label: 'UTC', offset: '+00:00' },
    { value: 'America/New_York', label: 'Eastern Time (ET)', offset: '-05:00' },
    { value: 'America/Chicago', label: 'Central Time (CT)', offset: '-06:00' },
    { value: 'America/Denver', label: 'Mountain Time (MT)', offset: '-07:00' },
    {
      value: 'America/Los_Angeles',
      label: 'Pacific Time (PT)',
      offset: '-08:00',
    },
    { value: 'America/Phoenix', label: 'Arizona Time', offset: '-07:00' },
    { value: 'America/Anchorage', label: 'Alaska Time', offset: '-09:00' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time', offset: '-10:00' },
    { value: 'Europe/London', label: 'London (GMT)', offset: '+00:00' },
    { value: 'Europe/Paris', label: 'Central European Time', offset: '+01:00' },
    { value: 'Europe/Moscow', label: 'Moscow Time', offset: '+03:00' },
    { value: 'Asia/Dubai', label: 'Dubai Time', offset: '+04:00' },
    { value: 'Asia/Kolkata', label: 'India Standard Time', offset: '+05:30' },
    { value: 'Asia/Shanghai', label: 'China Standard Time', offset: '+08:00' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time', offset: '+09:00' },
    { value: 'Australia/Sydney', label: 'Sydney Time', offset: '+11:00' },
    { value: 'Pacific/Auckland', label: 'New Zealand Time', offset: '+13:00' },
  ];

  // Update offsets based on current date (accounts for DST)
  return timezones.map(tz => {
    const offset = getTimezoneOffsetString(tz.value);
    return { ...tz, offset };
  });
}

/**
 * Get timezone offset as a formatted string (e.g., "+05:30")
 */
export function getTimezoneOffsetString(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });

    const parts = formatter.formatToParts(now);
    const timeZoneName =
      parts.find(part => part.type === 'timeZoneName')?.value || '';

    // Try to extract offset from timezone name
    const offsetMatch = timeZoneName.match(/GMT([+-]\d{1,2}):?(\d{2})?/);
    if (offsetMatch) {
      const hours = offsetMatch[1];
      const minutes = offsetMatch[2] || '00';
      return `${hours}:${minutes}`;
    }

    // Calculate offset manually
    const offsetMinutes = getTimezoneOffset(timezone);
    const sign = offsetMinutes <= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMinutes);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;

    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    return '+00:00';
  }
}

/**
 * Convert time from one timezone to another
 */
export function convertTimezone(
  date: Date,
  fromTimezone: string,
  toTimezone: string
): Date {
  try {
    // Get the time string in the source timezone
    const timeInSource = date.toLocaleString('en-US', {
      timeZone: fromTimezone,
    });

    // Create a new date object with that time
    const dateInSource = new Date(timeInSource);

    // Get the time string in the target timezone
    const timeInTarget = dateInSource.toLocaleString('en-US', {
      timeZone: toTimezone,
    });

    // Return as a new Date object
    return new Date(timeInTarget);
  } catch (error) {
    console.error(
      `Failed to convert timezone from ${fromTimezone} to ${toTimezone}`
    );
    return date;
  }
}

/**
 * Get a user-friendly timezone display name
 */
export function getTimezoneDisplayName(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long',
    });

    const parts = formatter.formatToParts(now);
    const timeZoneName = parts.find(
      part => part.type === 'timeZoneName'
    )?.value;

    if (timeZoneName) {
      // Add offset to the display name
      const offset = getTimezoneOffsetString(timezone);
      return `${timeZoneName} (${offset})`;
    }

    return timezone;
  } catch (error) {
    return timezone;
  }
}

/**
 * Parse a date string with timezone awareness
 */
export function parseWithTimezone(dateString: string, timezone?: string): Date {
  const tz = timezone || getCurrentTimezone();

  try {
    // If the date string includes timezone info, use it directly
    if (dateString.match(/[+-]\d{2}:\d{2}|Z$/)) {
      return new Date(dateString);
    }

    // Otherwise, treat it as being in the specified timezone
    const date = new Date(dateString + ' ' + getTimezoneOffsetString(tz));
    return date;
  } catch (error) {
    console.error(`Failed to parse date string: ${dateString}`);
    return new Date();
  }
}

/**
 * Schedule a task for a specific time in a given timezone
 */
export function scheduleInTimezone(
  time: string, // Format: "HH:MM"
  timezone: string,
  callback: () => void
): NodeJS.Timeout | null {
  try {
    const [hours, minutes] = time.split(':').map(Number);

    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(hours, minutes, 0, 0);

    // Convert target time to the specified timezone
    const targetInTimezone = convertTimezone(
      targetTime,
      getCurrentTimezone(),
      timezone
    );

    // Calculate delay
    let delay = targetInTimezone.getTime() - now.getTime();

    // If the time has already passed today, schedule for tomorrow
    if (delay < 0) {
      targetInTimezone.setDate(targetInTimezone.getDate() + 1);
      delay = targetInTimezone.getTime() - now.getTime();
    }

    return setTimeout(callback, delay);
  } catch (error) {
    console.error(`Failed to schedule task in timezone ${timezone}`);
    return null;
  }
}

/**
 * Get timezone abbreviation (e.g., "EST", "PST")
 */
export function getTimezoneAbbreviation(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });

    const parts = formatter.formatToParts(now);
    const timeZoneName =
      parts.find(part => part.type === 'timeZoneName')?.value || timezone;

    // Extract abbreviation from timezone name
    const abbrevMatch = timeZoneName.match(/^[A-Z]{2,5}/);
    return abbrevMatch ? abbrevMatch[0] : timeZoneName;
  } catch (error) {
    return timezone.substring(0, 3).toUpperCase();
  }
}
