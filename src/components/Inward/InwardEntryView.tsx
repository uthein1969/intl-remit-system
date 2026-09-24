import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  DownloadCloud, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Coins, 
  Building2, 
  User, 
  UserCheck2, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  QrCode,
  FileText,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Building,
  Paperclip,
  UploadCloud,
  Eye,
  Loader2,
  ExternalLink,
  MapPin,
  Phone,
  Upload,
  Maximize2,
  FileCheck,
  Sparkles,
  Calendar,
  Clock,
  RefreshCw,
  RotateCcw,
  PlusCircle,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRemittance, getNextCleanId } from '../../lib/store';
import { RemittanceTransaction, RemittanceScope, PayoutMethod, BlacklistEntry, Company } from '../../types';
import { VoucherModal } from '../VoucherModal';
import { uploadPassportToSupabase } from '../../lib/supabase';
import { DocumentLightboxModal } from '../Common/DocumentLightboxModal';
import { createSampleMyanmarNrcSvg, createSampleMyanmarNrcBackSvg } from '../../lib/sampleDocuments';
import { readFileAsOptimizedDataUrl } from '../../lib/imageCompressor';

export const InwardEntryView: React.FC = () => {
  const { 
    db, 
    language, 
    t, 
    lookupTransactionByMtcn, 
    checkBlacklist, 
    getExchangeRate, 
    createInwardRemittance, 
    currentUser,
    saveCompany,
    deleteCompany,
    activeBranchId,
    activeCountryCode
  } = useRemittance();

  // Remittance Scope: 'INTERNATIONAL' | 'DOMESTIC'
  const [scope, setScope] = useState<RemittanceScope>('INTERNATIONAL');
  const [originBranchId, setOriginBranchId] = useState('BR-002');
  const [senderNrc, setSenderNrc] = useState('');

  // Search MTCN
  const [searchMtcn, setSearchMtcn] = useState('');
  const [lookupMessage, setLookupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [mtcn, setMtcn] = useState('');

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
  
  // Beneficiary / Receiver in Myanmar
  const [receiverName, setReceiverName] = useState('');
  const [receiverNameMm, setReceiverNameMm] = useState('');
  const [receiverNrc, setReceiverNrc] = useState('');
  const [receiverPassport, setReceiverPassport] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [isManualNrc, setIsManualNrc] = useState(false);
  const [isManualPassport, setIsManualPassport] = useState(false);
  
  // Origin Sender
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCountryCode, setSenderCountryCode] = useState('TH');
  const [senderPassport, setSenderPassport] = useState('');
  const [senderPassportAttachment, setSenderPassportAttachment] = useState<string>('');
  const [senderPassportAttachmentName, setSenderPassportAttachmentName] = useState<string>('');
  const [senderPassportAttachmentType, setSenderPassportAttachmentType] = useState<string>('');
  const [senderPassportAttachmentSize, setSenderPassportAttachmentSize] = useState<string>('');
  const [isUploadingPassport, setIsUploadingPassport] = useState(false);
  const [passportUploadStatus, setPassportUploadStatus] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isDraggingPassport, setIsDraggingPassport] = useState(false);
  const [showPassportPreviewModal, setShowPassportPreviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize country, currencies and rate when scope toggles
  useEffect(() => {
    if (scope === 'DOMESTIC') {
      setSenderCountryCode('MM');
      setSourceCurrency('MMK');
      setTargetCurrency('MMK');
      setExchangeRate(1);
    } else {
      if (senderCountryCode === 'MM') {
        setSenderCountryCode('TH');
        setSourceCurrency('THB');
        setTargetCurrency('MMK');
        const rate = getExchangeRate('THB', 'MMK') || 134.50;
        setExchangeRate(rate);
      }
    }
  }, [scope]);

  // Handle Sender Passport File Attachment (Persist to Supabase Storage & Base64 Database)
  const handlePassportFile = async (file: File) => {
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setPassportUploadStatus({
        type: 'error',
        text: language === 'my' ? 'ဖိုင်အရွယ်အစား 15MB ထက် မကျော်ရပါ' : 'File size must be under 15MB'
      });
      return;
    }

    const fileSizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
      : `${(file.size / 1024).toFixed(1)} KB`;

    setSenderPassportAttachmentName(file.name);
    setSenderPassportAttachmentType(file.type);
    setSenderPassportAttachmentSize(fileSizeStr);
    setIsUploadingPassport(true);
    setPassportUploadStatus({
      type: 'info',
      text: language === 'my' ? 'Supabase သို့ Passport ပူးတွဲစာရွက်စာတမ်း တင်ပို့နေပါသည်...' : 'Uploading passport to Supabase...'
    });

    readFileAsOptimizedDataUrl(file).then(async (opt) => {
      const dataUrl = opt.dataUrl;
      setSenderPassportAttachment(dataUrl);

      try {
        const uploadRes = await uploadPassportToSupabase(db.supabaseConfig, file, 'inward_passports');
        if (uploadRes.success && uploadRes.url) {
          setSenderPassportAttachment(uploadRes.url);
          setPassportUploadStatus({
            type: 'success',
            text: language === 'my' 
              ? 'Supabase Storage သို့ Passport အောင်မြင်စွာ တင်ပို့သိမ်းဆည်းပြီးပါပြီ' 
              : 'Uploaded passport to Supabase Storage successfully'
          });
        } else {
          setPassportUploadStatus({
            type: 'success',
            text: language === 'my'
              ? 'Supabase Database တွင် တိုက်ရိုက်သိမ်းဆည်းရန် အဆင်သင့်ဖြစ်ပါပြီ'
              : 'Saved ready for Supabase Database sync'
          });
        }
      } catch (err: any) {
        setPassportUploadStatus({
          type: 'info',
          text: language === 'my'
            ? 'Supabase Database တွင် တိုက်ရိုက်သိမ်းဆည်းမည်'
            : 'Stored ready for Supabase sync'
        });
      } finally {
        setIsUploadingPassport(false);
      }
    }).catch(() => {
      setIsUploadingPassport(false);
      setPassportUploadStatus({
        type: 'error',
        text: language === 'my' ? 'ဖိုင်ဖတ်ရှု၍ မရပါ' : 'Failed to read file'
      });
    });
  };

  const handlePassportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePassportFile(file);
  };

  const handlePassportDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPassport(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePassportFile(file);
  };

  const handleRemovePassport = () => {
    setSenderPassportAttachment('');
    setSenderPassportAttachmentName('');
    setSenderPassportAttachmentType('');
    setSenderPassportAttachmentSize('');
    setPassportUploadStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Sender NRC Front & Back Attachments for Domestic Inward
  const [senderNrcFrontDoc, setSenderNrcFrontDoc] = useState<{ url?: string; name?: string; type?: string; size?: string } | null>(null);
  const [senderNrcBackDoc, setSenderNrcBackDoc] = useState<{ url?: string; name?: string; type?: string; size?: string } | null>(null);
  const [isUploadingNrcFront, setIsUploadingNrcFront] = useState(false);
  const [isUploadingNrcBack, setIsUploadingNrcBack] = useState(false);
  const [isDraggingNrcFront, setIsDraggingNrcFront] = useState(false);
  const [isDraggingNrcBack, setIsDraggingNrcBack] = useState(false);
  const [nrcUploadStatus, setNrcUploadStatus] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [lightboxDoc, setLightboxDoc] = useState<{ 
    isOpen: boolean; 
    title: string; 
    url?: string; 
    name?: string; 
    type?: string; 
    size?: string; 
    idNumber?: string 
  } | null>(null);
  const nrcFrontInputRef = useRef<HTMLInputElement>(null);
  const nrcBackInputRef = useRef<HTMLInputElement>(null);

  const handleNrcFile = async (file: File, side: 'front' | 'back') => {
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setNrcUploadStatus({
        type: 'error',
        text: language === 'my' ? 'ဖိုင်အရွယ်အစား 15MB ထက် မကျော်ရပါ' : 'File size must be under 15MB'
      });
      return;
    }

    const fileSizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
      : `${(file.size / 1024).toFixed(1)} KB`;

    const sideLabel = side === 'front' 
      ? (language === 'my' ? 'မှတ်ပုံတင် အရှေ့ခြမ်း (Front)' : 'NRC Front Side')
      : (language === 'my' ? 'မှတ်ပုံတင် အနောက်ခြမ်း (Back)' : 'NRC Back Side');

    if (side === 'front') setIsUploadingNrcFront(true);
    else setIsUploadingNrcBack(true);

    setNrcUploadStatus({
      type: 'info',
      text: language === 'my' ? `${sideLabel} ဖိုင် တင်ပို့နေပါသည်...` : `Uploading ${sideLabel}...`
    });

    readFileAsOptimizedDataUrl(file).then(async (opt) => {
      const dataUrl = opt.dataUrl;
      const initialDoc = {
        url: dataUrl,
        name: opt.name,
        type: opt.type,
        size: opt.sizeStr
      };

      if (side === 'front') setSenderNrcFrontDoc(initialDoc);
      else setSenderNrcBackDoc(initialDoc);

      try {
        const folder = side === 'front' ? 'inward_nrc_front' : 'inward_nrc_back';
        const uploadRes = await uploadPassportToSupabase(db.supabaseConfig, file, folder);
        if (uploadRes.success && uploadRes.url) {
          const updatedDoc = {
            url: uploadRes.url,
            name: opt.name,
            type: opt.type,
            size: opt.sizeStr
          };
          if (side === 'front') setSenderNrcFrontDoc(updatedDoc);
          else setSenderNrcBackDoc(updatedDoc);

          setNrcUploadStatus({
            type: 'success',
            text: language === 'my'
              ? `${sideLabel} Supabase Storage တွင် အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ`
              : `${sideLabel} uploaded & synced successfully`
          });
        } else {
          setNrcUploadStatus({
            type: 'success',
            text: language === 'my'
              ? `${sideLabel} ပူးတွဲစာရင်းသွင်းရန် အသင့်ဖြစ်ပါပြီ`
              : `${sideLabel} attached ready for submission`
          });
        }
      } catch {
        setNrcUploadStatus({
          type: 'info',
          text: language === 'my'
            ? `${sideLabel} ပူးတွဲပြီးပါပြီ`
            : `${sideLabel} attached successfully`
        });
      } finally {
        if (side === 'front') setIsUploadingNrcFront(false);
        else setIsUploadingNrcBack(false);
      }
    }).catch(() => {
      if (side === 'front') setIsUploadingNrcFront(false);
      else setIsUploadingNrcBack(false);
      setNrcUploadStatus({
        type: 'error',
        text: language === 'my' ? 'ဖိုင်ဖတ်ရှု၍ မရပါ' : 'Failed to read file'
      });
    });
  };

  const handleAttachSampleNrcFront = () => {
    const nrcVal = senderNrc || '12/BAHANA(N)184920';
    const nameVal = senderName || 'U ZAW WIN HTET';
    const url = createSampleMyanmarNrcSvg(nrcVal, 'ဦးဇော်ဝင်းထက်', nameVal, '14/07/1988', 'U TIN AUNG');
    const name = `NRC_Front_${nrcVal.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    setSenderNrcFrontDoc({
      url,
      name,
      type: 'image/svg+xml',
      size: '18.4 KB'
    });
    if (!senderNrc) setSenderNrc(nrcVal);
    setNrcUploadStatus({
      type: 'success',
      text: language === 'my' 
        ? 'လွှဲပို့သူ၏ မှတ်ပုံတင် အရှေ့ခြမ်း (Front) နမူနာ ပူးတွဲပြီးပါပြီ' 
        : "Sender's NRC Front sample attached successfully"
    });
    setTimeout(() => setNrcUploadStatus(null), 4000);
  };

  const handleAttachSampleNrcBack = () => {
    const url = createSampleMyanmarNrcBackSvg('ကုမ္ပဏီဝန်ထမ်း (Company Staff)', senderAddress || 'အမှတ် (၁၂)၊ ဗဟန်းလမ်း၊ ဗဟန်းမြို့နယ်၊ ရန်ကုန်');
    const nrcVal = senderNrc || '12/BAHANA(N)184920';
    const name = `NRC_Back_${nrcVal.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    setSenderNrcBackDoc({
      url,
      name,
      type: 'image/svg+xml',
      size: '16.2 KB'
    });
    setNrcUploadStatus({
      type: 'success',
      text: language === 'my' 
        ? 'လွှဲပို့သူ၏ မှတ်ပုံတင် အနောက်ခြမ်း (Back) နမူနာ ပူးတွဲပြီးပါပြီ' 
        : "Sender's NRC Back sample attached successfully"
    });
    setTimeout(() => setNrcUploadStatus(null), 4000);
  };

  const handleAttachBothSampleNrc = () => {
    handleAttachSampleNrcFront();
    handleAttachSampleNrcBack();
    setNrcUploadStatus({
      type: 'success',
      text: language === 'my' 
        ? 'လွှဲပို့သူ၏ မှတ်ပုံတင် ကတ်ပြား အရှေ့နှင့် အနောက်ခြမ်း (Front & Back) အပြည့်အစုံ နမူနာ တွဲပြီးပါပြီ' 
        : "Both Sender's NRC Front and Back samples attached successfully"
    });
    setTimeout(() => setNrcUploadStatus(null), 4500);
  };

  const handleRemoveNrcDoc = (side: 'front' | 'back') => {
    if (side === 'front') {
      setSenderNrcFrontDoc(null);
      if (nrcFrontInputRef.current) nrcFrontInputRef.current.value = '';
    } else {
      setSenderNrcBackDoc(null);
      if (nrcBackInputRef.current) nrcBackInputRef.current.value = '';
    }
  };

  const openLightbox = (doc: {
    title: string;
    url?: string;
    name?: string;
    type?: string;
    size?: string;
    idNumber?: string;
  }) => {
    setLightboxDoc({
      isOpen: true,
      title: doc.title,
      url: doc.url,
      name: doc.name,
      type: doc.type,
      size: doc.size,
      idNumber: doc.idNumber
    });
  };
  
  // Financials
  const [sourceCurrency, setSourceCurrency] = useState('THB');
  const [targetCurrency, setTargetCurrency] = useState('MMK');
  const [sendAmount, setSendAmount] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(134.50);
  
  // Routing
  const [partnerCompanyId, setPartnerCompanyId] = useState('CMP-005');
  const [payoutBranchId, setPayoutBranchId] = useState(activeBranchId || currentUser.branchId || 'BR-001');

  useEffect(() => {
    if (activeBranchId) {
      setPayoutBranchId(activeBranchId);
    }
  }, [activeBranchId]);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('CASH_PICKUP');
  const [payoutBankName, setPayoutBankName] = useState('KBZ Bank Ltd');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [purposeId, setPurposeId] = useState('PUR-004');
  const [senderNote, setSenderNote] = useState('');

  // Partner Management Modal
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isNewPartner, setIsNewPartner] = useState(true);
  const [editingPartner, setEditingPartner] = useState<Partial<Company>>({});
  const [partnerDeleteConfirmId, setPartnerDeleteConfirmId] = useState<string | null>(null);

  // Screening
  const [receiverMatch, setReceiverMatch] = useState<BlacklistEntry | null>(null);
  const [senderMatch, setSenderMatch] = useState<BlacklistEntry | null>(null);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdTx, setCreatedTx] = useState<RemittanceTransaction | null>(null);
  const [lastSubmittedTx, setLastSubmittedTx] = useState<RemittanceTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Consolidated beneficiary/customer list for Dropdown selection
  const beneficiaryOptions = useMemo(() => {
    const map = new Map<string, {
      id: string;
      nrc: string;
      passport: string;
      nameEn: string;
      nameMm: string;
      phone: string;
      address: string;
    }>();

    // From registered customers
    db.customers.forEach(c => {
      if (c.nrcNumber) {
        map.set(c.nrcNumber, {
          id: c.id,
          nrc: c.nrcNumber,
          passport: c.passportNumber || c.passbookNumber || '',
          nameEn: c.fullNameEn,
          nameMm: c.fullNameMm || '',
          phone: c.phone || '',
          address: c.address || '',
        });
      }
    });

    // From previous transactions
    db.transactions.forEach(t => {
      if (t.receiverNrc && !map.has(t.receiverNrc) && !t.receiverNrc.includes('Foreign')) {
        map.set(t.receiverNrc, {
          id: `BEN-${t.receiverNrc}`,
          nrc: t.receiverNrc,
          passport: t.receiverPassport || t.receiverPassbook || '',
          nameEn: t.receiverName,
          nameMm: t.receiverNameMm || '',
          phone: t.receiverPhone || '',
          address: t.receiverAddress || '',
        });
      }
    });

    return Array.from(map.values());
  }, [db.customers, db.transactions]);

  // Beneficiary selection handlers
  const handleSelectNrc = (nrcVal: string) => {
    if (nrcVal === '__NEW_NRC__') {
      setIsManualNrc(true);
      setReceiverNrc('');
      return;
    }
    setReceiverNrc(nrcVal);
    const found = beneficiaryOptions.find(b => b.nrc === nrcVal);
    if (found) {
      if (found.passport) setReceiverPassport(found.passport);
      if (found.nameEn) setReceiverName(found.nameEn);
      if (found.nameMm) setReceiverNameMm(found.nameMm);
      if (found.phone) setReceiverPhone(found.phone);
      if (found.address) setReceiverAddress(found.address);
    }
  };

  const handleSelectPassport = (passVal: string) => {
    if (passVal === '__NEW_PASSPORT__') {
      setIsManualPassport(true);
      setReceiverPassport('');
      return;
    }
    setReceiverPassport(passVal);
    const found = beneficiaryOptions.find(b => b.passport === passVal);
    if (found) {
      if (found.nrc) setReceiverNrc(found.nrc);
      if (found.nameEn) setReceiverName(found.nameEn);
      if (found.nameMm) setReceiverNameMm(found.nameMm);
      if (found.phone) setReceiverPhone(found.phone);
      if (found.address) setReceiverAddress(found.address);
    }
  };

  // Partner CRUD Handlers
  const handleOpenAddPartner = () => {
    setIsNewPartner(true);
    const nextId = getNextCleanId('CMP', db.companies, 3);
    setEditingPartner({
      id: nextId,
      code: nextId,
      nameEn: '',
      nameMm: '',
      countryCode: senderCountryCode || 'TH',
      type: 'AGENT',
      swiftCode: '',
      licenseNo: `LIC-${nextId.replace('CMP-', '')}`,
      phone: '+66-',
      email: '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    });
    setIsPartnerModalOpen(true);
  };

  const handleOpenEditPartner = () => {
    const existing = db.companies.find(c => c.id === partnerCompanyId);
    if (!existing) return;
    setIsNewPartner(false);
    setEditingPartner({ ...existing });
    setIsPartnerModalOpen(true);
  };

  const handleDeletePartner = () => {
    if (!partnerCompanyId) return;
    deleteCompany(partnerCompanyId);
    const remaining = db.companies.filter(c => c.id !== partnerCompanyId);
    if (remaining.length > 0) {
      setPartnerCompanyId(remaining[0].id);
    } else {
      setPartnerCompanyId('');
    }
    setPartnerDeleteConfirmId(null);
  };

  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner.nameEn) return;
    const nextId = editingPartner.id || getNextCleanId('CMP', db.companies, 3);
    const toSave: Company = {
      id: nextId,
      code: editingPartner.code || nextId,
      nameEn: editingPartner.nameEn,
      nameMm: editingPartner.nameMm || editingPartner.nameEn,
      countryCode: editingPartner.countryCode || senderCountryCode || 'TH',
      type: (editingPartner.type as any) || 'AGENT',
      swiftCode: editingPartner.swiftCode || '',
      licenseNo: editingPartner.licenseNo || `LIC-${nextId.replace('CMP-', '')}`,
      phone: editingPartner.phone || '',
      email: editingPartner.email || '',
      status: editingPartner.status || 'ACTIVE',
      createdAt: editingPartner.createdAt || new Date().toISOString(),
    };
    saveCompany(toSave);
    setPartnerCompanyId(toSave.id);
    setIsPartnerModalOpen(false);
  };

  // Handle MTCN Lookup
  const handleLookup = () => {
    setLookupMessage(null);
    if (!searchMtcn.trim()) return;

    const found = lookupTransactionByMtcn(searchMtcn);
    if (found) {
      setLookupMessage({
        type: 'success',
        text: language === 'my' 
          ? `MTCN ${found.mtcn} ကို ရှာဖွေတွေ့ရှိပါသည်! အချက်အလက်များ အလိုအလျောက် ဖြည့်သွင်းပြီးပါပြီ။` 
          : `MTCN ${found.mtcn} found in system! Details loaded.`
      });
      setMtcn(found.mtcn);
      if (found.scope) setScope(found.scope);
      if (found.senderNrc) setSenderNrc(found.senderNrc);
      const nrcFront = found.senderNrcFrontAttachment || found.senderNrcAttachment;
      if (nrcFront) {
        setSenderNrcFrontDoc({
          url: nrcFront,
          name: found.senderNrcFrontAttachmentName || found.senderNrcAttachmentName || 'Sender_NRC_Front',
          type: found.senderNrcFrontAttachmentType || found.senderNrcAttachmentType || 'image/jpeg',
          size: found.senderNrcFrontAttachmentSize || found.senderNrcAttachmentSize || 'Attached'
        });
      }
      if (found.senderNrcBackAttachment) {
        setSenderNrcBackDoc({
          url: found.senderNrcBackAttachment,
          name: found.senderNrcBackAttachmentName || 'Sender_NRC_Back',
          type: found.senderNrcBackAttachmentType || 'image/jpeg',
          size: found.senderNrcBackAttachmentSize || 'Attached'
        });
      }
      if (found.sendingBranchId) setOriginBranchId(found.sendingBranchId);
      setSenderName(found.senderName);
      setSenderPhone(found.senderPhone);
      setSenderAddress(found.senderAddress);
      setSenderCountryCode(found.senderCountryCode);
      setReceiverName(found.receiverName);
      setReceiverNameMm(found.receiverNameMm || '');
      setReceiverNrc(found.receiverNrc);
      setReceiverPassport(found.receiverPassport || found.receiverPassbook || '');
      setReceiverPhone(found.receiverPhone);
      setReceiverAddress(found.receiverAddress);
      setSourceCurrency(found.sourceCurrency);
      setSendAmount(found.sendAmount);
      setExchangeRate(found.exchangeRate);
      setPayoutMethod(found.payoutMethod);
      if (found.partnerCompanyId) setPartnerCompanyId(found.partnerCompanyId);
      const sPass = found.senderPassport || found.senderPassbook;
      if (sPass) setSenderPassport(sPass);
      const sAttach = found.senderPassportAttachment || found.senderPassbookAttachment;
      if (sAttach) {
        setSenderPassportAttachment(sAttach);
        setSenderPassportAttachmentName(found.senderPassportAttachmentName || found.senderPassbookAttachmentName || 'Sender_Passport');
        setSenderPassportAttachmentType(found.senderPassportAttachmentType || found.senderPassbookAttachmentType || '');
        setSenderPassportAttachmentSize(found.senderPassportAttachmentSize || found.senderPassbookAttachmentSize || '');
      }
    } else {
      setLookupMessage({
        type: 'error',
        text: language === 'my' 
          ? `MTCN (${searchMtcn}) မတွေ့ရှိပါ။ လိုင်းသစ်အဖြစ် လက်ဖြင့် စာရင်းသွင်းနိုင်ပါသည်။` 
          : `MTCN (${searchMtcn}) not in local database. You can manually enter inbound remittance claim.`
      });
      setMtcn(searchMtcn.trim());
    }
  };

  // Real-time screening
  React.useEffect(() => {
    const match = checkBlacklist(receiverNrc, receiverPassport, receiverName);
    setReceiverMatch(match);
  }, [receiverNrc, receiverPassport, receiverName, checkBlacklist]);

  React.useEffect(() => {
    const match = checkBlacklist(scope === 'DOMESTIC' ? senderNrc : '', senderPassport, senderName);
    setSenderMatch(match);
  }, [scope, senderNrc, senderPassport, senderName, checkBlacklist]);

  // Recalculate exchange rate
  React.useEffect(() => {
    if (scope === 'DOMESTIC') {
      setExchangeRate(1);
    } else if (sourceCurrency !== 'MMK') {
      const rate = getExchangeRate(sourceCurrency, 'MMK');
      if (rate > 0) setExchangeRate(rate);
    }
  }, [scope, sourceCurrency, getExchangeRate]);

  const calculatedPayoutMMK = scope === 'DOMESTIC'
    ? Math.round(Number(sendAmount || 0))
    : Number((sendAmount * exchangeRate).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!receiverName || !receiverPhone || !receiverNrc) {
      setErrorMessage(language === 'my' ? 'ငွေထုတ်ယူသူ၏ အမည်၊ ဖုန်းနံပါတ် နှင့် မှတ်ပုံတင် ထည့်သွင်းပါ' : 'Beneficiary Name, Phone, and NRC are required');
      return;
    }

    if (!sendAmount || Number(sendAmount) <= 0) {
      setErrorMessage(language === 'my' ? 'လွှဲပို့ငွေပမာဏ (Send Amount) ထည့်သွင်းပါ' : 'Please enter a valid Send Amount');
      return;
    }

    if (receiverMatch && receiverMatch.riskLevel === 'CRITICAL') {
      setErrorMessage(
        language === 'my' 
          ? `ငွေထုတ်ယူသူသည် နာမည်ပျက်စာရင်း (${receiverMatch.reason}) တွင် ပါဝင်နေသဖြင့် ငွေထုတ်ပေးခွင့် ပိတ်ထားပါသည်` 
          : `Beneficiary is on CRITICAL Blacklist (${receiverMatch.reason}). Payout blocked.`
      );
      return;
    }

    const selectedPurpose = db.purposes.find(p => p.id === purposeId);

    setIsSubmitting(true);
    try {
      const newTx = await createInwardRemittance({
        createdDate: entryDateTime ? new Date(entryDateTime).toISOString() : new Date().toISOString(),
        mtcn: mtcn || undefined,
        scope,
        senderName: senderName || (scope === 'DOMESTIC' ? 'Local Remitter' : 'Overseas Remitter'),
        senderPhone: senderPhone || (scope === 'DOMESTIC' ? '09-000000000' : '+66-00-000-000'),
        senderAddress: senderAddress || (scope === 'DOMESTIC' ? 'Myanmar' : 'Overseas'),
        senderCountryCode: scope === 'DOMESTIC' ? 'MM' : senderCountryCode,
        senderNrc: scope === 'DOMESTIC' ? senderNrc : undefined,
        senderNrcAttachment: senderNrcFrontDoc?.url || undefined,
        senderNrcAttachmentName: senderNrcFrontDoc?.name || undefined,
        senderNrcAttachmentType: senderNrcFrontDoc?.type || undefined,
        senderNrcAttachmentSize: senderNrcFrontDoc?.size || undefined,
        senderNrcFrontAttachment: senderNrcFrontDoc?.url || undefined,
        senderNrcFrontAttachmentName: senderNrcFrontDoc?.name || undefined,
        senderNrcFrontAttachmentType: senderNrcFrontDoc?.type || undefined,
        senderNrcFrontAttachmentSize: senderNrcFrontDoc?.size || undefined,
        senderNrcBackAttachment: senderNrcBackDoc?.url || undefined,
        senderNrcBackAttachmentName: senderNrcBackDoc?.name || undefined,
        senderNrcBackAttachmentType: senderNrcBackDoc?.type || undefined,
        senderNrcBackAttachmentSize: senderNrcBackDoc?.size || undefined,
        senderPassport: senderPassport || undefined,
        senderPassportAttachment: senderPassportAttachment || undefined,
        senderPassportAttachmentName: senderPassportAttachmentName || undefined,
        senderPassportAttachmentType: senderPassportAttachmentType || undefined,
        senderPassportAttachmentSize: senderPassportAttachmentSize || undefined,
        senderPassbook: senderPassport || undefined,
        senderPassbookAttachment: senderPassportAttachment || undefined,
        senderPassbookAttachmentName: senderPassportAttachmentName || undefined,
        senderPassbookAttachmentType: senderPassportAttachmentType || undefined,
        senderPassbookAttachmentSize: senderPassportAttachmentSize || undefined,
        receiverName,
        receiverNameMm,
        receiverNrc,
        receiverPassport: receiverPassport || undefined,
        receiverPassbook: receiverPassport || undefined,
        receiverPhone,
        receiverAddress,
        receiverCountryCode: 'MM',
        sourceCurrency: scope === 'DOMESTIC' ? 'MMK' : sourceCurrency,
        targetCurrency: 'MMK',
        sendAmount: Number(sendAmount),
        exchangeRate: scope === 'DOMESTIC' ? 1 : Number(exchangeRate),
        receiveAmount: Number(calculatedPayoutMMK),
        serviceFee: 0,
        commissionFee: 0,
        totalPayableAmount: Number(calculatedPayoutMMK),
        payoutMethod,
        payoutBankName: payoutMethod === 'BANK_ACCOUNT' ? payoutBankName : undefined,
        payoutAccountNumber: payoutMethod === 'BANK_ACCOUNT' ? payoutAccountNumber : undefined,
        sendingBranchId: scope === 'DOMESTIC' ? originBranchId : 'BR-001',
        payoutBranchId,
        partnerCompanyId: scope === 'DOMESTIC' ? undefined : (partnerCompanyId || undefined),
        purposeId,
        purposeName: selectedPurpose ? (language === 'my' ? selectedPurpose.nameMm : selectedPurpose.nameEn) : (scope === 'DOMESTIC' ? 'Local Remittance' : 'Labor Remittance'),
        senderNote,
        status: 'PENDING_APPROVAL',
      });

      try {
        confetti({ particleCount: 70, spread: 60 });
      } catch {
        // Safe confetti fallback
      }
      setCreatedTx(newTx);
      setLastSubmittedTx(newTx);
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit inward remittance claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setMtcn('');
    setSearchMtcn('');
    setLookupMessage(null);
    setSenderName('');
    setSenderPhone('');
    setSenderAddress('');
    setSenderNrc('');
    setSenderPassport('');
    setSenderNrcFrontDoc(null);
    setSenderNrcBackDoc(null);
    setSenderPassportAttachment('');
    setSenderPassportAttachmentName('');
    setSenderPassportAttachmentSize('');
    setReceiverName('');
    setReceiverNameMm('');
    setReceiverNrc('');
    setReceiverPassport('');
    setReceiverPhone('');
    setReceiverAddress('');
    setSendAmount(0);
    setSenderNote('');
    setPayoutAccountNumber('');
    setErrorMessage('');
    setIsSubmitted(false);
    setCreatedTx(null);
    setLastSubmittedTx(null);
    handleResetToCurrentTime();
  };

  return (
    <div className="space-y-6">
      {/* Title & Scope Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <DownloadCloud className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.inwardEntryTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t.inwardEntrySubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Add New (Clean Data) Button in Header */}
          <button
            type="button"
            id="header-add-new-inward-btn"
            onClick={handleResetForm}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm hover:scale-[1.02] cursor-pointer"
            title={language === 'my' ? 'အချက်အလက်များရှင်းလင်းပြီး ငွေထုတ်လွှာအသစ် စတင်မည်' : 'Clean data and start new inward claim'}
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>{language === 'my' ? 'Add New (အသစ်ထည့်မည်)' : 'Add New'}</span>
          </button>

          {/* Live System Date & Time Display */}
          <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 font-mono shadow-inner">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>{new Date(entryDateTime).toLocaleDateString()}</span>
            <span className="text-slate-500">|</span>
            <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="text-indigo-300 font-semibold">{liveCurrentTime}</span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>{t.payoutBranch}: </span>
            <strong className="text-white font-semibold">
              {db.branches.find(b => b.id === payoutBranchId)?.nameEn || 'Yangon HQ'} ({db.branches.find(b => b.id === payoutBranchId)?.code || payoutBranchId})
            </strong>
          </div>

          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setScope('INTERNATIONAL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                scope === 'INTERNATIONAL'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🌐</span>
              <span>{language === 'my' ? 'ပြည်ပ (International)' : t.international}</span>
            </button>
            <button
              type="button"
              onClick={() => setScope('DOMESTIC')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                scope === 'DOMESTIC'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇲🇲</span>
              <span>{language === 'my' ? 'ပြည်တွင်း (Domestic)' : t.domestic}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Success Notification Banner when Claim is Submitted */}
      {isSubmitted && lastSubmittedTx && (
        <div className="bg-emerald-950/70 border-2 border-emerald-500/60 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {language === 'my' ? 'အောင်မြင်စွာ တင်ပြပြီးပါပြီ' : 'Successfully Submitted'}
                </span>
                <span className="font-mono text-xs font-bold text-amber-400">
                  MTCN: {lastSubmittedTx.mtcn}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {language === 'my' ? 'ငွေထုတ်လွှာ အတည်ပြုချက် တင်ပြခြင်း အောင်မြင်ပါသည်' : 'Inward Remittance Claim Submitted for Approval'}
              </h3>
              <p className="text-xs text-slate-300">
                Ref: <span className="font-mono font-semibold text-white">{lastSubmittedTx.transactionNo}</span> • {language === 'my' ? 'ထုတ်ပေးငွေ' : 'Payout'}: <strong className="text-emerald-400 font-mono">{lastSubmittedTx.receiveAmount?.toLocaleString()} MMK</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              id="top-print-out-form-btn"
              onClick={() => setCreatedTx(lastSubmittedTx)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all hover:scale-105 flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'my' ? 'ပြေစာ ပရင့်ထုတ်မည် (Print Out Form)' : 'Print Out Form / Voucher'}</span>
            </button>

            <button
              type="button"
              id="top-add-new-btn"
              onClick={handleResetForm}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 hover:border-slate-500 font-bold text-xs shadow transition-all hover:scale-105 flex items-center space-x-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>{language === 'my' ? 'အသစ်ထည့်မည် (Add New)' : 'Add New (Clean Data)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Domestic Process Notice Banner */}
      {scope === 'DOMESTIC' && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-300 shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg flex-shrink-0">
              🇲🇲
            </span>
            <div>
              <div className="font-bold text-emerald-200">
                {language === 'my' ? 'ပြည်တွင်း ငွေလွှဲထုတ်ယူမှု လုပ်ငန်းစဉ် (Domestic Local Remittance Process)' : 'Domestic Remittance Payout Process (Myanmar Kyat)'}
              </div>
              <div className="text-[11px] text-emerald-400/90 mt-0.5">
                {language === 'my' 
                  ? 'မြန်မာနိုင်ငံအတွင်း ဘဏ်ခွဲအချင်းချင်း သို့မဟုတ် ပြည်တွင်းဌာနများမှ ပေးပို့ငွေအား မြန်မာကျပ်ငွေ (MMK) ဖြင့် 1:1 တိုက်ရိုက်ထုတ်ယူပေးချေခြင်း ဖြစ်ပါသည်'
                  : 'Domestic local remittance claim across domestic branches in Myanmar Kyat (1:1 Fixed MMK Rate)'}
              </div>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
            DOMESTIC • MMK
          </span>
        </div>
      )}

      {/* MTCN Lookup Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          {t.lookupMtcn}
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchMtcn}
              onChange={(e) => setSearchMtcn(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder={t.searchMtcnPlaceholder}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={handleLookup}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors"
          >
            {t.lookupBtn}
          </button>
        </div>

        {lookupMessage && (
          <div className={`p-3 rounded-xl text-xs font-medium ${
            lookupMessage.type === 'success' 
              ? 'bg-emerald-950/60 border border-emerald-500 text-emerald-300' 
              : 'bg-amber-950/60 border border-amber-500 text-amber-300'
          }`}>
            {lookupMessage.text}
          </div>
        )}
      </div>

      {/* Blacklist Warning */}
      {receiverMatch && (
        <div className="bg-rose-950 border-2 border-rose-500 rounded-2xl p-5 text-white shadow-xl space-y-2 animate-pulse">
          <div className="flex items-center space-x-2 text-rose-300 font-bold text-sm">
            <ShieldAlert className="w-5 h-5" />
            <span>{t.blacklistWarningTitle}</span>
          </div>
          <div className="text-xs text-rose-200">
            <strong>Beneficiary Matched: </strong> {receiverMatch.fullNameEn} ({receiverMatch.nrcNumber}) - {receiverMatch.reason}
          </div>
          <div className="text-xs italic bg-black/40 p-2 rounded text-rose-300">
            Note: "{receiverMatch.note}"
          </div>
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TOP SECTION: Transaction Date & Time (User Request #1) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <span>{language === 'my' ? 'ရက်စွဲ နှင့် အချိန် (Disbursement Date & Time)' : 'Disbursement Date & Time'}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-medium">
                  {new Date(entryDateTime).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                <span>{language === 'my' ? 'ငွေထုတ်ယူပေးချေသည့် ရက်စွဲနှင့် စနစ်အချိန်' : 'Remittance payout disbursement timestamp registered in audit ledger'}</span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-amber-400 font-mono font-medium flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Live: {liveCurrentTime}</span>
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl shadow-inner">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <input
                type="datetime-local"
                value={entryDateTime}
                onChange={(e) => setEntryDateTime(e.target.value)}
                className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={handleResetToCurrentTime}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
              title={language === 'my' ? 'ယခုအချိန် ပြန်သတ်မှတ်မည်' : 'Reset to current system time'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'ယခုအချိန်' : 'Current Time'}</span>
            </button>
          </div>
        </div>

        {/* UPPER FRAME: Domestic Sender & Origin Branch / Overseas Sender & Partner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {scope === 'DOMESTIC' 
                    ? (language === 'my' ? 'ပြည်တွင်း လွှဲပို့သူ နှင့် မူလဘဏ်ခွဲ' : 'Domestic Sender & Origin Branch')
                    : (language === 'my' ? 'ပြည်ပ လွှဲပို့သူ နှင့် မိတ်ဖက်အဖွဲ့အစည်း' : 'Overseas Sender & Partner')}
                </h3>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                scope === 'DOMESTIC'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
              }`}>
                {scope === 'DOMESTIC' ? '🇲🇲 DOMESTIC' : '🌐 INTERNATIONAL'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderName} *</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder={scope === 'DOMESTIC' ? "ဥပမာ - ဦးမောင်မောင် (U Maung Maung)" : "e.g. U Min Hein Thu"}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {scope === 'DOMESTIC' ? (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">{t.senderCountry}</label>
                  <div className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-emerald-300 font-medium flex items-center space-x-2">
                    <span>🇲🇲</span>
                    <span>{language === 'my' ? 'မြန်မာ (ပြည်တွင်း)' : 'Myanmar (Domestic)'}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">{t.senderCountry}</label>
                  <select
                    value={senderCountryCode}
                    onChange={(e) => {
                      setSenderCountryCode(e.target.value);
                      const country = db.countries.find(c => c.code === e.target.value);
                      if (country && country.currencyCode) setSourceCurrency(country.currencyCode);
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {db.countries.filter(c => !c.isDomestic).map(c => (
                      <option key={c.id} value={c.code}>{c.flagEmoji} {language === 'my' ? c.nameMm : c.nameEn}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sender NRC for Domestic scope */}
              {scope === 'DOMESTIC' && (
                <div className="sm:col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-400 font-medium">
                      {language === 'my' ? 'လွှဲပို့သူ၏ မှတ်ပုံတင်အမှတ် (Sender NRC)' : 'Sender National Registration Card (NRC)'}
                    </label>
                    {senderMatch && (
                      <span className="text-rose-400 text-[10px] font-bold flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Blacklist Match!</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={senderNrc}
                    onChange={(e) => setSenderNrc(e.target.value)}
                    placeholder="12/LKN(N)123456"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              )}

              {/* Domestic: Sending / Origin Branch vs International: Partner Bank / Agent */}
              {scope === 'DOMESTIC' ? (
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-slate-400 font-medium">
                    {language === 'my' ? 'ငွေလွှဲပေးပို့ခဲ့သည့် မူလဘဏ်ခွဲ (Origin Sending Branch)' : 'Origin Sending Branch'} *
                  </label>
                  <select
                    value={originBranchId}
                    onChange={(e) => setOriginBranchId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-medium"
                  >
                    {db.branches.map(b => {
                      const country = db.countries.find(c => c.code === (b.countryCode || 'MM'));
                      return (
                        <option key={b.id} value={b.id}>
                          {b.code} - {b.nameEn} ({country?.flagEmoji || '🇲🇲'} {b.city})
                        </option>
                      );
                    })}
                  </select>

                  {/* Sending Branch Details Card */}
                  {(() => {
                    const sendBranch = db.branches.find(b => b.id === originBranchId) || db.branches[0];
                    if (!sendBranch) return null;
                    return (
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Building className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white text-xs">
                                {language === 'my' && sendBranch.nameMm ? `${sendBranch.nameMm} (${sendBranch.nameEn})` : sendBranch.nameEn}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-[10px] font-bold">
                                {sendBranch.code}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[11px] mt-1">
                              <span className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3 text-emerald-400" />
                                <span>{sendBranch.address}, {sendBranch.city}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                <span className="font-mono text-slate-300">{sendBranch.phone}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-400 shrink-0 border-t sm:border-t-0 pt-1.5 sm:pt-0 sm:border-l border-slate-800 sm:pl-3">
                          <span className="text-slate-500 block">{language === 'my' ? 'ဘဏ်ခွဲ မန်နေဂျာ' : 'Branch Manager'}</span>
                          <span className="font-bold text-slate-200">{sendBranch.managerName}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Partner Bank / Agent with Add New, Edit, Delete */
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-medium">
                      {t.partnerCompany} *
                    </label>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={handleOpenAddPartner}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                        title={language === 'my' ? 'မိတ်ဖက်အသစ် ထည့်သွင်းမည်' : 'Add New Partner Bank/Agent'}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{language === 'my' ? 'အသစ်ထည့်' : 'Add New'}</span>
                      </button>
                      {partnerCompanyId && (
                        <>
                          <button
                            type="button"
                            onClick={handleOpenEditPartner}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                            title={language === 'my' ? 'လက်ရှိမိတ်ဖက် ပြင်ဆင်မည်' : 'Edit Selected Partner'}
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>{language === 'my' ? 'ပြင်မည်' : 'Edit'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPartnerDeleteConfirmId(partnerCompanyId)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-950 hover:bg-rose-900 border border-rose-700/50 text-rose-300 transition-colors"
                            title={language === 'my' ? 'လက်ရှိမိတ်ဖက် ဖျက်ပစ်မည်' : 'Delete Selected Partner'}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{language === 'my' ? 'ဖျက်မည်' : 'Delete'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <select
                    value={partnerCompanyId}
                    onChange={(e) => setPartnerCompanyId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {db.companies.map(c => {
                      const country = db.countries.find(cty => cty.code === c.countryCode);
                      return (
                        <option key={c.id} value={c.id}>
                          [{c.code}] {c.nameEn} ({country?.flagEmoji || '🌐'} {c.type} - {c.countryCode})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Partner Delete Confirmation alert if active */}
              {partnerDeleteConfirmId && (
                <div className="sm:col-span-2 p-3 bg-rose-950/60 border border-rose-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-rose-200 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>
                      {language === 'my' 
                        ? `ဤမိတ်ဖက် (${db.companies.find(c => c.id === partnerDeleteConfirmId)?.nameEn}) ကို ဖျက်ရန် သေချာပါသလား?` 
                        : `Delete partner (${db.companies.find(c => c.id === partnerDeleteConfirmId)?.nameEn})?`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleDeletePartner}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold transition-colors"
                    >
                      {language === 'my' ? 'သေချာသည် ဖျက်မည်' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartnerDeleteConfirmId(null)}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs transition-colors"
                    >
                      {language === 'my' ? 'မဖျက်တော့ပါ' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}

              {/* Branch Selection in Overseas Sender & Partner */}
              <div className="sm:col-span-2 space-y-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    {language === 'my' ? 'ဆောင်ရွက်မည့် ဘဏ်ခွဲ (Branch)' : 'Processing / Payout Branch'} *
                  </label>
                  <select
                    value={payoutBranchId}
                    onChange={(e) => setPayoutBranchId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none font-medium"
                  >
                    {db.branches.map(b => {
                      const country = db.countries.find(c => c.code === (b.countryCode || 'MM'));
                      return (
                        <option key={b.id} value={b.id}>
                          {b.code} - {b.nameEn} ({country?.flagEmoji || '🇲🇲'} {b.city})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Detailed Branch Information Banner */}
                {(() => {
                  const curBranch = db.branches.find(b => b.id === payoutBranchId) || db.branches[0];
                  if (!curBranch) return null;
                  return (
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#D1F2EB] text-black border border-[#85D4C3] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <Building2 className="w-4 h-4 text-black" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-xs">
                              {language === 'my' && curBranch.nameMm ? `${curBranch.nameMm} (${curBranch.nameEn})` : curBranch.nameEn}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#D1F2EB] text-black border border-[#85D4C3] font-mono text-[10px] font-bold">
                              {curBranch.code}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#D1F2EB] text-black border border-[#85D4C3] text-[10px] font-bold">
                              {curBranch.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[11px] mt-1">
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-black" />
                              <span>{curBranch.address}, {curBranch.city}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-black" />
                              <span className="font-mono text-slate-300">{curBranch.phone}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-400 shrink-0 border-t sm:border-t-0 pt-1.5 sm:pt-0 sm:border-l border-slate-800 sm:pl-3">
                        <span className="text-slate-500 block">{language === 'my' ? 'ဘဏ်ခွဲ မန်နေဂျာ' : 'Branch Manager'}</span>
                        <span className="font-bold text-slate-200">{curBranch.managerName}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.purposeOfRemit}</label>
                <select
                  value={purposeId}
                  onChange={(e) => setPurposeId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  {db.purposes.map(p => (
                    <option key={p.id} value={p.id}>{p.nameEn}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.senderPhone}</label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder={scope === 'DOMESTIC' ? "09-420011223" : "+60-11-2948-1928"}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  {scope === 'DOMESTIC' 
                    ? (language === 'my' ? 'လွှဲပို့သူ၏ နိုင်ငံကူးလက်မှတ် (ရှိလျှင်)' : "Sender's Passport (Optional)") 
                    : (language === 'my' ? 'ငွေလွှဲသူ နိုင်ငံကူးလက်မှတ် (Passport No)' : 'Sender Passport No')}
                </label>
                <input
                  type="text"
                  value={senderPassport}
                  onChange={(e) => setSenderPassport(e.target.value)}
                  placeholder="e.g. MB-102948 / P1234567"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              {/* SENDER NRC ATTACHMENTS (FRONT & BACK) FOR DOMESTIC INWARD */}
              {scope === 'DOMESTIC' && (
                <div className="sm:col-span-2 pt-3 border-t border-slate-800 space-y-3">
                  {/* Section Header with Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        {language === 'my' 
                          ? 'လွှဲပို့သူ၏ မှတ်ပုံတင် အထောက်အထား (NRC Front & Back Documents)' 
                          : "Sender's NRC Documents (Front & Back Sides)"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAttachBothSampleNrc}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer transition-colors"
                        title={language === 'my' ? 'အရှေ့နှင့် အနောက်ခြမ်း နမူနာ ၂ ခုလုံး တစ်ပြိုင်နက် တွဲမည်' : 'Attach both Front & Back sample NRCs'}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'my' ? '+ နမူနာ ကတ်အပြည့်အစုံ တွဲမည်' : '+ Attach Both Samples'}</span>
                      </button>

                      <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="font-mono">☁️ Supabase Ready</span>
                      </span>
                    </div>
                  </div>

                  {/* Status message */}
                  {nrcUploadStatus && (
                    <div className={`text-xs px-3 py-1.5 rounded-lg flex items-center space-x-2 ${
                      nrcUploadStatus.type === 'error' 
                        ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300' 
                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    }`}>
                      {nrcUploadStatus.type === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span>{nrcUploadStatus.text}</span>
                    </div>
                  )}

                  {/* Dual Grid: NRC Front Box and NRC Back Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* NRC Front Box */}
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{language === 'my' ? 'မှတ်ပုံတင် အရှေ့ခြမ်း (NRC Front)' : 'NRC Card - Front Side'}</span>
                        </span>
                        {senderNrcFrontDoc ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 border border-emerald-500/30">
                            <Check className="w-2.5 h-2.5" />
                            <span>{language === 'my' ? 'ပူးတွဲပြီး' : 'Attached'}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
                            {language === 'my' ? 'မတွဲရသေးပါ' : 'Not Attached'}
                          </span>
                        )}
                      </div>

                      <input
                        type="file"
                        ref={nrcFrontInputRef}
                        accept="image/*,.pdf,.svg"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleNrcFile(f, 'front');
                        }}
                      />

                      {senderNrcFrontDoc?.url ? (
                        <div className="space-y-2">
                          <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[16/10] flex items-center justify-center">
                            <img 
                              src={senderNrcFrontDoc.url} 
                              alt="Sender NRC Front" 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-[2px]">
                              <button
                                type="button"
                                onClick={() => openLightbox({
                                  title: language === 'my' ? 'မှတ်ပုံတင် အရှေ့ခြမ်း (Front Side)' : "Sender's NRC Card (Front)",
                                  url: senderNrcFrontDoc.url,
                                  name: senderNrcFrontDoc.name,
                                  type: senderNrcFrontDoc.type,
                                  size: senderNrcFrontDoc.size,
                                  idNumber: senderNrc
                                })}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                                title={language === 'my' ? 'ပုံကြီးချဲ့ကြည့်ရှုရန်' : 'Enlarge'}
                              >
                                <Maximize2 className="w-4 h-4 text-emerald-400" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="truncate max-w-[170px] font-mono text-slate-300">
                              {senderNrcFrontDoc.name || 'NRC_Front.png'}
                            </span>
                            <span className="text-emerald-400 font-mono font-semibold">
                              {senderNrcFrontDoc.size || 'Attached'}
                            </span>
                          </div>

                          {/* Action buttons: View, Replace, Remove */}
                          <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-700/60">
                            <button
                              type="button"
                              onClick={() => openLightbox({
                                title: language === 'my' ? 'မှတ်ပုံတင် အရှေ့ခြမ်း (Front Side)' : "Sender's NRC Card (Front)",
                                url: senderNrcFrontDoc.url,
                                name: senderNrcFrontDoc.name,
                                type: senderNrcFrontDoc.type,
                                size: senderNrcFrontDoc.size,
                                idNumber: senderNrc
                              })}
                              className="flex-1 inline-flex items-center justify-center space-x-1 py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs font-medium cursor-pointer transition-colors border border-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'ကြည့်ရှုမည်' : 'View'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => nrcFrontInputRef.current?.click()}
                              className="flex-1 inline-flex items-center justify-center space-x-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveNrcDoc('front')}
                              className="p-1 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 cursor-pointer transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onDragOver={(e) => { e.preventDefault(); setIsDraggingNrcFront(true); }}
                          onDragLeave={() => setIsDraggingNrcFront(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingNrcFront(false);
                            const f = e.dataTransfer.files?.[0];
                            if (f) handleNrcFile(f, 'front');
                          }}
                          className={`border-2 border-dashed rounded-xl p-4 text-center space-y-2 transition-all ${
                            isDraggingNrcFront 
                              ? 'border-emerald-400 bg-emerald-500/10' 
                              : 'border-slate-700 hover:border-emerald-500/60 bg-slate-900/50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                            {isUploadingNrcFront ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UploadCloud className="w-4 h-4" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-tight">
                            {language === 'my' ? 'အရှေ့ခြမ်း ဓာတ်ပုံ သို့မဟုတ် PDF တွဲရန်' : 'Front NRC document (Image/PDF)'}
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={handleAttachSampleNrcFront}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold cursor-pointer transition-colors"
                            >
                              + {language === 'my' ? 'နမူနာ အရှေ့ခြမ်း' : 'Sample Front'}
                            </button>
                            <button
                              type="button"
                              onClick={() => nrcFrontInputRef.current?.click()}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition-colors flex items-center space-x-1"
                            >
                              <Upload className="w-3 h-3" />
                              <span>{language === 'my' ? 'ဖိုင်တင်မည်' : 'Upload'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* NRC Back Box - USER REQUEST: "Add NRC Back Attach for Domestic Inward Sender Frame" */}
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{language === 'my' ? 'မှတ်ပုံတင် အနောက်ခြမ်း (NRC Back)' : 'NRC Card - Back Side'}</span>
                        </span>
                        {senderNrcBackDoc ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 border border-emerald-500/30">
                            <Check className="w-2.5 h-2.5" />
                            <span>{language === 'my' ? 'ပူးတွဲပြီး' : 'Attached'}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
                            {language === 'my' ? 'မတွဲရသေးပါ' : 'Not Attached'}
                          </span>
                        )}
                      </div>

                      <input
                        type="file"
                        ref={nrcBackInputRef}
                        accept="image/*,.pdf,.svg"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleNrcFile(f, 'back');
                        }}
                      />

                      {senderNrcBackDoc?.url ? (
                        <div className="space-y-2">
                          <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[16/10] flex items-center justify-center">
                            <img 
                              src={senderNrcBackDoc.url} 
                              alt="Sender NRC Back" 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 backdrop-blur-[2px]">
                              <button
                                type="button"
                                onClick={() => openLightbox({
                                  title: language === 'my' ? 'မှတ်ပုံတင် အနောက်ခြမ်း (Back Side)' : "Sender's NRC Card (Back)",
                                  url: senderNrcBackDoc.url,
                                  name: senderNrcBackDoc.name,
                                  type: senderNrcBackDoc.type,
                                  size: senderNrcBackDoc.size,
                                  idNumber: senderNrc
                                })}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                                title={language === 'my' ? 'ပုံကြီးချဲ့ကြည့်ရှုရန်' : 'Enlarge'}
                              >
                                <Maximize2 className="w-4 h-4 text-emerald-400" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="truncate max-w-[170px] font-mono text-slate-300">
                              {senderNrcBackDoc.name || 'NRC_Back.png'}
                            </span>
                            <span className="text-emerald-400 font-mono font-semibold">
                              {senderNrcBackDoc.size || 'Attached'}
                            </span>
                          </div>

                          {/* Action buttons: View, Replace, Remove */}
                          <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-700/60">
                            <button
                              type="button"
                              onClick={() => openLightbox({
                                title: language === 'my' ? 'မှတ်ပုံတင် အနောက်ခြမ်း (Back Side)' : "Sender's NRC Card (Back)",
                                url: senderNrcBackDoc.url,
                                name: senderNrcBackDoc.name,
                                type: senderNrcBackDoc.type,
                                size: senderNrcBackDoc.size,
                                idNumber: senderNrc
                              })}
                              className="flex-1 inline-flex items-center justify-center space-x-1 py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs font-medium cursor-pointer transition-colors border border-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'ကြည့်ရှုမည်' : 'View'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => nrcBackInputRef.current?.click()}
                              className="flex-1 inline-flex items-center justify-center space-x-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveNrcDoc('back')}
                              className="p-1 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 cursor-pointer transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onDragOver={(e) => { e.preventDefault(); setIsDraggingNrcBack(true); }}
                          onDragLeave={() => setIsDraggingNrcBack(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingNrcBack(false);
                            const f = e.dataTransfer.files?.[0];
                            if (f) handleNrcFile(f, 'back');
                          }}
                          className={`border-2 border-dashed rounded-xl p-4 text-center space-y-2 transition-all ${
                            isDraggingNrcBack 
                              ? 'border-emerald-400 bg-emerald-500/10' 
                              : 'border-slate-700 hover:border-emerald-500/60 bg-slate-900/50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                            {isUploadingNrcBack ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UploadCloud className="w-4 h-4" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-tight">
                            {language === 'my' ? 'အနောက်ခြမ်း ဓာတ်ပုံ သို့မဟုတ် PDF တွဲရန်' : 'Back NRC document (Image/PDF)'}
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={handleAttachSampleNrcBack}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold cursor-pointer transition-colors"
                            >
                              + {language === 'my' ? 'နမူနာ အနောက်ခြမ်း' : 'Sample Back'}
                            </button>
                            <button
                              type="button"
                              onClick={() => nrcBackInputRef.current?.click()}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition-colors flex items-center space-x-1"
                            >
                              <Upload className="w-3 h-3" />
                              <span>{language === 'my' ? 'ဖိုင်တင်မည်' : 'Upload'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sender Passport Attachment (Supabase Storage / Database) for International */}
              {scope === 'INTERNATIONAL' && (
                <div className="sm:col-span-2 pt-2 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <label className="flex items-center space-x-1.5 text-slate-200 font-semibold text-xs">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        {language === 'my' 
                          ? 'ငွေလွှဲသူ၏ နိုင်ငံကူးလက်မှတ် / Passport ပူးတွဲစာရွက်စာတမ်း (Supabase)' 
                          : "Overseas Sender's Passport Attachment (Supabase)"}
                      </span>
                    </label>
                    <span className="inline-flex items-center space-x-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="font-mono">☁️ Supabase Sync</span>
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePassportFileChange}
                    accept="image/*,application/pdf"
                    className="hidden"
                    id="sender-passport-upload-input"
                  />

                  {!senderPassportAttachment ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingPassport(true); }}
                      onDragLeave={() => setIsDraggingPassport(false)}
                      onDrop={handlePassportDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col sm:flex-row items-center justify-center gap-3 ${
                        isDraggingPassport 
                          ? 'border-indigo-400 bg-indigo-500/10' 
                          : 'border-slate-700 hover:border-indigo-500/60 bg-slate-800/40 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                        {isUploadingPassport ? (
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                        ) : (
                          <UploadCloud className="w-5 h-5" />
                        )}
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-xs font-semibold text-slate-200">
                          {language === 'my' 
                            ? 'ငွေလွှဲသူ၏ Passport ဓာတ်ပုံ သို့မဟုတ် PDF တွဲရန် နှိပ်ပါ (သို့မဟုတ် ဖိုင်ဆွဲထည့်ပါ)' 
                            : "Click to upload or drag & drop Sender's Passport (Image / PDF)"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {language === 'my' 
                            ? 'JPG, PNG, PDF, WEBP (အများဆုံး 15MB) • Supabase Storage & Database တွင် အလိုအလျောက် သိမ်းဆည်းပါမည်' 
                            : 'Supports JPG, PNG, PDF up to 15MB • Persisted to Supabase'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Attached Passport Preview Card */
                    <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                      <div className="flex items-center space-x-3 overflow-hidden w-full sm:w-auto">
                        {senderPassportAttachment.startsWith('data:image') || senderPassportAttachmentType?.startsWith('image/') || senderPassportAttachment.match(/\.(jpeg|jpg|png|webp)/i) ? (
                          <div 
                            onClick={() => setShowPassportPreviewModal(true)}
                            className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden cursor-pointer hover:opacity-85 transition-opacity flex-shrink-0 relative group"
                            title={language === 'my' ? 'ပုံကြီးချဲ့ကြည့်ရှုရန် နှိပ်ပါ' : 'Click to preview'}
                          >
                            <img 
                              src={senderPassportAttachment} 
                              alt="Sender Passport Preview" 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400 flex-shrink-0">
                            <FileText className="w-7 h-7" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[280px]">
                              {senderPassportAttachmentName || 'Sender_Passport'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({senderPassportAttachmentSize || 'Attached'})
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="truncate">
                              {passportUploadStatus?.text || (language === 'my' ? 'Supabase တွင် သိမ်းဆည်းရန် အသင့်ဖြစ်ပါပြီ' : 'Passport attached & ready to save in Supabase')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setShowPassportPreviewModal(true)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-xs font-medium flex items-center space-x-1 cursor-pointer"
                          title={language === 'my' ? 'ကြည့်ရှုမည်' : 'View Passport'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{language === 'my' ? 'ကြည့်မည်' : 'Preview'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemovePassport}
                          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 transition-colors text-xs cursor-pointer"
                          title={language === 'my' ? 'ဖယ်ရှားမည်' : 'Remove Attachment'}
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

        {/* LOWER FRAME: Beneficiary / Receiver Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <UserCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {language === 'my' ? 'ငွေထုတ်ယူမည့် ဖောက်သည် အချက်အလက်' : 'Beneficiary / Receiver Details'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'my' ? 'ငွေထုတ်ယူမည့် ဖောက်သည်၏ ကိုယ်ရေးအချက်အလက်များနှင့် မှတ်ပုံတင်' : 'Recipient identity, NRC/Passport & contact details'}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {language === 'my' ? 'ငွေလက်ခံသူ' : 'Beneficiary Details'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.receiverName} *</label>
              <input
                type="text"
                required
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="e.g. Ko Aung Kyaw Moe"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.receiverNameMm}</label>
              <input
                type="text"
                value={receiverNameMm}
                onChange={(e) => setReceiverNameMm(e.target.value)}
                placeholder="e.g. ကိုအောင်ကျော်မိုး"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.receiverPhone} *</label>
              <input
                type="text"
                required
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                placeholder="09-974820194"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Beneficiary Myanmar NRC - Dropdown List with Manual Entry option */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-400 font-medium">
                  {t.beneficiaryNrc} * {receiverMatch ? <span className="text-rose-400 font-bold">(BLACKLIST MATCH)</span> : ''}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualNrc(!isManualNrc);
                    if (!isManualNrc) setReceiverNrc('');
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-normal transition-colors"
                >
                  {isManualNrc 
                    ? (language === 'my' ? '← စာရင်းမှ ရွေးမည်' : '← Select from List') 
                    : (language === 'my' ? '+ အသစ်ရိုက်မည်' : '+ Enter Manual')}
                </button>
              </div>

              {isManualNrc ? (
                <input
                  type="text"
                  required
                  value={receiverNrc}
                  onChange={(e) => setReceiverNrc(e.target.value)}
                  placeholder="12/DAGANA(N)019482"
                  className={`w-full bg-slate-800 border rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none ${
                    receiverMatch ? 'border-rose-500 bg-rose-950/30 text-rose-200' : 'border-slate-700 focus:border-indigo-500'
                  }`}
                />
              ) : (
                <select
                  required
                  value={receiverNrc}
                  onChange={(e) => handleSelectNrc(e.target.value)}
                  className={`w-full bg-slate-800 border rounded-xl px-3 py-2 text-white font-mono focus:outline-none ${
                    receiverMatch ? 'border-rose-500 bg-rose-950/30 text-rose-200' : 'border-slate-700 focus:border-indigo-500'
                  }`}
                >
                  <option value="">
                    -- {language === 'my' ? 'မှတ်ပုံတင် ရွေးချယ်ပါ (Select Beneficiary NRC)' : 'Select Beneficiary NRC'} --
                  </option>
                  {beneficiaryOptions.map(b => (
                    <option key={b.nrc} value={b.nrc}>
                      {b.nrc} — {b.nameEn} {b.nameMm ? `(${b.nameMm})` : ''}
                    </option>
                  ))}
                  <option value="__NEW_NRC__">
                    + {language === 'my' ? 'အသစ်ရိုက်ထည့်မည် (Enter Custom NRC)...' : 'Enter Custom NRC...'}
                  </option>
                </select>
              )}
            </div>

            {/* Passport No - Dropdown List with Manual Entry option */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-400 font-medium">
                  {t.beneficiaryPassbook}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualPassport(!isManualPassport);
                    if (!isManualPassport) setReceiverPassport('');
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-normal transition-colors"
                >
                  {isManualPassport 
                    ? (language === 'my' ? '← စာရင်းမှ ရွေးမည်' : '← Select from List') 
                    : (language === 'my' ? '+ အသစ်ရိုက်မည်' : '+ Enter Manual')}
                </button>
              </div>

              {isManualPassport ? (
                <input
                  type="text"
                  value={receiverPassport}
                  onChange={(e) => setReceiverPassport(e.target.value)}
                  placeholder="MB-102948"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              ) : (
                <select
                  value={receiverPassport}
                  onChange={(e) => handleSelectPassport(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">
                    -- {language === 'my' ? 'နိုင်ငံကူးလက်မှတ် ရွေးချယ်ပါ' : 'Select Passport No'} --
                  </option>
                  {beneficiaryOptions.filter(b => b.passport).map(b => (
                    <option key={b.passport} value={b.passport}>
                      {b.passport} — {b.nameEn} {b.nameMm ? `(${b.nameMm})` : ''}
                    </option>
                  ))}
                  <option value="__NEW_PASSPORT__">
                    + {language === 'my' ? 'အသစ်ရိုက်ထည့်မည် (Enter Custom Passport)...' : 'Enter Custom Passport...'}
                  </option>
                </select>
              )}
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-slate-400 mb-1 font-medium">{t.receiverAddress}</label>
              <input
                type="text"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                placeholder="Room 402, Building 8, South Dagon, Yangon"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Coins className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {t.financialDetails} & Payout Method
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.sourceCurrency}</label>
              {scope === 'DOMESTIC' ? (
                <div className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-emerald-400 font-bold flex items-center justify-between">
                  <span>MMK - Myanmar Kyat</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">1:1</span>
                </div>
              ) : (
                <select
                  value={sourceCurrency}
                  onChange={(e) => setSourceCurrency(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:border-indigo-500 focus:outline-none"
                >
                  {db.currencies.map(c => (
                    <option key={c.id} value={c.code}>{c.code} - {c.nameEn}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                {t.sendAmount} {scope === 'DOMESTIC' ? '(MMK)' : `(${sourceCurrency})`}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={sendAmount}
                onChange={(e) => setSendAmount(Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.exchangeRate}</label>
              {scope === 'DOMESTIC' ? (
                <div className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-emerald-400 font-mono font-bold text-sm flex items-center justify-between">
                  <span>1.0000</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-sans">DOMESTIC</span>
                </div>
              ) : (
                <input
                  type="number"
                  step="any"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-emerald-400 font-mono font-bold text-sm focus:border-indigo-500 focus:outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">{t.payoutMethod}</label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="CASH_PICKUP">{t.cashPickup}</option>
                <option value="BANK_ACCOUNT">{t.bankAccount}</option>
                <option value="MOBILE_WALLET">{t.mobileWallet}</option>
              </select>
            </div>
          </div>

          {/* Validation Error Message Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/60 text-rose-200 text-xs flex items-center space-x-3 shadow-md animate-in fade-in duration-150">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold text-rose-300 block">{language === 'my' ? 'ဖြည့်သွင်းရန် လိုအပ်ချက်များရှိနေပါသည်:' : 'Validation Required:'}</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Grand Payout Box */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-slate-400 text-xs font-semibold block uppercase">
                {language === 'my' ? 'ငွေထုတ်ယူသူသို့ ပေးချေရမည့် မြန်မာကျပ်ငွေ ပမာဏ' : 'Total Beneficiary Payout (MMK)'}
              </span>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                {calculatedPayoutMMK.toLocaleString()} <span className="text-sm font-bold">MMK</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Always present Add New (Clean Data) button */}
              <button
                type="button"
                id="reset-inward-claim-btn"
                onClick={handleResetForm}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-bold text-sm shadow-md transition-all hover:scale-[1.02] flex items-center space-x-2 cursor-pointer"
                title={language === 'my' ? 'အချက်အလက်များရှင်းလင်းပြီး ငွေထုတ်လွှာအသစ် စတင်မည်' : 'Clean data and start new inward claim'}
              >
                <RotateCcw className="w-4 h-4 text-sky-400" />
                <span>{language === 'my' ? 'အသစ်ထည့်မည် (Add New)' : 'Add New (Clean Data)'}</span>
              </button>

              {/* If submitted, allow user to open Print Out Form at any time */}
              {isSubmitted && lastSubmittedTx && (
                <button
                  type="button"
                  id="print-out-form-bottom-btn"
                  onClick={() => setCreatedTx(lastSubmittedTx)}
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg transition-all hover:scale-[1.02] flex items-center space-x-2 cursor-pointer"
                  title={language === 'my' ? 'ပြေစာ ပရင့်ထုတ်မည် / ကြည့်ရှုမည်' : 'Print Out Form & Voucher'}
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>{language === 'my' ? 'Print Out Form (ပြေစာ)' : 'Print Out Form'}</span>
                </button>
              )}

              <button
                type="submit"
                id="submit-inward-claim-btn"
                disabled={isSubmitting || isSubmitted}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 ${
                  isSubmitted
                    ? 'bg-slate-800/90 text-slate-500 border border-slate-700/80 opacity-40 cursor-not-allowed shadow-none select-none'
                    : isSubmitting
                    ? 'bg-emerald-700 text-emerald-200 opacity-60 cursor-wait shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                }`}
                title={
                  isSubmitted 
                    ? (language === 'my' ? 'အတည်ပြုချက် တင်ပြပြီးပါပြီ (Submit ပြုလုပ်ပြီးပါပြီ)' : 'Already Submitted for Approval') 
                    : undefined
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{language === 'my' ? 'အတည်ပြုရန် တင်ပြနေပါသည်...' : 'Submitting Claim...'}</span>
                  </>
                ) : isSubmitted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500/80" />
                    <span>{language === 'my' ? 'ငွေထုတ်ပေးရန် အတည်ပြုချက် တင်ပြပြီးပါပြီ (Submitted)' : 'Inward Claim Submitted for Approval (Submitted)'}</span>
                  </>
                ) : (
                  <span>{t.submitInwardApproval}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Generated Voucher Modal */}
      <VoucherModal
        isOpen={!!createdTx}
        transaction={createdTx}
        onClose={() => setCreatedTx(null)}
      />

      {/* Partner Bank / Agent Add & Edit Modal */}
      {isPartnerModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs overflow-y-auto flex justify-center items-start sm:items-center p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPartnerModalOpen(false);
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">
                  {isNewPartner 
                    ? (language === 'my' ? 'မိတ်ဖက်ဘဏ် / အေဂျင်စီ အသစ်ထည့်မည်' : 'Add New Partner Bank / Agent')
                    : (language === 'my' ? 'မိတ်ဖက်ဘဏ် / အေဂျင်စီ ပြင်ဆင်မည်' : 'Edit Partner Bank / Agent')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPartnerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Company Code *</label>
                  <input
                    type="text"
                    required
                    value={editingPartner.code || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, code: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {language === 'my' ? 'နိုင်ငံ (Country) *' : 'Country *'}
                  </label>
                  <select
                    value={editingPartner.countryCode || 'TH'}
                    onChange={(e) => setEditingPartner({ ...editingPartner, countryCode: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                  >
                    {db.countries.map(c => (
                      <option key={c.id} value={c.code}>
                        {c.flagEmoji} {language === 'my' ? c.nameMm : c.nameEn} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Partner Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={editingPartner.nameEn || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, nameEn: e.target.value })}
                  placeholder="e.g. Western Union Thailand"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Partner Name (Myanmar)
                </label>
                <input
                  type="text"
                  value={editingPartner.nameMm || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, nameMm: e.target.value })}
                  placeholder="e.g. ဝက်စတန်ယူနီယံ ထိုင်း"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Entity Type</label>
                  <select
                    value={editingPartner.type || 'AGENT'}
                    onChange={(e) => setEditingPartner({ ...editingPartner, type: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium"
                  >
                    <option value="BANK">BANK (ဘဏ်)</option>
                    <option value="AGENT">AGENT (အေဂျင်စီ)</option>
                    <option value="FINTECH">FINTECH (ဖင်တက်)</option>
                    <option value="MONEY_CHANGER">MONEY CHANGER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">SWIFT / BIC Code</label>
                  <input
                    type="text"
                    value={editingPartner.swiftCode || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, swiftCode: e.target.value })}
                    placeholder="e.g. BKKBTHBK"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">License / Reg No</label>
                  <input
                    type="text"
                    value={editingPartner.licenseNo || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, licenseNo: e.target.value })}
                    placeholder="BOT-FX-2026-01"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingPartner.phone || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, phone: e.target.value })}
                    placeholder="+66-2-123-4567"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPartnerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  {language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{language === 'my' ? 'သိမ်းဆည်းမည်' : 'Save Partner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sender Passport Preview Modal */}
      {showPassportPreviewModal && senderPassportAttachment && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setShowPassportPreviewModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {language === 'my' ? 'ငွေလွှဲသူ၏ Passport ပူးတွဲစာရွက်စာတမ်း' : "Overseas Sender's Passport"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {senderPassportAttachmentName || 'Sender_Passport'} • {senderPassportAttachmentSize || ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={senderPassportAttachment}
                  target="_blank"
                  rel="noreferrer"
                  download={senderPassportAttachmentName || 'passport'}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center space-x-1"
                  title="Open in new window / Download"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowPassportPreviewModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-950/70">
              {senderPassportAttachment.startsWith('data:image') || senderPassportAttachmentType?.startsWith('image/') || senderPassportAttachment.match(/\.(jpeg|jpg|png|webp)/i) ? (
                <img 
                  src={senderPassportAttachment} 
                  alt="Sender Passport Preview" 
                  className="max-h-[72vh] max-w-full rounded-lg object-contain shadow-md border border-slate-800" 
                />
              ) : (
                <div className="text-center p-8 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">
                      {senderPassportAttachmentName || 'Passport Document'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {language === 'my' 
                        ? 'ဤစာရွက်စာတမ်းကို ကြည့်ရှု/ဒေါင်းလုဒ်လုပ်ရန် အောက်ပါခလုတ်ကို နှိပ်ပါ' 
                        : 'Click below to view or download this passport document'}
                    </p>
                  </div>
                  <a
                    href={senderPassportAttachment}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-lg"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{language === 'my' ? 'ဖိုင်အပြည့်အစုံ ဖွင့်ကြည့်မည်' : 'Open Document in New Tab'}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{language === 'my' ? 'Supabase Storage / Database တွင် သိမ်းဆည်းရန် အသင့်' : 'Ready for Supabase Storage & Database'}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPassportPreviewModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition-colors"
              >
                {language === 'my' ? 'ပိတ်မည်' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Lightbox Modal for NRC Front & Back */}
      {lightboxDoc?.isOpen && (
        <DocumentLightboxModal
          isOpen={lightboxDoc.isOpen}
          onClose={() => setLightboxDoc(null)}
          title={lightboxDoc.title}
          documentUrl={lightboxDoc.url}
          documentName={lightboxDoc.name}
          documentType={lightboxDoc.type}
          documentSize={lightboxDoc.size}
          nrcOrPassportNumber={lightboxDoc.idNumber}
          senderName={senderName}
          language={language}
        />
      )}
    </div>
  );
};
