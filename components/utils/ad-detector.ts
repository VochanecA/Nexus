// components/utils/ad-detector.ts
export const detectAdvertisement = (content: string): {
  isAd: boolean;
  confidence: number;
  detectedLanguages: string[];
  reasons: string[];
} => {
  const text = content?.toLowerCase() || '';
  const reasons: string[] = [];
  let confidence = 0;
  const detectedLanguages = new Set<string>();
  
  // Language detection patterns
  const languagePatterns = {
    english: /\b(ad|sponsored|promoted|sale|discount|buy|shop|store)\b/gi,
    serbian: /\b(reklama|sponzorisano|popust|akcija|prodavnica)\b/gi,
    spanish: /\b(publicidad|anuncio|venta|descuento|tienda)\b/gi,
    french: /\b(publicité|annonce|vente|réduction|magasin)\b/gi,
    german: /\b(werbung|anzeige|verkauf|rabatt|geschäft)\b/gi,
    russian: /\b(реклама|объявление|распродажа|скидка|магазин)\b/gi
  };
  
  // Detect languages
  Object.entries(languagePatterns).forEach(([lang, pattern]) => {
    if (pattern.test(text)) {
      detectedLanguages.add(lang);
      confidence += 10;
    }
  });
  
  // Common ad patterns (language-agnostic)
  const patterns = [
    // Currency symbols
    { pattern: /[\$€£¥₹₽₴₩₸₺]/g, reason: 'Currency symbol', score: 15 },
    // Phone numbers
    { pattern: /\+?[\d\s\-\(\)]{7,}\d/, reason: 'Phone number', score: 20 },
    // URLs
    { pattern: /(www\.|https?:\/\/|\.(com|rs|me|ba|hr|si|de|fr|es|ru))/gi, reason: 'Website/URL', score: 15 },
    // Prices
    { pattern: /\d+[\.,]?\d*\s*(usd|eur|gbp|rsd|din|kn|€|\$)/gi, reason: 'Price mentioned', score: 20 },
    // Call to action
    { pattern: /(call|contact|visit|buy|order|shop|click|zovite|pozovite|kontakt|kupite)/gi, reason: 'Call to action', score: 15 },
    // Limited time offers
    { pattern: /(limited|ograničeno|limited time|samo danas|only today)/gi, reason: 'Limited offer', score: 10 },
    // Free offers
    { pattern: /(free|besplatno|gratis|бесплатно)/gi, reason: 'Free offer', score: 10 },
    // Warranty/guarantee
    { pattern: /(warranty|guarantee|garancija|garant)/gi, reason: 'Warranty mentioned', score: 10 },
    // Product features list
    { pattern: /(\n\s*[-•*✓→⇒›]\s+.*){3,}/g, reason: 'Product features list', score: 25 }
  ];
  
  patterns.forEach(({ pattern, reason, score }) => {
    if (pattern.test(text)) {
      reasons.push(reason);
      confidence += score;
    }
  });
  
  // Hashtags detection
  const adHashtags = /#(ad|ads|sponsored|promoted|reklama|sponzorisano|publicidad|werbung|sale|discount|popust)/gi;
  if (adHashtags.test(text)) {
    reasons.push('Ad hashtag');
    confidence += 20;
  }
  
  // If confidence is high enough, it's an ad
  const isAd = confidence >= 40 || reasons.length >= 3;
  
  return {
    isAd,
    confidence: Math.min(confidence, 100),
    detectedLanguages: Array.from(detectedLanguages),
    reasons
  };
};