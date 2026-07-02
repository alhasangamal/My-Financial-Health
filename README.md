# 💼 صحتك المالية - My Financial Health

<p align="center">
  <img src="public/logo.png" width="120" height="120" alt="صحتك المالية Logo" style="border-radius: 20px; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);" />
</p>

<h3 align="center">صحتك المالية - My Financial Health</h3>
<p align="center">
  منصة رقمية حديثة وذكية لإدارة وتتبع التدفقات المالية والالتزامات وصندوق الطوارئ باللغتين العربية والإنجليزية.
  <br />
  A modern, smart bilingual personal finance advisor & tracking intelligence dashboard.
</p>

---

## 🌟 الميزات الرئيسية / Key Features

### 1. لوحة تحكم ذكية وشاملة (Comprehensive Dashboard)

* **عرض متزامن للرسومات البيانية:** يعرض الموقع 4 رسومات بيانية متزامنة لحالتك المالية:
  * التدفق النقدي (Cash Flow Area Chart)
  * توزيع المصاريف بالفئات (Donut Expense Chart)
  * مؤشر كفاية الطوارئ (Reserve Adequacy Gauge)
  * خطة سداد الديون والالتزامات (Repayments Bar Chart)
* **تأثيرات حركية فاخرة:** واجهة مدمجة بمؤثرات `Framer Motion` وتصميم زجاجي (Glassmorphism) مريح للعين.

### 2. الموزع المالي وقاعدة (50/30/20) بالذكاء الاصطناعي

* تحليل فوري لنفقاتك وتقسيمها إلى: الاحتياجات الأساسية (50%)، الرغبات الاختيارية (30%)، والادخار (20%).
* كارت تحليل ذكي يقدم نصائح وتنبيهات مخصصة مبرمجة على سلوكك المالي لحمايتك من تجاوز النسب الآمنة.

### 3. ميزانيات الفئات وسقوف الصرف (Category Budgets)

* تعيين ميزانية شهرية مخصصة لكل فئة نفقات.
* مؤشرات ملونة تتغير ديناميكياً حسب نسبة الاستهلاك:
  * **الأخضر:** استهلاك آمن.
  * **البرتقالي:** اقتراب من الحد المسموح (تجاوز 80%).
  * **الأحمر النبّاض:** تجاوز الميزانية المحددة بالكامل مع شارة تحذير.

### 4. تنبيهات واتساب تلقائية بالكامل (Automated WhatsApp Alerts)

* **تذكيرات الدفعات:** أزرار إرسال سريعة بجوار الالتزامات لتنسيق رسالة تذكير وإرسالها بلمسة واحدة.
* **الأتمتة التلقائية:** خيار ربط وتكوين بوابة إرسال (WhatsApp API Gateway / Webhooks) في صفحة الإعدادات لتقوم المنصة بإرسال تنبيهات تلقائية صامتة لهاتفك في الخلفية فور استحقاق الدفعات اليومية.

### 5. محول المحافظ المتعددة (Multi-Portfolio switching)

* إمكانية إنشاء وتبديل حسابات مالية متعددة (شخصية، عائلية، أعمال) تحت نفس المتصفح مع عزل وفصل تام لكافة قواعد البيانات وجداول النفقات.

### 6. تقارير تفصيلية وأدوات تصدير مرنة (Analytical Reports)

* تصفية مرنة للنفقات حسب الفئة، الأولوية، والتواريخ المخصصة.
* تصدير فوري ومباشر إلى جداول Excel أو ملفات CSV.
* توليد **ملخص الشهر التحليلي الشامل (AI Report Modal)** مع خيار طباعة وتصدير PDF محسّن يخفي القوائم الجانبية ليظهر كتقرير رسمي.

---

## 🛠️ التقنيات المستخدمة / Technology Stack

* **React 18 & TypeScript & Vite**
* **Tailwind CSS** (تصميم عصري يدعم الوضعين الداكن والفاتح والكتابة من اليمين لليسار RTL)
* **Recharts** (رسومات بيانية تفاعلية وسلسة)
* **Framer Motion** (حركات وتأثيرات بصرية ممتازة)
* **Supabase Client** (تزامن البيانات الاختياري وقواعد البيانات السحابية)

---

## ⚙️ التشغيل المحلي / Local Installation

1. **نسخ المستودع (Clone Repository):**

   ```bash
   git clone https://github.com/alhasangamal/My-Financial-Health.git
   cd My-Financial-Health
   ```
2. **تثبيت الحزم (Install Dependencies):**

   ```bash
   npm install
   ```
3. **تشغيل خادم التطوير المحلي (Run Dev Server):**

   ```bash
   npm run dev
   ```
4. **بناء نسخة الإنتاج (Build for Production):**

   ```bash
   npm run build
   ```

---

## 🔒 حماية وخصوصية البيانات

التطبيق يدعم العمل بالكامل في **الوضع المحلي الضيف (Guest Mode)** عن طريق تخزين مشفر ومحلي لبياناتك داخل المتصفح (`LocalStorage`) دون الحاجة لتسجيل دخول أو كلمات مرور. إذا كنت تفضل تخزيناً سحابياً ومزامنة عبر أجهزة متعددة، يمكنك تعبئة رابط ومفتاح الاتصال الخاص بقاعدتك في **Supabase** من صفحة الإعدادات لتتصل تلقائياً.

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-64748B?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
</p>
