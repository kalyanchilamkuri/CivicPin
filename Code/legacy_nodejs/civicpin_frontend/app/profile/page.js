'use client'

import { useState, useEffect } from 'react'
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api'
import Navbar from '../components/navbar'
import Footer from '../components/footer'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone,
  MapPin,
  Calendar,
  Mail,
  User,
  Clock,
  LogOut,
  Activity,
  Home,
  Plus,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const containerStyle = {
  width: '100%',
  height: '350px',
  borderRadius: '16px',
}

const ProfilePage = () => {
  const [user, setUser] = useState(null)
  const [mapCenter, setMapCenter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('info')
  const router = useRouter()

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
    id: 'google-maps-script',
  })

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/profile`,
          { withCredentials: true }
        )

        if (response.status !== 200) throw new Error('Failed to fetch user data')
        setUser(response.data)

        if (response.data?.address && isLoaded) {
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ address: response.data.address }, (results, status) => {
            if (status === 'OK' && results[0]) {
              setMapCenter(results[0].geometry.location.toJSON())
            } else {
              setMapCenter({ lat: 28.6139, lng: 77.209 })
            }
          })
        } else if (response.data?.location) {
          setMapCenter(response.data.location)
        } else {
          setMapCenter({ lat: 28.6139, lng: 77.209 })
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err.message || 'Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [isLoaded])

  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/logout`, {}, { withCredentials: true })
      router.push('/auth')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  // Animation Variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.1 } }
  }

  const childVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-[#050510] flex flex-col items-center justify-center relative overflow-hidden'>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full"></div>
        <motion.div 
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className='relative z-10 flex flex-col items-center'
        >
          <div className='h-16 w-16 border-4 border-t-blue-500 border-r-indigo-500 border-b-purple-500 border-l-transparent rounded-full animate-spin mb-6'></div>
          <p className='text-gray-300 font-medium tracking-widest uppercase text-sm'>Syncing Profile</p>
        </motion.div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className='min-h-screen bg-[#050510] flex items-center justify-center'>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className='bg-red-900/10 backdrop-blur-xl border border-red-500/20 p-8 rounded-2xl max-w-md w-full text-center'>
          <div className='bg-red-500/20 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-6'>
            <User className='text-red-400 h-8 w-8' />
          </div>
          <h2 className='text-red-100 text-2xl font-bold mb-3'>Authentication Error</h2>
          <p className='text-red-300/80 mb-8'>{error}</p>
          <button onClick={() => router.push('/auth')} className='w-full py-3 px-6 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-all'>
            Return to Login
          </button>
        </motion.div>
      </div>
    )
  }

  if (!user) return null

  const tabs = [
    { id: 'info', label: 'Overview', icon: User },
    { id: 'activity', label: 'Activity Log', icon: Activity },
    { id: 'properties', label: 'Properties', icon: Home }
  ]

  return (
    <div className='min-h-screen bg-[#070714] text-white selection:bg-blue-500/30 flex flex-col font-sans'>
      <Navbar />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 mt-6 relative z-10">
        <motion.div initial="initial" animate="animate" variants={pageVariants} className="space-y-8">
          
          {/* Header Card */}
          <motion.div variants={childVariants} className="relative rounded-3xl overflow-hidden bg-gray-900/40 backdrop-blur-md border border-gray-800 shadow-2xl">
            <div className="h-48 sm:h-64 w-full relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900">
               {/* Abstract Background pattern */}
               <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] blend-overlay"></div>
               <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-40"></div>
               <div className="absolute top-0 -left-12 w-48 h-48 bg-purple-500 rounded-full blur-[80px] opacity-40"></div>
            </div>

            <div className="px-6 sm:px-10 pb-8 relative">
              <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-20 sm:-mt-24 mb-6 relative z-10">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="h-36 w-36 sm:h-40 sm:w-40 rounded-full border-4 border-[#070714] bg-gray-800 overflow-hidden shadow-2xl relative"
                  >
                    <Image
                      src={user.profile_image ? `${process.env.NEXT_PUBLIC_BACKEND_URL}${user.profile_image}` : '/default-avatar.png'}
                      alt="Profile"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </motion.div>
                  <div className="mb-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">{user.name}</h1>
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-gray-400 font-medium">
                      <span className="flex items-center gap-1.5 bg-gray-800/80 px-3 py-1 rounded-full text-sm backdrop-blur-sm border border-gray-700/50">
                        <Mail className="h-4 w-4 text-blue-400" /> {user.email}
                      </span>
                      <span className="flex items-center gap-1.5 bg-gray-800/80 px-3 py-1 rounded-full text-sm backdrop-blur-sm border border-gray-700/50">
                        <TrendingUp className="h-4 w-4 text-green-400" /> Top Contributor
                      </span>
                    </div>
                  </div>
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(220, 38, 38, 0.9)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="mt-6 sm:mt-0 flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-500 hover:text-white border border-red-500/30 rounded-xl font-semibold transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </motion.button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex w-full overflow-x-auto no-scrollbar gap-2 mt-8 border-b border-gray-800 pb-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors rounded-xl ${
                        isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : ''}`} />
                      {tab.label}
                      {isActive && (
                        <motion.div
                          layoutId="activeTabIndicator"
                          className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.5)]"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Dynamic Content */}
          <div className="min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                {/* INFO TAB */}
                {activeTab === 'info' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-6">
                      <div className="bg-gray-900/40 backdrop-blur-md p-6 rounded-3xl border border-gray-800 shadow-xl">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                          <User className="h-5 w-5 text-indigo-400" /> Profile Details
                        </h3>
                        <ul className="space-y-5">
                          {[
                            { label: 'Gender', value: user.gender, icon: User, color: 'text-pink-400', bg: 'bg-pink-400/10' },
                            { label: 'Age', value: `${user.age} years`, icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                            { label: 'Phone', value: user.phone, icon: Phone, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                            { label: 'Member Since', value: user.joinDate || 'Jan 2023', icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-400/10' }
                          ].map((item, i) => (
                            <li key={i} className="flex justify-between items-center p-3 hover:bg-gray-800/50 rounded-xl transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${item.bg}`}>
                                  <item.icon className={`h-5 w-5 ${item.color}`} />
                                </div>
                                <span className="text-gray-400 font-medium">{item.label}</span>
                              </div>
                              <span className="text-white font-semibold text-right">{item.value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="lg:col-span-7">
                      <div className="bg-gray-900/40 backdrop-blur-md p-6 rounded-3xl border border-gray-800 shadow-xl h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-blue-400" /> Location Details
                            </h3>
                            <span className="text-sm bg-gray-800 px-3 py-1 rounded-full text-gray-300 border border-gray-700 truncate max-w-[200px] sm:max-w-xs block">
                              {user.address || 'Unknown Region'}
                            </span>
                        </div>
                        <div className="flex-1 rounded-2xl overflow-hidden border border-gray-700/50 shadow-inner relative group isolate">
                           <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay z-10 pointer-events-none group-hover:bg-transparent transition-colors duration-500"></div>
                          {isLoaded && mapCenter ? (
                            <GoogleMap
                              mapContainerStyle={containerStyle}
                              center={mapCenter}
                              zoom={14}
                              options={{
                                disableDefaultUI: true,
                                zoomControl: true,
                                styles: [
                                  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
                                  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
                                  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
                                  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
                                  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
                                  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
                                  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
                                  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
                                  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
                                  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
                                  { featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
                                  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
                                  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
                                  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
                                  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
                                  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
                                  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
                                  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#023e58' }] },
                                  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
                                  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] }
                                ],
                              }}
                            >
                              <Marker position={mapCenter} icon={{ url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }} />
                            </GoogleMap>
                          ) : (
                            <div className="h-full w-full bg-gray-900 flex items-center justify-center">
                              <div className="animate-pulse flex flex-col items-center">
                                <MapPin className="h-8 w-8 text-gray-700 mb-2" />
                                <div className="h-2 w-24 bg-gray-800 rounded-full"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ACTIVITY TAB */}
                {activeTab === 'activity' && (
                  <div className="bg-gray-900/40 backdrop-blur-md p-8 rounded-3xl border border-gray-800 shadow-xl min-h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                         <Activity className="text-purple-400" /> Recent Activity
                       </h3>
                    </div>
                    
                    {!user.recentActivity || user.recentActivity.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-16 text-center">
                         <div className="bg-gray-800/50 p-6 rounded-full mb-4 ring-1 ring-gray-700">
                           <Award className="h-10 w-10 text-gray-500" />
                         </div>
                         <h4 className="text-xl font-bold text-gray-300 mb-2">No activity right now</h4>
                         <p className="text-gray-500 max-w-sm">Interact with demands, rate properties, or publish your own requests to see them logged here.</p>
                       </div>
                    ) : (
                      <div className="relative border-l-2 border-gray-800 ml-4 space-y-8 pb-4">
                        {user.recentActivity.map((activity, idx) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={idx} 
                            className="relative pl-6 sm:pl-8 group"
                          >
                            <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-gray-900 border-2 border-purple-500 group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(168,85,247,0.4)]"></span>
                            <div className="bg-gray-800/30 hover:bg-gray-800/60 p-5 rounded-2xl border border-gray-700/50 transition-all shadow-md group-hover:shadow-purple-900/10">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                                <h4 className="text-lg font-bold text-purple-300">{activity.action}</h4>
                                <span className="text-xs font-medium text-gray-500 bg-gray-800/80 px-2.5 py-1 rounded-md w-fit">
                                  {activity.timestamp}
                                </span>
                              </div>
                              <p className="text-gray-300 text-base">{activity.description}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* PROPERTIES TAB */}
                {activeTab === 'properties' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-gray-900/40 p-6 rounded-3xl border border-gray-800 backdrop-blur-md">
                      <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                         <Home className="text-green-400" /> Portfolio
                      </h3>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white px-5 py-2.5 rounded-xl font-bold transition-colors border border-green-500/30">
                        <Plus className="h-5 w-5" /> Add Listing
                      </motion.button>
                    </div>

                    {!user.properties || user.properties.length === 0 ? (
                       <div className="bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-3xl py-24 flex flex-col items-center text-center">
                          <div className="bg-gray-800/80 p-8 rounded-full mb-6 ring-1 ring-gray-700 shadow-xl">
                            <Home className="h-16 w-16 text-gray-500" strokeWidth={1} />
                          </div>
                          <h4 className="text-2xl font-bold text-white mb-3">No properties listed</h4>
                          <p className="text-gray-400 max-w-md mx-auto mb-8 text-lg">You haven't added any properties or spaces to your account yet.</p>
                          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                            Publish your first property
                          </button>
                       </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {user.properties.map((prop, idx) => (
                           <motion.div 
                             initial={{ opacity: 0, scale: 0.95 }}
                             animate={{ opacity: 1, scale: 1 }}
                             transition={{ delay: idx * 0.1 }}
                             key={idx} 
                             className="group bg-gray-900/60 rounded-3xl overflow-hidden border border-gray-800 hover:border-green-500/50 transition-all hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                           >
                             <div className="relative h-56 overflow-hidden">
                                <Image src={prop.image || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80'} alt="Property" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                                <div className="absolute bottom-4 left-4 right-4">
                                   <div className="inline-block bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-2 shadow-lg">Active</div>
                                   <h4 className="text-xl font-bold text-white truncate">{prop.title}</h4>
                                </div>
                             </div>
                             <div className="p-5">
                                <p className="flex items-center gap-2 text-gray-400 text-sm mb-4 truncate">
                                   <MapPin className="h-4 w-4" /> {prop.location}
                                </p>
                                <div className="flex justify-between items-center">
                                   <span className="text-2xl font-bold text-blue-400">{prop.price}</span>
                                   <button className="h-10 w-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors text-white">
                                      <ChevronRight className="h-5 w-5" />
                                   </button>
                                </div>
                             </div>
                           </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </motion.div>
      </main>
      
      <Footer />
    </div>
  )
}

export default ProfilePage
