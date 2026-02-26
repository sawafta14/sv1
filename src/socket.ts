import { io, Socket } from "socket.io-client";

const socket: Socket = io({
  transports: ['polling', 'websocket'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
