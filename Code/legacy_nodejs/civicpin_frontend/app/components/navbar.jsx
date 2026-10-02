'use client'

import { Search, MapPin, Route, Home } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useUserContext } from './user_context'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Navbar() {
  const router = useRouter()
  const { overlayOn, user } = useUserContext()
  const [activeTab, setActiveTab] = useState('/home')
  
  const profileImageUrl = user?.profileImage
    ? `/api/uploads/${user.profileImage}`
    : '/default-avatar.png'

  const NavItem = ({ href, icon: Icon, title, isActive = false }) => (
    <Link 
      href={href} 
      className="group relative flex items-center"
      onClick={() => setActiveTab(href)}
    >
      <div className={`
        relative p-2 rounded-xl transition-all duration-300 
        ${activeTab === href 
          ? 'bg-gradient-to-br from-blue-500/30 to-blue-500/40 shadow-md' 
          : 'hover:bg-white/10'
        }
      `}>
        <Icon 
          className={`
            w-5 h-5 transition-all duration-300 
            ${activeTab === href 
              ? 'text-blue-400' 
              : 'text-white/70 group-hover:text-white'
            }
          `}
        />
        {activeTab === href && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-zinc-400 rounded-full animate-pulse"></span>
        )}
        <div className='
          absolute -bottom-8 left-1/2 -translate-x-1/2 
          bg-black/80 text-white 
          px-2 py-1 rounded-full 
          text-xs opacity-0 group-hover:opacity-100 
          transition-all duration-300 
          whitespace-nowrap
          pointer-events-none
          z-50
        '>
          {title}
        </div>
      </div>
    </Link>
  )

  return (
    <nav
      className='
      fixed top-3 left-1/2 -translate-x-1/2 z-50 
      bg-gradient-to-br from-gray-900/70 to-gray-800/70 
      backdrop-blur-2xl 
      shadow-lg shadow-blue-500/20 
      flex items-center justify-between 
      px-10 py-3 
      rounded-xl 
      w-[95%] max-w-6xl
      border border-white/10
      transition-all duration-500 
      hover:shadow-blue-500/30
    '
    >
      {/* Left Section - Logo and Text */}
      <div className='flex items-center gap-3'>
        {/* Logo */}
        <Link href='/landing' className='group'>
          <div
            className='
            w-10 h-10 
            relative 
            transition-all duration-300 
            hover:scale-110
          '
          >
            <Image
              className='object-contain transition-all duration-300'
              src='/logo.png'
              fill
              sizes='40px'
              alt='civicpin'
              priority
              style={{ borderRadius: '50%' }}
            />
          </div>
        </Link>

        {/* Brand Name */}
        <Link href='/'>
          <h1 className='text-gray-100  font-bold text-xl tracking-wide'>
            CivicPin
          </h1>
        </Link>
      </div>

      {/* Center Section - Navigation Icons */}
      <div
        className='
        flex items-center 
        justify-center 
        space-x-8
        px-4
      '
      >
        <NavItem href='/' icon={Home} title='Go Home' />
        <NavItem href='/raise-request' icon={MapPin} title='Raise a Request' />
        <NavItem
          href='/property'
          icon={Route}
          title='Raise Property'
          isActive={overlayOn}
        />
        <NavItem href='/search-demands' icon={Search} title='Search Demands' />
      </div>

      {/* Right Section - Profile */}
      <div>
        <Link href='/profile' className='group'>
          <div
            className='
            w-9 h-9 
            rounded-full 
            overflow-hidden 
            border-2 border-white/20 
            transition-all duration-300 
            hover:border-blue-500/50
            hover:scale-110 
          '
          >
            <Image
              src={
                 '/default-avatar.png'
              }
              width={36}
              height={36}
              alt='Profile'
              priority
              className='
               object-cover 
               w-full h-full 
               transition-all duration-300 
               group-hover:brightness-90 
               ring-1 ring-white/20 
               group-hover:ring-blue-500/30
             '
            />
          </div>
        </Link>
      </div>
    </nav>
  )
}
