# Testing Strategy & Guide

This document outlines the testing strategy for the Shift Manager Backend API, including how to run tests locally, how the CI pipeline works, and key design decisions.

## 1. Running Tests Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running locally
- dependencies installed (`npm install`)
- A `.env` file with `JWT_SECRET` configured


### Option A: Running Postman API Tests (Manual)
1. Import the collection `tests/postman/Backend_Task_API_Tests.postman_collection.json` into Postman.
2. Import the environment `tests/postman/Backend_Task_Env.postman_environment.json`.
3. Set your local environment variable `baseUrl` to `http://localhost:8000/api`.
4. Run the requests in order.

### Option B: Running Postman API Tests (Automated via Newman)
Install Newman globally if you haven't:
```bash
npm install -g newman newman-reporter-htmlextra
```

Run the tests against your local server:
1. Start the server in one terminal:
   ```bash
   npm start
   ```
2. Run Newman in another terminal:
   ```bash
   newman run tests/postman/Backend_Task_API_Tests.postman_collection.json \
     -e tests/postman/Backend_Task_Env.postman_environment.json \
     --env-var "adminEmail=admin@example.com" \
     --env-var "adminPassword=StrongPass123!" \
     -r cli,htmlextra \
     --reporter-htmlextra-export tests/newman-report.html
   ```

---

## 2. Continuous Integration (CI) Workflow

The project uses **GitHub Actions** to automate testing on every Pull Request to `main` or `master`.

**Workflow File**: `.github/workflows/api-tests.yml`

### Pipeline Steps:
1.  **Service Container**: spins up a fresh MongoDB instance (`mongo:6.0`).
2.  **Setup**: Checkouts code and installs Node.js dependencies.
3.  **Seeding**: Runs `scripts/seed-admin.js` to create an initial "Super Admin" user.
    - *Why?* This ensures a clean, predictable starting state for every test run.
4.  **Start Server**: Launches the backend using `npm start` and waits for `/api/docs` to be responsive.
5.  **Run Tests**: Executes the Postman Collection via Newman.
    - Injects the seeded admin credentials (`admin@example.com` / `StrongPass123!`) so tests can authenticate.
6.  **Reporting**: Generates an HTML test report (`newman-report.html`) and uploads it as a build artifact.

---

## 3. Key Design Decisions

### **1. Separate Seed Script**
Instead of relying on a pre-populated database dump, we use `scripts/seed-admin.js`.
- **Benefit**: Idempotent and can be run locally or in CI.
- **Benefit**: Allows us to control exactly what the initial admin credentials are.

### **2. Hardcoded Fallback Credentials**
The seed script and the CI pipeline share a set of "known" credentials (`admin@example.com` / `StrongPass123!`).
- **Reason**: Simplifies the CI configuration. We don't need to manage complex secrets for non-production test data.
- **Safety**: Code includes a check to use `process.env` variables first, so production environments are still secure.

### **3. End-to-End Flow Structure**
The Postman collection is structured as a narrative flow rather than atomic, isolated unit tests.
- **Design**: `Login -> Create User -> Promote to Admin -> Create Shift -> Clock In -> Clock Out`
- **Benefit**: Simulates real-world usage patterns.
- **Benefit**: Variables (like `token`, `workerId`, `shiftId`) are captured from responses and passed to subsequent requests automatically.

### **4. "Wait-On" Health Check**
In CI, we use `npx wait-on http://localhost:8000/api/docs`.
- **Reason**: The server takes a few seconds to connect to Mongo and start listening. Without this, the tests would fail immediately with "Connection Refused".
- **Choice**: We use `/api/docs` because it guarantees the Express app is fully routed and serving traffic, whereas a root `/` might not be defined.
