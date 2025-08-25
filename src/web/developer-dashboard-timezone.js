// Timezone utilities for the developer dashboard
// Configure this to match your bot's timezone

const DASHBOARD_CONFIG = {
    // Set your preferred timezone here
    // Options: 'America/Chicago', 'America/New_York', 'UTC', 'Europe/London', etc.
    timezone: 'America/Chicago',
    
    // Date/time format options
    timeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true  // Use 12-hour format (AM/PM)
    },
    
    dateFormat: {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }
};

// Get current time in configured timezone
function getCurrentTime() {
    return new Date().toLocaleTimeString('en-US', {
        timeZone: DASHBOARD_CONFIG.timezone,
        ...DASHBOARD_CONFIG.timeFormat
    });
}

// Get current date in configured timezone
function getCurrentDate() {
    return new Date().toLocaleDateString('en-US', {
        timeZone: DASHBOARD_CONFIG.timezone,
        ...DASHBOARD_CONFIG.dateFormat
    });
}

// Get full timestamp in configured timezone
function getTimestamp() {
    const date = new Date();
    const dateStr = date.toLocaleDateString('en-US', {
        timeZone: DASHBOARD_CONFIG.timezone,
        ...DASHBOARD_CONFIG.dateFormat
    });
    const timeStr = date.toLocaleTimeString('en-US', {
        timeZone: DASHBOARD_CONFIG.timezone,
        ...DASHBOARD_CONFIG.timeFormat
    });
    return `${dateStr} ${timeStr}`;
}

// Format a date object to configured timezone
function formatDate(date, includeTime = true) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    if (includeTime) {
        return date.toLocaleString('en-US', {
            timeZone: DASHBOARD_CONFIG.timezone,
            ...DASHBOARD_CONFIG.dateFormat,
            ...DASHBOARD_CONFIG.timeFormat
        });
    } else {
        return date.toLocaleDateString('en-US', {
            timeZone: DASHBOARD_CONFIG.timezone,
            ...DASHBOARD_CONFIG.dateFormat
        });
    }
}

// Get timezone offset from UTC
function getTimezoneOffset() {
    const date = new Date();
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: DASHBOARD_CONFIG.timezone }));
    const offset = (tzDate - utcDate) / (1000 * 60 * 60);
    return offset;
}

// Get timezone abbreviation (CST, CDT, EST, etc.)
function getTimezoneAbbr() {
    const date = new Date();
    const timeStr = date.toLocaleTimeString('en-US', {
        timeZone: DASHBOARD_CONFIG.timezone,
        timeZoneName: 'short'
    });
    // Extract timezone abbreviation from the time string
    const match = timeStr.match(/[A-Z]{2,4}$/);
    return match ? match[0] : DASHBOARD_CONFIG.timezone;
}

// Display timezone info
function getTimezoneInfo() {
    const offset = getTimezoneOffset();
    const abbr = getTimezoneAbbr();
    const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
    return `${DASHBOARD_CONFIG.timezone} (${abbr} UTC${offsetStr})`;
}

// Usage in dashboard:
// Replace existing time updates with:
/*
// Update the dashboard time display
function updateDashboardTime() {
    document.getElementById('current-time').textContent = getCurrentTime();
    document.getElementById('timezone-info').textContent = getTimezoneAbbr();
}

// For log entries
function addLogWithTimezone(message, level) {
    const time = getCurrentTime();
    // ... rest of log entry code
}
*/

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DASHBOARD_CONFIG,
        getCurrentTime,
        getCurrentDate,
        getTimestamp,
        formatDate,
        getTimezoneOffset,
        getTimezoneAbbr,
        getTimezoneInfo
    };
}

// Example output when running in Chicago timezone:
console.log('Current Time:', getCurrentTime());        // "02:30:45 PM"
console.log('Current Date:', getCurrentDate());        // "Aug 25, 2025"
console.log('Timestamp:', getTimestamp());            // "Aug 25, 2025 02:30:45 PM"
console.log('Timezone Info:', getTimezoneInfo());     // "America/Chicago (CDT UTC-5)"
console.log('Timezone Abbr:', getTimezoneAbbr());     // "CDT" or "CST"