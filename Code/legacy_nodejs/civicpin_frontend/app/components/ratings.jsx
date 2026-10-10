import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'

export const InfiniteMovingCards = ({
  items,
  direction = 'left',
  speed = 'normal',
}) => {
  const scrollerRef = useRef(null)

  return (
    <div className='scroller-container relative max-w-7xl overflow-hidden'>
      <ul
        ref={scrollerRef}
        className='scroller flex min-w-full shrink-0 flex-nowrap gap-4 py-4'
        style={{
          animation: `scrollX ${
            speed === 'fast' ? '20s' : speed === 'normal' ? '40s' : '80s'
          } linear infinite`,
          animationDirection: direction === 'left' ? 'normal' : 'reverse',
        }}
      >
        {[...items, ...items].map(
          (
            item,
            idx // Duplicate items for seamless looping
          ) => (
            <li
              key={idx}
              className='relative w-[350px] max-w-full shrink-0 rounded-2xl border border-zinc-700 bg-zinc-900 px-8 py-6 md:w-[450px]'
            >
              <blockquote>
                {/* Rating Stars */}
                <div className='flex items-center mb-4'>
                  {[...Array(item.rating)].map((_, starIdx) => (
                    <svg
                      key={starIdx}
                      xmlns='http://www.w3.org/2000/svg'
                      fill='gold'
                      viewBox='0 0 24 24'
                      strokeWidth={1}
                      stroke='white'
                      className='w-5 h-5'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.908c.969 0 1.371 1.24.588 1.81l-3.973 2.884a1 1 0 00-.364 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.973-2.884a1 1 0 00-1.176 0l-3.973 2.884c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.986 9.1c-.783-.57-.38-1.81.588-1.81h4.908a1 1 0 00.95-.69l1.518-4.674z'
                      />
                    </svg>
                  ))}
                </div>
                <span className='text-sm leading-[1.6] font-normal text-zinc-300 italic mb-4 block'>
                  "{item.review}"
                </span>
                <div className='mt-6 flex flex-row items-center'>
                  <span className='flex flex-col gap-1'>
                    <span className='text-sm leading-[1.6] font-normal text-zinc-500'>
                      {item.email}
                    </span>
                    <span className='text-sm leading-[1.6] font-normal text-zinc-500'>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                </div>
              </blockquote>
            </li>
          )
        )}
      </ul>

      {/* CSS for Scrolling Animation */}
      <style jsx>{`
        @keyframes scrollX {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .scroller-container {
          position: relative;
          overflow: hidden;
          width: 100%;
        }
        .scroller {
          display: flex;
          white-space: nowrap;
          min-width: max-content;
        }
      `}</style>
    </div>
  )
}

const CustomerReviewCarousel = () => {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rating/reviews`
        )
        setReviews(response.data.data)
      } catch (error) {
        console.error('Error fetching reviews:', error)
      }
    }
    fetchReviews()
  }, [])

  return (
    <div className='p-4 sm:p-6 rounded-lg bg-zinc-950 text-white max-w-full sm:max-w-7xl pt-20 mx-auto'>
      <h1 className='text-center font-extrabold text-2xl sm:text-3xl mb-4 sm:mb-6 text-zinc-200'>
        Our Customer Reviews
      </h1>

      {reviews.length > 0 ? (
        <InfiniteMovingCards items={reviews} direction='left' speed='normal' />
      ) : (
        <div className='text-center'>No reviews available.</div>
      )}
    </div>
  )
}

export default CustomerReviewCarousel
