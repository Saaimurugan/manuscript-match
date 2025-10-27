/**
 * Product Service - Handles product-related API calls
 */

import { apiService } from './apiService';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  imageUrl: string;
  createdAt: Date;
}

export interface ProductStats {
  totalProducts: number;
  inStock: number;
  outOfStock: number;
  categories: string[];
  totalValue: number;
}

export class ProductService {
  /**
   * Get all products
   */
  static async getAllProducts(category?: string): Promise<Product[]> {
    try {
      const params = category ? { category } : undefined;
      const response = await apiService.get<Product[]>('/api/products', params);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(id: string): Promise<Product> {
    try {
      const response = await apiService.get<Product>(`/api/products/${id}`);
      if (!response.data) {
        throw new Error('Product not found');
      }
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new product
   */
  static async createProduct(productData: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    try {
      const response = await apiService.post<Product>('/api/products', productData);
      if (!response.data) {
        throw new Error('Failed to create product');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  static async getProductStats(): Promise<ProductStats> {
    try {
      const response = await apiService.get<ProductStats>('/api/products/stats');
      if (!response.data) {
        throw new Error('Failed to fetch product statistics');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to fetch product statistics:', error);
      throw error;
    }
  }
}

export default ProductService;
