// @ts-check
import { ZodError } from "zod";
import { ValidationError } from "./validation.error.js";

/**
 * * Validates data against a Zod schema and returns parsed data.
 * @throws {ValidationError} If validation fails, throws a ValidationError with details.
 */
export const zodSchemaValidator = (schema, data) => {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ValidationError({ issues: err.issues });
    }
    throw err;
  }
};
