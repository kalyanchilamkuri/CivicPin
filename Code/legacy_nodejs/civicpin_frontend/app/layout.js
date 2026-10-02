'use client'
import { Geist, Geist_Mono } from 'next/font/google'
import { useEffect } from 'react'
import 'tailwindcss/tailwind.css'

import './globals.css'
import { UserProvider } from './components/user_context'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useState } from 'react'
import Cursor from './components/ui/cursor'
import ClickSpark from './components/ui/ClickSpark'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export default function RootLayout({ children }) {
  const [isLogin, setIsLogin] = useState(false)

  // // State to track whether to show cursor based on performance
  // const [showCursor, setShowCursor] = useState(true);
  
  // // Effect to monitor performance and disable cursor if needed
  // useEffect(() => {
  //   let lastTime = performance.now();
  //   let frameCount = 0;
  //   let lowPerformanceCount = 0;
    
  //   const checkPerformance = () => {
  //     const now = performance.now();
  //     const elapsed = now - lastTime;
  //     frameCount++;
      
  //     // Check every second
  //     if (elapsed >= 1000) {
  //       const fps = frameCount / (elapsed / 1000);
        
  //       // If FPS is below threshold, increment counter
  //       if (fps < 30) {
  //         lowPerformanceCount++;
  //         if (lowPerformanceCount >= 3 && showCursor) {
  //           setShowCursor(false);
  //         }
  //       } else {
  //         // Reset counter if performance improves
  //         lowPerformanceCount = 0;
  //         if (!showCursor) {
  //           setShowCursor(true);
  //         }
  //       }
        
  //       frameCount = 0;
  //       lastTime = now;
  //     }
      
  //     requestAnimationFrame(checkPerformance);
  //   };
    
  //   requestAnimationFrame(checkPerformance);
    
  //   return () => cancelAnimationFrame(checkPerformance);
  // }, [showCursor]);

  return (
    <html lang='en' style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
      <head>
        <link rel='icon' href='/favicon.ico' sizes='any' />

        <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
        <link rel='manifest' href='/site.webmanifest' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <meta name='description' content='CivicPin - Your Crowd-Driven Infrastructure.' />
        <meta name='theme-color' content='#000000' />

        <title>CivicPin</title>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UserProvider>
          <ClickSpark
            sparkColor='#fff'
            sparkSize={10}
            sparkRadius={15}
            sparkCount={8}
            duration={400}
          >
          <ToastContainer position='top-right' autoClose={3000} />
            {children}
            {/* Your content here */}
          </ClickSpark>
        </UserProvider>
      </body>
    </html>
  )
}
