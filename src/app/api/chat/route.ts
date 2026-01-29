import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { classifyIntent } from '@/lib/intentClassifier';
import {
    handleGreeting,
    calculateBMI,
    calculateCalories,
    handleFAQ
} from '@/lib/ruleHandlers';

// Groq Setup
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) console.error('GROQ_API_KEY is not set');
const groq = new Groq({ apiKey: groqApiKey });

// Gemini Setup
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) console.error('GEMINI_API_KEY is not set');
const genAI = new GoogleGenerativeAI(geminiApiKey || '');

export async function POST(req: Request) {
    try {
        const { messages, model } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array is required' },
                { status: 400 }
            );
        }

        const lastMessage = messages[messages.length - 1].content;
        let responseContent = "";
        let responseSource = "AI"; // Track whether response is from rule-based or AI

        // STEP 1: Classify Intent
        const classification = classifyIntent(lastMessage);
        console.log(`Intent classified as: ${classification.intent} (confidence: ${classification.confidence})`);

        // STEP 2: Handle based on intent (HYBRID LOGIC)
        switch (classification.intent) {
            case 'greeting':
                responseContent = handleGreeting();
                responseSource = "Rule-Based";
                break;

            case 'bmi_calculation':
                if (classification.extractedData) {
                    const { weight, height } = classification.extractedData;
                    responseContent = calculateBMI(weight, height);
                    responseSource = "Rule-Based";
                } else {
                    // Need more info - ask user
                    responseContent = "I can help you calculate your BMI! Please provide your weight (kg) and height (cm).\n\nExample: 'Calculate my BMI, weight 70kg height 175cm'";
                    responseSource = "Rule-Based";
                }
                break;

            case 'calorie_calculation':
                if (classification.extractedData) {
                    const { weight, height, age } = classification.extractedData;
                    // Default to male and moderate activity if not specified
                    responseContent = calculateCalories(weight, height, age, 'male', 'moderate');
                    responseSource = "Rule-Based";
                } else {
                    // Need more info
                    responseContent = "I can calculate your daily calorie needs! Please provide:\n\n" +
                        "• Weight (kg)\n" +
                        "• Height (cm)\n" +
                        "• Age (years)\n" +
                        "• Gender (male/female)\n" +
                        "• Activity level (sedentary/light/moderate/active/very_active)\n\n" +
                        "Example: 'Calculate calories for 70kg, 175cm, 25 years old male, moderate activity'";
                    responseSource = "Rule-Based";
                }
                break;

            case 'faq':
                const faqAnswer = handleFAQ(lastMessage);
                if (faqAnswer) {
                    responseContent = faqAnswer;
                    responseSource = "Rule-Based";
                } else {
                    // FAQ not found, fallback to AI
                    responseContent = await callAI(messages, model);
                    responseSource = "AI";
                }
                break;

            case 'complex_question':
            default:
                // Use AI for complex questions
                responseContent = await callAI(messages, model);
                responseSource = "AI";
                break;
        }

        return NextResponse.json({
            response: responseContent,
            source: responseSource,
            intent: classification.intent
        });
    } catch (error: any) {
        console.error('Error in chat API:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        return NextResponse.json(
            { error: error.message || 'Failed to process request' },
            { status: 500 }
        );
    }
}

/**
 * Call AI (Llama or Gemini) for complex questions
 */
async function callAI(messages: any[], model: string): Promise<string> {
    const systemMessageContent = 'You are FitBuddy, an expert fitness and nutrition coach. IMPORTANT: Keep your responses CONCISE and BRIEF. Provide helpful advice using short sentences and bullet points. Avoid long paragraphs. Get straight to the point while remaining friendly and motivating.';

    // IMPORTANT: Clean messages to only include role and content (remove source, intent, etc.)
    const cleanMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));

    try {
        if (model === "Gemini") {
            // Gemini Logic
            console.log("Calling Gemini API...");
            const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const history = cleanMessages.slice(0, -1).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

            const chat = geminiModel.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: 4096,
                },
            });

            const lastMessage = cleanMessages[cleanMessages.length - 1].content;
            const prompt = `${systemMessageContent}\n\nUser query: ${lastMessage}`;

            const result = await chat.sendMessage(prompt);
            const response = await result.response;
            console.log("Gemini response received!");
            return response.text();

        } else {
            // Llama 3 (Groq) Logic
            console.log("Calling Llama (Groq) API...");

            if (!groqApiKey) {
                throw new Error("GROQ_API_KEY is not configured");
            }

            const systemMessage = {
                role: 'system',
                content: systemMessageContent,
            };

            const completion = await groq.chat.completions.create({
                messages: [
                    systemMessage,
                    ...cleanMessages
                ],
                model: 'llama-3.3-70b-versatile',
            });

            console.log("Llama response received!");
            return completion.choices[0]?.message?.content || "";
        }
    } catch (error: any) {
        console.error(`Error calling ${model} API:`, error);
        console.error("Error details:", error.message);

        // Return error message with more details
        if (error.message?.includes('API key')) {
            throw new Error(`API Key Error: ${error.message}`);
        } else if (error.status === 401) {
            throw new Error("Invalid API key. Please check your GROQ_API_KEY or GEMINI_API_KEY in .env file");
        } else if (error.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later");
        } else {
            throw new Error(`AI API Error: ${error.message || 'Unknown error'}`);
        }
    }
}
