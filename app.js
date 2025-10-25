const SUPABASE_URL = 'https://zfqpbddopgrqbsgizith.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmcXBiZGRvcGdycWJzZ2l6aXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDgzMjQsImV4cCI6MjA3NTE4NDMyNH0.skmx5Y_JQegnqJn2t2uE3qyWokLS0IK2L_YAvWQHW2Q';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const grid = document.querySelector('#phraseGrid');
const emptyState = document.querySelector('#emptyState');
const addButton = document.querySelector('#addButton');
const editToggle = document.querySelector('#editToggle');
const phraseTemplate = document.querySelector('#phraseTemplate');
const dialog = document.querySelector('#phraseDialog');
const dialogTitle = document.querySelector('#dialogTitle');
const phraseForm = document.querySelector('#phraseForm');
const fieldLabel = document.querySelector('#fieldLabel');
const fieldTts = document.querySelector('#fieldTts');
const fieldPinned = document.querySelector('#fieldPinned');
const cancelDialog = document.querySelector('#cancelDialog');
const savePhraseButton = document.querySelector('#savePhrase');

const defaultEmptyMessage = emptyState?.textContent?.trim() ?? '';

const state = {
  cards: [],
  isEditMode: false,
  isLoading: false,
  activeCardId: null,
  playingCardId: null,
  editingCardId: null
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

editToggle?.setAttribute('aria-pressed', 'false');

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
  const isFavorite = fieldPinned.checked;

  savePhraseButton.disabled = true;
  try {
    if (state.editingCardId) {
      await updateCard(state.editingCardId, { label, phrase, isFavorite });
    } else {
      await addCard({ label, phrase, isFavorite });
    }
    closeDialog();
  } catch (error) {
    const actionLabel = state.editingCardId ? 'mettre à jour' : 'ajouter';
    console.error(`[supabase] Impossible de ${actionLabel} la demande.`, error);
    alert(`Impossible de ${actionLabel} la demande. Réessayez plus tard.`);
  } finally {
    savePhraseButton.disabled = false;
  }
});

loadCards();
registerServiceWorker();

function resetForm() {
  phraseForm?.reset();
  if (fieldPinned) {
    fieldPinned.checked = false;
  }
  if (fieldTts) {
    fieldTts.value = '';
  }
  if (fieldLabel) {
    fieldLabel.value = '';
  }
  if (savePhraseButton) {
    savePhraseButton.textContent = 'Enregistrer';
  }
  state.editingCardId = null;
}

function openDialog(card = null) {
  if (!dialog) {
    return;
  }
  resetForm();
  if (card) {
    state.editingCardId = card.id;
    if (dialogTitle) {
      dialogTitle.textContent = 'Modifier la demande';
    }
    if (savePhraseButton) {
      savePhraseButton.textContent = 'Mettre à jour';
    }
    if (fieldLabel) {
      fieldLabel.value = card.label ?? '';
    }
    if (fieldTts) {
      fieldTts.value = card.phrase ?? '';
    }
    if (fieldPinned) {
      fieldPinned.checked = Boolean(card.is_favorite);
    }
  } else if (dialogTitle) {
    dialogTitle.textContent = 'Nouvelle demande';
  }

  dialog.showModal();
  fieldLabel?.focus();
}

function closeDialog() {
  if (dialog?.open) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    if (a.is_favorite === b.is_favorite) {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    }
    return a.is_favorite ? -1 : 1;
  });
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

    state.cards = sortCards(Array.isArray(data) ? data : []);
    if (state.activeCardId && !state.cards.some((card) => card.id === state.activeCardId)) {
      state.activeCardId = null;
    }
    if (state.playingCardId && !state.cards.some((card) => card.id === state.playingCardId)) {
      state.playingCardId = null;
    }
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

function renderCards() {
  if (!grid || !phraseTemplate) {
    return;
  }

  const cards = state.cards;
  grid.innerHTML = '';

  if (cards.length === 0) {
    state.activeCardId = null;
    if (emptyState) {
      if (state.isLoading) {
        emptyState.textContent = 'Chargement des demandes...';
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
    const starButton = cardWrapper.querySelector('.star');
    const deleteButton = cardWrapper.querySelector('.delete');
    const settingsButton = cardWrapper.querySelector('.settings');
    const actions = cardWrapper.querySelector('.phrase-actions');
    const queueIndicator = cardWrapper.querySelector('.queue-indicator');

    const hasAudio = Boolean(card.audio_path && card.audio_path.trim());

    if (article) {
      article.dataset.cardId = card.id;
      article.classList.toggle('is-pinned', Boolean(card.is_favorite));
      article.classList.toggle('is-active', state.activeCardId === card.id);
      article.addEventListener('click', (event) => {
        const isActionClick = event.target.closest('.phrase-actions');
        const isButtonClick = event.target.closest('.phrase-button');
        if (isActionClick || isButtonClick) {
          return;
        }
        handlePlay(card);
      });
    }

    if (button) {
      button.replaceChildren(createLabelElement(card));
      button.dataset.cardId = card.id;
      button.addEventListener('click', () => handlePlay(card));
    }

    if (actions) {
      const isVisible = state.isEditMode;
      actions.hidden = !isVisible;
      actions.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
      actions.classList.toggle('is-visible', isVisible);
    }

    if (starButton) {
      if (state.isEditMode) {
        starButton.hidden = false;
        starButton.textContent = card.is_favorite ? '★' : '☆';
        starButton.classList.toggle('is-active', Boolean(card.is_favorite));
        starButton.setAttribute('aria-pressed', card.is_favorite ? 'true' : 'false');
        starButton.addEventListener('click', (event) => {
          event.stopPropagation();
          if (!state.isEditMode) {
            return;
          }
          toggleFavorite(card.id, !card.is_favorite);
        });
      } else {
        starButton.hidden = true;
      }
    }

    if (deleteButton) {
      if (state.isEditMode) {
        deleteButton.hidden = false;
        deleteButton.textContent = '🗑';
        deleteButton.addEventListener('click', (event) => {
          event.stopPropagation();
          if (!state.isEditMode) {
            return;
          }
          if (confirm('Supprimer cette demande ?')) {
            deleteCard(card.id);
          }
        });
      } else {
        deleteButton.hidden = true;
      }
    }

    if (settingsButton) {
      if (state.isEditMode) {
        settingsButton.hidden = false;
        settingsButton.textContent = '✎';
        settingsButton.addEventListener('click', (event) => {
          event.stopPropagation();
          if (!state.isEditMode) {
            return;
          }
          openDialog(card);
        });
      } else {
        settingsButton.hidden = true;
      }
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

function createLabelElement(card) {
  const fragment = document.createDocumentFragment();

  const text = document.createElement('span');
  text.className = 'phrase-label-text';
  text.textContent = card.label;
  fragment.appendChild(text);

  if (!state.isEditMode && card.is_favorite) {
    const star = document.createElement('span');
    star.className = 'favorite-icon';
    star.textContent = '★';
    star.setAttribute('aria-hidden', 'true');
    fragment.appendChild(star);
  }

  return fragment;
}

async function handlePlay(card) {
  if (!card) {
    return;
  }

  state.activeCardId = card.id;
  renderCards();

  if (!card.audio_path) {
    if (!audioPlayer.paused) {
      audioPlayer.pause();
    }
    state.playingCardId = null;
    renderCards();
    return;
  }

  const url = toPublicUrl(card.audio_path);
  if (!url) {
    state.playingCardId = null;
    renderCards();
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

async function addCard({ label, phrase, isFavorite }) {
  try {
    const payload = {
      label,
      phrase,
      audio_path: null,
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

    state.cards = sortCards([data, ...state.cards]);
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

    state.cards = sortCards(
      state.cards.map((card) =>
        card.id === id ? { ...card, is_favorite: nextValue } : card
      )
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

    state.cards = sortCards(state.cards.filter((card) => card.id !== id));
    if (state.playingCardId === id) {
      state.playingCardId = null;
    }
    if (state.activeCardId === id) {
      state.activeCardId = null;
    }
    renderCards();
  } catch (error) {
    console.error('[supabase] Impossible de supprimer la demande.', error);
    alert("Impossible de supprimer la demande. Réessayez plus tard.");
  }
}

async function updateCard(id, { label, phrase, isFavorite }) {
  try {
    const payload = {
      label,
      phrase,
      is_favorite: Boolean(isFavorite)
    };

    const { data, error } = await supabase
      .from('cards')
      .update(payload)
      .eq('id', id)
      .select('id,label,phrase,audio_path,is_favorite,created_at')
      .single();

    if (error) {
      throw error;
    }

    state.cards = sortCards(
      state.cards.map((card) => (card.id === id ? data : card))
    );
    renderCards();
  } catch (error) {
    console.error('[supabase] Impossible de mettre à jour la demande.', error);
    throw error;
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
