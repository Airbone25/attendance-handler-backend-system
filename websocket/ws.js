const WebSocket = require("ws");
const url = require("url");
const { verifyToken } = require("../utils/jwt");
const Class = require("../models/classSchema");
const Attendance = require("../models/attendanceSchema");
const {
  getActiveSession,
  clearActiveSession,
} = require("../session/session");

const clients = new Set();

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const { query } = url.parse(req.url, true);
    const token = query.token;

    if (!token) {
      ws.send(JSON.stringify({
        event: "ERROR",
        data: { message: "Unauthorized or invalid token" },
      }));
      return ws.close();
    }

    try {
      const decoded = verifyToken(token);
      ws.user = {
        userId: decoded.userId,
        role: decoded.role,
      };
    } catch {
      ws.send(JSON.stringify({
        event: "ERROR",
        data: { message: "Unauthorized or invalid token" },
      }));
      return ws.close();
    }

    clients.add(ws);

    ws.on("message", (msg) => handleMessage(ws, msg));
    ws.on("close", () => clients.delete(ws));
  });
}

function broadcast(payload) {
  const message = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function sendError(ws, message) {
  ws.send(JSON.stringify({
    event: "ERROR",
    data: { message },
  }));
}

async function handleMessage(ws, raw) {
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return sendError(ws, "Invalid message format");
  }

  const { event, data } = parsed;

  switch (event) {
    case "ATTENDANCE_MARKED":
      return handleAttendanceMarked(ws, data);

    case "TODAY_SUMMARY":
      return handleTodaySummary(ws);

    case "MY_ATTENDANCE":
      return handleMyAttendance(ws);

    case "DONE":
      return handleDone(ws);

    default:
      return sendError(ws, "Unknown event");
  }
}

function handleAttendanceMarked(ws, data) {
  if (ws.user.role !== "teacher") {
    return sendError(ws, "Forbidden, teacher event only");
  }

  const session = getActiveSession();
  if (!session) {
    return sendError(ws, "No active attendance session");
  }

  const { studentId, status } = data;
  session.attendance[studentId] = status;

  broadcast({
    event: "ATTENDANCE_MARKED",
    data: { studentId, status },
  });
}

function handleTodaySummary(ws) {
  if (ws.user.role !== "teacher") {
    return sendError(ws, "Forbidden, teacher event only");
  }

  const session = getActiveSession();
  if (!session) {
    return sendError(ws, "No active attendance session");
  }

  const values = Object.values(session.attendance);
  const present = values.filter(v => v === "present").length;
  const absent = values.filter(v => v === "absent").length;

  broadcast({
    event: "TODAY_SUMMARY",
    data: {
      present,
      absent,
      total: present + absent,
    },
  });
}

function handleMyAttendance(ws) {
  if (ws.user.role !== "student") {
    return sendError(ws, "Forbidden, student event only");
  }

  const session = getActiveSession();
  if (!session) {
    return sendError(ws, "No active attendance session");
  }

  const status = session.attendance[ws.user.userId];

  ws.send(JSON.stringify({
    event: "MY_ATTENDANCE",
    data: {
      status: status || "not yet updated",
    },
  }));
}

async function handleDone(ws) {
  if (ws.user.role !== "teacher") {
    return sendError(ws, "Forbidden, teacher event only");
  }

  const session = getActiveSession();
  if (!session) {
    return sendError(ws, "No active attendance session");
  }

  const foundClass = await Class.findById(session.classId);
  if (!foundClass) {
    return sendError(ws, "Class not found");
  }

  const records = [];
  let present = 0;
  let absent = 0;

  for (const studentId of foundClass.studentIds) {
    const status =
      session.attendance[studentId.toString()] || "absent";

    status === "present" ? present++ : absent++;

    records.push({
      classId: session.classId,
      studentId,
      status,
    });
  }

  await Attendance.insertMany(records);

  clearActiveSession();

  broadcast({
    event: "DONE",
    data: {
      message: "Attendance persisted",
      present,
      absent,
      total: present + absent,
    },
  });
}

module.exports = { setupWebSocket };

