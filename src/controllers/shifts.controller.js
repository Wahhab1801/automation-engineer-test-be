import { zodSchemaValidator } from "../utils/errors/utils.js";
import {
  createShift,
  updateShift,
  deleteShift,
  batchCreateUpdateShifts,
  cancelShift,
  clockInShift,
  clockOutShift,
  getAllShifts,
  getUserShifts,
  getShift,
} from "../services/shift/index.js";
import { z } from "zod";
import mongoose from "mongoose";
import { SHIFT_STATUS, SHIFT_TYPES } from "../services/shift/constants.js";
import { isValidTimeString, isDateInPast } from "../utils/datetime.js";
import dayjs from "dayjs";

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('express').NextFunction} NextFunction */

const objectIdValidator = (/** @type {string} */ errorMessage) =>
  z.string({ error: errorMessage }).refine(
    (val) => {
      return mongoose.Types.ObjectId.isValid(val);
    },
    {
      error: errorMessage,
    },
  );

const dateValidator = z.string({ error: "Invalid date or time" }).refine(
  (val) => {
    const date = dayjs(val);
    if (!date.isValid()) {
      return false;
    }
    return !isDateInPast(val);
  },
  {
    error: "Date cannot be in the past and must be a valid date",
  },
);

const timeValidator = z
  .string({ error: "Time must be in HH:MM format" })
  .refine(
    (val) => {
      return isValidTimeString(val);
    },
    {
      error: "Time must be in HH:MM format",
    },
  );

const locationObjectSchema = z.object(
  {
    name: z
      .string({ error: "Location name is required" })
      .nonempty({ error: "Location name cannot be empty" })
      .trim(),
    address: z
      .string({ error: "Location address is required" })
      .nonempty({ error: "Location address cannot be empty" })
      .trim(),
    postCode: z
      .string({ error: "Location post code is required" })
      .nonempty({ error: "Location post code cannot be empty" })
      .trim(),
    cordinates: z.object(
      {
        longitude: z
          .number({ error: "Longitude must be a number" })
          .min(-180, { error: "Longitude must be between -180 and 180" })
          .max(180, { error: "Longitude must be between -180 and 180" }),
        latitude: z
          .number({ error: "Latitude must be a number" })
          .min(-90, { error: "Latitude must be between -90 and 90" })
          .max(90, { error: "Latitude must be between -90 and 90" }),
      },
      { error: "Location coordinates are required" },
    ),
  },
  { error: "Invalid location object" },
);

const schemaCreateShift = z.object({
  title: z
    .string({ error: "Title is required" })
    .nonempty({ error: "Title cannot be empty" })
    .trim(),
  role: z
    .string({ error: "Role is required" })
    .nonempty({ error: "Role cannot be empty" })
    .trim(),
  typeOfShift: z
    .array(
      z.enum([
        SHIFT_TYPES.WEEKEND,
        SHIFT_TYPES.WEEKDAY,
        SHIFT_TYPES.EVENING,
        SHIFT_TYPES.MORNING,
        SHIFT_TYPES.NIGHT,
      ]),
      {
        error: "Invalid shift type",
      },
    )
    .min(1, { error: "At least one shift type is required" }),
  user: objectIdValidator("Invalid user ID"),
  startTime: timeValidator,
  finishTime: timeValidator,
  numOfShiftsPerDay: z
    .number({ error: "Number of shifts per day must be a number" })
    .int()
    .positive({ error: "Number of shifts per day must be a positive integer" })
    .optional()
    .default(1),
  location: locationObjectSchema,
  date: dateValidator,
});

const schemaBatchShift = z.object({
  id: objectIdValidator("Invalid shift ID").optional(),
  title: z
    .string({ error: "Title is required" })
    .nonempty({ error: "Title cannot be empty" })
    .trim(),
  role: z
    .string({ error: "Role is required" })
    .nonempty({ error: "Role cannot be empty" })
    .trim(),
  typeOfShift: z
    .array(
      z.enum([
        SHIFT_TYPES.WEEKEND,
        SHIFT_TYPES.WEEKDAY,
        SHIFT_TYPES.EVENING,
        SHIFT_TYPES.MORNING,
        SHIFT_TYPES.NIGHT,
      ]),
      {
        error: "Invalid shift type",
      },
    )
    .min(1, { error: "At least one shift type is required" }),
  user: objectIdValidator("Invalid user ID"),
  startTime: timeValidator,
  finishTime: timeValidator,
  numOfShiftsPerDay: z
    .number({ error: "Number of shifts per day must be a number" })
    .int()
    .positive({ error: "Number of shifts per day must be a positive integer" })
    .optional()
    .default(1),
  location: locationObjectSchema,
  date: dateValidator,
});

const schemaBatchShifts = z.object({
  shifts: z
    .array(schemaBatchShift, { error: "Invalid shifts array" })
    .min(1, { error: "At least one shift is required" }),
});

const schemaUpdateShift = z.object({
  title: z
    .string({ error: "Title is required" })
    .nonempty({ error: "Title cannot be empty" })
    .trim()
    .optional(),
  role: z
    .string({ error: "Role is required" })
    .nonempty({ error: "Role cannot be empty" })
    .trim()
    .optional(),
  typeOfShift: z
    .array(
      z.enum([
        SHIFT_TYPES.WEEKEND,
        SHIFT_TYPES.WEEKDAY,
        SHIFT_TYPES.EVENING,
        SHIFT_TYPES.MORNING,
        SHIFT_TYPES.NIGHT,
      ]),
      {
        error: "Invalid shift type",
      },
    )
    .min(1, { error: "At least one shift type is required" })
    .optional(),
  user: objectIdValidator("Invalid user ID").optional(),
  startTime: timeValidator.optional(),
  finishTime: timeValidator.optional(),
  numOfShiftsPerDay: z
    .number({ error: "Number of shifts per day must be a number" })
    .int()
    .positive({ error: "Number of shifts per day must be a positive integer" })
    .optional(),
  location: locationObjectSchema.optional(),
  date: dateValidator.optional(),
});

const paginationQuerySchema = z
  .object({
    page: z
      .any()
      .optional()
      .transform((val) => {
        if (val === undefined || val === null || val === "") {
          return 1;
        }
        const parsed =
          typeof val === "string" ? parseInt(val, 10) : Number(val);
        return isNaN(parsed) ? 1 : parsed;
      })
      .refine((val) => val >= 1, {
        error: "Page number must be greater than 0",
      }),
    limit: z
      .any()
      .optional()
      .transform((val) => {
        if (val === undefined || val === null || val === "") {
          return 10;
        }
        const parsed =
          typeof val === "string" ? parseInt(val, 10) : Number(val);
        return isNaN(parsed) ? 10 : parsed;
      })
      .refine((val) => val >= 1 && val <= 1000, {
        error: "Limit must be between 1 and 1000",
      }),
    status: z
      .any()
      .optional()
      .transform((val) => {
        if (
          val === undefined ||
          val === null ||
          val === "" ||
          typeof val !== "string"
        ) {
          return undefined;
        }
        return val;
      })
      .refine(
        (val) => {
          if (val === undefined) {
            return true;
          }
          return Object.values(SHIFT_STATUS).includes(val);
        },
        {
          message: "Invalid shift status",
        },
      ),
    sortBy: z
      .any()
      .optional()
      .transform((val) => {
        if (
          val === undefined ||
          val === null ||
          val === "" ||
          typeof val !== "string"
        ) {
          return "date";
        }
        return val;
      }),
    sortOrder: z
      .any()
      .optional()
      .transform((val) => {
        if (val === undefined || val === null || val === "") {
          return "asc";
        }
        return val;
      })
      .refine(
        (val) => {
          return val === "asc" || val === "desc";
        },
        {
          error: "Sort order must be 'asc' or 'desc'",
        },
      ),
  })
  .transform((data) => {
    const result = { ...data };
    if (result.status === undefined) {
      delete result.status;
    }
    return result;
  });

/**
 * Controller to handle shift creation
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const createShiftController = async (req, res, next) => {
  try {
    /** @type {{title: string, role: string, typeOfShift?: string[], user: string, startTime: string, finishTime: string, numOfShiftsPerDay?: number, location: string, date: string}} */
    const validatedData = zodSchemaValidator(schemaCreateShift, req.body);

    validatedData.date = dayjs(validatedData.date).toDate();

    res.status(201).json(await createShift(validatedData));
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle shift updates
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const updateShiftController = async (req, res, next) => {
  try {
    const { id } = req.params;

    zodSchemaValidator(objectIdValidator("Invalid shift ID"), id);

    /** @type {{title?: string, role?: string, typeOfShift?: string[], user?: string, startTime?: string, finishTime?: string, numOfShiftsPerDay?: number, location?: string, date?: string}} */
    const validatedData = zodSchemaValidator(schemaUpdateShift, req.body);

    if (validatedData.date) {
      validatedData.date = dayjs(validatedData.date).toDate();
    }

    res.status(200).json(await updateShift(id, validatedData));
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle shift deletion
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const deleteShiftController = async (req, res, next) => {
  try {
    const { id } = req.params;

    zodSchemaValidator(objectIdValidator("Invalid shift ID"), id);

    await deleteShift(id);

    res.status(200).json({
      message: "Shift deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle batch create/update shifts
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const batchCreateUpdateShiftsController = async (req, res, next) => {
  try {
    /** @type {{shifts: Array<{id?: string, title: string, role: string, typeOfShift?: string[], user: string, startTime: string, finishTime: string, numOfShiftsPerDay?: number, location: string, date: string}>}} */
    const validatedData = zodSchemaValidator(schemaBatchShifts, req.body);

    const processedShifts = validatedData.shifts.map((shift) => ({
      ...shift,
      date: dayjs(shift.date).toDate(),
    }));

    res.status(200).json(await batchCreateUpdateShifts(processedShifts));
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle fetching all shifts with pagination (admin only)
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const getAllShiftsController = async (req, res, next) => {
  try {
    const options = zodSchemaValidator(paginationQuerySchema, req.query);
    res.status(200).json(await getAllShifts(options));
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle fetching user's own shifts with pagination
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const getUserShiftsController = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const options = zodSchemaValidator(paginationQuerySchema, req.query);
    res.status(200).json(await getUserShifts(userId, options));
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle shift cancellation
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const cancelShiftController = async (req, res, next) => {
  try {
    const { id } = req.params;

    zodSchemaValidator(objectIdValidator("Invalid shift ID"), id);

    await cancelShift(id);

    res.status(200).json({
      message: "Shift cancelled successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle get shift
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const getShiftController = async (req, res, next) => {
  try {
    const { id } = req.params;

    zodSchemaValidator(objectIdValidator("Invalid shift ID"), id);

    res.status(200).json(await getShift(id));
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle worker clock in
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const clockInController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    zodSchemaValidator(objectIdValidator("Invalid shift ID"), id);

    res.status(200).json(await clockInShift(id, userId));
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle worker clock out
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const clockOutController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    zodSchemaValidator(objectIdValidator("Invalid shift ID"), id);

    res.status(200).json(await clockOutShift(id, userId));
  } catch (error) {
    next(error);
  }
};

export {
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
};
