const Groq = require('groq-sdk');
const { HfInference } = require('@huggingface/inference');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// Convert audio to MP3 format for smaller file size
async function convertToMp3(inputPath) {
  const outputPath = inputPath.includes('.') 
    ? inputPath.replace(/\.[^.]+$/, '.mp3')
    : inputPath + '.mp3';
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioBitrate('64k')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

async function processAudio(audioPath, groqApiKey, hfApiKey) {
  let mp3Path = null;
  
  try {
    if (!groqApiKey) {
      throw new Error('GROQ API key is required for Whisper transcription.');
    }
    if (!hfApiKey) {
      throw new Error('Hugging Face API key is required for NLLB translation.');
    }

    // Step 1: Convert to MP3
    console.log('HF: Converting audio to MP3...');
    mp3Path = await convertToMp3(audioPath);
    console.log('HF: Conversion complete');

    // Step 2: Use Whisper for speech-to-text via GROQ
    console.log('HF: Transcribing audio with Whisper (via GROQ)...');
    
    const groqClient = new Groq({ apiKey: groqApiKey });
    const audioStream = fsSync.createReadStream(mp3Path);
    
    const transcription = await groqClient.audio.transcriptions.create({
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

    console.log('HF: Transcription:', transcribedText);

    // Step 3: Translate using NLLB via HuggingFace Inference API
    console.log('HF: Translating with NLLB...');
    
    const hf = new HfInference(hfApiKey);
    
    const translationResult = await hf.translation({
      model: 'facebook/nllb-200-distilled-600M',
      inputs: transcribedText,
      parameters: {
        src_lang: 'hat_Latn',
        tgt_lang: 'eng_Latn'
      }
    });

    const translation = translationResult.translation_text;

    if (!translation) {
      throw new Error('No translation generated');
    }

    console.log('HF: Translation:', translation);

    return {
      provider: 'huggingface',
      transcription: transcribedText,
      translation: translation,
      language: 'Haitian Creole',
      models: {
        transcription: 'whisper-large-v3 (GROQ)',
        translation: 'nllb-200-distilled-600M (HuggingFace)'
      }
    };
  } catch (error) {
    console.error('HuggingFace processing error:', error);
    throw new Error(`HuggingFace processing failed: ${error.message}`);
  } finally {
    // Clean up MP3 file
    if (mp3Path) {
      await fs.unlink(mp3Path).catch(err => 
        console.error('Error deleting MP3 file:', err)
      );
    }
  }
}

module.exports = { processAudio };