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
  const accentBorder = isEmerald ? 'border-emerald-500/50' : 'border-sky-500/50';
  const accentBg = isEmerald ? 'bg-emerald-950/30' : 'bg-sky-950/30';
  const accentText = isEmerald ? 'text-emerald-400' : 'text-sky-400';
  const accentBtn = isEmerald ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-sky-600 hover:bg-sky-500';
  const badgeBg = isEmerald ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-sky-500/10 border-sky-500/30 text-sky-300';

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected Customer Notification Banner */}
      {selectedCustomer && (
        <div className={`mb-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${accentBg} ${accentBorder} animate-fadeIn`}>
          <div className="flex items-center space-x-2 min-w-0">
            <div className={`p-1 rounded-lg ${isEmerald ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'}`}>
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white truncate">
                  {selectedCustomer.fullNameEn} {selectedCustomer.fullNameMm ? `(${selectedCustomer.fullNameMm})` : ''}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${badgeBg}`}>
                  {selectedCustomer.customerCode || 'CUSTOMER'}
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  • {selectedCustomer.phone || selectedCustomer.nrcNumber || selectedCustomer.passportNumber}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {language === 'my' 
                  ? '✨ customer_profiles table မှ အချက်အလက်များ အလိုအလျောက် ဖြည့်သွင်းထားပါသည် (Auto-Filled)'
                  : '✨ Auto-filled from customer_profiles table'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearCustomer}
            className="shrink-0 px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 text-[11px] flex items-center space-x-1 cursor-pointer transition-colors"
            title={language === 'my' ? 'ပြန်လည်ရှင်းလင်းမည်' : 'Clear selection'}
          >
            <X className="w-3 h-3" />
            <span>{language === 'my' ? 'ရှင်းမည်' : 'Clear'}</span>
          </button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          {isSearchingRemote ? (
            <Loader2 className={`w-4 h-4 animate-spin ${accentText}`} />
          ) : (
            <Search className="w-4 h-4" />
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
          className={`w-full bg-slate-900 border rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner ${
            isOpen ? accentBorder : 'border-slate-700 hover:border-slate-600'
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
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Auto-Search Dropdown */}
      {isOpen && searchTerm.trim().length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-800">
          {/* Header */}
          <div className="p-2.5 bg-slate-950/80 sticky top-0 z-10 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800">
            <span className="flex items-center space-x-1.5 font-medium">
              <Sparkles className={`w-3.5 h-3.5 ${accentText}`} />
              <span>
                {language === 'my' 
                  ? `customer_profiles ရှာဖွေမှုရလဒ် ("${searchTerm}" ပါဝင်သော)`
                  : `customer_profiles search results (contains "${searchTerm}")`}
              </span>
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {combinedResults.length} {language === 'my' ? 'ဦး တွေ့ရှိ' : 'found'}
            </span>
          </div>

          {/* Results list */}
          {combinedResults.length > 0 ? (
            <div className="py-1">
              {combinedResults.map((cust, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const hasNrc = !!cust.nrcNumber;
                const hasPassport = !!(cust.passportNumber || cust.passbookNumber);

                return (
                  <div
                    key={cust.id || cust.customerCode || idx}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(cust)}
                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs ${
                      isHighlighted
                        ? `${isEmerald ? 'bg-emerald-950/50' : 'bg-sky-950/50'} text-white`
                        : 'hover:bg-slate-800/60 text-slate-200'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isEmerald ? 'bg-emerald-500/10 text-emerald-400' : 'bg-sky-500/10 text-sky-400'
                      }`}>
                        <User className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Name & Code */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-white text-xs">
                            {cust.fullNameEn}
                          </span>
                          {cust.fullNameMm && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              ({cust.fullNameMm})
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            {cust.customerCode || 'CUST'}
                          </span>
                          {cust.customerType && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {cust.customerType}
                            </span>
                          )}
                        </div>

                        {/* Phone, NRC, Passport */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                          {cust.phone && (
                            <span className="flex items-center space-x-1 text-slate-300">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span className="font-mono">{cust.phone}</span>
                            </span>
                          )}
                          {hasNrc && (
                            <span className="flex items-center space-x-1 text-amber-300">
                              <FileText className="w-3 h-3 text-amber-500" />
                              <span className="font-mono">{cust.nrcNumber}</span>
                            </span>
                          )}
                          {hasPassport && (
                            <span className="flex items-center space-x-1 text-sky-300">
                              <FileText className="w-3 h-3 text-sky-500" />
                              <span className="font-mono">{cust.passportNumber || cust.passbookNumber}</span>
                            </span>
                          )}
                        </div>

                        {/* Address */}
                        {cust.address && (
                          <div className="flex items-center space-x-1 text-[10px] text-slate-500 truncate">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
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
                      className={`shrink-0 px-2.5 py-1.5 rounded-lg text-white font-bold text-[11px] flex items-center space-x-1 shadow-sm cursor-pointer ${accentBtn}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{language === 'my' ? 'တန်းဖြည့်မည်' : 'Auto Fill'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 space-y-2">
              <p className="text-xs">
                {language === 'my'
                  ? `"${searchTerm}" နှင့် ကိုက်ညီသော Customer မတွေ့ရှိပါ။`
                  : `No customers found containing "${searchTerm}".`}
              </p>
              <p className="text-[11px] text-slate-500">
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
