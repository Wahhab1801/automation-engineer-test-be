import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import * as process from "node:process";
import { MongoMemoryServer } from "mongodb-memory-server";
import dayjs from "dayjs";
import { app } from "../src/server.js";
import UserModel from "../src/models/user.model.js";
import LocationModel from "../src/models/location.model.js";
import ShiftModel from "../src/models/shifts.model.js";
import {
  SHIFT_TYPES,
  SHIFT_STATUS,
  SHIFT_CONSTRAINTS,
} from "../src/services/shift/constants.js";
dotenv.config();

describe("Shift API", () => {
  /** @type {MongoMemoryServer} */
  let mongoServer;

  /** @type {string} */
  let adminToken;

  /** @type {string} */
  let workerToken;

  /** @type {string} */
  let adminUserId;

  /** @type {string} */
  let workerUserId;

  /** @type {Object} */
  let testLocation;

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
    await LocationModel.deleteMany({});
    await ShiftModel.deleteMany({});
    const adminRes = await request(app).post("/api/user/register").send({
      name: "Admin User",
      email: "admin@example.com",
      password: "AdminPass123!",
    });
    adminToken = adminRes.body.token;
    adminUserId = adminRes.body.user.id;

    // Manually set admin role in database
    const adminUser = await UserModel.findById(adminUserId);
    adminUser.role = "admin";
    await adminUser.save();

    const workerRes = await request(app).post("/api/user/register").send({
      name: "Worker User",
      email: "worker@example.com",
      password: "WorkerPass123!",
    });
    workerToken = workerRes.body.token;
    workerUserId = workerRes.body.user.id;

    testLocation = {
      name: "Test Location",
      postCode: "M1 1AA",
      distance: 5,
      constituency: "Test Constituency",
      adminDistrict: "Test District",
      address: "123 Test Street, Manchester",
      cordinates: {
        longitude: -2.244644,
        latitude: 53.483959,
        useRotaCloud: true,
      },
    };

    const location = new LocationModel(testLocation);
    await location.save();
  });

  describe("POST /api/shifts", () => {
    const validShiftData = {
      title: "Morning Shift",
      role: "Nurse",
      typeOfShift: [SHIFT_TYPES.MORNING],
      startTime: "09:00",
      finishTime: "17:00",
      numOfShiftsPerDay: 1,
      date: "2025-10-01",
    };

    it("should create a new shift with valid data", async () => {
      const shiftData = {
        ...validShiftData,
        user: workerUserId,
        location: testLocation,
      };

      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(shiftData)
        .expect(201);

      expect(res.body).to.have.property("shift");
      expect(res.body.shift.title).to.equal(shiftData.title);
      expect(res.body.shift.role).to.equal(shiftData.role);
      expect(res.body.shift.startTime).to.equal(shiftData.startTime);
      expect(res.body.shift.finishTime).to.equal(shiftData.finishTime);
      expect(res.body.shift.status).to.equal(SHIFT_STATUS.SCHEDULED);
      expect(res.body.shift.clockInTime).to.equal(null);
      expect(res.body.shift.clockOutTime).to.equal(null);
      expect(res.body.shift).to.have.property("user");
      expect(res.body.shift.user.name).to.equal("Worker User");
      expect(res.body.shift).to.have.property("location");
      expect(res.body.shift.location.name).to.equal("Test Location");
    });

    it("should return error for missing required fields", async () => {
      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.be.an("array");

      expect(res.body.issues).to.deep.include({
        path: "title",
        error: "Title is required",
      });

      expect(res.body.issues).to.deep.include({
        path: "role",
        error: "Role is required",
      });
    });

    it("should return error for invalid user ID", async () => {
      const shiftData = {
        ...validShiftData,
        user: "invalid-id",
        location: testLocation,
      };

      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(shiftData)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.deep.include({
        path: "user",
        error: "Invalid user ID",
      });
    });

    it("should return error for non-existent user", async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId().toString();
      const shiftData = {
        ...validShiftData,
        user: nonExistentUserId,
        location: testLocation,
      };

      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(shiftData)
        .expect(404);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("User not found");
    });

    it("should create a new location when location doesn't exist", async () => {
      const newLocation = {
        name: "New Location",
        address: "456 New Street, London",
        postCode: "SW1A 1AA",
        cordinates: {
          longitude: -0.1276,
          latitude: 51.5074,
        },
      };

      const shiftData = {
        ...validShiftData,
        user: workerUserId,
        location: newLocation,
      };

      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(shiftData)
        .expect(201);

      expect(res.body).to.have.property("shift");
      expect(res.body.shift.location.name).to.equal("New Location");
      expect(res.body.shift.location.address).to.equal(
        "456 New Street, London",
      );
      expect(res.body.shift.location.postCode).to.equal("SW1A 1AA");
    });

    it("should return error for invalid time format", async () => {
      const shiftData = {
        ...validShiftData,
        user: workerUserId,
        location: testLocation,
        startTime: "25:00",
        finishTime: "09:70",
      };

      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(shiftData)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.deep.include({
        path: "startTime",
        error: "Time must be in HH:MM format",
      });
      expect(res.body.issues).to.deep.include({
        path: "finishTime",
        error: "Time must be in HH:MM format",
      });
    });

    it("should allow night shifts (finish time next day)", async () => {
      const shiftData = {
        ...validShiftData,
        user: workerUserId,
        location: testLocation,
        typeOfShift: [SHIFT_TYPES.NIGHT],
        startTime: "18:00",
        finishTime: "09:00", // Next day
      };

      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(shiftData)
        .expect(201);

      expect(res.body).to.have.property("shift");
      expect(res.body.shift.startTime).to.equal("18:00");
      expect(res.body.shift.finishTime).to.equal("09:00");
    });

    it("should return error for past date", async () => {
      const shiftData = {
        ...validShiftData,
        user: workerUserId,
        location: testLocation,
        date: "2020-01-01",
      };

      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(shiftData)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.deep.include({
        path: "date",
        error: "Date cannot be in the past and must be a valid date",
      });
    });

    it("should return error without authentication token", async () => {
      const shiftData = {
        ...validShiftData,
        user: workerUserId,
        location: testLocation,
        date: "2024-01-01", // Past date
      };

      await request(app).post("/api/shifts").send(shiftData).expect(401);
    });

    it("should return error with invalid token", async () => {
      const shiftData = {
        ...validShiftData,
        user: workerUserId,
        location: testLocation,
      };

      await request(app)
        .post("/api/shifts")
        .set("Authorization", "Bearer invalid-token")
        .send(shiftData)
        .expect(401);
    });

    it("should return error when worker tries to create shift", async () => {
      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({
          ...validShiftData,
          user: workerUserId,
          location: testLocation,
        })
        .expect(403);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("Access denied. Admin role required");
    });
  });

  describe("PUT /api/shifts/:id", () => {
    /** @type {string} */
    let shiftId;

    beforeEach(async () => {
      const shiftData = {
        title: "Original Shift",
        role: "Original Role",
        typeOfShift: [SHIFT_TYPES.MORNING],
        user: workerUserId,
        location: testLocation,
        startTime: "09:00",
        finishTime: "17:00",
        numOfShiftsPerDay: 1,
        date: "2025-12-25",
      };

      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(shiftData);

      shiftId = res.body.shift.id;
    });

    it("should update a shift with valid data", async () => {
      const updateData = {
        title: "Updated Shift",
        role: "Updated Role",
        startTime: "10:00",
        finishTime: "18:00",
        user: workerUserId,
      };

      const res = await request(app)
        .put(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body).to.have.property("shift");
      expect(res.body.shift.title).to.equal(updateData.title);
      expect(res.body.shift.role).to.equal(updateData.role);
      expect(res.body.shift.startTime).to.equal(updateData.startTime);
      expect(res.body.shift.finishTime).to.equal(updateData.finishTime);
      expect(res.body.shift).to.have.property("user");
      expect(res.body.shift).to.have.property("location");
    });

    it("should assign shift to a new user", async () => {
      const newUserRes = await request(app).post("/api/user/register").send({
        name: "New User",
        email: "newuser@example.com",
        password: "TestPass123!",
      });

      const newUserId = newUserRes.body.user.id;

      const updateData = {
        user: newUserId,
        title: "Shift with New User",
      };

      const res = await request(app)
        .put(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.shift.user.id).to.equal(newUserId);
      expect(res.body.shift.user.name).to.equal("New User");
      expect(res.body.shift.title).to.equal(updateData.title);
    });

    it("should return error for non-existent user in update", async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId().toString();
      const updateData = {
        user: nonExistentUserId,
        title: "Updated Title",
      };

      const res = await request(app)
        .put(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("User not found");
    });

    it("should return error for invalid user ID in update", async () => {
      const updateData = {
        user: "invalid-user-id",
        title: "Updated Title",
      };

      const res = await request(app)
        .put(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.deep.include({
        path: "user",
        error: "Invalid user ID",
      });
    });

    it("should update only provided fields", async () => {
      const updateData = {
        title: "Partially Updated Shift",
        user: workerUserId,
      };

      const res = await request(app)
        .put(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.shift.title).to.equal(updateData.title);
      expect(res.body.shift.role).to.equal("Original Role");
      expect(res.body.shift.startTime).to.equal("09:00");
    });

    it("should return error for invalid shift ID", async () => {
      const updateData = { title: "Updated Title", user: workerUserId };

      const res = await request(app)
        .put("/api/shifts/invalid-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.deep.include({
        path: "",
        error: "Invalid shift ID",
      });
    });

    it("should return error for non-existent shift", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const updateData = { title: "Updated Title", user: workerUserId };

      const res = await request(app)
        .put(`/api/shifts/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("Shift not found");
    });

    it("should return error for invalid time format", async () => {
      const updateData = {
        startTime: "25:00",
        finishTime: "09:70",
        user: workerUserId,
      };

      const res = await request(app)
        .put(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.deep.include({
        path: "startTime",
        error: "Time must be in HH:MM format",
      });
      expect(res.body.issues).to.deep.include({
        path: "finishTime",
        error: "Time must be in HH:MM format",
      });
    });

    it("should return error for past date", async () => {
      const updateData = {
        date: "2020-01-01",
        user: workerUserId,
      };

      const res = await request(app)
        .put(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.deep.include({
        path: "date",
        error: "Date cannot be in the past and must be a valid date",
      });
    });

    it("should update shift with new location", async () => {
      const newLocation = {
        name: "Updated Location",
        address: "789 Updated Street, Birmingham",
        postCode: "B1 1XY",
        cordinates: {
          longitude: -1.8904,
          latitude: 52.4862,
        },
      };

      const updateData = {
        location: newLocation,
        title: "Updated Title",
      };

      const res = await request(app)
        .put(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.shift.location.name).to.equal("Updated Location");
      expect(res.body.shift.location.address).to.equal(
        "789 Updated Street, Birmingham",
      );
      expect(res.body.shift.location.postCode).to.equal("B1 1XY");
    });

    it("should return error without authentication token", async () => {
      const updateData = { title: "Updated Title", user: workerUserId };

      await request(app)
        .put(`/api/shifts/${shiftId}`)
        .send(updateData)
        .expect(401);
    });

    it("should return error with invalid token", async () => {
      const updateData = { title: "Updated Title", user: workerUserId };

      await request(app)
        .put(`/api/shifts/${shiftId}`)
        .set("Authorization", "Bearer invalid-token")
        .send(updateData)
        .expect(401);
    });

    it("should return error when worker tries to update shift", async () => {
      const res = await request(app)
        .put(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${workerToken}`)
        .send({
          title: "Updated Shift",
        })
        .expect(403);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("Access denied. Admin role required");
    });
  });

  describe("DELETE /api/shifts/:id", () => {
    /** @type {string} */
    let shiftId;

    beforeEach(async () => {
      const shiftData = {
        title: "Shift to Delete",
        role: "Test Role",
        typeOfShift: [SHIFT_TYPES.MORNING],
        user: workerUserId,
        location: testLocation,
        startTime: "09:00",
        finishTime: "17:00",
        numOfShiftsPerDay: 1,
        date: "2025-12-25",
      };

      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(shiftData);

      shiftId = res.body.shift.id;
    });

    it("should delete a shift with valid ID", async () => {
      const res = await request(app)
        .delete(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("Shift deleted successfully");

      const checkRes = await request(app)
        .delete(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(checkRes.body.message).to.equal("Shift not found");
    });

    it("should return error for invalid shift ID", async () => {
      const res = await request(app)
        .delete("/api/shifts/invalid-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.deep.include({
        path: "",
        error: "Invalid shift ID",
      });
    });

    it("should return error for non-existent shift", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await request(app)
        .delete(`/api/shifts/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });

    it("should return error without authentication token", async () => {
      await request(app).delete(`/api/shifts/${shiftId}`).expect(401);
    });

    it("should return error with invalid token", async () => {
      await request(app)
        .delete(`/api/shifts/${shiftId}`)
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });

    it("should return error when worker tries to delete shift", async () => {
      const res = await request(app)
        .delete(`/api/shifts/${shiftId}`)
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(403);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("Access denied. Admin role required");
    });
  });

  describe("POST /api/shifts/batch", () => {
    it("should create multiple new shifts", async () => {
      const batchData = {
        shifts: [
          {
            title: "Batch Shift 1",
            role: "Nurse",
            typeOfShift: [SHIFT_TYPES.MORNING],
            user: workerUserId,
            location: testLocation,
            startTime: "09:00",
            finishTime: "17:00",
            numOfShiftsPerDay: 1,
            date: "2025-12-25",
          },
          {
            title: "Batch Shift 2",
            role: "Therapist",
            typeOfShift: [SHIFT_TYPES.EVENING],
            user: workerUserId,
            location: testLocation,
            startTime: "11:00",
            finishTime: "19:00",
            numOfShiftsPerDay: 1,
            date: "2025-12-26",
          },
        ],
      };

      const res = await request(app)
        .post("/api/shifts/batch")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(batchData)
        .expect(200);

      expect(res.body).to.have.property("created");
      expect(res.body).to.have.property("updated");
      expect(res.body).to.have.property("errors");
      expect(res.body.created).to.have.length(2);
      expect(res.body.updated).to.have.length(0);
      expect(res.body.errors).to.have.length(0);
      expect(res.body.created[0].title).to.equal("Batch Shift 1");
      expect(res.body.created[1].title).to.equal("Batch Shift 2");
    });

    it("should update existing shifts", async () => {
      const createRes = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Original Shift",
          role: "Nurse",
          typeOfShift: [SHIFT_TYPES.MORNING],
          user: workerUserId,
          location: testLocation,
          startTime: "09:00",
          finishTime: "17:00",
          numOfShiftsPerDay: 1,
          date: "2025-12-25",
        });

      const shiftId = createRes.body.shift.id;

      const updateData = {
        shifts: [
          {
            id: shiftId,
            title: "Updated Shift",
            role: "Doctor",
            typeOfShift: [SHIFT_TYPES.EVENING],
            user: workerUserId,
            location: testLocation,
            startTime: "10:00",
            finishTime: "18:00",
            numOfShiftsPerDay: 1,
            date: "2025-12-25",
          },
        ],
      };

      const res = await request(app)
        .post("/api/shifts/batch")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body.created).to.have.length(0);
      expect(res.body.updated).to.have.length(1);
      expect(res.body.errors).to.have.length(0);
      expect(res.body.updated[0].title).to.equal("Updated Shift");
      expect(res.body.updated[0].role).to.equal("Doctor");
    });

    it("should handle mixed create and update operations", async () => {
      const createRes = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Existing Shift",
          role: "Nurse",
          typeOfShift: [SHIFT_TYPES.MORNING],
          user: workerUserId,
          location: testLocation,
          startTime: "09:00",
          finishTime: "17:00",
          date: "2025-12-25",
        });

      const existingShiftId = createRes.body.shift.id;

      const batchData = {
        shifts: [
          {
            id: existingShiftId,
            title: "Updated Existing Shift",
            role: "Doctor",
            typeOfShift: [SHIFT_TYPES.MORNING],
            user: workerUserId,
            location: testLocation,
            startTime: "10:00",
            finishTime: "18:00",
            numOfShiftsPerDay: 1,
            date: "2025-12-25",
          },
          {
            title: "New Batch Shift",
            role: "Technician",
            typeOfShift: [SHIFT_TYPES.EVENING],
            user: workerUserId,
            location: testLocation,
            startTime: "11:00",
            finishTime: "19:00",
            numOfShiftsPerDay: 1,
            date: "2025-12-27",
          },
        ],
      };

      const res = await request(app)
        .post("/api/shifts/batch")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(batchData)
        .expect(200);

      expect(res.body.created).to.have.length(1);
      expect(res.body.updated).to.have.length(1);
      expect(res.body.errors).to.have.length(0);
      expect(res.body.updated[0].title).to.equal("Updated Existing Shift");
      expect(res.body.created[0].title).to.equal("New Batch Shift");
    });

    it("should handle errors gracefully with batch operations", async () => {
      const batchData = {
        shifts: [
          {
            title: "Valid Shift",
            role: "Nurse",
            typeOfShift: [SHIFT_TYPES.MORNING],
            user: workerUserId,
            location: testLocation,
            startTime: "09:00",
            finishTime: "17:00",
            numOfShiftsPerDay: 1,
            date: "2025-12-25",
          },
          {
            title: "Invalid Shift",
            role: "Doctor",
            typeOfShift: [SHIFT_TYPES.MORNING],
            user: new mongoose.Types.ObjectId().toString(),
            location: testLocation,
            startTime: "10:00",
            finishTime: "18:00",
            numOfShiftsPerDay: 1,
            date: "2025-12-26",
          },
        ],
      };

      const res = await request(app)
        .post("/api/shifts/batch")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(batchData)
        .expect(200);

      expect(res.body.created).to.have.length(1);
      expect(res.body.updated).to.have.length(0);
      expect(res.body.errors).to.have.length(1);
      expect(res.body.created[0].title).to.equal("Valid Shift");
      expect(res.body.errors[0]).to.have.property("index", 1);
      expect(res.body.errors[0]).to.have.property("error");
    });

    it("should return error for empty shifts array", async () => {
      const res = await request(app)
        .post("/api/shifts/batch")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ shifts: [] })
        .expect(400);

      expect(res.body).to.have.property("issues");
    });

    it("should return error without authentication", async () => {
      const batchData = {
        shifts: [
          {
            title: "New Shift",
            role: "Nurse",
            typeOfShift: [SHIFT_TYPES.MORNING],
            user: workerUserId,
            location: testLocation,
            startTime: "08:00",
            finishTime: "16:00",
            numOfShiftsPerDay: 1,
            date: "2025-12-25",
          },
        ],
      };

      await request(app).post("/api/shifts/batch").send(batchData).expect(401);
    });

    it("should return error when worker tries to batch create/update shifts", async () => {
      const shiftsData = [
        {
          title: "Morning Shift 1",
          role: "Nurse",
          typeOfShift: [SHIFT_TYPES.MORNING],
          startTime: "09:00",
          finishTime: "17:00",
          numOfShiftsPerDay: 1,
          date: "2025-12-25",
          user: workerUserId,
          location: testLocation,
        },
      ];

      const res = await request(app)
        .post("/api/shifts/batch")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({ shifts: shiftsData })
        .expect(403);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("Access denied. Admin role required");
    });
  });

  describe("PATCH /api/shifts/:id/cancel", () => {
    /** @type {string} */
    let shiftId;

    beforeEach(async () => {
      const shiftData = {
        title: "Test Shift",
        role: "Nurse",
        typeOfShift: [SHIFT_TYPES.MORNING],
        user: workerUserId,
        startTime: "09:00",
        finishTime: "17:00",
        location: testLocation,
        date: "2025-12-25",
      };

      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(shiftData);

      shiftId = res.body.shift.id;
    });

    it("should cancel a shift successfully", async () => {
      const res = await request(app)
        .patch(`/api/shifts/${shiftId}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).to.equal("Shift cancelled successfully");

      const shift = await ShiftModel.findById(shiftId);
      expect(shift.status).to.equal(SHIFT_STATUS.CANCELLED);
    });

    it("should return error for non-existent shift", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .patch(`/api/shifts/${fakeId}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });

    it("should return error when shift is already cancelled", async () => {
      await ShiftModel.findByIdAndUpdate(shiftId, {
        status: SHIFT_STATUS.CANCELLED,
      });

      const res = await request(app)
        .patch(`/api/shifts/${shiftId}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.message).to.equal("Shift is already cancelled");
    });

    it("should return error when shift is completed", async () => {
      await ShiftModel.findByIdAndUpdate(shiftId, {
        status: SHIFT_STATUS.COMPLETED,
      });

      const res = await request(app)
        .patch(`/api/shifts/${shiftId}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.message).to.equal("Cannot cancel a completed shift");
    });

    it("should return error without authentication", async () => {
      await request(app).patch(`/api/shifts/${shiftId}/cancel`).expect(401);
    });

    it("should return error when worker tries to cancel shift", async () => {
      await request(app)
        .patch(`/api/shifts/${shiftId}/cancel`)
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(403);
    });
  });

  describe("PATCH /api/shifts/:id/clock-in", () => {
    /** @type {string} */
    let shiftId;

    /** @type {string} */
    let todayShiftId;

    beforeEach(async () => {
      const tomorrow = dayjs().add(1, "day");

      const shiftData = {
        title: "Test Shift",
        role: "Nurse",
        typeOfShift: [SHIFT_TYPES.MORNING],
        user: workerUserId,
        startTime: "09:00",
        finishTime: "17:00",
        location: testLocation,
        date: tomorrow.toISOString(),
      };

      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(shiftData);

      shiftId = res.body.shift.id;

      const now = dayjs();

      // Set shift to start 5 minutes from now and end 4 hours later
      const startTime = dateTo24HrTime(now.add(5, "minute").toDate());
      const endTime = dateTo24HrTime(now.add(4, "hour").toDate());

      const todayShiftData = {
        title: "Today Shift",
        role: "Nurse",
        typeOfShift: [SHIFT_TYPES.WEEKDAY, SHIFT_TYPES.WEEKEND],
        user: workerUserId,
        startTime: startTime,
        finishTime: endTime,
        location: testLocation,
        date: now.toISOString(),
      };

      const todayRes = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(todayShiftData);

      todayShiftId = todayRes.body.shift.id;
    });

    it("should clock in successfully when within allowed time", async () => {
      const res = await request(app)
        .patch(`/api/shifts/${todayShiftId}/clock-in`)
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(200);

      expect(res.body.message).to.equal("Successfully clocked in");
      expect(res.body.shift.status).to.equal(SHIFT_STATUS.IN_PROGRESS);
      expect(res.body.shift.clockInTime).to.match(/^\d{2}:\d{2}$/);

      const shift = await ShiftModel.findById(todayShiftId);
      expect(shift.status).to.equal(SHIFT_STATUS.IN_PROGRESS);
      expect(shift.clockInTime).to.not.equal(null);
    });

    it("should return error when shift not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .patch(`/api/shifts/${fakeId}/clock-in`)
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(404);
    });

    it("should return error when user not assigned to shift", async () => {
      const res = await request(app)
        .patch(`/api/shifts/${todayShiftId}/clock-in`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);

      expect(res.body.message).to.equal("You are not assigned to this shift");
    });

    it("should return error when shift status is not scheduled", async () => {
      await ShiftModel.findByIdAndUpdate(todayShiftId, {
        status: SHIFT_STATUS.IN_PROGRESS,
      });

      const res = await request(app)
        .patch(`/api/shifts/${todayShiftId}/clock-in`)
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(400);

      expect(res.body.message).to.equal(
        "Can only clock in to scheduled shifts",
      );
    });

    it("should return error when clocking in too early", async () => {
      const now = dayjs();
      // Set shift to start 20 minutes from now (more than 10 minute buffer)
      const startTime = dateTo24HrTime(
        now
          .add(SHIFT_CONSTRAINTS.EARLY_CLOCK_IN_BUFFER + 10, "minute")
          .toDate(),
      );
      const endTime = dateTo24HrTime(now.add(4, "hour").toDate());

      const futureShiftData = {
        title: "Future Shift",
        role: "Nurse",
        typeOfShift: [SHIFT_TYPES.WEEKEND, SHIFT_TYPES.WEEKDAY],
        user: workerUserId,
        startTime: startTime,
        finishTime: endTime,
        location: testLocation,
        date: now.toISOString(),
      };

      const futureRes = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(futureShiftData);

      const res = await request(app)
        .patch(`/api/shifts/${futureRes.body.shift.id}/clock-in`)
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(400);

      expect(res.body.message).to.include(
        `Cannot clock in more than ${SHIFT_CONSTRAINTS.EARLY_CLOCK_IN_BUFFER} minutes before shift starts`,
      );
    });

    it("should return error when shift time has expired", async () => {
      // Create a shift for tomorrow first (to pass validation)
      const tomorrow = dayjs().add(1, "day");

      const expiredShiftData = {
        title: "Expired Shift",
        role: "Nurse",
        typeOfShift: [SHIFT_TYPES.MORNING],
        user: workerUserId,
        startTime: "09:00",
        finishTime: "17:00",
        location: testLocation,
        date: tomorrow.toISOString(),
      };

      const expiredRes = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(expiredShiftData);

      // Manually update the shift datetime fields to be in the past
      const yesterday = dayjs().subtract(1, "day");

      const pastStartDateTime = yesterday
        .hour(9)
        .minute(0)
        .second(0)
        .millisecond(0)
        .toDate();
      const pastFinishDateTime = yesterday
        .hour(17)
        .minute(0)
        .second(0)
        .millisecond(0)
        .toDate();

      await ShiftModel.findByIdAndUpdate(expiredRes.body.shift.id, {
        date: yesterday.toDate(),
        startTime: pastStartDateTime,
        finishTime: pastFinishDateTime,
      });

      const res = await request(app)
        .patch(`/api/shifts/${expiredRes.body.shift.id}/clock-in`)
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(400);

      expect(res.body.message).to.contain("Cannot clock in");
    });

    it("should handle night shifts properly (clock in and out across midnight)", async () => {
      // Create a night shift starting tomorrow at 22:00 and ending the day after at 06:00
      // This ensures we're testing the night shift logic without timing conflicts
      const tomorrow = dayjs().add(1, "day");

      const nightShiftData = {
        title: "Night Security",
        role: "Security Guard",
        typeOfShift: [SHIFT_TYPES.NIGHT],
        user: workerUserId,
        startTime: "22:00",
        finishTime: "06:00", // Next day
        location: testLocation,
        date: tomorrow.toISOString(),
      };

      const nightShiftRes = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(nightShiftData);

      expect(nightShiftRes.status).to.equal(201);
      expect(nightShiftRes.body.shift.startTime).to.equal("22:00");
      expect(nightShiftRes.body.shift.finishTime).to.equal("06:00");

      const shift = await ShiftModel.findById(nightShiftRes.body.shift.id);
      const startDate = dayjs(shift.startTime);
      const finishDate = dayjs(shift.finishTime);

      expect(startDate.hour()).to.equal(22);
      expect(startDate.minute()).to.equal(0);

      // Finish time should be the day after tomorrow at 06:00
      expect(finishDate.hour()).to.equal(6);
      expect(finishDate.minute()).to.equal(0);
      expect(finishDate.isAfter(startDate)).to.be.true;
      expect(finishDate.date()).to.equal(startDate.date() + 1);

      // For testing purposes, we'll manually update the shift to start now
      // so we can test the clock-in functionality
      const now = dayjs();
      const currentStartTime = now.add(2, "minute").toDate();
      const currentEndTime = now.add(2, "minute").add(8, "hour").toDate();

      await ShiftModel.findByIdAndUpdate(nightShiftRes.body.shift.id, {
        startTime: currentStartTime,
        finishTime: currentEndTime,
      });

      const clockInRes = await request(app)
        .patch(`/api/shifts/${nightShiftRes.body.shift.id}/clock-in`)
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(200);

      expect(clockInRes.body.message).to.equal("Successfully clocked in");
    });
  });

  describe("PATCH /api/shifts/:id/clock-out", () => {
    let shiftId;

    beforeEach(async () => {
      const now = dayjs();
      // Set shift to have started 1 minute ago and end less than 30 minutes before minimum clock out buffer
      const startTime = dateTo24HrTime(now.subtract(1, "minute").toDate());
      const endTime = dateTo24HrTime(
        now
          .add(SHIFT_CONSTRAINTS.MINIMUM_CLOCK_OUT_BUFFER - 30, "minutes")
          .toDate(),
      );

      const shiftData = {
        title: "Test Shift",
        role: "Nurse",
        typeOfShift: [SHIFT_TYPES.EVENING],
        user: workerUserId,
        startTime: startTime,
        finishTime: endTime,
        location: testLocation,
        date: now.toISOString(),
      };

      const res = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(shiftData);

      shiftId = res.body.shift.id;

      await request(app)
        .patch(`/api/shifts/${shiftId}/clock-in`)
        .set("Authorization", `Bearer ${workerToken}`);
    });

    it("should clock out successfully when conditions met", async () => {
      const res = await request(app)
        .patch(`/api/shifts/${shiftId}/clock-out`)
        .set("Authorization", `Bearer ${workerToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.message).to.equal("Successfully clocked out");
      expect(res.body.shift.status).to.equal(SHIFT_STATUS.COMPLETED);
      expect(res.body.shift.clockOutTime).to.match(/^\d{2}:\d{2}$/);

      const shift = await ShiftModel.findById(shiftId);
      expect(shift.status).to.equal(SHIFT_STATUS.COMPLETED);
      expect(shift.clockOutTime).to.not.equal(null);
    });

    it("should return error when shift not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .patch(`/api/shifts/${fakeId}/clock-out`)
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(404);
    });

    it("should return error when user not assigned to shift", async () => {
      const res = await request(app)
        .patch(`/api/shifts/${shiftId}/clock-out`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(403);

      expect(res.body.message).to.equal("You are not assigned to this shift");
    });

    it("should return error when shift is not in progress", async () => {
      await ShiftModel.findByIdAndUpdate(shiftId, {
        status: SHIFT_STATUS.SCHEDULED,
      });

      const res = await request(app)
        .patch(`/api/shifts/${shiftId}/clock-out`)
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(400);

      expect(res.body.message).to.equal(
        "Can only clock out from shifts in progress",
      );
    });

    it("should return error when clocking out too early", async () => {
      const now = dayjs();
      // Set shift to have started 1 minute ago and end 1 hour after the minimum clock out buffer
      const startTime = dateTo24HrTime(now.subtract(1, "minute").toDate());
      const endTime = dateTo24HrTime(
        now
          .add(SHIFT_CONSTRAINTS.MINIMUM_CLOCK_OUT_BUFFER + 60, "minutes")
          .toDate(),
      );

      const longShiftData = {
        title: "Long Shift",
        role: "Nurse",
        typeOfShift: [SHIFT_TYPES.MORNING],
        user: workerUserId,
        startTime: startTime,
        finishTime: endTime,
        location: testLocation,
        date: now.toISOString(),
      };

      const longRes = await request(app)
        .post("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(longShiftData);

      await request(app)
        .patch(`/api/shifts/${longRes.body.shift.id}/clock-in`)
        .set("Authorization", `Bearer ${workerToken}`);

      const res = await request(app)
        .patch(`/api/shifts/${longRes.body.shift.id}/clock-out`)
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(400);

      expect(res.body.message).to.include(
        `Cannot clock out more than ${SHIFT_CONSTRAINTS.MINIMUM_CLOCK_OUT_BUFFER} minutes before shift ends`,
      );
    });
  });

  describe("GET /api/shifts", () => {
    /** @type {string} */
    let shift1Id, shift2Id, shift3Id;

    beforeEach(async () => {
      const batchData = {
        shifts: [
          {
            title: "Morning Shift 1",
            role: "Nurse",
            typeOfShift: [SHIFT_TYPES.MORNING],
            user: workerUserId,
            location: testLocation,
            startTime: "09:00",
            finishTime: "17:00",
            date: "2026-01-01",
          },
          {
            title: "Evening Shift 1",
            role: "Doctor",
            typeOfShift: [SHIFT_TYPES.EVENING],
            user: adminUserId,
            location: testLocation,
            startTime: "18:00",
            finishTime: "06:00",
            date: "2026-01-02",
          },
          {
            title: "Night Shift 1",
            role: "Therapist",
            typeOfShift: [SHIFT_TYPES.NIGHT],
            user: workerUserId,
            location: testLocation,
            startTime: "22:00",
            finishTime: "06:00",
            date: "2026-01-03",
          },
        ],
      };

      const res = await request(app)
        .post("/api/shifts/batch")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(batchData)
        .expect(200);

      expect(res.body.created).to.have.length(3);
      shift1Id = res.body.created[0].id;
      shift2Id = res.body.created[1].id;
      shift3Id = res.body.created[2].id;
    });

    it("should get all shifts with default pagination", async () => {
      const res = await request(app)
        .get("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.have.property("shifts");
      expect(res.body).to.have.property("pagination");
      expect(res.body.shifts).to.be.an("array");
      expect(res.body.shifts).to.have.length(3);
      expect(res.body.pagination.currentPage).to.equal(1);
      expect(res.body.pagination.totalCount).to.equal(3);
      expect(res.body.pagination.totalPages).to.equal(1);
      expect(res.body.pagination.hasNextPage).to.be.false;
      expect(res.body.pagination.hasPrevPage).to.be.false;
      expect(res.body.pagination.limit).to.equal(10);
    });

    it("should get shifts with custom pagination", async () => {
      const res = await request(app)
        .get("/api/shifts?page=1&limit=2")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.shifts).to.have.length(2);
      expect(res.body.pagination.currentPage).to.equal(1);
      expect(res.body.pagination.totalCount).to.equal(3);
      expect(res.body.pagination.totalPages).to.equal(2);
      expect(res.body.pagination.hasNextPage).to.be.true;
      expect(res.body.pagination.hasPrevPage).to.be.false;
      expect(res.body.pagination.limit).to.equal(2);
    });

    it("should get second page of results", async () => {
      const res = await request(app)
        .get("/api/shifts?page=2&limit=2")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.shifts).to.have.length(1);
      expect(res.body.pagination.currentPage).to.equal(2);
      expect(res.body.pagination.hasNextPage).to.be.false;
      expect(res.body.pagination.hasPrevPage).to.be.true;
    });

    it("should filter shifts by status", async () => {
      await request(app)
        .patch(`/api/shifts/${shift1Id}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`);

      const res = await request(app)
        .get("/api/shifts?status=Scheduled")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.shifts).to.have.length(2);
      res.body.shifts.forEach((shift) => {
        expect(shift.status).to.equal("Scheduled");
      });
    });

    it("should sort shifts by date descending (default)", async () => {
      const res = await request(app)
        .get("/api/shifts?sortBy=date&sortOrder=desc")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.shifts).to.have.length(3);
      expect(new Date(res.body.shifts[0].date)).to.be.greaterThan(
        new Date(res.body.shifts[1].date),
      );
      expect(new Date(res.body.shifts[1].date)).to.be.greaterThan(
        new Date(res.body.shifts[2].date),
      );
    });

    it("should sort shifts by date ascending", async () => {
      const res = await request(app)
        .get("/api/shifts?sortBy=date&sortOrder=asc")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.shifts).to.have.length(3);
      expect(new Date(res.body.shifts[0].date)).to.be.lessThan(
        new Date(res.body.shifts[1].date),
      );
      expect(new Date(res.body.shifts[1].date)).to.be.lessThan(
        new Date(res.body.shifts[2].date),
      );
    });

    it("should return error for invalid page number", async () => {
      const res = await request(app)
        .get("/api/shifts?page=0")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.be.an("array");
      expect(res.body.issues).to.deep.include({
        path: "page",
        error: "Page number must be greater than 0",
      });
    });

    it("should return error for invalid limit", async () => {
      const res = await request(app)
        .get("/api/shifts?limit=5000")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.be.an("array");
      expect(res.body.issues).to.deep.include({
        path: "limit",
        error: "Limit must be between 1 and 1000",
      });
    });

    it("should return error for invalid sort order", async () => {
      const res = await request(app)
        .get("/api/shifts?sortOrder=invalid")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.be.an("array");
      expect(res.body.issues).to.deep.include({
        path: "sortOrder",
        error: "Sort order must be 'asc' or 'desc'",
      });
    });

    it("should return error for invalid status", async () => {
      const res = await request(app)
        .get("/api/shifts?status=InvalidStatus")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.be.an("array");
      expect(res.body.issues).to.deep.include({
        path: "status",
        error: "Invalid shift status",
      });
    });

    it("should return error without authentication", async () => {
      await request(app).get("/api/shifts").expect(401);
    });

    it("should return error when non-admin tries to access all shifts", async () => {
      const res = await request(app)
        .get("/api/shifts")
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(403);

      expect(res.body).to.have.property("message");
      expect(res.body.message).to.equal("Access denied. Admin role required");
    });

    it("should include complete shift data with populated user and location", async () => {
      const res = await request(app)
        .get("/api/shifts")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.shifts).to.be.an("array");
      expect(res.body.shifts).to.have.length.gte(1);

      const shift = res.body.shifts[0];
      expect(shift).to.have.property("id");
      expect(shift).to.have.property("title");
      expect(shift).to.have.property("role");
      expect(shift).to.have.property("typeOfShift");
      expect(shift).to.have.property("startTime");
      expect(shift).to.have.property("finishTime");
      expect(shift).to.have.property("date");
      expect(shift).to.have.property("status");
      expect(shift).to.have.property("user");
      expect(shift.user).to.have.property("id");
      expect(shift.user).to.have.property("name");
      expect(shift.user).to.have.property("email");
      expect(shift).to.have.property("location");
      expect(shift.location).to.have.property("id");
      expect(shift.location).to.have.property("name");
      expect(shift.location).to.have.property("postCode");
    });
  });

  describe("GET /api/shifts/my-shifts", () => {
    let workerShift1Id, workerShift2Id, adminShiftId;

    beforeEach(async () => {
      const batchData = {
        shifts: [
          {
            title: "Morning Shift 1",
            role: "Nurse",
            typeOfShift: [SHIFT_TYPES.MORNING],
            user: workerUserId,
            location: testLocation,
            startTime: "09:00",
            finishTime: "17:00",
            date: "2026-01-01",
          },
          {
            title: "Evening Shift 1",
            role: "Doctor",
            typeOfShift: [SHIFT_TYPES.EVENING],
            user: workerUserId,
            location: testLocation,
            startTime: "18:00",
            finishTime: "06:00",
            date: "2026-01-02",
          },
          {
            title: "Admin Night Shift 1",
            role: "Therapist",
            typeOfShift: [SHIFT_TYPES.NIGHT],
            user: adminUserId,
            location: testLocation,
            startTime: "22:00",
            finishTime: "06:00",
            date: "2026-01-03",
          },
        ],
      };

      const res = await request(app)
        .post("/api/shifts/batch")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(batchData)
        .expect(200);

      expect(res.body.created).to.have.length(3);
      workerShift1Id = res.body.created[0].id;
      workerShift2Id = res.body.created[1].id;
      adminShiftId = res.body.created[2].id;
    });

    it("should get only current user's shifts", async () => {
      const res = await request(app)
        .get("/api/shifts/my-shifts")
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(200);

      expect(res.body).to.have.property("shifts");
      expect(res.body).to.have.property("pagination");
      expect(res.body.shifts).to.be.an("array");
      expect(res.body.shifts).to.have.length(2);
      expect(res.body.pagination.totalCount).to.equal(2);

      res.body.shifts.forEach((shift) => {
        expect(shift.user.id).to.equal(workerUserId);
      });
    });

    it("should paginate user's shifts correctly", async () => {
      const res = await request(app)
        .get("/api/shifts/my-shifts?page=1&limit=1")
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(200);

      expect(res.body.shifts).to.have.length(1);
      expect(res.body.pagination.currentPage).to.equal(1);
      expect(res.body.pagination.totalCount).to.equal(2);
      expect(res.body.pagination.totalPages).to.equal(2);
      expect(res.body.pagination.hasNextPage).to.be.true;
    });

    it("should filter user's shifts by status", async () => {
      await request(app)
        .patch(`/api/shifts/${workerShift1Id}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`);

      const res = await request(app)
        .get("/api/shifts/my-shifts?status=Scheduled")
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(200);

      expect(res.body.shifts).to.have.length(1);
      expect(res.body.shifts[0].status).to.equal("Scheduled");
      expect(res.body.shifts[0].id).to.equal(workerShift2Id);
    });

    it("should sort user's shifts by date", async () => {
      const res = await request(app)
        .get("/api/shifts/my-shifts?sortBy=date&sortOrder=asc")
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(200);

      expect(res.body.shifts).to.have.length(2);
      expect(new Date(res.body.shifts[0].date)).to.be.lessThan(
        new Date(res.body.shifts[1].date),
      );
    });

    it("should return error for invalid pagination parameters", async () => {
      const res = await request(app)
        .get("/api/shifts/my-shifts?page=-1")
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(400);

      expect(res.body).to.have.property("issues");
      expect(res.body.issues).to.be.an("array");
      expect(res.body.issues).to.deep.include({
        path: "page",
        error: "Page number must be greater than 0",
      });
    });

    it("should return error without authentication", async () => {
      await request(app).get("/api/shifts/my-shifts").expect(401);
    });

    it("should return empty results when user has no shifts", async () => {
      const newUserRes = await request(app).post("/api/user/register").send({
        name: "New User",
        email: "newuser@example.com",
        password: "NewUserPass123!",
      });
      const newUserToken = newUserRes.body.token;

      const res = await request(app)
        .get("/api/shifts/my-shifts")
        .set("Authorization", `Bearer ${newUserToken}`)
        .expect(200);

      expect(res.body.shifts).to.have.length(0);
      expect(res.body.pagination.totalCount).to.equal(0);
      expect(res.body.pagination.totalPages).to.equal(0);
    });

    it("should include complete shift data with populated user and location", async () => {
      const res = await request(app)
        .get("/api/shifts/my-shifts")
        .set("Authorization", `Bearer ${workerToken}`)
        .expect(200);

      expect(res.body.shifts).to.be.an("array");
      expect(res.body.shifts).to.have.length.gte(1);

      const shift = res.body.shifts[0];
      expect(shift).to.have.property("id");
      expect(shift).to.have.property("title");
      expect(shift).to.have.property("role");
      expect(shift).to.have.property("typeOfShift");
      expect(shift).to.have.property("startTime");
      expect(shift).to.have.property("finishTime");
      expect(shift).to.have.property("date");
      expect(shift).to.have.property("status");
      expect(shift).to.have.property("clockInTime");
      expect(shift).to.have.property("clockOutTime");
      expect(shift).to.have.property("user");
      expect(shift.user).to.have.property("id");
      expect(shift.user).to.have.property("name");
      expect(shift.user).to.have.property("email");
      expect(shift).to.have.property("location");
      expect(shift.location).to.have.property("id");
      expect(shift.location).to.have.property("name");
      expect(shift.location).to.have.property("postCode");
    });
  });
});

/**
 * Convert Date object to 24-hour time string "HH:MM"
 * @param {Date} date
 * @returns {string}
 */
const dateTo24HrTime = (date) => {
  return dayjs(date).format("HH:mm");
};
