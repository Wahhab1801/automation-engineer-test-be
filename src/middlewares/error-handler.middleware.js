import { AppError } from "../utils/errors/app.error.js";
import * as process from "node:process";
import * as console from "node:console";

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('express').NextFunction} NextFunction */

/**
 * Global error handling middleware
 * @param error {Error | AppError} - The error object
 * @param req {Request}
 * @param res {Response}
 * @param _next {NextFunction}
 * @returns {Promise<void>}
 */
export const errorHandlerMiddleware = async (error, req, res, _next) => {
  /** @type {AppError} */
  let appError;

  if (error instanceof AppError) {
    appError = error;
  } else {
    appError = new AppError({
      message: error.message || "Internal server error",
      statusCode: 500,
      errorCode: "INTERNAL_SERVER_ERROR",
      isOperational: false,
      cause: error,
    });
  }

  const serialisedError = {
    ...appError.toJSON(),
    request: {
      method: req.method,
      path: req.path,
    },
  };

  if (!appError.isOperational) {
    console.error(appError.message, {
      error: serialisedError,
      cause: appError.cause,
    });
  }
  res.status(appError.statusCode).json({
    ...appError.toJSON({
      removeStack: process.env.NODE_ENV === "production",
    }),
  });
};
