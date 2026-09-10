
const { ActivityType } = require('@prisma/client');
const prisma = require('../utils/prisma');
const {
  emitToUsers,
  emitToUser,
  emitToShelf,
  removeUserFromShelf,
} = require('../socket');

async function createShelf(req, res) {
  const { name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({
      message: 'Shelf name is required.',
    });
  }

  const shelf = await prisma.shelf.create({
    data: {
      name: name.trim(),
      ownerId: req.user.id,
    },
  });

  res.status(201).json(shelf);
}

async function myShelves(req, res) {
  const shelves = await prisma.shelf.findMany({
    where: {
      ownerId: req.user.id,
    },
    include: {
      books: {
        include: {
          book: true,
        },
      },
      collaborators: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json(shelves);
}

async function sharedWithMe(req, res) {
  const shares = await prisma.shelfShare.findMany({
    where: {
      userId: req.user.id,
    },
    include: {
      shelf: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          books: {
            include: {
              book: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const shelves = shares.map((share) => ({
    ...share.shelf,
    role: share.role,
    shareId: share.id,
  }));

  res.json(shelves);
}

async function getShelf(req, res) {
  const shelf = await prisma.shelf.findUnique({
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
      books: {
        include: {
          book: true,
        },
      },
      collaborators: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!shelf) {
    return res.status(404).json({
      message: 'Shelf not found.',
    });
  }

  const access =
    shelf.ownerId === req.user.id ||
    shelf.collaborators.some(
      (collaborator) =>
        collaborator.userId === req.user.id
    );

  if (!access) {
    return res.status(403).json({
      message: 'You do not have access to this shelf.',
    });
  }

  res.json(shelf);
}

async function addBookToShelf(req, res) {
  const book = await prisma.book.findFirst({
    where: {
      id: req.body.bookId,
      ownerId: req.user.id,
    },
  });

  if (!book) {
    return res.status(404).json({
      message: 'You can only add your own book to a shelf.',
    });
  }

  try {
    const relation = await prisma.shelfBook.create({
      data: {
        shelfId: req.params.shelfId,
        bookId: book.id,
      },
    });

    const shelf = await prisma.shelf.findUnique({
      where: {
        id: req.params.shelfId,
      },
      select: {
        ownerId: true,
        collaborators: {
          select: {
            userId: true,
          },
        },
      },
    });

    const userIds = [
      shelf?.ownerId,
      ...(shelf?.collaborators || []).map(
        (collaborator) => collaborator.userId
      ),
    ];

    emitToUsers(
      userIds,
      'shelf:book-added',
      {
        shelfId: req.params.shelfId,
        book,
        relation,
      }
    );

    emitToShelf(
      req.params.shelfId,
      'shelf:book-added',
      {
        shelfId: req.params.shelfId,
        book,
        relation,
      }
    );

    res.status(201).json(relation);
  } catch {
    res.status(409).json({
      message: 'Book is already on this shelf.',
    });
  }
}

async function removeBookFromShelf(req, res) {
  const relation = await prisma.shelfBook.findFirst({
    where: {
      shelfId: req.params.shelfId,
      bookId: req.params.bookId,
    },
    include: {
      book: true,
    },
  });

  if (!relation) {
    return res.status(404).json({
      message: 'Book is not on this shelf.',
    });
  }

  await prisma.shelfBook.delete({
    where: {
      shelfId_bookId: {
        shelfId: req.params.shelfId,
        bookId: req.params.bookId,
      },
    },
  });

  const shelf = await prisma.shelf.findUnique({
    where: {
      id: req.params.shelfId,
    },
    select: {
      ownerId: true,
      collaborators: {
        select: {
          userId: true,
        },
      },
    },
  });

  const userIds = [
    shelf?.ownerId,
    ...(shelf?.collaborators || []).map(
      (collaborator) => collaborator.userId
    ),
  ];

  emitToUsers(
    userIds,
    'shelf:book-removed',
    {
      shelfId: req.params.shelfId,
      bookId: req.params.bookId,
    }
  );

  emitToShelf(
    req.params.shelfId,
    'shelf:book-removed',
    {
      shelfId: req.params.shelfId,
      bookId: req.params.bookId,
    }
  );

  res.json({
    message: 'Book removed from shelf.',
  });
}

async function shareShelf(req, res) {
  const { email, role } = req.body;

  if (!['EDITOR', 'VIEWER'].includes(role)) {
    return res.status(400).json({
      message: 'Role must be EDITOR or VIEWER.',
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      email: email?.toLowerCase().trim(),
    },
  });

  if (!user) {
    return res.status(404).json({
      message: 'Registered user not found.',
    });
  }

  if (user.id === req.user.id) {
    return res.status(400).json({
      message: 'Owner cannot be added as a collaborator.',
    });
  }

  const existing =
    await prisma.shelfShare.findUnique({
      where: {
        shelfId_userId: {
          shelfId: req.params.id,
          userId: user.id,
        },
      },
    });

  const share = existing
    ? await prisma.shelfShare.update({
        where: {
          id: existing.id,
        },
        data: {
          role,
        },
      })
    : await prisma.shelfShare.create({
        data: {
          shelfId: req.params.id,
          userId: user.id,
          role,
        },
      });

  const activity =
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        type: existing
          ? ActivityType.COLLABORATOR_ROLE_CHANGED
          : ActivityType.SHELF_SHARED,
        message: existing
          ? `Changed ${user.email}'s role to ${role}`
          : `Shared shelf with ${user.email} as ${role}`,
        metadata: {
          shelfId: req.params.id,
          collaboratorId: user.id,
          role,
        },
      },
    });

  // Notify the collaborator directly about the
  // share or role change.
  emitToUsers(
    [req.user.id, user.id],
    existing
      ? 'shelf:role-changed'
      : 'shelf:shared',
    {
      shelfId: req.params.id,
      collaboratorId: user.id,
      role,
      share,
    }
  );

  emitToShelf(
    req.params.id,
    existing
      ? 'shelf:role-changed'
      : 'shelf:shared',
    {
      shelfId: req.params.id,
      collaboratorId: user.id,
      role,
      share,
    }
  );

  // Update owner's dashboard activity feed.
  emitToUser(
    req.user.id,
    'activity:created',
    activity
  );

  res.status(existing ? 200 : 201).json(share);
}

async function removeCollaborator(req, res) {
  const share = await prisma.shelfShare.findUnique({
    where: {
      id: req.params.shareId,
    },
  });

  if (
    !share ||
    share.shelfId !== req.params.id
  ) {
    return res.status(404).json({
      message: 'Collaborator share not found.',
    });
  }

  await prisma.shelfShare.delete({
    where: {
      id: share.id,
    },
  });
  removeUserFromShelf(
  share.userId,
  req.params.id
);

  const activity =
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        type: ActivityType.COLLABORATOR_REMOVED,
        message: 'Removed a shelf collaborator',
        metadata: {
          shelfId: req.params.id,
          collaboratorId: share.userId,
        },
      },
    });

  emitToUsers(
    [req.user.id, share.userId],
    'shelf:collaborator-removed',
    {
      shelfId: req.params.id,
      collaboratorId: share.userId,
      shareId: share.id,
    }
  );

  emitToShelf(
    req.params.id,
    'shelf:collaborator-removed',
    {
      shelfId: req.params.id,
      collaboratorId: share.userId,
      shareId: share.id,
    }
  );

  // Update owner's dashboard activity feed.
  emitToUser(
    req.user.id,
    'activity:created',
    activity
  );

  res.json({
    message: 'Collaborator removed.',
  });
}

async function deleteShelf(req, res) {
  const shelfId = req.params.id;

  const shelf = await prisma.shelf.findUnique({
    where: {
      id: shelfId,
    },
    select: {
      ownerId: true,
      collaborators: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!shelf) {
    return res.status(404).json({
      message: 'Shelf not found.',
    });
  }

  const userIds = [
    shelf.ownerId,
    ...shelf.collaborators.map(
      (collaborator) => collaborator.userId
    ),
  ];

  await prisma.shelf.delete({
    where: {
      id: shelfId,
    },
  });

  emitToUsers(
    userIds,
    'shelf:deleted',
    {
      shelfId,
    }
  );

  res.json({
    message: 'Shelf deleted.',
  });
}

module.exports = {
  createShelf,
  myShelves,
  sharedWithMe,
  getShelf,
  addBookToShelf,
  removeBookFromShelf,
  shareShelf,
  removeCollaborator,
  deleteShelf,
};
