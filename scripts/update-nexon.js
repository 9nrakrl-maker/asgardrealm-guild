import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= paths =================
const DATA_DIR = path.resolve(__dirname, '../src/assets/data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const GUILD_FILE = path.join(DATA_DIR, 'guild.json');

// ================= helpers =================
function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ใช้เวลาไทย (UTC+7) → dd-mm-yyyy
function todayDMY() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = now.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// ================= fetch =================
async function fetchCharacter(name) {
  const url =
    'https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na'
    + '?type=overall&id=legendary&reboot_index=2&page_index=1'
    + `&character_name=${encodeURIComponent(name)}`;

  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0' }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!json?.ranks?.length) {
    throw new Error('character not found');
  }

  const r = json.ranks[0];

  return {
    name: r.characterName,
    level: r.level,
    exp: r.exp,
    job: r.jobName,
    img: r.characterImgURL
  };
}

// ================= main =================
async function main() {

  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }

  const guild = readJSON(GUILD_FILE, null);
  if (!guild || !Array.isArray(guild.members)) {
    throw new Error('guild.json invalid or members missing');
  }

  const today = todayDMY();
  const HISTORY_FILE = path.join(HISTORY_DIR, `${today}.json`);

  console.log('WRITE FILE =>', HISTORY_FILE);

  const historyToday = [];

  for (const name of guild.members) {
    try {
      const c = await fetchCharacter(name);

      console.log('Fetching:', name);

      // ❗ เขียน field แบบ explicit กันหลุด
      const record = {
        name: c.name,
        date: today,
        level: c.level,
        exp: c.exp,
        job: c.job,
        img: c.img,
        time: new Date().toISOString()
      };

      historyToday.push(record);

    } catch (e) {
      console.warn(`WARN ${name}:`, e.message);
    }

    // กัน rate limit
    await new Promise(r => setTimeout(r, 800));
  }

  // 🔍 log ตัวอย่างก่อนเขียนไฟล์
  console.log('[BEFORE WRITE SAMPLE]', historyToday[0]);

  writeJSON(HISTORY_FILE, historyToday);

  // 🔍 log หลังเขียนไฟล์ (อ่านกลับจาก disk)
  const verify = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  console.log('[AFTER WRITE SAMPLE]', verify[0]);

  console.log(`✅ Update complete (${today})`);
}

main().catch(err => {
  console.error('❌ Update failed:', err);
  process.exit(1);
});
