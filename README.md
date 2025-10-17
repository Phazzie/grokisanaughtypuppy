# Grok Chat - A Snazzy AI Chat Application 🐕

A modern, feature-rich chat application powered by Grok-4-fast-reasoning with a beautiful, eclectic UI.

## Features ✨

### Core Features
- 💬 **Real-time Chat** with Grok-4-fast-reasoning
- 🎭 **Editable System Prompt** - Customize Grok's personality and behavior
- 🔀 **A/B Testing Mode** - Compare responses with different temperature settings (0.3, 0.7, 1.0)
- 🎯 **Output Evaluation** - Use Grok to evaluate and compare different responses
- 🔄 **Response Regeneration** - Regenerate the last response with one click
- 💾 **Save Conversations** - Save and load conversation history
- 📥 **Export Conversations** - Export chats as JSON files
- 🌡️ **Temperature Control** - Adjust creativity level (0-2)

### UI/UX
- 🎨 Beautiful gradient backgrounds with glass morphism effects
- ✨ Smooth animations and transitions
- 📱 Fully responsive design
- 🎭 Emoji-rich interface
- 🌈 Purple, pink, and blue color scheme

## Project Structure

```
grokisanaughtypuppy/
├── backend/                 # Express.js API server
│   ├── server.js           # Backend API proxy for Grok
│   ├── package.json
│   └── .env.example        # Environment variables template
│
├── grok-chat/              # Angular frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── services/   # Angular services
│   │   │   ├── app.ts      # Main component logic
│   │   │   ├── app.html    # UI template
│   │   │   └── app.scss    # Component styles
│   │   └── styles.scss     # Global styles with Tailwind
│   └── package.json
│
└── README.md               # This file
```

## Prerequisites

- Node.js (v18 or higher)
- npm
- X.AI API Key (get one from https://x.ai)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Phazzie/grokisanaughtypuppy.git
   cd grokisanaughtypuppy
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```
   
   Edit `.env` and add your X.AI API key:
   ```
   XAI_API_KEY=your_xai_api_key_here
   PORT=3000
   ```

3. **Set up the frontend**
   ```bash
   cd ../grok-chat
   npm install
   ```

## Running the Application

You'll need to run both the backend and frontend:

### Terminal 1 - Backend Server
```bash
cd backend
npm start
```
The backend will start on `http://localhost:3000`

### Terminal 2 - Frontend Development Server
```bash
cd grok-chat
npm start
```
The frontend will start on `http://localhost:4200`

Open your browser and navigate to `http://localhost:4200`

## Usage Guide

### Basic Chat
1. Type your message in the input field at the bottom
2. Press Enter or click the 🚀 button to send
3. View Grok's response in the chat window

### Editing System Prompt
1. Click the "⚙️ System Prompt" button in the header
2. Edit the prompt to customize Grok's personality
3. Adjust the temperature slider for creativity control
4. Changes apply to all future messages

### A/B Testing Mode
1. Click the "🔀 A/B Test" button to enable comparison mode
2. Send a message to generate 3 responses with different temperatures (0.3, 0.7, 1.0)
3. Compare the responses side-by-side
4. Click "Use This" on any response to continue with that conversation branch

### Evaluating Outputs
1. Enable A/B Testing mode and generate responses
2. Customize the evaluation criteria if desired
3. Click "✨ Evaluate Outputs" to have Grok analyze and rank the responses
4. View detailed evaluation results including strengths, weaknesses, and recommendations

### Managing Conversations
- **💾 Save**: Save the current conversation with a custom name
- **📥 Export**: Download the conversation as a JSON file
- **🗑️ Clear**: Clear the current chat (with confirmation)
- **Load Saved**: Click on any saved conversation to load it

## API Endpoints

The backend provides the following endpoints:

- `POST /api/chat` - Send messages to Grok
- `POST /api/evaluate` - Evaluate multiple outputs
- `GET /api/health` - Check API status and configuration

## Technologies Used

### Frontend
- **Angular 19** - Modern web framework with standalone components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **SCSS** - Enhanced CSS with variables and mixins

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Axios** - HTTP client for Grok API

## Environment Variables

### Backend (.env)
- `XAI_API_KEY` - Your X.AI API key (required)
- `PORT` - Server port (default: 3000)

## License

ISC

## Credits

Built with ❤️ using Grok-4-fast-reasoning from X.AI
