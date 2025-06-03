# Socratic Learning Web UI

A modern React-based web interface for the Socratic Learning Pipeline system.

## Features

- Real-time topic submission and progress tracking
- Live WebSocket updates for session status
- System health monitoring dashboard
- Queue metrics visualization with Chart.js
- Modern UI with Tailwind CSS
- Responsive design

## Prerequisites

- Node.js >= 18.3.0
- npm >= 8.11.0

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The web interface will be available at http://localhost:5173

## Development

The project uses:
- React 18 with TypeScript
- Vite for fast development and building
- React Router for navigation
- Chart.js for metrics visualization
- Tailwind CSS for styling
- WebSocket for real-time updates

## Building for Production

To create a production build:

```bash
npm run build
```

The build output will be in the `dist` directory.

## Project Structure

- `src/components/` - React components
- `src/types/` - TypeScript type definitions
- `src/App.tsx` - Main application component
- `src/index.css` - Global styles and Tailwind imports

## API Integration

The web UI connects to the backend server running on port 5000. The Vite development server is configured to proxy API requests to avoid CORS issues.
