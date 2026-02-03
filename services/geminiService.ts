import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { AXIOM_SYSTEM_INSTRUCTION } from "../constants";
import { UserProfile } from "../types";

// --- KEY ROTATION SYSTEM ---
// We load up to 10 keys. The first one is the primary process.env.API_KEY.
// The others are looked up as API_KEY_2, API_KEY_3, etc.
const ALL_KEYS = [
  process.env.API_KEY,
  process.env.API_KEY_2,
  process.env.API_KEY_3,
  process.env.API_KEY_4,
  process.env.API_KEY_5,
  process.env.API_KEY_6,
  process.env.API_KEY_7,
  process.env.API_KEY_8,
  process.env.API_KEY_9,
  process.env.API_KEY_10,
].filter((key): key is string => !!key && key.length > 0);

let currentKeyIndex = 0;
let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  if (ALL_KEYS.length === 0) {
     throw new Error("No API Keys found in environment variables.");
  }

  if (!genAI) {
    const apiKey = ALL_KEYS[currentKeyIndex];
    console.log(`[Axiom] Initializing with API Key Index: ${currentKeyIndex} (Total Keys: ${ALL_KEYS.length})`);
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

// Switches to the next key in the list and resets the client
const rotateApiKey = () => {
  if (ALL_KEYS.length <= 1) {
    console.warn("[Axiom] Only 1 API Key available. Cannot rotate.");
    return false;
  }

  currentKeyIndex = (currentKeyIndex + 1) % ALL_KEYS.length;
  console.warn(`[Axiom] ⚠️ Quota exhaustion detected. Rotating to API Key Index: ${currentKeyIndex}`);
  
  // Destroy old client and session
  genAI = null;
  chatSession = null;
  
  return true;
};

// Check if error is a quota/rate limit error (429 or 503)
const isRetryableError = (error: any): boolean => {
  const msg = error?.toString().toLowerCase() || "";
  return msg.includes("429") || msg.includes("503") || msg.includes("quota") || msg.includes("resource exhausted");
};

// Reset the session (useful when switching subjects)
export const resetSession = () => {
  chatSession = null;
};

// Check if a course is valid (With Retry Logic)
export const validateCourse = async (courseName: string): Promise<boolean> => {
  let attempt = 0;
  const maxAttempts = ALL_KEYS.length;

  while (attempt < maxAttempts) {
    try {
      const ai = getClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Is "${courseName}" a valid, real-world educational subject, field of study, or learnable skill? 
        Examples of YES: "Math", "Fortnite Strategy", "Piano", "Ancient History".
        Examples of NO: "asdf", "Eating Dirt", "Being a potato", "Walking on the sun".
        Answer strictly with YES or NO.`,
      });
      const text = response.text;
      return text?.trim().toUpperCase().includes("YES") ?? false;

    } catch (e) {
      console.error(`[Axiom] Validation failed on key ${currentKeyIndex}:`, e);
      if (isRetryableError(e) && rotateApiKey()) {
        attempt++;
        continue; // Retry loop with new key
      }
      return false; // Other error or no keys left
    }
  }
  return false;
};

// Start a chat session with User Context
export const startChatSession = async (userProfile?: UserProfile): Promise<Chat> => {
  const ai = getClient();
  
  // Personalize the instruction if profile exists
  let personalizedInstruction = AXIOM_SYSTEM_INSTRUCTION;
  if (userProfile) {
    personalizedInstruction += `
    \nYou are currently talking to a student named ${userProfile.name}.
    They are ${userProfile.age} years old and in Grade ${userProfile.grade}.
    Their main focus subject today is ${userProfile.focusSubject}.
    Adjust your examples to be relevant to a Grade ${userProfile.grade} student.
    \n**REMINDER: DO NOT use LaTeX. Use simple plain text for math formulas.**
    `;
  }

  chatSession = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: personalizedInstruction,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return chatSession;
};

// Send message and get a stream (With Retry Logic)
export async function* sendMessageStream(message: string, userProfile?: UserProfile): AsyncGenerator<string, void, unknown> {
  let attempt = 0;
  // We try as many times as we have keys to ensure maximum uptime
  const maxAttempts = ALL_KEYS.length; 

  while (attempt < maxAttempts) {
    try {
      // 1. Ensure we have a valid session (using current key)
      if (!chatSession) {
        await startChatSession(userProfile);
      }

      if (!chatSession) {
         throw new Error("Failed to initialize chat session");
      }

      // 2. Attempt the stream
      const resultStream = await chatSession.sendMessageStream({ message });
      
      // 3. Yield results
      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          yield c.text;
        }
      }
      
      // If we finish the stream successfully, we exit the retry loop
      return;

    } catch (error) {
      console.error(`[Axiom] Chat error on key ${currentKeyIndex}:`, error);

      // 4. Handle Quota Errors
      if (isRetryableError(error)) {
        if (rotateApiKey()) {
          attempt++;
          // Important: We yield a small invisible pause or debug message if needed, 
          // but mainly we just loop back. 
          // Note: Since chatSession is reset by rotateApiKey, the next loop
          // will call startChatSession() again. 
          // Limitation: Short-term conversation history in the Model Context 
          // is reset when switching keys in this implementation.
          continue; 
        }
      }

      // If non-retriable or no keys left:
      yield "⚠️ Connectivity disruption (Quota Exhausted). My logic circuits are overloaded. Please try again in a moment.";
      return;
    }
  }
}