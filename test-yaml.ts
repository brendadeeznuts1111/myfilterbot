// test-yaml.ts
import { z } from "zod";
import { stringify, parse } from "yaml";
import { existsSync, writeFileSync, readFileSync } from "fs";

/* ---------- 1. Schema ---------- */
const ConfigSchema = z.object({
  telegram: z.object({
    botToken: z.string().min(10),
    cashierBotToken: z.string().min(10),
    vipThreshold: z.number().positive(),
    depositMethods: z.array(z.string()),
    withdrawMethods: z.array(z.string()),
  }),
  commission: z.object({
    agent: z.number().min(0).max(1),
    master: z.number().min(0).max(1),
  }),
  tiers: z.record(z.string(), z.number()),
});

type Config = z.infer<typeof ConfigSchema>;

/* ---------- 2. Builder ---------- */
function buildDefault(): Config {
  return {
    telegram: {
      botToken: "123456:ABC",
      cashierBotToken: "654321:XYZ",
      vipThreshold: 500,
      depositMethods: ["stripe", "crypto", "paypal"],
      withdrawMethods: ["crypto", "paypal"],
    },
    commission: { agent: 0.05, master: 0.02 },
    tiers: { basic: 0, vip: 0.01 },
  };
}

/* ---------- 3. Save ---------- */
function save(path: string, cfg: Config) {
  const yaml = stringify(cfg, { indent: 2 });
  writeFileSync(path, yaml, "utf8");
  console.log("✅ Saved to", path);
}

/* ---------- 4. Load ---------- */
function load(path: string): Config {
  if (!existsSync(path)) {
    const cfg = buildDefault();
    save(path, cfg);
    return cfg;
  }
  const raw = readFileSync(path, "utf8");
  const parsed = ConfigSchema.parse(parse(raw));
  console.log("✅ Loaded from", path);
  return parsed;
}

/* ---------- 5. Round-trip test ---------- */
const path = "./config/test.yml";
const cfg = load(path);

// edit
cfg.telegram.vipThreshold = 1000;
cfg.tiers.super = 0.02;

save(path, cfg);

// reload
const cfg2 = load(path);
console.log("Round-trip OK:", cfg2.telegram.vipThreshold === 1000);