import { TransactionModel } from '../models/TransactionModel';
import { sql } from '../config/db';
import { emitToUser } from '../socket';
import { sendPushToUser } from '../services/pushService';


export async function getTransactionByUserId(req: any, res: any) {
    try {
        const transactions = await TransactionModel.findByUserId(req.params.user_id);
        res.status(200).json({ message: "Transactions fetched successfully", transactions });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
}

export async function createTransaction(req: any, res: any) {
    try {
        const { title, amount, category, user_id } = req.body;

        if (!title || !amount || !category || !user_id) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const transaction = await TransactionModel.create(user_id, title, amount, category);

        // ✅ Real-time notification to the same user
        emitToUser(user_id, 'tx:new', {
            title: 'New transaction',
            body: `${title} (${amount})`,
            transaction,
        });

        // ✅ Push notification (works when app is background/closed)
        await sendPushToUser(
            user_id,
            'New transaction',
            `${title} added`,
            { type: 'tx:new', txId: String(transaction.id ?? '') }
        );

        // ✅ Helpful event for re-fetching summary if you use it
        emitToUser(user_id, 'tx:summary:invalidate', { user_id });

        res.status(201).json({ message: "Transaction created successfully", transaction });
    } catch (error) {
        console.log("Error creating transaction:", error);
        res.status(500).json({ message: "Server Error" });
    }
}

export async function deleteTransaction(req: any, res: any) {
    try {
        if (isNaN(Number(req.params.id))) {
            return res.status(400).json({ message: "Invalid transaction ID" });
        }

        // Fetch user_id for socket event
        const row = await sql`SELECT user_id, title, amount FROM transactions WHERE id = ${req.params.id}`;
        const userId = row?.[0]?.user_id;
        const title = row?.[0]?.title;

        await TransactionModel.delete(req.params.id);

        if (userId) {
            emitToUser(userId, 'tx:deleted', {
                title: 'Transaction deleted',
                body: title ? `${title} removed` : 'A transaction was removed',
                transaction_id: req.params.id,
            });

            await sendPushToUser(
                userId,
                'Transaction deleted',
                title ? `${title} removed` : 'A transaction was removed',
                { type: 'tx:deleted', txId: String(req.params.id) }
            );
            emitToUser(userId, 'tx:summary:invalidate', { user_id: userId });
        }

        res.status(200).json({ message: "Transaction deleted successfully" });

    }
    catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
}

export async function getTransactionSummaryByUserId(req: any, res: any) {
    try {
        const balanceResult = await sql`SELECT COALESCE(SUM(amount), 0) AS balance FROM transactions WHERE user_id = ${req.params.user_id}`;
        const incomeResult = await sql`SELECT COALESCE(SUM(amount), 0) AS income FROM transactions WHERE user_id = ${req.params.user_id} AND amount > 0`;
        const expenseResult = await sql`SELECT COALESCE(SUM(amount), 0) AS expense FROM transactions WHERE user_id = ${req.params.user_id} AND amount < 0`;

        res.status(200).json({
            balance: balanceResult[0].balance,
            income: incomeResult[0].income,
            expense: expenseResult[0].expense
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
}
