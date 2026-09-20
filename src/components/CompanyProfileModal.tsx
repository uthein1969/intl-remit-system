import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  X, 
  Save, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Mail, 
  Globe, 
  CheckCircle2,
  Sparkles,
  FileText,
  RotateCcw
} from 'lucide-react';
import { useRemittance } from '../lib/store';
import { OperatorProfile } from '../types';
import { defaultOperatorProfile } from '../lib/mockData';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({ isOpen, onClose }) => {
  const { operatorProfile, updateOperatorProfile, language } = useRemittance();

  const [formData, setFormData] = useState<OperatorProfile>(operatorProfile);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(operatorProfile);
      setSavedSuccess(false);
    }
  }, [isOpen, operatorProfile]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOperatorProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex justify-center items-center p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {language === 'my' ? 'ဆော့ဖ်ဝဲလ် အသုံးပြုသည့် ကုမ္ပဏီ အချက်အလက်' : 'Operating Remittance Company Profile'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'my' 
                  ? 'လိမ္မော်ရောင်လေးဒေါင့်အကွက်နှင့် ပြေစာများတွင် ဖော်ပြမည့် ကုမ္ပဏီ အမည်၊ လိပ်စာ၊ ဖုန်းနံပါတ်' 
                  : 'Company Name, Address & Phone displayed in the Orange Box & Vouchers'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Live Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                {language === 'my' ? 'လိမ္မော်ရောင်လေးဒေါင့်အကွက် နမူနာ (Live Orange Box Preview)' : 'Live Orange Box Preview'}
              </span>
              <span className="text-[10px] font-mono text-orange-700 font-semibold bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                Official Orange Box
              </span>
            </div>

            {/* The Actual Orange Rectangular Box Preview */}
            <div className="border-2 border-orange-500 bg-orange-50/50 rounded-xl p-3.5 text-slate-900 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2 border-b border-orange-200/80 pb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    RC
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-orange-950 leading-tight">
                      {formData.companyNameMm || 'ကုမ္ပဏီအမည်'}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-700 leading-tight">
                      {formData.companyNameEn || 'Company Name'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-orange-950 bg-orange-100 border border-orange-300 px-2 py-0.5 rounded shrink-0">
                  {formData.licenseNo || 'CBM License'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 text-slate-700">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-snug">
                    <strong>{language === 'my' ? 'လိပ်စာ' : 'Address'}:</strong> {formData.addressMm || formData.addressEn}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-snug">
                    <strong>{language === 'my' ? 'ဖုန်း' : 'Phone'}:</strong> {formData.phone} {formData.hotline ? `• Hotline: ${formData.hotline}` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {/* Company Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'my' ? 'ကုမ္ပဏီ အမည် (မြန်မာ)' : 'Company Name (Myanmar)'} <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyNameMm}
                  onChange={(e) => setFormData({ ...formData, companyNameMm: e.target.value })}
                  placeholder="ဥပမာ - အမ်အမ် အင်ဗက်စ် ကုမ္ပဏီ လီမိတက်"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'my' ? 'ကုမ္ပဏီ အမည် (အင်္ဂလိပ်)' : 'Company Name (English)'} <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyNameEn}
                  onChange={(e) => setFormData({ ...formData, companyNameEn: e.target.value })}
                  placeholder="e.g. MM Invest Co., Ltd."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'my' ? 'ရုံးချုပ် လိပ်စာ (မြန်မာ)' : 'Address (Myanmar)'} <span className="text-orange-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.addressMm}
                  onChange={(e) => setFormData({ ...formData, addressMm: e.target.value })}
                  placeholder="ဥပမာ - အမှတ် (၂၁၀)၊ ရွှေဟင်္သာလမ်း၊ လှိုင်မြို့နယ်၊ ရန်ကုန်မြို့၊ မြန်မာနိုင်ငံ။"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'my' ? 'ရုံးချုပ် လိပ်စာ (အင်္ဂလိပ်)' : 'Address (English)'} <span className="text-orange-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.addressEn}
                  onChange={(e) => setFormData({ ...formData, addressEn: e.target.value })}
                  placeholder="e.g. No. 210, Shwe Hintha Road, Hlaing Township, Yangon, Myanmar"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Phone & Hotline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'my' ? 'ဆက်သွယ်ရန် ဖုန်းနံပါတ်' : 'Office Phone Number'} <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01-512345, 01-512346"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'my' ? 'ဟော့လိုင်း / အရေးပေါ်ဖုန်း' : 'Hotline / Mobile Number'}
                </label>
                <input
                  type="text"
                  value={formData.hotline}
                  onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                  placeholder="09-790123456, 09-977123456"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>

            {/* License & Tax ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'my' ? 'ဗဟိုဘဏ် လိုင်စင်အမှတ်' : 'CBM License No'}
                </label>
                <input
                  type="text"
                  value={formData.licenseNo}
                  onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                  placeholder="CBM-NB-001/2021"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'my' ? 'အီးမေးလ်' : 'Official Email'}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="remittance@company.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'my' ? 'ဝက်ဘ်ဆိုက်' : 'Website'}
                </label>
                <input
                  type="text"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.company.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-200">
            {savedSuccess ? (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {language === 'my' ? 'ကုမ္ပဏီ အချက်အလက် သိမ်းဆည်းပြီးပါပြီ!' : 'Company profile saved successfully!'}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">
                {language === 'my' ? 'အပြောင်းအလဲများကို နေရာအားလုံးတွင် ချက်ချင်း အသုံးပြုမည်' : 'Changes take effect immediately across all screens and vouchers'}
              </span>
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setFormData(defaultOperatorProfile)}
                className="px-3 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                title={language === 'my' ? 'MM Invest Co., Ltd. မူလသတ်မှတ်ချက်အတိုင်း ပြန်ထားမည်' : 'Restore Default MM Invest Co., Ltd.'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'my' ? 'မူလသတ်မှတ်ချက် (Default)' : 'Restore Default'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md transition-colors cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{language === 'my' ? 'သိမ်းဆည်းမည်' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
