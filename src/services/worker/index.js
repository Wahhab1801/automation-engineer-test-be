import UserModel from "../../models/user.model.js";

/**
 * Get list of all workers
 * @returns {Promise<{id: string, name: string, email: string, role: string}[]>} User info
 */
const getWorkers = async () => {
  const workers = await UserModel.find({ role: "worker" });

  return workers.map((worker) => ({
    id: worker._id,
    name: worker.name,
    email: worker.email,
    role: worker.role,
  }));
};

export { getWorkers };
