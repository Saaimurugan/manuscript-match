# API to Frontend Workflow Guide

This guide demonstrates how data flows from the backend API (with dummy data) to the frontend components.

## Architecture Overview

```
Backend (Express + TypeScript)
    ↓
API Routes (/api/products)
    ↓
Controllers (ProductController)
    ↓
Dummy Data (in-memory)
    ↓
JSON Response
    ↓
Frontend Service (ProductService)
    ↓
React Query Hooks (useProducts)
    ↓
React Components (ProductList)
    ↓
UI Display
```

## Backend Setup

### 1. Controller with Dummy Data
**File:** `backend/src/controllers/ProductController.ts`

The controller contains dummy product data and handles API requests:

```typescript
const dummyProducts = [
  {
    id: '1',
    name: 'Laptop Pro 15',
    price: 1299.99,
    category: 'Electronics',
    inStock: true,
    // ... more fields
  },
  // ... more products
];
```

**Key Features:**
- Simulated API delays (realistic behavior)
- Filtering by category
- Statistics calculation
- Error handling

### 2. Routes
**File:** `backend/src/routes/products.ts`

Defines API endpoints:
- `GET /api/products` - Get all products (with optional category filter)
- `GET /api/products/stats` - Get product statistics
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product

### 3. App Registration
**File:** `backend/src/app.ts`

Routes are registered in the Express app:
```typescript
import productRoutes from '@/routes/products';
app.use('/api/products', productRoutes);
```

## Frontend Setup

### 1. Service Layer
**File:** `src/services/productService.ts`

Handles API communication using the base `apiService`:

```typescript
export class ProductService {
  static async getAllProducts(category?: string): Promise<Product[]> {
    const response = await apiService.get<Product[]>('/api/products', params);
    return response.data || [];
  }
  // ... more methods
}
```

**Features:**
- Type-safe API calls
- Error handling
- Automatic retries (from base apiService)
- Authentication token management

### 2. React Query Hooks
**File:** `src/hooks/useProducts.ts`

Provides data fetching with caching and state management:

```typescript
export const useProducts = (category?: string) => {
  return useQuery({
    queryKey: ['products', category],
    queryFn: () => ProductService.getAllProducts(category),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};
```

**Benefits:**
- Automatic caching
- Background refetching
- Loading and error states
- Optimistic updates

### 3. React Components
**File:** `src/components/products/ProductList.tsx`

Displays the data with UI components:

```typescript
const { data: products, isLoading, error } = useProducts(selectedCategory);
```

**Features:**
- Loading skeletons
- Error handling
- Category filtering
- Statistics display
- Responsive grid layout

### 4. Page Component
**File:** `src/pages/Products.tsx`

Main page that wraps the ProductList component.

## Data Flow Example

### Request Flow:
1. User visits `/products` page
2. `ProductList` component mounts
3. `useProducts()` hook triggers
4. React Query checks cache
5. If not cached, calls `ProductService.getAllProducts()`
6. Service calls `apiService.get('/api/products')`
7. API service adds auth token and makes HTTP request
8. Backend route receives request
9. Controller returns dummy data with simulated delay
10. Response flows back through the chain
11. React Query caches the data
12. Component receives data and renders

### Response Format:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Laptop Pro 15",
      "description": "High-performance laptop",
      "price": 1299.99,
      "category": "Electronics",
      "inStock": true,
      "imageUrl": "https://...",
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  ],
  "message": "Products retrieved successfully"
}
```

## Testing the Workflow

### 1. Start Backend
```bash
cd backend
npm run dev
```

Backend will run on `http://localhost:3001`

### 2. Start Frontend
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

### 3. Test API Endpoints

**Get all products:**
```bash
curl http://localhost:3001/api/products
```

**Get products by category:**
```bash
curl http://localhost:3001/api/products?category=Electronics
```

**Get product statistics:**
```bash
curl http://localhost:3001/api/products/stats
```

**Get product by ID:**
```bash
curl http://localhost:3001/api/products/1
```

### 4. View in Browser
Navigate to `http://localhost:5173/products` to see the products page.

## Key Features Demonstrated

### Backend:
✅ Dummy data management
✅ RESTful API design
✅ Request validation
✅ Error handling
✅ Simulated delays (realistic behavior)
✅ Filtering and querying

### Frontend:
✅ Service layer abstraction
✅ React Query integration
✅ Type-safe API calls
✅ Loading states
✅ Error handling
✅ Data caching
✅ Responsive UI
✅ Component composition

## Extending the Workflow

### Adding New Endpoints:

1. **Backend:**
   - Add method to controller
   - Add route definition
   - Update types if needed

2. **Frontend:**
   - Add method to service
   - Create React Query hook
   - Use in components

### Example - Add Delete Product:

**Backend Controller:**
```typescript
static async deleteProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  // Delete logic here
  res.status(200).json({ success: true, message: 'Product deleted' });
}
```

**Backend Route:**
```typescript
router.delete('/:id', ProductController.deleteProduct);
```

**Frontend Service:**
```typescript
static async deleteProduct(id: string): Promise<void> {
  await apiService.delete(`/api/products/${id}`);
}
```

**Frontend Hook:**
```typescript
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ProductService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
  });
};
```

## Best Practices

1. **Type Safety:** Use TypeScript interfaces for all data structures
2. **Error Handling:** Handle errors at every layer
3. **Loading States:** Show loading indicators for better UX
4. **Caching:** Use React Query's caching to reduce API calls
5. **Validation:** Validate data on both frontend and backend
6. **Separation of Concerns:** Keep services, hooks, and components separate
7. **Reusability:** Create reusable components and hooks

## Troubleshooting

### CORS Issues:
- Check backend CORS configuration in `backend/src/app.ts`
- Ensure frontend URL is in allowed origins

### API Not Responding:
- Verify backend is running on correct port
- Check `src/lib/config.ts` for correct API URL
- Check browser console for errors

### Data Not Loading:
- Check React Query DevTools
- Verify API response format
- Check network tab in browser DevTools

## Next Steps

1. Replace dummy data with real database (Prisma)
2. Add authentication to protected routes
3. Implement pagination for large datasets
4. Add search functionality
5. Implement real-time updates with WebSockets
6. Add unit and integration tests

## Resources

- [Express Documentation](https://expressjs.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Axios Documentation](https://axios-http.com/)
