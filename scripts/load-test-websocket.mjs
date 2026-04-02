import { io } from "socket.io-client";

const apiUrl = process.env.API_URL || "http://localhost:3001";
const boardId = process.env.BOARD_ID;
const cookie = process.env.SESSION_COOKIE;
const clients = Number(process.env.CLIENTS || "10");

if (!boardId || !cookie) {
  console.error("BOARD_ID and SESSION_COOKIE are required");
  process.exit(1);
}

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, payload, (err, response) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(response);
    });
  });
}

async function main() {
  const startedAt = Date.now();
  const sockets = [];

  try {
    for (let index = 0; index < clients; index += 1) {
      const socket = io(apiUrl, {
        transports: ["websocket"],
        extraHeaders: {
          Cookie: cookie
        }
      });

      sockets.push(socket);

      await new Promise((resolve, reject) => {
        socket.on("connect", resolve);
        socket.on("connect_error", reject);
      });

      await emitAck(socket, "board:join", { boardId });
    }

    console.log(
      JSON.stringify({
        status: "ok",
        clients,
        durationMs: Date.now() - startedAt
      })
    );
  } finally {
    sockets.forEach((socket) => socket.disconnect());
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
