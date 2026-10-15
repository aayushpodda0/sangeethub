import { createServer } from "node:http";

import next from "next";
import { Server } from "socket.io";

import { findProductionEnvProblems } from "./lib/config/env";
import { registerPartyHandlers } from "./lib/party/socket-handlers";

const dev = process.env.NODE_ENV !== "production";
// Not `HOSTNAME`: Docker and most hosts auto-set that to a random container id.
const hostname = process.env.APP_HOSTNAME || "localhost";
const port = Number(process.env.PORT) || 3000;

if (!dev) {
  const problems = findProductionEnvProblems(process.env);
  if (problems.length > 0) {
    console.error("Refusing to start in production:\n" + problems.map((p) => `  - ${p}`).join("\n"));
    process.exit(1);
  }
}

// Safety net: a bug in one socket handler must not take every party room down with it.
// Log loudly (so it is noticed and fixed) but keep serving.
process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandled promise rejection:", reason);
});

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: { origin: process.env.NEXTAUTH_URL ?? `http://${hostname}:${port}` },
  });

  registerPartyHandlers(io);

  httpServer.listen(port, () => {
    console.log(`> SangeetHub ready on http://${hostname}:${port} (party rooms live at /api/socket)`);
  });
});
