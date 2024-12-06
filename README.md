# AI Analyst by E2B
This is an AI-powered code and data analysis tool built with Next.js and the [E2B SDK](https://e2b.dev/docs).

![Preview](preview.png)

→ Try on [ai-analyst.e2b.dev](https://ai-analyst.e2b.dev/)

## Features
- 🔸 Analyze data with Meta's Llama 3.1
- 🔸 Upload CSV files
- 🔸 Create interactive charts

**Powered by:**
- 🔸 ✶ [E2B Sandbox](https://github.com/e2b-dev/code-interpreter)
- 🔸 Vercel's AI SDK
- 🔸 Next.js
- 🔸 echarts library for interactive charts

**Supported LLM Providers:**
- 🔸 TogetherAI
- 🔸 Fireworks
- 🔸 Groq

**Supported chart types:**
- 🔸 All the supported charts are descriebd [here](https://e2b.dev/docs/code-interpreting/create-charts-visualizations/interactive-charts#supported-intertactive-charts).

**Make sure to give us a star!**

<img width="165" alt="Screenshot 2024-04-20 at 22 13 32" src="https://github.com/mishushakov/llm-scraper/assets/10400064/11e2a79f-a835-48c4-9f85-5c104ca7bb49">


## Get started

Visit the [online version](https://ai-analyst.e2b.dev/) or run locally on your own.

### 1. Clone repository
```
git clone https://github.com/e2b-dev/ai-analyst.git
```

### 2. Install dependencies
```
cd fragments && npm i
```

### 3. Get API keys
Copy `.example.env` to `.env.local` and fill in variables for E2B and one LLM provider.

E2B: `E2B_API_KEY`

- Get your [E2B API key here](https://e2b.dev/dashboard?tab=keys).

LLM Providers:

- Fireworks: `FIREWORKS_API_KEY`
- Groq: `GROQ_AI_API_KEY`
- Together AI: `TOGETHER_API_KEY`
- Ollama: `OLLAMA_BASE_URL`
