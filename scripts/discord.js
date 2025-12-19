import fetch from "node-fetch";

export async function notifyLevelUp(changes) {
  if (!process.env.DISCORD_WEBHOOK || changes.length === 0) return;

  const content = changes
    .map(c => `⬆ **${c.name}** → Lv.${c.level}`)
    .join("\n");

  await fetch(process.env.DISCORD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content:
        `🛡️ **AsgardRealm Guild – Level Up!**\n\n${content}`
    })
  });
}
