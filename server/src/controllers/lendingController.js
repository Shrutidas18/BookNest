
const { ActivityType } = require('@prisma/client');
const prisma = require('../utils/prisma');
const {
  emitToUsers,
  emitToUser,
} = require('../socket');

async function lendBook(req, res) {
  const book = await prisma.book.findFirst({
    where: {
      id: req.params.bookId,
      ownerId: req.user.id,
    },
  });

  if (!book) {
    return res.status(404).json({
      message: 'Book not found or it is not yours.',
    });
  }

  const { email } = req.body;

  const borrower = await prisma.user.findUnique({
    where: {
      email: email?.toLowerCase().trim(),
    },
  });

  if (!borrower) {
    return res.status(404).json({
      message: 'Registered borrower not found.',
    });
  }

  if (borrower.id === req.user.id) {
    return res.status(400).json({
      message: 'You cannot lend a book to yourself.',
    });
  }

  const active = await prisma.lending.findFirst({
    where: {
      bookId: book.id,
      returnedAt: null,
    },
  });

  if (active) {
    return res.status(409).json({
      message: 'This book is already lent to someone.',
    });
  }

  const lending = await prisma.lending.create({
    data: {
      bookId: book.id,
      ownerId: req.user.id,
      borrowerId: borrower.id,
    },
    include: {
      book: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      borrower: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const borrowerActivity =
    await prisma.activityLog.create({
      data: {
        userId: borrower.id,
        type: ActivityType.BOOK_LENT,
        message: `"${book.title}" was lent to you by ${req.user.name}`,
        metadata: {
          bookId: book.id,
          ownerId: req.user.id,
          lendingId: lending.id,
        },
      },
    });

  const ownerActivity =
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        type: ActivityType.BOOK_LENT,
        message: `Lent "${book.title}" to ${borrower.name}`,
        metadata: {
          bookId: book.id,
          borrowerId: borrower.id,
          lendingId: lending.id,
        },
      },
    });

  // Update lending UI in realtime.
  emitToUsers(
    [req.user.id, borrower.id],
    'lending:created',
    {
      lending,
    }
  );

  // Update activity feeds in realtime.
  emitToUser(
    borrower.id,
    'activity:created',
    borrowerActivity
  );

  emitToUser(
    req.user.id,
    'activity:created',
    ownerActivity
  );

  res.status(201).json(lending);
}

async function lentBooks(req, res) {
  const lendings = await prisma.lending.findMany({
    where: {
      ownerId: req.user.id,
      returnedAt: null,
    },
    include: {
      book: true,
      borrower: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      lentAt: 'desc',
    },
  });

  res.json(lendings);
}

async function borrowedBooks(req, res) {
  const lendings = await prisma.lending.findMany({
    where: {
      borrowerId: req.user.id,
      returnedAt: null,
    },
    include: {
      book: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      lentAt: 'desc',
    },
  });

  res.json(lendings);
}

async function returnBook(req, res) {
  const lending = await prisma.lending.findFirst({
    where: {
      id: req.params.lendingId,
      ownerId: req.user.id,
      returnedAt: null,
    },
    include: {
      book: true,
      borrower: true,
    },
  });

  if (!lending) {
    return res.status(404).json({
      message: 'Active lending record not found.',
    });
  }

  const updated = await prisma.lending.update({
    where: {
      id: lending.id,
    },
    data: {
      returnedAt: new Date(),
    },
    include: {
      book: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      borrower: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const ownerActivity = {
    userId: req.user.id,
    type: ActivityType.BOOK_RETURNED,
    message: `Marked "${lending.book.title}" as returned`,
    metadata: {
      bookId: lending.book.id,
      borrowerId: lending.borrowerId,
    },
  };

  const borrowerActivity = {
    userId: lending.borrowerId,
    type: ActivityType.BOOK_RETURNED,
    message: `"${lending.book.title}" was returned to ${req.user.name}`,
    metadata: {
      bookId: lending.book.id,
      ownerId: req.user.id,
    },
  };

  const activities =
    await prisma.activityLog.createManyAndReturn({
      data: [
        ownerActivity,
        borrowerActivity,
      ],
    });

  // Update lending UI in realtime.
  emitToUsers(
    [req.user.id, lending.borrowerId],
    'lending:returned',
    {
      lending: updated,
    }
  );

  // Update activity feeds in realtime.
  for (const activity of activities) {
    emitToUser(
      activity.userId,
      'activity:created',
      activity
    );
  }

  res.json(updated);
}

module.exports = {
  lendBook,
  lentBooks,
  borrowedBooks,
  returnBook,
};

