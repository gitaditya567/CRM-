import React from 'react';

const ScrollingBanner = () => {
    const messages = [
        "🚀 Welcome to TeamInspire Business Solutions - Your Partner in Growth!",
        "✨ Elevate Your Commercial Kitchen Experience with Professional Gear",
        "🛠️ Premium Spares & Service Support Available 24/7",
        "📈 Track Your Leads and Quotations Seamlessly",
        "🌟 Quality You Can Trust, Service You Can Count On!"
    ];

    return (
        <div className="w-full bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 text-white overflow-hidden py-2 border-b border-white/10 shadow-lg relative z-50">
            {/* Animated Marquee Container */}
            <div className="flex animate-marquee whitespace-nowrap items-center">
                {/* Duplicate messages to ensure a continuous loop */}
                {[...messages, ...messages].map((msg, index) => (
                    <div key={index} className="flex items-center mx-8">
                        <span className="text-sm font-bold tracking-wide uppercase">
                            {msg}
                        </span>
                        <div className="w-2 h-2 bg-yellow-400 rounded-full ml-16 shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                    </div>
                ))}
            </div>

            {/* Custom CSS for the marquee animation */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 10s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}} />
        </div>
    );
};

export default ScrollingBanner;
