// Rule-Based Handlers for Hybrid Chatbot

/**
 * Handle greeting messages
 */
export function handleGreeting(): string {
    const greetings = [
        "Hi! I'm FitBuddy 💪 Your personal fitness assistant. Ask me about workouts, nutrition, or fitness calculations!",
        "Hello! Ready to crush your fitness goals? I can help with workout advice, meal plans, BMI calculations, and more!",
        "Hey there! FitBuddy here. What can I help you with today? Try asking about exercises, nutrition, or let me calculate your fitness metrics!"
    ];

    return greetings[Math.floor(Math.random() * greetings.length)];
}

/**
 * Calculate BMI and return formatted response
 */
export function calculateBMI(weight: number, height: number): string {
    if (weight <= 0 || height <= 0) {
        return "Please provide valid weight (kg) and height (cm) values. Example: 'Calculate my BMI, weight 70kg height 175cm'";
    }

    const bmi = weight / ((height / 100) ** 2);
    let category = "";
    let advice = "";

    if (bmi < 18.5) {
        category = "Underweight";
        advice = "Consider increasing calorie intake and strength training to build muscle mass.";
    } else if (bmi < 25) {
        category = "Normal weight";
        advice = "Great! Maintain your healthy lifestyle with balanced diet and regular exercise.";
    } else if (bmi < 30) {
        category = "Overweight";
        advice = "Consider a calorie deficit diet and increase cardio exercises.";
    } else {
        category = "Obese";
        advice = "Consult with a healthcare professional. Focus on gradual weight loss through diet and exercise.";
    }

    return `📊 **BMI Calculation Result**\n\n` +
        `Your BMI: **${bmi.toFixed(1)}** (${category})\n\n` +
        `**BMI Categories:**\n` +
        `• Underweight: < 18.5\n` +
        `• Normal: 18.5 - 24.9\n` +
        `• Overweight: 25 - 29.9\n` +
        `• Obese: ≥ 30\n\n` +
        `**Advice:** ${advice}`;
}

/**
 * Calculate daily calorie needs using Mifflin-St Jeor Equation
 */
export function calculateCalories(
    weight: number,
    height: number,
    age: number,
    gender: 'male' | 'female',
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' = 'moderate'
): string {
    if (weight <= 0 || height <= 0 || age <= 0) {
        return "Please provide valid weight (kg), height (cm), and age values.";
    }

    // Mifflin-St Jeor Equation for BMR
    let bmr: number;
    if (gender === 'male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Activity multipliers
    const activityMultipliers: { [key: string]: number } = {
        sedentary: 1.2,      // Little or no exercise
        light: 1.375,        // Light exercise 1-3 days/week
        moderate: 1.55,      // Moderate exercise 3-5 days/week
        active: 1.725,       // Heavy exercise 6-7 days/week
        very_active: 1.9     // Very heavy exercise, physical job
    };

    const tdee = bmr * activityMultipliers[activityLevel];

    return `🔥 **Daily Calorie Needs**\n\n` +
        `Based on your profile:\n` +
        `• Weight: ${weight}kg\n` +
        `• Height: ${height}cm\n` +
        `• Age: ${age} years\n` +
        `• Gender: ${gender}\n` +
        `• Activity: ${activityLevel}\n\n` +
        `**Your Daily Calorie Needs:**\n` +
        `• Maintenance: **${Math.round(tdee)} calories/day**\n` +
        `• Weight Loss: **${Math.round(tdee - 500)} calories/day** (-0.5kg/week)\n` +
        `• Weight Gain: **${Math.round(tdee + 500)} calories/day** (+0.5kg/week)\n\n` +
        `**Macro Recommendations:**\n` +
        `• Protein: ${Math.round(weight * 1.8)}g/day\n` +
        `• Carbs: ${Math.round(tdee * 0.4 / 4)}g/day\n` +
        `• Fats: ${Math.round(tdee * 0.25 / 9)}g/day`;
}

/**
 * FAQ Database for common fitness questions
 */
const faqDatabase: { [key: string]: string } = {
    "push up": "**Push-ups** are a bodyweight exercise that targets chest, shoulders, and triceps.\n\n**How to do it:**\n1. Start in plank position with hands shoulder-width apart\n2. Lower your body until chest nearly touches the floor\n3. Push back up to starting position\n\n**Tips:** Keep core tight, body straight. Aim for 3 sets of 10-15 reps.",

    "pull up": "**Pull-ups** are an upper body exercise that targets back, biceps, and shoulders.\n\n**How to do it:**\n1. Hang from a bar with palms facing away\n2. Pull yourself up until chin is above the bar\n3. Lower back down with control\n\n**Tips:** Start with assisted pull-ups or negatives if needed. Aim for 3 sets of 5-10 reps.",

    "squat": "**Squats** are a compound exercise that targets quads, glutes, and hamstrings.\n\n**How to do it:**\n1. Stand with feet shoulder-width apart\n2. Lower your body as if sitting back into a chair\n3. Go down until thighs are parallel to ground\n4. Push through heels to stand back up\n\n**Tips:** Keep chest up, knees tracking over toes. Aim for 3 sets of 12-15 reps.",

    "plank": "**Planks** are a core strengthening exercise.\n\n**How to do it:**\n1. Get into push-up position on forearms\n2. Keep body straight from head to heels\n3. Hold the position\n\n**Tips:** Don't let hips sag. Start with 30 seconds, work up to 1-2 minutes.",

    "protein": "**Protein** is essential for muscle building and repair.\n\n**Daily needs:** 1.6-2.2g per kg of bodyweight for active individuals\n\n**Best sources:**\n• Animal: Chicken, fish, eggs, beef, dairy\n• Plant: Tofu, tempeh, legumes, quinoa, nuts\n\n**Timing:** Spread intake throughout the day, especially post-workout.",

    "carbohydrate": "**Carbohydrates** are your body's primary energy source.\n\n**Types:**\n• Simple carbs: Quick energy (fruits, honey)\n• Complex carbs: Sustained energy (rice, oats, sweet potato)\n\n**Recommendations:** 3-5g per kg bodyweight for active individuals. Focus on complex carbs.",

    "cardio": "**Cardio** improves heart health and burns calories.\n\n**Types:**\n• Low intensity: Walking, cycling\n• High intensity: Running, HIIT, swimming\n\n**Recommendations:** 150 minutes/week of moderate cardio OR 75 minutes/week of vigorous cardio.",

    "rest day": "**Rest days** are crucial for muscle recovery and growth.\n\n**Why important:**\n• Allows muscle repair\n• Prevents overtraining\n• Reduces injury risk\n\n**Recommendations:** 1-2 rest days per week. Light activity (walking, yoga) is fine.",

    "stretching": "**Stretching** improves flexibility and prevents injury.\n\n**Types:**\n• Dynamic: Before workout (leg swings, arm circles)\n• Static: After workout (hold 20-30 seconds)\n\n**Benefits:** Increased range of motion, reduced muscle tension, better performance.",

    "warm up": "**Warm-up** prepares your body for exercise.\n\n**Duration:** 5-10 minutes\n\n**What to do:**\n• Light cardio (jogging, jumping jacks)\n• Dynamic stretches\n• Movement-specific exercises\n\n**Benefits:** Increased blood flow, reduced injury risk, better performance."
};

/**
 * Handle FAQ queries
 */
export function handleFAQ(message: string): string | null {
    const lowerMsg = message.toLowerCase();

    // Check each FAQ keyword
    for (const [keyword, answer] of Object.entries(faqDatabase)) {
        if (lowerMsg.includes(keyword)) {
            return answer;
        }
    }

    return null; // Not found in FAQ
}

/**
 * Get all available FAQ topics
 */
export function getFAQTopics(): string[] {
    return Object.keys(faqDatabase);
}
