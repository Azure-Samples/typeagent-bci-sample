/**
 * OpenAI Integration Utility Module
 * Provides functionality to interact with Azure OpenAI services for BCI-aware AI responses.
 * This module handles API communication, retry logic, and response processing
 * while maintaining proper error handling and logging.
 */

import fetch, { Response } from 'node-fetch';

/**
 * Represents a message in the OpenAI chat completion format
 * @property role - The role of the message sender ('system', 'user', or 'assistant')
 * @property content - The actual content of the message
 */
type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * Simplified OpenAI response structure for internal use
 * @property id - Unique identifier for the response
 * @property choices - Array of possible completions
 */
interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Complete OpenAI API response structure
 * @property id - Unique identifier for the API response
 * @property object - Type of object returned
 * @property created - Timestamp of response creation
 * @property model - Model used for completion
 * @property choices - Array of completion choices with metadata
 */
interface OpenAIAPIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

/**
 * DALL-E API response structure for image generation
 * @property created - Timestamp of response creation
 * @property data - Array of generated images
 */
interface DALLEAPIResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}

type FetchResponse = Response;

/**
 * Makes an API call to Azure OpenAI for chat completion
 * 
 * @param messages - Array of messages to send to OpenAI
 * @returns Promise resolving to a simplified OpenAI response
 * @throws Error if API key is missing, API call fails, or max retries are reached
 * 
 * The function includes:
 * - Environment variable validation and cleaning
 * - Comprehensive error logging
 * - Automatic retry logic with exponential backoff
 * - Response validation and transformation
 */
export async function callOpenAI(messages: OpenAIMessage[]): Promise<OpenAIResponse> {
  const apiKey = process.env.spn_4o_AZURE_CLIENT_SECRET;
  
  // Clean and validate environment variables
  const rawEndpoint = process.env.spn_4o_azure_endpoint || '';
  const endpoint = rawEndpoint
    .replace(/\/+$/, '')
    .replace('https://gk-oai.openai.azure.com', 'https://gk-oai-4.openai.azure.com');
  const model = process.env.spn_4o_model || 'gpt-4o';
  const apiVersion = process.env.spn_4o_api_version || '2024-02-15-preview';

  // Log configuration for debugging
  console.log('OpenAI Configuration:', {
    rawEndpoint,
    cleanedEndpoint: endpoint,
    model,
    apiVersion,
    hasApiKey: !!apiKey
  });

  // Validate API key
  if (!apiKey) {
    throw new Error('Missing required OpenAI API key');
  }

  // Log environment state for debugging
  console.log('Environment variables:', {
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    MODEL_NAME: process.env.MODEL_NAME,
    API_VERSION: process.env.spn_4o_api_version,
    hasApiKey: !!apiKey
  });

  console.log('OpenAI Configuration:', {
    endpoint,
    model,
    apiVersion,
    hasApiKey: !!apiKey,
    envEndpoint: process.env.spn_4o_azure_endpoint,
    envModel: process.env.spn_4o_model,
    envApiVersion: process.env.spn_4o_api_version
  });

  // Configure retry parameters
  const maxRetries = 3;
  let retryCount = 0;

  // Validate configuration
  if (!apiKey) {
    throw new Error('Missing required OpenAI configuration');
  }

  // Construct API endpoint URL
  const url = `${endpoint}/openai/deployments/${model}/chat/completions?api-version=${apiVersion}`;
  
  console.log('OpenAI Request:', {
    url,
    messageCount: messages.length,
    hasApiKey: !!apiKey
  });

  try {
    let lastError: Error | null = null;
    let response: FetchResponse | null = null;

    // Implement retry loop with exponential backoff
    while (retryCount < maxRetries) {
      try {
        console.log(`Attempt ${retryCount + 1} of ${maxRetries}`);
        
        // Make API request
        const fetchResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey
          },
          body: JSON.stringify({
            messages,
            temperature: 0.7,
            max_tokens: 800
          })
        });
        response = fetchResponse;

        // Handle non-200 responses
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('OpenAI API error:', {
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            error: errorText
          });
          throw new Error(`OpenAI API error: ${fetchResponse.statusText}`);
        }

        // Parse and validate response
        const data = await fetchResponse.json() as OpenAIAPIResponse;
        console.log('OpenAI Response:', data);

        // Transform to simplified response format
        return {
          id: data.id,
          choices: data.choices.map(choice => ({
            message: {
              content: choice.message?.content || ''
            }
          }))
        };
      } catch (error) {
        // Handle retry logic
        lastError = error as Error;
        retryCount++;
        if (retryCount === maxRetries) {
          console.error('Max retries reached:', lastError);
          throw lastError;
        }
        console.log(`Retrying... (${retryCount}/${maxRetries})`);
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    throw new Error('Failed to call OpenAI API after all retries');
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error('Failed to call OpenAI API');
  }
}

/**
 * Makes an API call to Azure OpenAI DALL-E for image generation
 * 
 * @param prompt - The text prompt for image generation
 * @returns Promise resolving to a DALL-E API response
 * @throws Error if API key is missing, API call fails, or max retries are reached
 * 
 * The function includes:
 * - Environment variable validation using provided Azure OpenAI credentials
 * - Comprehensive error logging
 * - Automatic retry logic with exponential backoff
 * - Response validation and transformation
 */
export async function callDALLE(prompt: string): Promise<DALLEAPIResponse> {
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/+$/, '') || '';
  const apiVersion = process.env.API_VERSION || '2024-02-15-preview';

  // Log configuration for debugging
  console.log('DALL-E Configuration:', {
    endpoint,
    apiVersion,
    hasApiKey: !!apiKey,
    promptLength: prompt.length
  });

  // Validate API key and endpoint
  if (!apiKey || !endpoint) {
    throw new Error('Missing required Azure OpenAI configuration for DALL-E');
  }

  // Configure retry parameters
  const maxRetries = 3;
  let retryCount = 0;

  // Construct DALL-E API endpoint URL
  const url = `${endpoint}/openai/deployments/dall-e-3/images/generations?api-version=${apiVersion}`;
  
  console.log('DALL-E Request:', {
    url,
    hasApiKey: !!apiKey,
    promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
  });

  try {
    let lastError: Error | null = null;
    let response: FetchResponse | null = null;

    // Implement retry loop with exponential backoff
    while (retryCount < maxRetries) {
      try {
        console.log(`DALL-E Attempt ${retryCount + 1} of ${maxRetries}`);
        
        // Make API request
        const fetchResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey
          },
          body: JSON.stringify({
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            style: "natural"
          })
        });
        response = fetchResponse;

        // Handle non-200 responses
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('DALL-E API error:', {
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            error: errorText
          });
          throw new Error(`DALL-E API error: ${fetchResponse.status} ${fetchResponse.statusText}`);
        }

        // Parse and validate response
        const data = await fetchResponse.json() as DALLEAPIResponse;
        console.log('DALL-E Response:', {
          created: data.created,
          imageCount: data.data?.length || 0,
          hasUrl: !!(data.data?.[0]?.url)
        });

        return data;
      } catch (error) {
        // Handle retry logic
        lastError = error as Error;
        retryCount++;
        if (retryCount === maxRetries) {
          console.error('DALL-E Max retries reached:', lastError);
          throw lastError;
        }
        console.log(`DALL-E Retrying... (${retryCount}/${maxRetries})`);
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    throw new Error('Failed to call DALL-E API after all retries');
  } catch (error) {
    console.error('Error calling DALL-E:', error);
    throw new Error('Failed to call DALL-E API');
  }
}
