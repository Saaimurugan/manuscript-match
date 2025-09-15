# ScholarFinder Backend

Backend API service for ScholarFinder manuscript analysis and peer reviewer recommendation system.

## Features

- Manuscript processing and metadata extraction
- Multi-database author search integration
- Author validation and conflict detection
- Reviewer recommendation and filtering
- Shortlist management and export
- User authentication and activity logging
- Administrative oversight capabilities

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT tokens
- **File Processing**: PDF and Word document parsing
- **Testing**: Jest with Supertest

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository and navigate to backend directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:
   ```bash
   npm run generate
   npm run migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run migrate` - Run database migrations
- `npm run generate` - Generate Prisma client
- `npm run studio` - Open Prisma Studio

## API Documentation

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Process Management
- `POST /api/processes` - Create new process
- `GET /api/processes` - List user processes
- `GET /api/processes/:id` - Get process details
- `PUT /api/processes/:id/step` - Update process step
- `DELETE /api/processes/:id` - Delete process

### File Processing
- `POST /api/processes/:id/upload` - Upload manuscript
- `GET /api/processes/:id/metadata` - Get extracted metadata
- `PUT /api/processes/:id/metadata` - Update metadata

## Environment Variables

See `.env.example` for all available configuration options.

## Database Schema

The application uses SQLite with Prisma ORM. See `prisma/schema.prisma` for the complete database schema.

## Contributing

1. Follow TypeScript best practices
2. Write tests for new features
3. Use conventional commit messages
4. Ensure all tests pass before submitting PRs

## License

MIT