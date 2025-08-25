#!/usr/bin/env bun

/**
 * Quick YAML Configuration Validator
 * 
 * Usage:
 *   bun scripts/validate-config.ts
 *   bun scripts/validate-config.ts config/agents.yml
 *   bun scripts/validate-config.ts --verbose
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { YAML } from "bun";

const CONFIG_DIR = join(import.meta.dir, "../config");

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class ConfigValidator {
  private results: ValidationResult[] = [];
  private verbose = false;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  validateFile(filename: string): ValidationResult {
    const result: ValidationResult = {
      file: filename,
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      const path = join(CONFIG_DIR, filename);
      
      if (!existsSync(path)) {
        result.valid = false;
        result.errors.push("File does not exist");
        return result;
      }

      const content = readFileSync(path, "utf8");
      
      // Basic YAML syntax validation
      try {
        const parsed = YAML.parse(content);
        if (!parsed) {
          result.warnings.push("YAML parsed but content is empty");
        }
      } catch (error) {
        result.valid = false;
        result.errors.push(`YAML syntax error: ${error}`);
        return result;
      }

      // File-specific validations
      if (filename === "agents.yml") {
        this.validateAgentsConfig(content, result);
      } else if (filename.includes("telegram")) {
        this.validateTelegramConfig(content, result);
      } else if (filename.includes("database")) {
        this.validateDatabaseConfig(content, result);
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(`Validation error: ${error}`);
    }

    return result;
  }

  private validateAgentsConfig(content: string, result: ValidationResult): void {
    try {
      const config = YAML.parse(content);
      
      if (!config.agents?.list) {
        result.errors.push("Missing agents.list array");
        result.valid = false;
      }
      
      if (!config.masters?.list) {
        result.errors.push("Missing masters.list array");
        result.valid = false;
      }
      
      if (!config.commission) {
        result.errors.push("Missing commission configuration");
        result.valid = false;
      }

      // Validate agent structure
      if (config.agents?.list) {
        config.agents.list.forEach((agent: Record<string, unknown>, index: number) => {
          if (!agent.id) result.errors.push(`Agent ${index} missing id`);
          if (!agent.name) result.errors.push(`Agent ${index} missing name`);
          if (!agent.code) result.errors.push(`Agent ${index} missing code`);
          if (!agent.master) result.errors.push(`Agent ${index} missing master reference`);
          if (typeof agent.commission_rate !== 'number') {
            result.errors.push(`Agent ${index} commission_rate must be a number`);
          }
          if (!Array.isArray(agent.customers)) {
            result.errors.push(`Agent ${index} customers must be an array`);
          }
        });
      }

      // Check for duplicate agent IDs
      if (config.agents?.list) {
        const ids = config.agents.list.map((a: Record<string, unknown>) => a.id);
        const uniqueIds = new Set(ids);
        if (uniqueIds.size !== ids.length) {
          result.errors.push("Duplicate agent IDs found");
        }
      }

      if (result.errors.length > 0) {
        result.valid = false;
      }

    } catch (error) {
      result.errors.push(`Agent config validation failed: ${error}`);
      result.valid = false;
    }
  }

  private validateTelegramConfig(content: string, result: ValidationResult): void {
    try {
      const config = YAML.parse(content);
      
      // Check for bot token in different structures
      const hasToken = config.telegram?.botToken || config.telegram?.bot?.token;
      if (!hasToken) {
        result.errors.push("Missing telegram bot token (botToken or bot.token)");
        result.valid = false;
      }
      
      // Optional validations (warnings only)
      if (config.telegram?.vipThreshold && typeof config.telegram.vipThreshold !== 'number') {
        result.warnings.push("vipThreshold should be a number");
      }
      
      if (config.telegram && !config.telegram.fraudChecks && !config.telegram.fraud) {
        result.warnings.push("Missing fraud detection configuration");
      }

    } catch (error) {
      result.errors.push(`Telegram config validation failed: ${error}`);
      result.valid = false;
    }
  }

  private validateDatabaseConfig(content: string, result: ValidationResult): void {
    try {
      const config = YAML.parse(content);
      
      if (!config.connections?.postgres) {
        result.errors.push("Missing postgres connection configuration");
        result.valid = false;
      }
      
      if (config.connections?.postgres) {
        const postgres = config.connections.postgres;
        if (!postgres.host) result.errors.push("Missing postgres host");
        if (!postgres.database) result.errors.push("Missing postgres database name");
        if (!postgres.username) result.errors.push("Missing postgres username");
      }

      // Validate environment variable format - allow both uppercase and numbers
      const envVarRegex = /\$\{([A-Z][A-Z0-9_]*)(:-[^}]*)?\}/g;
      const allEnvVars = content.match(/\$\{[^}]*\}/g) || [];
      const invalidMatches = allEnvVars.filter(match => !envVarRegex.test(match));
      
      if (invalidMatches.length > 0) {
        result.warnings.push(`Environment variables with non-standard format: ${invalidMatches.slice(0, 3).join(', ')}${invalidMatches.length > 3 ? ` (+${invalidMatches.length - 3} more)` : ''}`);
      }

    } catch (error) {
      result.errors.push(`Database config validation failed: ${error}`);
      result.valid = false;
    }
  }

  validateAll(): ValidationResult[] {
    const yamlFiles = readdirSync(CONFIG_DIR).filter(
      f => f.endsWith('.yml') || f.endsWith('.yaml')
    );

    this.results = yamlFiles.map(file => this.validateFile(file));
    return this.results;
  }

  printResults(): void {
    const totalFiles = this.results.length;
    const validFiles = this.results.filter(r => r.valid).length;
    const invalidFiles = totalFiles - validFiles;

    console.log(`\n🔍 YAML Configuration Validation Results`);
    console.log(`${'='.repeat(50)}`);
    
    if (invalidFiles === 0) {
      console.log(`✅ All ${totalFiles} configuration files are valid!`);
    } else {
      console.log(`❌ ${invalidFiles}/${totalFiles} files have issues`);
    }

    console.log();

    this.results.forEach(result => {
      const status = result.valid ? '✅' : '❌';
      console.log(`${status} ${result.file}`);
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`   🚫 ${error}`);
        });
      }
      
      if (this.verbose && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          console.log(`   ⚠️  ${warning}`);
        });
      }
    });

    if (!this.verbose && this.results.some(r => r.warnings.length > 0)) {
      console.log(`\n💡 Use --verbose to see warnings`);
    }

    console.log();
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const specificFile = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));
  
  const validator = new ConfigValidator(verbose);

  if (specificFile) {
    console.log(`🔍 Validating ${specificFile}...`);
    const result = validator.validateFile(specificFile);
    validator.results = [result];
    validator.printResults();
    
    // Exit with error code if validation failed
    process.exit(result.valid ? 0 : 1);
  } else {
    console.log('🔍 Validating all YAML configuration files...');
    validator.validateAll();
    validator.printResults();
    
    // Exit with error code if any validation failed
    const hasErrors = validator.results.some(r => !r.valid);
    process.exit(hasErrors ? 1 : 0);
  }
}

if (import.meta.main) {
  main();
}