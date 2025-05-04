# 🧠 Brain-Adaptive Agent Sample powered by TypeAgent and fNIRS device

This repository is a work in progress demonstration showcasing how AI Agents can be personalized using Brain Computer Interfaces (BCI).

The goal of this project is to explore how brain signals (fNIRS) can be used to customize and enhance interactions with AI Agents, creating a more personalized and intuitive experience. 

It is powered by [TypeAgent](https://github.com/microsoft/TypeAgent) and [Azure AI Foundry](https://ai.azure.com/), and uses the [BlueberryX BCI Device](https://blueberryx.com/) to collect fNIRS response signals.

> [!WARNING] 
> Status: Work in Progress.

## 🌟 Overview

This is an experimental project that combines:

- 🧠 fNIRS brain activity data
- 🤖 AI Agent interactions, mediated by TypeAgent
- 🎯 Personalization through neural signals

![screenshot](./public/screenshot.png)

![screenshot-analysis](./public/screenshot_analysis.png)

## 🏌️ Example use case (golf)

https://github.com/user-attachments/assets/2c194c40-8046-43b3-9faf-adbae6f28023

## 🏗️ System Architecture

Below is a detailed architecture diagram showing how the various components of the system interact:

<img src="public/blog_architecture.png" alt="Blog Architecture Diagram" width="50%" />

```mermaid
flowchart LR
    %% Input Sources
    subgraph Inputs[Input Sources]
        Voice["Voice & Text"]
        Email["Email"]
        Teams["Teams Message"]
        Timer["Timer"]
        BCI["Brain Sensors (fNIRS)"]
        Phone["Phone Gateway"]
        Golf["Golf Hat Sensors"]
    end

    %% Azure Integration Layer
    subgraph Integration[Integration Layer]
        EventGrid["Event Grid"]
        EventHubs["Event Hubs"]
    end

    %% Main Agent System
    subgraph Agents[Agent System]
        MetaAgent["Meta Agent"]
        subgraph SubAgents[Specialized Agents]
            Research["Research Agent"]
            Design["Design Agent"]
            Meditation["Meditation Agent"]
            EmailAgent["Email Agent"]
            GolfAnalysis["Golf Analysis Agent"]
        end
    end

    %% Data and AI Services
    subgraph Services[Data & AI Services]
        CosmosDB[(Cosmos DB)]
        subgraph AI[AI Services]
            Search["AI Search"]
            Functions["Azure Functions"]
            DataExplorer["Data Explorer"]
        end
        subgraph OpenAI[OpenAI Service]
            GPT4["GPT-4"]
            DALLE["DALL-E 3"]
        end
        AIFoundry["AI Agent Service"]
    end

    %% Outputs
    subgraph Outputs[Generated Outputs]
        Reports["Research Reports"]
        Diagrams["AI Diagrams"]
        MeditationGuide["Meditation Guide"]
        Comms["Communications"]
        GolfDash["Golf Dashboard"]
    end

    %% Connections
    Voice --> MetaAgent
    Email --> EventGrid
    Teams --> EventGrid
    Timer --> EventGrid
    BCI --> Phone
    Phone --> EventHubs
    Golf --> EventGrid

    EventGrid --> MetaAgent
    EventHubs --> CosmosDB
    MetaAgent <--> CosmosDB

    MetaAgent --> Research
    MetaAgent --> Design
    MetaAgent --> Meditation
    MetaAgent --> EmailAgent
    MetaAgent --> GolfAnalysis

    Research --> AIFoundry
    AIFoundry --> Search
    AIFoundry --> Functions
    Design --> OpenAI
    Meditation --> OpenAI
    GolfAnalysis --> DataExplorer
    GolfAnalysis <--> CosmosDB

    Research --> Reports
    Design --> Diagrams
    Meditation --> MeditationGuide
    EmailAgent --> Comms
    GolfAnalysis --> GolfDash
```

### 🔍 Architecture Overview

The system architecture consists of several key components:

1. **Input Sources**
   - 🎤 Various input methods including voice, text, email, and Teams messages
   - 🧠 Biosensors (fNIRS) for brain activity monitoring
   - 🏌️ Specialized sports equipment (Golf Hat) for performance metrics

2. **Azure Platform Integration**
   - ⚡ Event Grid and Event Hubs for real-time event processing
   - 🚀 Container Apps hosting the TypeAgent-powered Meta Agent
   - 🤖 Specialized sub-agents for different tasks (research, design, meditation, etc.)

3. **Data & AI Services**
   - 💾 Cosmos DB for data storage
   - 🧠 Azure OpenAI Service with multiple models (GPT-4o, o3-mini, DALL-E 3)
   - 🛠️ Azure AI Foundry for agent services and tools
   - 🔍 Azure AI Search and Data Explorer for data analysis

4. **Generated Outputs**
   - 📊 Brain state-adjusted research reports and diagrams
   - 🧘 Personalized meditation instructions
   - 📨 Automated communications
   - 🎯 Interactive golf performance analysis

The architecture is designed to be scalable and modular, allowing for easy addition of new input sources, agents, and output types. The system uses brain-computer interface data to personalize and optimize the AI interactions for each user.

## 🚀 Getting Started

### Prerequisites

- 📦 Node.js (v16 or higher)
- 📦 pnpm (v8 or higher)
- 🗺️ Azure Maps subscription key
- 🧠 [BlueberryX BCI Device](https://blueberryx.com/) for fNIRS data

### 🔧 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies using pnpm:
```bash
pnpm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   - Edit `.env` and add your Azure Maps subscription key:
   ```
   NEXT_PUBLIC_AZURE_MAPS_SUBSCRIPTION_KEY=your_azure_maps_key_here
   ```

### 🗺️ Getting Azure Maps API Key

1. Go to the [Azure Portal](https://portal.azure.com)
2. Create a new Azure Maps account or use an existing one
3. Navigate to your Azure Maps account
4. Go to "Authentication" in the left sidebar
5. Copy your primary key
6. Paste it in your `.env` file

### 💻 Development

1. Start the backend server:
```bash
cd backend
pnpm install
pnpm build    # Build the TypeScript files first
pnpm start
```
The backend API will start on port 4518.

2. In a new terminal, start the frontend development server:
```bash
# In the root directory
pnpm install
pnpm dev
```
The frontend application will be available at `http://localhost:4517`.

For development with hot reload on the backend:
```bash
cd backend
pnpm dev     # This will watch for changes and rebuild automatically
```

### 🏗️ Building for Production

To create a production build:

```bash
pnpm build
```

## 📁 Project Structure

```
├── src/              # Frontend source code
│   ├── components/   # Reusable React components
│   ├── pages/        # Application pages/routes
│   ├── hooks/        # Custom React hooks
│   └── styles/       # Global styles
├── backend/          # Backend server code
│   ├── src/          # Backend source code
│   ├── dist/         # Compiled backend code
│   └── package.json  # Backend dependencies
├── public/           # Static assets
├── .env.example      # Example environment variables
├── .gitignore       # Git ignore rules
└── package.json      # Frontend dependencies and scripts
```

## 🛠️ Technologies Used

Built with:
- ⚡ Next.js for the framework
- 🗺️ Azure Maps for golf course visualization
- 📊 Recharts for data visualization
- 🗺️ Leaflet for mapping functionality
- 🎨 TailwindCSS for styling
- 🤖 TypeAgent
- ☁️ Azure AI Foundry
- ⚡ Vite
- 📝 TypeScript

## ⚙️ Environment Variables

The following environment variables are required:

- `NEXT_PUBLIC_AZURE_MAPS_SUBSCRIPTION_KEY`: Your Azure Maps subscription key


## 🤝 Contributing

1. Create a feature branch
2. Commit your changes
3. Push to the branch
4. Create a Pull Request

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## ⚠️ Disclaimer

This software is provided for demonstration purposes only. It is not intended to be relied upon for any purpose. The creators of this software make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability or availability with respect to the software or the information, products, services, or related graphics contained in the software for any purpose. Any reliance you place on such information is therefore strictly at your own risk.

## 📜 License

This software is provided for demonstration purposes only. It is not intended to be relied upon for any purpose. The software is provided "as is" and without any warranties, express or implied. The software is not intended to be used for any commercial purpose. The software is provided solely for demonstration purposes and should not be used for any other purpose. The software is provided without any warranty of any kind, either express or implied, including, but not limited to, the implied warranties of merchantability, fitness for a particular purpose, or non-infringement. The software is provided "as is" and without any warranty of any kind. The user assumes all risk and responsibility for the use of the software.