import { RecurringModel } from '../models/RecurringModel';
import { TransactionModel } from '../models/TransactionModel';
import { sendPushToUser } from './pushService';
import { emitToUser } from '../socket';

/**
 * Process all due recurring transactions:
 * 1. Find recurrences where next_run <= today and is_active = true
 * 2. Create an actual transaction for each
 * 3. Advance next_run by the frequency interval
 * 4. Notify the user via push + socket
 */
async function processRecurringTransactions() {
  try {
    const dueItems = await RecurringModel.getDueRecurrences();

    if (dueItems.length === 0) {
      console.log('[Recurring] No due recurrences found.');
      return;
    }

    console.log(`[Recurring] Processing ${dueItems.length} due recurrence(s)...`);

    for (const item of dueItems) {
      try {
        // Create actual transaction
        const tx = await TransactionModel.create(
          item.user_id,
          item.title,
          Number(item.amount),
          item.category,
          new Date().toISOString().slice(0, 10) // today's date
        );

        // Advance next_run
        await RecurringModel.advanceNextRun(item.id, item.frequency);

        // Notify user via socket
        emitToUser(item.user_id, 'tx:new', {
          title: 'Recurring transaction created',
          body: `${item.title} (${item.amount})`,
          transaction: tx,
        });
        emitToUser(item.user_id, 'tx:summary:invalidate', { user_id: item.user_id });

        // Send push notification
        await sendPushToUser(
          item.user_id,
          `🔄 Recurring: ${item.title}`,
          `${Number(item.amount) < 0 ? 'Expense' : 'Income'} of ₨.${Math.abs(Number(item.amount)).toFixed(2)} for ${item.category} has been recorded.`,
          { type: 'recurring_tx', transactionId: String(tx.id) }
        );

        console.log(`[Recurring] Created tx for recurrence #${item.id} (${item.title}) user=${item.user_id}`);
      } catch (err) {
        console.error(`[Recurring] Error processing recurrence #${item.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[Recurring] Error fetching due recurrences:', err);
  }
}

/**
 * Calculate ms until the next occurrence of a specific time (HH:MM).
 */
function msUntilNextDailyTime(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);

  // If 9:00 AM already passed today, schedule for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Schedule recurring processing at a specific daily time, then repeat every 24h.
 */
function scheduleDailyAt(hour: number, minute: number) {
  const delay = msUntilNextDailyTime(hour, minute);
  const nextRun = new Date(Date.now() + delay);
  console.log(`[Recurring] Next check scheduled at ${nextRun.toString()}`);

  setTimeout(async () => {
    try {
      await processRecurringTransactions();
    } catch (err) {
      console.error('[Recurring] Error in daily run:', err);
    } finally {
      // Reschedule for same time tomorrow
      scheduleDailyAt(hour, minute);
    }
  }, delay);
}

/**
 * Start the recurring scheduler — runs daily at 9:00 AM.
 */
export function startRecurringScheduler() {
  console.log('[Recurring] Scheduler started — runs daily at 9:00 AM.');

  // Schedule daily at 9:00 AM (no immediate run on startup)
  scheduleDailyAt(1, 26);
}
