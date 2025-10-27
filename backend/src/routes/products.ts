import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';

const router = Router();

/**
 * Product Routes
 * Base path: /api/products
 */

// Get all products (with optional category filter)
router.get('/', ProductController.getAllProducts);

// Get product statistics
router.get('/stats', ProductController.getProductStats);

// Get product by ID
router.get('/:id', ProductController.getProductById);

// Create new product
router.post('/', ProductController.createProduct);

export default router;
