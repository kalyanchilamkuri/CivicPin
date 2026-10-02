'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation' // For redirection
import axios from 'axios'

const CustomerReviewForm = () => {
  const router = useRouter() // Use router for navigation
  const [review, setReview] = useState('')
  const [rating, setRating] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRatingClick = (index) => {
    setRating(index + 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!review || rating === 0) {
      setError('Please provide a review and select a rating.')
      return
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rating/rating`,
        {
          email: localStorage.getItem('email'),
          review,
          rating,
        }
      )

      if (response.status === 201) {
        setSuccess('Review submitted successfully!')
        setReview('')
        setRating(0)
        setTimeout(() => {
          router.push('/')
        }, 1000)
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      setError('Failed to submit the review. Please try again.')
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-900 text-white'>
      <div className='w-full max-w-md p-6 rounded-lg shadow-lg bg-gray-800'>
        <h1 className='text-3xl font-bold mb-6 text-center'>Leave a Review</h1>
        {error && <p className='text-red-500 mb-4 text-center'>{error}</p>}
        {success && (
          <p className='text-green-500 mb-4 text-center'>{success}</p>
        )}

        <form onSubmit={handleSubmit}>
          <div className='mb-6'>
            <label htmlFor='review' className='block font-medium mb-2'>
              Your Review
            </label>
            <textarea
              id='review'
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className='w-full p-3 border rounded bg-gray-700 text-white border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500'
              rows='4'
              placeholder='Write your review here...'
            ></textarea>
          </div>

          <div className='mb-6 text-center'>
            <label className='block font-medium mb-2'>Your Rating</label>
            <div className='flex items-center justify-center space-x-2'>
              {[...Array(5)].map((_, index) => (
                <svg
                  key={index}
                  onClick={() => handleRatingClick(index)}
                  xmlns='http://www.w3.org/2000/svg'
                  fill={index < rating ? 'gold' : 'none'}
                  stroke='white'
                  viewBox='0 0 24 24'
                  strokeWidth={2}
                  className='w-8 h-8 cursor-pointer hover:scale-110 transition-transform'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.908c.969 0 1.371 1.24.588 1.81l-3.973 2.884a1 1 0 00-.364 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.973-2.884a1 1 0 00-1.176 0l-3.973 2.884c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.986 9.1c-.783-.57-.38-1.81.588-1.81h4.908a1 1 0 00.95-.69l1.518-4.674z'
                  />
                </svg>
              ))}
            </div>
          </div>

          <button
            type='submit'
            className='w-full py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors'
          >
            Submit Review
          </button>
        </form>
      </div>
    </div>
  )
}

export default CustomerReviewForm
