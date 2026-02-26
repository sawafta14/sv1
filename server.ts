import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['polling', 'websocket'], // Try polling first for better compatibility
  allowEIO3: true
});

const PORT = 3000;

// Game State
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("ping", () => socket.emit("pong"));

  socket.on("create_room", ({ playerName, password }) => {
    if (password !== "svoo") {
      socket.emit("error", "كلمة مرور القاضي غير صحيحة");
      return;
    }
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = {
      id: roomId,
      judgeId: socket.id,
      players: [{ id: socket.id, name: playerName, role: "judge" }],
      status: "lobby",
      currentCase: null,
      phase: "waiting",
      logs: [],
    };
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit("room_created", room);
  });

  socket.on("join_room", ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error", "الغرفة غير موجودة");
      return;
    }
    if (room.players.length >= 12) {
      socket.emit("error", "الغرفة ممتلئة");
      return;
    }
    
    const newPlayer = { id: socket.id, name: playerName, role: "unassigned" };
    room.players.push(newPlayer);
    socket.join(roomId);
    io.to(roomId).emit("room_updated", room);
  });

  socket.on("assign_roles", ({ roomId, assignments }) => {
    const room = rooms.get(roomId);
    if (!room || room.judgeId !== socket.id) return;

    room.players = room.players.map(p => {
      const assignment = assignments.find(a => a.playerId === p.id);
      return assignment ? { ...p, role: assignment.role } : p;
    });

    io.to(roomId).emit("room_updated", room);
  });

  socket.on("start_game", ({ roomId, selectedCase }) => {
    const room = rooms.get(roomId);
    if (!room || room.judgeId !== socket.id) return;

    room.status = "playing";
    room.currentCase = selectedCase;
    room.phase = "opening_statements";
    io.to(roomId).emit("game_started", room);
  });

  socket.on("send_message", ({ roomId, message, type = "chat" }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const logEntry = {
      id: Date.now(),
      sender: player.name,
      role: player.role,
      text: message,
      type,
    };
    room.logs.push(logEntry);
    io.to(roomId).emit("new_log", logEntry);
  });

  socket.on("objection", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    io.to(roomId).emit("objection_raised", { playerName: player.name });
  });

  socket.on("judge_decision", ({ roomId, decision }) => {
    const room = rooms.get(roomId);
    if (!room || room.judgeId !== socket.id) return;
    io.to(roomId).emit("decision_made", { decision });
  });

  socket.on("disconnect", () => {
    rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        if (room.judgeId === socket.id) {
          // If judge leaves, close room or assign new judge? 
          // For simplicity, notify and maybe close.
          io.to(roomId).emit("error", "غادر القاضي الجلسة. تم إغلاق الغرفة.");
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit("room_updated", room);
        }
      }
    });
  });
});

async function startServer() {
  // API routes FIRST
  app.get("/api/status", (req, res) => {
    res.json({ status: "online", players: io.engine.clientsCount });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
