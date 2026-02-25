import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';

import { initDB } from './config/db';
import rateLimiter from './middleware/RateLimiter';
import transactionsRoutes from './routes/transactionsRoutes';
import authRoutes from './routes/authRoutes';
import signupRoutes from './routes/signupRoutes';
import profileRoutes from './routes/profileRoutes';
import notificationRoutes from './routes/notificationRoutes';

import { initSocket } from './socket';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(rateLimiter);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/auth', signupRoutes);
app.use('/api/transaction', transactionsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);

const server = http.createServer(app);
initSocket(server);

initDB().then(() =>
  server.listen(PORT, () => {
    console.log('SERVER IS UP AND RUNNING ON PORT:', PORT);
  }),
);
