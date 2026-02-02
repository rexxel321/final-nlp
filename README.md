# Final NLP Project - FitBuddy Chatbot

This is a Next.js project implementing a Fitness Chatbot using Llama 3 (via Groq Cloud) and Gemini (via Google AI).

## Features
- **FitBuddy Persona**: A helpful fitness assistant.
- **Dual Models**: Switch between Llama 3 and Gemini.
- **Memory**: Remembers conversation history.
- **Session Management**: "New Chat" and "Summarize Session" features.
- **Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS, Groq SDK, Google Generative AI SDK.

## Getting Started

To run this project locally, follow these steps:

### 1. Clone the Repository
```bash
git clone https://github.com/rexxel321/final-nlp.git
cd final-nlp
```

### 2. Install Dependencies
Make sure you have Node.js installed.
```bash
npm install
```

### 3. Setup Environment Variables
Create a file named `.env.local` in the root directory.
Add your API Keys:

```env
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
