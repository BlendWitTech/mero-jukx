import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the Nepal System Chart of Accounts (organization_id = NULL, is_system = true).
 *
 * IDEMPOTENT: Uses INSERT ... ON CONFLICT DO NOTHING so it is safe to re-run.
 * Any new account added to this list will be inserted automatically on the next
 * server start / migration run — no manual `npm run seed` is required.
 *
 * HOW TO ADD A NEW SYSTEM ACCOUNT:
 *   1. Add a new row to the ACCOUNTS array below.
 *   2. Create a NEW migration (next timestamp) that does the same INSERT for
 *      just the new account(s), so existing databases also pick it up.
 *   OR: if you are creating this migration fresh, add it here directly.
 */

interface AccountSeed {
    code: string;
    name: string;
    nameNepali: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    category: string;
    parentCode: string | null;
}

const ACCOUNTS: AccountSeed[] = [
    // ── ASSETS ──────────────────────────────────────────────────────────────
    { code: '1000', name: 'Assets', nameNepali: 'सम्पत्ति', type: 'ASSET', category: 'Main', parentCode: null },

    // Current Assets
    { code: '1100', name: 'Current Assets', nameNepali: 'चालु सम्पत्ति', type: 'ASSET', category: 'Current Asset', parentCode: '1000' },
    { code: '1110', name: 'Cash', nameNepali: 'नगद', type: 'ASSET', category: 'Current Asset', parentCode: '1100' },
    { code: '1120', name: 'Bank Accounts', nameNepali: 'बैंक खाता', type: 'ASSET', category: 'Current Asset', parentCode: '1100' },
    { code: '1130', name: 'Accounts Receivable', nameNepali: 'पाउनु पर्ने रकम', type: 'ASSET', category: 'Current Asset', parentCode: '1100' },
    { code: '1140', name: 'Inventory', nameNepali: 'स्टक', type: 'ASSET', category: 'Current Asset', parentCode: '1100' },
    { code: '1150', name: 'TDS Receivable', nameNepali: 'पाउनु पर्ने टि.डि.एस.', type: 'ASSET', category: 'Current Asset', parentCode: '1100' },
    { code: '1160', name: 'Advance Tax', nameNepali: 'अग्रिम कर', type: 'ASSET', category: 'Current Asset', parentCode: '1100' },
    { code: '1170', name: 'Prepaid Expense', nameNepali: 'अग्रिम खर्च', type: 'ASSET', category: 'Current Asset', parentCode: '1100' },

    // Fixed Assets
    { code: '1200', name: 'Fixed Assets', nameNepali: 'स्थिर सम्पत्ति', type: 'ASSET', category: 'Fixed Asset', parentCode: '1000' },
    { code: '1210', name: 'Land', nameNepali: 'जग्गा', type: 'ASSET', category: 'Fixed Asset', parentCode: '1200' },
    { code: '1220', name: 'Building', nameNepali: 'भवन', type: 'ASSET', category: 'Fixed Asset', parentCode: '1200' },
    { code: '1230', name: 'Furniture & Fixtures', nameNepali: 'फर्निचर', type: 'ASSET', category: 'Fixed Asset', parentCode: '1200' },
    { code: '1240', name: 'Vehicles', nameNepali: 'गाडी', type: 'ASSET', category: 'Fixed Asset', parentCode: '1200' },
    { code: '1250', name: 'Computer & Equipment', nameNepali: 'कम्प्युटर', type: 'ASSET', category: 'Fixed Asset', parentCode: '1200' },
    { code: '1260', name: 'Machinery', nameNepali: 'मेसिनरी', type: 'ASSET', category: 'Fixed Asset', parentCode: '1200' },
    { code: '1290', name: 'Accumulated Depreciation', nameNepali: 'संचित घिसारा', type: 'ASSET', category: 'Fixed Asset', parentCode: '1200' },

    // ── LIABILITIES ─────────────────────────────────────────────────────────
    { code: '2000', name: 'Liabilities', nameNepali: 'दायित्व', type: 'LIABILITY', category: 'Main', parentCode: null },

    // Current Liabilities
    { code: '2100', name: 'Current Liabilities', nameNepali: 'चालु दायित्व', type: 'LIABILITY', category: 'Current Liability', parentCode: '2000' },
    { code: '2110', name: 'Accounts Payable', nameNepali: 'तिर्नु पर्ने रकम', type: 'LIABILITY', category: 'Current Liability', parentCode: '2100' },
    { code: '2120', name: 'VAT Payable', nameNepali: 'तिर्नु पर्ने भ्याट', type: 'LIABILITY', category: 'Current Liability', parentCode: '2100' },
    { code: '2130', name: 'TDS Payable', nameNepali: 'तिर्नु पर्ने टि.डि.एस.', type: 'LIABILITY', category: 'Current Liability', parentCode: '2100' },
    { code: '2140', name: 'SSF Payable', nameNepali: 'तिर्नु पर्ने सामाजिक सुरक्षा कोष', type: 'LIABILITY', category: 'Current Liability', parentCode: '2100' },
    { code: '2150', name: 'Salary Payable', nameNepali: 'तिर्नु पर्ने तलब', type: 'LIABILITY', category: 'Current Liability', parentCode: '2100' },
    { code: '2160', name: 'Advance from Customers', nameNepali: 'ग्राहकबाट अग्रिम', type: 'LIABILITY', category: 'Current Liability', parentCode: '2100' },

    // Long-term Liabilities
    { code: '2200', name: 'Long-term Liabilities', nameNepali: 'दीर्घकालीन दायित्व', type: 'LIABILITY', category: 'Long-term Liability', parentCode: '2000' },
    { code: '2210', name: 'Bank Loan', nameNepali: 'बैंक ऋण', type: 'LIABILITY', category: 'Long-term Liability', parentCode: '2200' },
    { code: '2220', name: 'Deferred Tax Liability', nameNepali: 'स्थगित कर दायित्व', type: 'LIABILITY', category: 'Long-term Liability', parentCode: '2200' },

    // ── EQUITY ──────────────────────────────────────────────────────────────
    { code: '3000', name: 'Equity', nameNepali: 'पूँजी', type: 'EQUITY', category: 'Main', parentCode: null },
    { code: '3100', name: 'Owner Equity', nameNepali: 'मालिक पूँजी', type: 'EQUITY', category: 'Equity', parentCode: '3000' },
    { code: '3110', name: 'Share Capital', nameNepali: 'सेयर पूँजी', type: 'EQUITY', category: 'Share Capital', parentCode: '3100' },
    { code: '3200', name: 'Retained Earnings', nameNepali: 'संचित नाफा', type: 'EQUITY', category: 'Retained Earnings', parentCode: '3000' },
    { code: '3300', name: 'Reserves and Surplus', nameNepali: 'आरक्षित र बचत', type: 'EQUITY', category: 'Reserves and Surplus', parentCode: '3000' },
    { code: '3400', name: 'Drawings', nameNepali: 'निकासी', type: 'EQUITY', category: 'Equity', parentCode: '3000' },

    // ── REVENUE ─────────────────────────────────────────────────────────────
    { code: '4000', name: 'Revenue', nameNepali: 'आम्दानी', type: 'REVENUE', category: 'Main', parentCode: null },
    { code: '4100', name: 'Sales Revenue', nameNepali: 'बिक्री आम्दानी', type: 'REVENUE', category: 'Operating Revenue', parentCode: '4000' },
    { code: '4200', name: 'Service Revenue', nameNepali: 'सेवा आम्दानी', type: 'REVENUE', category: 'Operating Revenue', parentCode: '4000' },
    { code: '4300', name: 'Other Income', nameNepali: 'अन्य आम्दानी', type: 'REVENUE', category: 'Other Revenue', parentCode: '4000' },
    { code: '4310', name: 'Interest Income', nameNepali: 'ब्याज आम्दानी', type: 'REVENUE', category: 'Other Revenue', parentCode: '4300' },
    { code: '4320', name: 'Commission Income', nameNepali: 'कमिसन आम्दानी', type: 'REVENUE', category: 'Other Revenue', parentCode: '4300' },
    { code: '4330', name: 'Rental Income', nameNepali: 'भाडा आम्दानी', type: 'REVENUE', category: 'Other Revenue', parentCode: '4300' },

    // ── EXPENSES ────────────────────────────────────────────────────────────
    { code: '5000', name: 'Expenses', nameNepali: 'खर्च', type: 'EXPENSE', category: 'Main', parentCode: null },

    // Operating Expenses
    { code: '5100', name: 'Operating Expenses', nameNepali: 'सञ्चालन खर्च', type: 'EXPENSE', category: 'Operating Expense', parentCode: '5000' },
    { code: '5110', name: 'Salary & Wages', nameNepali: 'तलब', type: 'EXPENSE', category: 'Operating Expense', parentCode: '5100' },
    { code: '5120', name: 'Rent Expense', nameNepali: 'भाडा खर्च', type: 'EXPENSE', category: 'Operating Expense', parentCode: '5100' },
    { code: '5130', name: 'Utilities', nameNepali: 'बिजुली पानी', type: 'EXPENSE', category: 'Operating Expense', parentCode: '5100' },
    { code: '5140', name: 'Office Supplies', nameNepali: 'कार्यालय सामग्री', type: 'EXPENSE', category: 'Operating Expense', parentCode: '5100' },
    { code: '5150', name: 'Phone & Internet', nameNepali: 'फोन र इन्टरनेट', type: 'EXPENSE', category: 'Operating Expense', parentCode: '5100' },
    { code: '5160', name: 'Travel & Transport', nameNepali: 'यात्रा र यातायात', type: 'EXPENSE', category: 'Operating Expense', parentCode: '5100' },
    { code: '5170', name: 'Advertisement & Marketing', nameNepali: 'विज्ञापन र मार्केटिङ', type: 'EXPENSE', category: 'Operating Expense', parentCode: '5100' },
    { code: '5180', name: 'Insurance Expense', nameNepali: 'बिमा खर्च', type: 'EXPENSE', category: 'Operating Expense', parentCode: '5100' },
    { code: '5190', name: 'Depreciation Expense', nameNepali: 'घिसारा खर्च', type: 'EXPENSE', category: 'Operating Expense', parentCode: '5100' },

    // Cost of Goods Sold
    { code: '5200', name: 'Cost of Goods Sold', nameNepali: 'बिक्री लागत', type: 'EXPENSE', category: 'COGS', parentCode: '5000' },
    { code: '5210', name: 'Purchase of Goods', nameNepali: 'सामान खरिद', type: 'EXPENSE', category: 'COGS', parentCode: '5200' },
    { code: '5220', name: 'Freight In', nameNepali: 'ढुवानी खर्च', type: 'EXPENSE', category: 'COGS', parentCode: '5200' },

    // Finance / Tax
    { code: '5300', name: 'Finance Expenses', nameNepali: 'वित्त खर्च', type: 'EXPENSE', category: 'Finance Expense', parentCode: '5000' },
    { code: '5310', name: 'Bank Charges', nameNepali: 'बैंक शुल्क', type: 'EXPENSE', category: 'Finance Expense', parentCode: '5300' },
    { code: '5320', name: 'Interest Expense', nameNepali: 'ब्याज खर्च', type: 'EXPENSE', category: 'Finance Expense', parentCode: '5300' },
    { code: '5330', name: 'Income Tax Expense', nameNepali: 'आयकर खर्च', type: 'EXPENSE', category: 'Finance Expense', parentCode: '5300' },
];

export class SeedSystemChartOfAccounts1846000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Pass 1: insert all accounts without parent_id first
        for (const acc of ACCOUNTS) {
            await queryRunner.query(
                `INSERT INTO accounts (code, name, name_nepali, account_type, category, is_system, organization_id)
                 VALUES ($1, $2, $3, $4, $5, true, NULL)
                 ON CONFLICT DO NOTHING`,
                [acc.code, acc.name, acc.nameNepali, acc.type, acc.category],
            );
        }

        // Pass 2: set parent_id links
        for (const acc of ACCOUNTS) {
            if (!acc.parentCode) continue;
            await queryRunner.query(
                `UPDATE accounts
                 SET parent_id = (SELECT id FROM accounts WHERE code = $1 AND organization_id IS NULL LIMIT 1)
                 WHERE code = $2 AND organization_id IS NULL AND (parent_id IS NULL OR parent_id != (SELECT id FROM accounts WHERE code = $1 AND organization_id IS NULL LIMIT 1))`,
                [acc.parentCode, acc.code],
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove only system accounts that were inserted by this migration
        const codes = ACCOUNTS.map(a => `'${a.code}'`).join(', ');
        await queryRunner.query(
            `DELETE FROM accounts WHERE organization_id IS NULL AND is_system = true AND code IN (${codes})`,
        );
    }
}
