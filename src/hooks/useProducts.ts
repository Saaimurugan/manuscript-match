/**
 * useProducts Hook - React Query hook for product data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductService, Product, ProductStats } from '@/services/productService';
import { toast } from 'sonner';

/**
 * Hook to fetch all products
 */
export const useProducts = (category?: string) => {
  return useQuery({
    queryKey: ['products', category],
    queryFn: () => ProductService.getAllProducts(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single product by ID
 */
export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => ProductService.getProductById(id),
    enabled: !!id,
  });
};

/**
 * Hook to fetch product statistics
 */
export const useProductStats = () => {
  return useQuery({
    queryKey: ['productStats'],
    queryFn: () => ProductService.getProductStats(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to create a new product
 */
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productData: Omit<Product, 'id' | 'createdAt'>) =>
      ProductService.createProduct(productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productStats'] });
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
};
