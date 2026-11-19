(() => {
  const MODELS = [
    { id: "caribe", name: "Picó Caribe", src: "assets/pico-1.jpg", w: 1073, h: 1466, caption: "Picó frontal de estilo costeño" },
    { id: "rumbero", name: "Rumbero Mayor", src: "assets/pico-2.jpg", w: 901, h: 1607, caption: "Picó tradicional con pintura tropical" }
  ];

  // Edita esta lista con tus archivos reales dentro de assets/
  const TRACKS = [
    { title: "Champeta 1 · Verbena Caribe", src: "assets/champeta-1.mp3" },
    { title: "Champeta 2 · Sonido Picotero", src: "assets/champeta-2.mp3" },
    { title: "Champeta 3 · Ritmo Afrocaribeño", src: "assets/champeta-3.mp3" },
    { title: "Champeta 4 · El Despelote", src: "assets/champeta-4.mp3" },
  ];

  const board = document.getElementById('board');
  const overlay = document.getElementById('overlay');
  const winText = document.getElementById('winText');
  const previewImage = document.getElementById('previewImage');
  const movesEl = document.getElementById('moves');
  const timerEl = document.getElementById('timer');
  const progressEl = document.getElementById('progress');
  const difficultySelect = document.getElementById('difficultySelect');
  const imageSelect = document.getElementById('imageSelect');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const hintBtn = document.getElementById('hintBtn');
  const playAgainBtn = document.getElementById('playAgain');
  const musicBtn = document.getElementById('musicBtn');
  const nextTrackBtn = document.getElementById('nextTrackBtn');
  const player = document.getElementById('player');
  const musicLine = document.getElementById('musicLine');
  const musicLabel = document.getElementById('musicLabel');
  const confettiLayer = document.getElementById('confetti');

  let size = Number(difficultySelect.value);
  let currentModelIndex = Number(imageSelect.value);
  let currentTrackIndex = -1;
  let order = [];
  let selectedIndex = null;
  let moves = 0;
  let seconds = 0;
  let timerId = null;
  let hintTimerId = null;
  let started = false;
  let completed = false;
  let hintActive = false;
  let musicPlaying = false;
  let userPaused = false;

  function currentModel() {
    return MODELS[currentModelIndex];
  }

  function selectRandomTrack() {
    if (!TRACKS.length) return;
    if (TRACKS.length === 1) {
      currentTrackIndex = 0;
    } else if (currentTrackIndex === -1) {
      currentTrackIndex = Math.floor(Math.random() * TRACKS.length);
    } else {
      const offset = 1 + Math.floor(Math.random() * (TRACKS.length - 1));
      currentTrackIndex = (currentTrackIndex + offset) % TRACKS.length;
    }
    player.src = TRACKS[currentTrackIndex].src;
    player.currentTime = 0;
    refreshMusicUI();
  }

  async function playCurrentTrack(showAlertOnBlock = false) {
    if (!TRACKS.length) return;
    if (currentTrackIndex === -1) selectRandomTrack();
    try {
      await player.play();
      musicPlaying = true;
      userPaused = false;
      refreshMusicUI();
    } catch (err) {
      musicPlaying = false;
      refreshMusicUI();
      if (showAlertOnBlock) {
        alert('El navegador bloqueó el audio automático. Toca otra vez el botón de música o abre el archivo en Safari, Chrome o Edge.');
      }
    }
  }

  function updateBoardAspect() {
    const model = currentModel();
    board.style.aspectRatio = model.w + ' / ' + model.h;
    previewImage.src = model.src;
    previewImage.alt = model.caption;
  }

  function solvedOrder() {
    return Array.from({ length: size * size }, (_, i) => i);
  }

  function shuffledOrder() {
    const arr = solvedOrder();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (arr.every((v, i) => v === i)) {
      [arr[0], arr[1]] = [arr[1], arr[0]];
    }
    return arr;
  }

  function formatTime(total) {
    const min = String(Math.floor(total / 60)).padStart(2, '0');
    const sec = String(total % 60).padStart(2, '0');
    return min + ':' + sec;
  }

  function startTimer() {
    if (timerId) return;
    timerId = setInterval(() => {
      seconds += 1;
      timerEl.textContent = formatTime(seconds);
    }, 1000);
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function clearHint() {
    if (hintTimerId) {
      clearTimeout(hintTimerId);
      hintTimerId = null;
    }
    board.style.backgroundImage = 'none';
    Array.from(board.children).forEach(tile => { tile.style.visibility = 'visible'; });
    hintActive = false;
    hintBtn.textContent = '👁️ VER REFERENCIA';
  }

  function updateProgress() {
    let correct = 0;
    order.forEach((value, index) => { if (value === index) correct += 1; });
    progressEl.textContent = Math.round((correct / order.length) * 100) + '%';
  }

  function renderBoard() {
    const model = currentModel();
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${size}, 1fr)`;

    order.forEach((tileId, tileIndex) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile' + (selectedIndex === tileIndex ? ' selected' : '') + (tileId === tileIndex ? ' correct' : '');
      tile.setAttribute('aria-label', 'Pieza interactiva del rompecabezas');
      tile.style.backgroundImage = `url("${model.src}")`;
      tile.style.backgroundSize = `${size * 100}% ${size * 100}%`;
      const xPct = size === 1 ? 0 : (tileId % size) / (size - 1) * 100;
      const yPct = size === 1 ? 0 : Math.floor(tileId / size) / (size - 1) * 100;
      tile.style.backgroundPosition = `${xPct}% ${yPct}%`;
      tile.addEventListener('click', () => handleTileSelection(tileIndex));
      tile.draggable = true;
      tile.addEventListener('dragstart', (ev) => { ev.dataTransfer.setData('text/plain', String(tileIndex)); });
      tile.addEventListener('dragover', (ev) => ev.preventDefault());
      tile.addEventListener('drop', (ev) => {
        ev.preventDefault();
        const raw = ev.dataTransfer.getData('text/plain');
        const from = raw === '' ? NaN : Number(raw);
        handleSwap(from, tileIndex);
      });
      board.appendChild(tile);
    });

    updateProgress();
  }

  function resetGame(isInitialLoad = false) {
    stopTimer();
    clearHint();
    started = false;
    completed = false;
    selectedIndex = null;
    seconds = 0;
    moves = 0;
    timerEl.textContent = '00:00';
    movesEl.textContent = '0';
    overlay.classList.remove('show');
    order = shuffledOrder();
    renderBoard();

    const wasPlaying = musicPlaying;
    selectRandomTrack();
    if (!isInitialLoad && wasPlaying) {
      playCurrentTrack();
    }
  }

  function celebrate() {
    const colors = ['#ff4bb4', '#ffe663', '#71f4ff', '#8dff6d', '#ff7f50'];
    confettiLayer.innerHTML = '';
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.top = '-20px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (2.1 + Math.random() * 1.8) + 's';
      piece.style.animationDelay = (Math.random() * .8) + 's';
      piece.style.transform = 'rotate(' + (Math.random() * 180) + 'deg)';
      confettiLayer.appendChild(piece);
    }
    setTimeout(() => { confettiLayer.innerHTML = ''; }, 4200);
  }

  function checkWin() {
    if (order.every((v, i) => v === i)) {
      completed = true;
      stopTimer();
      winText.textContent = `Completaste el picó en ${moves} movimientos y ${formatTime(seconds)}.`;
      overlay.classList.add('show');
      celebrate();
    }
  }

  function handleSwap(from, to) {
    if (
      completed ||
      !Number.isInteger(from) ||
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= order.length ||
      to >= order.length
    ) return;

    if (!musicPlaying && !userPaused) {
      playCurrentTrack();
    }
    if (!started) { started = true; startTimer(); }
    [order[from], order[to]] = [order[to], order[from]];
    moves += 1;
    movesEl.textContent = String(moves);
    selectedIndex = null;
    renderBoard();
    checkWin();
  }

  function handleTileSelection(index) {
    if (completed) return;
    if (!musicPlaying && !userPaused) {
      playCurrentTrack();
    }
    if (selectedIndex === null) {
      selectedIndex = index;
      renderBoard();
      return;
    }
    if (selectedIndex === index) {
      selectedIndex = null;
      renderBoard();
      return;
    }
    handleSwap(selectedIndex, index);
  }

  function showHintTemporarily() {
    if (hintActive) return;
    hintActive = true;
    hintBtn.textContent = '👀 MOSTRANDO...';
    const tiles = Array.from(board.children);
    board.style.backgroundImage = `url("${currentModel().src}")`;
    board.style.backgroundSize = 'cover';
    board.style.backgroundPosition = 'center';
    tiles.forEach(tile => { tile.style.visibility = 'hidden'; });
    hintTimerId = setTimeout(clearHint, 1700);
  }

  function refreshMusicUI() {
    musicBtn.textContent = musicPlaying ? '⏸️ PAUSAR CHAMPETA' : '▶️ PRENDER EL PICÓ';
    musicLine.classList.toggle('playing', musicPlaying);
    const track = TRACKS[currentTrackIndex];
    const title = track ? track.title : 'Champeta afrocaribeña';
    const status = musicPlaying ? 'sonando' : (started || userPaused ? 'en pausa' : 'lista para sonar');
    musicLabel.textContent = `${title} · ${status}`;
  }

  async function toggleMusic() {
    if (musicPlaying) {
      player.pause();
      musicPlaying = false;
      userPaused = true;
      refreshMusicUI();
      return;
    }
    await playCurrentTrack(true);
  }

  async function nextTrack() {
    if (!TRACKS.length) return;
    currentTrackIndex = (currentTrackIndex + 1) % TRACKS.length;
    player.src = TRACKS[currentTrackIndex].src;
    player.currentTime = 0;
    await playCurrentTrack(true);
  }

  shuffleBtn.addEventListener('click', () => resetGame(false));
  playAgainBtn.addEventListener('click', () => resetGame(false));
  hintBtn.addEventListener('click', showHintTemporarily);
  difficultySelect.addEventListener('change', () => { size = Number(difficultySelect.value); resetGame(false); });
  imageSelect.addEventListener('change', () => { currentModelIndex = Number(imageSelect.value); updateBoardAspect(); resetGame(false); });
  musicBtn.addEventListener('click', toggleMusic);
  nextTrackBtn.addEventListener('click', nextTrack);

  player.addEventListener('ended', () => {
    selectRandomTrack();
    playCurrentTrack();
  });

  updateBoardAspect();
  resetGame(true);
})();