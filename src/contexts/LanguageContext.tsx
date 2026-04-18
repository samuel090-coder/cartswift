import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { formatDisplayPrice } from '@/lib/priceFormat';

type Language = 'en' | 'es' | 'fr' | 'ar' | 'zh';
type Currency = 'USD' | 'EUR' | 'GBP' | 'NGN' | 'CNY' | 'AED' | 'INR';

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.shop': { en: 'Shop', es: 'Tienda', fr: 'Boutique', ar: 'تسوق', zh: '商店' },
  'nav.trending': { en: 'Trending', es: 'Tendencias', fr: 'Tendances', ar: 'رائج', zh: '热门' },
  'nav.rewards': { en: 'Rewards', es: 'Recompensas', fr: 'Récompenses', ar: 'مكافآت', zh: '奖励' },
  'nav.refer': { en: 'Refer', es: 'Referir', fr: 'Parrainer', ar: 'إحالة', zh: '推荐' },
  'nav.cart': { en: 'Cart', es: 'Carrito', fr: 'Panier', ar: 'سلة', zh: '购物车' },
  'nav.signin': { en: 'Sign In', es: 'Iniciar Sesión', fr: 'Connexion', ar: 'تسجيل الدخول', zh: '登录' },
  'nav.profile': { en: 'Profile', es: 'Perfil', fr: 'Profil', ar: 'الملف الشخصي', zh: '个人资料' },
  
  // Home
  'home.title': { en: 'CARTSWIFT', es: 'CARTSWIFT', fr: 'CARTSWIFT', ar: 'كارت سويفت', zh: '极速购物' },
  'home.subtitle': { en: 'Fast delivery, amazing deals, viral rewards', es: 'Entrega rápida, ofertas increíbles, recompensas virales', fr: 'Livraison rapide, offres incroyables, récompenses virales', ar: 'توصيل سريع، عروض مذهلة، مكافآت فيروسية', zh: '快速配送，超值优惠，病毒式奖励' },
  
  // Products
  'product.addToCart': { en: 'Add to Cart', es: 'Agregar al Carrito', fr: 'Ajouter au Panier', ar: 'أضف إلى السلة', zh: '加入购物车' },
  'product.buyNow': { en: 'Buy Now', es: 'Comprar Ahora', fr: 'Acheter Maintenant', ar: 'اشتري الآن', zh: '立即购买' },
  'product.outOfStock': { en: 'Out of Stock', es: 'Agotado', fr: 'Rupture de Stock', ar: 'نفذت الكمية', zh: '缺货' },
  'product.inStock': { en: 'In Stock', es: 'En Stock', fr: 'En Stock', ar: 'متوفر', zh: '有库存' },
  
  // Cart
  'cart.empty': { en: 'Your cart is empty', es: 'Tu carrito está vacío', fr: 'Votre panier est vide', ar: 'سلتك فارغة', zh: '购物车是空的' },
  'cart.checkout': { en: 'Checkout', es: 'Pagar', fr: 'Paiement', ar: 'الدفع', zh: '结账' },
  'cart.total': { en: 'Total', es: 'Total', fr: 'Total', ar: 'المجموع', zh: '总计' },
  
  // Seller
  'seller.dashboard': { en: 'Seller Dashboard', es: 'Panel del Vendedor', fr: 'Tableau de Bord Vendeur', ar: 'لوحة تحكم البائع', zh: '卖家后台' },
  'seller.addProduct': { en: 'Add Product', es: 'Agregar Producto', fr: 'Ajouter un Produit', ar: 'إضافة منتج', zh: '添加商品' },
  'seller.myProducts': { en: 'My Products', es: 'Mis Productos', fr: 'Mes Produits', ar: 'منتجاتي', zh: '我的商品' },
  'seller.earnings': { en: 'Earnings', es: 'Ganancias', fr: 'Revenus', ar: 'الأرباح', zh: '收益' },
  
  // Subscription
  'sub.vip': { en: 'VIP Member', es: 'Miembro VIP', fr: 'Membre VIP', ar: 'عضو VIP', zh: 'VIP会员' },
  'sub.premium': { en: 'Premium', es: 'Premium', fr: 'Premium', ar: 'بريميوم', zh: '高级会员' },
  'sub.benefits': { en: 'Benefits', es: 'Beneficios', fr: 'Avantages', ar: 'المزايا', zh: '权益' },
  
  // Support
  'support.help': { en: 'Help', es: 'Ayuda', fr: 'Aide', ar: 'مساعدة', zh: '帮助' },
  'support.chat': { en: 'Live Chat', es: 'Chat en Vivo', fr: 'Chat en Direct', ar: 'دردشة مباشرة', zh: '在线聊天' },
  'support.track': { en: 'Track Order', es: 'Rastrear Pedido', fr: 'Suivre Commande', ar: 'تتبع الطلب', zh: '跟踪订单' },
  
  // Common
  'common.loading': { en: 'Loading...', es: 'Cargando...', fr: 'Chargement...', ar: 'جاري التحميل...', zh: '加载中...' },
  'common.save': { en: 'Save', es: 'Guardar', fr: 'Sauvegarder', ar: 'حفظ', zh: '保存' },
  'common.cancel': { en: 'Cancel', es: 'Cancelar', fr: 'Annuler', ar: 'إلغاء', zh: '取消' },
  'common.submit': { en: 'Submit', es: 'Enviar', fr: 'Soumettre', ar: 'إرسال', zh: '提交' },
  'common.search': { en: 'Search', es: 'Buscar', fr: 'Rechercher', ar: 'بحث', zh: '搜索' },
};

const currencyRates: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1550,
  CNY: 7.24,
  AED: 3.67,
  INR: 83.12,
};

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  NGN: '₦',
  CNY: '¥',
  AED: 'د.إ',
  INR: '₹',
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  t: (key: string) => string;
  formatPrice: (priceUSD: number) => string;
  getCurrencySymbol: () => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [currency, setCurrency] = useState<Currency>('USD');

  useEffect(() => {
    // Detect user's language and location
    const detectUserPreferences = async () => {
      const savedLang = localStorage.getItem('cartswift-language') as Language;
      const savedCurrency = localStorage.getItem('cartswift-currency') as Currency;
      
      if (savedLang) setLanguage(savedLang);
      if (savedCurrency) setCurrency(savedCurrency);
      
      if (!savedLang || !savedCurrency) {
        // Try to detect from browser
        const browserLang = navigator.language.slice(0, 2);
        const langMap: Record<string, Language> = {
          en: 'en', es: 'es', fr: 'fr', ar: 'ar', zh: 'zh'
        };
        if (langMap[browserLang] && !savedLang) {
          setLanguage(langMap[browserLang]);
        }
        
        // Try to get location for currency
        if (!savedCurrency) {
          try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            const currencyMap: Record<string, Currency> = {
              US: 'USD', GB: 'GBP', EU: 'EUR', NG: 'NGN', 
              CN: 'CNY', AE: 'AED', IN: 'INR',
              DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR'
            };
            if (currencyMap[data.country_code]) {
              setCurrency(currencyMap[data.country_code]);
            }
          } catch (e) {
            // Fallback to USD
          }
        }
      }
    };
    
    detectUserPreferences();
  }, []);

  useEffect(() => {
    localStorage.setItem('cartswift-language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('cartswift-currency', currency);
  }, [currency]);

  const t = (key: string): string => {
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  };

  const formatPrice = (priceUSD: number): string => {
    const convertedPrice = priceUSD * currencyRates[currency];
    return formatDisplayPrice(convertedPrice, currencySymbols[currency]);
  };

  const getCurrencySymbol = () => currencySymbols[currency];

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      currency,
      setCurrency,
      t,
      formatPrice,
      getCurrencySymbol,
      isRTL,
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
