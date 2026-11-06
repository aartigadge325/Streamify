const express = require('express');
const { authenticate, authorize } = require('../middleware/authenticate');
const controller = require('../controllers/admin.controller');
const router = express.Router();

router.use(authenticate, authorize('admin'));
router.get('/users', controller.listUsers);
router.patch('/users/:userId/role', controller.setUserRole);

module.exports = router;
