# Timezone Configuration Guide

## Current Timezone Settings

The Fantdev Trading Bot system uses **America/Chicago (Central Time)** as the default timezone across all services.

## Where Timezones Are Configured

### 1. **Bot Configuration** (`config/deploy_production.yml`)
```yaml
environment:
  production:
    timezone: "America/Chicago"
```

### 2. **Python Bot** (`src/bot/`)
- Uses system timezone or configured TZ environment variable
- Set via: `export TZ=America/Chicago`

### 3. **Dashboard** (`developer-dashboard-timezone.js`)
```javascript
const DASHBOARD_CONFIG = {
    timezone: 'America/Chicago'  // Change this to your preferred timezone
};
```

### 4. **Environment Variables** (`.env`)
```bash
TZ=America/Chicago
```

### 5. **Docker/System** 
```bash
# Set system-wide
export TZ=America/Chicago

# Or in Docker
ENV TZ=America/Chicago
```

## Common Timezones

| Location | Timezone String | UTC Offset |
|----------|----------------|------------|
| Chicago | `America/Chicago` | UTC-6 (CST) / UTC-5 (CDT) |
| New York | `America/New_York` | UTC-5 (EST) / UTC-4 (EDT) |
| Los Angeles | `America/Los_Angeles` | UTC-8 (PST) / UTC-7 (PDT) |
| London | `Europe/London` | UTC+0 (GMT) / UTC+1 (BST) |
| UTC | `UTC` | UTC+0 |
| Tokyo | `Asia/Tokyo` | UTC+9 |
| Sydney | `Australia/Sydney` | UTC+10 / UTC+11 |

## How to Change Timezone

### Option 1: Change Globally (Recommended)
1. Update `.env` file:
   ```bash
   TZ=America/New_York  # Your timezone
   ```

2. Update `config/deploy_production.yml`:
   ```yaml
   timezone: "America/New_York"
   ```

3. Update dashboard configuration:
   ```javascript
   // In developer-dashboard-timezone.js
   timezone: 'America/New_York'
   ```

### Option 2: Set for Specific Service
```bash
# For Python bot only
TZ=America/New_York python3 src/bot/main.py

# For Bun/Node services
TZ=America/New_York bun run dev:server
```

## Current Time Display

### In the Dashboard
The developer dashboard shows times in:
- **Default**: Your browser's local timezone
- **With timezone.js**: Configured timezone (Chicago by default)

### In Logs
- **Bot logs**: Server timezone (Chicago)
- **Transaction timestamps**: UTC stored, displayed in local timezone
- **Reports**: Generated in Chicago timezone

## Timezone Conversion Examples

### Python
```python
from datetime import datetime
import pytz

# Get current time in Chicago
chicago_tz = pytz.timezone('America/Chicago')
chicago_time = datetime.now(chicago_tz)

# Convert to UTC
utc_time = chicago_time.astimezone(pytz.UTC)

# Convert to another timezone
ny_tz = pytz.timezone('America/New_York')
ny_time = chicago_time.astimezone(ny_tz)
```

### JavaScript/TypeScript
```javascript
// Get time in specific timezone
const chicagoTime = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago'
});

// Using Intl.DateTimeFormat
const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
});

const formattedTime = formatter.format(new Date());
```

## Best Practices

1. **Store in UTC**: Always store timestamps in UTC in the database
2. **Display in Local**: Convert to user's local timezone for display
3. **Be Consistent**: Use the same timezone across all services
4. **Document It**: Always document which timezone is being used
5. **Test DST**: Test daylight saving time transitions

## Troubleshooting

### Issue: Times are off by 1 hour
**Cause**: Daylight Saving Time (DST) transition
**Solution**: Ensure timezone library is up to date

### Issue: Different times in different services
**Cause**: Services using different timezone settings
**Solution**: Set TZ environment variable consistently

### Issue: Database times don't match display
**Cause**: UTC storage vs local display
**Solution**: Always store UTC, convert for display

## Checking Current Timezone

### Linux/Mac
```bash
# System timezone
date +%Z
timedatectl

# Environment variable
echo $TZ
```

### In Python
```python
import time
print(time.tzname)

from datetime import datetime
print(datetime.now().astimezone().tzinfo)
```

### In JavaScript
```javascript
console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log(new Date().getTimezoneOffset()); // Minutes from UTC
```

## Summary

Currently, the Fantdev Trading Bot system is configured for:
- **Primary Timezone**: America/Chicago (Central Time)
- **Storage Format**: UTC for database timestamps
- **Display Format**: Local timezone with CST/CDT indication
- **Dashboard Default**: Browser local time (configurable to Chicago time)