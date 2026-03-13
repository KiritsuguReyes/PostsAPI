# PostsAPI

A minimal NestJS API project with MongoDB connection and JWT configuration ready for future use.

## Features

- Environment variables configuration with `@nestjs/config`
- MongoDB connection using `@nestjs/mongoose`
- JWT module base configuration with `@nestjs/jwt`
- Health check endpoint at `GET /`

## Prerequisites

- Node.js (v18 or higher)
- MongoDB instance running

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/postsdb
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production
PORT=3000
NODE_ENV=development
```

## Running the app

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

## API Endpoints

- `GET /` - Health check endpoint

Returns:
```json
{
  "status": "ok",
  "message": "API is running successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Project Structure

```
src/
├── app.controller.ts    # Main controller with health endpoint
├── app.module.ts        # Root module with config, MongoDB, and JWT setup
├── app.service.ts       # App service with health check logic
└── main.ts             # Application entry point
```

## Configuration

The application is configured to use:

- **MongoDB**: Connection configured via `MONGODB_URI` environment variable
- **JWT**: Global JWT module configured with secret from `JWT_SECRET` environment variable
- **Config**: Global configuration module for environment variables

## Next Steps

This project provides the foundation for:
- Adding authentication modules
- Creating user management
- Implementing business logic modules
- Adding API guards and validation