export function parseCharacter(name, html) {
  const levelMatch =
    html.match(/Level[^0-9]{0,15}(\d{1,3})/i);

  const jobMatch =
    html.match(/level\s+\d+\s+([A-Za-z ]+?)\s+in/i);

  return {
    name,
    level: levelMatch ? Number(levelMatch[1]) : null,
    job: jobMatch ? jobMatch[1].trim() : "Unknown"
  };
}
