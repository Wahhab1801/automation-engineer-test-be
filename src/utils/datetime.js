import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

/**
 * Create a datetime object from date and time string
 * @param {Date|string} date - The base date
 * @param {string} timeString - Time in HH:MM format
 * @returns {dayjs.Dayjs} Day.js datetime object
 */
export const createDateTime = (date, timeString) => {
  const baseDate = dayjs(date).startOf("day");
  const [hours, minutes] = timeString.split(":").map(Number);
  return baseDate.hour(hours).minute(minutes).second(0).millisecond(0);
};

/**
 * Create start and end datetime objects
 * @param {Date|string} shiftDate - The shift date
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} finishTime - Finish time in HH:MM format
 * @returns {Object} Object with startDateTime and finishDateTime
 */
export const createShiftDateTimes = (shiftDate, startTime, finishTime) => {
  const startDateTime = createDateTime(shiftDate, startTime);
  let finishDateTime = createDateTime(shiftDate, finishTime);

  // If finish time is before start time, it's a night shift ending the next day
  if (
    finishDateTime.isBefore(startDateTime) ||
    finishDateTime.isSame(startDateTime)
  ) {
    finishDateTime = finishDateTime.add(1, "day");
  }

  return {
    startDateTime: startDateTime.toDate(),
    finishDateTime: finishDateTime.toDate(),
  };
};

/**
 * Check if current time is within allowed clock-in window
 * @param {Date|string} startDateTime - Shift start datetime
 * @param {Date|string} finishDateTime - Shift finish datetime
 * @param {number} earlyClockInMinutes - Minutes before shift start allowed for clock-in
 * @returns {Object} Validation result with isValid boolean and message
 */
export const validateClockInTime = (
  startDateTime,
  finishDateTime,
  earlyClockInMinutes = 10,
) => {
  const now = dayjs();
  const shiftStart = dayjs(startDateTime);
  const shiftEnd = dayjs(finishDateTime);
  const earliestClockIn = shiftStart.subtract(earlyClockInMinutes, "minute");

  if (now.isBefore(earliestClockIn)) {
    return {
      isValid: false,
      message: `Cannot clock in more than ${earlyClockInMinutes} minutes before shift starts`,
    };
  }

  if (now.isAfter(shiftEnd)) {
    return {
      isValid: false,
      message: "Cannot clock in after shift end time",
    };
  }

  return {
    isValid: true,
    message: "Clock-in time is valid",
  };
};

/**
 * Check if current time is within allowed clock-out window
 * @param {Date|string} finishDateTime - Shift finish datetime
 * @param {number} minimumClockOutBufferMinutes - Minimum minutes before shift end for clock-out
 * @returns {Object} Validation result with isValid boolean and message
 */
export const validateClockOutTime = (
  finishDateTime,
  minimumClockOutBufferMinutes = 120,
) => {
  const now = dayjs();
  const shiftEnd = dayjs(finishDateTime);
  const earliestClockOut = shiftEnd.subtract(
    minimumClockOutBufferMinutes,
    "minute",
  );

  if (now.isBefore(earliestClockOut)) {
    return {
      isValid: false,
      message: `Cannot clock out more than ${minimumClockOutBufferMinutes} minutes before shift ends`,
    };
  }

  return {
    isValid: true,
    message: "Clock-out time is valid",
  };
};

/**
 * Format datetime to time string in HH:MM format
 * @param {Date|string} datetime - The datetime to format
 * @returns {string} Time in HH:MM format
 */
export const formatTimeString = (datetime) => {
  if (!datetime) {
    return "";
  }
  return dayjs(datetime).format("HH:mm");
};

/**
 * Check if a date is in the past (before today)
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if date is in the past
 */
export const isDateInPast = (date) => {
  const inputDate = dayjs(date).startOf("day");
  const today = dayjs().startOf("day");
  return inputDate.isBefore(today);
};

/**
 * Validate time string format
 * @param {string} timeString - Time string to validate
 * @returns {boolean} True if time string is in valid HH:MM format
 */
export const isValidTimeString = (timeString) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

/**
 * Get current datetime
 * @returns {Date} Current datetime as Date object
 */
export const getCurrentDateTime = () => {
  return dayjs().toDate();
};

/**
 * Add time to a datetime
 * @param {Date|string} datetime - Base datetime
 * @param {number} amount - Amount to add
 * @param {string} unit - Unit (minute, hour, day, etc.)
 * @returns {Date} New datetime with added time
 */
export const addTime = (datetime, amount, unit) => {
  return dayjs(datetime).add(amount, unit).toDate();
};

/**
 * Subtract time from a datetime
 * @param {Date|string} datetime - Base datetime
 * @param {number} amount - Amount to subtract
 * @param {string} unit - Unit (minute, hour, day, etc.)
 * @returns {Date} New datetime with subtracted time
 */
export const subtractTime = (datetime, amount, unit) => {
  return dayjs(datetime).subtract(amount, unit).toDate();
};

/**
 * Check if one datetime is before another
 * @param {Date|string} datetime1 - First datetime
 * @param {Date|string} datetime2 - Second datetime
 * @returns {boolean} True if datetime1 is before datetime2
 */
export const isBefore = (datetime1, datetime2) => {
  return dayjs(datetime1).isBefore(dayjs(datetime2));
};

/**
 * Check if one datetime is after another
 * @param {Date|string} datetime1 - First datetime
 * @param {Date|string} datetime2 - Second datetime
 * @returns {boolean} True if datetime1 is after datetime2
 */
export const isAfter = (datetime1, datetime2) => {
  return dayjs(datetime1).isAfter(dayjs(datetime2));
};
