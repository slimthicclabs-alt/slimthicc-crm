const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const root = __dirname;
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const storesFile = path.join(dataDir, "stores.json");
const startPort = Number(process.env.PORT || 4173);
const crmPasscode = process.env.CRM_PASSCODE || "";
let writeQueue = Promise.resolve();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(storesFile);
  } catch {
    await fs.writeFile(storesFile, "[]\n");
  }
}

async function readStores() {
  await ensureDataFile();
  const data = await fs.readFile(storesFile, "utf8");
  return JSON.parse(data || "[]");
}

async function writeStores(stores) {
  await ensureDataFile();
  const tempFile = `${storesFile}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(stores, null, 2)}\n`);
  await fs.rename(tempFile, storesFile);
}

function commonHeaders(extra = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    ...extra
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    ...commonHeaders(),
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function sameText(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(request) {
  if (!crmPasscode) return true;
  const header = request.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;

  try {
    const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
    const password = decoded.slice(decoded.indexOf(":") + 1);
    return sameText(password, crmPasscode);
  } catch {
    return false;
  }
}

function requestLogin(response) {
  response.writeHead(401, {
    ...commonHeaders(),
    "WWW-Authenticate": 'Basic realm="Slimthicc CRM"',
    "Content-Type": "text/plain; charset=utf-8"
  });
  response.end("Slimthicc CRM passcode required.");
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeStore(store) {
  return {
    id: normalizeText(store.id),
    name: normalizeText(store.name),
    contact: normalizeText(store.contact),
    email: normalizeText(store.email),
    phone: normalizeText(store.phone),
    city: normalizeText(store.city),
    region: normalizeText(store.region),
    stage: normalizeText(store.stage || "Prospect"),
    priority: normalizeText(store.priority || "Warm"),
    nextFollowUp: normalizeText(store.nextFollowUp),
    monthlyOrder: normalizeNumber(store.monthlyOrder),
    health: Math.max(0, Math.min(100, normalizeNumber(store.health, 70))),
    buyerType: normalizeText(store.buyerType || "Owner"),
    notes: normalizeText(store.notes),
    updatedAt: new Date().toISOString()
  };
}

function safeJsonParse(body) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function withWriteLock(work) {
  const nextWrite = writeQueue.then(work, work);
  writeQueue = nextWrite.catch(() => {});
  return nextWrite;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleApi(request, response, url) {
  if (url.pathname === "/healthz" && request.method === "GET") {
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (url.pathname === "/api/stores" && request.method === "GET") {
    sendJson(response, 200, await readStores());
    return true;
  }

  if (url.pathname === "/api/stores" && request.method === "PUT") {
    const stores = safeJsonParse(await readBody(request));
    if (!Array.isArray(stores)) {
      sendJson(response, 400, { error: "Expected a store list." });
      return true;
    }
    const normalizedStores = stores.map(normalizeStore).filter((store) => store.id && store.name);
    await withWriteLock(() => writeStores(normalizedStores));
    sendJson(response, 200, normalizedStores);
    return true;
  }

  if (url.pathname === "/api/stores" && request.method === "POST") {
    const store = normalizeStore(safeJsonParse(await readBody(request)) || {});
    if (!store || !store.id || !store.name) {
      sendJson(response, 400, { error: "Store needs an id and name." });
      return true;
    }
    const stores = await withWriteLock(async () => {
      const nextStores = await readStores();
      const existingIndex = nextStores.findIndex((item) => item.id === store.id);
      if (existingIndex >= 0) {
        nextStores[existingIndex] = store;
      } else {
        nextStores.unshift(store);
      }
      await writeStores(nextStores);
      return nextStores;
    });
    sendJson(response, 200, stores);
    return true;
  }

  if (url.pathname.startsWith("/api/stores/") && request.method === "DELETE") {
    const id = decodeURIComponent(url.pathname.slice("/api/stores/".length));
    const stores = await withWriteLock(async () => {
      const nextStores = (await readStores()).filter((store) => store.id !== id);
      await writeStores(nextStores);
      return nextStores;
    });
    sendJson(response, 200, stores);
    return true;
  }

  return false;
}

async function serveStatic(response, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(root, requestedPath));
  const relativePath = path.relative(root, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    response.writeHead(403, commonHeaders());
    response.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      ...commonHeaders(),
      "Content-Type": mimeTypes[extension] || "application/octet-stream"
    });
    response.end(file);
  } catch {
    response.writeHead(404, commonHeaders());
    response.end("Not found");
  }
}

function getNetworkUrls(port) {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((details) => details && details.family === "IPv4" && !details.internal)
    .map((details) => `http://${details.address}:${port}`);
}

function createServer(port) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);

      if (url.pathname === "/healthz") {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (!isAuthorized(request)) {
        requestLogin(response);
        return;
      }

      if (await handleApi(request, response, url)) return;
      await serveStatic(response, url);
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < startPort + 20) {
      createServer(port + 1);
      return;
    }
    throw error;
  });

  server.listen(port, process.env.HOST || "0.0.0.0", () => {
    const actualPort = server.address().port;
    console.log(`Slimthicc CRM is running at http://localhost:${actualPort}`);
    if (crmPasscode) {
      console.log("Passcode protection is on.");
    } else {
      console.log("Passcode protection is off. Set CRM_PASSCODE before putting this online.");
    }
    for (const url of getNetworkUrls(actualPort)) {
      console.log(`Partner link: ${url}`);
    }
  });

  return server;
}

if (require.main === module) {
  createServer(startPort);
}

module.exports = { createServer };
