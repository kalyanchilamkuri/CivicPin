const express = require('express')
const { property, getProperty, getPropertyById } = require('../controllers/propertyController')
const authMiddleware = require('../middlewares/authMiddleware')
const router = express.Router()

router.post('/property', authMiddleware, property)
router.get('/getProperty', getProperty)
router.get('/getPropertyById/:id', getPropertyById) 

module.exports = router
