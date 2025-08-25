/**
 * Security API (TypeScript/Bun)
 * High-performance equivalent of security_api.py
 * Handles security monitoring, threat detection, and incident management
 */

interface SecurityEvent {
  id: string;
  timestamp: string;
  event_type: EventType;
  threat_level: ThreatLevel;
  source_ip?: string;
  user_id?: string;
  user_agent?: string;
  description: string;
  metadata: Record<string, any>;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  actions_taken: SecurityAction[];
}

enum EventType {
  LOGIN_ATTEMPT = 'login_attempt',
  FAILED_LOGIN = 'failed_login',
  PASSWORD_CHANGE = 'password_change',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  MALICIOUS_REQUEST = 'malicious_request',
  ACCOUNT_LOCKOUT = 'account_lockout',
  PERMISSION_ESCALATION = 'permission_escalation',
}

enum ThreatLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

enum ActionType {
  BLOCK_IP = 'block_ip',
  RATE_LIMIT = 'rate_limit',
  REQUIRE_2FA = 'require_2fa',
  LOCK_ACCOUNT = 'lock_account',
  NOTIFY_ADMIN = 'notify_admin',
  LOG_EVENT = 'log_event',
  QUARANTINE_SESSION = 'quarantine_session',
}

interface SecurityAction {
  id: string;
  event_id: string;
  action_type: ActionType;
  timestamp: string;
  details: Record<string, any>;
  success: boolean;
  error_message?: string;
}

interface SecurityRule {
  id: string;
  name: string;
  description: string;
  event_types: EventType[];
  conditions: Record<string, any>;
  actions: ActionType[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
  trigger_count: number;
  last_triggered?: string;
}

interface SecurityMetrics {
  total_events: number;
  events_by_type: Record<EventType, number>;
  events_by_threat_level: Record<ThreatLevel, number>;
  blocked_ips: string[];
  active_sessions: number;
  failed_login_attempts: number;
  resolved_incidents: number;
  open_incidents: number;
  average_response_time: number; // in seconds
}

interface IPWhitelist {
  ip: string;
  description: string;
  added_by: string;
  added_at: string;
  expires_at?: string;
}

interface IPBlocklist {
  ip: string;
  reason: string;
  blocked_by: string;
  blocked_at: string;
  expires_at?: string;
  permanent: boolean;
}

class SecurityAPI {
  private events: SecurityEvent[] = [];
  private rules: Map<string, SecurityRule> = new Map();
  private actions: Map<string, SecurityAction> = new Map();
  private ipWhitelist: Map<string, IPWhitelist> = new Map();
  private ipBlocklist: Map<string, IPBlocklist> = new Map();
  private rateLimitCounter: Map<string, { count: number; resetAt: number }> =
    new Map();

  constructor() {
    this.initializeDefaultRules();
    this.startCleanupTask();
  }

  private getAdminFromRequest(
    req: Request
  ): { admin_id: string; permissions: string[] } | null {
    // In production, this would validate JWT tokens
    const adminId = req.headers.get('X-Admin-ID');
    const permissions =
      req.headers.get('X-Admin-Permissions')?.split(',') || [];

    if (adminId === 'admin' && permissions.includes('security_read')) {
      return { admin_id: adminId, permissions };
    }

    return null;
  }

  private initializeDefaultRules() {
    const defaultRules: SecurityRule[] = [
      {
        id: 'failed_login_threshold',
        name: 'Failed Login Threshold',
        description: 'Lock account after 5 failed login attempts in 15 minutes',
        event_types: [EventType.FAILED_LOGIN],
        conditions: {
          threshold: 5,
          time_window: 900, // 15 minutes in seconds
          scope: 'user_id',
        },
        actions: [ActionType.LOCK_ACCOUNT, ActionType.NOTIFY_ADMIN],
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        trigger_count: 0,
      },
      {
        id: 'rate_limit_protection',
        name: 'Rate Limit Protection',
        description: 'Block IP after excessive requests',
        event_types: [EventType.RATE_LIMIT_EXCEEDED],
        conditions: {
          threshold: 100,
          time_window: 300, // 5 minutes
          scope: 'ip_address',
        },
        actions: [ActionType.BLOCK_IP, ActionType.LOG_EVENT],
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        trigger_count: 0,
      },
      {
        id: 'suspicious_activity_monitor',
        name: 'Suspicious Activity Monitor',
        description: 'Monitor and log suspicious activities',
        event_types: [
          EventType.SUSPICIOUS_ACTIVITY,
          EventType.UNAUTHORIZED_ACCESS,
        ],
        conditions: {
          severity: 'high',
        },
        actions: [
          ActionType.REQUIRE_2FA,
          ActionType.NOTIFY_ADMIN,
          ActionType.LOG_EVENT,
        ],
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        trigger_count: 0,
      },
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  private startCleanupTask() {
    // Clean up old events and expired blocks every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000);
  }

  private cleanupOldData() {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Remove events older than 30 days
    this.events = this.events.filter(
      event => new Date(event.timestamp).getTime() > thirtyDaysAgo
    );

    // Remove expired IP blocks
    for (const [ip, block] of this.ipBlocklist.entries()) {
      if (block.expires_at && new Date(block.expires_at).getTime() < now) {
        this.ipBlocklist.delete(ip);
      }
    }

    // Remove expired IP whitelists
    for (const [ip, whitelist] of this.ipWhitelist.entries()) {
      if (
        whitelist.expires_at &&
        new Date(whitelist.expires_at).getTime() < now
      ) {
        this.ipWhitelist.delete(ip);
      }
    }

    console.log(
      `🧹 Security cleanup: ${this.events.length} events, ${this.ipBlocklist.size} blocked IPs`
    );
  }

  private processSecurityEvent(event: SecurityEvent) {
    // Apply security rules to the event
    for (const rule of this.rules.values()) {
      if (!rule.enabled || !rule.event_types.includes(event.event_type)) {
        continue;
      }

      if (this.evaluateRuleConditions(rule, event)) {
        this.executeRuleActions(rule, event);
        rule.trigger_count++;
        rule.last_triggered = new Date().toISOString();
      }
    }
  }

  private evaluateRuleConditions(
    rule: SecurityRule,
    event: SecurityEvent
  ): boolean {
    // Simple rule evaluation - in production this would be more sophisticated
    const conditions = rule.conditions;

    if (conditions.threshold && conditions.time_window) {
      const timeWindow = conditions.time_window * 1000; // Convert to milliseconds
      const cutoff = Date.now() - timeWindow;

      let relevantEvents: SecurityEvent[];

      if (conditions.scope === 'user_id' && event.user_id) {
        relevantEvents = this.events.filter(
          e =>
            e.user_id === event.user_id &&
            e.event_type === event.event_type &&
            new Date(e.timestamp).getTime() > cutoff
        );
      } else if (conditions.scope === 'ip_address' && event.source_ip) {
        relevantEvents = this.events.filter(
          e =>
            e.source_ip === event.source_ip &&
            e.event_type === event.event_type &&
            new Date(e.timestamp).getTime() > cutoff
        );
      } else {
        return false;
      }

      return relevantEvents.length >= conditions.threshold;
    }

    return true;
  }

  private executeRuleActions(rule: SecurityRule, event: SecurityEvent) {
    for (const actionType of rule.actions) {
      const action: SecurityAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        event_id: event.id,
        action_type: actionType,
        timestamp: new Date().toISOString(),
        details: {},
        success: true,
      };

      try {
        switch (actionType) {
          case ActionType.BLOCK_IP:
            if (event.source_ip) {
              this.blockIP(
                event.source_ip,
                `Triggered by rule: ${rule.name}`,
                'system'
              );
              action.details = { blocked_ip: event.source_ip };
            }
            break;

          case ActionType.LOCK_ACCOUNT:
            if (event.user_id) {
              // In production, this would interact with user management system
              action.details = { locked_user_id: event.user_id };
              console.log(`🔒 Account locked: ${event.user_id}`);
            }
            break;

          case ActionType.NOTIFY_ADMIN:
            // In production, this would send real notifications
            action.details = {
              notification_sent: true,
              admin_notified: 'admin',
            };
            console.log(`🚨 Admin notified for event: ${event.id}`);
            break;

          case ActionType.REQUIRE_2FA:
            if (event.user_id) {
              action.details = { requires_2fa: event.user_id };
              console.log(`🔐 2FA required for user: ${event.user_id}`);
            }
            break;

          case ActionType.RATE_LIMIT:
            if (event.source_ip) {
              this.applyRateLimit(event.source_ip);
              action.details = { rate_limited_ip: event.source_ip };
            }
            break;

          default:
            action.details = { action_type: actionType };
        }

        this.actions.set(action.id, action);
      } catch (error) {
        action.success = false;
        action.error_message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `Failed to execute security action ${actionType}:`,
          error
        );
      }
    }
  }

  private blockIP(
    ip: string,
    reason: string,
    blockedBy: string,
    permanent: boolean = false
  ) {
    const expiresAt = permanent
      ? undefined
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    this.ipBlocklist.set(ip, {
      ip,
      reason,
      blocked_by: blockedBy,
      blocked_at: new Date().toISOString(),
      expires_at: expiresAt,
      permanent,
    });
  }

  private applyRateLimit(ip: string) {
    const resetAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    this.rateLimitCounter.set(ip, { count: 0, resetAt });
  }

  // API Route Handlers

  async getSecurityStatus(req: Request): Promise<Response> {
    const admin = this.getAdminFromRequest(req);
    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;
    const recentEvents = this.events.filter(
      e => new Date(e.timestamp).getTime() > last24Hours
    );

    const metrics: SecurityMetrics = {
      total_events: this.events.length,
      events_by_type: this.getEventsByType(recentEvents),
      events_by_threat_level: this.getEventsByThreatLevel(recentEvents),
      blocked_ips: Array.from(this.ipBlocklist.keys()),
      active_sessions: Math.floor(Math.random() * 150) + 50, // Mock data
      failed_login_attempts: recentEvents.filter(
        e => e.event_type === EventType.FAILED_LOGIN
      ).length,
      resolved_incidents: this.events.filter(e => e.resolved).length,
      open_incidents: this.events.filter(
        e => !e.resolved && e.threat_level !== ThreatLevel.LOW
      ).length,
      average_response_time: 180, // Mock: 3 minutes average
    };

    return Response.json({
      success: true,
      status: 'operational',
      timestamp: new Date().toISOString(),
      metrics,
      system_health: 'healthy',
      monitoring_active: true,
      rules_configured: this.rules.size,
      last_updated: new Date().toISOString(),
    });
  }

  async getSecurityEvents(req: Request): Promise<Response> {
    const admin = this.getAdminFromRequest(req);
    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50'),
      200
    );
    const eventType = url.searchParams.get('event_type') as EventType;
    const threatLevel = url.searchParams.get('threat_level') as ThreatLevel;
    const unresolvedOnly = url.searchParams.get('unresolved_only') === 'true';

    let filteredEvents = [...this.events];

    // Apply filters
    if (eventType) {
      filteredEvents = filteredEvents.filter(e => e.event_type === eventType);
    }

    if (threatLevel) {
      filteredEvents = filteredEvents.filter(
        e => e.threat_level === threatLevel
      );
    }

    if (unresolvedOnly) {
      filteredEvents = filteredEvents.filter(e => !e.resolved);
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

    return Response.json({
      success: true,
      events: paginatedEvents,
      pagination: {
        page,
        limit,
        total: filteredEvents.length,
        total_pages: Math.ceil(filteredEvents.length / limit),
      },
    });
  }

  async getSecurityRules(req: Request): Promise<Response> {
    const admin = this.getAdminFromRequest(req);
    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = Array.from(this.rules.values());

    return Response.json({
      success: true,
      rules,
      total: rules.length,
    });
  }

  async updateSecurityRule(req: Request): Promise<Response> {
    const admin = this.getAdminFromRequest(req);
    if (!admin || !admin.permissions.includes('security_write')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const ruleId = url.pathname.split('/').pop();

    if (!ruleId) {
      return Response.json({ error: 'Rule ID required' }, { status: 400 });
    }

    const rule = this.rules.get(ruleId);
    if (!rule) {
      return Response.json({ error: 'Rule not found' }, { status: 404 });
    }

    try {
      const updates = await req.json();

      // Update allowed fields
      if (typeof updates.enabled === 'boolean') {
        rule.enabled = updates.enabled;
      }

      if (updates.conditions) {
        rule.conditions = { ...rule.conditions, ...updates.conditions };
      }

      if (updates.actions && Array.isArray(updates.actions)) {
        rule.actions = updates.actions;
      }

      rule.updated_at = new Date().toISOString();
      this.rules.set(ruleId, rule);

      return Response.json({
        success: true,
        message: 'Security rule updated successfully',
        rule,
      });
    } catch (error) {
      return Response.json(
        {
          error: 'Invalid request data',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      );
    }
  }

  async getBlockedIPs(req: Request): Promise<Response> {
    const admin = this.getAdminFromRequest(req);
    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blockedIPs = Array.from(this.ipBlocklist.entries()).map(
      ([ip, data]) => ({
        ip,
        ...data,
      })
    );

    return Response.json({
      success: true,
      blocked_ips: blockedIPs,
      total: blockedIPs.length,
    });
  }

  async blockIP(req: Request): Promise<Response> {
    const admin = this.getAdminFromRequest(req);
    if (!admin || !admin.permissions.includes('security_write')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const {
        ip,
        reason,
        permanent = false,
        duration_hours = 24,
      } = await req.json();

      if (!ip || !reason) {
        return Response.json(
          {
            error: 'Missing required fields: ip, reason',
          },
          { status: 400 }
        );
      }

      this.blockIP(ip, reason, admin.admin_id, permanent);

      return Response.json({
        success: true,
        message: `IP ${ip} blocked successfully`,
        blocked_ip: ip,
        expires_at: permanent
          ? null
          : new Date(
              Date.now() + duration_hours * 60 * 60 * 1000
            ).toISOString(),
      });
    } catch (error) {
      return Response.json(
        {
          error: 'Invalid request data',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      );
    }
  }

  async unblockIP(req: Request): Promise<Response> {
    const admin = this.getAdminFromRequest(req);
    if (!admin || !admin.permissions.includes('security_write')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const ip = url.pathname.split('/').pop();

    if (!ip) {
      return Response.json({ error: 'IP address required' }, { status: 400 });
    }

    if (this.ipBlocklist.has(ip)) {
      this.ipBlocklist.delete(ip);

      return Response.json({
        success: true,
        message: `IP ${ip} unblocked successfully`,
        unblocked_ip: ip,
      });
    } else {
      return Response.json(
        { error: 'IP not found in blocklist' },
        { status: 404 }
      );
    }
  }

  async recordSecurityEvent(req: Request): Promise<Response> {
    // Internal endpoint for recording security events
    try {
      const eventData = await req.json();

      const event: SecurityEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        event_type: eventData.event_type,
        threat_level: eventData.threat_level || ThreatLevel.LOW,
        source_ip: eventData.source_ip,
        user_id: eventData.user_id,
        user_agent: eventData.user_agent,
        description: eventData.description,
        metadata: eventData.metadata || {},
        resolved: false,
        actions_taken: [],
      };

      this.events.unshift(event);
      this.processSecurityEvent(event);

      return Response.json({
        success: true,
        message: 'Security event recorded',
        event_id: event.id,
      });
    } catch (error) {
      return Response.json(
        {
          error: 'Invalid request data',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      );
    }
  }

  // Helper methods

  private getEventsByType(events: SecurityEvent[]): Record<EventType, number> {
    const counts = {} as Record<EventType, number>;

    Object.values(EventType).forEach(type => {
      counts[type] = events.filter(e => e.event_type === type).length;
    });

    return counts;
  }

  private getEventsByThreatLevel(
    events: SecurityEvent[]
  ): Record<ThreatLevel, number> {
    const counts = {} as Record<ThreatLevel, number>;

    Object.values(ThreatLevel).forEach(level => {
      counts[level] = events.filter(e => e.threat_level === level).length;
    });

    return counts;
  }

  // Method to create sample events for testing
  createSampleEvents() {
    const sampleEvents: SecurityEvent[] = [
      {
        id: `event_${Date.now()}_001`,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        event_type: EventType.FAILED_LOGIN,
        threat_level: ThreatLevel.MEDIUM,
        source_ip: '192.168.1.100',
        user_id: 'BB1042',
        description: 'Failed login attempt with incorrect password',
        metadata: { attempts: 3, user_agent: 'Mozilla/5.0...' },
        resolved: false,
        actions_taken: [],
      },
      {
        id: `event_${Date.now()}_002`,
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        event_type: EventType.SUSPICIOUS_ACTIVITY,
        threat_level: ThreatLevel.HIGH,
        source_ip: '10.0.0.15',
        user_id: 'BB1045',
        description: 'Multiple rapid balance queries from different locations',
        metadata: { locations: ['US', 'RU', 'CN'], queries: 50 },
        resolved: true,
        resolved_at: new Date(Date.now() - 3600000).toISOString(),
        resolved_by: 'admin',
        actions_taken: [],
      },
    ];

    this.events.push(...sampleEvents);
  }
}

// Export singleton instance
export const securityAPI = new SecurityAPI();
export { EventType, ThreatLevel, ActionType };
export type { SecurityEvent, SecurityRule, SecurityMetrics };
