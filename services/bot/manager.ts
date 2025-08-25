import { Bot } from "grammy";
import { appendFile } from "fs/promises";

const bot = new Bot(process.env.BOT_TOKEN!);
const ADMIN_GROUP = Number(process.env.ADMIN_GROUP);

/* ---------- Data ---------- */
const groups: Record<string, { id: number; name: string }> = {};
const referrals: Record<number, { inviter: number; count: number }> = {};

/* ---------- Helpers ---------- */
async function save(type: string, data: any) {
  await appendFile(`data/telegram_${type}.jsonl`, JSON.stringify(data) + "\n");
}

/* ---------- Commands ---------- */

// /start – onboarding
bot.command("start", async (ctx) => {
  const lang = ctx.from?.language_code ?? "en";
  await ctx.reply(
    `🎉 Welcome ${ctx.from?.first_name}!\nChoose language:\n/en /es /fr`,
  );
  await save("onboarding", { user: ctx.from!.id, lang });
});

// /refer – generate referral link
bot.command("refer", async (ctx) => {
  const link = `https://t.me/${bot.botInfo.username}?start=${ctx.from!.id}`;
  referrals[ctx.from!.id] = { inviter: ctx.from!.id, count: 0 };
  await ctx.reply(`🔗 Your referral link:\n${link}`);
});

// /add_group – admin adds group
bot.command("add_group", async (ctx) => {
  if (ctx.chat.id !== ADMIN_GROUP) return;
  const invite = ctx.message!.text!.split(" ")[1];
  const chat = await bot.api.getChat(invite);
  groups[chat.id] = { id: chat.id, name: chat.title! };
  await save("groups", { id: chat.id, name: chat.title });
  await ctx.reply(`✅ Added group ${chat.title}`);
});

// /role – assign role
bot.command("role", async (ctx) => {
  if (ctx.chat.id !== ADMIN_GROUP) return;
  const [, user, role] = ctx.message!.text!.split(" ");
  const member = await bot.api.getChatMember(ctx.chat.id, Number(user.replace("@", "")));
  await save("roles", { user: member.user.id, role });
  await ctx.reply(`🏷️ Role ${role} assigned to ${member.user.first_name}`);
});

// /broadcast – admin broadcast
bot.command("broadcast", async (ctx) => {
  if (ctx.chat.id !== ADMIN_GROUP) return;
  const msg = ctx.message!.text!.split(" ").slice(1).join(" ");
  for (const g of Object.values(groups)) {
    await bot.api.sendMessage(g.id, msg);
  }
  await ctx.reply("📢 Broadcast sent.");
});

/* ---------- Referral tracking ---------- */
bot.on("message", async (ctx) => {
  const ref = ctx.message?.text?.split(" ")[1];
  if (ref && Number(ref) && referrals[Number(ref)]) {
    referrals[Number(ref)].count++;
    await save("referrals", { inviter: Number(ref), count: referrals[Number(ref)].count });
  }
});

bot.start();
console.log("Manager bot started @", bot.botInfo.username);