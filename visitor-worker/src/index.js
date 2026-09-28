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

function isPublicIp(ip) {
  if (!validIp(ip)) return false;
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v !== "::1" && !v.startsWith("fe80:") && !v.startsWith("fc") && !v.startsWith("fd");
  }
  const p = ip.split(".");
  if (p.length !== 4) return false;
  const n = p.map((part) => Number(part));
  if (n.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (n[0] === 0 || n[0] === 10 || n[0] === 127) return false;
  if (n[0] === 169 && n[1] === 254) return false;
  if (n[0] === 192 && n[1] === 168) return false;
  if (n[0] === 172 && n[1] >= 16 && n[1] <= 31) return false;
  if (n[0] >= 224) return false;
  return true;
}

function carrierName(addr) {
  const text = String(addr || "");
  if (text.includes("联通")) return "中国联通";
  if (text.includes("电信")) return "中国电信";
  if (text.includes("移动")) return "中国移动";
  if (text.includes("广电")) return "中国广电";
  return "";
}

async function lookupDomestic(ip) {
  try {
    const r = await fetch(
      "https://whois.pconline.com.cn/ipJson.jsp?json=true&ip=" + encodeURIComponent(ip),
      { headers: { "User-Agent": "kang-visitors" } }
    );
    const buf = await r.arrayBuffer();
    let text = "";
    try {
      text = new TextDecoder("gbk").decode(buf);
    } catch (e) {
      text = new TextDecoder().decode(buf);
    }
    const d = JSON.parse(text);
    if (d && d.ip === ip && d.pro && d.proCode && d.proCode !== "999999" && d.err !== "noprovince") {
      return {
        country: "CN",
        region: String(d.pro),
        city: String(d.city || ""),
        asOrganization: carrierName(d.addr),
      };
    }
  } catch (e) {}
  const geo = await lookupIp(ip);
  const code = String(geo.country || "").toUpperCase();
  if (code === "CN" || code === "HK" || code === "MO" || code === "TW") return geo;
  return null;
}

async function lookupIp(ip) {
  try {
    const r = await fetch("https://ipwho.is/" + encodeURIComponent(ip));
    const d = await r.json();
    if (d && d.success && d.country_code) {
      return {
        country: d.country_code,
        region: d.region || "",
        city: d.city || "",
        asOrganization: (d.connection && d.connection.isp) || "",
      };
    }
  } catch (e) {}
  try {
    const r = await fetch("https://ipapi.co/" + encodeURIComponent(ip) + "/json/");
    const d = await r.json();
    if (d && d.country_code && !d.error) {
      return {
        country: d.country_code,
        region: d.region || "",
        city: d.city || "",
        asOrganization: d.org || "",
      };
    }
  } catch (e) {}
  return {};
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
        let reportedIp = "";
        try {
          const text = await request.text();
          if (text) {
            const body = JSON.parse(text);
            if (body && typeof body.reportedIp === "string") reportedIp = body.reportedIp.trim();
          }
        } catch (e) {}
        const relaySecret = request.headers.get("X-Visitor-Secret") || "";
        const relayIp = request.headers.get("X-Visitor-Ip") || "";
        const fromRelay = !!(env.RELAY_SECRET && relaySecret === env.RELAY_SECRET && validIp(relayIp));
        const ip = fromRelay ? relayIp : (request.headers.get("CF-Connecting-IP") || "");
        if (!validIp(ip)) return json({ error: "no ip" }, 400, origin);
        const cf = fromRelay ? await lookupIp(ip) : (request.cf || {});
        let you = await recordVisit(env.DB, ip, cf);
        if (isPublicIp(reportedIp) && reportedIp !== ip) {
          const recent = await env.DB.prepare(
            "SELECT COUNT(*) AS n FROM visitors WHERE ts > ?"
          ).bind(Date.now() - 60 * 1000).first();
          if (Number(recent && recent.n) < 6) {
            const domestic = await lookupDomestic(reportedIp);
            if (domestic) you = await recordVisit(env.DB, reportedIp, domestic);
          }
        }
        const visitors = await listVisitors(env.DB);
        return json({ you, visitors }, 200, origin);
      }
    } catch (e) {
      return json({ error: "store" }, 500, origin);
    }
    return json({ error: "method" }, 405, origin);
  },
};
