(() => {
  'use strict';

  const PREFECTURES = [
    ['hokkaido','北海道'],['aomori','青森県'],['iwate','岩手県'],['miyagi','宮城県'],['akita','秋田県'],['yamagata','山形県'],['fukushima','福島県'],
    ['ibaraki','茨城県'],['tochigi','栃木県'],['gunma','群馬県'],['saitama','埼玉県'],['chiba','千葉県'],['tokyo','東京都'],['kanagawa','神奈川県'],
    ['niigata','新潟県'],['toyama','富山県'],['ishikawa','石川県'],['fukui','福井県'],['yamanashi','山梨県'],['nagano','長野県'],['gifu','岐阜県'],['shizuoka','静岡県'],['aichi','愛知県'],
    ['mie','三重県'],['shiga','滋賀県'],['kyoto','京都府'],['osaka','大阪府'],['hyogo','兵庫県'],['nara','奈良県'],['wakayama','和歌山県'],
    ['tottori','鳥取県'],['shimane','島根県'],['okayama','岡山県'],['hiroshima','広島県'],['yamaguchi','山口県'],['tokushima','徳島県'],['kagawa','香川県'],['ehime','愛媛県'],['kochi','高知県'],
    ['fukuoka','福岡県'],['saga','佐賀県'],['nagasaki','長崎県'],['kumamoto','熊本県'],['oita','大分県'],['miyazaki','宮崎県'],['kagoshima','鹿児島県'],['okinawa','沖縄県']
  ].map(([id, name], index) => ({ id, name, image: `images/${String(index + 1).padStart(2, '0')}-${id}.svg` }));

  const state = {
    questions: [], currentQuestion: 0, currentAngle: 0, startingAngle: 0, lastSliderValue: 180, correctAngle: 0,
    questionStartedAt: 0, questionTimes: [], judgment: 'idle', isShowingCorrect: false,
    idleTimer: null, nextTimer: null
  };

  const $ = (selector) => document.querySelector(selector);
  const titleScreen = $('#title-screen');
  const gameScreen = $('#game-screen');
  const resultScreen = $('#result-screen');
  const slider = $('#angle-slider');
  const image = $('#prefecture-image');
  const feedback = $('#feedback');

  // Smallest circular distance handles the 0°/360° boundary.
  function angleDistance(a, b) {
    const difference = Math.abs((((a - b) % 360) + 360) % 360);
    return Math.min(difference, 360 - difference);
  }

  function judgeAngle(current, target) {
    const distance = angleDistance(current, target);
    if (distance === 0) return 'correct';
    if (distance <= 20) return 'close';
    return 'incorrect';
  }

  function chooseQuestions(random = Math.random) {
    const pool = [...PREFECTURES];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 5);
  }

  function randomStartingAngle() {
    return (Math.floor(Math.random() * 35) + 1) * 10;
  }

  function showScreen(screen) {
    titleScreen.hidden = screen !== 'title';
    gameScreen.hidden = screen !== 'game';
    resultScreen.hidden = screen !== 'result';
  }

  function startGame() {
    clearTimeout(state.idleTimer);
    clearTimeout(state.nextTimer);
    state.questions = chooseQuestions();
    state.currentQuestion = 0;
    state.questionTimes = [];
    state.judgment = 'idle';
    state.isShowingCorrect = false;
    showScreen('game');
    showQuestion();
  }

  function showQuestion() {
    const prefecture = state.questions[state.currentQuestion];
    state.startingAngle = randomStartingAngle();
    state.currentAngle = state.startingAngle;
    state.correctAngle = 0;
    state.judgment = 'idle';
    state.isShowingCorrect = false;
    state.questionStartedAt = performance.now();
    $('#question-current').textContent = String(state.currentQuestion + 1).padStart(2, '0');
    $('#repaired-count').innerHTML = `${state.currentQuestion} <small>/ 5</small>`;
    $('#progress-bar').style.width = `${(state.currentQuestion / 5) * 100}%`;
    image.src = prefecture.image;
    image.alt = '回転させる都道府県の地図';
    slider.disabled = false;
    // The thumb begins at the midpoint; its movement is relative to this
    // question's independently randomized starting rotation.
    slider.value = '180';
    state.lastSliderValue = 180;
    updateMap();
    hideFeedback();
    clearTimeout(state.idleTimer);
  }

  function updateMap() {
    image.style.transform = `rotate(${state.currentAngle}deg)`;
    slider.style.setProperty('--fill', `${(Number(slider.value) / 360) * 100}%`);
  }

  function hideFeedback() {
    feedback.className = 'feedback';
    feedback.textContent = '';
  }

  function showFeedback(message, correct = false) {
    feedback.textContent = message;
    feedback.className = `feedback visible${correct ? ' correct' : ''}`;
  }

  function onSliderInput() {
    if (state.isShowingCorrect) return;
    const sliderValue = Number(slider.value);
    state.currentAngle += sliderValue - state.lastSliderValue;
    state.lastSliderValue = sliderValue;
    updateMap();
    state.judgment = 'waiting';
    hideFeedback();
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(judgeCurrentAngle, 500);
  }

  function judgeCurrentAngle() {
    if (state.isShowingCorrect) return;
    const result = judgeAngle(state.currentAngle, state.correctAngle);
    state.judgment = result;
    if (result === 'correct') {
      state.isShowingCorrect = true;
      slider.disabled = true;
      const elapsed = (performance.now() - state.questionStartedAt) / 1000;
      state.questionTimes.push(Math.round(elapsed * 100) / 100);
      $('#repaired-count').innerHTML = `${state.currentQuestion + 1} <small>/ 5</small>`;
      $('#progress-bar').style.width = `${((state.currentQuestion + 1) / 5) * 100}%`;
      showFeedback(`正解！ ${state.questions[state.currentQuestion].name}`, true);
      state.nextTimer = setTimeout(() => {
        state.currentQuestion++;
        if (state.currentQuestion === 5) showResults();
        else showQuestion();
      }, 1000);
    } else {
      showFeedback(result === 'close' ? '惜しい！' : '不正解');
      state.idleTimer = setTimeout(hideFeedback, 1000);
    }
  }

  function showResults() {
    const list = $('#result-list');
    list.replaceChildren();
    state.questions.forEach((prefecture, index) => {
      const row = document.createElement('li');
      const number = document.createElement('span');
      number.className = 'result-index';
      number.textContent = String(index + 1).padStart(2, '0');
      const name = document.createElement('span');
      name.textContent = prefecture.name;
      const time = document.createElement('span');
      time.className = 'result-time';
      time.innerHTML = `${state.questionTimes[index].toFixed(2)} <small>sec</small>`;
      row.append(number, name, time);
      list.append(row);
    });
    const total = state.questionTimes.reduce((sum, time) => sum + time, 0);
    $('#total-time').innerHTML = `${total.toFixed(2)}<small> sec</small>`;
    showScreen('result');
  }

  function returnToTitle() {
    clearTimeout(state.idleTimer);
    clearTimeout(state.nextTimer);
    state.questions = [];
    state.questionTimes = [];
    state.currentQuestion = 0;
    state.currentAngle = 0;
    state.judgment = 'idle';
    state.isShowingCorrect = false;
    showScreen('title');
  }

  $('#start-button').addEventListener('click', startGame);
  slider.addEventListener('input', onSliderInput);
  $('#home-button').addEventListener('click', returnToTitle);
  $('#share-button').addEventListener('click', () => {
    const total = state.questionTimes.reduce((sum, time) => sum + time, 0);
    const names = state.questions.map((prefecture) => prefecture.name).join('・');
    const text = `${names}を${total.toFixed(2)}秒で立て直しました。\nhttps://minami-coi.github.io/prefectures/`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  });

  // Expose pure game helpers for browser console/manual checks.
  window.PrefectureRescue = { PREFECTURES, angleDistance, judgeAngle, chooseQuestions };
})();
