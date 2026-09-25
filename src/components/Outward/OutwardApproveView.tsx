import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  X,
  PauseCircle, 
  Printer, 
  Eye, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Filter, 
  ArrowRight, 
  Clock, 
  Building2,
  Edit3,
  FileText,
  FileCheck,
  ExternalLink,
  Download,
  Paperclip,
  Upload,
  AlertCircle,
  Maximize2,
  Trash2,
  Sparkles,
  Receipt,
  RefreshCw,
  Lock,
  DollarSign,
  Send,
  SendHorizontal
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction } from '../../types';
import { VoucherModal } from '../VoucherModal';
import { EditOutwardModal } from './EditOutwardModal';
import { formatToDDMMYYYY } from '../Common/DobDatePicker';
import { DocumentLightboxModal } from '../Common/DocumentLightboxModal';
import { 
  createSampleMyanmarNrcSvg, 
  createSampleMyanmarNrcBackSvg,
  createSampleMyanmarPassportSvg,
  createSampleDepositReceiptSvg
} from '../../lib/sampleDocuments';
import { extractNrcInfoFromUpload, scanNrcWithAi } from '../../lib/nrcOcrParser';
import { readFileAsOptimizedDataUrl } from '../../lib/imageCompressor';

export interface OutwardApproveViewProps {
  initialTxId?: string | null;
  onClearInitialTxId?: () => void;
}

export const OutwardApproveView: React.FC<OutwardApproveViewProps> = ({
  initialTxId,
  onClearInitialTxId
}) => {
  const { 
    db, 
    currentUser,
    language, 
    t, 
    approveTransaction, 
    sendOutwardToInward,
    rejectTransaction, 
    holdTransaction, 
    updateTransaction,
    isSyncingTurso,
    syncTursoBidirectional,
    activeBranchId,
    setActiveBranchId,
    activeCountryCode
  } = useRemittance();
  
  const isAdmin = currentUser?.role === 'ADMIN';
  
  // Login Form Scope: The country and branch selected/assigned at logon
  const userLoginCountry = activeCountryCode || currentUser?.countryCode || 'MM';
  const userLoginBranch = activeBranchId || currentUser?.branchId || 'BR-001';

  const [filterStatus, setFilterStatus] = useState<string>('PENDING_APPROVAL');
  // Country Admin defaults to 'ALL' (can view all), while regular operators (Checker/Maker) are restricted to their login scope
  const [selectedCountry, setSelectedCountry] = useState<string>(() => (isAdmin ? 'ALL' : userLoginCountry));
  const [selectedBranch, setSelectedBranch] = useState<string>(() => (isAdmin ? 'ALL' : userLoginBranch));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<RemittanceTransaction | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Sync filter when user context changes
  useEffect(() => {
    if (!isAdmin) {
      setSelectedCountry(userLoginCountry);
      setSelectedBranch(userLoginBranch);
    }
  }, [isAdmin, userLoginCountry, userLoginBranch]);

  useEffect(() => {
    if (initialTxId) {
      const tx = db.transactions.find(t => t.id === initialTxId && t.type === 'OUTWARD');
      if (tx) {
        if (isAdmin) {
          setSelectedBranch('ALL');
          setSelectedCountry('ALL');
        }
        setFilterStatus(tx.status || 'PENDING_APPROVAL');
        setSearchQuery(tx.transactionNo);
        setSelectedTx(tx);
        setApprovalNote('Verified all sender/receiver compliance details and financial records.');
        setShowReviewModal(true);
        if (onClearInitialTxId) {
          onClearInitialTxId();
        }
      }
    }
  }, [initialTxId, db.transactions, onClearInitialTxId, isAdmin]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherTx, setVoucherTx] = useState<RemittanceTransaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState<RemittanceTransaction | null>(null);
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
  const [uploadFeedback, setUploadFeedback] = useState<{ message: string; type?: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [dispatchSuccessModal, setDispatchSuccessModal] = useState<{
    show: boolean;
    outwardNo: string;
    inwardNo: string;
    mtcn: string;
    destBranchId: string;
    destBranchName: string;
    sendingBranchName: string;
    amount: number;
    currency: string;
    receiverName: string;
  } | null>(null);

  const outwardTxs = db.transactions.filter(t => t.type === 'OUTWARD');

  // Location filter applied first so status tab counts match the selected country/branch
  // Non-Admin: strictly show only data belonging to their login country & branch
  // Country Admin: can see all data ('ALL') or filter by specific country & branch
  const locationFilteredTxs = outwardTxs.filter(tx => {
    const txSendingBranchId = tx.sendingBranchId || tx.branchId;
    const branch = db.branches.find(b => b.id === txSendingBranchId);
    const txCountry = branch?.countryCode || tx.senderCountryCode || (tx as any).from_country;

    if (!isAdmin) {
      // Non-Admin Checker/Maker: strictly match logged in country & branch
      const matchBranch = txSendingBranchId === userLoginBranch || tx.branchId === userLoginBranch;
      const matchCountry = txCountry === userLoginCountry || 
        tx.senderCountryCode === userLoginCountry || 
        (tx as any).from_country === userLoginCountry;
      return matchBranch && matchCountry;
    }

    // Country Admin Role: Can view all or filter
    if (selectedCountry !== 'ALL') {
      const match = txCountry === selectedCountry || 
        tx.senderCountryCode === selectedCountry || 
        tx.receiverCountryCode === selectedCountry ||
        (tx as any).from_country === selectedCountry;
      if (!match) return false;
    }

    // Branch Filter
    if (selectedBranch !== 'ALL' && txSendingBranchId !== selectedBranch && tx.branchId !== selectedBranch) {
      return false;
    }
    return true;
  });

  const pendingCount = locationFilteredTxs.filter(t => t.status === 'PENDING_APPROVAL').length;
  const approvedCount = locationFilteredTxs.filter(t => t.status === 'APPROVED' || t.status === 'APPROVED_AND_SENT' || t.status === 'APPROVED_AND_PAID_OUT' || t.status === 'PAID_OUT').length;
  const allCount = locationFilteredTxs.length;

  const filteredTxs = locationFilteredTxs.filter(tx => {
    if (filterStatus === 'APPROVED') {
      if (tx.status !== 'APPROVED' && tx.status !== 'APPROVED_AND_SENT' && tx.status !== 'APPROVED_AND_PAID_OUT' && tx.status !== 'PAID_OUT') {
        return false;
      }
    } else if (filterStatus !== 'ALL' && tx.status !== filterStatus) {
      return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tx.transactionNo.toLowerCase().includes(q) ||
        tx.mtcn.toLowerCase().includes(q) ||
        tx.senderName.toLowerCase().includes(q) ||
        tx.receiverName.toLowerCase().includes(q) ||
        tx.senderNrc.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenReview = (tx: RemittanceTransaction) => {
    setSelectedTx(tx);
    setApprovalNote('Verified all sender/receiver compliance details and financial records.');
    setShowReviewModal(true);
  };

  const handleOpenEdit = (tx: RemittanceTransaction) => {
    if (!isAdmin) return;
    setEditingTx(tx);
    setShowEditModal(true);
  };

  const handleDirectApproveFromEdit = async (updatedTx: RemittanceTransaction) => {
    const success = await approveTransaction(updatedTx.id, 'Approved immediately after Review & Edit');
    if (success) {
      confetti({ particleCount: 70, spread: 60 });
      setVoucherTx(updatedTx);
      setShowVoucherModal(true);
    }
  };

  const handleApprove = async () => {
    if (!selectedTx) return;
    setIsSending(true);
    try {
      const targetBranchId = selectedTx.payoutBranchId || (selectedTx.sendingBranchId === 'BR-001' ? 'BR-002' : 'BR-001');
      const destBranch = db.branches.find(b => b.id === targetBranchId);
      const sendBranch = db.branches.find(b => b.id === selectedTx.sendingBranchId);

      const success = await approveTransaction(selectedTx.id, approvalNote, true);
      if (success) {
        confetti({ particleCount: 80, spread: 70 });
        setShowReviewModal(false);

        const updated = db.transactions.find(t => t.id === selectedTx.id) || selectedTx;
        setDispatchSuccessModal({
          show: true,
          outwardNo: selectedTx.transactionNo,
          inwardNo: updated.linkedTransactionNo || `INW-${selectedTx.mtcn.slice(-6)}`,
          mtcn: selectedTx.mtcn,
          destBranchId: targetBranchId,
          destBranchName: destBranch ? `${destBranch.nameEn} (${destBranch.code})` : 'Receive Branch',
          sendingBranchName: sendBranch ? `${sendBranch.nameEn} (${sendBranch.code})` : 'Yangon Head Office (YGN-HQ)',
          amount: Number(selectedTx.receiveAmount || selectedTx.sendAmount || 0),
          currency: selectedTx.targetCurrency || 'MMK',
          receiverName: selectedTx.receiverName
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSendToReceiveBranch = async (tx: RemittanceTransaction) => {
    setIsSending(true);
    try {
      const res = await sendOutwardToInward(tx.id);
      if (res.success && res.inwardTx) {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        const targetBranchId = tx.payoutBranchId || (tx.sendingBranchId === 'BR-001' ? 'BR-002' : 'BR-001');
        const destBranch = db.branches.find(b => b.id === targetBranchId);
        const sendBranch = db.branches.find(b => b.id === tx.sendingBranchId);
        setDispatchSuccessModal({
          show: true,
          outwardNo: tx.transactionNo,
          inwardNo: res.inwardTx.transactionNo,
          mtcn: tx.mtcn,
          destBranchId: targetBranchId,
          destBranchName: destBranch ? `${destBranch.nameEn} (${destBranch.code})` : 'Mandalay Branch (MDY-01)',
          sendingBranchName: sendBranch ? `${sendBranch.nameEn} (${sendBranch.code})` : 'Yangon Head Office (YGN-HQ)',
          amount: Number(tx.receiveAmount || tx.sendAmount || 0),
          currency: tx.targetCurrency || 'MMK',
          receiverName: tx.receiverName
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!selectedTx) return;
    setIsSending(true);
    try {
      const targetBranchId = selectedTx.payoutBranchId || (selectedTx.sendingBranchId === 'BR-001' ? 'BR-002' : 'BR-001');
      const success = await approveTransaction(selectedTx.id, approvalNote || 'Approved and sent to receiving branch');
      if (success) {
        const res = await sendOutwardToInward(selectedTx.id, approvalNote);
        setShowReviewModal(false);
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        const destBranch = db.branches.find(b => b.id === targetBranchId);
        const sendBranch = db.branches.find(b => b.id === selectedTx.sendingBranchId);
        setDispatchSuccessModal({
          show: true,
          outwardNo: selectedTx.transactionNo,
          inwardNo: res.inwardTx?.transactionNo || 'REM-INW-AUTO',
          mtcn: selectedTx.mtcn,
          destBranchId: targetBranchId,
          destBranchName: destBranch ? `${destBranch.nameEn} (${destBranch.code})` : 'Mandalay Branch (MDY-01)',
          sendingBranchName: sendBranch ? `${sendBranch.nameEn} (${sendBranch.code})` : 'Yangon Head Office (YGN-HQ)',
          amount: Number(selectedTx.receiveAmount || selectedTx.sendAmount || 0),
          currency: selectedTx.targetCurrency || 'MMK',
          receiverName: selectedTx.receiverName
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenReject = (tx: RemittanceTransaction) => {
    setSelectedTx(tx);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedTx || !rejectionReason.trim()) return;
    await rejectTransaction(selectedTx.id, rejectionReason);
    setShowRejectModal(false);
    setShowReviewModal(false);
  };

  const handleHold = async () => {
    if (!selectedTx) return;
    await holdTransaction(selectedTx.id, approvalNote || 'Placed on hold for KYC verification.');
    setShowReviewModal(false);
  };

  const openLightbox = (doc: {
    title: string;
    url?: string;
    name?: string;
    type?: string;
    size?: string;
    idNumber?: string;
    sender?: string;
  }) => {
    if (!doc.url) return;
    setLightboxDoc({
      isOpen: true,
      ...doc
    });
  };

  const handleQuickAttach = async (type: 'nrc-front' | 'nrc-back' | 'nrc-both' | 'passport' | 'deposit') => {
    if (!selectedTx) return;
    let updated: RemittanceTransaction = { ...selectedTx };

    if (type === 'nrc-front' || type === 'nrc-both') {
      const frontUrl = createSampleMyanmarNrcSvg(
        selectedTx.senderNrc || '12/BAHANA(N)184920',
        selectedTx.senderNameMm || selectedTx.senderName,
        selectedTx.senderName,
        formatToDDMMYYYY(selectedTx.senderDateOfBirth) || '14/07/1988',
        selectedTx.senderFatherName || 'U Tin Aung'
      );
      const frontName = `NRC_Front_${selectedTx.senderName.replace(/\s+/g, '_')}_${(selectedTx.senderNrc || 'Card').replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
      updated = {
        ...updated,
        senderNrcAttachment: frontUrl,
        senderNrcAttachmentName: frontName,
        senderNrcAttachmentType: 'image/svg+xml',
        senderNrcAttachmentSize: '18 KB',
        senderNrcFrontAttachment: frontUrl,
        senderNrcFrontAttachmentName: frontName,
        senderNrcFrontAttachmentType: 'image/svg+xml',
        senderNrcFrontAttachmentSize: '18 KB'
      };
    }

    if (type === 'nrc-back' || type === 'nrc-both') {
      const backUrl = createSampleMyanmarNrcBackSvg(
        selectedTx.senderOccupation || 'ကုမ္ပဏီဝန်ထမ်း (Company Staff)',
        selectedTx.senderAddress || 'အမှတ် (၁၂)၊ ဗဟန်းလမ်း၊ ရန်ကုန်'
      );
      const backName = `NRC_Back_${selectedTx.senderName.replace(/\s+/g, '_')}_${(selectedTx.senderNrc || 'Card').replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
      updated = {
        ...updated,
        senderNrcBackAttachment: backUrl,
        senderNrcBackAttachmentName: backName,
        senderNrcBackAttachmentType: 'image/svg+xml',
        senderNrcBackAttachmentSize: '16 KB'
      };
    }

    if (type === 'passport') {
      const passUrl = createSampleMyanmarPassportSvg(
        selectedTx.senderPassport || 'MA-918234',
        selectedTx.senderName,
        formatToDDMMYYYY(selectedTx.senderDateOfBirth) || '14/07/1988'
      );
      const passName = `Passport_${selectedTx.senderName.replace(/\s+/g, '_')}_${selectedTx.senderPassport || 'MA918234'}.svg`;
      updated = {
        ...updated,
        senderPassportAttachment: passUrl,
        senderPassportAttachmentName: passName,
        senderPassportAttachmentType: 'image/svg+xml',
        senderPassportAttachmentSize: '24 KB',
        senderPassbookAttachment: passUrl,
        senderPassbookAttachmentName: passName,
        senderPassbookAttachmentType: 'image/svg+xml',
        senderPassbookAttachmentSize: '24 KB'
      };
    }

    if (type === 'deposit') {
      const curBranch = db.branches.find(b => b.id === selectedTx.sendingBranchId) || db.branches[0];
      const depositUrl = createSampleDepositReceiptSvg(
        selectedTx.senderName,
        selectedTx.senderNrc || '12/BAHANA(N)184920',
        `${selectedTx.sendAmount?.toLocaleString()} ${selectedTx.sourceCurrency || 'MMK'}`,
        curBranch?.nameEn || 'Yangon Main Branch',
        selectedTx.createdDate ? formatToDDMMYYYY(selectedTx.createdDate) : '07/09/2026'
      );
      const depositName = `Deposit_Receipt_${selectedTx.transactionNo || Date.now().toString().slice(-4)}.svg`;
      updated = {
        ...updated,
        proofDocumentUrl: depositUrl,
        proofDocumentName: depositName,
        proofDocumentType: 'image/svg+xml',
        proofDocumentSize: '21 KB',
        proofDocCategory: 'DEPOSIT_RECEIPT'
      };
    }

    await updateTransaction(updated, `Attached sample ${type} document in Outward Approval Queue`);
    setSelectedTx(updated);
    setUploadFeedback({
      message: language === 'my'
        ? `နမူနာ အထောက်အထားစာရွက်စာတမ်း အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ`
        : `Attached sample document successfully`,
      type: 'general'
    });
    setTimeout(() => setUploadFeedback(null), 5000);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'nrc-front' | 'nrc-back' | 'nrc' | 'passport' | 'deposit' | 'custom'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTx) return;

    readFileAsOptimizedDataUrl(file).then(async (opt) => {
      const dataUrl = opt.dataUrl;
      const sizeStr = opt.sizeStr;
      let updated: RemittanceTransaction = { ...selectedTx };

      if (type === 'nrc-front' || type === 'nrc' || type === 'nrc-back') {
        const extracted = extractNrcInfoFromUpload(file, dataUrl, db.customers);
        updated = {
          ...updated,
          senderName: extracted.nameEn || updated.senderName,
          senderNameMm: extracted.nameMm || updated.senderNameMm,
          senderNrc: extracted.nrcNumber || updated.senderNrc,
          senderFatherName: extracted.fatherName || updated.senderFatherName,
          senderDateOfBirth: extracted.dob || updated.senderDateOfBirth,
          senderAddress: extracted.address || updated.senderAddress,
          senderOccupation: extracted.occupation || updated.senderOccupation,
          ...(type === 'nrc-back' ? {
            senderNrcBackAttachment: dataUrl,
            senderNrcBackAttachmentName: opt.name,
            senderNrcBackAttachmentType: opt.type,
            senderNrcBackAttachmentSize: sizeStr
          } : {
            senderNrcAttachment: dataUrl,
            senderNrcAttachmentName: opt.name,
            senderNrcAttachmentType: opt.type,
            senderNrcAttachmentSize: sizeStr,
            senderNrcFrontAttachment: dataUrl,
            senderNrcFrontAttachmentName: opt.name,
            senderNrcFrontAttachmentType: opt.type,
            senderNrcFrontAttachmentSize: sizeStr
          })
        };
        await updateTransaction(updated, `Uploaded NRC: Auto-extracted ${extracted.nameEn || updated.senderName} (${extracted.nrcNumber || updated.senderNrc})`);
        setSelectedTx(updated);
        setUploadFeedback({
          message: language === 'my'
            ? `✨ မှတ်ပုံတင် ဖိုင်တင်သွင်းပြီးသည်နှင့် အမည် (${extracted.nameEn || extracted.nameMm || updated.senderName}) နှင့် မှတ်ပုံတင်နံပတ် (${extracted.nrcNumber || updated.senderNrc}) အား Auto တန်းဖတ်ရှုပြီး မှတ်တမ်းတွင် ဖြည့်သွင်းပြင်ဆင်လိုက်ပါပြီ`
            : `✨ Auto-extracted Name (${extracted.nameEn || updated.senderName}) & NRC (${extracted.nrcNumber || updated.senderNrc}) upon upload!`,
          type: 'general'
        });

        // Asynchronous AI Vision OCR
        scanNrcWithAi(file, dataUrl, db.customers).then(async (aiExtracted) => {
          if (selectedTx) {
            const aiUpdated: RemittanceTransaction = {
              ...selectedTx,
              senderName: aiExtracted.nameEn || selectedTx.senderName,
              senderNameMm: aiExtracted.nameMm || selectedTx.senderNameMm,
              senderNrc: aiExtracted.nrcNumber || selectedTx.senderNrc,
              senderFatherName: aiExtracted.fatherName || selectedTx.senderFatherName,
              senderDateOfBirth: aiExtracted.dob || selectedTx.senderDateOfBirth,
              senderAddress: aiExtracted.address || selectedTx.senderAddress,
              senderOccupation: aiExtracted.occupation || selectedTx.senderOccupation,
            };
            await updateTransaction(aiUpdated, `AI OCR Refinement: ${aiExtracted.nameEn || aiUpdated.senderName} (${aiExtracted.nrcNumber || aiUpdated.senderNrc})`);
            setSelectedTx(aiUpdated);
          }
        }).catch(() => {});

        setTimeout(() => setUploadFeedback(null), 7000);
        return;
      } else if (type === 'deposit' || type === 'custom') {
        updated = {
          ...updated,
          proofDocumentUrl: dataUrl,
          proofDocumentName: opt.name,
          proofDocumentType: opt.type,
          proofDocumentSize: sizeStr,
          proofDocCategory: type === 'deposit' ? 'DEPOSIT_RECEIPT' : 'OTHER'
        };
      }

      await updateTransaction(updated, `Uploaded ${type} file: ${opt.name}`);
      setSelectedTx(updated);
      setUploadFeedback({
        message: language === 'my'
          ? `ပုံအသစ် အောင်မြင်စွာ အစားထိုးထည့်သွင်းပြီးပါပြီ (${opt.name})`
          : `Successfully replaced old picture with new file (${opt.name})`,
        type: 'general'
      });
      setTimeout(() => setUploadFeedback(null), 6000);
    });
    e.target.value = '';
  };

  const handleRemoveAttachment = async (
    type: 'nrc-front' | 'nrc-back' | 'nrc' | 'passport' | 'deposit'
  ) => {
    if (!selectedTx) return;
    let updated: RemittanceTransaction = { ...selectedTx };

    if (type === 'nrc-front' || type === 'nrc') {
      updated = {
        ...updated,
        senderNrcAttachment: undefined,
        senderNrcAttachmentName: undefined,
        senderNrcAttachmentType: undefined,
        senderNrcAttachmentSize: undefined,
        senderNrcFrontAttachment: undefined,
        senderNrcFrontAttachmentName: undefined,
        senderNrcFrontAttachmentType: undefined,
        senderNrcFrontAttachmentSize: undefined
      };
    } else if (type === 'nrc-back') {
      updated = {
        ...updated,
        senderNrcBackAttachment: undefined,
        senderNrcBackAttachmentName: undefined,
        senderNrcBackAttachmentType: undefined,
        senderNrcBackAttachmentSize: undefined
      };
    } else if (type === 'passport') {
      updated = {
        ...updated,
        senderPassportAttachment: undefined,
        senderPassportAttachmentName: undefined,
        senderPassportAttachmentType: undefined,
        senderPassportAttachmentSize: undefined,
        senderPassbookAttachment: undefined,
        senderPassbookAttachmentName: undefined,
        senderPassbookAttachmentType: undefined,
        senderPassbookAttachmentSize: undefined
      };
    } else if (type === 'deposit') {
      updated = {
        ...updated,
        proofDocumentUrl: undefined,
        proofDocumentName: undefined,
        proofDocumentType: undefined,
        proofDocumentSize: undefined,
        proofDocCategory: undefined
      };
    }

    await updateTransaction(updated, `Removed ${type} attachment`);
    setSelectedTx(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.outwardApproveTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t.approveListSubtitle}
          </p>
        </div>

        {/* Filter Tabs & Cloud Sync */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('PENDING_APPROVAL')}
              className={`px-3 py-1.5 rounded-lg transition-all text-black font-bold cursor-pointer ${
                filterStatus === 'PENDING_APPROVAL' ? 'bg-[#A2D9CE] border border-slate-700 shadow-xs' : 'hover:bg-[#C1ECE3]'
              }`}
            >
              {language === 'my' ? 'စိစစ်ရန်ကျန်' : 'Pending'} ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED')}
              className={`px-3 py-1.5 rounded-lg transition-all text-black font-bold cursor-pointer ${
                filterStatus === 'APPROVED' ? 'bg-[#A2D9CE] border border-slate-700 shadow-xs' : 'hover:bg-[#C1ECE3]'
              }`}
            >
              {language === 'my' ? 'အတည်ပြုပြီး လွှဲပို့ပြီး (Approved and Sent)' : 'Approved and Sent'} ({approvedCount})
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all text-black font-bold cursor-pointer ${
                filterStatus === 'ALL' ? 'bg-[#A2D9CE] border border-slate-700 shadow-xs' : 'hover:bg-[#C1ECE3]'
              }`}
            >
              {t.all} ({allCount})
            </button>
          </div>

          {/* Turso Cloud Live Sync Button */}
          <button
            onClick={() => syncTursoBidirectional()}
            disabled={isSyncingTurso}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold shadow-xs"
            title={language === 'my' ? 'Turso Cloud မှ စာရင်းအသစ်များ ရယူရန် / Refresh လုပ်ရန် နှိပ်ပါ' : 'Fetch latest transactions from Turso Cloud'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTurso ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            <span>{isSyncingTurso ? (language === 'my' ? 'Sync လုပ်နေသည်...' : 'Syncing...') : (language === 'my' ? 'Cloud Sync' : 'Sync Cloud')}</span>
          </button>
        </div>
      </div>

      {/* Search & Location Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'my' ? 'MTCN၊ အမှတ်စဉ်၊ ပို့သူ/လက်ခံသူ အမည်ဖြင့် ရှာရန်...' : 'Search by MTCN, Tx No, Sender/Receiver...'}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Country Admin Role Controls vs Regular User Scoped View */}
          {isAdmin ? (
            <>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-300 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-[11px]">
                  {language === 'my' ? '👑 Country Admin (အကုန်ကြည့်ရှုခွင့်ရှိ)' : '👑 Country Admin (Full Access)'}
                </span>
              </div>

              {/* Country Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1">
                <span className="text-[11px] text-slate-400 font-medium">
                  {language === 'my' ? 'နိုင်ငံ:' : 'Country:'}
                </span>
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
                  className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-white">🌐 {language === 'my' ? 'နိုင်ငံအားလုံး' : 'All Countries'}</option>
                  {db.countries.map(c => (
                    <option key={c.id} value={c.code} className="bg-slate-900 text-white">
                      {c.flagEmoji} {c.nameEn} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1">
                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium">
                  {language === 'my' ? 'ဘဏ်ခွဲ:' : 'Branch:'}
                </span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[180px] truncate"
                >
                  <option value="ALL" className="bg-slate-900 text-white">{language === 'my' ? 'ဘဏ်ခွဲအားလုံး' : 'All Branches'}</option>
                  {db.branches
                    .filter(b => selectedCountry === 'ALL' || b.countryCode === selectedCountry)
                    .map(b => (
                      <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                        {b.code} - {b.nameEn}
                      </option>
                    ))}
                </select>
              </div>
            </>
          ) : (
            /* Regular Operator (Checker/Maker): Locked to Login Country and Branch */
            <div className="flex items-center space-x-2 bg-amber-950/60 border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-400 text-[11px]">{language === 'my' ? 'လော့ဂ်အင်ဘဏ်ခွဲ:' : 'Login Branch:'}</span>
              <span className="text-white font-semibold flex items-center gap-1.5">
                <span>{db.countries.find(c => c.code === userLoginCountry)?.flagEmoji || '🌐'}</span>
                <span>{db.branches.find(b => b.id === userLoginBranch)?.nameEn || userLoginBranch} ({db.branches.find(b => b.id === userLoginBranch)?.code || userLoginBranch})</span>
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5 font-medium">
                {language === 'my' ? 'Login Scope သီးသန့်' : 'Login Scope Only'}
              </span>
            </div>
          )}

          {((isAdmin && (selectedCountry !== 'ALL' || selectedBranch !== 'ALL')) || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                if (isAdmin) {
                  setSelectedCountry('ALL');
                  setSelectedBranch('ALL');
                }
                setSearchQuery('');
              }}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium px-1 cursor-pointer"
            >
              {language === 'my' ? 'အားလုံးပြမည် (Reset)' : 'Reset All'}
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 self-end md:self-center font-mono shrink-0">
          <span className="text-amber-400 font-bold">{filteredTxs.length}</span> {language === 'my' ? 'ခု တွေ့ရှိပါသည်' : 'transactions found'}
        </div>
      </div>

      {/* Transaction List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">{t.transactionNo} / MTCN</th>
                <th className="px-4 py-3">{t.senderName}</th>
                <th className="px-4 py-3">{t.receiverName}</th>
                <th className="px-4 py-3">{t.amount} & Exchange</th>
                <th className="px-4 py-3">{t.creator}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-white">{tx.transactionNo}</div>
                      <div className="flex items-center gap-1.5 my-0.5">
                        <span className="font-mono text-amber-400 text-[11px]">MTCN: {tx.mtcn}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          tx.scope === 'DOMESTIC' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}>
                          {tx.scope || 'INTERNATIONAL'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{formatToDDMMYYYY(tx.createdDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-200">{tx.senderName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{tx.senderNrc}</div>

                      {/* Attached NRC or Passport Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {tx.senderNrcAttachment ? (
                          <button
                            type="button"
                            onClick={() => openLightbox({
                              title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ မှတ်ပုံတင် (NRC)' : "Sender's National Registration Card (NRC)",
                              url: tx.senderNrcAttachment,
                              name: tx.senderNrcAttachmentName || 'Sender_NRC.svg',
                              type: tx.senderNrcAttachmentType || 'image/svg+xml',
                              size: tx.senderNrcAttachmentSize || '',
                              idNumber: tx.senderNrc,
                              sender: tx.senderName
                            })}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold transition-all cursor-pointer group hover:scale-[1.02]"
                            title={language === 'my' ? 'ပူးတွဲမှတ်ပုံတင် ကြည့်မည်' : 'View attached NRC Card'}
                          >
                            <FileText className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                            <span>NRC Attached</span>
                            <Eye className="w-2.5 h-2.5 text-emerald-400/80 ml-0.5 shrink-0" />
                          </button>
                        ) : null}

                        {(tx.senderPassportAttachment || tx.senderPassbookAttachment) ? (
                          <button
                            type="button"
                            onClick={() => openLightbox({
                              title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ နိုင်ငံကူးလက်မှတ် (Passport)' : "Sender's Passport Document",
                              url: tx.senderPassportAttachment || tx.senderPassbookAttachment,
                              name: tx.senderPassportAttachmentName || tx.senderPassbookAttachmentName || 'Sender_Passport.svg',
                              type: tx.senderPassportAttachmentType || tx.senderPassbookAttachmentType || 'image/svg+xml',
                              size: tx.senderPassportAttachmentSize || tx.senderPassbookAttachmentSize || '',
                              idNumber: tx.senderPassport,
                              sender: tx.senderName
                            })}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[10px] font-semibold transition-all cursor-pointer group hover:scale-[1.02]"
                            title={language === 'my' ? 'ပူးတွဲနိုင်ငံကူးလက်မှတ် ကြည့်မည်' : 'View attached Passport Document'}
                          >
                            <FileCheck className="w-3 h-3 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                            <span>Passport Attached</span>
                            <Eye className="w-2.5 h-2.5 text-sky-400/80 ml-0.5 shrink-0" />
                          </button>
                        ) : null}

                        {!tx.senderNrcAttachment && !tx.senderPassportAttachment && !tx.senderPassbookAttachment && (
                          <span className="inline-flex items-center space-x-1 text-[10px] text-slate-500 italic py-0.5">
                            <AlertCircle className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                            <span>No doc attached</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-200">{tx.receiverName}</div>
                      <div className="text-[11px] text-slate-400">Destination: {tx.receiverCountryCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-emerald-400">
                        {Number(tx.sendAmount || 0).toLocaleString()} {tx.sourceCurrency}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        ➔ {Number(tx.receiveAmount || 0).toLocaleString()} {tx.targetCurrency}
                      </div>
                      <div className="text-[10px] font-mono mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Fee: {Number(tx.serviceFee || 0).toLocaleString()} {tx.sourceCurrency}
                        </span>
                        {Number(tx.commissionFee || 0) > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            Comm: {Number(tx.commissionFee || 0).toLocaleString()} {tx.sourceCurrency}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-300 font-medium">{tx.creatorName}</div>
                      <div className="flex items-center space-x-1 text-[10px] text-sky-400 font-mono mt-0.5">
                        <Building2 className="w-3 h-3 text-sky-400 shrink-0" />
                        <span>{db.branches.find(b => b.id === tx.sendingBranchId)?.nameEn || tx.sendingBranchId || 'Yangon HQ'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{tx.purposeName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.status === 'APPROVED_AND_SENT' || (tx.status === 'APPROVED' && tx.isSentToDestination)
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : tx.status === 'APPROVED_AND_PAID_OUT' || tx.status === 'PAID_OUT'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                          : tx.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : tx.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          : tx.status === 'ON_HOLD'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {tx.status === 'APPROVED_AND_SENT' || (tx.status === 'APPROVED' && tx.isSentToDestination)
                          ? (language === 'my' ? 'Approved and Sent' : 'Approved and Sent')
                          : tx.status === 'APPROVED_AND_PAID_OUT' || tx.status === 'PAID_OUT'
                          ? (language === 'my' ? 'Approved and Paid Out' : 'Approved and Paid Out')
                          : tx.status === 'APPROVED'
                          ? (language === 'my' ? 'Approved and Sent' : 'Approved and Sent')
                          : tx.status === 'PENDING_APPROVAL'
                          ? (language === 'my' ? 'Pending Approval' : 'Pending Approval')
                          : tx.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {tx.status === 'PENDING_APPROVAL' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReview(tx)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all flex items-center space-x-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                            title={language === 'my' ? 'စိစစ် & အတည်ပြုမည်' : 'Review & Approve'}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>{language === 'my' ? 'စိစစ် & အတည်ပြု' : 'Review & Approve'}</span>
                          </button>
                        ) : tx.status === 'APPROVED' && !tx.isSentToDestination ? (
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleSendToReceiveBranch(tx)}
                              disabled={isSending}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-950/40 transition-all flex items-center space-x-1.5 cursor-pointer hover:scale-[1.02]"
                              title={language === 'my' ? 'လက်ခံမည့်ဘဏ်ခွဲ Inward သို့ ငွေလွှဲပေးပို့မည်' : 'Send to Receiving Branch Inward'}
                            >
                              <SendHorizontal className="w-3.5 h-3.5 text-sky-100" />
                              <span>{language === 'my' ? 'Send (ငွေလွှဲပို့)' : 'Send to Branch'}</span>
                            </button>
                            <button
                              onClick={() => {
                                setVoucherTx(tx);
                                setShowVoucherModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title={t.printVoucher}
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            {(tx.isSentToDestination || tx.status === 'APPROVED_AND_SENT' || tx.status === 'APPROVED_AND_PAID_OUT') && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold ${
                                tx.status === 'APPROVED_AND_PAID_OUT' || tx.status === 'PAID_OUT'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                              }`}>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                <span>{tx.status === 'APPROVED_AND_PAID_OUT' || tx.status === 'PAID_OUT' ? (language === 'my' ? 'ငွေထုတ်ပြီး' : 'Paid Out') : (language === 'my' ? 'Inward ပို့ပြီး' : 'Sent to Inward')}</span>
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setVoucherTx(tx);
                                setShowVoucherModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title={t.printVoucher}
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checker Review Modal */}
      {showReviewModal && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header with Title, Transaction Number & Top Close Button */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/60 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{language === 'my' ? 'ငွေလွှဲပို့မှု စိစစ်အတည်ပြုခြင်း (Checker Review)' : 'Outward Remittance Approval Review'}</span>
                    <span className="font-mono text-xs text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                      {selectedTx.transactionNo}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {language === 'my' ? 'ငွေလွှဲစိစစ်ချက်နှင့် အထောက်အထားများ အပြည့်အစုံ ကြည့်ရှုရန်' : 'View all transaction details, KYC compliance checks & attachments'}
                  </p>
                </div>
              </div>

              {/* Close Button at Top */}
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                title={language === 'my' ? 'ပိတ်မည် (Close)' : 'Close'}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body with Top-Down Scrollbar to view all information */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-200 custom-scrollbar scroll-smooth">
              {/* Inter-Branch Remittance Routing Card */}
              {(selectedTx.scope === 'DOMESTIC' || !!selectedTx.payoutBranchId) && (
                <div className="bg-gradient-to-r from-sky-950/50 via-indigo-950/40 to-slate-900 p-4 rounded-xl border border-sky-500/40 space-y-3 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-sky-400" />
                      {language === 'my' 
                        ? `${selectedTx.scope === 'INTERNATIONAL' ? 'နိုင်ငံတကာ' : 'ပြည်တွင်း'} ဘဏ်ခွဲအချင်းချင်း ငွေလွှဲပေးပို့မှု (${selectedTx.scope === 'INTERNATIONAL' ? 'International' : 'Domestic'} Branch Dispatch)`
                        : `${selectedTx.scope === 'INTERNATIONAL' ? 'International' : 'Domestic'} Branch Remittance Dispatch`}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      selectedTx.status === 'APPROVED_AND_PAID_OUT' || selectedTx.status === 'PAID_OUT'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : selectedTx.status === 'APPROVED_AND_SENT' || selectedTx.isSentToDestination
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {selectedTx.status === 'APPROVED_AND_PAID_OUT' || selectedTx.status === 'PAID_OUT'
                        ? (language === 'my' ? 'အတည်ပြုပြီး ငွေထုတ်ပေးပြီး (Approved and Paid Out)' : 'Approved and Paid Out')
                        : selectedTx.status === 'APPROVED_AND_SENT' || selectedTx.isSentToDestination
                        ? (language === 'my' ? 'အတည်ပြုပြီး လွှဲပို့ပြီး (Approved and Sent)' : 'Approved and Sent')
                        : (language === 'my' ? 'အတည်ပြုပြီး လွှဲပို့ရန် အသင့်ဖြစ်သည်' : 'Ready to Dispatch upon Approve')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px] font-medium">{language === 'my' ? 'ငွေလွှဲပေးပို့သည့် ဘဏ်ခွဲ (Sending Branch)' : 'Sending Branch'}:</span>
                      <strong className="text-white text-xs block mt-0.5">
                        {db.branches.find(b => b.id === selectedTx.sendingBranchId)?.nameEn || selectedTx.sendingBranchId || 'Yangon Head Office'}
                      </strong>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Code: {db.branches.find(b => b.id === selectedTx.sendingBranchId)?.code || 'YGN-01'}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-amber-500/40 shadow-inner">
                      <span className="text-amber-400 block text-[11px] font-medium flex items-center justify-between">
                        <span>{language === 'my' ? 'ငွေထုတ်ယူမည့် ဘဏ်ခွဲ (Receiving Branch / Inward)' : 'Destination / Receiving Branch'}:</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Auto Inward</span>
                      </span>
                      <strong className="text-amber-300 text-xs block mt-0.5">
                        {db.branches.find(b => b.id === (selectedTx.payoutBranchId || 'BR-002'))?.nameEn || 'Mandalay Branch'}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Code: {db.branches.find(b => b.id === (selectedTx.payoutBranchId || 'BR-002'))?.code || 'MDY-01'} ({db.branches.find(b => b.id === (selectedTx.payoutBranchId || 'BR-002'))?.city || 'Mandalay'})
                      </span>
                    </div>
                  </div>

                  {selectedTx.isSentToDestination && selectedTx.linkedTransactionNo && (
                    <div className="text-[11px] text-sky-300 bg-sky-950/70 p-2.5 rounded-lg border border-sky-800/60 flex items-center justify-between">
                      <span>{language === 'my' ? 'အလိုအလျောက် ဖွင့်လှစ်ပြီးသော Inward Claim နံပါတ်:' : 'Auto-Created Inward Claim No:'} <strong className="font-mono text-emerald-400">{selectedTx.linkedTransactionNo}</strong></span>
                      <span className="text-[10px] text-slate-400 font-mono">MTCN: {selectedTx.mtcn}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick overview grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block font-medium">{t.senderName}:</span>
                  <strong className="text-slate-200 text-sm">{selectedTx.senderName}</strong>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedTx.senderNrc}</p>
                  <p className="text-[11px] text-slate-400">{selectedTx.senderPhone}</p>
                  {selectedTx.senderDateOfBirth && (
                    <p className="text-[11px] text-amber-400 font-mono flex items-center gap-1 mt-0.5">
                      <span className="text-slate-500">DOB:</span>
                      <span>{formatToDDMMYYYY(selectedTx.senderDateOfBirth)}</span>
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">{t.receiverName}:</span>
                  <strong className="text-slate-200 text-sm">{selectedTx.receiverName}</strong>
                  <p className="text-[11px] text-slate-400">Destination: {selectedTx.receiverCountryCode}</p>
                  <p className="text-[11px] text-slate-400">{selectedTx.receiverPhone}</p>
                  {selectedTx.receiverAddress && (
                    <p className="text-[11px] text-slate-400 truncate">{selectedTx.receiverAddress}</p>
                  )}
                </div>
              </div>

              {/* Financial & Fee Breakdown Card: Explicitly displaying Service Fee and Commission Fee */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-white">
                      {language === 'my' 
                        ? 'ငွေလွှဲပမာဏ၊ ဝန်ဆောင်ခနှင့် ကော်မရှင်ခ တွက်ချက်မှု (Financial Breakdown & Fees)' 
                        : 'Financial Breakdown & Fee Details'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                    Rate: 1 {selectedTx.sourceCurrency} = {selectedTx.exchangeRate} {selectedTx.targetCurrency}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* Send Amount */}
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[11px] font-medium">{t.sendAmount}:</span>
                    <strong className="text-emerald-400 text-sm font-mono block mt-0.5">
                      {Number(selectedTx.sendAmount || 0).toLocaleString()} {selectedTx.sourceCurrency}
                    </strong>
                    {selectedTx.isUsdBase && selectedTx.usdAmount && (
                      <span className="text-[10px] text-amber-400 font-mono block mt-0.5">
                        ≈ ${Number(selectedTx.usdAmount).toLocaleString()} USD
                      </span>
                    )}
                  </div>

                  {/* Receive Amount */}
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[11px] font-medium">{t.receiveAmount}:</span>
                    <strong className="text-sky-400 text-sm font-mono block mt-0.5">
                      {Number(selectedTx.receiveAmount || 0).toLocaleString()} {selectedTx.targetCurrency}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                      Country: {selectedTx.receiverCountryCode}
                    </span>
                  </div>

                  {/* Service Fee */}
                  <div className="bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/30">
                    <span className="text-amber-300 block text-[11px] font-semibold">
                      {language === 'my' ? 'ဝန်ဆောင်ခ (Service Fee):' : 'Service Fee:'}
                    </span>
                    <strong className="text-amber-400 text-sm font-mono block mt-0.5">
                      {Number(selectedTx.serviceFee || 0).toLocaleString()} {selectedTx.sourceCurrency || 'MMK'}
                    </strong>
                    {selectedTx.usdServiceFee ? (
                      <span className="text-[10px] text-amber-300/80 font-mono block mt-0.5">
                        (${Number(selectedTx.usdServiceFee).toLocaleString()} USD)
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-500/70 font-mono block mt-0.5">Service Charge</span>
                    )}
                  </div>

                  {/* Commission Fee */}
                  <div className="bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-500/30">
                    <span className="text-indigo-300 block text-[11px] font-semibold">
                      {language === 'my' ? 'ကော်မရှင်ခ (Commission Fee):' : 'Commission Fee:'}
                    </span>
                    <strong className="text-indigo-400 text-sm font-mono block mt-0.5">
                      {Number(selectedTx.commissionFee || 0).toLocaleString()} {selectedTx.sourceCurrency || 'MMK'}
                    </strong>
                    <span className="text-[10px] text-indigo-400/70 font-mono block mt-0.5">Agent / Partner Fee</span>
                  </div>
                </div>

                {/* Total Payable Summary Banner */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-inner">
                  <div>
                    <span className="text-xs text-slate-300 font-medium block">
                      {language === 'my' ? 'ငွေလွှဲပေးပို့သူထံမှ ကောက်ခံရရှိသည့် စုစုပေါင်း ကျသင့်ငွေ (Total Payable Amount):' : 'Total Payable Amount from Remitter:'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {language === 'my' ? '(လွှဲပို့ငွေ + ဝန်ဆောင်ခ + ကော်မရှင်ခ)' : '(Send Amount + Service Fee + Commission Fee)'}
                    </span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {Number(
                        selectedTx.totalPayableAmount || 
                        ((selectedTx.sendAmount || 0) + (selectedTx.serviceFee || 0) + (selectedTx.commissionFee || 0))
                      ).toLocaleString()} {selectedTx.sourceCurrency || 'MMK'}
                    </span>
                  </div>
                </div>
              </div>

            {/* Sender Identity Document Verification (NRC Front & Back, Passport, Deposit Slip) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-xs font-bold text-white">
                    {language === 'my' 
                      ? 'ငွေလွှဲစိစစ်ရန် မူရင်း မှတ်ပုံတင် (NRC) / နိုင်ငံကူးလက်မှတ် / ငွေသွင်းပြေစာ ပူးတွဲဖိုင်များ' 
                      : "Sender Identity & Compliance Documents Verification"}
                  </span>
                </div>
                
                {/* Status indicator */}
                <div className="flex items-center space-x-2">
                  {(selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment) && selectedTx.senderNrcBackAttachment ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      ✓ {language === 'my' ? 'NRC ရှေ့/နောက် ပြည့်စုံစွာ ပူးတွဲပြီး' : 'NRC Front & Back Attached'}
                    </span>
                  ) : (selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      ✓ {language === 'my' ? 'NRC အရှေ့ခြမ်း ပူးတွဲပြီး' : 'NRC Front Attached'}
                    </span>
                  ) : (selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                      ✓ {language === 'my' ? 'Passport ပူးတွဲပြီး' : 'Passport Attached'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                      ⚠ {language === 'my' ? 'စာရွက်စာတမ်း မပူးတွဲရသေးပါ' : 'No Attachment Uploaded'}
                    </span>
                  )}
                  {selectedTx.proofDocumentUrl && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                      ✓ {language === 'my' ? 'ငွေသွင်းပြေစာ ပူးတွဲပြီး' : 'Deposit Slip Attached'}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Attach Presets Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'my' ? 'နမူနာ အမြန်တွဲရန်:' : 'Quick Presets:'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickAttach('nrc-both')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold transition-colors cursor-pointer"
                  title="Generate both Front and Back NRC cards"
                >
                  <span>+ {language === 'my' ? 'NRC ရှေ့/နောက် နှစ်ဖက်လုံး နမူနာတွဲမည်' : 'Attach Both NRC Front & Back'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAttach('passport')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-semibold transition-colors cursor-pointer"
                  title="Generate Passport document"
                >
                  <span>+ {language === 'my' ? 'Passport နမူနာတွဲမည်' : 'Attach Sample Passport'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAttach('deposit')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold transition-colors cursor-pointer"
                  title="Generate Bank Deposit Slip voucher"
                >
                  <span>+ {language === 'my' ? 'ငွေသွင်းပြေစာ နမူနာ ထုတ်ယူတွဲမည်' : 'Attach Sample Deposit Slip'}</span>
                </button>
              </div>

              {/* Informational Banner on Data Text View & Preview */}
              <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs">
                <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300">
                    {language === 'my' ? 'စာရွက်စာတမ်း အချက်အလက်နှင့် ပုံကြည့်ရှုခြင်း:' : 'Document Data & Picture Preview:'}
                  </span>{' '}
                  <span>
                    {language === 'my' 
                      ? 'စာရွက်စာတမ်း အချက်အလက်များကို စာသားအတန်းလိုက် ဖော်ပြထားပါသည်။ မူရင်းပုံ ကြည့်ရှုလိုပါက သက်ဆိုင်ရာ အတန်းရှိ "Preview" ခလုတ်ကို နှိပ်၍ ကြည့်ရှုနိုင်ပါသည်။'
                      : 'Documents are displayed strictly as word rows. Click the "Preview" button in any row to inspect original documents.'}
                  </span>
                </div>
              </div>

              {/* Upload & Replace Feedback Banner */}
              {uploadFeedback && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">{uploadFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadFeedback(null)}
                    className="text-emerald-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Documents Table: Only Show by Words by Rows (No Picture Frames) */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">{language === 'my' ? 'စာရွက်စာတမ်း အမျိုးအစား' : 'Document Type'}</th>
                      <th className="py-2.5 px-3">{language === 'my' ? 'အချက်အလက် / နံပါတ်' : 'Reference / ID'}</th>
                      <th className="py-2.5 px-3">{language === 'my' ? 'ဖိုင်အမည် & ဆိုဒ်' : 'Attached File & Size'}</th>
                      <th className="py-2.5 px-3 text-center">{language === 'my' ? 'အခြေအနေ' : 'Status'}</th>
                      <th className="py-2.5 px-3 text-right">{language === 'my' ? 'လုပ်ဆောင်ချက်' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-[11px]">
                    {/* Row 1: NRC Front */}
                    <tr className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-slate-200">
                            {language === 'my' ? 'NRC အရှေ့ခြမ်း (Front)' : 'NRC Card (Front Side)'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400 font-medium">
                        {selectedTx.senderNrc || '12/BAHANA(N)184920'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {(selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment) ? (
                          <>
                            <span className="font-mono text-slate-200">
                              {selectedTx.senderNrcFrontAttachmentName || selectedTx.senderNrcAttachmentName || 'NRC_Front.svg'}
                            </span>{' '}
                            <span className="text-[10px] text-emerald-400 font-bold ml-1">
                              {selectedTx.senderNrcFrontAttachmentSize || selectedTx.senderNrcAttachmentSize || '18 KB'}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 italic">{language === 'my' ? 'မပူးတွဲရသေးပါ' : 'Not attached'}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {(selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{language === 'my' ? 'စစ်ဆေးပြီး' : 'Verified'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-[10px]">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {(selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment) ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openLightbox({
                                  title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ မှတ်ပုံတင် အရှေ့ခြမ်း' : "Sender's NRC Card (Front)",
                                  url: selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment,
                                  name: selectedTx.senderNrcFrontAttachmentName || selectedTx.senderNrcAttachmentName || 'Sender_NRC_Front.svg',
                                  type: selectedTx.senderNrcFrontAttachmentType || selectedTx.senderNrcAttachmentType || 'image/svg+xml',
                                  size: selectedTx.senderNrcFrontAttachmentSize || selectedTx.senderNrcAttachmentSize || '',
                                  idNumber: selectedTx.senderNrc,
                                  sender: selectedTx.senderName
                                })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                                title={language === 'my' ? 'မူရင်းပုံ ကြည့်ရှုမည်' : 'Preview Picture'}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
                              <label
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                title={language === 'my' ? 'အစားထိုး' : 'Replace'}
                              >
                                <Upload className="w-3 h-3 text-slate-400" />
                                <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.svg"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, 'nrc-front')}
                                />
                              </label>
                              <a
                                href={selectedTx.senderNrcFrontAttachment || selectedTx.senderNrcAttachment}
                                download={selectedTx.senderNrcFrontAttachmentName || selectedTx.senderNrcAttachmentName || 'Sender_NRC_Front.svg'}
                                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment('nrc-front')}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickAttach('nrc-front')}
                                className="px-2 py-1 rounded-md bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-[10px] font-semibold transition-colors cursor-pointer"
                              >
                                + Sample
                              </button>
                              <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors cursor-pointer">
                                <Upload className="w-3 h-3" />
                                <span>Upload</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.svg"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, 'nrc-front')}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Row 2: NRC Back */}
                    <tr className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 rounded-md bg-rose-500/20 text-rose-400 shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-slate-200">
                            {language === 'my' ? 'NRC အနောက်ခြမ်း (Back)' : 'NRC Card (Back Side)'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-medium">
                        {language === 'my' ? 'သွေးအုပ်စု & လိပ်စာ' : 'Blood Group & Address'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {selectedTx.senderNrcBackAttachment ? (
                          <>
                            <span className="font-mono text-slate-200">
                              {selectedTx.senderNrcBackAttachmentName || 'NRC_Back.svg'}
                            </span>{' '}
                            <span className="text-[10px] text-rose-400 font-bold ml-1">
                              {selectedTx.senderNrcBackAttachmentSize || '16 KB'}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 italic">{language === 'my' ? 'မပူးတွဲရသေးပါ' : 'Not attached'}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {selectedTx.senderNrcBackAttachment ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{language === 'my' ? 'စစ်ဆေးပြီး' : 'Verified'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-[10px]">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {selectedTx.senderNrcBackAttachment ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openLightbox({
                                  title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ မှတ်ပုံတင် အနောက်ခြမ်း' : "Sender's NRC Card (Back Side)",
                                  url: selectedTx.senderNrcBackAttachment,
                                  name: selectedTx.senderNrcBackAttachmentName || 'Sender_NRC_Back.svg',
                                  type: selectedTx.senderNrcBackAttachmentType || 'image/svg+xml',
                                  size: selectedTx.senderNrcBackAttachmentSize || '',
                                  idNumber: selectedTx.senderNrc,
                                  sender: selectedTx.senderName
                                })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                                title={language === 'my' ? 'မူရင်းပုံ ကြည့်ရှုမည်' : 'Preview Picture'}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
                              <label
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                title={language === 'my' ? 'အစားထိုး' : 'Replace'}
                              >
                                <Upload className="w-3 h-3 text-slate-400" />
                                <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.svg"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, 'nrc-back')}
                                />
                              </label>
                              <a
                                href={selectedTx.senderNrcBackAttachment}
                                download={selectedTx.senderNrcBackAttachmentName || 'Sender_NRC_Back.svg'}
                                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment('nrc-back')}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickAttach('nrc-back')}
                                className="px-2 py-1 rounded-md bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 text-[10px] font-semibold transition-colors cursor-pointer"
                              >
                                + Sample
                              </button>
                              <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition-colors cursor-pointer">
                                <Upload className="w-3 h-3" />
                                <span>Upload</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.svg"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, 'nrc-back')}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Row 3: Passport */}
                    <tr className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 rounded-md bg-sky-500/20 text-sky-400 shrink-0">
                            <FileCheck className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-slate-200">
                            {language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : 'Passport Document'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-sky-300 font-medium">
                        {selectedTx.senderPassport || 'MB-102948'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {(selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment) ? (
                          <>
                            <span className="font-mono text-slate-200">
                              {selectedTx.senderPassportAttachmentName || selectedTx.senderPassbookAttachmentName || 'Sender_Passport.svg'}
                            </span>{' '}
                            <span className="text-[10px] text-sky-400 font-bold ml-1">
                              {selectedTx.senderPassportAttachmentSize || selectedTx.senderPassbookAttachmentSize || '24 KB'}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 italic">{language === 'my' ? 'မပူးတွဲရသေးပါ' : 'Not attached'}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {(selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{language === 'my' ? 'စစ်ဆေးပြီး' : 'Verified'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-[10px]">
                            Optional
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {(selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment) ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openLightbox({
                                  title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ နိုင်ငံကူးလက်မှတ် (Passport)' : "Sender's Passport Document",
                                  url: selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment,
                                  name: selectedTx.senderPassportAttachmentName || selectedTx.senderPassbookAttachmentName || 'Sender_Passport.svg',
                                  type: selectedTx.senderPassportAttachmentType || selectedTx.senderPassbookAttachmentType || 'image/svg+xml',
                                  size: selectedTx.senderPassportAttachmentSize || selectedTx.senderPassbookAttachmentSize || '',
                                  idNumber: selectedTx.senderPassport,
                                  sender: selectedTx.senderName
                                })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                                title={language === 'my' ? 'မူရင်းပုံ ကြည့်ရှုမည်' : 'Preview Picture'}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
                              <label
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                title={language === 'my' ? 'အစားထိုး' : 'Replace'}
                              >
                                <Upload className="w-3 h-3 text-slate-400" />
                                <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.svg"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, 'passport')}
                                />
                              </label>
                              <a
                                href={selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment}
                                download={selectedTx.senderPassportAttachmentName || selectedTx.senderPassbookAttachmentName || 'Sender_Passport.svg'}
                                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment('passport')}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickAttach('passport')}
                                className="px-2 py-1 rounded-md bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 text-[10px] font-semibold transition-colors cursor-pointer"
                              >
                                + Sample
                              </button>
                              <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] transition-colors cursor-pointer">
                                <Upload className="w-3 h-3" />
                                <span>Upload</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.svg"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, 'passport')}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Row 4: Deposit Slip */}
                    <tr className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
                            <Receipt className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-slate-200">
                            {language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ (Deposit Slip)' : 'Deposit Slip Receipt'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-300 font-medium">
                        {Number(selectedTx.sendAmount || 0).toLocaleString()} {selectedTx.sourceCurrency || selectedTx.sendCurrency || 'MMK'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {selectedTx.proofDocumentUrl ? (
                          <>
                            <span className="font-mono text-slate-200">
                              {selectedTx.proofDocumentName || 'Deposit_Receipt.svg'}
                            </span>{' '}
                            <span className="text-[10px] text-amber-400 font-bold ml-1">
                              {selectedTx.proofDocumentSize || '21 KB'}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 italic">{language === 'my' ? 'မပူးတွဲရသေးပါ' : 'Not attached'}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {selectedTx.proofDocumentUrl ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{language === 'my' ? 'စစ်ဆေးပြီး' : 'Verified'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-[10px]">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {selectedTx.proofDocumentUrl ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openLightbox({
                                  title: language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ မူရင်း (Deposit Receipt)' : "Remittance Cash Deposit Receipt",
                                  url: selectedTx.proofDocumentUrl,
                                  name: selectedTx.proofDocumentName || 'Deposit_Receipt.svg',
                                  type: selectedTx.proofDocumentType || 'image/svg+xml',
                                  size: selectedTx.proofDocumentSize || '',
                                  idNumber: selectedTx.transactionNo,
                                  sender: selectedTx.senderName
                                })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                                title={language === 'my' ? 'မူရင်းပုံ ကြည့်ရှုမည်' : 'Preview Picture'}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
                              <label
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                title={language === 'my' ? 'အစားထိုး' : 'Replace'}
                              >
                                <Upload className="w-3 h-3 text-slate-400" />
                                <span>{language === 'my' ? 'အစားထိုး' : 'Replace'}</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.svg"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, 'deposit')}
                                />
                              </label>
                              <a
                                href={selectedTx.proofDocumentUrl}
                                download={selectedTx.proofDocumentName || 'Deposit_Receipt.svg'}
                                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment('deposit')}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickAttach('deposit')}
                                className="px-2 py-1 rounded-md bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 text-[10px] font-semibold transition-colors cursor-pointer"
                              >
                                + Sample
                              </button>
                              <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition-colors cursor-pointer">
                                <Upload className="w-3 h-3" />
                                <span>Upload</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf,.svg"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, 'deposit')}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Identity Verification Checklist */}
              <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/80 text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="text-slate-400">{language === 'my' ? 'စိစစ်ချက်များ:' : 'KYC Matches:'}</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedTx.senderName}</span>
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="font-mono">{selectedTx.senderNrc}</span>
                  </span>
                  {selectedTx.senderDateOfBirth && (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="font-mono">DOB: {formatToDDMMYYYY(selectedTx.senderDateOfBirth)}</span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {language === 'my' ? 'အထောက်အထားမူရင်းနှင့် ကိုက်ညီမှုရှိမရှိ စစ်ဆေးပါ' : 'Confirm match with physical / scanned ID'}
                </span>
              </div>
            </div>

            {/* Compliance Check Status */}
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-center space-x-2 text-xs text-emerald-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{t.cleanRecord}</span>
            </div>

            {/* Branch Information */}
            {(() => {
              const b = db.branches.find(br => br.id === selectedTx.sendingBranchId) || db.branches[0];
              if (!b) return null;
              return (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">
                          {language === 'my' && b.nameMm ? `${b.nameMm} (${b.nameEn})` : b.nameEn}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono text-[10px] font-bold">
                          {b.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {b.address}, {b.city} • Tel: <span className="font-mono text-slate-300">{b.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 shrink-0 border-t sm:border-t-0 pt-1 sm:pt-0 sm:border-l border-slate-800 sm:pl-3">
                    <span className="text-slate-500 block">{language === 'my' ? 'ဘဏ်ခွဲ မန်နေဂျာ' : 'Branch Manager'}</span>
                    <span className="font-bold text-slate-200">{b.managerName}</span>
                  </div>
                </div>
              );
            })()}

            {/* Maker Note */}
            {selectedTx.senderNote && (
              <div className="text-xs bg-slate-800 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 font-bold block">{t.makerNote}:</span>
                <span className="text-slate-200 italic">"{selectedTx.senderNote}"</span>
              </div>
            )}

            {/* Approval Remarks Input */}
            <div className="text-xs">
              <label className="block text-slate-400 mb-1 font-medium">{t.approvalNote}</label>
              <input
                type="text"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Remarks for audit trail..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* End of Scrollable Body */}
            </div>

            {/* Sticky Modal Action Buttons Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t border-slate-800 bg-slate-950/90 shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer flex items-center space-x-1"
                  title={language === 'my' ? 'ပိတ်မည်' : 'Close'}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'ပိတ်မည်' : 'Close'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleHold}
                  className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  {t.hold}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false);
                      handleOpenEdit(selectedTx);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer hover:scale-[1.02]"
                    title={language === 'my' ? 'ငွေလွှဲအချက်အလက် ပြင်ဆင်ရန်' : 'Edit Remittance Information'}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'my' ? 'ပြင်ဆင်ရန် (Review & Edit)' : 'Review & Edit'}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewModal(false);
                    handleOpenReject(selectedTx);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {t.reject}
                </button>

                {selectedTx.status === 'PENDING_APPROVAL' ? (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isSending}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.02] cursor-pointer flex items-center space-x-2"
                    title={language === 'my' ? 'အတည်ပြုပြီး လက်ခံမည့်ဘဏ်ခွဲ Inward သို့ အလိုအလျောက် ပေးပို့မည်' : 'Approve & Auto-Dispatch to Destination Branch Inward'}
                  >
                    <SendHorizontal className="w-4 h-4 text-sky-200" />
                    <span>{language === 'my' ? 'Approve and Send to Branch (အတည်ပြုပြီး လွှဲပို့မည်)' : 'Approve and Send to Branch'}</span>
                  </button>
                ) : selectedTx.status === 'APPROVED' && !selectedTx.isSentToDestination ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false);
                      handleSendToReceiveBranch(selectedTx);
                    }}
                    disabled={isSending}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-900/40 transition-all hover:scale-[1.02] cursor-pointer flex items-center space-x-1.5"
                  >
                    <SendHorizontal className="w-3.5 h-3.5 text-sky-200" />
                    <span>{language === 'my' ? 'Send to Receive Branch (ငွေလွှဲပို့မည်)' : 'Send to Receive Branch'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false);
                      setVoucherTx(selectedTx);
                      setShowVoucherModal(true);
                    }}
                    className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{t.printVoucher}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Prompt Modal */}
      {showRejectModal && selectedTx && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-600 text-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-rose-400">
                <XCircle className="w-5 h-5" />
                <h3 className="text-base font-bold">{t.reject} - {selectedTx.transactionNo}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title={language === 'my' ? 'ပိတ်မည်' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              {language === 'my' ? 'ငြင်းပယ်ရသည့် အကြောင်းအရင်းကို အသေးစိတ် ထည့်သွင်းပေးပါ (Audit Log တွင် သိမ်းဆည်းမည်)' : 'Please provide the mandatory rejection reason. This will be recorded in compliance audit.'}
            </p>
            <div>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Inconsistent NRC spelling / Unverified overseas tuition invoice"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {t.reject}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Voucher Modal */}
      <VoucherModal
        isOpen={showVoucherModal}
        transaction={voucherTx}
        onClose={() => setShowVoucherModal(false)}
      />

      {/* Edit Outward Modal */}
      <EditOutwardModal
        isOpen={showEditModal}
        transaction={editingTx}
        onClose={() => {
          setShowEditModal(false);
          setEditingTx(null);
        }}
        onApproveDirectly={handleDirectApproveFromEdit}
      />

      {/* Document Lightbox Modal for Sender NRC & Passport */}
      <DocumentLightboxModal
        isOpen={!!lightboxDoc?.isOpen}
        title={lightboxDoc?.title || "Sender Identity Document"}
        documentUrl={lightboxDoc?.url}
        fileName={lightboxDoc?.name}
        fileType={lightboxDoc?.type}
        fileSize={lightboxDoc?.size}
        idNumber={lightboxDoc?.idNumber}
        senderName={lightboxDoc?.sender}
        onClose={() => setLightboxDoc(null)}
      />

      {/* Domestic Remittance Dispatch Confirmation & Auto Inward Created Modal */}
      {dispatchSuccessModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-sky-500/60 text-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  <SendHorizontal className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">
                    {language === 'my' ? 'ငွေလွှဲအောင်မြင်စွာ ပေးပို့ပြီးပါပြီ' : 'Domestic Remittance Dispatched!'}
                  </h3>
                  <p className="text-xs text-sky-100 font-medium">
                    {language === 'my' ? 'လက်ခံမည့်ဘဏ်ခွဲ Inward သို့ Auto ရောက်ရှိပါသည်' : 'Auto-Dispatched to Receiving Branch Inward'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchSuccessModal(null)}
                className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-200">
              {/* Branch to Branch Visual Route */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-slate-400 font-medium">
                  <span>{language === 'my' ? 'လွှဲပို့လမ်းကြောင်း (Branch Route)' : 'Inter-Branch Route'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Synced
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">{language === 'my' ? 'ပေးပို့သည့် ဘဏ်ခွဲ' : 'Origin Branch'}</span>
                    <strong className="text-white text-xs block font-bold truncate">{dispatchSuccessModal.sendingBranchName}</strong>
                  </div>
                  <div className="flex flex-col items-center justify-center px-2">
                    <ArrowRight className="w-5 h-5 text-sky-400 animate-pulse" />
                    <span className="text-[9px] text-sky-400 font-mono mt-0.5 font-bold">SEND</span>
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-[10px] text-amber-400 block font-medium uppercase tracking-wider">{language === 'my' ? 'လက်ခံထုတ်ယူမည့် ဘဏ်ခွဲ' : 'Receive Branch'}</span>
                    <strong className="text-amber-300 text-xs block font-bold truncate">{dispatchSuccessModal.destBranchName}</strong>
                  </div>
                </div>
              </div>

              {/* Transaction Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px] font-medium">{t.mtcnCode}:</span>
                  <strong className="font-mono text-amber-400 text-sm block mt-0.5">{dispatchSuccessModal.mtcn}</strong>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{dispatchSuccessModal.outwardNo}</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 shadow-inner">
                  <span className="text-emerald-400 block text-[11px] font-medium">{language === 'my' ? 'Auto ဝင်သွားသော Inward စာရင်း:' : 'Auto Inward Claim No:'}</span>
                  <strong className="font-mono text-emerald-300 text-sm block mt-0.5">{dispatchSuccessModal.inwardNo}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Status: PENDING_APPROVAL</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">{language === 'my' ? 'ငွေထုတ်ယူသူ (Beneficiary)' : 'Beneficiary'}:</span>
                  <strong className="text-white text-xs block font-bold">{dispatchSuccessModal.receiverName}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">{language === 'my' ? 'ထုတ်ပေးငွေပမာဏ (Payout Cash)' : 'Payout Cash'}:</span>
                  <strong className="text-emerald-400 text-sm font-mono font-bold">
                    {dispatchSuccessModal.amount.toLocaleString()} {dispatchSuccessModal.currency}
                  </strong>
                </div>
              </div>

              {/* Notice to user */}
              <div className="bg-sky-950/40 p-3 rounded-xl border border-sky-500/30 flex items-start space-x-2 text-sky-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  {language === 'my'
                    ? `လက်ခံမည့်ဘဏ်ခွဲ (${dispatchSuccessModal.destBranchName}) ၏ Inward စာရင်းသို့ Auto ဝင်ရောက်သွားပြီးဖြစ်ပါသည်။ ထိုဘဏ်ခွဲရှိ Checker က စစ်ဆေး၍ Payout Cash ထုတ်ပေးနိုင်ပါပြီ။`
                    : `Transaction automatically created in ${dispatchSuccessModal.destBranchName} Inward queue. Their Checker can now review and approve cash payout!`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const found = db.transactions.find(t => t.transactionNo === dispatchSuccessModal.outwardNo);
                    if (found) {
                      setVoucherTx(found);
                      setShowVoucherModal(true);
                    }
                    setDispatchSuccessModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'Voucher ထုတ်မည်' : 'Print Voucher'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveBranchId(dispatchSuccessModal.destBranchId);
                    setDispatchSuccessModal(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-900/40 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>
                    {language === 'my'
                      ? `လက်ခံမည့်ဘဏ်ခွဲ (${dispatchSuccessModal.destBranchName}) သို့ ကူးပြောင်းမည်`
                      : `Switch to ${dispatchSuccessModal.destBranchName}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
