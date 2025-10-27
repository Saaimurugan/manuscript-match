/**
 * ProductList Component - Displays a list of products
 */

import { useState } from 'react';
import { useProducts, useProductStats } from '@/hooks/useProducts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const ProductList = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  
  const { data: products, isLoading, error } = useProducts(selectedCategory);
  const { data: stats } = useProductStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load products. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Product Statistics</CardTitle>
            <CardDescription>Overview of your product inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
                <div className="text-sm text-muted-foreground">Total Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.inStock}</div>
                <div className="text-sm text-muted-foreground">In Stock</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
                <div className="text-sm text-muted-foreground">Out of Stock</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">${stats.totalValue.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Value</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Section */}
      <div className="flex items-center gap-4">
        <Select value={selectedCategory || 'all'} onValueChange={(value) => setSelectedCategory(value === 'all' ? undefined : value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {stats?.categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedCategory && (
          <Button variant="outline" onClick={() => setSelectedCategory(undefined)}>
            Clear Filter
          </Button>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.map((product) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-video bg-muted relative">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <Badge 
                className="absolute top-2 right-2" 
                variant={product.inStock ? 'default' : 'destructive'}
              >
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </Badge>
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <Badge variant="outline">{product.category}</Badge>
              </div>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">${product.price.toFixed(2)}</span>
                <Button disabled={!product.inStock}>
                  {product.inStock ? 'Add to Cart' : 'Unavailable'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products found.</p>
        </div>
      )}
    </div>
  );
};
