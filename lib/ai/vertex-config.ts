// Vertex AI Configuration for Benefits Assistant
import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

// Initialize Vertex AI
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'demo-project';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

// Model configurations for different use cases
export const AI_MODELS = {
  // Primary chat model - Gemini 2.0
  CHAT: 'gemini-2.0-flash-exp',
  
  // Document processing and analysis
  DOCUMENT: 'gemini-1.5-pro',
  
  // Embeddings for RAG
  EMBEDDING: 'text-embedding-004',
  
  // Code generation for benefits calculations
  CODE: 'gemini-1.5-pro',
} as const;

// Safety settings for benefits-related content
export const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
];

// Generation config for different contexts
export const GENERATION_CONFIGS = {
  // For general chat responses
  CHAT: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048,
    responseMimeType: 'text/plain',
  },
  
  // For precise benefits calculations
  CALCULATION: {
    temperature: 0.2,
    topP: 0.8,
    topK: 20,
    maxOutputTokens: 1024,
    responseMimeType: 'text/plain',
  },
  
  // For document analysis
  DOCUMENT_ANALYSIS: {
    temperature: 0.3,
    topP: 0.9,
    topK: 30,
    maxOutputTokens: 4096,
    responseMimeType: 'text/plain',
  },
  
  // For structured data extraction
  STRUCTURED: {
    temperature: 0.1,
    topP: 0.95,
    topK: 20,
    maxOutputTokens: 2048,
    responseMimeType: 'application/json',
  },
} as const;

// System prompts for different contexts
export const SYSTEM_PROMPTS = {
  BENEFITS_ASSISTANT: `You are a knowledgeable and helpful Benefits Assistant AI. Your role is to:\n- Answer questions about employee benefits, insurance plans, and enrollment\n- Help users understand their coverage options and costs\n- Provide accurate calculations for premiums, deductibles, and out-of-pocket expenses\n- Guide users through benefits selection and enrollment processes\n- Explain complex insurance terms in simple language\n- Compare different plan options based on user needs\n- Stay up-to-date with company-specific benefits information\n\nImportant guidelines:\n- Always be accurate with numbers and calculations\n- Clarify when you need more information to provide a complete answer\n- Respect privacy and never share personal information\n- Direct users to HR for specific policy exceptions or special cases\n- Be empathetic and understanding of users' concerns about healthcare costs`,

  DOCUMENT_ANALYZER: `You are a document analysis expert specializing in benefits documentation. Your tasks include:\n- Extracting key information from benefits plans, insurance documents, and policy guides\n- Identifying important dates, deadlines, and enrollment periods\n- Summarizing coverage details and exclusions\n- Highlighting cost information and contribution rates\n- Creating structured data from unstructured documents\n- Identifying changes between document versions\n
Focus on accuracy and completeness when analyzing documents.`,

  COST_CALCULATOR: `You are a precise benefits cost calculator. Your responsibilities:\n- Calculate accurate premiums, deductibles, and out-of-pocket maximums\n- Consider tax implications (pre-tax vs post-tax contributions)\n- Factor in employer contributions and subsidies\n- Provide detailed breakdowns of costs\n- Compare total costs across different plan options\n- Include HSA/FSA calculations where applicable\n
Always show your calculations and assumptions clearly.`,
};

// Initialize Vertex AI client
let vertexAI: VertexAI | null = null;

export function getVertexAI(): VertexAI {
  if (!vertexAI) {
    // Check if we have credentials
    const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                          process.env.GOOGLE_CLOUD_PROJECT;
    
    if (!hasCredentials) {
      console.warn('⚠️ Vertex AI credentials not configured');
      console.log('Using fallback AI provider (OpenAI/Anthropic)');
      
      // Return a mock object for development
      return {
        getGenerativeModel: () => ({
          generateContent: async () => ({
            response: {
              text: () => 'Vertex AI not configured. Using fallback provider.',
            },
          }),
        }),
      } as any;
    }
    
    vertexAI = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION,
    });
  }
  
  return vertexAI;
}

// Helper function to get a configured model
export function getModel(modelType: keyof typeof AI_MODELS = 'CHAT') {
  const vertex = getVertexAI();
  const modelName = AI_MODELS[modelType];
  
  return vertex.getGenerativeModel({
    model: modelName,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: GENERATION_CONFIGS.CHAT,
    systemInstruction: SYSTEM_PROMPTS.BENEFITS_ASSISTANT,
  });
}

// Export types
export type ModelType = keyof typeof AI_MODELS;
export type GenerationConfigType = keyof typeof GENERATION_CONFIGS;