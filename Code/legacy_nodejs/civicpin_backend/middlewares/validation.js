const { body, validationResult } = require('express-validator')

const validateSignup = [
  body('name').not().isEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone').optional({ checkFalsy: true }),
  body('address').optional({ checkFalsy: true }),
  body('gender')
    .optional({ checkFalsy: true })
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  // body('bio').not().isEmpty().withMessage('Bio is required'),
  (req, res, next) => {
    const errors = validationResult(req)
    console.log(errors)
    if (!errors.isEmpty()) {
      console.log(JSON.stringify(errors, null, 2))
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
]

const validateLogin = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').not().isEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
]

module.exports = { validateSignup, validateLogin }
