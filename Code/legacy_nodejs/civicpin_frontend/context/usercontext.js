'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

// Create the context
const UserContext = createContext(undefined)

// Custom hook to use the user context
export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

// Provider component
export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Function to login user
  const login = async (credentials) => {
    try {
      setLoading(true)
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
        credentials,
        { withCredentials: true }
      )

      if (response.data && response.data.success) {
        setUser(response.data.user)
        return { success: true }
      } else {
        throw new Error('Login failed')
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to login')
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to login',
      }
    } finally {
      setLoading(false)
    }
  }

  // Function to register user
  const register = async (userData) => {
    try {
      setLoading(true)
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/signup`,
        userData,
        { withCredentials: true }
      )

      if (response.data && response.data.success) {
        setUser(response.data.user)
        return { success: true }
      } else {
        throw new Error('Registration failed')
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to register')
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to register',
      }
    } finally {
      setLoading(false)
    }
  }

  // Function to logout user
  const logout = async () => {
    try {
      setLoading(true)
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout`,
        {},
        { withCredentials: true }
      )
      setUser(null)
      return { success: true }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to logout')
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to logout',
      }
    } finally {
      setLoading(false)
    }
  }

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true)
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/verify`,
          { withCredentials: true }
        )

        if (response.data && response.data.user) {
          setUser(response.data.user)
        }
      } catch (error) {
        // User is not authenticated, but this isn't an error state we need to display
        console.log('User not authenticated')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuthStatus()
  }, [])

  // Create the value object that will be provided to consumers
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated: !!user,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
