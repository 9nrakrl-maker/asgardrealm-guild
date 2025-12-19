// scripts/utils.js

export function parseProfile(html, world = "Bera") {
  let level = null;
  let exp = null;
  let job = null;

  /* ----------------------------------------
   * 1) META description (เสถียรสุด)
   *    <meta name="description"
   *     content="Misaè is a level 296 Night Lord in Bera.">
   * -------------------------------------- */
  const metaRegex = new RegExp(
    `content="[^"]*is a level (\\d+)\\s+(.+?)\\s+in\\s+${world}\\."`,
    "i"
  );
  const metaMatch = html.match(metaRegex);

  if (metaMatch) {
    level = Number(metaMatch[1]);
    job = metaMatch[2].trim();
  }

  /* ----------------------------------------
   * 2) EXP % (ถ้า HTML มี)
   *    <div>Lv. 296 (58.881%)</div>
   * -------------------------------------- */
  const expMatch = html.match(/Lv\.\s*\d+\s*\(([\d.]+)%\)/);
  if (expMatch) {
    exp = Number(expMatch[1]);
  }

  return {
    level,
    exp,   // อาจเป็น null
    job,   // อาจเป็น null
    valid: Boolean(level),
  };
}
