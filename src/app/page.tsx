import Link from "next/link";

const STATS = [
  { value: "35", label: "Commit" },
  { value: "30", label: "نموذج بيانات" },
  { value: "27", label: "صفحة" },
  { value: "63", label: "API Route" },
];

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0d3b2e] via-[#146c43] to-[#0d3b2e] p-6 text-white">
      <div className="max-w-3xl text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-[#c9a227] to-[#e8c766] text-2xl font-black text-[#0d3b2e] shadow-2xl">
          SM
        </div>
        <h1 className="mt-6 font-latin text-4xl font-extrabold tracking-wide text-[#e8c766] md:text-5xl">
          EL MOGHAZI CLINIC
        </h1>
        <p className="mt-3 text-2xl font-bold md:text-3xl">عيادة المغازي للجلدية والتجميل</p>
        <p className="mt-2 text-white/70">نظام إدارة العيادة الكامل</p>

        <div className="mx-auto mt-10 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/10 px-4 py-5 backdrop-blur">
              <div className="text-3xl font-black text-[#e8c766]">{s.value}</div>
              <div className="mt-1 text-xs text-white/70">{s.label}</div>
            </div>
          ))}
        </div>

        <Link
          href="/login"
          className="mt-10 inline-flex rounded-xl bg-[#e8c766] px-8 py-3.5 text-sm font-black text-[#0d3b2e] shadow-lg transition hover:bg-[#d9b84f]"
        >
          الدخول إلى النظام ←
        </Link>
        <p className="mt-8 text-xs text-white/50">© عيادة المغازي — نظام إدارة العيادة</p>
      </div>
    </main>
  );
}
