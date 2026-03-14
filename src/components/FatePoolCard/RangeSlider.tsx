import React from 'react';

interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function RangeSlider({ value, onChange, min = 0, max = 100, step = 1 }: RangeSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const gradientColor = `linear-gradient(to right, #10b981 ${percentage}%, #f43f5e ${percentage}%)`;

  return (
    <div
      className="w-full h-1.5 rounded-full overflow-hidden"
      style={{ background: gradientColor }}
    />
  );
}