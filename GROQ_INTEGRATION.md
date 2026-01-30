# GROQ Integration - Branch: groq-integration

## Summary of Changes

This branch adds GROQ integration to the Creole to English translator, allowing users to use their own GROQ API key with OpenAI's Whisper for speech-to-text and Meta's Llama 3.3 70B for translation.

## New Features

### 1. **Settings Page**
- New page at `/frontend/settings.html` where users can configure their GROQ API key
- API key is stored securely in browser's localStorage
- Link to settings accessible from main page

### 2. **GROQ Handler** (`backend/groq_handler.js`)
- Uses **Whisper Large V3** (via GROQ) for speech-to-text transcription
- Uses **Llama 3.3 70B Versatile** (via GROQ) for Haitian Creole to English translation
- Note: Meta's NLLB (No Language Left Behind) is not directly available via GROQ, so we're using the latest Llama model which provides excellent translation quality

### 3. **Updated Frontend**
- Added GROQ as a provider option in the radio buttons
- Integration with localStorage to retrieve API key
- Settings link in the header
- Updated instructions to guide users

### 4. **Updated Backend**
- Modified `server.js` to handle GROQ provider
- API key passed securely from frontend to backend with each request
- Added `groq-sdk` dependency to package.json

## Files Modified
- `backend/server.js` - Added GROQ provider handling
- `backend/package.json` - Added groq-sdk dependency
- `backend/groq_handler.js` - NEW: GROQ integration handler
- `frontend/index.html` - Added GROQ option and settings link
- `frontend/app.js` - Added API key handling for GROQ
- `frontend/settings.html` - NEW: Settings page
- `frontend/settings.js` - NEW: Settings page logic

## How to Use

1. **Get a GROQ API Key**: Visit [console.groq.com](https://console.groq.com/keys) and create an account to get your free API key

2. **Configure the Key**: 
   - Click the ⚙️ Settings link on the main page
   - Paste your GROQ API key
   - Click "Save Settings"

3. **Use GROQ**:
   - Select "GROQ (Whisper + Llama)" as your provider
   - Record your Haitian Creole speech
   - Get transcription via Whisper and translation via Llama

## Technical Details

### Models Used
- **Speech-to-Text**: `whisper-large-v3` (OpenAI's Whisper via GROQ)
- **Translation**: `llama-3.3-70b-versatile` (Meta's latest Llama model via GROQ)

### Why Llama instead of NLLB?
Meta's NLLB (No Language Left Behind) is not currently available through GROQ's API. However, Llama 3.3 70B provides excellent translation capabilities and is specifically instructed to translate Haitian Creole to English with high accuracy.

## Next Steps

To merge this branch:
```bash
git add .
git commit -m "Add GROQ integration with Whisper and Llama"
git push origin groq-integration
```

Then create a pull request to merge into main.
