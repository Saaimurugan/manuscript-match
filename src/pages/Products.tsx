/**
 * Products Page - Main page for displaying products
 */

import { ProductList } from '@/components/products/ProductList';

export const Products = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Products</h1>
        <p className="text-muted-foreground">
          Browse our collection of products with dummy data from the API
        </p>
      </div>
      
      <ProductList />
    </div>
  );
};

export default Products;
