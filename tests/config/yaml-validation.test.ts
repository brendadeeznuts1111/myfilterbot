import { describe, test, expect, beforeAll } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { YAML } from "bun";

const CONFIG_DIR = join(import.meta.dir, "../../config");

interface Agent {
  id: string;
  name: string;
  code: string;
  master: string;
  status: 'active' | 'inactive' | 'suspended';
  joined: string;
  telegram_id: number;
  customers: number[];
  commission_rate: number;
  balance: number;
  total_earned: number;
}

interface Master {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  joined: string;
  telegram_id: number;
  agents: string[];
  commission_rate: number;
  balance: number;
  total_earned: number;
}

interface AgentsConfig {
  agents: {
    list: Agent[];
  };
  masters: {
    list: Master[];
  };
  commission: {
    base_rates: {
      agent: number;
      master: number;
      master_override: number;
    };
    performance_tiers: {
      bronze: { monthly_target: number; agent_bonus: number; master_bonus: number; };
      silver: { monthly_target: number; agent_bonus: number; master_bonus: number; };
      gold: { monthly_target: number; agent_bonus: number; master_bonus: number; };
      platinum: { monthly_target: number; agent_bonus: number; master_bonus: number; };
    };
    bonuses: {
      new_customer: number;
      vip_customer: number;
      retention_bonus: number;
      volume_bonus: {
        tier1: { min: number; bonus: number; };
        tier2: { min: number; bonus: number; };
        tier3: { min: number; bonus: number; };
      };
    };
  };
}

interface TelegramConfig {
  telegram: {
    botToken: string;
    cashierBotToken?: string;
    personal?: {
      apiId?: string;
      apiHash?: string;
      phone?: string;
      password?: string;
    };
    vipThreshold: number;
    vipBenefits: {
      rebate: number;
      priority_support: boolean;
      exclusive_groups: boolean;
      higher_limits: boolean;
    };
    fraudScoreLimit: number;
    fraudChecks: {
      duplicate_accounts: boolean;
      velocity_check: boolean;
      pattern_analysis: boolean;
      blacklist_check: boolean;
    };
  };
}

interface DatabaseConfig {
  connections: {
    postgres: {
      type: string;
      host: string;
      port: number | string;
      database: string;
      username: string;
      password?: string;
      schema: string;
      pool: {
        min: number | string;
        max: number | string;
        acquireTimeout: number;
        idleTimeout: number;
        connectionTimeout: number;
        evictionRunInterval: number;
      };
    };
    redis?: {
      type: string;
      host: string;
      port: number | string;
      password?: string;
      db: number | string;
    };
    clickhouse?: {
      type: string;
      host: string;
      port: number | string;
      database: string;
      username?: string;
      password?: string;
    };
  };
}

describe("YAML Configuration Validation", () => {
  let yamlFiles: string[];
  let configCache: Map<string, any> = new Map();

  beforeAll(() => {
    // Get all YAML files in config directory
    yamlFiles = readdirSync(CONFIG_DIR).filter(
      (f) => f.endsWith(".yml") || f.endsWith(".yaml")
    );
    
    // Pre-load all configs for cross-reference validation
    yamlFiles.forEach(file => {
      try {
        const path = join(CONFIG_DIR, file);
        const content = readFileSync(path, "utf8");
        const parsed = YAML.parse(content);
        configCache.set(file, parsed);
      } catch (error) {
        console.warn(`Failed to pre-load ${file}:`, error);
      }
    });
  });

  describe("Syntax Validation", () => {
    test("All YAML files have valid syntax", () => {
      yamlFiles.forEach((file) => {
        const path = join(CONFIG_DIR, file);
        const content = readFileSync(path, "utf8");
        
        expect(() => {
          const parsed = YAML.parse(content);
          expect(parsed).toBeDefined();
        }).not.toThrow();
      });
    });

    test("All critical config files exist", () => {
      const criticalFiles = [
        "agents.yml",
        "telegram.yml", 
        "database.yaml",
        "dashboard.yaml"
      ];
      
      criticalFiles.forEach(file => {
        const path = join(CONFIG_DIR, file);
        expect(existsSync(path)).toBe(true);
      });
    });
  });

  describe("Agent Configuration", () => {
    test("agents.yml has valid structure", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      expect(config).toBeDefined();
      
      // Check main structure
      expect(config.agents).toBeDefined();
      expect(config.masters).toBeDefined();
      expect(config.commission).toBeDefined();
      
      // Check agents list
      expect(Array.isArray(config.agents.list)).toBe(true);
      expect(config.agents.list.length).toBeGreaterThan(0);
      
      // Check masters list  
      expect(Array.isArray(config.masters.list)).toBe(true);
      expect(config.masters.list.length).toBeGreaterThan(0);
    });

    test("All agents have required fields", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      
      config.agents.list.forEach((agent, index) => {
        expect(agent.id, `Agent ${index} missing id`).toBeDefined();
        expect(agent.name, `Agent ${index} missing name`).toBeDefined();
        expect(agent.code, `Agent ${index} missing code`).toBeDefined();
        expect(agent.master, `Agent ${index} missing master`).toBeDefined();
        expect(agent.status, `Agent ${index} missing status`).toBeDefined();
        expect(agent.telegram_id, `Agent ${index} missing telegram_id`).toBeDefined();
        expect(Array.isArray(agent.customers), `Agent ${index} customers not array`).toBe(true);
        expect(typeof agent.commission_rate, `Agent ${index} commission_rate not number`).toBe('number');
      });
    });

    test("Agent IDs are unique", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      const ids = config.agents.list.map(agent => agent.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    test("Agent status values are valid", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      const validStatuses = ['active', 'inactive', 'suspended'];
      
      config.agents.list.forEach(agent => {
        expect(validStatuses).toContain(agent.status);
      });
    });

    test("Agent commission rates are valid", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      
      config.agents.list.forEach(agent => {
        expect(agent.commission_rate).toBeGreaterThan(0);
        expect(agent.commission_rate).toBeLessThan(1);
      });
    });

    test("All masters have required fields", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      
      config.masters.list.forEach((master, index) => {
        expect(master.id, `Master ${index} missing id`).toBeDefined();
        expect(master.name, `Master ${index} missing name`).toBeDefined();
        expect(master.code, `Master ${index} missing code`).toBeDefined();
        expect(master.status, `Master ${index} missing status`).toBeDefined();
        expect(master.telegram_id, `Master ${index} missing telegram_id`).toBeDefined();
        expect(Array.isArray(master.agents), `Master ${index} agents not array`).toBe(true);
        expect(typeof master.commission_rate, `Master ${index} commission_rate not number`).toBe('number');
      });
    });

    test("Commission configuration is valid", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      
      // Validate base rates
      expect(config.commission.base_rates.agent).toBeGreaterThan(0);
      expect(config.commission.base_rates.agent).toBeLessThan(1);
      expect(config.commission.base_rates.master).toBeGreaterThan(0);
      expect(config.commission.base_rates.master).toBeLessThan(1);
      expect(config.commission.base_rates.master_override).toBeGreaterThan(0);
      expect(config.commission.base_rates.master_override).toBeLessThan(1);
      
      // Validate performance tiers
      const tiers = ['bronze', 'silver', 'gold', 'platinum'] as const;
      tiers.forEach(tier => {
        const tierConfig = config.commission.performance_tiers[tier];
        expect(tierConfig.monthly_target).toBeGreaterThan(0);
        expect(tierConfig.agent_bonus).toBeGreaterThanOrEqual(0);
        expect(tierConfig.master_bonus).toBeGreaterThanOrEqual(0);
      });
      
      // Validate bonuses
      expect(config.commission.bonuses.new_customer).toBeGreaterThan(0);
      expect(config.commission.bonuses.vip_customer).toBeGreaterThan(0);
      expect(config.commission.bonuses.retention_bonus).toBeGreaterThanOrEqual(0);
      expect(config.commission.bonuses.retention_bonus).toBeLessThan(1);
    });
  });

  describe("Telegram Configuration", () => {
    test("telegram.yml has valid structure", () => {
      const config = configCache.get("telegram.yml") as TelegramConfig;
      expect(config).toBeDefined();
      expect(config.telegram).toBeDefined();
    });

    test("Bot token is configured", () => {
      const config = configCache.get("telegram.yml") as TelegramConfig;
      
      expect(config.telegram.botToken).toBeDefined();
      expect(typeof config.telegram.botToken).toBe('string');
      expect(config.telegram.botToken.length).toBeGreaterThan(0);
    });

    test("VIP configuration is valid", () => {
      const config = configCache.get("telegram.yml") as TelegramConfig;
      
      expect(typeof config.telegram.vipThreshold).toBe('number');
      expect(config.telegram.vipThreshold).toBeGreaterThan(0);
      
      expect(config.telegram.vipBenefits).toBeDefined();
      expect(typeof config.telegram.vipBenefits.rebate).toBe('number');
      expect(config.telegram.vipBenefits.rebate).toBeGreaterThanOrEqual(0);
      expect(config.telegram.vipBenefits.rebate).toBeLessThan(1);
    });

    test("Fraud detection is configured", () => {
      const config = configCache.get("telegram.yml") as TelegramConfig;
      
      expect(typeof config.telegram.fraudScoreLimit).toBe('number');
      expect(config.telegram.fraudScoreLimit).toBeGreaterThan(0);
      expect(config.telegram.fraudScoreLimit).toBeLessThanOrEqual(100);
      
      expect(config.telegram.fraudChecks).toBeDefined();
      expect(typeof config.telegram.fraudChecks.duplicate_accounts).toBe('boolean');
      expect(typeof config.telegram.fraudChecks.velocity_check).toBe('boolean');
    });
  });

  describe("Database Configuration", () => {
    test("database.yaml has valid structure", () => {
      const config = configCache.get("database.yaml") as DatabaseConfig;
      expect(config).toBeDefined();
      expect(config.connections).toBeDefined();
      expect(config.connections.postgres).toBeDefined();
    });

    test("PostgreSQL configuration is valid", () => {
      const config = configCache.get("database.yaml") as DatabaseConfig;
      const postgres = config.connections.postgres;
      
      expect(postgres.type).toBe('postgres');
      expect(postgres.host).toBeDefined();
      expect(postgres.database).toBeDefined();
      expect(postgres.username).toBeDefined();
      expect(postgres.schema).toBeDefined();
      
      // Pool configuration
      expect(postgres.pool).toBeDefined();
      expect(postgres.pool.acquireTimeout).toBeGreaterThan(0);
      expect(postgres.pool.idleTimeout).toBeGreaterThan(0);
    });

    test("Environment variable placeholders are valid format", () => {
      const config = configCache.get("database.yaml") as DatabaseConfig;
      const yamlContent = readFileSync(join(CONFIG_DIR, "database.yaml"), "utf8");
      
      // Check for valid env var format: ${VAR_NAME:-default}
      const envVarRegex = /\$\{([A-Z_][A-Z0-9_]*)(:-[^}]*)?\}/g;
      const matches = yamlContent.match(envVarRegex);
      
      if (matches) {
        matches.forEach(match => {
          expect(match).toMatch(/^\$\{[A-Z_][A-Z0-9_]*(:-[^}]*)?\}$/);
        });
      }
    });
  });

  describe("Cross-Reference Validation", () => {
    test("Agents reference valid masters", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      
      const masterIds = new Set(config.masters.list.map(m => m.id));
      
      config.agents.list.forEach(agent => {
        expect(masterIds.has(agent.master), 
          `Agent ${agent.id} references invalid master ${agent.master}`
        ).toBe(true);
      });
    });

    test("Masters list their agents correctly", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      
      // Build actual agent->master mapping
      const agentToMaster = new Map<string, string>();
      config.agents.list.forEach(agent => {
        agentToMaster.set(agent.id, agent.master);
      });
      
      // Verify each master's agent list is accurate
      config.masters.list.forEach(master => {
        master.agents.forEach(agentId => {
          expect(agentToMaster.get(agentId), 
            `Master ${master.id} lists agent ${agentId} but agent doesn't reference this master`
          ).toBe(master.id);
        });
      });
    });

    test("Telegram IDs are unique across agents and masters", () => {
      const _config = configCache.get("agents.yml") as AgentsConfig;
      
      const allTelegramIds = [
        ..._config.agents.list.map(a => a.telegram_id),
        ..._config.masters.list.map(m => m.telegram_id)
      ];
      
      const uniqueIds = new Set(allTelegramIds);
      expect(uniqueIds.size).toBe(allTelegramIds.length);
    });

    test("Agent codes are unique", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      
      const codes = config.agents.list.map(agent => agent.code);
      const uniqueCodes = new Set(codes);
      
      expect(uniqueCodes.size).toBe(codes.length);
    });

    test("Master codes are unique", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      
      const codes = config.masters.list.map(master => master.code);
      const uniqueCodes = new Set(codes);
      
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe("Data Integrity", () => {
    test("Customer assignments don't overlap between agents", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      
      const allCustomers = new Set<number>();
      const duplicates: number[] = [];
      
      config.agents.list.forEach(agent => {
        agent.customers.forEach(customerId => {
          if (allCustomers.has(customerId)) {
            duplicates.push(customerId);
          } else {
            allCustomers.add(customerId);
          }
        });
      });
      
      expect(duplicates).toHaveLength(0);
    });

    test("Customer IDs are positive integers", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      
      config.agents.list.forEach(agent => {
        agent.customers.forEach(customerId => {
          expect(Number.isInteger(customerId)).toBe(true);
          expect(customerId).toBeGreaterThan(0);
        });
      });
    });

    test("Financial amounts are valid", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      
      [...config.agents.list, ...config.masters.list].forEach(entity => {
        expect(entity.balance).toBeGreaterThanOrEqual(0);
        expect(entity.total_earned).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(entity.balance)).toBe(true);
        expect(Number.isFinite(entity.total_earned)).toBe(true);
      });
    });

    test("Date formats are valid", () => {
      const config = configCache.get("agents.yml") as AgentsConfig;
      
      [...config.agents.list, ...config.masters.list].forEach(entity => {
        expect(() => {
          const date = new Date(entity.joined);
          expect(date.getTime()).not.toBeNaN();
        }).not.toThrow();
      });
    });
  });
});