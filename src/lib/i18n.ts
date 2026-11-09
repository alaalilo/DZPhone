import type { Wilaya } from './store';

export type Lang = 'ar' | 'fr' | 'en';
export const DIR: Record<Lang, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  fr: 'ltr',
  en: 'ltr',
};

const T: Record<string, Record<Lang, string>> = {
  brand: { ar: 'DZPhone الجزائر', fr: 'DZPhone Algérie', en: 'DZPhone Algeria' },
  tagline: {
    ar: 'متجر الهواتف الذكية الموثوق · نظام 69 ولاية',
    fr: 'Boutique Smartphones Certifiée · 69 Wilayas',
    en: 'Certified Smartphone Store · 69 Wilayas',
  },
  heroBadge: {
    ar: 'الدفع عند الاستلام بعد المعاينة · توصيل للولايات المغطاة (01–69)',
    fr: 'Paiement à la livraison après vérification · Wilayas (01–69)',
    en: 'Cash on Delivery after inspection · Algerian Wilayas (01–69)',
  },
  heroTitle: {
    ar: 'هواتف ذكية أصلية مفحوصة بتقنية X-Ray وبضمان شفافية كاملة.',
    fr: 'Smartphones authentiques inspectés par X-Ray en toute transparence.',
    en: 'Authentic Smartphones with X-Ray Inspection & Complete Transparency.',
  },
  heroSub: {
    ar: 'اختر هاتفك الجديد المغلق (Scellé) أو المستعمل النظيف مع تقرير فحص البطارية والهيكل، واحجزه مباشرة أو تفاوض مع البائع في غرفة الصفقة الذكية.',
    fr: 'Choisissez votre téléphone Neuf Scellé ou Occasion Comme Neuf avec rapport batterie et châssis, commandez en direct ou négociez dans la Deal-Room.',
    en: 'Choose New Sealed or Used Like-New phones with full battery & chassis diagnostics. Order directly with COD or negotiate in the Smart Deal-Room.',
  },
  heroCtaCatalog: {
    ar: 'تصفح الهواتف المتوفرة',
    fr: 'Explorer le catalogue',
    en: 'Browse Available Phones',
  },
  heroCtaDealRoom: {
    ar: 'اسأل المساعد الذكي',
    fr: 'Conseiller IA & Deal-Room',
    en: 'Ask Smart Deal-Room AI',
  },
  trustCodTitle: {
    ar: 'الدفع عند الاستلام (COD)',
    fr: 'Paiement à la livraison',
    en: 'Cash on Delivery (COD)',
  },
  trustCodDesc: {
    ar: 'تأكيد هاتفي مباشر قبل الشحن وفتح الطرد عند الاستلام',
    fr: 'Confirmation téléphonique avant envoi',
    en: 'Phone confirmation before dispatch',
  },
  trustXrayTitle: {
    ar: 'فحص X-Ray للمستعمل',
    fr: 'Inspection X-Ray Certifiée',
    en: 'X-Ray Used Diagnostics',
  },
  trustXrayDesc: {
    ar: 'تمييز واضح بين الصور التوضيحية وصور وفحص الجهاز الفعلي',
    fr: 'Distinction claire entre rendu illustratif et photos réelles',
    en: 'Clear distinction between studio renders & verified unit photos',
  },
  trustWilayasTitle: {
    ar: 'دعم التقسيم الإداري 69 ولاية',
    fr: 'Support des 69 Wilayas',
    en: '69-Wilaya Shipping Support',
  },
  trustWilayasDesc: {
    ar: 'إلى المكتب (Stop Desk) أو لباب المنزل حسب تغطية شركة الشحن',
    fr: 'Stop Desk ou à domicile selon la couverture du transporteur',
    en: 'Stop Desk or Home Delivery across active courier wilayas',
  },
  all: { ar: 'جميع الهواتف', fr: 'Tous les modèles', en: 'All Phones' },
  fNew: { ar: 'جديد مغلق (Scellé)', fr: 'Neuf Scellé', en: 'New Sealed' },
  fUsed: { ar: 'مستعمل كسر زيرو', fr: 'Occasion Comme Neuf', en: 'Used Like New' },
  searchPh: {
    ar: 'ابحث عن آيفون، سامسونج، ريدمي، بوكو، 256GB...',
    fr: 'Rechercher iPhone, Samsung, Redmi, POCO, 256 Go...',
    en: 'Search iPhone, Samsung, Redmi, POCO, 256GB...',
  },
  sortFeatured: { ar: 'الأكثر طلباً', fr: 'En vedette', en: 'Featured' },
  sortPriceAsc: { ar: 'السعر: من الأقل للأعلى', fr: 'Prix : croissant', en: 'Price: Low to High' },
  sortPriceDesc: { ar: 'السعر: من الأعلى للأقل', fr: 'Prix : décroissant', en: 'Price: High to Low' },
  install: { ar: 'تثبيت التطبيق', fr: "Installer l'app", en: 'Install App' },
  admin: { ar: 'لوحة البائع', fr: 'Espace Vendeur', en: 'Seller Admin' },
  shop: { ar: 'العودة للمتجر', fr: 'Boutique', en: 'Storefront' },
  sealed: { ar: 'جديد مغلق · Scellé', fr: 'Neuf Scellé', en: 'New Sealed' },
  used: { ar: 'مستعمل مفحوص · X-Ray', fr: 'Occasion X-Ray', en: 'Used · X-Ray' },
  inStock: { ar: 'متوفر في المخزون', fr: 'En stock', en: 'In Stock' },
  soldOut: { ar: 'نفد المخزون', fr: 'Épuisé', en: 'Sold Out' },
  reserved: { ar: 'محجوز', fr: 'Réservé', en: 'Reserved' },
  unitsLeft: { ar: 'قطع متبقية', fr: 'unités restantes', en: 'units left' },
  battery: { ar: 'صحة البطارية', fr: 'Santé batterie', en: 'Battery health' },
  body: { ar: 'نظافة الهيكل', fr: 'État du châssis', en: 'Body score' },
  acc: { ar: 'الملحقات المرفقة', fr: 'Accessoires inclus', en: 'Included accessories' },
  original_box: { ar: 'العلبة الأصلية', fr: 'Boîte originale', en: 'Original Box' },
  cable: { ar: 'كابل الشحن', fr: 'Câble USB', en: 'Charging Cable' },
  s_pen: { ar: 'قلم S-Pen', fr: 'Stylet S-Pen', en: 'S-Pen Stylus' },
  power_adapter: { ar: 'رأس الشاحن', fr: 'Adaptateur secteur', en: 'Power Adapter' },
  imgStudioRender: {
    ar: 'صورة استوديو توضيحية للطراز',
    fr: 'Rendu studio illustratif',
    en: 'Illustrative Studio Render',
  },
  imgRealPhoto: {
    ar: 'صورة حقيقية للجهاز المعروض',
    fr: 'Photo réelle de l’appareil',
    en: 'Actual Physical Unit Photo',
  },
  inspTemplate: {
    ar: 'نموذج فحص مرجعي',
    fr: 'Modèle d’inspection',
    en: 'Reference Template',
  },
  inspVerified: {
    ar: 'فحص موثق للوحدة الفعلية ✓',
    fr: 'Unité physique vérifiée ✓',
    en: 'Merchant-Verified Unit ✓',
  },
  inspectionPending: {
    ar: 'تُؤكد حالة الوحدة قبل الشحن',
    fr: 'État confirmé avant expédition',
    en: 'Unit condition confirmed before dispatch',
  },
  shippingActiveOnly: {
    ar: 'التوصيل إلى الولايات المفعّلة فقط',
    fr: 'Livraison vers les wilayas activées uniquement',
    en: 'Delivery to activated wilayas only',
  },
  demo: {
    ar: 'تم التحقق من مؤشرات الفحص الفيزيائي وصور الوحدة الفعلية في ورشة DZPhone.',
    fr: 'Contrôle qualité de l’unité physique vérifié par notre atelier DZPhone.',
    en: 'Physical unit inspection and real photos verified by DZPhone technicians.',
  },
  demoTemplate: {
    ar: 'هذه بيانات مرجعية للطراز وليست نتيجة فحص للجهاز المعروض. يؤكد البائع صور الوحدة الفعلية وحالة البطارية والهيكل قبل الشحن.',
    fr: 'Ces informations sont indicatives et ne constituent pas un contrôle de l’unité vendue. Le vendeur confirme les photos et l’état réels avant expédition.',
    en: 'These are model reference details, not an inspection of the unit for sale. The seller confirms actual unit photos and condition before dispatch.',
  },
  specs: { ar: 'المواصفات التقنية الكاملة', fr: 'Fiche technique complète', en: 'Full Technical Specifications' },
  sDisplay: { ar: 'الشاشة', fr: 'Écran', en: 'Display' },
  sCpu: { ar: 'المعالج', fr: 'Processeur', en: 'Processor' },
  sMem: { ar: 'الرام / التخزين', fr: 'RAM / Stockage', en: 'RAM / Storage' },
  sCam: { ar: 'الكاميرا الأساسية', fr: 'Caméra principale', en: 'Main camera' },
  sBat: { ar: 'سعة البطارية والشحن', fr: 'Batterie & Charge', en: 'Battery & Charging' },
  bodyDesc: { ar: 'تقرير الفحص الفيزيائي', fr: 'Rapport physique du châssis', en: 'Physical Inspection Report' },
  note: { ar: 'نصيحة البائع الشخصية', fr: 'Conseil personnel du vendeur', en: "Seller's Personal Verdict" },
  buy: { ar: 'احجز الآن — الدفع عند الاستلام', fr: 'Commander (Paiement à la livraison)', en: 'Order Now — Cash on Delivery' },
  addToCart: { ar: 'أضف إلى السلة', fr: 'Ajouter au panier', en: 'Add to Cart' },
  addedToCart: { ar: 'تمت الإضافة للسلة ✓', fr: 'Ajouté au panier ✓', en: 'Added to Cart ✓' },
  cartTitle: { ar: 'سلة المشتريات والطلب المباشر', fr: 'Votre Panier & Commande COD', en: 'Shopping Bag & COD Checkout' },
  cartEmpty: {
    ar: 'سلة المشتريات فارغة حالياً. أضف هاتفاً للبدء في إجراءات التوصيل.',
    fr: 'Votre panier est vide. Ajoutez un smartphone pour commander.',
    en: 'Your shopping bag is empty. Add a phone to proceed to checkout.',
  },
  proceedCheckout: { ar: 'إتمام الطلب (الدفع عند الاستلام)', fr: 'Passer à la commande COD', en: 'Proceed to COD Checkout' },
  backToCart: { ar: 'العودة لتعديل السلة', fr: 'Retour au panier', en: 'Back to Cart Items' },
  nego: { ar: 'تحدث مع البائع / تفاوض في الغرفة الذكية', fr: 'Discuter / Négocier (Deal-Room)', en: 'Chat / Negotiate in Smart Deal-Room' },
  social: { ar: 'أو اطلب مباشرة عبر قنواتنا الرسمية', fr: 'Ou commandez via nos réseaux officiels', en: 'Or order directly via our official channels' },
  view: { ar: 'التفاصيل والفحص', fr: 'Détails & Inspection', en: 'Inspect & Buy' },
  bot: { ar: 'غرفة الصفقة الذكية (Smart Deal-Room)', fr: 'Smart Deal-Room IA & Vendeur', en: 'Smart Deal-Room Assistant' },
  human: { ar: '🙋‍♂️ أريد التحدث مع البائع شخصياً أو التفاوض', fr: '🙋‍♂️ Parler directement au vendeur / Négocier', en: '🙋‍♂️ Talk to the human seller / Negotiate' },
  alert: {
    ar: 'تم تسجيل طلب التواصل. سيُراجع البائع رسالتك ويرد عليك هنا عند توفره.',
    fr: 'Votre demande est enregistrée. Le vendeur examinera votre message et répondra ici dès que possible.',
    en: 'Your request is recorded. The seller will review it and reply here when available.',
  },
  ph: {
    ar: 'اسأل عن التوصيل لوهران أو بوسعادة، مقارنة هاتفين، أو ميزانيتك…',
    fr: 'Question sur la livraison, comparaison ou budget…',
    en: 'Ask about wilaya shipping, phone comparison, or budget…',
  },
  hello: {
    ar: 'مرحباً بك في غرفة الصفقة الذكية لـ DZPhone! اسألني عن المواصفات، فحص X-Ray، مقارنة بين هاتفين، أو سعر التوصيل لأي ولاية (نظام 69 ولاية). للتفاوض على السعر اضغط زر التحدث مع البائع.',
    fr: "Bienvenue dans la Smart Deal-Room DZPhone ! Posez vos questions sur les specs, l'inspection X-Ray, la comparaison de modèles ou les tarifs de livraison (69 wilayas).",
    en: 'Welcome to the DZPhone Smart Deal-Room! Ask me about specs, X-Ray inspection, phone comparisons, or delivery rates across Algerian wilayas (01–69).',
  },
  name: { ar: 'الاسم واللقب الكامل', fr: 'Nom et prénom complet', en: 'Full Name' },
  phone: { ar: 'رقم الهاتف الجزائري (05 / 06 / 07)', fr: 'Numéro mobile algérien (05 / 06 / 07)', en: 'Algerian Mobile Number (05 / 06 / 07)' },
  phoneErr: { ar: 'أدخل 10 أرقام صحيحة تبدأ بـ 05 أو 06 أو 07', fr: '10 chiffres commençant par 05, 06 ou 07', en: '10 digits starting with 05, 06 or 07' },
  wilaya: { ar: 'اختر الولاية المتاحة للتوصيل', fr: 'Choisir la Wilaya couverte', en: 'Select Covered Wilaya' },
  commune: { ar: 'البلدية / الدائرة', fr: 'Commune / Daïra', en: 'Commune / District' },
  address: { ar: 'العنوان الكامل لتوصيل المنزل', fr: 'Adresse exacte de livraison', en: 'Street Address for Home Delivery' },
  note2: { ar: 'ملاحظة إضافية للمندوب (اختياري)', fr: 'Note pour le livreur (optionnel)', en: 'Delivery note (optional)' },
  req: { ar: 'هذا الحقل مطلوب لإتمام الطلب', fr: 'Ce champ est requis', en: 'This field is required' },
  stop: { ar: 'توصيل للمكتب (Stop Desk)', fr: 'Stop Desk (Bureau relais)', en: 'Stop Desk (Office Pickup)' },
  home: { ar: 'توصيل لباب المنزل', fr: 'Livraison à domicile', en: 'Home Delivery' },
  pPrice: { ar: 'مجموع الهواتف', fr: 'Sous-total articles', en: 'Items Subtotal' },
  disc: { ar: 'خصم البائع الخاص', fr: 'Remise vendeur accordée', en: 'Approved Seller Discount' },
  dPrice: { ar: 'رسوم التوصيل للولاية', fr: 'Frais de livraison Wilaya', en: 'Wilaya Shipping Fee' },
  total: { ar: 'الإجمالي للدفع عند الاستلام', fr: 'Total à payer à la livraison', en: 'Total Cash on Delivery' },
  pay: {
    ar: 'الدفع نقداً عند الاستلام بعد فحص الطرد · سيتصل بك فريقنا هاتفياً لتأكيد الطلبية قبل الإرسال',
    fr: 'Paiement en espèces à la livraison · Confirmation téléphonique obligatoire avant expédition',
    en: 'Pay cash on delivery · Mandatory phone call confirmation before shipment dispatch',
  },
  confirm: { ar: 'تأكيد الطلب الآن', fr: 'Confirmer la commande COD', en: 'Confirm COD Order' },
  send: { ar: 'إرسال', fr: 'Envoyer', en: 'Send' },
  offlineBanner: {
    ar: 'أنت تتصفح في وضع عدم الاتصال (Offline) — الكتالوج المحفوظ متاح، وسيتم تفعيل إرسال الطلبات فور عودة الإنترنت.',
    fr: 'Mode hors-ligne actif — Catalogue disponible en cache.',
    en: 'Offline mode active — Browsing cached catalog.',
  },
  navHome: { ar: 'الرئيسية', fr: 'Accueil', en: 'Home' },
  navProducts: { ar: 'الهواتف', fr: 'Téléphones', en: 'Phones' },
  navFilters: { ar: 'الفلترة', fr: 'Filtres', en: 'Filters' },
  navChat: { ar: 'المساعد', fr: 'Deal-Room', en: 'Deal-Room' },
  navCart: { ar: 'السلة', fr: 'Panier', en: 'Bag' },
  filtersTitle: {
    ar: 'الفلترة والترتيب والإعدادات',
    fr: 'Filtres, Tri & Préférences',
    en: 'Filters, Sort & Preferences',
  },
  filterCondition: { ar: 'حالة الهاتف', fr: 'État du téléphone', en: 'Condition' },
  filterBrand: { ar: 'الماركة', fr: 'Marque', en: 'Brand' },
  filterSort: { ar: 'الترتيب حسب', fr: 'Trier par', en: 'Sort by' },
  applyFilters: { ar: 'عرض النتائج', fr: 'Afficher les résultats', en: 'Show Results' },
  resetFilters: { ar: 'إعادة ضبط', fr: 'Réinitialiser', en: 'Reset' },
  shippingInfoTitle: {
    ar: 'معلومات التوصيل (01–69) والدفع عند الاستلام',
    fr: 'Livraison 69 Wilayas & Paiement COD',
    en: '69-Wilaya Delivery & Cash on Delivery',
  },
  shippingInfoDesc: {
    ar: 'توصيل إلى المكتب (Stop Desk) أو لباب المنزل عبر الولايات المفعّلة مع تأكيد هاتفي مباشر قبل الشحن والدفع عند الاستلام.',
    fr: 'Livraison Stop Desk ou à domicile vers les wilayas couvertes avec confirmation téléphonique et paiement à la réception.',
    en: 'Stop Desk or Home Delivery across covered wilayas with phone confirmation and payment upon delivery.',
  },
};

export const t = (l: Lang, k: string) => T[k]?.[l] ?? k;

export const money = (n: number, l: Lang) =>
  `${n.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')} ${
    l === 'ar' ? 'دج' : 'DA'
  }`;

export const wName = (w: Wilaya, l: Lang) =>
  l === 'ar' ? w.name_ar : l === 'fr' ? w.name_fr : w.name_en;

export const fmtPhone = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 10)
    .replace(/(\d{2})(?=\d)/g, '$1 ')
    .trim();

export const phoneOk = (v: string) => /^0[567]\d{8}$/.test(v.replace(/\s/g, ''));

export const intl = (v: string) =>
  '+213' + v.replace(/\s/g, '').replace(/^0/, '');
