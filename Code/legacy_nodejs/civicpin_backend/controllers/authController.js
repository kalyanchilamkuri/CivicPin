const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const getUserModel = require('../models/User')
const path = require('path')
const fs = require('fs')
const colors = require('colors')
const { Resend } = require('resend')
const { OAuth2Client } = require('google-auth-library')

// Use a strong environment-specific secret with fallback for development only
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error(
    'WARNING: JWT_SECRET environment variable not set. Using insecure default for development only.'
  )
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null

// Transactional email (OTP delivery). One server-side account, configured once
// by whoever runs this backend — never something an individual signing-up user provides.
const RESEND_API_KEY = process.env.RESEND_API_KEY
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null
// Until you verify your own domain with Resend, sending must use their shared
// sandbox address — see https://resend.com/docs/dashboard/domains/introduction
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'CivicPin <onboarding@resend.dev>'

const saveProfilePhoto = (userId, file) => {
  if (!file) {
    console.log('No file provided for upload')
    return ''
  }

  try {
    // Use an absolute path relative to project root
    const uploadDir = path.join(process.cwd(), 'uploads')
    console.log(`Creating upload directory: ${uploadDir}`)

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
      console.log(`Created directory: ${uploadDir}`)
    }

    // Rest of your function remains the same
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.avif']
    const ext = path.extname(file.originalname).toLowerCase()

    if (!allowedExtensions.includes(ext)) {
      throw new Error('Invalid file type. Only JPG, PNG and GIF are allowed.')
    }

    const filename = `${userId}${ext}`
    const filePath = path.join(uploadDir, filename)

    console.log(`Saving file to: ${filePath}`)
    fs.writeFileSync(filePath, file.buffer)

    console.log(`Profile photo saved: ${filePath}`)

    return `/uploads/${filename}`
  } catch (error) {
    console.error(`Error saving profile photo: ${error}`)
    return '' // Return empty string but don't throw, to continue registration
  }
}

// Generate a stronger 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000) // Generates a 6-digit number (100000-999999)
}

// Use a more persistent storage solution in production
// This is a simple in-memory store for demonstration
let otpStore = {}

// Transactional OTP email content
const otpEmailHtml = (otp) => `
<div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="480" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12); overflow: hidden; margin: 0 auto;">
          <tr>
            <td style="background: linear-gradient(90deg, #3a7bd5 0%, #00d2ff 100%); padding: 30px 0; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; letter-spacing: 1px; font-weight: 600;">CivicPin</h1>
              <p style="color: rgba(255, 255, 255, 0.95); font-size: 13px; margin: 6px 0 0;">Email verification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 50px 30px;">
              <p style="font-size: 16px; color: #444444; margin-top: 0;">Hello,</p>
              <p style="font-size: 16px; color: #555555;">Use the code below to verify your email address:</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; background: #f8f9fa; border-radius: 10px; font-size: 36px; font-weight: 700; letter-spacing: 8px; padding: 15px 30px; color: #333; font-family: 'Courier New', monospace;">
                  ${otp}
                </span>
              </div>
              <p style="font-size: 14px; color: #555555; text-align: center;">This code expires in <strong>5 minutes</strong>.</p>
              <p style="font-size: 14px; color: #888888;">If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f5f7fa; padding: 20px 50px; text-align: center; border-top: 1px solid #eaeaea;">
              <p style="font-size: 12px; color: #888888; margin: 0;">© ${new Date().getFullYear()} CivicPin. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
`

const otpEmailText = (otp) => `
CIVICPIN EMAIL VERIFICATION

Use this code to verify your email: ${otp}

This code expires in 5 minutes.

If you didn't request this code, you can safely ignore this email.
`

//> Send OTP function
const sendOtp = async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  const otp = generateOtp()
  otpStore[email] = { otp, expires: Date.now() + 300000 } // Expires in 5 min

  // Only log in development environment
  if (process.env.NODE_ENV === 'development') {
    console.log(`OTP for ${email}: ${otp}`) // For debugging only
  }

  // Dev-only bypass when the email service isn't configured — never in production
  if (!resend) {
    if (process.env.NODE_ENV === 'production') {
      delete otpStore[email]
      return res
        .status(500)
        .json({ error: 'Email service is not configured. Please try again later.' })
    }
    otpStore[email].otp = 123456 // Hardcode to 123456 for easy testing
    console.warn('⚠️ RESEND_API_KEY not configured. Bypassing email sending. OTP is set to: 123456')
    return res.json({ message: 'OTP sent successfully (mocked for development. Use 123456)' })
  }

  try {
    const { error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: email,
      subject: '🔑 Your CivicPin Verification Code',
      html: otpEmailHtml(otp),
      text: otpEmailText(otp),
    })

    if (error) {
      throw new Error(error.message || 'Failed to send email')
    }

    res.json({ message: 'OTP sent successfully' })
  } catch (error) {
    delete otpStore[email]
    console.error('OTP sending error:', error.message)
    res
      .status(500)
      .json({ error: 'Failed to send OTP. Please try again later.' })
  }
}

//> Verify OTP function
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' })
  }

  const storedOtpData = otpStore[email]

  if (!storedOtpData) {
    return res
      .status(400)
      .json({ error: 'No OTP was requested for this email' })
  }

  if (Date.now() > storedOtpData.expires) {
    delete otpStore[email] // Clean up expired OTP
    return res
      .status(400)
      .json({ error: 'OTP has expired. Please request a new one.' })
  }

  if (parseInt(otp) !== storedOtpData.otp) {
    return res.status(400).json({ error: 'Invalid OTP' })
  }

  // OTP is valid - mark this email as verified so signup can proceed
  storedOtpData.verified = true
  return res.json({ verified: true, message: 'Email verified successfully' })
}

//> Signup Controller
const signupUser = async (req, res) => {
  const User = await getUserModel()

  const { name, email, password, phone, address, gender } = req.body
  const profilePhoto = req.file // Uploaded file

  try {
    // Input validation
    if (!name || !email || !password) {
      console.log('Missing required fields'.red)
      return res
        .status(400)
        .json({ error: 'Name, email and password are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log('Invalid email format'.red)
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Validate password strength
    if (password.length < 6) {
      console.log('Weak password'.red)
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters long' })
    }

    // Require a verified OTP for this email before allowing signup
    const otpRecord = otpStore[email]
    if (!otpRecord || !otpRecord.verified) {
      return res
        .status(400)
        .json({ error: 'Please verify your email with the OTP before signing up' })
    }

    // Check if user already exists
    let user = await User.findOne({ email })
    if (user) {
      console.log('User already exists'.red)
      return res.status(400).json({ error: 'User already exists' })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Step 1: Create User First (Without Profile Photo)
    user = new User({
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      address: address || '',
      gender: gender || '',
      profile_image: '', // Initially empty
    })

    await user.save() // Save user to generate `_id`
    delete otpStore[email] // OTP has served its purpose

    // Step 2: Now Save Profile Photo with `_id`
    let profileImagePath = ''
    if (profilePhoto) {
      try {
        profileImagePath = saveProfilePhoto(user._id, profilePhoto)
        user.profile_image = profileImagePath
        await user.save() // Update user with image path
      } catch (photoError) {
        console.error('Profile photo error:', photoError.message)
        // Continue registration even if photo upload fails
      }
    }

    // Return response (exclude password from response)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        gender: user.gender,
        profile_image: profileImagePath,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    console.error('Signup error:', err.message)
    res
      .status(500)
      .json({ error: 'Server error during registration. Please try again.' })
  }
}

// Issue the auth cookie for a user (shared by password login and Google login)
const issueAuthCookie = (res, user) => {
  const payload = {
    user: {
      id: user.id,
      role: user.role,
    },
  }

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '10h' })

  res.cookie('civicpin_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    partitioned: true,
    maxAge: 10 * 60 * 60 * 1000,
  })
}

const userResponse = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  gender: user.gender,
  profile_image: user.profile_image,
  role: user.role,
  createdAt: user.createdAt,
})

// > Login Controller
const loginUser = async (req, res) => {
  const User = await getUserModel()
  const { email, password } = req.body

  try {
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Check if user exists
    let user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    if (user.authProvider === 'google') {
      return res.status(400).json({
        error: 'This account uses Google Sign-In. Please continue with Google.',
      })
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    // Make sure JWT_SECRET is defined before signing
    if (!JWT_SECRET) {
      return res
        .status(500)
        .json({ error: 'Authentication service misconfigured' })
    }

    issueAuthCookie(res, user)

    res.status(200).json({
      message: 'Login successful',
      success: true,
      user: userResponse(user),
    })
  } catch (err) {
    console.error('Login error:', err.message)
    res
      .status(500)
      .json({ error: 'Server error during login. Please try again.' })
  }
}

//> Google Sign-In controller
// Accepts the Google ID token (credential) issued by Google Identity Services
// on the frontend, verifies it server-side, and logs the user in — creating
// an account automatically on first sign-in.
const googleLogin = async (req, res) => {
  const { credential } = req.body

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' })
  }

  if (!googleClient) {
    return res
      .status(500)
      .json({ error: 'Google Sign-In is not configured on the server' })
  }

  if (!JWT_SECRET) {
    return res
      .status(500)
      .json({ error: 'Authentication service misconfigured' })
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()

    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Invalid Google credential' })
    }

    if (payload.email_verified === false) {
      return res.status(401).json({ error: 'Google email is not verified' })
    }

    const User = await getUserModel()

    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: payload.email }],
    })

    if (!user) {
      user = new User({
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        authProvider: 'google',
        googleId: payload.sub,
        profile_image: payload.picture || '',
      })
      await user.save()
    } else if (!user.googleId) {
      // Existing local account signing in with Google for the first time: link it.
      user.googleId = payload.sub
      await user.save()
    }

    issueAuthCookie(res, user)

    res.status(200).json({
      message: 'Login successful',
      success: true,
      user: userResponse(user),
    })
  } catch (err) {
    console.error('Google login error:', err.message)
    res.status(401).json({ error: 'Google authentication failed' })
  }
}

//> Logout controller
const logoutUser = (req, res) => {
  res.clearCookie('civicpin_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    partitioned: true,
  })

  res.status(200).json({ success: true, message: 'Logged out successfully' })
}

module.exports = {
  signupUser,
  loginUser,
  logoutUser,
  sendOtp,
  verifyOtp,
  googleLogin,
}
