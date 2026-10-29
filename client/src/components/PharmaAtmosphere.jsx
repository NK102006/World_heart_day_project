import React from 'react';

export default function PharmaAtmosphere() {
  return (
    <div className="pharma-atmosphere-container pointer-events-none">
      {/* Animated Gradient Orbs */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      <div className="ambient-orb orb-3"></div>

      {/* Visible Animated Floating Pharma Particle Dots */}
      <div className="floating-dot" style={{ top: '16%', left: '8%', width: '12px', height: '12px', backgroundColor: 'rgba(2, 132, 199, 0.65)', boxShadow: '0 2px 10px rgba(2, 132, 199, 0.5)', animationDelay: '0s' }}></div>
      <div className="floating-dot" style={{ top: '28%', left: '18%', width: '16px', height: '16px', backgroundColor: 'rgba(13, 148, 136, 0.6)', boxShadow: '0 2px 10px rgba(13, 148, 136, 0.5)', animationDelay: '-2s' }}></div>
      <div className="floating-dot" style={{ top: '68%', left: '12%', width: '10px', height: '10px', backgroundColor: 'rgba(30, 64, 175, 0.65)', animationDelay: '-4s' }}></div>
      <div className="floating-dot" style={{ top: '82%', left: '26%', width: '14px', height: '14px', backgroundColor: 'rgba(13, 148, 136, 0.65)', animationDelay: '-1.5s' }}></div>
      <div className="floating-dot" style={{ top: '20%', right: '24%', width: '12px', height: '12px', backgroundColor: 'rgba(3, 105, 161, 0.6)', animationDelay: '-3.2s' }}></div>
      <div className="floating-dot" style={{ top: '74%', right: '20%', width: '16px', height: '16px', backgroundColor: 'rgba(37, 99, 235, 0.55)', animationDelay: '-5s' }}></div>
      <div className="floating-dot" style={{ top: '45%', left: '6%', width: '10px', height: '10px', backgroundColor: 'rgba(16, 185, 129, 0.65)', animationDelay: '-2.7s' }}></div>

      {/* Right-side Animated Clinical Cardio-Wave & Molecular Watermark */}
      <div className="fixed right-[-40px] top-1/2 -translate-y-1/2 pointer-events-none z-0 hidden lg:block floating-watermark">
        <svg width="540" height="500" viewBox="0 0 540 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer Clinical Geometric Heart Outline in Richer Teal/Blue */}
          <path
            d="M270 430C270 430 95 315 95 175C95 112 144 65 202 65C237 65 258 83 270 105C282 83 303 65 338 65C396 65 445 112 445 175C445 315 270 430 270 430Z"
            stroke="url(#tealCyanGrad)"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.42"
          />

          {/* Secondary Offset Ring */}
          <circle cx="385" cy="345" r="105" stroke="url(#tealCyanGrad)" strokeWidth="3.5" strokeDasharray="8 8" opacity="0.38" />

          {/* Animated ECG Wave Crossing the Heart */}
          <path
            className="ecg-line"
            d="M30 230 H165 L188 190 L212 280 L242 130 L272 310 L298 205 L318 230 H490"
            stroke="url(#ecgGrad)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Floating Pharma Molecular Hexagons */}
          <g opacity="0.45" stroke="#1E40AF" strokeWidth="2.5">
            <polygon points="130,90 148,80 166,90 166,110 148,120 130,110" />
            <line x1="166" y1="90" x2="188" y2="78" />
            <circle cx="188" cy="78" r="5" fill="#0D9488" />
          </g>

          <defs>
            <linearGradient id="tealCyanGrad" x1="95" y1="65" x2="445" y2="430" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0D9488" />
              <stop offset="0.5" stopColor="#0284C7" />
              <stop offset="1" stopColor="#1E40AF" />
            </linearGradient>
            <linearGradient id="ecgGrad" x1="30" y1="230" x2="490" y2="230" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1E40AF" stopOpacity="0" />
              <stop offset="0.3" stopColor="#0D9488" />
              <stop offset="0.7" stopColor="#1E40AF" />
              <stop offset="1" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Left-side Visible Molecular Nodes */}
      <div
        id="left-molecular-nodes"
        className="fixed left-8 bottom-12 pointer-events-none z-0 hidden xl:block transition-opacity"
        style={{ opacity: 'var(--watermark-opacity)' }}
      >
        <svg width="220" height="220" viewBox="0 0 220 220" fill="none">
          <circle cx="50" cy="150" r="7" fill="#0D9488" />
          <circle cx="110" cy="110" r="9" fill="#0284C7" />
          <circle cx="170" cy="145" r="6" fill="#1E40AF" />
          <circle cx="110" cy="45" r="6" fill="#0D9488" />
          <line x1="50" y1="150" x2="110" y2="110" stroke="#1E40AF" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="170" y1="145" x2="110" y2="110" stroke="#0D9488" strokeWidth="2" />
          <line x1="110" y1="45" x2="110" y2="110" stroke="#0284C7" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}
