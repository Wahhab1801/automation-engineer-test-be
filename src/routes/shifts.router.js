import express from "express";
import requireAuthMiddleware from "../middlewares/require-auth.middleware.js";
import requireAdminMiddleware from "../middlewares/require-admin.middleware.js";
import {
  createShiftController,
  updateShiftController,
  deleteShiftController,
  batchCreateUpdateShiftsController,
  cancelShiftController,
  clockInController,
  clockOutController,
  getAllShiftsController,
  getUserShiftsController,
  getShiftController,
} from "../controllers/shifts.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Shifts
 *   description: Retrieve and manage user shifts
 */

/**
 * @swagger
 * /shifts:
 *   get:
 *     summary: Get all shifts
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all shifts in the system (admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, cancelled, completed, in_progress]
 *         description: Filter by shift status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: "date"
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: "asc"
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of all shifts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - admin access required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  requireAuthMiddleware,
  requireAdminMiddleware,
  getAllShiftsController,
);
/**
 * @swagger
 * /shifts/my-shifts:
 *   get:
 *     summary: Get current user's shifts
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all shifts for the authenticated user
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, cancelled, completed, in_progress]
 *         description: Filter by shift status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: "date"
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: "asc"
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of user's shifts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.get("/my-shifts", requireAuthMiddleware, getUserShiftsController);
/**
 * @swagger
 * /shifts:
 *   post:
 *     summary: Create a new shift
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new shift (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - role
 *               - typeOfShift
 *               - user
 *               - startTime
 *               - finishTime
 *               - location
 *               - date
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the shift
 *               role:
 *                 type: string
 *                 description: Role for the shift
 *               typeOfShift:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [weekend, weekday, evening, morning, night]
 *                 description: Types of shift (at least one required)
 *               user:
 *                 type: string
 *                 description: ID of the user assigned to the shift
 *               startTime:
 *                 type: string
 *                 pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 description: Shift start time in HH:MM format
 *               finishTime:
 *                 type: string
 *                 pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 description: Shift finish time in HH:MM format
 *               numOfShiftsPerDay:
 *                 type: number
 *                 minimum: 1
 *                 default: 1
 *                 description: Number of shifts per day (optional, defaults to 1)
 *               location:
 *                 type: object
 *                 required:
 *                   - name
 *                   - address
 *                   - postCode
 *                   - cordinates
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Location name
 *                   address:
 *                     type: string
 *                     description: Location address
 *                   postCode:
 *                     type: string
 *                     description: Location post code
 *                   cordinates:
 *                     type: object
 *                     required:
 *                       - longitude
 *                       - latitude
 *                     properties:
 *                       longitude:
 *                         type: number
 *                         minimum: -180
 *                         maximum: 180
 *                         description: Longitude coordinate
 *                       latitude:
 *                         type: number
 *                         minimum: -90
 *                         maximum: 90
 *                         description: Latitude coordinate
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: Date for the shift (cannot be in the past)
 *     responses:
 *       201:
 *         description: Shift created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request - invalid input data
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - admin access required
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  requireAuthMiddleware,
  requireAdminMiddleware,
  createShiftController,
);
/**
 * @swagger
 * /shifts/batch:
 *   post:
 *     summary: Batch create or update shifts
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     description: Create or update multiple shifts in a single request (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shifts
 *             properties:
 *               shifts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - title
 *                     - role
 *                     - typeOfShift
 *                     - user
 *                     - startTime
 *                     - finishTime
 *                     - location
 *                     - date
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Shift ID (for updates, omit for new shifts)
 *                     title:
 *                       type: string
 *                       description: Title of the shift
 *                     role:
 *                       type: string
 *                       description: Role for the shift
 *                     typeOfShift:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [weekend, weekday, evening, morning, night]
 *                       description: Types of shift (at least one required)
 *                     user:
 *                       type: string
 *                       description: ID of the user assigned to the shift
 *                     startTime:
 *                       type: string
 *                       pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                       description: Shift start time in HH:MM format
 *                     finishTime:
 *                       type: string
 *                       pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                       description: Shift finish time in HH:MM format
 *                     numOfShiftsPerDay:
 *                       type: number
 *                       minimum: 1
 *                       default: 1
 *                       description: Number of shifts per day (optional, defaults to 1)
 *                     location:
 *                       type: object
 *                       required:
 *                         - name
 *                         - address
 *                         - postCode
 *                         - cordinates
 *                       properties:
 *                         name:
 *                           type: string
 *                           description: Location name
 *                         address:
 *                           type: string
 *                           description: Location address
 *                         postCode:
 *                           type: string
 *                           description: Location post code
 *                         cordinates:
 *                           type: object
 *                           required:
 *                             - longitude
 *                             - latitude
 *                           properties:
 *                             longitude:
 *                               type: number
 *                               minimum: -180
 *                               maximum: 180
 *                               description: Longitude coordinate
 *                             latitude:
 *                               type: number
 *                               minimum: -90
 *                               maximum: 90
 *                               description: Latitude coordinate
 *                     date:
 *                       type: string
 *                       format: date-time
 *                       description: Date for the shift (cannot be in the past)
 *     responses:
 *       200:
 *         description: Shifts processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: array
 *                       items:
 *                         type: object
 *                     updated:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Bad request - invalid input data
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - admin access required
 *       500:
 *         description: Internal server error
 */
router.post(
  "/batch",
  requireAuthMiddleware,
  requireAdminMiddleware,
  batchCreateUpdateShiftsController,
);
/**
 * @swagger
 * /shifts/{id}:
 *   put:
 *     summary: Update a shift
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     description: Update an existing shift (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shift ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the shift
 *               role:
 *                 type: string
 *                 description: Role for the shift
 *               typeOfShift:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [weekend, weekday, evening, morning, night]
 *                 description: Types of shift (at least one required)
 *               user:
 *                 type: string
 *                 description: ID of the user assigned to the shift
 *               startTime:
 *                 type: string
 *                 pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 description: Shift start time in HH:MM format
 *               finishTime:
 *                 type: string
 *                 pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 description: Shift finish time in HH:MM format
 *               numOfShiftsPerDay:
 *                 type: number
 *                 minimum: 1
 *                 description: Number of shifts per day
 *               location:
 *                 type: object
 *                 required:
 *                   - name
 *                   - address
 *                   - postCode
 *                   - cordinates
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Location name
 *                   address:
 *                     type: string
 *                     description: Location address
 *                   postCode:
 *                     type: string
 *                     description: Location post code
 *                   cordinates:
 *                     type: object
 *                     required:
 *                       - longitude
 *                       - latitude
 *                     properties:
 *                       longitude:
 *                         type: number
 *                         minimum: -180
 *                         maximum: 180
 *                         description: Longitude coordinate
 *                       latitude:
 *                         type: number
 *                         minimum: -90
 *                         maximum: 90
 *                         description: Latitude coordinate
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: Date for the shift (cannot be in the past)
 *     responses:
 *       200:
 *         description: Shift updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request - invalid input data
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - admin access required
 *       404:
 *         description: Shift not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id",
  requireAuthMiddleware,
  requireAdminMiddleware,
  updateShiftController,
);
/**
 * @swagger
 * /shifts/{id}:
 *   get:
 *     summary: Get a specific shift
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve details of a specific shift
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shift ID
 *     responses:
 *       200:
 *         description: Shift details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - access denied to this shift
 *       404:
 *         description: Shift not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", requireAuthMiddleware, getShiftController);
/**
 * @swagger
 * /shifts/{id}:
 *   delete:
 *     summary: Delete a shift
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     description: Delete an existing shift (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shift ID
 *     responses:
 *       200:
 *         description: Shift deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - admin access required
 *       404:
 *         description: Shift not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:id",
  requireAuthMiddleware,
  requireAdminMiddleware,
  deleteShiftController,
);
/**
 * @swagger
 * /shifts/{id}/cancel:
 *   patch:
 *     summary: Cancel a shift
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     description: Cancel an existing shift (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shift ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *     responses:
 *       200:
 *         description: Shift cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - admin access required
 *       404:
 *         description: Shift not found
 *       409:
 *         description: Conflict - shift cannot be cancelled (e.g., already started)
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/:id/cancel",
  requireAuthMiddleware,
  requireAdminMiddleware,
  cancelShiftController,
);
/**
 * @swagger
 * /shifts/{id}/clock-in:
 *   patch:
 *     summary: Clock in to a shift
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     description: Clock in to start working a shift
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shift ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *     responses:
 *       200:
 *         description: Successfully clocked in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     clockInTime:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - not authorized to clock in to this shift
 *       404:
 *         description: Shift not found
 *       409:
 *         description: Conflict - already clocked in or shift not ready for clock-in
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/clock-in", requireAuthMiddleware, clockInController);
/**
 * @swagger
 * /shifts/{id}/clock-out:
 *   patch:
 *     summary: Clock out of a shift
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     description: Clock out to end working a shift
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shift ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *     responses:
 *       200:
 *         description: Successfully clocked out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     clockOutTime:
 *                       type: string
 *                       format: date-time
 *                     totalHours:
 *                       type: number
 *                       description: Total hours worked
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - not authorized to clock out of this shift
 *       404:
 *         description: Shift not found
 *       409:
 *         description: Conflict - not clocked in or already clocked out
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/clock-out", requireAuthMiddleware, clockOutController);

export default router;
