# Agent Management API Reference

> **👥 Complete guide to agent and master agent management in Fantasy402 Trading Platform**

This document provides detailed information about managing agents, masters, and their relationships through the Fantasy402 API and YAML configuration system.

## 🏗️ Agent System Architecture

The Fantasy402 platform uses a hierarchical agent system:
- **Agents**: Individual agents managing customer accounts
- **Master Agents**: Senior agents overseeing multiple agents
- **Commission Structure**: Multi-tier commission system with performance bonuses

## 📊 Agent Configuration

### YAML Configuration (`agents.yml`)

The agent system is configured through the `agents.yml` file with comprehensive settings:

```yaml
# Agent and Master Agent Configuration
agents:
  list:
    - id: A100
      name: "Alice Chen"
      code: "AC100"
      master: M10                    # Reports to Master M10
      status: active
      joined: "2024-01-15"
      telegram_id: 100200300
      customers: [1, 42, 77, 101, 155]
      commission_rate: 0.05          # 5% commission
      balance: 5420.50
      total_earned: 125000

masters:
  list:
    - id: M10
      name: "Master Mike Zhang"
      code: "MZ10"
      status: active
      agents: [A100, A101]           # Manages these agents
      commission_rate: 0.02          # 2% commission
      override_rate: 0.01            # Additional 1% override
      tier: platinum
```

## 🔗 API Endpoints

### Agent Information

#### GET `/api/admin/agents`
Retrieve all agents with performance metrics.

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "A100",
      "name": "Alice Chen",
      "code": "AC100", 
      "status": "active",
      "master_id": "M10",
      "customer_count": 5,
      "commission_rate": 5.0,
      "monthly_volume": 500000.00,
      "performance_tier": "gold"
    }
  ]
}
```

#### GET `/api/admin/agent/{agent_id}`
Get detailed information about a specific agent.

#### POST `/api/admin/agent/{agent_id}/customers`
Assign customers to an agent.

#### PUT `/api/admin/agent/{agent_id}/commission`
Update agent commission rates.

## 💰 Commission Structure

### Base Rates
- **Agent Commission**: 5% (configurable per agent)
- **Master Commission**: 2% (configurable per master)
- **Master Override**: 1% (additional bonus on agent sales)

### Performance Tiers
```yaml
performance_tiers:
  bronze:
    monthly_target: 10000
    agent_bonus: 0
  silver:
    monthly_target: 50000
    agent_bonus: 0.005      # +0.5%
  gold:
    monthly_target: 100000
    agent_bonus: 0.01       # +1%
  platinum:
    monthly_target: 250000
    agent_bonus: 0.015      # +1.5%
```

## 📈 Performance Tracking

### Key Performance Indicators (KPIs)

#### Agent KPIs
- Customer acquisition count
- Customer retention rate
- Monthly trading volume
- Average customer value
- Churn rate

#### Master Agent KPIs
- Team performance metrics
- Agent retention rates
- Territory growth
- Total network volume

### Performance API

#### GET `/api/admin/agents/performance`
Get comprehensive performance data for all agents.

#### GET `/api/admin/agent/{agent_id}/analytics`
Detailed analytics for specific agent.

## 🌍 Territory Management

### Geographic Assignment
```yaml
territories:
  - id: T1
    name: "North America"
    masters: [M10]
    countries: [US, CA, MX]
  - id: T2
    name: "Europe" 
    masters: [M11]
    countries: [GB, DE, FR, IT, ES]
```

## 🎯 Customer Assignment

### Assignment Rules
1. **New Customers**: Assigned to agents based on availability and performance
2. **Geographic Matching**: Customers matched to agents in their region
3. **Load Balancing**: Automatic distribution to prevent overloading
4. **VIP Handling**: VIP customers assigned to top-performing agents

### Customer Management

#### GET `/api/admin/agent/{agent_id}/customers`
List all customers assigned to an agent.

#### POST `/api/admin/assign-customer`
Assign a customer to a specific agent.

```json
{
  "customer_id": "BB1042",
  "agent_id": "A100",
  "assignment_reason": "geographic_match"
}
```

## 💳 Payment & Commission System

### Commission Calculation
```typescript
// Commission calculation example
const calculateCommission = (volume: number, agentRate: number, tier: string) => {
  let baseCommission = volume * agentRate;
  let bonus = 0;
  
  switch(tier) {
    case 'silver': bonus = volume * 0.005; break;
    case 'gold': bonus = volume * 0.01; break;  
    case 'platinum': bonus = volume * 0.015; break;
  }
  
  return baseCommission + bonus;
};
```

### Payment Schedule
- **Frequency**: Monthly (configurable)
- **Payment Day**: 5th of each month
- **Minimum Payout**: $100
- **Hold Period**: 7 days for chargeback protection

### Payment Methods
- Bank transfer
- Cryptocurrency
- Telegram wallet
- Company credit

## 🔄 Agent Lifecycle Management

### Agent Onboarding
1. **Registration**: Create agent profile
2. **Verification**: KYC and background checks
3. **Training**: Complete certification program
4. **Assignment**: Territory and master assignment
5. **Activation**: Begin customer management

### Performance Monitoring
- **Daily Metrics**: Login activity, customer interactions
- **Weekly Reports**: Volume, commission, customer satisfaction
- **Monthly Reviews**: Performance tier evaluation
- **Quarterly Assessment**: Territory and role optimization

### Status Management
- **Active**: Fully operational
- **Suspended**: Temporary restriction (investigation, training)
- **Inactive**: No longer operating
- **Probation**: Performance improvement period

## 🛡️ Compliance & Security

### Agent Verification
- Identity verification (KYC)
- Background checks
- Financial compliance
- Ongoing monitoring

### Access Controls
- Role-based permissions
- API access limitations
- Customer data protection
- Audit logging

## 📊 Reporting & Analytics

### Standard Reports
- **Agent Performance Report**: Individual metrics and KPIs
- **Commission Report**: Earnings breakdown and payments
- **Customer Assignment Report**: Assignment history and changes
- **Territory Analysis**: Regional performance comparison

### Custom Analytics
- Commission forecasting
- Performance trend analysis
- Customer lifetime value by agent
- Territory optimization recommendations

## 🔗 Integration Points

### Telegram Integration
```yaml
telegram:
  agent_notifications:
    commission_alerts: true
    performance_updates: true
    customer_assignments: true
    territory_changes: true
```

### Customer Database
- Automatic customer-agent relationship mapping
- Real-time balance and activity tracking
- Commission calculation integration

## 🆘 Troubleshooting

### Common Issues

#### Agent Not Receiving Commissions
1. Check agent status is "active"
2. Verify commission rate configuration
3. Confirm customer assignments are valid
4. Review payment method settings

#### Customer Assignment Failures
1. Verify agent capacity limits
2. Check territory restrictions
3. Confirm agent permissions
4. Review assignment rules

#### Performance Tier Issues
1. Validate monthly volume calculations
2. Check tier threshold configurations
3. Verify bonus calculations
4. Confirm tier update timing

## 🔗 Related Documentation

- [YAML Configuration Guide](../configuration/YAML_CONFIGURATION.md) - Agent configuration setup
- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Customer Management](./CUSTOMER_MANAGEMENT.md) - Customer-agent relationships
- [Commission System](./COMMISSION_SYSTEM.md) - Detailed commission calculations
- [Telegram Bot Integration](./TELEGRAM_BOT.md) - Agent notification system

---

**Version**: 2.1.0  
**Last Updated**: August 25, 2025  
**Agent System Status**: ✅ 5 active agents, 3 masters, 24 customers managed  
**Commission System**: ✅ Multi-tier with performance bonuses