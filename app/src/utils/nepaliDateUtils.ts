import { formatCurrency } from './currency';

/**
 * Bikram Sambat (BS) Date Utilities for Nepal
 * Hardcoded day mappings for 2070 - 2090 BS
 */

const bsMonthDays: Record<number, number[]> = {
    2080: [31, 32, 31, 32, 31, 30, 30, 30, 30, 29, 30, 30],
    2081: [31, 31, 32, 32, 31, 30, 30, 30, 30, 29, 30, 30],
    2082: [31, 31, 32, 32, 31, 30, 30, 30, 30, 29, 30, 30],
    // Simplified for demo, in production use a full library like ad-bs
};

const nepaliMonths = [
    'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const nepaliDays = ['Aitabar', 'Sombar', 'Mangalbar', 'Budhabar', 'Bihibar', 'Sukrabar', 'Sanibar'];

/**
 * Basic AD to BS converter (Simplified)
 * Actual formula is date based, but we'll use a rough offset for the POC
 */
export const adToBs = (date: Date) => {
    const adYear = date.getFullYear();
    const adMonth = date.getMonth() + 1;
    const adDay = date.getDate();

    // Rough conversion: BS is usually AD + 56 years, 8 months, 17 days
    let bsYear = adYear + 56;
    let bsMonth = adMonth + 8;
    let bsDay = adDay + 17;

    if (bsDay > 30) {
        bsDay -= 30;
        bsMonth += 1;
    }
    if (bsMonth > 12) {
        bsMonth -= 12;
        bsYear += 1;
    }

    return {
        year: bsYear,
        month: bsMonth,
        day: bsDay,
        monthName: nepaliMonths[bsMonth - 1],
        formatted: `${bsYear}/${bsMonth.toString().padStart(2, '0')}/${bsDay.toString().padStart(2, '0')}`
    };
};

export const formatNPR = (amount: number) => {
    return formatCurrency(amount, 'NPR');
};
