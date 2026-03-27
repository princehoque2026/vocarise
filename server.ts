import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { formatInTimeZone } from 'date-fns-tz';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const TIMEZONE = 'Asia/Dhaka';

async function startServer() {
  app.use(cors());
  app.use(express.json());

  // Load dataset
  const wordsPath = path.join(process.cwd(), 'words.json');
  let words: any[] = [];

  const loadWords = () => {
    try {
      if (fs.existsSync(wordsPath)) {
        const data = fs.readFileSync(wordsPath, 'utf-8');
        words = JSON.parse(data);
        console.log(`Loaded ${words.length} words from words.json`);
      } else {
        console.warn('words.json not found. Please generate it.');
      }
    } catch (error) {
      console.error('Error loading words.json:', error);
    }
  };

  loadWords();

  /**
   * Hash function to generate a numeric seed from a string userId
   */
  const hashUserId = (userId: string): number => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  /**
   * Get the current day number (1-364) based on the date in Asia/Dhaka
   */
  const getCurrentDay = (): number => {
    const now = new Date();
    const dhakaTime = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
    const [year, month, day] = dhakaTime.split('-').map(Number);
    
    // Simple day of year calculation
    const start = new Date(year, 0, 0);
    const diff = (new Date(year, month - 1, day).getTime() - start.getTime()) + ((start.getTimezoneOffset() - new Date(year, month - 1, day).getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // Map to 1-364
    return ((dayOfYear - 1) % 364) + 1;
  };

  /**
   * Multi-user logic: Returns 7 words for the current day
   */
  const getTodaysWords = (userId: string, day: number) => {
    const seed = hashUserId(userId);
    const effectiveDay = ((day - 1 + seed) % 364) + 1;
    return words.filter(w => w.day === effectiveDay);
  };

  // API Endpoint
  app.get('/api/words/:userId', (req, res) => {
    const { userId } = req.params;
    const day = getCurrentDay();
    
    console.log(`Request for user ${userId} on day ${day}`);
    
    const todaysWords = getTodaysWords(userId, day);
    
    if (todaysWords.length === 0) {
      return res.status(404).json({ error: 'No words found for today' });
    }
    
    res.json(todaysWords);
  });

  // Daily reset log
  cron.schedule('0 0 * * *', () => {
    console.log('Daily reset triggered at 12:00 AM Asia/Dhaka');
    loadWords(); // Reload in case it was updated
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VocaRise Server running on http://localhost:${PORT}`);
  });
}

startServer();
