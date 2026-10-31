import type { ManagerOptions, SocketOptions } from 'socket.io-client';

// Establish the live connection over HTTP first. A stalled WebSocket handshake
// must not hide the first 20 seconds of bidding; upgrade after polling is live.
export const biddingSocketOptions = {
  transports: ['polling', 'websocket'],
  tryAllTransports: true,
  timeout: 3000,
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
} satisfies Partial<ManagerOptions & SocketOptions>;
