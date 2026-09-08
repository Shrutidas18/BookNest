const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireShelfAccess } = require('../middleware/roles');
const controller = require('../controllers/shelfController');

router.use(requireAuth);
router.post('/', controller.createShelf);
router.get('/mine', controller.myShelves);
router.get('/shared-with-me', controller.sharedWithMe);
router.get('/:id', controller.getShelf);
router.post('/:shelfId/books', requireShelfAccess('EDITOR'), controller.addBookToShelf);
router.delete('/:shelfId/books/:bookId', requireShelfAccess('EDITOR'), controller.removeBookFromShelf);
router.post('/:id/share', requireShelfAccess('OWNER'), controller.shareShelf);
router.delete('/:id/collaborators/:shareId', requireShelfAccess('OWNER'), controller.removeCollaborator);
router.delete('/:id', requireShelfAccess('OWNER'), controller.deleteShelf);

module.exports = router;
