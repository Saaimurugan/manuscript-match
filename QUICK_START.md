# Quick Start Guide - Products Workflow

This guide will help you quickly test the API-to-Frontend workflow with dummy data.

## Prerequisites

- Node.js installed
- Both frontend and backend dependencies installed

## Step 1: Start the Backend

Open a terminal and run:

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 3001
```

## Step 2: Start the Frontend

Open another terminal and run:

```bash
npm run dev
```

You should see:
```
Local: http://localhost:5173/
```

## Step 3: Test the API Directly

### Option A: Using the Test Script (Windows)

Double-click `test-products-api.bat` or run:
```bash
test-products-api.bat
```

### Option B: Using curl manually

```bash
# Get all products
curl http://localhost:3001/api/products

# Get products by category
curl "http://localhost:3001/api/products?category=Electronics"

# Get product by ID
curl http://localhost:3001/api/products/1

# Get product statistics
curl http://localhost:3001/api/products/stats
```

### Option C: Using Browser

Open these URLs in your browser:
- http://localhost:3001/api/products
- http://localhost:3001/api/products/stats
- http://localhost:3001/api/products/1

## Step 4: View in the Frontend

1. Open your browser to: http://localhost:5173/products
2. You should see:
   - Product statistics card at the top
   - Category filter dropdown
   - Grid of product cards with images, prices, and stock status

## Step 5: Test Interactions

### Filter by Category
1. Click the category dropdown
2. Select "Electronics" or "Accessories"
3. Watch the products filter in real-time

### View Loading States
1. Open browser DevTools (F12)
2. Go to Network tab
3. Throttle network to "Slow 3G"
4. Refresh the page
5. You'll see skeleton loading states

### Test Error Handling
1. Stop the backend server
2. Refresh the frontend
3. You'll see an error message

## What's Happening Behind the Scenes?

### When you visit /products:

1. **React Router** navigates to the Products page
2. **ProductList component** renders
3. **useProducts hook** is called
4. **React Query** checks its cache
5. If not cached, **ProductService** makes an API call
6. **apiService** (Axios) sends HTTP request to backend
7. **Express backend** receives request
8. **ProductController** returns dummy data
9. Response flows back through the chain
10. **React Query** caches the data
11. **Component** renders with the data

### Data Flow Visualization:

```
User → Page → Component → Hook → Service → API → Backend → Controller → Dummy Data
                                                                              ↓
User ← Page ← Component ← Hook ← Service ← API ← Backend ← Controller ← Response
```

## Expected Output

### API Response (JSON):
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Laptop Pro 15",
      "description": "High-performance laptop for professionals",
      "price": 1299.99,
      "category": "Electronics",
      "inStock": true,
      "imageUrl": "https://via.placeholder.com/300x200?text=Laptop",
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  ],
  "message": "Products retrieved successfully"
}
```

### Frontend Display:
- Product cards in a responsive grid
- Product images (placeholder)
- Product names and descriptions
- Prices formatted as currency
- Stock status badges (green for in stock, red for out of stock)
- Category badges
- "Add to Cart" buttons (disabled for out of stock items)

## Troubleshooting

### Backend not starting?
```bash
cd backend
npm install
npm run dev
```

### Frontend not starting?
```bash
npm install
npm run dev
```

### CORS errors?
- Check that backend is running on port 3001
- Check `backend/src/app.ts` CORS configuration
- Ensure `http://localhost:5173` is in allowed origins

### API returns 404?
- Verify backend is running
- Check the route is registered in `backend/src/app.ts`
- Look for: `app.use('/api/products', productRoutes);`

### Data not showing?
- Open browser DevTools (F12)
- Check Console for errors
- Check Network tab for API calls
- Verify API response format

### TypeScript errors?
```bash
# Frontend
npm run type-check

# Backend
cd backend
npm run build
```

## Next Steps

1. **Explore the code:**
   - Backend: `backend/src/controllers/ProductController.ts`
   - Frontend Service: `src/services/productService.ts`
   - Frontend Hook: `src/hooks/useProducts.ts`
   - Frontend Component: `src/components/products/ProductList.tsx`

2. **Modify the dummy data:**
   - Edit `backend/src/controllers/ProductController.ts`
   - Add more products or change existing ones
   - Restart backend to see changes

3. **Add new features:**
   - Add product search
   - Add sorting options
   - Add pagination
   - Add product details page

4. **Replace with real database:**
   - Set up Prisma schema
   - Create database migrations
   - Replace dummy data with database queries

## Files Created

### Backend:
- `backend/src/routes/products.ts` - API routes
- `backend/src/controllers/ProductController.ts` - Controller with dummy data
- `backend/src/app.ts` - Updated with product routes

### Frontend:
- `src/services/productService.ts` - API service
- `src/hooks/useProducts.ts` - React Query hooks
- `src/components/products/ProductList.tsx` - UI component
- `src/pages/Products.tsx` - Page component

### Documentation:
- `WORKFLOW_GUIDE.md` - Detailed workflow documentation
- `docs/WORKFLOW_DIAGRAM.md` - Visual diagrams
- `QUICK_START.md` - This file
- `test-products-api.bat` - API test script

## Resources

- Full workflow guide: `WORKFLOW_GUIDE.md`
- Visual diagrams: `docs/WORKFLOW_DIAGRAM.md`
- Test script: `test-products-api.bat`

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify both servers are running
3. Check the Network tab in DevTools
4. Review the workflow documentation
5. Check that all dependencies are installed

Happy coding! 🚀
