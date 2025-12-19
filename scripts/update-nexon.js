import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 data dir
const DATA_DIR = path.resolve(__dirname, '../src/assets/data');
const GUILD_FILE = path.join(DATA_DIR, 'guild.json');
const CURRENT_FILE = path.join(DATA_DIR, 'current.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// ---------- helpers ----------
function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error('JSON parse error:', file, e.message);
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ---------- fetch ----------
async function fetchCharacter(name) {
  const url =
    'https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na'
    + '?type=overall&id=legendary&reboot_index=2&page_index=1'
    + `&character_name=${encodeURIComponent(name)}`;

  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0' }
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

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

// ---------- main ----------
async function main() {
  console.log('DATA_DIR =', DATA_DIR);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const guild = readJSON(GUILD_FILE, null);
  if (!guild || !Array.isArray(guild.members)) {
    throw new Error('guild.json invalid or members missing');
  }

  const current = [];
  let history = readJSON(HISTORY_FILE, []);
  if (!Array.isArray(history)) history = [];

  const today = new Date().toISOString().slice(0, 10);

  for (const name of guild.members) {
    try {
      console.log('Fetching:', name);
      const c = await fetchCharacter(name);
      const time = new Date().toISOString();

      current.push({ ...c, time });
       history.push({
    name: c.name,
    date: today,
    level: c.level,
    exp: c.exp,
    time
  });

      // กัน rate limit
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      console.warn(`WARN: ${name} → ${e.message}`);
    }
  }

  writeJSON(CURRENT_FILE, current);
  writeJSON(HISTORY_FILE, history);

  console.log('✅ Update complete');
}

main();
