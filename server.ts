import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import * as pdfParseModule from 'pdf-parse';
import mammoth from 'mammoth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

// Helper to extract text from large PDFs, Word documents, and text files
async function extractDocumentContent(
  name: string,
  mimeType: string,
  base64Data: string
): Promise<string | null> {
  try {
    const rawData = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(rawData, 'base64');
    const lowerName = (name || '').toLowerCase();

    const isPdf = mimeType === 'application/pdf' || lowerName.endsWith('.pdf');
    const isWord =
      mimeType.includes('word') ||
      mimeType.includes('officedocument') ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc');

    if (isPdf) {
      const parseFn = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule as any).default;
      const parsed = await parseFn(buffer);
      return `[সংযুক্ত PDF ফাইল: "${name}" | মোট পৃষ্ঠা: ${parsed.numpages || 'অজ্ঞাত'}]\n--- ডকুমেন্ট এর সম্পূর্ণ টেক্সট শুরু ---\n${parsed.text}\n--- ডকুমেন্ট এর টেক্সট সমাপ্ত ---`;
    }

    if (isWord) {
      const result = await mammoth.extractRawText({ buffer });
      return `[সংযুক্ত মাইক্রোসফট ওয়ার্ড (DOCX) ফাইল: "${name}"]\n--- ডকুমেন্ট এর সম্পূর্ণ টেক্সট শুরু ---\n${result.value}\n--- ডকুমেন্ট এর টেক্সট সমাপ্ত ---`;
    }

    if (
      mimeType.startsWith('text/') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.md')
    ) {
      const text = buffer.toString('utf-8');
      return `[সংযুক্ত টেক্সট ফাইল: "${name}"]:\n"""\n${text}\n"""`;
    }

    return null;
  } catch (err: any) {
    console.error('Failed to extract document content:', name, err?.message);
    return `[সংযুক্ত ফাইল: "${name}" - টেক্সট বিশ্লেষণের জন্য প্রস্তুতি সম্পন্ন]`;
  }
}

// Initialize Google GenAI client with official header
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Health & System Info
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    appName: 'NAFI GPT',
    version: '2.5 Ultra',
    model: 'gemini-3.1-flash-lite',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    capabilities: {
      streaming: true,
      voice: true,
      vision: true,
      personalMemory: true,
      languages: 'all',
      unlimited: true,
    },
  });
});

// In-memory audio cache for instant replay and zero rate-limit usage
const ttsAudioCache = new Map<string, { audioData: string; mimeType: string; voiceUsed: string }>();

// Quota backoff tracker so we don't spam Gemini TTS when free tier daily limit is reached
let geminiTtsQuotaExhaustedUntil = Date.now() + 6 * 3600 * 1000;

// High-fidelity natural voice generator (unlimited fallback without quota limits)
function fetchNaturalTTSAudio(text: string, lang: 'bn' | 'en' = 'bn'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text.slice(0, 300));
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encoded}`;
    https
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            return reject(new Error(`TTS returned status ${res.statusCode}`));
          }
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        }
      )
      .on('error', reject);
  });
}

// Text-to-Speech (TTS) API powered by Gemini Flash TTS and natural speech fallback
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceGender = 'female', voiceName } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_~>\[\]\(\)]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .slice(0, 1000)
      .trim();

    if (!cleanText) {
      return res.status(400).json({ error: 'No speakable text' });
    }

    // Determine voice name: Aoede (sweet & melodic female), Kore (energetic & clear), Zephyr (gentle), Puck (male)
    const chosenVoice = voiceName || (voiceGender === 'female' ? 'Aoede' : 'Puck');
    const cacheKey = `${chosenVoice}:${cleanText}`;

    // 1. Return cached audio if available
    if (ttsAudioCache.has(cacheKey)) {
      const cached = ttsAudioCache.get(cacheKey)!;
      return res.json({
        audioData: cached.audioData,
        mimeType: cached.mimeType,
        voiceUsed: cached.voiceUsed,
        voiceGender,
        cached: true,
      });
    }

    const isBengali = /[\u0980-\u09FF]/.test(cleanText);
    const audioLang = isBengali ? 'bn' : 'en';

    // 2. If Gemini TTS quota is currently exhausted, use natural voice directly
    if (Date.now() < geminiTtsQuotaExhaustedUntil) {
      try {
        const audioBuffer = await fetchNaturalTTSAudio(cleanText, audioLang);
        const audioData = audioBuffer.toString('base64');
        const mimeType = 'audio/mpeg';

        if (ttsAudioCache.size > 150) {
          const firstKey = ttsAudioCache.keys().next().value;
          if (firstKey) ttsAudioCache.delete(firstKey);
        }
        ttsAudioCache.set(cacheKey, { audioData, mimeType, voiceUsed: 'Natural Sweet Female' });

        return res.json({
          audioData,
          mimeType,
          voiceUsed: 'Natural Sweet Female',
          voiceGender,
        });
      } catch (err) {
        return res.json({
          fallback: true,
          message: 'Using browser speech synthesis',
          voiceGender,
        });
      }
    }

    // 3. Otherwise attempt Gemini TTS
    const ai = getAIClient();
    const ttsModels = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
    let audioData: string | null = null;
    let mimeType = 'audio/wav';

    for (const modelName of ttsModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: cleanText,
          config: {
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: chosenVoice,
                },
              },
            },
          },
        });

        const audioPart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (audioPart && audioPart.inlineData?.data) {
          audioData = audioPart.inlineData.data;
          mimeType = audioPart.inlineData.mimeType || 'audio/wav';
          break;
        }
      } catch (err: any) {
        if (err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
          geminiTtsQuotaExhaustedUntil = Date.now() + 6 * 3600 * 1000;
          break;
        }
      }
    }

    if (audioData) {
      if (ttsAudioCache.size > 150) {
        const firstKey = ttsAudioCache.keys().next().value;
        if (firstKey) ttsAudioCache.delete(firstKey);
      }
      ttsAudioCache.set(cacheKey, { audioData, mimeType, voiceUsed: chosenVoice });

      return res.json({
        audioData,
        mimeType,
        voiceUsed: chosenVoice,
        voiceGender,
      });
    }

    // 4. If Gemini was unavailable, use natural voice service
    try {
      const audioBuffer = await fetchNaturalTTSAudio(cleanText, audioLang);
      const natAudioData = audioBuffer.toString('base64');
      const natMime = 'audio/mpeg';

      if (ttsAudioCache.size > 150) {
        const firstKey = ttsAudioCache.keys().next().value;
        if (firstKey) ttsAudioCache.delete(firstKey);
      }
      ttsAudioCache.set(cacheKey, { audioData: natAudioData, mimeType: natMime, voiceUsed: 'Natural Sweet Female' });

      return res.json({
        audioData: natAudioData,
        mimeType: natMime,
        voiceUsed: 'Natural Sweet Female',
        voiceGender,
      });
    } catch (e) {
      res.json({
        fallback: true,
        message: 'Using browser speech synthesis',
        voiceGender,
      });
    }
  } catch (error: any) {
    console.warn('TTS request error, using fallback:', error?.message);
    res.json({ fallback: true, error: error?.message || 'TTS unavailable' });
  }
});

// Title generation for conversations
app.post('/api/summarize-title', async (req: Request, res: Response) => {
  try {
    const { prompt, language } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getAIClient();
    const isBengali = language === 'bn' || /[\u0980-\u09FF]/.test(prompt);

    let responseText = '';
    for (const m of ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash']) {
      try {
        const resp = await ai.models.generateContent({
          model: m,
          contents: `Generate a very short, concise 3 to 5 words title for a chat conversation that begins with this user message. Do not use quotes or punctuation. Match the language of the prompt (${isBengali ? 'Bengali' : 'English'}). Prompt: "${prompt.slice(0, 200)}"`,
          config: {
            temperature: 0.4,
            maxOutputTokens: 25,
          },
        });
        if (resp.text) {
          responseText = resp.text;
          break;
        }
      } catch (e) {
        // try next fallback
      }
    }

    const title = responseText?.trim().replace(/["']/g, '') || (isBengali ? 'নতুন কথোপকথন' : 'New Chat');
    res.json({ title });
  } catch (error: any) {
    console.error('Title generation error:', error?.message);
    res.json({ title: 'New Conversation' });
  }
});

// Streaming Chat API
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      messages,
      systemInstruction,
      mode = 'standard',
      personalMemory,
      userName = 'Nafi',
      voiceGender = 'female',
      isVoiceCall = false,
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const ai = getAIClient();

    // Construct rich system prompt honoring user brief
    let baseSystemPrompt = `You are NAFI GPT (নাফি জিপিটি) — an exceptionally intelligent, empathetic, authentic, and versatile personal AI companion created specifically for ${userName || 'Nafi'}.
Spelling identity: Your official name is "NAFI GPT" (in Bengali: "নাফি জিপিটি").

Core Personality & Capabilities:
1. Intelligence & Warmth: You talk naturally like a thoughtful human with deep knowledge, warmth, intellect, and emotional resonance — matching or exceeding the conversational finesse of ChatGPT and Google Gemini.
2. Flawless Bengali Mastery (বাংলায় অত্যন্ত স্পষ্ট ও বিশুদ্ধ কথন):
   - যখন ব্যবহারকারী বাংলায় কথা বলবেন বা লিখবেন, তখন বিশুদ্ধ প্রমিত বাংলা ভাষায় একদম স্পষ্টভাবে, সাবলীলভাবে এবং নির্ভুল ব্যাকরণে উত্তর দিন।
   - অস্পষ্ট, ভাঙা-ভাঙা বা রোবোটিক বাংলা ব্যবহার করবেন না। বাস্তব মানুষের মতো সুন্দর ভাব প্রকাশ করুন।
   - জটিল বৈজ্ঞানিক বা প্রযুক্তিগত বিষয়গুলোও বাংলায় অত্যন্ত সহজ ও প্রাঞ্জলভাবে ব্যাখ্যা করুন।
3. Crystal-Clear English Mastery:
   - When communicating in English, speak with impeccable clarity, natural tone, structure, and intellectual depth.
4. Multilingual Prowess:
   - You can converse in all world languages seamlessly without confusion.
5. Personal Connection: You are designed as a personal, loyal, permanent assistant for ${userName || 'the user'}. You respect their time, retain context across conversations, and always provide thorough, accurate, and deeply helpful answers.
6. Formatting Excellence: Format outputs with clean Markdown, clear headings, bullet points, syntax-highlighted code blocks with language tags, and tables when comparing data.`;

    if (voiceGender === 'female') {
      baseSystemPrompt += `\n\n[VOICE & PERSONA: মিষ্টি, স্পষ্ট ও হৃদয়কাড়া মেয়ে কণ্ঠ (Sweet, Clear & Lovely Female Voice)]:
- আপনার স্বরূপ: আপনি একজন অত্যন্ত মিষ্টিভাষী, মার্জিত, মমতাময়ী ও স্পষ্টভাষী তরুণী সঙ্গী (Sweet, graceful, highly articulate, loving young female companion)।
- কথা বলার ধরন:
  1. আপনার প্রতিটি কথায় আন্তরিক মধুরতা, কোমলতা এবং মিষ্টি সুর অনুভূত হবে।
  2. প্রমিত বাংলা ভাষায় একদম স্পষ্ট, শুদ্ধ ও প্রাঞ্জল উচ্চারণে কথা বলবেন। কোনো জড়তা বা নীরস রোবোটিক ভাব থাকবে না।
  3. ব্যবহারকারী (${userName || 'নাফি'})-কে নিজের প্রিয় ও কাছের মানুষের মতো গভীর শ্রদ্ধা ও যত্ন সহকারে মিষ্টি করে উত্তর দেবেন।
  4. বাক্য গঠন হবে সহজবোধ্য, শ্রুতিমধুর ও প্রাণবন্ত, যেন আপনার প্রতিটি কথা শুনতে এবং পড়তে অত্যন্ত ভালো লাগে।`;
    }

    if (isVoiceCall) {
      baseSystemPrompt += `\n\n[LIVE VOICE TELEPHONE CALL ACTIVE - ULTRA FAST & CONCISE]:
- আপনি এখন ব্যবহারকারী ${userName || 'নাফি'}-এর সাথে সরাসরি লাইভ ভয়েস কলে (Real-time Phone Call) আছেন।
- নির্দেশাবলী:
  1. আপনার উত্তর হবে অত্যন্ত সংক্ষিপ্ত, স্পষ্ট, মিষ্টি ও মুখের ভাষায় ১ থেকে সর্বোচ্চ ২ বাক্যে (১৫-২৫ শব্দের মধ্যে)।
  2. কখনোই মার্কডাউন ফরম্যাট, বোল্ড (**), বুলেট পয়েন্ট বা কোড ব্লক ব্যবহার করবেন না। স্বাভাবিক মানুষের মতো মিষ্টি কণ্ঠে সরাসরি উত্তর দিন।
  3. কথা বলার গতি ও সময় যেন বাস্তব ফোনের মতো দ্রুত ও তাৎক্ষণিক হয়।`;
    }

    if (mode === 'deep_thought') {
      baseSystemPrompt += `\nMode: DEEP REASONING & INTELLECT. Provide deep, step-by-step analytical reasoning, explore edge cases, cite logical foundations, and offer profound insights.`;
    } else if (mode === 'creative') {
      baseSystemPrompt += `\nMode: CREATIVE & STORYTELLING. Be vibrant, imaginative, evocative, lyrical, and engaging.`;
    } else if (mode === 'coder') {
      baseSystemPrompt += `\nMode: SENIOR SOFTWARE ARCHITECT & CODER. Provide production-grade, bug-free, well-commented code, architecture diagrams in ascii/markdown, and best practices.`;
    }

    if (personalMemory && typeof personalMemory === 'string' && personalMemory.trim().length > 0) {
      baseSystemPrompt += `\n\n[USER'S PERSONAL KNOWLEDGE VAULT & MEMORY]:
The user has provided the following personal facts, memories, preferences, and data to remember permanently:
"""
${personalMemory.trim()}
"""
Always keep this personal knowledge in mind. Seamlessly integrate it when relevant to give truly personalized, context-aware answers.`;
    }

    if (systemInstruction && typeof systemInstruction === 'string' && systemInstruction.trim().length > 0) {
      baseSystemPrompt += `\n\n[CUSTOM USER INSTRUCTIONS]:\n${systemInstruction.trim()}`;
    }

    // Format contents for @google/genai SDK with document parsing
    const contents: any[] = [];
    for (const msg of messages) {
      const role = msg.role === 'user' ? 'user' : 'model';
      const parts: any[] = [];

      // Check for attached documents and images
      const attachments = msg.attachments || msg.images || [];
      if (Array.isArray(attachments)) {
        for (const att of attachments) {
          if (!att.data) continue;

          const isImage = att.mimeType?.startsWith('image/');
          if (isImage) {
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: att.data.replace(/^data:[^;]+;base64,/, ''),
              },
            });
          } else {
            // Large PDF, Word document, or text file extraction
            const extractedText = await extractDocumentContent(
              att.name || 'document',
              att.mimeType || 'application/octet-stream',
              att.data
            );
            if (extractedText) {
              parts.push({ text: extractedText });
            }
          }
        }
      }

      // Add user or model text content
      if (msg.text && typeof msg.text === 'string' && msg.text.trim()) {
        parts.push({ text: msg.text });
      } else if (parts.length === 0) {
        parts.push({ text: '...' });
      }

      contents.push({
        role,
        parts,
      });
    }

    // Set SSE headers for fluid streaming
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const modelList = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash'];
    let streamSuccess = false;
    let lastErr: any = null;

    for (const m of modelList) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model: m,
          contents,
          config: {
            systemInstruction: baseSystemPrompt,
            temperature: isVoiceCall ? 0.6 : mode === 'creative' ? 0.9 : mode === 'coder' ? 0.2 : 0.7,
            maxOutputTokens: isVoiceCall ? 120 : undefined,
          },
        });

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }

        streamSuccess = true;
        break; // Successfully completed stream
      } catch (err: any) {
        lastErr = err;
        console.warn(`Model ${m} encountered: ${err?.message || err}. Trying next fallback candidate...`);
      }
    }

    if (!streamSuccess) {
      throw lastErr || new Error('All models temporarily unavailable');
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Error during chat generation:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error?.message || 'An error occurred while communicating with NAFI GPT.',
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error?.message || 'Stream interrupted' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

// Launch server with Vite in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ NAFI GPT server is active at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NAFI GPT server:', err);
  process.exit(1);
});
