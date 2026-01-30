const Groq = require('groq-sdk');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// GROQ API key will be passed as parameter or from environment
let groqClient = null;

function initializeGroq(apiKey) {
  if (!apiKey) {
    throw new Error('GROQ API key is required');
  }
  groqClient = new Groq({ apiKey });
  return groqClient;
}

// Convert audio to MP3 format for smaller file size
async function convertToMp3(inputPath) {
  // Ensure output path has .mp3 extension
  const outputPath = inputPath.includes('.') 
    ? inputPath.replace(/\.[^.]+$/, '.mp3')
    : inputPath + '.mp3';
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioBitrate('64k') // Lower bitrate for smaller file size
      .audioChannels(1) // Mono audio
      .audioFrequency(16000) // 16kHz sample rate (good for speech)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

async function processAudio(audioPath, groqApiKey) {
  let mp3Path = null;
  
  try {
    // Initialize GROQ client with provided API key
    const client = groqApiKey ? initializeGroq(groqApiKey) : groqClient;
    
    if (!client) {
      throw new Error('GROQ client not initialized. Please provide an API key.');
    }

    // Step 1: Convert to MP3 for smaller file size
    console.log('GROQ: Converting audio to MP3...');
    mp3Path = await convertToMp3(audioPath);
    console.log('GROQ: Conversion complete');

    // Step 2: Use Whisper for speech-to-text (Haitian Creole)
    console.log('GROQ: Transcribing audio with Whisper...');
    
    // Create a read stream for the MP3 file
    const audioStream = fsSync.createReadStream(mp3Path);
    
    // Create transcription using Whisper via GROQ
    const transcription = await client.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-large-v3',
      language: 'ht', // Haitian Creole
      response_format: 'json',
      temperature: 0.0,
    });

    const transcribedText = transcription.text;
    
    if (!transcribedText) {
      throw new Error('No transcription generated');
    }

    console.log('GROQ: Transcription:', transcribedText);

    // Step 3: Translate using Llama 3.3 (GROQ)
    console.log('GROQ: Translating with Llama 3.3...');
    
    const translationPrompt = `Translate the following Haitian Creole text to English. Provide only the English translation without any explanation.

Haitian Creole: ${transcribedText}

English:`;

    const completion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator specializing in Haitian Creole to English translation. Provide accurate, natural-sounding translations without explanations.'
        },
        {
          role: 'user',
          content: translationPrompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1024,
    });

    const translation = completion.choices[0]?.message?.content?.trim();

    if (!translation) {
      throw new Error('No translation generated');
    }

    console.log('GROQ: Translation:', translation);

    return {
      provider: 'groq',
      transcription: transcribedText,
      translation: translation,
      language: 'Haitian Creole',
      models: {
        transcription: 'whisper-large-v3 (GROQ)',
        translation: 'llama-3.3-70b-versatile (GROQ)'
      }
    };
  } catch (error) {
    console.error('GROQ processing error:', error);
    throw new Error(`GROQ processing failed: ${error.message}`);
  } finally {
    // Clean up MP3 file
    if (mp3Path) {
      await fs.unlink(mp3Path).catch(err => 
        console.error('Error deleting MP3 file:', err)
      );
    }
  }
}

module.exports = { processAudio, initializeGroq };
