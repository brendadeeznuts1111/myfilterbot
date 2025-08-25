/**
 * YAML Formatter Utility
 * Provides consistent YAML formatting, validation, and normalization
 * Integrates with Bun's native YAML support and existing YamlConfigService
 */

import { logConfigError } from './error-logger';
import { yamlConfigService } from './yaml-config-service';

export interface YAMLFormatOptions {
  indent: number;
  lineWidth: number;
  preserveComments: boolean;
  sortKeys: boolean;
  flowLevel: number;
  quotingType: 'single' | 'double' | 'auto';
  forceQuotes: boolean;
  minimizeQuotes: boolean;
  condenseFlow: boolean;
  keepBlobsInDumps: boolean;
}

export interface YAMLValidationResult {
  valid: boolean;
  formatted?: string;
  errors: string[];
  warnings: string[];
  metrics: {
    lines: number;
    keys: number;
    complexObjects: number;
    arrayItems: number;
  };
}

export class YAMLFormatter {
  private static instance: YAMLFormatter;
  
  private defaultOptions: YAMLFormatOptions = {
    indent: 2,
    lineWidth: 120,
    preserveComments: true,
    sortKeys: false,
    flowLevel: -1,
    quotingType: 'auto',
    forceQuotes: false,
    minimizeQuotes: true,
    condenseFlow: false,
    keepBlobsInDumps: true
  };

  private constructor() {}

  public static getInstance(): YAMLFormatter {
    if (!YAMLFormatter.instance) {
      YAMLFormatter.instance = new YAMLFormatter();
    }
    return YAMLFormatter.instance;
  }

  /**
   * Format YAML content with consistent styling
   */
  async formatYAML(
    content: string, 
    options: Partial<YAMLFormatOptions> = {},
    filename?: string
  ): Promise<YAMLValidationResult> {
    const opts = { ...this.defaultOptions, ...options };
    const result: YAMLValidationResult = {
      valid: false,
      errors: [],
      warnings: [],
      metrics: {
        lines: 0,
        keys: 0,
        complexObjects: 0,
        arrayItems: 0
      }
    };

    try {
      const { YAML } = await import('bun');
      
      // First, validate that it's parseable YAML
      let parsed: any;
      try {
        parsed = YAML.parse(content);
      } catch (parseError: any) {
        result.errors.push(`YAML Parse Error: ${parseError.message}`);
        logConfigError(parseError, filename || 'unknown', 'validate');
        return result;
      }

      // Calculate metrics
      result.metrics = this.calculateMetrics(content, parsed);

      // Format the YAML with consistent styling
      const formatted = await this.formatContent(parsed, opts);
      
      // Validate the formatted result
      const validationResult = await this.validateFormatted(formatted, content, opts);
      
      result.valid = true;
      result.formatted = formatted;
      result.warnings = validationResult.warnings;

      return result;

    } catch (error: any) {
      result.errors.push(`Formatting Error: ${error.message}`);
      logConfigError(error, filename || 'unknown', 'load');
      return result;
    }
  }

  /**
   * Validate YAML and provide suggestions
   */
  async validateYAML(content: string, filename?: string): Promise<YAMLValidationResult> {
    const result: YAMLValidationResult = {
      valid: false,
      errors: [],
      warnings: [],
      metrics: {
        lines: 0,
        keys: 0,
        complexObjects: 0,
        arrayItems: 0
      }
    };

    try {
      const { YAML } = await import('bun');
      
      // Parse and validate
      const parsed = YAML.parse(content);
      result.metrics = this.calculateMetrics(content, parsed);
      
      // Structural validations
      const structuralWarnings = this.validateStructure(parsed, content);
      result.warnings.push(...structuralWarnings);

      // Format consistency checks
      const formatWarnings = this.checkFormatConsistency(content);
      result.warnings.push(...formatWarnings);

      // Security checks
      const securityWarnings = this.checkSecurity(parsed);
      result.warnings.push(...securityWarnings);

      result.valid = true;

    } catch (error: any) {
      result.errors.push(`Validation Error: ${error.message}`);
      logConfigError(error, filename || 'unknown', 'validate');
    }

    return result;
  }

  /**
   * Normalize YAML for consistent formatting
   */
  async normalizeYAML(content: string, filename?: string): Promise<string> {
    try {
      const formatResult = await this.formatYAML(content, {
        indent: 2,
        sortKeys: false,
        preserveComments: true,
        minimizeQuotes: true
      }, filename);

      if (!formatResult.valid || !formatResult.formatted) {
        throw new Error(`Failed to normalize: ${formatResult.errors.join(', ')}`);
      }

      return formatResult.formatted;

    } catch (error: any) {
      logConfigError(error, filename || 'unknown', 'load');
      throw error;
    }
  }

  /**
   * Format content with specific styling rules
   */
  private async formatContent(data: any, options: YAMLFormatOptions): Promise<string> {
    const { YAML } = await import('bun');

    // Custom YAML stringify options for Bun
    const formatted = YAML.stringify(data, {
      indent: options.indent,
      lineWidth: options.lineWidth,
      minAliasCount: options.flowLevel,
      sortKeys: options.sortKeys,
      forceQuotes: options.forceQuotes
    });

    // Post-process formatting
    return this.postProcessFormat(formatted, options);
  }

  /**
   * Post-process formatted YAML for consistency
   */
  private postProcessFormat(content: string, options: YAMLFormatOptions): string {
    let lines = content.split('\n');

    // Ensure proper spacing after comments
    lines = lines.map(line => {
      if (line.trim().startsWith('#') && line.includes(':')) {
        return line.replace(/#(.+)/, '# $1');
      }
      return line;
    });

    // Ensure blank lines between top-level sections
    const processedLines: string[] = [];
    let previousWasEmpty = false;
    let inTopLevel = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const nextLine = lines[i + 1];
      
      // Skip multiple consecutive empty lines
      if (trimmed === '') {
        if (!previousWasEmpty) {
          processedLines.push(line);
        }
        previousWasEmpty = true;
        continue;
      }

      previousWasEmpty = false;

      // Add spacing between top-level sections
      if (!line.startsWith(' ') && !trimmed.startsWith('#') && processedLines.length > 0) {
        const lastLine = processedLines[processedLines.length - 1];
        if (lastLine.trim() !== '') {
          processedLines.push('');
        }
      }

      processedLines.push(line);
    }

    // Clean up trailing whitespace and ensure file ends with newline
    const result = processedLines
      .map(line => line.trimEnd())
      .join('\n')
      .trimEnd() + '\n';

    return result;
  }

  /**
   * Calculate YAML metrics
   */
  private calculateMetrics(content: string, parsed: any): YAMLValidationResult['metrics'] {
    const lines = content.split('\n').length;
    
    const countStructure = (obj: any): { keys: number; complexObjects: number; arrayItems: number } => {
      let keys = 0;
      let complexObjects = 0;
      let arrayItems = 0;

      if (Array.isArray(obj)) {
        arrayItems += obj.length;
        for (const item of obj) {
          if (typeof item === 'object' && item !== null) {
            complexObjects++;
            const subCounts = countStructure(item);
            keys += subCounts.keys;
            complexObjects += subCounts.complexObjects;
            arrayItems += subCounts.arrayItems;
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        const objKeys = Object.keys(obj);
        keys += objKeys.length;
        complexObjects++;

        for (const key of objKeys) {
          const subCounts = countStructure(obj[key]);
          keys += subCounts.keys;
          complexObjects += subCounts.complexObjects;
          arrayItems += subCounts.arrayItems;
        }
      }

      return { keys, complexObjects, arrayItems };
    };

    const structure = countStructure(parsed);

    return {
      lines,
      keys: structure.keys,
      complexObjects: structure.complexObjects,
      arrayItems: structure.arrayItems
    };
  }

  /**
   * Validate structure and provide warnings
   */
  private validateStructure(parsed: any, content: string): string[] {
    const warnings: string[] = [];

    // Check for deeply nested structures
    const maxDepth = this.getMaxDepth(parsed);
    if (maxDepth > 6) {
      warnings.push(`Configuration is deeply nested (depth: ${maxDepth}). Consider flattening for readability.`);
    }

    // Check for very long lines
    const lines = content.split('\n');
    const longLines = lines
      .map((line, index) => ({ line: line.trimEnd(), number: index + 1 }))
      .filter(({ line }) => line.length > 120);
    
    if (longLines.length > 0) {
      warnings.push(`Found ${longLines.length} lines longer than 120 characters. Consider breaking them up.`);
    }

    // Check for inconsistent indentation (align with project's 2-space standard)
    const indentations = lines
      .filter(line => line.trim() && !line.trim().startsWith('#'))
      .map(line => line.match(/^(\s*)/)?.[1].length || 0)
      .filter(indent => indent > 0);

    const uniqueIndents = [...new Set(indentations)];
    if (uniqueIndents.length > 1) {
      const hasInconsistentSpacing = uniqueIndents.some((indent, i) => {
        return uniqueIndents.some((otherIndent, j) => {
          return i !== j && indent % 2 !== otherIndent % 2;
        });
      });

      if (hasInconsistentSpacing) {
        warnings.push('Inconsistent indentation detected. Use 2 spaces consistently.');
      }
    }

    // Validate project-specific structure patterns
    const structuralWarnings = this.validateProjectStructure(parsed, content);
    warnings.push(...structuralWarnings);

    return warnings;
  }

  /**
   * Validate project-specific YAML structure patterns
   */
  private validateProjectStructure(parsed: any, content: string): string[] {
    const warnings: string[] = [];

    // Check for required environment variable patterns
    if (typeof parsed === 'object' && parsed !== null) {
      const envVarPattern = /\$\{[^}]+\}/g;
      const contentStr = JSON.stringify(parsed);
      const envVars = contentStr.match(envVarPattern) || [];
      
      // Check for environment variables without defaults in production configs
      const requiredEnvVars = envVars.filter(envVar => !envVar.includes(':-'));
      if (requiredEnvVars.length > 0 && content.includes('production')) {
        warnings.push(`Found ${requiredEnvVars.length} required environment variables without defaults. Consider adding defaults for development.`);
      }
    }

    // Validate feature flag structure (if it's features.yaml)
    if (parsed.features) {
      const featureWarnings = this.validateFeatureFlags(parsed.features);
      warnings.push(...featureWarnings);
    }

    // Validate agent structure (if it's agents.yaml/yml)
    if (parsed.agents) {
      const agentWarnings = this.validateAgentStructure(parsed.agents);
      warnings.push(...agentWarnings);
    }

    // Validate server configuration structure
    if (parsed.server) {
      const serverWarnings = this.validateServerConfig(parsed.server);
      warnings.push(...serverWarnings);
    }

    return warnings;
  }

  /**
   * Validate feature flag structure
   */
  private validateFeatureFlags(features: any): string[] {
    const warnings: string[] = [];

    for (const [featureName, config] of Object.entries(features)) {
      if (typeof config === 'object' && config !== null) {
        const featureConfig = config as any;
        
        // Check required properties
        if (featureConfig.enabled === undefined) {
          warnings.push(`Feature '${featureName}' missing required 'enabled' property.`);
        }
        
        if (featureConfig.rolloutPercentage === undefined) {
          warnings.push(`Feature '${featureName}' missing 'rolloutPercentage' property.`);
        } else if (featureConfig.rolloutPercentage < 0 || featureConfig.rolloutPercentage > 100) {
          warnings.push(`Feature '${featureName}' has invalid rolloutPercentage (${featureConfig.rolloutPercentage}). Must be 0-100.`);
        }

        // Check description
        if (!featureConfig.description) {
          warnings.push(`Feature '${featureName}' missing description. Add description for documentation.`);
        }
      }
    }

    return warnings;
  }

  /**
   * Validate agent configuration structure
   */
  private validateAgentStructure(agents: any): string[] {
    const warnings: string[] = [];

    if (agents.list && Array.isArray(agents.list)) {
      for (const agent of agents.list) {
        if (!agent.id) {
          warnings.push('Agent missing required "id" field.');
        }
        if (!agent.name) {
          warnings.push(`Agent ${agent.id || '(unknown)'} missing "name" field.`);
        }
        if (!agent.status) {
          warnings.push(`Agent ${agent.id || '(unknown)'} missing "status" field.`);
        }
        if (agent.commission_rate !== undefined) {
          if (agent.commission_rate < 0 || agent.commission_rate > 1) {
            warnings.push(`Agent ${agent.id} has invalid commission_rate (${agent.commission_rate}). Must be 0-1.`);
          }
        }
      }
    }

    return warnings;
  }

  /**
   * Validate server configuration structure
   */
  private validateServerConfig(server: any): string[] {
    const warnings: string[] = [];

    // Check for standard server sections
    const expectedSections = ['bot', 'admin', 'api', 'websocket'];
    for (const section of expectedSections) {
      if (server[section]) {
        const sectionConfig = server[section];
        if (!sectionConfig.port) {
          warnings.push(`Server section '${section}' missing port configuration.`);
        }
        if (!sectionConfig.host) {
          warnings.push(`Server section '${section}' missing host configuration. Consider adding default.`);
        }
      }
    }

    return warnings;
  }

  /**
   * Check format consistency
   */
  private checkFormatConsistency(content: string): string[] {
    const warnings: string[] = [];
    const lines = content.split('\n');

    // Check for inconsistent comment styles
    const commentLines = lines.filter(line => line.trim().startsWith('#'));
    const hasSpaceAfterHash = commentLines.some(line => line.match(/#\s/));
    const noSpaceAfterHash = commentLines.some(line => line.match(/#[^\s]/));

    if (hasSpaceAfterHash && noSpaceAfterHash) {
      warnings.push('Inconsistent comment formatting. Use "# " consistently.');
    }

    // Check for trailing spaces
    const trailingSpaceLines = lines
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) => line !== line.trimEnd());

    if (trailingSpaceLines.length > 0) {
      warnings.push(`Found ${trailingSpaceLines.length} lines with trailing whitespace.`);
    }

    // Check for tabs instead of spaces
    const tabLines = lines
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) => line.includes('\t'));

    if (tabLines.length > 0) {
      warnings.push(`Found ${tabLines.length} lines using tabs instead of spaces for indentation.`);
    }

    return warnings;
  }

  /**
   * Check for potential security issues
   */
  private checkSecurity(parsed: any): string[] {
    const warnings: string[] = [];

    // Check for potentially exposed secrets
    const checkForSecrets = (obj: any, path: string = ''): void => {
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'string') {
            // Check for potential secrets that aren't using environment variables
            const secretKeywords = ['password', 'secret', 'key', 'token', 'api_key', 'private'];
            const isSecretKey = secretKeywords.some(keyword => key.toLowerCase().includes(keyword));
            
            if (isSecretKey && !value.startsWith('${') && value.length > 8) {
              warnings.push(`Potential hardcoded secret at ${currentPath}. Consider using environment variables.`);
            }

            // Check for suspicious patterns
            if (value.match(/^[A-Za-z0-9+/]{20,}={0,2}$/)) {
              warnings.push(`Potential base64 encoded secret at ${currentPath}.`);
            }
          }
          
          if (typeof value === 'object') {
            checkForSecrets(value, currentPath);
          }
        }
      }
    };

    checkForSecrets(parsed);
    return warnings;
  }

  /**
   * Get maximum nesting depth
   */
  private getMaxDepth(obj: any, currentDepth: number = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    let maxDepth = currentDepth;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        maxDepth = Math.max(maxDepth, this.getMaxDepth(item, currentDepth + 1));
      }
    } else {
      for (const value of Object.values(obj)) {
        maxDepth = Math.max(maxDepth, this.getMaxDepth(value, currentDepth + 1));
      }
    }

    return maxDepth;
  }

  /**
   * Validate that formatted YAML matches original intent
   */
  private async validateFormatted(
    formatted: string, 
    original: string, 
    options: YAMLFormatOptions
  ): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];

    try {
      const { YAML } = await import('bun');
      
      const originalParsed = YAML.parse(original);
      const formattedParsed = YAML.parse(formatted);

      // Deep equality check
      if (!this.deepEqual(originalParsed, formattedParsed)) {
        warnings.push('Formatted YAML data differs from original. Manual review recommended.');
      }

    } catch (error: any) {
      warnings.push(`Validation error: ${error.message}`);
    }

    return { warnings };
  }

  /**
   * Deep equality check for objects
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      return a.every((item, index) => this.deepEqual(item, b[index]));
    }

    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => this.deepEqual(a[key], b[key]));
    }

    return false;
  }
}

// Export singleton instance and convenience functions
export const yamlFormatter = YAMLFormatter.getInstance();

export async function formatYAML(content: string, options?: Partial<YAMLFormatOptions>, filename?: string) {
  return yamlFormatter.formatYAML(content, options, filename);
}

export async function validateYAML(content: string, filename?: string) {
  return yamlFormatter.validateYAML(content, filename);
}

export async function normalizeYAML(content: string, filename?: string) {
  return yamlFormatter.normalizeYAML(content, filename);
}

export default yamlFormatter;