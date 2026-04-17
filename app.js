const sourceSelect = document.getElementById('sourceSelect');
const pageSelect = document.getElementById('pageSelect');
const modeSelect = document.getElementById('modeSelect');
const loadButton = document.getElementById('loadButton');
const reviewButton = document.getElementById('reviewButton');
const restartButton = document.getElementById('restartButton');
const clearWrongButton = document.getElementById('clearWrongButton');
const sourceLabel = document.getElementById('sourceLabel');
const pageLabel = document.getElementById('pageLabel');
const questionText = document.getElementById('questionText');
const answerArea = document.getElementById('answerArea');
const noteArea = document.getElementById('noteArea');
const checkButton = document.getElementById('checkButton');
const showAnswerButton = document.getElementById('showAnswerButton');
const nextButton = document.getElementById('nextButton');
const progressLabel = document.getElementById('progressLabel');
const scoreLabel = document.getElementById('scoreLabel');
const resultMessage = document.getElementById('resultMessage');
const summarySection = document.getElementById('summarySection');
const summaryText = document.getElementById('summaryText');
const wrongListContainer = document.getElementById('wrongListContainer');
const wrongList = document.getElementById('wrongList');

const STORAGE_KEY = 'midtermPracticeWrongIds';
const allQuestions = [];
let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectCount = 0;
let currentMode = 'all';
let wrongIds = new Set(loadWrongIds());
let reviewMode = false;

function normalizeAnswer(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[”“]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[\s\u00A0]+/g, ' ')
    .replace(/[.,?!;:]$/g, '')
    .trim();
}

function loadWrongIds() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
}

function saveWrongIds() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...wrongIds]));
}

function buildData() {
  Object.keys(MIDTERM_DATA).forEach((fileName) => {
    const sourceLabel = fileName.replace('.json', '');
    const payload = MIDTERM_DATA[fileName];
    if (!payload || !Array.isArray(payload.questions)) return;
    payload.questions.forEach((question) => {
      allQuestions.push({ ...question, sourceFile: fileName, sourceLabel });
    });
  });
}

function getUniquePages() {
  const pages = new Set(allQuestions.map((question) => question.page || 'unknown'));
  return Array.from(pages).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

function populateControls() {
  sourceSelect.innerHTML = '<option value="all">전체 범위</option>';
  Object.keys(MIDTERM_DATA).forEach((fileName) => {
    const label = fileName.replace('.json', '');
    const option = document.createElement('option');
    option.value = fileName;
    option.textContent = label;
    sourceSelect.appendChild(option);
  });

  pageSelect.innerHTML = '<option value="all">전체 페이지</option>';
  getUniquePages().forEach((page) => {
    const option = document.createElement('option');
    option.value = page;
    option.textContent = page + 'p';
    pageSelect.appendChild(option);
  });
}

function applyFilters() {
  const selectedSource = sourceSelect.value;
  const selectedPage = pageSelect.value;
  currentMode = modeSelect.value;

  currentQuestions = allQuestions.filter((question) => {
    if (selectedSource !== 'all' && question.sourceFile !== selectedSource) return false;
    if (selectedPage !== 'all' && String(question.page) !== String(selectedPage)) return false;
    if (currentMode === 'input' && Array.isArray(question.options) && question.options.length > 0) return false;
    if (currentMode === 'choice' && (!Array.isArray(question.options) || question.options.length === 0)) return false;
    if (currentMode === 'note' && !question.note) return false;
    if (reviewMode && !wrongIds.has(question.id)) return false;
    return true;
  });

  if (reviewMode) {
    const modeLabel = document.createElement('strong');
    modeLabel.textContent = '오답 복습 모드';
    sourceLabel.textContent = '오답 문제만 표시합니다.';
    pageLabel.textContent = '';
  } else {
    sourceLabel.textContent = `범위: ${selectedSource === 'all' ? '전체' : selectedSource.replace('.json', '')}`;
    pageLabel.textContent = `페이지: ${selectedPage === 'all' ? '전체' : selectedPage + 'p'}`;
  }
}

function renderProgress() {
  const total = currentQuestions.length;
  progressLabel.textContent = `문제 ${currentIndex + 1} / ${total}`;
  scoreLabel.textContent = `정답 ${correctCount}개 · 오답 ${incorrectCount}개 · 오답 노트 ${wrongIds.size}개`;
}

function renderQuestion() {
  if (currentQuestions.length === 0) {
    questionText.textContent = '조건에 맞는 문제가 없습니다. 다른 범위나 유형을 선택해 주세요.';
    answerArea.innerHTML = '';
    noteArea.classList.add('hidden');
    resultMessage.textContent = '';
    summarySection.classList.add('hidden');
    progressLabel.textContent = '문제 없음';
    return;
  }

  if (currentIndex >= currentQuestions.length) {
    showSummary();
    return;
  }

  const question = currentQuestions[currentIndex];
  questionText.textContent = question.question;
  answerArea.innerHTML = '';
  resultMessage.textContent = '';
  noteArea.classList.add('hidden');
  noteArea.textContent = '';

  sourceLabel.textContent = `범위: ${question.sourceLabel}`;
  pageLabel.textContent = `페이지: ${question.page || '-'}`;

  if (question.note) {
    noteArea.textContent = `노트: ${question.note}`;
    noteArea.classList.remove('hidden');
  }

  if (Array.isArray(question.options) && question.options.length > 0) {
    const shuffled = [...question.options].sort(() => Math.random() - 0.5);
    const fieldset = document.createElement('div');
    shuffled.forEach((option, index) => {
      const optionId = `option-${index}`;
      const label = document.createElement('label');
      label.className = 'option-label';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'answerOption';
      radio.value = option;
      radio.id = optionId;
      label.appendChild(radio);
      const span = document.createElement('span');
      span.textContent = option;
      label.appendChild(span);
      fieldset.appendChild(label);
    });
    answerArea.appendChild(fieldset);
  } else {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'freeInput';
    input.placeholder = '정답을 입력하세요.';
    answerArea.appendChild(input);
  }

  renderProgress();
}

function getCurrentAnswer() {
  const question = currentQuestions[currentIndex];
  if (!question) return '';
  if (Array.isArray(question.options) && question.options.length > 0) {
    const selected = document.querySelector('input[name="answerOption"]:checked');
    return selected ? selected.value : '';
  }
  const input = document.getElementById('freeInput');
  return input ? input.value : '';
}

function answerVariants(answer) {
  return answer
    .split(/[\/,]+/) 
    .map((part) => normalizeAnswer(part))
    .filter(Boolean);
}

function isCorrectAnswer(inputValue, answerText) {
  const normalizedInput = normalizeAnswer(inputValue);
  if (!normalizedInput) return false;
  const variants = answerVariants(answerText);
  return variants.some((variant) => variant === normalizedInput);
}

function markWrong(questionId) {
  wrongIds.add(questionId);
  saveWrongIds();
}

function markCorrect(questionId) {
  if (wrongIds.has(questionId)) {
    wrongIds.delete(questionId);
    saveWrongIds();
  }
}

function checkAnswer() {
  const question = currentQuestions[currentIndex];
  if (!question) return;
  const userAnswer = getCurrentAnswer();
  if (!userAnswer.trim()) {
    resultMessage.textContent = '정답을 입력하거나 보기를 선택해주세요.';
    resultMessage.className = 'result-message incorrect';
    return;
  }

  const correct = isCorrectAnswer(userAnswer, String(question.answer));
  if (correct) {
    resultMessage.textContent = '정답입니다!';
    resultMessage.className = 'result-message correct';
    correctCount += 1;
    markCorrect(question.id);
  } else {
    resultMessage.textContent = `틀렸습니다. 정답: ${question.answer}`;
    resultMessage.className = 'result-message incorrect';
    incorrectCount += 1;
    markWrong(question.id);
  }
  renderProgress();
}

function showAnswer() {
  const question = currentQuestions[currentIndex];
  if (!question) return;
  resultMessage.textContent = `정답: ${question.answer}`;
  resultMessage.className = 'result-message';
}

function showSummary() {
  summarySection.classList.remove('hidden');
  const total = currentQuestions.length;
  const correct = correctCount;
  const incorrect = incorrectCount;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  summaryText.textContent = `총 ${total}문제 중 ${correct}문제 정답, ${incorrect}문제 오답. 정답률 ${percent}%입니다.`;

  if (wrongIds.size > 0) {
    wrongListContainer.classList.remove('hidden');
    wrongList.innerHTML = '';
    Array.from(wrongIds).forEach((wrongId) => {
      const wrongQuestion = allQuestions.find((item) => item.id === wrongId);
      if (!wrongQuestion) return;
      const li = document.createElement('li');
      li.innerHTML = `<strong>${wrongQuestion.sourceLabel} ${wrongQuestion.page}p</strong> · ${wrongQuestion.question}<br/><em>정답: ${wrongQuestion.answer}</em>`;
      wrongList.appendChild(li);
    });
  } else {
    wrongListContainer.classList.add('hidden');
  }

  questionText.textContent = '모든 문제가 완료되었습니다. 다시 풀기를 눌러 학습을 이어가세요.';
  answerArea.innerHTML = '';
  noteArea.classList.add('hidden');
  resultMessage.textContent = '';
  progressLabel.textContent = '완료됨';
}

function resetSession() {
  reviewMode = false;
  currentIndex = 0;
  correctCount = 0;
  incorrectCount = 0;
  summarySection.classList.add('hidden');
  renderProgress();
}

function loadQuestions() {
  reviewMode = false;
  applyFilters();
  resetSession();
  if (currentQuestions.length === 0) {
    questionText.textContent = '조건에 맞는 문제가 없습니다. 범위를 다시 선택하세요.';
    return;
  }
  renderQuestion();
}

function reviewWrong() {
  reviewMode = true;
  applyFilters();
  resetSession();
  if (currentQuestions.length === 0) {
    questionText.textContent = '오답으로 저장된 문제가 없습니다.';
    return;
  }
  renderQuestion();
}

function clearWrong() {
  wrongIds.clear();
  saveWrongIds();
  reviewMode = false;
  incorrectCount = 0;
  renderProgress();
  summarySection.classList.add('hidden');
}

loadButton.addEventListener('click', loadQuestions);
reviewButton.addEventListener('click', reviewWrong);
restartButton.addEventListener('click', loadQuestions);
clearWrongButton.addEventListener('click', clearWrong);
checkButton.addEventListener('click', checkAnswer);
showAnswerButton.addEventListener('click', showAnswer);
nextButton.addEventListener('click', () => {
  if (currentIndex < currentQuestions.length - 1) {
    currentIndex += 1;
    renderQuestion();
  } else {
    showSummary();
  }
});

buildData();
populateControls();
loadQuestions();
