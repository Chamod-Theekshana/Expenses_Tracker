export type TransactionCategory = string;

export type TransactionSplit = {
  id?: string;
  category: string;
  amount: number;
  percentage: number;
};

export interface Transaction {
  id: string;
  title: string;
  category: TransactionCategory;
  amount: number;
  currency: string;
  dateISO: string;
  notes?: string | null;
  tags?: string[];
  receiptUrl?: string | null;
  splits?: TransactionSplit[];
}
