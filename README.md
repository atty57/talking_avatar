# Talking Avatar Frontend

This is a React-based 3D talking avatar application that uses Three.js and React Three Fiber to render a realistic 3D character that responds to text input with synchronized speech and facial animations.

## Demo Video

https://user-images.githubusercontent.com/atty57/talking_avatar/assets/DEMO/Demo.mp4

<!-- Alternative format using HTML video tag for better GitHub compatibility -->
<video width="640" height="360" controls>
  <source src="public/DEMO/Demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## Features

- 3D avatar with realistic facial animations
- Text-to-speech integration with lip-syncing
- AI-powered conversational abilities through backend integration
- Speech-to-text functionality for voice input
- Customizable facial expression settings
- Modern chat interface

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd talking_avatar
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following content:
```
REACT_APP_API_URL=http://localhost:3001
```

## Running the Application

Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`.

**Note:** Make sure the backend server is running at port 3001 for the application to function properly.

## Project Structure

- `/public` - Static assets and index.html
  - `/images` - Textures and image assets for the 3D model
  - `/speech-*.mp3` - Generated speech files (created during runtime)
  - `/DEMO` - Demo videos and other promotional content
- `/src` - Source code
  - `App.js` - Main application component with UI and 3D scene setup
  - `converter.js` - Utility for converting blend shape data to animations
  - `blendDataBlink.json` - Default blinking animation data

## Avatar Customization

The avatar can be customized through several parameters in the `App.js` file:

- Facial expression intensity
- Transition smoothing between expressions
- Micro-expressions during pauses
- Specific facial feature emphasis (mouth, eyes, etc.)

## Built With

- [React](https://reactjs.org/) - Frontend framework
- [Three.js](https://threejs.org/) - 3D rendering library
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber) - React renderer for Three.js
- [React Three Drei](https://github.com/pmndrs/drei) - Useful helpers for React Three Fiber
- [Axios](https://axios-http.com/) - HTTP client for API requests

## Communication with Backend

The frontend communicates with the backend server to:

1. Send text to be converted to speech
2. Get audio files and blendshape data for facial animations
3. Optionally generate AI-powered responses

API endpoints used:
- `/talk` - Main endpoint for text-to-speech with facial animation data
- `/talk-stream` - Streaming version of the text-to-speech endpoint

## Troubleshooting

- If the avatar is not visible, check browser console for Three.js errors
- If speech is not playing, verify that audio is enabled in your browser
- For network issues, check that the backend server is running and accessible
