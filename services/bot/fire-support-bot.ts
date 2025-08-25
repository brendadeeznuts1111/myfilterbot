#!/usr/bin/env bun
/**
 * Fire Support CS Bot - @Firesupportcs_bot
 * Customer support and management bot for Fantasy402
 */

import { Bot, InlineKeyboard } from "grammy";
import { appendFile, readFile } from "fs/promises";

// Load token from environment or .env.telegram file
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8039557687:AAEaDQUYya1H0y7qv4tmhYsCSqGrzpS-heU";
const ADMIN_GROUP = Number(process.env.TELEGRAM_ADMIN_GROUP || "-1001234567890");

const bot = new Bot(BOT_TOKEN);

// Store user states
const userStates = new Map<number, any>();

/* ---------- Commands ---------- */

// /start - Welcome message with inline keyboard
bot.command("start", async (ctx) => {
  const userId = ctx.from!.id;
  const username = ctx.from!.username || ctx.from!.first_name;
  
  // Log new user
  await logEvent("new_user", { userId, username });
  
  const keyboard = new InlineKeyboard()
    .text("💰 Check Balance", "balance")
    .text("📊 View Profile", "profile")
    .row()
    .text("💳 Deposit", "deposit")
    .text("💸 Withdraw", "withdraw")
    .row()
    .text("🎰 Betting", "betting")
    .text("📞 Support", "support")
    .row()
    .text("📚 Help", "help")
    .text("⚙️ Settings", "settings");
  
  await ctx.reply(
    `🔥 Welcome to **Fire Support CS Bot**, ${username}!\n\n` +
    `I'm here to help you with:\n` +
    `• Account management\n` +
    `• Deposits & withdrawals\n` +
    `• Betting support\n` +
    `• 24/7 customer service\n\n` +
    `Choose an option below to get started:`,
    { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    }
  );
});

// /help - Show all commands
bot.command("help", async (ctx) => {
  await ctx.reply(
    `📚 **Available Commands**\n\n` +
    `**Account:**\n` +
    `/start - Main menu\n` +
    `/profile - View your profile\n` +
    `/balance - Check balance\n\n` +
    `**Transactions:**\n` +
    `/deposit <amount> - Request deposit\n` +
    `/withdraw <amount> - Request withdrawal\n` +
    `/history - Transaction history\n\n` +
    `**Betting:**\n` +
    `/bet - Place a bet\n` +
    `/mybets - View active bets\n` +
    `/results - Recent results\n\n` +
    `**Support:**\n` +
    `/support - Contact support\n` +
    `/ticket <message> - Open support ticket\n` +
    `/faq - Frequently asked questions\n\n` +
    `**Other:**\n` +
    `/refer - Get referral link\n` +
    `/settings - Account settings\n` +
    `/language - Change language`,
    { parse_mode: "Markdown" }
  );
});

// /profile - Show user profile
bot.command("profile", async (ctx) => {
  const userId = ctx.from!.id;
  const profile = await getUserProfile(userId);
  
  await ctx.reply(
    `👤 **Your Profile**\n\n` +
    `🆔 ID: \`${userId}\`\n` +
    `👤 Username: @${ctx.from!.username || "not_set"}\n` +
    `💰 Balance: $${profile.balance.toFixed(2)}\n` +
    `📈 Level: ${profile.level}\n` +
    `🎰 Total Wagered: $${profile.totalWagered.toFixed(2)}\n` +
    `📊 Win Rate: ${(profile.winRate * 100).toFixed(1)}%\n` +
    `📅 Member Since: ${profile.joinedAt}\n` +
    `✅ Verified: ${profile.verified ? "Yes" : "No"}`,
    { parse_mode: "Markdown" }
  );
});

// /balance - Quick balance check
bot.command("balance", async (ctx) => {
  const userId = ctx.from!.id;
  const profile = await getUserProfile(userId);
  
  const keyboard = new InlineKeyboard()
    .text("💳 Deposit", "deposit")
    .text("💸 Withdraw", "withdraw");
  
  await ctx.reply(
    `💰 **Your Balance**\n\n` +
    `Available: **$${profile.balance.toFixed(2)}**\n` +
    `Pending: $${profile.pendingBalance.toFixed(2)}`,
    { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    }
  );
});

// /deposit - Deposit flow
bot.command("deposit", async (ctx) => {
  const parts = ctx.message!.text!.split(" ");
  
  if (parts.length < 2) {
    const keyboard = new InlineKeyboard()
      .text("💵 $25", "deposit_25")
      .text("💵 $50", "deposit_50")
      .text("💵 $100", "deposit_100")
      .row()
      .text("💵 $250", "deposit_250")
      .text("💵 $500", "deposit_500")
      .text("💵 $1000", "deposit_1000")
      .row()
      .text("💳 Custom Amount", "deposit_custom")
      .text("❌ Cancel", "cancel");
    
    await ctx.reply(
      "💳 **Select Deposit Amount**\n\nChoose a preset amount or enter custom:",
      { reply_markup: keyboard, parse_mode: "Markdown" }
    );
    return;
  }
  
  const amount = parseFloat(parts[1]);
  if (isNaN(amount) || amount < 10) {
    await ctx.reply("❌ Invalid amount. Minimum deposit is $10.");
    return;
  }
  
  // Process deposit
  const depositId = await createDeposit(ctx.from!.id, amount);
  
  const keyboard = new InlineKeyboard()
    .text("💳 Card", `pay_card_${depositId}`)
    .text("🏦 Bank", `pay_bank_${depositId}`)
    .row()
    .text("₿ Crypto", `pay_crypto_${depositId}`)
    .text("💰 P2P", `pay_p2p_${depositId}`);
  
  await ctx.reply(
    `💳 **Deposit Request Created**\n\n` +
    `Amount: **$${amount.toFixed(2)}**\n` +
    `ID: \`${depositId}\`\n\n` +
    `Select payment method:`,
    { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    }
  );
});

// /support - Contact support
bot.command("support", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("💬 Live Chat", "support_chat")
    .text("📧 Email Support", "support_email")
    .row()
    .text("📞 Call Support", "support_call")
    .text("🎫 Open Ticket", "support_ticket")
    .row()
    .text("❓ FAQ", "faq")
    .text("📚 Help Center", "help_center");
  
  await ctx.reply(
    `📞 **Customer Support**\n\n` +
    `We're here to help 24/7!\n\n` +
    `⏰ Average response time: < 5 minutes\n` +
    `🌍 Languages: English, Spanish, Chinese\n\n` +
    `How can we assist you today?`,
    { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    }
  );
});

/* ---------- Inline Keyboard Handlers ---------- */

bot.callbackQuery("balance", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from!.id;
  const profile = await getUserProfile(userId);
  
  await ctx.editMessageText(
    `💰 **Your Balance**\n\n` +
    `Available: **$${profile.balance.toFixed(2)}**\n` +
    `Pending: $${profile.pendingBalance.toFixed(2)}\n` +
    `Total Deposits: $${profile.totalDeposits.toFixed(2)}\n` +
    `Total Withdrawals: $${profile.totalWithdrawals.toFixed(2)}`,
    { parse_mode: "Markdown" }
  );
});

bot.callbackQuery(/deposit_(\d+)/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const amount = parseInt(ctx.match[1]);
  const depositId = await createDeposit(ctx.from!.id, amount);
  
  await ctx.editMessageText(
    `✅ **Deposit Request Created**\n\n` +
    `Amount: **$${amount}**\n` +
    `ID: \`${depositId}\`\n\n` +
    `Please send payment to:\n` +
    `\`3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5\`\n\n` +
    `Send screenshot when complete.`,
    { parse_mode: "Markdown" }
  );
});

bot.callbackQuery("support_ticket", async (ctx) => {
  await ctx.answerCallbackQuery();
  userStates.set(ctx.from!.id, { action: "creating_ticket" });
  
  await ctx.editMessageText(
    "🎫 **Create Support Ticket**\n\n" +
    "Please describe your issue in detail:",
    { parse_mode: "Markdown" }
  );
});

/* ---------- Message Handlers ---------- */

bot.on("message:text", async (ctx) => {
  const userId = ctx.from!.id;
  const state = userStates.get(userId);
  
  if (state?.action === "creating_ticket") {
    const ticketId = await createTicket(userId, ctx.message.text);
    userStates.delete(userId);
    
    await ctx.reply(
      `✅ **Ticket Created**\n\n` +
      `Ticket ID: \`${ticketId}\`\n` +
      `Status: Open\n\n` +
      `Our support team will respond within 30 minutes.`,
      { parse_mode: "Markdown" }
    );
    
    // Notify admin group
    if (ADMIN_GROUP) {
      await bot.api.sendMessage(
        ADMIN_GROUP,
        `🎫 **New Support Ticket**\n\n` +
        `From: @${ctx.from.username || ctx.from.first_name}\n` +
        `ID: \`${ticketId}\`\n\n` +
        `Message: ${ctx.message.text}`,
        { parse_mode: "Markdown" }
      );
    }
  }
});

/* ---------- Helper Functions ---------- */

async function getUserProfile(userId: number) {
  // This would connect to your database
  // For now, return mock data
  return {
    userId,
    balance: Math.random() * 1000,
    pendingBalance: Math.random() * 100,
    totalDeposits: Math.random() * 5000,
    totalWithdrawals: Math.random() * 3000,
    totalWagered: Math.random() * 10000,
    winRate: Math.random() * 0.6,
    level: ["Basic", "Silver", "Gold", "VIP"][Math.floor(Math.random() * 4)],
    joinedAt: "2024-01-15",
    verified: Math.random() > 0.5
  };
}

async function createDeposit(userId: number, amount: number) {
  const depositId = `DEP${Date.now()}`;
  await logEvent("deposit_created", { userId, amount, depositId });
  return depositId;
}

async function createTicket(userId: number, message: string) {
  const ticketId = `TKT${Date.now()}`;
  await logEvent("ticket_created", { userId, message, ticketId });
  return ticketId;
}

async function logEvent(type: string, data: any) {
  const event = {
    type,
    ...data,
    timestamp: new Date().toISOString()
  };
  await appendFile("data/bot_events.jsonl", JSON.stringify(event) + "\n");
}

/* ---------- Error Handler ---------- */

bot.catch((err) => {
  console.error("Bot error:", err);
});

/* ---------- Start Bot ---------- */

bot.start({
  onStart: (botInfo) => {
    console.log(`🔥 Fire Support CS Bot started!`);
    console.log(`👤 Username: @${botInfo.username}`);
    console.log(`🆔 Bot ID: ${botInfo.id}`);
    console.log(`✅ Ready to handle customer support`);
  },
});

console.log("Starting Fire Support CS Bot...");