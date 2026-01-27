# Final NLP Project - FitBuddy Chatbot

This is a Next.js project implementing a Fitness Chatbot using the Llama 3 model (via Groq Cloud).

## Features
- **FitBuddy Persona**: A helpful fitness assistant.
- **Memory**: Remembers conversation history.
- **Session Management**: "New Chat" and "Summarize Session" features.
- **Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS, Groq SDK.

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
Create a file named `.env.local` in the root directory (same level as `package.json`).
Add your Groq API Key inside it:

```env
GROQ_API_KEY=your_api_key_here
```
*(Ask the project owner for the key if you don't have one)*

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
