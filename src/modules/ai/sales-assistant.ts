import { GoogleGenAI } from "@google/genai";
import {
  getPublicProductById,
  getWilayaByCode,
  listAvailableProducts,
  listWilayas,
  requestHumanAgentInDb,
  unlockCheckoutInDb,
} from "../../db/repository.ts";
import {
  detectHumanEscalationIntent,
  detectPurchaseIntent,
} from "../../lib/domain-rules.ts";

const SYSTEM_INSTRUCTION = `أنت Smart Deal-Room، مساعد المبيعات الرسمي لمتجر الهواتف الذكية الجزائري (DZPhone).
مهمتك مساعدة الزبون على:
1. فهم مواصفات الهاتف المعروض وتفاصيل فحص X-Ray للهواتف المستعملة (صحة البطارية، حالة الهيكل، الملحقات المرفقة).
2. مقارنة الهواتف المتوفرة في المتجر أو ترشيح الهاتف الأنسب حسب ميزانية الزبون بالدينار الجزائري (DZD / دج).
3. معرفة تكلفة التوصيل الرسمية لأي ولاية جزائرية (توصيل للمكتب Stop Desk أو لباب المنزل) وشرح نظام الدفع عند الاستلام (COD) بعد التأكيد الهاتفي.
4. إرشاد الزبون لفتح استمارة الحجز أو تحويل المحادثة للبائع البشري عند الرغبة في التفاوض.

اللغة والأسلوب:
- اكتشف لغة المستخدم تلقائياً وأجب باللغة نفسها: العربية، الدارجة الجزائرية، الفرنسية أو الإنجليزية.
- افهم الدارجة الجزائرية حتى عندما تكون مكتوبة بالحروف اللاتينية (Arabizi) أو ممزوجة بالفرنسية.
- اجعل الرد مختصراً، منظماً وعملياً (سطرين إلى 4 أسطر كحد أقصى)، واستخدم دج / DA للمبالغ.

مصدر الحقيقة الصارم:
- اعتمد حصرياً على بيانات المنتجات وأسعار التوصيل المرفقة من قاعدة البيانات.
- لا تختلق أي سعر أو تخفيض أو مخزون أو ضمان أو ملحق أو نسبة بطارية غير مذكورة في البيانات.
- لا تفاوض ولا تمنح أي خصم من تلقاء نفسك أبداً؛ التفاوض يتم حصرياً مع البائع البشري.`;

export async function generateSalesAssistantReply(input: {
  sessionId: string;
  productId: string;
  locale: "ar" | "fr" | "en";
  customerMessage: string;
  explicitIntent?: "request_human";
}): Promise<{
  escalated: boolean;
  unlockedCheckout: boolean;
  assistantReply: string | null;
}> {
  const { sessionId, productId, locale, customerMessage, explicitIntent } =
    input;

  // 1. Server-enforced human escalation rule (negotiation / discount / human seller request)
  if (
    explicitIntent === "request_human" ||
    detectHumanEscalationIntent(customerMessage)
  ) {
    await requestHumanAgentInDb({
      sessionId,
      reason: customerMessage,
      preferredLanguage: locale,
    });
    return {
      escalated: true,
      unlockedCheckout: false,
      assistantReply: null,
    };
  }

  // 2. Explicit purchase intent -> unlock COD checkout form inside the Deal-Room
  const wantsToBuy = detectPurchaseIntent(customerMessage);
  if (wantsToBuy) {
    await unlockCheckoutInDb(sessionId);
    const buyMsg = {
      ar: "تفضل، لقد فتحت لك استمارة الطلب المباشر بالدفع عند الاستلام. أدخل اسمك ورقم هاتفك والولاية وسيتصل بك البائع هاتفياً لتأكيد الطلبية قبل الشحن.",
      fr: "Voici le formulaire de commande (Paiement à la livraison). Remplissez vos coordonnées et le vendeur vous appellera pour confirmer.",
      en: "I've unlocked the Cash-on-Delivery order form below. Fill in your details and the seller will call you to confirm before shipping.",
    }[locale];
    return {
      escalated: false,
      unlockedCheckout: true,
      assistantReply: buyMsg,
    };
  }

  // 3. Load ground-truth product, full catalog, and wilaya shipping from PostgreSQL
  const [product, catalog, allWilayas] = await Promise.all([
    getPublicProductById(productId),
    listAvailableProducts(),
    listWilayas(true),
  ]);

  const lowerMsg = customerMessage.toLowerCase();
  const matchedWilaya = allWilayas.find(
    (w) =>
      lowerMsg.includes(w.name_ar) ||
      lowerMsg.includes(w.name_fr.toLowerCase()) ||
      lowerMsg.includes(w.name_en.toLowerCase()) ||
      new RegExp(`(^|\\D)${w.code}(\\D|$)`).test(customerMessage)
  );

  const wilayaDetail = matchedWilaya
    ? await getWilayaByCode(matchedWilaya.code)
    : null;

  // 4. Call Gemini API (`gemini-3.8-flash`) with full catalog & shipping ground-truth
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey !== "YOUR_GEMINI_API_KEY" && product) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const contextBlock = JSON.stringify({
        active_product: {
          id: product.id,
          name: product.name,
          condition: product.condition,
          price_dzd: product.price_dzd,
          stock_quantity: product.stock_quantity ?? 0,
          specs: product.specs,
          inspection: product.inspection?.data_status === "merchant_verified"
            ? product.inspection
            : { status: "template_only", actual_unit_metrics_available: false },
        },
        store_catalog_summary: catalog.map((c) => ({
          id: c.id,
          name: c.name[locale],
          condition: c.condition,
          price_dzd: c.price_dzd,
          processor: c.specs.processor,
          ram_storage: `${c.specs.ram_gb}/${c.specs.storage_gb}GB`,
          camera_mp: c.specs.camera.mp,
          battery_mah: c.specs.battery_mah,
          battery_health: c.inspection?.data_status === "merchant_verified"
            ? `${c.inspection.battery_health_percent}% (seller verified for the actual unit)`
            : c.condition === "new_sealed"
              ? "Not applicable — sealed new product; do not claim 100% health"
              : "Not verified for the actual unit; seller must confirm before dispatch",
          inspection_status: c.inspection?.data_status === "merchant_verified"
            ? "merchant_verified"
            : c.condition === "used_like_new" ? "template_only" : "not_applicable",
        })),
        matched_wilaya_shipping: wilayaDetail ?? "لم يحدد الزبون ولاية في سؤاله",
        store_policies: {
          payment: "Cash on Delivery (الدفع عند الاستلام بعد الفحص)",
          confirmation: "Mandatory phone call confirmation before dispatch",
          coverage:
            "Delivery is available only in wilayas currently marked active in the database. Never claim blanket coverage of all wilayas.",
          used_phone_inspection_policy:
            "Only quote battery percentage, physical condition scores, or accessories when inspection.data_status is 'merchant_verified' for the actual unit. If status is 'illustrative_template', say the actual unit has not yet been inspected and its condition/photos will be confirmed by the seller before dispatch. Never disclose template percentages as real facts.",
        },
        preferred_locale: locale,
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `بيانات قاعدة البيانات الموثوقة:\n${contextBlock}\n\nرسالة الزبون:\n${customerMessage}`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      const text = response.text?.trim();
      if (text) {
        return {
          escalated: false,
          unlockedCheckout: false,
          assistantReply: text,
        };
      }
    } catch (error) {
      console.error("Gemini API fallback triggered:", error);
    }
  }

  // 5. Deterministic DB-backed fallback (handles shipping, budget, comparisons, and specs)
  const m = (n: number) =>
    `${n.toLocaleString("fr-FR")} ${locale === "ar" ? "دج" : "DA"}`;

  if (wilayaDetail) {
    const wLabel =
      locale === "ar"
        ? wilayaDetail.name_ar
        : locale === "fr"
          ? wilayaDetail.name_fr
          : wilayaDetail.name_en;
    const reply = !wilayaDetail.is_active
      ? {
          ar: `التوصيل إلى ولاية ${wLabel} (${wilayaDetail.code}) غير مفعل حالياً لدى شركة الشحن. يمكنك التواصل مع البائع لتأكيد إمكانية الإرسال عبر ولاية مجاورة.`,
          fr: `La livraison vers ${wLabel} (${wilayaDetail.code}) n'est pas encore activée par le transporteur. Contactez le vendeur pour vérifier les options.`,
          en: `Courier coverage for ${wLabel} (${wilayaDetail.code}) is not yet active. Please contact the seller to check delivery options.`,
        }[locale]
      : {
          ar: `التوصيل إلى ${wLabel} (${wilayaDetail.code}): مكتب (Stop Desk) بـ ${m(wilayaDetail.stop_desk_price)} · لباب المنزل بـ ${m(wilayaDetail.home_delivery_price)}. الدفع عند الاستلام والتأكيد النهائي هاتفياً.`,
          fr: `Livraison ${wLabel} (${wilayaDetail.code}) : Stop Desk ${m(wilayaDetail.stop_desk_price)} · À domicile ${m(wilayaDetail.home_delivery_price)}. Paiement à la livraison après confirmation téléphonique.`,
          en: `Delivery to ${wLabel} (${wilayaDetail.code}): Stop Desk ${m(wilayaDetail.stop_desk_price)} · Home delivery ${m(wilayaDetail.home_delivery_price)}. Cash on delivery after phone confirmation.`,
        }[locale];

    return {
      escalated: false,
      unlockedCheckout: false,
      assistantReply: reply,
    };
  }

  // Budget query detection (e.g., "60000" or "70000" or "ميزانية")
  const budgetMatch = customerMessage.match(/\b(\d{4,6})\b/);
  if (
    budgetMatch ||
    /ميزاني|budget|أرخص|اقل من|تحت|moins de|under/i.test(customerMessage)
  ) {
    const maxBudget = budgetMatch ? Number(budgetMatch[1]) : 70000;
    const within = catalog
      .filter((c) => c.price_dzd <= maxBudget && c.availability === "available" && (c.stock_quantity ?? 0) > 0)
      .sort((a, b) => a.price_dzd - b.price_dzd);
    if (within.length > 0) {
      const listStr = within
        .map((c) => `${c.name[locale]} (${m(c.price_dzd)})`)
        .join(" · ");
      const reply = {
        ar: `ضمن ميزانية ${m(maxBudget)} أرشح لك من متجرنا: ${listStr}. متوفرة مع توصيل للولايات المغطاة والدفع عند الاستلام.`,
        fr: `Pour un budget de ${m(maxBudget)}, voici nos modèles disponibles : ${listStr}. Livraison vers les wilayas couvertes avec paiement à la livraison.`,
        en: `Within ${m(maxBudget)}, we have in stock: ${listStr}. Available with COD delivery to covered wilayas.`,
      }[locale];
      return {
        escalated: false,
        unlockedCheckout: false,
        assistantReply: reply,
      };
    }
  }

  // Comparison query detection
  if (/مقارن|فرق|أفضل|احسن|compar|vs|difference|better/i.test(customerMessage) && product) {
    const other =
      catalog.find(
        (c) =>
          c.id !== product.id &&
          (lowerMsg.includes(c.brand.toLowerCase()) ||
            lowerMsg.includes(c.commercial_name.toLowerCase()))
      ) || catalog.find((c) => c.id !== product.id);
    if (other) {
      const reply = {
        ar: `مقارنة سريعة: ${product.name.ar} (${m(product.price_dzd)}، معالج ${product.specs.processor}، كاميرا ${product.specs.camera.mp}MP) مقابل ${other.name.ar} (${m(other.price_dzd)}، معالج ${other.specs.processor}، كاميرا ${other.specs.camera.mp}MP).`,
        fr: `Comparaison : ${product.name.fr} (${m(product.price_dzd)}, ${product.specs.processor}, ${product.specs.camera.mp}MP) vs ${other.name.fr} (${m(other.price_dzd)}, ${other.specs.processor}, ${other.specs.camera.mp}MP).`,
        en: `Comparison: ${product.name.en} (${m(product.price_dzd)}, ${product.specs.processor}, ${product.specs.camera.mp}MP) vs ${other.name.en} (${m(other.price_dzd)}, ${other.specs.processor}, ${other.specs.camera.mp}MP).`,
      }[locale];
      return {
        escalated: false,
        unlockedCheckout: false,
        assistantReply: reply,
      };
    }
  }

  if (product) {
    const s = product.specs;
    const cond = product.condition === "used_like_new"
      ? product.inspection?.data_status === "merchant_verified"
        ? ` · 🔋 ${product.inspection.battery_health_percent}% (${product.inspection.body_score_out_of_10}/10) — verified for this unit`
        : locale === "ar"
          ? " · حالة الجهاز ونسبة البطارية الفعلية يؤكدهما البائع قبل الشحن"
          : locale === "fr"
            ? " · État et batterie de l’unité à confirmer avant expédition"
            : " · Actual unit condition and battery health to be confirmed before dispatch"
      : ` · ${locale === "ar" ? "جديد مغلق (Scellé)" : locale === "fr" ? "Neuf Scellé" : "New Sealed"}`;
    return {
      escalated: false,
      unlockedCheckout: false,
      assistantReply: `${product.name[locale]} — ${s.display.size}" ${s.display.hz}Hz · ${s.processor} · ${s.ram_gb}/${s.storage_gb}GB · ${s.camera.mp}MP · ${s.battery_mah}mAh${cond} · ${m(product.price_dzd)}`,
    };
  }

  return {
    escalated: false,
    unlockedCheckout: false,
    assistantReply:
      locale === "ar"
        ? "مرحباً بك في DZPhone! كيف يمكنني مساعدتك بخصوص مواصفات الهاتف أو أسعار التوصيل لولايتك؟"
        : "Bonjour chez DZPhone ! Comment puis-je vous aider ?",
  };
}
