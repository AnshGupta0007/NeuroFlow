import React from 'react';
import { clsx } from 'clsx';

function RiskMeter({ value = 0, size = 'md', showLabel = true }) {
  const radius = size === 'lg' ? 70 : size === 'sm' ? 40 : 55;
  const strokeWidth = size === 'lg' ? 10 : size === 'sm' ? 6 : 8;
  const svgSize = (radius + strokeWidth) * 2 + 4;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const dashOffset = arcLength - (value / 100) * arcLength;

  const color = value >= 70 ? '#ef4444' : value >= 40 ? '#f59e0b' : '#10b981';
  const label = value >= 70 ? 'High Risk' : value >= 40 ? 'Medium Risk' : 'Low Risk';

  const rotation = 135;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg
          width={svgSize}
          height={svgSize}
          className="rotate-0"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Background arc */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="#2a2a3d"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength - dashOffset} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s ease' }}
            className="drop-shadow-lg"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={clsx(
              'font-bold tabular-nums',
              size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl'
            )}
            style={{ color }}
          >
            {Math.round(value)}%
          </span>
          {showLabel && size !== 'sm' && (
            <span className="text-xs text-slate-500 font-medium mt-0.5">risk</span>
          )}
        </div>
      </div>
      {showLabel && (
        <span className="text-xs font-medium" style={{ color }}>{label}</span>
      )}
    </div>
  );
}

export default RiskMeter;
