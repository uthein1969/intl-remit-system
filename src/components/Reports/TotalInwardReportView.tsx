import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  Calendar, 
  Coins, 
  ArrowDownLeft,
  TrendingDown,
  FileText,
  Clock,
  Layers,
  BarChart3,
  X,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Building2,
  Globe,
  User as UserIcon
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction } from '../../types';
import { VoucherModal } from '../VoucherModal';
import { formatToDDMMYYYY } from '../../lib/dateUtils';

export const TotalInwardReportView: React.FC = () => {
  const { db, language, t, activeBranchId, activeCountryCode } = useRemittance();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(activeCountryCode || 'ALL');
  const [selectedBranch, setSelectedBranch] = useState(activeBranchId || 'ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [selectedCurrency, setSelectedCurrency] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeDatePreset, setActiveDatePreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');
  
  // Sort Order: 'DESC' (Newest date first) | 'ASC' (Chronological ascending - Oldest first)
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  
  // Expanded Days for viewing underlying claims
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const [selectedVoucherTx, setSelectedVoucherTx] = useState<RemittanceTransaction | null>(null);

  const inwardTxs = db.transactions.filter(t => t.type === 'INWARD');

  // Distinct users for User Filter
  const distinctUsers = useMemo(() => {
    const userMap = new Map<string, { id: string; name: string; role?: string }>();
    db.users.forEach(u => {
      userMap.set(u.id, { id: u.id, name: u.fullName, role: u.role });
    });
    inwardTxs.forEach(tx => {
      if (tx.creatorUserId && !userMap.has(tx.creatorUserId)) {
        userMap.set(tx.creatorUserId, { id: tx.creatorUserId, name: tx.creatorName || tx.creatorUserId });
      }
      if (tx.approverUserId && !userMap.has(tx.approverUserId)) {
        userMap.set(tx.approverUserId, { id: tx.approverUserId, name: tx.approverName || tx.approverUserId });
      }
    });
    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [db.users, inwardTxs]);

  // Quick Date Range Handler
  const handleDatePreset = (preset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH') => {
    setActiveDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(now.getTime() - 86400000);
      const yestStr = yest.toISOString().split('T')[0];
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'WEEK') {
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      setStartDate(weekAgo.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const offset = firstDay.getTimezoneOffset() * 60000;
      setStartDate(new Date(firstDay.getTime() - offset).toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  const handleCustomDateChange = (type: 'START' | 'END', value: string) => {
    setActiveDatePreset('CUSTOM');
    if (type === 'START') setStartDate(value);
    if (type === 'END') setEndDate(value);
  };

  const toggleDateExpand = (dateStr: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  const filteredTxs = useMemo(() => {
    return inwardTxs.filter(tx => {
      // User / Operator Filter (User Request)
      if (selectedUser !== 'ALL') {
        const userObj = distinctUsers.find(u => u.id === selectedUser);
        const matchCreator = tx.creatorUserId === selectedUser || 
          (userObj && tx.creatorName && (tx.creatorName.toLowerCase().includes(userObj.name.toLowerCase()) || userObj.name.toLowerCase().includes(tx.creatorName.toLowerCase())));
        const matchApprover = tx.approverUserId === selectedUser || 
          (userObj && tx.approverName && (tx.approverName.toLowerCase().includes(userObj.name.toLowerCase()) || userObj.name.toLowerCase().includes(tx.approverName.toLowerCase())));
        if (!matchCreator && !matchApprover) return false;
      }

      // Currency Filter
      if (selectedCurrency !== 'ALL' && tx.sourceCurrency !== selectedCurrency) {
        return false;
      }
      
      // Status Filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'PAID_OUT' || selectedStatus === 'APPROVED_AND_PAID_OUT') {
          if (tx.status !== 'PAID_OUT' && tx.status !== 'APPROVED_AND_PAID_OUT') return false;
        } else if (selectedStatus === 'APPROVED' || selectedStatus === 'APPROVED_AND_SENT') {
          if (tx.status !== 'APPROVED' && tx.status !== 'APPROVED_AND_SENT') return false;
        } else if (tx.status !== selectedStatus) {
          return false;
        }
      }
      
      // Country Filter
      if (selectedCountry !== 'ALL') {
        const branch = db.branches.find(b => b.id === (tx.payoutBranchId || tx.branchId));
        const match = branch?.countryCode === selectedCountry || 
          tx.senderCountryCode === selectedCountry || 
          tx.receiverCountryCode === selectedCountry;
        if (!match) return false;
      }

      // Branch Filter
      if (selectedBranch !== 'ALL' && tx.payoutBranchId !== selectedBranch && tx.branchId !== selectedBranch) {
        return false;
      }

      // Date Range Filter
      if (startDate || endDate) {
        const txDate = tx.createdDate ? new Date(tx.createdDate).toISOString().split('T')[0] : '';
        if (startDate && txDate < startDate) return false;
        if (endDate && txDate > endDate) return false;
      }

      // Text Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          tx.transactionNo.toLowerCase().includes(q) ||
          tx.mtcn.toLowerCase().includes(q) ||
          tx.receiverName.toLowerCase().includes(q) ||
          tx.receiverNrc.toLowerCase().includes(q) ||
          tx.senderName.toLowerCase().includes(q) ||
          (tx.creatorName && tx.creatorName.toLowerCase().includes(q)) ||
          (tx.approverName && tx.approverName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [inwardTxs, selectedUser, distinctUsers, selectedCurrency, selectedStatus, selectedCountry, selectedBranch, startDate, endDate, searchQuery, db.branches]);

  // Distinct foreign currencies present in inward claims
  const sourceCurrenciesList = useMemo(() => {
    const list = Array.from(new Set(filteredTxs.map(tx => tx.sourceCurrency || 'THB')));
    const priority = ['THB', 'USD', 'SGD', 'MYR', 'EUR', 'JPY', 'CNY', 'AED'];
    return list.sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [filteredTxs]);

  // Day by Day Inward Aggregation (User Request: Date အလိုက် အစဉ်လိုက်ပြပေးပါ)
  interface DaySummary {
    rawDate: string;
    formattedDate: string; // dd/mm/yyyy
    dayOfWeek: string;
    claimsCount: number;
    currencyTotals: Record<string, number>;
    totalPayoutMMK: number;
    transactions: RemittanceTransaction[];
  }

  const dayByDayTotals = useMemo(() => {
    const dayMap: Record<string, DaySummary> = {};

    filteredTxs.forEach(tx => {
      const rawDateStr = tx.createdDate ? new Date(tx.createdDate).toISOString().split('T')[0] : 'Unknown';
      if (!dayMap[rawDateStr]) {
        const dateObj = new Date(rawDateStr);
        const dayOfWeek = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString(undefined, { weekday: 'short' });
        dayMap[rawDateStr] = {
          rawDate: rawDateStr,
          formattedDate: formatToDDMMYYYY(rawDateStr),
          dayOfWeek,
          claimsCount: 0,
          currencyTotals: {},
          totalPayoutMMK: 0,
          transactions: []
        };
      }

      const row = dayMap[rawDateStr];
      row.claimsCount += 1;
      row.transactions.push(tx);

      const sCurr = tx.sourceCurrency || 'THB';
      row.currencyTotals[sCurr] = (row.currencyTotals[sCurr] || 0) + Number(tx.sendAmount || 0);

      row.totalPayoutMMK += Number(tx.receiveAmount || 0);
    });

    // Sequential Date Ordering
    return Object.values(dayMap).sort((a, b) => {
      if (sortOrder === 'ASC') {
        return a.rawDate.localeCompare(b.rawDate);
      }
      return b.rawDate.localeCompare(a.rawDate);
    });
  }, [filteredTxs, sortOrder]);

  // Grand Total for Total Inward Report
  const grandTotalSummary = useMemo(() => {
    const summary = {
      claimsCount: 0,
      currencyTotals: {} as Record<string, number>,
      totalPayoutMMK: 0
    };

    dayByDayTotals.forEach(d => {
      summary.claimsCount += d.claimsCount;
      summary.totalPayoutMMK += d.totalPayoutMMK;

      Object.entries(d.currencyTotals).forEach(([curr, amt]) => {
        summary.currencyTotals[curr] = (summary.currencyTotals[curr] || 0) + amt;
      });
    });

    return summary;
  }, [dayByDayTotals]);

  // KPI highlights
  const totalPayoutMMK = filteredTxs.reduce((sum, tx) => sum + Number(tx.receiveAmount || 0), 0);

  // CSV Export with dd/mm/yyyy format
  const exportCsv = () => {
    const headers = [
      'Date (dd/mm/yyyy)',
      'Day',
      'Claims Count',
      ...sourceCurrenciesList.map(c => `Inbound Remittance (${c})`),
      'Disbursed Payout (MMK)'
    ];

    const rows = dayByDayTotals.map(d => [
      d.formattedDate,
      d.dayOfWeek,
      d.claimsCount,
      ...sourceCurrenciesList.map(c => d.currencyTotals[c] || 0),
      d.totalPayoutMMK
    ]);

    // Grand Total Row
    rows.push([
      'GRAND TOTAL',
      '-',
      grandTotalSummary.claimsCount,
      ...sourceCurrenciesList.map(c => grandTotalSummary.currencyTotals[c] || 0),
      grandTotalSummary.totalPayoutMMK
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Total_Inward_Report_DayByDay_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {language === 'my' ? 'Total Inward Report (ရက်စွဲအလိုက် စုစုပေါင်း အစီရင်ခံစာ)' : 'Total Inward Remittance Report'}
              </h2>
              <span className="text-[11px] text-teal-400 font-mono font-medium">
                Sequential Day by Day Summary (Format: dd/mm/yyyy)
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            {language === 'my' 
              ? 'ပြည်ပမှ လွှဲပို့ငွေ ထုတ်ယူမှုများကို နေ့ရက်အလိုက် အစဉ်လိုက် စီစဉ်၍ ငွေကြေးအမျိုးအစားအလိုက် စုစုပေါင်း ထုတ်ပေးငွေများကို တွက်ချက်ဖော်ပြသည့် စာရင်းဇယား' 
              : 'Consolidated day-by-day chronological inward claim disbursement reconciliation with multi-currency column breakdowns.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Toggle Date Ordering"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-teal-400" />
            <span>
              {sortOrder === 'DESC' 
                ? (language === 'my' ? 'ရက်စွဲ (အသစ်မှ အဟောင်း)' : 'Date: Newest First') 
                : (language === 'my' ? 'ရက်စွဲ (အဟောင်းမှ အသစ်)' : 'Date: Oldest First')}
            </span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>{language === 'my' ? 'ပုံနှိပ်မည်' : 'Print'}</span>
          </button>

          <button
            onClick={exportCsv}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t.exportCsv || 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Disbursed MMK Payout</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {totalPayoutMMK.toLocaleString()} <span className="text-xs font-bold">MMK</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {filteredTxs.length} claims filtered across {dayByDayTotals.length} active date(s)
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Operating Days</span>
          <div className="text-2xl font-black text-teal-400 font-mono mt-1">
            {dayByDayTotals.length} <span className="text-xs font-bold text-slate-400">Days</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {dayByDayTotals.length > 0 ? `${dayByDayTotals[0].formattedDate} ~ ${dayByDayTotals[dayByDayTotals.length - 1].formattedDate}` : '-'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Daily Average Payout</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            {dayByDayTotals.length > 0 ? Math.round(totalPayoutMMK / dayByDayTotals.length).toLocaleString() : 0} <span className="text-xs font-bold">MMK</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Average payout disbursed per active day</span>
        </div>
      </div>

      {/* Filter Toolbar (Clean English & Quick Presets) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs shadow-sm">
        {/* Quick Date Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-slate-400">
            <Calendar className="w-4 h-4 text-teal-400" />
            <span className="font-semibold text-white">Date Range (dd/mm/yyyy):</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleDatePreset('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeDatePreset === 'ALL'
                  ? 'bg-teal-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('TODAY')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeDatePreset === 'TODAY'
                  ? 'bg-teal-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('YESTERDAY')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeDatePreset === 'YESTERDAY'
                  ? 'bg-teal-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('WEEK')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeDatePreset === 'WEEK'
                  ? 'bg-teal-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('MONTH')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeDatePreset === 'MONTH'
                  ? 'bg-teal-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              This Month
            </button>
            {(startDate || endDate || selectedUser !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  handleDatePreset('ALL');
                  setSelectedUser('ALL');
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-medium flex items-center space-x-1 ml-1"
                title="Reset filters"
              >
                <X className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Inputs Grid: 2 Aligned Rows (5-Column Structure) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Top Row - Search Box (spans 3 columns) */}
          <div className="sm:col-span-2 md:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center space-x-1 h-5">
              <Search className="w-3.5 h-3.5 text-teal-400" />
              <span>Search</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search MTCN, Beneficiary NRC, Sender..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm h-[38px]"
              />
            </div>
          </div>

          {/* Top Row - From Date (1 column, directly aligns above Currency) */}
          <div className="col-span-1">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between h-5">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>From Date</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">DD/MM/YYYY</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleCustomDateChange('START', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-teal-500 cursor-pointer h-[38px]"
              title="From Date (DD/MM/YYYY)"
            />
          </div>

          {/* Top Row - To Date (1 column, directly aligns above Status) */}
          <div className="col-span-1">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between h-5">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>To Date</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">DD/MM/YYYY</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDateChange('END', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-teal-500 cursor-pointer h-[38px]"
              title="To Date (DD/MM/YYYY)"
            />
          </div>

          {/* Bottom Row - Users (1 column, Burmese removed as requested) */}
          <div className="col-span-1">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center space-x-1 h-5">
              <UserIcon className="w-3.5 h-3.5 text-teal-400" />
              <span>Users</span>
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 cursor-pointer text-sm h-[38px]"
              title="Filter by User / Operator"
            >
              <option value="ALL">All Users</option>
              {distinctUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.role ? `(${u.role})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Bottom Row - Country (1 column) */}
          <div className="col-span-1">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center space-x-1 h-5">
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>Country</span>
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                const c = e.target.value;
                setSelectedCountry(c);
                if (c !== 'ALL') {
                  const b = db.branches.find(br => br.countryCode === c);
                  if (b) setSelectedBranch(b.id);
                  else setSelectedBranch('ALL');
                } else {
                  setSelectedBranch('ALL');
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 cursor-pointer text-sm h-[38px]"
            >
              <option value="ALL">All Countries</option>
              {db.countries.map(c => (
                <option key={c.id} value={c.code}>
                  {c.flagEmoji} {c.nameEn} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Bottom Row - Branch (1 column) */}
          <div className="col-span-1">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center space-x-1 h-5">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              <span>Branch</span>
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 cursor-pointer text-sm h-[38px]"
            >
              <option value="ALL">All Branches</option>
              {db.branches
                .filter(b => selectedCountry === 'ALL' || b.countryCode === selectedCountry)
                .map(b => (
                  <option key={b.id} value={b.id}>{b.code} - {b.nameEn}</option>
                ))}
            </select>
          </div>

          {/* Bottom Row - Currency (1 column) */}
          <div className="col-span-1">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center space-x-1 h-5">
              <Coins className="w-3.5 h-3.5 text-teal-400" />
              <span>Currency</span>
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 cursor-pointer text-sm h-[38px]"
            >
              <option value="ALL">All Currencies</option>
              {db.currencies.filter(c => c.code !== 'MMK').map(c => (
                <option key={c.id} value={c.code}>{c.code} ({c.nameEn})</option>
              ))}
            </select>
          </div>

          {/* Bottom Row - Status (1 column) */}
          <div className="col-span-1">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center space-x-1 h-5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>Status</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 cursor-pointer text-sm h-[38px]"
            >
              <option value="ALL">All Status</option>
              <option value="APPROVED_AND_PAID_OUT">APPROVED AND PAID OUT</option>
              <option value="APPROVED_AND_SENT">APPROVED AND SENT</option>
              <option value="PAID_OUT">PAID OUT</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
              <option value="REJECTED">REJECTED</option>
              <option value="ON_HOLD">ON HOLD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table: Sequential Day by Day Total Report with Currency Columns */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white">
              {language === 'my' ? 'ရက်စွဲအလိုက် စုစုပေါင်း ငွေလွှဲထုတ်ယူမှု စာရင်း' : 'Sequential Day by Day Inward Summary Table'}
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] bg-teal-500/20 text-teal-300 font-mono">
              dd/mm/yyyy
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {dayByDayTotals.length} Day(s) Listed | {filteredTxs.length} Claims
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Date (dd/mm/yyyy)</th>
                <th className="px-4 py-3.5">Day</th>
                <th className="px-4 py-3.5 text-center">Claims Count</th>
                {sourceCurrenciesList.map(curr => (
                  <th key={curr} className="px-4 py-3.5 text-right text-teal-400">
                    Inbound ({curr})
                  </th>
                ))}
                <th className="px-4 py-3.5 text-right text-emerald-400">Disbursed Payout (MMK)</th>
                <th className="px-4 py-3.5 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {dayByDayTotals.length === 0 ? (
                <tr>
                  <td colSpan={5 + sourceCurrenciesList.length} className="text-center py-12 text-slate-500">
                    No inward claims found matching the selected date and criteria.
                  </td>
                </tr>
              ) : (
                dayByDayTotals.map((day) => {
                  const isExpanded = !!expandedDates[day.rawDate];
                  return (
                    <React.Fragment key={day.rawDate}>
                      <tr className="hover:bg-slate-800/60 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-white flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-teal-500" />
                          <span>{day.formattedDate}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 font-sans">
                          {day.dayOfWeek}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold">
                            {day.claimsCount}
                          </span>
                        </td>
                        {sourceCurrenciesList.map(curr => {
                          const amt = day.currencyTotals[curr] || 0;
                          return (
                            <td key={curr} className="px-4 py-3.5 text-right text-teal-300 font-semibold">
                              {amt > 0 ? amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3.5 text-right font-black text-emerald-400 font-sans text-sm">
                          {day.totalPayoutMMK.toLocaleString()} <span className="text-[10px] text-emerald-500 font-mono">MMK</span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-sans">
                          <button
                            type="button"
                            onClick={() => toggleDateExpand(day.rawDate)}
                            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse' : 'Expand Claims'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Sub-rows: Expanded Day Claims */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={5 + sourceCurrenciesList.length} className="p-4">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                              <div className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                                <span>Claims on {day.formattedDate} ({day.dayOfWeek}):</span>
                                <span className="text-slate-400">{day.transactions.length} claim(s)</span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px] text-slate-300">
                                  <thead className="text-slate-500 uppercase border-b border-slate-800">
                                    <tr>
                                      <th className="py-2 px-3">Tx No</th>
                                      <th className="py-2 px-3">MTCN</th>
                                      <th className="py-2 px-3">Beneficiary</th>
                                      <th className="py-2 px-3">Sender</th>
                                      <th className="py-2 px-3 text-right">Inbound Foreign</th>
                                      <th className="py-2 px-3 text-right">Disbursed MMK</th>
                                      <th className="py-2 px-3">User / Operator</th>
                                      <th className="py-2 px-3">Status</th>
                                      <th className="py-2 px-3 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60 font-mono">
                                    {day.transactions.map(t => (
                                      <tr key={t.id} className="hover:bg-slate-800/40">
                                        <td className="py-2 px-3 text-white font-bold">{t.transactionNo}</td>
                                        <td className="py-2 px-3 text-amber-400">{t.mtcn}</td>
                                        <td className="py-2 px-3 font-sans text-slate-200">{t.receiverName} ({t.receiverNrc})</td>
                                        <td className="py-2 px-3 font-sans text-slate-200">{t.senderName} ({t.senderCountryCode})</td>
                                        <td className="py-2 px-3 text-right text-teal-300 font-bold">{Number(t.sendAmount).toLocaleString()} {t.sourceCurrency}</td>
                                        <td className="py-2 px-3 text-right text-emerald-400 font-bold">{Number(t.receiveAmount).toLocaleString()} MMK</td>
                                        <td className="py-2 px-3 font-sans">
                                          <div className="text-slate-200 text-[11px] flex items-center space-x-1">
                                            <UserIcon className="w-3 h-3 text-teal-400 shrink-0" />
                                            <span className="truncate max-w-[120px]">{t.creatorName || 'Staff'}</span>
                                          </div>
                                          {t.approverName && (
                                            <div className="text-[10px] text-emerald-400 truncate max-w-[120px]">
                                              ✓ {t.approverName}
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 font-sans">
                                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 font-bold">
                                            {t.status}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right font-sans">
                                          <button
                                            onClick={() => setSelectedVoucherTx(t)}
                                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                                            title="Print Voucher"
                                          >
                                            <Printer className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Grand Total Row */}
            {dayByDayTotals.length > 0 && (
              <tfoot className="bg-slate-950 font-mono font-bold text-white border-t-2 border-slate-700">
                <tr>
                  <td className="px-4 py-4 font-sans uppercase tracking-wider text-teal-400">
                    GRAND TOTAL
                  </td>
                  <td className="px-4 py-4 font-sans text-slate-500">
                    {dayByDayTotals.length} Days
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-teal-600 text-white text-xs">
                      {grandTotalSummary.claimsCount}
                    </span>
                  </td>
                  {sourceCurrenciesList.map(curr => {
                    const totalAmt = grandTotalSummary.currencyTotals[curr] || 0;
                    return (
                      <td key={curr} className="px-4 py-4 text-right text-teal-300 text-sm">
                        {totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    );
                  })}
                  <td className="px-4 py-4 text-right text-base text-emerald-300 font-black">
                    {grandTotalSummary.totalPayoutMMK.toLocaleString()} <span className="text-xs text-emerald-400">MMK</span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Voucher Modal */}
      <VoucherModal
        isOpen={!!selectedVoucherTx}
        transaction={selectedVoucherTx}
        onClose={() => setSelectedVoucherTx(null)}
      />
    </div>
  );
};
