// lib/ai/prompts.ts
import type { ArtifactKind } from '@/components/artifact';

// Define Geo type locally
interface Geo {
  latitude?: string;
  longitude?: string;
  city?: string;
  country?: string;
  region?: string;
}

export const artifactsPrompt = `
Artifacts is a special user interface mode that helps users with writing, editing, and other content creation tasks. When artifact is open, it is on the right side of the screen, while the conversation is on the left side. When creating or updating documents, changes are reflected in real-time on the artifacts and visible to the user.
...
`;

export const benefitsAdvisorPrompt = `You are a knowledgeable and friendly benefits advisor AI assistant...`;

// THIS IS THE FIX: Exporting the constant that the chat API needs.
export const CHAT_SYSTEM_PROMPT = `You are an expert Benefits Assistant AI helping employees understand and manage their benefits.
...
`;

export const regularPrompt = benefitsAdvisorPrompt;

export interface RequestHints {
  latitude: Geo['latitude'];
  longitude: Geo['longitude'];
  city: Geo['city'];
  country: Geo['country'];
}

export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`;

export const systemPrompt = ({
  selectedChatModel,
  requestHints,
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);

  if (selectedChatModel === 'chat-model-reasoning') {
    return `${benefitsAdvisorPrompt}\n\n${requestPrompt}`;
  } else {
    return `${benefitsAdvisorPrompt}\n\n${requestPrompt}\n\n${artifactsPrompt}`;
  }
};

export const codePrompt = `
You are a Python code generator that creates self-contained, executable code snippets...
`;

export const sheetPrompt = `
You are a spreadsheet creation assistant...
`;

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind,
) =>
  type === 'text'
    ? `\
Improve the following contents of the document based on the given prompt.

${currentContent}
`
    : type === 'code'
      ? `\
Improve the following code snippet based on the given prompt.

${currentContent}
`
      : type === 'sheet'
        ? `\
Improve the following spreadsheet based on the given prompt.

${currentContent}
`
        : '';
