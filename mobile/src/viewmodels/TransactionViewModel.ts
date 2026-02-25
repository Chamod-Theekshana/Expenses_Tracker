import { useState, useCallback, useMemo } from 'react';
import { Transaction } from '../models/Transaction';
import { TransactionService } from '../services/TransactionService';

export const useTransactionViewModel = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const data = await TransactionService.getTransactions(userId);
      setTransactions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTransaction = useCallback(
    async (tx: Omit<Transaction, 'id'>, userId: string) => {
      await TransactionService.createTransaction(tx.title, tx.amount, tx.category, userId);
      await fetchTransactions(userId);
    },
    [fetchTransactions]
  );

  const deleteTransaction = useCallback(async (id: string) => {
    await TransactionService.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const stats = useMemo(() => {
    const income = transactions.filter((t) => t.amount > 0).reduce((a, b) => a + b.amount, 0);
    const expense = transactions.filter((t) => t.amount < 0).reduce((a, b) => a + b.amount, 0);
    return { income, expense, balance: income + expense };
  }, [transactions]);

  return {
    transactions,
    loading,
    stats,
    fetchTransactions,
    addTransaction,
    deleteTransaction,
  };
};
