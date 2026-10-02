const mongoose = require('mongoose')

// Suppress strictQuery warnings
mongoose.set('strictQuery', true)

const connectDBs = async () => {
  try {
    const usersDB = await mongoose.createConnection(process.env.USERS_DB_URI)
    const propertiesDB = await mongoose.createConnection(
      process.env.PROPERTIES_DB_URI
    )
    const demandsDB = await mongoose.createConnection(
      process.env.DEMANDS_DB_URI
    )
    const ratingDB = await mongoose.connect(process.env.RATING_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log('✅ All Databases Connected...'.green)
    return { usersDB, propertiesDB, demandsDB, ratingDB }
  } catch (err) {
    console.error('❌ DB Connection Error:', err.message)
    process.exit(1)
  }
}

module.exports = connectDBs
