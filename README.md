# Shift Manager Backend API

This is the backend system for the **Shift Manager** application, built with **Node.js**, **Express**, and **MongoDB**. It supports:

- User registration and login with JWT authentication
- Protected routes for shift management
- Password reset via email with secure token flow
- Auto-generated API docs using Swagger (OpenAPI 3.0)

---

## Folder Structure

```
orta-full-stack-dev-test-be/
├── src/                                    # Source code directory
│   ├── controllers/                        # Route handlers
│   │   ├── authentication.controller.js   # User auth (login, register, password reset)
│   │   ├── location.controller.js          # Location management
│   │   ├── shifts.controller.js            # Shift management (CRUD, clock in/out)
│   │   └── worker.controller.js            # Worker-specific operations
│   ├── middlewares/                        # Express middleware
│   │   ├── error-handler.middleware.js     # Global error handling
│   │   ├── require-admin.middleware.js     # Admin authorization
│   │   └── require-auth.middleware.js      # JWT authentication
│   ├── migrations/                         # Database migration scripts
│   ├── models/                             # Mongoose schemas
│   │   ├── location.model.js               # Location schema
│   │   ├── shifts.model.js                 # Shift schema
│   │   └── user.model.js                   # User schema
│   ├── routes/                             # API route definitions
│   │   ├── authentication.router.js        # Auth routes (/auth/*)
│   │   ├── location.router.js              # Location routes (/locations/*)
│   │   ├── shifts.router.js                # Shift routes (/shifts/*)
│   │   └── worker.router.js                # Worker routes (/workers/*)
│   ├── services/                           # Business logic layer
│   │   ├── authentication/
│   │   │   └── index.js                    # Auth service functions
│   │   ├── location/
│   │   ├── shift/
│   │   │   ├── constants.js                # Shift status/type constants
│   │   │   └── index.js                    # Shift service functions
│   │   └── worker/
│   ├── swagger/                            # API documentation
│   │   └── swaggerConfig.js                # Swagger/OpenAPI configuration
│   ├── utils/                              # Utility functions
│   │   ├── errors/                         # Custom error classes
│   │   │   ├── app.error.js                # Generic app errors
│   │   │   ├── auth.error.js               # Authentication errors
│   │   │   ├── utils.js                    # Error utilities
│   │   │   └── validation.error.js         # Validation errors
│   │   ├── datetime.js                     # Date/time utilities
│   │   └── email.js                        # Email utilities
│   ├── db.js                               # Database connection setup
│   └── server.js                           # Application entry point
├── test/                                   # Test files
├── coverage/                               # Test coverage reports
├── .env                                    # Environment variables (not committed)
├── .gitignore                              # Git ignore rules
├── .prettierrc                             # Prettier config
├── eslint.config.js                        # ESLint configuration
├── jsconfig.json                           # JavaScript config
├── package.json                            # Dependencies & scripts
└── README.md                               # Project documentation
```

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v20 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **npm** (comes with Node.js) or **yarn**
- **MongoDB** - Choose one option:
  - [MongoDB Atlas](https://www.mongodb.com/atlas) (cloud database - recommended)
  - [MongoDB Community Server](https://www.mongodb.com/try/download/community) (local installation)

#### Check your installations:

```bash
node --version    # Should be v20+
npm --version     # Should be 8+
git --version     # Any recent version
```

### Installation Steps

#### 1. Clone the repository

```bash
git clone https://github.com/Wahhab1801/automation-engineer-test-be.git
cd automation-engineer-test-be
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Set up MongoDB (optional)

**Option A: MongoDB Atlas (Cloud)**

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string from the "Connect" button
4. Replace `<username>`, `<password>`, and `<cluster-url>` with your details

**Option B: Local MongoDB**

1. Install MongoDB Community Server
2. Start MongoDB service:
   - **Windows**: MongoDB should start automatically
   - **macOS**: `brew services start mongodb/brew/mongodb-community`
   - **Linux**: `sudo systemctl start mongod`
3. Your local connection string will be: `mongodb://localhost:27017/shift-manager`

#### 4. Create environment configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/shift-manager?retryWrites=true&w=majority

# Server
PORT=8000
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here-min-32-chars

# Email Setup - Required for Forgot Password functionality Only
SUPPORT_EMAIL=from-emai@gmail.com
GMAIL_USERNAME=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
FRONTEND_URL=your-frontend-url-here
```

> **Security Note**: Replace `JWT_SECRET` with a strong, random string (at least 32 characters)

#### 5. Start the development server

```bash
npm run dev
```

**Success!** Your server should now be running at: [http://localhost:8000](http://localhost:8000)

---

## API Documentation

Swagger UI is available at:

**[http://localhost:8000/api/docs](https://automation-engineer-test-be.onrender.com/api/docs)**

---

## API Endpoints

### Base URL

- **Local**: `http://localhost:8000/api`

### Authentication Endpoints

| Method | Endpoint                 | Description                | Auth Required |
| ------ | ------------------------ | -------------------------- | ------------- |
| `POST` | `/user/register`         | Register a new user        | No            |
| `POST` | `/user/login`            | Login user & get JWT token | No            |
| `GET`  | `/user/getuser`          | Get current user profile   | No            |
| `POST` | `/user/promote-to-admin` | Promote user to admin role | Admin         |

#### Sample Request - Register User

```json
POST /api/user/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass123!"
}
```

#### Sample Request - Login

```json
POST /api/user/login
{
  "email": "john@example.com",
  "password": "StrongPass123!"
}
```

### Password Management

| Method | Endpoint               | Description               | Auth Required |
| ------ | ---------------------- | ------------------------- | ------------- |
| `POST` | `/user/forgotPassword` | Send password reset email | No            |
| `POST` | `/user/resetPassword`  | Reset password with token | No            |

#### Sample Request - Forgot Password

```json
POST /api/user/forgotPassword
{
  "email": "john@example.com"
}
```

#### Sample Request - Reset Password

```json
POST /api/user/resetPassword
{
  "id": "64a7b2f5e1d3c2a1b4c5d6e7",
  "resetToken": "d4c68f30aa0b5c2d...",
  "newPassword": "NewStrongPassword123!"
}
```

### Shift Management Endpoints

| Method   | Endpoint                | Description                      | Auth Required |
| -------- | ----------------------- | -------------------------------- | ------------- |
| `GET`    | `/shifts`               | Get all shifts (with pagination) | Admin         |
| `GET`    | `/shifts/my-shifts`     | Get current user's shifts        | User          |
| `GET`    | `/shifts/:id`           | Get specific shift details       | User          |
| `POST`   | `/shifts`               | Create a new shift               | Admin         |
| `POST`   | `/shifts/batch`         | Batch create/update shifts       | Admin         |
| `PUT`    | `/shifts/:id`           | Update existing shift            | Admin         |
| `DELETE` | `/shifts/:id`           | Delete shift                     | Admin         |
| `PATCH`  | `/shifts/:id/cancel`    | Cancel shift                     | Admin         |
| `PATCH`  | `/shifts/:id/clock-in`  | Clock in to shift                | User          |
| `PATCH`  | `/shifts/:id/clock-out` | Clock out of shift               | User          |

#### Query Parameters (for GET /shifts and /shifts/my-shifts)

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 1000)
- `status` - Filter by status: `active`, `cancelled`, `completed`, `in_progress`
- `sortBy` - Sort field (default: "date")
- `sortOrder` - Sort order: `asc` or `desc` (default: "asc")

#### Sample Request - Create Shift

```json
POST /api/shifts
{
  "title": "Morning Cleaning Shift",
  "role": "Cleaner",
  "typeOfShift": ["morning", "weekday"],
  "user": "64a7b2f5e1d3c2a1b4c5d6e7",
  "startTime": "09:00",
  "finishTime": "17:00",
  "numOfShiftsPerDay": 1,
  "location": {
    "name": "Office Building A",
    "address": "123 Main Street",
    "postCode": "12345",
    "cordinates": {
      "longitude": -74.006,
      "latitude": 40.7128
    }
  },
  "date": "2024-12-25T00:00:00Z"
}
```

### Worker Management Endpoints

| Method | Endpoint       | Description     | Auth Required |
| ------ | -------------- | --------------- | ------------- |
| `GET`  | `/workers/all` | Get all workers | Admin         |

### Location Management Endpoints

| Method | Endpoint         | Description       | Auth Required |
| ------ | ---------------- | ----------------- | ------------- |
| `GET`  | `/locations/all` | Get all locations | Admin         |

### Authorization Levels

- **Public** - No authentication required
- **User** - Requires valid JWT token
- **Admin** - Requires JWT token + admin role

### Response Format

All API responses follow this consistent format:

#### Success Response

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Operation successful"
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

### Authentication Headers

For protected endpoints, include the JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

---

## Testing & Development Scripts

### Available NPM Scripts

| Script             | Command                   | Description                               |
| ------------------ | ------------------------- | ----------------------------------------- |
| `npm start`        | `node src/server.js`      | Start production server                   |
| `npm run dev`      | `nodemon src/server.js`   | Start development server with auto-reload |
| `npm test`         | `mocha test/**/*.test.js` | Run all tests                             |
| `npm run coverage` | `c8 mocha test/...`       | Run tests with coverage report            |
| `npm run format`   | `prettier --write ...`    | Format code with Prettier                 |

### Running Tests

#### Run All Tests

```bash
npm test
```

#### Run Tests with Coverage

```bash
npm run coverage
```

This will generate coverage reports in multiple formats:

- **Terminal output** - Quick coverage summary
- **HTML report** - Detailed coverage at `coverage/index.html`
- **LCOV report** - For CI/CD integration

#### Open Coverage Report

```bash
# On macOS (if you have the script)
npm run coverage:open
```

### Test Coverage Configuration

The project uses **c8** for code coverage with the following thresholds:

```json
{
  "lines": 70,
  "functions": 70,
  "branches": 60,
  "statements": 70
}
```

**Coverage includes:**

`src/**/*.js` - All source files

### Test Files Structure

```
test/
├── auth.test.js          # Authentication & user tests
└── shift.test.js         # Shift management tests
```

### Testing Stack

- **Test Framework**: [Mocha](https://mochajs.org/) - Feature-rich testing framework
- **Assertions**: [Chai](https://www.chaijs.com/) - BDD/TDD assertion library
- **HTTP Testing**: [Supertest](https://github.com/visionmedia/supertest) - HTTP assertions
- **Test Database**: [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server) - In-memory MongoDB
- **Mocking**: [Sinon](https://sinonjs.org/) - Standalone test spies, stubs and mocks
- **Coverage**: [c8](https://github.com/bcoe/c8) - Native V8 code coverage

### Development Workflow

#### 1. Start Development Server

```bash
npm run dev
```

This starts the server with **nodemon** for automatic restart on file changes.

#### 2. Run Tests in Watch Mode

```bash
# Run tests whenever files change
npm test -- --watch
```

#### 3. Check Code Formatting

```bash
npm run format
```

#### 4. Generate Coverage Report

```bash
npm run coverage
open coverage/index.html  # View detailed coverage
```

### Testing Different Endpoints

#### Using Swagger UI (Recommended)

1. Start the server: `npm run dev`
2. Visit: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
3. Use the interactive API explorer

#### Using cURL Examples

**Register a user:**

```bash
curl -X POST http://localhost:8000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123!"}'
```

**Login:**

```bash
curl -X POST http://localhost:8000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

**Get user shifts (requires JWT):**

```bash
curl -X GET http://localhost:8000/api/shifts/my-shifts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Debugging Tips

1. **Enable debug logs** - Set `NODE_ENV=development` in your `.env`
2. **Check database connection** - Verify `MONGO_URI` is correct
3. **Validate JWT tokens** - Use [jwt.io](https://jwt.io) to decode tokens
4. **Monitor server logs** - Check console output for error details
5. **Use Postman/Insomnia** - For advanced API testing
---
