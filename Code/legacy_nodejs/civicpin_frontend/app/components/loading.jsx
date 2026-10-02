import React from 'react';

const Loading = ({text}) => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
            <span className="ml-4 text-xl text-gray-200">{text || "Loading..."}</span>
        </div>
    );
};

export default Loading;