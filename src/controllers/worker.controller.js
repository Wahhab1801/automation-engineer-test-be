import { getWorkers } from "../services/worker/index.js";

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */
/** @typedef {import('express').NextFunction} NextFunction */

/**
 * Controller to get all workers
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const getWorkersController = async (req, res, next) => {
  try {
    res.status(200).json(await getWorkers());
  } catch (error) {
    next(error);
  }
};

export { getWorkersController };
