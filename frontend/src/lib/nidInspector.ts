// Instant client-side parser & breakdown inspector for Egyptian National IDs (100% Go parity)

export const EGYPTIAN_GOVERNORATES: Record<string, string> = {
  '01': 'القاهرة',
  '02': 'الإسكندرية',
  '03': 'بورسعيد',
  '04': 'السويس',
  '11': 'دمياط',
  '12': 'الدقهلية',
  '13': 'الشرقية',
  '14': 'القليوبية',
  '15': 'كفر الشيخ',
  '16': 'الغربية',
  '17': 'المنوفية',
  '18': 'البحيرة',
  '19': 'الإسماعيلية',
  '21': 'الجيزة',
  '22': 'بني سويف',
  '23': 'الفيوم',
  '24': 'المنيا',
  '25': 'أسيوط',
  '26': 'سوهاج',
  '27': 'قنا',
  '28': 'أسوان',
  '29': 'الأقصر',
  '31': 'البحر الأحمر',
  '32': 'الوادي الجديد',
  '33': 'مطروح',
  '34': 'شمال سيناء',
  '35': 'جنوب سيناء',
  '88': 'مواليد الخارج',
};

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// Modulo-11 weights matching internal/nid/parser.go
const CHECKSUM_WEIGHTS = [2, 7, 6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export interface NIDInspection {
  raw: string;
  clean: string;
  valid: boolean;
  length: number;
  birthDate?: string;
  formattedDate?: string;
  age?: number;
  governorate?: string;
  gender?: 'ذكر' | 'أنثى';
  errorReason?: string;
  checksumValid?: boolean;
  expectedChecksum?: number;
  stageWarning?: string;
  suggestedId?: string;
}

export function calculateChecksum(clean: string): { valid: boolean; expected: number } {
  if (clean.length !== 14) return { valid: false, expected: -1 };
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean[i], 10) * CHECKSUM_WEIGHTS[i];
  }
  const remainder = sum % 11;
  const expected = (11 - remainder) % 10;
  const actual = parseInt(clean[13], 10);
  return { valid: actual === expected, expected };
}

export function inspectEgyptianNID(rawInput: string, stage?: string): NIDInspection {
  if (!rawInput) {
    return { raw: '', clean: '', valid: false, length: 0, errorReason: 'الرقم القومي فارغ' };
  }

  // Convert Eastern Arabic digits to Western digits
  const clean = rawInput
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
    .replace(/\D/g, '');

  const len = clean.length;
  if (len === 0) {
    return { raw: rawInput, clean, valid: false, length: 0, errorReason: 'الرجاء إدخال أرقام فقط' };
  }

  if (len < 14) {
    return {
      raw: rawInput,
      clean,
      valid: false,
      length: len,
      errorReason: `المتبقي ${14 - len} أرقام لاكتمال الرقم القومي`,
    };
  }

  if (len > 14) {
    return {
      raw: rawInput,
      clean,
      valid: false,
      length: len,
      errorReason: `الرقم القومي يحتوي على ${len} رقماً (الحد الأقصى 14)`,
    };
  }

  const centuryDigit = clean[0];
  if (centuryDigit !== '2' && centuryDigit !== '3') {
    return {
      raw: rawInput,
      clean,
      valid: false,
      length: 14,
      errorReason: 'الرقم الأول يجب أن يكون 2 (مواليد 1900-1999) أو 3 (مواليد 2000-2099)',
    };
  }

  const century = centuryDigit === '3' ? 2000 : 1900;
  const yearOffset = parseInt(clean.substring(1, 3), 10);
  const year = century + yearOffset;
  const month = parseInt(clean.substring(3, 5), 10);
  const day = parseInt(clean.substring(5, 7), 10);

  if (month < 1 || month > 12) {
    return { raw: rawInput, clean, valid: false, length: 14, errorReason: `شهر الميلاد (${month}) غير صالح في الرقم القومي` };
  }

  const maxDays = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDays) {
    return { raw: rawInput, clean, valid: false, length: 14, errorReason: `يوم الميلاد (${day}) غير صالح لشهر ${month}` };
  }

  const govCode = clean.substring(7, 9);
  const govName = EGYPTIAN_GOVERNORATES[govCode];
  if (!govName) {
    return { raw: rawInput, clean, valid: false, length: 14, errorReason: `كود المحافظة (${govCode}) غير مسجل بالسجل المدني` };
  }

  const { valid: checksumValid, expected: expectedChecksum } = calculateChecksum(clean);

  const genderDigit = parseInt(clean[12], 10);
  const gender: 'ذكر' | 'أنثى' = genderDigit % 2 === 1 ? 'ذكر' : 'أنثى';

  const birthDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const formattedDate = `${day} ${ARABIC_MONTHS[month - 1]} ${year}`;

  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  let errorReason: string | undefined;
  if (!checksumValid) {
    errorReason = `الرقم القومي غير مطابق لخوارزمية التحقق (الرقم التأكيدي الأخير ${clean[13]}، المتوقع ${expectedChecksum})`;
  }

  let stageWarning: string | undefined;
  let suggestedId: string | undefined;

  // Detect century typo for 2000s kids entered with 2 (e.g. 216 -> 1916 instead of 316 -> 2016)
  if (centuryDigit === '2' && yearOffset <= 30) {
    const candidate = '3' + clean.substring(1);
    const candidateChecksum = calculateChecksum(candidate);
    if (candidateChecksum.valid) {
      suggestedId = candidate;
    } else if (candidateChecksum.expected >= 0) {
      suggestedId = candidate.substring(0, 13) + candidateChecksum.expected;
    }
    stageWarning = `سنة الميلاد المستخرجة 19${String(yearOffset).padStart(2, '0')} (العمر ${age} سنة)! هل يبدأ الرقم بـ 3 لمواليد 20${String(yearOffset).padStart(2, '0')}؟`;
  } else if (!checksumValid && expectedChecksum >= 0) {
    suggestedId = clean.substring(0, 13) + expectedChecksum;
  } else if (stage) {
    if (stage.includes('حضان') && (age < 2 || age > 9)) {
      stageWarning = `العمر المستخرج (${age} سنة) غير معتاد لمرحلة الحضانات (المتوقع 3-6 سنوات)`;
    } else if (stage.includes('ابتدائ') && (age < 5 || age > 15)) {
      stageWarning = `العمر المستخرج (${age} سنة) غير معتاد للمرحلة الابتدائية (المتوقع 6-12 سنة)`;
    } else if (stage.includes('إعداد') && (age < 10 || age > 18)) {
      stageWarning = `العمر المستخرج (${age} سنة) غير معتاد للمرحلة الإعدادية (المتوقع 12-15 سنة)`;
    } else if (stage.includes('ثانوي') && (age < 13 || age > 22)) {
      stageWarning = `العمر المستخرج (${age} سنة) غير معتاد للمرحلة الثانوية (المتوقع 15-18 سنة)`;
    } else if (stage.includes('جامع') && (age < 16 || age > 35)) {
      stageWarning = `العمر المستخرج (${age} سنة) غير معتاد لمرحلة الجامعة (المتوقع 18-25 سنة)`;
    }
  }

  return {
    raw: rawInput,
    clean,
    valid: checksumValid,
    length: 14,
    birthDate: birthDateStr,
    formattedDate,
    age,
    governorate: govName,
    gender,
    checksumValid,
    expectedChecksum,
    errorReason,
    stageWarning,
    suggestedId,
  };
}

