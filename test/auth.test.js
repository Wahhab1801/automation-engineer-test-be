import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import * as process from "node:process";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/server.js";
import UserModel from "../src/models/user.model.js";
dotenv.config();

describe("Authentication API", () => {
  /** @type {MongoMemoryServer} */
  let mongoServer;

  before(async () => {
    if (process.env.NODE_ENV !== "test") {
      process.env.NODE_ENV = "test";
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(mongoUri);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  describe("POST /api/user/register", () => {
    it("should register a new user", async () => {
      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "TestPass123!",
      };

      const res = await request(app)
        .post("/api/user/register")
        .send(userData)
        .expect(200);

      expect(res.body).to.have.property("token");
      expect(res.body).to.have.property("user");
      expect(res.body.user.email).to.equal(userData.email);
      expect(res.body.user.role).to.equal("worker");
    });

    it("should return error for duplicate email", async () => {
      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "TestPass123!",
      };

      await request(app).post("/api/user/register").send(userData);

      const res = await request(app)
        .post("/api/user/register")
        .send(userData)
        .expect(400);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("User already exists");
    });

    it("should return error for missing fields", async () => {
      const res = await request(app)
        .post("/api/user/register")
        .send({
          name: "",
          email: "",
          password: "",
        })
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.deep.include({
        path: "name",
        error: "Name is required",
      });
      expect(res.body.issues).to.deep.include({
        path: "email",
        error: "Invalid email address",
      });
      expect(res.body.issues).to.deep.include({
        path: "password",
        error: "Password is required",
      });
    });

    it("should return error for weak password", async () => {
      const res = await request(app)
        .post("/api/user/register")
        .send({
          name: "Test User",
          email: "test@example.com",
          password: "weak",
        })
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.deep.include({
        path: "password",
        error:
          "Password must be min 8 characters long and include uppercase, lowercase, number, and symbol",
      });
    });
  });

  describe("POST /api/user/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/user/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "TestPass123!",
      });
    });

    it("should login with valid credentials", async () => {
      const res = await request(app)
        .post("/api/user/login")
        .send({
          email: "test@example.com",
          password: "TestPass123!",
        })
        .expect(200);

      expect(res.body).to.have.property("token");
      expect(res.body).to.have.property("user");
      expect(res.body.user.role).to.equal("worker");
    });

    it("should return error for non-existent user", async () => {
      const res = await request(app)
        .post("/api/user/login")
        .send({
          email: "nonexistent@example.com",
          password: "SomePass123!",
        })
        .expect(404);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("User does not exist");
    });

    it("should return error for invalid credentials", async () => {
      const res = await request(app)
        .post("/api/user/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        })
        .expect(400);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("Invalid email or password");
    });
  });

  describe("GET /api/user/getuser", () => {
    /** @type {string} */
    let token;

    beforeEach(async () => {
      const res = await request(app).post("/api/user/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "TestPass123!",
      });
      token = res.body.token;
    });

    it("should get user with valid token", async () => {
      const res = await request(app)
        .get("/api/user/getuser")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).to.have.property("user");
      expect(res.body.user.email).to.equal("test@example.com");
      expect(res.body.user.role).to.equal("worker");
    });

    it("should return error without token", async () => {
      const res = await request(app).get("/api/user/getuser");
      expect(res.status).to.equal(401);
      expect(res.body).to.have.property("message");
    });

    it("should return error with invalid token", async () => {
      const res1 = await request(app)
        .get("/api/user/getuser")
        .set("Authorization", ``);
      expect(res1.status).to.equal(401);

      const res2 = await request(app)
        .get("/api/user/getuser")
        .set("Authorization", `Bearer invalidtoken`);
      expect(res2.status).to.equal(401);
    });

    it("should return error with incorrect auth scheme", async () => {
      const res = await request(app)
        .get("/api/user/getuser")
        .set("Authorization", `SCHEME 123`);
      expect(res.status).to.equal(401);
    });
  });

  describe("POST /api/user/forgotPassword", () => {
    beforeEach(async () => {
      await request(app).post("/api/user/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "TestPass123!",
      });
    });

    it("should send password reset email for existing user", async () => {
      const res = await request(app)
        .post("/api/user/forgotPassword")
        .send({
          email: "test@example.com",
        })
        .expect(200);

      expect(res.body.message).to.include("reset your password");
    });

    it("should return error for non-existent user", async () => {
      await request(app)
        .post("/api/user/forgotPassword")
        .send({
          email: "nonexistent@example.com",
        })
        .expect(404);
    });
  });

  describe("POST /api/user/resetPassword", () => {
    /** @type {string} */
    let userId;
    /** @type {string} */
    let resetToken;

    beforeEach(async () => {
      await request(app).post("/api/user/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "TestPass123!",
      });

      await request(app).post("/api/user/forgotPassword").send({
        email: "test@example.com",
      });

      // Get user and manually set reset token for testing
      const user = await UserModel.findOne({ email: "test@example.com" });
      userId = user._id.toString();
      resetToken = "test-reset-token";

      const crypto = await import("node:crypto");
      const resetTokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      user.passwordResetTokenHash = resetTokenHash;
      user.passwordResetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
    });

    it("should reset password with valid token", async () => {
      const res = await request(app)
        .post("/api/user/resetPassword")
        .send({
          id: userId,
          resetToken: resetToken,
          newPassword: "NewTestPass123!",
        })
        .expect(200);

      expect(res.body.message).to.equal("Password reset successful");
    });

    it("should return error with invalid token", async () => {
      const res = await request(app).post("/api/user/resetPassword").send({
        id: userId,
        resetToken: "invalid-token",
        newPassword: "NewTestPass123!",
      });

      expect(res.status).to.be.equal(400);
      expect(res.body).to.have.property("message");
    });

    it("should return error with expired token", async () => {
      const user = await UserModel.findById(userId);
      user.passwordResetTokenExpiry = new Date(Date.now() - 60 * 60 * 1000);
      await user.save();

      const res = await request(app).post("/api/user/resetPassword").send({
        id: userId,
        resetToken: resetToken,
        newPassword: "NewTestPass123!",
      });

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("message");
    });
  });

  describe("POST /api/user/promote-to-admin", () => {
    /** @type {string} */
    let adminToken;
    /** @type {string} */
    let workerToken;
    /** @type {string} */
    let workerId;

    beforeEach(async () => {
      const adminRes = await request(app).post("/api/user/register").send({
        name: "Admin User",
        email: "admin@example.com",
        password: "AdminPass123!",
      });
      adminToken = adminRes.body.token;

      // Manually set admin role in database
      const adminUser = await UserModel.findOne({ email: "admin@example.com" });
      adminUser.role = "admin";
      await adminUser.save();

      const workerRes = await request(app).post("/api/user/register").send({
        name: "Worker User",
        email: "worker@example.com",
        password: "WorkerPass123!",
      });
      workerToken = workerRes.body.token;
      workerId = workerRes.body.user.id;
    });

    it("should promote user to admin when requested by admin", async () => {
      const res = await request(app)
        .post("/api/user/promote-to-admin")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          userId: workerId,
        })
        .expect(200);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("User promoted to admin successfully");
      expect(res.body).to.have.property("user");
      expect(res.body.user.role).to.equal("admin");

      const updatedUser = await UserModel.findById(workerId);
      expect(updatedUser.role).to.equal("admin");
    });

    it("should return error when worker tries to promote user", async () => {
      const res = await request(app)
        .post("/api/user/promote-to-admin")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({
          userId: workerId,
        })
        .expect(403);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("Access denied. Admin role required");
    });

    it("should return error for non-existent user", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post("/api/user/promote-to-admin")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          userId: nonExistentId,
        })
        .expect(404);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("User does not exist");
    });

    it("should return error without authentication", async () => {
      const res = await request(app)
        .post("/api/user/promote-to-admin")
        .send({
          userId: workerId,
        })
        .expect(401);

      expect(res.body).to.have.property("message");
    });

    it("should return error with invalid token", async () => {
      const res = await request(app)
        .post("/api/user/promote-to-admin")
        .set("Authorization", `Bearer invalidtoken`)
        .send({
          userId: workerId,
        })
        .expect(401);

      expect(res.body).to.have.property("message");
    });

    it("should return error for missing userId", async () => {
      const res = await request(app)
        .post("/api/user/promote-to-admin")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.be.an("array");
      expect(res.body.issues[0]).to.have.property("path", "userId");
      expect(res.body.issues[0]).to.have.property(
        "error",
        "Invalid input: expected string, received undefined",
      );
    });
  });
});
