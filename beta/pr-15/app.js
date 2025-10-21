const SUPABASE_URL = 'https://zfqpbddopgrqbsgizith.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmcXBiZGRvcGdycWJzZ2l6aXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDgzMjQsImV4cCI6MjA3NTE4NDMyNH0.skmx5Y_JQegnqJn2t2uE3qyWokLS0IK2L_YAvWQHW2Q';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const grid = document.querySelector('#phraseGrid');
const emptyState = document.querySelector('#emptyState');
const addButton = document.querySelector('#addButton');
const editToggle = document.querySelector('#editToggle');
const favoritesToggle = document.querySelector('#favoritesToggle');
const phraseTemplate = document.querySelector('#phraseTemplate');
const dialog = document.querySelector('#phraseDialog');
const dialogTitle = document.querySelector('#dialogTitle');
const phraseForm = document.querySelector('#phraseForm');
const fieldLabel = document.querySelector('#fieldLabel');
const fieldTts = document.querySelector('#fieldTts');
const fieldAudio = document.querySelector('#fieldAudio');
const fieldPinned = document.querySelector('#fieldPinned');
const cancelDialog = document.querySelector('#cancelDialog');
const savePhraseButton = document.querySelector('#savePhrase');

const defaultEmptyMessage = emptyState?.textContent?.trim() ?? '';

const state = {
  cards: [],
  isEditMode: false,
  showFavoritesOnly: false,
  isLoading: false,
  playingCardId: null
};

const audioPlayer = new Audio();
audioPlayer.preload = 'none';

audioPlayer.addEventListener('ended', () => {
  state.playingCardId = null;
  renderCards();
});

audioPlayer.addEventListener('error', (error) => {
  state.playingCardId = null;
  console.error('[supabase] Erreur de lecture du MP3.', error);
  renderCards();
});

audioPlayer.addEventListener('pause', () => {
  if (audioPlayer.ended || audioPlayer.currentTime === 0) {
    state.playingCardId = null;
    renderCards();
  }
});

favoritesToggle?.setAttribute('aria-pressed', 'false');
editToggle?.setAttribute('aria-pressed', 'false');

favoritesToggle?.addEventListener('click', () => {
  state.showFavoritesOnly = !state.showFavoritesOnly;
  favoritesToggle.setAttribute('aria-pressed', state.showFavoritesOnly ? 'true' : 'false');
  favoritesToggle.classList.toggle('is-active', state.showFavoritesOnly);
  renderCards();
});

editToggle?.addEventListener('click', () => {
  state.isEditMode = !state.isEditMode;
  editToggle.setAttribute('aria-pressed', state.isEditMode ? 'true' : 'false');
  editToggle.classList.toggle('is-active', state.isEditMode);
  renderCards();
});

addButton?.addEventListener('click', () => openDialog());

cancelDialog?.addEventListener('click', () => {
  closeDialog();
});

dialog?.addEventListener('close', () => {
  resetForm();
});

phraseForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const label = fieldLabel.value.trim();
  if (!label) {
    return;
  }

  const phrase = fieldTts.value.trim() || label;
  const audioPath = fieldAudio?.value.trim() || null;
  const isFavorite = fieldPinned.checked;

  savePhraseButton.disabled = true;
  try {
    await addCard({ label, phrase, audioPath, isFavorite });
    closeDialog();
  } catch (error) {
    console.error('[supabase] Impossible d\'ajouter la demande.', error);
    alert("Impossible d'ajouter la demande. Réessayez plus tard.");
  } finally {
    savePhraseButton.disabled = false;
  }
});

loadCards();
registerServiceWorker();

function resetForm() {
  phraseForm?.reset();
  if (fieldAudio) {
    fieldAudio.value = '';
  }
  if (fieldPinned) {
    fieldPinned.checked = false;
  }
  if (fieldTts) {
    fieldTts.value = '';
  }
  if (fieldLabel) {
    fieldLabel.value = '';
  }
}

function openDialog() {
  if (!dialog) {
    return;
  }
  resetForm();
  if (dialogTitle) {
    dialogTitle.textContent = 'Nouvelle demande';
  }
  dialog.showModal();
  fieldLabel?.focus();
}

function closeDialog() {
  if (dialog?.open) {
    dialog.close();
  }
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  if (grid) {
    grid.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    grid.classList.toggle('is-loading', isLoading);
  }
  if (!emptyState) {
    return;
  }
  if (isLoading) {
    if (state.cards.length === 0) {
      emptyState.textContent = 'Chargement des demandes...';
      emptyState.hidden = false;
    }
  } else if (state.cards.length === 0) {
    emptyState.textContent = defaultEmptyMessage;
  }
}

function toPublicUrl(path) {
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const cleanedPath = path.replace(/^\//, '');
  return `https://zfqpbddopgrqbsgizith.supabase.co/storage/v1/object/public/${cleanedPath}`;
}

async function loadCards() {
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('id,label,phrase,audio_path,is_favorite,created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    state.cards = Array.isArray(data) ? data : [];
    renderCards();
  } catch (error) {
    console.error('[supabase] Impossible de charger les demandes.', error);
    if (emptyState) {
      emptyState.textContent = "Impossible de charger les demandes.";
      emptyState.hidden = false;
    }
  } finally {
    setLoading(false);
    renderCards();
  }
}

function getVisibleCards() {
  if (!state.showFavoritesOnly) {
    return state.cards;
  }
  return state.cards.filter((card) => card.is_favorite);
}

function renderCards() {
  if (!grid || !phraseTemplate) {
    return;
  }

  const cards = getVisibleCards();
  grid.innerHTML = '';

  if (cards.length === 0) {
    if (emptyState) {
      if (state.isLoading) {
        emptyState.textContent = 'Chargement des demandes...';
      } else if (state.showFavoritesOnly) {
        emptyState.textContent = 'Aucun favori pour le moment.';
      } else {
        emptyState.textContent = defaultEmptyMessage;
      }
      emptyState.hidden = false;
    }
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const card of cards) {
    const templateContent = phraseTemplate.content.firstElementChild.cloneNode(true);
    const cardWrapper = templateContent;
    const article = cardWrapper.querySelector('.phrase-card');
    const button = cardWrapper.querySelector('.phrase-button');
    const pinnedIndicator = cardWrapper.querySelector('.pinned-indicator');
    const starButton = cardWrapper.querySelector('.star');
    const editButton = cardWrapper.querySelector('.edit');
    const queueIndicator = cardWrapper.querySelector('.queue-indicator');

    const hasAudio = Boolean(card.audio_path && card.audio_path.trim());

    if (article) {
      article.dataset.cardId = card.id;
      article.classList.toggle('is-pinned', Boolean(card.is_favorite));
      article.classList.toggle('is-active', state.playingCardId === card.id);
    }

    if (button) {
      button.replaceChildren(createLabelElement(card.label), createPhraseElement(card.phrase));
      button.disabled = !hasAudio;
      if (hasAudio) {
        button.removeAttribute('aria-disabled');
      } else {
        button.setAttribute('aria-disabled', 'true');
      }
      button.addEventListener('click', () => handlePlay(card));
    }

    if (pinnedIndicator) {
      pinnedIndicator.textContent = '★';
      pinnedIndicator.classList.toggle('is-visible', Boolean(card.is_favorite));
    }

    if (starButton) {
      starButton.textContent = card.is_favorite ? '★' : '☆';
      starButton.classList.toggle('is-active', Boolean(card.is_favorite));
      starButton.setAttribute('aria-pressed', card.is_favorite ? 'true' : 'false');
      starButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleFavorite(card.id, !card.is_favorite);
      });
    }

    if (editButton) {
      editButton.textContent = '🗑';
      editButton.setAttribute('aria-label', 'Supprimer la demande');
      editButton.hidden = !state.isEditMode;
      editButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (confirm('Supprimer cette demande ?')) {
          deleteCard(card.id);
        }
      });
    }

    if (queueIndicator) {
      queueIndicator.textContent = 'MP3 indisponible';
      queueIndicator.hidden = hasAudio;
    }

    fragment.appendChild(cardWrapper);
  }

  grid.appendChild(fragment);

  if (emptyState) {
    emptyState.hidden = true;
    emptyState.textContent = defaultEmptyMessage;
  }
}

function createLabelElement(text) {
  const span = document.createElement('span');
  span.className = 'phrase-label';
  span.textContent = text;
  return span;
}

function createPhraseElement(text) {
  const span = document.createElement('span');
  span.className = 'phrase-tts';
  span.textContent = text;
  return span;
}

async function handlePlay(card) {
  if (!card?.audio_path) {
    return;
  }

  const url = toPublicUrl(card.audio_path);
  if (!url) {
    return;
  }

  try {
    if (!audioPlayer.paused && state.playingCardId === card.id) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      state.playingCardId = null;
      renderCards();
      return;
    }

    if (!audioPlayer.paused) {
      audioPlayer.pause();
    }

    if (audioPlayer.src !== url) {
      audioPlayer.src = url;
    }

    await audioPlayer.play();
    state.playingCardId = card.id;
    renderCards();
  } catch (error) {
    state.playingCardId = null;
    console.error('[supabase] Impossible de lire le MP3.', error);
    alert("Impossible de lire le MP3. Vérifiez le lien ou réessayez plus tard.");
  }
}

async function addCard({ label, phrase, audioPath, isFavorite }) {
  try {
    const payload = {
      label,
      phrase,
      audio_path: audioPath || null,
      is_favorite: Boolean(isFavorite),
      is_active: true
    };
    const { data, error } = await supabase
      .from('cards')
      .insert(payload)
      .select('id,label,phrase,audio_path,is_favorite,created_at')
      .single();

    if (error) {
      throw error;
    }

    state.cards = [data, ...state.cards];
    renderCards();
  } catch (error) {
    throw error;
  }
}

async function toggleFavorite(id, nextValue) {
  try {
    const { error } = await supabase
      .from('cards')
      .update({ is_favorite: nextValue })
      .eq('id', id);

    if (error) {
      throw error;
    }

    state.cards = state.cards.map((card) =>
      card.id === id ? { ...card, is_favorite: nextValue } : card
    );
    renderCards();
  } catch (error) {
    console.error('[supabase] Impossible de mettre à jour le favori.', error);
    alert("Impossible de mettre à jour le favori. Réessayez plus tard.");
  }
}

async function deleteCard(id) {
  try {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    state.cards = state.cards.filter((card) => card.id !== id);
    renderCards();
  } catch (error) {
    console.error('[supabase] Impossible de supprimer la demande.', error);
    alert("Impossible de supprimer la demande. Réessayez plus tard.");
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((error) => console.error('[supabase] Service worker non enregistré.', error));
  });
}
