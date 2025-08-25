import { Bot } from "grammy";
import { readFile, appendFile } from "fs/promises";

const bot = new Bot(process.env.BOT_TOKEN!);

/* ---------- Profile Management ---------- */

async function getCustomerProfile(tgId: number) {
  try {
    const data = await readFile("data/customer_profiles.jsonl", "utf-8");
    const profiles = data.trim().split("\n").map(line => JSON.parse(line));
    return profiles.find(p => p.tgId === tgId) || {
      tgId,
      balance: 0,
      level: "basic",
      tags: [],
      deposits: 0,
      withdrawals: 0,
      totalWagered: 0,
      winRate: 0
    };
  } catch {
    return {
      tgId,
      balance: 0,
      level: "basic",
      tags: [],
      deposits: 0,
      withdrawals: 0,
      totalWagered: 0,
      winRate: 0
    };
  }
}

async function addTag(tgId: number, tag: string) {
  const profile = await getCustomerProfile(tgId);
  if (!profile.tags.includes(tag)) {
    profile.tags.push(tag);
    await appendFile("data/customer_profiles.jsonl", JSON.stringify(profile) + "\n");
  }
  return profile;
}

/* ---------- Bot Commands ---------- */

// /profile – view profile
bot.command("profile", async (ctx) => {
  const profile = await getCustomerProfile(ctx.from!.id);
  const level = profile.level.toUpperCase();
  const levelEmoji = {
    VIP: "👑",
    GOLD: "🥇",
    SILVER: "🥈",
    BASIC: "📊"
  }[level] || "📊";
  
  await ctx.reply(
    `${levelEmoji} **Your Profile**\n\n` +
    `💰 Balance: $${profile.balance.toFixed(2)}\n` +
    `📈 Level: ${level}\n` +
    `🎰 Total Wagered: $${profile.totalWagered.toFixed(2)}\n` +
    `📊 Win Rate: ${(profile.winRate * 100).toFixed(1)}%\n` +
    `🏷️ Tags: ${profile.tags.join(", ") || "None"}\n\n` +
    `Deposits: ${profile.deposits} | Withdrawals: ${profile.withdrawals}`,
    { parse_mode: "Markdown" }
  );
});

// /tag – add tag to profile
bot.command("tag", async (ctx) => {
  const [, tag] = ctx.message!.text!.split(" ");
  if (!tag) {
    await ctx.reply("Usage: /tag <tag_name>");
    return;
  }
  
  const profile = await addTag(ctx.from!.id, tag);
  await ctx.reply(`🏷️ Tag "${tag}" added to your profile.\nCurrent tags: ${profile.tags.join(", ")}`);
});

// /balance – quick balance check
bot.command("balance", async (ctx) => {
  const profile = await getCustomerProfile(ctx.from!.id);
  await ctx.reply(`💰 Your balance: $${profile.balance.toFixed(2)}`);
});

// /deposit – deposit request
bot.command("deposit", async (ctx) => {
  const [, amount, method] = ctx.message!.text!.split(" ");
  if (!amount) {
    await ctx.reply("Usage: /deposit <amount> [method]");
    return;
  }
  
  const depositData = {
    id: `dep_${Date.now()}`,
    user: ctx.from!.id,
    amount: parseFloat(amount),
    method: method || "card",
    status: "pending",
    timestamp: new Date().toISOString()
  };
  
  await appendFile("data/deposits.jsonl", JSON.stringify(depositData) + "\n");
  await ctx.reply(
    `✅ Deposit request received!\n\n` +
    `Amount: $${amount}\n` +
    `Method: ${method || "card"}\n` +
    `ID: ${depositData.id}\n\n` +
    `Please wait for confirmation.`
  );
});

// /withdraw – withdrawal request
bot.command("withdraw", async (ctx) => {
  const [, amount, method, address] = ctx.message!.text!.split(" ");
  if (!amount) {
    await ctx.reply("Usage: /withdraw <amount> [method] [address]");
    return;
  }
  
  const profile = await getCustomerProfile(ctx.from!.id);
  if (profile.balance < parseFloat(amount)) {
    await ctx.reply(`❌ Insufficient balance. Your balance: $${profile.balance.toFixed(2)}`);
    return;
  }
  
  const withdrawData = {
    id: `wit_${Date.now()}`,
    user: ctx.from!.id,
    amount: parseFloat(amount),
    method: method || "bank",
    address: address || "pending",
    status: "pending",
    timestamp: new Date().toISOString()
  };
  
  await appendFile("data/p2p_withdrawals.jsonl", JSON.stringify(withdrawData) + "\n");
  await ctx.reply(
    `✅ Withdrawal request received!\n\n` +
    `Amount: $${amount}\n` +
    `Method: ${method || "bank"}\n` +
    `ID: ${withdrawData.id}\n\n` +
    `Processing time: 1-3 business days.`
  );
});

// /help – show commands
bot.command("help", async (ctx) => {
  await ctx.reply(
    `📋 **Available Commands**\n\n` +
    `/profile - View your profile\n` +
    `/balance - Check balance\n` +
    `/deposit <amount> [method] - Request deposit\n` +
    `/withdraw <amount> [method] [address] - Request withdrawal\n` +
    `/tag <name> - Add tag to profile\n` +
    `/refer - Get referral link\n` +
    `/help - Show this message`,
    { parse_mode: "Markdown" }
  );
});

export { bot, getCustomerProfile, addTag };