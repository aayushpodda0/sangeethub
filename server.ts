import { createServer } from "node:http";

import next from "next";
import { Server } from "socket.io";

import { registerPartyHandlers } from "./lib/party/socket-handlers";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT) || 3000;

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
