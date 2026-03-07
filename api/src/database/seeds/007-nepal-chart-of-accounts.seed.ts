import { DataSource } from 'typeorm';

export const NEPAL_CHART_OF_ACCOUNTS = [
    // ASSETS
    { code: '1000', name: 'Assets', nameNepali: 'सम्पत्ति', type: 'ASSET', category: 'Main', parent: null, isSystem: true },

    // Current Assets
    { code: '1100', name: 'Current Assets', nameNepali: 'चालु सम्पत्ति', type: 'ASSET', category: 'Current Asset', parent: '1000', isSystem: true },
    { code: '1110', name: 'Cash', nameNepali: 'नगद', type: 'ASSET', category: 'Current Asset', parent: '1100', isSystem: true },
    { code: '1120', name: 'Bank Accounts', nameNepali: 'बैंक खाता', type: 'ASSET', category: 'Current Asset', parent: '1100', isSystem: true },
    { code: '1130', name: 'Accounts Receivable', nameNepali: 'पाउनु पर्ने रकम', type: 'ASSET', category: 'Current Asset', parent: '1100', isSystem: true },
    { code: '1140', name: 'Inventory', nameNepali: 'स्टक', type: 'ASSET', category: 'Current Asset', parent: '1100', isSystem: true },
    { code: '1150', name: 'TDS Receivable', nameNepali: 'पाउनु पर्ने टि.डि.एस.', type: 'ASSET', category: 'Current Asset', parent: '1100', isSystem: true },

    // Fixed Assets
    { code: '1200', name: 'Fixed Assets', nameNepali: 'स्थिर सम्पत्ति', type: 'ASSET', category: 'Fixed Asset', parent: '1000', isSystem: true },
    { code: '1210', name: 'Land', nameNepali: 'जग्गा', type: 'ASSET', category: 'Fixed Asset', parent: '1200', isSystem: true },
    { code: '1220', name: 'Building', nameNepali: 'भवन', type: 'ASSET', category: 'Fixed Asset', parent: '1200', isSystem: true },
    { code: '1230', name: 'Furniture & Fixtures', nameNepali: 'फर्निचर', type: 'ASSET', category: 'Fixed Asset', parent: '1200', isSystem: true },
    { code: '1240', name: 'Vehicles', nameNepali: 'गाडी', type: 'ASSET', category: 'Fixed Asset', parent: '1200', isSystem: true },
    { code: '1250', name: 'Computer & Equipment', nameNepali: 'कम्प्युटर', type: 'ASSET', category: 'Fixed Asset', parent: '1200', isSystem: true },

    // LIABILITIES
    { code: '2000', name: 'Liabilities', nameNepali: 'दायित्व', type: 'LIABILITY', category: 'Main', parent: null, isSystem: true },

    // Current Liabilities
    { code: '2100', name: 'Current Liabilities', nameNepali: 'चालु दायित्व', type: 'LIABILITY', category: 'Current Liability', parent: '2000', isSystem: true },
    { code: '2110', name: 'Accounts Payable', nameNepali: 'तिर्नु पर्ने रकम', type: 'LIABILITY', category: 'Current Liability', parent: '2100', isSystem: true },
    { code: '2120', name: 'VAT Payable', nameNepali: 'तिर्नु पर्ने भ्याट', type: 'LIABILITY', category: 'Current Liability', parent: '2100', isSystem: true },
    { code: '2130', name: 'TDS Payable', nameNepali: 'तिर्नु पर्ने टि.डि.एस.', type: 'LIABILITY', category: 'Current Liability', parent: '2100', isSystem: true },
    { code: '2140', name: 'SSF Payable', nameNepali: 'तिर्नु पर्ने सामाजिक सुरक्षा कोष', type: 'LIABILITY', category: 'Current Liability', parent: '2100', isSystem: true },
    { code: '2150', name: 'Salary Payable', nameNepali: 'तिर्नु पर्ने तलब', type: 'LIABILITY', category: 'Current Liability', parent: '2100', isSystem: true },

    // Long-term Liabilities
    { code: '2200', name: 'Long-term Liabilities', nameNepali: 'दीर्घकालीन दायित्व', type: 'LIABILITY', category: 'Long-term Liability', parent: '2200', isSystem: true },
    { code: '2210', name: 'Bank Loan', nameNepali: 'बैंक ऋण', type: 'LIABILITY', category: 'Long-term Liability', parent: '2200', isSystem: true },

    // EQUITY
    { code: '3000', name: 'Equity', nameNepali: 'पूँजी', type: 'EQUITY', category: 'Main', parent: null, isSystem: true },
    { code: '3100', name: 'Owner Equity', nameNepali: 'मालिक पूँजी', type: 'EQUITY', category: 'Equity', parent: '3000', isSystem: true },
    { code: '3200', name: 'Retained Earnings', nameNepali: 'संचित नाफा', type: 'EQUITY', category: 'Equity', parent: '3000', isSystem: true },

    // REVENUE
    { code: '4000', name: 'Revenue', nameNepali: 'आम्दानी', type: 'REVENUE', category: 'Main', parent: null, isSystem: true },
    { code: '4100', name: 'Sales Revenue', nameNepali: 'बिक्री आम्दानी', type: 'REVENUE', category: 'Operating Revenue', parent: '4000', isSystem: true },
    { code: '4200', name: 'Service Revenue', nameNepali: 'सेवा आम्दानी', type: 'REVENUE', category: 'Operating Revenue', parent: '4000', isSystem: true },
    { code: '4300', name: 'Other Income', nameNepali: 'अन्य आम्दानी', type: 'REVENUE', category: 'Other Revenue', parent: '4000', isSystem: true },

    // EXPENSES
    { code: '5000', name: 'Expenses', nameNepali: 'खर्च', type: 'EXPENSE', category: 'Main', parent: null, isSystem: true },

    // Operating Expenses
    { code: '5100', name: 'Operating Expenses', nameNepali: 'सञ्चालन खर्च', type: 'EXPENSE', category: 'Operating Expense', parent: '5000', isSystem: true },
    { code: '5110', name: 'Salary & Wages', nameNepali: 'तलब', type: 'EXPENSE', category: 'Operating Expense', parent: '5100', isSystem: true },
    { code: '5120', name: 'Rent Expense', nameNepali: 'भाडा खर्च', type: 'EXPENSE', category: 'Operating Expense', parent: '5100', isSystem: true },
    { code: '5130', name: 'Utilities', nameNepali: 'बिजुली पानी', type: 'EXPENSE', category: 'Operating Expense', parent: '5100', isSystem: true },
    { code: '5140', name: 'Office Supplies', nameNepali: 'कार्यालय सामग्री', type: 'EXPENSE', category: 'Operating Expense', parent: '5100', isSystem: true },
    { code: '5150', name: 'Phone & Internet', nameNepali: 'फोन र इन्टरनेट', type: 'EXPENSE', category: 'Operating Expense', parent: '5100', isSystem: true },

    // Cost of Goods Sold
    { code: '5200', name: 'Cost of Goods Sold', nameNepali: 'बिक्री लागत', type: 'EXPENSE', category: 'COGS', parent: '5000', isSystem: true },
    { code: '5210', name: 'Purchase of Goods', nameNepali: 'सामान खरिद', type: 'EXPENSE', category: 'COGS', parent: '5200', isSystem: true },
    { code: '5220', name: 'Freight In', nameNepali: 'ढुवानी खर्च', type: 'EXPENSE', category: 'COGS', parent: '5200', isSystem: true },
];

export async function seedNepalChartOfAccounts(dataSource: DataSource): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        for (const account of NEPAL_CHART_OF_ACCOUNTS) {
            // Find parent if exists
            let parentId = null;
            if (account.parent) {
                const parent = await queryRunner.query(
                    `SELECT id FROM accounts WHERE code = $1 AND organization_id IS NULL`,
                    [account.parent]
                );
                if (parent && parent.length > 0) {
                    parentId = parent[0].id;
                }
            }

            // Check if account exists
            const existingAccount = await queryRunner.query(
                `SELECT id FROM accounts WHERE code = $1 AND organization_id IS NULL`,
                [account.code]
            );

            if (existingAccount && existingAccount.length > 0) {
                // Update
                await queryRunner.query(
                    `UPDATE accounts SET 
             name = $1, 
             name_nepali = $2, 
             account_type = $3, 
             category = $4, 
             parent_id = $5, 
             is_system = $6
           WHERE id = $7`,
                    [
                        account.name,
                        account.nameNepali,
                        account.type,
                        account.category,
                        parentId,
                        account.isSystem,
                        existingAccount[0].id
                    ]
                );
            } else {
                // Insert
                await queryRunner.query(
                    `INSERT INTO accounts (
             code, name, name_nepali, account_type, category, parent_id, is_system, organization_id
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)`,
                    [
                        account.code,
                        account.name,
                        account.nameNepali,
                        account.type,
                        account.category,
                        parentId,
                        account.isSystem
                    ]
                );
                console.log(`✓ Seeded account: ${account.code} - ${account.name}`);
            }
        }

        await queryRunner.commitTransaction();
    } catch (err) {
        console.error('Error seeding accounts:', err);
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }
}
