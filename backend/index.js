import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import { securityHeaders, rateLimiter } from './middleware/securityMiddleware.js';

import authRoutes from './routes/auth.js';
import postRoutes from './routes/postRoutes.js';
import gymRoutes from './routes/gymRoutes.js';
import suggestionRoutes from './routes/suggestionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import gymOwnerRoutes from './routes/gymOwnerRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import exerciseRoutes from './routes/exerciseRoutes.js';
import planRoutes from './routes/planRoutes.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
connectDB();

const app = express();

// Security Middleware
app.use(securityHeaders);
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost',
  ...(process.env.FRONTEND_URL || '').split(',').map(origin => origin.trim()).filter(Boolean)
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-name', 'x-user-role']
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply rate limiter to auth & AI endpoints
app.use('/api/auth', rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use('/api/ai', rateLimiter({ windowMs: 15 * 60 * 1000, max: 200 }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/gym-owner', gymOwnerRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/plans', planRoutes);

app.get('/', (req, res) => {
  res.send('GymSync API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
