import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  UploadCloud, 
  Paperclip, 
  Eye, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2,
  Globe,
  User,
  CreditCard,
  Building2,
  MapPin,
  Phone
} from 'lucide-react';
import { RemittanceTransaction, PayoutMethod } from '../../types';
import { useRemittance } from '../../lib/store';
import { uploadPassportToSupabase } from '../../lib/supabase';

interface EditInwardModalProps {
  isOpen: boolean;
  transaction: RemittanceTransaction | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditInwardModal: React.FC<EditInwardModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSuccess
}) => {
  const { db, language, t, updateTransaction, checkBlacklist } = useRemittance();

  const [formData, setFormData] = useState<RemittanceTransaction | null>(null);
  const [editReason, setEditReason] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Synchronize form when transaction changes or modal opens
  useEffect(() => {
    if (transaction) {
      setFormData({ ...transaction });
      setEditReason('');
      setErrorMessage('');
      setSuccessMessage('');
    } else {
      setFormData(null);
    }
  }, [transaction, isOpen]);

  if (!isOpen || !formData) return null;

  // Real-time screening on Beneficiary
  const beneficiaryBlacklistMatch = checkBlacklist(
    formData.receiverNrc || '',
    formData.receiverPassport || formData.receiverPassbook || '',
    formData.receiverName || ''
  );

  // Auto-calculate receive amount if send amount or exchange rate is altered
  const handleAmountChange = (sendAmount: number, rate: number) => {
    const receive = Math.round(sendAmount * rate);
    setFormData(prev => prev ? {
      ...prev,
      sendAmount,
      exchangeRate: rate,
      receiveAmount: receive,
      totalPayableAmount: receive
    } : null);
  };

  const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage('');

    try {
      const res = await uploadPassportToSupabase(db.supabaseConfig, file, 'inward_passports');
      if (res.success && res.url) {
        setFormData(prev => prev ? {
          ...prev,
          senderPassportAttachment: res.url,
          senderPassportAttachmentName: file.name,
          senderPassportAttachmentType: file.type,
          senderPassportAttachmentSize: `${(file.size / 1024).toFixed(1)} KB`,
          // Backwards compatibility alias
          senderPassbookAttachment: res.url,
          senderPassbookAttachmentName: file.name,
          senderPassbookAttachmentType: file.type,
          senderPassbookAttachmentSize: `${(file.size / 1024).toFixed(1)} KB`,
        } : null);
      } else {
        setErrorMessage(res.error || 'Failed to upload passport attachment.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePassportAttachment = () => {
    setFormData(prev => prev ? {
      ...prev,
      senderPassportAttachment: undefined,
      senderPassportAttachmentName: undefined,
      senderPassportAttachmentType: undefined,
      senderPassportAttachmentSize: undefined,
      senderPassbookAttachment: undefined,
      senderPassbookAttachmentName: undefined,
      senderPassbookAttachmentType: undefined,
      senderPassbookAttachmentSize: undefined,
    } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    if (!formData.receiverName.trim()) {
      setErrorMessage(language === 'my' ? 'ငွေထုတ်ယူသူအမည် ထည့်သွင်းရန် လိုအပ်ပါသည်' : 'Beneficiary name is required');
      return;
    }
    if (!formData.receiverNrc.trim()) {
      setErrorMessage(language === 'my' ? 'ငွေထုတ်ယူသူ မှတ်ပုံတင် ထည့်သွင်းရန် လိုအပ်ပါသည်' : 'Beneficiary NRC is required');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const updatedRecord: RemittanceTransaction = {
        ...formData,
        senderPassport: formData.senderPassport || formData.senderPassbook,
        senderPassbook: formData.senderPassport || formData.senderPassbook,
        receiverPassport: formData.receiverPassport || formData.receiverPassbook,
        receiverPassbook: formData.receiverPassport || formData.receiverPassbook,
        blacklistAlert: !!beneficiaryBlacklistMatch,
      };

      const success = await updateTransaction(updatedRecord, editReason);
      if (success) {
        setSuccessMessage(language === 'my' ? 'အချက်အလက်များကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ' : 'Transaction data successfully updated.');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 800);
      } else {
        setErrorMessage('Could not update transaction.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error updating transaction');
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
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">
                  {language === 'my' ? 'ငွေလွှဲထုတ်ယူမှု အချက်အလက်များ ပြင်ဆင်ခြင်း' : 'Edit Inward Remittance Claim'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  MTCN: {formData.mtcn}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                  {formData.transactionNo}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'my' 
                  ? 'အချက်အလက် အမှားအယွင်းများကို ပြင်ဆင်ပြီး အတည်ပြုချက်အတွက် ပြန်လည်သိမ်းဆည်းပါ' 
                  : 'Correct input mistakes before approving and authorizing payout'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-200">
          
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-xl text-rose-200 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-xl text-emerald-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Blacklist Warning */}
          {beneficiaryBlacklistMatch && (
            <div className="bg-rose-950/90 border-2 border-rose-600 rounded-xl p-4 text-rose-200 space-y-1">
              <div className="flex items-center space-x-2 font-bold text-sm text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>🚨 {language === 'my' ? 'သတိပေးချက်: အမည်ပျက်စာရင်း (Blacklist Match) တွေ့ရှိရပါသည်' : 'CRITICAL WARNING: Blacklist Match Detected'}</span>
              </div>
              <p className="text-xs text-rose-200">
                {beneficiaryBlacklistMatch.fullNameEn} ({beneficiaryBlacklistMatch.fullNameMm}) - NRC: {beneficiaryBlacklistMatch.nrcNumber}
                {' • '} Risk Level: <strong className="text-white">{beneficiaryBlacklistMatch.riskLevel}</strong>
              </p>
              <p className="text-[11px] text-rose-300 italic">
                Reason: "{beneficiaryBlacklistMatch.reason}"
              </p>
            </div>
          )}

          {/* Section 1: Beneficiary Information */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-teal-400 border-b border-slate-800 pb-2">
              <User className="w-4 h-4" />
              <span>{language === 'my' ? '၁။ ငွေထုတ်ယူသူ ပြည်တွင်းအချက်အလက် (Beneficiary Information)' : '1. Beneficiary / Receiver Information'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ငွေထုတ်ယူသူအမည် (အင်္ဂလိပ်) *' : 'Beneficiary Name (English) *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.receiverName || ''}
                  onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                  placeholder="e.g. U Kyaw Moe Thu"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ငွေထုတ်ယူသူအမည် (မြန်မာ)' : 'Beneficiary Name (Myanmar)'}
                </label>
                <input
                  type="text"
                  value={formData.receiverNameMm || ''}
                  onChange={(e) => setFormData({ ...formData, receiverNameMm: e.target.value })}
                  placeholder="e.g. ဦးကျော်မိုးသူ"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'နိုင်ငံသားစိစစ်ရေးကတ် (NRC) *' : 'Beneficiary NRC *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.receiverNrc || ''}
                  onChange={(e) => setFormData({ ...formData, receiverNrc: e.target.value })}
                  placeholder="12/DAGANA(N)192840"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'နိုင်ငံကူးလက်မှတ် နံပါတ် (Passport No)' : 'Beneficiary Passport No'}
                </label>
                <input
                  type="text"
                  value={formData.receiverPassport || formData.receiverPassbook || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    receiverPassport: e.target.value,
                    receiverPassbook: e.target.value 
                  })}
                  placeholder="MN-102948"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ဖုန်းနံပါတ် *' : 'Beneficiary Phone *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.receiverPhone || ''}
                  onChange={(e) => setFormData({ ...formData, receiverPhone: e.target.value })}
                  placeholder="09-xxxxxxxxx"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'နေရပ်လိပ်စာ' : 'Beneficiary Address'}
                </label>
                <input
                  type="text"
                  value={formData.receiverAddress || ''}
                  onChange={(e) => setFormData({ ...formData, receiverAddress: e.target.value })}
                  placeholder="No. 123, Bogyoke Road, Yangon"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Sender Information */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-amber-400 border-b border-slate-800 pb-2">
              <Globe className="w-4 h-4" />
              <span>{language === 'my' ? '၂။ ပြည်ပငွေလွှဲပို့သူ အချက်အလက် (Origin Sender Information)' : '2. Origin Sender Information'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ငွေလွှဲပို့သူအမည် *' : 'Sender Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.senderName || ''}
                  onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                  placeholder="e.g. John Doe / Ko Min Min"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'လွှဲပို့သည့် နိုင်ငံ *' : 'Origin Country *'}
                </label>
                <select
                  value={formData.senderCountryCode || 'TH'}
                  onChange={(e) => setFormData({ ...formData, senderCountryCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                >
                  {db.countries.map(c => (
                    <option key={c.id} value={c.code}>
                      {c.code} - {c.nameEn} ({c.nameMm})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ပို့သူ နိုင်ငံကူးလက်မှတ် နံပါတ် (Sender Passport No)' : 'Sender Passport Number'}
                </label>
                <input
                  type="text"
                  value={formData.senderPassport || formData.senderPassbook || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    senderPassport: e.target.value,
                    senderPassbook: e.target.value 
                  })}
                  placeholder="MB-102948"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ပို့သူ ဖုန်းနံပါတ်' : 'Sender Phone Number'}
                </label>
                <input
                  type="text"
                  value={formData.senderPhone || ''}
                  onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                  placeholder="+66-81-234-5678"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Passport Attachment */}
              <div className="md:col-span-2">
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ပူးတွဲနိုင်ငံကူးလက်မှတ် ဖိုင် (Sender Passport Attachment)' : 'Sender Passport Attachment'}
                </label>
                
                {(formData.senderPassportAttachment || formData.senderPassbookAttachment) ? (
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl p-3">
                    <div className="flex items-center space-x-2">
                      <Paperclip className="w-4 h-4 text-teal-400" />
                      <div>
                        <span className="font-semibold text-slate-200 block text-xs truncate max-w-xs sm:max-w-md">
                          {formData.senderPassportAttachmentName || formData.senderPassbookAttachmentName || 'Sender_Passport_Document'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formData.senderPassportAttachmentSize || formData.senderPassbookAttachmentSize || ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={formData.senderPassportAttachment || formData.senderPassbookAttachment}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-400 flex items-center space-x-1 text-[11px] font-bold"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{language === 'my' ? 'ကြည့်ရှုမည်' : 'View'}</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleRemovePassportAttachment}
                        className="p-1 rounded text-rose-400 hover:bg-rose-950 hover:text-rose-300"
                        title="Remove Attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-xl p-3 text-center transition-colors">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handlePassportUpload}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex items-center justify-center space-x-2 text-slate-400">
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                          <span>{language === 'my' ? 'ဖိုင်တင်နေပါသည်...' : 'Uploading passport...'}</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4 text-teal-400" />
                          <span>
                            {language === 'my' 
                              ? 'နိုင်ငံကူးလက်မှတ် ဖိုင်အသစ် ရွေးချယ်တင်ရန် နှိပ်ပါ (သို့မဟုတ် ဖိုင်ဆွဲထည့်ပါ)' 
                              : 'Click or drag & drop to upload/replace Sender Passport (Image / PDF)'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Financial & Payout Details */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2">
              <Building2 className="w-4 h-4" />
              <span>{language === 'my' ? '၃။ ငွေလွှဲငွေပမာဏနှင့် ထုတ်ယူမည့်ပုံစံ (Remittance & Payout Details)' : '3. Remittance & Payout Details'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  {language === 'my' ? 'လွှဲပို့ငွေကြေး (Source Currency)' : 'Source Currency'}
                </label>
                <select
                  value={formData.sourceCurrency || 'USD'}
                  onChange={(e) => setFormData({ ...formData, sourceCurrency: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {db.currencies.map(curr => (
                    <option key={curr.id} value={curr.code}>
                      {curr.code} - {curr.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'လွှဲငွေပမာဏ (Send Amount) *' : 'Send Amount *'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={formData.sendAmount || ''}
                  onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0, formData.exchangeRate || 1)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'လဲလှယ်နှုန်း (Exchange Rate) *' : 'Exchange Rate *'}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={formData.exchangeRate || ''}
                  onChange={(e) => handleAmountChange(formData.sendAmount || 0, parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ထုတ်ပေးငွေ (Payout MMK) *' : 'Payout Amount (MMK) *'}
                </label>
                <input
                  type="number"
                  required
                  value={formData.receiveAmount || ''}
                  onChange={(e) => setFormData({ ...formData, receiveAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ထုတ်ယူမည့် ပုံစံ (Payout Method)' : 'Payout Method'}
                </label>
                <select
                  value={formData.payoutMethod}
                  onChange={(e) => setFormData({ ...formData, payoutMethod: e.target.value as PayoutMethod })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="CASH_PICKUP">Cash Pickup (ငွေသားတိုက်ရိုက်ထုတ်ယူခြင်း)</option>
                  <option value="BANK_ACCOUNT">Bank Deposit (ဘဏ်စာရင်းသို့ လွှဲပြောင်းပေးခြင်း)</option>
                </select>
              </div>

              {formData.payoutMethod === 'BANK_ACCOUNT' && (
                <>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      {language === 'my' ? 'လက်ခံမည့် ဘဏ်အမည် *' : 'Payout Bank Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.payoutBankName || ''}
                      onChange={(e) => setFormData({ ...formData, payoutBankName: e.target.value })}
                      placeholder="e.g. KBZ Bank / AYA Bank"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      {language === 'my' ? 'ဘဏ်အကောင့်နံပါတ် *' : 'Payout Account No *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.payoutAccountNumber || ''}
                      onChange={(e) => setFormData({ ...formData, payoutAccountNumber: e.target.value })}
                      placeholder="e.g. 091-102-3918239"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {language === 'my' ? 'ငွေထုတ်ပေးမည့် ဘဏ်ခွဲ' : 'Payout Branch'}
                </label>
                <select
                  value={formData.payoutBranchId || ''}
                  onChange={(e) => setFormData({ ...formData, payoutBranchId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {db.branches.map(br => (
                    <option key={br.id} value={br.id}>
                      {br.nameEn} ({br.code})
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
            </div>

            {/* Detailed Branch Information Banner */}
            {(() => {
              const b = db.branches.find(br => br.id === formData.payoutBranchId) || db.branches[0];
              if (!b) return null;
              return (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-start space-x-2.5">
                    <Building2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">
                          {language === 'my' && b.nameMm ? `${b.nameMm} (${b.nameEn})` : b.nameEn}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-[10px] font-bold">
                          {b.code}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[11px] mt-1">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>{b.address}, {b.city}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-emerald-400" />
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
          </div>

          {/* Section 4: Correction Reason / Audit Note */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <label className="block text-slate-300 font-semibold">
              {t.editReasonLabel}
            </label>
            <textarea
              rows={2}
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder={language === 'my' ? 'ဥပမာ - မှတ်ပုံတင်ဂဏန်း အမှားပြင်ဆင်ခြင်း၊ နိုင်ငံကူးလက်မှတ် ပူးတွဲဖိုင် အသစ်ပြန်တင်ခြင်း...' : 'e.g. Beneficiary NRC number corrected, updated passport attachment...'}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold flex items-center space-x-2 shadow-lg shadow-teal-900/30 transition-all hover:scale-[1.02]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'my' ? 'သိမ်းဆည်းနေပါသည်...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t.save}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
