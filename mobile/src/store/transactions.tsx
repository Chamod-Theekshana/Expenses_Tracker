import React, { createContext, useCallback, useMemo, useState } from 'react';
import { TransactionService } from '../services/TransactionService';

export type Tx = {
  id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  dateISO: string;
  receiptUrl?: string | null;
};

type Ctx = {
  items: Tx[];
  addTx: (tx: Omit<Tx, 'id'>, userId: string) => Promise<void>;
  updateTx: (id: string, tx: Omit<Tx, 'id'>, userId: string) => Promise<void>;
  removeTx: (id: string, userId: string) => Promise<void>;
  fetchTransactions: (userId: string) => Promise<void>;
  clearTransactions: () => void;
  loading: boolean;
  error: string | null;
};

export const TransactionsContext = createContext<Ctx>({
  items: [],
  addTx: async () => {},
  updateTx: async () => {},
  removeTx: async () => {},
  fetchTransactions: async () => {},
  clearTransactions: () => {},
  loading: false,
  error: null,
});

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      const transactions = await TransactionService.getTransactions(userId);
      setItems(transactions);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load transactions';
      setError(msg);
      console.error('[Transactions] fetchTransactions error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTx = useCallback(
    async (tx: Omit<Tx, 'id'>, userId: string) => {
      await TransactionService.createTransaction(
        tx.title,
        tx.amount,
        tx.category,
        userId,
        tx.dateISO,
        tx.currency,
        tx.receiptUrl,
      );
      // Refresh to get server-assigned ID and confirmed data
      await fetchTransactions(userId);
    },
    [fetchTransactions],
  );

  const updateTx = useCallback(
    async (id: string, tx: Omit<Tx, 'id'>, userId: string) => {
      await TransactionService.updateTransaction(
        id,
        tx.title,
        tx.amount,
        tx.category,
        tx.dateISO,
        tx.currency,
        tx.receiptUrl,
      );
      await fetchTransactions(userId);
    },
    [fetchTransactions],
  );

  const removeTx = useCallback(async (id: string, userId: string) => {
    // Optimistic removal for instant UI feedback
    setItems((prev) => prev.filter((t) => t.id !== id));
    try {
      await TransactionService.deleteTransaction(id);
    } catch (err) {
      // Restore on failure
      console.error('[Transactions] removeTx failed, restoring:', err);
      await fetchTransactions(userId);
      throw err;
    }
  }, [fetchTransactions]);

  const clearTransactions = useCallback(() => {
    setItems([]);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ items, addTx, updateTx, removeTx, fetchTransactions, clearTransactions, loading, error }),
    [items, addTx, updateTx, removeTx, fetchTransactions, clearTransactions, loading, error],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}
