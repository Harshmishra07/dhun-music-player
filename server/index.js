import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ALLOWED_ORIGIN env var should be set on Render to your Vercel app URL
// e.g. https://dhun-music-player.vercel.app
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET'],
}));

app.use(express.json());
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dhun Server is running' });
});

app.listen(PORT, () => {
  console.log(`🎵 Dhun Server running on http://localhost:${PORT}`);
});
