import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Plus, Search, Landmark, ArrowRightLeft, CreditCard, History, Wallet, CheckCircle2, FileText, Eye, TrendingDown, Building2, Trash2, Upload, X } from 'lucide-react';
import { formatNPR } from '@/utils/nepaliDateUtils';
import toast from '@shared/hooks/useToast';
import {
    Card,
    Button,
    Input,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Modal
} from '@shared';

interface BankAccount {
    id: string;
    bankName: string;
    accountNumber: string;
    branch?: string;
    accountHolder: string;
    currentBalance: number;
    currency: string;
}

export default function BankingPage() {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [accountType, setAccountType] = useState<'BANK' | 'CASH'>('BANK');
    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
    const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);

    // Add Account Form State
    const [accountData, setAccountData] = useState({
        bankName: '',
        accountNumber: '',
        branch: '',
        accountHolder: '',
        currentBalance: 0
    });

    // Transfer Form State
    const [transferData, setTransferData] = useState({
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
        transactionDate: new Date().toISOString().split('T')[0],
        reference: '',
        description: ''
    });

    // Withdraw Form State
    const [withdrawData, setWithdrawData] = useState({
        fromBankId: '',
        toCashId: '',
        amount: 0,
        transactionDate: new Date().toISOString().split('T')[0],
        description: 'Cash withdrawal from bank'
    });

    // Import Statement State
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [importBankAccountId, setImportBankAccountId] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    // Loan Form State
    const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
    const [loanData, setLoanData] = useState({
        lenderName: '',
        loanAmount: 0,
        depositToBankAccountId: '',
        loanDate: new Date().toISOString().split('T')[0],
        interestRate: 0,
        description: ''
    });

    const { data: banks, isLoading } = useQuery<BankAccount[]>({
        queryKey: ['accounting-banks'],
        queryFn: async () => {
            const response = await api.get('/accounting/banking');
            return response.data;
        }
    });

    const { data: loans } = useQuery<any[]>({
        queryKey: ['accounting-loans'],
        queryFn: async () => {
            const response = await api.get('/accounting/banking/loans');
            return response.data;
        }
    });

    const createAccount = useMutation({
        mutationFn: async (data: typeof accountData) => {
            await api.post('/accounting/banking/accounts', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-banks'] });
            queryClient.invalidateQueries({ queryKey: ['accounting-coa'] });
            setIsAddDialogOpen(false);
            setAccountData({ bankName: '', accountNumber: '', branch: '', accountHolder: '', currentBalance: 0 });
            toast.success('Bank account added successfully. Opening balance journalized to Capital.');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to add bank account');
        }
    });

    const recordLoan = useMutation({
        mutationFn: async (data: typeof loanData) => {
            await api.post('/accounting/banking/loans', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-banks'] });
            queryClient.invalidateQueries({ queryKey: ['accounting-loans'] });
            setIsLoanDialogOpen(false);
            setLoanData({ lenderName: '', loanAmount: 0, depositToBankAccountId: '', loanDate: new Date().toISOString().split('T')[0], interestRate: 0, description: '' });
            toast.success('Loan recorded. DR Bank, CR Loans Payable posted.');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to record loan');
        }
    });

    const deleteLoan = useMutation({
        mutationFn: async (loanId: string) => {
            await api.delete(`/accounting/banking/loans/${loanId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-loans'] });
            queryClient.invalidateQueries({ queryKey: ['accounting-banks'] });
            toast.success('Loan removed successfully.');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to remove loan');
        }
    });

    const deleteAccount = useMutation({
        mutationFn: async (accountId: string) => {
            await api.delete(`/accounting/banking/accounts/${accountId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-banks'] });
            toast.success('Account removed successfully.');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to remove account');
        }
    });

    const executeTransfer = useMutation({
        mutationFn: async (data: typeof transferData) => {
            await api.post('/accounting/banking/transfer', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-banks'] });
            setIsTransferDialogOpen(false);
            setTransferData({ fromAccountId: '', toAccountId: '', amount: 0, transactionDate: new Date().toISOString().split('T')[0], reference: '', description: '' });
            toast.success('Balance transferred successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Transfer failed');
        }
    });

    const executeWithdraw = useMutation({
        mutationFn: async (data: typeof withdrawData) => {
            await api.post('/accounting/banking/transfer', {
                fromAccountId: data.fromBankId,
                toAccountId: data.toCashId,
                amount: data.amount,
                transactionDate: data.transactionDate,
                description: data.description,
                reference: 'CASH-WITHDRAWAL'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-banks'] });
            setIsWithdrawDialogOpen(false);
            setWithdrawData({ fromBankId: '', toCashId: '', amount: 0, transactionDate: new Date().toISOString().split('T')[0], description: 'Cash withdrawal from bank' });
            toast.success('Cash withdrawn from bank successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Withdrawal failed');
        }
    });

    const importStatement = useMutation({
        mutationFn: async ({ file, bankAccountId }: { file: File; bankAccountId: string }) => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post(`/accounting/banking/statements/import?bankAccountId=${bankAccountId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data;
        },
        onSuccess: (data) => {
            setIsImportDialogOpen(false);
            setImportFile(null);
            setImportBankAccountId('');
            toast.success(`Imported ${data.imported} transaction lines successfully`);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to import bank statement');
        },
    });

    const filteredBanks = banks?.filter(b =>
        b.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.accountNumber.includes(searchTerm)
    );

    if (isLoading) {
        return <div className="p-8 animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
        </div>;
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                        <Landmark className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                            Banking & Cash
                        </h1>
                        <p className="opacity-70" style={{ color: theme.colors.textSecondary }}>
                            Manage your bank accounts and monitor liquidity
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Button
                        onClick={() => setIsLoanDialogOpen(true)}
                        variant="ghost"
                        className="px-6 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold hover:scale-[1.05] transition-transform active:scale-95 shadow-sm"
                    >
                        <TrendingDown className="h-5 w-5 mr-2" />
                        Record Loan
                    </Button>
                    <Button
                        onClick={() => setIsImportDialogOpen(true)}
                        variant="ghost"
                        className="px-6 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold hover:scale-[1.05] transition-transform active:scale-95 shadow-sm"
                    >
                        <Upload className="h-5 w-5 mr-2" />
                        Import Statement
                    </Button>
                    <Button
                        onClick={() => setIsTransferDialogOpen(true)}
                        variant="ghost"
                        className="px-6 h-12 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-bold hover:scale-[1.05] transition-transform active:scale-95 shadow-sm"
                    >
                        <ArrowRightLeft className="h-5 w-5 mr-2" />
                        Transfer
                    </Button>
                    <Button
                        onClick={() => setIsWithdrawDialogOpen(true)}
                        variant="ghost"
                        className="px-6 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold hover:scale-[1.05] transition-transform active:scale-95 shadow-sm"
                    >
                        <Wallet className="h-5 w-5 mr-2" />
                        Withdraw Cash
                    </Button>
                    <Button
                        onClick={() => setIsAddDialogOpen(true)}
                        variant="primary"
                        className="shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform px-6 h-12 rounded-xl"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Add Account
                    </Button>
                </div>
            </div>

            <Card className="p-5 border-none shadow-sm backdrop-blur-sm" style={{ backgroundColor: `${theme.colors.surface}90`, borderRadius: '16px' }}>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full relative group">
                        <Search
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors group-focus-within:text-primary"
                            style={{ color: theme.colors.textSecondary }}
                        />
                        <Input
                            type="text"
                            placeholder="Search by bank name or account number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-12 bg-transparent border-none focus:ring-2 focus:ring-primary/20 text-lg transition-all"
                            style={{ borderRadius: '12px' }}
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="px-6 py-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3">
                            <Wallet className="h-5 w-5 text-primary" style={{ color: theme.colors.primary }} />
                            <div>
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-tight">Total Liquidity</p>
                                <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                                    {formatNPR(banks?.reduce((acc, b) => acc + Number(b.currentBalance), 0) || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="overflow-hidden border-none shadow-sm" style={{ backgroundColor: theme.colors.surface, borderRadius: '16px' }}>
                <Table>
                    <TableHeader>
                        <TableRow style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Bank Name</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Account Holder</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Account Number</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Balance</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBanks?.map((bank) => (
                            <TableRow key={bank.id} className="hover-theme transition-colors group" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bank.accountNumber.startsWith('1110') ? 'rgba(16, 185, 129, 0.1)' : `${theme.colors.primary}15` }}>
                                            {bank.accountNumber.startsWith('1110') ? (
                                                <Wallet className="h-5 w-5 text-emerald-500" />
                                            ) : (
                                                <Landmark className="h-5 w-5" style={{ color: theme.colors.primary }} />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{bank.bankName}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                {bank.accountNumber.startsWith('1110') ? 'Cash Account' : (bank.branch || 'Main Branch')}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {bank.accountHolder}
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-mono text-slate-500 font-bold tracking-widest">
                                        •••• {bank.accountNumber.slice(-4)}
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                                        {formatNPR(bank.currentBalance)}
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                                    <div className="flex justify-center gap-2">
                                        <button className="p-2 rounded-xl hover-theme-strong text-slate-500 transition-colors">
                                            <Eye size={16} />
                                        </button>
                                        <button className="p-2 rounded-xl hover-theme-strong text-slate-500 transition-colors">
                                            <History size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Remove account "${bank.bankName}"? This will delete the account and its opening balance if no other transactions exist.`)) {
                                                    deleteAccount.mutate(bank.id);
                                                }
                                            }}
                                            disabled={deleteAccount.isPending}
                                            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                                            title="Remove account"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {filteredBanks?.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Landmark size={24} />
                        </div>
                        <p className="font-extrabold">No bank accounts found</p>
                        <p className="text-sm">Add your business bank accounts to start tracking cash flow.</p>
                    </div>
                )}
            </Card>

            {/* Loans Section */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: `rgba(245, 158, 11, 0.1)` }}>
                        <Building2 className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold" style={{ color: theme.colors.text }}>Loans & Borrowings</h2>
                        <p className="text-xs opacity-60" style={{ color: theme.colors.textSecondary }}>Outstanding loan liabilities</p>
                    </div>
                </div>
            </div>
            <Card className="overflow-hidden border-none shadow-sm" style={{ backgroundColor: theme.colors.surface, borderRadius: '16px' }}>
                <Table>
                    <TableHeader>
                        <TableRow style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Lender / Account</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Code</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Outstanding Balance</TableHead>
                            <TableHead className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loans?.map((loan) => (
                            <TableRow key={loan.id} className="hover-theme transition-colors" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <TableCell className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                                            <Building2 className="h-5 w-5 text-amber-500" />
                                        </div>
                                        <div className="font-extrabold" style={{ color: theme.colors.text }}>{loan.name}</div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 font-mono text-sm text-slate-400 font-bold">{loan.code}</TableCell>
                                <TableCell className="px-6 py-4 text-right">
                                    <span className="text-lg font-extrabold text-amber-600">{formatNPR(loan.outstandingBalance)}</span>
                                </TableCell>
                                <TableCell className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Remove loan "${loan.name}"? This will delete the journal entry and the loan account.`)) {
                                                deleteLoan.mutate(loan.id);
                                            }
                                        }}
                                        disabled={deleteLoan.isPending}
                                        className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                                        title="Remove loan"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {(!loans || loans.length === 0) && (
                    <div className="p-10 text-center text-slate-400">
                        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Building2 size={22} className="text-amber-400" />
                        </div>
                        <p className="font-extrabold">No loans recorded</p>
                        <p className="text-sm">Click "Record Loan" to add a loan received from a bank or lender.</p>
                    </div>
                )}
            </Card>

            {/* Add Account Modal */}
            <Modal
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                title="Add Bank or Cash Account"
                size="md"
                theme={{ colors: theme.colors }}
                footer={
                    <div className="flex gap-3 w-full">
                        <Button
                            onClick={() => setIsAddDialogOpen(false)}
                            variant="ghost"
                            className="flex-1 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => createAccount.mutate({ ...accountData, type: accountType })}
                            disabled={createAccount.isPending || !accountData.bankName || (accountType === 'BANK' && !accountData.accountNumber)}
                            variant="primary"
                            className="flex-1 px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform"
                            isLoading={createAccount.isPending}
                        >
                            {createAccount.isPending ? 'Adding...' : 'Add Account'}
                        </Button>
                    </div>
                }
            >
                <div className="p-1 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Account Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setAccountType('BANK')}
                                className={`h-12 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${accountType === 'BANK' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-400'}`}
                            >
                                <Landmark size={18} />
                                Bank Account
                            </button>
                            <button
                                onClick={() => setAccountType('CASH')}
                                className={`h-12 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${accountType === 'CASH' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-400'}`}
                            >
                                <Wallet size={18} />
                                Cash in Hand
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                            {accountType === 'BANK' ? 'Bank Name' : 'Account Name'}
                        </label>
                        <Input
                            type="text"
                            className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                            placeholder={accountType === 'BANK' ? "e.g. Nabil Bank" : "e.g. Main Cash Vault"}
                            value={accountData.bankName}
                            onChange={(e) => setAccountData({ ...accountData, bankName: e.target.value })}
                        />
                    </div>

                    {accountType === 'BANK' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Account Number</label>
                                <Input
                                    type="text"
                                    className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                                    placeholder="Account Number"
                                    value={accountData.accountNumber}
                                    onChange={(e) => setAccountData({ ...accountData, accountNumber: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Branch</label>
                                <Input
                                    type="text"
                                    className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                                    placeholder="Branch Name"
                                    value={accountData.branch}
                                    onChange={(e) => setAccountData({ ...accountData, branch: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                            {accountType === 'BANK' ? 'Account Holder Name' : 'Responsible Person'}
                        </label>
                        <Input
                            type="text"
                            className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                            placeholder={accountType === 'BANK' ? "Name as in Bank Records" : "Person in Charge"}
                            value={accountData.accountHolder}
                            onChange={(e) => setAccountData({ ...accountData, accountHolder: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Initial Balance (NPR)</label>
                        <Input
                            type="number"
                            className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                            placeholder="0.00"
                            value={accountData.currentBalance || ''}
                            onChange={(e) => setAccountData({ ...accountData, currentBalance: Number(e.target.value) })}
                        />
                    </div>
                </div>
            </Modal>

            {/* Transfer Modal */}
            <Modal
                isOpen={isTransferDialogOpen}
                onClose={() => setIsTransferDialogOpen(false)}
                title="Fund Transfer"
                size="md"
                theme={{ colors: theme.colors }}
                footer={
                    <div className="flex gap-3 w-full">
                        <Button
                            onClick={() => setIsTransferDialogOpen(false)}
                            variant="ghost"
                            className="flex-1 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => executeTransfer.mutate(transferData)}
                            disabled={executeTransfer.isPending || !transferData.fromAccountId || !transferData.toAccountId || transferData.amount <= 0}
                            variant="primary"
                            className="flex-1 px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 scale-105 active:scale-95 transition-transform"
                            isLoading={executeTransfer.isPending}
                        >
                            {executeTransfer.isPending ? 'Processing...' : 'Execute Transfer'}
                        </Button>
                    </div>
                }
            >
                <div className="p-1 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">From Account</label>
                            <select
                                className="w-full px-4 py-3 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-all appearance-none"
                                value={transferData.fromAccountId}
                                onChange={(e) => setTransferData({ ...transferData, fromAccountId: e.target.value })}
                            >
                                <option value="">Select Account</option>
                                {banks?.map(b => (
                                    <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber.slice(-4)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">To Account</label>
                            <select
                                className="w-full px-4 py-3 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-all appearance-none"
                                value={transferData.toAccountId}
                                onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                            >
                                <option value="">Select Account</option>
                                {banks?.map(b => (
                                    <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber.slice(-4)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Amount (NPR)</label>
                            <Input
                                type="number"
                                className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                                placeholder="0.00"
                                value={transferData.amount || ''}
                                onChange={(e) => setTransferData({ ...transferData, amount: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Date</label>
                            <Input
                                type="date"
                                className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                                value={transferData.transactionDate}
                                onChange={(e) => setTransferData({ ...transferData, transactionDate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Reference / Cheque No.</label>
                        <Input
                            type="text"
                            className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                            placeholder="Enter reference number"
                            value={transferData.reference}
                            onChange={(e) => setTransferData({ ...transferData, reference: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Description</label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-bold resize-none"
                            rows={2}
                            placeholder="Reason for transfer..."
                            value={transferData.description}
                            onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>
            {/* Withdraw Cash Modal */}
            <Modal
                isOpen={isWithdrawDialogOpen}
                onClose={() => setIsWithdrawDialogOpen(false)}
                title="Withdraw Cash from Bank"
                size="md"
                theme={{ colors: theme.colors }}
                footer={
                    <div className="flex gap-3 w-full">
                        <Button
                            onClick={() => setIsWithdrawDialogOpen(false)}
                            variant="ghost"
                            className="flex-1 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => executeWithdraw.mutate(withdrawData)}
                            disabled={executeWithdraw.isPending || !withdrawData.fromBankId || !withdrawData.toCashId || withdrawData.amount <= 0}
                            variant="primary"
                            className="flex-1 px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white scale-105 active:scale-95 transition-transform"
                            isLoading={executeWithdraw.isPending}
                        >
                            {executeWithdraw.isPending ? 'Processing...' : 'Withdraw Cash'}
                        </Button>
                    </div>
                }
            >
                <div className="p-1 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl flex items-start gap-4 mb-2">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Bank to Cash Withdrawal</p>
                            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/60 mt-0.5">Transfer funds from your bank account to physical cash vault.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">From Bank Account</label>
                            <select
                                className="w-full px-4 py-3 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-all appearance-none"
                                value={withdrawData.fromBankId}
                                onChange={(e) => setWithdrawData({ ...withdrawData, fromBankId: e.target.value })}
                            >
                                <option value="">Select Bank</option>
                                {banks?.filter(b => b.accountNumber.startsWith('1120')).map(b => (
                                    <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber.slice(-4)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">To Cash Account</label>
                            <select
                                className="w-full px-4 py-3 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-all appearance-none"
                                value={withdrawData.toCashId}
                                onChange={(e) => setWithdrawData({ ...withdrawData, toCashId: e.target.value })}
                            >
                                <option value="">Select Cash Account</option>
                                {banks?.filter(b => b.accountNumber.startsWith('1110')).map(b => (
                                    <option key={b.id} value={b.id}>{b.bankName}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Amount (NPR)</label>
                            <Input
                                type="number"
                                className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                                placeholder="0.00"
                                value={withdrawData.amount || ''}
                                onChange={(e) => setWithdrawData({ ...withdrawData, amount: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Date</label>
                            <Input
                                type="date"
                                className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                                value={withdrawData.transactionDate}
                                onChange={(e) => setWithdrawData({ ...withdrawData, transactionDate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Description</label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white font-bold resize-none"
                            rows={2}
                            placeholder="Reason for withdrawal..."
                            value={withdrawData.description}
                            onChange={(e) => setWithdrawData({ ...withdrawData, description: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>

            {/* Record Loan Modal */}
            <Modal
                isOpen={isLoanDialogOpen}
                onClose={() => setIsLoanDialogOpen(false)}
                title="Record a Loan"
                size="md"
                theme={{ colors: theme.colors }}
                footer={
                    <div className="flex gap-3 w-full">
                        <Button
                            onClick={() => setIsLoanDialogOpen(false)}
                            variant="ghost"
                            className="flex-1 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => recordLoan.mutate(loanData)}
                            disabled={recordLoan.isPending || !loanData.lenderName || !loanData.depositToBankAccountId || loanData.loanAmount <= 0}
                            variant="primary"
                            className="flex-1 px-6 py-3 rounded-xl font-bold shadow-lg shadow-amber-500/20 scale-105 active:scale-95 transition-transform bg-amber-500 hover:bg-amber-600"
                            isLoading={recordLoan.isPending}
                        >
                            {recordLoan.isPending ? 'Recording...' : 'Record Loan'}
                        </Button>
                    </div>
                }
            >
                <div className="p-1 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
                        <strong>Accounting Effect:</strong> DR Bank (asset ↑) → CR Loans Payable (liability ↑)
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Lender Name</label>
                        <Input
                            type="text"
                            className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                            placeholder="e.g. NMB Bank, Nepal SBI Bank"
                            value={loanData.lenderName}
                            onChange={(e) => setLoanData({ ...loanData, lenderName: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Loan Amount (NPR)</label>
                            <Input
                                type="number"
                                className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                                placeholder="0.00"
                                value={loanData.loanAmount || ''}
                                onChange={(e) => setLoanData({ ...loanData, loanAmount: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Interest Rate (% p.a.)</label>
                            <Input
                                type="number"
                                className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                                placeholder="0.00"
                                value={loanData.interestRate || ''}
                                onChange={(e) => setLoanData({ ...loanData, interestRate: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Deposit to Bank Account</label>
                        <select
                            className="w-full px-4 py-3 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-amber-400/20 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-all appearance-none"
                            value={loanData.depositToBankAccountId}
                            onChange={(e) => setLoanData({ ...loanData, depositToBankAccountId: e.target.value })}
                        >
                            <option value="">Select account to receive funds</option>
                            {banks?.map(b => (
                                <option key={b.id} value={b.id}>{b.bankName} - •••• {b.accountNumber.slice(-4)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Loan Date</label>
                        <Input
                            type="date"
                            className="h-12 bg-slate-100 dark:bg-slate-900 border-none font-bold"
                            value={loanData.loanDate}
                            onChange={(e) => setLoanData({ ...loanData, loanDate: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Description (optional)</label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border-none focus:ring-2 focus:ring-amber-400/20 text-slate-900 dark:text-white font-bold resize-none"
                            rows={2}
                            placeholder="Purpose of loan..."
                            value={loanData.description}
                            onChange={(e) => setLoanData({ ...loanData, description: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>

            {/* Import Statement Modal */}
            {isImportDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" style={{ backgroundColor: theme.colors.surface }}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg" style={{ color: theme.colors.text }}>Import Bank Statement</h3>
                            <button onClick={() => { setIsImportDialogOpen(false); setImportFile(null); setImportBankAccountId(''); }}>
                                <X className="h-5 w-5" style={{ color: theme.colors.textSecondary }} />
                            </button>
                        </div>
                        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                            <strong>CSV Format:</strong> Date, Description, Debit (Withdrawal), Credit (Deposit), Balance
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.colors.textSecondary }}>
                                Select Bank Account
                            </label>
                            <select
                                className="w-full px-3 py-2.5 rounded-xl border text-sm font-medium"
                                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }}
                                value={importBankAccountId}
                                onChange={e => setImportBankAccountId(e.target.value)}
                            >
                                <option value="">— Select account —</option>
                                {banks?.map(b => (
                                    <option key={b.id} value={b.id}>{b.bankName} ({b.accountNumber})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.colors.textSecondary }}>
                                CSV File
                            </label>
                            <div
                                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer"
                                style={{ borderColor: theme.colors.border }}
                                onClick={() => importFileRef.current?.click()}
                            >
                                <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: theme.colors.textSecondary }} />
                                {importFile
                                    ? <p className="text-sm font-medium" style={{ color: theme.colors.text }}>{importFile.name}</p>
                                    : <p className="text-sm" style={{ color: theme.colors.textSecondary }}>Click to choose a .csv file</p>
                                }
                                <input
                                    ref={importFileRef}
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={e => setImportFile(e.target.files?.[0] ?? null)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setIsImportDialogOpen(false); setImportFile(null); setImportBankAccountId(''); }}
                                className="flex-1 px-4 py-2.5 rounded-xl border font-bold text-sm"
                                style={{ borderColor: theme.colors.border, color: theme.colors.text }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => importFile && importBankAccountId && importStatement.mutate({ file: importFile, bankAccountId: importBankAccountId })}
                                disabled={!importFile || !importBankAccountId || importStatement.isPending}
                                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60"
                                style={{ backgroundColor: theme.colors.primary }}
                            >
                                {importStatement.isPending ? 'Importing...' : 'Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

