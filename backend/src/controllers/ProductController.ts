import { Request, Response } from 'express';

/**
 * Product Controller - Handles product-related API endpoints with dummy data
 */

// Dummy product data
const dummyProducts = [
  {
    id: '1',
    name: 'Laptop Pro 15',
    description: 'High-performance laptop for professionals',
    price: 1299.99,
    category: 'Electronics',
    inStock: true,
    imageUrl: 'https://via.placeholder.com/300x200?text=Laptop',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with precision tracking',
    price: 29.99,
    category: 'Accessories',
    inStock: true,
    imageUrl: 'https://via.placeholder.com/300x200?text=Mouse',
    createdAt: new Date('2024-02-10'),
  },
  {
    id: '3',
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical keyboard with blue switches',
    price: 89.99,
    category: 'Accessories',
    inStock: false,
    imageUrl: 'https://via.placeholder.com/300x200?text=Keyboard',
    createdAt: new Date('2024-03-05'),
  },
  {
    id: '4',
    name: '4K Monitor',
    description: '27-inch 4K UHD monitor with HDR support',
    price: 449.99,
    category: 'Electronics',
    inStock: true,
    imageUrl: 'https://via.placeholder.com/300x200?text=Monitor',
    createdAt: new Date('2024-01-20'),
  },
  {
    id: '5',
    name: 'USB-C Hub',
    description: '7-in-1 USB-C hub with multiple ports',
    price: 39.99,
    category: 'Accessories',
    inStock: true,
    imageUrl: 'https://via.placeholder.com/300x200?text=USB+Hub',
    createdAt: new Date('2024-02-28'),
  },
];

export class ProductController {
  /**
   * Get all products
   */
  static async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Optional filtering by category
      const { category } = req.query;
      let products = dummyProducts;

      if (category && typeof category === 'string') {
        products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
      }

      res.status(200).json({
        success: true,
        data: products,
        message: 'Products retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve products',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      const product = dummyProducts.find(p => p.id === id);

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: product,
        message: 'Product retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve product',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create new product (dummy - just returns the input)
   */
  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const productData = req.body;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 400));

      const newProduct = {
        id: String(dummyProducts.length + 1),
        ...productData,
        createdAt: new Date(),
      };

      // In a real app, you'd save to database
      // For now, just return the created product
      res.status(201).json({
        success: true,
        data: newProduct,
        message: 'Product created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get product statistics
   */
  static async getProductStats(_req: Request, res: Response): Promise<void> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = {
        totalProducts: dummyProducts.length,
        inStock: dummyProducts.filter(p => p.inStock).length,
        outOfStock: dummyProducts.filter(p => !p.inStock).length,
        categories: [...new Set(dummyProducts.map(p => p.category))],
        totalValue: dummyProducts.reduce((sum, p) => sum + p.price, 0),
      };

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Product statistics retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve product statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
