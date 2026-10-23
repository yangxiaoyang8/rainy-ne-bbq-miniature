// A small original Web Audio soundscape. Nothing plays until a visitor taps a sound button.
export function createSoundscape(getScene) {
  const musicButton = document.querySelector('#music-switch');
  const ambienceButton = document.querySelector('#ambience-switch');
  const volumeInput = document.querySelector('#audio-volume');
  const volumeValue = document.querySelector('#audio-volume-value');
  const status = document.querySelector('#audio-status');
  const visualizer = document.querySelector('.soundscape');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let context, master, musicBus, ambienceBus, rainGain, windGain, noise;
  let musicTimer, ambienceTimer, nextStep = 0, step = 0;
  let musicOn = false, ambienceOn = false;
  let volume = Number(volumeInput.value) / 100;

  if (!AudioContextClass) {
    musicButton.disabled = true;
    ambienceButton.disabled = true;
    status.textContent = '此浏览器暂不支持声音';
    return { updateScene() {} };
  }

  function target(gain, value, speed = .12) {
    gain.gain.setTargetAtTime(value, context.currentTime, speed);
  }

  function createNoise() {
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function loopNoise(filterType, frequency, destination) {
    const source = context.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    source.connect(filter).connect(destination);
    source.start();
  }

  function ensureContext() {
    if (!context) {
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = volume * .7;
      master.connect(context.destination);
      musicBus = context.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(master);
      ambienceBus = context.createGain();
      ambienceBus.gain.value = 0;
      ambienceBus.connect(master);
      noise = createNoise();
      rainGain = context.createGain();
      rainGain.gain.value = 0;
      rainGain.connect(ambienceBus);
      windGain = context.createGain();
      windGain.gain.value = 0;
      windGain.connect(ambienceBus);
      loopNoise('highpass', 380, rainGain);
      loopNoise('lowpass', 310, windGain);
      updateScene();
    }
    context.resume().catch(() => { status.textContent = '请再点一次开启声音'; });
    return true;
  }

  function playNoiseBurst(time, duration, frequency, level) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = .7;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.linearRampToValueAtTime(level, time + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter).connect(envelope).connect(ambienceBus);
    source.start(time, Math.random() * (noise.duration - duration), duration);
    source.stop(time + duration);
  }

  function tickAmbience() {
    if (!context || context.state !== 'running' || !ambienceOn) return;
    const time = context.currentTime + .02;
    const scene = getScene();
    if (Math.random() < .26) playNoiseBurst(time, .025 + Math.random() * .07, 800 + Math.random() * 1900, .065);
    if (scene.weather === 'rain' && Math.random() < .42) {
      playNoiseBurst(time, .035 + Math.random() * .07, 1100 + Math.random() * 2600, .025);
    }
  }

  function note(midi, time, duration, level, shape = 'triangle') {
    const oscillator = context.createOscillator();
    oscillator.type = shape;
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = shape === 'sine' ? 1800 : 1150;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(level, time + .035);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(filter).connect(envelope).connect(musicBus);
    oscillator.start(time);
    oscillator.stop(time + duration + .01);
  }

  const chords = [
    [57, 60, 64, 67], // Am7
    [53, 57, 60, 64], // Fmaj7
    [48, 55, 59, 64], // Cmaj7
    [55, 59, 62, 64], // G6
  ];
  const melody = [76, 74, 72, null, 69, 72, 74, null,
    72, 69, 67, null, 69, 72, 69, null,
    67, 72, 71, null, 67, 64, 67, null,
    71, 69, 67, null, 64, 67, 69, null];
  const stepLength = 60 / 76 / 2;

  function scheduleMusic() {
    if (!context || context.state !== 'running' || !musicOn) return;
    while (nextStep < context.currentTime + .45) {
      const index = step % 32;
      if (index % 8 === 0) {
        const chord = chords[Math.floor(index / 8)];
        chord.forEach((pitch, i) => note(pitch, nextStep + i * .025, stepLength * 7.2, .021, 'triangle'));
      }
      if (index % 4 === 0) note(chords[Math.floor(index / 8)][0] - 12, nextStep, stepLength * 3.2, .065, 'sine');
      if (melody[index] !== null) note(melody[index], nextStep, stepLength * 1.7, .018, 'sine');
      nextStep += stepLength;
      step++;
    }
  }

  function updateStatus() {
    const weather = { rain: '雨声与炭火', snow: '风雪与炭火', clear: '街声与炭火' }[getScene().weather];
    status.textContent = musicOn && ambienceOn ? `音乐 · ${weather}` : musicOn ? '音乐播放中' : ambienceOn ? `${weather}播放中` : '点击开启，默认静音';
    visualizer.classList.toggle('is-playing', musicOn || ambienceOn);
  }

  function updateScene() {
    if (!context) return;
    const scene = getScene();
    target(rainGain, scene.weather === 'rain' ? (scene.view === 'inside' ? .045 : .105) : 0, .4);
    target(windGain, scene.weather === 'snow' ? .08 : scene.weather === 'clear' ? .027 : .014, .5);
    updateStatus();
  }

  function toggleMusic() {
    ensureContext();
    musicOn = !musicOn;
    musicButton.classList.toggle('is-active', musicOn);
    musicButton.setAttribute('aria-pressed', String(musicOn));
    target(musicBus, musicOn ? 1 : 0, .08);
    if (musicOn) {
      nextStep = context.currentTime + .07;
      scheduleMusic();
      musicTimer = window.setInterval(scheduleMusic, 120);
    } else {
      window.clearInterval(musicTimer);
    }
    updateStatus();
    if (!musicOn && !ambienceOn) context.suspend().catch(() => {});
  }

  function toggleAmbience() {
    ensureContext();
    ambienceOn = !ambienceOn;
    ambienceButton.classList.toggle('is-active', ambienceOn);
    ambienceButton.setAttribute('aria-pressed', String(ambienceOn));
    target(ambienceBus, ambienceOn ? 1 : 0, .12);
    if (ambienceOn) ambienceTimer = window.setInterval(tickAmbience, 180);
    else window.clearInterval(ambienceTimer);
    updateStatus();
    if (!musicOn && !ambienceOn) context.suspend().catch(() => {});
  }

  musicButton.addEventListener('click', toggleMusic);
  ambienceButton.addEventListener('click', toggleAmbience);
  volumeInput.addEventListener('input', () => {
    volume = Number(volumeInput.value) / 100;
    volumeValue.value = `${volumeInput.value}%`;
    if (context) target(master, volume * .7, .045);
  });
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.hidden) context.suspend();
    else if (musicOn || ambienceOn) context.resume().then(() => { nextStep = context.currentTime + .07; }).catch(() => {});
  });

  return { updateScene };
}
