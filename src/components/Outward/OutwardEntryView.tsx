import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Send, 
  ShieldAlert, 
  ShieldCheck, 
  Calculator, 
  UserCheck2, 
  Building2, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Coins,
  Upload,
  User,
  Paperclip,
  MapPin,
  Phone,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  FileCheck,
  X,
  Maximize2,
  Sparkles,
  Receipt,
  Layers,
  Loader2,
  Calendar,
  Clock,
  Search,
  Users,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRemittance } from '../../lib/store';
import { RemittanceScope, PayoutMethod, RemittanceTransaction, BlacklistEntry, Customer } from '../../types';
import { VoucherModal } from '../VoucherModal';
import { DobDatePicker, formatToDDMMYYYY } from '../Common/DobDatePicker';
import { DocumentLightboxModal } from '../Common/DocumentLightboxModal';
import { CustomerSearchAutoFill } from './CustomerSearchAutoFill';
import { 
  createSampleMyanmarNrcSvg, 
  createSampleMyanmarNrcBackSvg, 
  createSampleMyanmarPassportSvg,
  createSampleDepositReceiptSvg
} from '../../lib/sampleDocuments';
import { extractNrcInfoFromUpload, scanNrcWithAi, ExtractedNrcInfo } from '../../lib/nrcOcrParser';
import { readFileAsOptimizedDataUrl } from '../../lib/imageCompressor';

export const OutwardEntryView: React.FC = () => {
  const { 
    db, 
    language, 
    t, 
    checkBlacklist, 
    checkExactNrcBlacklist,
    getExchangeRate, 
    getCorridorExchangeRate,
    createOutwardRemittance, 
    currentUser,
    activeBranchId,
    activeCountryCode,
    defaultStatusConfig
  } = useRemittance();

  // Active User / Login Branch & Country context
  const currentBranch = db.branches.find(b => b.id === (activeBranchId || currentUser.branchId)) || db.branches[0];
  const currentCountry = db.countries.find(c => c.code === (activeCountryCode || currentUser.countryCode || currentBranch?.countryCode || 'MM'));
  const userCountryCode = (currentCountry?.code || activeCountryCode || currentUser.countryCode || currentBranch?.countryCode || 'MM').toUpperCase();
  const isMyanmarLogin = userCountryCode === 'MM';

  // Rule: Default Status Check Box in Admin Setup for User Admin Role:
  // If User Login by Other Country, Default is International and Passport.
  // If User Login by Myanmar Country, Default is Domestic and NRC.
  const isDefaultStatusEnabled = (currentUser?.defaultStatusEnabled !== false) &&
    (defaultStatusConfig?.autoCountryDefault !== false) &&
    (defaultStatusConfig?.applyOutwardEntry !== false);

  const initialScope: RemittanceScope = isDefaultStatusEnabled
    ? (isMyanmarLogin ? 'DOMESTIC' : 'INTERNATIONAL')
    : 'INTERNATIONAL';

  const initialIdType: 'NRC' | 'PASSPORT' = isDefaultStatusEnabled
    ? (isMyanmarLogin ? 'NRC' : 'PASSPORT')
    : (isMyanmarLogin ? 'NRC' : 'PASSPORT');

  // Form State
  const [scope, setScope] = useState<RemittanceScope>(initialScope);
  
  // Sender
  const [senderName, setSenderName] = useState('');
  const [senderNameMm, setSenderNameMm] = useState('');
  // Rule: If User Login by Myanmar Country Default is NRC and Login by other country Default is Passport
  const [senderIdType, setSenderIdType] = useState<'NRC' | 'PASSPORT'>(initialIdType);
  const [senderNrc, setSenderNrc] = useState('');
  const [senderPassport, setSenderPassport] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCountryCode, setSenderCountryCode] = useState(userCountryCode || 'MM');
  const [senderFatherName, setSenderFatherName] = useState('');
  const [senderDateOfBirth, setSenderDateOfBirth] = useState('');
  const [senderOccupation, setSenderOccupation] = useState('');
  const [senderSourceOfFund, setSenderSourceOfFund] = useState('Salary / Business Income');

  // Sender Document Attachments
  const [senderNrcFrontDoc, setSenderNrcFrontDoc] = useState<{ url?: string; name?: string; type?: string; size?: string } | null>(null);
  const [senderNrcBackDoc, setSenderNrcBackDoc] = useState<{ url?: string; name?: string; type?: string; size?: string } | null>(null);
  const [senderPassportDoc, setSenderPassportDoc] = useState<{ url?: string; name?: string; type?: string; size?: string } | null>(null);
  const [selectedSenderCustomer, setSelectedSenderCustomer] = useState<Customer | null>(null);

  // Receiver
  const [receiverName, setReceiverName] = useState('');
  const [receiverNameMm, setReceiverNameMm] = useState('');
  const [receiverNrc, setReceiverNrc] = useState('');
  const [receiverPassport, setReceiverPassport] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverCountryCode, setReceiverCountryCode] = useState(() => (initialScope === 'DOMESTIC' ? userCountryCode : (userCountryCode === 'MM' ? 'TH' : 'MM')));
  const [selectedReceiverCustomer, setSelectedReceiverCustomer] = useState<Customer | null>(null);

  // Helper for currency-specific default fees
  const getDefaultFees = (currency: string) => {
    switch (currency) {
      case 'THB': return { service: 100, commission: 50 };
      case 'SGD': return { service: 10, commission: 5 };
      case 'MYR': return { service: 15, commission: 5 };
      case 'USD': return { service: 10, commission: 5 };
      case 'MMK':
      default: return { service: 15000, commission: 5000 };
    }
  };

  // Financials
  const initialSourceCurr = userCountryCode === 'MM' ? 'MMK' : (userCountryCode === 'TH' ? 'THB' : (userCountryCode === 'SG' ? 'SGD' : (userCountryCode === 'MY' ? 'MYR' : 'MMK')));
  const initialFees = getDefaultFees(initialSourceCurr);
  const [sourceCurrency, setSourceCurrency] = useState(initialSourceCurr);
  const [targetCurrency, setTargetCurrency] = useState(() => (initialScope === 'DOMESTIC' ? initialSourceCurr : (userCountryCode === 'MM' ? 'THB' : 'MMK')));
  const [sendAmount, setSendAmount] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    if (initialScope === 'DOMESTIC') return 1;
    return 134.50;
  });
  const [serviceFee, setServiceFee] = useState<number>(initialFees.service);
  const [commissionFee, setCommissionFee] = useState<number>(initialFees.commission);

  // USD Base Conversion States
  const [isUsdBase, setIsUsdBase] = useState<boolean>(false);
  const [usdExchangeRate, setUsdExchangeRate] = useState<number>(34.05);

  // Helper to determine default USD rate for a given target currency
  const getUsdRateForCurrency = useCallback((curr: string): number => {
    if (!curr || curr === 'USD') return 1;
    if (curr === 'MMK') {
      return getCorridorExchangeRate('USD', 'MMK') || 4580;
    }
    // Direct rate in exchange rates
    const directUsd = db.exchangeRates.find(r => 
      ((r.fromCurrency || (r as any).from_currency || '').toUpperCase() === 'USD') &&
      ((r.toCurrency || (r as any).to_currency || '').toUpperCase() === curr.toUpperCase())
    );
    if (directUsd) {
      const val = Number((directUsd as any).transferRate || directUsd.buyRate || 0);
      if (val > 0) return val;
    }

    const revUsd = db.exchangeRates.find(r => 
      ((r.fromCurrency || (r as any).from_currency || '').toUpperCase() === curr.toUpperCase()) &&
      ((r.toCurrency || (r as any).to_currency || '').toUpperCase() === 'USD')
    );
    if (revUsd) {
      const val = Number((revUsd as any).transferRate || revUsd.buyRate || 0);
      if (val > 0) return val >= 1 ? 1 / val : val;
    }

    // Cross-rate via MMK
    const usdMmk = getCorridorExchangeRate('USD', 'MMK') || 4580;
    const currMmk = getCorridorExchangeRate(curr, 'MMK');
    if (currMmk && currMmk > 0) {
      return Number((usdMmk / currMmk).toFixed(4));
    }

    // Fallbacks
    switch (curr.toUpperCase()) {
      case 'THB': return 34.05;
      case 'SGD': return 1.31;
      case 'MYR': return 4.32;
      case 'EUR': return 0.92;
      case 'GBP': return 0.77;
      case 'JPY': return 155.0;
      case 'CNY': return 7.25;
      default: return 1;
    }
  }, [db.exchangeRates, getCorridorExchangeRate]);

  // Synchronize USD rate when targetCurrency changes
  useEffect(() => {
    if (targetCurrency) {
      setUsdExchangeRate(getUsdRateForCurrency(targetCurrency));
    }
  }, [targetCurrency, getUsdRateForCurrency]);
  
  // Track currency to auto-adjust default fees
  const prevSourceCurrencyRef = useRef(sourceCurrency);
  useEffect(() => {
    if (prevSourceCurrencyRef.current !== sourceCurrency) {
      prevSourceCurrencyRef.current = sourceCurrency;
      const fees = getDefaultFees(sourceCurrency);
      setServiceFee(fees.service);
      setCommissionFee(fees.commission);
    }
  }, [sourceCurrency]);
  
  // Method & Purpose
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('CASH_PICKUP');
  const [payoutBankName, setPayoutBankName] = useState('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [purposeId, setPurposeId] = useState('PUR-001');
  const [partnerCompanyId, setPartnerCompanyId] = useState('CMP-005');
  const [sendingBranchId, setSendingBranchId] = useState(activeBranchId || currentUser.branchId || 'BR-001');
  const [payoutBranchId, setPayoutBranchId] = useState<string>(() => {
    const otherBranch = db.branches.find(b => b.countryCode === 'MM' && b.id !== (activeBranchId || currentUser.branchId || 'BR-001'));
    return otherBranch?.id || 'BR-002';
  });

  useEffect(() => {
    if (activeBranchId) {
      setSendingBranchId(activeBranchId);
      if (payoutBranchId === activeBranchId) {
        const nextOther = db.branches.find(b => b.countryCode === 'MM' && b.id !== activeBranchId);
        if (nextOther) setPayoutBranchId(nextOther.id);
      }
    }
  }, [activeBranchId]);

  // Sync default sender ID type and scope according to user login country & admin configuration:
  // If User Login by Myanmar Country Default is Domestic and NRC; Other Country Default is International and Passport
  useEffect(() => {
    if (isDefaultStatusEnabled) {
      const defaultScope: RemittanceScope = isMyanmarLogin ? 'DOMESTIC' : 'INTERNATIONAL';
      const defaultType: 'NRC' | 'PASSPORT' = isMyanmarLogin ? 'NRC' : 'PASSPORT';
      setScope(defaultScope);
      setSenderIdType(defaultType);
      setSenderCountryCode(userCountryCode);
      if (defaultScope === 'DOMESTIC') {
        setReceiverCountryCode(userCountryCode);
        setSourceCurrency('MMK');
        setTargetCurrency('MMK');
      } else {
        setReceiverCountryCode(userCountryCode === 'MM' ? 'TH' : 'MM');
        setSourceCurrency(userCountryCode === 'TH' ? 'THB' : (userCountryCode === 'SG' ? 'SGD' : (userCountryCode === 'MY' ? 'MYR' : 'MMK')));
        setTargetCurrency(userCountryCode === 'MM' ? 'THB' : 'MMK');
      }
    }
  }, [userCountryCode, currentUser.id, isMyanmarLogin, isDefaultStatusEnabled]);

  const handleScopeChange = (newScope: RemittanceScope) => {
    setScope(newScope);
    if (newScope === 'DOMESTIC') {
      const recCountry = userCountryCode === 'MM' ? 'MM' : userCountryCode;
      setReceiverCountryCode(recCountry);
      setTargetCurrency('MMK');
      const otherBranch = db.branches.find(b => b.countryCode === recCountry && b.id !== sendingBranchId) || db.branches.find(b => b.id !== sendingBranchId);
      if (otherBranch) setPayoutBranchId(otherBranch.id);
    } else {
      const targetCountry = userCountryCode === 'MM' ? 'TH' : 'MM';
      setReceiverCountryCode(targetCountry);
      setTargetCurrency(userCountryCode === 'MM' ? 'THB' : 'MMK');
      const targetBranch = db.branches.find(b => b.countryCode === targetCountry && b.id !== sendingBranchId) || db.branches.find(b => b.id !== sendingBranchId);
      if (targetBranch) setPayoutBranchId(targetBranch.id);
    }
  };

  const handleApplyCountryDefaultStatus = () => {
    const defaultScope: RemittanceScope = isMyanmarLogin ? 'DOMESTIC' : 'INTERNATIONAL';
    const defaultIdType: 'NRC' | 'PASSPORT' = isMyanmarLogin ? 'NRC' : 'PASSPORT';
    setScope(defaultScope);
    setSenderIdType(defaultIdType);
    setSenderCountryCode(userCountryCode);
    if (defaultScope === 'DOMESTIC') {
      setReceiverCountryCode(userCountryCode);
      setSourceCurrency('MMK');
      setTargetCurrency('MMK');
    } else {
      setReceiverCountryCode(userCountryCode === 'MM' ? 'TH' : 'MM');
      setSourceCurrency(userCountryCode === 'TH' ? 'THB' : (userCountryCode === 'SG' ? 'SGD' : (userCountryCode === 'MY' ? 'MYR' : 'MMK')));
      setTargetCurrency(userCountryCode === 'MM' ? 'THB' : 'MMK');
    }
    setUploadFeedback({
      message: language === 'my'
        ? `မူရင်းသတ်မှတ်ချက် အောင်မြင်စွာ သတ်မှတ်ပြီးပါပြီ- ${defaultScope === 'DOMESTIC' ? 'ပြည်တွင်း (Domestic)' : 'နိုင်ငံတကာ (International)'} နှင့် ${defaultIdType === 'NRC' ? 'မှတ်ပုံတင် (NRC)' : 'နိုင်ငံကူးလက်မှတ် (Passport)'}`
        : `Applied Default Status: ${defaultScope} & ${defaultIdType} (${isMyanmarLogin ? 'Myanmar Login' : 'Other Country Login'})`
    });
    setTimeout(() => setUploadFeedback(null), 4000);
  };
  const [senderNote, setSenderNote] = useState('');

  // Transaction Date & Time (User Request #1: Form အပေါ်ပိုင်းမှာ Date Time ဖော်ပြရန်)
  const getLocalDateTimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [entryDateTime, setEntryDateTime] = useState<string>(getLocalDateTimeString);
  const [liveCurrentTime, setLiveCurrentTime] = useState<string>(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleResetToCurrentTime = () => {
    setEntryDateTime(getLocalDateTimeString());
  };
  
  // Purpose & Routing Details: Proof Attachment Category & Documents
  const [proofCategory, setProofCategory] = useState<'DEPOSIT_RECEIPT' | 'CUSTOM'>('DEPOSIT_RECEIPT');
  const [proofDocumentName, setProofDocumentName] = useState('');
  const [depositReceiptDoc, setDepositReceiptDoc] = useState<{ url?: string; name?: string; type?: string; size?: string } | null>(null);
  const [customProofDoc, setCustomProofDoc] = useState<{ url?: string; name?: string; type?: string; size?: string } | null>(null);

  // Lightbox Preview Modal State
  const [lightboxDoc, setLightboxDoc] = useState<{
    isOpen: boolean;
    title: string;
    url?: string;
    name?: string;
    type?: string;
    size?: string;
    idNumber?: string;
    sender?: string;
  } | null>(null);

  // User notification / feedback banner
  const [uploadFeedback, setUploadFeedback] = useState<{ message: string; type?: string } | null>(null);
  const [nrcOcrResult, setNrcOcrResult] = useState<ExtractedNrcInfo | null>(null);
  const [isScanningNrc, setIsScanningNrc] = useState(false);
  // OCR Checkbox Toggle: Default is unchecked (false), OCR function only works when checked (true)
  const [isOcrEnabled, setIsOcrEnabled] = useState<boolean>(false);

  // Compliance Screening Matches
  const [senderMatch, setSenderMatch] = useState<BlacklistEntry | null>(null);
  const [receiverMatch, setReceiverMatch] = useState<BlacklistEntry | null>(null);

  // Submission & Voucher preview
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTx, setCreatedTx] = useState<RemittanceTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Recalculate exchange rate when currencies or scope change
  useEffect(() => {
    if (scope === 'DOMESTIC' || sourceCurrency === targetCurrency) {
      setExchangeRate(1);
      return;
    }

    const rate = getCorridorExchangeRate(sourceCurrency, targetCurrency);
    setExchangeRate(rate > 0 ? rate : 134.50);
  }, [scope, sourceCurrency, targetCurrency, getCorridorExchangeRate]);

  // Adjust default country and currency when scope changes
  useEffect(() => {
    if (scope === 'DOMESTIC') {
      const domesticCur = userCountryCode === 'MM' ? 'MMK' : (userCountryCode === 'TH' ? 'THB' : (userCountryCode === 'SG' ? 'SGD' : (userCountryCode === 'MY' ? 'MYR' : 'MMK')));
      setReceiverCountryCode(userCountryCode === 'MM' ? 'MM' : userCountryCode);
      setTargetCurrency(domesticCur);
      setSourceCurrency(domesticCur);
      setExchangeRate(1);
    } else {
      if (userCountryCode === 'MM') {
        setReceiverCountryCode('TH');
        setSourceCurrency('MMK');
        setTargetCurrency('THB');
      } else {
        setReceiverCountryCode('MM');
        setSourceCurrency(userCountryCode === 'TH' ? 'THB' : (userCountryCode === 'SG' ? 'SGD' : (userCountryCode === 'MY' ? 'MYR' : 'USD')));
        setTargetCurrency('MMK');
      }
    }
  }, [scope, userCountryCode]);

  // Real-time screening on sender NRC for CRITICAL Blacklist (Strictly exact NRC match only)
  // If backspace is pressed or any number is changed, does NOT show "FLAGGED" label
  useEffect(() => {
    if (!senderNrc || senderIdType !== 'NRC') {
      setSenderMatch(null);
      return;
    }
    const match = checkExactNrcBlacklist(senderNrc, 'CRITICAL');
    setSenderMatch(match);
  }, [senderNrc, senderIdType, checkExactNrcBlacklist]);

  // Real-time screening on receiver NRC for CRITICAL Blacklist (Strictly exact NRC match only)
  // If backspace is pressed or any number is changed, does NOT show "FLAGGED" label
  useEffect(() => {
    if (!receiverNrc) {
      setReceiverMatch(null);
      return;
    }
    const match = checkExactNrcBlacklist(receiverNrc, 'CRITICAL');
    setReceiverMatch(match);
  }, [receiverNrc, checkExactNrcBlacklist]);

  // Calculations
  const calculatedReceiveAmount = (() => {
    const amt = Number(sendAmount || 0);
    const rate = Number(exchangeRate || 0);
    if (amt <= 0 || rate <= 0) return 0;

    if (sourceCurrency === targetCurrency) {
      return Number(amt.toFixed(2));
    }

    if (sourceCurrency === 'MMK' && targetCurrency !== 'MMK') {
      // MMK to foreign (e.g. MMK to THB):
      // Rate is quoted in MMK per 1 foreign currency unit (e.g. 134.50 MMK per THB)
      // So receiveAmount in THB = SendAmount / Rate
      if (rate >= 1) {
        return Number((amt / rate).toFixed(2));
      } else {
        return Number((amt * rate).toFixed(2));
      }
    }

    if (sourceCurrency !== 'MMK' && targetCurrency === 'MMK') {
      // Foreign to MMK (e.g. THB to MMK):
      // Rate is quoted in MMK per 1 foreign currency unit (e.g. 134.50 MMK per THB)
      // So receiveAmount in MMK = SendAmount * Rate
      if (rate >= 1) {
        return Number((amt * rate).toFixed(2));
      } else {
        // Defensive: if reciprocal (e.g. 0.007547) was somehow entered, invert to proper MMK value
        return Number((amt / rate).toFixed(2));
      }
    }

    // Cross-currency
    return Number((amt * rate).toFixed(2));
  })();

  // USD Base Calculations
  const calculatedUsdAmount = useMemo(() => {
    if (!isUsdBase) return 0;
    const recv = Number(calculatedReceiveAmount || 0);
    if (recv <= 0) return 0;
    if (targetCurrency === 'USD') return Number(recv.toFixed(2));

    if (targetCurrency === 'MMK') {
      const rate = usdExchangeRate > 0 ? usdExchangeRate : 4580;
      return Number((recv / rate).toFixed(2));
    }

    if (usdExchangeRate > 0) {
      return Number((recv / usdExchangeRate).toFixed(2));
    }
    return 0;
  }, [isUsdBase, calculatedReceiveAmount, targetCurrency, usdExchangeRate]);

  const calculatedUsdServiceFee = useMemo(() => {
    if (!isUsdBase) return 0;
    const totalFee = Number(serviceFee || 0) + Number(commissionFee || 0);
    if (totalFee <= 0) return 0;
    if (sourceCurrency === 'USD') return Number(totalFee.toFixed(2));
    if (sourceCurrency === 'MMK') {
      const usdMmk = getCorridorExchangeRate('USD', 'MMK') || 4580;
      return Number((totalFee / usdMmk).toFixed(2));
    }
    if (usdExchangeRate > 0) {
      return Number((totalFee / usdExchangeRate).toFixed(2));
    }
    return 0;
  }, [isUsdBase, serviceFee, commissionFee, sourceCurrency, usdExchangeRate, getCorridorExchangeRate]);

  const totalPayableAmount = Number(sendAmount) + Number(serviceFee) + Number(commissionFee);

  // Quick fill & auto-fill sender customer data from customer_profiles
  const handleSelectSenderCustomer = (custOrId: string | Customer) => {
    let cust: Customer | undefined;
    if (typeof custOrId === 'string') {
      cust = db.customers.find(c => c.id === custOrId);
    } else {
      cust = custOrId;
    }
    if (cust) {
      setSelectedSenderCustomer(cust);
      setSenderName(cust.fullNameEn || '');
      setSenderNameMm(cust.fullNameMm || '');
      setSenderNrc(cust.nrcNumber || '');
      setSenderPassport(cust.passportNumber || cust.passbookNumber || '');
      setSenderPhone(cust.phone || '');
      setSenderAddress(cust.address || '');
      if (cust.fatherName) setSenderFatherName(cust.fatherName);
      if (cust.occupation) setSenderOccupation(cust.occupation);
      if (cust.dateOfBirth || cust.dob) setSenderDateOfBirth(formatToDDMMYYYY(cust.dateOfBirth || cust.dob));
      if (cust.passportNumber && !cust.nrcNumber) {
        setSenderIdType('PASSPORT');
      } else if (cust.nrcNumber && !cust.passportNumber) {
        setSenderIdType('NRC');
      } else {
        setSenderIdType(isMyanmarLogin ? 'NRC' : 'PASSPORT');
      }
    }
  };

  const handleClearSenderCustomer = () => {
    setSelectedSenderCustomer(null);
    setSenderName('');
    setSenderNameMm('');
    setSenderNrc('');
    setSenderPassport('');
    setSenderPhone('');
    setSenderAddress('');
    setSenderFatherName('');
    setSenderOccupation('');
    setSenderDateOfBirth('');
  };

  // Quick fill & auto-fill receiver customer data from customer_profiles
  const handleSelectReceiverCustomer = (custOrId: string | Customer) => {
    let cust: Customer | undefined;
    if (typeof custOrId === 'string') {
      cust = db.customers.find(c => c.id === custOrId);
    } else {
      cust = custOrId;
    }
    if (cust) {
      setSelectedReceiverCustomer(cust);
      setReceiverName(cust.fullNameEn || '');
      setReceiverNameMm(cust.fullNameMm || '');
      setReceiverNrc(cust.nrcNumber || '');
      setReceiverPassport(cust.passportNumber || cust.passbookNumber || '');
      setReceiverPhone(cust.phone || '');
      setReceiverAddress(cust.address || '');
    }
  };

  const handleClearReceiverCustomer = () => {
    setSelectedReceiverCustomer(null);
    setReceiverName('');
    setReceiverNameMm('');
    setReceiverNrc('');
    setReceiverPassport('');
    setReceiverPhone('');
    setReceiverAddress('');
  };

  // Inline suggestions for Sender Name (search by contain from customer_profiles)
  const senderNameSuggestions = useMemo(() => {
    if (selectedSenderCustomer || !senderName.trim() || senderName.trim().length < 2) return [];
    const q = senderName.trim().toLowerCase();
    return db.customers.filter(c => 
      c.fullNameEn?.toLowerCase().includes(q) || 
      c.fullNameMm?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.nrcNumber?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [senderName, selectedSenderCustomer, db.customers]);

  // Inline suggestions for Receiver Name (search by contain from customer_profiles)
  const receiverNameSuggestions = useMemo(() => {
    if (selectedReceiverCustomer || !receiverName.trim() || receiverName.trim().length < 2) return [];
    const q = receiverName.trim().toLowerCase();
    return db.customers.filter(c => 
      c.fullNameEn?.toLowerCase().includes(q) || 
      c.fullNameMm?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.nrcNumber?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [receiverName, selectedReceiverCustomer, db.customers]);

  // Helper to generate sample Front NRC
  const handleAttachSampleNrcFront = () => {
    const nrcVal = senderNrc || '12/BAHANA(N)184920';
    const nameMmVal = senderNameMm || 'ဦးဇော်ဝင်းထက်';
    const nameEnVal = senderName || 'U ZAW WIN HTET';
    const dobVal = formatToDDMMYYYY(senderDateOfBirth) || '14/07/1988';
    const fatherVal = senderFatherName || 'U TIN AUNG';
    const url = createSampleMyanmarNrcSvg(nrcVal, nameMmVal, nameEnVal, dobVal, fatherVal);
    const name = `NRC_Front_${nameEnVal.replace(/\s+/g, '_')}_${nrcVal.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    const doc = { url, name, type: 'image/svg+xml', size: '18.4 KB' };
    setSenderNrcFrontDoc(doc);
    setSenderIdType('NRC');

    if (isOcrEnabled) {
      if (!senderName) setSenderName(nameEnVal);
      if (!senderNameMm) setSenderNameMm(nameMmVal);
      if (!senderNrc) setSenderNrc(nrcVal);
      if (!senderFatherName) setSenderFatherName(fatherVal);
      if (!senderDateOfBirth) setSenderDateOfBirth(dobVal);

      setNrcOcrResult({
        nameEn: nameEnVal,
        nameMm: nameMmVal,
        nrcNumber: nrcVal,
        fatherName: fatherVal,
        dob: dobVal,
        confidence: 99,
        method: 'SVG_TEXT',
        extractedFields: ['nrcNumber', 'nameEn', 'nameMm', 'fatherName', 'dob']
      });

      setUploadFeedback({
        message: language === 'my'
          ? `✨ [OCR ON] မှတ်ပုံတင်မှ အမည် (${nameEnVal}) နှင့် မှတ်ပုံတင်နံပတ် (${nrcVal}) ကို Auto ဖတ်ရှုဖော်ပြပြီးပါပြီ`
          : `✨ [OCR ON] Auto-populated Name (${nameEnVal}) and NRC (${nrcVal}) from NRC Card`
      });
      setTimeout(() => setUploadFeedback(null), 6000);
    } else {
      setNrcOcrResult(null);
      setUploadFeedback({
        message: language === 'my'
          ? `မှတ်ပုံတင် အရှေ့ခြမ်း (NRC Front) အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ (OCR အမှန်ခြစ် ဖြုတ်ထားပါသည်)`
          : `Successfully attached Sender NRC Card (Front) without OCR (OCR is unchecked)`
      });
      setTimeout(() => setUploadFeedback(null), 5000);
    }
  };

  // Helper to generate sample Back NRC
  const handleAttachSampleNrcBack = () => {
    const occupationVal = senderOccupation || 'ကုမ္ပဏီဝန်ထမ်း (Company Staff)';
    const addressVal = senderAddress || 'အမှတ် (၁၂)၊ ဗဟန်းလမ်း၊ ဗဟန်းမြို့နယ်၊ ရန်ကုန်';
    const url = createSampleMyanmarNrcBackSvg(occupationVal, addressVal);
    const name = `NRC_Back_${(senderName || 'Sender').replace(/\s+/g, '_')}_${(senderNrc || 'Card').replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    const doc = { url, name, type: 'image/svg+xml', size: '16.2 KB' };
    setSenderNrcBackDoc(doc);
    setUploadFeedback({
      message: language === 'my'
        ? `မှတ်ပုံတင် အနောက်ခြမ်း (NRC Back) အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ`
        : `Successfully attached Sender NRC Card (Back)`
    });
    setTimeout(() => setUploadFeedback(null), 5000);
  };

  // Helper to attach Both Front & Back NRC at once
  const handleAttachBothNrc = () => {
    const nrcVal = senderNrc || '12/BAHANA(N)184920';
    const nameMmVal = senderNameMm || 'ဦးဇော်ဝင်းထက်';
    const nameEnVal = senderName || 'U ZAW WIN HTET';
    const dobVal = formatToDDMMYYYY(senderDateOfBirth) || '14/07/1988';
    const fatherVal = senderFatherName || 'U TIN AUNG';
    const occupationVal = senderOccupation || 'ကုမ္ပဏီဝန်ထမ်း (Company Staff)';
    const addressVal = senderAddress || 'အမှတ် (၁၂)၊ ဗဟန်းလမ်း၊ ဗဟန်းမြို့နယ်၊ ရန်ကုန်';

    const frontUrl = createSampleMyanmarNrcSvg(nrcVal, nameMmVal, nameEnVal, dobVal, fatherVal);
    const frontName = `NRC_Front_${nameEnVal.replace(/\s+/g, '_')}_${nrcVal.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    setSenderNrcFrontDoc({ url: frontUrl, name: frontName, type: 'image/svg+xml', size: '18.4 KB' });

    const backUrl = createSampleMyanmarNrcBackSvg(occupationVal, addressVal);
    const backName = `NRC_Back_${nameEnVal.replace(/\s+/g, '_')}_${nrcVal.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    setSenderNrcBackDoc({ url: backUrl, name: backName, type: 'image/svg+xml', size: '16.2 KB' });
    setSenderIdType('NRC');

    if (isOcrEnabled) {
      setSenderName(nameEnVal);
      setSenderNameMm(nameMmVal);
      setSenderNrc(nrcVal);
      if (!senderFatherName) setSenderFatherName(fatherVal);
      if (!senderDateOfBirth) setSenderDateOfBirth(dobVal);
      if (!senderAddress) setSenderAddress(addressVal);

      setNrcOcrResult({
        nameEn: nameEnVal,
        nameMm: nameMmVal,
        nrcNumber: nrcVal,
        fatherName: fatherVal,
        dob: dobVal,
        address: addressVal,
        confidence: 99,
        method: 'SVG_TEXT',
        extractedFields: ['nrcNumber', 'nameEn', 'nameMm', 'fatherName', 'dob', 'address']
      });

      setUploadFeedback({
        message: language === 'my'
          ? `✨ [OCR ON] မှတ်ပုံတင် (ရှေ့/နောက်) ပူးတွဲပြီး အမည် (${nameEnVal}) နှင့် မှတ်ပုံတင်နံပတ် (${nrcVal}) အား Auto တန်းပြီးဖော်ပြပြီးပါပြီ`
          : `✨ [OCR ON] Attached both sides & auto-populated Name (${nameEnVal}) and NRC (${nrcVal})`
      });
      setTimeout(() => setUploadFeedback(null), 7000);
    } else {
      setNrcOcrResult(null);
      setUploadFeedback({
        message: language === 'my'
          ? `မှတ်ပုံတင် ရှေ့/နောက် (NRC Both) အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ (OCR အမှန်ခြစ် ဖြုတ်ထားသဖြင့် ဖိုင်သာ ပူးတွဲပါသည်)`
          : `Attached both NRC files without OCR parsing (OCR is unchecked)`
      });
      setTimeout(() => setUploadFeedback(null), 5000);
    }
  };

  // Helper to generate sample Passport
  const handleAttachSamplePassport = () => {
    const passNo = senderPassport || 'MA-918234';
    const nameEnVal = senderName || 'U ZAW WIN HTET';
    const dobVal = formatToDDMMYYYY(senderDateOfBirth) || '14/07/1988';
    const url = createSampleMyanmarPassportSvg(passNo, nameEnVal, dobVal);
    const name = `Passport_${(senderName || 'Sender').replace(/\s+/g, '_')}_${passNo}.svg`;
    const doc = { url, name, type: 'image/svg+xml', size: '24.1 KB' };
    setSenderPassportDoc(doc);
    setSenderIdType('PASSPORT');
    if (!senderPassport) setSenderPassport(passNo);
    setUploadFeedback({
      message: language === 'my'
        ? `နိုင်ငံကူးလက်မှတ် (Passport) အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ`
        : `Successfully attached Sender Passport`
    });
    setTimeout(() => setUploadFeedback(null), 5000);
  };

  // Helper to generate sample Bank Deposit Slip Voucher
  const handleAttachSampleDepositSlip = () => {
    const branch = db.branches.find(b => b.id === sendingBranchId);
    const branchName = branch ? `${branch.nameEn} (${branch.code})` : 'Yangon Main Branch (BR-001)';
    const amountStr = `${sendAmount.toLocaleString()} ${sourceCurrency}`;
    const url = createSampleDepositReceiptSvg(
      senderName || 'U ZAW WIN HTET',
      senderNrc || '12/BAHANA(N)184920',
      amountStr,
      branchName,
      new Date().toLocaleDateString('en-GB')
    );
    const slipName = `Deposit_Slip_${(senderName || 'Sender').replace(/\s+/g, '_')}_${Date.now().toString().slice(-4)}.svg`;
    const doc = { url, name: slipName, type: 'image/svg+xml', size: '22.5 KB' };
    setDepositReceiptDoc(doc);
    setProofCategory('DEPOSIT_RECEIPT');
    setProofDocumentName(slipName);
    setUploadFeedback({
      message: language === 'my'
        ? `ဘဏ်ငွေသွင်းပြေစာ (Deposit Slip Voucher) နမူနာ အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ`
        : `Successfully generated and attached Bank Cash Deposit Slip Voucher`
    });
    setTimeout(() => setUploadFeedback(null), 5000);
  };

  // Generic File Upload Handler
  const handleUploadFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'nrc-front' | 'nrc-back' | 'nrc-both' | 'passport' | 'deposit' | 'custom'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    readFileAsOptimizedDataUrl(file).then((opt) => {
      const url = opt.dataUrl;
      const size = opt.sizeStr;
      const doc = { url, name: opt.name, type: opt.type, size };

      if (target === 'nrc-front' || target === 'nrc-both' || target === 'nrc-back') {
        if (target === 'nrc-front' || target === 'nrc-both') {
          setSenderNrcFrontDoc(doc);
          if (target === 'nrc-both') {
            setSenderNrcBackDoc(doc);
          }
        } else if (target === 'nrc-back') {
          setSenderNrcBackDoc(doc);
        }
        setSenderIdType('NRC');

        // Check whether OCR Function is enabled (Checkbox ON) or disabled (Unchecked Default)
        if (isOcrEnabled) {
          // Step 1: Immediate local smart fill so UI updates instantly
          const localExtracted = extractNrcInfoFromUpload(file, url, db.customers);
          setNrcOcrResult(localExtracted);

          if (localExtracted.nameEn) setSenderName(localExtracted.nameEn);
          if (localExtracted.nameMm) setSenderNameMm(localExtracted.nameMm);
          if (localExtracted.nrcNumber) setSenderNrc(localExtracted.nrcNumber);
          if (localExtracted.fatherName) setSenderFatherName(localExtracted.fatherName);
          if (localExtracted.dob) setSenderDateOfBirth(localExtracted.dob);
          if (localExtracted.address) setSenderAddress(localExtracted.address);
          if (localExtracted.occupation) setSenderOccupation(localExtracted.occupation);

          if (target === 'nrc-back') {
            setUploadFeedback({
              message: language === 'my'
                ? `✨ [OCR ON] NRC အနောက်ခြမ်း ဖိုင်တင်သွင်းပြီးပါပြီ: နေရပ်လိပ်စာ (${localExtracted.address || 'စစ်ဆေးနေပါသည်'}) နှင့် အလုပ်အကိုင် (${localExtracted.occupation || ''}) Auto ဖြည့်သွင်းပေးလိုက်ပါပြီ (${size})`
                : `✨ [OCR ON] NRC Back Uploaded: Address (${localExtracted.address || 'Processing...'}) & Occupation (${localExtracted.occupation || ''}) (${size})`
            });
          } else if (localExtracted.nameEn || localExtracted.nrcNumber) {
            setUploadFeedback({
              message: language === 'my'
                ? `✨ [OCR ON] မှတ်ပုံတင် ဖိုင်တင်သွင်းပြီးသည်နှင့် အမည် (${localExtracted.nameEn || localExtracted.nameMm || ''}) နှင့် မှတ်ပုံတင်နံပတ် (${localExtracted.nrcNumber || ''}) အား Auto တန်းပြီး ဖြည့်သွင်းဖော်ပြပေးလိုက်ပါပြီ (${size})`
                : `✨ [OCR ON] NRC Uploaded: Auto-populated Name (${localExtracted.nameEn || localExtracted.nameMm}) & NRC (${localExtracted.nrcNumber}) (${size})`
            });
          } else {
            setUploadFeedback({
              message: language === 'my'
                ? `✨ [OCR ON] NRC ဖိုင် (${file.name}) တင်သွင်းပြီးပါပြီ။ AI Vision OCR ဖြင့် အချက်အလက်များ ဖတ်ရှုနေပါသည်...`
                : `✨ [OCR ON] NRC file (${file.name}) uploaded. AI Vision OCR scanning card details...`
            });
          }

          // Step 2: Asynchronous AI Vision OCR scanning via Gemini
          setIsScanningNrc(true);
          scanNrcWithAi(file, url, db.customers).then((aiExtracted) => {
            setIsScanningNrc(false);
            setNrcOcrResult(aiExtracted);
            if (aiExtracted.nameEn) setSenderName(aiExtracted.nameEn);
            if (aiExtracted.nameMm) setSenderNameMm(aiExtracted.nameMm);
            if (aiExtracted.nrcNumber) setSenderNrc(aiExtracted.nrcNumber);
            if (aiExtracted.fatherName) setSenderFatherName(aiExtracted.fatherName);
            if (aiExtracted.dob) setSenderDateOfBirth(aiExtracted.dob);
            if (aiExtracted.address) setSenderAddress(aiExtracted.address);
            if (aiExtracted.occupation) setSenderOccupation(aiExtracted.occupation);

            if (target === 'nrc-back' && aiExtracted.address) {
              setUploadFeedback({
                message: language === 'my'
                  ? `✨ AI Vision OCR မှတ်ပုံတင် အနောက်ခြမ်း ဖတ်ရှုပြီးစီးပါပြီ- လိပ်စာ: ${aiExtracted.address}`
                  : `✨ AI OCR NRC Back Complete: Address: ${aiExtracted.address}`
              });
            } else if (aiExtracted.nameEn || aiExtracted.nrcNumber) {
              setUploadFeedback({
                message: language === 'my'
                  ? `✨ AI Vision OCR မှတ်ပုံတင် ဖတ်ရှုပြီးစီးပါပြီ- ${aiExtracted.nameEn || aiExtracted.nameMm} (${aiExtracted.nrcNumber})`
                  : `✨ AI OCR Complete: ${aiExtracted.nameEn || aiExtracted.nameMm} (${aiExtracted.nrcNumber})`
              });
            } else if (aiExtracted.isAiSuccess === false && aiExtracted.error) {
              setUploadFeedback({
                message: language === 'my'
                  ? `⚠️ AI OCR အသိပေးချက်: ${aiExtracted.errorMessageMm || aiExtracted.error}`
                  : `⚠️ AI OCR Notice: ${aiExtracted.error}`
              });
            }

            if (aiExtracted.confidence >= 80) {
              try {
                confetti({ particleCount: 25, spread: 50, origin: { y: 0.3 } });
              } catch {}
            }
          }).catch((err) => {
            console.warn('AI OCR failed, using local extraction:', err);
            setIsScanningNrc(false);
          });
        } else {
          // Checkbox is UNCHECKED (Default Status): Do NOT run OCR function, document is attached only
          setNrcOcrResult(null);
          setIsScanningNrc(false);
          setUploadFeedback({
            message: language === 'my'
              ? `မှတ်ပုံတင်ဖိုင် (${file.name}) အား အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ (OCR အမှန်ခြစ် ဖြုတ်ထားသဖြင့် ဖိုင်သာ ပူးတွဲထားပါသည်) (${size})`
              : `NRC file "${file.name}" attached successfully (OCR is unchecked, document attached only) (${size})`
          });
        }

        setTimeout(() => setUploadFeedback(null), 7000);
        return;
      } else if (target === 'passport') {
        setSenderPassportDoc(doc);
        setSenderIdType('PASSPORT');
      } else if (target === 'deposit') {
        setDepositReceiptDoc(doc);
        setProofCategory('DEPOSIT_RECEIPT');
        setProofDocumentName(file.name);
      } else if (target === 'custom') {
        setCustomProofDoc(doc);
        setProofCategory('CUSTOM');
        setProofDocumentName(file.name);
      }

      setUploadFeedback({
        message: language === 'my'
          ? `${file.name} ဖိုင်အား အောင်မြင်စွာ တင်သွင်းပြီးပါပြီ (${size})`
          : `File "${file.name}" uploaded successfully (${size})`
      });
      setTimeout(() => setUploadFeedback(null), 5000);
    });
    e.target.value = '';
  };

  // Remove document
  const handleRemoveDoc = (target: 'nrc-front' | 'nrc-back' | 'passport' | 'deposit' | 'custom') => {
    if (target === 'nrc-front') setSenderNrcFrontDoc(null);
    else if (target === 'nrc-back') setSenderNrcBackDoc(null);
    else if (target === 'passport') setSenderPassportDoc(null);
    else if (target === 'deposit') {
      setDepositReceiptDoc(null);
      if (proofCategory === 'DEPOSIT_RECEIPT') setProofDocumentName('');
    } else if (target === 'custom') {
      setCustomProofDoc(null);
      if (proofCategory === 'CUSTOM') setProofDocumentName('');
    }
  };

  // Open Document in Lightbox
  const openLightbox = (params: {
    title: string;
    url?: string;
    name?: string;
    type?: string;
    size?: string;
    idNumber?: string;
    sender?: string;
  }) => {
    if (!params.url) return;
    setLightboxDoc({
      isOpen: true,
      title: params.title,
      url: params.url,
      name: params.name || 'Document_Attachment',
      type: params.type || 'image/svg+xml',
      size: params.size,
      idNumber: params.idNumber || senderNrc || senderPassport,
      sender: params.sender || senderName
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!senderName || !senderPhone) {
      setErrorMessage(language === 'my' ? 'ငွေလွှဲပို့သူ အမည်နှင့် ဖုန်းနံပါတ် ဖြည့်စွက်ပါ' : 'Please fill in Sender Name and Phone');
      return;
    }

    if (!receiverName || !receiverPhone) {
      setErrorMessage(language === 'my' ? 'ငွေလွှဲလက်ခံသူ အမည်နှင့် ဖုန်းနံပါတ် ဖြည့်စွက်ပါ' : 'Please fill in Receiver Name and Phone');
      return;
    }

    if (sendAmount <= 0) {
      setErrorMessage(language === 'my' ? 'လွှဲပို့ငွေပမာဏ သုညထက် ကြီးရပါမည်' : 'Send amount must be greater than zero');
      return;
    }

    // Hard block if Blacklist Critical (Screened strictly by exact NRC)
    const currentSenderMatch = senderIdType === 'NRC' ? checkExactNrcBlacklist(senderNrc, 'CRITICAL') : null;
    const currentReceiverMatch = receiverNrc ? checkExactNrcBlacklist(receiverNrc, 'CRITICAL') : null;

    if (currentSenderMatch && currentSenderMatch.riskLevel === 'CRITICAL') {
      setErrorMessage(
        language === 'my' 
          ? `ငွေလွှဲပို့သူသည် နာမည်ပျက်စာရင်း (${currentSenderMatch.reason}) တွင် ပါဝင်နေသဖြင့် တားမြစ်ထားပါသည်` 
          : `Sender is flagged on CRITICAL Blacklist (${currentSenderMatch.reason}). Submission blocked.`
      );
      return;
    }

    if (currentReceiverMatch && currentReceiverMatch.riskLevel === 'CRITICAL') {
      setErrorMessage(
        language === 'my' 
          ? `ငွေလွှဲလက်ခံသူသည် နာမည်ပျက်စာရင်း (${currentReceiverMatch.reason}) တွင် ပါဝင်နေသဖြင့် တားမြစ်ထားပါသည်` 
          : `Receiver is flagged on CRITICAL Blacklist (${currentReceiverMatch.reason}). Submission blocked.`
      );
      return;
    }

    const selectedPurpose = db.purposes.find(p => p.id === purposeId);

    // Resolve Proof Document details
    let resolvedProofUrl: string | undefined = undefined;
    let resolvedProofName = proofDocumentName;
    let resolvedProofType = 'image/svg+xml';
    let resolvedProofSize: string | undefined = undefined;

    if (proofCategory === 'DEPOSIT_RECEIPT') {
      resolvedProofUrl = depositReceiptDoc?.url;
      resolvedProofName = depositReceiptDoc?.name || (proofDocumentName || 'Deposit_Receipt.svg');
      resolvedProofType = depositReceiptDoc?.type || 'image/svg+xml';
      resolvedProofSize = depositReceiptDoc?.size;
    } else if (proofCategory === 'CUSTOM') {
      resolvedProofUrl = customProofDoc?.url;
      resolvedProofName = customProofDoc?.name || proofDocumentName || 'Supporting_Doc.pdf';
      resolvedProofType = customProofDoc?.type || 'application/pdf';
      resolvedProofSize = customProofDoc?.size;
    }

    setIsSubmitting(true);
    try {
      const newTx = await createOutwardRemittance({
        createdDate: entryDateTime ? new Date(entryDateTime).toISOString() : new Date().toISOString(),
        scope,
        senderName,
        senderNameMm,
        senderIdType,
        senderNrc,
        senderPassport: senderPassport || undefined,
        senderPassbook: senderPassport || undefined,
        senderPhone,
        senderAddress,
        senderCountryCode,
        senderFatherName,
        senderOccupation,
        senderSourceOfFund,
        senderDateOfBirth: formatToDDMMYYYY(senderDateOfBirth) || senderDateOfBirth,
        
        // Attachments
        senderNrcAttachment: senderNrcFrontDoc?.url,
        senderNrcAttachmentName: senderNrcFrontDoc?.name,
        senderNrcAttachmentType: senderNrcFrontDoc?.type,
        senderNrcAttachmentSize: senderNrcFrontDoc?.size,
        senderNrcFrontAttachment: senderNrcFrontDoc?.url,
        senderNrcFrontAttachmentName: senderNrcFrontDoc?.name,
        senderNrcFrontAttachmentType: senderNrcFrontDoc?.type,
        senderNrcFrontAttachmentSize: senderNrcFrontDoc?.size,
        senderNrcBackAttachment: senderNrcBackDoc?.url,
        senderNrcBackAttachmentName: senderNrcBackDoc?.name,
        senderNrcBackAttachmentType: senderNrcBackDoc?.type,
        senderNrcBackAttachmentSize: senderNrcBackDoc?.size,
        senderPassportAttachment: senderPassportDoc?.url,
        senderPassportAttachmentName: senderPassportDoc?.name,
        senderPassportAttachmentType: senderPassportDoc?.type,
        senderPassportAttachmentSize: senderPassportDoc?.size,

        receiverName,
        receiverNameMm,
        receiverNrc,
        receiverPassport: receiverPassport || undefined,
        receiverPassbook: receiverPassport || undefined,
        receiverPhone,
        receiverAddress,
        receiverCountryCode,
        sourceCurrency,
        targetCurrency,
        sendAmount: Number(sendAmount),
        exchangeRate: Number(exchangeRate),
        receiveAmount: Number(calculatedReceiveAmount),
        serviceFee: Number(serviceFee),
        commissionFee: Number(commissionFee),
        totalPayableAmount: Number(totalPayableAmount),

        // USD Base payload
        isUsdBase,
        usdAmount: isUsdBase ? calculatedUsdAmount : undefined,
        usdExchangeRate: isUsdBase ? Number(usdExchangeRate) : undefined,
        usdServiceFee: isUsdBase ? calculatedUsdServiceFee : undefined,

        payoutMethod,
        payoutBankName,
        payoutAccountNumber,
        sendingBranchId,
        payoutBranchId: payoutBranchId || undefined,
        senderBranchName: db.branches.find(b => b.id === sendingBranchId)?.nameEn,
        receiverBranchName: db.branches.find(b => b.id === payoutBranchId)?.nameEn,
        partnerCompanyId,
        purposeId,
        purposeName: selectedPurpose ? (language === 'my' ? selectedPurpose.nameMm : selectedPurpose.nameEn) : 'General',
        senderNote,
        proofDocumentName: resolvedProofName || 'Deposit_Receipt_Auto.pdf',
        proofDocumentUrl: resolvedProofUrl,
        proofDocumentType: resolvedProofType,
        proofDocumentSize: resolvedProofSize,
        proofDocCategory: proofCategory,
        status: 'PENDING_APPROVAL',
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setCreatedTx(newTx);

      // Reset form amounts
      setSendAmount(0);
      setSenderNote('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit remittance transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Scope selector */}
      {/* Sleek Compact Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Send className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
                  {t.outwardEntryTitle}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {t.outwardEntrySubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Date/Time + Scope Switch + Sending Branch */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Clock & Timestamp Picker */}
            <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs font-mono shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <input
                type="datetime-local"
                value={entryDateTime}
                onChange={(e) => setEntryDateTime(e.target.value)}
                className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
                title={language === 'my' ? 'ငွေလွှဲချိန် သတ်မှတ်ရန်' : 'Transaction Date & Time'}
              />
              <button
                type="button"
                onClick={handleResetToCurrentTime}
                className="text-[10px] text-sky-400 hover:text-sky-300 ml-1 p-0.5"
                title={language === 'my' ? 'ယခုအချိန် ပြန်သတ်မှတ်မည်' : 'Reset to current system time'}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Scope Switch */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-700/80">
              <button
                type="button"
                onClick={() => handleScopeChange('INTERNATIONAL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scope === 'INTERNATIONAL'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.international}
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('DOMESTIC')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scope === 'DOMESTIC'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.domestic}
              </button>
            </div>

            {/* Sending Branch badge */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold text-white truncate max-w-[130px] sm:max-w-none">
                {db.branches.find(b => b.id === sendingBranchId)?.nameEn || 'Yangon HQ'}
              </span>
            </div>

            {/* Default Status Badge */}
            <div 
              className={`hidden sm:flex px-2 py-1 rounded-lg text-[10px] font-bold border items-center gap-1.5 ${
                isMyanmarLogin 
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span>{isMyanmarLogin ? 'Domestic / NRC' : 'Intl / Passport'}</span>
            </div>
            <button
              type="button"
              onClick={handleApplyCountryDefaultStatus}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold border border-slate-700 transition-colors cursor-pointer"
              title={language === 'my' ? 'မူရင်းသတ်မှတ်ချက်သို့ ပြန်ထားမည်' : 'Reset to country default status'}
            >
              ↺
            </button>
          </div>
        </div>
      </div>

      {/* Error / Warning Alert Banner */}
      {errorMessage && (
        <div className="bg-rose-950/80 border border-rose-500 text-rose-200 rounded-xl p-4 flex items-start space-x-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-rose-300 block">{t.warning}:</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Upload & Replace Feedback Banner */}
      {uploadFeedback && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{uploadFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadFeedback(null)}
            className="text-emerald-400 hover:text-white p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Blacklist Critical Warnings if triggered */}
      {(senderMatch || receiverMatch) && (
        <div className="bg-rose-950/90 border-2 border-rose-500 text-white rounded-2xl p-5 shadow-2xl space-y-3 animate-pulse">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0" />
            <h3 className="text-sm font-black uppercase tracking-wider text-rose-300">
              {t.blacklistWarningTitle}
            </h3>
          </div>
          
          {senderMatch && (
            <div className="bg-rose-900/40 p-3 rounded-xl border border-rose-700 text-xs space-y-1">
              <strong className="text-rose-200 font-bold block">
                🚨 Sender Match: {senderMatch.fullNameEn} ({senderMatch.fullNameMm})
              </strong>
              <div className="text-slate-300">
                <span>NRC: </span><span className="font-mono text-white">{senderMatch.nrcNumber}</span> | 
                <span> Passport: </span><span className="font-mono text-white">{senderMatch.passportNumber || senderMatch.passbookNumber || '-'}</span> | 
                <span> Risk: </span><span className="font-bold text-rose-400">{senderMatch.riskLevel}</span>
              </div>
              <div className="text-rose-200 italic mt-1 bg-black/30 p-2 rounded">
                Note: "{senderMatch.note}"
              </div>
            </div>
          )}

          {receiverMatch && (
            <div className="bg-rose-900/40 p-3 rounded-xl border border-rose-700 text-xs space-y-1">
              <strong className="text-rose-200 font-bold block">
                🚨 Receiver Match: {receiverMatch.fullNameEn} ({receiverMatch.fullNameMm})
              </strong>
              <div className="text-slate-300">
                <span>NRC: </span><span className="font-mono text-white">{receiverMatch.nrcNumber}</span> | 
                <span> Passport: </span><span className="font-mono text-white">{receiverMatch.passportNumber || receiverMatch.passbookNumber || '-'}</span>
              </div>
              <div className="text-rose-200 italic mt-1 bg-black/30 p-2 rounded">
                Note: "{receiverMatch.note}"
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Balanced 2-Column Grid Layout: Left (Sender & Financials), Right (Receiver & Routing) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* LEFT COLUMN: Sender Information & Financials */}
          <div className="space-y-5">
            {/* UPPER FRAME: Sender Information */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {t.senderInformation}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                {/* Upload NRC Button (shows OCR badge if enabled, otherwise regular file upload) */}
                <label className={`inline-flex items-center space-x-1.5 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer border shadow-xs transition-all hover:scale-[1.02] ${
                  isOcrEnabled
                    ? 'bg-emerald-750 hover:bg-emerald-650 border-emerald-500/60 ring-1 ring-emerald-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}>
                  <Upload className="w-3.5 h-3.5 text-emerald-300" />
                  <span>
                    {isOcrEnabled
                      ? (language === 'my' ? 'မှတ်ပုံတင် Upload (Auto တန်းဖြည့်မည်)' : 'Upload NRC (OCR Auto-Fill)')
                      : (language === 'my' ? 'မှတ်ပုံတင် Upload (ဖိုင်တွဲမည်)' : 'Upload NRC File')}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.svg"
                    className="hidden"
                    onChange={(e) => handleUploadFile(e, 'nrc-front')}
                  />
                </label>
                {/* Quick Customer Picker */}
                <select
                  onChange={(e) => handleSelectSenderCustomer(e.target.value)}
                  className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>{language === 'my' ? '-- ဖောက်သည် အမြန်ရွေးရန် --' : '-- Customer Picker --'}</option>
                  {db.customers.map(c => (
                    <option key={c.id} value={c.id}>{c.fullNameEn} ({c.nrcNumber || c.passportNumber || c.phone})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Profile Auto Search (customer_profiles table) */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-emerald-500/30 space-y-2 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'my' ? 'ငွေလွှဲသူ Customer အချက်အလက် အလိုအလျောက် ရှာဖွေဖြည့်သွင်းခြင်း' : 'Auto Search & Auto-Fill Sender from customer_profiles'}</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                    customer_profiles ({db.customers.length})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {language === 'my' ? '🔍 Contain ရှာဖွေမှု (အမည်၊ ဖုန်း၊ NRC၊ Passport)' : '🔍 Search by Contain (Name, Phone, NRC, Passport)'}
                </span>
              </div>

              <CustomerSearchAutoFill
                label={language === 'my' ? 'ငွေလွှဲသူ Customer ရှာရန်' : 'Sender Customer Profile'}
                placeholder={language === 'my' ? '🔍 အမည်၊ ဖုန်း၊ NRC သို့မဟုတ် Passport နံပါတ် ရိုက်ထည့်ရှာပါ (Auto Search & Fill)...' : '🔍 Search Sender by Name, Phone, NRC, Passport...'}
                onSelectCustomer={handleSelectSenderCustomer}
                selectedCustomer={selectedSenderCustomer}
                onClearCustomer={handleClearSenderCustomer}
                language={language}
                themeColor="emerald"
                localCustomers={db.customers}
                roleTag="SENDER"
              />
            </div>

            {/* OCR Function Checkbox (Default: Unchecked / Disabled) */}
            <div className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
              isOcrEnabled
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-xs'
                : 'bg-slate-950/70 border-slate-800'
            }`}>
              <label htmlFor="outward-ocr-toggle-checkbox" className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="outward-ocr-toggle-checkbox"
                  checked={isOcrEnabled}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setIsOcrEnabled(val);
                    if (!val) {
                      setNrcOcrResult(null);
                      setIsScanningNrc(false);
                    }
                  }}
                  className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-600 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className={`w-3.5 h-3.5 ${isOcrEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{language === 'my' ? 'AI OCR အလိုအလျောက် စာဖတ်စနစ်' : 'AI OCR Auto-Fill'}</span>
                </span>
              </label>

              <div className="shrink-0">
                {isOcrEnabled ? (
                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ON (Active)</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {language === 'my' ? 'Status: OFF (မလုပ်ပါ)' : 'Status: OFF'}
                  </span>
                )}
              </div>
            </div>

            {/* OCR Auto-fill Scanning Indicator (Only when OCR is enabled) */}
            {isScanningNrc && isOcrEnabled && (
              <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl p-3 text-amber-200 shadow-sm flex items-center justify-between animate-pulse">
                <div className="flex items-center space-x-2.5">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  <span className="text-xs font-bold text-white">
                    {language === 'my'
                      ? '🔍 မှတ်ပုံတင်ကတ်ပြားအား AI Vision OCR ဖြင့် အသေးစိတ် စစ်ဆေးဖတ်ရှုနေပါသည်...'
                      : '🔍 AI Vision OCR is scanning the NRC Card for handwritten/printed details...'}
                  </span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded border border-amber-500/30">
                  SCANNING
                </span>
              </div>
            )}

            {/* OCR Auto-fill Notification Banner (Only when OCR is enabled) */}
            {nrcOcrResult && !isScanningNrc && isOcrEnabled && (
              <div className="bg-emerald-950/70 border border-emerald-500/60 rounded-xl p-3 text-emerald-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-white text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>
                      {language === 'my'
                        ? '✨ မှတ်ပုံတင်မှ အချက်အလက်များ အလိုအလျောက် ရယူဖြည့်သွင်းပြီးပါပြီ (Auto-Filled)'
                        : '✨ NRC Card Details Auto-Extracted & Populated'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold text-[10px] border border-emerald-500/30">
                      ✓ {nrcOcrResult.confidence}% {nrcOcrResult.method === 'AI_GEMINI_VISION' ? 'AI_VISION_OCR' : nrcOcrResult.method}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNrcOcrResult(null)}
                      className="text-slate-400 hover:text-white text-xs p-0.5 cursor-pointer"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/40 p-2.5 rounded-lg border border-emerald-900/60 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">အမည် (Name):</span>
                    <span className="text-white font-bold truncate block">{nrcOcrResult.nameEn || senderName}</span>
                    {nrcOcrResult.nameMm && <span className="text-slate-300 text-[10px] truncate block">{nrcOcrResult.nameMm}</span>}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">မှတ်ပုံတင်နံပတ် (NRC):</span>
                    <span className="text-amber-300 font-bold block">{nrcOcrResult.nrcNumber || senderNrc}</span>
                    {nrcOcrResult.nrcNumberMm && <span className="text-slate-400 text-[10px] block">{nrcOcrResult.nrcNumberMm}</span>}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">မွေးသက္ကရာဇ် (DOB):</span>
                    <span className="text-slate-200 block">{nrcOcrResult.dob || senderDateOfBirth || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">အဘအမည် (Father):</span>
                    <span className="text-slate-200 truncate block">{nrcOcrResult.fatherName || senderFatherName || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Names & ID Type Switcher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="relative">
                <label className="block text-slate-400 mb-1 font-medium">{t.senderName} *</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => {
                    setSenderName(e.target.value);
                    if (selectedSenderCustomer && e.target.value !== selectedSenderCustomer.fullNameEn) {
                      setSelectedSenderCustomer(null);
                    }
                  }}
                  placeholder="e.g. U Zaw Win Htet"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />

                {/* Inline suggestions popup when typing in Sender Name */}
                {senderNameSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-slate-900/95 backdrop-blur-md border border-emerald-500/60 rounded-xl shadow-2xl p-1.5 space-y-1">
                    <div className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 flex items-center justify-between border-b border-slate-800 pb-1">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>{language === 'my' ? 'customer_profiles တွင် ကိုက်ညီသူများ (Auto-Fill):' : 'Matching customer_profiles (Click to Auto-Fill):'}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{senderNameSuggestions.length} found</span>
                    </div>
                    {senderNameSuggestions.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => handleSelectSenderCustomer(cust)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-950/60 text-xs flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white group-hover:text-emerald-300 truncate">{cust.fullNameEn}</span>
                            {cust.fullNameMm && <span className="text-slate-400 text-[11px] truncate">({cust.fullNameMm})</span>}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {cust.phone && <span>📞 {cust.phone}</span>}
                            {cust.nrcNumber && <span className="text-amber-300">🆔 {cust.nrcNumber}</span>}
                            {cust.passportNumber && <span className="text-sky-300">🛂 {cust.passportNumber}</span>}
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] bg-emerald-600 group-hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded shadow-xs flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>{language === 'my' ? 'တန်းဖြည့်မည်' : 'Fill'}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderNameMm}</label>
                <input
                  type="text"
                  value={senderNameMm}
                  onChange={(e) => setSenderNameMm(e.target.value)}
                  placeholder="e.g. ဦးဇော်ဝင်းထက်"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* ID Type Switcher & Number */}
              <div className="sm:col-span-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-300 font-bold text-xs flex items-center space-x-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span>{language === 'my' ? 'ငွေလွှဲသူ သက်သေခံကတ်ပြား အမျိုးအစား' : 'Sender Identity Document Type'}</span>
                    </span>

                    {/* User Login Country Default Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1.5 shadow-xs ${
                      isMyanmarLogin
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isMyanmarLogin ? 'bg-emerald-400' : 'bg-sky-400'} animate-pulse`} />
                      <span>
                        {isMyanmarLogin
                          ? (language === 'my' ? '🇲🇲 Myanmar Login (Default: NRC)' : '🇲🇲 Myanmar Login (Default: NRC)')
                          : (language === 'my' ? `🌐 ${currentCountry?.flagEmoji || ''} ${currentCountry?.nameEn || userCountryCode} Login (Default: Passport)` : `🌐 ${currentCountry?.flagEmoji || ''} ${currentCountry?.nameEn || userCountryCode} Login (Default: Passport)`)}
                      </span>
                    </span>
                  </div>

                  {/* Selector Switch */}
                  <div className="inline-flex bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[11px]">
                    <button
                      type="button"
                      id="sender-id-type-nrc-btn"
                      onClick={() => setSenderIdType('NRC')}
                      className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        senderIdType === 'NRC'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>{language === 'my' ? 'မှတ်ပုံတင် (NRC)' : 'NRC Card'}</span>
                      {isMyanmarLogin && (
                        <span className="text-[9px] bg-emerald-800/90 text-emerald-100 font-bold px-1 py-0.2 rounded ml-1">
                          {language === 'my' ? 'မူရင်း' : 'Default'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      id="sender-id-type-passport-btn"
                      onClick={() => setSenderIdType('PASSPORT')}
                      className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        senderIdType === 'PASSPORT'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileCheck className="w-3 h-3" />
                      <span>{language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : 'Passport'}</span>
                      {!isMyanmarLogin && (
                        <span className="text-[9px] bg-sky-800/90 text-sky-100 font-bold px-1 py-0.2 rounded ml-1">
                          {language === 'my' ? 'မူရင်း' : 'Default'}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {senderIdType === 'NRC' ? (
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold text-xs">
                      {t.senderNrc} * {senderMatch ? <span className="text-rose-400 font-bold">(FLAGGED)</span> : <span className="text-emerald-400">✓</span>}
                    </label>
                    <input
                      type="text"
                      required
                      value={senderNrc}
                      onChange={(e) => setSenderNrc(e.target.value)}
                      placeholder="12/BAHANA(N)184920"
                      className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none ${
                        senderMatch ? 'border-rose-500 bg-rose-950/30' : 'border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold text-xs">
                      {t.senderPassbook} *
                    </label>
                    <input
                      type="text"
                      required
                      value={senderPassport}
                      onChange={(e) => setSenderPassport(e.target.value)}
                      placeholder="MA-918234"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* SENDER IDENTITY DOCUMENTS (WORDS AND ROWS FOR NRC FRONT, NRC BACK, PASSPORT) */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-sky-400" />
                      <span>{language === 'my' ? 'သက်သေခံကတ်ပြား ပူးတွဲဖိုင်များ' : 'Identity Document Attachments'}</span>
                    </span>
                    <button
                      type="button"
                      id="attach-both-nrc-btn"
                      onClick={handleAttachBothNrc}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer hover:scale-[1.02]"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>{language === 'my' ? '⚡ NRC ရှေ့/နောက် တစ်ပြိုင်နက်တွဲမည်' : '⚡ Attach Both NRC (Front & Back)'}</span>
                    </button>
                  </div>

                  {/* ROWS FOR NRC FRONT, NRC BACK, PASSPORT */}
                  <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
                    {/* ROW 1: NRC FRONT */}
                    <div className={`p-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      senderNrcFrontDoc ? 'bg-emerald-950/20' : 'hover:bg-slate-850/50'
                    }`}>
                      {/* Words: Document Name & Status */}
                      <div className="flex items-start sm:items-center space-x-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          senderNrcFrontDoc ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-white">
                              {language === 'my' ? 'မှတ်ပုံတင် (အရှေ့ခြမ်း)' : 'NRC Front'}
                            </span>
                            {senderIdType === 'NRC' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                                {language === 'my' ? 'အဓိက ID' : 'Primary ID'}
                              </span>
                            )}
                            {senderNrcFrontDoc ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{language === 'my' ? 'ပူးတွဲပြီး' : 'Attached'}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-medium">
                                {language === 'my' ? 'မပူးတွဲရသေးပါ' : 'Not Attached'}
                              </span>
                            )}
                          </div>
                          {/* File details by words */}
                          {senderNrcFrontDoc ? (
                            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                              <span className="truncate max-w-[200px] sm:max-w-[280px] text-slate-300" title={senderNrcFrontDoc.name}>
                                {senderNrcFrontDoc.name || 'NRC_Front.svg'}
                              </span>
                              <span className="text-emerald-400 shrink-0 font-semibold">{senderNrcFrontDoc.size || '18.4 KB'}</span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400">
                              {language === 'my' ? 'မှတ်ပုံတင် အရှေ့မျက်နှာစာ ဖိုင် (JPG, PNG, PDF, SVG)' : 'Front side of NRC Card (JPG, PNG, PDF, SVG)'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons: If Attached show Preview Button */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {senderNrcFrontDoc ? (
                          <>
                            {/* PREVIEW BUTTON (If Attached) */}
                            <button
                              type="button"
                              id="preview-sender-nrc-front-btn"
                              onClick={() => openLightbox({
                                title: language === 'my' ? 'မှတ်ပုံတင် အရှေ့ခြမ်း (NRC Front)' : "Sender's NRC Card (Front)",
                                url: senderNrcFrontDoc.url,
                                name: senderNrcFrontDoc.name,
                                size: senderNrcFrontDoc.size,
                                idNumber: senderNrc
                              })}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02]"
                              title={language === 'my' ? 'အသေးစိတ် ကြည့်ရှုရန်' : 'Preview Attached Document'}
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-400" />
                              <span>{language === 'my' ? 'Preview' : 'Preview'}</span>
                            </button>

                            {/* Replace Button */}
                            <label className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer">
                              <Upload className="w-3 h-3 text-slate-400" />
                              <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadFile(e, 'nrc-front')}
                              />
                            </label>

                            {/* Remove Button */}
                            <button
                              type="button"
                              id="remove-sender-nrc-front-btn"
                              onClick={() => handleRemoveDoc('nrc-front')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition-colors cursor-pointer"
                              title={language === 'my' ? 'ပယ်ဖျက်မည်' : 'Remove Attachment'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Quick Sample Button */}
                            <button
                              type="button"
                              id="sample-sender-nrc-front-btn"
                              onClick={handleAttachSampleNrcFront}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <span>+ {language === 'my' ? 'နမူနာတွဲ' : 'Sample'}</span>
                            </button>

                            {/* Upload Button */}
                            <label className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs">
                              <Upload className="w-3 h-3" />
                              <span>{language === 'my' ? 'ဖိုင်တင်မည်' : 'Upload'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadFile(e, 'nrc-front')}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </div>

                    {/* ROW 2: NRC BACK */}
                    <div className={`p-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      senderNrcBackDoc ? 'bg-emerald-950/20' : 'hover:bg-slate-850/50'
                    }`}>
                      {/* Words: Document Name & Status */}
                      <div className="flex items-start sm:items-center space-x-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          senderNrcBackDoc ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-white">
                              {language === 'my' ? 'မှတ်ပုံတင် (အနောက်ခြမ်း)' : 'NRC Back'}
                            </span>
                            {senderIdType === 'NRC' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                                {language === 'my' ? 'အဓိက ID' : 'Primary ID'}
                              </span>
                            )}
                            {senderNrcBackDoc ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{language === 'my' ? 'ပူးတွဲပြီး' : 'Attached'}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-medium">
                                {language === 'my' ? 'မပူးတွဲရသေးပါ' : 'Not Attached'}
                              </span>
                            )}
                          </div>
                          {/* File details by words */}
                          {senderNrcBackDoc ? (
                            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                              <span className="truncate max-w-[200px] sm:max-w-[280px] text-slate-300" title={senderNrcBackDoc.name}>
                                {senderNrcBackDoc.name || 'NRC_Back.svg'}
                              </span>
                              <span className="text-emerald-400 shrink-0 font-semibold">{senderNrcBackDoc.size || '16.2 KB'}</span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400">
                              {language === 'my' ? 'မှတ်ပုံတင် အနောက်မျက်နှာစာ ဖိုင် (လိပ်စာ/သွေးအုပ်စု)' : 'Back side of NRC Card (Address & details)'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons: If Attached show Preview Button */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {senderNrcBackDoc ? (
                          <>
                            {/* PREVIEW BUTTON (If Attached) */}
                            <button
                              type="button"
                              id="preview-sender-nrc-back-btn"
                              onClick={() => openLightbox({
                                title: language === 'my' ? 'မှတ်ပုံတင် အနောက်ခြမ်း (NRC Back)' : "Sender's NRC Card (Back)",
                                url: senderNrcBackDoc.url,
                                name: senderNrcBackDoc.name,
                                size: senderNrcBackDoc.size,
                                idNumber: senderNrc
                              })}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02]"
                              title={language === 'my' ? 'အသေးစိတ် ကြည့်ရှုရန်' : 'Preview Attached Document'}
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-400" />
                              <span>{language === 'my' ? 'Preview' : 'Preview'}</span>
                            </button>

                            {/* Replace Button */}
                            <label className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer">
                              <Upload className="w-3 h-3 text-slate-400" />
                              <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadFile(e, 'nrc-back')}
                              />
                            </label>

                            {/* Remove Button */}
                            <button
                              type="button"
                              id="remove-sender-nrc-back-btn"
                              onClick={() => handleRemoveDoc('nrc-back')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition-colors cursor-pointer"
                              title={language === 'my' ? 'ပယ်ဖျက်မည်' : 'Remove Attachment'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Quick Sample Button */}
                            <button
                              type="button"
                              id="sample-sender-nrc-back-btn"
                              onClick={handleAttachSampleNrcBack}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <span>+ {language === 'my' ? 'နမူနာတွဲ' : 'Sample'}</span>
                            </button>

                            {/* Upload Button */}
                            <label className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs">
                              <Upload className="w-3 h-3" />
                              <span>{language === 'my' ? 'ဖိုင်တင်မည်' : 'Upload'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadFile(e, 'nrc-back')}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </div>

                    {/* ROW 3: PASSPORT */}
                    <div className={`p-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      senderPassportDoc ? 'bg-sky-950/20' : 'hover:bg-slate-850/50'
                    }`}>
                      {/* Words: Document Name & Status */}
                      <div className="flex items-start sm:items-center space-x-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          senderPassportDoc ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-white">
                              {language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : 'Passport'}
                            </span>
                            {senderIdType === 'PASSPORT' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                                {language === 'my' ? 'အဓိက ID' : 'Primary ID'}
                              </span>
                            )}
                            {senderPassportDoc ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{language === 'my' ? 'ပူးတွဲပြီး' : 'Attached'}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-medium">
                                {language === 'my' ? 'မပူးတွဲရသေးပါ' : 'Not Attached'}
                              </span>
                            )}
                          </div>
                          {/* File details by words */}
                          {senderPassportDoc ? (
                            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                              <span className="truncate max-w-[200px] sm:max-w-[280px] text-slate-300" title={senderPassportDoc.name}>
                                {senderPassportDoc.name || 'Passport.svg'}
                              </span>
                              <span className="text-sky-400 shrink-0 font-semibold">{senderPassportDoc.size || '24.1 KB'}</span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400">
                              {language === 'my' ? 'နိုင်ငံကူးလက်မှတ် မူရင်း စာမျက်နှာ ဖိုင် (JPG, PNG, PDF, SVG)' : 'Passport bio page document (JPG, PNG, PDF, SVG)'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons: If Attached show Preview Button */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {senderPassportDoc ? (
                          <>
                            {/* PREVIEW BUTTON (If Attached) */}
                            <button
                              type="button"
                              id="preview-sender-passport-btn"
                              onClick={() => openLightbox({
                                title: language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : "Sender's Passport",
                                url: senderPassportDoc.url,
                                name: senderPassportDoc.name,
                                size: senderPassportDoc.size,
                                idNumber: senderPassport
                              })}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02]"
                              title={language === 'my' ? 'အသေးစိတ် ကြည့်ရှုရန်' : 'Preview Attached Document'}
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-400" />
                              <span>{language === 'my' ? 'Preview' : 'Preview'}</span>
                            </button>

                            {/* Replace Button */}
                            <label className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer">
                              <Upload className="w-3 h-3 text-slate-400" />
                              <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadFile(e, 'passport')}
                              />
                            </label>

                            {/* Remove Button */}
                            <button
                              type="button"
                              id="remove-sender-passport-btn"
                              onClick={() => handleRemoveDoc('passport')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition-colors cursor-pointer"
                              title={language === 'my' ? 'ပယ်ဖျက်မည်' : 'Remove Attachment'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Quick Sample Button */}
                            <button
                              type="button"
                              id="sample-sender-passport-btn"
                              onClick={handleAttachSamplePassport}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <span>+ {language === 'my' ? 'နမူနာတွဲ' : 'Sample'}</span>
                            </button>

                            {/* Upload Button */}
                            <label className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs">
                              <Upload className="w-3 h-3" />
                              <span>{language === 'my' ? 'ဖိုင်တင်မည်' : 'Upload'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,.svg"
                                className="hidden"
                                onChange={(e) => handleUploadFile(e, 'passport')}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderPhone} *</label>
                <input
                  type="text"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="09-420019283"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderCountry}</label>
                <select
                  value={senderCountryCode}
                  onChange={(e) => setSenderCountryCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
                >
                  {db.countries.map(c => (
                    <option key={c.id} value={c.code}>{c.flagEmoji} {language === 'my' ? c.nameMm : c.nameEn}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium flex items-center gap-1.5">
                    <span>{t.senderAddress}</span>
                    {senderNrcBackDoc && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-normal">
                        ✓ {language === 'my' ? 'NRC အနောက်ခြမ်းမှ Auto ဖတ်ယူပြီး' : 'Scanned from NRC Back'}
                      </span>
                    )}
                  </label>
                  {isScanningNrc && (
                    <span className="text-[10px] text-sky-400 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                      <span>{language === 'my' ? 'လိပ်စာ ဖတ်ရှုနေပါသည်...' : 'Scanning address...'}</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  placeholder="e.g. အလွမ်းဆွတ်ကျေးရွာ၊ သန်လျင်မြို့"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{language === 'my' ? 'အဘအမည် (Father Name)' : 'Father Name'}</label>
                <input
                  type="text"
                  value={senderFatherName}
                  onChange={(e) => setSenderFatherName(e.target.value)}
                  placeholder={language === 'my' ? 'အဘအမည် (Blank)' : 'Father Name (Blank)'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{language === 'my' ? 'အလုပ်အကိုင် (Occupation)' : 'Occupation'}</label>
                <input
                  type="text"
                  value={senderOccupation}
                  onChange={(e) => setSenderOccupation(e.target.value)}
                  placeholder={language === 'my' ? 'အလုပ်အကိုင် (Blank)' : 'Occupation (Blank)'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{language === 'my' ? 'ငွေကြေးရရှိရာ လမ်းကြောင်း (Source of Funds)' : 'Source of Funds'}</label>
                <input
                  type="text"
                  value={senderSourceOfFund}
                  onChange={(e) => setSenderSourceOfFund(e.target.value)}
                  placeholder="Salary / Business Income"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <DobDatePicker
                  id="sender-dob-entry"
                  label={language === 'my' ? 'မွေးသက္ကရာဇ် (Date of Birth - DD/MM/YYYY)' : 'Date of Birth (DD/MM/YYYY)'}
                  placeholder="DD/MM/YYYY"
                  value={senderDateOfBirth}
                  onChange={(formattedDob) => setSenderDateOfBirth(formattedDob)}
                  language={language}
                />
              </div>
            </div>
          </div>

            {/* Section 3: Financials, Exchange Rate & Settlement */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {t.financialDetails}
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Rate ID: LIVE-{sourceCurrency}/{targetCurrency}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* Source Currency */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">{t.sourceCurrency}</label>
                  <select
                    value={sourceCurrency}
                    onChange={(e) => setSourceCurrency(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:border-sky-500 focus:outline-none"
                  >
                    {db.currencies.map(c => (
                      <option key={c.id} value={c.code}>{c.code} - {language === 'my' ? c.nameMm : c.nameEn}</option>
                    ))}
                  </select>
                </div>

                {/* Target Currency */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">{t.targetCurrency}</label>
                  <select
                    value={targetCurrency}
                    onChange={(e) => setTargetCurrency(e.target.value)}
                    disabled={scope === 'DOMESTIC'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:border-sky-500 focus:outline-none disabled:opacity-60"
                  >
                    {db.currencies.map(c => (
                      <option key={c.id} value={c.code}>{c.code} - {language === 'my' ? c.nameMm : c.nameEn}</option>
                    ))}
                  </select>
                </div>

                {/* Send Amount */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">{t.sendAmount} *</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:border-sky-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold">{sourceCurrency}</span>
                  </div>
                </div>

                {/* Exchange Rate */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-medium">{t.exchangeRate}</label>
                    {sourceCurrency !== targetCurrency && (
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        1 {sourceCurrency === 'MMK' ? targetCurrency : sourceCurrency} = {exchangeRate.toLocaleString()} MMK
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-emerald-400 font-mono font-bold text-sm focus:border-sky-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold">
                      {sourceCurrency === targetCurrency ? targetCurrency : 'MMK'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fee Settings Row: Service Fee & Commission Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs pt-1 border-t border-slate-800/80">
                {/* Service Fee */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    {language === 'my' ? 'ဝန်ဆောင်ခ (Service Fee)' : 'Service Fee'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={serviceFee}
                      onChange={(e) => setServiceFee(Number(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:border-sky-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold">{sourceCurrency}</span>
                  </div>
                </div>

                {/* Commission Fee */}
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    {language === 'my' ? 'ကော်မရှင်ကြေး (Commission Fee)' : 'Commission Fee'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={commissionFee}
                      onChange={(e) => setCommissionFee(Number(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:border-sky-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold">{sourceCurrency}</span>
                  </div>
                </div>

                {/* Quick Presets / Information */}
                <div className="sm:col-span-2 flex flex-wrap items-center gap-2 pt-5">
                  <span className="text-[11px] text-slate-400">{language === 'my' ? 'အမြန်ပြင်ဆင်ရန်:' : 'Presets:'}</span>
                  <button
                    type="button"
                    onClick={() => { setServiceFee(0); setCommissionFee(0); }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    0 {sourceCurrency} ({language === 'my' ? 'အခမဲ့' : 'Free'})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fees = getDefaultFees(sourceCurrency);
                      setServiceFee(fees.service);
                      setCommissionFee(fees.commission);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    {sourceCurrency === 'MMK' ? '15,000 / 5,000 MMK' : sourceCurrency === 'THB' ? '100 / 50 THB' : `${getDefaultFees(sourceCurrency).service} / ${getDefaultFees(sourceCurrency).commission} ${sourceCurrency}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fees = getDefaultFees(sourceCurrency);
                      setServiceFee(fees.service + fees.commission);
                      setCommissionFee(0);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    {sourceCurrency === 'MMK' ? '10,000 MMK' : sourceCurrency === 'THB' ? '150 THB' : `${getDefaultFees(sourceCurrency).service + getDefaultFees(sourceCurrency).commission} ${sourceCurrency}`}
                  </button>
                </div>
              </div>

              {/* Real-time calculated Result Box */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border-r border-slate-800 pr-4">
                  <span className="text-slate-400 text-xs block">{t.receiveAmount} (လက်ခံရရှိငွေ)</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                    {calculatedReceiveAmount.toLocaleString()} {targetCurrency}
                  </span>
                </div>

                <div className="border-r border-slate-800 pr-4">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>{t.serviceFee}:</span>
                    <span className="font-mono text-white font-semibold">{serviceFee.toLocaleString()} {sourceCurrency}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                    <span>{t.commissionFee}:</span>
                    <span className="font-mono text-white font-semibold">{commissionFee.toLocaleString()} {sourceCurrency}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-800">
                    <span>{language === 'my' ? 'အခကြေးငွေ စုစုပေါင်း' : 'Total Fees'}:</span>
                    <span className="font-mono text-sky-400 font-bold">{(serviceFee + commissionFee).toLocaleString()} {sourceCurrency}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block">{t.totalPayable} (စုစုပေါင်းပေးချေငွေ)</span>
                  <span className="text-xl font-black text-white font-mono mt-1 block">
                    {totalPayableAmount.toLocaleString()} {sourceCurrency}
                  </span>
                </div>
              </div>

              {/* USD Base Checkbox & Conversion Row */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className={`p-3.5 rounded-xl border transition-all ${
                  isUsdBase 
                    ? 'bg-sky-950/40 border-sky-600/70 shadow-md shadow-sky-950/30' 
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-start sm:items-center space-x-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isUsdBase}
                        onChange={(e) => setIsUsdBase(e.target.checked)}
                        className="w-4 h-4 rounded text-sky-600 bg-slate-800 border-slate-600 focus:ring-sky-500 mt-0.5 sm:mt-0 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-xs sm:text-sm">
                            {language === 'my' ? '"USD Base" တွက်ချက်မှု ထည့်သွင်းမည် (USD Base)' : '"USD Base" Conversion'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isUsdBase ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            USD Base
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {language === 'my' 
                            ? `သက်ဆိုင်ရာနိုင်ငံ၏ Outward Currency (${targetCurrency}) ကို USD ဒေါ်လာတန်ဖိုးသို့ ပြောင်းလဲတွက်ချက်ပြီး Report နှင့် Voucher များတွင် ဖော်ပြပေးပါမည်` 
                            : `Convert destination outward currency (${targetCurrency}) into USD equivalent for report columns and vouchers`}
                        </span>
                      </div>
                    </label>

                    {isUsdBase && (
                      <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 border border-sky-700/60 p-2.5 rounded-xl text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400 text-[11px]">
                            {targetCurrency === 'USD' ? 'Rate:' : `1 USD =`}
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={usdExchangeRate}
                            onChange={(e) => setUsdExchangeRate(Number(e.target.value))}
                            className="w-24 bg-slate-950 border border-sky-500/80 rounded-lg px-2.5 py-1 text-sky-300 font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-sky-400 text-center"
                            title={`Exchange rate in ${targetCurrency} per 1 USD`}
                          />
                          <span className="text-slate-300 font-mono font-bold text-xs">{targetCurrency}</span>
                          <button
                            type="button"
                            onClick={() => setUsdExchangeRate(getUsdRateForCurrency(targetCurrency))}
                            className="text-[10px] text-sky-400 hover:text-sky-200 px-1.5 py-0.5 bg-sky-950 rounded border border-sky-800"
                            title="Reset to default market rate"
                          >
                            ↺ Auto
                          </button>
                        </div>

                        <div className="h-6 w-px bg-slate-700 hidden sm:block" />

                        <div className="text-right">
                          <span className="text-[10px] text-sky-400 block font-semibold">USD Equivalent (ဒေါ်လာတန်ဖိုး)</span>
                          <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                            $ {calculatedUsdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* END OF LEFT COLUMN */}

          {/* RIGHT COLUMN: Receiver Information & Purpose / Routing Details */}
          <div className="space-y-5">
            {/* LOWER FRAME: Receiver Information */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <UserCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      {t.receiverInformation}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {language === 'my' ? 'ငွေလက်ခံသူ၏ ကိုယ်ရေးအချက်အလက်များနှင့် လိပ်စာ' : 'Receiver identity, ID / Passport & destination country'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                    {language === 'my' ? 'ငွေလက်ခံသူ' : 'Receiver Details'}
                  </span>
                  <select
                    onChange={(e) => handleSelectReceiverCustomer(e.target.value)}
                    className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>{language === 'my' ? '-- ဖောက်သည် အမြန်ရွေးရန် --' : '-- Quick Load Customer --'}</option>
                    {db.customers.map(c => (
                      <option key={c.id} value={c.id}>{c.fullNameEn} ({c.nrcNumber || c.passportNumber || c.phone})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer Profile Auto Search (customer_profiles table) for Receiver */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-sky-500/30 space-y-2 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-sky-400" />
                      <span>{language === 'my' ? 'ငွေလက်ခံသူ Customer အချက်အလက် အလိုအလျောက် ရှာဖွေဖြည့်သွင်းခြင်း' : 'Auto Search & Auto-Fill Receiver from customer_profiles'}</span>
                    </span>
                    <span className="text-[10px] bg-sky-500/15 text-sky-300 font-mono font-bold px-2 py-0.5 rounded border border-sky-500/30">
                      customer_profiles ({db.customers.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {language === 'my' ? '🔍 Contain ရှာဖွေမှု (အမည်၊ ဖုန်း၊ NRC၊ Passport)' : '🔍 Search by Contain (Name, Phone, NRC, Passport)'}
                  </span>
                </div>

                <CustomerSearchAutoFill
                  label={language === 'my' ? 'ငွေလက်ခံသူ Customer ရှာရန်' : 'Receiver Customer Profile'}
                  placeholder={language === 'my' ? '🔍 အမည်၊ ဖုန်း၊ NRC သို့မဟုတ် Passport နံပါတ် ရိုက်ထည့်ရှာပါ (Auto Search & Fill)...' : '🔍 Search Receiver by Name, Phone, NRC, Passport...'}
                  onSelectCustomer={handleSelectReceiverCustomer}
                  selectedCustomer={selectedReceiverCustomer}
                  onClearCustomer={handleClearReceiverCustomer}
                  language={language}
                  themeColor="sky"
                  localCustomers={db.customers}
                  roleTag="RECEIVER"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="relative">
                  <label className="block text-slate-400 mb-1 font-medium">{t.receiverName} *</label>
                  <input
                    type="text"
                    required
                    value={receiverName}
                    onChange={(e) => {
                      setReceiverName(e.target.value);
                      if (selectedReceiverCustomer && e.target.value !== selectedReceiverCustomer.fullNameEn) {
                        setSelectedReceiverCustomer(null);
                      }
                    }}
                    placeholder="e.g. Somchai Prasert / Ma Su Myat"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  />

                  {/* Inline suggestions popup when typing in Receiver Name */}
                  {receiverNameSuggestions.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-slate-900/95 backdrop-blur-md border border-sky-500/60 rounded-xl shadow-2xl p-1.5 space-y-1">
                      <div className="text-[10px] text-sky-400 font-bold px-2 py-0.5 flex items-center justify-between border-b border-slate-800 pb-1">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-sky-400" />
                          <span>{language === 'my' ? 'customer_profiles တွင် ကိုက်ညီသူများ (Auto-Fill):' : 'Matching customer_profiles (Click to Auto-Fill):'}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{receiverNameSuggestions.length} found</span>
                      </div>
                      {receiverNameSuggestions.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => handleSelectReceiverCustomer(cust)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-sky-950/60 text-xs flex items-center justify-between group transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white group-hover:text-sky-300 truncate">{cust.fullNameEn}</span>
                              {cust.fullNameMm && <span className="text-slate-400 text-[11px] truncate">({cust.fullNameMm})</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              {cust.phone && <span>📞 {cust.phone}</span>}
                              {cust.nrcNumber && <span className="text-amber-300">🆔 {cust.nrcNumber}</span>}
                              {cust.passportNumber && <span className="text-sky-300">🛂 {cust.passportNumber}</span>}
                            </div>
                          </div>
                          <span className="shrink-0 text-[10px] bg-sky-600 group-hover:bg-sky-500 text-white font-bold px-2 py-1 rounded shadow-xs flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>{language === 'my' ? 'တန်းဖြည့်မည်' : 'Fill'}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">{t.receiverNameMm}</label>
                  <input
                    type="text"
                    value={receiverNameMm}
                    onChange={(e) => setReceiverNameMm(e.target.value)}
                    placeholder="e.g. မဆုမြတ်ထက်"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    {t.receiverNrc} {receiverMatch ? <span className="text-rose-400 font-bold">(FLAGGED)</span> : ''}
                  </label>
                  <input
                    type="text"
                    value={receiverNrc}
                    onChange={(e) => setReceiverNrc(e.target.value)}
                    placeholder="12/BAHANA(N)291840 or Foreign ID"
                    className={`w-full bg-slate-800 border rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none ${
                      receiverMatch ? 'border-rose-500 bg-rose-950/30' : 'border-slate-700 focus:border-sky-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">{t.receiverPassbook}</label>
                  <input
                    type="text"
                    value={receiverPassport}
                    onChange={(e) => setReceiverPassport(e.target.value)}
                    placeholder="Passport No / ID"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">{t.receiverPhone} *</label>
                  <input
                    type="text"
                    required
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="+66-89-123-9988"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">{t.receiverCountry}</label>
                  <select
                    value={receiverCountryCode}
                    onChange={(e) => {
                      const newCountry = e.target.value;
                      setReceiverCountryCode(newCountry);
                      const country = db.countries.find(c => c.code === newCountry);
                      if (country && country.currencyCode) {
                        setTargetCurrency(country.currencyCode);
                      }
                      // Auto-select destination branch in the receiver's country if available
                      const destBranch = db.branches.find(b => b.countryCode === newCountry && b.id !== sendingBranchId);
                      if (destBranch) {
                        setPayoutBranchId(destBranch.id);
                      }
                    }}
                    disabled={scope === 'DOMESTIC'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-sky-500 focus:outline-none disabled:opacity-60"
                  >
                    {db.countries.map(c => (
                      <option key={c.id} value={c.code}>{c.flagEmoji} {language === 'my' ? c.nameMm : c.nameEn}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1 font-medium">{t.receiverAddress}</label>
                  <input
                    type="text"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    placeholder="Pratunam Market, Ratchathewi, Bangkok, Thailand"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

        {/* Section 4: Purpose, Method, Bank Partner & Attachment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-slate-800">
            {language === 'my' ? 'ငွေလွှဲရည်ရွယ်ချက် နှင့် ထုတ်ပေးမည့် ပုံစံ' : 'Purpose & Routing Details'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Sending Branch */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                {language === 'my' ? 'ငွေလွှဲပေးပို့သည့် ဘဏ်ခွဲ (Sending Branch)' : 'Sending Branch'} *
              </label>
              <select
                value={sendingBranchId}
                onChange={(e) => setSendingBranchId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-sky-500 focus:outline-none font-medium"
              >
                {db.branches.map(b => {
                  const bCountry = db.countries.find(c => c.code === b.countryCode);
                  return (
                    <option key={b.id} value={b.id}>
                      {bCountry?.flagEmoji || '🌐'} {b.code} - {b.nameEn} ({b.city})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Receiving Branch (For Both Domestic & International Remittance with Auto-Dispatch) */}
            <div>
              <label className="block text-amber-400 mb-1 font-semibold flex items-center justify-between">
                <span>{language === 'my' ? 'လက်ခံထုတ်ယူမည့် ဘဏ်ခွဲ (Receive Branch)' : 'Receive Branch (Destination)'} *</span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">Auto Inward Dispatch</span>
              </label>
              <select
                value={payoutBranchId}
                onChange={(e) => setPayoutBranchId(e.target.value)}
                className="w-full bg-slate-800 border border-amber-500/50 rounded-xl px-3 py-2.5 text-white focus:border-amber-400 focus:outline-none font-semibold text-xs shadow-inner"
              >
                {db.branches.map(b => {
                  const bCountry = db.countries.find(c => c.code === b.countryCode);
                  const isCurrent = b.id === sendingBranchId;
                  return (
                    <option key={b.id} value={b.id} disabled={isCurrent}>
                      {bCountry?.flagEmoji || '🌐'} {b.code} - {b.nameEn} ({b.city}) {isCurrent ? `(${language === 'my' ? 'ပို့မည့်ဘဏ်ခွဲဖြစ်နေပါသည်' : 'Current Sending Branch'})` : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-amber-300/80 mt-1">
                {language === 'my' 
                  ? '💡 Approve ပြီး Send နှိပ်ပါက ဤလက်ခံဘဏ်ခွဲ Inward သို့ Auto ဝင်ပြီး Payout Cash ထုတ်ပေးနိုင်ပါမည်'
                  : '💡 Once approved & sent, arrives automatically in this branch Inward for cash payout'}
              </p>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.purposeOfRemit} *</label>
              <select
                value={purposeId}
                onChange={(e) => setPurposeId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-sky-500 focus:outline-none"
              >
                {db.purposes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {language === 'my' ? p.nameMm : p.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Payout Method */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.payoutMethod}</label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="CASH_PICKUP">{t.cashPickup}</option>
                <option value="BANK_ACCOUNT">{t.bankAccount}</option>
                <option value="MOBILE_WALLET">{t.mobileWallet}</option>
              </select>
            </div>

            {/* Partner Company / Bank */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.partnerCompany}</label>
              <select
                value={partnerCompanyId}
                onChange={(e) => setPartnerCompanyId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-sky-500 focus:outline-none"
              >
                {db.companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {language === 'my' ? c.nameMm : c.nameEn} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-medium">{t.noteOrRemarks}</label>
              <input
                type="text"
                value={senderNote}
                onChange={(e) => setSenderNote(e.target.value)}
                placeholder="e.g. Overseas education fee payment NUS Fall Semester"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Attach Deposit Proof Section */}
            <div className="sm:col-span-2 bg-slate-950/80 border border-slate-700/80 rounded-2xl p-4.5 space-y-4 shadow-md">
              {/* Header & Category Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-[#D1F2EB] text-black border border-[#85D4C3] flex items-center justify-center">
                      <Receipt className="w-4 h-4 text-black" />
                    </span>
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      {language === 'my' ? 'ငွေသွင်းပြေစာ ပူးတွဲဖိုင် (Attach Deposit Proof)' : 'Attach Deposit Proof'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-[#D1F2EB] text-black border border-[#85D4C3] text-[10px] font-bold">
                      {scope === 'DOMESTIC' 
                        ? (language === 'my' ? 'ပြည်တွင်းငွေလွှဲ' : 'Domestic Remittance')
                        : (language === 'my' ? 'အပြည်ပြည်ဆိုင်ရာငွေလွှဲ' : 'International Remittance')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {language === 'my'
                      ? 'ငွေလွှဲဆောင်ရွက်မှုအတွက် ဘဏ်ငွေသွင်းပြေစာ (Deposit Slip) သို့မဟုတ် အထောက်အထားစာရွက်စာတမ်း ပူးတွဲထည့်သွင်းနိုင်ပါသည်'
                      : 'Attach Bank Cash Deposit Receipt or other supporting voucher for compliance & verification'}
                  </p>
                </div>

                {/* Category Tabs */}
                <div className="inline-flex bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setProofCategory('DEPOSIT_RECEIPT');
                      if (depositReceiptDoc?.name) setProofDocumentName(depositReceiptDoc.name);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      proofCategory === 'DEPOSIT_RECEIPT'
                        ? 'bg-[#D1F2EB] text-black border border-[#85D4C3] shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 text-black" />
                    <span>{language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ (Deposit Slip)' : 'Deposit Slip'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProofCategory('CUSTOM')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      proofCategory === 'CUSTOM'
                        ? 'bg-[#D1F2EB] text-black border border-[#85D4C3] shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-black" />
                    <span>{language === 'my' ? 'အခြားပူးတွဲဖိုင်' : 'Other Doc'}</span>
                  </button>
                </div>
              </div>

              {/* CATEGORY 2: BANK DEPOSIT SLIP VOUCHER */}
              {proofCategory === 'DEPOSIT_RECEIPT' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#D1F2EB] p-2.5 rounded-xl border border-[#85D4C3]">
                    <div className="text-xs text-black font-semibold flex items-center space-x-2">
                      <Receipt className="w-4 h-4 text-black shrink-0" />
                      <span>
                        {language === 'my'
                          ? 'ဘဏ်ငွေသွင်းပြေစာ (Bank Cash Deposit Slip) ပူးတွဲစနစ် - ငွေသွင်းသူ၊ ဘဏ်ခွဲနှင့် တံဆိပ်တုံး ပါဝင်သော ပြေစာ'
                          : 'Bank Cash Deposit Slip Voucher Proof (Includes depositor, branch seal, and verification stamps)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAttachSampleDepositSlip}
                        className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-[#D1F2EB] hover:bg-[#b2e0d4] text-black border border-[#85D4C3] text-xs font-bold transition-all cursor-pointer shadow-xs hover:scale-[1.02]"
                      >
                        <Sparkles className="w-3 h-3 text-black" />
                        <span>{language === 'my' ? '⚡ ငွေသွင်းပြေစာ နမူနာ ထုတ်ယူတွဲမည်' : '⚡ Generate Deposit Slip Voucher'}</span>
                      </button>
                    </div>
                  </div>

                  {depositReceiptDoc?.url ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
                      <div className="p-3 bg-sky-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Words: Document Name, Details & Status */}
                        <div className="flex items-start sm:items-center space-x-3 min-w-0">
                          <div className="p-2 rounded-lg shrink-0 bg-sky-500/20 text-sky-400">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-xs text-white">
                                {language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ ဘောက်ချာ' : 'Bank Cash Deposit Receipt Voucher'}
                              </span>
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-sky-300 bg-sky-500/20 px-1.5 py-0.5 rounded border border-sky-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{language === 'my' ? 'ပူးတွဲပြီး' : 'Attached'}</span>
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                              <span className="truncate max-w-[200px] sm:max-w-[320px] text-slate-300" title={depositReceiptDoc.name}>
                                {depositReceiptDoc.name || 'Deposit_Receipt_Voucher.svg'}
                              </span>
                              <span className="text-sky-400 shrink-0 font-semibold">{depositReceiptDoc.size || '22.5 KB'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons: Preview, Replace, Remove */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            id="preview-deposit-slip-btn"
                            onClick={() => openLightbox({
                              title: language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ (Bank Cash Deposit Receipt)' : 'Bank Cash Deposit Receipt Voucher',
                              url: depositReceiptDoc.url,
                              name: depositReceiptDoc.name,
                              size: depositReceiptDoc.size,
                              idNumber: senderNrc || 'Cash Deposit'
                            })}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02]"
                            title={language === 'my' ? 'အသေးစိတ် ကြည့်ရှုရန်' : 'Preview Attached Document'}
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                            <span>Preview</span>
                          </button>

                          <label className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs">
                            <Upload className="w-3 h-3" />
                            <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                            <input
                              type="file"
                              accept="image/*,.pdf,.svg"
                              className="hidden"
                              onChange={(e) => handleUploadFile(e, 'deposit')}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveDoc('deposit')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 cursor-pointer transition-colors"
                            title={language === 'my' ? 'ပယ်ဖျက်မည်' : 'Remove Attachment'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-700 hover:border-slate-500 rounded-xl p-5 text-center space-y-3 transition-colors bg-slate-900/50">
                      <div className="w-10 h-10 rounded-full bg-[#D1F2EB] text-black border border-[#85D4C3] flex items-center justify-center mx-auto">
                        <Receipt className="w-5 h-5 text-black" />
                      </div>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        {language === 'my'
                          ? 'ဘဏ်ငွေသွင်းပြေစာ မတွဲရသေးပါ - အထက်ပါခလုတ်ဖြင့် ငွေသွင်းပြေစာ နမူနာ ထုတ်ယူနိုင်သလို ကောင်တာမှရရှိသည့် ပြေစာဓာတ်ပုံကိုလည်း တင်သွင်းနိုင်ပါသည်'
                          : 'No deposit slip attached yet. You can auto-generate a sample bank deposit receipt voucher or upload a physical photo scan.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleAttachSampleDepositSlip}
                          className="px-4 py-2 rounded-xl bg-[#D1F2EB] hover:bg-[#b2e0d4] text-black border border-[#85D4C3] text-xs font-bold transition-colors cursor-pointer"
                        >
                          + {language === 'my' ? 'ငွေသွင်းပြေစာ နမူနာ ထုတ်ယူတွဲမည်' : 'Generate Bank Deposit Slip'}
                        </button>
                        <label className="px-4 py-2 rounded-xl bg-[#D1F2EB] hover:bg-[#b2e0d4] text-black border border-[#85D4C3] text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs">
                          <Upload className="w-4 h-4 text-black" />
                          <span>{language === 'my' ? 'ငွေသွင်းပြေစာ ဓာတ်ပုံတင်မည်' : 'Upload Deposit Slip'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.svg"
                            className="hidden"
                            onChange={(e) => handleUploadFile(e, 'deposit')}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CATEGORY 3: CUSTOM / OTHER DOCUMENT */}
              {proofCategory === 'CUSTOM' && (
                <div className="space-y-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <label className="block text-slate-300 text-xs font-medium mb-1">
                    {language === 'my' ? 'စာရွက်စာတမ်း အမည် / ဖိုင်' : 'Supporting Document Name / File'}
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={proofDocumentName}
                      onChange={(e) => setProofDocumentName(e.target.value)}
                      placeholder="e.g. Deposit_Receipt_0902.pdf or Invoice_Proof.pdf"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                    />

                    <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer flex items-center justify-center space-x-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{language === 'my' ? 'ဖိုင်ရွေးချယ်တင်မည်' : 'Choose File'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf,.svg,.doc,.docx"
                        className="hidden"
                        onChange={(e) => handleUploadFile(e, 'custom')}
                      />
                    </label>
                  </div>

                  {customProofDoc && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 mt-2">
                      <div className="flex items-center space-x-2 truncate">
                        <FileCheck className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="font-mono truncate">{customProofDoc.name}</span>
                        <span className="text-slate-500">({customProofDoc.size})</span>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {customProofDoc.url && (
                          <button
                            type="button"
                            onClick={() => openLightbox({
                              title: customProofDoc.name || 'Supporting Document',
                              url: customProofDoc.url,
                              name: customProofDoc.name,
                              size: customProofDoc.size
                            })}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc('custom')}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-rose-400"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Detailed Branch Information Banner */}
          {(() => {
            const curBranch = db.branches.find(b => b.id === sendingBranchId) || db.branches[0];
            if (!curBranch) return null;
            return (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-[#D1F2EB] text-black border border-[#85D4C3] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Building2 className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">
                        {language === 'my' && curBranch.nameMm ? `${curBranch.nameMm} (${curBranch.nameEn})` : curBranch.nameEn}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#D1F2EB] text-black border border-[#85D4C3] font-mono text-[10px] font-bold">
                        {curBranch.code}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#D1F2EB] text-black border border-[#85D4C3] text-[10px] font-bold">
                        {curBranch.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-xs mt-1.5">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-black" />
                        <span>{curBranch.address}, {curBranch.city}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-black" />
                        <span className="font-mono text-slate-300 font-semibold">{curBranch.phone}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 sm:border-l border-slate-800 sm:pl-4">
                  <span className="text-slate-500 block text-[11px]">{language === 'my' ? 'ဘဏ်ခွဲ မန်နေဂျာ' : 'Branch Manager'}</span>
                  <span className="font-bold text-slate-200">{curBranch.managerName}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>

        {/* Submit & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-mono">
              <span className="text-slate-400">{language === 'my' ? 'ပေးချေရမည့်စုစုပေါင်း:' : 'Total Payable:'}</span>
              <strong className="text-white font-bold">{totalPayableAmount.toLocaleString()} {sourceCurrency}</strong>
            </div>
            <span className="text-slate-600 hidden sm:inline">➜</span>
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-emerald-500/30 font-mono">
              <span className="text-slate-400">{language === 'my' ? 'လက်ခံရရှိငွေ:' : 'Receive:'}</span>
              <strong className="text-emerald-400 font-bold">{calculatedReceiveAmount.toLocaleString()} {targetCurrency}</strong>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting...' : t.submitForApproval}</span>
          </button>
        </div>
      </form>

      {/* Generated Voucher Modal upon creation */}
      <VoucherModal
        isOpen={!!createdTx}
        transaction={createdTx}
        onClose={() => setCreatedTx(null)}
      />

      {/* Document Lightbox Modal for Enlarge & Inspection */}
      <DocumentLightboxModal
        isOpen={!!lightboxDoc?.isOpen}
        onClose={() => setLightboxDoc(null)}
        docTitle={lightboxDoc?.title || ''}
        docUrl={lightboxDoc?.url}
        docName={lightboxDoc?.name}
        docSize={lightboxDoc?.size}
        docType={lightboxDoc?.type || "image/svg+xml"}
        idNumber={lightboxDoc?.idNumber}
      />
    </div>
  );
};
