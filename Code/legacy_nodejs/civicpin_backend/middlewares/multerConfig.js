const multer = require('multer')
const path = require('path')

// Set up storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Save files in 'uploads' folder
  },
  filename: function (req, file, cb) {
    // Rename file as userID + original extension
    const ext = path.extname(file.originalname)
    cb(null, `${req.body.email || Date.now()}${ext}`)
  },
})

const upload = multer({ storage })

module.exports = upload
