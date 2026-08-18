# 🛡️ دليل الأمان والتنبيهات الخاطئة لمضادات الفيروسات
# Security & Antivirus False Positives Guide

---

## 📌 لماذا قد يُظهر مضاد الفيروسات أو Windows SmartScreen تحذيراً؟
## Why does Antivirus or Windows SmartScreen flag the application?

تطبيق **كشف الطلاب (Ka4f El-Tolab)** هو مشروع مفتوح المصدر وآمن 100%، ولا يحتوي على أي أكواد ضارة أو إعلانات أو تتبع.

عند تشغيل التطبيق لأول مرة على بعض أجهزة Windows، قد تظهر رسالة مثل:
- `Windows protected your PC` / `SmartScreen prevented an unrecognized app from starting`
- أو تنبيه كشف استدلالي (Machine Learning Heuristic) ينتهي بـ `!ml` مثل `Trojan:Win32/Wacatac.B!ml` أو `Contebrew`.

### الأسباب التقنية:
1. **طبيعة لغة Go ومكتبة Wails**: التطبيق مبني بلغة Go وإطار عمل Wails، ومحركات الذكاء الاصطناعي لمضادات الفيروسات (AI/ML Heuristics) تقوم أحياناً بتمييز حزم Go التنفيذية الجديدة غير الموقعة بشهادات تجارية مدفوعة كملفات غير معروفة.
2. **غياب السمعة السحابية (Zero-Day Binary Reputation)**: أي ملف تنفيذي جديد يتم إصداره حديثاً ولا يحمل ملايين التنزيلات أو شهادة رقمية تجارية من جهة مثل DigiCert أو Sectigo تعتبره أنظمة الفحص التلقائي "غير معروف السمعة" (Unknown Reputation).
3. **التكامل مع WebView2**: يستدعي التطبيق محرك العرض الأصلي لنظام ويندوز مما يثير فحصاً إضافياً في بعض مضادات الفيروسات القديمة.

---

## 🚀 حلول سريعة للمستخدمين | Quick Fixes for Users

### 1. تخطي شاشة Windows SmartScreen (خطوة واحدة فقط):
1. عند ظهور نافذة `Windows protected your PC`:
2. اضغط على رابط **`More info`** (أو **`المزيد من المعلومات`**).
3. اضغط على زر **`Run anyway`** (أو **`تشغيل على أي حال`**).
4. سيعمل البرنامج بشكل طبيعي تماماً ولن تظهر الرسالة مرة أخرى.

---

### 2. السماح للملف في Windows Defender (في حال حجزه):
1. افتح **Windows Security** (أمان Windows).
2. اختر **Virus & threat protection** (الحماية من الفيروسات والمخاطر).
3. اضغط على **Protection history** (سجل الحماية).
4. ابحث عن `Ka4f-el-tolab.exe` واضغط على **Actions** ⬅️ **Allow on device** (السماح على الجهاز).

---

## 🛠️ للمطورين ومسؤولي النظام | For Developers & Sysadmins

### 1. إضافة استثناء عبر PowerShell (بنقرة واحدة كمسؤول):
قم بتشغيل السكربت الجاهز المرفق بالمشروع:
```powershell
pwsh -File .\scripts\allow-defender.ps1
```
أو يدوياً في سطر أوامر مسؤول:
```powershell
Add-MpPreference -ExclusionProcess "Ka4f-el-tolab.exe"
```

### 2. البناء مع التوقيع الرقمي والتوثيق المحلي بنقرة واحدة:
تم إعداد ملفات الـ Manifest (`build/windows/wails.exe.manifest`) وبيانات الـ PE Metadata (`info.json`) لتعريف التطبيق كبرنامج حديث متوافق مع Windows 10/11 مع مستوى صلاحيات `asInvoker`.

لتوقيع التطبيق وتثبيت شهادة الناشر في مخزن الشهادات الموثوقة للتخلص نهائياً من رسالة (Publisher: Unknown):
```powershell
pwsh -File .\scripts\trust-app.ps1
```

للبناء والتوقيع الشامل:
```powershell
pwsh -File .\scripts\build-windows.ps1 -Sign
```

---

## 🌐 التقديم الرسمي لمايكروسوفت لحذف التنبيه نهائياً
## Official Microsoft False Positive Submission

يقوم مطورو المشروع عند كل إصدار رئيسي برفع الملف التنفيذي إلى بوابة أمان مايكروسوفت الرسمية:
🔗 **[Microsoft Security Intelligence - File Submission](https://www.microsoft.com/en-us/wdsi/filesubmission)**

- **نوع المشكلة**: Incorrectly detected as malware (false positive)
- تقوم مايكروسوفت بفحص الملف آلياً وبشرياً وتحديث قواعد بيانات Windows Defender السحابية ليتم إزالته من أي تنبيهات لجميع المستخدمين حول العالم خلال ساعات قليلة.
