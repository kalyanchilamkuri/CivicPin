const mongoose = require('mongoose')
const connectDBs = require('../config/db') // Import the DB connections

let User // Declare User model globally

const initializeUserModel = async () => {
  const { usersDB } = await connectDBs() // Connect to the Users DB

  const userSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, unique: true, required: true },
      // Local-auth users have a hashed password; Google-auth users don't.
      password: {
        type: String,
        required: function () {
          return this.authProvider === 'local'
        },
      },
      authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
      googleId: { type: String, unique: true, sparse: true },
      phone: { type: String, required: false },
      address: { type: String, required: false },
      // age: { type: Number, required: true },
      role: { type: Number, default: 0 }, // 0 -> Normal user, 1 -> Admin
      gender: { type: String, required: false },
      // bio: { type: String, required: false },
      profile_image: { type: String },

      properties_created: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Property',
          default: [],
        },
      ],

      demands_raised: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Demand',
          default: [],
        },
      ],
    },
    { timestamps: true }
  )

  // Bind to usersDB and assign to the global variable
  User = usersDB.model('User', userSchema)
}

initializeUserModel()

module.exports = async () => {
  if (!User) {
    await initializeUserModel()
  }
  return User
}
