export const APP_NAME = "عيادة المغازي";
export const APP_NAME_EN = "EL MOGHAZI CLINIC";

/** صلاحيات السكرتيرة — 4 أقسام فقط */
export const PERMISSIONS = [
  { key: "patients", label: "المرضى" },
  { key: "laser", label: "الليزر" },
  { key: "waiting", label: "قائمة الانتظار" },
  { key: "appointments", label: "المواعيد" },
] as const;

export type PermKey = (typeof PERMISSIONS)[number]["key"];

export const THEMES = [
  { id: "emerald", label: "زمردي", dot: "#146c43" },
  { id: "royal", label: "ملكي", dot: "#1e3a8a" },
  { id: "ocean", label: "محيطي", dot: "#0e7490" },
  { id: "rose", label: "وردي", dot: "#be185d" },
  { id: "sunset", label: "غروب", dot: "#c2410c" },
] as const;
