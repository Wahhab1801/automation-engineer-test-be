import UserModel from "../../models/user.model.js";
import { AppError } from "../../utils/errors/app.error.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as process from "node:process";
import crypto from "node:crypto";
import { sendEmail } from "../../utils/email.js";
import { ValidationError } from "../../utils/errors/validation.error.js";
import { getCurrentDateTime, addTime, isAfter } from "../../utils/datetime.js";

/**
 * Create JWT token for user using userId as payload
 * @param {string} userId
 * @returns {string} JWT token
 */
const createJWTToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: 3 * 24 * 60 * 60,
  });
};

/**
 * Register a new user
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user: {id: string, name: string, email: string}}>} Registered user info and JWT token
 * @throws {AppError} If user already exists
 */
const registerUser = async (name, email, password) => {
  const exists = await UserModel.findOne({ email });
  if (exists) {
    throw new AppError({
      message: "User already exists",
      statusCode: 400,
      errorCode: "USER_EXISTS",
    });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new UserModel({ name, email, password: hashedPassword });
  const user = await newUser.save();
  const token = createJWTToken(user._id);
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

/**
 * Login user with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user: {id: string, name: string, email: string}}>} Logged in user info and JWT token
 * @throws {AppError} If user does not exist
 */
const loginUser = async (email, password) => {
  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new AppError({
      message: "User does not exist",
      statusCode: 404,
      errorCode: "USER_NOT_FOUND",
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError({
      message: "Invalid email or password",
      statusCode: 400,
      errorCode: "INVALID_CREDENTIALS",
    });
  }
  const token = createJWTToken(user._id);
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

/**
 * Get user by ID
 * @param {string} id
 * @returns {Promise<{user: {id: string, name: string, email: string, role: string}}>} User info
 */
const getUser = async (id) => {
  const user = await UserModel.findOne({ _id: id });

  if (!user) {
    throw new AppError({
      message: "User does not exists",
      statusCode: 404,
      errorCode: "USER_NOT_FOUND",
    });
  }

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

/**
 * Handle forgot password by generating a reset token and sending it via email
 * @param {string} email - User's email address
 * @throws {AppError} If user does not exist or email sending fails
 */
const forgotPassword = async (email) => {
  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new AppError({
      message: "User does not exist",
      statusCode: 404,
      errorCode: "USER_NOT_FOUND",
    });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const ttlMinutes = 60; // Token valid for 60 minutes
  const resetTokenExpiresAt = addTime(
    getCurrentDateTime(),
    ttlMinutes,
    "minute",
  );

  user.passwordResetTokenHash = resetTokenHash;
  user.passwordResetTokenExpiry = resetTokenExpiresAt;
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?uid=${user._id}&token=${resetToken}`;

  await sendEmail(
    email,
    "ORTA - Password Reset",
    `<h1>ORTA - Password Reset</h1><h2>Click on the link to reset your ORTA account password</h2><h3>${resetUrl}</h3><p>This link is valid for the next ${ttlMinutes} minutes.</p>`,
  );
};

/**
 * Reset user password using reset token
 * @param {string} id - User ID
 * @param {string} resetToken - Password reset token
 * @param {string} newPassword - New password
 * @throws {AppError} If user does not exist
 * @throws {ValidationError} If token is invalid or expired
 */
const resetPassword = async (id, resetToken, newPassword) => {
  const user = await UserModel.findOne({ _id: id });

  if (!user) {
    throw new AppError({
      message: "User does not exists",
      statusCode: 404,
      errorCode: "USER_NOT_FOUND",
    });
  }

  if (isAfter(getCurrentDateTime(), user.passwordResetTokenExpiry)) {
    throw new ValidationError({
      message: "Password reset token has expired",
      statusCode: 400,
      errorCode: "PASSWORD_RESET_TOKEN_EXPIRED",
    });
  }

  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const dbTokenHash = Buffer.from(user.passwordResetTokenHash, "hex");
  const inputTokenHash = Buffer.from(resetTokenHash, "hex");
  if (
    dbTokenHash.length !== inputTokenHash.length ||
    !crypto.timingSafeEqual(dbTokenHash, inputTokenHash)
  ) {
    throw new ValidationError({
      message: "Invalid password reset token",
      statusCode: 400,
      errorCode: "INVALID_PASSWORD_RESET_TOKEN",
    });
  }

  const salt = await bcrypt.genSalt(10);

  user.password = await bcrypt.hash(newPassword, salt);
  user.passwordResetTokenHash = null;
  user.passwordResetTokenExpiry = null;
  await user.save();
};

/**
 * Promote a user to admin role
 * @param {string} userId - ID of the user to promote
 * @returns {Promise<{user: {id: string, name: string, email: string, role: string}}>} Updated user info
 * @throws {AppError} If user does not exist
 */
const promoteToAdmin = async (userId) => {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new AppError({
      message: "User does not exist",
      statusCode: 404,
      errorCode: "USER_NOT_FOUND",
    });
  }

  user.role = "admin";
  await user.save();

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

export {
  registerUser,
  loginUser,
  getUser,
  forgotPassword,
  resetPassword,
  promoteToAdmin,
};
