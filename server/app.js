import express from "express";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const app = express();

app.use((_, res, next) => {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
});

app.options("*", (_, res) => {
  res.status(204).end();
});

app.get("/api/codechef-card", async (req, res) => {
  const username = typeof req.query.username === "string" ? req.query.username.trim() : "";

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    console.log(`Fetching CodeChef stats for ${username}`);
    const profile = await fetchProfile(username);
    const svg = generateSVG(profile);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(svg);
  } catch (error) {
    console.error("codechef-card error:", error);
    const status = typeof error.status === "number" ? error.status : 500;
    const message = status === 404 ? "Profile not found" : "Internal server error";
    return res.status(status).json({ error: message });
  }
});

app.get("/", (_, res) => {
  res.json({
    ok: true,
    message: "CodeChef stats card API is running",
    endpoint: "/api/codechef-card?username=<handle>",
  });
});

async function fetchProfile(username) {
  const response = await fetch(`https://www.codechef.com/users/${encodeURIComponent(username)}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    const error = new Error(`Failed to fetch profile (${response.status})`);
    error.status = response.status;
    throw error;
  }

  const html = await response.text();
  const profile = parseProfile(html, username);
  const recentActivity = await fetchRecentActivity(username);
  return { ...profile, recentActivity };
}

async function fetchRecentActivity(username) {
  try {
    const response = await fetch(
      `https://www.codechef.com/recent/user?user_handle=${encodeURIComponent(username)}`,
      {
        headers: { "User-Agent": USER_AGENT },
      }
    );
    if (!response.ok) return [];
    const raw = await response.text();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
    const content = payload && typeof payload.content === "string" ? payload.content : raw;
    return parseRecentActivity(content);
  } catch {
    return [];
  }
}

function parseProfile(html, username) {
  const displayName =
    extractText(html, /<h1 class="h2-style">([^<]+)<\/h1>/i) ||
    extractText(html, /og:title" content="[^|]+\|\s*CodeChef User Profile for ([^|]+)\s*\|/i) ||
    username;

  const country = extractText(html, /class="user-country-name"[^>]*>([^<]+)</i) || "Unknown";
  const countryCode = extractText(html, /class="user-country-flag"[^>]*title="([^"]+)"/i);
  const profileImage =
    extractText(html, /class=['"]profileImage['"][^>]*src=['"]([^'"]+)['"]/i) || null;
  const totalSolved = extractNumber(html, /Total Problems Solved:\s*([0-9,]+)/i);
  const badgeCount = (html.match(/class=['"]badge['"]/gi) || []).length;
  const contests = extractNumber(html, /No\.\s*of Contests Participated:\s*<b>([0-9,]+)/i);
  const profession = extractLabelValue(html, "Student/Professional");
  const organization = extractLabelValue(html, "Organisation");
  const plan = extractLabelValue(html, "CodeChef Pro Plan");
  const submissionStats = extractSubmissionStats(html);

  return {
    username,
    displayName,
    country,
    countryCode,
    profileImage,
    totalSolved,
    badgeCount,
    contests,
    profession,
    organization,
    plan,
    submissionStats,
  };
}

function parseRecentActivity(content) {
  if (!content) return [];
  if (/No Recent Activity/i.test(content)) return [];
  const rows = content.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const items = [];
  for (const row of rows) {
    if (/No Recent Activity/i.test(row)) continue;
    const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
    if (cells.length < 4) continue;
    const time = normalizeWhitespace(stripTags(cells[0]));
    const problemCell = cells[1];
    const problemMatch = problemCell.match(/\/problems\/([^"'>]+)/i);
    const problem = normalizeWhitespace(stripTags(problemCell));
    const result = normalizeWhitespace(stripTags(cells[2]));
    const lang = normalizeWhitespace(stripTags(cells[3]));
    const solutionCell = cells[4] ?? "";
    const solutionMatch = solutionCell.match(/href="([^"]+)"/i);
    const solutionUrl = solutionMatch
      ? new URL(solutionMatch[1], "https://www.codechef.com").toString()
      : null;
    if (!time && !problem) continue;
    items.push({
      time: time || "N/A",
      problem: problemMatch ? problemMatch[1] : problem,
      result: result || "N/A",
      lang: lang || "N/A",
      solutionUrl,
    });
  }
  return items;
}

function extractText(html, regex) {
  const match = html.match(regex);
  if (!match) return null;
  return decodeHtml(match[1]).trim();
}

function extractNumber(html, regex) {
  const match = html.match(regex);
  if (!match) return null;
  const value = match[1].replace(/,/g, "");
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function extractLabelValue(html, label) {
  const safeLabel = escapeRegExp(label);
  const regex = new RegExp(`<label>${safeLabel}:</label>\\s*<span>([\\s\\S]*?)</span>`, "i");
  const match = html.match(regex);
  if (!match) return null;
  return decodeHtml(stripTags(match[1])).replace(/\s+/g, " ").trim();
}

function extractSubmissionStats(html) {
  const match = html.match(/var\s+userDailySubmissionsStats\s*=\s*(\[[\s\S]*?\]);/i);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    let total = 0;
    let activeDays = 0;
    for (const entry of data) {
      const value = Number(entry?.value ?? 0);
      if (!Number.isNaN(value)) {
        total += value;
        if (value > 0) activeDays += 1;
      }
    }
    return { total, activeDays };
  } catch {
    return null;
  }
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, "");
}

function normalizeWhitespace(value) {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function truncateText(value, maxLength) {
  const text = String(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function formatTimeShort(value) {
  const text = String(value);
  const match = text.match(/(\d{1,2}:\d{2}\s*[AP]M)\s+(\d{1,2}\/\d{1,2}\/\d{2})/i);
  if (!match) return truncateText(text, 12);
  return `${match[1]} ${match[2]}`;
}


function generateSVG(profile) {
  const width = 540;
  const height = 390;

  const name = escapeXml(profile.displayName);
  const handle = escapeXml(profile.username);
  const country = escapeXml(profile.country);
  const solved = profile.totalSolved ?? "N/A";
  const badges = profile.badgeCount ?? 0;
  const recentActivity = Array.isArray(profile.recentActivity)
    ? profile.recentActivity.slice(0, 4)
    : [];

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="card-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1f2937" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#f97316" />
        </linearGradient>
        <filter id="soft-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <rect width="${width}" height="${height}" rx="16" fill="url(#card-bg)"/>
      <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="14" fill="rgba(255,255,255,0.03)" stroke="#334155" stroke-width="1"/>
      <rect x="0" y="0" width="${width}" height="4" fill="url(#accent)" filter="url(#soft-glow)"/>

      <text x="28" y="40" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="700" fill="#ffffff">
        ${name}
      </text>
      <text x="28" y="60" font-family="'Segoe UI', sans-serif" font-size="11" fill="#cbd5f5">
        @${handle} - ${country}
      </text>

      <g transform="translate(28, 78)">
        ${renderStatBox("Solved", solved, 0, 0)}
        ${renderStatBox("Badges", badges, 252, 0)}
      </g>

      <line x1="28" y1="210" x2="${width - 28}" y2="210" stroke="rgba(148, 163, 184, 0.25)"/>
      <text x="28" y="230" font-family="'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#e2e8f0">
        Recent Activity
      </text>
      ${renderRecentActivity(recentActivity, width)}

      <text x="${width - 24}" y="${height - 12}" text-anchor="end" font-family="'Segoe UI', sans-serif" font-size="10" fill="#94a3b8">
        CodeChef Stats Card
      </text>
    </svg>
  `;
}

function renderStatBox(label, value, x, y) {
  return `
    <g transform="translate(${x}, ${y})">
      <rect width="240" height="58" rx="10" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(148, 163, 184, 0.2)" stroke-width="1"/>
      <text x="16" y="22" font-family="'Segoe UI', sans-serif" font-size="11" fill="#cbd5f5" letter-spacing="0.4">
        ${escapeXml(label)}
      </text>
      <text x="16" y="42" font-family="'Segoe UI', sans-serif" font-size="20" font-weight="700" fill="#f8fafc">
        ${escapeXml(value)}
      </text>
    </g>
  `;
}

function renderRecentActivity(items, width) {
  const header = `
    <text x="28" y="252" font-family="'Segoe UI', sans-serif" font-size="10" fill="#94a3b8" letter-spacing="0.4">
      Time
    </text>
    <text x="140" y="252" font-family="'Segoe UI', sans-serif" font-size="10" fill="#94a3b8" letter-spacing="0.4">
      Problem
    </text>
    <text x="250" y="252" font-family="'Segoe UI', sans-serif" font-size="10" fill="#94a3b8" letter-spacing="0.4">
      Result
    </text>
    <text x="330" y="252" font-family="'Segoe UI', sans-serif" font-size="10" fill="#94a3b8" letter-spacing="0.4">
      Lang
    </text>
    <text x="${width - 28}" y="252" text-anchor="end" font-family="'Segoe UI', sans-serif" font-size="10" fill="#94a3b8" letter-spacing="0.4">
      Solution
    </text>
  `;

  if (!items || items.length === 0) {
    return `
      ${header}
      <text x="28" y="268" font-family="'Segoe UI', sans-serif" font-size="12" fill="#cbd5f5">
        No recent activity
      </text>
    `;
  }

  return (
    header +
    items
    .map((item, index) => {
      const y = 268 + index * 20;
      const time = formatTimeShort(item.time);
      const problem = truncateText(item.problem, 12);
      const result = truncateText(item.result, 8);
      const lang = truncateText(item.lang, 6);
      return `
        <text x="28" y="${y}" font-family="'Segoe UI', sans-serif" font-size="11" fill="#e2e8f0">
          ${escapeXml(time)}
        </text>
        <text x="140" y="${y}" font-family="'Segoe UI', sans-serif" font-size="11" fill="#e2e8f0">
          ${escapeXml(problem)}
        </text>
        <text x="250" y="${y}" font-family="'Segoe UI', sans-serif" font-size="11" fill="#e2e8f0">
          ${escapeXml(result)}
        </text>
        <text x="330" y="${y}" font-family="'Segoe UI', sans-serif" font-size="11" fill="#e2e8f0">
          ${escapeXml(lang)}
        </text>
        ${
          item.solutionUrl
            ? `<a xlink:href="${escapeXml(item.solutionUrl)}" target="_blank">
        <text x="${width - 28}" y="${y}" text-anchor="end" font-family="'Segoe UI', sans-serif" font-size="10" fill="#93c5fd">
          View
        </text>
      </a>`
            : `<text x="${width - 28}" y="${y}" text-anchor="end" font-family="'Segoe UI', sans-serif" font-size="10" fill="#94a3b8">
          View
        </text>`
        }
      `;
    })
    .join("")
  );
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default app;
