'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'
import Navbar from './components/navbar'
import { useUserContext } from './components/user_context'
import Link from 'next/link'
import Footer from './components/footer'
import NearbyDemandsMap from './components/NearbyDemandsMap'
import Loading from './components/loading'
import axios from 'axios'
import { toast } from 'react-toastify'
import DecryptedText from './ui_comp/de_para'
import GradientText from './components/ui/gradientText'
import Rating from './components/ratings'
import Cursor from './components/ui/cursor'

export default function GlobePage() {
  const globeRef = useRef()
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  // State to track whether to show cursor based on performance
  const [showCursor, setShowCursor] = useState(true)

  // Effect to monitor performance and disable cursor if needed
  useEffect(() => {
    let lastTime = performance.now()
    let frameCount = 0
    let lowPerformanceCount = 0

    const checkPerformance = () => {
      const now = performance.now()
      const elapsed = now - lastTime
      frameCount++

      // Check every second
      if (elapsed >= 1000) {
        const fps = frameCount / (elapsed / 1000)

        // If FPS is below threshold, increment counter
        if (fps < 30) {
          lowPerformanceCount++
          if (lowPerformanceCount >= 3 && showCursor) {
            setShowCursor(false)
          }
        } else {
          // Reset counter if performance improves
          lowPerformanceCount = 0
          if (!showCursor) {
            setShowCursor(true)
          }
        }

        frameCount = 0
        lastTime = now
      }

      requestAnimationFrame(checkPerformance)
    }

    requestAnimationFrame(checkPerformance)

    return () => cancelAnimationFrame(checkPerformance)
  }, [showCursor])

  // Variable to track if the user is authenticated
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/verify`,
          {
            withCredentials: true, // Send cookies with the request
          }
        )

        console.log('Response:', response.data)

        if (response.data.valid) {
          console.log('User is authenticated:', response.data.user)
          setIsAuthenticated(true)
        } else {
          console.log('Invalid token. Redirecting...')
          toast.error('Please login to continue')
          router.push('/landing')
        }
      } catch (error) {
        console.log('User not authenticated (no token). Redirecting...')
        toast.error('Please login to continue')
        router.push('/landing')
      }
    }

    verifyUser()
  }, [])

  // Prevent rendering until authentication check is complete
  if (isAuthenticated === null) {
    return <Loading text='Verifying user...' />
  }

  // `Globe` is loaded from the `globe.gl` npm package (not the CDN build) so it
  // shares the exact same `three` module instance as the `import * as THREE`
  // above. Loading globe.gl from a separate CDN <script> pulls in a second,
  // mismatched Three.js build, which throws
  // "matrixWorld.determinantAffine is not a function" at runtime.
  const initGlobe = (Globe) => {
    const world = (globeRef.current.__world = new Globe(globeRef.current, {
      animateIn: false,
    })
      .globeImageUrl(
        '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
      )
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png'))

    // Auto-rotate
    world.controls().autoRotate = true
    world.controls().autoRotateSpeed = 0.35

    // Add clouds sphere
    const CLOUDS_IMG_URL = './clouds.png'
    const CLOUDS_ALT = 0.004
    const CLOUDS_ROTATION_SPEED = -0.006 // deg/frame

    let cloudsFrameId
    new THREE.TextureLoader().load(CLOUDS_IMG_URL, (cloudsTexture) => {
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(
          world.getGlobeRadius() * (1 + CLOUDS_ALT),
          75,
          75
        ),
        new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true })
      )
      world.scene().add(clouds)
      ;(function rotateClouds() {
        clouds.rotation.y += (CLOUDS_ROTATION_SPEED * Math.PI) / 180
        cloudsFrameId = requestAnimationFrame(rotateClouds)
      })()
    })

    // Add double-click event listener to toggle map expansion
    globeRef.current.addEventListener('dblclick', handleMapToggle)

    // Make globe responsive
    const handleResize = () => {
      if (world) {
        world.width(window.innerWidth)
        world.height(window.innerHeight * 0.8)
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Initial sizing

    return () => {
      window.removeEventListener('resize', handleResize)
      globeRef.current?.removeEventListener('dblclick', handleMapToggle)
      if (cloudsFrameId) cancelAnimationFrame(cloudsFrameId)
    }
  }

  useEffect(() => {
    if (!globeRef.current) return
    let cancelled = false
    let cleanupGlobe

    import('globe.gl').then(({ default: Globe }) => {
      if (cancelled || !globeRef.current) return
      cleanupGlobe = initGlobe(Globe)
    })

    return () => {
      cancelled = true
      cleanupGlobe?.()
    }
  }, [])

  const handleMapToggle = () => {
    if (!showMap) return // Don't toggle if map shouldn't be shown

    setIsMapExpanded(!isMapExpanded)

    if (!isMapExpanded) {
      // Expand map
      const mapElement = document.getElementById('map')
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth' })

        // Show map with transition
        mapElement.style.transition = 'opacity 1000ms'
        mapElement.style.opacity = '1'
      } else {
        // If map element doesn't exist yet, scroll to bottom
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth',
        })
      }

      // Change navbar background
      const navC = document.getElementById('navC')
      if (navC) {
        navC.style.background = 'transparent'
      }
    } else {
      // Collapse map - scroll to top
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })

      // Hide map
      const bottomElement = document.getElementById('map')
      if (bottomElement) {
        bottomElement.style.opacity = '0'
      }

      // Reset navbar
      const navC = document.getElementById('navC')
      if (navC) {
        navC.style.background = 'black'
      }
    }
  }

  return (
    <>
      {/* {showCursor && <Cursor/>} */}
      <div
        id='navC'
        className='bg-black pt-4 md:pt-8 pb-2 md:pb-4 sticky top-0 z-[999]'
      >
        <Navbar />
      </div>
      <div
        style={{ marginTop: '0px', padding: '0px' }}
        className='z-10 h-[50vh] md:h-[70vh] lg:h-[80vh]'
      >
        <div
          ref={globeRef}
          id='globeViz'
          className='z-1000 cursor-pointer w-full h-full'
        />
      </div>

      <div
        className='bg-black py-8 md:py-16 px-4 text-white'
        style={{ marginTop: '-1px' }}
      >
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-8 md:mb-16'>
            <h1 className='text-3xl md:text-5xl font-bold mb-4 md:mb-6 bg-clip-text text-transparent bg-gray-200'>
              <GradientText
                colors={['#40ffaa', '#4079ff', '#40ffaa', '#4079ff', '#40ffaa']}
                animationSpeed={10}
                showBorder={false}
                className='custom-class'
              >
                CivicPin - India's First Crowdsourced Infrastructure Platform
              </GradientText>
            </h1>
            <p className='text-lg md:text-xl text-gray-300 max-w-3xl mx-auto'>
              Contribute to improving infrastructure around you and be a part of
              your community's development.
            </p>
          </div>

          {/* <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-16'>
            <div className='bg-gray-800/50 backdrop-blur-lg p-6 md:p-8 rounded-2xl border border-gray-700/50 shadow-xl hover:transform hover:scale-105 transition-all duration-300'>
              <div className='bg-blue-600/20 p-4 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-4 md:mb-6'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-6 w-6 md:h-8 md:w-8 text-blue-400'
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
              </div>
              <h3 className='text-xl md:text-2xl font-bold mb-2 md:mb-3 text-blue-400'>
                Find Properties
              </h3>
              <p className='text-gray-300 mb-4 md:mb-6'>
                Discover available properties in your area and get detailed
                information about them.
              </p>
              <Link
                href='/property'
                className='inline-block px-4 py-2 md:px-6 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base'
              >
                View Properties
              </Link>
            </div>

            <div className='bg-gray-800/50 backdrop-blur-lg p-6 md:p-8 rounded-2xl border border-gray-700/50 shadow-xl hover:transform hover:scale-105 transition-all duration-300'>
              <div className='bg-purple-600/20 p-4 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-4 md:mb-6'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-6 w-6 md:h-8 md:w-8 text-purple-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                  />
                </svg>
              </div>
              <h3 className='text-xl md:text-2xl font-bold mb-2 md:mb-3 text-purple-400'>
                View Demands
              </h3>
              <p className='text-gray-300 mb-4 md:mb-6'>
                See infrastructure demands made by the community and support
                them.
              </p>
              <Link
                href='/search-demands'
                className='inline-block px-4 py-2 md:px-6 md:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm md:text-base'
              >
                Browse Demands
              </Link>
            </div>

            <div className='bg-gray-800/50 backdrop-blur-lg p-6 md:p-8 rounded-2xl border border-gray-700/50 shadow-xl hover:transform hover:scale-105 transition-all duration-300'>
              <div className='bg-green-600/20 p-4 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-4 md:mb-6'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-6 w-6 md:h-8 md:w-8 text-green-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
                  />
                </svg>
              </div>
              <h3 className='text-xl md:text-2xl font-bold mb-2 md:mb-3 text-green-400'>
                Make Requests
              </h3>
              <p className='text-gray-300 mb-4 md:mb-6'>
                Request necessary infrastructure in your area and gather
                community support.
              </p>
              <Link
                href='/raise-request'
                className='inline-block px-4 py-2 md:px-6 md:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm md:text-base'
              >
                Raise Request
              </Link>
            </div>
          </div> */}

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-16'>
            <div className='bg-gray-800/50 backdrop-blur-lg p-6 md:p-8 rounded-2xl border border-gray-700/50 shadow-xl hover:transform hover:scale-105 transition-all duration-300 group'>
              <div className='bg-blue-600/20 p-4 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-4 md:mb-6 transition-transform duration-500 group-hover:rotate-[360deg]'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-6 w-6 md:h-8 md:w-8 text-blue-400'
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
              </div>
              <h3 className='text-xl md:text-2xl font-bold mb-2 md:mb-3 text-blue-400'>
                Find Properties
              </h3>
              <p className='text-gray-300 mb-4 md:mb-6'>
                Discover available properties in your area and get detailed
                information about them.
              </p>
              <Link
                href='/property'
                className='inline-block px-4 py-2 md:px-6 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base'
              >
                View Properties
              </Link>
            </div>

            <div className='bg-gray-800/50 backdrop-blur-lg p-6 md:p-8 rounded-2xl border border-gray-700/50 shadow-xl hover:transform hover:scale-105 transition-all duration-300 group'>
              <div className='bg-purple-600/20 p-4 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-4 md:mb-6 transition-transform duration-500 group-hover:rotate-[360deg]'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-6 w-6 md:h-8 md:w-8 text-purple-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                  />
                </svg>
              </div>
              <h3 className='text-xl md:text-2xl font-bold mb-2 md:mb-3 text-purple-400'>
                View Demands
              </h3>
              <p className='text-gray-300 mb-4 md:mb-6'>
                See infrastructure demands made by the community and support
                them.
              </p>
              <Link
                href='/search-demands'
                className='inline-block px-4 py-2 md:px-6 md:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm md:text-base'
              >
                Browse Demands
              </Link>
            </div>

            <div className='bg-gray-800/50 backdrop-blur-lg p-6 md:p-8 rounded-2xl border border-gray-700/50 shadow-xl hover:transform hover:scale-105 transition-all duration-300 group'>
              <div className='bg-green-600/20 p-4 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-4 md:mb-6 transition-transform duration-500 group-hover:rotate-[360deg]'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-6 w-6 md:h-8 md:w-8 text-green-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
                  />
                </svg>
              </div>
              <h3 className='text-xl md:text-2xl font-bold mb-2 md:mb-3 text-green-400'>
                Make Requests
              </h3>
              <p className='text-gray-300 mb-4 md:mb-6'>
                Request necessary infrastructure in your area and gather
                community support.
              </p>
              <Link
                href='/raise-request'
                className='inline-block px-4 py-2 md:px-6 md:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm md:text-base'
              >
                Raise Request
              </Link>
            </div>
          </div>

          <div className='bg-gray-800/30 backdrop-blur-lg p-6 md:p-8 rounded-2xl border border-gray-700/50 shadow-xl mb-8 md:mb-16 text-center'>
            <h2
              className='text-2xl md:text-3xl font-bold mb-3 md:mb-4'
              style={{ color: '#f9fafb', marginBottom: '1.5rem' }}
            >
              ~ Nearby Demands ~
            </h2>

            <NearbyDemandsMap />
          </div>
          <div className='bg-gray-800/30 backdrop-blur-lg p-6 md:p-8 rounded-2xl border border-gray-700/50 shadow-xl mb-8 md:mb-16'>
            <div className='text-center'>
              <h2 className='text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-white'>
                How It Works
              </h2>
              <p className='text-gray-300 mb-6 md:mb-8 max-w-3xl mx-auto'>
                CivicPin connects citizens, government agencies, and private
                developers to collaboratively improve infrastructure.
              </p>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8'>
                <div className='group flex flex-col items-center p-4 transition-all duration-300 hover:bg-gray-700/20 rounded-2xl hover:scale-105 hover:shadow-lg'>
                  <div className='bg-blue-600/20 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 md:mb-4 group-hover:animate-pulse transition-transform'>
                    <span className='text-xl md:text-2xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors'>
                      1
                    </span>
                  </div>
                  <h3 className='text-lg md:text-xl font-semibold mb-2 text-white group-hover:text-blue-300 transition-colors'>
                    Identify Needs
                  </h3>
                  <p className='text-gray-400 group-hover:text-gray-200 text-center transition-colors'>
                    Identify infrastructure needs in your community and create
                    requests
                  </p>
                </div>

                <div className='group flex flex-col items-center p-4 transition-all duration-300 hover:bg-gray-700/20 rounded-2xl hover:scale-105 hover:shadow-lg'>
                  <div className='bg-purple-600/20 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 md:mb-4 group-hover:animate-pulse transition-transform'>
                    <span className='text-xl md:text-2xl font-bold text-purple-400 group-hover:text-purple-300 transition-colors'>
                      2
                    </span>
                  </div>
                  <h3 className='text-lg md:text-xl font-semibold mb-2 text-white group-hover:text-purple-300 transition-colors'>
                    Gather Support
                  </h3>
                  <p className='text-gray-400 group-hover:text-gray-200 text-center transition-colors'>
                    Community members upvote and comment on important requests
                  </p>
                </div>

                <div className='group flex flex-col items-center p-4 transition-all duration-300 hover:bg-gray-700/20 rounded-2xl hover:scale-105 hover:shadow-lg'>
                  <div className='bg-green-600/20 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 md:mb-4 group-hover:animate-pulse transition-transform'>
                    <span className='text-xl md:text-2xl font-bold text-green-400 group-hover:text-green-300 transition-colors'>
                      3
                    </span>
                  </div>
                  <h3 className='text-lg md:text-xl font-semibold mb-2 text-white group-hover:text-green-300 transition-colors'>
                    Implementation
                  </h3>
                  <p className='text-gray-400 group-hover:text-gray-200 text-center transition-colors'>
                    Authorities and developers respond to community-backed
                    requests
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className='bg-black py-5'>
            <Rating />
            <Link
              href='/rating'
              className='group flex items-center justify-center space-x-2 text-white rounded-full px-6 py-3 shadow-lg transition-all duration-300 z-50 relative overflow-hidden'
              style={{
                background: 'linear-gradient(45deg, #40ffaa, #4079ff)',
                marginTop: '3rem',
                marginBottom: '2rem',
                display: 'inline-block',
                marginLeft: '44%',
                // transform: 'translateX(-50%)',
              }}
            >
              <div className='relative overflow-hidden w-full text-center'>
                <span className='block transition-all duration-300 transform group-hover:translate-y-[-100%] group-hover:opacity-0'>
                  Give us a Thumbs Up
                </span>
                <span className='absolute left-0 right-0 top-full opacity-0 transition-all duration-300 transform group-hover:translate-y-[-100%] group-hover:opacity-100 text-white'>
                  We Appreciate You!
                </span>
              </div>

              <div className='absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
            </Link>
          </div>
          <Footer />
        </div>
      </div>
    </>
  )
}
