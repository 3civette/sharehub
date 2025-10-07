'use client';

// ColorPicker Component
// Feature: 002-facciamo-tutti-gli (Admin Panel Secondary Screens)
// Uses react-colorful library (research.md decision 1)

import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

interface ColorPickerProps {
  value: string; // Hex color (e.g., "#3B82F6")
  onChange: (color: string) => void;
  label: string;
}

export default function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(value);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  const handlePickerChange = (color: string) => {
    setHexInput(color);
    setIsValid(true);
    onChange(color);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHexInput(newValue);

    // Validate hex format
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (hexRegex.test(newValue)) {
      setIsValid(true);
      onChange(newValue);
    } else {
      setIsValid(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <HexColorPicker color={value} onChange={handlePickerChange} />

      <div className="mt-2">
        <input
          type="text"
          value={hexInput}
          onChange={handleInputChange}
          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isValid ? 'border-gray-300' : 'border-red-500'
          }`}
          placeholder="#3B82F6"
          maxLength={7}
        />
        {!isValid && (
          <p className="mt-1 text-sm text-red-600">
            Invalid hex color format. Use format: #RRGGBB
          </p>
        )}
      </div>

      <div
        className="h-10 rounded-md border border-gray-300"
        style={{ backgroundColor: value }}
        title={`Preview: ${value}`}
      />
    </div>
  );
}
