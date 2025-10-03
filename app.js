const STORAGE_KEY = 'aac_phrases_v1';
const SETTINGS_KEY = 'aac_settings_v1';
const QUEUE_KEY = 'aac_generation_queue_v1';
const MP3_CACHE_NAME = 'aac-mp3-v1';

// Configuration à remplacer par vos identifiants ElevenLabs.
window.APP_CONFIG = window.APP_CONFIG || {
  tts: {
    apiKey: '', // Renseignez votre clé API ElevenLabs
    voiceId: '', // Identifiant de voix ElevenLabs
    modelId: 'eleven_monolingual_v1',
    baseUrl: 'https://api.elevenlabs.io/v1',
    stability: 0.5,
    similarityBoost: 0.75
  }
};

const DEFAULT_PHRASES = [
  {
    id: 'phrase-toilettes',
    label: 'Aller aux toilettes',
    tts_text: 'Je voudrais aller aux toilettes, s’il vous plaît.',
    pinned: true,
    sort_order: 1
  },
  {
    id: 'phrase-boire',
    label: 'Boire',
    tts_text: 'Je voudrais boire, s’il vous plaît.',
    pinned: true,
    sort_order: 2
  },
  {
    id: 'phrase-manger',
    label: 'Manger',
    tts_text: 'Je voudrais manger, s’il vous plaît.',
    pinned: false,
    sort_order: 3
  },
  {
    id: 'phrase-medicaments',
    label: 'Mes médicaments',
    tts_text: 'J’ai besoin de mes médicaments, s’il vous plaît.',
    pinned: false,
    sort_order: 4
  },
  {
    id: 'phrase-tele',
    label: 'Allumer la télé',
    tts_text: 'Pouvez-vous allumer la télévision, s’il vous plaît ?',
    pinned: false,
    sort_order: 5
  },
  {
    id: 'phrase-descendre',
    label: 'Descendre',
    tts_text: 'J’aimerais descendre, s’il vous plaît.',
    pinned: false,
    sort_order: 6
  },
  {
    id: 'phrase-jardin',
    label: 'Aller dans le jardin',
    tts_text: 'Je voudrais aller dans le jardin.',
    pinned: false,
    sort_order: 7
  },
  {
    id: 'phrase-coucher',
    label: 'Me coucher',
    tts_text: 'Je voudrais me coucher.',
    pinned: false,
    sort_order: 8
  },
  {
    id: 'phrase-douleur',
    label: 'Douleur',
    tts_text: 'J’ai mal, j’ai une douleur.',
    pinned: true,
    sort_order: 9
  },
  {
    id: 'phrase-incliner-fauteuil',
    label: 'Incliner mon fauteuil',
    tts_text: 'Pouvez-vous incliner mon fauteuil, s’il vous plaît ?',
    pinned: false,
    sort_order: 10
  }
];

const grid = document.querySelector('#phraseGrid');
const emptyState = document.querySelector('#emptyState');
const addButton = document.querySelector('#addButton');
const favoritesToggle = document.querySelector('#favoritesToggle');
const volumeRange = document.querySelector('#volumeRange');
const phraseTemplate = document.querySelector('#phraseTemplate');
const dialog = document.querySelector('#phraseDialog');
const dialogTitle = document.querySelector('#dialogTitle');
const fieldLabel = document.querySelector('#fieldLabel');
const fieldTts = document.querySelector('#fieldTts');
const fieldPinned = document.querySelector('#fieldPinned');
const fieldRegenerate = document.querySelector('#fieldRegenerate');
const regenerateRow = document.querySelector('#regenerateRow');
const cancelDialog = document.querySelector('#cancelDialog');
const phraseForm = document.querySelector('#phraseForm');

let phrases = loadPhrases();
let settings = loadSettings();
let generationQueue = loadQueue();
let dragSourceId = null;
let currentPlayingId = null;
let isProcessingQueue = false;

const audio = new Audio();
audio.preload = 'auto';
audio.volume = settings.volume ?? 1;
volumeRange.value = String(audio.volume);

volumeRange.addEventListener('input', () => {
  audio.volume = Number(volumeRange.value);
  settings.volume = audio.volume;
  saveSettings(settings);
});

audio.addEventListener('ended', () => {
  if (currentPlayingId) {
    toggleCardPlaying(currentPlayingId, false);
    currentPlayingId = null;
  }
});

audio.addEventListener('error', () => {
  if (currentPlayingId) {
    toggleCardPlaying(currentPlayingId, false);
    currentPlayingId = null;
  }
});

favoritesToggle.setAttribute('aria-pressed', settings.favoritesFirst ? 'true' : 'false');
if (settings.favoritesFirst) {
  favoritesToggle.classList.add('is-active');
}

favoritesToggle.addEventListener('click', () => {
  settings.favoritesFirst = !settings.favoritesFirst;
  favoritesToggle.setAttribute('aria-pressed', settings.favoritesFirst ? 'true' : 'false');
  favoritesToggle.classList.toggle('is-active', settings.favoritesFirst);
  saveSettings(settings);
  render();
});

addButton.addEventListener('click', () => openDialog());
cancelDialog.addEventListener('click', () => closeDialog());

phraseForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const isEdition = Boolean(phraseForm.dataset.editingId);
  const label = fieldLabel.value.trim();
  if (!label) {
    return;
  }
  const tts = fieldTts.value.trim() || label;
  const pinned = fieldPinned.checked;
  const regenerate = fieldRegenerate.checked;

  if (isEdition) {
    const id = phraseForm.dataset.editingId;
    const phrase = phrases.find((item) => item.id === id);
    if (!phrase) {
      closeDialog();
      return;
    }
    const textChanged = phrase.tts_text !== tts;
    const previousUrl = phrase.mp3Url;
    phrase.label = label;
    phrase.tts_text = tts;
    phrase.pinned = pinned;
    if (textChanged || regenerate) {
      removeAudioFromCache(previousUrl).catch((error) => console.warn('Suppression MP3 impossible', error));
      phrase.mp3Url = undefined;
      phrase.hasMp3 = false;
      enqueueGeneration(id, { force: true });
    }
    savePhrases();
    render();
  } else {
    const id = `phrase-${Date.now().toString(36)}`;
    const sort_order = (phrases.reduce((max, item) => Math.max(max, item.sort_order ?? 0), 0) + 1);
    const newPhrase = {
      id,
      label,
      tts_text: tts,
      pinned,
      sort_order
    };
    phrases.push(newPhrase);
    savePhrases();
    enqueueGeneration(id, { force: true });
    render();
  }

  closeDialog();
  phraseForm.reset();
});

cancelDialog.addEventListener('click', () => {
  phraseForm.reset();
  closeDialog();
});

dialog.addEventListener('close', () => {
  phraseForm.reset();
  phraseForm.dataset.editingId = '';
  regenerateRow.hidden = true;
  fieldRegenerate.checked = false;
});

render();
registerServiceWorker();
processAvailability();
processQueue();

function isTtsConfigured() {
  const { tts } = window.APP_CONFIG;
  return Boolean(tts?.apiKey && tts?.voiceId);
}

function loadPhrases() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_PHRASES.map((phrase) => ({ ...phrase }));
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_PHRASES.map((phrase) => ({ ...phrase }));
    }
    return parsed.map((phrase, index) => ({
      ...phrase,
      sort_order: phrase.sort_order ?? index + 1
    }));
  } catch (error) {
    console.warn('Impossible de lire les phrases stockées, retour aux valeurs par défaut.', error);
    return DEFAULT_PHRASES.map((phrase) => ({ ...phrase }));
  }
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { favoritesFirst: true, volume: 1 };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      favoritesFirst: parsed.favoritesFirst ?? true,
      volume: typeof parsed.volume === 'number' ? parsed.volume : 1
    };
  } catch (error) {
    console.warn('Paramètres illisibles, utilisation des valeurs par défaut.', error);
    return { favoritesFirst: true, volume: 1 };
  }
}

function saveSettings(next) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

function loadQueue() {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    console.warn('File de génération illisible.', error);
  }
  return [];
}

function saveQueue() {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(generationQueue));
}

function savePhrases() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases));
}

function openDialog(id) {
  dialog.showModal();
  if (id) {
    dialogTitle.textContent = 'Modifier la demande';
    phraseForm.dataset.editingId = id;
    const phrase = phrases.find((item) => item.id === id);
    if (!phrase) return;
    fieldLabel.value = phrase.label;
    fieldTts.value = phrase.tts_text || phrase.label;
    fieldPinned.checked = Boolean(phrase.pinned);
    regenerateRow.hidden = false;
    fieldRegenerate.checked = false;
  } else {
    dialogTitle.textContent = 'Nouvelle demande';
    phraseForm.dataset.editingId = '';
    fieldPinned.checked = false;
    regenerateRow.hidden = true;
    fieldRegenerate.checked = false;
  }
  setTimeout(() => fieldLabel.focus(), 80);
}

function closeDialog() {
  if (dialog.open) {
    dialog.close();
  }
}

function render() {
  const sorted = phrases
    .slice()
    .sort((a, b) => {
      if (settings.favoritesFirst && a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      const aOrder = a.sort_order ?? 0;
      const bOrder = b.sort_order ?? 0;
      return aOrder - bOrder;
    });

  grid.innerHTML = '';

  if (sorted.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  for (const phrase of sorted) {
    const node = phraseTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = phrase.id;
    const button = node.querySelector('.phrase-button');
    button.textContent = phrase.label;
    button.addEventListener('click', () => handlePhraseTap(phrase.id));

    node.classList.toggle('is-pinned', Boolean(phrase.pinned));
    node.classList.toggle('no-audio', !phrase.hasMp3);
    if (phrase.id === currentPlayingId) {
      node.classList.add('is-playing');
    }

    const starButton = node.querySelector('.star');
    starButton.innerHTML = phrase.pinned ? '★' : '☆';
    starButton.classList.toggle('is-active', Boolean(phrase.pinned));
    starButton.setAttribute('aria-pressed', phrase.pinned ? 'true' : 'false');
    starButton.addEventListener('click', (event) => {
      event.stopPropagation();
      togglePinned(phrase.id);
    });

    const editButton = node.querySelector('.edit');
    editButton.innerHTML = '✎';
    editButton.addEventListener('click', (event) => {
      event.stopPropagation();
      openDialog(phrase.id);
    });

    node.addEventListener('dragstart', () => handleDragStart(phrase.id, node));
    node.addEventListener('dragend', () => handleDragEnd(node));
    node.addEventListener('dragover', (event) => handleDragOver(event, phrase.id));
    node.addEventListener('dragleave', () => node.classList.remove('drag-over-top'));
    node.addEventListener('drop', (event) => handleDrop(event, phrase.id));

    const isQueued = generationQueue.includes(phrase.id);
    node.classList.toggle('is-generating', isQueued);

    if (isQueued) {
      const indicator = document.createElement('div');
      indicator.className = 'queue-indicator';
      indicator.innerHTML = '<span class="dot"></span> MP3 en cours...';
      node.appendChild(indicator);
    }

    grid.appendChild(node);
  }
}

function toggleCardPlaying(id, active) {
  const card = grid.querySelector(`[data-id="${id}"]`);
  if (!card) return;
  card.classList.toggle('is-playing', active);
}

async function handlePhraseTap(id) {
  const phrase = phrases.find((item) => item.id === id);
  if (!phrase) return;

  toggleCardPlaying(id, true);
  if (currentPlayingId && currentPlayingId !== id) {
    toggleCardPlaying(currentPlayingId, false);
  }
  currentPlayingId = id;

  if (phrase.hasMp3 && phrase.mp3Url) {
    try {
      audio.src = phrase.mp3Url;
      await audio.play();
      return;
    } catch (error) {
      console.warn('Lecture impossible, suppression du marquage MP3.', error);
      phrase.hasMp3 = false;
      savePhrases();
      render();
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 600));
  toggleCardPlaying(id, false);
  currentPlayingId = null;

  if (!phrase.hasMp3) {
    enqueueGeneration(id);
  }
}

function togglePinned(id) {
  const phrase = phrases.find((item) => item.id === id);
  if (!phrase) return;
  phrase.pinned = !phrase.pinned;
  savePhrases();
  render();
}

function handleDragStart(id, node) {
  dragSourceId = id;
  node.classList.add('dragging');
}

function handleDragEnd(node) {
  dragSourceId = null;
  node.classList.remove('dragging');
}

function handleDragOver(event, targetId) {
  event.preventDefault();
  if (dragSourceId === targetId) return;
  const target = grid.querySelector(`[data-id="${targetId}"]`);
  if (target) {
    const bounding = target.getBoundingClientRect();
    const offset = event.clientY - bounding.top;
    target.classList.toggle('drag-over-top', offset < bounding.height / 2);
  }
}

function handleDrop(event, targetId) {
  event.preventDefault();
  const target = grid.querySelector(`[data-id="${targetId}"]`);
  if (target) {
    target.classList.remove('drag-over-top');
  }
  if (!dragSourceId || dragSourceId === targetId) return;

  const list = phrases.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const fromIndex = list.findIndex((item) => item.id === dragSourceId);
  const toIndex = list.findIndex((item) => item.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return;

  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved);

  list.forEach((item, index) => {
    const reference = phrases.find((phrase) => phrase.id === item.id);
    if (reference) {
      reference.sort_order = index + 1;
    }
  });

  savePhrases();
  render();
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function buildMp3Url(phrase) {
  const voice = window.APP_CONFIG.tts.voiceId || 'voice-default';
  const key = hashString(`${voice}|${phrase.tts_text}`);
  return `${location.origin}/tts/${key}.mp3`;
}

function enqueueGeneration(id, options = {}) {
  const { force = false } = options;
  const phrase = phrases.find((item) => item.id === id);
  if (!phrase) return;
  if (!phrase.tts_text) return;

  if (!phrase.mp3Url || force) {
    phrase.mp3Url = buildMp3Url(phrase);
    savePhrases();
  }

  if (!generationQueue.includes(id)) {
    generationQueue.push(id);
    saveQueue();
    render();
  }

  if (!isTtsConfigured()) {
    console.info('API TTS non configurée : génération différée.');
    return;
  }

  processQueue();
}

async function processAvailability() {
  if (!('caches' in window)) {
    return;
  }
  const cache = await caches.open(MP3_CACHE_NAME);
  await Promise.all(
    phrases.map(async (phrase) => {
      if (!phrase.tts_text) return;
      if (!phrase.mp3Url) {
        phrase.mp3Url = buildMp3Url(phrase);
      }
      const response = await cache.match(phrase.mp3Url);
      phrase.hasMp3 = Boolean(response);
      if (!phrase.hasMp3) {
        enqueueGeneration(phrase.id);
      }
    })
  );
  savePhrases();
  render();
}

async function processQueue() {
  if (isProcessingQueue) return;
  if (!isTtsConfigured()) return;
  if (generationQueue.length === 0) return;
  isProcessingQueue = true;

  try {
    while (generationQueue.length > 0 && isTtsConfigured()) {
      const id = generationQueue[0];
      const phrase = phrases.find((item) => item.id === id);
      if (!phrase) {
        generationQueue.shift();
        saveQueue();
        continue;
      }
      try {
        await generateMp3ForPhrase(phrase);
        phrase.hasMp3 = true;
        savePhrases();
        generationQueue.shift();
        saveQueue();
        render();
      } catch (error) {
        console.error('Génération impossible, nouvelle tentative plus tard.', error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

async function generateMp3ForPhrase(phrase) {
  const { tts } = window.APP_CONFIG;
  const url = `${tts.baseUrl}/text-to-speech/${tts.voiceId}`;
  const body = {
    text: phrase.tts_text,
    model_id: tts.modelId,
    voice_settings: {
      stability: tts.stability,
      similarity_boost: tts.similarityBoost
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
      'xi-api-key': tts.apiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const mp3Url = phrase.mp3Url || buildMp3Url(phrase);
  const mp3Response = new Response(arrayBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg'
    }
  });

  if ('caches' in window) {
    const cache = await caches.open(MP3_CACHE_NAME);
    await cache.put(mp3Url, mp3Response.clone());
  }
  phrase.mp3Url = mp3Url;
}

async function removeAudioFromCache(url) {
  if (!url || !('caches' in window)) return;
  const cache = await caches.open(MP3_CACHE_NAME);
  await cache.delete(url);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        console.log('Service worker prêt.');
        processAvailability();
      })
      .catch((error) => console.error('Service worker non disponible', error));
  });
}
