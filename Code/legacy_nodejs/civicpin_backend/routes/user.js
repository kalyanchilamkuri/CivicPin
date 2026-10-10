const express = require("express");
const jwt = require("jsonwebtoken");
const getUserModel = require("../models/User"); // Import the function

const router = express.Router();

// ✅ Middleware to verify token from cookies
const verifyToken = (req, res, next) => {
  const token = req.cookies.civicpin_token; // Get token from cookies

  if (!token) {
    return res.status(401).json({ error: "Access Denied. No token provided." });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.decodedData = verified;

    console.log("✅ Valid Token:", verified);
    next();
  } catch (err) {
    console.log("❌ Invalid Token:", err.message);
    res.status(400).json({ error: "Invalid Token" });
  }
};

// ✅ Get User Profile (Protected Route)
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const User = await getUserModel();

    console.log("🔹 Decoded JWT Data:", JSON.stringify(req.decodedData, null, 2));

    const user = await User.findById(req.decodedData.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("🔹 User Data:", JSON.stringify(user, null, 2));

    res.status(200).json(user);
  } catch (err) {
    console.error("❌ Server Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;