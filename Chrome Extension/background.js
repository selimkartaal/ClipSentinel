console.log("[ClipSentinel] background.js loaded");

const USAGE_KEY    = "clipsentinel_daily_usage_v1";
const SETTINGS_KEY = "clipsentinel_settings_v1";
const BLOCK_KEY    = "clipsentinel_block_state_v1";
const COPY_KEY     = "clipsentinel_copy_counter_v1";

const DEFAULT_SETTINGS = {
  discoveryUrl: "http://127.0.0.1:5000",
  language: "TR",
  dailyLimit: 10,
  siteRules: {},
  blockSteps: [1, 5, 10, 30, 60, 480, -1],
  counterResetMinutes: 1,
  copyThreshold: 5
};

const ADMIN_PASSWORD_SHA256 = // Password1234!!
  "7d9505a0415607f7a66dfabcf7571d63e170cdb004b15aa0ab1eddc2149c8b86";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function isAdminPasswordOk(pw) {
  if (!ADMIN_PASSWORD_SHA256) return false;
  return (await sha256Hex(String(pw ?? ""))) === ADMIN_PASSWORD_SHA256;
}

async function getSettings() {
  const res = await chrome.storage.local.get([SETTINGS_KEY]);
  return { ...DEFAULT_SETTINGS, ...(res?.[SETTINGS_KEY] || {}) };
}

async function setSettings(newSettings) {
  const cur    = await getSettings();
  const merged = { ...cur, ...newSettings };
  await chrome.storage.local.set({ [SETTINGS_KEY]: merged });
  return merged;
}

// ─── Block State ──────────────────────────────────────────────────────────────
async function getBlockState() {
  const res = await chrome.storage.local.get([BLOCK_KEY]);
  return res?.[BLOCK_KEY] || {};
}

async function setBlockState(state) {
  await chrome.storage.local.set({ [BLOCK_KEY]: state });
}

async function checkBlocked(hostname) {
  const state = await getBlockState();
  const entry = state[hostname];
  if (!entry) return { blocked: false };
  if (entry.permanent) return { blocked: true, permanent: true };
  if (entry.blockedUntil && Date.now() < entry.blockedUntil) {
    return {
      blocked: true,
      permanent: false,
      remainingSeconds: Math.ceil((entry.blockedUntil - Date.now()) / 1000)
    };
  }
  return { blocked: false };
}

async function escalateBlock(hostname) {
  const settings = await getSettings();
  const steps    = settings.blockSteps || DEFAULT_SETTINGS.blockSteps;
  const state    = await getBlockState();
  const entry    = state[hostname] || { stepIndex: -1 };

  const nextStep  = (entry.stepIndex ?? -1) + 1;
  const stepVal   = steps[Math.min(nextStep, steps.length - 1)];
  const permanent = stepVal === -1;

  state[hostname] = {
    stepIndex:    nextStep,
    blockedUntil: permanent ? null : Date.now() + stepVal * 60 * 1000,
    permanent
  };

  await setBlockState(state);
  return { stepIndex: nextStep, stepVal, permanent };
}

async function resetBlock(hostname) {
  const state = await getBlockState();
  delete state[hostname];
  await setBlockState(state);
}

// ─── Copy Counter ─────────────────────────────────────────────────────────────
async function getCopyCounter() {
  const res = await chrome.storage.local.get([COPY_KEY]);
  return res?.[COPY_KEY] || {};
}

async function setCopyCounter(counter) {
  await chrome.storage.local.set({ [COPY_KEY]: counter });
}

async function incrementCopyCounter(hostname) {
  const settings  = await getSettings();
  const threshold = settings.copyThreshold       || DEFAULT_SETTINGS.copyThreshold;
  const resetMs   = (settings.counterResetMinutes || DEFAULT_SETTINGS.counterResetMinutes) * 60 * 1000;

  const counter = await getCopyCounter();
  const entry   = counter[hostname] || { count: 0, firstTs: Date.now() };

  if (Date.now() - entry.firstTs > resetMs) {
    entry.count   = 0;
    entry.firstTs = Date.now();
  }

  entry.count += 1;
  counter[hostname] = entry;
  await setCopyCounter(counter);

  if (entry.count >= threshold) {
    counter[hostname] = { count: 0, firstTs: Date.now() };
    await setCopyCounter(counter);
    return true;
  }
  return false;
}

// ─── Dynamic Content Script Yönetimi ─────────────────────────────────────────
const CS_ID_PREFIX = "clipsentinel_cs_";

function siteToId(hostname) {
  return CS_ID_PREFIX + hostname.replace(/[^a-zA-Z0-9]/g, "_");
}

async function registerSite(hostname) {
  const id = siteToId(hostname);
  const matches = [
    `https://${hostname}/*`,
    `http://${hostname}/*`,
    `https://*.${hostname}/*`,
    `http://*.${hostname}/*`
  ];
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [id] }).catch(() => {});
    await chrome.scripting.registerContentScripts([{
      id,
      matches,
      js: ["content.js"],
      runAt: "document_start",
      allFrames: true
    }]);
    console.log(`[ClipSentinel] Registered: ${hostname}`);
  } catch (err) {
    console.error(`[ClipSentinel] Register failed for ${hostname}:`, err);
  }
}

async function unregisterSite(hostname) {
  const id = siteToId(hostname);
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [id] });
    console.log(`[ClipSentinel] Unregistered: ${hostname}`);
  } catch (err) {
    console.warn(`[ClipSentinel] Unregister failed for ${hostname}:`, err);
  }
}

async function syncContentScripts() {
  const settings  = await getSettings();
  const siteRules = settings.siteRules || {};
  const hostnames = Object.keys(siteRules);
  const registered = await chrome.scripting.getRegisteredContentScripts();

  for (const hostname of hostnames) {
    await registerSite(hostname);
  }

  for (const script of registered) {
    if (!script.id.startsWith(CS_ID_PREFIX)) continue;
    const stillExists = hostnames.some(h => siteToId(h) === script.id);
    if (!stillExists) {
      await chrome.scripting.unregisterContentScripts({ ids: [script.id] }).catch(() => {});
      console.log(`[ClipSentinel] Removed stale script: ${script.id}`);
    }
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[ClipSentinel] onInstalled →", details.reason);

  if (details.reason === "install") {
    const existing = await chrome.storage.local.get([SETTINGS_KEY]);
    if (!existing[SETTINGS_KEY]) {
      const defaultSiteRules = {
        "chatgpt.com":       { canCopy: false, canPaste: true,  stealthCopy: false },
        "claude.ai":         { canCopy: false, canPaste: true,  stealthCopy: false },
        "crm.company.com":   { canCopy: true,  canPaste: false, stealthCopy: false },
        "gemini.google.com": { canCopy: false, canPaste: true,  stealthCopy: false },
        "perplexity.ai":     { canCopy: false, canPaste: true,  stealthCopy: false }
      };
      await chrome.storage.local.set({
        [SETTINGS_KEY]: { ...DEFAULT_SETTINGS, siteRules: defaultSiteRules }
      });
      console.log("[ClipSentinel] Default settings yazildi.");
    }
  }

  await syncContentScripts();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log("[ClipSentinel] onStartup → syncing content scripts");
  await syncContentScripts();
});

// ─── Discovery ────────────────────────────────────────────────────────────────
let _cachedDataUrl = null;
let _cacheTime     = 0;
const CACHE_TTL_MS = 30_000;

async function resolveDataEndpoint(discoveryUrl) {
  const now = Date.now();
  if (_cachedDataUrl && (now - _cacheTime) < CACHE_TTL_MS) return _cachedDataUrl;
  try {
    const res  = await fetch(discoveryUrl.replace(/\/+$/, "") + "/info");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const info = await res.json();
    if (!info.dataPort) throw new Error("dataPort bulunamadi");
    const url  = new URL(discoveryUrl);
    url.port   = String(info.dataPort);
    url.pathname = "/clipboard";
    _cachedDataUrl = url.toString();
    _cacheTime     = now;
    return _cachedDataUrl;
  } catch (err) {
    console.warn("[ClipSentinel] Discovery basarisiz:", err.message);
    try {
      const url    = new URL(discoveryUrl);
      url.port     = "5001";
      url.pathname = "/clipboard";
      return url.toString();
    } catch { return "http://127.0.0.1:5001/clipboard"; }
  }
}

// ─── Backend Log Gönder ───────────────────────────────────────────────────────
async function sendLog(payload) {
  try {
    const settings = await getSettings();
    const endpoint = await resolveDataEndpoint(settings.discoveryUrl);
    fetch(endpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {});
  } catch (err) {
    console.warn("[ClipSentinel] sendLog hatasi:", err);
  }
}

// ─── Message Handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {

      if (msg?.type === "GET_SETTINGS") {
        return sendResponse({ ok: true, settings: await getSettings() });
      }

      if (msg?.type === "ADMIN_VERIFY") {
        return sendResponse({ ok: await isAdminPasswordOk(msg.password) });
      }

      if (msg?.type === "ADMIN_RESET_TOKENS") {
        if (!await isAdminPasswordOk(msg.password))
          return sendResponse({ ok: false, error: "WRONG_PASSWORD" });
        await chrome.storage.local.remove([USAGE_KEY]);
        return sendResponse({ ok: true });
      }

      if (msg?.type === "ADMIN_SET_SETTINGS") {
        if (!await isAdminPasswordOk(msg.password))
          return sendResponse({ ok: false, error: "WRONG_PASSWORD" });

        const s     = msg.settings || {};
        const patch = {};

        if (typeof s.discoveryUrl === "string") {
          patch.discoveryUrl = s.discoveryUrl.trim();
          _cachedDataUrl = null;
          _cacheTime     = 0;
        }
        if (["TR","EN","DE"].includes(s.language))           patch.language            = s.language;
        if (Number.isFinite(Number(s.dailyLimit)))           patch.dailyLimit          = Number(s.dailyLimit);
        if (s.siteRules && typeof s.siteRules === "object")  patch.siteRules           = s.siteRules;
        if (Array.isArray(s.blockSteps))                     patch.blockSteps          = s.blockSteps;
        if (Number.isFinite(Number(s.counterResetMinutes)))  patch.counterResetMinutes = Number(s.counterResetMinutes);
        if (Number.isFinite(Number(s.copyThreshold)))        patch.copyThreshold       = Number(s.copyThreshold);

        const updated = await setSettings(patch);
        return sendResponse({ ok: true, settings: updated });
      }

      if (msg?.type === "ADMIN_RESET_BLOCK") {
        if (!await isAdminPasswordOk(msg.password))
          return sendResponse({ ok: false, error: "WRONG_PASSWORD" });
        await resetBlock(msg.hostname);
        return sendResponse({ ok: true });
      }

      if (msg?.type === "CHECK_BLOCK") {
        const result = await checkBlocked(msg.hostname);
        return sendResponse({ ok: true, ...result });
      }

      if (msg?.type === "COPY_EVENT") {
        const hostname     = msg.hostname;
        const thresholdHit = await incrementCopyCounter(hostname);

        if (thresholdHit) {
          const escalation = await escalateBlock(hostname);

          // Tab'lara blok bildir
          const tabs = await chrome.tabs.query({});
          for (const tab of tabs) {
            try {
              chrome.tabs.sendMessage(tab.id, {
                type: "BLOCK_APPLIED",
                hostname,
                ...escalation
              });
            } catch {}
          }

          // Blok olayını backend'e logla
          const blockLabel = escalation.permanent
            ? "permanent"
            : `${escalation.stepVal}min`;

          await sendLog({
            act:     "copy_threshold_block",
            type:    "text",
            mime:    "text/plain",
            data:    `Block applied: step=${escalation.stepIndex} duration=${blockLabel}`,
            pageUrl: msg.pageUrl ?? null
          });

          console.log(`[ClipSentinel] Threshold block → ${hostname} | step=${escalation.stepIndex} | ${blockLabel}`);
        }

        // Normal copy logu
        await sendLog({
          act:     "copy",
          type:    msg.clipType || "text",
          mime:    msg.mime     || "text/plain",
          data:    msg.data     ?? "",
          pageUrl: msg.pageUrl  ?? null
        });

        return sendResponse({ ok: true, thresholdHit });
      }

      if (msg?.type === "SEND_CLIPBOARD") {
        await sendLog({
          act:     msg.act      || "paste",
          type:    msg.clipType || "text",
          mime:    msg.mime     || "text/plain",
          data:    msg.data     ?? "",
          pageUrl: sender?.tab?.url ?? null
        });
        return sendResponse({ ok: true });
      }

      return sendResponse({ ok: false, error: "UNKNOWN_MESSAGE" });

    } catch (err) {
      console.error("[ClipSentinel] Error:", err);
      return sendResponse({ ok: false, error: String(err) });
    }
  })();
  return true;
});

// ─── Storage değişince content script'leri sync et ───────────────────────────
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local" || !changes[SETTINGS_KEY]) return;

  const oldRules = changes[SETTINGS_KEY].oldValue?.siteRules || {};
  const newRules = changes[SETTINGS_KEY].newValue?.siteRules || {};
  const oldHosts = new Set(Object.keys(oldRules));
  const newHosts = new Set(Object.keys(newRules));

  for (const h of newHosts) {
    if (!oldHosts.has(h)) await registerSite(h);
  }
  for (const h of oldHosts) {
    if (!newHosts.has(h)) await unregisterSite(h);
  }
});