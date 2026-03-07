import { Injectable } from '@nestjs/common';

export interface TaxCategory {
    id: string;
    name: string;
    rate: number;
    type: 'VAT' | 'TDS';
}

@Injectable()
export class TaxService {
    // In a full implementation, these would come from a database table
    private readonly vatCategories: TaxCategory[] = [
        { id: 'vat-std', name: 'Standard VAT', rate: 13, type: 'VAT' },
        { id: 'vat-zero', name: 'Zero-rated VAT', rate: 0, type: 'VAT' },
        { id: 'vat-exempt', name: 'VAT Exempt', rate: 0, type: 'VAT' },
    ];

    private readonly tdsCategories: TaxCategory[] = [
        { id: 'tds-svc-res', name: 'Service (Resident) - 1.5%', rate: 1.5, type: 'TDS' },
        { id: 'tds-svc-non-res', name: 'Service (Non-Resident) - 15%', rate: 15, type: 'TDS' },
        { id: 'tds-rent', name: 'House Rent - 10%', rate: 10, type: 'TDS' },
        { id: 'tds-consult', name: 'Consultancy - 15%', rate: 15, type: 'TDS' },
        { id: 'tds-audit', name: 'Audit Fees - 15%', rate: 15, type: 'TDS' },
    ];

    async getVatCategories() {
        return this.vatCategories;
    }

    async getTdsCategories() {
        return this.tdsCategories;
    }

    async getTaxCategoryById(id: string) {
        const categories = [...this.vatCategories, ...this.tdsCategories];
        return categories.find(c => c.id === id);
    }

    calculateVat(amount: number, categoryId: string = 'vat-std') {
        const category = this.vatCategories.find(c => c.id === categoryId);
        if (!category) return 0;
        return (amount * category.rate) / 100;
    }

    calculateTds(amount: number, categoryId: string) {
        const category = this.tdsCategories.find(c => c.id === categoryId);
        if (!category) return 0;
        return (amount * category.rate) / 100;
    }
}
