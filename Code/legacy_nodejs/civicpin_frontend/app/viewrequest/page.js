'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'

export default function ViewRequest() {
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessAnalysis, setBusinessAnalysis] = useState(null)
  const [businessLoading, setBusinessLoading] = useState(false)
  const search = useRouter()
  const searchParams = new URLSearchParams(search)
  const mapRef = useRef(null)
  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY

  const requestId =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('id')
      : null
  useEffect(() => {
    async function fetchRequest() {
      try {
        if (!requestId) {
          throw new Error('Request ID not found in URL')
        }
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/demand/getDemandById/${requestId}`,
          { cache: 'no-store' }
        )
        if (!response.ok) {
          throw new Error('Failed to fetch request details')
        }
        const data = await response.json()
        setRequest(data)
        if (data) {
          getBusinessSuggestions(data)
        }
      } catch (err) {
        console.error('Error fetching request:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchRequest()
  }, [])

  useEffect(() => {
    if (request && mapRef.current) {
      initMap()
    }
  }, [request])

  function initMap() {
    if (typeof window !== 'undefined') {
      if (typeof window.google === 'undefined') {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
        script.async = true
        script.defer = true
        script.onload = () => renderMap()
        document.head.appendChild(script)
      } else {
        renderMap()
      }
    }
  }

  function renderMap() {
    try {
      if (!mapRef.current || !window.google || !window.google.maps) {
        console.error('Google Maps API not loaded yet')
        return
      }
      const mapOptions = {
        center: {
          lat: request.location.coordinates[1],
          lng: request.location.coordinates[0],
        },
        zoom: 15,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          {
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#242f3e' }],
          },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        ],
      }
      const map = new window.google.maps.Map(mapRef.current, mapOptions)
      const marker = new window.google.maps.Marker({
        position: {
          lat: request.location.coordinates[1],
          lng: request.location.coordinates[0],
        },
        map: map,
        title: request.title,
        animation: window.google.maps.Animation.DROP,
      })
    } catch (error) {
      console.error('Error rendering map:', error)
    }
  }

  const handleUpvote = async () => {
    try {
      const response = await axios.patch(
        `http://localhost:5030/api/demand/${request._id}/upvote`,
        {},
        { withCredentials: true }
      )
      const updatedRequest = response.data.data
      setRequest(updatedRequest)
    } catch (err) {
      console.error('Error upvoting demand:', err)
    }
  }

  async function getBusinessSuggestions(requestData) {
    setBusinessLoading(true)
    try {
      const prompt = `
            Analyze this business request and provide suggestions as JSON:
            
            Title: ${requestData.title}
            Category: ${requestData.category}
            Description: ${requestData.description}
            Location: ${requestData.location.coordinates[1]}, ${requestData.location.coordinates[0]}
            
            Return a valid JSON object with these keys:
            {
              "competitiveAnalysis": "Analysis of competition in this area",
              "marketPotential": "Analysis of demand potential",
              "resourceRequirements": "Key resources needed",
              "successFactors": "Factors for success",
              "summary": "Overall summary"
            }
            `
      const axios = require('axios')

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )

      console.log('Gemini Analysis Raw Output:', response.data.candidates[0].content.parts[0].text)

      const responseText = response.data.candidates[0].content.parts[0].text
      try {
        const parsedData = JSON.parse(responseText)
        setBusinessAnalysis(parsedData)
      } catch (jsonError) {
        console.error('Error parsing JSON response from Gemini:', jsonError)
        setBusinessAnalysis({
          error: 'Could not parse JSON response correctly from AI provider.',
          text: responseText,
        })
      }
    } catch (error) {
      console.error('Error getting business analysis:', error)
      setBusinessAnalysis({
        error: 'Failed to generate business analysis. Please try again later.',
      })
    } finally {
      setBusinessLoading(false)
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <SyntaxHighlighter
          style={materialDark}
          language={match[1]}
          PreTag='div'
          className='rounded-lg overflow-x-auto'
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code
          className={`${className} bg-gray-800 text-blue-400 px-1 rounded`}
          {...props}
        >
          {children}
        </code>
      )
    },
    strong: ({ children }) => (
      <strong className='font-bold text-blue-400'>{children}</strong>
    ),
    h1: ({ children }) => (
      <h1 className='text-4xl font-extrabold text-indigo-200 mb-6 border-b-2 border-indigo-500 pb-3'>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className='text-3xl font-bold text-indigo-300 mb-4'>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className='text-2xl font-semibold text-indigo-400 mb-3'>
        {children}
      </h3>
    ),
    ul: ({ children }) => (
      <ul className='list-disc list-inside mb-4 pl-4 text-gray-200 space-y-1'>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className='list-decimal list-inside mb-4 pl-4 text-gray-200 space-y-1'>
        {children}
      </ol>
    ),
    p: ({ children }) => (
      <p className='mb-4 leading-relaxed text-gray-300'>{children}</p>
    ),
  }

  if (loading)
    return (
      <div className='min-h-screen flex justify-center items-center bg-black'>
        <div className='animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-500'></div>
      </div>
    )

  if (error)
    return (
      <div className='min-h-screen flex justify-center items-center bg-black'>
        <div className='bg-gray-900 p-10 rounded-xl shadow-2xl border border-indigo-800'>
          <h2 className='text-4xl font-bold text-red-500 mb-6'>Error</h2>
          <p className='text-red-300 text-xl'>{error}</p>
          <Link
            href='/'
            className='mt-6 inline-block text-indigo-400 hover:text-indigo-300 hover:underline text-xl'
          >
            Return to home
          </Link>
        </div>
      </div>
    )

  return (
    <div className='min-h-screen bg-black w-full'>
      {/* Header Banner */}
      <div className='w-full bg-black py-12 px-8 sm:px-12 shadow-2xl'>
        <div className='max-w-7xl mx-auto text-center'>
          <h1 className='text-5xl font-extrabold text-white mb-4 drop-shadow-2xl'>
            {request.title}
          </h1>
          <div className='flex flex-wrap justify-center gap-4 mb-6'>
            <span className='inline-flex items-center px-5 py-2 rounded-full text-lg font-semibold bg-indigo-200 text-indigo-900 shadow-md'>
              {request.category}
            </span>
            <span className='inline-flex items-center px-5 py-2 rounded-full text-lg font-semibold bg-yellow-200 text-yellow-800 shadow-md'>
              {request.status.replace('_', ' ')}
            </span>
            <span className='inline-flex items-center px-5 py-2 rounded-full text-lg font-semibold bg-green-200 text-green-800 shadow-md'>
              Created: {formatDate(request.createdAt)}
            </span>
          </div>
          <div className='flex flex-wrap justify-center gap-6'>
            <button
              onClick={() => handleUpvote()}
              className='inline-flex items-center px-6 py-3 bg-green-500 hover:bg-green-600 rounded-full text-white font-bold transition-transform transform hover:scale-105 shadow-2xl'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-6 w-6 mr-3'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9'
                />
              </svg>
              Upvote ({request.up_votes})
            </button>
            <div className='relative'>
              <button
                className='inline-flex items-center px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-full text-white font-bold transition-transform transform hover:scale-105 shadow-2xl'
                onClick={() => {
                  const dropdown = document.getElementById('share-dropdown')
                  dropdown.classList.toggle('hidden')
                }}
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-6 w-6 mr-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316'
                  />
                </svg>
                Share
              </button>

              <div
                id='share-dropdown'
                className='hidden absolute top-full right-0 mt-3 w-60 rounded-md shadow-2xl bg-gray-900 border border-indigo-700 z-20'
              >
                <div className='py-2'>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href)
                      alert('Link copied to clipboard!')
                      document
                        .getElementById('share-dropdown')
                        .classList.add('hidden')
                    }}
                    className='flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 w-full text-left transition-colors'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-5 w-5 mr-3 text-gray-400'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h6a2 2 0 012 2v1M8 5a2 2 0 012-2h6a2 2 0 012 2v1M8 5a2 2 0 012-2h6a2 2 0 012 2m0 0h-4a2 2 0 110 4h4'
                      />
                    </svg>
                    Copy Link
                  </button>
                  <a
                    href={`https://twitter.com/intent/tweet?text=Check out this demand: ${request.title
                      }&url=${encodeURIComponent(window.location.href)}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 w-full text-left transition-colors'
                    onClick={() =>
                      document
                        .getElementById('share-dropdown')
                        .classList.add('hidden')
                    }
                  >
                    <svg
                      className='h-5 w-5 mr-3 text-blue-400'
                      fill='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path d='M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' />
                    </svg>
                    Share on Twitter
                  </a>
                  <a
                    href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
                      window.location.href
                    )}&title=${encodeURIComponent(request.title)}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 w-full text-left transition-colors'
                    onClick={() =>
                      document
                        .getElementById('share-dropdown')
                        .classList.add('hidden')
                    }
                  >
                    <svg
                      className='h-5 w-5 mr-3 text-blue-500'
                      fill='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' />
                    </svg>
                    Share on LinkedIn
                  </a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      request.title
                    )}%0A%0A${encodeURIComponent(window.location.href)}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 w-full text-left transition-colors'
                    onClick={() =>
                      document
                        .getElementById('share-dropdown')
                        .classList.add('hidden')
                    }
                  >
                    <svg
                      className='h-5 w-5 mr-3 text-green-400'
                      fill='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
                    </svg>
                    Share on WhatsApp
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      `Check out this demand: ${request.title}`
                    )}&body=${encodeURIComponent(
                      `I found this interesting demand on CivicPin:\n\n${request.title}\n${window.location.href}`
                    )}`}
                    className='flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 w-full text-left transition-colors'
                    onClick={() =>
                      document
                        .getElementById('share-dropdown')
                        .classList.add('hidden')
                    }
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-5 w-5 mr-3 text-gray-400'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                      />
                    </svg>
                    Share via Email
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Sections */}
          <div className='max-w-7xl mx-auto px-8 sm:px-12 py-10 space-y-12'>
            {/* Description Section */}
            <div className='bg-gray-900 rounded-2xl shadow-2xl overflow-hidden transform transition-all hover:scale-105'>
              <div className='p-8'>
                <h2 className='text-3xl font-bold text-indigo-300 mb-5 flex items-center'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-8 w-8 mr-3'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                    />
                  </svg>
                  Description
                </h2>
                <div className='bg-gray-800 rounded-lg p-8 border border-indigo-700'>
                  <p className='text-gray-100 text-lg'>{request.description}</p>
                </div>
              </div>
            </div>

            {/* Map & Location Section */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-12'>
              <div className='bg-gray-900 rounded-2xl shadow-2xl overflow-hidden transform transition-all hover:scale-105'>
                <div className='p-8'>
                  <h2 className='text-3xl font-bold text-indigo-300 mb-5 flex items-center'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-8 w-8 mr-3'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
                      />
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                      />
                    </svg>
                    Location
                  </h2>
                  <div className='bg-gray-800 rounded-lg p-2 border border-indigo-700 shadow-inner'>
                    <div
                      ref={mapRef}
                      className='h-[350px] w-full rounded-lg overflow-hidden'
                    ></div>
                    <div className='p-4 bg-gray-800 border-t border-indigo-700'>
                      <p className='text-gray-300 text-lg flex items-center'>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          className='h-6 w-6 mr-2 text-indigo-400'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
                          />
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                          />
                        </svg>
                        {request.location.coordinates[1]},{' '}
                        {request.location.coordinates[0]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className='bg-gray-900 rounded-2xl shadow-2xl overflow-hidden transform transition-all hover:scale-105'>
                <div className='p-8'>
                  <h2 className='text-3xl font-bold text-indigo-300 mb-5 flex items-center'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-8 w-8 mr-3'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M13 10V3L4 14h7v7l9-11h-7z'
                      />
                    </svg>
                    Engagement Stats
                  </h2>
                  <div className='grid grid-cols-2 gap-8'>
                    <div className='bg-gray-800 rounded-xl p-8 border border-green-800 shadow-inner flex flex-col items-center justify-center'>
                      <div className='text-5xl font-extrabold text-green-300 mb-3'>
                        👍 {request.up_votes}
                      </div>
                      <div className='text-gray-200 text-xl'>Upvotes</div>
                    </div>
                    <div className='bg-gray-800 rounded-xl p-8 border border-red-800 shadow-inner flex flex-col items-center justify-center'>
                      <div className='text-5xl font-extrabold text-red-300 mb-3'>
                        👎 {request.down_votes}
                      </div>
                      <div className='text-gray-200 text-xl'>Downvotes</div>
                    </div>
                  </div>
                  <div className='mt-8 bg-gray-800 rounded-xl p-8 border border-blue-800 shadow-lg'>
                    <h3 className='text-2xl font-semibold text-blue-300 mb-3 flex items-center'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        className='h-6 w-6 mr-3'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                      Timeline
                    </h3>
                    <div className='space-y-3'>
                      <p className='text-gray-300 text-lg flex items-center'>
                        <span className='w-32 text-gray-500'>Created:</span>
                        <span className='font-semibold text-blue-300'>
                          {formatDate(request.createdAt)}
                        </span>
                      </p>
                      <p className='text-gray-300 text-lg flex items-center'>
                        <span className='w-32 text-gray-500'>Updated:</span>
                        <span className='font-semibold text-blue-300'>
                          {formatDate(request.updatedAt)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gemini Business Analysis Section */}
            <div className='bg-gray-900 rounded-xl shadow-2xl overflow-hidden transform transition-all hover:scale-105'>
              <div className='bg-black px-10 py-8 flex items-center'>
                <div className='bg-white/20 rounded-full p-3 mr-4'>
                  <svg
                    className='h-8 w-8 text-white'
                    viewBox='0 0 24 24'
                    fill='currentColor'
                  >
                    <path
                      d='M12 22.5c5.799 0 10.5-4.701 10.5-10.5S17.799 1.5 12 1.5 1.5 6.201 1.5 12s4.701 10.5 10.5 10.5Z'
                      fillOpacity='0.24'
                    />
                    <path d='M14.5 4.5h-4.8a.7.7 0 00-.7.7v3.8a.7.7 0 00.7.7h4.8a.7.7 0 00.7-.7v-3.8a.7.7 0 00-.7-.7ZM11 14.5H6.2a.7.7 0 00-.7.7v3.8a.7.7 0 00.7.7H11a.7.7 0 00.7-.7v-3.8a.7.7 0 00-.7-.7Z' />
                  </svg>
                </div>
                <h2 className='text-3xl font-bold text-white'>
                  Gemini AI Business Analysis
                </h2>
              </div>
              <div className='p-8'>
                {businessLoading ? (
                  <div className='flex flex-col items-center justify-center py-12'>
                    <div className='animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500 mb-6'></div>
                    <p className='text-blue-300 text-xl'>
                      Generating comprehensive business analysis...
                    </p>
                  </div>
                ) : businessAnalysis ? (
                  <div className='space-y-8'>
                    {businessAnalysis.summary && (
                      <div className='bg-gray-800 p-8 rounded-xl border border-blue-800 shadow-2xl'>
                        <h3 className='text-3xl font-bold text-blue-300 mb-5 flex items-center'>
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            className='h-8 w-8 mr-3'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M13 10V3L4 14h7v7l9-11h-7z'
                            />
                          </svg>
                          Executive Summary
                        </h3>
                        <p className='text-gray-100 text-lg leading-relaxed'>
                          {businessAnalysis.summary}
                        </p>
                      </div>
                    )}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                      {businessAnalysis.competitiveAnalysis && (
                        <div className='bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg hover:shadow-2xl transition-shadow'>
                          <div className='flex items-center mb-5'>
                            <div className='bg-indigo-700/50 p-3 rounded-lg mr-4'>
                              <svg
                                xmlns='http://www.w3.org/2000/svg'
                                className='h-8 w-8 text-indigo-300'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10'
                                />
                              </svg>
                            </div>
                            <h3 className='text-2xl font-bold text-indigo-300'>
                              Competitive Analysis
                            </h3>
                          </div>
                          <p className='text-gray-300 text-lg leading-relaxed'>
                            {businessAnalysis.competitiveAnalysis}
                          </p>
                        </div>
                      )}
                      {businessAnalysis.marketPotential && (
                        <div className='bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg hover:shadow-2xl transition-shadow'>
                          <div className='flex items-center mb-5'>
                            <div className='bg-green-700/50 p-3 rounded-lg mr-4'>
                              <svg
                                xmlns='http://www.w3.org/2000/svg'
                                className='h-8 w-8 text-green-300'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                                />
                              </svg>
                            </div>
                            <h3 className='text-2xl font-bold text-green-300'>
                              Market Potential
                            </h3>
                          </div>
                          <p className='text-gray-300 text-lg leading-relaxed'>
                            {businessAnalysis.marketPotential}
                          </p>
                        </div>
                      )}
                      {businessAnalysis.resourceRequirements && (
                        <div className='bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg hover:shadow-2xl transition-shadow'>
                          <div className='flex items-center mb-5'>
                            <div className='bg-purple-700/50 p-3 rounded-lg mr-4'>
                              <svg
                                xmlns='http://www.w3.org/2000/svg'
                                className='h-8 w-8 text-purple-300'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2'
                                />
                              </svg>
                            </div>
                            <h3 className='text-2xl font-bold text-purple-300'>
                              Resource Requirements
                            </h3>
                          </div>
                          <p className='text-gray-300 text-lg leading-relaxed'>
                            {businessAnalysis.resourceRequirements}
                          </p>
                        </div>
                      )}
                      {businessAnalysis.successFactors && (
                        <div className='bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg hover:shadow-2xl transition-shadow'>
                          <div className='flex items-center mb-5'>
                            <div className='bg-yellow-700/50 p-3 rounded-lg mr-4'>
                              <svg
                                xmlns='http://www.w3.org/2000/svg'
                                className='h-8 w-8 text-yellow-300'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'
                                />
                              </svg>
                            </div>
                            <h3 className='text-2xl font-bold text-yellow-300'>
                              Success Factors
                            </h3>
                          </div>
                          <p className='text-gray-300 text-lg leading-relaxed'>
                            {businessAnalysis.successFactors}
                          </p>
                        </div>
                      )}
                    </div>
                    {businessAnalysis.error && (
                      <div className='bg-red-900/30 border border-red-800 p-8 rounded-lg'>
                        <h3 className='text-2xl font-bold text-red-400 mb-4 flex items-center'>
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            className='h-8 w-8 mr-4'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                          </svg>
                          Error
                        </h3>
                        <p className='text-gray-300 text-lg'>
                          {businessAnalysis.error}
                        </p>
                        {businessAnalysis.text && (
                          <div className='mt-4 p-4 bg-gray-900 rounded-lg text-sm text-gray-400 overflow-auto max-h-60'>
                            <pre>{businessAnalysis.text}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='flex flex-col items-center justify-center py-12 bg-gray-800/50 rounded-xl border border-gray-700'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-20 w-20 text-gray-600 mb-6'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={1}
                        d='M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                    <p className='text-gray-400 text-xl italic'>
                      Analysis not available
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Navigation */}
            <div className='flex justify-center items-center mt-12'>
              <Link
                href='/'
                className='inline-flex items-center px-8 py-4 bg-blue-600 border border-transparent rounded-full font-bold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-shadow shadow-2xl'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-6 w-6 mr-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M10 19l-7-7m0 0l7-7m-7 7h18'
                  />
                </svg>
                Back to all requests
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
