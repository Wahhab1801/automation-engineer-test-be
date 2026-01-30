import express from "express";
import {
  loginUserController,
  registerUserController,
  getUserController,
  forgotPasswordController,
  resetPasswordController,
  promoteToAdminController,
} from "../controllers/authentication.controller.js";
import requireAuthMiddleware from "../middlewares/require-auth.middleware.js";
import requireAdminMiddleware from "../middlewares/require-admin.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User authentication and profile management
 */

/**
 * @swagger
 * /user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass123!
 *     responses:
 *       200:
 *         description: User registered successfully
 *       400:
 *         description: User already exists or validation failed
 */
router.post("/register", registerUserController);

/**
 * @swagger
 * /user/login:
 *   post:
 *     summary: Login a user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: StrongPass123!
 *     responses:
 *       200:
 *         description: Successful login with JWT token
 *       400:
 *         description: Invalid credentials
 *       404:
 *         description: User does not exist
 */
router.post("/login", loginUserController);

/**
 * @swagger
 * /user/getuser:
 *   get:
 *     summary: Get current user details
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details returned
 *       401:
 *         description: Unauthorized or invalid token
 */
router.get("/getuser", requireAuthMiddleware, getUserController);

/**
 * @swagger
 * /forgotPassword:
 *   post:
 *     summary: Send a password reset email to the user
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/forgotPassword", forgotPasswordController);

/**
 * @swagger
 * /resetPassword:
 *   post:
 *     summary: Reset user password using a valid token
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - resetToken
 *               - newPassword
 *             properties:
 *               id:
 *                 type: string
 *                 example: 64a7b2f5e1d3c2a1b4c5d6e7
 *                 description: User ID
 *               resetToken:
 *                 type: string
 *                 example: d4c68f30aa0b5c2d...
 *                 description: Token received in the password reset email
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: NewStrongPassword123!
 *                 description: New password to set
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 *       404:
 *        description: User not found
 */
router.post("/resetPassword", resetPasswordController);

/**
 * @swagger
 * /user/promote-to-admin:
 *   post:
 *     summary: Promote a user to admin role (admin only)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 64a7b2f5e1d3c2a1b4c5d6e7
 *                 description: ID of the user to promote to admin
 *     responses:
 *       200:
 *         description: User promoted to admin successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User promoted to admin successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       example: admin
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - admin role required
 *       404:
 *         description: User not found
 */
router.post(
  "/promote-to-admin",
  requireAuthMiddleware,
  requireAdminMiddleware,
  promoteToAdminController,
);

export default router;
