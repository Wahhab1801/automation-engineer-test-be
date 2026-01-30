import jwt from "jsonwebtoken";
import { AuthenticationError } from "../utils/errors/auth.error.js";
import * as process from "node:process";

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('express').NextFunction} NextFunction */

/**
 * Middleware to require authentication using JWT
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const requireAuthMiddleware = async (req, res, next) => {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      throw new AuthenticationError({
        message: "Authorization header missing",
        errorCode: "AUTH_HEADER_MISSING",
      });
    }
    const token = authorization.split(" ");

    if (token.length !== 2) {
      throw new AuthenticationError(
        "Invalid authorization header",
        "AUTH_HEADER_INVALID",
      );
    }

    if (token[0] !== "Bearer") {
      throw new AuthenticationError(
        `Invalid authorization header scheme. Expected 'Bearer' but got: ${token[0]}`,
        "AUTH_HEADER_INVALID_SCHEME",
      );
    }

    const decoded = jwt.verify(token[1], process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    if (error.message === "jwt malformed") {
      next(new AuthenticationError("Malformed token", "AUTH_TOKEN_MALFORMED"));
    } else {
      next(error);
    }
  }
};
export default requireAuthMiddleware;
