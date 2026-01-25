const fs = require('fs').promises;
const path = require('path');

// Meta LLAMA handler using Replicate API or Groq API
// You'll need to set REPLICATE_API_TOKEN or GROQ_API_KEY environment variable

const LLAMA_PROVIDER = process.env.LLAMA_PROVIDER || 'groq'; // 'groq' or 'replicate'
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || '';

async function processAudio(audioPath) {
  try {
    console.log('LLAMA: Processing audio...');
    
    // For LLAMA, we'll use Whisper for transcription and LLAMA for translation
    let transcription;
    
    if (LLAMA_PROVIDER === 'groq' && GROQ_API_KEY) {
      transcription = await transcribeWithGroq(audioPath);
    } else if (LLAMA_PROVIDER === 'replicate' && REPLICATE_API_TOKEN) {
      transcription = await transcribeWithReplicate(audioPath);
    } else {
      throw new Error('No API key configured. Set GROQ_API_KEY or REPLICATE_API_TOKEN environment variable.');
    }
    
    if (!transcription) {
      throw new Error('No transcription generated');
    }
    
    console.log('LLAMA: Transcription:', transcription);
    
    // Translate using LLAMA
    console.log('LLAMA: Translating to English...');
    const translation = await translateWithLlama(transcription);
    
    return {
      provider: 'llama',
      transcription: transcription,
      translation: translation,
      language: 'Haitian Creole'
    };
    
  } catch (error) {
    console.error('LLAMA processing error:', error);
    throw new Error(`LLAMA processing failed: ${error.message}`);
  }
}

async function transcribeWithGroq(audioPath) {
  try {
    // Groq provides fast Whisper transcription
    const FormData = require('form-data');
    const fetch = require('node-fetch');
    
    const audioBuffer = await fs.readFile(audioPath);
    
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'recording.webm',
      contentType: 'audio/webm'
    });
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'ht'); // Haitian Creole
    formData.append('response_format', 'json');
    
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }
    
    const result = await response.json();
    return result.text;
    
  } catch (error) {
    console.error('Groq transcription error:', error);
    throw error;
  }
}

async function transcribeWithReplicate(audioPath) {
  try {
    // Using Replicate's Whisper model
    const Replicate = require('replicate');
    const replicate = new Replicate({
      auth: REPLICATE_API_TOKEN
    });
    
    // Read audio file as base64
    const audioBuffer = await fs.readFile(audioPath);
    const audioBase64 = `data:audio/webm;base64,${audioBuffer.toString('base64')}`;
    
    const output = await replicate.run(
      "openai/whisper:4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2",
      {
        input: {
          audio: audioBase64,
          model: "large-v3",
          language: "ht",
          translate: false
        }
      }
    );
    
    return output.transcription || output.text || output;
    
  } catch (error) {
    console.error('Replicate transcription error:', error);
    throw error;
  }
}

async function translateWithLlama(text) {
  try {
    if (LLAMA_PROVIDER === 'groq' && GROQ_API_KEY) {
      return await translateWithGroq(text);
    } else if (LLAMA_PROVIDER === 'replicate' && REPLICATE_API_TOKEN) {
      return await translateWithReplicateLlama(text);
    } else {
      throw new Error('No API key configured for translation');
    }
  } catch (error) {
    console.error('LLAMA translation error:', error);
    throw error;
  }
}

async function translateWithGroq(text) {
  try {
    const fetch = require('node-fetch');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `Translate this Haitian Creole text to English. Only provide the English translation, nothing else:\n\n${text}`
        }],
        temperature: 0.3,
        max_tokens: 1024
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }
    
    const result = await response.json();
    return result.choices[0].message.content.trim();
    
  } catch (error) {
    console.error('Groq translation error:', error);
    throw error;
  }
}

async function translateWithReplicateLlama(text) {
  try {
    const Replicate = require('replicate');
    const replicate = new Replicate({
      auth: REPLICATE_API_TOKEN
    });
    
    const output = await replicate.run(
      "meta/meta-llama-3-70b-instruct",
      {
        input: {
          prompt: `Translate this Haitian Creole text to English. Only provide the English translation, nothing else:\n\n${text}`,
          max_tokens: 1024,
          temperature: 0.3
        }
      }
    );
    
    // Output is an array of strings
    return Array.isArray(output) ? output.join('') : output;
    
  } catch (error) {
    console.error('Replicate LLAMA translation error:', error);
    throw error;
  }
}

module.exports = { processAudio };
