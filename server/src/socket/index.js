const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const prisma = require('../utils/prisma');

function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) return next(new Error('User not found'));

      socket.userId = user.id;
      next();
    } catch {
      next(new Error('Invalid or expired socket token'));
    }
  });

  io.on('connection', async (socket) => {
    socket.join(`user:${socket.userId}`);

    const shares = await prisma.shelfShare.findMany({
      where: { userId: socket.userId },
      select: { shelfId: true }
    });

    for (const share of shares) socket.join(`shelf:${share.shelfId}`);

    socket.on('join-shelf', async (shelfId) => {
      const shelf = await prisma.shelf.findUnique({
        where: { id: shelfId },
        select: { ownerId: true, collaborators: { where: { userId: socket.userId }, select: { userId: true } } }
      });
      if (shelf && (shelf.ownerId === socket.userId || shelf.collaborators.length)) {
        socket.join(`shelf:${shelfId}`);
      }
    });
  });

  return io;
}

module.exports = { setupSocket };
