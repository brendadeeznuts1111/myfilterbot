#!/usr/bin/env bun

/**
 * Customer-Agent Integration Test
 * 
 * Tests the integration between customer data and agent configuration
 * to ensure data consistency and proper relationships.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { YAML } from "bun";

const CONFIG_DIR = join(import.meta.dir, "../config");
const ROOT_DIR = join(import.meta.dir, "..");

interface CustomerData {
  id: string;
  [key: string]: unknown;
}

interface AgentData {
  id: string;
  name: string;
  code: string;
  customers?: number[];
  commission_rate?: number;
  master?: string;
}

interface AgentsConfigData {
  agents?: {
    list?: AgentData[];
  };
  masters?: {
    list?: Array<{
      id: string;
      name?: string;
    }>;
  };
}

class IntegrationTester {
  private customers: CustomerData[] = [];
  private agentsConfig: AgentsConfigData | null = null;
  
  async loadData() {
    console.log('📊 Loading customer and agent data...');
    
    // Load customer data
    try {
      const configPath = join(ROOT_DIR, "customer_config.json");
      
      if (existsSync(configPath)) {
        const configData = JSON.parse(readFileSync(configPath, "utf8"));
        if (configData.customers) {
          this.customers = Object.keys(configData.customers).map(id => ({
            id,
            ...configData.customers[id]
          }));
        }
      }
      
      console.log(`✅ Loaded ${this.customers.length} customers`);
    } catch (error) {
      console.log(`⚠️ Could not load customer data: ${error}`);
    }
    
    // Load agents configuration
    try {
      const agentsPath = join(CONFIG_DIR, "agents.yml");
      if (existsSync(agentsPath)) {
        const content = readFileSync(agentsPath, "utf8");
        this.agentsConfig = YAML.parse(content);
      }
      
      const agentCount = this.agentsConfig?.agents?.list?.length || 0;
      const masterCount = this.agentsConfig?.masters?.list?.length || 0;
      console.log(`✅ Loaded ${agentCount} agents and ${masterCount} masters`);
    } catch (error) {
      console.log(`❌ Could not load agent config: ${error}`);
    }
  }
  
  testCustomerAgentRelationships() {
    console.log('\n🔗 Testing customer-agent relationships...');
    
    if (!this.agentsConfig?.agents?.list) {
      console.log('❌ No agent data available for testing');
      return false;
    }
    
    let totalAssigned = 0;
    let totalUnassigned = 0;
    const agentCustomerCounts = new Map<string, number>();
    
    // Count customers per agent from config
    this.agentsConfig.agents.list.forEach((agent: AgentData) => {
      const customerCount = agent.customers?.length || 0;
      agentCustomerCounts.set(agent.id, customerCount);
      totalAssigned += customerCount;
    });
    
    totalUnassigned = this.customers.length - totalAssigned;
    
    console.log(`\n📈 Customer Distribution:`);
    console.log(`   Total Customers: ${this.customers.length}`);
    console.log(`   Assigned to Agents: ${totalAssigned}`);
    console.log(`   Unassigned: ${totalUnassigned}`);
    
    // Show agent breakdown
    console.log(`\n👥 Agent Breakdown:`);
    this.agentsConfig.agents.list.forEach((agent: AgentData) => {
      const count = agentCustomerCounts.get(agent.id) || 0;
      const percentage = this.customers.length > 0 ? ((count / this.customers.length) * 100).toFixed(1) : '0.0';
      console.log(`   ${agent.code} (${agent.name}): ${count} customers (${percentage}%)`);
    });
    
    return totalAssigned > 0;
  }
  
  testDataIntegrity() {
    console.log('\n🔍 Testing data integrity...');
    let issues = 0;
    
    if (!this.agentsConfig?.agents?.list) {
      console.log('❌ No agent data for integrity testing');
      return false;
    }
    
    // Test 1: Check for duplicate customer assignments
    const allAssignedCustomers = new Set<number>();
    const duplicates: number[] = [];
    
    this.agentsConfig.agents.list.forEach((agent: AgentData) => {
      if (agent.customers && Array.isArray(agent.customers)) {
        agent.customers.forEach((customerId: number) => {
          if (allAssignedCustomers.has(customerId)) {
            duplicates.push(customerId);
            issues++;
          } else {
            allAssignedCustomers.add(customerId);
          }
        });
      }
    });
    
    if (duplicates.length > 0) {
      console.log(`❌ Found ${duplicates.length} duplicate customer assignments`);
    } else {
      console.log('✅ No duplicate customer assignments found');
    }
    
    // Test 2: Validate agent-master references
    const masterIds = new Set(this.agentsConfig.masters?.list?.map((m) => m.id) || []);
    
    this.agentsConfig.agents.list.forEach((agent: AgentData) => {
      if (agent.master && !masterIds.has(agent.master)) {
        console.log(`❌ Agent ${agent.id} references invalid master ${agent.master}`);
        issues++;
      }
    });
    
    if (issues === 0) {
      console.log('✅ All agent-master references are valid');
    }
    
    // Test 3: Commission rate validation
    const invalidRates = this.agentsConfig.agents.list.filter((agent: AgentData) => {
      return typeof agent.commission_rate !== 'number' || 
             agent.commission_rate <= 0 || 
             agent.commission_rate >= 1;
    });
    
    if (invalidRates.length > 0) {
      console.log(`❌ Found ${invalidRates.length} agents with invalid commission rates`);
      issues++;
    } else {
      console.log('✅ All commission rates are valid');
    }
    
    return issues === 0;
  }
  
  generateReport() {
    console.log('\n📋 Integration Report');
    console.log('='.repeat(50));
    
    if (this.customers.length === 0) {
      console.log('⚠️  No customer data found - using file-based system?');
      return;
    }
    
    if (!this.agentsConfig?.agents?.list) {
      console.log('❌ No agent configuration found');
      return;
    }
    
    // Calculate statistics
    const totalCustomers = this.customers.length;
    const totalAgents = this.agentsConfig.agents.list.length;
    const totalMasters = this.agentsConfig.masters?.list?.length || 0;
    
    const assignedCustomers = this.agentsConfig.agents.list.reduce((total: number, agent: AgentData) => {
      return total + (agent.customers?.length || 0);
    }, 0);
    
    const avgCustomersPerAgent = totalAgents > 0 ? (assignedCustomers / totalAgents).toFixed(1) : '0';
    
    console.log(`\n📊 Summary Statistics:`);
    console.log(`   Total Customers: ${totalCustomers.toLocaleString()}`);
    console.log(`   Total Agents: ${totalAgents}`);
    console.log(`   Total Masters: ${totalMasters}`);
    console.log(`   Assigned Customers: ${assignedCustomers.toLocaleString()}`);
    console.log(`   Assignment Rate: ${((assignedCustomers / totalCustomers) * 100).toFixed(1)}%`);
    console.log(`   Avg Customers/Agent: ${avgCustomersPerAgent}`);
    
    // Commission analysis
    const commissionRates = this.agentsConfig.agents.list
      .map((agent: AgentData) => agent.commission_rate)
      .filter((rate: number | undefined): rate is number => typeof rate === 'number');
    
    if (commissionRates.length > 0) {
      const avgCommission = (commissionRates.reduce((a: number, b: number) => a + b, 0) / commissionRates.length) * 100;
      const minCommission = Math.min(...commissionRates) * 100;
      const maxCommission = Math.max(...commissionRates) * 100;
      
      console.log(`\n💰 Commission Analysis:`);
      console.log(`   Average Rate: ${avgCommission.toFixed(2)}%`);
      console.log(`   Min Rate: ${minCommission.toFixed(2)}%`);
      console.log(`   Max Rate: ${maxCommission.toFixed(2)}%`);
    }
    
    console.log('\n✅ Integration test complete!');
  }
}

async function main() {
  const tester = new IntegrationTester();
  
  console.log('🔬 Customer-Agent Integration Test');
  console.log('='.repeat(40));
  
  await tester.loadData();
  
  const hasRelationships = tester.testCustomerAgentRelationships();
  const hasIntegrity = tester.testDataIntegrity();
  
  tester.generateReport();
  
  // Exit with appropriate code
  const success = hasRelationships && hasIntegrity;
  process.exit(success ? 0 : 1);
}

if (import.meta.main) {
  main().catch(console.error);
}