import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;

export function connectSocket() {
  const token = localStorage.getItem(
    'booknest_access_token'
  );

  if (!token) {
    return null;
  }

  // Reuse an existing connection.
  if (socket?.connected) {
    return socket;
  }

  // If a socket exists but is disconnected, update
  // its authentication token before reconnecting.
  if (socket) {
    socket.auth = {
      token,
    };

    socket.connect();

    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    auth: {
      token,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log(
      'BookNest realtime connected:',
      socket.id
    );
  });

  socket.on('disconnect', (reason) => {
    console.log(
      'BookNest realtime disconnected:',
      reason
    );
  });

  socket.on('connect_error', (error) => {
    console.error(
      'BookNest realtime connection error:',
      error.message
    );
  });

  socket.connect();

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (!socket) {
    return;
  }

  socket.disconnect();
  socket = null;
}

export function refreshSocketAuth() {
  if (!socket) {
    return;
  }

  const token = localStorage.getItem(
    'booknest_access_token'
  );

  socket.auth = {
    token,
  };
}

export function joinShelf(shelfId) {
  if (!socket?.connected) {
    return;
  }

  socket.emit('join-shelf', shelfId);
}