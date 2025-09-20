# ScholarFinder Backend API Documentation

## Overview

The ScholarFinder Backend API provides comprehensive endpoints for manuscript analysis and peer reviewer recommendation workflows. This RESTful API supports the complete process from manuscript upload through reviewer shortlist generation and export.

## Quick Start

### 1. Access Swagger Documentation

The interactive API documentation is available at:
- **Development:** http://localhost:3000/api-docs
- **Production:** https://api.scholarfinder.com/api-docs

### 2. Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### 3. Getting Started

1. **Register a new user:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email": "researcher@university.edu", "password": "SecurePassword123!"}'
   ```

2. **Login to get JWT token:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "researcher@university.edu", "password": "SecurePassword123!"}'
   ```

3. **Create a new process:**
   ```bash
   curl -X POST http://localhost:3000/api/processes \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <your-jwt-token>" \
     -d '{"title": "My Research Analysis", "description": "Analysis description"}'
   ```

## API Endpoints Overview

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | User login | No |
| GET | `/api/auth/verify` | Verify JWT token | Yes |
| POST | `/api/auth/logout` | User logout | Yes |
| PUT | `/api/auth/change-password` | Change password | Yes |
| GET | `/api/auth/profile` | Get user profile | Yes |

### Process Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/processes` | Create new process | Yes |
| GET | `/api/processes` | List user processes | Yes |
| GET | `/api/processes/stats` | Get process statistics | Yes |
| GET | `/api/processes/:id` | Get process details | Yes |
| PUT | `/api/processes/:id` | Update process | Yes |
| PUT | `/api/processes/:id/step` | Update process step | Yes |
| DELETE | `/api/processes/:id` | Delete process | Yes |

### Manuscript Processing
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/processes/:id/upload` | Upload manuscript file | Yes |
| GET | `/api/processes/:id/metadata` | Get extracted metadata | Yes |
| PUT | `/api/processes/:id/metadata` | Update metadata | Yes |

### Keyword Enhancement
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/processes/:id/keywords/enhance` | Enhance keywords | Yes |
| GET | `/api/processes/:id/keywords` | Get keywords | Yes |
| PUT | `/api/processes/:id/keywords/selection` | Update keyword selection | Yes |

### Database Search
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/processes/:id/search` | Initiate database search | Yes |
| GET | `/api/processes/:id/search/status` | Get search status | Yes |
| POST | `/api/processes/:id/search/manual/name` | Search by name | Yes |
| POST | `/api/processes/:id/search/manual/email` | Search by email | Yes |

### Author Validation
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/processes/:id/validate` | Validate authors | Yes |
| GET | `/api/processes/:id/validation/results` | Get validation results | Yes |

### Recommendations
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/processes/:id/candidates` | Get candidate reviewers | Yes |
| GET | `/api/processes/:id/recommendations` | Get recommendations | Yes |
| GET | `/api/processes/:id/recommendations/filters` | Get filter options | Yes |

### Shortlist Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/processes/:id/shortlist` | Create shortlist | Yes |
| GET | `/api/processes/:id/shortlists` | Get shortlists | Yes |
| GET | `/api/processes/:id/export/:format` | Export shortlist | Yes |

### Admin Endpoints (Admin Only)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/processes` | Get all processes | Admin |
| GET | `/api/admin/processes/:id` | Get process details | Admin |
| GET | `/api/admin/logs` | Get activity logs | Admin |
| GET | `/api/admin/stats` | Get system statistics | Admin |
| GET | `/api/admin/users/:id` | Get user details | Admin |
| GET | `/api/admin/export/:type` | Export admin data | Admin |

### Health & Monitoring
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Basic health check | No |
| GET | `/health/live` | Liveness probe | No |
| GET | `/health/ready` | Readiness probe | No |
| GET | `/metrics` | System metrics | No |
| GET | `/metrics/performance` | Performance metrics | No |
| GET | `/metrics/requests` | Request metrics | No |
| GET | `/metrics/errors` | Error metrics | No |

## Complete Workflow Example

Here's a complete example of the manuscript analysis workflow:

### Step 1: Authentication
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "researcher@university.edu", "password": "SecurePassword123!"}'

# Login and save token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "researcher@university.edu", "password": "SecurePassword123!"}' \
  | jq -r '.token')
```

### Step 2: Create Process
```bash
PROCESS_ID=$(curl -X POST http://localhost:3000/api/processes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "ML in Healthcare Research", "description": "Analysis of ML applications"}' \
  | jq -r '.process.id')
```

### Step 3: Upload Manuscript
```bash
curl -X POST http://localhost:3000/api/processes/$PROCESS_ID/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@manuscript.pdf"
```

### Step 4: Get Extracted Metadata
```bash
curl -X GET http://localhost:3000/api/processes/$PROCESS_ID/metadata \
  -H "Authorization: Bearer $TOKEN"
```

### Step 5: Enhance Keywords
```bash
curl -X POST http://localhost:3000/api/processes/$PROCESS_ID/keywords/enhance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"includeOriginal": true, "generateMeshTerms": true, "generateSearchStrings": true}'
```

### Step 6: Initiate Database Search
```bash
curl -X POST http://localhost:3000/api/processes/$PROCESS_ID/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "keywords": ["machine learning", "medical diagnosis"],
    "databases": ["pubmed", "elsevier", "wiley", "taylorFrancis"],
    "searchOptions": {
      "maxResults": 500,
      "dateRange": {"from": "2020-01-01", "to": "2024-12-31"}
    }
  }'
```

### Step 7: Check Search Status
```bash
curl -X GET http://localhost:3000/api/processes/$PROCESS_ID/search/status \
  -H "Authorization: Bearer $TOKEN"
```

### Step 8: Validate Authors
```bash
curl -X POST http://localhost:3000/api/processes/$PROCESS_ID/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "validationRules": {
      "excludeManuscriptAuthors": true,
      "excludeCoAuthors": true,
      "minPublications": 10,
      "maxRetractions": 1
    }
  }'
```

### Step 9: Get Recommendations
```bash
curl -X GET "http://localhost:3000/api/processes/$PROCESS_ID/recommendations?page=1&limit=20&sortBy=relevanceScore&sortOrder=desc" \
  -H "Authorization: Bearer $TOKEN"
```

### Step 10: Create Shortlist
```bash
SHORTLIST_ID=$(curl -X POST http://localhost:3000/api/processes/$PROCESS_ID/shortlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Final Reviewer Shortlist",
    "selectedReviewers": ["author-id-1", "author-id-2", "author-id-3"]
  }' \
  | jq -r '.shortlist.id')
```

### Step 11: Export Shortlist
```bash
curl -X GET "http://localhost:3000/api/processes/$PROCESS_ID/export/csv?shortlistId=$SHORTLIST_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -o reviewer-shortlist.csv
```

## Response Formats

### Success Response
```json
{
  "data": {
    // Response data
  },
  "message": "Operation successful",
  "timestamp": "2024-12-16T10:00:00.000Z"
}
```

### Error Response
```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "timestamp": "2024-12-16T10:00:00.000Z"
}
```

## Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 202 | Accepted - Request accepted for processing |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Service temporarily unavailable |

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Authentication endpoints:** 5 requests per minute per IP
- **File upload endpoints:** 10 requests per hour per user
- **Search endpoints:** 20 requests per hour per user
- **General API endpoints:** 100 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

## File Upload Specifications

### Supported Formats
- **PDF:** `.pdf` files up to 50MB
- **Word Documents:** `.docx`, `.doc` files up to 50MB

### Upload Requirements
- Files must contain readable text
- Minimum 100 words for meaningful analysis
- Maximum file size: 50MB
- Supported languages: English (primary), with limited support for other languages

## Pagination

List endpoints support pagination with the following parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-based) |
| `limit` | integer | 20 | Items per page (max 100) |
| `sortBy` | string | `createdAt` | Sort field |
| `sortOrder` | string | `desc` | Sort order (`asc` or `desc`) |

### Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

## Filtering

Many endpoints support filtering with query parameters:

### Common Filters
- `status`: Filter by status
- `dateFrom`: Start date (ISO 8601)
- `dateTo`: End date (ISO 8601)
- `search`: Text search
- `userId`: Filter by user ID (admin only)

### Example
```bash
curl -X GET "http://localhost:3000/api/processes?status=COMPLETED&dateFrom=2024-01-01&search=machine+learning" \
  -H "Authorization: Bearer $TOKEN"
```

## Webhooks (Future Feature)

Webhook support is planned for future releases to notify external systems of process completion and other events.

## SDKs and Libraries

Official SDKs are planned for:
- JavaScript/TypeScript (Node.js and Browser)
- Python
- R (for academic researchers)

## Support and Resources

- **API Documentation:** http://localhost:3000/api-docs
- **Test Examples:** See `api-testing-examples.json`
- **Issue Reporting:** GitHub Issues
- **Email Support:** api-support@scholarfinder.com

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Complete manuscript analysis workflow
- Multi-database search integration
- Author validation and recommendation engine
- Export functionality in multiple formats
- Admin dashboard and monitoring

### Planned Features
- Webhook notifications
- Batch processing
- Advanced analytics
- Multi-language support enhancement
- Real-time collaboration features

---

For the most up-to-date API documentation, always refer to the Swagger UI at `/api-docs`.