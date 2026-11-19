"use client";

import React from "react";

interface Cloud9LogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
  showWatermark?: boolean;
}

export function Cloud9Logo({
  className = "",
  size = 38,
  glow = true,
  showWatermark = true,
}: Cloud9LogoProps) {
  // Authentic official Cloud9 esports 3-interlocking-9s emblem (pure vector mark, zero text)
  const c9EmblemPath =
    "m19.0 2.0c3.597-2.7652 9.1928-2.6555 12.602 0.37684 2.319 2.0316 3.3247 5.2972 2.9252 8.3106-0.31256 1.8136-1.1356 3.4861-1.9724 5.1081-1.433 2.6215-2.8635 5.2467-4.3065 7.8632 2.7198 1.5111 5.4345 3.0298 8.1518 4.5435 0.66923 0.38818 1.3876 0.69696 2.135 0.90239 1.2868 0.36424 2.7803 0.024 3.7142-0.95406 1.3927-1.3964 1.4116-3.9108 0.0366-5.3249-1.2679-1.3712-3.4924-1.4431-5.0652-0.59235-1.225 0.71586-1.6586 2.2056-1.7279 3.539-1.709-0.93894-3.4331-1.8464-5.1484-2.774 0.60118-2.653 2.4702-4.9468 4.9203-6.1151 3.82-1.8476 8.8992-0.99188 11.656 2.3203 2.9378 3.5705 2.8824 9.3188-0.21048 12.78-1.7178 1.9598-4.3343 2.9945-6.9141 3.0046-2.1413 0.0907-4.1276-0.86458-6.0067-1.7733-7.0767-3.8163-14.09-7.7472-21.143-11.609-1.065-0.52051-2.2711-0.98179-3.4722-0.71208-1.2402 0.21047-2.3026 1.1469-2.7248 2.324-0.48397 1.3775-0.20543 3.0525 0.8608 4.0885 1.2603 1.2666 3.36 1.341 4.8913 0.55832 1.2906-0.67931 1.743-2.2131 1.8237-3.5718 1.7153 0.92256 3.442 1.8262 5.1421 2.7752-0.86585 4.028-4.7653 7.0591-8.8614 7.0465-2.4891 0.10587-5.0438-0.70956-6.8915-2.406-4.178-3.7646-3.9423-11.325 0.56462-14.741 2.6404-2.0039 6.3772-2.498 9.4272-1.1734 3.4193 1.3914 6.502 3.4684 9.823 5.0665 1.5968-2.8584 3.2-5.7131 4.793-8.574 0.59613-1.1734 1.0902-2.5396 0.68688-3.8566-0.44364-1.7367-2.3001-2.8647-4.0494-2.6316-1.6183 0.10587-3.0752 1.404-3.3096 3.0197-0.16511 1.2288 6e-3 2.6177 0.88475 3.5592 0.8066 0.84568 2.0077 1.1166 3.1319 1.1998-0.93516 1.7115-1.8212 3.452-2.7929 5.1421-3.636-0.81921-6.5171-4.0646-6.957-7.7548-0.4701-3.2983 0.702-6.8927 3.384-8.9647";

  const height = Math.round((size * 36) / 50);

  return (
    <div
      className={`inline-flex items-center justify-center relative select-none ${className}`}
      style={{ width: size, height }}
    >
      {/* Soft Ambient Cyan Glow */}
      {glow && (
        <div
          className="absolute inset-0 rounded-full bg-[#008cd4]/25 blur-md pointer-events-none transform scale-125"
          aria-hidden="true"
        />
      )}

      {/* Background Frosted Watermark Layer (matching esports reference) */}
      {showWatermark && (
        <svg
          width={Math.round(size * 1.45)}
          height={Math.round((size * 1.45 * 36) / 50)}
          viewBox="0 0 50 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute pointer-events-none opacity-30 transform -translate-x-0.5 -translate-y-0.5"
          aria-hidden="true"
        >
          <path d={c9EmblemPath} fill="#7dd3fc" />
        </svg>
      )}

      {/* Foreground Official Cloud9 Blue Emblem */}
      <svg
        width={size}
        height={height}
        viewBox="0 0 50 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 transition-transform duration-300 hover:scale-105 drop-shadow-[0_2px_8px_rgba(0,140,212,0.4)]"
        role="img"
        aria-label="Cloud9 Logo"
      >
        <defs>
          <linearGradient
            id="c9OfficialGrad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#00aaec" />
            <stop offset="50%" stopColor="#008cd4" />
            <stop offset="100%" stopColor="#006bb3" />
          </linearGradient>
        </defs>
        <path d={c9EmblemPath} fill="url(#c9OfficialGrad)" />
      </svg>
    </div>
  );
}
