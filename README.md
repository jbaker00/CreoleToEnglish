# 🎤 Creole to English Translator

A real-time audio translation application that converts Haitian Creole speech to English text. The application supports three cloud AI providers: Google Cloud Platform (GCP), Oracle Cloud Infrastructure (OCI), and Meta LLAMA via Groq.

## Features

- **Real-time Audio Recording** - Record Haitian Creole speech directly in your browser
- **Multiple AI Providers** - Choose between GCP, OCI, or Meta LLAMA for transcription and translation
- **HTTPS Support** - Secure connection required for microphone access
- **Modern UI** - Clean, responsive interface with provider selection via radio buttons

## Architecture

```
CreoleToEnglish/
├── frontend/          # Client-side web interface
│   ├── index.html    # Main HTML page
│   ├── app.js        # JavaScript for recording and API calls
│   └── style.css     # Styling
├── backend/           # Node.js Express server
│   ├── server.js     # Main server with HTTPS support
│   ├── gcp_handler.js    # Google Cloud Platform integration
│   ├── oci_handler.js    # Oracle Cloud Infrastructure integration
│   └── llama_handler.js  # Meta LLAMA via Groq integration
└── ssl/              # SSL certificates (self-signed)
```

## Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn**
- At least one cloud provider account:
  - Google Cloud Platform (GCP)
  - Oracle Cloud Infrastructure (OCI)  
  - Groq (for Meta LLAMA)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/jbaker00/CreoleToEnglish.git
cd CreoleToEnglish
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys and configuration:

```bash
# Groq API Key (for Meta LLAMA)
GROQ_API_KEY=your_groq_api_key_here

# OCI Compartment ID
OCI_COMPARTMENT_ID=your_oci_compartment_id_here

# GCP Credentials Path
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/gcp-credentials.json

# Server Configuration
PORT=3001
```

## Cloud Provider Setup

### Option 1: Google Cloud Platform (GCP)

#### 1. Create a GCP Project
```bash
gcloud projects create YOUR_PROJECT_ID
gcloud config set project YOUR_PROJECT_ID
```

#### 2. Enable Required APIs
```bash
# Enable Speech-to-Text API
gcloud services enable speech.googleapis.com

# Enable Translation API
gcloud services enable translate.googleapis.com
```

#### 3. Create Service Account and Key
```bash
# Create service account
gcloud iam service-accounts create creole-translator \
    --display-name="Creole Translator Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:creole-translator@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudtranslate.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:creole-translator@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/speech.client"

# Create and download key
gcloud iam service-accounts keys create ~/gcp-credentials.json \
    --iam-account=creole-translator@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

#### 4. Set Environment Variable
```bash
export GOOGLE_APPLICATION_CREDENTIALS=~/gcp-credentials.json
```

### Option 2: Oracle Cloud Infrastructure (OCI)

#### 1. Set Up OCI CLI
```bash
# Install OCI CLI
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Configure OCI CLI (interactive setup)
oci setup config
```

This will create `~/.oci/config` with your credentials.

#### 2. Get Your Compartment ID
```bash
# List all compartments
oci iam compartment list --all \
    --query "data[?\"lifecycle-state\"=='ACTIVE'].{Name:name, ID:id}" \
    --output table

# Copy the compartment ID you want to use
export OCI_COMPARTMENT_ID="ocid1.compartment.oc1..YOUR_COMPARTMENT_ID"
```

#### 3. Enable Required Services

In the OCI Console (https://cloud.oracle.com):
- Enable **AI Speech** service
- Enable **AI Language** service  
- Enable **Object Storage** (will be auto-created by the app)

#### 4. Verify OCI Configuration
```bash
# Test OCI configuration
oci iam region list

# Verify Speech service is available
oci ai-speech transcription-task list --compartment-id $OCI_COMPARTMENT_ID
```

**Note:** OCI Speech does not natively support Haitian Creole. The application uses French as the closest supported language.

### Option 3: Meta LLAMA (via Groq)

#### 1. Get Groq API Key

1. Visit [https://console.groq.com](https://console.groq.com)
2. Sign in with Google, GitHub, or email
3. Navigate to **API Keys** in the left menu
4. Click **"Create API Key"**
5. Give it a name (e.g., "Creole Translator")
6. Copy the key

#### 2. Set Environment Variable
```bash
export GROQ_API_KEY="your_groq_api_key_here"
```

#### 3. Verify Groq Access
```bash
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

Groq provides:
- **Whisper Large V3** for audio transcription (supports Haitian Creole)
- **LLAMA 3.3 70B** for translation to English
- **Free tier** with generous limits
- **Ultra-fast inference**

## Running the Application

### Development (HTTP - localhost only)

```bash
cd backend
node server.js
```

Access at: `http://localhost:3001`

### Production (HTTPS - required for microphone access)

#### 1. Generate SSL Certificates
```bash
# Create SSL directory
mkdir -p ssl

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -days 365 -nodes \
  -subj '/CN=localhost'
```

#### 2. Update server.js to use HTTPS
The server is already configured for HTTPS. Just ensure the SSL certificates are in place.

#### 3. Start the server
```bash
cd backend
node server.js
```

Access at: `https://localhost:3001`

**Note:** Your browser will show a security warning for self-signed certificates. Click "Advanced" → "Proceed" to access the site.

### Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start with ecosystem file
cd backend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

## Deployment on Raspberry Pi

### 1. Copy Files to Raspberry Pi
```bash
rsync -avz --exclude 'node_modules' \
  ~/CreoleToEnglish/ \
  user@pi.local:~/CreoleToEnglish/
```

### 2. Copy Credentials
```bash
# Copy OCI credentials
rsync -avz ~/.oci/ user@pi.local:~/.oci/

# Copy GCP credentials  
scp ~/gcp-credentials.json user@pi.local:~/

# Update OCI config path on Pi
ssh user@pi.local "sed -i 's|/Users/YOUR_USER|/home/YOUR_PI_USER|' ~/.oci/config"
```

### 3. Install Dependencies and Start
```bash
ssh user@pi.local
cd ~/CreoleToEnglish/backend
npm install

# Create PM2 ecosystem config with your credentials
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Usage

1. **Open the application** in your browser at `https://localhost:3001` (or your Pi's address)
2. **Accept the SSL certificate** warning if using self-signed certificates
3. **Select a provider**:
   - **Google Cloud Platform** - Best for production, excellent Haitian Creole support
   - **Oracle Cloud (OCI)** - Uses French as fallback, requires more setup
   - **Meta LLAMA** - Fast, free tier available, good Haitian Creole support
4. **Click "Start Recording"** and grant microphone permissions
5. **Speak in Haitian Creole**
6. **Click "Stop Recording"** when finished
7. **View results**: Original transcription and English translation

## Troubleshooting

### Microphone Access Denied
- Ensure you're using HTTPS (required by modern browsers)
- Check browser permissions for microphone access
- Try a different browser (Chrome/Firefox recommended)

### GCP Authentication Error
```bash
# Verify credentials file exists and is valid
cat $GOOGLE_APPLICATION_CREDENTIALS

# Test GCP authentication
gcloud auth application-default login
```

### OCI Configuration Error
```bash
# Verify OCI config
cat ~/.oci/config

# Test OCI connection
oci iam region list

# Check key file permissions
chmod 600 ~/.oci/oci_api_key.pem
```

### Groq API Error
```bash
# Verify API key is set
echo $GROQ_API_KEY

# Test Groq API access
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

### Port Already in Use
```bash
# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port
PORT=3002 node server.js
```

## API Endpoints

### POST /api/translate
Transcribe and translate Haitian Creole audio to English.

**Request:**
- `audio`: Audio file (webm format)
- `provider`: "gcp", "oci", or "llama"

**Response:**
```json
{
  "provider": "gcp",
  "transcription": "Bonjou, kijan ou ye?",
  "translation": "Hello, how are you?",
  "language": "Haitian Creole"
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Technologies Used

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with gradient backgrounds and animations
- **JavaScript** - MediaRecorder API for audio capture
- **Fetch API** - Communication with backend

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Multer** - File upload handling
- **HTTPS** - Secure server with SSL/TLS

### AI/ML Services
- **Google Cloud Speech-to-Text** - Audio transcription
- **Google Cloud Translation** - Text translation
- **OCI AI Speech** - Audio transcription (French fallback)
- **OCI AI Language** - Text translation
- **Groq Whisper** - Audio transcription (Haitian Creole support)
- **Meta LLAMA 3.3 70B** - Text translation via Groq

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review cloud provider documentation:
  - [GCP Speech-to-Text](https://cloud.google.com/speech-to-text/docs)
  - [GCP Translation](https://cloud.google.com/translate/docs)
  - [OCI Speech](https://docs.oracle.com/en-us/iaas/Content/speech/home.htm)
  - [OCI AI Language](https://docs.oracle.com/en-us/iaas/Content/language/home.htm)
  - [Groq API](https://console.groq.com/docs)

## Acknowledgments

- Google Cloud Platform for Speech and Translation APIs
- Oracle Cloud Infrastructure for AI services
- Groq for fast Whisper and LLAMA inference
- Meta for the LLAMA model
- OpenAI for the Whisper model
