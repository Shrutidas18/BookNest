const prisma = require('../utils/prisma');

async function getDashboard(req, res) {
  const userId = req.user.id;

  const [
    totalBooks,
    readingBooks,
    finishedBooks,
    wantToReadBooks,
    recentBooks,
    recentActivity,
  ] = await Promise.all([
    prisma.book.count({
      where: { ownerId: userId },
    }),

    prisma.book.count({
      where: {
        ownerId: userId,
        status: 'READING',
      },
    }),

    prisma.book.count({
      where: {
        ownerId: userId,
        status: 'FINISHED',
      },
    }),

    prisma.book.count({
      where: {
        ownerId: userId,
        status: 'WANT_TO_READ',
      },
    }),

    prisma.book.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),

    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  res.json({
    stats: {
      totalBooks,
      readingBooks,
      finishedBooks,
      wantToReadBooks,
    },
    recentBooks,
    recentActivity,
  });
}

module.exports = { getDashboard };