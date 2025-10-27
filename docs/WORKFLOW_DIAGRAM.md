# API to Frontend Workflow Diagram

## Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Page Component (Products.tsx)                          │    │
│  │  - Route: /products                                     │    │
│  │  - Renders ProductList                                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  UI Component (ProductList.tsx)                         │    │
│  │  - Displays products in grid                            │    │
│  │  - Shows loading states                                 │    │
│  │  - Handles errors                                       │    │
│  │  - Category filtering                                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  React Query Hook (useProducts.ts)                      │    │
│  │  - Data fetching                                        │    │
│  │  - Caching (5 min)                                      │    │
│  │  - Auto refetch                                         │    │
│  │  - Loading/Error states                                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Service Layer (productService.ts)                      │    │
│  │  - getAllProducts(category?)                            │    │
│  │  - getProductById(id)                                   │    │
│  │  - getProductStats()                                    │    │
│  │  - createProduct(data)                                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Base API Service (apiService.ts)                       │    │
│  │  - Axios instance                                       │    │
│  │  - Auth token management                                │    │
│  │  - Request/Response interceptors                        │    │
│  │  - Error handling                                       │    │
│  │  - Retry logic                                          │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                              │
                    HTTP Request (JSON)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Express + TypeScript)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Express App (app.ts)                                   │    │
│  │  - CORS middleware                                      │    │
│  │  - Rate limiting                                        │    │
│  │  - Error handling                                       │    │
│  │  - Route registration                                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Routes (products.ts)                                   │    │
│  │  GET    /api/products                                   │    │
│  │  GET    /api/products/stats                             │    │
│  │  GET    /api/products/:id                               │    │
│  │  POST   /api/products                                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Controller (ProductController.ts)                      │    │
│  │  - Request validation                                   │    │
│  │  - Business logic                                       │    │
│  │  - Response formatting                                  │    │
│  │  - Error handling                                       │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Dummy Data (In-Memory)                                 │    │
│  │  const dummyProducts = [                                │    │
│  │    { id: '1', name: 'Laptop', ... },                    │    │
│  │    { id: '2', name: 'Mouse', ... },                     │    │
│  │    ...                                                   │    │
│  │  ]                                                       │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                              │
                    HTTP Response (JSON)
                              │
                              ▼
                    ┌──────────────────┐
                    │  Browser Display  │
                    └──────────────────┘
```

## Request/Response Example

### Request Flow:
```
User clicks "Products" page
    ↓
React Router navigates to /products
    ↓
Products.tsx renders ProductList.tsx
    ↓
ProductList calls useProducts() hook
    ↓
React Query checks cache
    ↓
If not cached, calls ProductService.getAllProducts()
    ↓
Service calls apiService.get('/api/products')
    ↓
Axios makes HTTP GET request
    ↓
Request hits Express middleware chain
    ↓
Routes to ProductController.getAllProducts()
    ↓
Controller returns dummy data
    ↓
Response sent back to frontend
    ↓
React Query caches response
    ↓
Component receives data and renders
```

### Sample Request:
```http
GET /api/products?category=Electronics HTTP/1.1
Host: localhost:3001
Authorization: Bearer eyJhbGc...
Content-Type: application/json
```

### Sample Response:
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
    },
    {
      "id": "4",
      "name": "4K Monitor",
      "description": "27-inch 4K UHD monitor with HDR support",
      "price": 449.99,
      "category": "Electronics",
      "inStock": true,
      "imageUrl": "https://via.placeholder.com/300x200?text=Monitor",
      "createdAt": "2024-01-20T00:00:00.000Z"
    }
  ],
  "message": "Products retrieved successfully"
}
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│                    React Query Cache                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Query Key: ['products', undefined]                     │
│  Status: success                                         │
│  Data: [...products]                                     │
│  Stale Time: 5 minutes                                   │
│  Last Fetched: 2024-10-24 10:30:00                      │
│                                                          │
│  Query Key: ['products', 'Electronics']                 │
│  Status: success                                         │
│  Data: [...filtered products]                           │
│  Stale Time: 5 minutes                                   │
│  Last Fetched: 2024-10-24 10:31:00                      │
│                                                          │
│  Query Key: ['productStats']                            │
│  Status: success                                         │
│  Data: { totalProducts: 5, ... }                        │
│  Stale Time: 10 minutes                                  │
│  Last Fetched: 2024-10-24 10:30:00                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Component Lifecycle

```
Mount
  ↓
useProducts() hook initializes
  ↓
React Query checks cache
  ↓
┌─────────────┐
│ Cache Hit?  │
└─────────────┘
  │         │
  │ Yes     │ No
  ↓         ↓
Return      Fetch from API
cached      ↓
data        Set loading state
  │         ↓
  │         API call
  │         ↓
  │         Update cache
  │         ↓
  └─────────┴─────────→ Render with data
                        ↓
                        User interaction
                        ↓
                        State update
                        ↓
                        Re-render
```

## Error Handling Flow

```
API Error Occurs
  ↓
apiService catches error
  ↓
ErrorHandler.handle(error)
  ↓
┌─────────────────────────────────┐
│ Determine Error Type            │
├─────────────────────────────────┤
│ - Network Error (no response)   │
│ - 401 Unauthorized              │
│ - 429 Rate Limit                │
│ - 400/409 Validation            │
│ - 500+ Server Error             │
└─────────────────────────────────┘
  ↓
Return UserFriendlyError
  ↓
React Query onError callback
  ↓
Display toast notification
  ↓
Component shows error state
```

## File Structure

```
project/
├── backend/
│   └── src/
│       ├── routes/
│       │   └── products.ts          ← API routes
│       ├── controllers/
│       │   └── ProductController.ts ← Business logic + dummy data
│       └── app.ts                   ← Route registration
│
└── src/
    ├── services/
    │   └── productService.ts        ← API calls
    ├── hooks/
    │   └── useProducts.ts           ← React Query hooks
    ├── components/
    │   └── products/
    │       └── ProductList.tsx      ← UI component
    └── pages/
        └── Products.tsx             ← Page component
```

## Key Technologies

- **Backend:** Express.js, TypeScript
- **Frontend:** React, TypeScript, Vite
- **State Management:** React Query (TanStack Query)
- **HTTP Client:** Axios
- **UI Components:** shadcn/ui (Radix UI + Tailwind CSS)
- **Routing:** React Router
- **Notifications:** Sonner (toast)
