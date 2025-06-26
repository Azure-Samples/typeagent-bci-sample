/**
 * Image Generation Schema
 * Defines TypeScript interfaces and types for image generation API requests and responses
 */

export interface BrainState {
  flowIntensity: number;
  heartRate: number;
  emotionalState: string;
  frustratedValue: number;
  excitedValue: number;
  calmValue: number;
}

export interface ImageGenerationAction {
  parameters: {
    userPrompt: string;
    brainState: BrainState;
  };
}

export interface ImageGenerationResponse {
  imageUrl: string;
  prompt: string;
  timestamp: number;
  brainStateUsed: BrainState;
}

export interface ImageGenerationRequest {
  userPrompt: string;
  brainState: BrainState;
}

export interface ImageGenerationError {
  error: string;
  timestamp: number;
  details?: string;
}

export function isBrainState(obj: any): obj is BrainState {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.flowIntensity === 'number' &&
    typeof obj.heartRate === 'number' &&
    typeof obj.emotionalState === 'string' &&
    typeof obj.frustratedValue === 'number' &&
    typeof obj.excitedValue === 'number' &&
    typeof obj.calmValue === 'number'
  );
}

export function isImageGenerationAction(obj: any): obj is ImageGenerationAction {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.parameters === 'object' &&
    obj.parameters !== null &&
    typeof obj.parameters.userPrompt === 'string' &&
    isBrainState(obj.parameters.brainState)
  );
}

export function isImageGenerationRequest(obj: any): obj is ImageGenerationRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.userPrompt === 'string' &&
    isBrainState(obj.brainState)
  );
}
