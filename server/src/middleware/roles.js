const prisma = require('../utils/prisma');

function requireShelfAccess(role) {
  return async (req, res, next) => {
    const shelfId = req.params.shelfId || req.params.id;

    const shelf = await prisma.shelf.findUnique({
      where: { id: shelfId },
      include: { collaborators: true }
    });

    if (!shelf) {
      return res.status(404).json({
        message: 'Shelf not found.'
      });
    }

    // Owner has full access to their shelf.
    if (shelf.ownerId === req.user.id) {
      req.shelf = shelf;
      req.shelfRole = 'OWNER';
      return next();
    }

    // Find collaborator access.
    const share = shelf.collaborators.find(
      (c) => c.userId === req.user.id
    );

    if (!share) {
      return res.status(403).json({
        message: 'You do not have access to this shelf.'
      });
    }

    // Owner-only actions cannot be performed by collaborators.
    if (role === 'OWNER') {
      return res.status(403).json({
        message: 'Only the shelf owner can perform this action.'
      });
    }

    // Editor actions require EDITOR permission.
    if (role === 'EDITOR' && share.role !== 'EDITOR') {
      return res.status(403).json({
        message: 'Viewer permission does not allow this action.'
      });
    }

    req.shelf = shelf;
    req.shelfRole = share.role;

    next();
  };
}

module.exports = { requireShelfAccess };