/**
 * Helper to generate high-fidelity, vector-crisp SVG data URLs 
 * for Myanmar NRC Card and Myanmar International Passport.
 */

export const createSampleMyanmarNrcSvg = (
  nrcNo: string = '12/BAHANA(N)184920',
  nameMm: string = 'ဦးဇော်ဝင်းထက်',
  nameEn: string = 'U ZAW WIN HTET',
  dob: string = '14/07/1988',
  fatherName: string = 'U TIN AUNG'
): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 440" width="700" height="440">
  <defs>
    <linearGradient id="nrcBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ecfdf5"/>
      <stop offset="50%" stop-color="#d1fae5"/>
      <stop offset="100%" stop-color="#a7f3d0"/>
    </linearGradient>
    <pattern id="guilloche" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="15" cy="15" r="14" fill="none" stroke="#059669" stroke-width="0.3" stroke-opacity="0.25"/>
      <circle cx="15" cy="15" r="8" fill="none" stroke="#047857" stroke-width="0.3" stroke-opacity="0.2"/>
    </pattern>
    <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#064e3b" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Card Border & Background -->
  <rect x="15" y="15" width="670" height="410" rx="20" fill="url(#nrcBg)" stroke="#059669" stroke-width="3" filter="url(#cardShadow)"/>
  <rect x="25" y="25" width="650" height="390" rx="14" fill="url(#guilloche)" stroke="#10b981" stroke-width="1"/>

  <!-- Top Header Header Band -->
  <rect x="25" y="25" width="650" height="74" rx="14" fill="#065f46"/>
  <text x="350" y="52" fill="#fef3c7" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold" text-anchor="middle" letter-spacing="1">
    ပြည်ထောင်စုသမ္မတမြန်မာနိုင်ငံတော်
  </text>
  <text x="350" y="72" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="medium" text-anchor="middle" letter-spacing="0.5">
    အမျိုးသားမှတ်ပုံတင်နှင့် နိုင်ငံသားစိစစ်ရေးကတ်ပြား (NRC)
  </text>

  <!-- National Peacock / Seal Emblem -->
  <g transform="translate(48, 42)">
    <circle cx="18" cy="18" r="18" fill="#f59e0b" stroke="#fef3c7" stroke-width="1.5"/>
    <path d="M18 7 L21 15 L29 15 L23 20 L25 28 L18 23 L11 28 L13 20 L7 15 L15 15 Z" fill="#b45309"/>
  </g>

  <!-- NRC Number Badge (Prominent) -->
  <g transform="translate(45, 115)">
    <rect x="0" y="0" width="380" height="38" rx="8" fill="#047857"/>
    <text x="14" y="24" fill="#6ee7b7" font-family="monospace" font-size="11" font-weight="bold">NRC NO :</text>
    <text x="92" y="25" fill="#ffffff" font-family="monospace" font-size="15" font-weight="900" letter-spacing="1.5">${nrcNo}</text>
  </g>

  <!-- Photo Box (Right Side) -->
  <g transform="translate(460, 115)">
    <rect x="0" y="0" width="185" height="235" rx="10" fill="#f8fafc" stroke="#047857" stroke-width="2"/>
    <!-- Photo Silhouette -->
    <rect x="10" y="10" width="165" height="215" rx="8" fill="#e2e8f0"/>
    <circle cx="92" cy="85" r="42" fill="#64748b"/>
    <path d="M35 195 C35 145 60 135 92 135 C125 135 150 145 150 195 Z" fill="#475569"/>
    <!-- Stamp over photo -->
    <circle cx="140" cy="180" r="32" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="4,2" stroke-opacity="0.8"/>
    <text x="140" y="183" fill="#dc2626" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle" fill-opacity="0.85">IMMIGRATION</text>
    <text x="140" y="195" fill="#dc2626" font-family="monospace" font-size="7" text-anchor="middle" fill-opacity="0.85">VERIFIED</text>
  </g>

  <!-- Information Grid -->
  <g transform="translate(45, 170)" font-family="system-ui, -apple-system, sans-serif">
    <!-- Name (Myanmar) -->
    <text x="0" y="15" fill="#065f46" font-size="11" font-weight="bold">အမည် (Name - MM):</text>
    <text x="175" y="15" fill="#0f172a" font-size="13" font-weight="bold">${nameMm}</text>

    <!-- Name (English) -->
    <text x="0" y="45" fill="#065f46" font-size="11" font-weight="bold">Name (English):</text>
    <text x="175" y="45" fill="#0f172a" font-size="13" font-weight="900" letter-spacing="0.5">${nameEn}</text>

    <!-- Father's Name -->
    <text x="0" y="75" fill="#065f46" font-size="11" font-weight="bold">အဘအမည် (Father):</text>
    <text x="175" y="75" fill="#1e293b" font-size="12" font-weight="semibold">${fatherName}</text>

    <!-- Date of Birth -->
    <text x="0" y="105" fill="#065f46" font-size="11" font-weight="bold">မွေးသက္ကရာဇ် (DOB):</text>
    <text x="175" y="105" fill="#047857" font-family="monospace" font-size="13" font-weight="bold">${dob}</text>

    <!-- Citizenship / Blood Group -->
    <text x="0" y="135" fill="#065f46" font-size="11" font-weight="bold">လူမျိုး / ကိုးကွယ်သည့်ဘာသာ:</text>
    <text x="175" y="135" fill="#1e293b" font-size="12">ဗမာ / ဗုဒ္ဓ (Burmese / Buddhist)</text>

    <!-- Address / District -->
    <text x="0" y="165" fill="#065f46" font-size="11" font-weight="bold">နေရပ်လိပ်စာ (District):</text>
    <text x="175" y="165" fill="#334155" font-size="11">ဗဟန်းမြို့နယ်၊ ရန်ကုန်တိုင်းဒေသကြီး</text>
  </g>

  <!-- Bottom Official Bar & Hologram Mark -->
  <g transform="translate(45, 365)">
    <rect x="0" y="0" width="380" height="34" rx="6" fill="#ecfdf5" stroke="#059669" stroke-width="1.2"/>
    <text x="14" y="21" fill="#047857" font-family="monospace" font-size="9" font-weight="bold">OFFICIAL REPUBLIC OF THE UNION OF MYANMAR IDENTITY</text>
    <!-- Seal icon -->
    <circle cx="360" cy="17" r="9" fill="#10b981"/>
    <text x="360" y="21" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">✓</text>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const createSampleMyanmarPassportSvg = (
  passportNo: string = 'MA-918234',
  nameEn: string = 'U ZAW WIN HTET',
  dob: string = '14/07/1988',
  sex: string = 'M'
): string => {
  const cleanPassport = passportNo.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const cleanName = nameEn.replace(/[^A-Z ]/gi, '').toUpperCase();
  const mrzName = cleanName.replace(/\s+/g, '<');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480" width="720" height="480">
  <defs>
    <linearGradient id="passportBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb"/>
      <stop offset="50%" stop-color="#fef3c7"/>
      <stop offset="100%" stop-color="#fde68a"/>
    </linearGradient>
    <filter id="passShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#78350f" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Laminated Document Page -->
  <rect x="15" y="15" width="690" height="450" rx="16" fill="url(#passportBg)" stroke="#d97706" stroke-width="2.5" filter="url(#passShadow)"/>

  <!-- Top Burgundy Header -->
  <rect x="15" y="15" width="690" height="60" rx="16" fill="#881337"/>
  <text x="360" y="40" fill="#fef3c7" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" letter-spacing="2">
    ပြည်ထောင်စုသမ္မတမြန်မာနိုင်ငံတော် • REPUBLIC OF THE UNION OF MYANMAR
  </text>
  <text x="360" y="58" fill="#fde047" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="900" text-anchor="middle" letter-spacing="3">
    PASSPORT / နိုင်ငံကူးလက်မှတ်
  </text>

  <!-- Photo Box (Left Side) -->
  <g transform="translate(42, 90)">
    <rect x="0" y="0" width="170" height="225" rx="8" fill="#f8fafc" stroke="#991b1b" stroke-width="1.5"/>
    <rect x="8" y="8" width="154" height="209" rx="6" fill="#cbd5e1"/>
    <circle cx="85" cy="80" r="38" fill="#475569"/>
    <path d="M30 185 C30 135 55 125 85 125 C115 125 140 135 140 185 Z" fill="#334155"/>
    <!-- Holographic security overlay -->
    <path d="M15 20 L155 190 M15 70 L120 200" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.4"/>
  </g>

  <!-- Passport Information Fields (Right Side) -->
  <g transform="translate(240, 95)" font-family="system-ui, -apple-system, sans-serif">
    <!-- Type / Country / Passport No -->
    <g>
      <text x="0" y="12" fill="#78350f" font-size="9" font-weight="bold">Type / အမျိုးအစား</text>
      <text x="0" y="28" fill="#0f172a" font-family="monospace" font-size="13" font-weight="bold">P</text>

      <text x="75" y="12" fill="#78350f" font-size="9" font-weight="bold">Code / နိုင်ငံကုဒ်</text>
      <text x="75" y="28" fill="#0f172a" font-family="monospace" font-size="13" font-weight="bold">MMR</text>

      <text x="180" y="12" fill="#991b1b" font-size="9" font-weight="bold">Passport No. / နိုင်ငံကူးလက်မှတ်အမှတ်</text>
      <text x="180" y="30" fill="#991b1b" font-family="monospace" font-size="18" font-weight="900" letter-spacing="1">${passportNo}</text>
    </g>

    <!-- Full Name -->
    <g transform="translate(0, 48)">
      <text x="0" y="12" fill="#78350f" font-size="9" font-weight="bold">Full Name / အမည်အပြည့်အစုံ</text>
      <text x="0" y="30" fill="#0f172a" font-size="15" font-weight="900" letter-spacing="0.5">${nameEn}</text>
    </g>

    <!-- Nationality -->
    <g transform="translate(0, 92)">
      <text x="0" y="12" fill="#78350f" font-size="9" font-weight="bold">Nationality / နိုင်ငံသား</text>
      <text x="0" y="27" fill="#0f172a" font-size="12" font-weight="bold">MYANMAR</text>

      <text x="180" y="12" fill="#78350f" font-size="9" font-weight="bold">Sex / လိင်</text>
      <text x="180" y="27" fill="#0f172a" font-size="12" font-weight="bold">${sex}</text>
    </g>

    <!-- Date of Birth & Place of Birth -->
    <g transform="translate(0, 134)">
      <text x="0" y="12" fill="#78350f" font-size="9" font-weight="bold">Date of Birth / မွေးသက္ကရာဇ်</text>
      <text x="0" y="27" fill="#b45309" font-family="monospace" font-size="12" font-weight="bold">${dob}</text>

      <text x="180" y="12" fill="#78350f" font-size="9" font-weight="bold">Place of Birth / မွေးဖွားရာဒေသ</text>
      <text x="180" y="27" fill="#0f172a" font-size="12" font-weight="semibold">YANGON, MYANMAR</text>
    </g>

    <!-- Dates of Issue & Expiry -->
    <g transform="translate(0, 176)">
      <text x="0" y="12" fill="#78350f" font-size="9" font-weight="bold">Date of Issue / ထုတ်ပေးသည့်ရက်</text>
      <text x="0" y="27" fill="#334155" font-family="monospace" font-size="11">02 SEP 2024</text>

      <text x="180" y="12" fill="#78350f" font-size="9" font-weight="bold">Date of Expiry / သက်တမ်းကုန်ရက်</text>
      <text x="180" y="27" fill="#059669" font-family="monospace" font-size="12" font-weight="bold">01 SEP 2029</text>
    </g>
  </g>

  <!-- Machine Readable Zone (MRZ) -->
  <g transform="translate(30, 350)">
    <rect x="0" y="0" width="660" height="90" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
    <text x="20" y="36" fill="#0f172a" font-family="monospace" font-size="15" font-weight="bold" letter-spacing="4">
      P&lt;MMR${mrzName}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
    </text>
    <text x="20" y="68" fill="#0f172a" font-family="monospace" font-size="15" font-weight="bold" letter-spacing="4">
      ${cleanPassport}&lt;4MMR8807147M2909012&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;02
    </text>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const createSampleMyanmarNrcBackSvg = (
  occupation: string = 'ကုမ္ပဏီဝန်ထမ်း (Company Staff)',
  address: string = 'အမှတ် (၁၂)၊ ဗဟန်းလမ်း၊ ဗဟန်းမြို့နယ်၊ ရန်ကုန်တိုင်းဒေသကြီး'
): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 440" width="700" height="440">
  <defs>
    <linearGradient id="nrcBackBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff1f2"/>
      <stop offset="50%" stop-color="#ffe4e6"/>
      <stop offset="100%" stop-color="#fecdd3"/>
    </linearGradient>
    <pattern id="guillocheBack" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="14" cy="14" r="13" fill="none" stroke="#e11d48" stroke-width="0.3" stroke-opacity="0.25"/>
      <circle cx="14" cy="14" r="7" fill="none" stroke="#be123c" stroke-width="0.3" stroke-opacity="0.2"/>
    </pattern>
    <filter id="backCardShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#881337" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Card Border & Background -->
  <rect x="15" y="15" width="670" height="410" rx="20" fill="url(#nrcBackBg)" stroke="#e11d48" stroke-width="2.5" filter="url(#backCardShadow)"/>
  <rect x="25" y="25" width="650" height="390" rx="14" fill="url(#guillocheBack)" stroke="#f43f5e" stroke-width="1"/>

  <!-- Top Header Band -->
  <rect x="25" y="25" width="650" height="50" rx="14" fill="#9f1239"/>
  <text x="350" y="56" fill="#fef2f2" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" letter-spacing="1">
    အလုပ်အကိုင်နှင့် နေရပ်လိပ်စာ (OCCUPATION &amp; RESIDENCE) - BACK
  </text>

  <!-- Fingerprint Impression Box (Left Side) -->
  <g transform="translate(45, 90)">
    <rect x="0" y="0" width="180" height="200" rx="10" fill="#ffffff" stroke="#9f1239" stroke-width="2"/>
    <text x="90" y="22" fill="#881337" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="bold" text-anchor="middle">
      လက်ဗွေပုံစံ (FINGERPRINT)
    </text>
    <!-- Fingerprint graphic representation -->
    <g transform="translate(40, 35)" opacity="0.85">
      <ellipse cx="50" cy="70" rx="36" ry="52" fill="#334155" opacity="0.15"/>
      <ellipse cx="50" cy="70" rx="32" ry="46" fill="none" stroke="#1e293b" stroke-width="2.5"/>
      <ellipse cx="50" cy="70" rx="25" ry="38" fill="none" stroke="#0f172a" stroke-width="2.5"/>
      <ellipse cx="50" cy="70" rx="18" ry="28" fill="none" stroke="#334155" stroke-width="2.2"/>
      <ellipse cx="50" cy="70" rx="11" ry="18" fill="none" stroke="#0f172a" stroke-width="2"/>
      <path d="M50 56 Q54 70 50 84" fill="none" stroke="#1e293b" stroke-width="2"/>
      <path d="M42 60 Q44 70 42 80" fill="none" stroke="#334155" stroke-width="1.8"/>
      <path d="M58 60 Q56 70 58 80" fill="none" stroke="#334155" stroke-width="1.8"/>
    </g>
    <!-- Verified Official Stamp -->
    <circle cx="90" cy="155" r="28" fill="none" stroke="#dc2626" stroke-width="1.8" stroke-dasharray="4,2"/>
    <text x="90" y="152" fill="#dc2626" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="bold" text-anchor="middle">IMMIGRATION</text>
    <text x="90" y="163" fill="#dc2626" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="bold" text-anchor="middle">OFFICE YGN</text>
  </g>

  <!-- Information Details (Right Side) -->
  <g transform="translate(245, 95)" font-family="system-ui, -apple-system, sans-serif">
    <!-- Occupation -->
    <text x="0" y="20" fill="#9f1239" font-size="12" font-weight="bold">အလုပ်အကိုင် (Occupation):</text>
    <text x="0" y="44" fill="#0f172a" font-size="13" font-weight="bold">${occupation}</text>

    <!-- Address -->
    <text x="0" y="80" fill="#9f1239" font-size="12" font-weight="bold">နေရပ်လိပ်စာ (Residence Address):</text>
    <text x="0" y="104" fill="#0f172a" font-size="12" font-weight="medium">${address}</text>

    <!-- Issuing Officer Signature Box -->
    <g transform="translate(0, 130)">
      <rect x="0" y="0" width="390" height="55" rx="6" fill="#ffffff" stroke="#f43f5e" stroke-width="1"/>
      <text x="12" y="20" fill="#9f1239" font-size="10" font-weight="bold">ထုတ်ပေးသည့်အရာရှိ လက်မှတ် (Issuing Authority Signature):</text>
      <!-- Script signature representation -->
      <path d="M50 42 C80 25, 120 48, 160 30 C190 20, 220 45, 270 34" fill="none" stroke="#1e3a8a" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="345" cy="27" r="18" fill="none" stroke="#be123c" stroke-width="1.2"/>
      <text x="345" y="30" fill="#be123c" font-size="7" font-weight="bold" text-anchor="middle">SEAL</text>
    </g>
  </g>

  <!-- Warning Rules 1, 2, 3 (Bottom) -->
  <g transform="translate(45, 305)" font-family="system-ui, -apple-system, sans-serif">
    <rect x="0" y="0" width="610" height="95" rx="8" fill="#ffffff" stroke="#fda4af" stroke-width="1.2"/>
    <text x="14" y="20" fill="#9f1239" font-size="10" font-weight="bold">လိုက်နာရမည့် စည်းကမ်းချက်များ (Regulations):</text>
    <text x="14" y="40" fill="#334155" font-size="9.5">၁။ ဤကတ်ပြားကို အမြဲဆောင်ထားရမည်။</text>
    <text x="14" y="60" fill="#334155" font-size="9.5">၂။ ပျောက်ဆုံး၊ ပျက်စီးသည့်အခါ သက်ဆိုင်ရာ ရဲစခန်းနှင့် မြို့နယ်လူဝင်မှုကြီးကြပ်ရေးရုံးသို့ ချက်ချင်း အကြောင်းကြားရမည်။</text>
    <text x="14" y="80" fill="#334155" font-size="9.5">၃။ ကတ်လက်ဝယ်ရှိသူ အသက် (၃၀) ပြည့်လျှင် နိုင်ငံသားစိစစ်ရေးကတ်ပြားကို အသစ်လဲလှယ်ရမည်။</text>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const sampleSenderNrcAttachment = createSampleMyanmarNrcSvg();
export const sampleSenderNrcBackAttachment = createSampleMyanmarNrcBackSvg();
export const sampleSenderPassportAttachment = createSampleMyanmarPassportSvg();

export const createSampleDepositReceiptSvg = (
  senderName: string = 'U ZAW WIN HTET',
  nrcNo: string = '12/BAHANA(N)184920',
  amountFormatted: string = '5,000,000 MMK',
  branchName: string = 'Yangon Main Branch (BR-001)',
  dateStr: string = '07/09/2026'
): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 460" width="700" height="460">
  <defs>
    <linearGradient id="slipBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#f1f5f9"/>
    </linearGradient>
    <filter id="slipShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Slip Border & Background -->
  <rect x="15" y="15" width="670" height="430" rx="14" fill="url(#slipBg)" stroke="#0284c7" stroke-width="2.5" filter="url(#slipShadow)"/>

  <!-- Bank Top Header -->
  <rect x="15" y="15" width="670" height="70" rx="14" fill="#0369a1"/>
  <text x="350" y="44" fill="#f0f9ff" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" letter-spacing="1">
    REMITTANCE CASH DEPOSIT VOUCHER
  </text>
  <text x="350" y="66" fill="#bae6fd" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="medium" text-anchor="middle">
    ဘဏ်ငွေသွင်းပြေစာ (ငွေလွှဲပေးသွင်းမှု အထောက်အထားမူရင်း)
  </text>

  <!-- Slip Meta Bar -->
  <g transform="translate(35, 100)" font-family="system-ui, -apple-system, sans-serif">
    <text x="0" y="15" fill="#64748b" font-size="11" font-weight="semibold">SLIP NO :</text>
    <text x="65" y="15" fill="#0f172a" font-family="monospace" font-size="12" font-weight="bold">DEP-${Date.now().toString().slice(-6)}</text>

    <text x="260" y="15" fill="#64748b" font-size="11" font-weight="semibold">DATE :</text>
    <text x="310" y="15" fill="#0f172a" font-family="monospace" font-size="12" font-weight="bold">${dateStr}</text>

    <text x="440" y="15" fill="#64748b" font-size="11" font-weight="semibold">BRANCH :</text>
    <text x="505" y="15" fill="#0284c7" font-size="11" font-weight="bold">${branchName.slice(0, 18)}</text>
  </g>

  <!-- Divider -->
  <line x1="35" y1="130" x2="665" y2="130" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6,4"/>

  <!-- Deposit Details Table -->
  <g transform="translate(35, 150)" font-family="system-ui, -apple-system, sans-serif">
    <!-- Row 1: Depositor Name -->
    <rect x="0" y="0" width="630" height="34" fill="#e2e8f0" rx="6"/>
    <text x="16" y="22" fill="#334155" font-size="11" font-weight="bold">ငွေသွင်းသူ အမည် (Depositor Name):</text>
    <text x="240" y="22" fill="#0f172a" font-size="13" font-weight="900">${senderName}</text>

    <!-- Row 2: NRC / ID -->
    <rect x="0" y="42" width="630" height="34" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" rx="6"/>
    <text x="16" y="64" fill="#334155" font-size="11" font-weight="bold">မှတ်ပုံတင်အမှတ် (NRC / ID No):</text>
    <text x="240" y="64" fill="#0369a1" font-family="monospace" font-size="13" font-weight="bold">${nrcNo}</text>

    <!-- Row 3: Remittance Purpose -->
    <rect x="0" y="84" width="630" height="34" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" rx="6"/>
    <text x="16" y="106" fill="#334155" font-size="11" font-weight="bold">ငွေသွင်းရည်ရွယ်ချက် (Purpose):</text>
    <text x="240" y="106" fill="#0f172a" font-size="12">ပြည်တွင်း/ပြည်ပ ငွေလွှဲပေးပို့မှု (Outward Remittance)</text>

    <!-- Row 4: Deposited Amount -->
    <rect x="0" y="126" width="630" height="42" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5" rx="8"/>
    <text x="16" y="152" fill="#0369a1" font-size="12" font-weight="900">ပေးသွင်းငွေပမာဏ (Total Paid):</text>
    <text x="240" y="154" fill="#0369a1" font-family="monospace" font-size="17" font-weight="900">${amountFormatted}</text>
  </g>

  <!-- Signatures & Stamp -->
  <g transform="translate(35, 335)" font-family="system-ui, -apple-system, sans-serif">
    <!-- Customer Signature -->
    <g transform="translate(40, 0)">
      <line x1="0" y1="45" x2="160" y2="45" stroke="#94a3b8" stroke-width="1.5"/>
      <path d="M20 40 C40 25, 70 42, 100 28 C120 18, 140 38, 155 30" fill="none" stroke="#0f172a" stroke-width="1.8"/>
      <text x="80" y="65" fill="#64748b" font-size="10" font-weight="bold" text-anchor="middle">ငွေသွင်းသူ လက်မှတ်</text>
      <text x="80" y="78" fill="#94a3b8" font-size="9" text-anchor="middle">(Depositor Signature)</text>
    </g>

    <!-- Official Stamp -->
    <g transform="translate(280, 5)">
      <circle cx="45" cy="35" r="38" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="5,2"/>
      <circle cx="45" cy="35" r="33" fill="none" stroke="#dc2626" stroke-width="1"/>
      <text x="45" y="27" fill="#dc2626" font-size="8" font-weight="900" text-anchor="middle">REMITTANCE DEPT</text>
      <text x="45" y="38" fill="#dc2626" font-size="9" font-weight="900" text-anchor="middle">RECEIVED</text>
      <text x="45" y="49" fill="#dc2626" font-size="8" font-weight="bold" text-anchor="middle">CASH PAID</text>
    </g>

    <!-- Cashier / Teller Signature -->
    <g transform="translate(430, 0)">
      <line x1="0" y1="45" x2="160" y2="45" stroke="#94a3b8" stroke-width="1.5"/>
      <path d="M15 35 C45 20, 80 44, 110 25 C130 15, 145 35, 158 22" fill="none" stroke="#0369a1" stroke-width="2"/>
      <text x="80" y="65" fill="#64748b" font-size="10" font-weight="bold" text-anchor="middle">တာဝန်ခံ ငွေကိုင်လက်မှတ်</text>
      <text x="80" y="78" fill="#94a3b8" font-size="9" text-anchor="middle">(Authorized Teller / Cashier)</text>
    </g>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
