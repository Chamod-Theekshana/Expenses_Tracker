import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { TransactionService } from '../services/TransactionService';

export type Tx = {
  id: string;
  title: string;
  category: 'Food' | 'Transport' | 'Bills' | 'Shopping' | 'Income' | 'Other';
  amount: number;
  dateISO: string;
};

type Ctx = {
  items: Tx[];
  addTx: (tx: Omit<Tx, 'id'>, userId: string) => Promise<void>;
  removeTx: (id: string) => Promise<void>;
  fetchTransactions: (userId: string) => Promise<void>;
  clearTransactions: () => void;
  loading: boolean;
};

export const TransactionsContext = createContext<Ctx>({
  items: [],
  addTx: async () => {},
  removeTx: async () => {},
  fetchTransactions: async () => {},
  clearTransactions: () => {},
  loading: false,
});

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const transactions = await TransactionService.getTransactions(userId);
      setItems(transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTx = useCallback(async (tx: Omit<Tx, 'id'>, userId: string) => {
    try {
      await TransactionService.createTransaction(tx.title, tx.amount, tx.category, userId);
      await fetchTransactions(userId);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      throw error;
    }
  }, [fetchTransactions]);

  const removeTx = useCallback(async (id: string) => {
    try {
      await TransactionService.deleteTransaction(id);
      setItems((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  }, []);

  const clearTransactions = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo(
    () => ({ items, addTx, removeTx, fetchTransactions, clearTransactions, loading }),
    [items, addTx, removeTx, fetchTransactions, clearTransactions, loading],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}
