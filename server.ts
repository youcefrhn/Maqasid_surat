import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(express.json());

  // Setup Gemini client if GEMINI_API_KEY is available
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API Route for AI Quran Explanations
  app.post('/api/chat', async (req, res) => {
    try {
      if (!apiKey || !ai) {
        return res.status(403).json({ 
          error: "مفتاح Gemini API غير مكوّن. الرجاء إدخاله في لوحة الأسرار (Secrets) لإتاحة المعلم الرقمي المساعد." 
        });
      }

      const { message, surahName, surahPurpose, type } = req.body;
      
      const systemInstruction = `أنت عالم مفسر ومعلم للقرآن الكريم، مرجعيتك الأساسية هي كتاب "المختصر في التفسير" الصادر عن مركز تفسير للدراسات القرآنية.
أنت تساعد المسلمين في فهم مقاصد سور القرآن الكريم وتأمل آياتها.
سيسألك المستخدم بشأن تفسير مقصد السورة الحالية:
اسم السورة: سورة ${surahName}
مقصد السورة في كتاب المختصر: "${surahPurpose}"

الرجاء الإجابة بلغة عربية فصحى، هادئة، إيمانية، بليغة ويسيرة الفهم جداً.
- التزم بأسلوب "المختصر في التفسير".
- ركّز على ربط مقصد السورة بفوائدها العملية والدعوية في واقعنا المعاصر.
- اجعل إجابتك منسقة بشكل رائع باستخدام النقاط والفقرات وعلامات الاقتباس للآيات الكريمة.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error?.message || "حدث خطأ غير متوقع أثناء معالجة طلبك" });
    }
  });

  // Serve static assets in production or use Vite in dev
  const isProd = process.env.NODE_ENV === 'production' || !fs.existsSync(path.resolve('./index.html'));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
    
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve('./index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Serve from dist folder in production
    app.use(express.static(path.resolve('./dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('./dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

startServer();
