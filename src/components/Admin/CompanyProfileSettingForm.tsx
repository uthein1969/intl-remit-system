import React, { useState } from 'react';
import { 
  Building2, 
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
import { useRemittance } from '../../lib/store';
import { OperatorProfile } from '../../types';
import { defaultOperatorProfile } from '../../lib/mockData';

export const CompanyProfileSettingForm: React.FC = () => {
  const { operatorProfile, updateOperatorProfile, language } = useRemittance();
  const [formData, setFormData] = useState<OperatorProfile>(operatorProfile);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = (field: keyof OperatorProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSavedSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOperatorProfile(formData);
    setSavedSuccess(true);
    setIsDirty(false);
  };

  const handleReset = () => {
    setFormData(operatorProfile);
    setIsDirty(false);
    setSavedSuccess(false);
  };

  const handleRestoreSystemDefault = () => {
    setFormData(defaultOperatorProfile);
    setIsDirty(true);
    setSavedSuccess(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner (Orange Color Theme) */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-600 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-white/10 text-white border border-white/20 shadow-inner shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-white text-orange-700 font-mono shadow-2xs">
                Official Orange Box Setting
              </span>
              <span className="text-xs text-orange-200 font-medium">
                {language === 'my' ? 'ငွေလွှဲဆော့ဖ်ဝဲလ် အသုံးပြုသည့် ကုမ္ပဏီ' : 'Operating Company Settings'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight mt-0.5 text-white">
              {language === 'my' ? 'ဆော့ဖ်ဝဲလ် အသုံးပြုသည့် ကုမ္ပဏီ အချက်အလက် ထည့်သွင်းခြင်း' : 'Remittance Operating Company Profile Form'}
            </h2>
            <p className="text-xs text-orange-100/95 mt-0.5">
              {language === 'my' 
                ? 'ဤနေရာတွင် ဖြည့်သွင်းထားသော အချက်အလက်များကို ဘောင်ချာပြေစာများနှင့် ဒက်ရှ်ဘုတ်ပေါ်ရှိ "လိမ္မော်ရောင်လေးဒေါင့်အကွက် (Orange Box)" တွင် အလိုအလျောက် အသုံးပြုမည်ဖြစ်ပါသည်။' 
                : 'Values saved here will be automatically reflected across all vouchers, receipts and the official Orange Box.'}
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 px-4 py-2 rounded-xl text-xs font-bold animate-in fade-in shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>{language === 'my' ? 'အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!' : 'Changes Saved Successfully!'}</span>
          </div>
        )}
      </div>

      {/* Live Orange Rectangular Box Preview */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              {language === 'my' ? 'လက်ရှိ လိမ္မော်ရောင်လေးဒေါင့်အကွက် နမူနာ (Live Orange Box Preview)' : 'Live Orange Box Preview'}
            </h3>
          </div>
          <span className="text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
            {language === 'my' ? 'လိမ္မော်ရောင်လေးဒေါင့်အကွက် (Orange Box)' : 'Official Orange Box Display'}
          </span>
        </div>

        {/* The Actual Official Orange Box */}
        <div className="border-2 border-orange-500 bg-orange-50/70 rounded-xl p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-200/90 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-orange-600 text-white px-2 py-0.5 rounded">
                    {language === 'my' ? 'ဆော့ဖ်ဝဲလ် အသုံးပြုသည့် ကုမ္ပဏီ' : 'LICENSED REMITTANCE OPERATOR'}
                  </span>
                  {formData.licenseNo && (
                    <span className="text-[10px] font-mono font-bold text-orange-950 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded">
                      {formData.licenseNo}
                    </span>
                  )}
                </div>
                <h4 className="text-base sm:text-lg font-black text-orange-950 mt-0.5 leading-snug">
                  {formData.companyNameMm || 'ကုမ္ပဏီ အမည် (မြန်မာ)'}
                  {formData.companyNameEn && (
                    <span className="text-sm font-bold text-orange-800 ml-2 font-sans">
                      ({formData.companyNameEn})
                    </span>
                  )}
                </h4>
              </div>
            </div>

            {formData.taxId && (
              <div className="text-right text-[11px] text-orange-900 font-medium">
                <span>{language === 'my' ? 'အခွန်အမှတ်' : 'Tax ID'}: </span>
                <strong className="font-mono">{formData.taxId}</strong>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 text-xs text-slate-800">
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <strong className="text-orange-950 block">
                  {language === 'my' ? 'ရုံးချုပ် လိပ်စာ' : 'Head Office Address'}:
                </strong>
                <span className="text-slate-700">
                  {language === 'my' ? (formData.addressMm || formData.addressEn) : (formData.addressEn || formData.addressMm)}
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Phone className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <strong className="text-orange-950 block">
                  {language === 'my' ? 'ဆက်သွယ်ရန် ဖုန်းနံပါတ်' : 'Contact Phone / Hotline'}:
                </strong>
                <span className="font-mono font-bold text-slate-900">{formData.phone || '01-xxxxxx'}</span>
                {formData.hotline && (
                  <span className="text-slate-600 ml-2">
                    (Hotline: <strong className="font-mono text-orange-700">{formData.hotline}</strong>)
                  </span>
                )}
              </div>
            </div>
          </div>

          {(formData.email || formData.website) && (
            <div className="mt-2.5 pt-2 border-t border-orange-200/60 flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
              {formData.email && (
                <span className="flex items-center gap-1 font-mono">
                  <Mail className="w-3 h-3 text-orange-600" />
                  {formData.email}
                </span>
              )}
              {formData.website && (
                <span className="flex items-center gap-1 font-mono text-blue-700">
                  <Globe className="w-3 h-3 text-blue-600" />
                  {formData.website}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {language === 'my' ? 'ကုမ္ပဏီ အချက်အလက်များ ဖြည့်သွင်းရန်' : 'Edit Company Information Fields'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'my' 
                ? 'အောက်ပါအချက်အလက်များကို ပြင်ဆင်ပြီးပါက အောက်ဆုံးရှိ "သိမ်းဆည်းမည်" ခလုတ်ကို နှိပ်ပါ' 
                : 'Update the fields below and click "Save Changes" at the bottom'}
            </p>
          </div>
          {isDirty && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              {language === 'my' ? 'အပြောင်းအလဲများ မသိမ်းဆည်းရသေးပါ' : 'Unsaved changes'}
            </span>
          )}
        </div>

        {/* Section 1: Company Names */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-orange-600" />
            <span>{language === 'my' ? '၁။ ကုမ္ပဏီ အမည် (Company Name)' : '1. Company Name'}</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'my' ? 'ကုမ္ပဏီ အမည် (မြန်မာလို) *' : 'Company Name (Myanmar) *'}
              </label>
              <input
                type="text"
                required
                value={formData.companyNameMm}
                onChange={(e) => handleChange('companyNameMm', e.target.value)}
                placeholder="ဥပမာ - အမ်အမ် အင်ဗက်စ် ကုမ္ပဏီ လီမိတက်"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'my' ? 'ကုမ္ပဏီ အမည် (အင်္ဂလိပ်လို) *' : 'Company Name (English) *'}
              </label>
              <input
                type="text"
                required
                value={formData.companyNameEn}
                onChange={(e) => handleChange('companyNameEn', e.target.value)}
                placeholder="e.g. MM Invest Co., Ltd."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Addresses */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-orange-600" />
            <span>{language === 'my' ? '၂။ ရုံးချုပ် လိပ်စာ (Head Office Address)' : '2. Head Office Address'}</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'my' ? 'ရုံးချုပ် လိပ်စာ (မြန်မာလို) *' : 'Address (Myanmar) *'}
              </label>
              <textarea
                rows={2}
                required
                value={formData.addressMm}
                onChange={(e) => handleChange('addressMm', e.target.value)}
                placeholder="ဥပမာ - အမှတ် (၂၁၀)၊ ရွှေဟင်္သာလမ်း၊ လှိုင်မြို့နယ်၊ ရန်ကုန်မြို့၊ မြန်မာနိုင်ငံ။"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'my' ? 'ရုံးချုပ် လိပ်စာ (အင်္ဂလိပ်လို) *' : 'Address (English) *'}
              </label>
              <textarea
                rows={2}
                required
                value={formData.addressEn}
                onChange={(e) => handleChange('addressEn', e.target.value)}
                placeholder="e.g. No. 210, Shwe Hintha Road, Hlaing Township, Yangon, Myanmar"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Phone & Hotline */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-orange-600" />
            <span>{language === 'my' ? '၃။ ဆက်သွယ်ရန် ဖုန်းနံပါတ်များ (Contact Numbers)' : '3. Contact Numbers'}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'my' ? 'ရုံးဖုန်းနံပါတ် (Office Phone) *' : 'Office Phone *'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="01-512345, 01-512346"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all font-mono font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'my' ? 'အရေးပေါ် / ဟော့လိုင်း (Hotline / Mobile)' : 'Hotline / Mobile'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-orange-500" />
                <input
                  type="text"
                  value={formData.hotline}
                  onChange={(e) => handleChange('hotline', e.target.value)}
                  placeholder="09-790123456, 09-977123456"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all font-mono font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: License & Regulatory Details */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            <span>{language === 'my' ? '၄။ ဗဟိုဘဏ် ငွေလွှဲလိုင်စင် နှင့် အခွန်နံပါတ် (Licenses)' : '4. Licenses & Tax'}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'my' ? 'ဗဟိုဘဏ် လိုင်စင်အမှတ် *' : 'CBM License No *'}
              </label>
              <input
                type="text"
                required
                value={formData.licenseNo}
                onChange={(e) => handleChange('licenseNo', e.target.value)}
                placeholder="CBM/REMIT/2024-001"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'my' ? 'ကုမ္ပဏီ အခွန်မှတ်ပုံတင်အမှတ်' : 'Tax ID / Registration'}
              </label>
              <input
                type="text"
                value={formData.taxId || ''}
                onChange={(e) => handleChange('taxId', e.target.value)}
                placeholder="REG-987654321"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'my' ? 'တရားဝင် အီးမေးလ်' : 'Official Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@shwemyanmarremit.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {language === 'my' ? 'ကုမ္ပဏီ ဝက်ဘ်ဆိုက်' : 'Website'}
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={formData.website || ''}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.mminvest.com.mm"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {savedSuccess ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {language === 'my' ? 'အချက်အလက်များကို အောင်မြင်စွာ သိမ်းဆည်းထားပြီးပါပြီ။' : 'All settings successfully saved in database.'}
              </span>
            ) : (
              <span>
                {language === 'my' 
                  ? 'အပြောင်းအလဲများကို သိမ်းဆည်းရန် ညာဘက်ရှိ "သိမ်းဆည်းမည်" ကို နှိပ်ပါ' 
                  : 'Click "Save Company Settings" to persist your changes.'}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleRestoreSystemDefault}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-all cursor-pointer"
              title={language === 'my' ? 'MM Invest Co., Ltd. မူလသတ်မှတ်ချက်အတိုင်း ပြန်ထားမည်' : 'Restore MM Invest Default Profile'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'Default မူရင်းထားရန်' : 'Restore Default'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'မူလအတိုင်းပြန်ထားမည်' : 'Reset'}</span>
            </button>

            <button
              type="submit"
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{language === 'my' ? 'အချက်အလက် သိမ်းဆည်းမည်' : 'Save Company Settings'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
