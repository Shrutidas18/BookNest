const prisma = require('../utils/prisma');

async function getDashboard(req, res) {
  const userId = req.user.id;

  const startOfYear = new Date(
    new Date().getFullYear(),
    0,
    1
  );

  const [
    totalBooks,
    readingBooks,
    finishedBooks,
    wantToReadBooks,
    finishedThisYear,
    ratingAggregate,
    lentOutCount,
    sharedShelves,
    topShelf,
    recentBooks,
    recentActivity,
  ] = await Promise.all([
    // Total books
    prisma.book.count({
      where: { ownerId: userId },
    }),

    // Currently reading
    prisma.book.count({
      where: {
        ownerId: userId,
        status: 'READING',
      },
    }),

    // Finished books
    prisma.book.count({
      where: {
        ownerId: userId,
        status: 'FINISHED',
      },
    }),

    // Want to read
    prisma.book.count({
      where: {
        ownerId: userId,
        status: 'WANT_TO_READ',
      },
    }),

    // Finished this year
    prisma.book.count({
      where: {
        ownerId: userId,
        status: 'FINISHED',
        finishedAt: {
          gte: startOfYear,
        },
      },
    }),

    // Average rating
    prisma.book.aggregate({
      where: {
        ownerId: userId,
        rating: {
          not: null,
        },
      },
      _avg: {
        rating: true,
      },
    }),

    // Currently lent out
    prisma.lending.count({
      where: {
        ownerId: userId,
        returnedAt: null,
      },
    }),

    // Shelves owned by user that have been shared
    prisma.shelf.count({
      where: {
        ownerId: userId,
        collaborators: {
          some: {},
        },
      },
    }),

    // Shelf with the most books
    prisma.shelf.findFirst({
      where: {
        ownerId: userId,
      },
      orderBy: {
        books: {
          _count: 'desc',
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            books: true,
          },
        },
      },
    }),

    // Recent books
    prisma.book.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),

    // Recent activity
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
      finishedThisYear,
      averageRating: ratingAggregate._avg.rating
        ? Number(ratingAggregate._avg.rating.toFixed(1))
        : null,
      lentOutCount,
      sharedShelves,

      topShelf: topShelf
        ? {
            id: topShelf.id,
            name: topShelf.name,
            bookCount: topShelf._count.books,
          }
        : null,
    },

    recentBooks,
    recentActivity,
  });
}

module.exports = { getDashboard };