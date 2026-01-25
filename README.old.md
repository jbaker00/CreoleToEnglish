# Creole to English Speech Translator

A web application that records Haitian Creole speech and translates it to English using Google Cloud Platform (GCP) or Oracle Cloud Infrastructure (OCI).

## Features

- 🎤 Real-time audio recording from browser
- 🔄 Switch between GCP and OCI cloud providers
- 🗣️ Speech-to-text transcription for Haitian Creole
- 🌐 Translation to English
- 💫 Modern, responsive web interface

## Prerequisites

- Node.js (v14 or higher)
- GCP account with Speech-to-Text and Translation APIs enabled
- OCI account (optional, for OCI provider)
- GCP credentials JSON file at `~/code/speech2-484118-38f3e05ae4bc.json`
- OCI config file at `~/.oci/config` (if using OCI)

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Verify credentials:**
   - GCP: Ensure `~/code/speech2-484118-38f3e05ae4bc.json` exists
   - OCI: Ensure `~/.oci/config` exists (if using OCI)

3. **Enable GCP APIs:**
   - Go to Google Cloud Console
   - Enable Speech-to-Text API
   - Enable Translation API

4. **Start the server:**
   ```bash
   cd backend
   npm start
   ```

5. **Open in browser:**
   Navigate to `http://localhost:3000`

## Usage

1. **Select Cloud Provider:**
   - Toggle switch to choose between GCP (default) or OCI

2. **Record Audio:**
   - Click "Start Recording" button
   - Speak in Haitian Creole
   - Click "Stop Recording" when finished

3. **View Results:**
   - Original transcription appears in the left panel
   - English translation appears in the right panel

## Project Structure

```
CreoleToEnglish/
├── backend/
│   ├── server.js           # Express server
│   ├── gcp_handler.js      # GCP Speech & Translation integration
│   ├── oci_handler.js      # OCI integration (placeholder)
│   └── package.json        # Node.js dependencies
├── frontend/
│   ├── index.html          # Main HTML page
│   ├── style.css           # Styling
│   └── app.js              # Frontend JavaScript
├── .gitignore
└── README.md
```

## Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript (Web Audio API)
- **Backend:** Node.js, Express
- **Cloud Services:**
  - GCP: Speech-to-Text API, Translation API
  - OCI: AI Speech, AI Language (requires additional configuration)

## Language Support

- **Input:** Haitian Creole (ht-HT)
- **Output:** English (en)
- **Fallback:** French (fr-FR) if Creole not detected

## OCI Implementation Notes

The OCI handler is currently a placeholder. To fully implement OCI support:

1. Verify Haitian Creole support in OCI AI Speech service
2. Configure OCI compartment IDs
3. Set up Object Storage for audio files
4. Update `oci_handler.js` with proper implementation
5. Configure AI Language service for translation

## Troubleshooting

**Microphone access denied:**
- Allow microphone permissions in browser
- Use HTTPS in production (required for microphone access)

**GCP authentication error:**
- Verify JSON credentials file path
- Check API enablement in GCP Console
- Verify billing is enabled

**No transcription generated:**
- Ensure audio is clear and in Haitian Creole
- Check internet connection
- Review server logs for errors

## Security Notes

- Credentials are stored locally and never committed to git
- Backend handles all API calls (credentials not exposed to frontend)
- Temporary audio files are deleted after processing
- Always use HTTPS in production

## Development

For development with auto-restart:
```bash
cd backend
npm install nodemon -g
npm run dev
```

## License

MIT
