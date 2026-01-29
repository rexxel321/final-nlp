export interface Conversation {
    id: string
    user_id: string
    title: string
    model: string
    created_at: string
    updated_at: string
}

export interface Message {
    id: string
    conversation_id: string
    role: 'user' | 'assistant'
    content: string
    source?: 'Rule-Based' | 'AI' | 'Error'
    intent?: string
    created_at: string
}
