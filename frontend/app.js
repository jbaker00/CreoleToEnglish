let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let currentProvider = 'gcp';

const recordBtn = document.getElementById('recordBtn');
const recordingStatus = document.getElementById('recordingStatus');
const transcriptionDiv = document.getElementById('transcription');
const translationDiv = document.getElementById('translation');
const errorDiv = document.getElementById('errorMessage');
// Provider selection
const providerRadios = document.querySelectorAll('input[name="provider"]');

providerRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentProvider = e.target.value;
        console.log('Provider changed to:', currentProvider);
    });
});

// Recording button
recordBtn.addEventListener('click', async () => {
    if (!isRecording) {
        await startRecording();
    } else {
        await stopRecording();
    }
});

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendAudioToServer(audioBlob);
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        recordBtn.classList.add('recording');
        recordBtn.querySelector('.btn-text').textContent = 'Stop Recording';
        recordBtn.querySelector('.btn-icon').textContent = '⏹️';
        recordingStatus.textContent = '🔴 Recording...';
        errorDiv.classList.remove('show');
        
    } catch (error) {
        console.error('Error starting recording:', error);
        showError('Could not access microphone. Please grant permission.');
    }
}

async function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('.btn-text').textContent = 'Start Recording';
        recordBtn.querySelector('.btn-icon').textContent = '🎙️';
        recordingStatus.textContent = '⏳ Processing...';
    }
}

async function sendAudioToServer(audioBlob) {
    try {
        transcriptionDiv.textContent = 'Processing...';
        transcriptionDiv.classList.add('loading');
        translationDiv.textContent = 'Waiting...';
        translationDiv.classList.add('loading');
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('provider', currentProvider);
        
        const response = await fetch('http://localhost:3001/api/translate', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || errorData.error || 'Translation failed');
        }
        
        const result = await response.json();
        
        transcriptionDiv.textContent = result.transcription;
        transcriptionDiv.classList.remove('loading');
        translationDiv.textContent = result.translation;
        translationDiv.classList.remove('loading');
        recordingStatus.textContent = `✅ Completed using ${result.provider.toUpperCase()}`;
        
    } catch (error) {
        console.error('Error processing audio:', error);
        transcriptionDiv.textContent = 'Your transcription will appear here...';
        transcriptionDiv.classList.remove('loading');
        translationDiv.textContent = 'Your translation will appear here...';
        translationDiv.classList.remove('loading');
        recordingStatus.textContent = '';
        showError(`Error: ${error.message}`);
    }
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 10000);
}

// Check if browser supports required APIs
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showError('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.');
    recordBtn.disabled = true;
}
