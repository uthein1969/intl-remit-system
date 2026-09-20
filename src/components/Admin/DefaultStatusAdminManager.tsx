import React, { useState } from 'react';
import { 
  CheckSquare, 
  Globe2, 
  ShieldCheck, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  FileText, 
  Send,
  Building2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { DefaultStatusConfig } from '../../types';

export const DefaultStatusAdminManager: React.FC = () => {
  const { 
    language, 
    defaultStatusConfig, 
    updateDefaultStatusConfig, 
    currentUser,
    db,
    activeCountryCode
  } = useRemittance();

  const [config, setConfig] = useState<DefaultStatusConfig>(() => ({
    autoCountryDefault: defaultStatusConfig?.autoCountryDefault ?? true,
    applyOutwardEntry: defaultStatusConfig?.applyOutwardEntry ?? true,
    applyReviewEdit: defaultStatusConfig?.applyReviewEdit ?? true,
    enforceNonMyanmarPassport: defaultStatusConfig?.enforceNonMyanmarPassport ?? true,
    enforceMyanmarNrc: defaultStatusConfig?.enforceMyanmarNrc ?? true,
    updatedAt: defaultStatusConfig?.updatedAt,
    updatedBy: defaultStatusConfig?.updatedBy
  }));

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live Simulator State
  const [simulatedCountry, setSimulatedCountry] = useState<string>(activeCountryCode || 'MM');

  const handleSave = () => {
    updateDefaultStatusConfig({
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: `${currentUser.username} (${currentUser.fullName}, Role: ${currentUser.role})`
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleResetToStandard = () => {
    const standardConfig: DefaultStatusConfig = {
      autoCountryDefault: true,
      applyOutwardEntry: true,
      applyReviewEdit: true,
      enforceNonMyanmarPassport: true,
      enforceMyanmarNrc: true,
      updatedAt: new Date().toISOString(),
      updatedBy: `${currentUser.username} (${currentUser.fullName}, Role: ${currentUser.role})`
    };
    setConfig(standardConfig);
    updateDefaultStatusConfig(standardConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const isSimulatedMyanmar = simulatedCountry === 'MM';
  const effectiveScope = (!config.autoCountryDefault) 
    ? 'INTERNATIONAL' 
    : (isSimulatedMyanmar ? 'DOMESTIC' : 'INTERNATIONAL');
  const effectiveIdType = (!config.autoCountryDefault)
    ? 'PASSPORT'
    : (isSimulatedMyanmar ? 'NRC' : 'PASSPORT');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <CheckSquare className="w-32 h-32 text-indigo-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-indigo-300" />
                <span>Admin Setup (User Admin Role Only)</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                Active System Policy
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {language === 'my' 
                ? '၁၂။ မူရင်းအခြေအနေ သတ်မှတ်ချက် (Default Status Configuration)' 
                : '12. Remittance Default Status Configuration'}
            </h2>
            <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
              {language === 'my'
                ? 'အသုံးပြုသူ Login ဝင်ရောက်သည့် နိုင်ငံပေါ်မူတည်၍ Remittance Outward Entry Page နှင့် Review & Edit Outward Remittance Page တို့တွင် မူရင်းအခြေအနေ (Default Scope & ID Type) ကို သတ်မှတ်ထိန်းချုပ်သည့် စနစ်ဖြစ်ပါသည်။'
                : 'Configure country-based default remittance scope (Domestic/International) and sender identity document type (NRC/Passport) across Outward Entry and Review & Edit Outward pages.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleResetToStandard}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'မူလစံသတ်မှတ်ချက်သို့ ပြန်ထားမည်' : 'Reset Defaults'}</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{language === 'my' ? 'ပြင်ဆင်ချက်များ သိမ်းဆည်းမည်' : 'Save Default Status'}</span>
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-4 bg-emerald-950/80 border border-emerald-500 rounded-xl p-3 flex items-center space-x-3 text-xs text-emerald-200 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {language === 'my'
                ? 'မူရင်းအခြေအနေ သတ်မှတ်ချက် (Default Status) အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။ Outward Entry နှင့် Review & Edit စာမျက်နှာများတွင် ချက်ချင်း အကျုံးဝင်ပါသည်။'
                : 'Default Status settings successfully saved and applied to Outward Entry and Review & Edit Outward Remittance pages.'}
            </span>
          </div>
        )}
      </div>

      {/* Main Configuration Card: Default Status Check Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Admin Checkbox Controls */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <CheckSquare className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {language === 'my' 
                      ? 'Default Status Check Box (အဓိက သတ်မှတ်ချက်)' 
                      : 'Default Status Check Box (Primary Rule)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {language === 'my' 
                      ? 'User Admin Role အတွက် မူရင်းအခြေအနေ ဖွင့်/ပိတ် ထိန်းချုပ်ခလုတ်' 
                      : 'Master toggle for User Admin Role'}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                config.autoCountryDefault 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {config.autoCountryDefault ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {/* Master Checkbox */}
            <div className={`p-4 rounded-xl border transition-all ${
              config.autoCountryDefault 
                ? 'bg-blue-50/50 border-blue-200' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <label className="flex items-start space-x-3.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="admin-master-default-status-checkbox"
                  checked={config.autoCountryDefault}
                  onChange={(e) => setConfig(prev => ({ ...prev, autoCountryDefault: e.target.checked }))}
                  className="mt-1 w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="space-y-1">
                  <span className="text-sm font-bold text-slate-900 block">
                    {language === 'my'
                      ? 'Default Status Check Box: အလိုအလျောက် နိုင်ငံအလိုက် မူရင်းအခြေအနေ သတ်မှတ်ခြင်းကို အသက်သွင်းမည်'
                      : 'Default Status Check Box: Enable Automatic Country-Based Default Status'}
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {language === 'my'
                      ? 'ဤ Check Box အား အမှန်ခြစ်ထားပါက - User Login by Other Country ဖြစ်လျှင် မူရင်းအဖြစ် International & Passport ကို ရွေးချယ်ပေးမည်ဖြစ်ပြီး၊ User Login by Myanmar Country ဖြစ်လျှင် မူရင်းအဖြစ် Domestic & NRC ကို ရွေးချယ်ပေးမည်ဖြစ်ပါသည်။'
                      : 'When checked: If User Login by Other Country, Default is International & Passport. If User Login by Myanmar Country, Default is Domestic & NRC.'}
                  </p>
                </div>
              </label>
            </div>

            {/* Sub-Checkboxes for Granular Application */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {language === 'my' ? 'သက်ရောက်မည့် စာမျက်နှာများနှင့် စည်းမျဉ်းများ' : 'Applicable Pages & Enforcement'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Outward Entry Page */}
                <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    id="admin-apply-outward-entry-checkbox"
                    checked={config.applyOutwardEntry}
                    onChange={(e) => setConfig(prev => ({ ...prev, applyOutwardEntry: e.target.checked }))}
                    disabled={!config.autoCountryDefault}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {language === 'my' ? '၁။ Remittance Outward Entry Page' : '1. Outward Entry Page'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {language === 'my' ? 'အသစ်ထည့်သွင်းမှုတွင် မူရင်းအခြေအနေ ထားရှိမည်' : 'Applies defaults when creating remittances'}
                    </span>
                  </div>
                </label>

                {/* 2. Review & Edit Outward Remittance Page */}
                <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    id="admin-apply-review-edit-checkbox"
                    checked={config.applyReviewEdit}
                    onChange={(e) => setConfig(prev => ({ ...prev, applyReviewEdit: e.target.checked }))}
                    disabled={!config.autoCountryDefault}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {language === 'my' ? '၂။ Review & Edit Outward Page' : '2. Review & Edit Outward Page'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {language === 'my' ? 'စိစစ်ပြင်ဆင်ရာတွင် မူရင်းအခြေအနေ ထားရှိမည်' : 'Applies defaults in reviewer & edit dialog'}
                    </span>
                  </div>
                </label>

                {/* 3. Myanmar Rule */}
                <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    id="admin-enforce-myanmar-checkbox"
                    checked={config.enforceMyanmarNrc}
                    onChange={(e) => setConfig(prev => ({ ...prev, enforceMyanmarNrc: e.target.checked }))}
                    disabled={!config.autoCountryDefault}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                  />
                  <div>
                    <span className="text-xs font-bold text-emerald-800 block">
                      🇲🇲 Myanmar Login Rule
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Scope: <strong>Domestic</strong> • ID: <strong>NRC Card</strong>
                    </span>
                  </div>
                </label>

                {/* 4. Other Country Rule */}
                <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    id="admin-enforce-other-country-checkbox"
                    checked={config.enforceNonMyanmarPassport}
                    onChange={(e) => setConfig(prev => ({ ...prev, enforceNonMyanmarPassport: e.target.checked }))}
                    disabled={!config.autoCountryDefault}
                    className="mt-0.5 w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer disabled:opacity-50"
                  />
                  <div>
                    <span className="text-xs font-bold text-sky-800 block">
                      🌐 Other Country Login Rule
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Scope: <strong>International</strong> • ID: <strong>Passport</strong>
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Last Updated Footer info */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-1 font-mono">
              <span>Updated By: {config.updatedBy || 'System Admin (Initial Setup)'}</span>
              <span>Last Modified: {config.updatedAt ? new Date(config.updatedAt).toLocaleString() : 'System Default'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Simulator & Operational Verification */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Globe2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  {language === 'my' ? 'တိုက်ရိုက် စမ်းသပ်စစ်ဆေးခြင်း (Live Simulator)' : 'Live Country Login Simulator'}
                </h3>
              </div>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                Realtime Preview
              </span>
            </div>

            <p className="text-xs text-slate-400">
              {language === 'my'
                ? 'အသုံးပြုသူ Login ဝင်ရောက်သည့် နိုင်ငံကို ရွေးချယ်ပြီး မူရင်းအခြေအနေ (Default Status) အလုပ်လုပ်ပုံကို ချက်ချင်း စစ်ဆေးနိုင်ပါသည် -'
                : 'Select a user login country to test how the default status behaves immediately:'}
            </p>

            {/* Country Selector Pills */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSimulatedCountry('MM')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-2 ${
                  simulatedCountry === 'MM'
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xl">🇲🇲</span>
                <div>
                  <span className="font-bold text-xs block">Myanmar</span>
                  <span className="text-[10px] text-slate-400">Yangon / Mandalay</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSimulatedCountry('TH')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-2 ${
                  simulatedCountry === 'TH'
                    ? 'bg-sky-950/70 border-sky-500 text-sky-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xl">🇹🇭</span>
                <div>
                  <span className="font-bold text-xs block">Thailand</span>
                  <span className="text-[10px] text-slate-400">Bangkok Branch</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSimulatedCountry('SG')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-2 ${
                  simulatedCountry === 'SG'
                    ? 'bg-sky-950/70 border-sky-500 text-sky-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xl">🇸🇬</span>
                <div>
                  <span className="font-bold text-xs block">Singapore</span>
                  <span className="text-[10px] text-slate-400">Orchard Hub</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSimulatedCountry('MY')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-2 ${
                  simulatedCountry === 'MY'
                    ? 'bg-sky-950/70 border-sky-500 text-sky-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xl">🇲🇾</span>
                <div>
                  <span className="font-bold text-xs block">Malaysia</span>
                  <span className="text-[10px] text-slate-400">Kuala Lumpur</span>
                </div>
              </button>
            </div>

            {/* Simulated Outcome Display */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="text-slate-400">User Login Country:</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>{isSimulatedMyanmar ? '🇲🇲 Myanmar (MM)' : `🌐 Other Country (${simulatedCountry})`}</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="text-slate-400">Default Remittance Scope:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  effectiveScope === 'DOMESTIC'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}>
                  {effectiveScope} ({effectiveScope === 'DOMESTIC' ? 'ပြည်တွင်း' : 'နိုင်ငံတကာ'})
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="text-slate-400">Default Sender ID Type:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  effectiveIdType === 'NRC'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}>
                  {effectiveIdType} ({effectiveIdType === 'NRC' ? 'မှတ်ပုံတင်' : 'နိုင်ငံကူးလက်မှတ်'})
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Pages Active:</span>
                <span className="text-slate-300 font-bold text-[11px]">
                  Outward Entry & Review/Edit
                </span>
              </div>
            </div>

            {/* Operational Rule Summary */}
            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
              isSimulatedMyanmar 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
                : 'bg-sky-950/40 border-sky-500/30 text-sky-200'
            }`}>
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSimulatedMyanmar 
                    ? 'Rule Active: Myanmar Country Login' 
                    : 'Rule Active: Other Country Login'}
                </span>
              </div>
              <p className="text-[11px] opacity-90">
                {isSimulatedMyanmar 
                  ? 'User Login by Myanmar Country → Default is Domestic Remittance and NRC Card. Sender ID attachments show NRC Front & Back rows.' 
                  : 'User Login by Other Country → Default is International Remittance and Passport. Sender ID attachments show Passport row.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
