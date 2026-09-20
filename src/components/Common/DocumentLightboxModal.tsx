import React, { useState } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  ExternalLink, 
  FileText, 
  ShieldCheck,
  Maximize2
} from 'lucide-react';

interface DocumentLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  documentUrl?: string;
  documentName?: string;
  documentType?: string;
  documentSize?: string;
  nrcOrPassportNumber?: string;
  senderName?: string;
  language?: 'en' | 'my';
  // Compatibility aliases
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  idNumber?: string;
  docTitle?: string;
  docUrl?: string;
  docName?: string;
  docSize?: string;
  docType?: string;
}

export const DocumentLightboxModal: React.FC<DocumentLightboxModalProps> = ({
  isOpen,
  onClose,
  title = 'Document Attachment',
  documentUrl,
  documentName = 'Document_Attachment',
  documentType = 'image/png',
  documentSize = '',
  nrcOrPassportNumber,
  senderName,
  language = 'my',
  fileName,
  fileType,
  fileSize,
  idNumber,
  docTitle,
  docUrl,
  docName,
  docSize,
  docType
}) => {
  const actualTitle = docTitle || title;
  const actualUrl = docUrl || documentUrl;
  const actualName = docName || fileName || documentName;
  const actualType = docType || fileType || documentType;
  const actualSize = docSize || fileSize || documentSize;
  const actualIdNumber = idNumber || nrcOrPassportNumber;
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  if (!isOpen || !actualUrl) return null;

  const isImage = 
    actualUrl.startsWith('data:image') || 
    actualType.startsWith('image/') || 
    actualUrl.match(/\.(jpeg|jpg|png|webp|svg)/i);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/85 backdrop-blur-xs flex flex-col justify-between p-3 sm:p-6 animate-in fade-in duration-200">
      
      {/* Top Bar */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl z-10 gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white text-sm truncate">{title}</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold shrink-0 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Verified KYC Doc</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {senderName && <span className="text-slate-300 font-medium mr-2">{senderName}</span>}
              {nrcOrPassportNumber && <span className="font-mono text-amber-400 font-bold mr-2">{nrcOrPassportNumber}</span>}
              <span className="text-slate-500">{documentName} {documentSize && `• ${documentSize}`}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {isImage && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                title="Reset Zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          <a
            href={documentUrl}
            target="_blank"
            rel="noreferrer"
            download={documentName}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
            title={language === 'my' ? 'ဖိုင်ဒေါင်းလုဒ်လုပ်မည် / ပြင်ပတွင်ဖွင့်မည်' : 'Download Document'}
          >
            <Download className="w-4 h-4" />
          </a>

          <a
            href={documentUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors flex items-center space-x-1"
            title={language === 'my' ? 'ဝင်းဒိုးအသစ်ဖြင့် ဖွင့်ကြည့်မည်' : 'Open in New Tab'}
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors cursor-pointer ml-1"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4 my-2 relative">
        {isImage ? (
          <div 
            className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
            style={{ 
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
          >
            <img 
              src={documentUrl} 
              alt={title}
              className="max-h-[75vh] max-w-full rounded-xl shadow-2xl object-contain border border-slate-700/50 bg-slate-900 select-none"
            />
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1">{documentName}</h4>
              <p className="text-xs text-slate-400">
                {language === 'my' 
                  ? 'ဤ PDF/စာရွက်စာတမ်းကို ကြည့်ရှုရန် အောက်ပါခလုတ်ကို နှိပ်ပါ' 
                  : 'Click below to view or download this verification document'}
              </p>
            </div>
            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-lg"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{language === 'my' ? 'ဝင်းဒိုးအသစ်ဖြင့် ကြည့်ရှုမည်' : 'Open in New Tab'}</span>
            </a>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-slate-400 z-10">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>
            {language === 'my' 
              ? 'အချက်အလက် စစ်ဆေးပြီးစီးမှု: ငွေလွှဲပို့သူ၏ မူရင်း မှတ်ပုံတင်/Passport ပူးတွဲစာရွက်စာတမ်း' 
              : 'Sender Identity Document verification ready for compliance audit trail'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-300 hover:text-white px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
        >
          {language === 'my' ? 'ပိတ်မည် (Close)' : 'Close'}
        </button>
      </div>
    </div>
  );
};
