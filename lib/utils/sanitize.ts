import { z } from 'zod';

/**
 * Sanitization utilities to prevent injection attacks and XSS
 */

// Maximum allowed lengths
const MAX_CHAT_MESSAGE_LENGTH = 10000;
const MAX_TITLE_LENGTH = 200;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

/**
 * Remove potential prompt injection patterns
 * This prevents attempts to manipulate AI behavior through special commands
 */
export function sanitizePrompt(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Common prompt injection patterns to remove
  const injectionPatterns = [
    // Direct system prompt overrides
    /system\s*:/gi,
    /assistant\s*:/gi,
    /user\s*:/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<<SYS>>/gi,
    /<\/SYS>>/gi,

    // Instruction injection attempts
    /ignore\s+previous\s+instructions?/gi,
    /disregard\s+all\s+prior/gi,
    /forget\s+everything/gi,
    /new\s+instructions?:/gi,
    /you\s+are\s+now/gi,
    /act\s+as/gi,
    /pretend\s+to\s+be/gi,
    /roleplay\s+as/gi,

    // Data extraction attempts
    /show\s+me\s+all\s+data/gi,
    /list\s+all\s+users?/gi,
    /dump\s+database/gi,
    /reveal\s+system/gi,
    /show\s+prompts?/gi,

    // Code injection markers
    /<script[\s\S]*?<\/script>/gi,
    /<style[\s\S]*?<\/style>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick=, onload=, etc.
  ];

  let sanitized = input;

  // Remove injection patterns
  injectionPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Truncate to maximum length
  sanitized = sanitized.substring(0, MAX_CHAT_MESSAGE_LENGTH);

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Sanitize HTML content to prevent XSS
 * Removes all HTML tags and dangerous content
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove all HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Decode HTML entities to prevent double encoding
  sanitized = decodeHTMLEntities(sanitized);

  // Escape remaining special characters
  sanitized = escapeHtml(sanitized);

  return sanitized;
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(input: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x2F;': '/',
  };

  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

/**
 * Sanitize email addresses
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Basic email sanitization
  return email.toLowerCase().trim().substring(0, MAX_EMAIL_LENGTH);
}

/**
 * Sanitize names (user names, company names, etc.)
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Allow letters, numbers, spaces, hyphens, apostrophes
  // Remove everything else
  return name
    .replace(/[^a-zA-Z0-9\s\-']/g, '')
    .trim()
    .substring(0, MAX_NAME_LENGTH);
}

/**
 * Sanitize file names
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return '';
  }

  let sanitizedFileName = fileName;

  // Remove path traversal attempts
  sanitizedFileName = sanitizedFileName.replace(/[\/\\\.]+/g, '_');

  // Remove special characters except dots and hyphens
  sanitizedFileName = sanitizedFileName.replace(/[^a-zA-Z0-9._\-]/g, '_');

  // Ensure it doesn't start with a dot (hidden files)
  if (sanitizedFileName.startsWith('.')) {
    sanitizedFileName = `_${sanitizedFileName.substring(1)}`;
  }

  return sanitizedFileName.substring(0, 255);
}

/**
 * Sanitize URLs
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);

    // Only allow http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    // Reconstruct URL to ensure it's properly formatted
    return parsed.toString();
  } catch {
    // Invalid URL
    return '';
  }
}

/**
 * Create a sanitized chat message schema
 */
export const sanitizedChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().transform(sanitizePrompt),
  id: z.string().optional(),
  createdAt: z.date().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().transform(sanitizeFileName),
        contentType: z.string(),
        url: z.string().transform(sanitizeUrl),
      }),
    )
    .optional(),
});

/**
 * Sanitize an entire chat message
 */
export function sanitizeChatMessage(
  message: unknown,
): z.infer<typeof sanitizedChatMessageSchema> {
  return sanitizedChatMessageSchema.parse(message);
}

/**
 * Create a title from sanitized content
 */
export function sanitizeTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return '';
  }

  return sanitizeHtml(title).substring(0, MAX_TITLE_LENGTH).trim();
}

/**
 * Sanitize JSON data to prevent injection
 */
export function sanitizeJson(data: unknown): unknown {
  if (typeof data === 'string') {
    return sanitizeHtml(data);
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeJson);
  }

  if (data && typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Sanitize keys as well
      const sanitizedKey = sanitizeName(key);
      sanitized[sanitizedKey] = sanitizeJson(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Validate and sanitize API request body
 */
export function sanitizeApiRequest<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): z.infer<T> {
  // First sanitize any string fields
  const sanitized = sanitizeJson(data);

  // Then validate with schema
  return schema.parse(sanitized);
}
