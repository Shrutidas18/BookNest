const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const prisma = require('../utils/prisma');

let ioInstance = null;

function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  ioInstance = io;

  // Authenticate every socket connection using the
  // same access JWT used by the REST API.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error('Authentication required')
        );
      }

      const payload = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET
      );

      const user = await prisma.user.findUnique({
        where: {
          id: payload.userId,
        },
      });

      if (!user) {
        return next(
          new Error('User not found')
        );
      }

      socket.userId = user.id;

      next();
    } catch {
      next(
        new Error(
          'Invalid or expired socket token'
        )
      );
    }
  });

  io.on('connection', async (socket) => {
    console.log(
      `Socket connected: ${socket.id} (user ${socket.userId})`
    );

    // Every authenticated user gets a private room.
    socket.join(`user:${socket.userId}`);

    // Automatically join every shelf shared with this user.
    try {
      const shares = await prisma.shelfShare.findMany({
        where: {
          userId: socket.userId,
        },
        select: {
          shelfId: true,
        },
      });

      for (const share of shares) {
        socket.join(`shelf:${share.shelfId}`);
      }
    } catch (error) {
      console.error(
        'Failed to join shared shelf rooms:',
        error
      );
    }

    // Allow the frontend to explicitly join a shelf room.
    socket.on('join-shelf', async (shelfId) => {
      try {
        if (
          typeof shelfId !== 'string' ||
          !shelfId.trim()
        ) {
          return;
        }

        const shelf = await prisma.shelf.findUnique({
          where: {
            id: shelfId,
          },
          select: {
            ownerId: true,
            collaborators: {
              where: {
                userId: socket.userId,
              },
              select: {
                userId: true,
              },
            },
          },
        });

        if (!shelf) {
          return;
        }

        const hasAccess =
          shelf.ownerId === socket.userId ||
          shelf.collaborators.length > 0;

        if (hasAccess) {
          socket.join(`shelf:${shelfId}`);
        }
      } catch (error) {
        console.error(
          'Failed to join shelf room:',
          error
        );
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(
        `Socket disconnected: ${socket.id} (${reason})`
      );
    });
  });

  return io;
}

function getIO() {
  if (!ioInstance) {
    throw new Error(
      'Socket.io has not been initialized.'
    );
  }

  return ioInstance;
}

function emitToUser(userId, event, payload) {
  getIO()
    .to(`user:${userId}`)
    .emit(event, payload);
}

function emitToUsers(userIds, event, payload) {
  const uniqueUserIds = [
    ...new Set(userIds.filter(Boolean)),
  ];

  for (const userId of uniqueUserIds) {
    emitToUser(userId, event, payload);
  }
}

function emitToShelf(shelfId, event, payload) {
  getIO()
    .to(`shelf:${shelfId}`)
    .emit(event, payload);
}

function emitToUsersAndShelf(
  userIds,
  shelfId,
  event,
  payload
) {
  emitToUsers(userIds, event, payload);
  emitToShelf(shelfId, event, payload);
}

// Remove all active sockets belonging to a user
// from a shelf's realtime room.
//
// This is used when an owner removes a collaborator
// so that the collaborator no longer receives
// realtime events from that shelf.
function removeUserFromShelf(userId, shelfId) {
  const io = getIO();

  const sockets = io.sockets.sockets;

  for (const socket of sockets.values()) {
    if (socket.userId === userId) {
      socket.leave(`shelf:${shelfId}`);
    }
  }
}

module.exports = {
  setupSocket,
  getIO,
  emitToUser,
  emitToUsers,
  emitToShelf,
  emitToUsersAndShelf,
  removeUserFromShelf,
};