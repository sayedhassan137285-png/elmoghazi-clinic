import { PrismaClient, VisitType } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const SECRETARY_PERMS = ["patients", "laser", "waiting", "appointments"];

async function main() {
  // ─── الحسابات ───
  const doctorPassword = process.env.SEED_DOCTOR_PASSWORD || "Elmoghazi@2024";
  await db.user.upsert({
    where: { email: "doctor@elmoghazi.local" },
    update: {},
    create: {
      email: "doctor@elmoghazi.local",
      name: "د. أحمد المغازي",
      password: await bcrypt.hash(doctorPassword, 10),
      role: "DOCTOR",
    },
  });

  await db.user.upsert({
    where: { email: "secretary@elmoghazi.local" },
    update: {},
    create: {
      email: "secretary@elmoghazi.local",
      name: "سارة — السكرتيرة",
      password: await bcrypt.hash("Secretary@2024", 10),
      role: "SECRETARY",
      permissions: SECRETARY_PERMS,
    },
  });

  // ─── الخدمات ───
  if ((await db.service.count()) === 0) {
    await db.service.createMany({
      data: [
        { name: "كشف", category: "كشف", price: 300, duration: 15 },
        { name: "إعادة", category: "إعادة", price: 150, duration: 10 },
        { name: "تنظيف بشرة", category: "عناية", price: 500, duration: 40 },
        { name: "تقشير كيميائي", category: "عناية", price: 800, duration: 30 },
        { name: "ميزوثيرابي", category: "عناية", price: 1500, duration: 45 },
        { name: "ليزر منطقة صغيرة", category: "ليزر", price: 400, duration: 20 },
        { name: "ليزر منطقة متوسطة", category: "ليزر", price: 700, duration: 30 },
      ],
    });
  }

  // ─── باقات الليزر ───
  if ((await db.laserPackage.count()) === 0) {
    await db.laserPackage.createMany({
      data: [
        { name: "ليزر شعر — الوجه كامل", bodyArea: "الوجه", sessionsCount: 8, price: 2400 },
        { name: "ليزر شعر — أطراف كاملة", bodyArea: "الأطراف", sessionsCount: 6, price: 3000 },
        { name: "فول بودي", bodyArea: "كامل الجسم", sessionsCount: 6, price: 6000 },
      ],
    });
  }

  // ─── قاعدة الأدوية ───
  if ((await db.medication.count()) === 0) {
    await db.medication.createMany({
      data: [
        { name: "Panadol (Paracetamol) 500mg", defaultDose: "قرص", defaultInstructions: "قرص كل 8 ساعات بعد الأكل" },
        { name: "Augmentin 1g", defaultDose: "قرص", defaultInstructions: "قرص كل 12 ساعة لمدة 7 أيام" },
        { name: "Zyrtec 10mg", defaultDose: "قرص", defaultInstructions: "قرص يوميًا قبل النوم" },
        { name: "Fucidin Cream", defaultDose: "مرهم", defaultInstructions: "يُدهن مرتين يوميًا على المنطقة" },
        { name: "Vitamin D 50000 IU", defaultDose: "قرص", defaultInstructions: "قرص أسبوعيًا مع وجبة" },
        { name: "Omega 3", defaultDose: "كبسولة", defaultInstructions: "كبسولة يوميًا بعد الفطار" },
        { name: "Bioderma Cleanser", defaultDose: "غسول", defaultInstructions: "يُستخدم صباحًا ومساءً للوجه" },
      ],
    });
  }

  // ─── الأطباء الشركاء ───
  if ((await db.doctor.count()) === 0) {
    await db.doctor.createMany({
      data: [
        { name: "د. أحمد المغازي", specialty: "جلدية وتجميل", checkupPercentage: 60, laserPercentage: 40 },
        { name: "د. ياسمين فتحي", specialty: "ليزر وتجميل", checkupPercentage: 50, laserPercentage: 50 },
      ],
    });
  }

  // ─── الإعدادات العامة ───
  const settings: [string, string][] = [
    ["clinicName", "عيادة المغازي للجلدية والتجميل"],
    ["clinicNameEn", "EL MOGHAZI CLINIC"],
    ["clinicPhone", "01000000000"],
    ["clinicAddress", "القاهرة — مصر"],
    ["workingHours", "السبت - الخميس: 10ص — 10م"],
    ["receiptFooter", "شكرًا لزيارتكم — عيادة المغازي"],
  ];
  for (const [key, value] of settings) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  console.log("✅ التهيئة اكتملت");
  console.log("👨‍⚕️  الطبيب:    doctor@elmoghazi.local");
  console.log("👩‍💼  السكرتيرة: secretary@elmoghazi.local / Secretary@2024");
  if (!process.env.SEED_DOCTOR_PASSWORD)
    console.log("⚠️  كلمة مرور الطبيب الافتراضية: Elmoghazi@2024 — غيّرها فورًا!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
