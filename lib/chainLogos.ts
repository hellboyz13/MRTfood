// Chain brand logos using Clearbit Logo API
export const chainLogos: Record<string, string> = {
  // Fast Food
  "McDonald's": "https://logo.clearbit.com/mcdonalds.com",
  "KFC": "https://logo.clearbit.com/kfc.com",
  "Subway": "https://logo.clearbit.com/subway.com",
  "Jollibee": "https://logo.clearbit.com/jollibee.com",
  "Burger King": "https://logo.clearbit.com/burgerking.com",

  // Chinese
  "Din Tai Fung": "https://logo.clearbit.com/dintaifung.com.tw",
  "Tim Ho Wan": "https://logo.clearbit.com/timhowan.com",
  "Crystal Jade": "https://logo.clearbit.com/crystaljade.com",
  "Putien": "https://logo.clearbit.com/putien.com",
  "Xiang Xiang Hunan Cuisine": "https://logo.clearbit.com/xiangxianghunancuisine.com",

  // Hotpot
  "Haidilao": "https://logo.clearbit.com/haidilao.com",
  "Beauty in the Pot": "https://logo.clearbit.com/paradisegp.com",
  "Suki-Ya": "https://logo.clearbit.com/suki-ya.com",
  "Seoul Garden": "https://logo.clearbit.com/seoulgarden.com.sg",

  // Bubble Tea
  "KOI": "https://logo.clearbit.com/koithe.com",
  "LiHO": "https://logo.clearbit.com/lihosg.com",
  "Gong Cha": "https://logo.clearbit.com/gongcha.com",
  "Tiger Sugar": "https://logo.clearbit.com/tigersugar.com",
  "Chicha San Chen": "https://logo.clearbit.com/chichasanchen.com",
  "The Alley": "https://logo.clearbit.com/the-alley.com",
  "Each A Cup": "",

  // Local
  "Ya Kun Kaya Toast": "https://logo.clearbit.com/yakun.com",
  "Toast Box": "https://logo.clearbit.com/toastbox.com.sg",
  "Old Chang Kee": "https://logo.clearbit.com/oldchangkee.com",
  "Mr Bean": "https://logo.clearbit.com/mrbean.com.sg",
  "4Fingers": "https://logo.clearbit.com/4fingers.com",

  // Japanese
  "Pepper Lunch": "https://logo.clearbit.com/pepperlunch.com",
  "Genki Sushi": "https://logo.clearbit.com/genkisushi.com.sg",
  "Sushi Express": "https://logo.clearbit.com/sushiexpress.com.sg",
  "Ajisen Ramen": "https://logo.clearbit.com/ajisen.com.sg",
};

// Helper function to get logo URL by brand name
export function getChainLogo(brandName: string): string | null {
  // Try exact match first
  if (chainLogos[brandName]) {
    return chainLogos[brandName];
  }

  // Try partial match (case-insensitive)
  const normalizedSearch = brandName.toLowerCase();
  for (const [key, value] of Object.entries(chainLogos)) {
    if (key.toLowerCase().includes(normalizedSearch) || normalizedSearch.includes(key.toLowerCase())) {
      return value;
    }
  }

  return null;
}
