import { RemittanceTransaction, Branch, Company, Language, OperatorProfile } from '../types';
import { formatToDDMMYYYYWithTime } from '../lib/dateUtils';

export function generateVoucherHtml({
  transaction,
  branch,
  senderBranch,
  receiverBranch,
  senderBranchName,
  receiverBranchName,
  branches,
  partner,
  operatorProfile,
  language = 'my',
  autoPrint = false,
}: {
  transaction: RemittanceTransaction;
  branch?: Branch;
  senderBranch?: Branch;
  receiverBranch?: Branch;
  senderBranchName?: string;
  receiverBranchName?: string;
  branches?: Branch[];
  partner?: Company;
  operatorProfile?: OperatorProfile;
  language?: Language;
  autoPrint?: boolean;
}): string {
  const isOutward = transaction.type === 'OUTWARD';

  // Resolve Sender Branch
  const resolvedSenderBranch = senderBranch || 
    (branches ? branches.find(b => b.id === transaction.sendingBranchId || b.id === transaction.branchId) : undefined) || 
    branch;

  const resolvedSenderBranchName = senderBranchName || transaction.senderBranchName || (
    resolvedSenderBranch ? (
      language === 'my' && resolvedSenderBranch.nameMm
        ? `${resolvedSenderBranch.nameMm} (${resolvedSenderBranch.nameEn})`
        : resolvedSenderBranch.nameEn
    ) : (transaction.sendingBranchId || (language === 'my' ? 'ရန်ကုန် ပင်မရုံးချုပ် ဘဏ်ခွဲ' : 'Yangon Head Office Branch'))
  );

  // Resolve Receiver Branch
  const resolvedReceiverBranch = receiverBranch || 
    (branches && transaction.payoutBranchId ? branches.find(b => b.id === transaction.payoutBranchId) : undefined) ||
    (branches && transaction.scope === 'DOMESTIC' ? branches.find(b => b.id !== (resolvedSenderBranch?.id || transaction.sendingBranchId)) : undefined);

  const resolvedReceiverBranchName = receiverBranchName || transaction.receiverBranchName || (
    resolvedReceiverBranch ? (
      language === 'my' && resolvedReceiverBranch.nameMm
        ? `${resolvedReceiverBranch.nameMm} (${resolvedReceiverBranch.nameEn})`
        : resolvedReceiverBranch.nameEn
    ) : partner ? (
      language === 'my' && partner.nameMm ? `${partner.nameMm} (${partner.nameEn})` : partner.nameEn
    ) : (
      transaction.scope === 'DOMESTIC'
        ? (language === 'my' ? 'မန္တလေး ၇၈ လမ်း ဘဏ်ခွဲ' : 'Mandalay 78th Street Branch')
        : (language === 'my' ? 'မိတ်ဖက် ငွေလွှဲကောင်တာ' : 'Agent Payout Counter')
    )
  );

  const createdDate = formatToDDMMYYYYWithTime(transaction.createdDate || Date.now());

  const op = {
    companyNameMm: operatorProfile?.companyNameMm || 'ရွှေမြန်မာ အပြည်ပြည်ဆိုင်ရာ ငွေလွှဲလုပ်ငန်း',
    companyNameEn: operatorProfile?.companyNameEn || 'Golden Myanmar Remittance Co., Ltd',
    licenseNo: operatorProfile?.licenseNo || 'CBM/NBFI/RO-042/2024',
    addressMm: operatorProfile?.addressMm || 'အမှတ် (၁၂)၊ ကုန်သည်လမ်း၊ ကျောက်တံတားမြို့နယ်၊ ရန်ကုန်မြို့။',
    addressEn: operatorProfile?.addressEn || 'No. 12, Merchant Road, Kyauktada Township, Yangon, Myanmar',
    phone: operatorProfile?.phone || '+95 1 230 4567',
    hotline: operatorProfile?.hotline || '1899',
  };

  const fmtNum = (n: any, fallback = '0'): string => {
    if (n === null || n === undefined || n === '') return fallback;
    const val = Number(n);
    return isNaN(val) ? fallback : val.toLocaleString('en-US');
  };

  const voucherTitle = isOutward
    ? (language === 'my' ? 'ငွေလွှဲပို့ ပြေစာ (OUTWARD REMITTANCE SLIP)' : 'OUTWARD REMITTANCE SLIP')
    : (language === 'my' ? 'ငွေလွှဲထုတ် ပြေစာ (INWARD PAYOUT VOUCHER)' : 'INWARD PAYOUT VOUCHER');

  const statusDisplay = (() => {
    switch (transaction.status) {
      case 'PENDING_APPROVAL':
        return language === 'my' ? 'အတည်ပြုရန် ဆိုင်းငံ့ (Pending)' : 'PENDING APPROVAL';
      case 'APPROVED_AND_SENT':
        return language === 'my' ? 'အတည်ပြုပြီး လွှဲပို့ပြီး (Approved and Sent)' : 'APPROVED AND SENT';
      case 'APPROVED_AND_PAID_OUT':
        return language === 'my' ? 'အတည်ပြုပြီး ငွေထုတ်ပေးပြီး (Approved and Paid Out)' : 'APPROVED AND PAID OUT';
      case 'APPROVED':
        return language === 'my' ? 'အတည်ပြုပြီး လွှဲပို့ပြီး (Approved and Sent)' : 'APPROVED AND SENT';
      case 'PAID_OUT':
        return language === 'my' ? 'အတည်ပြုပြီး ငွေထုတ်ပေးပြီး (Approved and Paid Out)' : 'APPROVED AND PAID OUT';
      case 'ON_HOLD':
        return language === 'my' ? 'ဆိုင်းငံ့ထားသည် (On Hold)' : 'ON HOLD';
      case 'DRAFT':
        return language === 'my' ? 'မူကြမ်း (Draft)' : 'DRAFT';
      case 'REJECTED':
        return language === 'my' ? 'ပယ်ဖျက်ပြီး (Rejected)' : 'REJECTED';
      case 'CANCELLED':
        return language === 'my' ? 'ဖျက်သိမ်းပြီး (Cancelled)' : 'CANCELLED';
      default:
        return String(transaction.status || '').replace(/_/g, ' ');
    }
  })();

  const payoutMethodText = (() => {
    switch (transaction.payoutMethod) {
      case 'CASH_PICKUP':
        return language === 'my' ? 'ဘဏ်ကောင်တာ ငွေသားထုတ်ယူခြင်း (Cash Counter Pickup)' : 'Cash Counter Pickup';
      case 'BANK_ACCOUNT':
        return language === 'my'
          ? `ဘဏ်အကောင့်သို့ တိုက်ရိုက်ထည့်သွင်းခြင်း (${transaction.payoutBankName || 'Bank'})`
          : `Bank Account Deposit (${transaction.payoutBankName || 'Bank'})`;
      case 'MOBILE_WALLET':
        return language === 'my' ? 'မိုဘိုင်းပိုက်ဆံအိတ် (Mobile Wallet)' : 'Mobile Wallet';
      default:
        return transaction.payoutMethod || 'Cash Pickup';
    }
  })();

  const sourceCur = transaction.sourceCurrency || 'MMK';
  const targetCur = transaction.targetCurrency || 'MMK';
  const sendAmt = transaction.sendAmount ?? (transaction as any).sourceAmount ?? 0;
  const recvAmt = transaction.receiveAmount ?? (transaction as any).targetAmount ?? 0;
  const feeAmt = transaction.serviceFee ?? (transaction as any).transferFee ?? 0;
  const commAmt = transaction.commissionFee ?? 0;
  const rateAmt = transaction.exchangeRate ?? 1;
  const totalAmt = transaction.totalPayableAmount ?? (sendAmt + feeAmt);

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Voucher_${transaction.mtcn || ''}_${transaction.transactionNo || ''}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 12mm 15mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', 'Noto Sans Myanmar', 'Pyidaungsu', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background-color: #f1f5f9;
      line-height: 1.35;
      font-size: 10.5px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .page-container {
      max-width: 760px;
      margin: 16px auto;
      background: #ffffff;
      padding: 20px 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: avoid;
      break-after: avoid;
    }

    .no-print-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #0f172a;
      color: #ffffff;
      padding: 9px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6.5px 13px;
      font-size: 11.5px;
      font-weight: 600;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .btn-print {
      background: #059669;
      color: white;
    }
    .btn-print:hover {
      background: #047857;
    }
    .btn-close {
      background: #334155;
      color: white;
    }
    .btn-close:hover {
      background: #475569;
    }

    /* Header */
    .voucher-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .sys-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sys-logo {
      width: 36px;
      height: 36px;
      background: #0f172a;
      color: #10b981;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13.5px;
      letter-spacing: 0.5px;
    }
    .sys-title h1 {
      font-size: 15px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.25px;
      color: #0f172a;
      line-height: 1.2;
    }
    .sys-title p {
      font-size: 10.5px;
      color: #64748b;
      font-weight: 500;
      margin-top: 1px;
    }
    .voucher-type-badge {
      display: inline-block;
      padding: 4px 12px;
      background: #0f172a;
      color: #34d399;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-line {
      font-size: 10px;
      color: #64748b;
      margin-top: 3px;
    }
    .ref-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      color: #0f172a;
      font-size: 11px;
      margin-top: 1px;
    }

    /* Official Orange Rectangular Box */
    .orange-box {
      border: 1.5px solid #f97316;
      background: #fffaf5;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 10px;
    }
    .orange-box-head {
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #ffedd5;
      padding-bottom: 6px;
      margin-bottom: 6px;
    }
    .orange-box-icon {
      width: 30px;
      height: 30px;
      background: #ea580c;
      color: #ffffff;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      flex-shrink: 0;
    }
    .orange-box-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    }
    .badge-orange {
      background: #ea580c;
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 2px 7px;
      border-radius: 3px;
    }
    .badge-license {
      background: #ffedd5;
      color: #7c2d12;
      border: 1px solid #fdba74;
      font-size: 9.5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      padding: 1.5px 6px;
      border-radius: 3px;
    }
    .company-name {
      font-size: 14.5px;
      font-weight: 800;
      color: #431407;
      line-height: 1.25;
    }
    .orange-box-grid {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 6px 14px;
      font-size: 10px;
      color: #334155;
      line-height: 1.35;
    }
    .orange-box-grid strong {
      color: #7c2d12;
      font-weight: 700;
    }

    /* MTCN Golden Banner */
    .mtcn-box {
      border: 1.5px solid #f59e0b;
      background: #fffdf5;
      border-radius: 8px;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .mtcn-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #78350f;
      letter-spacing: 0.5px;
    }
    .mtcn-number {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 22px;
      font-weight: 800;
      color: #451a03;
      letter-spacing: 2px;
      line-height: 1.1;
      margin-top: 2px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    /* 2 Columns: Sender & Receiver */
    .party-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    .party-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      background: #f8fafc;
    }
    .party-card-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .party-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 10.5px;
      padding: 2px 0;
    }
    .party-row .label {
      color: #64748b;
      font-size: 10px;
      font-weight: 500;
    }
    .party-row .value {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }

    /* Financial Table */
    .fin-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 10px;
      font-size: 10.5px;
    }
    .fin-table th {
      background: #f1f5f9;
      color: #334155;
      text-align: left;
      padding: 6px 12px;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #cbd5e1;
    }
    .fin-table td {
      padding: 5px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .fin-table .row-alt {
      background: #fafbfc;
    }
    .fin-table .val {
      text-align: right;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #0f172a;
      font-size: 11px;
    }
    .fin-table .total-row {
      background: #ecfdf5;
      font-weight: 700;
    }
    .fin-table .total-row td {
      color: #065f46;
      border-top: 1.5px solid #86efac;
      border-bottom: 1.5px solid #86efac;
      padding: 6px 12px;
    }
    .fin-table .total-row .val {
      color: #047857;
      font-size: 13px;
      font-weight: 800;
    }

    /* Details Box */
    .details-box {
      border: 1px solid #e2e8f0;
      background: #ffffff;
      border-radius: 6px;
      padding: 7px 12px;
      font-size: 10px;
      color: #475569;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 14px;
      margin-bottom: 12px;
      line-height: 1.35;
    }
    .details-box strong {
      color: #1e293b;
    }

    /* Signatures & Stamp */
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 18px;
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #cbd5e1;
      text-align: center;
    }
    .sig-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 125px;
    }
    .sig-line {
      width: 100%;
      height: 80px;
      border-bottom: 1.5px solid #475569;
      margin-bottom: 8px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 4px;
    }
    .stamp-box {
      width: 155px;
      height: 80px;
      border: 1.5px dashed #94a3b8;
      color: #94a3b8;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: #fafbfc;
      margin: 0 auto;
    }
    .sig-name {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 3px;
    }
    .sig-title {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Legal statement */
    .legal-notice {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      font-size: 8.5px;
      color: #64748b;
      line-height: 1.35;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm 15mm 12mm 15mm;
      }
      html, body {
        height: auto !important;
        background: #ffffff !important;
        font-size: 10.5px !important;
        line-height: 1.35 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print, .no-print-bar {
        display: none !important;
      }
      .page-container {
        margin: 0 auto !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
        width: 100% !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .orange-box, .mtcn-box, .party-grid, .fin-table, .details-box, .sig-grid, .legal-notice {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <!-- Print action toolbar for browsers opening in dedicated window/tab -->
  <div class="no-print-bar no-print">
    <div style="display:flex; align-items:center; gap: 10px;">
      <span style="font-weight:700; font-size:13px; color:#34d399;">🖨️ ${language === 'my' ? 'ပြေစာ ပုံနှိပ်ခြင်း' : 'Remittance Print View'}</span>
      <span style="font-size:11px; opacity: 0.85; font-family: monospace;">Ref: ${transaction.transactionNo || ''} | MTCN: ${transaction.mtcn || ''}</span>
    </div>
    <div style="display:flex; align-items:center; gap: 8px;">
      <button onclick="window.print()" class="btn btn-print">
        🖨️ ${language === 'my' ? 'ပုံနှိပ်မည် (Print / PDF)' : 'Print / Save as PDF'}
      </button>
      <button onclick="window.close()" class="btn btn-close">
        ✕ ${language === 'my' ? 'ပိတ်မည် (Close)' : 'Close'}
      </button>
    </div>
  </div>

  <div class="page-container">
    <!-- Header -->
    <div class="voucher-header">
      <div class="sys-brand">
        <div class="sys-logo">RMS</div>
        <div class="sys-title">
          <h1>REMITTANCE MANAGEMENT SYSTEM</h1>
          <p>${language === 'my' ? 'ပြည်တွင်း ပြည်ပ ငွေလွှဲလုပ်ငန်း စနစ်' : 'Domestic & International Remittance System'}</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="voucher-type-badge">${voucherTitle}</span>
        <div class="meta-line">${language === 'my' ? 'နေ့စွဲ' : 'Date'}: ${createdDate}</div>
        <div class="ref-code">Ref: ${transaction.transactionNo || 'N/A'}</div>
      </div>
    </div>

    <!-- Official Orange Rectangular Box -->
    <div class="orange-box">
      <div class="orange-box-head">
        <div class="orange-box-icon">🏛️</div>
        <div>
          <div class="orange-box-badges">
            <span class="badge-orange">${language === 'my' ? 'ငွေလွှဲဝန်ဆောင်မှု လုပ်ငန်းလုပ်ကိုင်ခွင့်ရ ကုမ္ပဏီ' : 'LICENSED REMITTANCE OPERATOR'}</span>
            ${op.licenseNo ? `<span class="badge-license">${op.licenseNo}</span>` : ''}
          </div>
          <div class="company-name">
            ${language === 'my' ? `${op.companyNameMm} (${op.companyNameEn})` : op.companyNameEn}
          </div>
        </div>
      </div>
      <div class="orange-box-grid">
        <div>
          <strong>${language === 'my' ? 'ရုံးချုပ် လိပ်စာ' : 'Head Office'}: </strong>
          <span>${language === 'my' ? op.addressMm : op.addressEn}</span>
        </div>
        <div>
          <strong>${language === 'my' ? 'ဆက်သွယ်ရန် ဖုန်းနံပါတ်' : 'Contact Phone'}: </strong>
          <span style="font-family: monospace; font-weight: 600;">${op.phone}</span>
          ${op.hotline ? `<span style="margin-left: 6px; color:#c2410c;">(Hotline: <b>${op.hotline}</b>)</span>` : ''}
        </div>
      </div>
    </div>

    <!-- MTCN Golden Banner -->
    <div class="mtcn-box">
      <div>
        <div class="mtcn-label">${language === 'my' ? 'ငွေလွှဲ လျှို့ဝှက်ကုဒ် / MTCN' : 'Money Transfer Control Number (MTCN)'}</div>
        <div class="mtcn-number">${transaction.mtcn || ''}</div>
      </div>
      <div style="text-align: right;">
        <span class="status-badge">${statusDisplay}</span>
      </div>
    </div>

    <!-- 2 Columns: Sender & Receiver -->
    <div class="party-grid">
      <div class="party-card">
        <div class="party-card-title">${language === 'my' ? 'ငွေလွှဲပို့သူ (SENDER)' : 'SENDER INFORMATION'}</div>
        <div class="party-row">
          <div class="label">${language === 'my' ? 'အမည်' : 'Name'}:</div>
          <div class="value">${language === 'my' && transaction.senderNameMm ? `${transaction.senderNameMm} (${transaction.senderName || ''})` : (transaction.senderName || 'N/A')}</div>
        </div>
        <div class="party-row">
          <span class="label">${language === 'my' ? 'မှတ်ပုံတင်' : 'NRC / ID'}:</span>
          <span class="value" style="font-family: monospace;"> ${transaction.senderNrc || 'N/A'}</span>
        </div>
        ${transaction.senderPassport ? `
        <div class="party-row">
          <span class="label">${language === 'my' ? 'နိုင်ငံကူးလက်မှတ်' : 'Passport No'}:</span>
          <span class="value" style="font-family: monospace;"> ${transaction.senderPassport}</span>
        </div>` : ''}
        <div class="party-row">
          <span class="label">${language === 'my' ? 'ဖုန်း' : 'Phone'}:</span>
          <span class="value" style="font-family: monospace;"> ${transaction.senderPhone || 'N/A'}</span>
        </div>
        <div class="party-row">
          <span class="label">${language === 'my' ? 'လိပ်စာ' : 'Address'}:</span>
          <span class="value"> ${transaction.senderAddress || 'N/A'}</span>
        </div>
        <div class="party-row">
          <span class="label">${language === 'my' ? 'နိုင်ငံ' : 'Country'}:</span>
          <span class="value"> ${transaction.senderCountryCode || 'MM'}</span>
        </div>
        <div class="party-row">
          <span class="label">${language === 'my' ? 'ငွေလွှဲပို့သည့် ဘဏ်ခွဲ' : 'Sender Branch'}:</span>
          <span class="value" style="font-weight: 700; color: #0f172a;"> ${resolvedSenderBranchName}</span>
        </div>
      </div>

      <div class="party-card">
        <div class="party-card-title">${language === 'my' ? 'ငွေလက်ခံသူ (BENEFICIARY)' : 'BENEFICIARY / RECEIVER'}</div>
        <div class="party-row">
          <div class="label">${language === 'my' ? 'အမည်' : 'Name'}:</div>
          <div class="value">${language === 'my' && transaction.receiverNameMm ? `${transaction.receiverNameMm} (${transaction.receiverName || ''})` : (transaction.receiverName || 'N/A')}</div>
        </div>
        <div class="party-row">
          <span class="label">${language === 'my' ? 'မှတ်ပုံတင်' : 'NRC / ID'}:</span>
          <span class="value" style="font-family: monospace;"> ${transaction.receiverNrc || 'N/A'}</span>
        </div>
        ${transaction.receiverPassport ? `
        <div class="party-row">
          <span class="label">${language === 'my' ? 'နိုင်ငံကူးလက်မှတ်' : 'Passport No'}:</span>
          <span class="value" style="font-family: monospace;"> ${transaction.receiverPassport}</span>
        </div>` : ''}
        <div class="party-row">
          <span class="label">${language === 'my' ? 'ဖုန်း' : 'Phone'}:</span>
          <span class="value" style="font-family: monospace;"> ${transaction.receiverPhone || 'N/A'}</span>
        </div>
        <div class="party-row">
          <span class="label">${language === 'my' ? 'လိပ်စာ' : 'Address'}:</span>
          <span class="value"> ${transaction.receiverAddress || 'N/A'}</span>
        </div>
        <div class="party-row">
          <span class="label">${language === 'my' ? 'ခရီးဆုံး နိုင်ငံ' : 'Destination'}:</span>
          <span class="value"> ${transaction.receiverCountryCode || 'N/A'}</span>
        </div>
        <div class="party-row">
          <span class="label">${language === 'my' ? 'ငွေလက်ခံမည့် ဘဏ်ခွဲ' : 'Receiver Branch'}:</span>
          <span class="value" style="font-weight: 700; color: #0f172a;"> ${resolvedReceiverBranchName}</span>
        </div>
      </div>
    </div>

    <!-- Financial Breakdown Table -->
    <table class="fin-table">
      <thead>
        <tr>
          <th colspan="2">${language === 'my' ? 'ငွေပမာဏ နှင့် ငွေလဲလှယ်နှုန်း အသေးစိတ်' : 'FINANCIAL & EXCHANGE SETTLEMENT DETAILS'}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${language === 'my' ? 'လွှဲပို့ငွေ မူလပမာဏ (Send Principal)' : 'Send Principal Amount'}:</td>
          <td class="val">${fmtNum(sendAmt)} ${sourceCur}</td>
        </tr>
        <tr class="row-alt">
          <td>${language === 'my' ? 'တွက်ချက်ထားသော ငွေလဲနှုန်း (Applied Exchange Rate)' : 'Applied Exchange Rate'}:</td>
          <td class="val">1 ${sourceCur === 'MMK' ? targetCur : sourceCur} = ${fmtNum(rateAmt, '1')} MMK</td>
        </tr>
        <tr>
          <td>${language === 'my' ? 'ငွေလွှဲ ဝန်ဆောင်ခ (Service Fee)' : 'Remittance Service Fee'}:</td>
          <td class="val">${fmtNum(feeAmt)} ${sourceCur}</td>
        </tr>
        ${commAmt > 0 ? `
        <tr class="row-alt">
          <td>${language === 'my' ? 'မိတ်ဖက် ကော်မရှင်ခ (Partner Commission)' : 'Partner Commission'}:</td>
          <td class="val">${fmtNum(commAmt)} ${sourceCur}</td>
        </tr>` : ''}
        <tr class="total-row">
          <td>${language === 'my' ? 'လက်ခံရရှိငွေ စုစုပေါင်း (Total Payout / Receive Amount)' : 'Total Payout / Receive Amount'}:</td>
          <td class="val">${fmtNum(recvAmt)} ${targetCur}</td>
        </tr>
        ${transaction.isUsdBase ? `
        <tr style="background: #f0f9ff; font-weight: 700; border-top: 1.5px solid #7dd3fc;">
          <td style="color: #0369a1; padding: 6px 10px;">
            <span style="background: #0284c7; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; margin-right: 6px;">USD BASE</span>
            ${language === 'my' ? 'ဒေါ်လာတန်ဖိုး ညီမျှချက် (USD Base Equivalent)' : 'USD Base Equivalent'}:
            ${transaction.usdExchangeRate ? `<span style="font-size: 10px; color: #0284c7; font-weight: normal; margin-left: 6px;">(1 USD = ${transaction.usdExchangeRate} ${targetCur})</span>` : ''}
          </td>
          <td class="val" style="color: #0369a1; font-size: 13px; font-weight: 800;">
            $ ${fmtNum(transaction.usdAmount !== undefined ? transaction.usdAmount : (transaction.usdExchangeRate ? recvAmt / transaction.usdExchangeRate : 0), '1.00')} USD
            ${transaction.usdServiceFee !== undefined && transaction.usdServiceFee > 0 ? `<div style="font-size: 10px; font-weight: normal; color: #0284c7;">${language === 'my' ? 'ဝန်ဆောင်ခ ဒေါ်လာ' : 'USD Fee'}: $ ${fmtNum(transaction.usdServiceFee, '1.00')} USD</div>` : ''}
          </td>
        </tr>` : ''}
      </tbody>
    </table>

    <!-- Additional Details -->
    <div class="details-box">
      <div>
        <strong>${language === 'my' ? 'လွှဲပို့ရည်ရွယ်ချက်' : 'Purpose'}:</strong> ${transaction.purposeName || 'Family Support / Living Expenses'}
      </div>
      <div>
        <strong>${language === 'my' ? 'ငွေထုတ်ယူနည်း' : 'Payout Method'}:</strong> ${payoutMethodText}
      </div>
      ${partner ? `
      <div style="grid-column: 1 / -1;">
        <strong>${language === 'my' ? 'မိတ်ဖက် ကွန်ရက်' : 'Partner Channel'}:</strong> ${partner.nameEn || ''} (${partner.swiftCode || partner.code || ''})
      </div>` : ''}
      ${transaction.senderNote ? `
      <div style="grid-column: 1 / -1; font-style: italic;">
        <strong>${language === 'my' ? 'မှတ်ချက်' : 'Note'}:</strong> "${transaction.senderNote}"
      </div>` : ''}
    </div>

    <!-- Signatures & Stamp -->
    <div class="sig-grid">
      <div class="sig-col">
        <div class="sig-line"></div>
        <div class="sig-name">${transaction.creatorName || (language === 'my' ? 'စာရင်းသွင်းသူ' : 'Maker')}</div>
        <div class="sig-title">${language === 'my' ? 'စာရင်းသွင်းဝန်ထမ်း (Maker / Operator)' : 'Prepared / Operator'}</div>
      </div>
      <div class="sig-col">
        <div class="sig-line" style="border-bottom: none; display: flex; align-items: center; justify-content: center;">
          <div class="stamp-box">
            <span>${language === 'my' ? 'ဘဏ်ခွဲ တံဆိပ်တုံး' : 'Branch Stamp'}</span>
          </div>
        </div>
        <div class="sig-name">${resolvedSenderBranch ? (language === 'my' ? (resolvedSenderBranch.nameMm || resolvedSenderBranch.nameEn) : resolvedSenderBranch.nameEn) : (language === 'my' ? 'ဘဏ်ခွဲ အတည်ပြုတံဆိပ်တုံး' : 'Branch Verification Stamp')}</div>
        <div class="sig-title">${language === 'my' ? 'ဗဟိုဘဏ် စည်းမျဉ်းကိုက်' : 'CBM Compliance'}</div>
      </div>
      <div class="sig-col">
        <div class="sig-line"></div>
        <div class="sig-name">${transaction.approverName || (language === 'my' ? 'အတည်ပြုသူ မန်နေဂျာ' : 'Checker / Manager')}</div>
        <div class="sig-title">${language === 'my' ? 'ခွင့်ပြုအတည်ပြုသူ (Checker Approval)' : 'Authorized Checker Approval'}</div>
      </div>
    </div>

    <!-- Legal footer -->
    <div class="legal-notice">
      ${language === 'my'
        ? 'ဤငွေလွှဲပြောင်းမှုသည် မြန်မာနိုင်ငံတော်ဗဟိုဘဏ်၏ ငွေကြေးခဝါချမှုနှင့် အကြမ်းဖက်မှုကို ငွေကြေးထောက်ပံ့မှု တိုက်ဖျက်ရေး (AML/CFT) ညွှန်ကြားချက်များနှင့်အညီ စိစစ်အတည်ပြုထားပြီး ဖြစ်ပါသည်။'
        : 'This remittance transaction has been screened in compliance with the Central Bank of Myanmar Anti-Money Laundering (AML) & Counter-Terrorism Financing (CFT) guidelines. Beneficiary must present valid original Myanmar NRC for counter collection.'}
    </div>
  </div>

  ${autoPrint ? `
  <script>
    // Automatically trigger Print Dialog Box when loaded in standalone/popup window
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch (err) {
          console.warn('Auto print error:', err);
        }
      }, 350);
    });
  </script>
  ` : ''}
</body>
</html>`;
}

export interface VoucherPrintParams {
  transaction: RemittanceTransaction;
  branch?: Branch;
  senderBranch?: Branch;
  receiverBranch?: Branch;
  senderBranchName?: string;
  receiverBranchName?: string;
  branches?: Branch[];
  partner?: Company;
  operatorProfile?: OperatorProfile;
  language?: Language;
  autoPrint?: boolean;
}

/**
 * Reliably prints the voucher document with the exact right scale matching A4 portrait.
 * On Local & Vercel: triggers print seamlessly via isolated hidden iframe (no popups).
 * In AI Studio iframe: opens dedicated tab with autoPrint.
 */
export function printVoucherDocument(params: VoucherPrintParams): { success: boolean } {
  try {
    let isIframe = false;
    try {
      isIframe = window.self !== window.top;
    } catch {
      isIframe = true;
    }

    if (isIframe) {
      // In sandbox/iframe (e.g. AI Studio development environment):
      openVoucherInNewTab({ ...params, autoPrint: true });
      return { success: true };
    }

    // On Local (localhost) and Vercel production:
    // Use an invisible isolated iframe containing generateVoucherHtml.
    // This avoids popup blockers and guarantees identical 1-page A4 right scale.
    const fullHtml = generateVoucherHtml({ ...params, autoPrint: false });

    const existingFrame = document.getElementById('voucher-isolated-print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    const printFrame = document.createElement('iframe');
    printFrame.id = 'voucher-isolated-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      openVoucherInNewTab({ ...params, autoPrint: true });
      return { success: true };
    }

    frameDoc.open();
    frameDoc.write(fullHtml);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          if (printFrame && printFrame.parentNode) {
            printFrame.parentNode.removeChild(printFrame);
          }
        }, 4000);
      } catch (err) {
        console.warn('Iframe print error, falling back to new tab:', err);
        openVoucherInNewTab({ ...params, autoPrint: true });
      }
    }, 250);

    return { success: true };
  } catch (err) {
    console.warn('printVoucherDocument error, falling back to new tab:', err);
    openVoucherInNewTab({ ...params, autoPrint: true });
    return { success: true };
  }
}

/**
 * Opens the voucher in a dedicated tab and automatically triggers the Print Dialog Box.
 */
export function openVoucherInNewTab(params: VoucherPrintParams): boolean {
  try {
    const html = generateVoucherHtml({
      ...params,
      autoPrint: params.autoPrint !== false,
    });
    let win = window.open('', '_blank');
    if (!win) {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      win = window.open(url, '_blank');
    }
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      try {
        win.focus();
      } catch {}
      return true;
    } else {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener,noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 3000);
      return true;
    }
  } catch (err) {
    console.error('Failed to open voucher in new tab, downloading instead:', err);
    downloadVoucherHtml(params);
    return false;
  }
}

export function downloadVoucherHtml(params: VoucherPrintParams): void {
  const html = generateVoucherHtml(params);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Voucher_${params.transaction.mtcn || params.transaction.transactionNo}.html`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, 1000);
}

