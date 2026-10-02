'use client'

import { useEffect, useRef, useCallback } from 'react'
import Script from 'next/script'
import axios from 'axios'
import { toast } from 'react-toastify'

// Renders Google's "Sign in with Google" button and exchanges the resulting
// ID token with our backend (/api/auth/google) for a session cookie.
const GoogleSignInButton = ({ onSuccess }) => {
  const buttonRef = useRef(null)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  const handleCredentialResponse = useCallback(
    async (response) => {
      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/google`,
          { credential: response.credential },
          { withCredentials: true }
        )

        if (data && data.success) {
          toast.success('Signed in with Google!')
          onSuccess?.(data.user)
        } else {
          toast.error('Google sign-in failed. Please try again.')
        }
      } catch (error) {
        toast.error(
          error.response?.data?.error || 'Google sign-in failed. Please try again.'
        )
      }
    },
    [onSuccess]
  )

  const initializeGoogleButton = useCallback(() => {
    if (!clientId || !window.google || !buttonRef.current) return

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
    })

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'continue_with',
    })
  }, [clientId, handleCredentialResponse])

  useEffect(() => {
    // In case the script already loaded (e.g. navigating between login/signup)
    if (window.google) {
      initializeGoogleButton()
    }
  }, [initializeGoogleButton])

  if (!clientId) {
    return null
  }

  return (
    <div className='w-full flex justify-center'>
      <Script
        src='https://accounts.google.com/gsi/client'
        strategy='afterInteractive'
        onLoad={initializeGoogleButton}
      />
      <div ref={buttonRef} />
    </div>
  )
}

export default GoogleSignInButton
