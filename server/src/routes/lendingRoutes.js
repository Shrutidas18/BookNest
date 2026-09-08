const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/lendingController');

router.use(requireAuth);
router.post('/books/:bookId', controller.lendBook);
router.get('/borrowed', controller.borrowedBooks);
router.post('/:lendingId/return', controller.returnBook);

module.exports = router;
