export type TransactionCategory = 'Food' | 'Transport' | 'Bills' | 'Shopping' | 'Income' | 'Other';

export interface Transaction {
  id: string;
  title: string;
  category: TransactionCategory;
  amount: number;
  currency: string;
  dateISO: string;
}
