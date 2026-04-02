import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { io } = require("socket.io-client");

const baseUrl = "http://localhost:3101";
const prisma = new PrismaClient();
let serverProcess = null;

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {}

    await delay(500);
  }

  throw new Error("API did not become healthy on time");
}

async function api(path, init = {}, cookie) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body
  };
}

function sessionCookieFrom(headers) {
  const value = headers["set-cookie"];
  assert.ok(value, "expected set-cookie header");
  return value;
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
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

before(async () => {
  serverProcess = spawn(
    "C:\\Program Files\\nodejs\\node.exe",
    ["dist/main.js"],
    {
      cwd: "C:\\Users\\joaov\\OneDrive\\Documentos\\kanban\\apps\\api",
      env: {
        ...process.env,
        PORT: "3101",
        DISABLE_RATE_LIMITS: "true"
      },
      stdio: "ignore"
    }
  );

  await waitForHealth();
});

after(async () => {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }

  await prisma.$disconnect();
});

test("login flow and board authorization work end-to-end", async () => {
  const ownerEmail = `owner-${randomUUID().slice(0, 8)}@example.com`;
  const intruderEmail = `intruder-${randomUUID().slice(0, 8)}@example.com`;

  const ownerRegister = await api("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      displayName: "Owner",
      email: ownerEmail,
      password: "SenhaSegura1"
    })
  });
  const intruderRegister = await api("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      displayName: "Intruder",
      email: intruderEmail,
      password: "SenhaSegura1"
    })
  });

  const ownerCookie = sessionCookieFrom(ownerRegister.headers);
  const intruderCookie = sessionCookieFrom(intruderRegister.headers);

  const boards = await api("/boards", { method: "GET" }, ownerCookie);
  const boardId = boards.body.boards[0].id;

  const ownerBoard = await api(`/boards/${boardId}`, { method: "GET" }, ownerCookie);
  const intruderBoard = await api(`/boards/${boardId}`, { method: "GET" }, intruderCookie);

  assert.equal(ownerBoard.status, 200);
  assert.equal(intruderBoard.status, 403);

  const login = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: ownerEmail,
      password: "SenhaSegura1"
    })
  });

  assert.equal(login.status, 200);
  assert.equal(login.body.user.email, ownerEmail);
});

test("password reset accepts known token and invalidates old password", async () => {
  const email = `reset-${randomUUID().slice(0, 8)}@example.com`;
  const oldPassword = "SenhaSegura1";
  const newPassword = "SenhaNova1";

  const register = await api("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      displayName: "Reset User",
      email,
      password: oldPassword
    })
  });

  assert.equal(register.status, 201);

  const user = await prisma.user.findUnique({ where: { email } });
  assert.ok(user);

  const rawToken = `reset-${randomUUID()}`;
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(rawToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 10)
    }
  });

  const reset = await api("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({
      token: rawToken,
      password: newPassword
    })
  });

  const oldLogin = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: oldPassword })
  });
  const newLogin = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: newPassword })
  });

  assert.equal(reset.status, 204);
  assert.equal(oldLogin.status, 401);
  assert.equal(newLogin.status, 200);
});

test("board invitation accept changes authorization boundary", async () => {
  const ownerEmail = `invite-owner-${randomUUID().slice(0, 8)}@example.com`;
  const guestEmail = `invite-guest-${randomUUID().slice(0, 8)}@example.com`;

  const ownerRegister = await api("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      displayName: "Invite Owner",
      email: ownerEmail,
      password: "SenhaSegura1"
    })
  });
  const guestRegister = await api("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      displayName: "Invite Guest",
      email: guestEmail,
      password: "SenhaSegura1"
    })
  });

  const ownerCookie = sessionCookieFrom(ownerRegister.headers);
  const guestCookie = sessionCookieFrom(guestRegister.headers);
  const ownerBoards = await api("/boards", { method: "GET" }, ownerCookie);
  const boardId = ownerBoards.body.boards[0].id;

  const guestBoardBefore = await api(`/boards/${boardId}`, { method: "GET" }, guestCookie);
  assert.equal(guestBoardBefore.status, 403);

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  const guest = await prisma.user.findUnique({ where: { email: guestEmail } });
  assert.ok(owner);
  assert.ok(guest);

  const rawToken = `invite-${randomUUID()}`;
  await prisma.boardInvitation.create({
    data: {
      boardId,
      invitedById: owner.id,
      invitedUserId: guest.id,
      invitedEmail: guest.email,
      role: "MEMBER",
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 1000 * 60 * 10)
    }
  });

  const accept = await api(
    "/boards/invitations/accept",
    {
      method: "POST",
      body: JSON.stringify({ token: rawToken })
    },
    guestCookie
  );
  const guestBoardAfter = await api(`/boards/${boardId}`, { method: "GET" }, guestCookie);

  assert.equal(accept.status, 201);
  assert.equal(guestBoardAfter.status, 200);
});

test("websocket rejects unauthenticated join and accepts authenticated join", async () => {
  const email = `ws-${randomUUID().slice(0, 8)}@example.com`;
  const register = await api("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      displayName: "WS User",
      email,
      password: "SenhaSegura1"
    })
  });

  const cookie = sessionCookieFrom(register.headers);
  const boards = await api("/boards", { method: "GET" }, cookie);
  const boardId = boards.body.boards[0].id;

  const anonymousSocket = io(baseUrl, { transports: ["websocket"] });
  await new Promise((resolve, reject) => {
    anonymousSocket.on("connect", resolve);
    anonymousSocket.on("connect_error", reject);
  });

  await assert.rejects(
    () => emitAck(anonymousSocket, "board:join", { boardId }),
    /operation has timed out/
  );
  anonymousSocket.disconnect();

  const socket = io(baseUrl, {
    transports: ["websocket"],
    extraHeaders: { Cookie: cookie }
  });
  await new Promise((resolve, reject) => {
    socket.on("connect", resolve);
    socket.on("connect_error", reject);
  });

  const joinAck = await emitAck(socket, "board:join", { boardId });
  assert.equal(joinAck.id, boardId);

  socket.disconnect();
});
