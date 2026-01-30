export const SHIFT_CONSTRAINTS = Object.freeze({
  // Worker can clock in no earlier than 10 minutes before shift starts
  EARLY_CLOCK_IN_BUFFER: 10,

  // Worker must clock out at least 2 hours before shift ends
  MINIMUM_CLOCK_OUT_BUFFER: 120,
});

export const SHIFT_STATUS = Object.freeze({
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
});

export const SHIFT_TYPES = Object.freeze({
  WEEKEND: "Weekend",
  WEEKDAY: "Weekday",
  EVENING: "Evening",
  MORNING: "Morning",
  NIGHT: "Night",
});
