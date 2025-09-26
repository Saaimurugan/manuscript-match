# Admin API Documentation

This document provides comprehensive documentation for all admin endpoints in the Manuscript Match system.

## Authentication

All admin endpoints require authentication via JWT token and appropriate permissions. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Base URL

All endpoints are prefixed with `/api/admin`

## Response Format

All endpoints return responses in the following format:

```json
{
  "success": true,
  "data": <response-data>,
  "message": "Optional message"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Optional detailed error information"
}
```

## User Management Endpoints

### Get Admin Statistics

**GET** `/api/admin/stats`

Returns comprehensive system statistics for the admin dashboard.

**Required Permissions:** `system.monitor`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 25,
    "totalProcesses": 150,
    "totalLogs": 5000,
    "processStatusBreakdown": {
      "CREATED": 10,
      "PROCESSING": 5,
      "COMPLETED": 130,
      "ERROR": 5
    },
    "processStepBreakdown": {
      "UPLOAD": 8,
      "METADATA_EXTRACTION": 2,
      "VALIDATION": 3,
      "COMPLETED": 137
    },
    "recentActivity": {
      "last24Hours": 45,
      "last7Days": 200,
      "last30Days": 800
    },
    "topUsers": [
      {
        "userId": "user-id",
        "email": "us***@example.com",
        "processCount": 15,
        "lastActivity": "2025-09-25T10:00:00Z"
      }
    ]
  }
}
```

### List Users

**GET** `/api/admin/users`

Retrieves a paginated list of all users in the system.

**Required Permissions:** `users.read`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by email or name
- `role` (optional): Filter by user role (USER, QC, MANAGER, ADMIN)
- `status` (optional): Filter by user status (ACTIVE, BLOCKED, PENDING)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "role": "USER",
      "status": "ACTIVE",
      "blockedAt": null,
      "blockedBy": null,
      "invitedBy": "admin-id",
      "createdAt": "2025-09-25T10:00:00Z",
      "updatedAt": "2025-09-25T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Invite User

**POST** `/api/admin/users/invite`

Sends an invitation to a new user to join the system.

**Required Permissions:** `users.invite`

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "USER",
  "message": "Welcome to Manuscript Match!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invitationId": "invitation-id",
    "email": "newuser@example.com",
    "role": "USER",
    "invitationToken": "secure-token",
    "expiresAt": "2025-10-02T10:00:00Z"
  },
  "message": "Invitation sent successfully"
}
```

### Update User

**PUT** `/api/admin/users/:id`

Updates user information including role and status.

**Required Permissions:** `users.update`

**Request Body:**
```json
{
  "email": "updated@example.com",
  "role": "QC",
  "status": "ACTIVE"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "updated@example.com",
    "role": "QC",
    "status": "ACTIVE",
    "updatedAt": "2025-09-25T10:00:00Z"
  },
  "message": "User updated successfully"
}
```

### Promote User to Admin

**PUT** `/api/admin/users/:id/promote`

Promotes a user to admin role with full system access.

**Required Permissions:** `users.manage`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "ADMIN",
    "updatedAt": "2025-09-25T10:00:00Z"
  },
  "message": "User promoted to admin successfully"
}
```

### Block User

**PUT** `/api/admin/users/:id/block`

Blocks a user account, preventing login and access.
