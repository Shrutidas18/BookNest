const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/lendingController');

router.use(requireAuth);

// Lend one of my books to another registered user
router.post(
  '/books/:bookId',
  controller.lendBook
);

// Books I have currently lent to others
router.get(
  '/lent',
  controller.lentBooks
);

// Books currently lent to me
router.get(
  '/borrowed',
  controller.borrowedBooks
);

// Mark a lending record as returned
router.post(
  '/:lendingId/return',
  controller.returnBook
);

module.exports = router;