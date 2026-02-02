import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface QAPair {
    question: string;
    answer: string;
}

let cachedData: QAPair[] | null = null;

export function getDataset(): QAPair[] {
    if (cachedData) return cachedData;

    try {
        const csvPath = path.join(process.cwd(), 'dataset.csv');
        const fileContent = fs.readFileSync(csvPath, 'utf-8');

        const records = parse(fileContent, {
            columns: ['text'],
            skip_empty_lines: true,
            relax_quotes: true,
        });

        cachedData = records.map((record: any) => {
            const text = record.text || "";
            const humanSplit = text.split("###Human:");
            if (humanSplit.length < 2) return null;

            const content = humanSplit[1];
            const assistantSplit = content.split("###Assistant:");

            if (assistantSplit.length < 2) return null;

            return {
                question: assistantSplit[0].trim(),
                answer: assistantSplit[1].trim()
            };
        }).filter((item: any) => item !== null) as QAPair[];

        return cachedData || [];
    } catch (error) {
        console.error("Error loading dataset:", error);
        return [];
    }
}

export function getSuggestions(count: number = 4): string[] {
    const data = getDataset();
    if (data.length === 0) return [];

    const shuffled = [...data].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(safe => safe.question.substring(0, 60) + (safe.question.length > 60 ? '...' : ''));
}

export function findRelevantContext(query: string, limit: number = 3): string {
    const data = getDataset();
    if (data.length === 0 || !query) return "";

    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    if (queryTerms.length === 0) return "";

    const scored = data.map(item => {
        let score = 0;
        const text = (item.question + " " + item.answer).toLowerCase();
        queryTerms.forEach(term => {
            if (text.includes(term)) score++;
        });
        return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const top = scored.filter(s => s.score > 0).slice(0, limit);

    if (top.length === 0) return "";

    return top.map(t => `Q: ${t.item.question}\nA: ${t.item.answer}`).join("\n\n");
}
