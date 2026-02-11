import LocationModel from "../../models/location.model.js";

/**
 * Get list of all locations
 * @returns {Promise<{id: string, name: string, email: string, role: string}[]>} User info
 */
const getLocations = async () => {
  return LocationModel.find();
};

/**
 * Create or update an existing location
 * @param {Object} locationData - Location data object
 * @param {string} locationData.name - Location name
 * @param {string} locationData.address - Location address
 * @param {string} locationData.postCode - Location postcode
 * @param {Object} locationData.cordinates - Location coordinates
 * @param {number} locationData.cordinates.longitude - Longitude
 * @param {number} locationData.cordinates.latitude - Latitude
 * @returns {Promise<Object>} Location document
 */
const createOrUpdateLocation = async (locationData) => {
  let location = await LocationModel.findOne({ name: locationData.name });
  //hello this is a test comment
  if (!location) {
    location = new LocationModel(locationData);
    await location.save();
  } else {
    await LocationModel.findByIdAndUpdate(location._id, locationData, {
      new: true,
      runValidators: true,
    });
  }

  return location._id;
};

export { getLocations, createOrUpdateLocation };
