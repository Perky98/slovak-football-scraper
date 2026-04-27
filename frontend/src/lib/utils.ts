export function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  const mon = Math.floor(diff / 2592000000);
  if (diff < 60000) return "práve teraz";
  if (min < 60) return `pred ${min} min`;
  if (hr === 1) return "pred hodinou";
  if (hr < 24) return `pred ${hr} hod`;
  if (day === 1) return "včera";
  if (day < 30) return `pred ${day} dňami`;
  if (mon === 1) return "pred mesiacom";
  if (mon < 12) return `pred ${mon} mes.`;
  return d.toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}
