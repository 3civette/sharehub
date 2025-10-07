'use client';

import { useState } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export default function ColorPicker({ label, value, onChange, disabled = false }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempColor, setTempColor] = useState(value);

  const isValidHex = (color: string) => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  };

  const handleColorChange = (newColor: string) => {
    setTempColor(newColor);
    if (isValidHex(newColor)) {
      onChange(newColor);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // Auto-add # if not present
    if (!inputValue.startsWith('#')) {
      inputValue = '#' + inputValue;
    }

    setTempColor(inputValue);

    // Only call onChange if valid hex
    if (isValidHex(inputValue)) {
      onChange(inputValue);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center gap-3">
        {/* Color preview and picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setShowPicker(!showPicker)}
            disabled={disabled}
            className={`w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm transition-all ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'
            }`}
            style={{ backgroundColor: isValidHex(tempColor) ? tempColor : '#CCCCCC' }}
            aria-label={`Seleziona ${label.toLowerCase()}`}
          />
          {showPicker && !disabled && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowPicker(false)}
              />
              {/* Color picker */}
              <div className="absolute top-14 left-0 z-20 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
                <input
                  type="color"
                  value={isValidHex(tempColor) ? tempColor : '#3B82F6'}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-32 h-32 cursor-pointer border-0"
                />
              </div>
            </>
          )}
        </div>

        {/* Hex input */}
        <div className="flex-1">
          <input
            type="text"
            value={tempColor}
            onChange={handleInputChange}
            disabled={disabled}
            maxLength={7}
            placeholder="#3B82F6"
            className={`w-full px-4 py-2 border rounded-lg font-mono text-sm ${
              isValidHex(tempColor)
                ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                : 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-transparent'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
          {!isValidHex(tempColor) && (
            <p className="text-xs text-red-600 mt-1">Formato non valido (es: #3B82F6)</p>
          )}
        </div>
      </div>
    </div>
  );
}
