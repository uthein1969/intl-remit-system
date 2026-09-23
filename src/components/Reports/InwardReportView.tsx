import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  DownloadCloud, 
  Coins, 
  CheckCircle2,
  Paperclip,
  Calendar,
  BarChart3,
  FileText,
  X,
  User as UserIcon,
  Building2,
  Globe,
  Layers
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction } from '../../types';
import { VoucherModal } from '../VoucherModal';
import { formatToDDMMYYYY } from '../../lib/dateUtils';

export const InwardReportView: React.FC = () => {
  const { db, language, t, activeBranchId, activeCountryCode } = useRemittance();

  // View Mode: 'DETAILS' | 'DAY_BY_DAY'
  const [viewMode, setViewMode] = useState<'DETAILS' | 'DAY_BY_DAY'>('DETAILS');

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
      if (selectedStatus !== 'ALL' && tx.status !== selectedStatus) {
        return false;
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

      // Date Range Filter (User Request #2)
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

  // Distinct Source Foreign Currencies present in Inward Transactions
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

  // Day by Day Aggregation (User Request #3: Total Inward Report Day by Day with Currency Columns)
  interface InwardDaySummary {
    date: string;
    dayOfWeek: string;
    claimsCount: number;
    currencyTotals: Record<string, number>;
    totalPayoutMMK: number;
  }

  const dayByDayTotals = useMemo(() => {
    const dayMap: Record<string, InwardDaySummary> = {};

    filteredTxs.forEach(tx => {
      const dateStr = tx.createdDate ? new Date(tx.createdDate).toISOString().split('T')[0] : 'Unknown Date';
      if (!dayMap[dateStr]) {
        const dateObj = new Date(dateStr);
        const dayOfWeek = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString(undefined, { weekday: 'short' });
        dayMap[dateStr] = {
          date: dateStr,
          dayOfWeek,
          claimsCount: 0,
          currencyTotals: {},
          totalPayoutMMK: 0
        };
      }

      const row = dayMap[dateStr];
      row.claimsCount += 1;

      const sCurr = tx.sourceCurrency || 'THB';
      row.currencyTotals[sCurr] = (row.currencyTotals[sCurr] || 0) + Number(tx.sendAmount || 0);

      row.totalPayoutMMK += Number(tx.receiveAmount || 0);
    });

    // Sort descending by date
    return Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTxs]);

  // Grand Total for Day by Day Inward Report
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

  const totalPayoutMMK = filteredTxs.reduce((sum, tx) => sum + tx.receiveAmount, 0);

  // CSV Export: Detailed vs Day-by-Day
  const exportCsv = () => {
    if (viewMode === 'DAY_BY_DAY') {
      const headers = [
        'Date',
        'Day',
        'Claims Count',
        ...sourceCurrenciesList.map(c => `Inbound Remittance (${c})`),
        'Disbursed Payout (MMK)'
      ];

      const rows = dayByDayTotals.map(d => [
        formatToDDMMYYYY(d.date),
        d.dayOfWeek,
        d.claimsCount,
        ...sourceCurrenciesList.map(c => d.currencyTotals[c] || 0),
        d.totalPayoutMMK
      ]);

      // Add Grand Total Row
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
    } else {
      const headers = ['Transaction No', 'MTCN', 'Date', 'Country', 'Payout Branch', 'Beneficiary', 'NRC', 'Sender', 'Sender Passport', 'Passport Attached', 'Origin Country', 'Origin Amount', 'Origin Currency', 'Exchange Rate', 'Payout Amount (MMK)', 'Payout Method', 'Status', 'Operator / Maker', 'Approver / Checker'];
      const rows = filteredTxs.map(tx => {
        const branch = db.branches.find(b => b.id === tx.payoutBranchId);
        const country = db.countries.find(c => c.code === (branch?.countryCode || tx.senderCountryCode || 'MM'));
        return [
          tx.transactionNo,
          tx.mtcn,
          formatToDDMMYYYY(tx.createdDate),
          `"${country?.nameEn || tx.senderCountryCode || 'Myanmar'}"`,
          `"${branch ? `${branch.code} - ${branch.nameEn}` : (tx.payoutBranchId || 'BR-001')}"`,
          `"${tx.receiverName}"`,
          `"${tx.receiverNrc}"`,
          `"${tx.senderName}"`,
          `"${tx.senderPassport || tx.senderPassbook || ''}"`,
          (tx.senderPassportAttachment || tx.senderPassbookAttachment) ? 'YES' : 'NO',
          tx.senderCountryCode,
          tx.sendAmount,
          tx.sourceCurrency,
          tx.exchangeRate,
          tx.receiveAmount,
          tx.payoutMethod,
          tx.status,
          `"${tx.creatorName || tx.creatorUserId || ''}"`,
          `"${tx.approverName || tx.approverUserId || ''}"`
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Inward_Remittance_Detailed_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.inwardReportTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'my' 
              ? 'ပြည်ပမှ ပြည်တွင်းသို့ ငွေလွှဲလက်ခံ ထုတ်ယူမှု အစီရင်ခံစာနှင့် ရက်အလိုက် စုစုပေါင်း စာရင်းဇယား' 
              : 'Inbound foreign remittance claim reconciliation and consolidated day-by-day disbursement statements'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle: Details vs Day by Day */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('DETAILS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'DETAILS'
                  ? 'bg-[#A2D9CE] text-black border border-slate-700 shadow-xs'
                  : 'text-black hover:bg-[#C1ECE3]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-black" />
              <span className="text-black">{language === 'my' ? 'အသေးစိတ် စာရင်း' : 'Detailed List'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('DAY_BY_DAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'DAY_BY_DAY'
                  ? 'bg-[#A2D9CE] text-black border border-slate-700 shadow-xs'
                  : 'text-black hover:bg-[#C1ECE3]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-black" />
              <span className="text-black">{language === 'my' ? 'Total Inward Report (Day by Day)' : 'Day by Day Total Report'}</span>
            </button>
          </div>

          <button
            onClick={exportCsv}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{viewMode === 'DAY_BY_DAY' ? 'Export Daily CSV' : t.exportCsv}</span>
          </button>
        </div>
      </div>

      {/* KPI Box */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Disbursed MMK Payout</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {totalPayoutMMK.toLocaleString()} <span className="text-xs font-bold">MMK</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {filteredTxs.length} claims filtered across {dayByDayTotals.length} active day(s)
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Disbursement Status</span>
          <div className="text-2xl font-black text-teal-400 font-mono mt-1">
            {filteredTxs.filter(t => t.status === 'PAID_OUT' || t.status === 'APPROVED').length} / {filteredTxs.length}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Successfully disbursed claims</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Average Claim Payout</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            {filteredTxs.length > 0 ? Math.round(totalPayoutMMK / filteredTxs.length).toLocaleString() : 0} <span className="text-xs font-bold">MMK</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Average disbursed per claim</span>
        </div>
      </div>

      {/* Filter Toolbar (Clean English Dropdown Lists & Date Range) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs shadow-sm">
        {/* Quick Date Presets Row (User Request #2) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-slate-400">
            <Calendar className="w-4 h-4 text-teal-400" />
            <span className="font-semibold text-white">Date Filter:</span>
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
              <option value="PAID_OUT">PAID OUT</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
              <option value="REJECTED">REJECTED</option>
              <option value="ON_HOLD">ON HOLD</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: Total Inward Report (Day by Day with Currency Columns - User Request #3) */}
      {viewMode === 'DAY_BY_DAY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-white">
                {language === 'my' ? 'ရက်အလိုက် စုစုပေါင်း အစီရင်ခံစာ (Day by Day Total Inward Report with Currency Columns)' : 'Day by Day Inbound Remittance Summary with Currency Columns'}
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Showing {dayByDayTotals.length} active day(s) | {filteredTxs.length} total claim(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Date (ရက်စွဲ)</th>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3 text-center">Claims Count</th>
                  {sourceCurrenciesList.map(curr => (
                    <th key={curr} className="px-4 py-3 text-right text-teal-400">
                      Inbound ({curr})
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-emerald-400">Disbursed Payout (MMK)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {dayByDayTotals.length === 0 ? (
                  <tr>
                    <td colSpan={4 + sourceCurrenciesList.length} className="text-center py-10 text-slate-500">
                      {t.noData} (No claims found matching date and criteria)
                    </td>
                  </tr>
                ) : (
                  dayByDayTotals.map((day) => (
                    <tr key={day.date} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-white">
                        {formatToDDMMYYYY(day.date)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-sans">
                        {day.dayOfWeek}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold">
                          {day.claimsCount}
                        </span>
                      </td>
                      {sourceCurrenciesList.map(curr => {
                        const amt = day.currencyTotals[curr] || 0;
                        return (
                          <td key={curr} className="px-4 py-3 text-right text-teal-300 font-semibold">
                            {amt > 0 ? amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right font-black text-emerald-400 font-sans">
                        {day.totalPayoutMMK.toLocaleString()} <span className="text-[10px] text-emerald-500 font-mono">MMK</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Grand Total Footer Row */}
              {dayByDayTotals.length > 0 && (
                <tfoot className="bg-slate-950 font-mono font-bold text-white border-t-2 border-slate-700">
                  <tr>
                    <td className="px-4 py-3 font-sans uppercase tracking-wider text-teal-400">
                      GRAND TOTAL
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-500">
                      {dayByDayTotals.length} Days
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-xs">
                        {grandTotalSummary.claimsCount}
                      </span>
                    </td>
                    {sourceCurrenciesList.map(curr => {
                      const totalAmt = grandTotalSummary.currencyTotals[curr] || 0;
                      return (
                        <td key={curr} className="px-4 py-3 text-right text-teal-300 text-xs">
                          {totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right text-sm text-emerald-300 font-black">
                      {grandTotalSummary.totalPayoutMMK.toLocaleString()} <span className="text-xs text-emerald-400">MMK</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Detailed Transaction Ledger */}
      {viewMode === 'DETAILS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Tx No / MTCN</th>
                  <th className="px-4 py-3">{t.date}</th>
                  <th className="px-4 py-3">{t.payoutBranch}</th>
                  <th className="px-4 py-3">{t.receiverName}</th>
                  <th className="px-4 py-3">{t.senderName}</th>
                  <th className="px-4 py-3">{t.sendAmount}</th>
                  <th className="px-4 py-3">{t.receiveAmount}</th>
                  <th className="px-4 py-3">User / Operator</th>
                  <th className="px-4 py-3">{t.status}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTxs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-500">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  filteredTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-white block">{tx.transactionNo}</span>
                        <span className="font-mono text-amber-400 text-[11px]">MTCN: {tx.mtcn}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {formatToDDMMYYYY(tx.createdDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-teal-400 font-semibold text-[11px] block">
                          {db.branches.find(b => b.id === tx.payoutBranchId)?.code || tx.payoutBranchId || 'BR-001'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {db.branches.find(b => b.id === tx.payoutBranchId)?.nameEn || 'Yangon HQ'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-200">{tx.receiverName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{tx.receiverNrc}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-200">{tx.senderName}</div>
                        <div className="text-[10px] text-slate-500">{tx.senderCountryCode}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-200">
                        {Number(tx.sendAmount || 0).toLocaleString()} {tx.sourceCurrency}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        {Number(tx.receiveAmount || 0).toLocaleString()} MMK
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200 text-[11px] flex items-center space-x-1">
                          <UserIcon className="w-3 h-3 text-teal-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{tx.creatorName || 'Staff'}</span>
                        </div>
                        {tx.approverName && (
                          <div className="text-[10px] text-emerald-400 mt-0.5 truncate max-w-[130px]" title={`Approved by ${tx.approverName}`}>
                            ✓ {tx.approverName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          tx.status === 'PAID_OUT'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : tx.status === 'APPROVED'
                            ? 'bg-teal-500/20 text-teal-300'
                            : tx.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedVoucherTx(tx)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                          title={t.printVoucher}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      <VoucherModal
        isOpen={!!selectedVoucherTx}
        transaction={selectedVoucherTx}
        onClose={() => setSelectedVoucherTx(null)}
      />
    </div>
  );
};
