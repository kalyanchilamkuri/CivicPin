"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import '../components/k.css';

export default function TermsAndConditions({ onAccept }) {
  const [accepted, setAccepted] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Start entrance animation after component mounts
    setAnimateIn(true);
    
    // Create a highlight effect that moves through sections
    const interval = setInterval(() => {
      const sections = [1, 2, 3, 4, 5, 6, 7, 8];
      const randomSection = sections[Math.floor(Math.random() * sections.length)];
      setHighlightedSection(randomSection);
      
      // Clear highlight after a short period
      setTimeout(() => setHighlightedSection(null), 1500);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  const handleAccept = () => {
    setAccepted(true);
    setShowConfetti(true);
    
    // Reset confetti after animation completes
    setTimeout(() => setShowConfetti(false), 4000);
    
    // Call the onAccept prop if provided
    if (onAccept) onAccept();
    
    // Redirect to /auth route after a brief delay to show effects
    setTimeout(() => router.push("/auth"), 2500);
  };

  const toggleSection = (section) => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
    }
  };

  return (
    <div className={`fixed inset-0 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden transition-all duration-1000 ${animateIn ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, index) => (
          <div 
            key={index}
            className="absolute rounded-full bg-blue-500 opacity-5"
            style={{
              width: `${Math.random() * 300 + 100}px`,
              height: `${Math.random() * 300 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 8 + 5}s`,
              transform: `scale(${Math.random() * 0.5 + 0.5})`,
              filter: 'blur(80px)',
              animation: 'floatBubble 15s infinite ease-in-out'
            }}
          />
        ))}
        
        {/* Animated radial gradient overlay */}
        <div className="absolute inset-0 bg-radial-pattern opacity-20 animate-pulse"></div>
        
        {/* Animated line patterns */}
        <div className="absolute inset-0 bg-line-pattern opacity-5"></div>
      </div>
      
      <header className={`relative z-10 border-b border-gray-700/50 p-6 shadow-xl transition-all duration-700 transform ${animateIn ? 'translate-y-0' : '-translate-y-20'}`}>
        <div className="max-w-7xl mx-auto relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg opacity-30 blur-lg"></div>
          <div className="relative bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg border border-gray-700/50 overflow-hidden">
            {/* Animated header accent line */}
            <div className="absolute h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 top-0 left-0 right-0 bg-animate-flow"></div>
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight text-center">Terms and Conditions</h1>
          </div>
        </div>
      </header>
      
      <main className="flex-grow overflow-hidden relative z-10">
        <div className={`max-w-7xl mx-auto p-6 h-full flex flex-col transition-all duration-1000 transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
          {/* The scrollbar-hide class removes visible scrollbar while preserving functionality */}
          <div className="flex-grow overflow-y-auto scrollbar-hide bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl p-8 relative">
            {/* Floating particles that react to scroll */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(30)].map((_, index) => (
                <div 
                  key={index}
                  className="absolute w-2 h-2 rounded-full bg-blue-500/20"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    transform: 'translateY(0px)',
                    transition: 'transform 0.5s ease-out',
                    animationDelay: `${Math.random() * 5}s`,
                  }}
                />
              ))}
            </div>
            
            <div className="relative">
              {/* Glowing section indicator with pulse animation */}
              {highlightedSection && (
                <div className="absolute -left-4 transform -translate-x-full top-1/3 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-500 opacity-70 animate-ping"></div>
                  <div className="h-4 w-4 rounded-full bg-blue-300 absolute left-2 animate-pulse"></div>
                </div>
              )}
              
              <section className="mb-8">
                <p className="mb-6 text-lg leading-relaxed text-gray-200">
                  Welcome to our platform. This document outlines the terms and conditions for using our services. By accessing or using our platform, you agree to be bound by these terms and conditions. Please read them carefully before proceeding.
                </p>
              </section>
              
              {/* Section with enhanced animations and styling */}
              <section className={`mb-8 transition-all duration-500 ${highlightedSection === 1 ? 'scale-[1.01] brightness-125' : ''}`}>
                <h2 onClick={() => toggleSection(1)} className="text-2xl font-bold mb-4 border-b border-gray-600/50 pb-2 cursor-pointer flex items-center group">
                  <span className="mr-2 relative">
                    {/* Animated number indicator */}
                    <span className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-sm font-normal">1</span>
                    
                    {/* Text with gradient */}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">User Agreement</span>
                  </span>
                  
                  {/* Enhanced dropdown icon with animation */}
                  <span className={`text-blue-400 text-sm transition-transform duration-300 ${activeSection === 1 ? 'rotate-180' : 'rotate-0'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </h2>
                
                {/* Enhanced content area with staggered animations */}
                <div className={`relative overflow-hidden transition-all duration-500 ${activeSection === 1 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {/* Left border accent with animation */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-blue-500 rounded animate-pulse"></div>
                  
                  {/* Content with background gradient */}
                  <div className="space-y-4 text-gray-200 leading-relaxed pl-6 py-4 ml-2 bg-gradient-to-r from-blue-900/10 to-transparent rounded-l">
                    <p className="transform transition-all duration-300 delay-75" style={{ opacity: activeSection === 1 ? 1 : 0, transform: activeSection === 1 ? 'translateX(0)' : 'translateX(-10px)' }}>1.1. You must be at least 18 years old to use our services.</p>
                    <p className="transform transition-all duration-300 delay-150" style={{ opacity: activeSection === 1 ? 1 : 0, transform: activeSection === 1 ? 'translateX(0)' : 'translateX(-10px)' }}>1.2. You are responsible for maintaining the confidentiality of your account and password.</p>
                    <p className="transform transition-all duration-300 delay-200" style={{ opacity: activeSection === 1 ? 1 : 0, transform: activeSection === 1 ? 'translateX(0)' : 'translateX(-10px)' }}>1.3. You agree to accept responsibility for all activities that occur under your account or password.</p>
                    <p className="transform transition-all duration-300 delay-300" style={{ opacity: activeSection === 1 ? 1 : 0, transform: activeSection === 1 ? 'translateX(0)' : 'translateX(-10px)' }}>1.4. You must provide accurate, current, and complete information during the registration process.</p>
                    <p className="transform transition-all duration-300 delay-400" style={{ opacity: activeSection === 1 ? 1 : 0, transform: activeSection === 1 ? 'translateX(0)' : 'translateX(-10px)' }}>1.5. We reserve the right to refuse service, terminate accounts, or cancel orders at our discretion.</p>
                  </div>
                </div>
              </section>
              
              {/* Repeat the enhanced styling for other sections as well */}
              <section className={`mb-8 transition-all duration-500 ${highlightedSection === 2 ? 'scale-[1.01] brightness-125' : ''}`}>
                <h2 onClick={() => toggleSection(2)} className="text-2xl font-bold mb-4 border-b border-gray-600/50 pb-2 cursor-pointer flex items-center group">
                  <span className="mr-2 relative">
                    <span className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-sm font-normal">2</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">Privacy Policy</span>
                  </span>
                  <span className={`text-blue-400 text-sm transition-transform duration-300 ${activeSection === 2 ? 'rotate-180' : 'rotate-0'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </h2>
                <div className={`relative overflow-hidden transition-all duration-500 ${activeSection === 2 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-blue-500 rounded animate-pulse"></div>
                  <div className="space-y-4 text-gray-200 leading-relaxed pl-6 py-4 ml-2 bg-gradient-to-r from-blue-900/10 to-transparent rounded-l">
                    <p className="transform transition-all duration-300 delay-75" style={{ opacity: activeSection === 2 ? 1 : 0, transform: activeSection === 2 ? 'translateX(0)' : 'translateX(-10px)' }}>2.1. We respect your privacy and are committed to protecting it.</p>
                    <p className="transform transition-all duration-300 delay-150" style={{ opacity: activeSection === 2 ? 1 : 0, transform: activeSection === 2 ? 'translateX(0)' : 'translateX(-10px)' }}>2.2. We collect and process your personal data in accordance with our Privacy Policy.</p>
                    <p className="transform transition-all duration-300 delay-200" style={{ opacity: activeSection === 2 ? 1 : 0, transform: activeSection === 2 ? 'translateX(0)' : 'translateX(-10px)' }}>2.3. We use cookies and similar technologies to enhance your browsing experience, analyze website traffic, and personalize content.</p>
                    <p className="transform transition-all duration-300 delay-300" style={{ opacity: activeSection === 2 ? 1 : 0, transform: activeSection === 2 ? 'translateX(0)' : 'translateX(-10px)' }}>2.4. We may share your information with third-party service providers who help us operate our platform.</p>
                    <p className="transform transition-all duration-300 delay-400" style={{ opacity: activeSection === 2 ? 1 : 0, transform: activeSection === 2 ? 'translateX(0)' : 'translateX(-10px)' }}>2.5. You have the right to access, correct, or delete your personal data at any time.</p>
                  </div>
                </div>
              </section>

              
<section className={`mb-8 transition-all duration-500 ${highlightedSection === 3 ? 'scale-[1.01] brightness-125' : ''}`}>
  <h2 onClick={() => toggleSection(3)} className="text-2xl font-bold mb-4 border-b border-gray-600/50 pb-2 cursor-pointer flex items-center group">
    <span className="mr-2 relative">
      <span className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-sm font-normal">3</span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">Payment Terms</span>
    </span>
    <span className={`text-blue-400 text-sm transition-transform duration-300 ${activeSection === 3 ? 'rotate-180' : 'rotate-0'}`}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  </h2>
  <div className={`relative overflow-hidden transition-all duration-500 ${activeSection === 3 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-blue-500 rounded animate-pulse"></div>
    <div className="space-y-4 text-gray-200 leading-relaxed pl-6 py-4 ml-2 bg-gradient-to-r from-blue-900/10 to-transparent rounded-l">
      <p className="transform transition-all duration-300 delay-75" style={{ opacity: activeSection === 3 ? 1 : 0, transform: activeSection === 3 ? 'translateX(0)' : 'translateX(-10px)' }}>3.1. All subscription plans are billed automatically according to your selected billing cycle.</p>
      <p className="transform transition-all duration-300 delay-150" style={{ opacity: activeSection === 3 ? 1 : 0, transform: activeSection === 3 ? 'translateX(0)' : 'translateX(-10px)' }}>3.2. Subscription fees are non-refundable except where required by law.</p>
      <p className="transform transition-all duration-300 delay-200" style={{ opacity: activeSection === 3 ? 1 : 0, transform: activeSection === 3 ? 'translateX(0)' : 'translateX(-10px)' }}>3.3. You can cancel your subscription at any time, with access continuing until the end of your billing period.</p>
      <p className="transform transition-all duration-300 delay-300" style={{ opacity: activeSection === 3 ? 1 : 0, transform: activeSection === 3 ? 'translateX(0)' : 'translateX(-10px)' }}>3.4. Prices are subject to change with 30 days notice before the change becomes effective.</p>
      <p className="transform transition-all duration-300 delay-400" style={{ opacity: activeSection === 3 ? 1 : 0, transform: activeSection === 3 ? 'translateX(0)' : 'translateX(-10px)' }}>3.5. We use industry-standard security measures to protect your payment information.</p>
    </div>
  </div>
</section>

    
           
<section className={`mb-8 transition-all duration-500 ${highlightedSection === 4 ? 'scale-[1.01] brightness-125' : ''}`}>
  <h2 onClick={() => toggleSection(4)} className="text-2xl font-bold mb-4 border-b border-gray-600/50 pb-2 cursor-pointer flex items-center group">
    <span className="mr-2 relative">
      <span className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-sm font-normal">4</span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">Content Guidelines</span>
    </span>
    <span className={`text-blue-400 text-sm transition-transform duration-300 ${activeSection === 4 ? 'rotate-180' : 'rotate-0'}`}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  </h2>
  <div className={`relative overflow-hidden transition-all duration-500 ${activeSection === 4 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-blue-500 rounded animate-pulse"></div>
    <div className="space-y-4 text-gray-200 leading-relaxed pl-6 py-4 ml-2 bg-gradient-to-r from-blue-900/10 to-transparent rounded-l">
      <p className="transform transition-all duration-300 delay-75" style={{ opacity: activeSection === 4 ? 1 : 0, transform: activeSection === 4 ? 'translateX(0)' : 'translateX(-10px)' }}>4.1. You retain ownership rights to content you upload to our platform.</p>
      <p className="transform transition-all duration-300 delay-150" style={{ opacity: activeSection === 4 ? 1 : 0, transform: activeSection === 4 ? 'translateX(0)' : 'translateX(-10px)' }}>4.2. Content must not violate any laws or infringe on intellectual property rights.</p>
      <p className="transform transition-all duration-300 delay-200" style={{ opacity: activeSection === 4 ? 1 : 0, transform: activeSection === 4 ? 'translateX(0)' : 'translateX(-10px)' }}>4.3. Prohibited content includes hate speech, harassment, explicit material, and misinformation.</p>
      <p className="transform transition-all duration-300 delay-300" style={{ opacity: activeSection === 4 ? 1 : 0, transform: activeSection === 4 ? 'translateX(0)' : 'translateX(-10px)' }}>4.4. We reserve the right to remove any content that violates these guidelines.</p>
      <p className="transform transition-all duration-300 delay-400" style={{ opacity: activeSection === 4 ? 1 : 0, transform: activeSection === 4 ? 'translateX(0)' : 'translateX(-10px)' }}>4.5. Repeated violations may result in account suspension or termination.</p>
    </div>
  </div>
</section>
              
<section className={`mb-8 transition-all duration-500 ${highlightedSection === 5 ? 'scale-[1.01] brightness-125' : ''}`}>
  <h2 onClick={() => toggleSection(5)} className="text-2xl font-bold mb-4 border-b border-gray-600/50 pb-2 cursor-pointer flex items-center group">
    <span className="mr-2 relative">
      <span className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-sm font-normal">5</span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-300">Security Measures</span>
    </span>
    <span className={`text-blue-400 text-sm transition-transform duration-300 ${activeSection === 5 ? 'rotate-180' : 'rotate-0'}`}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  </h2>
  <div className={`relative overflow-hidden transition-all duration-500 ${activeSection === 5 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-blue-500 rounded animate-pulse"></div>
    <div className="space-y-4 text-gray-200 leading-relaxed pl-6 py-4 ml-2 bg-gradient-to-r from-blue-900/10 to-transparent rounded-l">
      <p className="transform transition-all duration-300 delay-75" style={{ opacity: activeSection === 5 ? 1 : 0, transform: activeSection === 5 ? 'translateX(0)' : 'translateX(-10px)' }}>5.1. We implement industry-standard security protocols to protect your data.</p>
      <p className="transform transition-all duration-300 delay-150" style={{ opacity: activeSection === 5 ? 1 : 0, transform: activeSection === 5 ? 'translateX(0)' : 'translateX(-10px)' }}>5.2. All data transmissions are encrypted using SSL/TLS technology.</p>
      <p className="transform transition-all duration-300 delay-200" style={{ opacity: activeSection === 5 ? 1 : 0, transform: activeSection === 5 ? 'translateX(0)' : 'translateX(-10px)' }}>5.3. We regularly conduct security audits and vulnerability assessments.</p>
      <p className="transform transition-all duration-300 delay-300" style={{ opacity: activeSection === 5 ? 1 : 0, transform: activeSection === 5 ? 'translateX(0)' : 'translateX(-10px)' }}>5.4. Two-factor authentication is available and recommended for all accounts.</p>
      <p className="transform transition-all duration-300 delay-400" style={{ opacity: activeSection === 5 ? 1 : 0, transform: activeSection === 5 ? 'translateX(0)' : 'translateX(-10px)' }}>5.5. You are responsible for maintaining the security of your login credentials.</p>
    </div>
  </div>
</section>

              
              
              {/* Add similar enhancements for sections 3-8 */}
              
              <p className="italic text-sm text-gray-400 text-right pt-6 border-t border-gray-700/50 mt-8">Last updated: March 17, 2025</p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Enhanced footer with acceptance animations */}
      <footer className={`relative z-10 border-t border-gray-700/50 p-5 shadow-inner backdrop-blur-sm transition-all duration-1000 transform ${animateIn ? 'translate-y-0' : 'translate-y-20'} ${accepted ? 'bg-gradient-to-r from-green-900/30 to-blue-900/30' : ''}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className={`text-sm transition-all duration-500 ${accepted ? 'text-green-300' : 'text-gray-400'}`}>
            By clicking "Accept", you acknowledge that you have read and understood these terms and agree to be bound by them.
          </p>
          
          <div className="flex flex-col items-center">
            {/* Confetti effect container */}
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                {[...Array(50)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute w-2 h-6 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: '0%',
                      backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
                      transform: `rotate(${Math.random() * 360}deg)`,
                      animation: `fall ${Math.random() * 3 + 2}s linear forwards`,
                      animationDelay: `${Math.random() * 0.5}s`,
                    }}
                  ></div>
                ))}
              </div>
            )}
            
            <div className="relative group">
              {/* Enhanced button glow effect */}
              <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 ${accepted ? 'opacity-30 bg-gradient-to-r from-green-500 to-emerald-500' : 'animate-pulse'}`}></div>
              
              {/* Enhanced button with animated checkmark */}
              <button
                onClick={handleAccept}
                disabled={accepted}
                className={`relative px-10 py-4 text-white font-semibold rounded-lg transition duration-300 transform group-hover:scale-105 shadow-lg flex items-center justify-center ${
                  accepted 
                    ? "bg-gradient-to-r from-green-600 to-emerald-700 cursor-not-allowed" 
                    : "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 active:from-blue-700 active:to-indigo-800"
                }`}
              >
                {accepted ? (
                  <>
                    <span className="mr-2">Terms Accepted</span> 
                    <span className="checkmark">✓</span>
                  </>
                ) : (
                  "I Accept These Terms"
                )}
                
                {/* Button hover effect */}
                <span className="absolute inset-0 overflow-hidden rounded-lg">
                  <span className="absolute -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-white opacity-10 animate-button-shine"></span>
                </span>
              </button>
            </div>
            
            {!accepted && (
              <p className="text-gray-400 text-sm mt-3 animate-pulse">
                Please read the terms carefully before accepting
              </p>
            )}
            
            {accepted && (
              <div className="mt-3 flex flex-col items-center">
                <p className="text-green-400 text-sm animate-bounce">
                  Thank you for accepting our terms
                </p>
                <p className="text-blue-300 text-xs mt-1">
                  Redirecting ...
                </p>
              </div>
            )}
          </div>
        </div>
      </footer>
      
      {/* CSS for animations and effects */}
      <style jsx>{`
        /* Background patterns */
        .bg-radial-pattern {
          background-image: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);
        }
        
        .bg-line-pattern {
          background-image: 
            linear-gradient(to right, rgba(100, 116, 139, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(100, 116, 139, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        
        /* Animations */
        @keyframes floatBubble {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
          50% { transform: translateY(-20px) scale(1.05); opacity: 0.8; }
        }
        
        @keyframes fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        
        @keyframes button-shine {
          from { transform: translateX(-100%) skewX(12deg); }
          to { transform: translateX(200%) skewX(12deg); }
        }
        
        .animate-button-shine {
          animation: button-shine 8s infinite;
        }
        
        .bg-animate-flow {
          background-size: 200% 100%;
          animation: flow 2s linear infinite;
        }
        
        @keyframes flow {
          0% { background-position: 0 0; }
          100% { background-position: 200% 0; }
        }
        
        /* Checkmark animation */
        .checkmark {
          display: inline-block;
          transform: scale(0);
          opacity: 0;
          animation: checkmark-appear 0.8s forwards;
        }
        
        @keyframes checkmark-appear {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.5); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}


