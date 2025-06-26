/**
 * Main entry point for the TypeAgent BCI Sample Backend
 * This Express server provides various AI-powered endpoints for brain-computer interface interactions,
 * including chat, data analysis, report generation, mindfulness meditation, and task automation.
 */

import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleChatAction } from './handlers/chatHandler.js';
import { handleDataAnalysisAction } from './handlers/dataAnalysisHandler.js';
import { handleReportGeneratorAction } from './handlers/reportGeneratorHandler.js';
import { handleMindfulnessMeditationAction } from './handlers/mindfulnessMeditationHandler.js';
import { handleTaskAutomationAction } from './handlers/taskAutomationHandler.js';
import { handleImageGenerationAction } from './handlers/imageGenerationHandler.js';
import { getMostRecentDocument, getFlowIntensityData } from './utils/cosmosdb.js';

// Convert ESM module paths to filesystem paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configure Azure OpenAI credentials from environment variables
process.env.AZURE_OPENAI_KEY = process.env.spn_4o_AZURE_CLIENT_SECRET;

// Log important configuration details for debugging
console.log('Environment variables loaded:', {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  model: process.env.MODEL_NAME,
  port: process.env.PORT
});

// Initialize Express application
const app = express();

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:4517', // Your Vite frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Required for credentials mode 'include'
};

// Apply CORS middleware before your routes
app.use(cors(corsOptions));

// Middleware setup
app.use(express.json());  // Parse JSON request bodies

/**
 * Chat Endpoint
 * Handles natural language interactions with the BCI system
 * POST /api/chat
 * Request body: { message: string, context?: any }
 * Response: { response: string }
 */
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const response = await handleChatAction(req.body);
    res.json(response);
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process chat request',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * Data Analysis Endpoint
 * Processes and analyzes BCI data streams
 * POST /api/data-analysis
 * Request body: { data: any[], parameters?: object }
 * Response: { analysis: object }
 */
app.post('/api/data-analysis', async (req: Request, res: Response) => {
  try {
    const response = await handleDataAnalysisAction(req.body);
    res.json(response);
  } catch (error) {
    console.error('Data analysis endpoint error:', error);
    res.status(500).json({ error: 'Failed to process data analysis request' });
  }
});

/**
 * Report Generator Endpoint
 * Generates detailed reports from BCI data and analysis
 * POST /api/report
 * Request body: { data: any, template?: string }
 * Response: { report: object }
 */
app.post('/api/report', async (req: Request, res: Response) => {
  try {
    const response = await handleReportGeneratorAction(req.body);
    res.json(response);
  } catch (error) {
    console.error('Report generator endpoint error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * Mindfulness Meditation Endpoint
 * Handles meditation sessions with BCI feedback
 * POST /api/meditation
 * Request body: { duration: number, type: string }
 * Response: { session: object }
 */
app.post('/api/meditation', async (req: Request, res: Response) => {
  try {
    const response = await handleMindfulnessMeditationAction(req.body);
    res.json(response);
  } catch (error) {
    console.error('Meditation endpoint error:', error);
    res.status(500).json({ error: 'Failed to process meditation request' });
  }
});

/**
 * Task Automation Endpoint
 * Manages automated tasks based on BCI inputs
 * POST /api/task
 * Request body: { task: string, parameters: object }
 * Response: { result: object }
 */
app.post('/api/task', async (req: Request, res: Response) => {
  try {
    const response = await handleTaskAutomationAction(req.body);
    res.json(response);
  } catch (error) {
    console.error('Task automation endpoint error:', error);
    res.status(500).json({ error: 'Failed to process task request' });
  }
});

/**
 * Image Generation Endpoint
 * Generates AI images based on brain state and user prompts using Azure OpenAI DALL-E
 * POST /api/image-generation
 * Request body: { parameters: { userPrompt: string, brainState: BrainState } }
 * Response: { imageUrl: string, prompt: string, timestamp: number, brainStateUsed: BrainState }
 */
app.post('/api/image-generation', async (req: Request, res: Response) => {
  try {
    const response = await handleImageGenerationAction(req.body);
    res.json(response);
  } catch (error) {
    console.error('Image generation endpoint error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process image generation request',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * Get Most Recent Record Endpoint
 * Retrieves the most recent record for a specific user from Cosmos DB
 * POST /api/getMostRecentRecord
 * Request body: none
 * Response: { record: object } or { message: string } if no record found
 */
app.post('/api/getMostRecentRecord', async (req: Request, res: Response) => {
  try {
    //6GUfarBavscMlw8M6EKS4wEVgx03, A6BC96AF-E53F-4C57-8D5A-88F1D7BCB1AD
    const userId = "6GUfarBavscMlw8M6EKS4wEVgx03";
    const document = await getMostRecentDocument(userId);
    
    if (document) {
      res.json(document);
    } else {
      res.status(404).json({ message: "No records found" });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Failed to fetch record" });
  }
});

/**
 * Get Flow Intensity Data Endpoint
 * Retrieves the flow intensity data for a specific user from Cosmos DB
 * POST /api/getFlowIntensityData
 * Request body: { days: number }
 * Response: { record: object } or { message: string } if no record found
 */
app.post('/api/getFlowIntensityData', (async (req: Request, res: Response) => {
  try {
    //6GUfarBavscMlw8M6EKS4wEVgx03, A6BC96AF-E53F-4C57-8D5A-88F1D7BCB1AD
    const userId = "6GUfarBavscMlw8M6EKS4wEVgx03";
    const { days } = req.body;

    if (!userId || !days) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    const records = await getFlowIntensityData(userId, days);
    if (records){
      res.json(records);
    } else {
      res.status(404).json({ message: "No records found" });
    }
  } catch (error) {
    console.error('Error fetching flow intensity data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}) as RequestHandler);

/**
 * Get Azure Maps Service Token Endpoint
 * Provides a token for secure access to Azure Maps services
 * GET /api/getAzureMapsToken
 * Request body: none
 * Response: { token: string }
 */
app.get('/api/getAzureMapsToken', (async (req: Request, res: Response) => {
  try {
    const azureMapsToken = process.env.AZURE_MAPS_SUBSCRIPTION_KEY;

    if (!azureMapsToken) {
      return res.status(500).json({ error: 'Azure Maps subscription key is not configured' });
    }

    res.json({ token: azureMapsToken });
  } catch (error) {
    console.error('Error generating Azure Maps token:', error);
    res.status(500).json({ error: 'Failed to generate Azure Maps token' });
  }
}) as RequestHandler);

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
