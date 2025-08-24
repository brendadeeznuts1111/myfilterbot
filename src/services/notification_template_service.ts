/**
 * Notification Template Service
 * Dynamic template management and customization with stream optimization
 */

import { StreamUtils, fetchJSON } from '../utils/stream-helpers';
import { DatabaseOperations, spawnPythonJSON } from '../utils/spawn-utils';
import type { NotificationType, NotificationPriority } from './enhanced_notification_service';

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  channels: string[];
  variables: string[];
  customizations: TemplateCustomization[];
  metadata: Record<string, any>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}

export interface TemplateCustomization {
  id: string;
  channel: string;
  titleOverride?: string;
  messageOverride?: string;
  formatting: TemplateFormatting;
  conditions: TemplateCondition[];
  active: boolean;
}

export interface TemplateFormatting {
  style: 'plain' | 'markdown' | 'html';
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
  typography?: {
    titleSize?: string;
    messageSize?: string;
    fontWeight?: 'normal' | 'bold';
  };
  layout?: {
    alignment?: 'left' | 'center' | 'right';
    spacing?: 'compact' | 'normal' | 'spacious';
  };
  icons?: {
    enabled: boolean;
    customIcon?: string;
  };
}

export interface TemplateCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'currency' | 'percentage';
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    allowedValues?: any[];
  };
  formatting?: {
    dateFormat?: string;
    numberFormat?: string;
    currencySymbol?: string;
  };
}

export interface RenderedTemplate {
  title: string;
  message: string;
  formatting: TemplateFormatting;
  metadata: Record<string, any>;
  variables: Record<string, any>;
  templateId: string;
  renderedAt: string;
  renderDuration: number;
}

export class NotificationTemplateService {
  private templateCache = new Map<string, NotificationTemplate>();
  private renderedCache = new Map<string, RenderedTemplate>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_CACHE_SIZE = 500;

  constructor() {
    this.initializeDefaultTemplates();
    this.startCacheCleanup();
  }

  /**
   * Initialize default notification templates
   */
  private async initializeDefaultTemplates() {
    const defaultTemplates: Partial<NotificationTemplate>[] = [
      {
        id: 'transaction_alert',
        name: 'Transaction Alert',
        type: 'transaction' as NotificationType,
        priority: 'high' as NotificationPriority,
        title: '💰 Transaction Alert: {{action}} of ${{amount}}',
        message: 'Customer {{customer_id}} has {{action}} ${{amount}}. New balance: ${{new_balance}}. {{#if notes}}Note: {{notes}}{{/if}}',
        channels: ['websocket', 'telegram', 'web'],
        variables: ['action', 'amount', 'customer_id', 'new_balance', 'notes'],
        customizations: [],
        metadata: { category: 'financial', importance: 'high' },
        active: true
      },
      {
        id: 'balance_update',
        name: 'Balance Update',
        type: 'balance_update' as NotificationType,
        priority: 'medium' as NotificationPriority,
        title: '📊 Balance Update for {{customer_id}}',
        message: 'Your account balance has been updated from ${{old_balance}} to ${{new_balance}}. Change: {{#if positive}}+{{/if}}${{change}} ({{percentage}}%)',
        channels: ['websocket', 'web', 'telegram'],
        variables: ['customer_id', 'old_balance', 'new_balance', 'change', 'percentage', 'positive'],
        customizations: [],
        metadata: { category: 'account', importance: 'medium' },
        active: true
      },
      {
        id: 'security_alert',
        name: 'Security Alert',
        type: 'security_alert' as NotificationType,
        priority: 'critical' as NotificationPriority,
        title: '🚨 SECURITY ALERT: {{alert_type}}',
        message: 'Security event detected: {{description}}. Time: {{timestamp}}. Location: {{location}}. {{#if action_required}}IMMEDIATE ACTION REQUIRED: {{action_required}}{{/if}}',
        channels: ['websocket', 'telegram', 'email', 'push'],
        variables: ['alert_type', 'description', 'timestamp', 'location', 'action_required'],
        customizations: [],
        metadata: { category: 'security', importance: 'critical' },
        active: true
      },
      {
        id: 'trade_signal',
        name: 'Trading Signal',
        type: 'trade_signal' as NotificationType,
        priority: 'high' as NotificationPriority,
        title: '📈 {{signal_type}} Signal: {{symbol}}',
        message: '{{signal_description}} for {{symbol}} at ${{price}}. Confidence: {{confidence}}%. {{#if expiry}}Valid until: {{expiry}}{{/if}}',
        channels: ['websocket', 'telegram', 'web'],
        variables: ['signal_type', 'symbol', 'price', 'signal_description', 'confidence', 'expiry'],
        customizations: [],
        metadata: { category: 'trading', importance: 'high' },
        active: true
      },
      {
        id: 'web_analysis_alert',
        name: 'Web Analysis Alert',
        type: 'web_analysis' as NotificationType,
        priority: 'medium' as NotificationPriority,
        title: '🌐 {{analysis_type}}: {{source}}',
        message: 'Web analysis detected {{event_type}}: {{description}}. Source: {{source}}. Confidence: {{confidence}}%. {{#if actionable}}Suggested action: {{suggested_action}}{{/if}}',
        channels: ['websocket', 'web'],
        variables: ['analysis_type', 'source', 'event_type', 'description', 'confidence', 'actionable', 'suggested_action'],
        customizations: [],
        metadata: { category: 'intelligence', importance: 'medium' },
        active: true
      },
      {
        id: 'market_alert',
        name: 'Market Alert',
        type: 'market_alert' as NotificationType,
        priority: 'high' as NotificationPriority,
        title: '📊 Market Alert: {{market_event}}',
        message: 'Market update: {{description}}. Impact: {{impact_level}}. Assets affected: {{affected_assets}}. {{#if recommendation}}Recommendation: {{recommendation}}{{/if}}',
        channels: ['websocket', 'telegram', 'web'],
        variables: ['market_event', 'description', 'impact_level', 'affected_assets', 'recommendation'],
        customizations: [],
        metadata: { category: 'market', importance: 'high' },
        active: true
      }
    ];

    for (const template of defaultTemplates) {
      await this.createTemplate(template as NotificationTemplate, 'system');
    }

    console.log('✅ Default notification templates initialized');
  }

  /**
   * Create new notification template
   */
  async createTemplate(templateData: Partial<NotificationTemplate>, createdBy: string): Promise<NotificationTemplate | null> {
    try {
      const template: NotificationTemplate = {
        id: templateData.id || `template_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: templateData.name || 'Untitled Template',
        type: templateData.type || 'info' as NotificationType,
        priority: templateData.priority || 'medium' as NotificationPriority,
        title: templateData.title || 'Notification',
        message: templateData.message || '',
        channels: templateData.channels || ['web'],
        variables: this.extractVariables(templateData.title || '', templateData.message || ''),
        customizations: templateData.customizations || [],
        metadata: templateData.metadata || {},
        active: templateData.active !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy,
        version: 1
      };

      // Store template with stream optimization
      const result = await DatabaseOperations.storeNotificationTemplate(template);
      
      if (result.success) {
        // Update cache
        this.templateCache.set(template.id, template);
        console.log(`📝 Template created: ${template.name} (${template.id})`);
        return template;
      } else {
        console.error('Failed to create template:', result.error);
        return null;
      }
    } catch (error: any) {
      console.error('Error creating template:', error);
      return null;
    }
  }

  /**
   * Update existing template
   */
  async updateTemplate(templateId: string, updates: Partial<NotificationTemplate>, updatedBy: string): Promise<NotificationTemplate | null> {
    try {
      const existingTemplate = await this.getTemplate(templateId);
      if (!existingTemplate) {
        console.error('Template not found:', templateId);
        return null;
      }

      const updatedTemplate: NotificationTemplate = {
        ...existingTemplate,
        ...updates,
        id: templateId, // Prevent ID changes
        variables: updates.title || updates.message ? 
          this.extractVariables(updates.title || existingTemplate.title, updates.message || existingTemplate.message) :
          existingTemplate.variables,
        updatedAt: new Date().toISOString(),
        version: existingTemplate.version + 1
      };

      const result = await DatabaseOperations.updateNotificationTemplate(updatedTemplate);
      
      if (result.success) {
        // Update cache
        this.templateCache.set(templateId, updatedTemplate);
        this.clearRenderedCache(templateId);
        console.log(`📝 Template updated: ${updatedTemplate.name} (v${updatedTemplate.version})`);
        return updatedTemplate;
      } else {
        console.error('Failed to update template:', result.error);
        return null;
      }
    } catch (error: any) {
      console.error('Error updating template:', error);
      return null;
    }
  }

  /**
   * Get template by ID with caching
   */
  async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    try {
      // Check cache first
      const cached = this.templateCache.get(templateId);
      if (cached) {
        return cached;
      }

      // Query database
      const result = await DatabaseOperations.getNotificationTemplate(templateId);
      
      if (result.success && result.data) {
        const template = result.data as NotificationTemplate;
        this.templateCache.set(templateId, template);
        return template;
      } else {
        return null;
      }
    } catch (error: any) {
      console.error('Error getting template:', error);
      return null;
    }
  }

  /**
   * Get all templates with filtering
   */
  async getTemplates(filters: {
    type?: NotificationType;
    priority?: NotificationPriority;
    active?: boolean;
    createdBy?: string;
    search?: string;
  } = {}): Promise<NotificationTemplate[]> {
    try {
      const result = await DatabaseOperations.getNotificationTemplates(filters);
      
      if (result.success && result.data) {
        const templates = result.data as NotificationTemplate[];
        
        // Update cache
        templates.forEach(template => {
          this.templateCache.set(template.id, template);
        });
        
        console.log(`📋 Retrieved ${templates.length} templates`);
        return templates;
      } else {
        console.error('Failed to get templates:', result.error);
        return [];
      }
    } catch (error: any) {
      console.error('Error getting templates:', error);
      return [];
    }
  }

  /**
   * Render template with variables and customizations
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, any> = {},
    channel: string = 'web',
    userContext: { userId: string; userType: string } = { userId: '', userType: 'customer' }
  ): Promise<RenderedTemplate | null> {
    const startTime = performance.now();

    try {
      // Check rendered cache
      const cacheKey = `${templateId}_${channel}_${JSON.stringify(variables)}`;
      const cached = this.renderedCache.get(cacheKey);
      if (cached && Date.now() - new Date(cached.renderedAt).getTime() < this.CACHE_TTL) {
        return cached;
      }

      // Get template
      const template = await this.getTemplate(templateId);
      if (!template || !template.active) {
        console.error('Template not found or inactive:', templateId);
        return null;
      }

      // Find applicable customization for channel
      const customization = template.customizations.find(c => 
        c.channel === channel && 
        c.active && 
        this.evaluateConditions(c.conditions, { ...variables, ...userContext })
      );

      // Use stream optimization for template rendering
      const renderData = {
        template,
        variables,
        channel,
        customization,
        userContext
      };

      const result = await spawnPythonJSON('./src/services/template_renderer.py', [
        JSON.stringify(renderData)
      ]);

      if (result.success && result.data) {
        const rendered: RenderedTemplate = {
          title: result.data.title,
          message: result.data.message,
          formatting: customization?.formatting || this.getDefaultFormatting(channel),
          metadata: {
            ...template.metadata,
            templateId,
            channel,
            renderContext: userContext
          },
          variables,
          templateId,
          renderedAt: new Date().toISOString(),
          renderDuration: performance.now() - startTime
        };

        // Cache rendered result
        if (this.renderedCache.size < this.MAX_CACHE_SIZE) {
          this.renderedCache.set(cacheKey, rendered);
        }

        console.log(`🎨 Template rendered: ${template.name} for ${channel} (${rendered.renderDuration.toFixed(2)}ms)`);
        return rendered;
      } else {
        console.error('Template rendering failed:', result.error);
        return null;
      }
    } catch (error: any) {
      console.error('Error rendering template:', error);
      return null;
    }
  }

  /**
   * Create template customization for specific channel
   */
  async createCustomization(
    templateId: string,
    customization: Omit<TemplateCustomization, 'id'>
  ): Promise<TemplateCustomization | null> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        console.error('Template not found:', templateId);
        return null;
      }

      const newCustomization: TemplateCustomization = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        ...customization
      };

      template.customizations.push(newCustomization);
      template.updatedAt = new Date().toISOString();
      template.version++;

      const result = await DatabaseOperations.updateNotificationTemplate(template);
      
      if (result.success) {
        this.templateCache.set(templateId, template);
        this.clearRenderedCache(templateId);
        console.log(`🎨 Customization created for template ${templateId}: ${newCustomization.channel}`);
        return newCustomization;
      } else {
        console.error('Failed to create customization:', result.error);
        return null;
      }
    } catch (error: any) {
      console.error('Error creating customization:', error);
      return null;
    }
  }

  /**
   * Preview template rendering without storing
   */
  async previewTemplate(
    templateData: Partial<NotificationTemplate>,
    variables: Record<string, any> = {},
    channel: string = 'web'
  ): Promise<RenderedTemplate | null> {
    try {
      const previewTemplate: NotificationTemplate = {
        id: 'preview',
        name: 'Preview Template',
        type: 'info' as NotificationType,
        priority: 'medium' as NotificationPriority,
        title: 'Preview',
        message: '',
        channels: ['web'],
        variables: [],
        customizations: [],
        metadata: {},
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'preview',
        version: 1,
        ...templateData
      };

      // Extract variables from title and message
      previewTemplate.variables = this.extractVariables(previewTemplate.title, previewTemplate.message);

      // Render using stream optimization
      const renderData = {
        template: previewTemplate,
        variables,
        channel,
        customization: null,
        userContext: { userId: 'preview', userType: 'customer' }
      };

      const result = await spawnPythonJSON('./src/services/template_renderer.py', [
        JSON.stringify(renderData)
      ]);

      if (result.success && result.data) {
        return {
          title: result.data.title,
          message: result.data.message,
          formatting: this.getDefaultFormatting(channel),
          metadata: { ...previewTemplate.metadata, preview: true },
          variables,
          templateId: 'preview',
          renderedAt: new Date().toISOString(),
          renderDuration: result.duration || 0
        };
      } else {
        console.error('Preview rendering failed:', result.error);
        return null;
      }
    } catch (error: any) {
      console.error('Error previewing template:', error);
      return null;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const result = await DatabaseOperations.deleteNotificationTemplate(templateId);
      
      if (result.success) {
        this.templateCache.delete(templateId);
        this.clearRenderedCache(templateId);
        console.log(`🗑️ Template deleted: ${templateId}`);
        return true;
      } else {
        console.error('Failed to delete template:', result.error);
        return false;
      }
    } catch (error: any) {
      console.error('Error deleting template:', error);
      return false;
    }
  }

  /**
   * Extract variables from template strings
   */
  private extractVariables(title: string, message: string): string[] {
    const variables = new Set<string>();
    const regex = /\{\{([^}]+)\}\}/g;
    
    let match;
    
    // Extract from title
    while ((match = regex.exec(title)) !== null) {
      const variable = match[1].trim().split(' ')[0]; // Handle helpers like {{#if condition}}
      if (!variable.startsWith('#') && !variable.startsWith('/')) {
        variables.add(variable);
      }
    }
    
    // Reset regex for message
    regex.lastIndex = 0;
    
    // Extract from message
    while ((match = regex.exec(message)) !== null) {
      const variable = match[1].trim().split(' ')[0];
      if (!variable.startsWith('#') && !variable.startsWith('/')) {
        variables.add(variable);
      }
    }
    
    return Array.from(variables);
  }

  /**
   * Evaluate template conditions
   */
  private evaluateConditions(conditions: TemplateCondition[], context: Record<string, any>): boolean {
    if (conditions.length === 0) return true;
    
    let result = true;
    let currentLogicalOperator = 'and';
    
    for (const condition of conditions) {
      const conditionResult = this.evaluateSingleCondition(condition, context);
      
      if (currentLogicalOperator === 'and') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
      
      currentLogicalOperator = condition.logicalOperator || 'and';
    }
    
    return result;
  }

  /**
   * Evaluate single condition
   */
  private evaluateSingleCondition(condition: TemplateCondition, context: Record<string, any>): boolean {
    const fieldValue = context[condition.field];
    const { operator, value } = condition;
    
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Get default formatting for channel
   */
  private getDefaultFormatting(channel: string): TemplateFormatting {
    const defaults: Record<string, TemplateFormatting> = {
      web: {
        style: 'html',
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          background: '#f8fafc',
          text: '#1e293b'
        },
        typography: {
          titleSize: '16px',
          messageSize: '14px',
          fontWeight: 'normal'
        },
        layout: {
          alignment: 'left',
          spacing: 'normal'
        },
        icons: { enabled: true }
      },
      websocket: {
        style: 'plain',
        icons: { enabled: true }
      },
      telegram: {
        style: 'markdown',
        icons: { enabled: true }
      },
      email: {
        style: 'html',
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          background: '#ffffff',
          text: '#1e293b'
        },
        typography: {
          titleSize: '18px',
          messageSize: '14px',
          fontWeight: 'normal'
        },
        layout: {
          alignment: 'left',
          spacing: 'spacious'
        },
        icons: { enabled: true }
      }
    };

    return defaults[channel] || defaults.web;
  }

  /**
   * Clear rendered cache for specific template
   */
  private clearRenderedCache(templateId: string) {
    for (const [key, rendered] of this.renderedCache.entries()) {
      if (rendered.templateId === templateId) {
        this.renderedCache.delete(key);
      }
    }
  }

  /**
   * Start cache cleanup process
   */
  private startCacheCleanup() {
    setInterval(() => {
      // Clean up expired rendered cache entries
      const now = Date.now();
      for (const [key, rendered] of this.renderedCache.entries()) {
        if (now - new Date(rendered.renderedAt).getTime() > this.CACHE_TTL) {
          this.renderedCache.delete(key);
        }
      }
      
      // Limit cache sizes
      if (this.templateCache.size > this.MAX_CACHE_SIZE) {
        const entries = Array.from(this.templateCache.entries());
        const toDelete = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE / 10));
        toDelete.forEach(([key]) => this.templateCache.delete(key));
      }
      
      if (this.renderedCache.size > this.MAX_CACHE_SIZE) {
        const entries = Array.from(this.renderedCache.entries());
        const toDelete = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE / 10));
        toDelete.forEach(([key]) => this.renderedCache.delete(key));
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    console.log('🧹 Template cache cleanup scheduler started');
  }

  /**
   * Get template statistics
   */
  getTemplateStatistics(): {
    totalTemplates: number;
    activeTemplates: number;
    templatesByType: Record<string, number>;
    templatesByPriority: Record<string, number>;
    averageCustomizations: number;
    cacheHitRate: number;
  } {
    const templates = Array.from(this.templateCache.values());
    const totalTemplates = templates.length;
    const activeTemplates = templates.filter(t => t.active).length;
    
    const templatesByType = templates.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const templatesByPriority = templates.reduce((acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalCustomizations = templates.reduce((sum, t) => sum + t.customizations.length, 0);
    const averageCustomizations = totalTemplates > 0 ? totalCustomizations / totalTemplates : 0;
    
    return {
      totalTemplates,
      activeTemplates,
      templatesByType,
      templatesByPriority,
      averageCustomizations,
      cacheHitRate: 0 // Would need to track hits vs misses for accurate calculation
    };
  }
}

// Export singleton instance
export const notificationTemplateService = new NotificationTemplateService();