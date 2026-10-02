const mongoose = require('mongoose')
const connectDBs = require('../config/db')

let Demand = null
let modelInitialized = false

const initializeDemandModel = async () => {
  if (modelInitialized) return Demand

  const { demandsDB } = await connectDBs()

  const demandSchema = new mongoose.Schema(
    {
      user: {
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
      location: {
        type: {
          type: String,
          enum: ['Point'],
          required: true,
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true,
          validate: {
            validator: function (coords) {
              return coords.length === 2 // Ensure exactly 2 values
            },
            message:
              'Coordinates must be an array of two numbers [longitude, latitude].',
          },
        },
      },
      category: {
        type: String,
        required: true,
        enum: [
          "infrastructure",
          "public_service",
          "transportation",
          "utilities",
          "education",
          "healthcare",
          "other",
        ], // Extend as needed
      },
      status: {
        type: String,
        enum: ['fulfilled', 'not_fulfilled'],
        default: 'not_fulfilled',
      },
      up_votes: {
        type: Number,
        default: 1,
        min: 0,
      },
      upvotedBy: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        }
      ],
      comments: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          text: {
            type: String,
            required: true,
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
        }
      ],
    },
    { timestamps: true }
  )

  // ✅ Ensure geospatial indexing
  demandSchema.index({ location: '2dsphere' })

  Demand = demandsDB.model('Demand', demandSchema)
  modelInitialized = true
  return Demand
}

// ✅ Initialize immediately
initializeDemandModel().catch((err) =>
  console.error('Failed to initialize Demand model:', err)
)

// ✅ Export function to get Demand model
const getDemandModel = async () => {
  if (!Demand) {
    await initializeDemandModel()
  }
  return Demand
}

module.exports = getDemandModel
