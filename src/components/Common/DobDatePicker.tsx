import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';

interface DobDatePickerProps {
  id?: string;
  value: string; // Accepts DD/MM/YYYY or YYYY-MM-DD
  onChange: (formattedDob: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  language?: 'en' | 'my';
}

/**
 * Formats any date string (YYYY-MM-DD or partial) into standard DD/MM/YYYY
 */
export const formatToDDMMYYYY = (val?: string): string => {
  if (!val) return '';
  const clean = val.trim();
  
  // If already DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // If YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(clean)) {
    const parts = clean.split('T')[0].split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }

  return clean;
};

/**
 * Converts DD/MM/YYYY into YYYY-MM-DD for native date input
 */
export const formatToYYYYMMDD = (val?: string): string => {
  if (!val) return '';
  const clean = val.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(clean)) {
    return clean.split('T')[0];
  }
  return '';
};

/**
 * Computes age in years from DD/MM/YYYY or YYYY-MM-DD
 */
export const computeAgeFromDob = (dobStr: string): number | null => {
  if (!dobStr) return null;
  const iso = formatToYYYYMMDD(dobStr);
  if (!iso) return null;
  const birthDate = new Date(iso);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 && age < 130 ? age : null;
};

export const DobDatePicker: React.FC<DobDatePickerProps> = ({
  id = 'dob-input',
  value,
  onChange,
  label,
  placeholder = 'DD/MM/YYYY',
  required = false,
  disabled = false,
  className = '',
  language = 'my',
}) => {
  const [inputValue, setInputValue] = useState<string>(() => formatToDDMMYYYY(value));
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const nativeDateInputRef = useRef<HTMLInputElement>(null);

  // Synchronize internal state when external value changes
  useEffect(() => {
    setInputValue(formatToDDMMYYYY(value));
  }, [value]);

  // Close calendar popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Parse current selected date or fallback to default calendar view
  const parsedIso = formatToYYYYMMDD(inputValue);
  const initialDate = parsedIso ? new Date(parsedIso) : new Date(1995, 0, 1);
  const [viewYear, setViewYear] = useState<number>(() => initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => initialDate.getMonth());

  // Keep view in sync when opening if a valid date exists
  useEffect(() => {
    if (isOpen) {
      const iso = formatToYYYYMMDD(inputValue);
      if (iso) {
        const d = new Date(iso);
        if (!isNaN(d.getTime())) {
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }
      }
    }
  }, [isOpen, inputValue]);

  // Handle typing in DD/MM/YYYY text box with intelligent auto-slash formatting
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    
    // Filter only digits and slashes
    raw = raw.replace(/[^0-9/]/g, '');

    // Auto add slash if user is typing pure digits
    if (!raw.includes('/')) {
      if (raw.length > 2 && raw.length <= 4) {
        raw = raw.slice(0, 2) + '/' + raw.slice(2);
      } else if (raw.length > 4) {
        raw = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4, 8);
      }
    } else {
      // If user typed slashes, ensure at most 2 slashes and max 10 characters
      const parts = raw.split('/');
      if (parts.length > 3) {
        raw = parts.slice(0, 3).join('/');
      }
      if (raw.length > 10) {
        raw = raw.slice(0, 10);
      }
    }

    setInputValue(raw);
    onChange(raw);
  };

  // When a day is selected from the Calendar
  const handleSelectDay = (day: number) => {
    const formatted = `${String(day).padStart(2, '0')}/${String(viewMonth + 1).padStart(2, '0')}/${viewYear}`;
    setInputValue(formatted);
    onChange(formatted);
    setIsOpen(false);
  };

  // When selected via native browser calendar
  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (iso) {
      const formatted = formatToDDMMYYYY(iso);
      setInputValue(formatted);
      onChange(formatted);
    }
  };

  // Trigger native date picker if available
  const triggerNativePicker = () => {
    if (nativeDateInputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          nativeDateInputRef.current.showPicker();
        } else {
          nativeDateInputRef.current.click();
        }
      } catch {
        setIsOpen(!isOpen);
      }
    } else {
      setIsOpen(!isOpen);
    }
  };

  // Calendar calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesMm = [
    'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
    'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'
  ];

  const currentYear = new Date().getFullYear();
  // Build year choices from 1920 to currentYear
  const yearsList = [];
  for (let y = currentYear; y >= 1925; y--) {
    yearsList.push(y);
  }

  // Selected date components
  let selectedDayNum: number | null = null;
  let selectedMonthNum: number | null = null;
  let selectedYearNum: number | null = null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(inputValue)) {
    const [d, m, y] = inputValue.split('/').map(Number);
    selectedDayNum = d;
    selectedMonthNum = m - 1;
    selectedYearNum = y;
  }

  const calculatedAge = computeAgeFromDob(inputValue);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={id} className="block text-slate-400 font-semibold text-xs">
            {label} {required && <span className="text-rose-400">*</span>}
          </label>
          {calculatedAge !== null && (
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>{language === 'my' ? `အသက် ${calculatedAge} နှစ်` : `Age: ${calculatedAge} yrs`}</span>
            </span>
          )}
        </div>
      )}

      {/* Input Group with DD/MM/YYYY text box and Calendar Button */}
      <div className="relative flex items-center rounded-lg border border-slate-700 bg-slate-900 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-all shadow-xs">
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={handleTextChange}
          placeholder={placeholder}
          maxLength={10}
          disabled={disabled}
          required={required}
          className="w-full bg-transparent px-3 py-2 text-white font-mono text-xs focus:outline-none placeholder:text-slate-500 tracking-wider"
        />

        {/* Clear Button if value present */}
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              onChange('');
            }}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors mr-0.5 cursor-pointer"
            title={language === 'my' ? 'ဖျက်မည်' : 'Clear'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Calendar Picker Toggle Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="px-2.5 py-2 text-sky-400 hover:text-sky-300 hover:bg-slate-800/80 rounded-r-lg transition-colors border-l border-slate-700/80 flex items-center justify-center cursor-pointer shrink-0"
          title={language === 'my' ? 'ပြက္ခဒိန်မှ ရွေးချယ်မည် (Select from Calendar)' : 'Select from Calendar (DD/MM/YYYY)'}
        >
          <Calendar className="w-4 h-4" />
        </button>

        {/* Hidden Native date input to allow native picker if desired */}
        <input
          ref={nativeDateInputRef}
          type="date"
          value={formatToYYYYMMDD(inputValue)}
          onChange={handleNativeChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Helper Format Hint */}
      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono px-1">
        <span>Format: <strong className="text-slate-400">DD/MM/YYYY</strong> (e.g. 25/08/1992)</span>
        <button
          type="button"
          onClick={triggerNativePicker}
          className="text-sky-400 hover:text-sky-300 underline underline-offset-2 hover:no-underline cursor-pointer"
        >
          {language === 'my' ? 'ပြက္ခဒိန်ဖွင့်ရန်' : 'Open Calendar'}
        </button>
      </div>

      {/* Interactive Calendar Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1 z-50 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 text-white animate-in fade-in zoom-in-95 duration-150">
          
          {/* Calendar Header with Month and Year Selectors */}
          <div className="flex items-center justify-between gap-1 mb-3 pb-2 border-b border-slate-800">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-1.5 flex-1 justify-center">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {monthNamesEn.map((name, idx) => (
                  <option key={name} value={idx}>
                    {language === 'my' ? `${idx + 1} လ (${monthNamesMm[idx]})` : name}
                  </option>
                ))}
              </select>

              {/* Year Dropdown (Crucial for rapid DOB selection) */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-sky-500 cursor-pointer max-h-48"
              >
                {yearsList.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
            <span className="text-rose-400">Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span className="text-sky-400">Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {/* Empty slots before first day of month */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                selectedDayNum === day &&
                selectedMonthNum === viewMonth &&
                selectedYearNum === viewYear;

              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === viewMonth &&
                new Date().getFullYear() === viewYear;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 rounded-lg font-mono text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/30'
                      : isToday
                      ? 'border border-amber-400 text-amber-300 hover:bg-slate-800'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer with Quick Action buttons */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const d = now.getDate();
                const m = now.getMonth() + 1;
                const y = now.getFullYear();
                const todayFormatted = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
                setInputValue(todayFormatted);
                onChange(todayFormatted);
                setIsOpen(false);
              }}
              className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
            >
              {language === 'my' ? 'ယနေ့ရက်စွဲ' : 'Today'}
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setInputValue('');
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {language === 'my' ? 'ရှင်းလင်းမည်' : 'Clear'}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-medium cursor-pointer"
              >
                {language === 'my' ? 'ပိတ်မည်' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
