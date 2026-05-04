import React, { createContext, useCallback, useMemo, useState } from 'react';
import { TransactionService } from '../services/TransactionService';

const PAGE_SIZE = 200;

export type TxSplit = {
  id?: string;
  category: string;
  amount: number;
  percentage: number;
};

export type Tx = {
  id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  dateISO: string;
  notes?: string | null;
  tags?: string[];
  receiptUrl?: string | null;
  splits?: TxSplit[];
};

function dedupeById(list: Tx[]): Tx[] {
  const seen = new Set<string>();
  const out: Tx[] = [];
  for (const t of list) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out;
}

type Ctx = {
  items: Tx[];
  txTotal: number | null;
  hasMoreTransactions: boolean;
  loadingMore: boolean;
  addTx: (tx: Omit<Tx, 'id'>, userId: string) => Promise<void>;
  updateTx: (id: string, tx: Omit<Tx, 'id'>, userId: string) => Promise<void>;
  removeTx: (id: string, userId: string) => Promise<void>;
  fetchTransactions: (userId: string) => Promise<void>;
  loadMoreTransactions: (userId: string) => Promise<void>;
  clearTransactions: () => void;
  loading: boolean;
  error: string | null;
};

export const TransactionsContext = createContext<Ctx>({
  items: [],
  txTotal: null,
  hasMoreTransactions: false,
  loadingMore: false,
  addTx: async () => {},
  updateTx: async () => {},
  removeTx: async () => {},
  fetchTransactions: async () => {},
  loadMoreTransactions: async () => {},
  clearTransactions: () => {},
  loading: false,
  error: null,
});

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Tx[]>([]);
  const [txTotal, setTxTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMoreTransactions = txTotal != null && items.length < txTotal;

  const fetchTransactions = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      const { transactions, page } = await TransactionService.getTransactions(userId, {
        limit: PAGE_SIZE,
        offset: 0,
      });
      setItems(dedupeById(transactions));
      setTxTotal(page.total);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load transactions';
      setError(msg);
      console.error('[Transactions] fetchTransactions error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreTransactions = useCallback(async (userId: string) => {
    if (txTotal != null && items.length >= txTotal) return;
    try {
      setLoadingMore(true);
      setError(null);
      const offset = items.length;
      const { transactions, page } = await TransactionService.getTransactions(userId, {
        limit: PAGE_SIZE,
        offset,
      });
      setTxTotal(page.total);
      setItems((prev) => dedupeById([...prev, ...transactions]));
    } catch (err: any) {
      const msg = err?.message || 'Failed to load more';
      setError(msg);
      console.error('[Transactions] loadMoreTransactions error:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [items.length, txTotal]);

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
        tx.splits,
        tx.notes,
        tx.tags,
      );
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
        tx.splits,
        tx.notes,
        tx.tags,
      );
      await fetchTransactions(userId);
    },
    [fetchTransactions],
  );

  const removeTx = useCallback(async (id: string, userId: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    setTxTotal((t) => (t != null ? Math.max(0, t - 1) : t));
    try {
      await TransactionService.deleteTransaction(id);
    } catch (err) {
      console.error('[Transactions] removeTx failed, restoring:', err);
      await fetchTransactions(userId);
      throw err;
    }
  }, [fetchTransactions]);

  const clearTransactions = useCallback(() => {
    setItems([]);
    setTxTotal(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      items,
      txTotal,
      hasMoreTransactions,
      loadingMore,
      addTx,
      updateTx,
      removeTx,
      fetchTransactions,
      loadMoreTransactions,
      clearTransactions,
      loading,
      error,
    }),
    [
      items,
      txTotal,
      hasMoreTransactions,
      loadingMore,
      addTx,
      updateTx,
      removeTx,
      fetchTransactions,
      loadMoreTransactions,
      clearTransactions,
      loading,
      error,
    ],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}
