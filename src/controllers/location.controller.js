import { getLocations } from "../services/location/index.js";

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('express').NextFunction} NextFunction */

/**
 * Controller to get all locations
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const getLocationsController = async (req, res, next) => {
  try {
    res.status(200).json(await getLocations());
  } catch (error) {
    next(error);
  }
};

export { getLocationsController };
