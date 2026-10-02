const express = require("express");
const {
  demand,
  getDemand,
  getDemandById,
  getNearbyDemands,
  toggleUpvote,
  addComment,
} = require("../controllers/demandController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/demand", authMiddleware, demand);
router.get("/getDemand", getDemand);
router.get("/getDemandById/:id", getDemandById);
router.patch('/:id/upvote', authMiddleware, toggleUpvote);
router.post('/:id/comments', authMiddleware, addComment);

/**
 * GET /api/demands/nearby
 * Retrieve nearby demands based on user location
 * Query Params: latitude, longitude, radius (optional, default 5km)
 */
// Route: GET /api/demands/nearby
router.get("/nearby", getNearbyDemands, ()=>{
  console.log("getNearbyDemands Completed");
})

module.exports = router;
