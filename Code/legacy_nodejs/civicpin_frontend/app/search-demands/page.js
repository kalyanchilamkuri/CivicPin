'use client'

import { useState, useEffect } from 'react'
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api'
import Navbar from '../components/navbar'
import { useUserContext } from '../components/user_context'
import PlaceAutocomplete from '../components/autocomplete'
import Footer from '../components/footer'
import axios from 'axios'

const containerStyle = {
  width: '100%',
  height: '70vh',
}

const center = {
  lat: 20.5937,
  lng: 78.9629,
}

const SearchDemandsPage = () => {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [demands, setDemands] = useState([])
  const [filteredDemands, setFilteredDemands] = useState([])
  const [selectedDemand, setSelectedDemand] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [businessCategory, setBusinessCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const INITIAL_VISIBLE_DEMANDS = 6
  const [visibleDemands, setVisibleDemands] = useState(INITIAL_VISIBLE_DEMANDS)

  const handleLoadMore = () => {
    setVisibleDemands((prev) => prev + 3) // Load 3 more each time
  }

  const handleShowLess = () => {
    setVisibleDemands(INITIAL_VISIBLE_DEMANDS) // Reset to initial state
  }

  const { selectedPlace } = useUserContext() || {}

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
    id: 'google-maps-script',
  })

  // Fetch demands from backend
  useEffect(() => {
    const fetchDemands = async () => {
      try {
        setLoading(true)
        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/demand/getDemand`

        const response = await axios.get(url)
        console.log(response.data)
        setDemands(response.data)
        setFilteredDemands(response.data)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching demands:', err)
        setError('Failed to fetch demands')
        setLoading(false)
      }
    }

    fetchDemands()
  }, [])

  // Filter demands when location or category changes
  useEffect(() => {
    filterDemands()
  }, [businessCategory, demands, selectedLocation])

  // Update selected location when place changes
  useEffect(() => {
    if (selectedPlace && selectedPlace.lat && selectedPlace.lng) {
      setSelectedLocation({
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
      })
    }
  }, [selectedPlace])

  const filterDemands = () => {
    let filtered = [...demands]

    // Filter by location if selected
    if (selectedLocation) {
      const maxDistance = 0.1 // roughly ~11km
      filtered = filtered.filter((demand) => {
        // Correctly extract coordinates
        const demandLat = demand.location.coordinates[1]
        const demandLng = demand.location.coordinates[0]

        const distance = Math.sqrt(
          Math.pow(demandLat - selectedLocation.lat, 2) +
            Math.pow(demandLng - selectedLocation.lng, 2)
        )
        return distance <= maxDistance
      })
    }

    // Filter by category
    if (businessCategory !== 'all') {
      filtered = filtered.filter(
        (demand) => demand.category === businessCategory
      )
    }

    setFilteredDemands(filtered)
  }

  const handleMarkerClick = (demand) => {
    setSelectedDemand(demand)
  }

  const handleUpvote = async (demandId) => {
    try {
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/demand/${demandId}/upvote`,
        {},
        {
          withCredentials: true, // Ensure cookies are sent with the request
        }
      )
      const updatedDemand = response.data.data

      // Update the demands list with the updated demand
      setDemands((prevDemands) =>
        prevDemands.map((demand) =>
          demand._id === demandId ? updatedDemand : demand
        )
      )

      // Update the selected demand if it's the one we just upvoted
      if (selectedDemand && selectedDemand._id === demandId) {
        setSelectedDemand(updatedDemand)
      }
    } catch (err) {
      console.error('Error upvoting demand:', err)
    }
  }

  const handleAddComment = async (demandId) => {
    if (!newComment.trim()) return

    try {
      // Make a POST request to the backend to add the comment.
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/demand/${demandId}/comments`,
        { text: newComment },
        { withCredentials: true } // Ensures cookies (and auth) are sent.
      )

      // The backend returns the updated demand with the new comment.
      const updatedDemand = response.data.demand

      // Update the selected demand if it's the one we just commented on.
      if (selectedDemand && selectedDemand._id === demandId) {
        setSelectedDemand(updatedDemand)
      }

      // Also update the overall demands list.
      setDemands((prev) =>
        prev.map((d) => (d._id === demandId ? updatedDemand : d))
      )

      // Clear the new comment input.
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  if (!isLoaded)
    return (
      <div className='min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500'></div>
        <span className='ml-4 text-xl text-gray-200'>Loading...</span>
      </div>
    )

  if (loading)
    return (
      <div className='min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500'></div>
        <span className='ml-4 text-xl text-gray-200'>Loading Demands...</span>
      </div>
    )

  if (error)
    return (
      <div className='min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center'>
        <p className='text-red-500 text-xl'>{error}</p>
      </div>
    )

  return (
    <>
      <div className='min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-10 text-gray-100'>
        <Navbar />

        <div className='container mx-auto px-4 py-8 mt-8'>
          <h1 className='text-4xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gray-200'>
            Search Demands
          </h1>

          <div className='mb-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='md:col-span-2'>
              <PlaceAutocomplete />
            </div>
            <div>
              <select
                className='w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white 
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all duration-300 
                hover:bg-gray-800/70 hover:shadow-lg focus:outline-none'
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
              >
                <option value='all'>All Categories</option>
                <option value='infrastructure'>Infrastructure</option>
                <option value='public_service'>Public Service</option>
                <option value='transportation'>Transportation</option>
                <option value='utilities'>Utilities</option>
                <option value='education'>Education</option>
                <option value='healthcare'>Healthcare</option>
                <option value='other'>Other</option>
              </select>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            <div className='lg:col-span-2'>
              <div className='rounded-xl overflow-hidden shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl'>
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={selectedLocation || center}
                  zoom={selectedLocation ? 15 : 5}
                  options={{
                    mapTypeControl: true,
                    mapTypeId: 'roadmap',
                    fullscreenControl: true,
                    streetViewControl: true,
                    zoomControl: true,
                  }}
                >
                  {filteredDemands.map((demand) => (
                    <Marker
                      key={demand._id}
                      position={{
                        lat: demand.location.coordinates[1],
                        lng: demand.location.coordinates[0],
                      }}
                      onClick={() => handleMarkerClick(demand)}
                      icon={{
                        path: 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z',
                        fillColor:
                          selectedDemand && selectedDemand._id === demand._id
                            ? '#FF4500'
                            : '#2196F3',
                        fillOpacity: 1,
                        strokeWeight: 1,
                        strokeColor: '#ffffff',
                        scale: 2,
                      }}
                    />
                  ))}
                </GoogleMap>
              </div>
            </div>

            <div
              className='bg-gray-800/30 backdrop-blur-sm p-6 rounded-xl shadow-xl border border-gray-700/50 h-[70vh] overflow-y-auto 
            transition-all duration-300 hover:shadow-2xl'
            >
              <h2 className='text-2xl font-bold mb-4 text-blue-400 transition-all duration-300 hover:text-blue-300'>
                {selectedDemand ? selectedDemand.title : 'Demand Details'}
              </h2>

              {selectedDemand ? (
                <div>
                  <div className='mb-4 p-4 bg-gray-800/50 rounded-lg transition-all duration-300 hover:bg-gray-800/60'>
                    <p className='text-gray-300 mb-3'>
                      {selectedDemand.description}
                    </p>
                    <div className='flex justify-between text-sm text-gray-400 mb-2'>
                      <span>Category: {selectedDemand.category}</span>
                      <span>
                        {new Date(
                          selectedDemand.createdAt
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <div className='flex justify-between items-center'>
                      <span className='text-gray-400 text-sm'>
                        Status: {selectedDemand.status}
                      </span>
                      <button
                        onClick={() => handleUpvote(selectedDemand._id)}
                        className='flex items-center space-x-1 text-blue-400 hover:text-blue-300 
                        transition-all duration-300 transform hover:scale-110'
                      >
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          className='h-5 w-5'
                          viewBox='0 0 20 20'
                          fill='currentColor'
                        >
                          <path
                            fillRule='evenodd'
                            d='M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z'
                            clipRule='evenodd'
                          />
                        </svg>
                        <span>{selectedDemand.up_votes}</span>
                      </button>
                    </div>
                  </div>

                  <div className='mt-6'>
                    <h3
                      className='text-xl font-semibold mb-3 text-gray-200 
                    transition-all duration-300 hover:text-gray-100'
                    >
                      Comments
                    </h3>

                    <div className='space-y-3 mb-4 max-h-60 overflow-y-auto'>
                      {(selectedDemand.comments || []).map((comment, index) => (
                        <div
                          key={index}
                          className='bg-gray-800/50 p-3 rounded-lg'
                        >
                          <div className='flex justify-between text-sm text-gray-400 mb-1'>
                            <span>{comment.user}</span>
                            <span>
                              {new Date(comment.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className='text-gray-200'>{comment.text}</p>
                        </div>
                      ))}

                      {(selectedDemand.comments || []).length === 0 && (
                        <p className='text-gray-500 text-center py-2'>
                          No comments yet
                        </p>
                      )}
                    </div>

                    <div className='flex space-x-2'>
                      <input
                        type='text'
                        className='flex-1 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white 
                        focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
                        transition-all duration-300 hover:bg-gray-800/60'
                        placeholder='Write your comment...'
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <button
                        onClick={() => handleAddComment(selectedDemand._id)}
                        className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                        transition-all duration-300 transform hover:scale-105'
                      >
                        Send
                      </button>
                    </div>
                    <div className='flex justify-center mt-10'>
                      <a
                        href={`/viewrequest/?id=${selectedDemand._id}`}
                        className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                        transition-colors duration-300 flex items-center space-x-2 
                        transform hover:scale-105'
                      >
                        <span>View Details</span>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          className='h-4 w-4'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M14 5l7 7m0 0l-7 7m7-7H3'
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center h-full text-center text-gray-400'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-16 w-16 mb-4 text-gray-600 transition-all duration-300 hover:text-gray-500'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={1.5}
                      d='M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
                    />
                  </svg>
                  <p className='text-lg'>
                    Click on a marker on the map to view demand
                  </p>
                </div>
              )}
            </div>
          </div>

          {filteredDemands.length > 0 && (
            <div className='mt-8'>
              <h2 className='text-2xl font-bold mb-4 text-gray-200'>
                Nearby Demands ({filteredDemands.length})
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {filteredDemands.slice(0, visibleDemands).map((demand) => (
                  <div
                    key={demand._id}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-300 
                    hover:shadow-lg transform hover:scale-[1.03] ${
                      selectedDemand && selectedDemand._id === demand._id
                        ? 'bg-blue-900/30 border border-blue-500/50'
                        : 'bg-gray-800/30 border border-gray-700/50 hover:bg-gray-700/40'
                    }`}
                    onClick={() => handleMarkerClick(demand)}
                  >
                    <h3
                      className='text-lg font-semibold mb-2 
                    transition-all duration-300 hover:text-blue-400'
                    >
                      {demand.title}
                    </h3>
                    <p className='text-gray-400 text-sm mb-3 line-clamp-2'>
                      {demand.description}
                    </p>
                    <div className='flex justify-between items-center'>
                      <span
                        className='text-xs text-gray-500 
                      transition-all duration-300 hover:text-gray-400'
                      >
                        {demand.category}
                      </span>
                      <div
                        className='flex items-center space-x-1 text-blue-400 
                      transition-all duration-300 transform hover:scale-110'
                      >
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          className='h-4 w-4'
                          viewBox='0 0 20 20'
                          fill='currentColor'
                        >
                          <path
                            fillRule='evenodd'
                            d='M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z'
                            clipRule='evenodd'
                          />
                        </svg>
                        <span>{demand.up_votes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Buttons for Load More and Show Less */}
              <div className='mt-6 text-center'>
                {visibleDemands < filteredDemands.length && (
                  <button
                    onClick={handleLoadMore}
                    className='px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition mx-2'
                  >
                    Load More Demands
                  </button>
                )}
                {visibleDemands > 6 && (
                  <button
                    onClick={handleShowLess}
                    className='px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition mx-2'
                  >
                    Show Less
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </>
  )
}

export default SearchDemandsPage
