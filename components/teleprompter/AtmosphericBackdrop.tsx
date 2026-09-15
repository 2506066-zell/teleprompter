'use client';

import React from 'react';

export const AtmosphericBackdrop: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Deep atmospheric sky gradient matching reference screenshot */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070A0F] via-[#0D1420] to-[#080B10]" />

      {/* Horizon twilight ambient glow */}
      <div
        className="absolute inset-x-0 bottom-[18%] h-96 opacity-45 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, #1D2B3D 0%, #0D1624 55%, transparent 100%)',
        }}
      />

      {/* Subtle warm dusk horizon strip */}
      <div
        className="absolute inset-x-0 bottom-[24%] h-24 opacity-20 blur-2xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, #2A384A 0%, #15202E 60%, transparent 100%)',
        }}
      />

      {/* Scenic dark mountain silhouette vector */}
      <svg
        className="absolute bottom-0 inset-x-0 w-full h-[38vh] min-h-[220px] max-h-[380px] object-cover opacity-75"
        viewBox="0 0 1440 380"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Distant mountain ridge */}
        <path
          d="M0 220 L140 180 L290 210 L460 160 L620 200 L760 150 L940 195 L1120 150 L1280 190 L1440 170 L1440 380 L0 380 Z"
          fill="#0D1420"
          opacity="0.65"
        />

        {/* Mid mountain ridge */}
        <path
          d="M0 260 L180 220 L360 250 L540 200 L720 240 L900 190 L1080 230 L1260 185 L1440 230 L1440 380 L0 380 Z"
          fill="#090E17"
          opacity="0.8"
        />

        {/* Foreground hills and shoreline */}
        <path
          d="M0 300 L220 280 L440 310 L660 270 L880 300 L1100 265 L1300 295 L1440 285 L1440 380 L0 380 Z"
          fill="#05080E"
        />

        {/* Dark water reflection base */}
        <rect y="325" width="1440" height="55" fill="url(#lakeReflect)" opacity="0.8" />
        <defs>
          <linearGradient id="lakeReflect" x1="720" y1="325" x2="720" y2="380" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0A101A" stopOpacity="0.9" />
            <stop offset="1" stopColor="#04060A" />
          </linearGradient>
        </defs>
      </svg>

      {/* Subtle vignette layer to ensure optimal text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#06080E]/90 via-transparent to-[#070A0F]/80 pointer-events-none" />
    </div>
  );
};
