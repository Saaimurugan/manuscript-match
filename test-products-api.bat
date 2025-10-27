@echo off
echo Testing Products API Endpoints
echo ================================
echo.

echo 1. Testing GET /api/products
curl -X GET http://localhost:3001/api/products
echo.
echo.

echo 2. Testing GET /api/products/stats
curl -X GET http://localhost:3001/api/products/stats
echo.
echo.

echo 3. Testing GET /api/products/1
curl -X GET http://localhost:3001/api/products/1
echo.
echo.

echo 4. Testing GET /api/products?category=Electronics
curl -X GET "http://localhost:3001/api/products?category=Electronics"
echo.
echo.

echo All tests completed!
pause
