# AgroVoice

A Hausa/English voice advisory app for farmers. Farmers log in with a phone number and a 6-digit PIN,
record a voice question (or type one), add a crop photo, and see the answer on a result screen.

**How it is built (the classic way):**

```
React app (client/)  --->  Express server (server/)  --->  MongoDB Atlas + uploads storage
   what farmers see         login, API, file storage        accounts/questions   and   uploads/
```

The app uses external AI providers for speech recognition, farm advice, and Hausa voice answers.

**Status:** login, voice recording, photo upload, saving questions, result screen and history all work.
The AI pipeline uses real providers. Configure their API keys in the backend before serving farmer questions.

---

## What you need first

- **Node.js 20 or higher.** Check with `node -v`. If it is older or missing, install the LTS version from https://nodejs.org
- **Chrome** (best support for the microphone)

You will use **two terminals** at the same time: one for the server, one for the app.

---

## Step 1: Open the project

1. Unzip `agrovoice.zip`.
2. Open VS Code, then **File > Open Folder**, and choose the `agrovoice` folder (the one that contains `client` and `server`).

## Step 2: Install the server

Open a terminal (**Terminal > New Terminal**) and run:

```bash
cd server
npm install
```

Wait until it finishes.

## Step 3: Create the server settings file

Still inside `server`, copy the example file:

```bash
cp .env.example .env
```

(On Windows Command Prompt use `copy .env.example .env`.)

Make a secret for login tokens. Run this and copy the long text it prints:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Open `server/.env` in VS Code and replace `paste-a-long-random-string-here` with that text. It should look like:

```
PORT=4000
JWT_SECRET=3f9a...your-long-random-text...
```

Never share the `.env` file. Anyone with the secret can fake a login.

## Step 4: Start the server

```bash
npm run dev
```

You should see: `AgroVoice server running on http://localhost:4000`. Leave this terminal open.
The first run creates the `server/uploads` folder. Configure `MONGODB_URI` to connect to MongoDB.

## Step 5: Install and start the app

Open a **second terminal** (click the **+** in the terminal panel) and run:

```bash
cd client
npm install
npm run dev
```

Open the link it prints (usually http://localhost:5173) in Chrome.

## Step 6: Test everything

1. Click **Create a new account**. Enter a name, a phone number, and a 6-digit PIN.
2. You land on the **Tambaya (Ask)** tab. Choose **Hausa** or **English**.
3. Tap the green microphone. Allow microphone access when Chrome asks. Speak, then tap again to stop. A player appears so you can listen.
4. Optionally add a photo (on a laptop it opens a file picker). A thumbnail appears with a remove button.
5. Tap **Aika (Send)**. The result screen opens with your photo, your recording, and "Working on your answer...".
6. To manually set an answer for a MongoDB question, copy its 24-character ID from the result URL/log and run in a **third terminal**:
   ```bash
   cd server
   npm run set-answer -- 64f000000000000000000001 "Remove the affected leaves and water at the base of the plant."
   ```
   (Replace the example ID with the question ID.) Within 3 seconds the result screen shows the answer.
7. Tap **Tarihi (History)** to see past questions. Tap one to reopen it.
8. Refresh the browser. You should still be logged in.

---

## Deploy the app

The frontend can be hosted on Vercel. The API should run on a persistent Node host such as Render:
the API stores account and question data in MongoDB Atlas and uploaded recordings/photos on a Render persistent disk. Vercel's function filesystem is temporary, so the API runs on Render.

### Vercel frontend

1. Push this project to a private GitHub repository. The root `vercel.json` rewrites app routes to `index.html`.
2. In Vercel, import the repository and set **Root Directory** to `client`.
3. Set **Build Command** to `npm run build` and **Output Directory** to `dist`.
4. Add `VITE_API_URL` with the public Render API origin, for example `https://agrovoice-api.onrender.com` (no trailing slash).
5. Deploy. The API service must allow requests from the Vercel domain; configure its CORS origin before using sign-in.

For a preview before the API is deployed, leave `VITE_API_URL` empty. The app will use relative `/api` paths,
which work with the local Vite proxy but are not connected to a production API.

### Render API (next)

Create a MongoDB Atlas cluster and database user, then copy its connection URI. Create a Render **Web Service**
from this repository with **Root Directory** `server`, **Build Command** `npm install`, and **Start Command**
`npm start`. Set `MONGODB_URI` to the Atlas URI, `JWT_SECRET` to a long random value, and `CORS_ORIGIN`
to the Vercel app origin. Add `AI_STT=elevenlabs`, `AI_ADVISOR=claude`, `AI_TTS=9jalingo`,
`ELEVENLABS_API_KEY`, `ANTHROPIC_API_KEY`, and `NAIJALINGO_API_KEY`. The included `render.yaml` provisions a
persistent disk for uploads; no database disk is needed.

The app uses MongoDB for persistent records and Render persistent disk for uploaded files. For horizontal scaling, move uploads to object storage such as S3 or Cloudinary. Do not commit `server/.env`, database files, or uploads.

To inspect records, use MongoDB Atlas Data Explorer or MongoDB Compass with your Atlas connection.

---

## Test on your phone

The microphone and camera only work on HTTPS (or on `localhost`), so your phone cannot use the plain Wi-Fi link.
The easy way is a tunnel that gives your laptop a temporary HTTPS link:

1. Create a free account at https://ngrok.com and install ngrok (their page shows how).
2. With both servers running, run: `ngrok http 5173`
3. Open the `https://...` link it prints on your phone.

Production uses MongoDB Atlas for records and a persistent Render disk for uploaded files.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Missing JWT_SECRET` when starting the server | `server/.env` is missing or still has the placeholder. Redo Step 3, then restart. |
| App shows "Cannot reach the server" or the terminal shows `ECONNREFUSED` | The server is not running. Start it (Step 4) and keep that terminal open. |
| `npm install` fails | Check `node -v` is 20 or higher, then delete `server/node_modules` and rerun `npm install`. |
| `EADDRINUSE: port 4000 already in use` | Another copy of the server is running. Close it, or change `PORT` in `server/.env` and the port in `client/vite.config.js`. |
| "Wrong phone number or PIN" | PIN must be exactly 6 numbers. Use the phone number you signed up with. After 5 wrong tries the number is locked for 15 minutes (restart the server to clear it). |
| Microphone does not work | Use Chrome. Click the lock icon in the address bar and allow the microphone. On a phone, use the HTTPS tunnel link. |
| Blank white page | Press F12, open the **Console** tab, and read the red error. |
| Want to start fresh | Stop the server, clear the MongoDB `users` and `questions` collections and everything inside `server/uploads`, then start again. |

---

## Project files

```
server/index.js            the whole API: sign-up, login, questions, private files
server/db.js               MongoDB connection and Mongoose models
server/scripts/set-answer.js   fakes an AI answer for testing
server/.env.example        copy to .env and set JWT_SECRET
client/src/App.jsx         navigation between screens
client/src/api.js          every request to the server goes through here
client/src/AuthContext.jsx login state (token saved in the browser)
client/src/Login.jsx       login and sign-up screen
client/src/Ask.jsx         voice, photo and text question screen
client/src/Result.jsx      shows one question and its answer
client/src/History.jsx     list of past questions
client/src/styles.css      styles
```

## How the pieces talk

- **Sign up / log in:** the server stores the PIN as a bcrypt hash (never the PIN itself) and returns a signed token. The app keeps the token and sends it with every request.
- **Sending a question:** the app posts the text, recording and photo in one request. The server saves the files in `server/uploads` under random names and one row in the `questions` table.
- **Private files:** a file can only be downloaded by the person who owns the question.
- **Answers:** the result screen asks the server every 3 seconds until `status` is `answered`. The AI step will fill in `answer_text` and `answer_audio_file`.

## Known limits

- The real AI providers require API keys. Hausa quality should be tested and measured with local farmers and extension workers.
- No offline mode yet.
- There is no "forgot PIN" option. Create a new account with a different number if a PIN is forgotten.
- The Hausa labels are first drafts. Have a native speaker check them.

---

## The AI step

When a farmer sends a question, the server runs three steps in the background:

```
voice recording --(speech to text)--> text --(advisor + crop photo)--> advice --(text to speech)--> voice answer
```

Each step has a provider you choose in `server/.env`. After editing `.env`, stop the server (Ctrl + C) and run `npm run dev` again.

| Step | Setting | Options |
|---|---|---|
| Speech to text | `AI_STT` | `elevenlabs` (Scribe model) |
| Advisor | `AI_ADVISOR` | `claude` |
| Voice answer | `AI_TTS` | `9jalingo` (Hausa voices) |

**1. Configure and verify the real providers.** Add their API keys to `server/.env`, then test each service:

```bash
cd server
npm run test-ai -- advisor ha "Ganyen tumatir na sun yi rawaya"
npm run test-ai -- photo   ha ./leaf.jpg "Me ke damun wannan ganye?"
npm run test-ai -- stt     ha ./recording.webm
npm run test-ai -- tts     ha "Sannu manomi, ina kwana?"
```

Keys needed (these services bill by use, check each one's current pricing and free credits):
- `ANTHROPIC_API_KEY` from https://console.anthropic.com (API credits are separate from a Claude chat subscription)
- `ELEVENLABS_API_KEY` from https://elevenlabs.io
- `NAIJALINGO_API_KEY` from https://9jalingo.org/dashboard

**2. If a question fails,** the result screen shows the reason and a **Try again** button.

Notes:
- Photos are shrunk in the browser before upload (largest side 1600 px).
- The server stores what speech-to-text heard in the `transcript` column. Use it to measure accuracy later.
- English answers have no voice yet (the 9jaLingo voices are Hausa, Igbo, Yoruba and Pidgin).
- Never put API keys in the `client` folder. They stay in `server/.env`.
