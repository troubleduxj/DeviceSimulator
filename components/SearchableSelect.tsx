import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  theme?: 'dark' | 'light';
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  theme = "dark"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-slate-900' : 'bg-white';
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-300';
  const textClass = isDark ? 'text-white' : 'text-slate-900';
  const placeholderClass = isDark ? 'text-slate-500' : 'text-slate-400';
  const dropdownBgClass = isDark ? 'bg-black' : 'bg-white';
  const dropdownBorderClass = isDark ? 'border-slate-700' : 'border-slate-200';
  const inputBgClass = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const hoverClass = isDark ? 'hover:bg-slate-900' : 'hover:bg-slate-100';
  const itemTextClass = isDark ? 'text-slate-300' : 'text-slate-700';

  const selectedOption = options.find(opt => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset search when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between ${bgClass} ${borderClass} border rounded px-3 py-1.5 text-sm ${textClass} hover:border-purple-500 focus:border-purple-500 outline-none transition-colors`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : <span className={placeholderClass}>{placeholder}</span>}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 ${dropdownBgClass} ${dropdownBorderClass} border rounded-lg shadow-xl overflow-hidden max-h-[300px] flex flex-col`}>
          <div className={`p-2 border-b ${dropdownBorderClass} ${dropdownBgClass} sticky top-0`}>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className={`w-full ${inputBgClass} ${dropdownBorderClass} border rounded pl-8 pr-2 py-1 text-xs ${textClass} focus:border-purple-500 outline-none`}
                onClick={e => e.stopPropagation()}
              />
              {searchTerm && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setSearchTerm('');
                        inputRef.current?.focus();
                    }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:${textClass}`}
                >
                    <X size={12} />
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded ${hoverClass} transition-colors flex items-center justify-between ${
                    option.value === value ? 'bg-purple-600/20 text-purple-400' : itemTextClass
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-slate-500 italic">
                No matching options
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
