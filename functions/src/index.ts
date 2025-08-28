import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();
const auth = admin.auth();

// Initialize Gemini AI with the API key from environment
const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || ""
);

// Set global options for cost control
setGlobalOptions({ 
  maxInstances: 10,
  region: "us-central1" 
});

// ==========================================
// User Management Functions
// ==========================================

export const onUserCreated = onDocumentCreated("users/{userId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  
  const userData = snapshot.data();
  const userId = event.params.userId;
  
  // User profile created
  
  // Create initial welcome chat
  try {
    await db.collection("chats").add({
      userId,
      companyId: userData.companyId || "demo",
      messages: [{
        role: "assistant",
        content: "Welcome to your Benefits Assistant! I'm here to help you understand and manage your employee benefits. How can I help you today?",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      }],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Error creating welcome chat
  }
});

// ==========================================
// Document Processing Functions
// ==========================================

export const processUploadedDocument = onObjectFinalized(async (event) => {
  const object = event.data;
  const filePath = object.name;
  const contentType = object.contentType;
  
  if (!filePath || !contentType) return;
  
  // Only process PDFs and text documents
  if (!contentType.includes("pdf") && !contentType.includes("text")) {
    // Skipping non-document file
    return;
  }

  // Processing document
  
  try {
    const bucket = storage.bucket(object.bucket);
    const file = bucket.file(filePath);
    
    // Download the file
    const [fileBuffer] = await file.download();
    let content = "";
    
    // Extract text based on content type
    if (contentType.includes("text")) {
      content = fileBuffer.toString("utf-8");
    } else if (contentType.includes("pdf")) {
      // Simple PDF text extraction
      try {
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(fileBuffer);
        content = pdfData.text;
        // Extracted text from PDF
      } catch (pdfError) {
        // PDF parsing failed
        content = `[PDF parsing failed for ${filePath}]`;
      }
    }
    
    // Extract company ID from file path
    const pathParts = filePath.split("/");
    const companyId = pathParts[1] || "demo";
    const documentId = pathParts[pathParts.length - 1].split(".")[0];
    
    // Process the document into chunks
    const chunks = chunkDocument(content, 1000);
    
    // Store chunks in Firestore with basic text search
    const batch = db.batch();
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // For now, store without embeddings (we'll add vector search later)
      const chunkRef = db.collection("document_chunks").doc();
      batch.set(chunkRef, {
        documentId,
        companyId,
        content: chunk,
        chunkIndex: i,
        searchableText: chunk.toLowerCase(), // For basic text search
        metadata: {
          fileName: filePath.split("/").pop(),
          uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
          contentType,
          totalChunks: chunks.length,
        }
      });
    }
    
    await batch.commit();
    
    // Document processed
  } catch (error) {
    // Error processing document
  }
});

// Helper function to chunk documents
function chunkDocument(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/);
  let currentChunk = "";
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += " " + sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

// ==========================================
// Chat & AI Functions
// ==========================================

export const searchDocuments = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  
  const { query, companyId } = request.data;
  
  if (!query || !companyId) {
    throw new HttpsError("invalid-argument", "Query and companyId are required");
  }
  
  // Searching documents
  
  try {
    // For now, use basic text search (later we'll add vector search)
    const searchTerms = query.toLowerCase().split(" ");
    
    // Search for documents containing any of the search terms
    const chunks = await db.collection("document_chunks")
      .where("companyId", "==", companyId)
      .limit(100)
      .get();
    
    // Score documents based on term matches
    const results = chunks.docs.map(doc => {
      const data = doc.data();
      const content = data.searchableText || data.content.toLowerCase();
      
      // Calculate relevance score
      let score = 0;
      for (const term of searchTerms) {
        if (content.includes(term)) {
          score += (content.match(new RegExp(term, "g")) || []).length;
        }
      }
      
      return {
        id: doc.id,
        content: data.content,
        metadata: data.metadata,
        score
      };
    });
    
    // Sort by relevance and return top 5
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5).filter(r => r.score > 0);
    
  } catch (error) {
    // Error searching documents
    throw new HttpsError("internal", "Failed to search documents");
  }
});

export const chatWithAI = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  
  const { message, chatId, companyId } = request.data;
  
  if (!message) {
    throw new HttpsError("invalid-argument", "Message is required");
  }
  
  // Processing AI chat request
  
  try {
    // Search for relevant documents using a simple query
    let searchResults: any[] = [];
    try {
      const searchTerms = message.toLowerCase().split(" ");
      const chunks = await db.collection("document_chunks")
        .where("companyId", "==", companyId || "demo")
        .limit(20)
        .get();
      
      searchResults = chunks.docs.map(doc => {
        const data = doc.data();
        const content = (data.searchableText || data.content || "").toLowerCase();
        let score = 0;
        for (const term of searchTerms) {
          if (content.includes(term)) {
            score += (content.match(new RegExp(term, "g")) || []).length;
          }
        }
        return { content: data.content, metadata: data.metadata, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    } catch (err) {
      // Search failed, continuing without context
    }
    
    // Build context from search results
    let context = "";
    if (searchResults.length > 0) {
      context = "Relevant information from company documents:\n";
      searchResults.forEach((result: any, index: number) => {
        context += `${index + 1}. ${result.content}\n`;
      });
    }
    
    // Use Gemini to generate response
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are a helpful Benefits Assistant AI. 
    ${context ? `Use this context to answer: ${context}` : ""}
    
    User question: ${message}
    
    Provide a helpful, accurate response about employee benefits. If you don't have specific information, provide general guidance.`;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Save to chat history if chatId provided
    if (chatId) {
      await db.collection("chats").doc(chatId).update({
        messages: admin.firestore.FieldValue.arrayUnion({
          role: "user",
          content: message,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        }, {
          role: "assistant",
          content: response,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        }),
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    return { response, context: searchResults };
    
  } catch (error) {
    // Error in AI chat
    throw new HttpsError("internal", "Failed to process chat request");
  }
});

// ==========================================
// Admin Functions
// ==========================================

export const setUserRole = onCall(async (request) => {
  // Check if user is admin
  const userRecord = await auth.getUser(request.auth?.uid || "");
  const claims = userRecord.customClaims || {};
  
  if (!claims.admin && !claims.super_admin) {
    throw new HttpsError("permission-denied", "Only admins can set user roles");
  }
  
  const { userId, role, companyId } = request.data;
  
  try {
    // Update custom claims
    await auth.setCustomUserClaims(userId, { role, companyId });
    
    // Update Firestore
    await db.collection("users").doc(userId).update({
      role,
      companyId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // User role updated
    return { success: true };
  } catch (error) {
    // Error setting user role
    throw new HttpsError("internal", "Failed to set user role");
  }
});

export const createCompany = onCall(async (request) => {
  // Check if user is super admin
  const userRecord = await auth.getUser(request.auth?.uid || "");
  const claims = userRecord.customClaims || {};
  
  if (!claims.super_admin) {
    throw new HttpsError("permission-denied", "Only super admins can create companies");
  }
  
  const { name, domain, adminEmail } = request.data;
  
  try {
    // Create company document
    const companyRef = await db.collection("companies").add({
      name,
      domain,
      adminEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth?.uid,
      status: "active",
      settings: {
        maxUsers: 100,
        maxDocuments: 1000,
        features: ["chat", "documents", "analytics"],
      }
    });
    
    // Create default benefit plans
    const batch = db.batch();
    const defaultPlans = [
      { name: "Basic Health", type: "health", premium: 500, deductible: 2000 },
      { name: "Premium Health", type: "health", premium: 800, deductible: 1000 },
      { name: "Dental", type: "dental", premium: 50, annualMax: 2000 },
      { name: "Vision", type: "vision", premium: 25, annualMax: 500 },
    ];
    
    for (const plan of defaultPlans) {
      const planRef = companyRef.collection("benefitPlans").doc();
      batch.set(planRef, {
        ...plan,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    await batch.commit();
    
    // Company created
    return { companyId: companyRef.id, success: true };
  } catch (error) {
    // Error creating company
    throw new HttpsError("internal", "Failed to create company");
  }
});

// ==========================================
// Analytics Functions
// ==========================================

export const getCompanyStats = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  
  const userRecord = await auth.getUser(request.auth.uid);
  const claims = userRecord.customClaims || {};
  const companyId = request.data.companyId || claims.companyId;
  
  if (!companyId) {
    throw new HttpsError("invalid-argument", "Company ID is required");
  }
  
  try {
    // Get user count
    const users = await db.collection("users")
      .where("companyId", "==", companyId)
      .get();
    
    // Get document count
    const documents = await db.collection("document_chunks")
      .where("companyId", "==", companyId)
      .get();
    
    // Get chat count for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const chats = await db.collection("chats")
      .where("companyId", "==", companyId)
      .where("createdAt", ">=", startOfMonth)
      .get();
    
    return {
      totalUsers: users.size,
      totalDocuments: documents.size,
      monthlyChats: chats.size,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    // Error getting company stats
    throw new HttpsError("internal", "Failed to get company stats");
  }
});

// ==========================================
// Scheduled Functions
// ==========================================

export const cleanupOldChats = onSchedule("every 24 hours", async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  try {
    const oldChats = await db.collection("chats")
      .where("lastActivity", "<", thirtyDaysAgo)
      .limit(100)
      .get();
    
    const batch = db.batch();
    oldChats.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    // Cleaned up old chats
  } catch (error) {
    // Error cleaning up old chats
  }
});