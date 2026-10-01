import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, User, Phone, FileText, MapPin, X, Check, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { Customer } from '../../types';
import { searchTursoCustomers } from '../../lib/tursoClient';

interface CustomerSearchAutoFillProps {
  label: string;
  placeholder?: string;
  onSelectCustomer: (customer: Customer) => void;
  selectedCustomer: Customer | null;
  onClearCustomer: () => void;
  language: 'en' | 'my';
  themeColor?: 'emerald' | 'sky';
  localCustomers: Customer[];
  roleTag: 'SENDER' | 'RECEIVER';
}

export const CustomerSearchAutoFill: React.FC<CustomerSearchAutoFillProps> = ({
  label,
  placeholder,
  onSelectCustomer,
  selectedCustomer,
  onClearCustomer,
  language,
  themeColor = 'sky',
  localCustomers = [],
  roleTag,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState<Customer[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter local customers by "contain" (case-insensitive substring match)
  const filteredLocal = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.trim().toLowerCase();
    return localCustomers.filter(c => {
      const matchNameEn = c.fullNameEn?.toLowerCase().includes(q);
      const matchNameMm = c.fullNameMm?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q);
      const matchNrc = c.nrcNumber?.toLowerCase().includes(q);
      const matchPassport = (c.passportNumber || c.passbookNumber)?.toLowerCase().includes(q);
      const matchCode = c.customerCode?.toLowerCase().includes(q);
      const matchAddress = c.address?.toLowerCase().includes(q);
      return matchNameEn || matchNameMm || matchPhone || matchNrc || matchPassport || matchCode || matchAddress;
    });
  }, [searchTerm, localCustomers]);

  // Debounced search on Turso LibSQL database (customer_profiles table)
  useEffect(() => {
    const q = searchTerm.trim();
    if (!q || q.length < 2) {
      setRemoteResults([]);
      setIsSearchingRemote(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingRemote(true);
      try {
        const results = await searchTursoCustomers(q);
        if (Array.isArray(results)) {
          setRemoteResults(results as Customer[]);
        }
      } catch (err) {
        console.warn('Turso customer search error:', err);
      } finally {
        setIsSearchingRemote(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Combine and deduplicate local + remote results
  const combinedResults = useMemo(() => {
    const seen = new Set<string>();
    const list: Customer[] = [];

    // Prioritize local matches
    for (const c of filteredLocal) {
      const key = c.id || c.customerCode || c.fullNameEn;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(c);
      }
    }

    // Merge remote results from Turso customer_profiles table
    for (const c of remoteResults) {
      const key = c.id || c.customerCode || c.fullNameEn;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(c);
      }
    }

    return list.slice(0, 20); // Cap at top 20
  }, [filteredLocal, remoteResults]);

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    setSearchTerm('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || combinedResults.length === 0) {
      if (e.key === 'ArrowDown' && searchTerm.trim()) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < combinedResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : combinedResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < combinedResults.length) {
        handleSelect(combinedResults[highlightedIndex]);
      } else if (combinedResults.length > 0) {
        handleSelect(combinedResults[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isEmerald = themeColor === 'emerald';
  const accentBorder = isEmerald ? 'border-emerald-500/80' : 'border-sky-500/80';
  const accentBg = isEmerald 
    ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100 shadow-emerald-950/40' 
    : 'bg-sky-950/90 border-sky-500/80 text-sky-100 shadow-sky-950/40';
  const accentText = isEmerald ? 'text-emerald-400' : 'text-sky-400';
  const accentBtn = isEmerald ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-sky-600 hover:bg-sky-500';
  const badgeBg = isEmerald ? 'bg-emerald-500/30 border-emerald-400/80 text-emerald-200' : 'bg-sky-500/30 border-sky-400/80 text-sky-200';

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected Customer Notification Banner */}
      {selectedCustomer && (
        <div className={`mb-2.5 p-3 rounded-xl border-2 flex items-center justify-between gap-2 text-xs ${accentBg} shadow-lg animate-fadeIn`}>
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className={`p-2 rounded-xl shrink-0 ${isEmerald ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50' : 'bg-sky-500/30 text-sky-200 border border-sky-400/50'}`}>
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-white text-sm truncate">
                  {selectedCustomer.fullNameEn} {selectedCustomer.fullNameMm ? `(${selectedCustomer.fullNameMm})` : ''}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${badgeBg}`}>
                  {selectedCustomer.customerCode || 'CUSTOMER'}
                </span>
                <span className="text-[11px] text-slate-300 hidden sm:inline font-mono font-medium">
                  • {selectedCustomer.phone || selectedCustomer.nrcNumber || selectedCustomer.passportNumber}
                </span>
              </div>
              <p className={`text-[10px] ${isEmerald ? 'text-emerald-300' : 'text-sky-300'} font-medium truncate mt-0.5`}>
                {language === 'my' 
                  ? '✨ customer_profiles table မှ အချက်အလက်များ အလိုအလျောက် ဖြည့်သွင်းထားပါသည် (Auto-Filled)'
                  : '✨ Auto-filled from customer_profiles table'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearCustomer}
            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-400 text-xs flex items-center space-x-1.5 cursor-pointer transition-colors shadow-sm"
            title={language === 'my' ? 'ပြန်လည်ရှင်းလင်းမည်' : 'Clear selection'}
          >
            <X className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-bold">{language === 'my' ? 'ရှင်းမည်' : 'Clear'}</span>
          </button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          {isSearchingRemote ? (
            <Loader2 className={`w-4 h-4 animate-spin ${accentText}`} />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (searchTerm.trim()) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            (language === 'my'
              ? `🔍 ${label} - အမည်၊ ဖုန်း၊ NRC သို့မဟုတ် Passport ဖြင့် Auto Search ရှာပါ...`
              : `🔍 ${label} - Auto search by Name, Phone, NRC, Passport...`)
          }
          className={`w-full bg-white dark:bg-slate-900/90 border rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:outline-none transition-all shadow-xs ${
            isOpen ? `${accentBorder} ring-2 ${isEmerald ? 'ring-emerald-500/30' : 'ring-sky-500/30'}` : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
          }`}
        />

        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Floating Auto-Search Dropdown */}
      {isOpen && searchTerm.trim().length > 0 && (
        <div className={`absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-900/98 backdrop-blur-md border rounded-2xl shadow-xl max-h-84 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 ${
          isEmerald ? 'border-emerald-500/80 shadow-emerald-950/10' : 'border-sky-500/80 shadow-sky-950/10'
        }`}>
          {/* Header */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/95 sticky top-0 z-10 flex items-center justify-between text-xs text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700/80 backdrop-blur-md">
            <span className="flex items-center space-x-1.5 font-bold text-slate-900 dark:text-white">
              <Sparkles className={`w-4 h-4 ${accentText}`} />
              <span>
                {language === 'my' 
                  ? `customer_profiles ရှာဖွေမှုရလဒ် ("${searchTerm}" ပါဝင်သော)`
                  : `customer_profiles search results (contains "${searchTerm}")`}
              </span>
            </span>
            <span className={`font-mono text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
              isEmerald ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40' : 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40'
            }`}>
              {combinedResults.length} {language === 'my' ? 'ဦး တွေ့ရှိ' : 'found'}
            </span>
          </div>

          {/* Results list */}
          {combinedResults.length > 0 ? (
            <div className="py-1">
              {combinedResults.map((cust, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isCurrentSelected = selectedCustomer && (selectedCustomer.id === cust.id || selectedCustomer.customerCode === cust.customerCode);
                const isRowActive = isHighlighted || isCurrentSelected;
                const hasNrc = !!cust.nrcNumber;
                const hasPassport = !!(cust.passportNumber || cust.passbookNumber);

                return (
                  <div
                    key={cust.id || cust.customerCode || idx}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(cust)}
                    className={`p-3.5 cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                      isRowActive
                        ? isEmerald
                          ? 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 text-white shadow-md ring-2 ring-emerald-300/90 scale-[1.002]'
                          : 'bg-gradient-to-r from-sky-600 via-sky-600 to-blue-600 text-white shadow-md ring-2 ring-sky-300/90 scale-[1.002]'
                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900/90 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                      <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 transition-colors ${
                        isRowActive
                          ? isEmerald
                            ? 'bg-white text-emerald-700 shadow-sm ring-2 ring-emerald-200'
                            : 'bg-white text-sky-700 shadow-sm ring-2 ring-sky-200'
                          : isEmerald
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-500/40'
                            : 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-500/40'
                      }`}>
                        <User className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        {/* Name & Code */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-extrabold text-sm ${isRowActive ? 'text-white drop-shadow-xs' : 'text-slate-900 dark:text-white'}`}>
                            {cust.fullNameEn}
                          </span>
                          {cust.fullNameMm && (
                            <span className={`text-xs font-semibold ${isRowActive ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                              ({cust.fullNameMm})
                            </span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold shadow-2xs ${
                            isRowActive
                              ? 'bg-white/20 text-white border border-white/40'
                              : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}>
                            {cust.customerCode || 'CUST'}
                          </span>
                          {cust.customerType && (
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold shadow-2xs ${
                              isRowActive
                                ? 'bg-amber-300 text-slate-950 font-extrabold'
                                : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600/40'
                            }`}>
                              {cust.customerType}
                            </span>
                          )}
                          {isCurrentSelected && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold bg-white text-emerald-800 shadow-xs uppercase tracking-wider">
                              ✓ {language === 'my' ? 'ရွေးချယ်ထားသည်' : 'Selected'}
                            </span>
                          )}
                        </div>

                        {/* Phone, NRC, Passport */}
                        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs ${
                          isRowActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {cust.phone && (
                            <span className="flex items-center space-x-1 font-semibold">
                              <Phone className={`w-3.5 h-3.5 ${isRowActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                              <span className="font-mono">{cust.phone}</span>
                            </span>
                          )}
                          {hasNrc && (
                            <span className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              isRowActive
                                ? 'bg-amber-400 text-slate-950 shadow-xs'
                                : 'text-amber-800 bg-amber-50 border border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-500/30'
                            }`}>
                              <FileText className="w-3 h-3" />
                              <span>{cust.nrcNumber}</span>
                            </span>
                          )}
                          {hasPassport && (
                            <span className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              isRowActive
                                ? 'bg-cyan-100 text-slate-950 shadow-xs'
                                : 'text-sky-400 bg-sky-950/40 border border-sky-500/30'
                            }`}>
                              <FileText className="w-3 h-3" />
                              <span>{cust.passportNumber || cust.passbookNumber}</span>
                            </span>
                          )}
                        </div>

                        {/* Address */}
                        {cust.address && (
                          <div className={`flex items-center space-x-1.5 text-[11px] truncate ${
                            isRowActive ? 'text-emerald-50 font-medium' : 'text-slate-400'
                          }`}>
                            <MapPin className={`w-3 h-3 shrink-0 ${isRowActive ? 'text-emerald-100' : 'text-slate-500'}`} />
                            <span className="truncate">{cust.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Auto Fill Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(cust);
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center space-x-1.5 shadow-md cursor-pointer transition-transform active:scale-95 ${
                        isRowActive
                          ? isEmerald
                            ? 'bg-white text-emerald-900 hover:bg-emerald-50 ring-1 ring-emerald-200'
                            : 'bg-white text-sky-900 hover:bg-sky-50 ring-1 ring-sky-200'
                          : `${accentBtn} text-white`
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{language === 'my' ? 'တန်းဖြည့်မည်' : 'Auto Fill'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 space-y-2 bg-slate-900">
              <p className="text-xs text-slate-200 font-semibold">
                {language === 'my'
                  ? `"${searchTerm}" နှင့် ကိုက်ညီသော Customer မတွေ့ရှိပါ။`
                  : `No customers found containing "${searchTerm}".`}
              </p>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'အမည်၊ ဖုန်း၊ NRC သို့မဟုတ် Passport နံပါတ် အပြည့်အစုံ (သို့) တစ်စိတ်တစ်ပိုင်း ရိုက်ထည့်ရှာဖွေနိုင်ပါသည်။'
                  : 'Search by full or partial Name, Phone, NRC, or Passport number.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
