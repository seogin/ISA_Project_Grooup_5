const DEFAULT_TTS_BASE_URL = (typeof window !== 'undefined' && window.TTS_BASE_URL)
    ? window.TTS_BASE_URL
    : 'http://localhost:8081';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function populateHTMLOnLoad() {
    console.log('ready!');
    $.ajax({
        type: 'GET',
        url: '/api',
        dataType: 'json',
        success: async function (result) {
            console.log('AJAX success!');
            console.log(result);
            if (result.success === false) {
                window.location.href = '/';
                return;
            }

            // unnecessary delay added because we want to see our spinner for longer! :P
            await sleep(2000);

            var htmlString = '';
            for (var i = 0; i < result.data.length; i++) {
                htmlString += '<div>' + result.data[i] + '</div>';
            }
            $('#dynamic_content').html(htmlString);
        },
        error: function (xhr, status, error) {
            console.log('AJAX Error: ' + status + ' ' + error + ' ' + xhr.status + ' ' + xhr.statusText);
            window.location.href = '/';
        }
    });
}

function normaliseBaseUrl(rawUrl) {
    if (!rawUrl) {
        return DEFAULT_TTS_BASE_URL;
    }
    return rawUrl.replace(/\/$/, '') || DEFAULT_TTS_BASE_URL;
}

function getTtsBaseUrl(widgetEl) {
    if (typeof window !== 'undefined' && window.TTS_BASE_URL) {
        return normaliseBaseUrl(window.TTS_BASE_URL);
    }
    if (!widgetEl) {
        return normaliseBaseUrl();
    }
    const attr = widgetEl.getAttribute('data-tts-base-url');
    if (attr && attr.trim()) {
        return normaliseBaseUrl(attr.trim());
    }
    return normaliseBaseUrl();
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Request failed (${response.status}): ${message || response.statusText}`);
    }
    return response.json();
}

function setTtsStatus(widgetEl, message, tone = 'info') {
    const statusEl = widgetEl.querySelector('#ttsStatus');
    if (!statusEl) {
        return;
    }
    statusEl.textContent = message || '';
    statusEl.classList.remove('text-red-600', 'text-green-700', 'text-gray-700');
    if (!message) {
        return;
    }
    const toneClass = tone === 'error'
        ? 'text-red-600'
        : tone === 'success'
            ? 'text-green-700'
            : 'text-gray-700';
    statusEl.classList.add(toneClass);
}

function populateSelect(selectEl, options, placeholder) {
    if (!selectEl) {
        return;
    }
    selectEl.innerHTML = '';
    if (placeholder) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = placeholder;
        option.disabled = true;
        option.selected = true;
        selectEl.appendChild(option);
    }
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        selectEl.appendChild(option);
    });
}

function ensureDefaultOption(selectEl, value, label) {
    if (!selectEl) {
        return;
    }
    if (!Array.from(selectEl.options).some(option => option.value === value)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        selectEl.appendChild(option);
    }
    selectEl.value = value;
}

function base64ToBlob(base64, mimeType) {
    const binary = atob(base64);
    const length = binary.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes.buffer], { type: mimeType });
}

function updateAudioPlayer(widgetEl, audioBase64) {
    const audioEl = widgetEl.querySelector('#ttsAudio');
    if (!audioEl) {
        return;
    }

    if (audioEl.dataset.objectUrl) {
        URL.revokeObjectURL(audioEl.dataset.objectUrl);
        delete audioEl.dataset.objectUrl;
    }

    const blob = base64ToBlob(audioBase64, 'audio/wav');
    const objectUrl = URL.createObjectURL(blob);
    audioEl.src = objectUrl;
    audioEl.dataset.objectUrl = objectUrl;
    audioEl.classList.remove('hidden');

    audioEl.play().catch(() => {
        // Autoplay might be blocked; user can click play manually.
    });
}

async function loadTtsConfig(widgetEl) {
    const baseUrl = getTtsBaseUrl(widgetEl);
    setTtsStatus(widgetEl, 'Loading available languages and voices…');
    try {
        const config = await fetchJson(`${baseUrl}/api/v1/tts/config`);

        const languageSelect = widgetEl.querySelector('#ttsLanguageSelect');
        const voiceSelect = widgetEl.querySelector('#ttsVoiceSelect');

        const languages = Array.isArray(config.languages) && config.languages.length > 0
            ? config.languages.map(lang => ({ value: lang.id, label: `${lang.label} (${lang.id})` }))
            : [{ value: 'en', label: 'English (en)' }];

        const voices = Array.isArray(config.voices) && config.voices.length > 0
            ? config.voices.map(voice => ({ value: voice.voice_id, label: `${voice.display_name || voice.voice_id} (${voice.language || 'en'})` }))
            : [{ value: 'default', label: 'Default voice (en)' }];

        populateSelect(languageSelect, languages);
        populateSelect(voiceSelect, voices);

        ensureDefaultOption(languageSelect, 'en', 'English (en)');
        ensureDefaultOption(voiceSelect, voices[0].value, voices[0].label);

        setTtsStatus(widgetEl, 'Ready to synthesize speech.', 'success');
    } catch (error) {
        console.error('Failed to load TTS config', error);
        setTtsStatus(widgetEl, 'Failed to load TTS configuration. Please verify the voice service is running.', 'error');
    }
}

async function synthesizeSpeech(widgetEl) {
    const baseUrl = getTtsBaseUrl(widgetEl);
    const textInput = widgetEl.querySelector('#ttsTextInput');
    const languageSelect = widgetEl.querySelector('#ttsLanguageSelect');
    const voiceSelect = widgetEl.querySelector('#ttsVoiceSelect');
    const button = widgetEl.querySelector('#ttsSpeakBtn');

    if (!textInput || !languageSelect || !voiceSelect || !button) {
        return;
    }

    const text = textInput.value.trim();
    if (!text) {
        setTtsStatus(widgetEl, 'Please provide some text to synthesize.', 'error');
        textInput.focus();
        return;
    }

    button.disabled = true;
    setTtsStatus(widgetEl, 'Generating speech…');

    try {
        const payload = {
            text: text,
            language: languageSelect.value || 'en',
            speaker_id: voiceSelect.value || 'default',
            store_generated_audio: false
        };

        const response = await fetchJson(`${baseUrl}/api/v1/tts/synthesize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.audio_base64) {
            throw new Error('Missing audio payload in response');
        }

        updateAudioPlayer(widgetEl, response.audio_base64);
        setTtsStatus(widgetEl, `Speech generated (${response.sample_rate || 0} Hz)`, 'success');
    } catch (error) {
        console.error('Failed to synthesize speech', error);
        setTtsStatus(widgetEl, 'Speech synthesis failed. Check the console for details.', 'error');
    } finally {
        button.disabled = false;
    }
}

function initializeTtsWidget() {
    const widgetEl = document.getElementById('tts-widget');
    if (!widgetEl) {
        return;
    }

    loadTtsConfig(widgetEl);

    const button = widgetEl.querySelector('#ttsSpeakBtn');
    if (button) {
        button.addEventListener('click', () => synthesizeSpeech(widgetEl));
    }
}

$(function () {
    populateHTMLOnLoad();
    initializeTtsWidget();
});
