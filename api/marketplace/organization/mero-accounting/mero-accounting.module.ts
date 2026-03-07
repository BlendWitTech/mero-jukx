import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '@src/database/entities/accounts.entity';
import { JournalEntry, JournalEntryLine } from '@src/database/entities/journal_entries.entity';
import { Vendor, PurchaseInvoice } from '@src/database/entities/vendors_purchase_invoices.entity';
import { Customer, SalesInvoice } from '@src/database/entities/customers_sales_invoices.entity';
import { FixedAsset, DepreciationLog, AssetMaintenanceLog } from '@src/database/entities/fixed_assets.entity';
import { BankAccount, FiscalYear } from '@src/database/entities/banking_fiscal.entity';
import { BankStatement, BankStatementLine } from '@src/database/entities/bank_statements.entity';
import { Cheque } from '@src/database/entities/cheques.entity';
import { RecurringTransaction } from '@src/database/entities/recurring_transactions.entity';
import { PaymentAllocation } from '@src/database/entities/payment_allocations.entity';
import { Budget, BudgetLine } from '@src/database/entities/budgets.entity';
import { CostCenter } from '@src/database/entities/cost_centers.entity';
import { ExchangeRate } from '@src/database/entities/exchange_rates.entity';
import { Organization, UserAppAccess, App } from '@src/database/entities';
import { AccountsService } from './services/accounts.service';
import { JournalEntriesService } from './services/journal-entries.service';
import { ReportsService } from './services/reports.service';
import { BsDateService } from './services/bs-date.service';
import { BudgetsService } from './services/budgets.service';
import { CostCentersService } from './services/cost-centers.service';
import { ExchangeRatesService } from './services/exchange-rates.service';
import { VendorsService } from './services/vendors.service';
import { PurchaseInvoicesService } from './services/purchase-invoices.service';
import { CustomersService } from './services/customers.service';
import { SalesInvoicesService } from './services/sales-invoices.service';
import { FixedAssetsService } from './services/fixed-assets.service';
import { BankingService } from './services/banking.service';
import { TaxService } from './services/tax.service';
import { AuditService } from './services/audit.service';
import { RecurringTransactionsService } from './services/recurring-transactions.service';
import { BankReconciliationService } from './services/bank-reconciliation.service';
import { ChequesService } from './services/cheques.service';
import { PaymentAllocationService } from './services/payment-allocation.service';
import { TaxReportsService } from './services/tax-reports.service';
import { AccountsController } from './controllers/accounts.controller';
import { JournalEntriesController } from './controllers/journal-entries.controller';
import { ReportsController } from './controllers/reports.controller';
import { VendorsController } from './controllers/vendors.controller';
import { PurchaseInvoicesController } from './controllers/purchase-invoices.controller';
import { CustomersController } from './controllers/customers.controller';
import { SalesInvoicesController } from './controllers/sales-invoices.controller';
import { FixedAssetsController } from './controllers/fixed-assets.controller';
import { BankingController } from './controllers/banking.controller';
import { TaxController } from './controllers/tax.controller';
import { AuditController } from './controllers/audit.controller';
import { RecurringTransactionsController } from './controllers/recurring-transactions.controller';
import { BankReconciliationController } from './controllers/bank-reconciliation.controller';
import { ChequesController } from './controllers/cheques.controller';
import { PaymentAllocationController } from './controllers/payment-allocation.controller';
import { TaxReportsController } from './controllers/tax-reports.controller';
import { BudgetsController } from './controllers/budgets.controller';
import { CostCentersController } from './controllers/cost-centers.controller';
import { ExchangeRatesController } from './controllers/exchange-rates.controller';
import { YearEndClosingService } from './services/year-end-closing.service';
import { YearEndClosingController } from './controllers/year-end-closing.controller';
import { AuditLog } from '@src/database/entities/audit_logs.entity';
import { ExciseDutyRate } from '@src/database/entities/excise_duty_rates.entity';
import { FinancialNote } from '@src/database/entities/financial_notes.entity';
import { ExciseDutyService } from './services/excise-duty.service';
import { FinancialNotesService } from './services/financial-notes.service';
import { ExciseDutyController } from './controllers/excise-duty.controller';
import { FinancialNotesController } from './controllers/financial-notes.controller';
import { CommonModule } from '@src/common/common.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Account,
            JournalEntry,
            JournalEntryLine,
            Vendor,
            PurchaseInvoice,
            Customer,
            SalesInvoice,
            FixedAsset,
            DepreciationLog,
            AssetMaintenanceLog,
            BankAccount,
            FiscalYear,
            AuditLog,
            RecurringTransaction,
            PaymentAllocation,
            BankStatement,
            BankStatementLine,
            Cheque,
            Budget,
            BudgetLine,
            CostCenter,
            ExchangeRate,
            Organization,
            ExciseDutyRate,
            FinancialNote,
            UserAppAccess,
            App,
        ]),
        CommonModule,
    ],
    controllers: [
        AccountsController,
        JournalEntriesController,
        ReportsController,
        VendorsController,
        PurchaseInvoicesController,
        CustomersController,
        SalesInvoicesController,
        FixedAssetsController,
        BankingController,
        TaxController,
        AuditController,
        RecurringTransactionsController,
        YearEndClosingController,
        PaymentAllocationController,
        BankReconciliationController,
        ChequesController,
        TaxReportsController,
        BudgetsController,
        CostCentersController,
        ExchangeRatesController,
        ExciseDutyController,
        FinancialNotesController,
    ],
    providers: [
        AccountsService,
        JournalEntriesService,
        ReportsService,
        VendorsService,
        PurchaseInvoicesService,
        CustomersService,
        SalesInvoicesService,
        FixedAssetsService,
        BankingService,
        TaxService,
        AuditService,
        RecurringTransactionsService,
        YearEndClosingService,
        PaymentAllocationService,
        BankReconciliationService,
        ChequesService,
        TaxReportsService,
        BsDateService,
        BudgetsService,
        CostCentersService,
        ExchangeRatesService,
        ExciseDutyService,
        FinancialNotesService,
    ],
    exports: [
        AccountsService,
        JournalEntriesService,
        ReportsService,
        VendorsService,
        PurchaseInvoicesService,
        CustomersService,
        SalesInvoicesService,
        FixedAssetsService,
        BankingService,
        TaxService,
        AuditService,
        RecurringTransactionsService,
        YearEndClosingService,
        PaymentAllocationService,
        BankReconciliationService,
        ChequesService,
        TaxReportsService,
        BsDateService,
        BudgetsService,
        CostCentersService,
        ExchangeRatesService,
        ExciseDutyService,
        FinancialNotesService,
        TypeOrmModule,
    ],
})
export class MeroAccountingModule { }
