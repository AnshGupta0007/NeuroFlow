require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./modules/auth/auth.routes');
const projectRoutes = require('./modules/projects/projects.routes');
const taskRoutes = require('./modules/tasks/tasks.routes');
const memberRoutes = require('./modules/members/members.routes');
const intelligenceRoutes = require('./modules/intelligence/intelligence.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'NeuroFlow API' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/members', memberRoutes);
app.use('/api/projects/:projectId/intelligence', intelligenceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`NeuroFlow API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
