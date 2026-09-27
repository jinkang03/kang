const MAX_VISITORS = 80;
const DEDUPE_MS = 10 * 60 * 1000;

function allowedOrigin(origin) {
  if (origin === "https://jinkang03.github.io") return origin;
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin || "")) return origin;
  return "";
}

function json(data, status, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  const allow = allowedOrigin(origin);
  if (allow) {
    headers["Access-Control-Allow-Origin"] = allow;
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function validIp(ip) {
  return typeof ip === "string" && /^[0-9a-fA-F:.]+$/.test(ip) && ip.length >= 3 && ip.length <= 64;
}

function clip(value) {
  return String(value || "").replace(/[\u0000-\u001f]/g, "").slice(0, 120);
}

function countryName(code, locale) {
  if (!code) return "";
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) || "";
  } catch (e) {
    return "";
  }
}

function place(cf) {
  const code = clip(cf && cf.country);
  const region = clip(cf && cf.region);
  const city = clip(cf && cf.city);
  const country = countryName(code, "en");
  const countryZh = countryName(code, "zh-CN");
  const en = [];
  const zh = [];
  if (country) en.push(country);
  if (region && region !== city) en.push(region);
  if (city) en.push(city);
  if (countryZh) zh.push(countryZh);
  if (region && region !== city) zh.push(region);
  if (city) zh.push(city);
  return {
    country,
    country_code: code,
    region,
    city,
    isp: clip(cf && cf.asOrganization),
    locEn: en.join(" · "),
    locZh: zh.join(" · "),
  };
}

function rowOut(row) {
  return {
    ip: row.ip,
    ts: String(row.ts),
    country: row.country || "",
    country_code: row.country_code || "",
    region: row.region || "",
    city: row.city || "",
    isp: row.isp || "",
    locEn: row.loc_en || "",
    locZh: row.loc_zh || "",
  };
}

async function listVisitors(db) {
  const result = await db.prepare(
    "SELECT ip, ts, country, country_code, region, city, isp, loc_en, loc_zh FROM visitors ORDER BY ts DESC LIMIT ?"
  ).bind(MAX_VISITORS).all();
  return (result.results || []).filter((row) => validIp(row.ip)).map(rowOut);
}

async function recordVisit(db, ip, cf) {
  let now = Date.now();
  const latest = await db.prepare(
    "SELECT ts FROM visitors WHERE ip = ? ORDER BY ts DESC LIMIT 1"
  ).bind(ip).first();
  const where = place(cf);
  if (latest && now - Number(latest.ts) < DEDUPE_MS) {
    now = Number(latest.ts);
  } else {
    await db.prepare(
      "INSERT INTO visitors (ip, ts, country, country_code, region, city, isp, loc_en, loc_zh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      ip,
      now,
      where.country,
      where.country_code,
      where.region,
      where.city,
      where.isp,
      where.locEn,
      where.locZh
    ).run();
    await db.prepare(
      "DELETE FROM visitors WHERE id NOT IN (SELECT id FROM visitors ORDER BY ts DESC LIMIT ?)"
    ).bind(MAX_VISITORS).run();
  }
  return { ip, ts: String(now), ...where };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (origin && !allowedOrigin(origin)) return json({ error: "origin" }, 403, origin);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin(origin) || "https://jinkang03.github.io",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    }

    const path = new URL(request.url).pathname;
    if (path !== "/" && path !== "/visitors") return json({ error: "not found" }, 404, origin);

    try {
      if (request.method === "GET") {
        return json({ visitors: await listVisitors(env.DB) }, 200, origin);
      }
      if (request.method === "POST") {
        const ip = request.headers.get("CF-Connecting-IP") || "";
        if (!validIp(ip)) return json({ error: "no ip" }, 400, origin);
        const you = await recordVisit(env.DB, ip, request.cf || {});
        const visitors = await listVisitors(env.DB);
        return json({ you, visitors }, 200, origin);
      }
    } catch (e) {
      return json({ error: "store" }, 500, origin);
    }
    return json({ error: "method" }, 405, origin);
  },
};
