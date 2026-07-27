import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2"
};

export function createStyleLabServer(siteRoot = root) {
  const resolvedRoot = path.resolve(siteRoot);
  const visualOrienterRoot = path.resolve(resolvedRoot, "../visual-orienter");
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, "http://127.0.0.1");
      const decoded = decodeURIComponent(requestUrl.pathname);
      if (decoded === "/favicon.ico") {
        response.writeHead(204, { "cache-control": "no-store" }).end();
        return;
      }
      const isVisualOrienter = decoded === "/visual-orienter" ||
        decoded.startsWith("/visual-orienter/");
      const targetRoot = isVisualOrienter ? visualOrienterRoot : resolvedRoot;
      const relative = isVisualOrienter
        ? decoded.replace(/^\/visual-orienter\/?/, "") || "index.html"
        : decoded === "/"
          ? "index.html"
          : decoded.replace(/^\/+/, "");
      let target = path.resolve(targetRoot, relative);
      if (target !== targetRoot && !target.startsWith(`${targetRoot}${path.sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const info = await stat(target);
      if (info.isDirectory()) target = path.join(target, "index.html");
      const body = await readFile(target);
      response.writeHead(200, {
        "content-type": contentTypes[path.extname(target).toLowerCase()] || "application/octet-stream",
        "cache-control": "no-store"
      });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
    }
  });
}

const runtimeProcess = globalThis.process;

if (
  runtimeProcess?.argv?.[1] &&
  path.resolve(runtimeProcess.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(runtimeProcess.env.PORT || 4174);
  const server = createStyleLabServer();
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    runtimeProcess.stdout.write(`Style Lab: http://127.0.0.1:${address.port}/\n`);
  });
}
