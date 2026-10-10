import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import SplitText from "@/app/ui_comp/text";
import DecryptedText from "@/app/ui_comp/de_para"

export default function LandingPage() {
    const [animate, setAnimate] = useState(false);
    const [contentChanged, setContentChanged] = useState(false);

    const handleClick = () => {
        setAnimate(true);
        setTimeout(() => setContentChanged(true), 1000);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
            <motion.div
                className="relative text-center text-white px-6"
                animate={animate ? { x: "-50%", y: "40%" } : { x: 0, y: 0 }}
                transition={{ duration: 1, ease: "easeInOut" }}
            >
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                >
                    {!contentChanged ? (
                        <div className={`flex flex-col transition-opacity duration-1000 ${animate ? 'opacity-0' : 'opacity-100'}`}>
                            <div className="flex justify-center mt-24 mb-2">
                                <Image
                                    src="/logo.png"
                                    width={100}
                                    height={100}
                                    alt="civicpin"
                                />
                            </div>
                            <div className="flex justify-center mb-4 mt-[-24]">
                                <h1 className="text-7xl font-extrabold bg-clip-text text-transparent bg-gray-300 tracking-tight">
                                    CivicPin
                                </h1>
                            </div>

                            <SplitText
                                text="Empowering Communities Through"
                                className="text-xl italic text-center"
                                delay={100}
                                animationFrom={{ opacity: 0, transform: 'translate3d(0,50px,0)' }}
                                animationTo={{ opacity: 1, transform: 'translate3d(0,0,0)' }}
                                easing="easeOutCubic"
                                threshold={0.2}
                                rootMargin="-50px"
                            />
                            <SplitText
                                text="Smart Infrastructure!"
                                className="text-xl italic text-center"
                                delay={300}
                                animationFrom={{ opacity: 0, transform: 'translate3d(0,50px,0)' }}
                                animationTo={{ opacity: 1, transform: 'translate3d(0,0,0)' }}
                                easing="easeOutCubic"
                                threshold={0.2}
                                rootMargin="-50px"
                            />

                            <button
                                className="mt-12 bg-white text-black text-lg font-medium px-6 py-3 rounded-full hover:bg-gray-300 transition"
                                onClick={handleClick}
                            >
                                Learn More →
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className={`flex flex-col items-start ml-12 transition-opacity duration-1000 ${animate ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="flex justify-center mb-4 mt-[-24]">
                                <h1 className="text-7xl font-extrabold bg-clip-text text-transparent bg-gray-300 tracking-tight">
                                    CivicPin
                                </h1>
                            </div>
                                <div className="w-80 h-1 bg-blue-500 mb-12"></div>

                                <DecryptedText
                                    text="CivicPin is a revolutionary platform that enables communities"
                                    className="text-xl italic"
                                    animateOn="view"
                                    speed={100}
                                    maxIterations={20}
                                    revealDirection="center"
                                    useOriginalCharsOnly="true"
                                    parentClassName="text-xl italic"
                                />
                                <DecryptedText
                                    text="to voice their needs for essential infrastructure. Pin locations,"
                                    className="text-xl italic"
                                    animateOn="view"
                                    speed={100}
                                    maxIterations={20}
                                    revealDirection="center"
                                    useOriginalCharsOnly="true"
                                    parentClassName="text-xl italic"
                                />
                                <DecryptedText
                                    text="upvote needed services, and help shape the future of your"
                                    className="text-xl italic"
                                    animateOn="view"
                                    speed={100}
                                    maxIterations={20}
                                    revealDirection="center"
                                    useOriginalCharsOnly="true"
                                    parentClassName="text-xl italic"
                                />
                                <DecryptedText
                                    text="community. Our ML-powered insights help businesses and"
                                    className="text-xl italic"
                                    animateOn="view"
                                    speed={100}
                                    maxIterations={20}
                                    revealDirection="center"
                                    useOriginalCharsOnly="true"
                                    parentClassName="text-xl italic"
                                />
                                <DecryptedText
                                    text="policymakers make data-driven infrastructure decisions."
                                    className="text-xl italic"
                                    animateOn="view"
                                    speed={100}
                                    maxIterations={20}
                                    revealDirection="center"
                                    useOriginalCharsOnly="true"
                                    parentClassName="text-xl italic"
                                />

                                <Link href="/auth">
                                    <button className="mt-6 bg-blue-500 text-white text-lg font-medium px-6 py-3 rounded-full hover:bg-blue-600 transition">
                                        Get Started →
                                    </button>
                                </Link>
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>

            <motion.div
                className={animate ? 'mt-24' : 'mt-32'}
                animate={animate ? { rotate: 90, x: "60%", y: "-60%" } : { rotate: 0, x: 0, y: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
            >
                <Image
                    src="https://freesvg.org/img/3d-Earth-Globe.png"
                    alt="Earth view from space"
                    height={600}
                    width={600}
                />
            </motion.div>
        </div>
    );
}
