const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/bookController');

router.use(requireAuth);

router.get('/', controller.listBooks);
router.get('/:id', controller.getBook);

router.post('/', controller.addBook);

router.patch('/:id', controller.updateBook);
router.delete('/:id', controller.deleteBook);

router.post('/:id/progress', controller.updateProgress);

module.exports = router;