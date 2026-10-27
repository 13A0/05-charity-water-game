import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
http
  .createServer(async (req, res) => {
    try {
      const file = path.resolve(
        root,
        "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
      );
      if (!file.startsWith(root + path.sep) && file !== root) throw Error();
      const target = file === root ? path.join(root, "index.html") : file;
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".wav": "audio/wav",
        }[path.extname(target)] || "application/octet-stream",
      );
      res.end(await readFile(target));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(5173, "127.0.0.1", () =>
    console.log("Pump It! http://127.0.0.1:5173"),
  );
