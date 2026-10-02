const express = require('express');
const router = express.Router();
const Rating = require('../models/ratings'); 
const path = require('path');
const fs = require('fs')

router.post('/rating', async (req, res) => {
  const { email, rating, review } = req.body;

  if (!email || !rating || !review) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const existingReview = await Rating.findOne({ email });

    if (existingReview) {
      // Update the existing review
      existingReview.rating = rating;
      existingReview.review = review;
      await existingReview.save();
      res.status(200).json({ message: 'Review updated successfully.', data: existingReview });
    } else {
      // Add a new review
      const newReview = new Rating({ email, rating, review });
      await newReview.save();
      res.status(201).json({ message: 'Review added successfully.', data: newReview });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while processing the review.' });
  }
});

// Route to get all reviews
router.get('/reviews', async (req, res) => {
    try {
      const reviews = await Rating.find().sort({ createdAt: -1 }); // Sort by most recent
      res.status(200).json({ data: reviews });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while fetching reviews.' });
    }
  });

module.exports = router;