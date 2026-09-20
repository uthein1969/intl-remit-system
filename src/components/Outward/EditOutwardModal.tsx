import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Eye, 
  AlertTriangle, 
  CheckCircle2, 
  Globe, 
  User, 
  Send, 
  Building2, 
  MapPin, 
  Phone,
  ShieldAlert,
  ShieldCheck,
  CheckSquare,
  FileText,
  FileCheck,
  Paperclip,
  Upload,
  Trash2,
  Maximize2,
  Download,
  Sparkles,
  Loader2,
  Receipt
} from 'lucide-react';
import { RemittanceTransaction, PayoutMethod, RemittanceScope } from '../../types';
import { useRemittance } from '../../lib/store';
import { DobDatePicker, formatToDDMMYYYY } from '../Common/DobDatePicker';
import { DocumentLightboxModal } from '../Common/DocumentLightboxModal';
import { 
  createSampleMyanmarNrcSvg, 
  createSampleMyanmarNrcBackSvg, 
  createSampleMyanmarPassportSvg,
  createSampleDepositReceiptSvg
} from '../../lib/sampleDocuments';
import { extractNrcInfoFromUpload, scanNrcWithAi, ExtractedNrcInfo } from '../../lib/nrcOcrParser';
import { readFileAsOptimizedDataUrl } from '../../lib/imageCompressor';

interface EditOutwardModalProps {
  isOpen: boolean;
  transaction: RemittanceTransaction | null;
  onClose: () => void;
  onSuccess?: () => void;
  onApproveDirectly?: (updatedTx: RemittanceTransaction) => void;
}

export const EditOutwardModal: React.FC<EditOutwardModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSuccess,
  onApproveDirectly
}) => {
  const { 
    db, 
    language, 
    t, 
    updateTransaction, 
    checkBlacklist, 
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
    (defaultStatusConfig?.applyReviewEdit !== false);

  const [formData, setFormData] = useState<RemittanceTransaction | null>(null);
  const [editReason, setEditReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isScanningNrc, setIsScanningNrc] = useState(false);
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
  const [uploadFeedback, setUploadFeedback] = useState<{ message: string; type: 'nrc-front' | 'nrc-back' | 'passport' | 'deposit' } | null>(null);
  const [nrcOcrResult, setNrcOcrResult] = useState<ExtractedNrcInfo | null>(null);
  // OCR Checkbox Toggle: Default is unchecked (false), OCR only works when checked (true)
  const [isOcrEnabled, setIsOcrEnabled] = useState<boolean>(false);

  const handleAttachBothNrc = () => {
    if (!formData) return;
    const nrcUrl = createSampleMyanmarNrcSvg(
      formData.senderNrc || '12/BAHANA(N)184920',
      formData.senderNameMm || formData.senderName,
      formData.senderName,
      formatToDDMMYYYY(formData.senderDateOfBirth) || '14/07/1988',
      formData.senderFatherName || 'U Tin Aung'
    );
    const frontName = `NRC_Front_${formData.senderName.replace(/\s+/g, '_')}_${(formData.senderNrc || 'Card').replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
    
    const nrcBackUrl = createSampleMyanmarNrcBackSvg(
      formData.senderOccupation || 'ကုမ္ပဏီဝန်ထမ်း (Company Staff)',
      formData.senderAddress || 'အမှတ် (၁၂)၊ ဗဟန်းလမ်း၊ ရန်ကုန်'
    );
    const backName = `NRC_Back_${formData.senderName.replace(/\s+/g, '_')}_${(formData.senderNrc || 'Card').replace(/[^a-zA-Z0-9]/g, '_')}.svg`;

    setFormData(prev => prev ? {
      ...prev,
      senderIdType: 'NRC',
      senderNrcAttachment: nrcUrl,
      senderNrcAttachmentName: frontName,
      senderNrcAttachmentType: 'image/svg+xml',
      senderNrcAttachmentSize: '18.4 KB',
      senderNrcFrontAttachment: nrcUrl,
      senderNrcFrontAttachmentName: frontName,
      senderNrcFrontAttachmentType: 'image/svg+xml',
      senderNrcFrontAttachmentSize: '18.4 KB',
      senderNrcBackAttachment: nrcBackUrl,
      senderNrcBackAttachmentName: backName,
      senderNrcBackAttachmentType: 'image/svg+xml',
      senderNrcBackAttachmentSize: '16.2 KB',
      ...(isOcrEnabled ? {
        senderName: formData.senderName || 'U ZAW WIN HTET',
        senderNameMm: formData.senderNameMm || 'ဦးဇော်ဝင်းထက်',
        senderNrc: formData.senderNrc || '12/BAHANA(N)184920',
        senderFatherName: formData.senderFatherName || 'U Tin Aung',
        senderDateOfBirth: formData.senderDateOfBirth || '14/07/1988',
        senderOccupation: formData.senderOccupation || 'ကုမ္ပဏီဝန်ထမ်း (Company Staff)',
        senderAddress: formData.senderAddress || 'အမှတ် (၁၂)၊ ဗဟန်းလမ်း၊ ရန်ကုန်'
      } : {})
    } : null);

    setUploadFeedback({
      message: language === 'my'
        ? (isOcrEnabled ? '✨ [OCR ON] မှတ်ပုံတင် (ရှေ့ခြမ်း နှင့် နောက်ခြမ်း) ပူးတွဲပြီး အချက်အလက်များ Auto ဖြည့်သွင်းပြီးပါပြီ' : 'မှတ်ပုံတင် (ရှေ့ခြမ်း နှင့် နောက်ခြမ်း) ပူးတွဲပြီးပါပြီ (OCR အမှန်ခြစ် ဖြုတ်ထားပါသည်)')
        : (isOcrEnabled ? '✨ [OCR ON] Attached both NRC Front & Back cards and auto-populated fields' : 'Attached both NRC Front & Back cards (OCR is unchecked)'),
      type: 'nrc-front'
    });
    setTimeout(() => setUploadFeedback(null), 5000);
  };

  const handleAttachSample = (type: 'nrc-front' | 'nrc-back' | 'passport' | 'deposit') => {
    if (!formData) return;
    if (type === 'nrc-front') {
      const nrcUrl = createSampleMyanmarNrcSvg(
        formData.senderNrc || '12/BAHANA(N)184920',
        formData.senderNameMm || formData.senderName,
        formData.senderName,
        formatToDDMMYYYY(formData.senderDateOfBirth) || '14/07/1988',
        formData.senderFatherName || 'U Tin Aung'
      );
      const name = `NRC_Front_${formData.senderName.replace(/\s+/g, '_')}_${(formData.senderNrc || 'Card').replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
      setFormData(prev => prev ? {
        ...prev,
        senderIdType: 'NRC',
        senderNrcAttachment: nrcUrl,
        senderNrcAttachmentName: name,
        senderNrcAttachmentType: 'image/svg+xml',
        senderNrcAttachmentSize: '18 KB',
        senderNrcFrontAttachment: nrcUrl,
        senderNrcFrontAttachmentName: name,
        senderNrcFrontAttachmentType: 'image/svg+xml',
        senderNrcFrontAttachmentSize: '18 KB'
      } : null);
      setUploadFeedback({
        message: language === 'my'
          ? 'မှတ်ပုံတင် အရှေ့ခြမ်း (NRC Front) အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ'
          : 'Successfully attached NRC Front card',
        type: 'nrc-front'
      });
      setTimeout(() => setUploadFeedback(null), 5000);
    } else if (type === 'nrc-back') {
      const nrcBackUrl = createSampleMyanmarNrcBackSvg(
        formData.senderOccupation || 'ကုမ္ပဏီဝန်ထမ်း (Company Staff)',
        formData.senderAddress || 'အမှတ် (၁၂)၊ ဗဟန်းလမ်း၊ ရန်ကုန်'
      );
      const name = `NRC_Back_${formData.senderName.replace(/\s+/g, '_')}_${(formData.senderNrc || 'Card').replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
      setFormData(prev => prev ? {
        ...prev,
        senderIdType: 'NRC',
        senderNrcBackAttachment: nrcBackUrl,
        senderNrcBackAttachmentName: name,
        senderNrcBackAttachmentType: 'image/svg+xml',
        senderNrcBackAttachmentSize: '16 KB'
      } : null);
      setUploadFeedback({
        message: language === 'my'
          ? 'မှတ်ပုံတင် အနောက်ခြမ်း (NRC Back) အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ'
          : 'Successfully attached NRC Back card',
        type: 'nrc-back'
      });
      setTimeout(() => setUploadFeedback(null), 5000);
    } else if (type === 'deposit') {
      const branch = db.branches.find(b => b.id === formData.sendingBranchId) || db.branches[0];
      const branchName = branch ? `${branch.nameEn} (${branch.code})` : 'Yangon Main Branch (BR-001)';
      const amountStr = `${formData.sendAmount.toLocaleString()} ${formData.sourceCurrency}`;
      const url = createSampleDepositReceiptSvg(
        formData.senderName || 'U ZAW WIN HTET',
        formData.senderNrc || '12/BAHANA(N)184920',
        amountStr,
        branchName,
        new Date().toLocaleDateString('en-GB')
      );
      const name = `Deposit_Slip_${(formData.senderName || 'Sender').replace(/\s+/g, '_')}_${Date.now().toString().slice(-4)}.svg`;
      setFormData(prev => prev ? {
        ...prev,
        proofDocCategory: 'DEPOSIT_RECEIPT',
        proofDocumentUrl: url,
        proofDocumentName: name,
        proofDocumentType: 'image/svg+xml',
        proofDocumentSize: '22.5 KB'
      } : null);
      setUploadFeedback({
        message: language === 'my'
          ? 'ဘဏ်ငွေသွင်းပြေစာ (Deposit Slip Voucher) နမူနာ အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ'
          : 'Successfully generated and attached Bank Cash Deposit Slip Voucher',
        type: 'deposit'
      });
      setTimeout(() => setUploadFeedback(null), 5000);
    } else {
      const passportUrl = createSampleMyanmarPassportSvg(
        formData.senderPassport || formData.senderPassbook || 'MA-918234',
        formData.senderName,
        formatToDDMMYYYY(formData.senderDateOfBirth) || '14/07/1988'
      );
      const name = `Passport_${formData.senderName.replace(/\s+/g, '_')}_${formData.senderPassport || formData.senderPassbook || 'MA918234'}.svg`;
      setFormData(prev => prev ? {
        ...prev,
        senderIdType: 'PASSPORT',
        senderPassportAttachment: passportUrl,
        senderPassportAttachmentName: name,
        senderPassportAttachmentType: 'image/svg+xml',
        senderPassportAttachmentSize: '24 KB',
        senderPassbookAttachment: passportUrl,
        senderPassbookAttachmentName: name,
        senderPassbookAttachmentType: 'image/svg+xml',
        senderPassbookAttachmentSize: '24 KB'
      } : null);
      setUploadFeedback({
        message: language === 'my'
          ? 'နိုင်ငံကူးလက်မှတ် (Passport) အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ'
          : 'Successfully attached Passport document',
        type: 'passport'
      });
      setTimeout(() => setUploadFeedback(null), 5000);
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'nrc-front' | 'nrc-back' | 'passport' | 'deposit') => {
    const file = e.target.files?.[0];
    if (!file || !formData) return;

    readFileAsOptimizedDataUrl(file).then((opt) => {
      const dataUrl = opt.dataUrl;
      const sizeStr = opt.sizeStr;

      if (type === 'deposit') {
        setFormData(prev => prev ? {
          ...prev,
          proofDocCategory: 'DEPOSIT_RECEIPT',
          proofDocumentUrl: dataUrl,
          proofDocumentName: opt.name,
          proofDocumentType: opt.type,
          proofDocumentSize: sizeStr
        } : null);
        setUploadFeedback({
          message: language === 'my'
            ? `ဘဏ်ငွေသွင်းပြေစာ ဖိုင်တင်သွင်းပြီးပါပြီ (${opt.name})`
            : `Successfully attached Deposit Slip Voucher (${opt.name})`,
          type: 'deposit'
        });
        setTimeout(() => setUploadFeedback(null), 5000);
        return;
      }

      if (type === 'nrc-front' || type === 'nrc-back') {
        setFormData(prev => prev ? {
          ...prev,
          senderIdType: 'NRC',
          ...(type === 'nrc-front' ? {
            senderNrcAttachment: dataUrl,
            senderNrcAttachmentName: opt.name,
            senderNrcAttachmentType: opt.type,
            senderNrcAttachmentSize: sizeStr,
            senderNrcFrontAttachment: dataUrl,
            senderNrcFrontAttachmentName: opt.name,
            senderNrcFrontAttachmentType: opt.type,
            senderNrcFrontAttachmentSize: sizeStr,
          } : {
            senderNrcBackAttachment: dataUrl,
            senderNrcBackAttachmentName: opt.name,
            senderNrcBackAttachmentType: opt.type,
            senderNrcBackAttachmentSize: sizeStr,
          })
        } : null);

        if (isOcrEnabled) {
          const extracted = extractNrcInfoFromUpload(file, dataUrl, db.customers);
          setNrcOcrResult(extracted);
          setFormData(prev => prev ? {
            ...prev,
            senderName: extracted.nameEn || prev.senderName,
            senderNameMm: extracted.nameMm || prev.senderNameMm,
            senderNrc: extracted.nrcNumber || prev.senderNrc,
            senderFatherName: extracted.fatherName || prev.senderFatherName,
            senderDateOfBirth: extracted.dob || prev.senderDateOfBirth,
            senderAddress: extracted.address || prev.senderAddress,
            senderOccupation: extracted.occupation || prev.senderOccupation,
          } : null);

          setUploadFeedback({
            message: language === 'my'
              ? `✨ [OCR ON] မှတ်ပုံတင် ဖိုင်တင်သွင်းပြီးသည်နှင့် အမည် (${extracted.nameEn || extracted.nameMm}) နှင့် မှတ်ပုံတင်နံပတ် (${extracted.nrcNumber}) ကို Auto တန်းပြီး ဖြည့်သွင်းပေးလိုက်ပါပြီ (${opt.name})`
              : `✨ [OCR ON] Auto-populated Name (${extracted.nameEn}) and NRC (${extracted.nrcNumber}) from uploaded NRC card!`,
            type
          });

          // Async AI Vision OCR
          setIsScanningNrc(true);
          scanNrcWithAi(file, dataUrl, db.customers).then((aiExtracted) => {
            setIsScanningNrc(false);
            setNrcOcrResult(aiExtracted);
            setFormData(prev => prev ? {
              ...prev,
              senderName: aiExtracted.nameEn || prev.senderName,
              senderNameMm: aiExtracted.nameMm || prev.senderNameMm,
              senderNrc: aiExtracted.nrcNumber || prev.senderNrc,
              senderFatherName: aiExtracted.fatherName || prev.senderFatherName,
              senderDateOfBirth: aiExtracted.dob || prev.senderDateOfBirth,
              senderAddress: aiExtracted.address || prev.senderAddress,
              senderOccupation: aiExtracted.occupation || prev.senderOccupation,
            } : null);
          }).catch(() => {
            setIsScanningNrc(false);
          });
        } else {
          setNrcOcrResult(null);
          setIsScanningNrc(false);
          setUploadFeedback({
            message: language === 'my'
              ? `မှတ်ပုံတင်ဖိုင် (${opt.name}) အောင်မြင်စွာ ပူးတွဲပြီးပါပြီ (OCR အမှန်ခြစ် ဖြုတ်ထားသဖြင့် ဖိုင်သာ ပူးတွဲပါသည်)`
              : `Attached NRC file "${opt.name}" successfully (OCR is unchecked, file attached only)`,
            type
          });
        }

        setTimeout(() => setUploadFeedback(null), 7000);
      } else {
        setFormData(prev => prev ? {
          ...prev,
          senderIdType: 'PASSPORT',
          senderPassportAttachment: dataUrl,
          senderPassportAttachmentName: opt.name,
          senderPassportAttachmentType: opt.type,
          senderPassportAttachmentSize: sizeStr,
          senderPassbookAttachment: dataUrl,
          senderPassbookAttachmentName: opt.name,
          senderPassbookAttachmentType: opt.type,
          senderPassbookAttachmentSize: sizeStr
        } : null);
        setUploadFeedback({
          message: language === 'my'
            ? `Passport ဓာတ်ပုံအသစ် အောင်မြင်စွာ အစားထိုးထည့်သွင်းပြီးပါပြီ (${opt.name})`
            : `Successfully replaced Passport picture (${opt.name})`,
          type
        });
      }
      setTimeout(() => setUploadFeedback(null), 5000);
    });
    e.target.value = '';
  };

  const handleRemoveDoc = (type: 'nrc-front' | 'nrc-back' | 'passport' | 'deposit') => {
    if (!formData) return;
    if (type === 'nrc-front') {
      setFormData({
        ...formData,
        senderNrcAttachment: undefined,
        senderNrcAttachmentName: undefined,
        senderNrcAttachmentType: undefined,
        senderNrcAttachmentSize: undefined,
        senderNrcFrontAttachment: undefined,
        senderNrcFrontAttachmentName: undefined,
        senderNrcFrontAttachmentType: undefined,
        senderNrcFrontAttachmentSize: undefined
      });
    } else if (type === 'nrc-back') {
      setFormData({
        ...formData,
        senderNrcBackAttachment: undefined,
        senderNrcBackAttachmentName: undefined,
        senderNrcBackAttachmentType: undefined,
        senderNrcBackAttachmentSize: undefined
      });
    } else if (type === 'deposit') {
      setFormData({
        ...formData,
        proofDocumentUrl: undefined,
        proofDocumentName: undefined,
        proofDocumentType: undefined,
        proofDocumentSize: undefined
      });
    } else {
      setFormData({
        ...formData,
        senderPassportAttachment: undefined,
        senderPassportAttachmentName: undefined,
        senderPassportAttachmentType: undefined,
        senderPassportAttachmentSize: undefined,
        senderPassbookAttachment: undefined,
        senderPassbookAttachmentName: undefined,
        senderPassbookAttachmentType: undefined,
        senderPassbookAttachmentSize: undefined
      });
    }
  };

  // Synchronize form when transaction changes or modal opens
  useEffect(() => {
    if (transaction) {
      // Determine default Scope & ID type:
      // If User Login by Other Country, Default is International and Passport.
      // If User Login by Myanmar Country, Default is Domestic and NRC.
      const defaultScope: RemittanceScope = isMyanmarLogin ? 'DOMESTIC' : 'INTERNATIONAL';
      const defaultIdType: 'NRC' | 'PASSPORT' = isMyanmarLogin ? 'NRC' : 'PASSPORT';
      
      const effectiveScope: RemittanceScope = transaction.scope || (isDefaultStatusEnabled ? defaultScope : 'INTERNATIONAL');
      const initialIdType: 'NRC' | 'PASSPORT' = transaction.senderIdType || 
        (isDefaultStatusEnabled ? defaultIdType : 
          ((transaction.senderPassport || transaction.senderPassportAttachment) && !transaction.senderNrc && !transaction.senderNrcAttachment ? 'PASSPORT' : 'NRC'));
      
      const frontAttach = transaction.senderNrcFrontAttachment || transaction.senderNrcAttachment;
      const frontName = transaction.senderNrcFrontAttachmentName || transaction.senderNrcAttachmentName;
      const frontType = transaction.senderNrcFrontAttachmentType || transaction.senderNrcAttachmentType;
      const frontSize = transaction.senderNrcFrontAttachmentSize || transaction.senderNrcAttachmentSize;

      // If user had uploaded back to passportAttachment previously or has senderNrcBackAttachment:
      const backAttach = transaction.senderNrcBackAttachment || 
        (initialIdType === 'NRC' && transaction.senderPassportAttachment && (!transaction.senderPassport || transaction.senderPassportAttachmentName?.toLowerCase().includes('nrc') || transaction.senderPassportAttachment.includes('FINGERPRINT') || transaction.senderPassportAttachment.includes('Back')) 
          ? transaction.senderPassportAttachment 
          : undefined);
      const backName = transaction.senderNrcBackAttachmentName || 
        (initialIdType === 'NRC' && transaction.senderPassportAttachment && (!transaction.senderPassport || transaction.senderPassportAttachmentName?.toLowerCase().includes('nrc')) 
          ? transaction.senderPassportAttachmentName 
          : (backAttach ? 'Sender_NRC_Back.svg' : undefined));
      const backType = transaction.senderNrcBackAttachmentType || 
        (initialIdType === 'NRC' && transaction.senderPassportAttachment ? transaction.senderPassportAttachmentType : undefined);
      const backSize = transaction.senderNrcBackAttachmentSize || 
        (initialIdType === 'NRC' && transaction.senderPassportAttachment ? transaction.senderPassportAttachmentSize : undefined);

      let effectiveRate = transaction.exchangeRate;
      let effectiveReceive = transaction.receiveAmount;
      if (transaction.sourceCurrency !== 'MMK' && transaction.targetCurrency === 'MMK' && effectiveRate > 0 && effectiveRate < 1) {
        effectiveRate = Number((1 / effectiveRate).toFixed(4));
        effectiveReceive = Number((Number(transaction.sendAmount || 0) * effectiveRate).toFixed(2));
      } else if (transaction.sourceCurrency === 'MMK' && transaction.targetCurrency !== 'MMK' && effectiveRate > 0 && effectiveRate < 1) {
        effectiveRate = Number((1 / effectiveRate).toFixed(4));
        effectiveReceive = Number((Number(transaction.sendAmount || 0) / effectiveRate).toFixed(2));
      }

      setFormData({ 
        ...transaction,
        exchangeRate: effectiveRate,
        receiveAmount: effectiveReceive,
        scope: effectiveScope,
        senderIdType: initialIdType,
        senderNrcAttachment: frontAttach,
        senderNrcAttachmentName: frontName,
        senderNrcAttachmentType: frontType,
        senderNrcAttachmentSize: frontSize,
        senderNrcFrontAttachment: frontAttach,
        senderNrcFrontAttachmentName: frontName,
        senderNrcFrontAttachmentType: frontType,
        senderNrcFrontAttachmentSize: frontSize,
        senderNrcBackAttachment: backAttach,
        senderNrcBackAttachmentName: backName,
        senderNrcBackAttachmentType: backType,
        senderNrcBackAttachmentSize: backSize
      });
      setEditReason('');
      setErrorMessage('');
      setSuccessMessage('');
    } else {
      setFormData(null);
    }
  }, [transaction, isOpen, isMyanmarLogin, isDefaultStatusEnabled]);

  const handleApplyDefaultStatus = () => {
    if (!formData) return;
    const defaultScope: RemittanceScope = isMyanmarLogin ? 'DOMESTIC' : 'INTERNATIONAL';
    const defaultIdType: 'NRC' | 'PASSPORT' = isMyanmarLogin ? 'NRC' : 'PASSPORT';
    setFormData(prev => prev ? {
      ...prev,
      scope: defaultScope,
      senderIdType: defaultIdType,
      ...(defaultScope === 'DOMESTIC' ? {
        receiverCountryCode: userCountryCode,
        targetCurrency: 'MMK'
      } : {
        receiverCountryCode: userCountryCode === 'MM' ? 'TH' : 'MM',
        targetCurrency: userCountryCode === 'MM' ? 'THB' : 'MMK'
      })
    } : null);
    setUploadFeedback({
      message: language === 'my'
        ? `မူရင်းသတ်မှတ်ချက်အတိုင်း ပြင်ဆင်ပြီးပါပြီ: ${defaultScope === 'DOMESTIC' ? 'ပြည်တွင်း (Domestic)' : 'နိုင်ငံတကာ (International)'} နှင့် ${defaultIdType === 'NRC' ? 'မှတ်ပုံတင် (NRC)' : 'နိုင်ငံကူးလက်မှတ် (Passport)'}`
        : `Applied Default Status: ${defaultScope} & ${defaultIdType} (${isMyanmarLogin ? 'Myanmar Login' : 'Other Country Login'})`,
      type: defaultIdType === 'NRC' ? 'nrc-front' : 'passport'
    });
    setTimeout(() => setUploadFeedback(null), 4000);
  };

  if (!isOpen || !formData) return null;

  // Real-time screening on sender & receiver
  const senderBlacklistMatch = checkBlacklist(
    formData.senderNrc || '',
    formData.senderPassport || '',
    formData.senderName || ''
  );

  const receiverBlacklistMatch = checkBlacklist(
    formData.receiverNrc || '',
    formData.receiverPassport || '',
    formData.receiverName || ''
  );

  // Auto-calculate financial values
  const handleAmountRateChange = (
    sendAmount: number,
    exchangeRate: number,
    sourceCurrency: string,
    targetCurrency: string,
    serviceFee: number,
    commissionFee: number
  ) => {
    let receiveAmount = 0;
    const amt = Number(sendAmount || 0);
    const rate = Number(exchangeRate || 0);

    if (sourceCurrency === targetCurrency) {
      receiveAmount = amt;
    } else if (sourceCurrency === 'MMK' && targetCurrency !== 'MMK') {
      receiveAmount = rate >= 1 ? Number((amt / rate).toFixed(2)) : Number((amt * rate).toFixed(2));
    } else if (sourceCurrency !== 'MMK' && targetCurrency === 'MMK') {
      receiveAmount = rate >= 1 ? Number((amt * rate).toFixed(2)) : Number((amt / rate).toFixed(2));
    } else {
      receiveAmount = Number((amt * rate).toFixed(2));
    }
    
    const totalPayable = Number(sendAmount) + Number(serviceFee) + Number(commissionFee);

    setFormData(prev => prev ? {
      ...prev,
      sendAmount,
      exchangeRate,
      receiveAmount,
      serviceFee,
      commissionFee,
      totalPayableAmount: totalPayable
    } : null);
  };

  const handleSaveOnly = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData) return false;

    const isNrc = (formData.senderIdType || 'NRC') === 'NRC';

    if (!formData.senderName.trim()) {
      setErrorMessage(language === 'my' ? 'ငွေလွှဲပို့သူအမည် ထည့်သွင်းရန် လိုအပ်ပါသည်' : 'Sender name is required');
      return false;
    }
    if (isNrc && !formData.senderNrc.trim()) {
      setErrorMessage(language === 'my' ? 'ငွေလွှဲပို့သူ မှတ်ပုံတင် ထည့်သွင်းရန် လိုအပ်ပါသည်' : 'Sender NRC is required');
      return false;
    }
    if (!isNrc && !(formData.senderPassport || formData.senderPassbook)?.trim()) {
      setErrorMessage(language === 'my' ? 'ငွေလွှဲပို့သူ နိုင်ငံကူးလက်မှတ်အမှတ် ထည့်သွင်းရန် လိုအပ်ပါသည်' : 'Sender Passport number is required');
      return false;
    }
    if (!formData.receiverName.trim()) {
      setErrorMessage(language === 'my' ? 'ငွေလက်ခံသူအမည် ထည့်သွင်းရန် လိုအပ်ပါသည်' : 'Receiver name is required');
      return false;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const updatedRecord: RemittanceTransaction = {
        ...formData,
        scope: formData.scope || (isMyanmarLogin ? 'DOMESTIC' : 'INTERNATIONAL'),
        senderIdType: isNrc ? 'NRC' : 'PASSPORT',
        senderNrcAttachment: formData.senderNrcFrontAttachment || formData.senderNrcAttachment,
        senderNrcAttachmentName: formData.senderNrcFrontAttachmentName || formData.senderNrcAttachmentName,
        senderNrcAttachmentType: formData.senderNrcFrontAttachmentType || formData.senderNrcAttachmentType,
        senderNrcAttachmentSize: formData.senderNrcFrontAttachmentSize || formData.senderNrcAttachmentSize,
        senderNrcFrontAttachment: formData.senderNrcFrontAttachment || formData.senderNrcAttachment,
        senderNrcFrontAttachmentName: formData.senderNrcFrontAttachmentName || formData.senderNrcAttachmentName,
        senderNrcFrontAttachmentType: formData.senderNrcFrontAttachmentType || formData.senderNrcAttachmentType,
        senderNrcFrontAttachmentSize: formData.senderNrcFrontAttachmentSize || formData.senderNrcAttachmentSize,
        senderNrcBackAttachment: formData.senderNrcBackAttachment,
        senderNrcBackAttachmentName: formData.senderNrcBackAttachmentName,
        senderNrcBackAttachmentType: formData.senderNrcBackAttachmentType,
        senderNrcBackAttachmentSize: formData.senderNrcBackAttachmentSize,
        senderPassport: isNrc ? formData.senderPassport : (formData.senderPassport || formData.senderPassbook),
        senderPassbook: isNrc ? formData.senderPassbook : (formData.senderPassport || formData.senderPassbook),
        senderPassportAttachment: formData.senderPassportAttachment || formData.senderPassbookAttachment,
        senderPassportAttachmentName: formData.senderPassportAttachmentName || formData.senderPassbookAttachmentName,
        senderPassportAttachmentType: formData.senderPassportAttachmentType || formData.senderPassbookAttachmentType,
        senderPassportAttachmentSize: formData.senderPassportAttachmentSize || formData.senderPassbookAttachmentSize,
        senderPassbookAttachment: formData.senderPassportAttachment || formData.senderPassbookAttachment,
        senderPassbookAttachmentName: formData.senderPassportAttachmentName || formData.senderPassbookAttachmentName,
        senderPassbookAttachmentType: formData.senderPassportAttachmentType || formData.senderPassbookAttachmentType,
        senderPassbookAttachmentSize: formData.senderPassportAttachmentSize || formData.senderPassbookAttachmentSize,
        blacklistAlert: !!senderBlacklistMatch || !!receiverBlacklistMatch
      };

      const success = await updateTransaction(updatedRecord, editReason || 'Updated via Outward Review & Edit');
      if (success) {
        setSuccessMessage(language === 'my' ? 'အချက်အလက်များကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ' : 'Transaction data successfully updated.');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 600);
        return true;
      } else {
        setErrorMessage('Could not update transaction.');
        return false;
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error updating transaction');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndApprove = async () => {
    if (!formData) return;

    const isNrc = (formData.senderIdType || 'NRC') === 'NRC';
    if (!formData.senderName.trim() || (isNrc ? !formData.senderNrc.trim() : !(formData.senderPassport || formData.senderPassbook)?.trim()) || !formData.receiverName.trim()) {
      setErrorMessage(language === 'my' ? 'လိုအပ်သော အချက်အလက်များ အပြည့်အစုံ ဖြည့်စွက်ပါ' : 'Please fill all required fields');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const updatedRecord: RemittanceTransaction = {
        ...formData,
        scope: formData.scope || (isMyanmarLogin ? 'DOMESTIC' : 'INTERNATIONAL'),
        senderIdType: isNrc ? 'NRC' : 'PASSPORT',
        senderNrcAttachment: formData.senderNrcFrontAttachment || formData.senderNrcAttachment,
        senderNrcAttachmentName: formData.senderNrcFrontAttachmentName || formData.senderNrcAttachmentName,
        senderNrcAttachmentType: formData.senderNrcFrontAttachmentType || formData.senderNrcAttachmentType,
        senderNrcAttachmentSize: formData.senderNrcFrontAttachmentSize || formData.senderNrcAttachmentSize,
        senderNrcFrontAttachment: formData.senderNrcFrontAttachment || formData.senderNrcAttachment,
        senderNrcFrontAttachmentName: formData.senderNrcFrontAttachmentName || formData.senderNrcAttachmentName,
        senderNrcFrontAttachmentType: formData.senderNrcFrontAttachmentType || formData.senderNrcAttachmentType,
        senderNrcFrontAttachmentSize: formData.senderNrcFrontAttachmentSize || formData.senderNrcAttachmentSize,
        senderNrcBackAttachment: formData.senderNrcBackAttachment,
        senderNrcBackAttachmentName: formData.senderNrcBackAttachmentName,
        senderNrcBackAttachmentType: formData.senderNrcBackAttachmentType,
        senderNrcBackAttachmentSize: formData.senderNrcBackAttachmentSize,
        senderPassport: isNrc ? formData.senderPassport : (formData.senderPassport || formData.senderPassbook),
        senderPassbook: isNrc ? formData.senderPassbook : (formData.senderPassport || formData.senderPassbook),
        senderPassportAttachment: formData.senderPassportAttachment || formData.senderPassbookAttachment,
        senderPassportAttachmentName: formData.senderPassportAttachmentName || formData.senderPassbookAttachmentName,
        senderPassportAttachmentType: formData.senderPassportAttachmentType || formData.senderPassbookAttachmentType,
        senderPassportAttachmentSize: formData.senderPassportAttachmentSize || formData.senderPassbookAttachmentSize,
        senderPassbookAttachment: formData.senderPassportAttachment || formData.senderPassbookAttachment,
        senderPassbookAttachmentName: formData.senderPassportAttachmentName || formData.senderPassbookAttachmentName,
        senderPassbookAttachmentType: formData.senderPassportAttachmentType || formData.senderPassbookAttachmentType,
        senderPassbookAttachmentSize: formData.senderPassportAttachmentSize || formData.senderPassbookAttachmentSize,
        blacklistAlert: !!senderBlacklistMatch || !!receiverBlacklistMatch
      };

      const success = await updateTransaction(updatedRecord, editReason || 'Edited and directly approved');
      if (success) {
        setSuccessMessage(language === 'my' ? 'အချက်အလက်များ ပြင်ဆင်ပြီး အတည်ပြုချက်သို့ ဆက်လက်ဆောင်ရွက်နေပါသည်...' : 'Updated, proceeding to approval...');
        setTimeout(() => {
          onApproveDirectly?.(updatedRecord);
          onClose();
        }, 500);
      } else {
        setErrorMessage('Could not update transaction before approval.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error in save & approve');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">
                  {language === 'my' ? 'ငွေလွှဲပို့မှု စိစစ် & အချက်အလက် ပြင်ဆင်ခြင်း' : 'Review & Edit Outward Remittance'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                  {formData.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-3 font-mono">
                <span>TX: <strong className="text-white">{formData.transactionNo}</strong></span>
                <span>•</span>
                <span>MTCN: <strong className="text-amber-400">{formData.mtcn}</strong></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Form */}
        <form onSubmit={handleSaveOnly} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          
          {/* Alerts & Messages */}
          {errorMessage && (
            <div className="bg-rose-950/60 border border-rose-500/60 rounded-xl p-3 flex items-center space-x-3 text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-xl p-3 flex items-center space-x-3 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Blacklist AML Alert Banner */}
          {(senderBlacklistMatch || receiverBlacklistMatch) ? (
            <div className="bg-rose-950/70 border-2 border-rose-500 rounded-xl p-3.5 flex items-start space-x-3 text-rose-200">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold text-rose-300">
                  {language === 'my' ? 'သတိပေးချက် - အမည်ပျက်စာရင်းနှင့် ကိုက်ညီနေပါသည်' : 'AML Screening Alert - Blacklist Match Detected'}
                </strong>
                <p className="text-xs text-rose-300/90 mt-0.5">
                  {senderBlacklistMatch && `Sender: ${senderBlacklistMatch.nameEn} (${senderBlacklistMatch.reason}) `}
                  {receiverBlacklistMatch && `Receiver: ${receiverBlacklistMatch.nameEn} (${receiverBlacklistMatch.reason})`}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5 flex items-center space-x-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{language === 'my' ? 'AML အမည်ပျက်စာရင်း စိစစ်ချက် ရှင်းလင်းပါသည် (Clean Record)' : 'AML Screening Passed - Clean Record'}</span>
            </div>
          )}

          {/* Remittance Scope & Country Default Status Control Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-bold">
                <Globe className="w-4 h-4 text-sky-400" />
                <span>{language === 'my' ? 'ငွေလွှဲအမျိုးအစား (Scope):' : 'Remittance Scope:'}</span>
              </div>
              <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormData(prev => prev ? { ...prev, scope: 'INTERNATIONAL' } : null)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    (formData.scope || 'INTERNATIONAL') === 'INTERNATIONAL'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'my' ? 'နိုင်ငံတကာ (International)' : 'International'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => prev ? { ...prev, scope: 'DOMESTIC' } : null)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    formData.scope === 'DOMESTIC'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'my' ? 'ပြည်တွင်း (Domestic)' : 'Domestic'}
                </button>
              </div>
            </div>

            {/* Default Status Policy Badge & Apply Button */}
            <div className="flex items-center space-x-2">
              <div 
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${
                  isMyanmarLogin 
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                }`}
                title={language === 'my' 
                  ? `မူရင်းသတ်မှတ်ချက်: ${isMyanmarLogin ? 'မြန်မာ Login ဖြစ်သဖြင့် Domestic & NRC' : 'နိုင်ငံခြား Login ဖြစ်သဖြင့် International & Passport'}`
                  : `Default Status Policy: ${isMyanmarLogin ? 'Myanmar Login -> Domestic & NRC' : 'Other Country Login -> International & Passport'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span>
                  {language === 'my' ? 'မူရင်း:' : 'Default:'} {isMyanmarLogin ? 'Domestic & NRC' : 'Intl & Passport'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleApplyDefaultStatus}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                title={language === 'my' ? 'နိုင်ငံအလိုက် မူရင်းသတ်မှတ်ချက်အတိုင်း ပြင်ဆင်မည်' : 'Apply country default status'}
              >
                ↺ {language === 'my' ? 'မူရင်းသတ်မှတ်မည်' : 'Apply Default'}
              </button>
            </div>
          </div>

          {/* Section 1: Sender Information */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 text-sm font-bold text-sky-400">
                <User className="w-4 h-4" />
                <span>{language === 'my' ? '၁။ ငွေလွှဲပို့သူ အချက်အလက် (Sender Information)' : '1. Sender Information'}</span>
              </div>
              <div className="inline-flex bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setFormData(prev => prev ? { ...prev, senderIdType: 'NRC' } : null)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    (formData.senderIdType || 'NRC') === 'NRC'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{language === 'my' ? 'မှတ်ပုံတင် (NRC)' : 'NRC'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => prev ? { ...prev, senderIdType: 'PASSPORT' } : null)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    formData.senderIdType === 'PASSPORT'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5 text-sky-300" />
                  <span>{language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : 'Passport'}</span>
                </button>
              </div>
            </div>

            {/* ID Document Switcher & Info Banner */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-sky-400" />
                  <span>
                    {language === 'my'
                      ? 'ငွေလွှဲပို့သူ သက်သေခံစာရွက်စာတမ်း အမျိုးအစား (Sender ID Type)'
                      : 'Sender Identification Document Type'}
                  </span>
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {(formData.senderIdType || 'NRC') === 'NRC'
                    ? (language === 'my' ? 'မှတ်ပုံတင် ရွေးချယ်ထားပါသည် - အောက်တွင် NRC အရှေ့ခြမ်းနှင့် အနောက်ခြမ်း ပူးတွဲကွက်များ ပေါ်လာပါမည်' : 'NRC selected - Front and Back NRC attachment boxes are displayed below')
                    : (language === 'my' ? 'Passport ရွေးချယ်ထားပါသည် - အောက်တွင် Passport ပူးတွဲကွက် ပေါ်လာပါမည်' : 'Passport selected - Passport document attachment box is displayed below')
                  }
                </p>
              </div>
              <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-700 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setFormData(prev => prev ? { ...prev, senderIdType: 'NRC' } : null)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    (formData.senderIdType || 'NRC') === 'NRC'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'မှတ်ပုံတင် (NRC)' : 'NRC Card'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => prev ? { ...prev, senderIdType: 'PASSPORT' } : null)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    formData.senderIdType === 'PASSPORT'
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : 'Passport'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ပို့သူ အမည် (Sender Name) *' : 'Sender Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.senderName}
                  onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              {(formData.senderIdType || 'NRC') === 'NRC' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-semibold">
                      {language === 'my' ? 'မှတ်ပုံတင်အမှတ် (Sender NRC) *' : 'Sender NRC *'}
                    </label>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      {language === 'my' ? 'ကတ်ပြား' : 'Card'}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.senderNrc}
                    onChange={(e) => setFormData({ ...formData, senderNrc: e.target.value })}
                    placeholder="12/BAHANA(N)184920"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-semibold">
                      {language === 'my' ? 'နိုင်ငံကူးလက်မှတ်အမှတ် (Passport No) *' : 'Sender Passport No *'}
                    </label>
                    <span className="text-[10px] text-sky-400 font-semibold">
                      {language === 'my' ? 'စာအုပ်' : 'Book'}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.senderPassport || formData.senderPassbook || ''}
                    onChange={(e) => setFormData({ ...formData, senderPassport: e.target.value, senderPassbook: e.target.value })}
                    placeholder="MA-918234"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ဖုန်းနံပါတ် (Phone)' : 'Sender Phone'}
                </label>
                <input
                  type="text"
                  value={formData.senderPhone || ''}
                  onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <span>{language === 'my' ? 'နေရပ်လိပ်စာ (Sender Address)' : 'Sender Address'}</span>
                    {formData.senderNrcBackAttachment && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-normal">
                        ✓ {language === 'my' ? 'NRC အနောက်ခြမ်းမှ' : 'From NRC Back'}
                      </span>
                    )}
                  </label>
                </div>
                <input
                  type="text"
                  value={formData.senderAddress || ''}
                  onChange={(e) => setFormData({ ...formData, senderAddress: e.target.value })}
                  placeholder="e.g. အလွမ်းဆွတ်ကျေးရွာ၊ သန်လျင်မြို့"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'အလုပ်အကိုင် (Occupation)' : 'Occupation'}
                </label>
                <input
                  type="text"
                  value={formData.senderOccupation || ''}
                  onChange={(e) => setFormData({ ...formData, senderOccupation: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ငွေကြေးရရှိရာလမ်းကြောင်း (Source of Funds)' : 'Source of Funds'}
                </label>
                <input
                  type="text"
                  value={formData.senderSourceOfFund || ''}
                  onChange={(e) => setFormData({ ...formData, senderSourceOfFund: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'အဘအမည် (Father Name)' : 'Father Name'}
                </label>
                <input
                  type="text"
                  value={formData.senderFatherName || ''}
                  onChange={(e) => setFormData({ ...formData, senderFatherName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <DobDatePicker
                  id="sender-dob-edit"
                  label={language === 'my' ? 'မွေးသက္ကရာဇ် (DOB)' : 'Date of Birth'}
                  placeholder="DD/MM/YYYY"
                  value={formData.senderDateOfBirth || ''}
                  onChange={(formattedDob) => setFormData({ ...formData, senderDateOfBirth: formattedDob })}
                  language={language}
                />
              </div>
            </div>

            {/* Sender Identity Document (NRC / Passport) Attachments */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Paperclip className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-slate-200">
                    {(formData.senderIdType || 'NRC') === 'NRC'
                      ? (language === 'my' ? 'ငွေလွှဲပို့သူ၏ မူရင်း မှတ်ပုံတင် (NRC) အရှေ့ / အနောက် ပူးတွဲဖိုင်များ' : "Sender's NRC Card (Front & Back) Attachments")
                      : (language === 'my' ? 'ငွေလွှဲပို့သူ၏ မူရင်း နိုင်ငံကူးလက်မှတ် (Passport) ပူးတွဲဖိုင်' : "Sender's Passport Document Attachment")
                    }
                  </span>
                </div>
                
                {/* ID Type Switcher & Action in Attachments Header */}
                <div className="flex flex-wrap items-center gap-2">
                  {(formData.senderIdType || 'NRC') === 'NRC' && (
                    <button
                      type="button"
                      onClick={handleAttachBothNrc}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{language === 'my' ? '⚡ ရှေ့/နောက် နှစ်ဖက်စလုံး အမြန်တွဲမည်' : '⚡ Attach Both Front & Back'}</span>
                    </button>
                  )}
                  <div className="inline-flex bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => prev ? { ...prev, senderIdType: 'NRC' } : null)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                        (formData.senderIdType || 'NRC') === 'NRC'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>{language === 'my' ? 'မှတ်ပုံတင် (Front & Back)' : 'NRC (Front & Back)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => prev ? { ...prev, senderIdType: 'PASSPORT' } : null)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                        formData.senderIdType === 'PASSPORT'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileCheck className="w-3 h-3" />
                      <span>{language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : 'Passport'}</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 hidden sm:block">
                    {language === 'my' ? 'JPG, PNG, PDF သို့မဟုတ် SVG' : 'JPG, PNG, PDF or SVG'}
                  </div>
                </div>
              </div>

              {/* OCR Function Checkbox (Default: Unchecked / Disabled) */}
              {(formData.senderIdType || 'NRC') === 'NRC' && (
                <div className={`p-2.5 rounded-xl border transition-all ${
                  isOcrEnabled
                    ? 'bg-emerald-950/40 border-emerald-500/50 shadow-xs'
                    : 'bg-slate-900/90 border-slate-800'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label htmlFor="edit-outward-ocr-checkbox" className="flex items-start sm:items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="edit-outward-ocr-checkbox"
                        checked={isOcrEnabled}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setIsOcrEnabled(val);
                          if (!val) {
                            setNrcOcrResult(null);
                            setIsScanningNrc(false);
                          }
                        }}
                        className="w-4 h-4 mt-0.5 sm:mt-0 rounded text-emerald-600 bg-slate-950 border-slate-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Sparkles className={`w-3.5 h-3.5 ${isOcrEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span>{language === 'my' ? 'AI OCR အလိုအလျောက် စာဖတ်စနစ် အသုံးပြုမည်' : 'Enable AI OCR Auto-Fill Function'}</span>
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {language === 'my'
                            ? 'အမှန်ခြစ်ထားပါက (ON) မှတ်ပုံတင်တင်သွင်းသည်နှင့် Auto ဖြည့်ပါမည်။ အမှန်ခြစ်ဖြုတ်ထားပါက (Default OFF) ဖိုင်သာတင်မည်ဖြစ်ပြီး OCR မလုပ်ပါ။'
                            : 'When checked (ON), uploaded NRC documents auto-fill fields. When unchecked (Default OFF), documents attach without OCR.'}
                        </p>
                      </div>
                    </label>

                    <div className="shrink-0 self-start sm:self-center">
                      {isOcrEnabled ? (
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{language === 'my' ? 'Status: ON (OCR အလုပ်လုပ်)' : 'Status: ON (OCR Active)'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          <span>{language === 'my' ? 'Status: OFF Default (No OCR)' : 'Status: OFF Default (No OCR)'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* OCR Scanning indicator */}
              {isScanningNrc && isOcrEnabled && (
                <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl p-2.5 text-amber-200 shadow-sm flex items-center justify-between animate-pulse">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span className="text-xs font-bold text-white">
                      {language === 'my'
                        ? '🔍 မှတ်ပုံတင်အား AI Vision OCR ဖြင့် ဖတ်ရှုနေပါသည်...'
                        : '🔍 Scanning NRC Card with AI OCR...'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded">
                    SCANNING
                  </span>
                </div>
              )}

              {/* Upload & Replace Feedback Banner */}
              {uploadFeedback && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">{uploadFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadFeedback(null)}
                    className="text-emerald-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* SENDER IDENTITY DOCUMENTS: WORDS AND ROWS (NO PICTURE FRAMES) */}
              <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
                {/* ROW 1: NRC FRONT */}
                <div className={`p-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  (formData.senderNrcFrontAttachment || formData.senderNrcAttachment) ? 'bg-emerald-950/20' : 'hover:bg-slate-850/50'
                }`}>
                  {/* Words: Document Name & Status */}
                  <div className="flex items-start sm:items-center space-x-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      (formData.senderNrcFrontAttachment || formData.senderNrcAttachment) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-white">
                          {language === 'my' ? 'မှတ်ပုံတင် (အရှေ့ခြမ်း)' : 'NRC Front'}
                        </span>
                        {(formData.senderIdType || 'NRC') === 'NRC' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                            {language === 'my' ? 'အဓိက ID' : 'Primary ID'}
                          </span>
                        )}
                        {(formData.senderNrcFrontAttachment || formData.senderNrcAttachment) ? (
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
                      {(formData.senderNrcFrontAttachment || formData.senderNrcAttachment) ? (
                        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                          <span className="truncate max-w-[200px] sm:max-w-[280px] text-slate-300" title={formData.senderNrcFrontAttachmentName || formData.senderNrcAttachmentName || 'Sender_NRC_Front.svg'}>
                            {formData.senderNrcFrontAttachmentName || formData.senderNrcAttachmentName || 'Sender_NRC_Front.svg'}
                          </span>
                          <span className="text-emerald-400 shrink-0 font-semibold">{formData.senderNrcFrontAttachmentSize || formData.senderNrcAttachmentSize || '18 KB'}</span>
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
                    {(formData.senderNrcFrontAttachment || formData.senderNrcAttachment) ? (
                      <>
                        {/* PREVIEW BUTTON (If Attached) */}
                        <button
                          type="button"
                          id="edit-preview-sender-nrc-front-btn"
                          onClick={() => setLightboxDoc({
                            isOpen: true,
                            title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ မှတ်ပုံတင် (အရှေ့ခြမ်း)' : "Sender's NRC Card (Front)",
                            url: formData.senderNrcFrontAttachment || formData.senderNrcAttachment,
                            name: formData.senderNrcFrontAttachmentName || formData.senderNrcAttachmentName || 'Sender_NRC_Front.svg',
                            type: formData.senderNrcFrontAttachmentType || formData.senderNrcAttachmentType || 'image/svg+xml',
                            size: formData.senderNrcFrontAttachmentSize || formData.senderNrcAttachmentSize || '18 KB',
                            idNumber: formData.senderNrc,
                            sender: formData.senderName
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
                          id="edit-remove-sender-nrc-front-btn"
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
                          id="edit-sample-sender-nrc-front-btn"
                          onClick={() => handleAttachSample('nrc-front')}
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
                  formData.senderNrcBackAttachment ? 'bg-emerald-950/20' : 'hover:bg-slate-850/50'
                }`}>
                  {/* Words: Document Name & Status */}
                  <div className="flex items-start sm:items-center space-x-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      formData.senderNrcBackAttachment ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-white">
                          {language === 'my' ? 'မှတ်ပုံတင် (အနောက်ခြမ်း)' : 'NRC Back'}
                        </span>
                        {(formData.senderIdType || 'NRC') === 'NRC' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                            {language === 'my' ? 'အဓိက ID' : 'Primary ID'}
                          </span>
                        )}
                        {formData.senderNrcBackAttachment ? (
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
                      {formData.senderNrcBackAttachment ? (
                        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                          <span className="truncate max-w-[200px] sm:max-w-[280px] text-slate-300" title={formData.senderNrcBackAttachmentName || 'Sender_NRC_Back.svg'}>
                            {formData.senderNrcBackAttachmentName || 'Sender_NRC_Back.svg'}
                          </span>
                          <span className="text-emerald-400 shrink-0 font-semibold">{formData.senderNrcBackAttachmentSize || '16 KB'}</span>
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
                    {formData.senderNrcBackAttachment ? (
                      <>
                        {/* PREVIEW BUTTON (If Attached) */}
                        <button
                          type="button"
                          id="edit-preview-sender-nrc-back-btn"
                          onClick={() => setLightboxDoc({
                            isOpen: true,
                            title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ မှတ်ပုံတင် (အနောက်ခြမ်း)' : "Sender's NRC Card (Back)",
                            url: formData.senderNrcBackAttachment,
                            name: formData.senderNrcBackAttachmentName || 'Sender_NRC_Back.svg',
                            type: formData.senderNrcBackAttachmentType || 'image/svg+xml',
                            size: formData.senderNrcBackAttachmentSize || '16 KB',
                            idNumber: formData.senderNrc,
                            sender: formData.senderName
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
                          id="edit-remove-sender-nrc-back-btn"
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
                          id="edit-sample-sender-nrc-back-btn"
                          onClick={() => handleAttachSample('nrc-back')}
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
                  (formData.senderPassportAttachment || formData.senderPassbookAttachment) ? 'bg-sky-950/20' : 'hover:bg-slate-850/50'
                }`}>
                  {/* Words: Document Name & Status */}
                  <div className="flex items-start sm:items-center space-x-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      (formData.senderPassportAttachment || formData.senderPassbookAttachment) ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-white">
                          {language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : 'Passport'}
                        </span>
                        {formData.senderIdType === 'PASSPORT' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                            {language === 'my' ? 'အဓိက ID' : 'Primary ID'}
                          </span>
                        )}
                        {(formData.senderPassportAttachment || formData.senderPassbookAttachment) ? (
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
                      {(formData.senderPassportAttachment || formData.senderPassbookAttachment) ? (
                        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                          <span className="truncate max-w-[200px] sm:max-w-[280px] text-slate-300" title={formData.senderPassportAttachmentName || formData.senderPassbookAttachmentName || 'Sender_Passport.svg'}>
                            {formData.senderPassportAttachmentName || formData.senderPassbookAttachmentName || 'Sender_Passport.svg'}
                          </span>
                          <span className="text-sky-400 shrink-0 font-semibold">{formData.senderPassportAttachmentSize || formData.senderPassbookAttachmentSize || '24 KB'}</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          {language === 'my' ? 'နိုင်ငံကူးလက်မှတ် ဖိုင် (JPG, PNG, PDF, SVG)' : 'Passport document file (JPG, PNG, PDF, SVG)'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: If Attached show Preview Button */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {(formData.senderPassportAttachment || formData.senderPassbookAttachment) ? (
                      <>
                        {/* PREVIEW BUTTON (If Attached) */}
                        <button
                          type="button"
                          id="edit-preview-sender-passport-btn"
                          onClick={() => setLightboxDoc({
                            isOpen: true,
                            title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ နိုင်ငံကူးလက်မှတ် (Passport)' : "Sender's Passport Document",
                            url: formData.senderPassportAttachment || formData.senderPassbookAttachment,
                            name: formData.senderPassportAttachmentName || formData.senderPassbookAttachmentName || 'Sender_Passport.svg',
                            type: formData.senderPassportAttachmentType || formData.senderPassbookAttachmentType || 'image/svg+xml',
                            size: formData.senderPassportAttachmentSize || formData.senderPassbookAttachmentSize || '24 KB',
                            idNumber: formData.senderPassport || formData.senderPassbook,
                            sender: formData.senderName
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
                          id="edit-remove-sender-passport-btn"
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
                          id="edit-sample-sender-passport-btn"
                          onClick={() => handleAttachSample('passport')}
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

                {/* ROW 4: BANK DEPOSIT SLIP VOUCHER */}
                <div className={`p-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  formData.proofDocumentUrl ? 'bg-sky-950/20' : 'hover:bg-slate-850/50'
                }`}>
                  {/* Words: Document Name & Status */}
                  <div className="flex items-start sm:items-center space-x-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      formData.proofDocumentUrl ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-white">
                          {language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ (Deposit Slip Voucher)' : 'Bank Deposit Slip Voucher'}
                        </span>
                        {formData.proofDocumentUrl ? (
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
                      {formData.proofDocumentUrl ? (
                        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                          <span className="truncate max-w-[200px] sm:max-w-[280px] text-slate-300" title={formData.proofDocumentName || 'Deposit_Receipt_Voucher.svg'}>
                            {formData.proofDocumentName || 'Deposit_Receipt_Voucher.svg'}
                          </span>
                          <span className="text-sky-400 shrink-0 font-semibold">{formData.proofDocumentSize || '22.5 KB'}</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          {language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ ဘောက်ချာ ဖိုင် (JPG, PNG, PDF, SVG)' : 'Bank Cash Deposit Receipt or Voucher (JPG, PNG, PDF, SVG)'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: If Attached show Preview Button */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {formData.proofDocumentUrl ? (
                      <>
                        {/* PREVIEW BUTTON (If Attached) */}
                        <button
                          type="button"
                          id="edit-preview-deposit-slip-btn"
                          onClick={() => setLightboxDoc({
                            isOpen: true,
                            title: language === 'my' ? 'ဘဏ်ငွေသွင်းပြေစာ (Bank Cash Deposit Receipt)' : 'Bank Cash Deposit Receipt Voucher',
                            url: formData.proofDocumentUrl,
                            name: formData.proofDocumentName || 'Deposit_Slip_Voucher.svg',
                            type: formData.proofDocumentType || 'image/svg+xml',
                            size: formData.proofDocumentSize || '22.5 KB',
                            idNumber: formData.senderNrc || 'Cash Deposit',
                            sender: formData.senderName
                          })}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02]"
                          title={language === 'my' ? 'အသေးစိတ် ကြည့်ရှုရန်' : 'Preview Attached Document'}
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-400" />
                          <span>Preview</span>
                        </button>

                        {/* Replace Button */}
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

                        {/* Remove Button */}
                        <button
                          type="button"
                          id="edit-remove-deposit-slip-btn"
                          onClick={() => handleRemoveDoc('deposit')}
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
                          id="edit-sample-deposit-slip-btn"
                          onClick={() => handleAttachSample('deposit')}
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
                            onChange={(e) => handleUploadFile(e, 'deposit')}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Receiver Information */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-indigo-400 border-b border-slate-800 pb-2">
              <Globe className="w-4 h-4" />
              <span>{language === 'my' ? '၂။ ငွေလက်ခံသူ အချက်အလက် (Receiver Information)' : '2. Receiver Information'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'လက်ခံသူ အမည် (Receiver Name) *' : 'Receiver Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.receiverName}
                  onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'လက်ခံသူ ဖုန်းနံပါတ် (Phone)' : 'Receiver Phone'}
                </label>
                <input
                  type="text"
                  value={formData.receiverPhone || ''}
                  onChange={(e) => setFormData({ ...formData, receiverPhone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ပို့ဆောင်မည့် နိုင်ငံ (Destination Country) *' : 'Destination Country *'}
                </label>
                <select
                  value={formData.receiverCountryCode}
                  onChange={(e) => setFormData({ ...formData, receiverCountryCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  {db.countries.map(c => (
                    <option key={c.id} value={c.code}>
                      {c.flagEmoji} {c.nameEn} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'လက်ခံသူ လိပ်စာ (Receiver Address)' : 'Receiver Address'}
                </label>
                <input
                  type="text"
                  value={formData.receiverAddress || ''}
                  onChange={(e) => setFormData({ ...formData, receiverAddress: e.target.value })}
                  placeholder="Street, City, Country..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'တော်စပ်ပုံ (Relationship)' : 'Relationship'}
                </label>
                <input
                  type="text"
                  value={formData.receiverRelationship || ''}
                  onChange={(e) => setFormData({ ...formData, receiverRelationship: e.target.value })}
                  placeholder="Family, Business, Friend..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'လက်ခံမည့် ဘဏ် (Bank Name)' : 'Payout Bank Name'}
                </label>
                <input
                  type="text"
                  value={formData.payoutBankName || ''}
                  onChange={(e) => setFormData({ ...formData, payoutBankName: e.target.value })}
                  placeholder="Kasikorn, SCB, KBZ, etc."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ဘဏ်စာရင်းအမှတ် (Account Number)' : 'Account / Wallet Number'}
                </label>
                <input
                  type="text"
                  value={formData.payoutAccountNumber || ''}
                  onChange={(e) => setFormData({ ...formData, payoutAccountNumber: e.target.value })}
                  placeholder="Bank Account or Mobile Wallet number"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financial & Remittance Details */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2">
              <Building2 className="w-4 h-4" />
              <span>{language === 'my' ? '၃။ ငွေလွှဲပမာဏနှင့် ဆောင်ရွက်သည့်ဘဏ်ခွဲ (Remittance & Financials)' : '3. Remittance & Financial Details'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'လွှဲပို့ဆောင်ရွက်သည့် ဘဏ်ခွဲ (Sending Branch) *' : 'Sending Branch *'}
                </label>
                <select
                  value={formData.sendingBranchId || ''}
                  onChange={(e) => setFormData({ ...formData, sendingBranchId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {db.branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.nameEn} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'မိတ်ဖက်ကုမ္ပဏီ (Partner Company) *' : 'Partner Company *'}
                </label>
                <select
                  value={formData.partnerCompanyId || ''}
                  onChange={(e) => setFormData({ ...formData, partnerCompanyId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {db.companies.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.nameEn} ({comp.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'လွှဲပို့ရည်ရွယ်ချက် (Purpose)' : 'Remittance Purpose'}
                </label>
                <select
                  value={formData.purposeId || ''}
                  onChange={(e) => {
                    const found = db.purposes.find(p => p.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      purposeId: e.target.value,
                      purposeName: found ? found.nameEn : formData.purposeName
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {db.purposes.map(purp => (
                    <option key={purp.id} value={purp.id}>
                      {purp.nameEn} ({purp.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sending Amount */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'လွှဲပို့ငွေပမာဏ (Send Amount) *' : 'Send Amount *'}
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-700 focus-within:border-emerald-500">
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.sendAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      handleAmountRateChange(
                        val,
                        formData.exchangeRate,
                        formData.sourceCurrency,
                        formData.targetCurrency,
                        formData.serviceFee,
                        formData.commissionFee
                      );
                    }}
                    className="w-full bg-slate-900 px-3 py-2 text-white font-mono font-bold focus:outline-none"
                  />
                  <span className="bg-slate-800 px-3 py-2 text-slate-300 font-mono font-bold flex items-center border-l border-slate-700">
                    {formData.sourceCurrency}
                  </span>
                </div>
              </div>

              {/* Exchange Rate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-semibold">
                    {language === 'my' ? 'ငွေလဲနှုန်း (Exchange Rate) *' : 'Exchange Rate *'}
                  </label>
                  {formData.sourceCurrency !== formData.targetCurrency && (
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      1 {formData.sourceCurrency === 'MMK' ? formData.targetCurrency : formData.sourceCurrency} = {formData.exchangeRate} MMK
                    </span>
                  )}
                </div>
                <div className="flex rounded-lg overflow-hidden border border-slate-700 focus-within:border-emerald-500">
                  <input
                    type="number"
                    step="0.0001"
                    required
                    min={0.0001}
                    value={formData.exchangeRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      handleAmountRateChange(
                        formData.sendAmount,
                        val,
                        formData.sourceCurrency,
                        formData.targetCurrency,
                        formData.serviceFee,
                        formData.commissionFee
                      );
                    }}
                    className="w-full bg-slate-900 px-3 py-2 text-white font-mono font-bold focus:outline-none"
                  />
                  <span className="bg-slate-800 px-3 py-2 text-slate-300 font-mono font-bold flex items-center border-l border-slate-700">
                    {formData.sourceCurrency === formData.targetCurrency ? formData.targetCurrency : 'MMK'}
                  </span>
                </div>
              </div>

              {/* Receive Amount */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'လက်ခံရရှိမည့်ငွေ (Receive Amount)' : 'Receive Amount'}
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                  <input
                    type="number"
                    readOnly
                    value={formData.receiveAmount}
                    className="w-full bg-slate-900 px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none"
                  />
                  <span className="bg-slate-800 px-3 py-2 text-emerald-400 font-mono font-bold flex items-center border-l border-slate-700">
                    {formData.targetCurrency}
                  </span>
                </div>
              </div>

              {/* Service Fee */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ဝန်ဆောင်ခ (Service Fee)' : 'Service Fee'}
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-700 focus-within:border-emerald-500">
                  <input
                    type="number"
                    value={formData.serviceFee}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      handleAmountRateChange(
                        formData.sendAmount,
                        formData.exchangeRate,
                        formData.sourceCurrency,
                        formData.targetCurrency,
                        val,
                        formData.commissionFee
                      );
                    }}
                    className="w-full bg-slate-900 px-3 py-2 text-white font-mono focus:outline-none"
                  />
                  <span className="bg-slate-800 px-3 py-2 text-slate-300 font-mono font-bold flex items-center border-l border-slate-700">
                    {formData.sourceCurrency}
                  </span>
                </div>
              </div>

              {/* Commission Fee */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ကော်မရှင်ကြေး (Commission Fee)' : 'Commission Fee'}
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-700 focus-within:border-emerald-500">
                  <input
                    type="number"
                    value={formData.commissionFee}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      handleAmountRateChange(
                        formData.sendAmount,
                        formData.exchangeRate,
                        formData.sourceCurrency,
                        formData.targetCurrency,
                        formData.serviceFee,
                        val
                      );
                    }}
                    className="w-full bg-slate-900 px-3 py-2 text-white font-mono focus:outline-none"
                  />
                  <span className="bg-slate-800 px-3 py-2 text-slate-300 font-mono font-bold flex items-center border-l border-slate-700">
                    {formData.sourceCurrency}
                  </span>
                </div>
              </div>

              {/* Total Payable */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'စုစုပေါင်း ပေးသွင်းငွေ (Total Payable)' : 'Total Payable'}
                </label>
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-amber-400 font-mono font-bold text-sm">
                  {formData.totalPayableAmount.toLocaleString()} {formData.sourceCurrency}
                </div>
              </div>
            </div>

            {/* Detailed Branch Information Banner */}
            {(() => {
              const b = db.branches.find(br => br.id === formData.sendingBranchId) || db.branches[0];
              if (!b) return null;
              return (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-start space-x-2.5">
                    <Building2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">
                          {language === 'my' && b.nameMm ? `${b.nameMm} (${b.nameEn})` : b.nameEn}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono text-[10px] font-bold">
                          {b.code}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[11px] mt-1">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-sky-400" />
                          <span>{b.address}, {b.city}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-sky-400" />
                          <span className="font-mono text-slate-300">{b.phone}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 shrink-0 border-t sm:border-t-0 pt-1 sm:pt-0 sm:border-l border-slate-800 sm:pl-3">
                    <span className="text-slate-500 block">{language === 'my' ? 'မန်နေဂျာ' : 'Manager'}</span>
                    <span className="font-bold text-slate-200">{b.managerName}</span>
                  </div>
                </div>
              );
            })()}

            {/* Note / Remarks */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {language === 'my' ? 'မှတ်ချက် (Maker / Sender Note)' : 'Maker / Sender Note'}
              </label>
              <input
                type="text"
                value={formData.senderNote || ''}
                onChange={(e) => setFormData({ ...formData, senderNote: e.target.value })}
                placeholder="Additional instructions or notes..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 4: Correction Reason / Audit Note */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <label className="block text-slate-300 font-semibold">
              {language === 'my' ? 'အချက်အလက် ပြင်ဆင်ရသည့် အကြောင်းပြချက် (Reason for Correction) *' : 'Reason for Correction / Audit Remark *'}
            </label>
            <input
              type="text"
              required
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder={language === 'my' ? 'ဥပမာ - စာလုံးပေါင်းမှားယွင်းမှု ပြင်ဆင်ခြင်း၊ လိပ်စာဖြည့်စွက်ခြင်း...' : 'e.g. Corrected spelling of beneficiary, updated exchange rate adjustment...'}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-500 block">
              {language === 'my' 
                ? 'လုပ်ငန်းစစ်ဆေးမှု သမိုင်းမှတ်တမ်း (Audit Trail) အတွက် အကြောင်းပြချက်ကို မှတ်တမ်းတင်ပါမည်။' 
                : 'This reason will be recorded permanently in the system audit trail logs.'}
            </span>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-colors"
            >
              {t.cancel}
            </button>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSaving 
                    ? (language === 'my' ? 'သိမ်းဆည်းနေပါသည်...' : 'Saving...') 
                    : (language === 'my' ? 'အချက်အလက် ပြင်ဆင်သိမ်းမည်' : 'Save Changes')}
                </span>
              </button>

              {onApproveDirectly && formData.status === 'PENDING_APPROVAL' && (
                <button
                  type="button"
                  onClick={handleSaveAndApprove}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>
                    {language === 'my' ? 'ပြင်ဆင်ပြီး ချက်ချင်း အတည်ပြုမည်' : 'Save & Approve'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

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
    </div>
  );
};
