import ShiftModel from "../../models/shifts.model.js";
import UserModel from "../../models/user.model.js";
import { AppError } from "../../utils/errors/app.error.js";
import { ValidationError } from "../../utils/errors/validation.error.js";
import { SHIFT_STATUS, SHIFT_CONSTRAINTS } from "./constants.js";
import {
  createShiftDateTimes,
  validateClockInTime,
  validateClockOutTime,
  getCurrentDateTime,
  formatTimeString,
} from "../../utils/datetime.js";
import { createOrUpdateLocation } from "../location/index.js";

/**
 * Format a single shift object for API response
 * @param {Object} shift - Mongoose shift document
 * @returns {Object} Formatted shift object
 */
const formatShiftForResponse = (shift) => ({
  id: shift._id,
  title: shift.title,
  role: shift.role,
  typeOfShift: shift.typeOfShift,
  startTime: formatTimeString(shift.startTime),
  finishTime: formatTimeString(shift.finishTime),
  numOfShiftsPerDay: shift.numOfShiftsPerDay,
  date: shift.date,
  status: shift.status,
  clockInTime: shift.clockInTime ? formatTimeString(shift.clockInTime) : null,
  clockOutTime: shift.clockOutTime
    ? formatTimeString(shift.clockOutTime)
    : null,
  createdAt: shift.createdAt,
  updatedAt: shift.updatedAt,
  user: shift.user
    ? {
        id: shift.user._id,
        name: shift.user.name,
        email: shift.user.email,
        role: shift.user.role,
      }
    : null,
  location: shift.location
    ? {
        id: shift.location._id,
        name: shift.location.name,
        postCode: shift.location.postCode,
        distance: shift.location.distance,
        constituency: shift.location.constituency,
        adminDistrict: shift.location.adminDistrict,
        coordinates: shift.location.cordinates,
        address: shift.location.address,
      }
    : null,
});

/**
 * Core shifts query function with pagination
 * @param {Object} baseQuery - MongoDB query object
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=10] - Number of shifts per page
 * @param {string} [options.status] - Filter by shift status
 * @param {string} [options.sortBy='date'] - Sort field
 * @param {string} [options.sortOrder='desc'] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated shifts with metadata
 */
const getShiftsWithPagination = async (baseQuery = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    status,
    sortBy = "date",
    sortOrder = "desc",
  } = options;

  const skip = (page - 1) * limit;
  const query = { ...baseQuery };

  if (status) {
    query.status = status;
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

  const [shifts, totalCount] = await Promise.all([
    ShiftModel.find(query)
      .populate("user", "name email role")
      .populate(
        "location",
        "name postCode distance constituency adminDistrict cordinates address",
      )
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec(),
    ShiftModel.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const formattedShifts = shifts.map(formatShiftForResponse);

  return {
    shifts: formattedShifts,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage,
      hasPrevPage,
      limit,
    },
  };
};

/**
 * Create a new shift for a user
 * @param {Object} shiftData - Shift data object
 * @param {string} shiftData.title - Shift title
 * @param {string} shiftData.role - Shift role
 * @param {string[]} [shiftData.typeOfShift] - Array of shift types
 * @param {string} shiftData.user - User ID
 * @param {string} shiftData.startTime - Start time of the shift
 * @param {string} shiftData.finishTime - Finish time of the shift
 * @param {number} [shiftData.numOfShiftsPerDay] - Number of shifts per day (default: 1)
 * @param {Object} shiftData.location - Location object
 * @param {string} shiftData.location.name - Location name
 * @param {string} shiftData.location.address - Location address
 * @param {string} shiftData.location.postcode - Location postcode
 * @param {Object} shiftData.location.cordinates - Location coordinates
 * @param {Date} shiftData.date - Date of the shift
 * @returns {Promise<Object>} Created shift with populated user and location data
 * @throws {AppError} If user does not exist
 * @throws {ValidationError} If validation fails
 */
const createShift = async (shiftData) => {
  const {
    title,
    role,
    typeOfShift,
    user,
    startTime,
    finishTime,
    numOfShiftsPerDay = 1,
    location,
    date,
  } = shiftData;

  const userExists = await UserModel.findById(user);
  if (!userExists) {
    throw new AppError({
      message: "User not found",
      statusCode: 404,
      errorCode: "USER_NOT_FOUND",
    });
  }

  const locationDoc = await createOrUpdateLocation(location);

  const { startDateTime, finishDateTime } = createShiftDateTimes(
    date,
    startTime,
    finishTime,
  );

  const newShift = new ShiftModel({
    title,
    role,
    typeOfShift,
    user,
    startTime: startDateTime,
    finishTime: finishDateTime,
    numOfShiftsPerDay,
    location: locationDoc._id,
    date,
  });

  const savedShift = await newShift.save();

  const shift = await ShiftModel.findById(savedShift._id)
    .populate("user", "name email role")
    .populate(
      "location",
      "name postCode distance constituency adminDistrict cordinates address",
    )
    .exec();

  if (!shift) {
    throw new AppError({
      message: "Failed to retrieve created shift",
      statusCode: 500,
      errorCode: "SHIFT_RETRIEVAL_FAILED",
    });
  }

  return {
    shift: formatShiftForResponse(shift),
  };
};

/**
 * Update an existing shift
 * @param {string} shiftId - ID of the shift to update
 * @param {Object} updateData - Data to update
 * @param {string} [updateData.title] - Shift title
 * @param {string} [updateData.role] - Shift role
 * @param {string[]} [updateData.typeOfShift] - Array of shift types
 * @param {string} [updateData.user] - User ID
 * @param {string} [updateData.startTime] - Start time of the shift
 * @param {string} [updateData.finishTime] - Finish time of the shift
 * @param {number} [updateData.numOfShiftsPerDay] - Number of shifts per day
 * @param {Object} [updateData.location] - Location object
 * @param {string} [updateData.location.name] - Location name
 * @param {string} [updateData.location.address] - Location address
 * @param {string} [updateData.location.postcode] - Location postcode
 * @param {Object} [updateData.location.cordinates] - Location coordinates
 * @param {Date} [updateData.date] - Date of the shift
 * @returns {Promise<Object>} Updated shift with populated user and location data
 * @throws {AppError} If shift not found, user not authorized, or validation fails
 */
const updateShift = async (shiftId, updateData) => {
  const existingShift = await ShiftModel.findById(shiftId).populate("user");
  if (!existingShift) {
    throw new AppError({
      message: "Shift not found",
      statusCode: 404,
      errorCode: "SHIFT_NOT_FOUND",
    });
  }

  if (existingShift.status !== SHIFT_STATUS.SCHEDULED) {
    throw new AppError({
      message: `Cannot update shift as it is ${existingShift.status}`,
      statusCode: 400,
      errorCode: "INVALID_SHIFT_STATUS",
    });
  }

  if (updateData.user) {
    const newUserExists = await UserModel.findById(updateData.user);
    if (!newUserExists) {
      throw new AppError({
        message: "User not found",
        statusCode: 404,
        errorCode: "USER_NOT_FOUND",
      });
    }
  }

  if (updateData.location) {
    updateData.location = await createOrUpdateLocation(updateData.location);
  }

  if (updateData.startTime || updateData.finishTime || updateData.date) {
    const shiftDate = updateData.date || existingShift.date;
    const startTime =
      updateData.startTime || formatTimeString(existingShift.startTime);
    const finishTime =
      updateData.finishTime || formatTimeString(existingShift.finishTime);

    const { startDateTime, finishDateTime } = createShiftDateTimes(
      shiftDate,
      startTime,
      finishTime,
    );

    updateData.startTime = startDateTime;
    updateData.finishTime = finishDateTime;
  }

  const updatedShift = await ShiftModel.findByIdAndUpdate(shiftId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedShift) {
    throw new AppError({
      message: "Failed to update shift",
      statusCode: 500,
      errorCode: "SHIFT_UPDATE_FAILED",
    });
  }

  const shift = await ShiftModel.findById(updatedShift._id)
    .populate("user", "name email role")
    .populate(
      "location",
      "name postCode distance constituency adminDistrict cordinates address",
    )
    .exec();

  if (!shift) {
    throw new AppError({
      message: "Failed to retrieve updated shift",
      statusCode: 500,
      errorCode: "SHIFT_RETRIEVAL_FAILED",
    });
  }

  return {
    shift: formatShiftForResponse(shift),
  };
};

/**
 * Delete an existing shift
 * @param {string} shiftId - ID of the shift to delete
 * @returns {Promise<Object>} Success message
 * @throws {AppError} If shift not found
 */
const deleteShift = async (shiftId) => {
  const existingShift = await ShiftModel.findById(shiftId);
  if (!existingShift) {
    throw new AppError({
      message: "Shift not found",
      statusCode: 404,
      errorCode: "SHIFT_NOT_FOUND",
    });
  }

  await ShiftModel.findByIdAndDelete(shiftId);
};

/**
 * Batch create/update shifts
 * @param {Array<Object>} shiftsData - Array of shift objects
 * @param {string} [shiftsData[].id] - Shift ID for update (if present, update; if not, create)
 * @param {string} shiftsData[].title - Shift title
 * @param {string} shiftsData[].role - Shift role
 * @param {string[]} [shiftsData[].typeOfShift] - Array of shift types
 * @param {string} shiftsData[].user - User ID
 * @param {string} shiftsData[].startTime - Start time of the shift
 * @param {string} shiftsData[].finishTime - Finish time of the shift
 * @param {number} [shiftsData[].numOfShiftsPerDay] - Number of shifts per day
 * @param {Object} shiftsData[].location - Location object
 * @param {string} shiftsData[].location.name - Location name
 * @param {string} shiftsData[].location.address - Location address
 * @param {string} shiftsData[].location.postcode - Location postcode
 * @param {Object} shiftsData[].location.cordinates - Location coordinates
 * @param {Date} shiftsData[].date - Date of the shift
 * @returns {Promise<Object>} Results with created and updated shifts
 * @throws {AppError} If validation fails
 */
const batchCreateUpdateShifts = async (shiftsData) => {
  const results = {
    created: [],
    updated: [],
    errors: [],
  };

  for (let i = 0; i < shiftsData.length; i++) {
    const shiftData = shiftsData[i];

    try {
      if (shiftData.id) {
        const { id, ...updateData } = shiftData;
        const result = await updateShift(id, updateData);
        results.updated.push(result.shift);
      } else {
        const result = await createShift(shiftData);
        results.created.push(result.shift);
      }
    } catch (error) {
      results.errors.push({
        index: i,
        shift: shiftData,
        error: {
          message: error.message,
          errorCode: error.errorCode || "UNKNOWN_ERROR",
        },
      });
    }
  }

  return results;
};

/**
 * Cancel an existing shift
 * @param {string} shiftId - ID of the shift to cancel
 * @returns {Promise<Object>} Success message
 * @throws {AppError} If shift not found or already cancelled/completed
 */
const cancelShift = async (shiftId) => {
  const existingShift = await ShiftModel.findById(shiftId);
  if (!existingShift) {
    throw new AppError({
      message: "Shift not found",
      statusCode: 404,
      errorCode: "SHIFT_NOT_FOUND",
    });
  }

  if (existingShift.status === SHIFT_STATUS.CANCELLED) {
    throw new AppError({
      message: "Shift is already cancelled",
      statusCode: 400,
      errorCode: "SHIFT_ALREADY_CANCELLED",
    });
  }

  if (existingShift.status === SHIFT_STATUS.COMPLETED) {
    throw new AppError({
      message: "Cannot cancel a completed shift",
      statusCode: 400,
      errorCode: "SHIFT_ALREADY_COMPLETED",
    });
  }

  await ShiftModel.findByIdAndUpdate(shiftId, {
    status: SHIFT_STATUS.CANCELLED,
  });
};

/**
 * Clock in a worker for a shift
 * @param {string} shiftId - ID of the shift
 * @param {string} userId - ID of the worker
 * @returns {Promise<Object>} Updated shift with clock in time
 * @throws {AppError} If shift not found, worker not authorized, or time constraints violated
 */
const clockInShift = async (shiftId, userId) => {
  const shift = await ShiftModel.findById(shiftId);
  if (!shift) {
    throw new AppError({
      message: "Shift not found",
      statusCode: 404,
      errorCode: "SHIFT_NOT_FOUND",
    });
  }

  if (shift.user.toString() !== userId) {
    throw new AppError({
      message: "You are not assigned to this shift",
      statusCode: 403,
      errorCode: "UNAUTHORIZED_SHIFT_ACCESS",
    });
  }

  if (shift.status !== SHIFT_STATUS.SCHEDULED) {
    throw new AppError({
      message: "Can only clock in to scheduled shifts",
      statusCode: 400,
      errorCode: "INVALID_SHIFT_STATUS",
    });
  }

  const clockInValidation = validateClockInTime(
    shift.startTime,
    shift.finishTime,
    SHIFT_CONSTRAINTS.EARLY_CLOCK_IN_BUFFER,
  );

  if (!clockInValidation.isValid) {
    throw new AppError({
      message: clockInValidation.message,
      statusCode: 400,
      errorCode: clockInValidation.message.includes("too early")
        ? "CLOCK_IN_TOO_EARLY"
        : "SHIFT_TIME_EXPIRED",
    });
  }

  const clockInTime = getCurrentDateTime();

  const updatedShift = await ShiftModel.findByIdAndUpdate(
    shiftId,
    {
      status: SHIFT_STATUS.IN_PROGRESS,
      clockInTime,
    },
    { new: true },
  )
    .populate("user", "name email role")
    .populate("location");

  return {
    message: "Successfully clocked in",
    shift: {
      id: updatedShift._id,
      status: updatedShift.status,
      clockInTime: formatTimeString(updatedShift.clockInTime),
    },
  };
};

/**
 * Clock out a worker from a shift
 * @param {string} shiftId - ID of the shift
 * @param {string} userId - ID of the worker
 * @returns {Promise<Object>} Updated shift with clock out time
 * @throws {AppError} If shift not found, worker not authorized, or time constraints violated
 */
const clockOutShift = async (shiftId, userId) => {
  const shift = await ShiftModel.findById(shiftId);
  if (!shift) {
    throw new AppError({
      message: "Shift not found",
      statusCode: 404,
      errorCode: "SHIFT_NOT_FOUND",
    });
  }

  if (shift.user.toString() !== userId) {
    throw new AppError({
      message: "You are not assigned to this shift",
      statusCode: 403,
      errorCode: "UNAUTHORIZED_SHIFT_ACCESS",
    });
  }

  if (shift.status !== SHIFT_STATUS.IN_PROGRESS) {
    throw new AppError({
      message: "Can only clock out from shifts in progress",
      statusCode: 400,
      errorCode: "INVALID_SHIFT_STATUS",
    });
  }

  const clockOutValidation = validateClockOutTime(
    shift.finishTime,
    SHIFT_CONSTRAINTS.MINIMUM_CLOCK_OUT_BUFFER,
  );

  if (!clockOutValidation.isValid) {
    throw new AppError({
      message: clockOutValidation.message,
      statusCode: 400,
      errorCode: "CLOCK_OUT_TOO_EARLY",
    });
  }

  const clockOutTime = getCurrentDateTime();

  const updatedShift = await ShiftModel.findByIdAndUpdate(
    shiftId,
    {
      status: SHIFT_STATUS.COMPLETED,
      clockOutTime: clockOutTime,
    },
    { new: true },
  )
    .populate("user", "name email role")
    .populate("location");

  return {
    message: "Successfully clocked out",
    shift: {
      id: updatedShift._id,
      status: updatedShift.status,
      clockOutTime: formatTimeString(updatedShift.clockOutTime),
    },
  };
};

/**
 * Get all shifts with pagination (admin only)
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=10] - Number of shifts per page
 * @param {string} [options.status] - Filter by shift status
 * @param {string} [options.sortBy='date'] - Sort field
 * @param {string} [options.sortOrder='desc'] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated shifts with metadata
 */
const getAllShifts = async (options = {}) => {
  return getShiftsWithPagination({}, options);
};

/**
 * Get shifts for a specific user with pagination
 * @param {string} userId - ID of the user
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=10] - Number of shifts per page
 * @param {string} [options.status] - Filter by shift status
 * @param {string} [options.sortBy='date'] - Sort field
 * @param {string} [options.sortOrder='desc'] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated user shifts with metadata
 */
const getUserShifts = async (userId, options = {}) => {
  return getShiftsWithPagination({ user: userId }, options);
};

/**
 * Get shift by ID
 * @param {string} shiftId - ID of the shift
 * @returns {Promise<Object>} Shift object
 * @throws {AppError} If shift not found
 */
const getShift = async (shiftId) => {
  const shift = await ShiftModel.findById(shiftId)
    .populate("user", "name email role")
    .populate(
      "location",
      "name postCode distance constituency adminDistrict cordinates address",
    )
    .exec();
  if (!shift) {
    throw new AppError({
      message: "Shift not found",
      statusCode: 404,
      errorCode: "SHIFT_NOT_FOUND",
    });
  }

  return {
    shift: formatShiftForResponse(shift),
  };
};

export {
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
};
