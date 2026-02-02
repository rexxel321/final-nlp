import { NextResponse } from 'next/server';
import { getSuggestions } from '@/lib/dataset';

export async function GET() {
    try {
        const suggestions = getSuggestions(4);
        return NextResponse.json({ suggestions });
    } catch (error) {
        return NextResponse.json({ suggestions: [] });
    }
}
