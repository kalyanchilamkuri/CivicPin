"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Frown, Home, RotateCcw } from 'lucide-react';

const NotFound = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [count, setCount] = useState(0);
  
  // Counter animation from 0 to 404
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => {
        if (prev < 404) return prev + Math.ceil((404 - prev) / 10);
        clearInterval(interval);
        return 404;
      });
    }, 40);
    
    return () => clearInterval(interval);
  }, []);
  
  // Set loaded state after component mounts
  useEffect(() => {
    setIsLoaded(true);
    
    // Handle mouse movement for parallax effect
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-blue-500 opacity-10"
            style={{
              width: `${Math.random() * 300 + 50}px`,
              height: `${Math.random() * 300 + 50}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 10 + 5}s`,
              animation: `pulse ${Math.random() * 8 + 4}s infinite alternate ease-in-out`,
            }}
          />
        ))}
      </div>
      
      {/* Glowing circle behind 404 */}
      <div className={`absolute w-64 h-64 rounded-full bg-blue-600 opacity-20 blur-3xl transition-all duration-1000 ${isLoaded ? 'scale-100' : 'scale-0'}`}
        style={{
          transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px) scale(${isLoaded ? 2 : 0})`,
        }}
      />
      
      {/* Main content with parallax effect */}
      <div 
        className={`relative z-10 w-full max-w-lg text-center p-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{
          transform: `translate(${mousePosition.x * 0.2}px, ${mousePosition.y * 0.2}px)`,
        }}
      >
        {/* Animated 404 counter */}
        <h1 className="relative text-9xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          {count}
          <span className="absolute -top-6 -right-6 text-2xl text-blue-400 animate-bounce">!</span>
        </h1>
        
        {/* Animated line */}
        <div className="h-2 w-0 mx-auto bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 my-6 rounded-full transition-all duration-1000 ease-out"
          style={{ width: isLoaded ? '70%' : '0%' }}
        />
        
        <h2 className="text-3xl font-semibold text-zinc-100 mb-4 flex items-center justify-center gap-2">
          <span className="opacity-0 animate-fadeIn" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>Page</span>
          <span className="opacity-0 animate-fadeIn" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>Not</span>
          <span className="opacity-0 animate-fadeIn" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>Found</span>
          <Frown className="ml-2 text-yellow-400 opacity-0 animate-fadeIn" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }} />
        </h2>
        
        <p className="text-lg text-zinc-400 mb-8 opacity-0 animate-fadeIn" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
          The page you are looking for might have been removed, had its name changed, 
          or is temporarily unavailable.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link 
            href="/" 
            className="group px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg transition duration-300 flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transform hover:-translate-y-1"
          >
            <Home className="w-5 h-5 transition-transform group-hover:rotate-12" />
            Return Home
          </Link>
          
          <button 
            onClick={() => window.history.back()} 
            className="group px-6 py-3 bg-zinc-700 text-zinc-100 rounded-lg transition duration-300 flex items-center gap-2 hover:bg-zinc-600 transform hover:-translate-y-1"
          >
            <RotateCcw className="w-5 h-5 transition-transform group-hover:rotate-90" />
            Go Back
          </button>
        </div>
      </div>
      
      {/* CSS animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.1); opacity: 0.15; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default NotFound;