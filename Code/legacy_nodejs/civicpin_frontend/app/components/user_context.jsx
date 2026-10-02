'use client'
import React, { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

const UserContext = createContext()

export const UserProvider = ({ children }) => {
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [demandLocations, setDemandLocations] = useState([])
  const [overlayOn, setOverlayOn] = useState(false)
  const [imageBlob, setImageBlob] = useState(null)
  const [scaleVal, setScaleVal] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [activeDemand, setActiveDemand] = useState(null)
  const [user, setUser] = useState(null) // Track logged-in user
  const router = useRouter()

  // Verify user authentication
  useEffect(() => {
    const verifyUser = async () => {
      const token = Cookies.get('civicpin_token') // Get token from cookies
      if (!token) {
        // router.push('/landing') // Redirect if token is missing
        return
      }

      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/verify`,
          {
            withCredentials: true, // Ensure cookies are sent
          }
        )

        if (response.data.valid) {
          setUser(response.data.user) // Store user data
        } else {
          // router.push('/landing') // Redirect if invalid token
        }
      } catch (error) {
        // router.push('/landing') // Redirect on error
      }
    }

    verifyUser()
  }, [router])

  // Logout function
  const logout = () => {
    Cookies.remove('civicpin_token') // Remove token
    setUser(null) // Clear user state
    // router.push('/landing') // Redirect to login page
  }

  return (
    <UserContext.Provider
      value={{
        user,
        logout,
        selectedPlace,
        setSelectedPlace,
        demandLocations,
        setDemandLocations,
        overlayOn,
        setOverlayOn,
        imageBlob,
        setImageBlob,
        scaleVal,
        setScaleVal,
        searchResults,
        activeDemand,
        handlePlaceSelect: (place) => {
          if (place?.geometry?.location) {
            setSelectedPlace({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              name: place.formatted_address || '',
              placeId: place.place_id,
            })
            setActiveDemand(null)
          }
        },
        handleMapClick: (event) => {
          if (event?.latLng) {
            setSelectedPlace({
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
              name: 'Pinned Location',
            })
            setActiveDemand(null)
          }
        },
        raiseDemand: (demandDetails) => {
          if (selectedPlace) {
            setDemandLocations((prev) => [
              ...prev,
              {
                id: Date.now(),
                ...demandDetails,
                location: selectedPlace,
                status: 'active',
              },
            ])
            setSelectedPlace(null)
          }
        },
        loadDemandMarkers: setDemandLocations,
        highlightDemand: (demandId) => {
          const demand = demandLocations.find((d) => d.id === demandId)
          if (demand) {
            setActiveDemand(demand)
            setSelectedPlace(null)
          }
        },
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const useUserContext = () => useContext(UserContext)
