import React from 'react';

interface SpeedometerDisplayProps {
  speed: number;
  unit: string;
  maxSpeed?: number;
}

export const SpeedometerDisplay: React.FC<SpeedometerDisplayProps> = ({
  speed,
  unit,
  maxSpeed = 200,
}) => {
  const percentage = Math.min((speed / maxSpeed) * 100, 100);
  const rotation = (percentage / 100) * 360;

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/* Speed Arc */}
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background Arc */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-[var(--color-background-tertiary)]"
          />
          {/* Speed Arc */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="text-[var(--color-accent-primary)] transition-all duration-500 ease-out"
            strokeDasharray={`${percentage * 2.83} 283`}
            style={{
              strokeDashoffset: 0,
            }}
          />
        </svg>
        
        {/* Speed Number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl sm:text-6xl md:text-7xl lg:text-7xl xl:text-8xl font-bold text-[var(--color-text-primary)] transition-all duration-300">
            {Math.round(speed)}
          </span>
          <span className="text-lg sm:text-xl md:text-xl lg:text-2xl xl:text-2xl text-[var(--color-text-secondary)] font-medium mt-2">
            {unit}
          </span>
        </div>
      </div>
      
      {/* Label */}
      <p className="text-[var(--color-text-secondary)] text-base sm:text-lg md:text-lg lg:text-lg xl:text-lg mt-3 sm:mt-4 font-medium">
        Current Speed
      </p>
    </div>
  );
};