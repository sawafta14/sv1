import { io, Socket } from "socket.io-client";

const socket: Socket = io({
  transports: ['polling'],
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  autoConnect: true,
});

export default socket;
