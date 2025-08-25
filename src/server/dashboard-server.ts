/**
 * Dashboard Server - Bun v1.2.21 Optimized
 * Full Telegram Group & Affiliate Management Dashboard
 * Port: 3000 with /dashboard route
 */

import { serve, YAML } from 'bun';
import { createDashboardRouter } from './api/dashboard-router';
import { enhancedDashboardRouter } from './api/enhanced-dashboard-router';
import { createExtendedDataRouter } from './api/extended-data-router';
import { ResponseCacheMiddleware } from '../middleware/response-cache';
import { MultiLevelCache } from '../services/multi-level-cache';
import { telegramBridge } from '../lib/telegram-bridge';

interface TelegramGroup {
  id: string;
  name: string;
  type: 'public' | 'private' | 'admin';
  memberCount: number;
  maxMembers: number;
  active: boolean;
  createdAt: string;
  description?: string;
  inviteLink?: string;
  adminId?: string;
}

interface Affiliate {
  id: string;
  name: string;
  telegramId: number;
  username: string;
  commissionRate: number;
  totalReferrals: number;
  totalEarnings: number;
  status: 'active' | 'inactive' | 'suspended';
  joinedAt: string;
  lastActivity: string;
  payoutMethod?: string;
}

class DashboardServer {
  private groups: TelegramGroup[] = [];
  private affiliates: Affiliate[] = [];
  private config: Record<string, unknown> = {};
  public dashboardRouter: ReturnType<typeof createDashboardRouter>;
  public extendedDataRouter: ReturnType<typeof createExtendedDataRouter>;
  public wsServer: any;

  constructor() {
    // Initialize the dashboard router with response cache
    const cache = new MultiLevelCache();
    const responseCache = new ResponseCacheMiddleware(cache);
    this.dashboardRouter = createDashboardRouter(responseCache);
    this.extendedDataRouter = createExtendedDataRouter(responseCache);
    this.wsServer = this.extendedDataRouter.createWebSocketServer();
    this.loadData();
  }

  async loadData() {
    try {
      // Load Telegram configuration
      const telegramConfigFile = Bun.file('./config/telegram.yaml');
      if (await telegramConfigFile.exists()) {
        const content = await telegramConfigFile.text();
        this.config = YAML.parse(content);
        console.log('✅ Dashboard: Telegram config loaded');
      }

      // Load groups data
      await this.loadGroups();

      // Load affiliates data
      await this.loadAffiliates();
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
    }
  }

  async loadGroups() {
    try {
      // Load from JSONL file
      const groupsFile = Bun.file('./data/telegram_groups.jsonl');
      if (await groupsFile.exists()) {
        const content = await groupsFile.text();
        const lines = content.trim().split('\n').filter(Boolean);
        this.groups = lines.map(line => JSON.parse(line));
      }

      // Generate sample data if empty
      if (this.groups.length === 0) {
        this.groups = this.generateSampleGroups();
        await this.saveGroups();
      }

      console.log(`✅ Dashboard: Loaded ${this.groups.length} Telegram groups`);
    } catch (error) {
      console.error('❌ Failed to load groups:', error);
      this.groups = this.generateSampleGroups();
    }
  }

  async loadAffiliates() {
    try {
      // Load from customer config and referral data
      const customerConfigFile = Bun.file('./customer_config.json');
      if (await customerConfigFile.exists()) {
        const config = await customerConfigFile.json();

        // Extract affiliates from customer data
        const customerData = config.customers || {};
        this.affiliates = Object.entries(customerData).map(
          ([_id, customer]) => {
            const customerRecord = customer as Record<string, unknown>;
            return {
              id: `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: (customerRecord.name as string) || 'Unknown Affiliate',
              telegramId: (customerRecord.telegram_id as number) || 0,
              username: (customerRecord.username as string) || 'unknown',
              commissionRate: 0.1, // Default 10% commission
              totalReferrals: Math.floor(Math.random() * 50) + 1,
              totalEarnings: Math.floor(Math.random() * 1000) + 100,
              status: 'active' as const,
              joinedAt:
                (customerRecord.created_at as string) ||
                new Date().toISOString(),
              lastActivity: new Date().toISOString(),
            };
          }
        );
      }

      // Generate sample data if empty
      if (this.affiliates.length === 0) {
        this.affiliates = this.generateSampleAffiliates();
      }

      console.log(`✅ Dashboard: Loaded ${this.affiliates.length} affiliates`);
    } catch (error) {
      console.error('❌ Failed to load affiliates:', error);
      this.affiliates = this.generateSampleAffiliates();
    }
  }

  generateSampleGroups(): TelegramGroup[] {
    const groupNames = [
      'VIP Trading Elite',
      'Premium Signals',
      'Trading Community',
      'Market Analysis',
      'Affiliate Network',
      'Support Channel',
      'Daily Tips',
      'Advanced Strategies',
    ];

    return groupNames.map((name, index) => {
      const maxMembers = index < 2 ? 100 : 1000;
      // Ensure member count never exceeds max
      const memberCount = Math.floor(Math.random() * (maxMembers * 0.9)) + Math.floor(maxMembers * 0.1);
      
      return {
        id: `group_${index + 1}`,
        name,
        type: index < 2 ? 'private' : index < 6 ? 'public' : 'admin',
        memberCount,
        maxMembers,
        active: index < 6, // First 6 groups are active
        createdAt: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        description: `${name} - Professional trading discussion and signals`,
        inviteLink: `https://t.me/+${Math.random().toString(36).substring(2, 15)}`,
        adminId: `admin_${Math.floor(Math.random() * 5) + 1}`,
      };
    });
  }

  generateSampleAffiliates(): Affiliate[] {
    const affiliateNames = [
      'Agent Alpha',
      'Agent Beta',
      'Agent Gamma',
      'Agent Delta',
      'Agent Epsilon',
      'Agent Zeta',
      'Agent Theta',
      'Agent Iota',
    ];

    return affiliateNames.map((_name, _index) => ({
      id: `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: _name,
      telegramId: Math.floor(Math.random() * 1000000000),
      username: `@${_name.toLowerCase().replace(/\s/g, '_')}`,
      commissionRate: 0.02 + Math.random() * 0.08, // 2-10%
      totalReferrals: Math.floor(Math.random() * 50) + 5,
      totalEarnings: Math.floor(Math.random() * 10000) + 1000,
      status: Math.random() > 0.2 ? 'active' : 'inactive',
      joinedAt: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      lastActivity: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      payoutMethod: ['bank', 'crypto', 'telegram'][
        Math.floor(Math.random() * 3)
      ],
    }));
  }

  async saveGroups() {
    try {
      const content = this.groups
        .map(group => JSON.stringify(group))
        .join('\n');
      await Bun.write('./data/telegram_groups.jsonl', content);
    } catch (error) {
      console.error('❌ Failed to save groups:', error);
    }
  }

  async handleDashboard(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // API endpoints
    if (url.pathname.startsWith('/api/')) {
      return await this.handleAPI(req);
    }

    // Dashboard main page
    if (url.pathname === '/dashboard' || url.pathname === '/dashboard/') {
      return this.renderDashboard();
    }

    return new Response('Not Found', { status: 404 });
  }

  async handleAPI(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Extended data router handles new API endpoints
      const extendedResponse = await this.extendedDataRouter.handleRequest(req);
      if (extendedResponse) {
        return extendedResponse;
      }

      // Dashboard router handles most API calls
      const routerResponse = await this.dashboardRouter.handleRequest(req);
      if (routerResponse) {
        return routerResponse;
      }

      // Custom dashboard endpoints
      switch (url.pathname) {
        case '/api/dashboard/groups':
          if (req.method === 'GET') {
            return Response.json(this.groups, { headers: corsHeaders });
          }
          if (req.method === 'POST') {
            const groupData = (await req.json()) as Record<string, unknown>;
            const newGroup: TelegramGroup = {
              id: `group_${Date.now()}`,
              name: (groupData.name as string) || 'New Group',
              type:
                (groupData.type as 'public' | 'private' | 'admin') || 'public',
              memberCount: (groupData.memberCount as number) || 0,
              maxMembers: (groupData.maxMembers as number) || 1000,
              active: (groupData.active as boolean) ?? true,
              createdAt: new Date().toISOString(),
              description: (groupData.description as string) || '',
              inviteLink: (groupData.inviteLink as string) || '',
              adminId: (groupData.adminId as string) || '',
            };
            this.groups.push(newGroup);
            await this.saveGroups();
            return Response.json(newGroup, { headers: corsHeaders });
          }
          break;

        case '/api/dashboard/affiliates':
          if (req.method === 'GET') {
            return Response.json(this.affiliates, { headers: corsHeaders });
          }
          if (req.method === 'POST') {
            const affiliateData = (await req.json()) as Record<string, unknown>;
            const newAffiliate: Affiliate = {
              id: `aff_${Date.now()}`,
              name: (affiliateData.name as string) || 'New Affiliate',
              telegramId: (affiliateData.telegramId as number) || 0,
              username: (affiliateData.username as string) || 'unknown',
              commissionRate: (affiliateData.commissionRate as number) || 0.1,
              totalReferrals: (affiliateData.totalReferrals as number) || 0,
              totalEarnings: (affiliateData.totalEarnings as number) || 0,
              status:
                (affiliateData.status as 'active' | 'inactive' | 'suspended') ||
                'active',
              joinedAt: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
              payoutMethod: (affiliateData.payoutMethod as string) || 'bank',
            };
            this.affiliates.push(newAffiliate);
            return Response.json(newAffiliate, { headers: corsHeaders });
          }
          break;

        case '/api/dashboard/stats':
          if (req.method === 'GET') {
            const stats = {
              groups: {
                total: this.groups.length,
                active: this.groups.filter(g => g.active).length,
                totalMembers: this.groups.reduce(
                  (sum, g) => sum + g.memberCount,
                  0
                ),
              },
              affiliates: {
                total: this.affiliates.length,
                active: this.affiliates.filter(a => a.status === 'active')
                  .length,
                totalEarnings: this.affiliates.reduce(
                  (sum, a) => sum + a.totalEarnings,
                  0
                ),
                totalReferrals: this.affiliates.reduce(
                  (sum, a) => sum + a.totalReferrals,
                  0
                ),
              },
              bot: {
                name: 'Firesupportcs',
                username: '@Firesupportcs_bot',
                status: 'Operational',
                commands: 5,
                url: 'https://t.me/Firesupportcs_bot',
              },
            };
            return Response.json(stats, { headers: corsHeaders });
          }
          break;

        case '/api/dashboard/test-bot':
          if (req.method === 'POST') {
            try {
              const body = (await req.json()) as Record<string, unknown>;
              const message =
                (body?.message as string) || 'Test message from dashboard';
              const result = await telegramBridge.sendMessage(message, 'test');
              return Response.json(
                {
                  ok: true,
                  result,
                },
                {
                  status: 200,
                  headers: corsHeaders,
                }
              );
            } catch (error: unknown) {
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
              return Response.json(
                {
                  ok: false,
                  error: errorMessage,
                },
                {
                  status: 500,
                  headers: corsHeaders,
                }
              );
            }
          }
          break;
      }

      // If no route matched, return 404
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error: any) {
      console.error('❌ Dashboard API error:', error);
      return Response.json(
        { error: error.message },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }
  }

  renderDashboard(): Response {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FantDev Trading Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .card-hover:hover { transform: translateY(-2px); transition: all 0.2s ease; }
        .status-active { @apply bg-green-100 text-green-800; }
        .status-inactive { @apply bg-gray-100 text-gray-800; }
        .status-suspended { @apply bg-red-100 text-red-800; }
    </style>
</head>
<body class="bg-gray-50" x-data="dashboard()">
    <!-- Header -->
    <nav class="gradient-bg shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-4">
                <div class="flex items-center space-x-3">
                    <i class="fas fa-chart-line text-white text-2xl"></i>
                    <h1 class="text-2xl font-bold text-white">FantDev Trading Dashboard</h1>
                </div>
                <div class="flex items-center space-x-4 text-white">
                    <i class="fas fa-bell cursor-pointer hover:text-yellow-300"></i>
                    <i class="fas fa-user-circle text-2xl cursor-pointer hover:text-yellow-300"></i>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div class="bg-white rounded-xl shadow-md p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-600">Total Groups</p>
                        <p class="text-3xl font-bold text-indigo-600" x-text="stats.groups.total">-</p>
                    </div>
                    <i class="fas fa-users text-indigo-500 text-3xl"></i>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-md p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-600">Active Affiliates</p>
                        <p class="text-3xl font-bold text-green-600" x-text="stats.affiliates.active">-</p>
                    </div>
                    <i class="fas fa-handshake text-green-500 text-3xl"></i>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-md p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-600">Total Members</p>
                        <p class="text-3xl font-bold text-blue-600" x-text="stats.groups.totalMembers">-</p>
                    </div>
                    <i class="fab fa-telegram text-blue-500 text-3xl"></i>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-md p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-600">Total Earnings</p>
                        <p class="text-3xl font-bold text-purple-600">$<span x-text="formatNumber(stats.affiliates.totalEarnings)">-</span></p>
                    </div>
                    <i class="fas fa-dollar-sign text-purple-500 text-3xl"></i>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-md p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-600">Bot Status</p>
                        <div class="flex items-center">
                            <span class="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                            <p class="text-sm font-bold text-gray-900" x-text="stats.bot?.name || 'Bot'">-</p>
                        </div>
                        <p class="text-xs text-gray-500 mt-1" x-text="stats.bot?.username || ''">-</p>
                    </div>
                    <i class="fab fa-telegram text-cyan-500 text-3xl"></i>
                </div>
            </div>
        </div>

        <!-- Tab Navigation -->
        <div class="mb-6">
            <nav class="flex space-x-8">
                <button @click="activeTab = 'groups'" 
                        :class="activeTab === 'groups' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
                        class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
                    <i class="fas fa-users mr-2"></i>Telegram Groups
                </button>
                <button @click="activeTab = 'affiliates'" 
                        :class="activeTab === 'affiliates' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
                        class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
                    <i class="fas fa-handshake mr-2"></i>Affiliates
                </button>
                <button @click="activeTab = 'bot'" 
                        :class="activeTab === 'bot' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
                        class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
                    <i class="fab fa-telegram mr-2"></i>Bot Management
                </button>
                <button @click="activeTab = 'config'" 
                        :class="activeTab === 'config' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
                        class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
                    <i class="fas fa-cog mr-2"></i>Configuration
                </button>
            </nav>
        </div>

        <!-- Groups Tab -->
        <div x-show="activeTab === 'groups'" class="space-y-6">
            <!-- Add Group Button -->
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-semibold text-gray-900">Telegram Groups Management</h2>
                <button @click="showAddGroup = true" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                    <i class="fas fa-plus mr-2"></i>Add Group
                </button>
            </div>

            <!-- Groups Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <template x-for="group in groups" :key="group.id">
                    <div class="bg-white rounded-xl shadow-md p-6 card-hover">
                        <div class="flex justify-between items-start mb-4">
                            <h3 class="font-semibold text-lg" x-text="group.name"></h3>
                            <span :class="group.active ? 'status-active' : 'status-inactive'" 
                                  class="px-2 py-1 rounded-full text-xs font-medium"
                                  x-text="group.active ? 'Active' : 'Inactive'"></span>
                        </div>
                        <p class="text-gray-600 text-sm mb-3" x-text="group.description"></p>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-500">Type:</span>
                                <span class="capitalize" x-text="group.type"></span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-500">Members:</span>
                                <span x-text="group.memberCount + '/' + group.maxMembers"></span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-500">Created:</span>
                                <span x-text="formatDate(group.createdAt)"></span>
                            </div>
                        </div>
                        <div class="mt-4 flex space-x-2">
                            <button class="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-700">
                                <i class="fab fa-telegram mr-1"></i>View
                            </button>
                            <button class="flex-1 bg-gray-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-gray-700">
                                <i class="fas fa-edit mr-1"></i>Edit
                            </button>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <!-- Affiliates Tab -->
        <div x-show="activeTab === 'affiliates'" class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-semibold text-gray-900">Affiliate Management</h2>
                <button @click="showAddAffiliate = true" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                    <i class="fas fa-plus mr-2"></i>Add Affiliate
                </button>
            </div>

            <!-- Affiliates Table -->
            <div class="bg-white rounded-xl shadow-md overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Affiliate</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrals</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <template x-for="affiliate in affiliates" :key="affiliate.id">
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0 h-10 w-10">
                                            <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <i class="fas fa-user text-indigo-600"></i>
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <div class="text-sm font-medium text-gray-900" x-text="affiliate.name"></div>
                                            <div class="text-sm text-gray-500" x-text="affiliate.username"></div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" x-text="(affiliate.commissionRate * 100).toFixed(1) + '%'"></td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900" x-text="affiliate.totalReferrals"></td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$<span x-text="formatNumber(affiliate.totalEarnings)"></span></td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span :class="'status-' + affiliate.status" class="px-2 py-1 rounded-full text-xs font-medium capitalize" x-text="affiliate.status"></span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button class="text-indigo-600 hover:text-indigo-900 mr-3">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="text-red-600 hover:text-red-900">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Bot Management Tab -->
        <div x-show="activeTab === 'bot'" class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-xl font-semibold text-gray-900">Telegram Bot Management</h2>
                <div class="flex space-x-3">
                    <button @click="testBot()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-play mr-2"></i>Test Bot
                    </button>
                    <a :href="stats.bot?.url" target="_blank" class="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 inline-flex items-center">
                        <i class="fab fa-telegram mr-2"></i>Open Bot
                    </a>
                </div>
            </div>

            <!-- Bot Status Card -->
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center space-x-4">
                        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                            <i class="fab fa-telegram text-white text-2xl"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-bold text-gray-900" x-text="stats.bot?.name || 'Bot'">Firesupportcs</h3>
                            <p class="text-gray-600" x-text="stats.bot?.username || ''">@Firesupportcs_bot</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            <span x-text="stats.bot?.status || 'Unknown'">Operational</span>
                        </span>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600" x-text="stats.bot?.commands || '0'">5</div>
                        <div class="text-sm text-gray-600">Commands</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-600" x-text="stats.groups?.total || '0'">8</div>
                        <div class="text-sm text-gray-600">Groups</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-purple-600" x-text="stats.groups?.totalMembers || '0'">2,523</div>
                        <div class="text-sm text-gray-600">Total Members</div>
                    </div>
                </div>
            </div>

            <!-- Bot Actions -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="font-semibold mb-4 flex items-center">
                        <i class="fas fa-terminal mr-2 text-blue-500"></i>
                        Bot Commands
                    </h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between py-1">
                            <span class="text-gray-600">/start</span>
                            <span class="text-green-600">Active</span>
                        </div>
                        <div class="flex justify-between py-1">
                            <span class="text-gray-600">/register</span>
                            <span class="text-green-600">Active</span>
                        </div>
                        <div class="flex justify-between py-1">
                            <span class="text-gray-600">/balance</span>
                            <span class="text-green-600">Active</span>
                        </div>
                        <div class="flex justify-between py-1">
                            <span class="text-gray-600">/help</span>
                            <span class="text-green-600">Active</span>
                        </div>
                        <div class="flex justify-between py-1">
                            <span class="text-gray-600">/admin</span>
                            <span class="text-green-600">Active</span>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="font-semibold mb-4 flex items-center">
                        <i class="fas fa-cog mr-2 text-green-500"></i>
                        Bot Settings
                    </h3>
                    <div class="space-y-3">
                        <button @click="setWebhook()" class="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-700">
                            <i class="fas fa-link mr-2"></i>Set Webhook
                        </button>
                        <button @click="reloadConfig()" class="w-full bg-green-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-green-700">
                            <i class="fas fa-sync mr-2"></i>Reload Config
                        </button>
                        <button @click="showBotAnalytics()" class="w-full bg-purple-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-purple-700">
                            <i class="fas fa-chart-line mr-2"></i>Bot Analytics
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="font-semibold mb-4 flex items-center">
                        <i class="fas fa-broadcast-tower mr-2 text-purple-500"></i>
                        Quick Actions
                    </h3>
                    <div class="space-y-3">
                        <button @click="sendTestMessage()" class="w-full bg-cyan-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-cyan-700">
                            <i class="fas fa-paper-plane mr-2"></i>Send Test Message
                        </button>
                        <button @click="broadcastMessage()" class="w-full bg-orange-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-orange-700">
                            <i class="fas fa-bullhorn mr-2"></i>Broadcast
                        </button>
                        <button @click="emergencyStop()" class="w-full bg-red-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-red-700">
                            <i class="fas fa-ban mr-2"></i>Emergency Stop
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Configuration Tab -->
        <div x-show="activeTab === 'config'" class="space-y-6">
            <h2 class="text-xl font-semibold text-gray-900">Configuration Management</h2>
            
            <!-- Quick Actions -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="font-semibold mb-4">YAML Configuration</h3>
                    <p class="text-gray-600 text-sm mb-4">Manage Telegram bot settings</p>
                    <button @click="loadConfig()" class="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 w-full">
                        <i class="fas fa-file-code mr-2"></i>Edit Config
                    </button>
                </div>
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="font-semibold mb-4">Bot Status</h3>
                    <p class="text-gray-600 text-sm mb-4">Monitor bot health</p>
                    <button class="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 w-full">
                        <i class="fas fa-robot mr-2"></i>Bot Health
                    </button>
                </div>
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="font-semibold mb-4">Export Data</h3>
                    <p class="text-gray-600 text-sm mb-4">Download reports</p>
                    <button @click="exportData()" class="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 w-full">
                        <i class="fas fa-download mr-2"></i>Export
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        function dashboard() {
            return {
                activeTab: 'groups',
                groups: [],
                affiliates: [],
                stats: {
                    groups: { total: 0, active: 0, totalMembers: 0 },
                    affiliates: { total: 0, active: 0, totalEarnings: 0, totalReferrals: 0 }
                },
                showAddGroup: false,
                showAddAffiliate: false,

                async init() {
                    await this.loadData();
                    console.log('✅ Dashboard initialized');
                },

                async loadData() {
                    try {
                        // Load groups
                        const groupsResponse = await fetch('/api/dashboard/groups');
                        this.groups = await groupsResponse.json();

                        // Load affiliates
                        const affiliatesResponse = await fetch('/api/dashboard/affiliates');
                        this.affiliates = await affiliatesResponse.json();

                        // Load stats
                        const statsResponse = await fetch('/api/dashboard/stats');
                        this.stats = await statsResponse.json();

                        console.log('✅ Data loaded:', { 
                            groups: this.groups.length, 
                            affiliates: this.affiliates.length 
                        });
                    } catch (error) {
                        console.error('❌ Failed to load data:', error);
                    }
                },

                formatNumber(num) {
                    return new Intl.NumberFormat().format(num);
                },

                formatDate(dateString) {
                    return new Date(dateString).toLocaleDateString();
                },

                async exportData() {
                    try {
                        const response = await fetch('/api/export/all');
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = \`fantdev-export-\${Date.now()}.json\`;
                        a.click();
                    } catch (error) {
                        console.error('❌ Export failed:', error);
                    }
                },

                async loadConfig() {
                    // This would open a modal or redirect to config editor
                    alert('Config editor would open here');
                },

                async testBot() {
                    try {
                        // Test bot via secure server API
                        const response = await fetch('/api/dashboard/test-bot', {
                            method: 'POST'
                        });
                        const result = await response.json();
                        
                        if (result.ok) {
                            alert(\`✅ Bot test successful!\\n\\nBot: \${result.bot.name}\\nUsername: @\${result.bot.username}\\nStatus: \${result.bot.status}\`);
                        } else {
                            alert(\`❌ Bot test failed: \${result.error}\`);
                        }
                    } catch (error) {
                        alert(\`❌ Bot test error: \${error.message}\`);
                    }
                },

                async sendTestMessage() {
                    const message = prompt('Enter test message to send to admin chat:', '🔧 Test message from dashboard');
                    if (message) {
                        try {
                            const response = await fetch('/api/dashboard/send-message', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    message: message,
                                    chat_type: 'admin'
                                })
                            });
                            const result = await response.json();
                            
                            if (result.ok) {
                                alert('✅ Test message sent successfully!');
                            } else {
                                alert(\`❌ Failed to send message: \${result.error}\`);
                            }
                        } catch (error) {
                            alert(\`❌ Send error: \${error.message}\`);
                        }
                    }
                },

                async setWebhook() {
                    const webhookUrl = prompt('Enter webhook URL:', 'https://your-domain.com/webhook');
                    if (webhookUrl) {
                        try {
                            const response = await fetch('/api/dashboard/set-webhook', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url: webhookUrl })
                            });
                            const result = await response.json();
                            
                            if (result.ok) {
                                alert('✅ Webhook set successfully!');
                            } else {
                                alert(\`❌ Failed to set webhook: \${result.error}\`);
                            }
                        } catch (error) {
                            alert(\`❌ Webhook error: \${error.message}\`);
                        }
                    }
                },

                async reloadConfig() {
                    if (confirm('Reload bot configuration from disk?')) {
                        try {
                            const response = await fetch('/api/dashboard/reload-config', {
                                method: 'POST'
                            });
                            const result = await response.json();
                            
                            if (result.ok) {
                                alert('✅ Configuration reloaded successfully!');
                                await this.loadData(); // Refresh dashboard data
                            } else {
                                alert(\`❌ Failed to reload config: \${result.error}\`);
                            }
                        } catch (error) {
                            alert(\`❌ Reload error: \${error.message}\`);
                        }
                    }
                },

                async showBotAnalytics() {
                    try {
                        const response = await fetch('/api/dashboard/analytics');
                        const analytics = await response.json();
                        
                        const analyticsText = \`📊 Bot Analytics
                        
Messages Today: \${analytics.messagestoday || 0}
Active Users: \${analytics.activeUsers || 0}
Commands Used: \${analytics.commandsUsed || 0}
Response Time: \${analytics.avgResponseTime || 'N/A'}ms
Uptime: \${analytics.uptime || 'N/A'}
                        
Last Updated: \${new Date().toLocaleString()}\`;
                        
                        alert(analyticsText);
                    } catch (error) {
                        alert(\`❌ Failed to load analytics: \${error.message}\`);
                    }
                },

                async broadcastMessage() {
                    const message = prompt('Enter broadcast message for all users:', '📢 ');
                    if (message) {
                        if (confirm(\`Send this message to ALL users?\\n\\n"\${message}"\`)) {
                            try {
                                const response = await fetch('/api/dashboard/broadcast', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ message })
                                });
                                const result = await response.json();
                                
                                if (result.ok) {
                                    alert(\`✅ Broadcast sent to \${result.recipients || 0} users!\`);
                                } else {
                                    alert(\`❌ Broadcast failed: \${result.error}\`);
                                }
                            } catch (error) {
                                alert(\`❌ Broadcast error: \${error.message}\`);
                            }
                        }
                    }
                },

                async emergencyStop() {
                    if (confirm('⚠️ EMERGENCY STOP\\n\\nThis will immediately stop the bot. Are you sure?')) {
                        if (confirm('This action cannot be undone. Confirm emergency stop?')) {
                            try {
                                const response = await fetch('/api/dashboard/emergency-stop', {
                                    method: 'POST'
                                });
                                const result = await response.json();
                                
                                if (result.ok) {
                                    alert('🛑 Bot has been stopped!');
                                    // Update UI to reflect stopped state
                                    this.stats.bot.status = 'Stopped';
                                } else {
                                    alert(\`❌ Failed to stop bot: \${result.error}\`);
                                }
                            } catch (error) {
                                alert(\`❌ Emergency stop error: \${error.message}\`);
                            }
                        }
                    }
                }
            }
        }
    </script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// Create and start dashboard server
const dashboardServer = new DashboardServer();

// Start the server (commented to avoid unused variable warning)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _server = serve({
  port: process.env.DASHBOARD_PORT ? parseInt(process.env.DASHBOARD_PORT) : 3005,
  websocket: dashboardServer.wsServer.websocket,
  async fetch(req) {
    const url = new URL(req.url);

    // Handle static dashboard pages first
    if (url.pathname === '/unified' || url.pathname === '/unified/') {
      const unifiedFile = Bun.file('./public/dashboard/unified-dashboard.html');
      const content = await unifiedFile.text();
      return new Response(content, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    if (url.pathname === '/enhanced' || url.pathname === '/enhanced/') {
      const enhancedFile = Bun.file('./public/dashboard/unified-dashboard-enhanced.html');
      if (await enhancedFile.exists()) {
        return new Response(await enhancedFile.text(), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    }
    
    if (url.pathname === '/players' || url.pathname === '/players/') {
      const playersFile = Bun.file('./public/dashboard/players-dashboard.html');
      if (await playersFile.exists()) {
        return new Response(await playersFile.text(), {
          headers: { 'Content-Type': 'text/html' }
        });
      }
    }

    // Handle dashboard routes
    if (
      url.pathname === '/dashboard' ||
      url.pathname.startsWith('/api/dashboard')
    ) {
      // Try enhanced router first for new endpoints
      const enhancedResponse = await enhancedDashboardRouter.handleRequest(req);
      if (enhancedResponse) {
        return enhancedResponse;
      }
      // Fall back to original dashboard handler
      return await dashboardServer.handleDashboard(req);
    }

    // Handle WebSocket upgrade for extended data
    if (url.pathname === '/ws/extended') {
      return dashboardServer.wsServer.upgrade(req) || new Response('WebSocket upgrade failed', { status: 400 });
    }

    // Handle other API routes
    if (url.pathname.startsWith('/api/')) {
      // Try extended data router first
      const extendedResponse = await dashboardServer.extendedDataRouter.handleRequest(req);
      if (extendedResponse) {
        return extendedResponse;
      }
      
      // Fall back to main dashboard router
      const response = await dashboardServer.dashboardRouter.handleRequest(req);
      return (
        response || new Response('API endpoint not found', { status: 404 })
      );
    }

    // Root redirect
    if (url.pathname === '/') {
      return Response.redirect('/dashboard', 302);
    }

    return new Response(
      `
<!DOCTYPE html>
<html>
<head>
    <title>FantDev Trading Platform</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; 
               margin: 0; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
               color: white; text-align: center; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { font-size: 2.5em; margin-bottom: 20px; }
        p { font-size: 1.2em; margin-bottom: 30px; opacity: 0.9; }
        .button { display: inline-block; background: rgba(255,255,255,0.2); color: white; 
                  padding: 15px 30px; text-decoration: none; border-radius: 8px; 
                  font-weight: 600; transition: all 0.2s; }
        .button:hover { background: rgba(255,255,255,0.3); transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 FantDev Trading Platform</h1>
        <p>Enterprise trading bot with Telegram integration</p>
        <a href="/dashboard" class="button">Open Dashboard</a>
    </div>
</body>
</html>
    `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  },
});

const port = process.env.DASHBOARD_PORT ? parseInt(process.env.DASHBOARD_PORT) : 3005;
console.log(`🎛️ Dashboard Server running on http://localhost:${port}`);
console.log(`📊 Dashboard available at: http://localhost:${port}/dashboard`);
console.log(`🔗 API endpoints: /api/dashboard/*`);
console.log(`⚡ Powered by Bun v1.2.21 with native YAML support`);

export { dashboardServer };
