export type TransactionCategory = 'Food' | 'Transport' | 'Bills' | 'Shopping' | 'Income' | 'Other';

export interface Transaction {
  id: string;
  title: string;
  category: TransactionCategory;
  amount: number;
  dateISO: string;
}
