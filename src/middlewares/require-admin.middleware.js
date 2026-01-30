import { AuthorizationError } from "../utils/errors/auth.error.js";
import UserModel from "../models/user.model.js";

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('express').NextFunction} NextFunction */

/**
 * Middleware to require admin role
 * This middleware should be used after requireAuthMiddleware
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const requireAdminMiddleware = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      throw new AuthorizationError({
        message: "User not authenticated",
        errorCode: "USER_NOT_AUTHENTICATED",
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      throw new AuthorizationError({
        message: "User not found",
        errorCode: "USER_NOT_FOUND",
      });
    }

    if (user.role !== "admin") {
      throw new AuthorizationError({
        message: "Access denied. Admin role required",
        errorCode: "ADMIN_ROLE_REQUIRED",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default requireAdminMiddleware;
