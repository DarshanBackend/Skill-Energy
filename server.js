import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './src/config/db.js';
import { handleMulterError } from './src/middlewares/imageupload.js';
import registerRouter from './src/routes/registerRoutes.js';
import loginRouter from './src/routes/loginRoutes.js.js';
import userPreferencesRouter from './src/routes/userPreferencesRoutes.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.static('public'));

//register Routes
app.use('/api/register', registerRouter);

//login Routes
app.use('/api/login', loginRouter);

// User preferences routes
app.use('/api/userPreferencesRouter', userPreferencesRouter);

// Error handling middleware
app.use(handleMulterError);

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});