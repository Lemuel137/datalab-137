export function parseCsv(text: string): Record<string, string>[] {
  const rows = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (rows.length === 0) return [];
  const header = splitLine(rows[0]).map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const cells = splitLine(row);
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (cells[i] ?? "").trim();
    });
    return obj;
  });
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function normalizeInstagram(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/instagram\.com\/([A-Za-z0-9_.]+)/);
  if (m) return m[1].toLowerCase();
  const clean = raw.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9_.]+$/.test(clean) ? clean : null;
}

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
