# MAUBot — Student AI Assistant

MAUBot is a responsive student-focused AI chatbot built with **HTML, CSS, JavaScript, Node.js, Express, and the DeepSeek API**. It can explain academic concepts, help students revise, assist with programming questions, and support study planning.

## Features

- Responsive chat interface for desktop and mobile
- First-run name prompt; MAUBot addresses the student by name
- About panel with the developer's background and contact details
- Student-focused assistant instructions
- DeepSeek API integration through a server-side JavaScript endpoint
- API key kept on the server in an environment variable
- Conversation history saved in the current browser using `localStorage`
- New chat and clear conversation controls
- Loading indicator, input validation, and friendly error messages
- Basic API rate limiting and HTTP security headers
- No database or user account required for this MVP

## Requirements

- Node.js 20 or newer
- npm
- A DeepSeek API key from [DeepSeek Platform](https://platform.deepseek.com/)

## Run locally

1. Extract the project folder and open a terminal inside it.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your environment file by copying `.env.example` to `.env`:

   **Linux/macOS:**
   ```bash
   cp .env.example .env
   ```

   **Windows PowerShell:**
   ```powershell
   Copy-Item .env.example .env
   ```

4. Open `.env` and replace the placeholder with your real DeepSeek API key:

   ```env
   DEEPSEEK_API_KEY=your_real_api_key_here
   PORT=3000
   DEEPSEEK_MODEL=deepseek-flash
   ```

5. Start the application:

   ```bash
   npm start
   ```

6. Open **http://localhost:3000** in your browser.

For development with automatic server restarts:

```bash
npm run dev
```

## Project structure

```text
maubot/
├── public/
│   ├── index.html       # Chat interface structure
│   ├── styles.css       # Responsive design and styling
│   ├── app.js           # Browser-side chat behaviour
│   └── fonts/           # Self-hosted IBM Plex Sans and Newsreader
├── .env.example        # Environment variable template
├── .gitignore
├── package.json
├── server.js           # Express server and DeepSeek API connection
└── README.md
```

## How it works

1. A student types a question into the chat interface.
2. `public/app.js` sends the conversation and the student's name to the local `/api/chat` endpoint.
3. `server.js` validates the messages and adds MAUBot's student-assistant instructions, including the student's name.
4. The server sends the request to `https://api.deepseek.com/chat/completions` using the API key stored in `.env`.
5. DeepSeek returns an answer, and the server sends the answer back to the browser.
6. The frontend displays the response and saves the conversation in browser storage.

The browser never receives the DeepSeek API key.

## Important security notes before public deployment

- Never commit `.env` or publish your DeepSeek API key. The `.gitignore` file excludes `.env`.
- Do not put the API key inside `public/app.js`, HTML, or CSS.
- The included rate limit is a basic per-IP safeguard, not a complete production abuse-prevention system. Add stronger limits, monitoring, and spending controls before opening the service to the public.
- Browser chat history is stored locally on the device. It is not synced across devices and can be lost if browser storage is cleared.
- The student's name or nickname is stored in browser storage and included in the AI prompt so MAUBot can address them by name.
- This MVP does not include user accounts, a database, administrator dashboard, or institutional student-record integration.
- If deploying behind a reverse proxy, configure Express proxy trust carefully for accurate client IP rate limiting.
- Use HTTPS in production and set suitable deployment environment variables in your hosting provider's dashboard.

## Changing the assistant behaviour

Edit the `SYSTEM_PROMPT` constant near the top of `server.js`. You can add your institution's verified course information, preferred response style, or student support instructions. Avoid adding private student records or unverified university policies.

## API model

The default model is `deepseek-flash`, configured in `.env`. Change `DEEPSEEK_MODEL` if DeepSeek updates its available model names. The server uses the DeepSeek Chat Completions endpoint.

## About the developer

MAUBot was built by **Abdullahi Hudu**, a student of Information Technology in the Faculty of Computing at Modibbo Adama University, Yola, during his IT/SIWES placement at the NITDA Gombe Zonal Office as his final SIWES project.

- WhatsApp: [+234 813 111 6661](https://wa.me/2348131116661)
- Email: [abdullahihudu773@gmail.com](mailto:abdullahihudu773@gmail.com)
# maubot
