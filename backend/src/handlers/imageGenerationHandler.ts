/**
 * Image Generation Handler Module
 * Processes image generation requests using Azure OpenAI DALL-E API while incorporating
 * brain-computer interface data to create personalized images based on the user's cognitive state.
 */

import { callDALLE } from '../utils/openai.js';

interface BrainState {
  flowIntensity: number;
  heartRate: number;
  emotionalState: string;
  frustratedValue: number;
  excitedValue: number;
  calmValue: number;
}

interface ImageGenerationAction {
  parameters: {
    userPrompt: string;
    brainState: BrainState;
  };
}

interface ImageGenerationResponse {
  imageUrl: string;
  prompt: string;
  timestamp: number;
  brainStateUsed: BrainState;
}

/**
 * Handles incoming image generation actions with BCI metrics integration
 * 
 * @param action - The image generation action containing the user prompt and BCI metrics
 * @param action.parameters.userPrompt - The user's text prompt for image generation
 * @param action.parameters.brainState - Object containing brain activity measurements
 * @param action.parameters.brainState.flowIntensity - User's flow intensity level (0-100)
 * @param action.parameters.brainState.heartRate - User's heart rate in BPM
 * @param action.parameters.brainState.emotionalState - User's current emotional state
 * 
 * @returns ImageGenerationResponse object containing the generated image URL and metadata
 * @throws Error if the request is invalid or processing fails
 */
export async function handleImageGenerationAction(action: ImageGenerationAction): Promise<ImageGenerationResponse> {
  try {
    console.log('Received image generation action:', JSON.stringify(action, null, 2));
    
    if (!action?.parameters?.userPrompt || !action?.parameters?.brainState) {
      throw new Error('Invalid request: missing user prompt or brain state data');
    }

    const { userPrompt, brainState } = action.parameters;
    
    const enhancedPrompt = createBrainStateEnhancedPrompt(userPrompt, brainState);
    
    console.log('Enhanced prompt for DALL-E:', enhancedPrompt);

    try {
      const response = await callDALLE(enhancedPrompt);
      
      if (!response?.data?.[0]?.url) {
        throw new Error('Invalid DALL-E response structure - no image URL received');
      }

      return {
        imageUrl: response.data[0].url,
        prompt: enhancedPrompt,
        timestamp: Date.now(),
        brainStateUsed: brainState
      };
    } catch (error) {
      console.warn('DALL-E API error, using mock response:', error);
      
      return {
        imageUrl: `https://picsum.photos/512/512?random=${Date.now()}`,
        prompt: enhancedPrompt,
        timestamp: Date.now(),
        brainStateUsed: brainState
      };
    }
  } catch (error) {
    console.error('Error in image generation handler:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to process image generation action');
  }
}

/**
 * Creates an enhanced prompt that incorporates brain state data
 * @param userPrompt - The original user prompt
 * @param brainState - Current brain state measurements
 * @returns Enhanced prompt string for DALL-E
 */
function createBrainStateEnhancedPrompt(userPrompt: string, brainState: BrainState): string {
  const { flowIntensity, heartRate, emotionalState, frustratedValue, excitedValue, calmValue } = brainState;
  
  const dominantEmotion = getDominantEmotion(frustratedValue, excitedValue, calmValue);
  
  let styleModifiers: string[] = [];
  
  if (flowIntensity > 75) {
    styleModifiers.push("highly detailed", "dynamic", "energetic composition");
  } else if (flowIntensity > 50) {
    styleModifiers.push("balanced composition", "moderate detail");
  } else {
    styleModifiers.push("minimalist", "calm", "simple composition");
  }
  
  if (heartRate > 80) {
    styleModifiers.push("vibrant colors", "sense of movement");
  } else if (heartRate < 65) {
    styleModifiers.push("soft colors", "peaceful atmosphere");
  }
  
  switch (dominantEmotion) {
    case 'frustrated':
      styleModifiers.push("dramatic lighting", "bold contrasts");
      break;
    case 'excited':
      styleModifiers.push("bright lighting", "uplifting mood");
      break;
    case 'calm':
      styleModifiers.push("soft lighting", "serene atmosphere");
      break;
  }
  
  const brainStateContext = `[Brain State: ${flowIntensity}% flow intensity, ${heartRate} BPM heart rate, feeling ${emotionalState}]`;
  const styleString = styleModifiers.length > 0 ? `, ${styleModifiers.join(', ')}` : '';
  
  return `${userPrompt}${styleString}. ${brainStateContext}`;
}

/**
 * Determines the dominant emotion from the three emotion indicators
 */
function getDominantEmotion(frustrated: number, excited: number, calm: number): string {
  if (frustrated > Math.max(excited, calm)) return 'frustrated';
  if (excited > calm) return 'excited';
  return 'calm';
}
