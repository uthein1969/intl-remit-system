import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useRemittance } from '../lib/store';

interface ThemeToggleProps {
  className?: string;
  showLabels?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '',
  showLabels = true
}) => {
  const { theme, setTheme } = useTheme();
  let language = 'en';
  try {
    const store = useRemittance();
    if (store?.language) {
      language = store.language;
    }
  } catch {}

  const isDark = theme === 'dark';

  return (
    <div 
      className={`inline-flex items-center p-0.5 rounded-lg border transition-colors ${
        isDark 
          ? 'bg-slate-800/90 border-slate-700' 
          : 'bg-slate-100 border-slate-200'
      } ${className}`}
      role="group"
      aria-label="Theme selector"
    >
      {/* Light Mode Switch Option */}
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
          !isDark
            ? 'bg-white text-amber-700 shadow-xs ring-1 ring-amber-400/30'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
        }`}
        title={language === 'my' ? 'အလင်း ပုံစံ (Light Mode)' : 'Light Mode'}
        aria-pressed={!isDark}
      >
        <Sun className={`w-3.5 h-3.5 transition-transform ${!isDark ? 'text-amber-500 scale-110' : 'text-slate-400'}`} />
        {showLabels && (
          <span className="hidden sm:inline font-sans">
            {language === 'my' ? 'အလင်း' : 'Light'}
          </span>
        )}
      </button>

      {/* Dark Mode Switch Option */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
          isDark
            ? 'bg-slate-900 text-blue-300 shadow-xs ring-1 ring-blue-500/40'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
        }`}
        title={language === 'my' ? 'အမှောင် ပုံစံ (Dark Mode)' : 'Dark Mode'}
        aria-pressed={isDark}
      >
        <Moon className={`w-3.5 h-3.5 transition-transform ${isDark ? 'text-blue-400 scale-110' : 'text-slate-400'}`} />
        {showLabels && (
          <span className="hidden sm:inline font-sans">
            {language === 'my' ? 'အမှောင်' : 'Dark'}
          </span>
        )}
      </button>
    </div>
  );
};
