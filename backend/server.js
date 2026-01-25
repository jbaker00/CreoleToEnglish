const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const gcpHandler = require('./gcp_handler');
const ociHandler = require('./oci_handler');
const llamaHandler = require('./llama_handler');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Configure multer for file uploads
const upload = multer({ dest: 'audio_temp/' });

// Ensure temp directory exists
(async () => {
  try {
    await fs.mkdir('audio_temp', { recursive: true });
  } catch (err) {
    console.error('Error creating temp directory:', err);
  }
})();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Translate endpoint
app.post('/api/translate', upload.single('audio'), async (req, res) => {
  const provider = req.body.provider || 'gcp';
  
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    let result;
    
    if (provider === 'gcp') {
      result = await gcpHandler.processAudio(req.file.path);
    } else if (provider === 'oci') {
      result = await ociHandler.processAudio(req.file.path);
    } else if (provider === 'llama') {
      result = await llamaHandler.processAudio(req.file.path);
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Clean up temp file
    await fs.unlink(req.file.path).catch(err => 
      console.error('Error deleting temp file:', err)
    );

    res.json(result);
  } catch (error) {
    console.error('Translation error:', error);
    
    // Clean up temp file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(err => 
        console.error('Error deleting temp file:', err)
      );
    }
    
    res.status(500).json({ 
      error: 'Translation failed', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
