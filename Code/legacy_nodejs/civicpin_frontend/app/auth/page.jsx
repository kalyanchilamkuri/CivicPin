'use client'

import { useState, useEffect, useRef } from 'react'
import Login from '../components/login'
import SignupPage from '../components/signup'
import RotatingEarth from '../components/RotatingEarth'
import { Camera, Upload } from 'lucide-react'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null)
  const [profilePhoto, setProfilePhoto] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setProfilePhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current.click()
  }

  return (
    <div className='flex min-h-screen bg-gradient-to-b from-black via-blue-950 to-black w-full items-center justify-center overflow-hidden px-4 py-8 sm:px-6 md:px-8'>
      <div className='relative flex flex-col md:flex-row w-full max-w-6xl h-auto md:h-[85vh] shadow-2xl rounded-3xl overflow-hidden backdrop-blur-sm'>
        {/* Earth Animation Section */}
        <div
          className={`flex-1 flex items-center justify-center transition-all duration-700 ease-in-out ${
            isLogin ? 'md:order-last' : ''
          } relative overflow-hidden rounded-t-3xl md:rounded-t-none ${
            isLogin ? 'md:rounded-r-3xl' : 'md:rounded-l-3xl'
          } min-h-[30vh] md:min-h-full`}
        >
          {loading && (
            <div className='absolute inset-0 z-20 flex items-center justify-center bg-black'>
              <div className='w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
            </div>
          )}

          <div
            className={`absolute inset-0 transition-opacity duration-1000 ${
              loading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <RotatingEarth />
          </div>

          <div className='relative z-10 text-center px-4 sm:px-8 max-w-md'>
            <div className='text-xl sm:text-2xl text-gray-200 drop-shadow-md'>
              {isLogin ? (
                'Your journey continues here'
              ) : (
                <div className='mb-8 flex flex-col items-center'>
                  <div
                    className='relative w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gray-700 border-4 border-gray-600 mb-4 cursor-pointer'
                    onClick={triggerFileInput}
                  >
                    {profilePhotoPreview ? (
                      <img
                        src={profilePhotoPreview}
                        alt='Profile preview'
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <div className='flex items-center justify-center h-full'>
                        <Camera className='w-8 h-8 sm:w-10 sm:h-10 text-gray-400' />
                      </div>
                    )}
                    <div
                      className='absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 cursor-pointer'
                      onClick={triggerFileInput}
                    >
                      <Upload className='w-3 h-3 sm:w-4 sm:h-4' />
                    </div>
                  </div>
                  <input
                    type='file'
                    ref={fileInputRef}
                    onChange={handlePhotoChange}
                    accept='image/*'
                    className='hidden'
                  />
                  <p className='text-gray-300 text-xs sm:text-sm'>
                    Upload profile photo
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className='absolute inset-0 bg-gradient-to-r from-blue-900/40 to-black/70 z-0'></div>
        </div>

        {/* Form Section */}
        <div className='flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-grey dark:bg-gray-900 rounded-b-3xl md:rounded-b-none ${isLogin ? "md:rounded-l-3xl" : "md:rounded-r-3xl"} '>
          <div className='w-full max-w-md'>
            <div className='mb-6 md:mb-8'>
              <h2 className='text-2xl md:text-3xl font-bold text-center text-white dark:text-white'>
                {isLogin ? 'Log In' : 'Create Account'}
              </h2>
              <div className='h-1 w-16 md:w-20 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mt-2 rounded-full'></div>
            </div>

            {isLogin ? (
              <Login setIsLogin={setIsLogin} />
            ) : (
              <SignupPage setIsLogin={setIsLogin} profilePhoto={profilePhoto} />
            )}

            <div className='mt-4 text-center'>
              <p className='text-gray-600 dark:text-gray-400'>
                {isLogin
                  ? "Don't have an account?"
                  : 'Already have an account?'}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className='ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline transition-colors'
                >
                  {isLogin ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced decorative elements */}
      <div className='fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0'>
        <div className='absolute -top-24 -left-24 w-48 sm:w-64 h-48 sm:h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse'></div>
        <div className='absolute top-10 -right-20 w-64 sm:w-80 h-64 sm:h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse'></div>
        <div className='absolute -bottom-20 left-40 w-56 sm:w-72 h-56 sm:h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse'></div>
      </div>
    </div>
  )
}
