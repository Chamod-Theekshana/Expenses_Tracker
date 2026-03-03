import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';

import { initDB } from './config/db';
import rateLimiter from './middleware/RateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import transactionsRoutes from './routes/transactionsRoutes';
import authRoutes from './routes/authRoutes';
import signupRoutes from './routes/signupRoutes';
import profileRoutes from './routes/profileRoutes';
import notificationRoutes from './routes/notificationRoutes';
import categoriesRoutes from './routes/categoriesRoutes';
import budgetsRoutes from './routes/budgetsRoutes';
import recurringRoutes from './routes/recurringRoutes';
import exchangeRateRoutes from './routes/exchangeRateRoutes';

import { initSocket } from './socket';
import { startRecurringScheduler } from './services/recurringScheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : '*',
  }),
);
app.use(requestLogger);
app.use(rateLimiter);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/auth', signupRoutes);
app.use('/api/transaction', transactionsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/exchange-rates', exchangeRateRoutes);

app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

initDB().then(() => {
  startRecurringScheduler();
  server.listen(PORT, () => {
    console.log('SERVER IS UP AND RUNNING ON PORT:', PORT);
  });
});
