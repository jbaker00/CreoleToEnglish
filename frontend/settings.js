const settingsForm = document.getElementById('settingsForm');
const groqApiKeyInput = document.getElementById('groqApiKey');
const hfApiKeyInput = document.getElementById('hfApiKey');
const successMessage = document.getElementById('successMessage');

// Load saved settings on page load
window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});

// Handle form submission
settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
});

function loadSettings() {
    const savedGroqKey = localStorage.getItem('groqApiKey');
    if (savedGroqKey) {
        groqApiKeyInput.value = savedGroqKey;
    }
    
    const savedHfKey = localStorage.getItem('hfApiKey');
    if (savedHfKey) {
        hfApiKeyInput.value = savedHfKey;
    }
}

function saveSettings() {
    const groqKey = groqApiKeyInput.value.trim();
    const hfKey = hfApiKeyInput.value.trim();
    
    if (groqKey || hfKey) {
        if (groqKey) localStorage.setItem('groqApiKey', groqKey);
        if (hfKey) localStorage.setItem('hfApiKey', hfKey);
        showSuccessMessage();
    } else {
        alert('Please enter at least one API key');
    }
}

function showSuccessMessage() {
    successMessage.classList.add('show');
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 3000);
}

// Export function to get API key (used by app.js)
function getGroqApiKey() {
    return localStorage.getItem('groqApiKey');
}
