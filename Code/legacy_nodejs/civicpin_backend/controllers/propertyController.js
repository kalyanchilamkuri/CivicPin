const getPropertyModel = require('../models/propertyModel.js');

// **Create a new property**
exports.property = async (req, res) => {
  try {
    const Property = await getPropertyModel();
    
    const {
      title,
      description,
      category,
      type,
      price,
      area,
      contactNumber,
      location,
      status,
    } = req.body;
    
    // Ensure location is correctly formatted
    if (!location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return res.status(400).json({ error: 'Invalid location. Provide [longitude, latitude].' });
    }
    
    const newProperty = new Property({
      owner: req.user.id,
      title,
      description,
      category,
      type,
      price,
      area,
      contactNumber,
      location: {
        type: 'Point',
        coordinates: location.coordinates, // Expecting [longitude, latitude]
      },
      status,
    });
    
    await newProperty.save();
    res.status(201).json({ message: 'Property created successfully!', property: newProperty });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// **Get all properties**
exports.getProperty = async (req, res) => {
  try {
    const Property = await getPropertyModel();
    const properties = await Property.find();
    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// **Get property by ID**
exports.getPropertyById = async (req, res) => {
  try {
    const Property = await getPropertyModel();
    const { id } = req.params;
    const property = await Property.findById(id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    res.status(200).json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};