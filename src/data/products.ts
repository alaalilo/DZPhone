// DZPhone Commercial Product Catalog — Verified Hardware Specifications & Illustrative Studio Renders
export type L3 = { ar: string; fr: string; en: string };
export type Acc = 'original_box' | 'cable' | 's_pen' | 'power_adapter';

export type ProductImageSourceType =
  | 'illustrative_studio_render'
  | 'merchant_uploaded_photo';

export type ProductImageItem = {
  url: string;
  webp_url?: string;
  source_type?: ProductImageSourceType;
  alt_ar?: string;
  alt_fr?: string;
  alt_en?: string;
  sort_order: number;
};

export type ProductAvailability =
  | 'draft'
  | 'available'
  | 'reserved'
  | 'sold'
  | 'hidden';

export type ProductInspectionDataStatus =
  | 'illustrative_template'
  | 'merchant_verified';

export type Product = {
  id: string;
  sku: string;
  brand: string;
  commercial_name: string;
  name: L3;
  condition: 'new_sealed' | 'used_like_new';
  price_dzd: number;
  color: string;
  availability?: ProductAvailability;
  stock_quantity?: number;
  images?: ProductImageItem[];
  specs: {
    display: { size: number; tech: string; res: string; hz: number };
    processor: string;
    ram_gb: number;
    storage_gb: number;
    camera: { mp: number; aperture?: string; ois: boolean };
    battery_mah: number;
    charging_w?: number;
  };
  inspection?: {
    data_status?: ProductInspectionDataStatus;
    battery_health_percent: number;
    body_score_out_of_10: number;
    body_description: L3;
    accessories: [Acc, boolean][];
  } | null;
  seller_personal_note: L3;
};

export const PRODUCTS: Product[] = [
  {
    id: 'apple-iphone-15-pro-max-256-used',
    sku: 'APL-IP15PM-256-ULN',
    brand: 'Apple',
    commercial_name: 'Apple iPhone 15 Pro Max',
    name: {
      ar: 'آيفون 15 برو ماكس 256 جيجابايت — تيتانيوم طبيعي',
      fr: 'iPhone 15 Pro Max 256 Go — Titane Naturel',
      en: 'iPhone 15 Pro Max 256GB — Natural Titanium',
    },
    condition: 'used_like_new',
    price_dzd: 179000,
    color: '#C9C4BA',
    availability: 'available',
    stock_quantity: 4,
    images: [
      {
        url: '/images/products/iphone-15-pro-max-titanium.webp',
        webp_url: '/images/products/iphone-15-pro-max-titanium.webp',
        source_type: 'illustrative_studio_render',
        alt_ar: 'آيفون 15 برو ماكس تيتانيوم طبيعي - صورة استوديو توضيحية للطراز',
        alt_fr: 'iPhone 15 Pro Max Titane Naturel - Rendu studio illustratif du modèle',
        alt_en: 'iPhone 15 Pro Max Natural Titanium - Illustrative Studio Model Render',
        sort_order: 0,
      },
    ],
    specs: {
      display: {
        size: 6.7,
        tech: 'Super Retina XDR OLED',
        res: '1290×2796',
        hz: 120,
      },
      processor: 'Apple A17 Pro (3nm)',
      ram_gb: 8,
      storage_gb: 256,
      camera: { mp: 48, aperture: 'f/1.78', ois: true },
      battery_mah: 4441,
      charging_w: 27,
    },
    inspection: {
      data_status: 'illustrative_template',
      battery_health_percent: 92,
      body_score_out_of_10: 9.5,
      body_description: {
        ar: 'بيانات فحص مرجعية (نموذج توضيحي): إطار تيتانيوم نظيف مع فحص الشاشة وFace ID والكاميرات. يُرجى من البائع رفع صور الجهاز الفعلي وتوثيق الفحص قبل الشحن.',
        fr: 'Données d’inspection de référence (modèle illustratif) : cadre en titane propre, écran et Face ID contrôlés. Photos réelles de l’unité physique confirmées avant expédition.',
        en: 'Reference inspection template (illustrative): clean titanium frame, display and Face ID check. Merchant verifies exact physical unit and photos before dispatch.',
      },
      accessories: [
        ['original_box', true],
        ['cable', true],
        ['power_adapter', false],
      ],
    },
    seller_personal_note: {
      ar: 'أنصحك به إذا كنت تريد تجربة آيفون فاخرة وشاشة كبيرة وتصوير فيديو مميز. معالج A17 Pro وكاميرته الرئيسية يمنحانه قيمة قوية لمن يصنع المحتوى أو يستعمل الهاتف بكثافة، وشراء نسخة مستعملة نظيفة قد يخفض التكلفة مقارنة بالجديد، بشرط التأكد من البطارية وسجل الإصلاح.',
      fr: 'Je vous le conseille pour une expérience iPhone haut de gamme, un grand écran et une vidéo soignée. La puce A17 Pro et le capteur principal en font un choix solide pour la création de contenu et un usage intensif. Un exemplaire d’occasion bien conservé peut réduire le budget face au neuf, à condition de vérifier la batterie et l’historique des réparations.',
      en: 'I recommend it for a premium iPhone experience, a large display and polished video recording. The A17 Pro chip and main camera make it a strong choice for content creation and heavy use. A well-kept used unit can cost less than a new one, provided its battery and repair history are checked.',
    },
  },
  {
    id: 'apple-iphone-13-128-used',
    sku: 'APL-IP13-128-ULN',
    brand: 'Apple',
    commercial_name: 'Apple iPhone 13',
    name: {
      ar: 'آيفون 13 بسعة 128 جيجابايت — أزرق ليلي',
      fr: 'iPhone 13 128 Go — Bleu Minuit',
      en: 'iPhone 13 128GB — Midnight Blue',
    },
    condition: 'used_like_new',
    price_dzd: 76900,
    color: '#3B4A63',
    availability: 'available',
    stock_quantity: 6,
    images: [
      {
        url: '/images/products/iphone-13-midnight-blue.webp',
        webp_url: '/images/products/iphone-13-midnight-blue.webp',
        source_type: 'illustrative_studio_render',
        alt_ar: 'آيفون 13 بسعة 128 جيجابايت أزرق - صورة استوديو توضيحية للطراز',
        alt_fr: 'iPhone 13 128 Go Bleu - Rendu studio illustratif du modèle',
        alt_en: 'iPhone 13 128GB Midnight Blue - Illustrative Studio Model Render',
        sort_order: 0,
      },
    ],
    specs: {
      display: {
        size: 6.1,
        tech: 'Super Retina XDR OLED',
        res: '1170×2532',
        hz: 60,
      },
      processor: 'Apple A15 Bionic',
      ram_gb: 4,
      storage_gb: 128,
      camera: { mp: 12, aperture: 'f/1.6', ois: true },
      battery_mah: 3240,
      charging_w: 20,
    },
    inspection: {
      data_status: 'illustrative_template',
      battery_health_percent: 89,
      body_score_out_of_10: 9.5,
      body_description: {
        ar: 'بيانات فحص مرجعية (نموذج توضيحي): هيكل نظيف مع شاشة أصلية وبطارية مفحوصة. يتم تأكيد النسبة الفعلية وصور الوحدة المحددة مع الزبون قبل الإرسال.',
        fr: 'Données d’inspection de référence (modèle illustratif) : châssis propre avec écran d’origine. État exact et photos réelles de l’unité confirmés avant envoi.',
        en: 'Reference inspection template (illustrative): clean chassis and original display. Exact unit battery percentage and real photos confirmed before shipping.',
      },
      accessories: [
        ['original_box', true],
        ['cable', true],
        ['power_adapter', false],
      ],
    },
    seller_personal_note: {
      ar: 'إذا كنت تريد دخول عالم آيفون بميزانية معقولة، فهذا اختيار متوازن أنصحك به. حجمه مريح، وشاشته OLED، ومعالج A15 Bionic مناسب للتطبيقات اليومية والتصوير ومواقع التواصل. تذكّر فقط أن الشاشة 60 هرتز، وأن حالة البطارية أهم من المظهر وحده عند شراء المستعمل.',
      fr: 'Pour découvrir l’iPhone avec un budget raisonnable, c’est un choix équilibré que je recommande. Son format pratique, son écran OLED et la puce A15 Bionic conviennent aux applications quotidiennes, aux photos et aux réseaux sociaux. Gardez toutefois à l’esprit son écran 60 Hz : en occasion, la batterie compte autant que l’apparence.',
      en: 'For an iPhone on a sensible budget, this is a balanced option I recommend. Its manageable size, OLED display and A15 Bionic chip suit everyday apps, photography and social media. Just remember that the screen is 60Hz, and battery condition matters as much as appearance when buying used.',
    },
  },
  {
    id: 'samsung-galaxy-s24-ultra-256-used',
    sku: 'SAM-S24U-12-256-ULN',
    brand: 'Samsung',
    commercial_name: 'Samsung Galaxy S24 Ultra',
    name: {
      ar: 'سامسونج جالكسي S24 ألترا، 12/256 جيجابايت — تيتانيوم رمادي',
      fr: 'Samsung Galaxy S24 Ultra 12/256 Go — Gris Titane',
      en: 'Samsung Galaxy S24 Ultra 12GB/256GB — Titanium Gray',
    },
    condition: 'used_like_new',
    price_dzd: 149900,
    color: '#8E8A80',
    availability: 'available',
    stock_quantity: 5,
    images: [
      {
        url: '/images/products/galaxy-s24-ultra-titanium.webp',
        webp_url: '/images/products/galaxy-s24-ultra-titanium.webp',
        source_type: 'illustrative_studio_render',
        alt_ar: 'سامسونج جالكسي S24 ألترا تيتانيوم - صورة استوديو توضيحية للطراز',
        alt_fr: 'Samsung Galaxy S24 Ultra Gris Titane - Rendu studio illustratif du modèle',
        alt_en: 'Samsung Galaxy S24 Ultra Titanium Gray - Illustrative Studio Model Render',
        sort_order: 0,
      },
    ],
    specs: {
      display: {
        size: 6.8,
        tech: 'Dynamic AMOLED 2X',
        res: '1440×3120',
        hz: 120,
      },
      processor: 'Snapdragon 8 Gen 3 for Galaxy',
      ram_gb: 12,
      storage_gb: 256,
      camera: { mp: 200, aperture: 'f/1.7', ois: true },
      battery_mah: 5000,
      charging_w: 45,
    },
    inspection: {
      data_status: 'illustrative_template',
      battery_health_percent: 95,
      body_score_out_of_10: 9.5,
      body_description: {
        ar: 'بيانات فحص مرجعية (نموذج توضيحي): إطار تيتانيوم مع قلم S-Pen المدمج وفحص الزوم البصري والشاشة. يرفع البائع صور الجهاز الفعلي ويوثق الفحص قبل الشحن.',
        fr: 'Données d’inspection de référence (modèle illustratif) : cadre en titane avec stylet S-Pen et contrôle du zoom optique. Photos réelles confirmées par le vendeur.',
        en: 'Reference inspection template (illustrative): titanium frame with S-Pen stylus and optical zoom check. Merchant verifies physical unit photos before shipping.',
      },
      accessories: [
        ['original_box', true],
        ['cable', true],
        ['s_pen', true],
        ['power_adapter', false],
      ],
    },
    seller_personal_note: {
      ar: 'أنصحك به إذا كنت تريد هاتف أندرويد يجمع العمل والتصوير والترفيه في جهاز واحد. الشاشة الكبيرة وقلم S Pen مفيدان للملاحظات والإنتاجية، والمعالج القوي والكاميرا الرئيسية 200 ميجابكسل يجعلان التجربة متكاملة. النسخة المستعملة النظيفة تستحق النظر، بعد فحص الشاشة والقلم والكاميرات بعناية.',
      fr: 'Je vous le recommande pour réunir travail, photo et divertissement dans un seul smartphone Android. Le grand écran et le S Pen facilitent les notes et la productivité, tandis que le processeur puissant et le capteur principal de 200 Mpx complètent l’ensemble. Une occasion bien conservée mérite votre attention, après un contrôle soigneux de l’écran, du stylet et des caméras.',
      en: 'I recommend it for combining work, photography and entertainment in one Android phone. The large display and S Pen are useful for notes and productivity, while the powerful processor and 200MP main camera round out the package. A well-kept used unit is worth considering after carefully checking the screen, pen and cameras.',
    },
  },
  {
    id: 'samsung-galaxy-a55-256-new',
    sku: 'SAM-A55-8-256-NS',
    brand: 'Samsung',
    commercial_name: 'Samsung Galaxy A55 5G',
    name: {
      ar: 'سامسونج جالكسي A55 5G، ‏8/256 جيجابايت — جديد مغلق',
      fr: 'Samsung Galaxy A55 5G 8/256 Go — Neuf Scellé',
      en: 'Samsung Galaxy A55 5G 8GB/256GB — New Sealed',
    },
    condition: 'new_sealed',
    price_dzd: 59000,
    color: '#6D7BD6',
    availability: 'available',
    stock_quantity: 12,
    images: [
      {
        url: '/images/products/galaxy-a55-iceblue-violet.webp',
        webp_url: '/images/products/galaxy-a55-iceblue-violet.webp',
        source_type: 'illustrative_studio_render',
        alt_ar: 'سامسونج جالكسي A55 5G جديد مغلق - صورة توضيحية للطراز',
        alt_fr: 'Samsung Galaxy A55 5G Neuf Scellé - Image illustrative du modèle',
        alt_en: 'Samsung Galaxy A55 5G New Sealed - Illustrative Model Image',
        sort_order: 0,
      },
    ],
    specs: {
      display: {
        size: 6.6,
        tech: 'Super AMOLED',
        res: '1080×2340',
        hz: 120,
      },
      processor: 'Samsung Exynos 1480',
      ram_gb: 8,
      storage_gb: 256,
      camera: { mp: 50, aperture: 'f/1.8', ois: true },
      battery_mah: 5000,
      charging_w: 25,
    },
    seller_personal_note: {
      ar: 'هذا هو اختياري لمن يريد سامسونج متوازناً للاستعمال اليومي دون دفع سعر الفئة العليا. شاشة Super AMOLED بتردد 120 هرتز تجعل التصفح مريحاً، والكاميرا المثبتة بصرياً والبطارية 5000 ملي أمبير تقدمان حزمة عملية. أنصحك به للدراسة والعمل ومواقع التواصل، خصوصاً إذا كانت الأولوية للتوازن لا للألعاب الثقيلة.',
      fr: 'C’est mon choix pour un Samsung équilibré au quotidien, sans payer le prix du haut de gamme. L’écran Super AMOLED 120 Hz rend la navigation agréable, et l’appareil photo stabilisé ainsi que la batterie de 5 000 mAh forment un ensemble pratique. Je le conseille pour les études, le travail et les réseaux sociaux, surtout si l’équilibre prime sur les jeux exigeants.',
      en: 'This is my pick for a balanced everyday Samsung without flagship pricing. The 120Hz Super AMOLED display makes browsing pleasant, while the stabilized main camera and 5,000mAh battery form a practical package. I recommend it for study, work and social media, especially when balance matters more than demanding gaming.',
    },
  },
  {
    id: 'redmi-note-13-pro-5g-256-new',
    sku: 'RDM-N13P5G-8-256-NS',
    brand: 'Redmi',
    commercial_name: 'Redmi Note 13 Pro 5G',
    name: {
      ar: 'ريدمي نوت 13 برو 5G، ‏8/256 جيجابايت — أسود ليلي',
      fr: 'Redmi Note 13 Pro 5G 8/256 Go — Noir Minuit',
      en: 'Redmi Note 13 Pro 5G 8GB/256GB — Midnight Black',
    },
    condition: 'new_sealed',
    price_dzd: 50000,
    color: '#1F2937',
    availability: 'available',
    stock_quantity: 15,
    images: [
      {
        url: '/images/products/redmi-note-13-pro-black.webp',
        webp_url: '/images/products/redmi-note-13-pro-black.webp',
        source_type: 'illustrative_studio_render',
        alt_ar: 'شاومي ريدمي نوت 13 برو 5G كاميرا 200 ميجابكسل - صورة توضيحية للطراز',
        alt_fr: 'Xiaomi Redmi Note 13 Pro 5G Caméra 200MP - Image illustrative du modèle',
        alt_en: 'Xiaomi Redmi Note 13 Pro 5G 200MP Camera - Illustrative Model Image',
        sort_order: 0,
      },
    ],
    specs: {
      display: {
        size: 6.67,
        tech: '1.5K CrystalRes AMOLED',
        res: '1220×2712',
        hz: 120,
      },
      processor: 'Snapdragon 7s Gen 2',
      ram_gb: 8,
      storage_gb: 256,
      camera: { mp: 200, aperture: 'f/1.65', ois: true },
      battery_mah: 5100,
      charging_w: 67,
    },
    seller_personal_note: {
      ar: 'أنصحك به إذا كانت أولويتك شاشة عالية الدقة وكاميرا رئيسية غنية بالتفاصيل وشحن سريع بسعر متوسط. نسخة 5G هنا تقدم معالج Snapdragon 7s Gen 2 وبطارية 5100 ملي أمبير، وهي مختلفة عن نسخة 4G المتداولة بالاسم القريب. اختيار مناسب لمن يحب التصوير والمحتوى، مع التأكد من النسخة المكتوبة على العلبة.',
      fr: 'Je vous le conseille si vous privilégiez un écran haute définition, un capteur principal détaillé et une charge rapide à prix intermédiaire. Cette version 5G associe le Snapdragon 7s Gen 2 à une batterie de 5 100 mAh et se distingue du modèle 4G au nom proche. Un choix intéressant pour la photo et les contenus, en vérifiant bien la version indiquée sur la boîte.',
      en: 'I recommend it if your priorities are a high-resolution display, a detailed main camera and fast charging at a mid-range price. This 5G version pairs the Snapdragon 7s Gen 2 with a 5,100mAh battery and differs from the similarly named 4G model. It is an appealing choice for photography and media, provided you check the exact version on the box.',
    },
  },
  {
    id: 'poco-x6-pro-256-new',
    sku: 'POCO-X6P-8-256-NS',
    brand: 'POCO',
    commercial_name: 'POCO X6 Pro 5G',
    name: {
      ar: 'بوكو X6 برو 5G، ‏8/256 جيجابايت — أصفر بوكو',
      fr: 'POCO X6 Pro 5G 8/256 Go — Jaune POCO',
      en: 'POCO X6 Pro 5G 8GB/256GB — POCO Yellow',
    },
    condition: 'new_sealed',
    price_dzd: 63500,
    color: '#F5C518',
    availability: 'available',
    stock_quantity: 10,
    images: [
      {
        url: '/images/products/poco-x6-pro-yellow.webp',
        webp_url: '/images/products/poco-x6-pro-yellow.webp',
        source_type: 'illustrative_studio_render',
        alt_ar: 'بوكو X6 برو 5G باللون الأصفر الجلدي - صورة توضيحية للطراز',
        alt_fr: 'POCO X6 Pro 5G Jaune cuir végan - Image illustrative du modèle',
        alt_en: 'POCO X6 Pro 5G Signature Yellow - Illustrative Model Image',
        sort_order: 0,
      },
    ],
    specs: {
      display: {
        size: 6.67,
        tech: 'CrystalRes 1.5K Flow AMOLED',
        res: '1220×2712',
        hz: 120,
      },
      processor: 'MediaTek Dimensity 8300-Ultra',
      ram_gb: 8,
      storage_gb: 256,
      camera: { mp: 64, aperture: 'f/1.7', ois: true },
      battery_mah: 5000,
      charging_w: 67,
    },
    seller_personal_note: {
      ar: 'إذا كان الأداء والألعاب أولويتك، فهذا من الخيارات التي أرشحها لك ضمن هذه المجموعة. معالج Dimensity 8300-Ultra وذاكرة LPDDR5X وتخزين UFS 4.0 تجعل مواصفاته موجهة للسرعة، مع شاشة 120 هرتز وشحن 67 واط. أنصحك به أكثر للأداء والترفيه من البحث عن أفضل كاميرا بين الهواتف الستة.',
      fr: 'Si les performances et les jeux sont vos priorités, c’est l’un des modèles que je recommande dans cette sélection. Le Dimensity 8300-Ultra, la RAM LPDDR5X et le stockage UFS 4.0 privilégient la rapidité, avec un écran 120 Hz et une charge 67 W. Je le conseille davantage pour la puissance et le divertissement que pour rechercher le meilleur appareil photo des six modèles.',
      en: 'If performance and gaming are your priorities, this is one of my recommendations in this selection. The Dimensity 8300-Ultra, LPDDR5X RAM and UFS 4.0 storage emphasize speed, alongside a 120Hz display and 67W charging. I recommend it more for performance and entertainment than for finding the best camera among these six phones.',
    },
  },
];
