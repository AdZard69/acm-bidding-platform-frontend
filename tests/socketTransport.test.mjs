import { test } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { Transport } from 'engine.io-client';
import { loadSource, flushPromises } from './helpers/runtime.mjs';

const { biddingSocketOptions } = loadSource('utils/socketOptions.ts');

// Exercise the installed Socket.IO/Engine.IO handshake and packet parser. Only
// network I/O is replaced: WebSocket stalls, while HTTP polling works normally.
function transports() {
  const attempts = [];
  let polling;
  class StalledWebSocket extends Transport {
    get name() { return 'websocket'; }
    doOpen() { attempts.push('websocket'); }
    doClose() {}
    write() {}
  }
  class WorkingPolling extends Transport {
    get name() { return 'polling'; }
    doOpen() {
      attempts.push('polling');
      polling = this;
      queueMicrotask(() => {
        this.onOpen();
        this.onPacket({ type: 'open', data: JSON.stringify({ sid: 'engine', upgrades: ['websocket'],
          pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 }) });
      });
    }
    write(packets) {
      this.writable = false;
      for (const packet of packets) if (packet.type === 'message' && packet.data.startsWith('0')) {
        queueMicrotask(() => this.onPacket({ type: 'message', data: '0{"sid":"viewer"}' }));
      }
      queueMicrotask(() => { this.writable = true; this.emitReserved('drain'); });
    }
    doClose() {}
  }
  return {
    attempts,
    map: { polling: WorkingPolling, websocket: StalledWebSocket },
    tick(secondsRemaining) {
      polling.onPacket({ type: 'message', data: `2${JSON.stringify(['timer:tick', {
        timerId: 'round', status: 'bidding', promptId: 1, roundNumber: 1,
        remainingMs: secondsRemaining * 1000, secondsRemaining
      }])}` });
    }
  };
}

test('WebSocket-first waits on the default 20-second handshake even when polling would work', async (t) => {
  const network = transports();
  const socket = io('http://localhost:5000', { forceNew: true, autoConnect: false, reconnection: false,
    tryAllTransports: true, transports: [network.map.websocket, network.map.polling] });
  t.after(() => socket.disconnect());
  socket.connect();
  await flushPromises();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(socket.io.opts.timeout, undefined); // Manager's default is 20000.
  assert.equal(socket.io.timeout(), 20000);
  assert.equal(socket.connected, false);
  assert.deepEqual(network.attempts, ['websocket']);
});

test('production connection receives 60 then 59 over polling while WebSocket upgrade stalls', async (t) => {
  const network = transports();
  const socket = io('http://localhost:5000', { ...biddingSocketOptions, forceNew: true, reconnection: false,
    transports: Array.from(biddingSocketOptions.transports, (name) => network.map[name]) });
  t.after(() => socket.disconnect());
  const countdown = [];
  socket.on('timer:tick', (timer) => countdown.push(timer.secondsRemaining));
  socket.connect();
  await flushPromises();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(socket.connected, true);
  assert.equal(network.attempts[0], 'polling');
  assert.ok(network.attempts.includes('websocket'));
  network.tick(60);
  network.tick(59);
  await flushPromises();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(countdown, [60, 59]);
  assert.equal(socket.io.engine.transport.name, 'polling');
});
