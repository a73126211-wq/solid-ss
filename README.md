# SOLID – سوليد

تطبيق ويب متكامل لاستقبال طلبات العملاء أونلاين مع لوحة تحكم للإدارة.

## التقنيات
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Supabase (Auth, Database, Storage, Realtime)

## تشغيل محلي

```bash
cd solid-app
npm run dev
```

## إعداد Supabase

1. افتح [SQL Editor](https://aogtvkfhehaztdurvunf.supabase.co/editor)
2. الصق محتوى `supabase/INSTRUCTIONS.sql` وشغله
3. شغل `node scripts/import-csv.js` لاستيراد المنيو
4. أنشئ حساب Admin عبر SQL

## المتغيرات البيئية

في `.env` داخل `solid-app/`:

```
VITE_SUPABASE_URL=https://aogtvkfhehaztdurvunf.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_8OlD6qFxMDIbHZktFSdKCg_gNADvUr6
```

## النشر على Vercel

أضف نفس المتغيرات البيئية في لوحة تحكم Vercel.

## Supabase project
- Project ref: `aogtvkfhehaztdurvunf`
- URL: `https://aogtvkfhehaztdurvunf.supabase.co`
