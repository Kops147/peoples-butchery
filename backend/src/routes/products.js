import express from 'express';
import { getProducts, getProductById, createProduct, updateProduct } from '../controllers/productController.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', adminAuth, createProduct);
router.put('/:id', adminAuth, updateProduct);

export default router;
