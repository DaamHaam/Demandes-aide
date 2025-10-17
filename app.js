const STORAGE_KEY = 'aac_phrases_v1';
const SETTINGS_KEY = 'aac_settings_v1';
const QUEUE_KEY = 'aac_generation_queue_v1';
const VOICE_STORAGE_KEY = 'aac_voice_selection_v1';
const VOICE_NAME_STORAGE_KEY = 'aac_voice_name_v1';
const MP3_CACHE_NAME = 'aac-mp3-v1';

// Configuration à remplacer par vos identifiants ElevenLabs.
window.APP_CONFIG = window.APP_CONFIG || {
  tts: {
    apiKey: 'sk_892bdd87082cf03206422f0fc0daf6db2255d4c9a00c0b6f', // Clé API ElevenLabs « Demandes JD »
    voiceId: '', // Identifiant de voix ElevenLabs
    voiceName: 'Demandes JD',
    modelId: 'eleven_monolingual_v1',
    baseUrl: 'https://api.elevenlabs.io/v1',
    stability: 0.5,
    similarityBoost: 0.75
  }
};

try {
  const savedVoiceId = localStorage.getItem(VOICE_STORAGE_KEY);
  const savedVoiceName = localStorage.getItem(VOICE_NAME_STORAGE_KEY);
  if (savedVoiceId && !window.APP_CONFIG.tts.voiceId) {
    window.APP_CONFIG.tts.voiceId = savedVoiceId;
  }
  if (savedVoiceName && !window.APP_CONFIG.tts.voiceName) {
    window.APP_CONFIG.tts.voiceName = savedVoiceName;
  }
} catch (error) {
  console.warn('Stockage local indisponible pour la voix ElevenLabs.', error);
}

const DEFAULT_PHRASES = [
  {
    id: 'phrase-toilettes',
    label: 'Aller aux toilettes',
    tts_text: 'Je voudrais aller aux toilettes.',
    localAudio: './audio/aller-aux-toilettes.mp3',
    hasMp3: true,
    pinned: true,
    sort_order: 1
  },
  {
    id: 'phrase-boire',
    label: 'Boire',
    tts_text: 'Je voudrais boire.',
    localAudio: './audio/boire.mp3',
    hasMp3: true,
    pinned: true,
    sort_order: 2
  },
  {
    id: 'phrase-manger',
    label: 'Manger',
    tts_text: 'Je voudrais manger.',
    localAudio: './audio/manger.mp3',
    hasMp3: true,
    pinned: false,
    sort_order: 3
  },
  {
    id: 'phrase-medicaments',
    label: 'Mes médicaments',
    tts_text: 'Je voudrais mes médicaments.',
    localAudio: './audio/mes-medicaments.mp3',
    hasMp3: true,
    pinned: false,
    sort_order: 4
  },
  {
    id: 'phrase-tele',
    label: 'Allumer la télé',
    tts_text: 'Je voudrais allumer la télé.',
    localAudio: './audio/allumer-la-tele.mp3',
    hasMp3: true,
    pinned: false,
    sort_order: 5
  },
  {
    id: 'phrase-descendre',
    label: 'Descendre',
    tts_text: 'Je voudrais descendre.',
    localAudio: './audio/descendre.mp3',
    hasMp3: true,
    pinned: false,
    sort_order: 6
  },
  {
    id: 'phrase-jardin',
    label: 'Aller dans le jardin',
    tts_text: 'Je voudrais aller dans le jardin.',
    localAudio: './audio/aller-dans-le-jardin.mp3',
    hasMp3: true,
    pinned: false,
    sort_order: 7
  },
  {
    id: 'phrase-coucher',
    label: 'Me coucher',
    tts_text: 'Je voudrais me coucher.',
    localAudio: './audio/me-coucher.mp3',
    hasMp3: true,
    pinned: false,
    sort_order: 8
  },
  {
    id: 'phrase-douleur',
    label: 'Douleur',
    tts_text: 'J’ai mal.',
    localAudio: './audio/jai-mal.mp3',
    hasMp3: true,
    pinned: true,
    sort_order: 9
  },
  {
    id: 'phrase-incliner-fauteuil',
    label: 'Incliner mon fauteuil',
    tts_text: 'Pouvez-vous incliner mon fauteuil ?',
    localAudio: './audio/incliner-mon-fauteuil.mp3',
    hasMp3: true,
    pinned: false,
    sort_order: 10
  },
  {
    id: 'phrase-mouchoir',
    label: 'Un mouchoir',
    tts_text: 'Je voudrais un mouchoir.',
    localAudio: './audio/un-mouchoir.mp3',
    hasMp3: true,
    pinned: false,
    sort_order: 11
  }
];

function isLocalAudio(phrase) {
  return Boolean(phrase?.localAudio);
}

function getPhraseAudioUrl(phrase) {
  if (!phrase) {
    return '';
  }
  if (isLocalAudio(phrase)) {
    return phrase.localAudio;
  }
  return phrase.mp3Url || '';
}

const grid = document.querySelector('#phraseGrid');
const emptyState = document.querySelector('#emptyState');
const addButton = document.querySelector('#addButton');
const editToggle = document.querySelector('#editToggle');
const favoritesToggle = document.querySelector('#favoritesToggle');
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
let isProcessingQueue = false;
let currentGenerationId = null;
let activePhraseId = null;
let playingPhraseId = null;
let isEditMode = false;

if (!editToggle) {
  throw new Error('Le bouton « Mode édition » est introuvable dans le DOM.');
}

const audio = new Audio();
audio.preload = 'auto';
audio.volume = settings.volume ?? 1;

audio.addEventListener('ended', () => {
  playingPhraseId = null;
});

audio.addEventListener('error', () => {
  playingPhraseId = null;
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

editToggle.addEventListener('click', () => {
  isEditMode = !isEditMode;
  editToggle.setAttribute('aria-pressed', isEditMode ? 'true' : 'false');
  editToggle.classList.toggle('is-active', isEditMode);
  render();
});

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
      if (isLocalAudio(phrase)) {
        phrase.localAudio = undefined;
      } else {
        removeAudioFromCache(previousUrl).catch((error) => console.warn('Suppression MP3 impossible', error));
      }
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
      sort_order,
      hasMp3: false
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
requestPersistentStorage();
initializeTtsConfiguration();
processAvailability();
processQueue();

async function initializeTtsConfiguration() {
  const { tts } = window.APP_CONFIG;
  if (!tts || !tts.apiKey) {
    return;
  }

  if (tts.voiceId) {
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, tts.voiceId);
      if (tts.voiceName) {
        localStorage.setItem(VOICE_NAME_STORAGE_KEY, tts.voiceName);
      }
    } catch (error) {
      console.warn('Impossible de mémoriser la voix ElevenLabs sélectionnée.', error);
    }
    processQueue();
    return;
  }

  try {
    const response = await fetch(`${tts.baseUrl}/voices`, {
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': tts.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur ElevenLabs lors de la récupération des voix : ${response.status}`);
    }

    const payload = await response.json();
    const voices = Array.isArray(payload?.voices) ? payload.voices : [];
    const preferredVoice = tts.voiceName
      ? voices.find((voice) => voice?.name?.toLowerCase() === tts.voiceName.toLowerCase())
      : undefined;
    const selectedVoice = preferredVoice || voices[0];

    if (!selectedVoice) {
      console.warn('Aucune voix ElevenLabs disponible avec la clé fournie.');
      return;
    }

    tts.voiceId = selectedVoice.voice_id;
    tts.voiceName = selectedVoice.name || tts.voiceName;

    let shouldSave = false;
    for (const phrase of phrases) {
      if (isLocalAudio(phrase)) {
        continue;
      }
      const nextUrl = buildMp3Url(phrase);
      if (phrase.mp3Url !== nextUrl) {
        phrase.mp3Url = nextUrl;
        phrase.hasMp3 = false;
        shouldSave = true;
      }
    }

    if (shouldSave) {
      savePhrases();
      render();
    }

    try {
      localStorage.setItem(VOICE_STORAGE_KEY, tts.voiceId);
      if (tts.voiceName) {
        localStorage.setItem(VOICE_NAME_STORAGE_KEY, tts.voiceName);
      }
    } catch (error) {
      console.warn('Impossible d’enregistrer la voix ElevenLabs sélectionnée.', error);
    }

    processAvailability();
    processQueue();
  } catch (error) {
    console.error('Initialisation ElevenLabs impossible.', error);
  }
}

function isTtsConfigured() {
  const { tts } = window.APP_CONFIG;
  return Boolean(tts?.apiKey && tts?.voiceId);
}

function loadPhrases() {
  const applyLocalAudioDefaults = (phrase) => {
    if (isLocalAudio(phrase)) {
      return {
        ...phrase,
        hasMp3: true,
        mp3Url: phrase.localAudio
      };
    }
    return phrase;
  };

  const cloneDefaults = () => DEFAULT_PHRASES.map((phrase) => applyLocalAudioDefaults({ ...phrase }));

  const mergeWithDefaults = (list) => {
    const map = new Map();
    list.forEach((item, index) => {
      const withOrder = {
        ...item,
        sort_order: item.sort_order ?? index + 1
      };
      map.set(withOrder.id, applyLocalAudioDefaults(withOrder));
    });

    for (const defaultPhrase of DEFAULT_PHRASES) {
      if (map.has(defaultPhrase.id)) {
        const existing = map.get(defaultPhrase.id);
        if (isLocalAudio(defaultPhrase)) {
          existing.localAudio = defaultPhrase.localAudio;
          existing.hasMp3 = true;
          existing.mp3Url = defaultPhrase.localAudio;
        }
        if (typeof existing.sort_order !== 'number' && typeof defaultPhrase.sort_order === 'number') {
          existing.sort_order = defaultPhrase.sort_order;
        }
      } else {
        map.set(defaultPhrase.id, applyLocalAudioDefaults({ ...defaultPhrase }));
      }
    }

    return Array.from(map.values()).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  };

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return cloneDefaults();
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return cloneDefaults();
    }
    return mergeWithDefaults(parsed);
  } catch (error) {
    console.warn('Impossible de lire les phrases stockées, retour aux valeurs par défaut.', error);
    return cloneDefaults();
  }
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { favoritesFirst: true };
  }
  try {
    const parsed = JSON.parse(raw) || {};
    const next = {
      favoritesFirst: parsed.favoritesFirst ?? true
    };
    if (Object.prototype.hasOwnProperty.call(parsed, 'volume')) {
      saveSettings(next);
    }
    return next;
  } catch (error) {
    console.warn('Paramètres illisibles, utilisation des valeurs par défaut.', error);
    return { favoritesFirst: true };
  }
}

function saveSettings(next) {
  const payload = { favoritesFirst: Boolean(next.favoritesFirst) };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
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
  editToggle.setAttribute('aria-pressed', isEditMode ? 'true' : 'false');
  editToggle.classList.toggle('is-active', isEditMode);

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
    const card = node.querySelector('.phrase-card');
    card.dataset.id = phrase.id;
    card.classList.toggle('is-editing', isEditMode);
    const button = card.querySelector('.phrase-button');
    button.textContent = phrase.label;
    button.addEventListener('click', () => handlePhraseTap(phrase.id));

    const hasMp3 = phrase.hasMp3 === true || isLocalAudio(phrase);

    card.classList.toggle('is-pinned', Boolean(phrase.pinned));
    card.classList.toggle('is-active', phrase.id === activePhraseId);

    const actions = card.querySelector('.phrase-actions');
    const pinnedIndicator = actions.querySelector('.pinned-indicator');
    const previousButtons = actions.querySelectorAll('button');
    previousButtons.forEach((button) => button.remove());

    if (pinnedIndicator) {
      pinnedIndicator.textContent = phrase.pinned ? '★' : '';
      pinnedIndicator.classList.toggle('is-visible', Boolean(phrase.pinned) && !isEditMode);
    }

    if (isEditMode) {
      const starButton = document.createElement('button');
      starButton.type = 'button';
      starButton.className = 'star';
      starButton.innerHTML = phrase.pinned ? '★' : '☆';
      starButton.classList.toggle('is-active', Boolean(phrase.pinned));
      starButton.setAttribute('aria-label', 'Basculer en favori');
      starButton.setAttribute('aria-pressed', phrase.pinned ? 'true' : 'false');
      starButton.addEventListener('click', (event) => {
        event.stopPropagation();
        togglePinned(phrase.id);
      });

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'edit';
      editButton.innerHTML = '✎';
      editButton.setAttribute('aria-label', 'Modifier');
      editButton.addEventListener('click', (event) => {
        event.stopPropagation();
        openDialog(phrase.id);
      });

      actions.append(starButton, editButton);
    }

    card.addEventListener('dragstart', () => handleDragStart(phrase.id, card));
    card.addEventListener('dragend', () => handleDragEnd(card));
    card.addEventListener('dragover', (event) => handleDragOver(event, phrase.id));
    card.addEventListener('dragleave', () => card.classList.remove('drag-over-top'));
    card.addEventListener('drop', (event) => handleDrop(event, phrase.id));

    const isActiveGeneration = phrase.id === currentGenerationId;
    card.classList.toggle('is-generating', isActiveGeneration);

    const queueIndicator = node.querySelector('.queue-indicator');
    if (queueIndicator) {
      if (!hasMp3) {
        queueIndicator.hidden = false;
        if (isActiveGeneration) {
          queueIndicator.innerHTML = '<span class="dot"></span> MP3 en cours...';
        } else {
          queueIndicator.textContent = 'Pas de MP3';
        }
      } else {
        queueIndicator.hidden = true;
        queueIndicator.textContent = '';
      }
    }

    grid.appendChild(node);
  }
}

async function handlePhraseTap(id) {
  const phrase = phrases.find((item) => item.id === id);
  if (!phrase) return;

  setActiveCard(id);

  if (playingPhraseId && playingPhraseId !== id) {
    audio.pause();
    audio.currentTime = 0;
  }

  const audioUrl = getPhraseAudioUrl(phrase);
  const canPlayCachedAudio = Boolean(audioUrl) && (phrase.hasMp3 || isLocalAudio(phrase));

  if (canPlayCachedAudio) {
    try {
      audio.src = audioUrl;
      playingPhraseId = id;
      await audio.play();
      return;
    } catch (error) {
      console.warn('Lecture impossible, suppression du marquage MP3.', error);
      if (!isLocalAudio(phrase)) {
        phrase.hasMp3 = false;
        savePhrases();
        render();
      }
    }
  }

  playingPhraseId = null;

  if (!isLocalAudio(phrase) && !phrase.hasMp3) {
    enqueueGeneration(id);
  }
}

function setActiveCard(id) {
  if (activePhraseId && activePhraseId !== id) {
    const previous = grid.querySelector(`.phrase-card[data-id="${activePhraseId}"]`);
    if (previous) {
      previous.classList.remove('is-active');
    }
  }

  activePhraseId = id;
  const card = grid.querySelector(`.phrase-card[data-id="${id}"]`);
  if (card) {
    card.classList.add('is-active');
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
  const target = grid.querySelector(`.phrase-card[data-id="${targetId}"]`);
  if (target) {
    const bounding = target.getBoundingClientRect();
    const offset = event.clientY - bounding.top;
    target.classList.toggle('drag-over-top', offset < bounding.height / 2);
  }
}

function handleDrop(event, targetId) {
  event.preventDefault();
  const target = grid.querySelector(`.phrase-card[data-id="${targetId}"]`);
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

  if (isLocalAudio(phrase)) {
    phrase.hasMp3 = true;
    if (!phrase.mp3Url) {
      phrase.mp3Url = phrase.localAudio;
      savePhrases();
    }
    return;
  }

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
  let updated = false;
  for (const phrase of phrases) {
    if (isLocalAudio(phrase)) {
      if (!phrase.hasMp3) {
        phrase.hasMp3 = true;
        updated = true;
      }
      if (!phrase.mp3Url) {
        phrase.mp3Url = phrase.localAudio;
        updated = true;
      }
    }
  }

  if (!('caches' in window)) {
    if (updated) {
      savePhrases();
      render();
    }
    return;
  }
  const cache = await caches.open(MP3_CACHE_NAME);
  await Promise.all(
    phrases.map(async (phrase) => {
      if (isLocalAudio(phrase)) {
        return;
      }
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
        currentGenerationId = null;
        render();
        continue;
      }

      if (isLocalAudio(phrase)) {
        phrase.hasMp3 = true;
        generationQueue.shift();
        saveQueue();
        currentGenerationId = null;
        render();
        continue;
      }

      currentGenerationId = id;
      render();

      let generationCompleted = false;
      try {
        await generateMp3ForPhrase(phrase);
        phrase.hasMp3 = true;
        savePhrases();
        generationQueue.shift();
        saveQueue();
        generationCompleted = true;
      } catch (error) {
        console.error('Génération impossible, nouvelle tentative plus tard.', error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      if (generationCompleted) {
        currentGenerationId = null;
        render();
      }
    }
  } finally {
    currentGenerationId = null;
    render();
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

async function requestPersistentStorage() {
  if (!navigator.storage || typeof navigator.storage.persist !== 'function') {
    return;
  }
  try {
    const alreadyPersisted = await navigator.storage.persisted();
    if (!alreadyPersisted) {
      await navigator.storage.persist();
    }
  } catch (error) {
    console.warn('Stockage persistant indisponible', error);
  }
}
