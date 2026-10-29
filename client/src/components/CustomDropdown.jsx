import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './CustomDropdown.css';

export default function CustomDropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  style = {},
  id
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options to uniform array of { value, label }
  const normalizedOptions = options.map((opt) => {
    if (opt !== null && typeof opt === 'object') {
      return {
        value: opt.value !== undefined ? opt.value : opt.id,
        label: opt.label !== undefined ? opt.label : opt.name || String(opt.value)
      };
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optVal) => {
    if (disabled) return;
    if (onChange) {
      onChange(optVal);
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-dropdown-container ${disabled ? 'disabled' : ''} ${isOpen ? 'is-open' : ''} ${className}`}
      style={style}
      id={id}
    >
      <button
        type="button"
        className="custom-dropdown-trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`custom-dropdown-label ${!selectedOption && placeholder ? 'is-placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`custom-dropdown-chevron ${isOpen ? 'rotate' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="custom-dropdown-menu" role="listbox">
          {normalizedOptions.length === 0 ? (
            <div className="custom-dropdown-empty">No options available</div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={String(opt.value)}
                  className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="custom-dropdown-item-text">{opt.label}</span>
                  {isSelected && <Check size={14} className="custom-dropdown-item-check" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
