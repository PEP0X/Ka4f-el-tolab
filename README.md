<div align="center">

  <img src="frontend/src/assets/images/logo-universal.png" alt="كشف الطلاب Logo" width="120" />

  # كشف الطلاب | Ka4f El-Tolab
  ### نظام سطح المكتب الذكي لإدارة بيانات الطلاب ومدارس الأحد والأنشطة الكنسية
  **Smart Cross-Platform Desktop Student Management & Excel Automation System**

  [![Release](https://img.shields.io/badge/Release-v1.2.1-blue?style=flat&logo=github)](https://github.com/PEP0X/Ka4f-el-tolab/releases/latest)
  [![Go Version](https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat&logo=go)](https://go.dev/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
  [![Wails](https://img.shields.io/badge/Wails-v2-DF0000?style=flat&logo=wails)](https://wails.io/)
  [![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-blue?style=flat)](#-تحميل-البرنامج--downloads--releases)
  [![Database](https://img.shields.io/badge/Database-SQLite%20(Pure%20Go%20%2B%20WAL)-003B57?style=flat&logo=sqlite)](https://github.com/glebarez/sqlite)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📖 نبذة عن البرنامج | Overview

**كشف الطلاب (Ka4f El-Tolab)** هو تطبيق سطح مكتب متكامل وسريع ومصمم خصيصاً لإدارة بيانات الطلاب والمخدومين عبر مختلف المراحل العمرية والدراسية (حضانات، ابتدائي، إعدادي، ثانوي، جامعة).

يتميز البرنامج بمحرك ذكي لمعالجة وتدقيق الأرقام القومية المصرية، ونظام استيراد ومعالجة متقدم لملفات **Excel** مع مساحة عمل تفاعلية لتصحيح الأخطاء والتكرارات وحفظ الجلسات دون فقدان أي بيانات.

---

## ✨ المميزات الرئيسية | Key Features

### 🪪 1. محرك الرقم القومي المصري الذكي (Egyptian National ID Engine)
- **استخراج تلقائي فوري**: استخراج تاريخ الميلاد بدقة، العمر بالسنوات، النوع (ذكر / أنثى)، ومحافظة الميلاد بمجرد إدخال أو قراءة الرقم القومي.
- **خوارزمية الفحص والتحقق**: تدقيق صحة الرقم القومي عبر خوارزمية Modulus-11 الرسمية واكتشاف الأرقام غير الصحيحة أو المكتوبة بالخطأ.
- **مطابقة المرحلة العمرية**: فحص تطابق عمر الطالب مع مرحلته الدراسية المسجلة وتنبيه الخادم في حال وجود تعارض.

### 📊 2. نظام استيراد ومعاينة ملفات Excel (Smart Excel Importer)
- **معاينة تحليلية قبل الحفظ (Zero-Write Preview)**: فحص ملف الـ Excel بالكامل وعرض إحصائيات فورية (الصفوف الجاهزة، التكرارات، التحديثات، والأخطاء) قبل إدخال أي سجل إلى قاعدة البيانات.
- **دعم الشيتات المتعددة**: قراءة تلقائية لجميع الشيتات (حضانات، ابتدائي، إعدادي، ثانوي، جامعة) مع التعرف الذكي على أسماء الأعمدة العربية باختلاف صياغتها.
- **اقتراح الفصول والصفوف دراسياً**: مطابقة ذكية (Fuzzy Normalization) لأسماء الفصول الشائعة (مثل "تانية ابتدائي" ⬅️ "الصف الثاني الابتدائي").

### 🛠️ 3. مساحة عمل تصحيح البيانات التفاعلية (Correction Workspace)
- **4 تبويبات متخصصة**:
  1. **يحتاج مراجعة (Needs Review)**: الصفوف ذات الصفوف غير المؤكدة مع ميزة القبول المجمع (Batch Group Resolution).
  2. **التكرارات (Duplicates)**: مقارنة جنباً إلى جنب للصفوف المكررة واختيار السجل الأصح أو الدمج بنقرة واحدة.
  3. **تحديثات (Updates)**: استعراض الطلاب المسجلين مسبقاً برقم قومي موجود وتحديث بياناتهم التكميلية.
  4. **أخطاء (Errors)**: تصحيح مباشر للأسماء الناقصة أو الأرقام القومية الخاطئة مع فاحص فوري (Live NID Inspector).
- **حفظ تلقائي واستعادة الجلسة (Persistent Sessions)**: استمرار جلسة المراجعة وحفظ التعديلات تلقائياً في قاعدة البيانات حتى لو تم إغلاق البرنامج وإعادة فتحه.
- **تصدير تقرير المستبعدات**: إمكانية تصدير الصفوف المستبعدة أو التي لم تُصحح إلى ملف Excel منفصل للمتابعة الورقية.

### 🔒 4. أمان وسرعة البيانات (Durability & Clean Architecture)
- **قاعدة بيانات SQLite نقية (CGO-Free)**: تعمل بدون أي متطلبات تثبيت خارجية مع دعم وضع الـ WAL فائق السرعة.
- **نسخ احتياطي تلقائي (Auto-Backup)**: إنشاء نسخ احتياطية تلقائية ومؤرخة قبل أي عملية حساسة أو مسح شامل.
- **ترحيل بنية البيانات (Versioned Schema Migrations)**: تتبع إصدارات الجداول وتحديثها تلقائياً مع الحفاظ على البيانات القديمة.
- **بنية برمجية معيارية**: فصل كامل بين الواجهة وطبقة الخدمات (Services) ومستودعات البيانات (Repositories).

---

## 📥 تحميل البرنامج | Downloads & Releases

يمكنك تحميل أي إصدار من البرنامج مباشرة من الروابط التالية أو عبر زيارة صفحة [**GitHub Releases**](https://github.com/PEP0X/Ka4f-el-tolab/releases):

---

### 🌟 الإصدار الأحدث: `v1.2.1` (Latest Release)
> **تاريخ الإصدار**: أغسطس 2026 | **حالة الإصدار**: مستقر (Stable)  
> **أبرز التحديثات**: معالجة تنبيهات مضادات الفيروسات (Antivirus / SmartScreen) عبر ترقية الـ Manifest وتوقيع الملفات بشهادات Authenticode، إزالة تجميد الواجهة (Anti-freeze UI Virtualization)، بحث ذكي فائق السرعة للغة العربية، شريط عنوان مخصص متوافق مع كافة المنظمات، وقوالب تصدير ذكية حسب المرحلة الدراسية.

| نظام التشغيل (OS) | نوع الملف (Package Type) | المعمارية (Arch) | رابط التحميل المباشر (Direct Download) |
| :--- | :--- | :--- | :--- |
| 🪟 **Windows 10 / 11** | **Setup Installer (NSIS)** | 64-bit (x64) | [⬇️ تحميل مثبت ويندوز (.exe)](https://github.com/PEP0X/Ka4f-el-tolab/releases/download/v1.2.1/Ka4f-El-Tolab-amd64-installer.exe) |
| 🪟 **Windows 10 / 11** | **نسخة محمولة (Portable)** | 64-bit (x64) | [⬇️ تحميل النسخة المحمولة (.exe)](https://github.com/PEP0X/Ka4f-el-tolab/releases/download/v1.2.1/Ka4f-el-tolab.exe) |
| 🍏 **macOS (Apple Silicon)** | **حزمة تطبيق (App Bundle)** | ARM64 (M1/M2/M3/M4) | [⬇️ تحميل نسخة الماك (.zip)](https://github.com/PEP0X/Ka4f-el-tolab/releases/download/v1.2.1/Ka4f-El-Tolab-darwin-arm64.zip) |
| 📦 **كود المصدر (Source Code)** | **Source Code Archive** | All | [⬇️ كود المصدر (.zip)](https://github.com/PEP0X/Ka4f-el-tolab/archive/refs/tags/v1.2.1.zip) |

🔗 [عرض تفاصيل وسجل تغييرات إصدار v1.2.1 الكاملة على GitHub ↗](https://github.com/PEP0X/Ka4f-el-tolab/releases/tag/v1.2.1)

---

### 📑 جدول جميع الإصدارات | Release History & Download Matrix

| الإصدار (Version) | الحالة (Status) | تاريخ الصدور (Date) | أهم الإضافات (Key Features) | روابط التحميل (Downloads) |
| :--- | :---: | :---: | :--- | :--- |
| [**v1.2.1**](https://github.com/PEP0X/Ka4f-el-tolab/releases/tag/v1.2.1) | 🟢 **الأحدث (Latest)** | 2026-08 | معالجة تنبيهات مضاد الفيروسات، أداء فائق، بحث عربي ذكي، شريط عنوان مخصص | [EXE Installer](https://github.com/PEP0X/Ka4f-el-tolab/releases/download/v1.2.1/Ka4f-El-Tolab-amd64-installer.exe) \| [Portable](https://github.com/PEP0X/Ka4f-el-tolab/releases/download/v1.2.1/Ka4f-el-tolab.exe) \| [macOS](https://github.com/PEP0X/Ka4f-el-tolab/releases/download/v1.2.1/Ka4f-El-Tolab-darwin-arm64.zip) |
| [**v1.2.0**](https://github.com/PEP0X/Ka4f-el-tolab/releases/tag/v1.2.0) | ⚪ مستقر (Stable) | 2026-08 | تحسين الأداء ومساحة المراجعة، وتحديث محرك قوالب Excel | [Releases Archive](https://github.com/PEP0X/Ka4f-el-tolab/releases/tag/v1.2.0) |
| [**v1.1.0**](https://github.com/PEP0X/Ka4f-el-tolab/releases/tag/v1.1.0) | ⚪ مستقر (Stable) | 2026-08 | رسوم بيانية في التصدير، كاش للوحة التحكم، نافذة تفاصيل الطالب، معالجة فرق الجامعة | [Releases Archive](https://github.com/PEP0X/Ka4f-el-tolab/releases/tag/v1.1.0) |
| [**v1.0.0**](https://github.com/PEP0X/Ka4f-el-tolab/releases/tag/v1.0.0) | ⚪ مستقر (Stable) | 2026-08 | الإطلاق الأولي، محرك الرقم القومي، مساحة تصحيح Excel، قاعدة بيانات SQLite WAL | [Releases Archive](https://github.com/PEP0X/Ka4f-el-tolab/releases/tag/v1.0.0) |

---

### 🛡️ ملاحظة هامة حول مضادات الفيروسات و Windows SmartScreen
> [!NOTE]
> التطبيق مفتوح المصدر وآمن 100%. نظراً لكونه مبنياً بلغة Go وبدون شهادة تجارية مدفوعة، قد تظهر شاشة **Windows SmartScreen** (`Windows protected your PC`) عند الفتح لأول مرة.
> - **الحل السريع**: اضغط على **More info (المزيد من المعلومات)** ⬅️ ثم **Run anyway (تشغيل على أي حال)**.
> - لمزيد من التفاصيل والحلول للمطورين، راجع: [**دليل الأمان ومضادات الفيروسات (SECURITY_AND_ANTIVIRUS.md)**](SECURITY_AND_ANTIVIRUS.md).

---

### 🖥️ متطلبات التشغيل (System Requirements)
- **Windows**: Windows 10 أو Windows 11 (64-bit) — يتطلب Microsoft Edge WebView2 (مدمج تلقائياً في أنظمة ويندوز الحديثة).
- **macOS**: macOS Monterey (12.0) أو أحدث (يدعم معالجات Apple Silicon M-Series).
- **مساحة التخزين**: 100 ميجابايت مساحة فارغة.
- **الذاكرة العشوائية (RAM)**: 2 جيجابايت كحد أدنى.

---

## 🏗️ البنية التقنية | Tech Stack

- **Backend / Core Engine**: [Go 1.24+](https://go.dev/) + [Wails v2](https://wails.io/)
- **Database Layer**: [database/sql](https://pkg.go.dev/database/sql) + [Pure-Go SQLite (modernc)](https://gitlab.com/cznic/sqlite) with WAL mode
- **Excel Processing**: [Excelize v2](https://github.com/xuri/excelize)
- **Frontend Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **UI & Styling**: Vanilla CSS & Tailwind CSS + [Lucide Icons](https://lucide.dev/) + [Canvas Confetti](https://github.com/catdad/canvas-confetti)
- **Installer Engine**: [NSIS 3.x](https://nsis.sourceforge.io/) (Windows Setup)

---

## 🚀 التشغيل والتطوير المحلي | Getting Started

### المتطلبات الأساسية (Prerequisites)
- تثبيت [Go 1.22+](https://golang.org/dl/)
- تثبيت [Node.js 18+](https://nodejs.org/)
- تثبيت [Wails CLI v2](https://wails.io/docs/gettingstarted/installation):
  ```bash
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  ```

### 1. استنساخ المشروع (Clone Repository)
```bash
git clone https://github.com/PEP0X/Ka4f-el-tolab.git
cd Ka4f-el-tolab
```

### 2. تشغيل وضع التطوير الحي (Live Development)
```bash
wails dev
```
سيتم تشغيل واجهة React مع خادم Vite وتحديث حي (Hot Reload) عند تعديل أي ملف في الواجهة أو الـ Go backend.

---

## 📦 البناء وإنشاء النسخ التنفيذية | Production Build

### بناء نسخة ويندوز مع برنامج التثبيت (Windows Setup Installer)
```bash
wails build -platform windows/amd64 -nsis
```
- ستجد ملف التثبيت الناتج في: `build/bin/Ka4f-El-Tolab-amd64-installer.exe`
- ستجد النسخة المحمولة في: `build/bin/Ka4f-el-tolab.exe`

### بناء نسخة نظام ماك (macOS App Bundle)
```bash
wails build -platform darwin/arm64
```
- ستجد حزمة التطبيق في: `build/bin/Ka4f-El-Tolab.app`

### تشغيل الاختبارات الآلية (Run Automated Tests)
```bash
# Go backend tests
go test ./...

# Frontend TypeScript & Vite build test
npm --prefix frontend run build
```

---

## ⌨️ اختصارات لوحة المفاتيح | Keyboard Shortcuts

داخل مساحة تصحيح البيانات (Correction Workspace):
- `Tab` / `Shift+Tab`: التنقل السلس بين حقول الإدخال والخلايا.
- `Enter`: حفظ والتنقل للخلية التالية.
- `Esc`: إلغاء التعديل أو إغلاق النوافذ المنبثقة.
- `Ctrl+F` / `Cmd+F`: التركيز المباشر على شريط البحث والتصفية.

---

## 👤 المطور | Author

**Abanoub Nashaat (PEPO)**
- **Email**: [onepercentpepo@gmail.com](mailto:onepercentpepo@gmail.com)
- **GitHub**: [@PEP0X](https://github.com/PEP0X)

---

## 📄 الترخيص | License

هذا المشروع مرخص تحت رخصة [MIT License](LICENSE).
