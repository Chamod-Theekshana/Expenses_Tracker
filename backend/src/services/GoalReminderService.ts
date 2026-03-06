import cron from 'node-cron';
import { sql } from '../config/db';
import { sendPushToUser } from './pushService';

export class GoalReminderService {
  /**
   * Starts the cron job to check for goals approaching their deadlines.
   * Runs every day at 09:00 AM.
   */
  static startDailyReminders() {
    console.log('[Goal Reminder] Starting daily goal reminder cron job (09:00 AM)...');
    
    // Schedule for 09:00 AM every day
    cron.schedule('0 15 * * *', async () => {
      console.log('[Goal Reminder] Running daily check for goal deadlines...');
      await this.checkAndSendReminders();
    });
  }

  /**
   * Finds all active goals and sends daily push notifications
   */
  static async checkAndSendReminders() {
    try {
      // Find ALL goals that are not completed (whether they have a deadline or not)
      const rows = await sql`
        SELECT 
          id, user_id, name, target_amount, current_amount, deadline,
          CASE WHEN target_amount > 0 
               THEN ROUND((current_amount / target_amount) * 100, 1) 
               ELSE 0 
          END AS progress_percentage
        FROM goals
        WHERE is_completed = false
      `;

      if (!rows || rows.length === 0) {
        console.log('[Goal Reminder] No active goals to remind today.');
        return;
      }

      console.log(`[Goal Reminder] Found ${rows.length} active goal(s). Sending daily notifications...`);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      for (const row of rows) {
        let messageBody = '';

        if (row.deadline) {
          // Goal has a deadline - report days remaining
          const deadlineDate = new Date(row.deadline);
          deadlineDate.setHours(0, 0, 0, 0);

          const diffTime = deadlineDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
             messageBody = `Your goal "${row.name}" is overdue! Keep pushing to reach it!`;
          } else if (diffDays === 0) {
            messageBody = `Your goal "${row.name}" is due today!`;
          } else if (diffDays === 1) {
            messageBody = `Your goal "${row.name}" is due tomorrow!`;
          } else {
            messageBody = `Your goal "${row.name}" has ${diffDays} days left!`;
          }
        } else {
          // No deadline - report progress percentage
          messageBody = `Keep saving for "${row.name}"! You are ${row.progress_percentage}% there.`;
        }

        await sendPushToUser(
          String(row.user_id),
          'Goal Reminder 🎯',
          messageBody,
          { type: 'goal_reminder', goalId: String(row.id) }
        );
      }
    } catch (err) {
      console.error('[Goal Reminder] Error checking goals:', err);
    }
  }
}
