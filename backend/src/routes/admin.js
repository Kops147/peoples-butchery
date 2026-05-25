import express from 'express';
import { getStats, getAllOrders, updateOrderStatus, getAllUsers } from '../controllers/adminController.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', adminAuth, getStats);
router.get('/orders', adminAuth, getAllOrders);
router.put('/orders/:id/status', adminAuth, updateOrderStatus);
router.get('/users', adminAuth, getAllUsers);

export default router;
