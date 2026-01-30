import dayjs from "dayjs";

/** @typedef {{
 * name: string,
 * message: string,
 * statusCode: number,
 * errorCode: string,
 * timestamp: string,
 * stack?: string,
 * cause?: { name: string, message: string, stack?: string } | { error: string }
 }} SerialisedError */

/**
 * A custom error class for application-specific errors.
 * Extends the built-in Error class to include additional properties
 * such as statusCode, isOperational, errorCode, and timestamp.
 */
export class AppError extends Error {
  /** @type {number} */
  statusCode;

  /** @type {boolean} */
  isOperational; // Distinguishes between expected errors and bugs

  /** @type {string} */
  errorCode;

  /** @type {string} */
  timestamp;

  /**
   * Custom application error class
   *
   * @param {Object} params
   * @param {string} params.message - Error message
   * @param {number} params.statusCode - HTTP status code
   * @param {string} params.errorCode - Application-specific error code
   * @param {boolean} [params.isOperational=true] - Whether the error is operational (expected) or a programming error (bug
   * @param {Error} [params.cause] - The original error that caused this error, if any
   */
  constructor({ message, statusCode, errorCode, isOperational = true, cause }) {
    super(message, { cause });

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    this.timestamp = dayjs().toISOString();

    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Serialize error for API responses
   * @param {Object} [options]
   * @param {boolean} [options.removeStack=false] - Whether to exclude the stack trace from the output
   * @returns {SerialisedError} Serialized error object
   * */
  toJSON(options) {
    const formatCause = (cause) => {
      if (cause instanceof AppError) {
        return cause.toJSON();
      }
      if (cause instanceof Error) {
        return {
          name: cause.name,
          message: cause.message,
          stack: !options?.removeStack ? cause.stack : undefined,
        };
      }
      return { error: String(cause) };
    };

    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      timestamp: this.timestamp,
      ...(this.cause ? { cause: formatCause(this.cause) } : {}),
      ...(!options?.removeStack && { stack: this.stack }),
    };
  }
}
