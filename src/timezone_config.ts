/**
 * Timezone Configuration for Fantdev Trading Bot
 * Handles timezone management for global trading operations
 */

export interface TimezoneConfig {
  timezone: string;
  label: string;
  offset: string;
  tradingHours?: {
    open: string;
    close: string;
  };
}

export const TRADING_TIMEZONES: Record<string, TimezoneConfig> = {
  // US Markets
  "America/New_York": {
    timezone: "America/New_York",
    label: "New York (EST/EDT)",
    offset: "UTC-5/-4",
    tradingHours: {
      open: "09:30",
      close: "16:00"
    }
  },
  "America/Chicago": {
    timezone: "America/Chicago",
    label: "Chicago (CST/CDT)",
    offset: "UTC-6/-5",
    tradingHours: {
      open: "08:30",
      close: "15:00"
    }
  },
  "America/Los_Angeles": {
    timezone: "America/Los_Angeles",
    label: "Los Angeles (PST/PDT)",
    offset: "UTC-8/-7",
    tradingHours: {
      open: "06:30",
      close: "13:00"
    }
  },
  
  // European Markets
  "Europe/London": {
    timezone: "Europe/London",
    label: "London (GMT/BST)",
    offset: "UTC+0/+1",
    tradingHours: {
      open: "08:00",
      close: "16:30"
    }
  },
  "Europe/Frankfurt": {
    timezone: "Europe/Frankfurt",
    label: "Frankfurt (CET/CEST)",
    offset: "UTC+1/+2",
    tradingHours: {
      open: "09:00",
      close: "17:30"
    }
  },
  
  // Asian Markets
  "Asia/Tokyo": {
    timezone: "Asia/Tokyo",
    label: "Tokyo (JST)",
    offset: "UTC+9",
    tradingHours: {
      open: "09:00",
      close: "15:00"
    }
  },
  "Asia/Hong_Kong": {
    timezone: "Asia/Hong_Kong",
    label: "Hong Kong (HKT)",
    offset: "UTC+8",
    tradingHours: {
      open: "09:30",
      close: "16:00"
    }
  },
  "Asia/Singapore": {
    timezone: "Asia/Singapore",
    label: "Singapore (SGT)",
    offset: "UTC+8",
    tradingHours: {
      open: "09:00",
      close: "17:00"
    }
  },
  
  // Other Important Zones
  "UTC": {
    timezone: "UTC",
    label: "UTC (Coordinated Universal Time)",
    offset: "UTC+0"
  }
};

export class TimezoneManager {
  private originalTZ: string | undefined;
  private currentTZ: string;
  
  constructor(defaultTimezone: string = "America/Chicago") {
    // Store original timezone using Bun.env for optimal performance
    this.originalTZ = Bun.env.TZ;
    this.currentTZ = defaultTimezone;
    
    // Set default timezone
    this.setTimezone(defaultTimezone);
  }
  
  /**
   * Set the process timezone
   */
  setTimezone(timezone: string): void {
    if (!this.isValidTimezone(timezone)) {
      console.warn(`Invalid timezone: ${timezone}, keeping current: ${this.currentTZ}`);
      return;
    }
    
    // Use Bun.env for environment variables (faster than process.env)
    Bun.env.TZ = timezone;
    this.currentTZ = timezone;
    console.log(`✅ Timezone set to: ${timezone}`);
  }
  
  /**
   * Get current timezone
   */
  getCurrentTimezone(): string {
    return this.currentTZ;
  }
  
  /**
   * Get current time in specified timezone
   */
  getTimeInZone(timezone?: string): Date {
    if (timezone && timezone !== this.currentTZ) {
      // Temporarily change timezone using Bun.env
      const savedTZ = Bun.env.TZ;
      Bun.env.TZ = timezone;
      const date = new Date();
      Bun.env.TZ = savedTZ;
      return date;
    }
    return new Date();
  }
  
  /**
   * Format time for display with timezone
   */
  formatTimeWithZone(date: Date = new Date(), timezone?: string): string {
    const tz = timezone || this.currentTZ;
    const options: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    
    return date.toLocaleString('en-US', options) + ` (${this.getTimezoneAbbr(tz)})`;
  }
  
  /**
   * Get timezone abbreviation
   */
  getTimezoneAbbr(timezone: string): string {
    const config = TRADING_TIMEZONES[timezone];
    if (config) {
      return config.label.match(/\(([^)]+)\)/)?.[1] || timezone;
    }
    return timezone;
  }
  
  /**
   * Check if market is open in timezone
   */
  isMarketOpen(timezone: string = this.currentTZ): boolean {
    const config = TRADING_TIMEZONES[timezone];
    if (!config?.tradingHours) return true; // Always open if no hours defined
    
    const now = this.getTimeInZone(timezone);
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const [openHour, openMin] = config.tradingHours.open.split(':').map(Number);
    const [closeHour, closeMin] = config.tradingHours.close.split(':').map(Number);
    
    const openTime = openHour * 100 + openMin;
    const closeTime = closeHour * 100 + closeMin;
    
    // Check if weekend
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false; // Markets closed on weekends
    }
    
    return currentTime >= openTime && currentTime <= closeTime;
  }
  
  /**
   * Get market status for all zones
   */
  getGlobalMarketStatus(): Record<string, { open: boolean; time: string }> {
    const status: Record<string, { open: boolean; time: string }> = {};
    
    for (const [tz, config] of Object.entries(TRADING_TIMEZONES)) {
      if (config.tradingHours) {
        const time = this.getTimeInZone(tz);
        status[tz] = {
          open: this.isMarketOpen(tz),
          time: time.toLocaleTimeString('en-US', { 
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit'
          })
        };
      }
    }
    
    return status;
  }
  
  /**
   * Schedule task for specific timezone time
   */
  scheduleForTimezone(
    timezone: string,
    hour: number,
    minute: number,
    callback: () => void
  ): NodeJS.Timeout {
    const targetTime = new Date();
    
    // Set timezone temporarily to calculate using Bun.env
    const savedTZ = Bun.env.TZ;
    Bun.env.TZ = timezone;
    
    targetTime.setHours(hour, minute, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (targetTime.getTime() < Date.now()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const delay = targetTime.getTime() - Date.now();
    Bun.env.TZ = savedTZ;
    
    console.log(`⏰ Scheduled task for ${timezone} ${hour}:${minute.toString().padStart(2, '0')} (in ${Math.round(delay / 60000)} minutes)`);
    
    return setTimeout(() => {
      console.log(`🔔 Executing scheduled task for ${timezone}`);
      callback();
    }, delay);
  }
  
  /**
   * Check if timezone is valid
   */
  private isValidTimezone(timezone: string): boolean {
    try {
      new Date().toLocaleString('en-US', { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Restore original timezone
   */
  restore(): void {
    if (this.originalTZ) {
      Bun.env.TZ = this.originalTZ;
    } else {
      delete Bun.env.TZ;
    }
    console.log("↩️ Restored original timezone");
  }
}

// Create singleton instance
export const timezoneManager = new TimezoneManager();

// Helper functions for common operations
export function getCurrentMarketTime(timezone?: string): string {
  return timezoneManager.formatTimeWithZone(new Date(), timezone);
}

export function isMarketOpen(timezone?: string): boolean {
  return timezoneManager.isMarketOpen(timezone);
}

export function setDefaultTimezone(timezone: string): void {
  timezoneManager.setTimezone(timezone);
}

// Example usage for your bot
if (import.meta.main) {
  console.log("🌍 Timezone Configuration Test");
  console.log("=" * 50);
  
  // Set default to Chicago (your current config)
  setDefaultTimezone("America/Chicago");
  console.log(`Current time: ${getCurrentMarketTime()}`);
  
  // Check global markets
  console.log("\n📊 Global Market Status:");
  const marketStatus = timezoneManager.getGlobalMarketStatus();
  for (const [tz, status] of Object.entries(marketStatus)) {
    const config = TRADING_TIMEZONES[tz];
    console.log(`${config.label}: ${status.open ? '🟢 OPEN' : '🔴 CLOSED'} (${status.time})`);
  }
  
  // Schedule a task for NY market open
  timezoneManager.scheduleForTimezone("America/New_York", 9, 30, () => {
    console.log("🔔 New York market is opening!");
  });
}