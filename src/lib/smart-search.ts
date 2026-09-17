/**
 * محرك بحث عربي: تطبيع الألف/التاء المربوطة/الألف المقصورة + إزالة
 * التشكيل + مطابقة جزئية أو ضبابية (Subsequence)
 */
export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "") // الحركات
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** كل حرف من الاستعلام يظهر في الهدف بنفس الترتيب */
export function fuzzyMatch(
  query: string,
  target: string | null | undefined
): boolean {
  const nq = normalizeArabic(query);
  const nt = normalizeArabic(target);
  if (!nq) return false;
  if (nt.includes(nq)) return true;
  let qi = 0;
  for (let ti = 0; ti < nt.length && qi < nq.length; ti++)
    if (nt[ti] === nq[qi]) qi++;
  return qi === nq.length;
}

/** درجة لترتيب النتائج: 0 = لا تطابق */
export function searchScore(
  query: string,
  target: string | null | undefined
): number {
  const nq = normalizeArabic(query);
  const nt = normalizeArabic(target);
  if (!nq || !nt) return 0;
  const idx = nt.indexOf(nq);
  if (idx === 0) return 100; // يبدأ بـ
  if (idx > 0) return 80 - idx; // يحتويه
  return fuzzyMatch(query, target) ? 40 : 0; // ضبابي
}
