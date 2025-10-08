import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction =
  process.env.NODE_ENV === "production" || process.argv.includes("--prod");
const port = Number(process.env.PORT ?? 5170);

const CHATKIT_SESSIONS_URL = "https://api.openai.com/v1/chatkit/sessions";

const MIME_TYPES = new Map([
  [".js", "text/javascript"],
  [".css", "text/css"],
  [".json", "application/json"],
  [".ico", "image/x-icon"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain"],
  [".html", "text/html"],
]);

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES.get(ext) ?? "application/octet-stream";
}

function sanitizePath(urlPath) {
  const normalized = path.posix.normalize(urlPath);
  const withoutLeadingSlash = normalized.replace(/^\/+/u, "");

  if (withoutLeadingSlash.startsWith("..")) {
    return null;
  }
  return withoutLeadingSlash;
}

function respondJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      resolve(body);
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

async function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  try {
    const contents = await readFile(envPath, "utf8");
    console.log(`Loading environment variables from ${envPath}`);
    for (const rawLine of contents.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const [key, ...rest] = line.split("=");
      if (!key) {
        continue;
      }

      const value = rest.join("=").trim().replace(/^['"]|['"]$/gu, "");
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
    console.log("Environment variables loaded from file:",
      Object.keys(process.env)
        .filter((key) => !key.startsWith("npm_") && !key.startsWith("NODE_") && ["OPENAI_API_KEY", "CHATKIT_WORKFLOW_ID", "VITE_CHATKIT_API_DOMAIN_KEY"].includes(key))
        .reduce((acc, key) => ({ ...acc, [key]: process.env[key] ? "[set]" : "[empty]" }), {})
    );
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn("Failed to read .env file", error);
    }
  }
}

function logRequest({ method, url: rawUrl, headers }) {
  try {
    console.log(
      "Incoming request",
      JSON.stringify(
        {
          method,
          url: rawUrl,
          host: headers.host,
          userAgent: headers["user-agent"],
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.warn("Failed to log request", error);
  }
}

async function handleChatKitSession(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  const workflowId = process.env.CHATKIT_WORKFLOW_ID;

  if (!apiKey || !workflowId) {
    respondJson(res, 500, {
      error: "Set OPENAI_API_KEY and CHATKIT_WORKFLOW_ID before requesting a session.",
    });
    return;
  }

  let userId = "anonymous";

  try {
    const rawBody = await readRequestBody(req);
    if (rawBody) {
      const parsed = JSON.parse(rawBody);
      if (typeof parsed.user === "string" && parsed.user.length > 0) {
        userId = parsed.user;
      }
    }
  } catch (error) {
    console.warn("Failed to parse request body", error);
    respondJson(res, 400, { error: "Invalid JSON body." });
    return;
  }

  try {
    const response = await fetch(CHATKIT_SESSIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        workflow: { id: workflowId },
        user: userId,
      }),
    });

    const payload = await response
      .json()
      .catch(() => ({ error: "Unexpected response from ChatKit." }));

    if (!response.ok || typeof payload.client_secret !== "string") {
      respondJson(res, response.status, {
        error: payload?.error ?? "Failed to create ChatKit session.",
      });
      return;
    }

    respondJson(res, 200, { client_secret: payload.client_secret });
  } catch (error) {
    console.error("Failed to call ChatKit Sessions API", error);
    respondJson(res, 500, { error: "Failed to create ChatKit session." });
  }
}

async function createServer() {
  let vite;

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      root: __dirname,
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });
  }

  const distPath = path.resolve(__dirname, "dist");
  const indexHtmlPath = path.join(distPath, "index.html");

  return createHttpServer(async (req, res) => {
    if (!req.url) {
      res.statusCode = 404;
      res.end();
      return;
    }

    logRequest(req);

    const url = new URL(req.url, `http://localhost:${port}`);

    if (req.method === "POST" && url.pathname === "/api/chatkit/session") {
      console.log("Handling ChatKit session request for user", req.socket.remoteAddress);
      await handleChatKitSession(req, res);
      return;
    }

    if (!isProduction && vite) {
      vite.middlewares(req, res, (err) => {
        if (err) {
          res.statusCode = 500;
          res.end(err.message);
        } else {
          res.statusCode = 404;
          res.end();
        }
      });
      return;
    }

    const safePath = sanitizePath(url.pathname);
    console.log("Resolved path", {
      pathname: url.pathname,
      safePath,
    });
    if (!safePath) {
      res.statusCode = 403;
      res.end("Forbidden");
      console.warn("Rejected request due to invalid path", url.pathname);
      return;
    }

    let filePath = path.join(distPath, safePath);

    if (safePath === "" || safePath.endsWith("/")) {
      filePath = path.join(distPath, safePath, "index.html");
    }

    try {
      const file = await readFile(filePath);
      res.statusCode = 200;
      res.setHeader("Content-Type", getContentType(filePath));
      res.end(file);
      console.log("Served static asset", filePath);
      return;
    } catch (error) {
      // Fall back to the SPA entry point.
      try {
        const html = await readFile(indexHtmlPath);
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        res.end(html);
        console.log("Served SPA fallback for", url.pathname);
        return;
      } catch (readError) {
        console.error("Failed to serve static asset", readError);
        res.statusCode = 500;
        res.end("Server error");
      }
    }
  });
}

await loadEnvFile();

createServer()
  .then((server) => {
    server.listen(port, () => {
      console.log(`ChatKit demo listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
