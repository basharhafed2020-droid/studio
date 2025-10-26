'use server';

import { generatePromptFromImage } from '@/ai/flows/generate-prompt-from-image';

export async function runGeneratePrompt(photoDataUri: string): Promise<{ prompt?: string; error?: string }> {
  if (!photoDataUri) {
    return { error: 'No image data provided.' };
  }

  try {
    const result = await generatePromptFromImage({ photoDataUri });
    if (result.prompt) {
      return { prompt: result.prompt };
    } else {
      return { error: 'Failed to generate prompt. The result was empty.' };
    }
  } catch (error) {
    console.error('AI prompt generation failed:', error);
    // Check for specific error messages if possible, otherwise return a generic one.
    if (error instanceof Error && error.message.includes('400 Bad Request')) {
        return { error: 'The uploaded image could not be processed. It might be too large or in an unsupported format.' };
    }
    return { error: 'An unexpected error occurred while generating the prompt.' };
  }
}
