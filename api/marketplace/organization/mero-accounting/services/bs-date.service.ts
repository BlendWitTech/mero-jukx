import { Injectable } from '@nestjs/common';
import NepaliDate from 'nepali-date-converter';

@Injectable()
export class BsDateService {
    /**
     * Converts a standard AD Date to a Bikram Sambat (BS) string (YYYY-MM-DD).
     */
    adToBs(date: Date | string): string {
        try {
            const adDate = new Date(date);
            const nepaliDate = new NepaliDate(adDate);
            return nepaliDate.format('YYYY-MM-DD');
        } catch (error) {
            console.error('Error converting AD to BS:', error);
            return 'Invalid BS Date';
        }
    }

    /**
     * Converts a Bikram Sambat (BS) string to a standard AD Date object.
     * Expects format YYYY-MM-DD
     */
    bsToAd(bsDateStr: string): Date {
        try {
            const parts = bsDateStr.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // 0-indexed month for nepali-date-converter
            const day = parseInt(parts[2], 10);

            const nepaliDate = new NepaliDate(year, month, day);
            return nepaliDate.toJsDate();
        } catch (error) {
            console.error('Error converting BS to AD:', error);
            throw new Error('Invalid BS Date format (Expected YYYY-MM-DD)');
        }
    }
}
