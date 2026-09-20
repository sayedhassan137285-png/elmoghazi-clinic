# 🏥 عيادة المغازي — نظام إدارة العيادة

نظام متكامل لإدارة عيادة جلدية وتجميل — Next.js 15 + Prisma + SQLite (للتطوير) / Supabase PostgreSQL (للإنتاج).

## الميزات
- إدارة مرضى كاملة (ملف 6 تابات: نظرة عامة/زيارات/جلسات/ليزر/قبل-بعد/ملاحظات)
- مصادقة ثنائية 2FA (TOTP + QR + أكواد استعادة)
- الليزر والباقات (مربوطة بالبيانات + دفتر أقساط)
- المواعيد الأسبوعية + تذكير واتساب (5 قوالب ذكية)
- قائمة انتظار مرتبطة تلقائيًا بقائمة المرضى
- إيصال حراري 80mm + روشتة 17×25cm
- تقارير ومقارنات (7 أيام / 6 أسابيع / شهر كامل)
- تسويات الأطباء الشركاء تلقائيًا
- متابعة الغائبين (Recall) 60+ يوم
- ألبوم قبل/بعد لكل مريض
- صلاحيات: سكرتيرة (4 أقسام) / طبيب (كل الأقسام)
- 5 ثيمات + وضع ليلي + RTL كامل
- نسخ احتياطي (تصدير JSON كامل — يستثني كلمات المرور)

## التشغيل

```bash
# 1. انسخ ملف البيئة وعدّل القيم
cp .env.example .env
#   - DATABASE_URL: افتراضي SQLite محلي (file:./dev.db)
#   - AUTH_SECRET: ضع قيمة عشوائية قوية (32+ حرف)

# 2. ثبّت الحزم
npm install

# 3. أنشئ قاعدة البيانات + هجّر السكيمة
npm run db:push

# 4. بذور البيانات الأولية (المستخدمون + الخدمات + الباقات + الأدوية + الأطباء + الإعدادات)
npm run db:seed

# 5. شغّل خادم التطوير
npm run dev
# افتح http://localhost:3000
```

## حسابات الدخول الافتراضية (من التهيئة)

| الدور | البريد | كلمة المرور |
|---|---|---|
| طبيب | `doctor@elmoghazi.local` | `Elmoghazi@2024` |
| سكرتيرة | `secretary@elmoghazi.local` | `Secretary@2024` |

> ⚠️ غيّر كلمات المرور فور تسجيل الدخول الأول من قسم «مساحتي الشخصية ← الأمان».

## أقسام النظام

| القسم | المسار | الوصف |
|---|---|---|
| لوحة التحكم | `/dashboard` | ملخص اليوم + آخر المعاملات + الانتظار |
| المرضى | `/patients` | ملفات كاملة + بحث + تابات متعددة |
| المالية | `/finance` | إيرادات/مصروفات + معاملات |
| قائمة الانتظار | `/waiting` | أولويات + ربط تلقائي بالمرضى |
| المواعيد | `/appointments` | جدول أسبوعي 10ص-10م |
| الليزر والباقات | `/laser` | سجلات + جلسات + باقات |
| الخدمات والأسعار | `/services` | قائمة أسعار مجمّعة بالتصنيف |
| الروشتات | `/prescriptions` | روشتات + بنود أدوية |
| التقارير | `/reports` | 7 أيام / 6 أسابيع / شهر |
| المخزون | `/inventory` | أصناف + حد أدنى |
| الأطباء الشركاء | `/doctors` | نسب كشف/ليزر |
| الرسائل | `/messages` | 5 قوالب واتساب + كشف الغائبين |
| مساحتي الشخصية | `/personal` | ملفي + كلمة المرور + 2FA + نشاطي |
| النسخ الاحتياطي | `/backup` | تصدير JSON كامل |
| سجل النشاط | `/audit` | آخر العمليات |
| الإعدادات | `/settings` | بيانات العيادة + قوالب واتساب |

## الهيكل الفني

```
src/
├── app/
│   ├── (app)/              # صفحات داخل التطبيق (تحت AppShell)
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── finance/
│   │   ├── services/        ← جديد
│   │   ├── reports/          ← جديد
│   │   ├── messages/         ← جديد
│   │   ├── personal/         ← جديد
│   │   ├── backup/           ← جديد
│   │   ├── settings/         ← جديد
│   │   └── ...
│   ├── api/                  # Route Handlers (REST)
│   │   ├── auth/             # login / logout / me / 2fa / change-password
│   │   ├── services/         ← جديد (GET/POST/PUT/DELETE)
│   │   ├── reports/          ← جديد (GET ?range=7d|6w|month)
│   │   ├── messages/         ← جديد (GET/POST)
│   │   ├── backup/           ← جديد (GET ?format=json|download)
│   │   └── ...
│   ├── login/page.tsx
│   ├── layout.tsx            # RTL + Cairo + Playfair
│   └── globals.css           # 5 ثيمات + dark mode
├── components/
│   ├── app-shell.tsx         # Sidebar + nav + theme switcher
│   ├── icons.tsx             # SVG icon set
│   └── ui.tsx                # Modal / Field / Spinner / EmptyState
├── lib/
│   ├── db.ts                 # PrismaClient singleton
│   ├── auth.ts               # bcrypt + cookie sessions
│   ├── auth-edge.ts          # HMAC sessions (Edge-compatible)
│   ├── api.ts                # withAuth + ApiError + ok()
│   ├── audit.ts              # logAudit()
│   ├── two-factor.ts         # otplib + qrcode
│   ├── rate-limit.ts         # failed login throttling
│   ├── password-policy.ts    # 8+ chars + letter + digit
│   ├── smart-search.ts       # Arabic normalization + fuzzy match
│   ├── http.ts               # clientIp + userAgent
│   └── constants.ts          # APP_NAME + PERMISSIONS + THEMES
└── middleware.ts             # Auth + RBAC gating per path
```

## النشر على الإنتاج

1. **قاعدة البيانات:** استبدل SQLite بـ PostgreSQL (Supabase/Neon/Railway):
   - في `prisma/schema.prisma`، غيّر `provider = "sqlite"` إلى `provider = "postgresql"`.
   - في `.env`، ضع `DATABASE_URL="postgresql://..."`.
   - شغّل `npx prisma db push && npm run db:seed`.
2. **المتغيرات:** على Vercel/الاستضافة، أضف `DATABASE_URL` و `AUTH_SECRET` و `NODE_ENV=production`.
3. **واتساب فعلي:** اربط WhatsApp Business API في `src/app/api/messages/route.ts` (مكان `// simulate send`).

## الأمان

- كلمات المرور bcrypt (10 rounds).
- جلسات HMAC-SHA256 موقّعة (Edge-compatible).
- 2FA TOTP + 5 أكواد استعادة (bcrypt hashed).
- حد 5 محاولات دخول فاشلة لكل IP+email قبل القفل 15 دقيقة.
- RBAC: الطبيب يرى كل شيء؛ السكرتيرة ترى 4 أقسام فقط (المرضى/الليزر/الانتظار/المواعيد).
- النسخ الاحتياطي يستثني `password` و `twoFactorSecret` تلقائيًا.

## ملاحظات الإصدار

**v1.1.0** — إصلاحات وتوسعات:
- إعادة بناء `prisma/schema.prisma` بالكامل (21 موديل + 5 enums).
- إصلاح أسماء ملفات الإعداد (إزالة لاحقة `.txt`).
- إصلاح `package.json` مكسور (JSON مكرر).
- بناء 6 صفحات جديدة كانت تعطي 404: services / reports / messages / personal / backup / settings.
- بناء 5 API routes جديدة: services (GET/POST/PUT/DELETE) / reports / messages / backup + توسيع `/api/auth/me` بـ PUT.
- إصلاح خطأ syntax في `finance/page.tsx` (كان مقطوعًا mid-file).
- إخفاء `.env` فعليًا وإضافة `.env.example`.

**v1.0.0** — الإصدار الأول من النظام.
