// Intent Classification for Hybrid Chatbot

export type Intent =
    | 'greeting'
    | 'bmi_calculation'
    | 'calorie_calculation'
    | 'faq'
    | 'complex_question';

export interface ClassificationResult {
    intent: Intent;
    confidence: number;
    extractedData?: any;
}

/**
 * Classifies user message into intent categories
 */
export function classifyIntent(message: string): ClassificationResult {
    const lowerMsg = message.toLowerCase().trim();

    // Greeting patterns
    if (/^(hi|hello|halo|hai|hey|pagi|siang|malam|selamat|good morning|good afternoon|good evening)/.test(lowerMsg)) {
        return {
            intent: 'greeting',
            confidence: 1.0
        };
    }

    // BMI calculation patterns
    if (/bmi|body mass index|indeks massa tubuh|hitung bmi/.test(lowerMsg)) {
        const extractedData = extractBMIData(message);
        return {
            intent: 'bmi_calculation',
            confidence: extractedData ? 0.9 : 0.7,
            extractedData
        };
    }

    // Calorie calculation patterns
    if (/(berapa|hitung|calculate).*(kalori|calorie|calories|tdee|kebutuhan kalori)/.test(lowerMsg) ||
        /(kalori|calorie).*(harian|daily|per hari|butuh|need)/.test(lowerMsg)) {
        const extractedData = extractCalorieData(message);
        return {
            intent: 'calorie_calculation',
            confidence: extractedData ? 0.9 : 0.7,
            extractedData
        };
    }

    // FAQ patterns - check for common fitness keywords
    const faqKeywords = [
        'apa itu', 'what is', 'pengertian', 'definisi', 'definition',
        'push up', 'pull up', 'squat', 'plank', 'cardio', 'protein',
        'carbohydrate', 'karbohidrat', 'lemak', 'fat', 'rest day',
        'recovery', 'stretching', 'warm up', 'cool down'
    ];

    for (const keyword of faqKeywords) {
        if (lowerMsg.includes(keyword)) {
            return {
                intent: 'faq',
                confidence: 0.8,
                extractedData: { keyword }
            };
        }
    }

    // Default: complex question for AI
    return {
        intent: 'complex_question',
        confidence: 1.0
    };
}

/**
 * Extract BMI data from message (weight and height)
 */
function extractBMIData(message: string): { weight: number; height: number } | null {
    // Pattern: "70kg 175cm" or "weight 70 height 175" or "bb 70 tb 175"
    const patterns = [
        /(\d+)\s*kg.*?(\d+)\s*cm/i,
        /bb\s*(\d+).*?tb\s*(\d+)/i,
        /weight\s*(\d+).*?height\s*(\d+)/i,
        /berat\s*(\d+).*?tinggi\s*(\d+)/i
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
            return {
                weight: parseInt(match[1]),
                height: parseInt(match[2])
            };
        }
    }

    return null;
}

/**
 * Extract calorie calculation data from message
 */
function extractCalorieData(message: string): any | null {
    // This is a simplified version - in real app, might need more sophisticated extraction
    const weightMatch = message.match(/(\d+)\s*kg/i);
    const heightMatch = message.match(/(\d+)\s*cm/i);
    const ageMatch = message.match(/(\d+)\s*(tahun|years?|yo)/i);

    if (weightMatch && heightMatch && ageMatch) {
        return {
            weight: parseInt(weightMatch[1]),
            height: parseInt(heightMatch[1]),
            age: parseInt(ageMatch[1])
        };
    }

    return null;
}
