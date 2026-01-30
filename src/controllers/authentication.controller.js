import { zodSchemaValidator } from "../utils/errors/utils.js";
import {
  registerUser,
  loginUser,
  getUser,
  forgotPassword,
  resetPassword,
  promoteToAdmin,
} from "../services/authentication/index.js";
import { z } from "zod";
import validator from "validator";

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('express').NextFunction} NextFunction */

const schemaRegisterUser = z.object({
  name: z.string().nonempty({ error: "Name is required" }).trim(),
  email: z.email().nonempty({ error: "Invalid email address" }).trim(),
  password: z
    .string()
    .nonempty({ error: "Password is required" })
    .refine(validator.isStrongPassword, {
      error:
        "Password must be min 8 characters long and include uppercase, lowercase, number, and symbol",
    })
    .trim(),
});

const schemaLoginUser = z.object({
  email: z.email().nonempty({ error: "invalid email address" }).trim(),
  password: z.string().nonempty({ error: "invalid password" }).trim(),
});

const schemaGetUser = z.object({
  id: z.string().nonempty({ error: "user id is required" }).trim(),
});

const schemaForgotPassword = z.object({
  email: z.email().nonempty({ error: "invalid email address" }).trim(),
});

const schemaResetPassword = z.object({
  id: z.string().nonempty({ error: "user id is required" }).trim(),
  newPassword: z
    .string()
    .nonempty({ error: "new password is required" })
    .refine(validator.isStrongPassword, {
      error:
        "Password must be min 8 characters long and include uppercase, lowercase, number, and symbol",
    })
    .trim(),
  resetToken: z
    .string()
    .nonempty({ error: "password reset token is required" })
    .trim(),
});

const schemaPromoteToAdmin = z.object({
  userId: z.string().nonempty({ error: "user id is required" }).trim(),
});

/**
 * Controller to handle user registration
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const registerUserController = async (req, res, next) => {
  try {
    /** @type {{name: string, email: string, password: string}} */
    const validatedData = zodSchemaValidator(schemaRegisterUser, req.body);

    res
      .status(200)
      .json(
        await registerUser(
          validatedData.name,
          validatedData.email,
          validatedData.password,
        ),
      );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle user login
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const loginUserController = async (req, res, next) => {
  try {
    /** @type {{email: string, password: string}} */
    const validatedData = zodSchemaValidator(schemaLoginUser, req.body);
    res
      .status(200)
      .json(await loginUser(validatedData.email, validatedData.password));
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to logged-in user details
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const getUserController = async (req, res, next) => {
  try {
    /** @type {{id: string}} */
    const validatedData = zodSchemaValidator(schemaGetUser, req.user);
    res.status(200).json(await getUser(validatedData.id));
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle forgot password
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const forgotPasswordController = async (req, res, next) => {
  try {
    /** @type {{email: string}} */
    const validatedData = zodSchemaValidator(schemaForgotPassword, req.body);
    await forgotPassword(validatedData.email);
    res.status(200).json({
      message: "A link to reset your password have been sent to your email.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle reset password
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const resetPasswordController = async (req, res, next) => {
  try {
    /** @type {{id: string, newPassword: string, resetToken: string}} */
    const validatedData = zodSchemaValidator(schemaResetPassword, req.body);
    await resetPassword(
      validatedData.id,
      validatedData.resetToken,
      validatedData.newPassword,
    );
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle promoting user to admin
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const promoteToAdminController = async (req, res, next) => {
  try {
    /** @type {{userId: string}} */
    const validatedData = zodSchemaValidator(schemaPromoteToAdmin, req.body);
    const result = await promoteToAdmin(validatedData.userId);
    res.status(200).json({
      message: "User promoted to admin successfully",
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

export {
  registerUserController,
  loginUserController,
  getUserController,
  forgotPasswordController,
  resetPasswordController,
  promoteToAdminController,
};
