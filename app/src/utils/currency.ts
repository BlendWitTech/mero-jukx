// Currency conversion utilities

// Default exchange rate (1 NPR = 0.0075 USD)
// This should be updated regularly or fetched from an API
export const NPR_TO_USD_RATE = parseFloat(
  import.meta.env.VITE_NPR_TO_USD_RATE || '0.0075'
);

export const DEFAULT_CURRENCY = import.meta.env.VITE_DEFAULT_CURRENCY || 'NPR';
export const NEPAL_COUNTRY_CODE = 'NP';

/**
 * Convert NPR to USD
 */
export const convertNPRToUSD = (npr: number): number => {
  return npr * NPR_TO_USD_RATE;
};

/**
 * Convert USD to NPR
 */
export const convertUSDToNPR = (usd: number): number => {
  return usd / NPR_TO_USD_RATE;
};

/**
 * Format currency amount with elegant display
 */
export const formatCurrency = (amount: number, currencyInput: string = DEFAULT_CURRENCY): string => {
  const currency = (currencyInput || DEFAULT_CURRENCY).toUpperCase();

  if (currency === 'NPR') {
    // Format NPR with proper formatting (NPR symbol: रू or Rs.)
    const formatted = new Intl.NumberFormat('en-NP', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `Rs. ${formatted}`;
  }

  // Format USD with $ symbol
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    // Fallback for invalid currency codes
    return `$ ${amount.toFixed(2)}`;
  }
};

/**
 * Detect if user is in Nepal
 * Can be enhanced with IP geolocation API
 */
export const isNepalRegion = (): boolean => {
  // Check localStorage for user's country preference
  const userCountry = localStorage.getItem('user_country');

  if (userCountry) {
    return userCountry === 'NP' || userCountry === 'Nepal';
  }

  // Check timezone as fallback (Nepal is UTC+5:45)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone === 'Asia/Kathmandu';
};

/**
 * Get primary currency based on region
 */
export const getPrimaryCurrency = (): 'NPR' | 'USD' => {
  return isNepalRegion() ? 'NPR' : 'USD';
};

/**
 * Get display currency (shows both NPR and USD)
 */
export const getDisplayCurrencies = (amount: number): {
  primary: { amount: number; currency: string; formatted: string };
  secondary: { amount: number; currency: string; formatted: string };
} => {
  const isNepal = isNepalRegion();
  const nprAmount = isNepal ? amount : convertUSDToNPR(amount);
  const usdAmount = isNepal ? convertNPRToUSD(amount) : amount;

  return {
    primary: {
      amount: isNepal ? nprAmount : usdAmount,
      currency: isNepal ? 'NPR' : 'USD',
      formatted: formatCurrency(isNepal ? nprAmount : usdAmount, isNepal ? 'NPR' : 'USD'),
    },
    secondary: {
      amount: isNepal ? usdAmount : nprAmount,
      currency: isNepal ? 'USD' : 'NPR',
      formatted: formatCurrency(isNepal ? usdAmount : nprAmount, isNepal ? 'USD' : 'NPR'),
    },
  };
};

