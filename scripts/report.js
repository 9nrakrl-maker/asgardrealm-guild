import fetch from "node-fetch";

export async function sendDailyReport(changes, total) {
  if (!process.env.DISCORD_WEBHOOK) return;

  const body =
    changes.length === 0
      ? "😴 วันนี้ยังไม่มีใครเลเวลขึ้น"
      : changes.map(c => `⬆ ${c.name} → Lv.${c.level}`).join("\n");

  await fetch(process.env.DISCORD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content:
        `📊 **AsgardRealm Guild – Daily Report**\n` +
        `👥 Members: ${total}\n\n${body}`
    })
  });
}
