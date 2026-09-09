const { BookStatus, ActivityType } = require('@prisma/client');
const prisma = require('../utils/prisma');
const { emitToUser } = require('../socket');

const validStatuses = Object.values(BookStatus);

async function listBooks(req, res) {
  const page = Math.max(
    Number.parseInt(req.query.page || '1', 10),
    1
  );

  const pageSize = Math.min(
    Math.max(
      Number.parseInt(req.query.pageSize || '6', 10),
      1
    ),
    50
  );

  const {
    status,
    search,
    sort = 'date',
    order = 'desc',
  } = req.query;

  const where = {
    ownerId: req.user.id,

    ...(status && validStatuses.includes(status)
      ? { status }
      : {}),

    ...(search
      ? {
          OR: [
            {
              title: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              author: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
  };

  const direction =
    order === 'asc' ? 'asc' : 'desc';

  let orderBy;

  switch (sort) {
    case 'title':
      orderBy = {
        title: direction,
      };
      break;

    case 'author':
      orderBy = {
        author: direction,
      };
      break;

    case 'totalPages':
      orderBy = {
        totalPages: direction,
      };
      break;

    case 'rating':
  orderBy = {
    rating: {
      sort: direction,
      nulls: 'last',
    },
  };
  break;

    case 'date':
    case 'createdAt':
    default:
      orderBy = {
        createdAt: direction,
      };
      break;
  }

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),

    prisma.book.count({
      where,
    }),
  ]);

  res.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}


/*
 * Get a single book.
 *
 * The owner can always view the book.
 * Other users can view it only when the book
 * belongs to a shelf that they have access to.
 */
async function getBook(req, res) {
  const book = await prisma.book.findUnique({
    where: {
      id: req.params.id,
    },

    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      shelves: {
        include: {
          shelf: {
            include: {
              collaborators: true,
            },
          },
        },
      },
    },
  });

  if (!book) {
    return res.status(404).json({
      message: 'Book not found.',
    });
  }

  // Owner can always view their own book.
  if (book.ownerId === req.user.id) {
    return res.json(book);
  }

  // Check whether the current user has access
  // to at least one shelf containing this book.
  const hasSharedAccess = book.shelves.some(
    (shelfBook) => {
      const shelf = shelfBook.shelf;

      return (
        shelf.ownerId === req.user.id ||
        shelf.collaborators.some(
          (collaborator) =>
            collaborator.userId === req.user.id
        )
      );
    }
  );

  if (!hasSharedAccess) {
    return res.status(403).json({
      message:
        'You do not have access to this book.',
    });
  }

  res.json(book);
}


/*
 * Add a new book.
 *
 * Supports:
 * - title
 * - author
 * - status
 * - totalPages
 * - currentPage
 * - rating
 * - notes
 *
 * If currentPage equals totalPages,
 * the book is automatically marked FINISHED.
 */
async function addBook(req, res) {
  const {
    title,
    author,
    status = BookStatus.WANT_TO_READ,
    totalPages,
    currentPage = 0,
    rating,
    notes,
  } = req.body;

  // Validate title and author
  if (!title?.trim() || !author?.trim()) {
    return res.status(400).json({
      message: 'Title and author are required.',
    });
  }

  // Validate status
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: 'Invalid book status.',
    });
  }

  // Validate total pages
  if (
    totalPages != null &&
    (!Number.isInteger(totalPages) ||
      totalPages <= 0)
  ) {
    return res.status(400).json({
      message:
        'Total pages must be a positive integer.',
    });
  }

  // Validate current page
  if (
    !Number.isInteger(currentPage) ||
    currentPage < 0
  ) {
    return res.status(400).json({
      message:
        'Current page must be a non-negative integer.',
    });
  }

  // Current page cannot exceed total pages
  if (
    totalPages != null &&
    currentPage > totalPages
  ) {
    return res.status(400).json({
      message:
        'Current page cannot exceed total pages.',
    });
  }

  // Validate rating
  if (
    rating != null &&
    (!Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5)
  ) {
    return res.status(400).json({
      message: 'Rating must be between 1 and 5.',
    });
  }

  /*
   * Automatically mark the book as FINISHED
   * when the user enters the final page.
   */
  const isFinished =
    totalPages != null &&
    currentPage === totalPages;

  const finalStatus = isFinished
    ? BookStatus.FINISHED
    : status;

  const book = await prisma.book.create({
    data: {
      title: title.trim(),
      author: author.trim(),

      status: finalStatus,

      totalPages: totalPages ?? null,

      currentPage,

      rating: rating ?? null,

      notes: notes || null,

      finishedAt: isFinished
        ? new Date()
        : null,

      ownerId: req.user.id,
    },
  });

  // Create activity log
  const activity =
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,

        type: ActivityType.BOOK_ADDED,

        message: `Added "${book.title}"`,

        metadata: {
          bookId: book.id,
        },
      },
    });

  // Notify connected clients immediately
  emitToUser(
    req.user.id,
    'activity:created',
    activity
  );

  res.status(201).json(book);
}


async function updateBook(req, res) {
  const existing = await prisma.book.findFirst({
    where: {
      id: req.params.id,
      ownerId: req.user.id,
    },
  });

  if (!existing) {
    return res.status(404).json({
      message: 'Book not found.',
    });
  }

  const {
    title,
    author,
    status,
    totalPages,
    currentPage,
    rating,
    notes,
  } = req.body;

  if (
    status &&
    !validStatuses.includes(status)
  ) {
    return res.status(400).json({
      message: 'Invalid book status.',
    });
  }

  if (
    totalPages !== undefined &&
    (!Number.isInteger(totalPages) ||
      totalPages <= 0)
  ) {
    return res.status(400).json({
      message:
        'Total pages must be a positive integer.',
    });
  }

  if (
    currentPage !== undefined &&
    (!Number.isInteger(currentPage) ||
      currentPage < 0)
  ) {
    return res.status(400).json({
      message:
        'Current page must be a non-negative integer.',
    });
  }

  const finalTotalPages =
    totalPages !== undefined
      ? totalPages
      : existing.totalPages;

  if (
    currentPage !== undefined &&
    finalTotalPages != null &&
    currentPage > finalTotalPages
  ) {
    return res.status(400).json({
      message:
        'Current page cannot exceed total pages.',
    });
  }

  if (
    rating != null &&
    (!Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5)
  ) {
    return res.status(400).json({
      message: 'Rating must be between 1 and 5.',
    });
  }

  let finalStatus = status;

  if (
    currentPage !== undefined &&
    finalTotalPages != null &&
    currentPage === finalTotalPages
  ) {
    finalStatus = BookStatus.FINISHED;
  }

  const book = await prisma.book.update({
    where: {
      id: existing.id,
    },

    data: {
      ...(title !== undefined
        ? {
            title: title.trim(),
          }
        : {}),

      ...(author !== undefined
        ? {
            author: author.trim(),
          }
        : {}),

      ...(finalStatus !== undefined
        ? {
            status: finalStatus,

            ...(finalStatus === BookStatus.FINISHED
              ? {
                  finishedAt:
                    existing.finishedAt ||
                    new Date(),
                }
              : {
                  finishedAt: null,
                }),
          }
        : {}),

      ...(totalPages !== undefined
        ? {
            totalPages,
          }
        : {}),

      ...(currentPage !== undefined
        ? {
            currentPage,
          }
        : {}),

      ...(rating !== undefined
        ? {
            rating,
          }
        : {}),

      ...(notes !== undefined
        ? {
            notes,
          }
        : {}),
    },
  });

  if (
    finalStatus &&
    finalStatus !== existing.status
  ) {
    const activity =
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,

          type: ActivityType.STATUS_CHANGED,

          message: `"${book.title}" changed to ${finalStatus}`,

          metadata: {
            bookId: book.id,
            from: existing.status,
            to: finalStatus,
          },
        },
      });

    // Notify connected clients immediately.
    emitToUser(
      req.user.id,
      'activity:created',
      activity
    );
  }

  res.json(book);
}


async function deleteBook(req, res) {
  const book = await prisma.book.findFirst({
    where: {
      id: req.params.id,
      ownerId: req.user.id,
    },
  });

  if (!book) {
    return res.status(404).json({
      message: 'Book not found.',
    });
  }

  await prisma.book.delete({
    where: {
      id: book.id,
    },
  });

  res.json({
    message: 'Book deleted.',
  });
}


async function updateProgress(req, res) {
  const book = await prisma.book.findFirst({
    where: {
      id: req.params.id,
      ownerId: req.user.id,
    },
  });

  if (!book) {
    return res.status(404).json({
      message: 'Book not found.',
    });
  }

  const { currentPage } = req.body;

  if (
    !Number.isInteger(currentPage) ||
    currentPage < 0
  ) {
    return res.status(400).json({
      message:
        'Current page cannot be negative and must be an integer.',
    });
  }

  if (!book.totalPages) {
    return res.status(400).json({
      message:
        'Cannot record progress because total pages is not set.',
    });
  }

  if (currentPage > book.totalPages) {
    return res.status(400).json({
      message:
        'Page cannot exceed total pages.',
    });
  }

  const finished =
    currentPage === book.totalPages;

  const updated = await prisma.book.update({
    where: {
      id: book.id,
    },

    data: {
      currentPage,

      status: finished
        ? BookStatus.FINISHED
        : BookStatus.READING,

      finishedAt: finished
        ? book.finishedAt || new Date()
        : null,
    },
  });

  res.json({
    ...updated,

    progressPercentage: Math.round(
      (currentPage / book.totalPages) * 100
    ),
  });
}


module.exports = {
  listBooks,
  getBook,
  addBook,
  updateBook,
  deleteBook,
  updateProgress,
};