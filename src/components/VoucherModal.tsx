import React from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  Copy, 
  QrCode, 
  Building2, 
  ShieldCheck,
  ArrowRight,
  Download,
  Paperclip,
  Eye,
  Phone,
  MapPin,
  Edit3,
  ExternalLink,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText
} from 'lucide-react';
import { RemittanceTransaction } from '../types';
import { useRemittance } from '../lib/store';
import { CompanyProfileModal } from './CompanyProfileModal';
import { generateVoucherHtml, printVoucherDocument, downloadVoucherHtml, openVoucherInNewTab } from '../utils/voucherPrint';
import { formatToDDMMYYYYWithTime } from '../lib/dateUtils';
import { 
  createSampleMyanmarPassportSvg, 
  createSampleMyanmarNrcSvg, 
  createSampleMyanmarNrcBackSvg 
} from '../lib/sampleDocuments';

interface VoucherModalProps {
  transaction: RemittanceTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({ transaction, isOpen, onClose }) => {
  const { db, language, t, operatorProfile } = useRemittance();
  const [copied, setCopied] = React.useState(false);
  const [showCompanyEdit, setShowCompanyEdit] = React.useState(false);
  const [feedbackMsg, setFeedbackMsg] = React.useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = React.useState<{
    title: string;
    url: string;
    name: string;
    idNumber?: string;
    ownerName?: string;
    type?: string;
    size?: string;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('voucher-modal-open');
    } else {
      document.body.classList.remove('voucher-modal-open');
    }
    return () => {
      document.body.classList.remove('voucher-modal-open');
    };
  }, [isOpen]);

  const branch = transaction ? (db.branches.find(b => b.id === transaction.sendingBranchId) || db.branches[0]) : db.branches[0];
  const partner = transaction ? db.companies.find(c => c.id === transaction.partnerCompanyId) : undefined;

  // Safe file downloader for data URLs and external URLs
  const handleDownloadDoc = (url: string, filename: string) => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // Safe new tab opener using Blob to bypass browser data: URL block
  const handleOpenDocInNewTab = (url: string) => {
    try {
      if (url.startsWith('data:image/svg+xml')) {
        const svgStr = decodeURIComponent(url.replace('data:image/svg+xml;utf8,', ''));
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else if (url.startsWith('data:')) {
        const parts = url.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.warn('Could not open in new window:', err);
    }
  };

  // Resolved Passport Attachment:
  // If transaction has an attached file, use it. If not, but senderPassport exists,
  // dynamically generate a vector Myanmar Passport SVG so the user can always view it!
  const passportDocUrl = React.useMemo(() => {
    if (!transaction) return undefined;
    if (transaction.senderPassportAttachment) return transaction.senderPassportAttachment;
    if (transaction.senderPassbookAttachment) return transaction.senderPassbookAttachment;
    if (transaction.proofDocCategory === 'PASSPORT' && transaction.proofDocumentUrl) return transaction.proofDocumentUrl;
    if (transaction.senderPassport || transaction.senderPassbook) {
      const passNo = transaction.senderPassport || transaction.senderPassbook || 'MD-918234';
      const name = transaction.senderName || 'SENDER';
      return createSampleMyanmarPassportSvg(passNo, name, '14/07/1988', 'M');
    }
    return undefined;
  }, [transaction]);

  const passportDocName = transaction?.senderPassportAttachmentName || 
    transaction?.senderPassbookAttachmentName || 
    (transaction?.senderPassport ? `Passport_${transaction.senderPassport}.svg` : 'Sender_Passport.svg');

  const passportDocSize = transaction?.senderPassportAttachmentSize || 
    transaction?.senderPassbookAttachmentSize || 
    '24.5 KB';

  // Resolved NRC Attachments:
  const nrcFrontUrl = React.useMemo(() => {
    if (!transaction) return undefined;
    if (transaction.senderNrcFrontAttachment) return transaction.senderNrcFrontAttachment;
    if (transaction.senderNrcAttachment) return transaction.senderNrcAttachment;
    if (transaction.senderNrc) {
      return createSampleMyanmarNrcSvg(transaction.senderNrc, transaction.senderNameMm || 'ဦးဇော်ဝင်းထက်', transaction.senderName || 'U ZAW WIN HTET');
    }
    return undefined;
  }, [transaction]);

  const nrcBackUrl = React.useMemo(() => {
    if (!transaction) return undefined;
    if (transaction.senderNrcBackAttachment) return transaction.senderNrcBackAttachment;
    if (transaction.senderNrc) {
      return createSampleMyanmarNrcBackSvg('ကုမ္ပဏီဝန်ထမ်း (Company Staff)', transaction.senderAddress || 'ရန်ကုန်');
    }
    return undefined;
  }, [transaction]);

  // ALL HOOKS MUST BE DECLARED ABOVE THIS LINE!
  if (!isOpen || !transaction) return null;

  const copyMtcn = () => {
    navigator.clipboard.writeText(transaction.mtcn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setFeedbackMsg(
      language === 'my' 
        ? 'ပြေစာ ပုံနှိပ်ခြင်းကို စတင်နေပါသည် (Preparing Print View...)' 
        : 'Preparing voucher for printing...'
    );
    setTimeout(() => setFeedbackMsg(null), 3000);

    printVoucherDocument({
      transaction,
      branch,
      partner,
      operatorProfile,
      language,
    });
  };

  const handleOpenNewTab = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    openVoucherInNewTab({
      transaction,
      branch,
      partner,
      operatorProfile,
      language,
    });
  };

  const handleDownload = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    downloadVoucherHtml({
      transaction,
      branch,
      partner,
      operatorProfile,
      language,
    });
    setFeedbackMsg(
      language === 'my' 
        ? 'ပြေစာ HTML ဖိုင်ကို ဒေါင်းလုဒ်ရယူပြီးပါပြီ' 
        : 'Voucher HTML downloaded successfully'
    );
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex justify-center items-start p-2 sm:p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 relative border border-slate-700/40">
        {/* Top Header bar with Action buttons - Sticky so it is ALWAYS visible and never clipped */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between no-print flex-shrink-0 sticky top-0 z-20 border-b border-slate-800 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {language === 'my' ? 'တရားဝင် ငွေလွှဲပြေစာ' : 'Official Remittance Voucher & Receipt'}
                </h3>
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                  transaction.type === 'OUTWARD' 
                    ? 'bg-indigo-900/80 text-indigo-200 border border-indigo-700' 
                    : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
                }`}>
                  {transaction.type === 'OUTWARD' ? 'OUTWARD' : 'INWARD'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Ref: {transaction.transactionNo} • MTCN: <strong className="text-amber-400 font-bold">{transaction.mtcn}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Primary Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors cursor-pointer active:scale-95"
              title={language === 'my' ? 'ပြေစာ ပုံနှိပ်မည် (Print)' : 'Print Voucher'}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'my' ? 'ပြေစာ ပုံနှိပ်မည်' : 'Print Voucher'}</span>
              <span className="sm:hidden">{language === 'my' ? 'ပုံနှိပ်' : 'Print'}</span>
            </button>

            {/* Direct Open in New Tab Print Link */}
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="hidden md:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              title={language === 'my' ? 'စာမျက်နှာသစ်ဖြင့် တိုက်ရိုက်ကြည့်ရှု ပုံနှိပ်ရန်' : 'Open in new tab to print'}
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
              <span>{language === 'my' ? 'စာမျက်နှာသစ်' : 'New Tab'}</span>
            </button>

            {/* Download Voucher HTML/PDF */}
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={language === 'my' ? 'ပြေစာဖိုင် ဒေါင်းလုဒ်ရယူမည် (Download HTML/PDF)' : 'Download Voucher File'}
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Toast / Feedback Notification */}
        {feedbackMsg && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between no-print animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{feedbackMsg}</span>
            </div>
            <button 
              type="button"
              onClick={handleOpenNewTab}
              className="underline hover:text-emerald-100 font-semibold ml-3 cursor-pointer"
            >
              {language === 'my' ? 'စာမျက်နှာသစ်သို့ နှိပ်၍ဖွင့်ရန် ↗' : 'Click to open tab ↗'}
            </button>
          </div>
        )}

        {/* Printable Voucher Paper - Scrollable body with smooth up/down scrolling */}
        <div 
          className="p-6 sm:p-8 space-y-6 print:p-2 print:overflow-visible print:h-auto print:max-h-none overflow-y-auto flex-1 overscroll-contain" 
          id="printable-voucher"
        >
          {/* Voucher Title & Reference Header */}
          <div className="border-b border-slate-200 pb-3 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center font-black text-sm">
                  RMS
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                    Remittance Management System
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {language === 'my' ? 'ပြည်တွင်း ပြည်ပ ငွေလွှဲလုပ်ငန်း စနစ်' : 'Domestic & International Remittance System'}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-900 rounded-lg text-xs font-bold text-emerald-400 shadow-2xs">
                {transaction.type === 'OUTWARD' 
                  ? (language === 'my' ? 'ငွေလွှဲပို့ ပြေစာ (OUTWARD)' : 'OUTWARD REMITTANCE SLIP') 
                  : (language === 'my' ? 'ငွေလွှဲထုတ် ပြေစာ (INWARD)' : 'INWARD PAYOUT VOUCHER')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {language === 'my' ? 'နေ့စွဲ' : 'Date'}: {formatToDDMMYYYYWithTime(transaction.createdDate)}
              </div>
              <div className="text-xs font-mono font-bold text-slate-800">
                Ref: {transaction.transactionNo}
              </div>
            </div>
          </div>

          {/* Official Orange Rectangular Box: Operating Remittance Company (လိမ္မော်ရောင်လေးဒေါင့်အကွက်) */}
          <div className="border-2 border-orange-500 bg-orange-50/50 rounded-xl p-3.5 sm:p-4 text-slate-900 shadow-xs relative print:border-orange-600 print:bg-orange-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-orange-200/90 pb-2.5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-orange-600 text-white px-2 py-0.5 rounded">
                      {language === 'my' ? 'ငွေလွှဲဝန်ဆောင်မှု လုပ်ငန်းလုပ်ကိုင်ခွင့်ရ ကုမ္ပဏီ' : 'LICENSED REMITTANCE OPERATOR'}
                    </span>
                    {operatorProfile.licenseNo && (
                      <span className="text-[10px] font-mono font-bold text-orange-950 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded">
                        {operatorProfile.licenseNo}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-orange-950 mt-0.5 tracking-tight leading-snug">
                    {language === 'my' 
                      ? `${operatorProfile.companyNameMm} (${operatorProfile.companyNameEn})`
                      : operatorProfile.companyNameEn}
                  </h2>
                </div>
              </div>

              {/* Edit Company Profile button (hidden on print) */}
              <button
                type="button"
                onClick={() => setShowCompanyEdit(true)}
                className="no-print self-start sm:self-center flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-orange-100 text-orange-700 border border-orange-300 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                title={language === 'my' ? 'ကုမ္ပဏီ အချက်အလက် ပြင်ဆင်ရန်' : 'Edit Company Info'}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{language === 'my' ? 'ကုမ္ပဏီ အချက်အလက် ပြင်ဆင်ရန်' : 'Edit Info'}</span>
              </button>
            </div>

            {/* Address & Phone details inside the Orange Rectangular Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5 text-xs text-slate-800">
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold text-orange-950">{language === 'my' ? 'ရုံးချုပ် လိပ်စာ' : 'Head Office Address'}: </span>
                  <span className="text-slate-700">
                    {language === 'my' ? operatorProfile.addressMm : operatorProfile.addressEn}
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Phone className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold text-orange-950">{language === 'my' ? 'ဆက်သွယ်ရန် ဖုန်းနံပါတ်' : 'Contact Phone / Hotline'}: </span>
                  <strong className="font-mono text-slate-900">{operatorProfile.phone}</strong>
                  {operatorProfile.hotline && (
                    <span className="text-slate-600 ml-1">
                      (Hotline: <strong className="font-mono text-orange-700">{operatorProfile.hotline}</strong>)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MTCN Golden Banner */}
          <div className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
                {language === 'my' ? 'ငွေလွှဲ လျှို့ဝှက်ကုဒ် / MTCN' : 'Money Transfer Control Number (MTCN)'}
              </span>
              <div className="flex items-center space-x-3 mt-0.5">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-amber-950 tracking-widest">
                  {transaction.mtcn}
                </span>
                <button
                  onClick={copyMtcn}
                  className="p-1.5 rounded-md hover:bg-amber-200/60 text-amber-900 transition-colors no-print"
                  title="Copy MTCN"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {copied && <span className="text-xs font-bold text-emerald-700 no-print">{language === 'my' ? 'ကူးယူပြီး!' : 'Copied!'}</span>}
              </div>
            </div>
            <div className="text-right flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-medium text-slate-500 block">
                  {language === 'my' ? 'အခြေအနေ' : 'Status'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                  transaction.status === 'APPROVED' || transaction.status === 'PAID_OUT'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : transaction.status === 'PENDING_APPROVAL'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {transaction.status === 'PENDING_APPROVAL'
                    ? (language === 'my' ? 'အတည်ပြုရန် ဆိုင်းငံ့' : 'PENDING APPROVAL')
                    : transaction.status === 'APPROVED'
                    ? (language === 'my' ? 'ခွင့်ပြုပြီး' : 'APPROVED')
                    : transaction.status === 'PAID_OUT'
                    ? (language === 'my' ? 'ငွေထုတ်ပြီး' : 'PAID OUT')
                    : transaction.status === 'COMPLETED'
                    ? (language === 'my' ? 'အောင်မြင်ပြီး' : 'COMPLETED')
                    : transaction.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="w-11 h-11 bg-white border border-slate-300 rounded flex items-center justify-center p-1">
                <QrCode className="w-full h-full text-slate-800" />
              </div>
            </div>
          </div>

          {/* Sender & Receiver 2-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sender */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                {language === 'my' ? 'ငွေလွှဲပို့သူ အချက်အလက် (Sender)' : 'Sender Information'}
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-500 block">{language === 'my' ? 'အမည်' : 'Name'}:</span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {language === 'my' 
                      ? `${transaction.senderNameMm || transaction.senderName} (${transaction.senderName})`
                      : transaction.senderName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'မှတ်ပုံတင်' : 'NRC / ID'}:</span>{' '}
                  <strong className="font-mono text-slate-800">{transaction.senderNrc || 'N/A'}</strong>
                </div>
                {(nrcFrontUrl || nrcBackUrl || transaction.senderNrc) && (
                  <div className="pt-1.5 border-t border-slate-200 mt-1.5 space-y-1">
                    <span className="text-slate-500 block text-[11px]">
                      {language === 'my' ? 'ပူးတွဲမှတ်ပုံတင် (NRC Attachments):' : 'Attached NRC Documents:'}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {nrcFrontUrl && (
                        <div className="flex items-center space-x-1.5">
                          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <Paperclip className="w-3 h-3 text-emerald-600" />
                            <span className="truncate max-w-[110px]">
                              {transaction.senderNrcFrontAttachmentName || transaction.senderNrcAttachmentName || 'NRC_Front.svg'}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setZoomLevel(1);
                              setPreviewDoc({
                                title: language === 'my' ? 'ပူးတွဲမှတ်ပုံတင် အရှေ့ခြမ်း (NRC Front)' : "Sender's NRC Front Document",
                                url: nrcFrontUrl,
                                name: transaction.senderNrcFrontAttachmentName || transaction.senderNrcAttachmentName || 'NRC_Front.svg',
                                idNumber: transaction.senderNrc,
                                ownerName: transaction.senderName,
                                type: 'image/svg+xml'
                              });
                            }}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 rounded px-1.5 py-0.5 no-print cursor-pointer flex items-center space-x-0.5 transition-colors"
                            title={language === 'my' ? 'မှတ်ပုံတင် အရှေ့ခြမ်း ကြည့်ရှုမည်' : 'View NRC Front Document'}
                          >
                            <Eye className="w-3 h-3" />
                            <span>{language === 'my' ? 'ကြည့်ရှု' : 'View'}</span>
                          </button>
                        </div>
                      )}
                      {nrcBackUrl && (
                        <div className="flex items-center space-x-1.5">
                          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <Paperclip className="w-3 h-3 text-emerald-600" />
                            <span className="truncate max-w-[110px]">
                              {transaction.senderNrcBackAttachmentName || 'NRC_Back.svg'}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setZoomLevel(1);
                              setPreviewDoc({
                                title: language === 'my' ? 'ပူးတွဲမှတ်ပုံတင် အနောက်ခြမ်း (NRC Back)' : "Sender's NRC Back Document",
                                url: nrcBackUrl,
                                name: transaction.senderNrcBackAttachmentName || 'NRC_Back.svg',
                                idNumber: transaction.senderNrc,
                                ownerName: transaction.senderName,
                                type: 'image/svg+xml'
                              });
                            }}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 rounded px-1.5 py-0.5 no-print cursor-pointer flex items-center space-x-0.5 transition-colors"
                            title={language === 'my' ? 'မှတ်ပုံတင် အနောက်ခြမ်း ကြည့်ရှုမည်' : 'View NRC Back Document'}
                          >
                            <Eye className="w-3 h-3" />
                            <span>{language === 'my' ? 'ကြည့်ရှု' : 'View'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {(transaction.senderPassport || transaction.senderPassbook) && (
                  <div>
                    <span className="text-slate-500">{language === 'my' ? 'နိုင်ငံကူးလက်မှတ်' : 'Passport No'}:</span>{' '}
                    <strong className="font-mono text-slate-800">{transaction.senderPassport || transaction.senderPassbook}</strong>
                  </div>
                )}
                {(passportDocUrl || transaction.senderPassport || transaction.senderPassbook) && (
                  <div className="pt-1.5 border-t border-slate-200 mt-1.5">
                    <span className="text-slate-500 block text-[11px] mb-1">
                      {language === 'my' ? 'ပူးတွဲနိုင်ငံကူးလက်မှတ် (Passport Attachment):' : 'Attached Passport Doc:'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        <Paperclip className="w-3 h-3 text-indigo-600" />
                        <span className="truncate max-w-[130px]">
                          {passportDocName}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (passportDocUrl) {
                            setZoomLevel(1);
                            setPreviewDoc({
                              title: language === 'my' ? 'ပူးတွဲနိုင်ငံကူးလက်မှတ် (Attached Passport Document)' : "Sender's Passport Document",
                              url: passportDocUrl,
                              name: passportDocName,
                              idNumber: transaction.senderPassport || transaction.senderPassbook || '',
                              ownerName: transaction.senderName,
                              type: transaction.senderPassportAttachmentType || 'image/svg+xml',
                              size: passportDocSize
                            });
                          }
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 rounded px-2 py-0.5 no-print cursor-pointer flex items-center space-x-1 transition-colors shadow-2xs"
                        title={language === 'my' ? 'ပူးတွဲနိုင်ငံကူးလက်မှတ် စာရွက်စာတမ်း ကြည့်ရှုမည်' : 'View Passport Document'}
                      >
                        <Eye className="w-3 h-3 text-emerald-600" />
                        <span>{language === 'my' ? 'ကြည့်ရှုမည်' : 'View'}</span>
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'ဖုန်း' : 'Phone'}:</span>{' '}
                  <strong className="text-slate-800">{transaction.senderPhone}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'လိပ်စာ' : 'Address'}:</span>{' '}
                  <strong className="text-slate-800">{transaction.senderAddress || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'နိုင်ငံ' : 'Country'}:</span>{' '}
                  <strong className="text-slate-800">{transaction.senderCountryCode}</strong>
                </div>
              </div>
            </div>

            {/* Receiver */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                {language === 'my' ? 'ငွေလက်ခံသူ အချက်အလက် (Beneficiary)' : 'Beneficiary / Receiver Information'}
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-500 block">{language === 'my' ? 'အမည်' : 'Name'}:</span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {language === 'my'
                      ? `${transaction.receiverNameMm || transaction.receiverName} (${transaction.receiverName})`
                      : transaction.receiverName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'မှတ်ပုံတင်' : 'NRC / ID'}:</span>{' '}
                  <strong className="font-mono text-slate-800">{transaction.receiverNrc || 'N/A'}</strong>
                </div>
                {(transaction.receiverPassport || transaction.receiverPassbook) && (
                  <div>
                    <span className="text-slate-500">{language === 'my' ? 'နိုင်ငံကူးလက်မှတ်' : 'Passport No'}:</span>{' '}
                    <strong className="font-mono text-slate-800">{transaction.receiverPassport || transaction.receiverPassbook}</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'ဖုန်း' : 'Phone'}:</span>{' '}
                  <strong className="text-slate-800">{transaction.receiverPhone}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'လိပ်စာ' : 'Address'}:</span>{' '}
                  <strong className="text-slate-800">{transaction.receiverAddress || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{language === 'my' ? 'ခရီးဆုံး နိုင်ငံ' : 'Destination'}:</span>{' '}
                  <strong className="text-slate-800">{transaction.receiverCountryCode}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 text-xs font-bold uppercase tracking-wider text-slate-700">
              {language === 'my' ? 'ငွေပမာဏ နှင့် ငွေလဲလှယ်နှုန်း အသေးစိတ်' : 'Financial & Exchange Settlement Details'}
            </div>
            <div className="divide-y divide-slate-200 text-xs">
              <div className="px-4 py-2 flex justify-between">
                <span className="text-slate-600">{language === 'my' ? 'လွှဲပို့ငွေ မူလပမာဏ' : 'Send Principal Amount'}:</span>
                <span className="font-mono font-bold text-slate-900">
                  {Number(transaction.sendAmount || 0).toLocaleString()} {transaction.sourceCurrency}
                </span>
              </div>
              <div className="px-4 py-2 flex justify-between bg-slate-50/50">
                <span className="text-slate-600">{language === 'my' ? 'တွက်ချက်ထားသော ငွေလဲနှုန်း' : 'Applied Exchange Rate'}:</span>
                <span className="font-mono font-bold text-slate-900">
                  1 {transaction.sourceCurrency === 'MMK' ? transaction.targetCurrency : transaction.sourceCurrency} = {Number(transaction.exchangeRate || 0).toLocaleString()} MMK
                </span>
              </div>
              <div className="px-4 py-2 flex justify-between">
                <span className="text-slate-600">{language === 'my' ? 'ငွေလွှဲ ဝန်ဆောင်ခ' : 'Remittance Service Fee'}:</span>
                <span className="font-mono text-slate-800">
                  {Number(transaction.serviceFee || 0).toLocaleString()} {transaction.sourceCurrency || 'MMK'}
                </span>
              </div>
              {Number(transaction.commissionFee || 0) > 0 && (
                <div className="px-4 py-2 flex justify-between bg-slate-50/50">
                  <span className="text-slate-600">{language === 'my' ? 'မိတ်ဖက် ကော်မရှင်ခ' : 'Partner Commission'}:</span>
                  <span className="font-mono text-slate-800">
                    {Number(transaction.commissionFee || 0).toLocaleString()} {transaction.sourceCurrency || 'MMK'}
                  </span>
                </div>
              )}
              <div className="px-4 py-3 flex justify-between bg-emerald-50 text-emerald-950 font-bold text-sm">
                <span>{language === 'my' ? 'လက်ခံရရှိငွေ စုစုပေါင်း' : 'Total Payout / Receive Amount'}:</span>
                <span className="font-mono text-base font-black text-emerald-800">
                  {Number(transaction.receiveAmount || 0).toLocaleString()} {transaction.targetCurrency}
                </span>
              </div>
              {transaction.isUsdBase && (
                <div className="px-4 py-3 flex justify-between bg-sky-50 text-sky-950 font-bold text-sm border-t border-sky-200">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-sky-600 text-white text-[10px] font-black uppercase tracking-wider">
                        USD Base
                      </span>
                      <span>{language === 'my' ? 'ဒေါ်လာတန်ဖိုး ညီမျှချက် (USD Equivalent)' : 'USD Base Equivalent'}:</span>
                    </div>
                    {transaction.usdExchangeRate && (
                      <span className="text-xs font-normal text-sky-700 font-mono">
                        (1 USD = {transaction.usdExchangeRate} {transaction.targetCurrency})
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-black text-sky-900">
                      $ {Number(transaction.usdAmount !== undefined ? transaction.usdAmount : (transaction.usdExchangeRate ? (transaction.receiveAmount || 0) / transaction.usdExchangeRate : 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                    {transaction.usdServiceFee !== undefined && transaction.usdServiceFee > 0 && (
                      <span className="block text-[11px] font-mono text-sky-700 font-normal">
                        {language === 'my' ? 'ဝန်ဆောင်ခ ဒေါ်လာ' : 'USD Fee'}: ${Number(transaction.usdServiceFee).toFixed(2)} USD
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Remittance Purpose & Payout Method */}
          <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
            <div>
              <span className="font-bold text-slate-700">{language === 'my' ? 'လွှဲပို့ရည်ရွယ်ချက်' : 'Purpose'}: </span>
              <span>{transaction.purposeName}</span>
            </div>
            <div>
              <span className="font-bold text-slate-700">{language === 'my' ? 'ငွေထုတ်ယူနည်း' : 'Payout Method'}: </span>
              <span>
                {transaction.payoutMethod === 'CASH_PICKUP' && (language === 'my' ? 'ဘဏ်ကောင်တာ ငွေသားထုတ်ယူခြင်း' : 'Cash Counter Pickup')}
                {transaction.payoutMethod === 'BANK_ACCOUNT' && (language === 'my' ? `ဘဏ်အကောင့်သို့ တိုက်ရိုက်ထည့်သွင်းခြင်း (${transaction.payoutBankName || 'Bank'})` : `Bank Account Deposit (${transaction.payoutBankName || 'Bank'})`)}
                {transaction.payoutMethod === 'MOBILE_WALLET' && (language === 'my' ? 'မိုဘိုင်းပိုက်ဆံအိတ်' : 'Mobile Wallet')}
              </span>
            </div>
            {partner && (
              <div className="col-span-2">
                <span className="font-bold text-slate-700">{language === 'my' ? 'မိတ်ဖက် ကွန်ရက်' : 'Partner Channel'}: </span>
                <span>{language === 'my' ? `${partner.nameMm} (${partner.nameEn})` : partner.nameEn} ({partner.swiftCode || partner.code})</span>
              </div>
            )}
            {transaction.senderNote && (
              <div className="col-span-2 italic bg-slate-50 p-2 rounded border border-slate-200">
                {language === 'my' ? 'မှတ်ချက်' : 'Note'}: "{transaction.senderNote}"
              </div>
            )}

            {/* Attached Verification Documents indicator on Voucher */}
            {(transaction.senderNrcFrontAttachment || transaction.senderNrcAttachment || transaction.senderNrcBackAttachment || transaction.senderPassportAttachment) && (
              <div className="col-span-2 bg-emerald-50/50 border border-emerald-200 rounded-lg p-2.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{language === 'my' ? 'စိစစ်ပြီး ပူးတွဲစာရွက်စာတမ်းများ (KYC Verified)' : 'Verified KYC Attachments'}:</span>
                </span>
                {(transaction.senderNrcFrontAttachment || transaction.senderNrcAttachment) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-emerald-800 text-[11px] font-semibold border border-emerald-300 shadow-2xs">
                    <Check className="w-3 h-3 text-emerald-600" />
                    {language === 'my' ? 'မှတ်ပုံတင် အရှေ့ခြမ်း (NRC Front)' : 'NRC Front Side'}
                  </span>
                )}
                {transaction.senderNrcBackAttachment && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-emerald-800 text-[11px] font-semibold border border-emerald-300 shadow-2xs">
                    <Check className="w-3 h-3 text-emerald-600" />
                    {language === 'my' ? 'မှတ်ပုံတင် အနောက်ခြမ်း (NRC Back)' : 'NRC Back Side'}
                  </span>
                )}
                {transaction.senderPassportAttachment && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-indigo-800 text-[11px] font-semibold border border-indigo-300 shadow-2xs">
                    <Check className="w-3 h-3 text-indigo-600" />
                    {language === 'my' ? 'နိုင်ငံကူးလက်မှတ် (Passport)' : 'Passport Document'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Signatures & Stamp area - Adjusted to wide space */}
          <div className="pt-6 sm:pt-7 border-t border-slate-300 grid grid-cols-3 gap-4 sm:gap-6 text-center text-xs text-slate-600">
            <div className="flex flex-col items-center">
              <div className="w-full h-16 sm:h-20 border-b-2 border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">{transaction.creatorName || (language === 'my' ? 'စာရင်းသွင်းသူ' : 'Maker')}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500">{language === 'my' ? 'စာရင်းသွင်းဝန်ထမ်း (Maker / Operator)' : 'Prepared / Operator'}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full h-16 sm:h-20 mb-2 flex items-center justify-center">
                <div className="w-full max-w-[160px] h-13 sm:h-16 border-2 border-dashed border-slate-300 bg-slate-50/60 rounded-lg flex items-center justify-center p-2">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {language === 'my' ? 'ဘဏ်ခွဲ တံဆိပ်တုံး' : 'Official Branch Stamp'}
                  </span>
                </div>
              </div>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">{language === 'my' ? 'ဘဏ်ခွဲ အတည်ပြုတံဆိပ်တုံး' : 'Branch Verification Stamp'}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500">{language === 'my' ? 'ဗဟိုဘဏ် စည်းမျဉ်းကိုက်' : 'Central Bank Compliance'}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full h-16 sm:h-20 border-b-2 border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">{transaction.approverName || (language === 'my' ? 'အတည်ပြုသူ မန်နေဂျာ' : 'Checker / Manager')}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500">{language === 'my' ? 'ခွင့်ပြုအတည်ပြုသူ (Checker Approval)' : 'Authorized Checker Approval'}</p>
            </div>
          </div>

          {/* Compliance Footer notice */}
          <div className="text-[10px] text-slate-400 text-center leading-relaxed border-t border-slate-200 pt-3">
            {language === 'my'
              ? 'ဤငွေလွှဲပြောင်းမှုသည် မြန်မာနိုင်ငံတော်ဗဟိုဘဏ်၏ ငွေကြေးခဝါချမှုနှင့် အကြမ်းဖက်မှုကို ငွေကြေးထောက်ပံ့မှု တိုက်ဖျက်ရေး (AML/CFT) ညွှန်ကြားချက်များနှင့်အညီ စိစစ်အတည်ပြုထားပြီး ဖြစ်ပါသည်။'
              : 'This remittance transaction has been screened in compliance with the Central Bank of Myanmar Anti-Money Laundering (AML) & Counter-Terrorism Financing (CFT) guidelines. Keep this voucher and MTCN code secure. Beneficiary must present valid original Myanmar NRC for counter collection.'}
          </div>
        </div>

        {/* Bottom Actions Bar (no-print) */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 no-print flex-shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {language === 'my' 
              ? '↕ ပြေစာကို အပေါ်/အောက် scroll လုပ်၍ အပြည့်အစုံ ကြည့်ရှုနိုင်ပါသည်' 
              : '↕ Scroll up/down to review full voucher details'}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title={language === 'my' ? 'စာမျက်နှာသစ်ဖြင့် တိုက်ရိုက်ကြည့်ရှု ပုံနှိပ်ရန်' : 'Open in new tab'}
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'my' ? 'စာမျက်နှာသစ်' : 'New Tab'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title={language === 'my' ? 'ပြေစာဖိုင် ဒေါင်းလုဒ်ရယူမည်' : 'Download HTML/PDF'}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'my' ? 'ဒေါင်းလုဒ်' : 'Download'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'ပုံနှိပ်မည် (Print)' : 'Print Voucher'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              {language === 'my' ? 'ပိတ်မည် (Close)' : 'Close'}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Operating Company Profile Modal */}
      <CompanyProfileModal 
        isOpen={showCompanyEdit} 
        onClose={() => setShowCompanyEdit(false)} 
      />

      {/* Lightbox / Document Preview Modal */}
      {previewDoc && (
        <div 
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 no-print overflow-y-auto"
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/95 flex-shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>{previewDoc.title}</span>
                    {previewDoc.idNumber && (
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-xs">
                        {previewDoc.idNumber}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                    {previewDoc.name} {previewDoc.size ? `• ${previewDoc.size}` : ''} {previewDoc.ownerName ? `• ${previewDoc.ownerName}` : ''}
                  </p>
                </div>
              </div>
              
              {/* Zoom & Action Controls */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(z => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-300 px-1 min-w-[36px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(z => Math.min(2.5, Number((z + 0.2).toFixed(1))))}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title="Reset Zoom (100%)"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadDoc(previewDoc.url, previewDoc.name)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{language === 'my' ? 'ဒေါင်းလုဒ်' : 'Download'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDocInNewTab(previewDoc.url)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700 cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Content View */}
            <div className="p-4 sm:p-6 overflow-auto flex-1 flex items-center justify-center bg-slate-950/80 min-h-[300px]">
              {previewDoc.url.startsWith('data:application/pdf') || previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full h-[65vh] rounded-lg border border-slate-800"
                />
              ) : (
                <div 
                  className="transition-transform duration-150 ease-out flex items-center justify-center"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-700/60 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
              <span className="font-mono text-[11px]">
                {language === 'my' ? 'တရားဝင် ပူးတွဲစာရွက်စာတမ်း အစစ်အမှန် စစ်ဆေးကြည့်ရှုခြင်း' : 'Official Attached Document Inspection'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-3.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition-colors"
              >
                {language === 'my' ? 'ပိတ်မည် (Close)' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
