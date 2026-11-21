import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash';

app.disable('x-powered-by');
app.use(helmet({
  // The frontend uses no external scripts, fonts, or image hosts.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      styleSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(express.json({ limit: '40kb' }));

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'You are sending messages too quickly. Please wait a moment and try again.' }
});

const SYSTEM_PROMPT = `You are MAUBot, a friendly and useful AI study assistant for university and college students.
Your job is to help students understand topics, revise for exams, plan their study time, improve academic writing, debug beginner programming problems, and learn technical subjects.

Guidelines:
- Explain difficult ideas clearly, step by step, using examples where useful.
- Be encouraging but honest. If you are uncertain, say so rather than inventing facts.
- Do not pretend to know a student's institution rules, timetable, course outline, grades, or deadlines unless the student provides them.
- For calculations, show the important steps and check the result.
- Help students learn; do not encourage cheating, plagiarism, or presenting generated work as their own. When asked to do assessed work, explain the method and help them produce their own answer.
- For programming questions, explain the solution and provide readable code when appropriate.
- Keep answers focused. Use headings or numbered steps for longer explanations.
- You are an AI assistant, not an official university representative or a substitute for a lecturer.
- Abdullahi Hudu (also known as Abdulgee) is the developer of MAUBot. He is a student of Information Technology in the Faculty of Computing at Modibbo Adama University, Yola, and built MAUBot during his IT/SIWES placement at the NITDA Gombe Zonal Office as his final SIWES project. If a student asks about him, you may share this briefly.`;

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'MAUBot' });
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  if (!API_KEY) {
    return res.status(503).json({ error: 'The chatbot has not been configured yet. Add your DeepSeek API key to the server .env file.' });
  }

  const incoming = req.body?.messages;
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return res.status(400).json({ error: 'Please send at least one message.' });
  }

  // Only accept recent user/assistant text messages. The system prompt stays on the server.
  const messages = incoming.slice(-20).map((message) => {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
      return null;
    }
    const content = message.content.trim();
    if (!content || content.length > 6000) return null;
    return { role: message.role, content };
  });

  if (messages.some((message) => message === null) || !messages.some((message) => message.role === 'user')) {
    return res.status(400).json({ error: 'The conversation contains an invalid message. Please try again.' });
  }

  const studentName = typeof req.body?.studentName === 'string'
    ? req.body.studentName.replace(/\s+/g, ' ').trim().slice(0, 40)
    : '';
  const systemPrompt = studentName
    ? `${SYSTEM_PROMPT}\n\nThe student's name or nickname is ${studentName}. Address them by it when it feels natural, not in every reply.`
    : SYSTEM_PROMPT;

  try {
    const apiResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        thinking: { type: 'disabled' },
        stream: false,
        max_tokens: 1800
      }),
      signal: AbortSignal.timeout(60000)
    });

    const data = await apiResponse.json().catch(() => ({}));
    if (!apiResponse.ok) {
      console.error('DeepSeek API error:', apiResponse.status, data?.error?.message || 'Unknown API error');
      return res.status(502).json({ error: 'The AI service could not complete your request. Check the server API key and account balance, then try again.' });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) {
      return res.status(502).json({ error: 'The AI service returned an empty response. Please try again.' });
    }

    return res.json({ reply: reply.trim() });
  } catch (error) {
    console.error('Chat request failed:', error.message);
    const message = error.name === 'TimeoutError'
      ? 'The AI service took too long to respond. Please try again.'
      : 'Unable to reach the AI service. Check your internet connection and try again.';
    return res.status(504).json({ error: message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((err, _req, res, _next) => {
  console.error('Server error:', err.message);
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON request.' });
  }
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`MAUBot is running at http://localhost:${PORT}`);
  if (!API_KEY) console.warn('Warning: DEEPSEEK_API_KEY is missing. Add it to your .env file.');
});
