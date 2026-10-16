(function (PopoGame) {
'use strict';
if (window.Journey && window.Journey.leaving) return; // opened on its own: on the way to the journey's front page
const journey = window.Journey && window.Journey.embedded ? window.Journey : null;
const { loadCoreAssets, AudioEngine, Game, Stage, state, PHASE, UI } = PopoGame;

const stage = new Stage(document.getElementById('stage'), document.getElementById('world'));
const ui = new UI();
const audio = new AudioEngine();
const game = new Game({ stage, ui, audio });

ui.on('play', () => game.pressPlay());
ui.on('playHover', (on) => game.onPlayHover(on));
ui.on('playPress', () => game.onPlayPress());
ui.on('fishTap', (fish, point) => game.onFishTap(fish, point));
document.getElementById('stage').addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, .hud, .overlay')) return;
  if (game.skipDialogue()) return;
  game.onWaterTap(stage.toStage(e.clientX, e.clientY));
});
ui.on('pause', () => { audio.play('ui'); game.togglePause(); });
ui.on('resume', () => { audio.play('ui'); game.togglePause(); });
ui.on('restart', () => { audio.play('ui'); game.restart(); });
ui.on('sound', () => { game.toggleSound(); audio.play('ui'); });
ui.on('next', () => { audio.play('ui'); game.next(); });

try {
  if (localStorage.getItem('popo-muted') === '1') {
    state.muted = true;
    audio.setMuted(true);
    ui.setSound(true);
  }
} catch (e) { /* storage may be unavailable */ }

window.addEventListener('pagehide', (event) => { if (!event.persisted) game.dispose(); });
window.addEventListener('resize', () => game.resize());
window.addEventListener('orientationchange', () => setTimeout(() => game.resize(), 150));
// Browsers (Brave and Safari especially) can suspend audio when the tab loses focus or the
// device sleeps; the next tap or key press brings it back.
const wakeAudio = () => { if (!state.paused && !document.hidden) audio.resume(); };
for (const type of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(type, wakeAudio, true);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.suspend();
  else if (!state.paused) audio.resume();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.phase !== PHASE.INTRO) game.togglePause();
});
game.resize();

const params = new URLSearchParams(location.search);
if (params.has('debug') || params.get('dev') === '1') {
  window.popoDebug = { state, game };
}

if (journey) {
  // In the journey the front page (index.html at the root) has the banner and Play: this game loads
  // behind it, says when it is ready, and starts the moment the shell tells it to.
  ui.el.start.hidden = true;
  ui.el.instruction.style.visibility = 'hidden'; // the journey's warm-up has nothing to read: one catch, then the story
  ui.el.start.style.display = 'none'; // for good: the screen's own CSS would show it through `hidden`, and its fade-out would flash it
  journey.onBegin(() => game.start());
  journey.onDispose(() => { game.dispose(); audio.release(); });
  Promise.all([loadCoreAssets(), audio.prepareVoices(PopoGame.VOICE_DATA)])
    .then(() => {
      game.popo.rowTint(); // decode the paddling frames now, not on the first stroke
      journey.ready();
    })
    .catch((err) => journey.failed(err.message));
} else {
  ui.setLoading('Loading…');
  Promise.all([loadCoreAssets(), audio.prepareVoices(PopoGame.VOICE_DATA)])
    .then(() => {
      ui.setLoading('');
      game.popo.rowTint(); // decode the paddling frames now, not on the first stroke
      game.showIdleScene();
    })
    .catch((err) => ui.setLoading(`Could not load the game art (${err.message}).`));
}
})(window.PopoGame = window.PopoGame || {});
