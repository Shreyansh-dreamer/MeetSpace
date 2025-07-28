import { io } from "socket.io-client";

export const socket = io("http://localhost:3000", {
  transports: ["websocket", "polling"],
  withCredentials: true,
  // reconnectionAttempts: 5,
  // timeout: 10000,
});
