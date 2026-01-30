const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fsPromises = require('fs').promises;
const gcpHandler = require('./gcp_handler');
const ociHandler = require('./oci_handler');
const llamaHandler = require('./llama_handler');
const groqHandler = require('./groq_handler');
const huggingfaceHandler = require('./huggingface_handler');

const app = express();
const PORT = 3001;

// SSL certificate options
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.pem'))
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Configure multer for file uploads
const upload = multer({ dest: 'audio_temp/' });

// Ensure temp directory exists
(async () => {
  try {
    await fsPromises.mkdir(path.join(__dirname, 'audio_temp'), { recursive: true });
  } catch (err) {
    console.error('Error creating temp directory:', err);
  }
})();

// Routes
app.post('/translate', upload.single('audio'), async (req, res) => {
  try {
    const provider = req.body.provider;
    let result;

    if (provider === 'gcp') {
      result = await gcpHandler.processAudio(req.file.path);
    } else if (provider === 'oci') {
      const ociConfigPath = req.body.ociConfigPath;
      result = await ociHandler.processAudio(req.file.path, ociConfigPath);
    } else if (provider === 'llama') {
      const ociApiKey = req.body.ociApiKey;
      if (!ociApiKey) {
        return res.status(400).json({ error: 'OCI API key is required' });
      }
      result = await llamaHandler.processAudio(req.file.path, ociApiKey);
    } else if (provider === 'groq') {
      const groqApiKey = req.body.groqApiKey;
      if (!groqApiKey) {
        return res.status(400).json({ error: 'GROQ API key is required' });
      }
      result = await groqHandler.processAudio(req.file.path, groqApiKey);
    } else if (provider === 'huggingface') {
      const groqApiKey = req.body.groqApiKey;
      const hfApiKey = req.body.hfApiKey;
      if (!groqApiKey) {
        return res.status(400).json({ error: 'GROQ API key is required for Whisper' });
      }
      if (!hfApiKey) {
        return res.status(400).json({ error: 'Hugging Face API key is required for NLLB' });
      }
      result = await huggingfaceHandler.processAudio(req.file.path, groqApiKey, hfApiKey);
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Clean up uploaded file
    await fsPromises.unlink(req.file.path).catch(err => 
      console.error('Error deleting uploaded file:', err)
    );

    res.json(result);
  } catch (error) {
    console.error('Translation error:', error);
    
    // Try to clean up file on error
    if (req.file && req.file.path) {
      await fsPromises.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({ 
      error: 'Translation failed', 
      details: error.message 
    });
  }
});

// Create HTTPS server
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Server running on https://localhost:${PORT}`);
});
