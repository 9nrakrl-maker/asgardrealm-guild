import fs from "fs";
import fetch from "node-fetch";
import { parseCharacter } from "./utils.js";
import { notifyLevelUp } from "./discord.js";
import { sendDailyReport } from "./report.js";


const DATA_PATH = "src/assets/data";
const GUILD_FILE = `${DATA_PATH}/guild.json`;
const CURRENT_FILE = `${DATA_PATH}/current.json`;
const HISTORY_FILE = `${DATA_PATH}/history.json`;
const STATE_FILE = "scripts/state.json";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadJSON(path, def) {
  if (!fs.existsSync(path)) return def;
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

async function fingerprintPage() {
  const res = await fetch("https://mapleranks.com/u/NrkDARK", { headers: HEADERS });
  const html = await res.text();

  // ใช้ level + text length เป็น fingerprint คร่าว ๆ
  const level = html.match(/Level[^0-9]{0,15}(\d{1,3})/i)?.[1] ?? "";
  return `${level}-${html.length}`;
}

async function run() {
  const state = loadJSON(STATE_FILE, {});
  const currentFingerprint = await fingerprintPage();

  // 🔒 ถ้า MapleRanks ยังไม่เปลี่ยนทั้งเว็บ → ข้าม
  if (state.fingerprint === currentFingerprint) {
    console.log("⏭ MapleRanks not updated. Skip all.");
    return;
  }

  state.fingerprint = currentFingerprint;
  state.lastChecked = new Date().toISOString();

  const guild = loadJSON(GUILD_FILE, { members: [] });
  const prevCurrent = loadJSON(CURRENT_FILE, []);
  const history = loadJSON(HISTORY_FILE, []);

  const prevMap = new Map(prevCurrent.map(c => [c.name, c]));
  const nextCurrent = [];
  const changes = [];

  console.log("Members:", guild.members.length);

  for (const name of guild.members) {
    console.log("Fetching:", name);

    try {
      const res = await fetch(
        `https://mapleranks.com/u/${encodeURIComponent(name)}`,
        { headers: HEADERS }
      );

      const html = await res.text();
      const parsed = parseCharacter(name, html);
      if (!parsed.level) continue;

      const now = {
        name,
        level: parsed.level,
        job: parsed.job,
        updated: new Date().toISOString()
      };

      nextCurrent.push(now);

      const prev = prevMap.get(name);
      if (!prev || prev.level !== now.level) {
        history.push({
          name,
          level: now.level,
          time: now.updated
        });
        changes.push(now);
      }

      await sleep(3000);
    } catch (e) {
      console.error("Error:", name, e.message);
    }
  }

  if (changes.length === 0) {
    console.log("ℹ No character level changed.");
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    return;
  }

  fs.writeFileSync(CURRENT_FILE, JSON.stringify(nextCurrent, null, 2));
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  await notifyLevelUp(changes);

  console.log(`✅ Updated ${changes.length} characters`);
}

await notifyLevelUp(changes);
await sendDailyReport(changes, guild.members.length);

run();
