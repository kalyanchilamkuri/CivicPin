const mongoose = require('mongoose');
const connectDBs = require('../config/db');
let Property = null;
let modelInitialized = false;

const initializePropertyModel = async () => {
  if (modelInitialized) return Property;
 
  const { propertiesDB } = await connectDBs();
  const propertySchema = new mongoose.Schema(
    {
      owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      title: {
        type: String,
        required: true,
        trim: true,
      },
      description: {
        type: String,
        required: true,
        trim: true,
      },
      category: {
        type: String,
        enum: ['residential', 'commercial', 'industrial', 'land'],
        required: true,
      },
      type: {
        type: String,
        enum: ['sell', 'rent', 'lease'],
        required: true,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
      area: {
        type: Number, // in square feet
        required: true,
        min: 1,
      },
      contactNumber: {
        type: String,
        required: true,
        validate: {
          validator: function (num) {
            return /^\d{10}$/.test(num) // Validate a 10-digit phone number
          },
          message: 'Invalid contact number. It must be 10 digits.',
        },
      },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true,
          validate: {
            validator: function (coords) {
              return coords.length === 2
            },
            message:
              'Coordinates must be an array of two numbers [longitude, latitude].',
          },
        },
      },
      status: {
        type: String,
        enum: ['rented', 'sold', 'up_for_renting', 'available'],
        required: true,
      },
    },
    { timestamps: true }
  );
  
  // Bind to propertiesDB and assign to the global variable
  Property = propertiesDB.model('Property', propertySchema);
  modelInitialized = true;
  return Property;
};

// Initialize immediately
initializePropertyModel().catch(err => console.error('Failed to initialize Property model:', err));

// Export an async function that ensures the model is available
const getPropertyModel = async () => {
  if (!Property) {
    await initializePropertyModel();
  }
  return Property;
};

module.exports = getPropertyModel;