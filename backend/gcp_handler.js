const speech = require('@google-cloud/speech');
const { Translate } = require('@google-cloud/translate').v2;
const fs = require('fs').promises;
const path = require('path');

// Initialize GCP clients
const speechClient = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.env.HOME, 'gcp-credentials.json')
});

const translateClient = new Translate({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.env.HOME, 'gcp-credentials.json')
});

async function processAudio(audioPath) {
  try {
    // Read audio file
    const audioBytes = await fs.readFile(audioPath);
    
    // Configure speech recognition for Haitian Creole
    const audio = {
      content: audioBytes.toString('base64'),
    };
    
    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'ht-HT', // Haitian Creole
      alternativeLanguageCodes: ['fr-FR'], // Fallback to French
      enableAutomaticPunctuation: true,
    };

    const request = {
      audio: audio,
      config: config,
    };

    // Perform speech-to-text
    console.log('GCP: Transcribing audio...');
    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    if (!transcription) {
      throw new Error('No transcription generated');
    }

    console.log('GCP: Transcription:', transcription);

    // Translate from Haitian Creole to English
    console.log('GCP: Translating to English...');
    const [translation] = await translateClient.translate(transcription, {
      from: 'ht',
      to: 'en',
    });

    return {
      provider: 'gcp',
      transcription: transcription,
      translation: translation,
      language: 'Haitian Creole'
    };
  } catch (error) {
    console.error('GCP processing error:', error);
    throw new Error(`GCP processing failed: ${error.message}`);
  }
}

module.exports = { processAudio };
