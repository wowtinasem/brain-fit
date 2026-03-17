import { useState, useEffect, useCallback } from 'react';
import { Brain, Hand, Activity, ChevronLeft, Play, Info, CheckCircle2, Heart, Volume2, Square, Loader2, MessageCircle, Apple, Cat, Lamp, Trophy, RotateCcw, Home, Gamepad2, Mic, MicOff } from 'lucide-react';

// Shared AudioContext for mobile compatibility
let sharedAudioCtx = null;
const getAudioContext = () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
};

// Unlock audio on first user interaction (mobile browsers require this)
let audioUnlocked = false;
const unlockAudio = () => {
  if (audioUnlocked) return;
  audioUnlocked = true;
  // Unlock AudioContext
  const ctx = getAudioContext();
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
  // Unlock iOS Safari TTS
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
  document.removeEventListener('touchstart', unlockAudio, true);
  document.removeEventListener('click', unlockAudio, true);
};
document.addEventListener('touchstart', unlockAudio, true);
document.addEventListener('click', unlockAudio, true);

const App = () => {
  const [screen, setScreen] = useState('home');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isReading, setIsReading] = useState(false);
  const [wordCategory, setWordCategory] = useState(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [shuffledChoices, setShuffledChoices] = useState([]);
  const [healthTip, setHealthTip] = useState('');
  const [tipLoading, setTipLoading] = useState(true);
  const [activeQuizData, setActiveQuizData] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);

  // Brain game play states
  const [gameScore, setGameScore] = useState(0);
  const [gameRound, setGameRound] = useState(0);
  const [gameAnswer, setGameAnswer] = useState('');
  const [gameFeedback, setGameFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [gameFinished, setGameFinished] = useState(false);

  // Stroop game states
  const [stroopQuestion, setStroopQuestion] = useState(null);
  const [stroopChoices, setStroopChoices] = useState([]);
  const [stroopSelected, setStroopSelected] = useState(null);

  // Market memory game states
  const [marketItems, setMarketItems] = useState([]);
  const [marketPhase, setMarketPhase] = useState('show'); // 'show' | 'pick'
  const [marketPicked, setMarketPicked] = useState([]);
  const [marketLevel, setMarketLevel] = useState(1);
  const [marketPool, setMarketPool] = useState([]);
  const [marketShuffledPicks, setMarketShuffledPicks] = useState([]);
  const [isListening, setIsListening] = useState(false);

  // Game data
  const reverseWords = ['사과', '바나나', '거울', '구름', '나비', '도서관', '무지개', '선풍기', '해바라기', '냉장고', '토끼', '자전거', '연필', '가방', '우산'];
  const stroopColors = [
    { name: '빨강', color: '#EF4444' },
    { name: '파랑', color: '#3B82F6' },
    { name: '초록', color: '#22C55E' },
    { name: '노랑', color: '#EAB308' },
  ];
  const marketAllItems = ['사과', '고등어', '배추', '두부', '계란', '당근', '우유', '빵', '참기름', '감자', '양파', '시금치', '돼지고기', '멸치', '미역'];

  const fallbackTips = [
    '매일 15분씩 손가락을 움직이는 것만으로도 뇌 혈류량이 증가하여 치매 예방에 큰 도움이 됩니다.',
    '하루 30분 걷기는 심장 건강과 혈압 조절에 효과적입니다.',
    '충분한 수면은 뇌의 노폐물을 제거하여 치매 예방에 중요합니다.',
    '사회적 활동은 뇌를 활발하게 유지하는 데 큰 역할을 합니다.',
    '등푸른 생선에 포함된 오메가-3 지방산은 뇌 건강에 좋습니다.',
    '규칙적인 식사와 균형 잡힌 영양 섭취가 건강한 노후의 기본입니다.',
    '하루 8잔의 물을 마시면 혈액 순환과 뇌 기능 유지에 도움됩니다.',
    '새로운 취미를 배우면 뇌에 새로운 신경 회로가 만들어집니다.',
  ];

  useEffect(() => {
    setHealthTip(fallbackTips[Math.floor(Math.random() * fallbackTips.length)]);
    setTipLoading(false);
  }, []);

  const quizData = {
    fruit: [
      { hint: '노란색이고 길쭉하며, 원숭이가 좋아해요.', answer: '바나나', wrong: ['사과', '포도'] },
      { hint: '빨갛고 둥글며, 의사 선생님이 싫어한다는 과일이에요.', answer: '사과', wrong: ['귤', '배'] },
      { hint: '초록색 줄무늬가 있고, 여름에 시원하게 먹어요. 속은 빨갛고 씨가 있어요.', answer: '수박', wrong: ['참외', '멜론'] },
      { hint: '주황색이고 껍질을 까서 먹어요. 겨울에 많이 먹는 새콤달콤한 과일이에요.', answer: '귤', wrong: ['오렌지', '감'] },
      { hint: '보라색 알갱이가 송이송이 달려 있어요. 와인을 만들 때도 써요.', answer: '포도', wrong: ['블루베리', '자두'] },
      { hint: '껍질이 까칠까칠하고 초록색이에요. 반으로 자르면 씨가 크고 속은 연두색이에요.', answer: '키위', wrong: ['참외', '매실'] },
      { hint: '노란색이고 새콤해요. 차로 많이 마시고 비타민C가 풍부해요.', answer: '레몬', wrong: ['유자', '오렌지'] },
      { hint: '빨갛고 작은 알갱이가 모여 있어요. 케이크 위에 올라가는 과일이에요.', answer: '딸기', wrong: ['체리', '산딸기'] },
      { hint: '갈색 껍질을 깎으면 하얀 속이 나와요. 아삭아삭하고 달콤해요.', answer: '배', wrong: ['사과', '감'] },
      { hint: '주황색이고 가을에 많이 먹어요. 말려서 곶감으로도 만들어요.', answer: '감', wrong: ['귤', '살구'] },
    ],
    animal: [
      { hint: '멍멍 짖고, 꼬리를 흔들며 사람을 반겨요.', answer: '강아지', wrong: ['고양이', '토끼'] },
      { hint: '야옹 소리를 내고, 높은 곳을 좋아해요. 수염이 있어요.', answer: '고양이', wrong: ['강아지', '다람쥐'] },
      { hint: '목이 아주 길고, 아프리카 초원에 살아요. 나뭇잎을 먹어요.', answer: '기린', wrong: ['코끼리', '얼룩말'] },
      { hint: '코가 아주 길고, 육지에서 가장 큰 동물이에요. 큰 귀가 있어요.', answer: '코끼리', wrong: ['하마', '코뿔소'] },
      { hint: '깡충깡충 뛰어다니고, 긴 귀가 있어요. 당근을 좋아해요.', answer: '토끼', wrong: ['다람쥐', '햄스터'] },
      { hint: '검은색과 하얀색 줄무늬가 있어요. 말처럼 생겼지만 아프리카에 살아요.', answer: '얼룩말', wrong: ['기린', '당나귀'] },
      { hint: '물속에서 살고, 아가미로 숨을 쉬어요. 지느러미로 헤엄쳐요.', answer: '물고기', wrong: ['개구리', '거북이'] },
      { hint: '등에 딱딱한 껍데기가 있고, 아주 느리게 걸어요. 오래 살기로 유명해요.', answer: '거북이', wrong: ['달팽이', '악어'] },
      { hint: '꿀을 만들고 윙윙 소리를 내며 날아다녀요. 침을 쏘기도 해요.', answer: '벌', wrong: ['나비', '잠자리'] },
      { hint: '새벽에 꼬끼오 하고 울어요. 빨간 볏이 있고 농장에서 많이 길러요.', answer: '닭', wrong: ['오리', '참새'] },
    ],
    object: [
      { hint: '버튼을 누르면 차가운 바람이 나와요. 여름에 꼭 필요해요.', answer: '에어컨', wrong: ['선풍기', '냉장고'] },
      { hint: '글자를 쓸 수 있고, 지우개로 지울 수 있어요. 학교에서 많이 써요.', answer: '연필', wrong: ['볼펜', '크레파스'] },
      { hint: '시간을 알려주고, 벽에 걸려 있거나 손목에 차요.', answer: '시계', wrong: ['달력', '휴대폰'] },
      { hint: '비가 올 때 펼쳐서 머리 위에 써요. 접으면 작아져요.', answer: '우산', wrong: ['모자', '우비'] },
      { hint: '어두운 곳을 밝혀주고, 천장에 달려 있어요. 스위치로 켜고 꺼요.', answer: '전등', wrong: ['촛불', '손전등'] },
      { hint: '음식을 차갑게 보관해요. 부엌에 있고 문을 열면 시원한 바람이 나와요.', answer: '냉장고', wrong: ['에어컨', '김치냉장고'] },
      { hint: '얼굴을 비춰볼 수 있어요. 화장실이나 방에 걸려 있어요.', answer: '거울', wrong: ['유리창', '액자'] },
      { hint: '발에 신고 다녀요. 밖에 나갈 때 꼭 필요하고 현관에 놓아둬요.', answer: '신발', wrong: ['양말', '슬리퍼'] },
      { hint: '전화도 하고 사진도 찍어요. 주머니에 넣고 다니는 작은 기계예요.', answer: '휴대폰', wrong: ['카메라', '태블릿'] },
      { hint: '종이를 자를 때 써요. 두 개의 날이 X자로 되어 있어요.', answer: '가위', wrong: ['칼', '풀'] },
    ],
  };

  const shuffleArray = (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startQuiz = (category) => {
    setWordCategory(category);
    setQuizIndex(0);
    setScore(0);
    setSelectedAnswer(null);

    // Immediately start with random fallback questions (no loading)
    const questions = shuffleArray(quizData[category]).slice(0, 5);
    setActiveQuizData(questions);
    setShuffledChoices(shuffleArray([questions[0].answer, ...questions[0].wrong]));
    setQuizLoading(false);
    setScreen('wordQuiz');

  };

  const handleAnswer = (choice) => {
    if (selectedAnswer !== null) return;
    const currentQ = activeQuizData[quizIndex];
    const isCorrect = choice === currentQ.answer;
    setSelectedAnswer(choice);
    if (isCorrect) setScore((s) => s + 1);

    setTimeout(() => {
      const nextIndex = quizIndex + 1;
      if (nextIndex >= 5) {
        setScreen('wordResult');
      } else {
        setQuizIndex(nextIndex);
        setSelectedAnswer(null);
        const nextQ = activeQuizData[nextIndex];
        setShuffledChoices(shuffleArray([nextQ.answer, ...nextQ.wrong]));
      }
    }, 1500);
  };

  // === Brain Game Start Functions ===
  const startReverseGame = () => {
    const shuffled = shuffleArray(reverseWords).slice(0, 5);
    setMarketPool(shuffled); // reuse marketPool to store word list
    setGameRound(0);
    setGameScore(0);
    setGameAnswer('');
    setGameFeedback(null);
    setGameFinished(false);
    setScreen('playReverse');
  };

  const checkReverseAnswer = () => {
    const currentWord = marketPool[gameRound];
    const reversed = currentWord.split('').reverse().join('');
    const isCorrect = gameAnswer.trim() === reversed;
    if (isCorrect) setGameScore(s => s + 1);
    setGameFeedback(isCorrect ? 'correct' : 'wrong');

    setTimeout(() => {
      const next = gameRound + 1;
      if (next >= 5) {
        setGameFinished(true);
      } else {
        setGameRound(next);
        setGameAnswer('');
        setGameFeedback(null);
      }
    }, 1500);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript.replace(/\s/g, '');
      setGameAnswer(spoken);
      // Auto-check after setting the answer
      const currentWord = marketPool[gameRound];
      const reversed = currentWord.split('').reverse().join('');
      const isCorrect = spoken === reversed;
      if (isCorrect) setGameScore(s => s + 1);
      setGameFeedback(isCorrect ? 'correct' : 'wrong');

      setTimeout(() => {
        const next = gameRound + 1;
        if (next >= 5) {
          setGameFinished(true);
        } else {
          setGameRound(next);
          setGameAnswer('');
          setGameFeedback(null);
        }
      }, 1500);
    };

    recognition.start();
  };

  const generateStroopQuestion = () => {
    const textIndex = Math.floor(Math.random() * stroopColors.length);
    let colorIndex;
    do {
      colorIndex = Math.floor(Math.random() * stroopColors.length);
    } while (colorIndex === textIndex);
    const question = { text: stroopColors[textIndex].name, displayColor: stroopColors[colorIndex].color, correctAnswer: stroopColors[colorIndex].name };
    const wrongChoices = stroopColors.filter(c => c.name !== question.correctAnswer).map(c => c.name);
    const choices = shuffleArray([question.correctAnswer, ...shuffleArray(wrongChoices).slice(0, 2)]);
    return { question, choices };
  };

  const startStroopGame = () => {
    setGameRound(0);
    setGameScore(0);
    setStroopSelected(null);
    setGameFinished(false);
    const { question, choices } = generateStroopQuestion();
    setStroopQuestion(question);
    setStroopChoices(choices);
    setScreen('playStroop');
  };

  const handleStroopAnswer = (choice) => {
    if (stroopSelected !== null) return;
    setStroopSelected(choice);
    if (choice === stroopQuestion.correctAnswer) setGameScore(s => s + 1);

    setTimeout(() => {
      const next = gameRound + 1;
      if (next >= 5) {
        setGameFinished(true);
      } else {
        setGameRound(next);
        setStroopSelected(null);
        const { question, choices } = generateStroopQuestion();
        setStroopQuestion(question);
        setStroopChoices(choices);
      }
    }, 1500);
  };

  const startMarketGame = () => {
    const shuffled = shuffleArray(marketAllItems);
    setMarketPool(shuffled);
    setMarketItems([shuffled[0]]);
    setMarketLevel(1);
    setMarketPhase('show');
    setMarketPicked([]);
    setGameFinished(false);
    setGameScore(0);
    setScreen('playMarket');
  };

  const startMarketPick = () => {
    setMarketPhase('pick');
    setMarketPicked([]);
    setMarketShuffledPicks(shuffleArray(marketItems));
  };

  const handleMarketPick = (item) => {
    if (marketPicked.includes(item)) return;
    const nextPicked = [...marketPicked, item];
    setMarketPicked(nextPicked);
    const expectedItem = marketItems[nextPicked.length - 1];
    if (item !== expectedItem) {
      setGameScore(marketLevel - 1);
      setGameFinished(true);
      return;
    }
    if (nextPicked.length === marketItems.length) {
      const nextLevel = marketLevel + 1;
      if (nextLevel > marketPool.length) {
        setGameScore(marketLevel);
        setGameFinished(true);
        return;
      }
      setMarketLevel(nextLevel);
      setMarketItems(prev => [...prev, marketPool[nextLevel - 1]]);
      setMarketPhase('show');
      setMarketPicked([]);
    }
  };

  const exercises = [
    {
      id: 'e1',
      type: 'exercise',
      title: '엇박자 손가락 운동',
      description: '양손의 움직임을 다르게 하여 뇌의 전두엽을 자극합니다.',
      steps: [
        '왼손은 주먹을 쥐고 엄지만 펴세요.',
        '오른손은 주먹을 쥐고 새끼손가락만 펴세요.',
        '박자에 맞춰 양손의 손가락을 동시에 바꿉니다.',
        '익숙해지면 속도를 높여보세요.'
      ],
      benefit: '좌우뇌 협응 능력 향상'
    },
    {
      id: 'e2',
      type: 'exercise',
      title: '교차 신체 터치',
      description: '중앙선을 넘는 동작을 통해 뇌 연결망을 강화합니다.',
      steps: [
        '오른손으로 왼쪽 어깨를 터치합니다.',
        '왼손으로 오른쪽 어깨를 터치합니다.',
        '오른손으로 왼쪽 무릎을 터치합니다.',
        '왼손으로 오른쪽 무릎을 터치합니다.',
        '이 동작을 리듬감 있게 반복하세요.'
      ],
      benefit: '집중력 및 신체 인지 능력 강화'
    },
    {
      id: 'e3',
      type: 'exercise',
      title: '손바닥 뒤집기 박수',
      description: '손바닥과 손등을 번갈아 치며 말초 신경을 자극합니다.',
      steps: [
        '양손을 마주 보게 하여 박수를 한 번 칩니다.',
        '오른손등과 왼손바닥이 닿게 박수를 칩니다.',
        '다시 마주 보게 박수를 칩니다.',
        '왼손등과 오른손바닥이 닿게 박수를 칩니다.'
      ],
      benefit: '혈액 순환 및 반응 속도 개선'
    }
  ];

  const games = [
    {
      id: 'g1',
      type: 'game',
      title: '거꾸로 말하기',
      description: '단어를 머릿속으로 시각화하고 반대로 출력하는 훈련입니다.',
      steps: [
        '제시된 3~5글자 단어를 확인합니다.',
        '예: "해바라기" → "기라바해"',
        '눈을 감고 머릿속으로 글자 위치를 바꿔보세요.',
        '주변 사람과 돌아가며 단어를 던져줍니다.'
      ],
      benefit: '작업 기억력(Working Memory) 강화'
    },
    {
      id: 'g2',
      type: 'game',
      title: '색깔 인지 게임',
      description: '글자의 의미와 실제 색깔의 간섭을 이겨내는 훈련입니다.',
      steps: [
        '글자는 "빨강"이라고 써있지만 색은 파란색인 경우를 상상하세요.',
        '글자를 읽지 말고 "글자의 색"을 말해야 합니다.',
        '틀리지 않고 빠르게 말하는 것이 핵심입니다.'
      ],
      benefit: '억제 조절 능력 및 주의력 향상'
    },
    {
      id: 'g3',
      type: 'game',
      title: '시장구경 기억하기',
      description: '순차적으로 늘어나는 항목을 기억하는 고전적인 게임입니다.',
      steps: [
        'A: "시장에 가면 사과도 있고"',
        'B: "시장에 가면 사과도 있고, 고등어도 있고"',
        'C: "시장에 가면 사과도 있고, 고등어도 있고, 배추도 있고"',
        '앞 사람이 말한 것을 모두 기억해 덧붙입니다.'
      ],
      benefit: '단기 기억력 보존'
    }
  ];

  const stopSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsReading(false);
  }, []);

  const numberToKorean = (text) => {
    const koreanNumbers = { '0': '영', '1': '일', '2': '이', '3': '삼', '4': '사', '5': '오', '6': '육', '7': '칠', '8': '팔', '9': '구', '10': '십' };
    return text.replace(/(\d+)번/g, (_, num) => `${koreanNumbers[num] || num}번`);
  };

  const speakText = useCallback((text) => {
    if (isReading) {
      stopSpeech();
      return;
    }

    if (!('speechSynthesis' in window)) {
      alert('이 브라우저는 음성 읽기를 지원하지 않습니다.');
      return;
    }

    window.speechSynthesis.cancel();

    const textToRead = numberToKorean(text);
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const koVoice = voices.find(v => v.lang.startsWith('ko'));
    if (koVoice) utterance.voice = koVoice;

    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);

    setIsReading(true);
    window.speechSynthesis.speak(utterance);
  }, [isReading, stopSpeech]);

  const handleReadText = useCallback(() => {
    const rawText = `${selectedItem.title}. ${selectedItem.description}. 따라하기 순서입니다. ${selectedItem.steps.map((s, i) => `${i + 1}번. ${s}`).join('. ')}`;
    speakText(rawText);
  }, [selectedItem, speakText]);

  const handleReadQuizHint = useCallback(() => {
    const currentQ = activeQuizData?.[quizIndex];
    if (!currentQ) return;
    speakText(`문제입니다. ${currentQ.hint}`);
  }, [activeQuizData, quizIndex, speakText]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const playCelebrationSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.3);
      });
    } catch {
      // Web Audio not supported
    }
  }, []);

  // Play celebration sound on perfect score
  useEffect(() => {
    if (screen === 'wordResult' && score === 5) {
      playCelebrationSound();
    }
  }, [screen, score, playCelebrationSound]);

  useEffect(() => {
    if (gameFinished && screen === 'playReverse' && gameScore === 5) {
      playCelebrationSound();
    }
    if (gameFinished && screen === 'playStroop' && gameScore === 5) {
      playCelebrationSound();
    }
    if (gameFinished && screen === 'playMarket' && gameScore === marketPool.length) {
      playCelebrationSound();
    }
  }, [gameFinished, screen, gameScore, marketPool.length, playCelebrationSound]);

  const navigateToDetail = (item) => {
    stopSpeech();
    setSelectedItem(item);
    setScreen('detail');
  };

  const goBack = (target) => {
    stopSpeech();
    setScreen(target);
  };

  const renderHome = () => (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in">
      <div className="bg-indigo-600 p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-white shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">안녕하세요!</h2>
        <p className="opacity-90 text-sm sm:text-base">오늘도 건강한 뇌를 위해<br />함께 운동해볼까요?</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => setScreen('exercises')}
          className="flex flex-col items-center justify-center bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md border-b-4 border-emerald-500 hover:bg-emerald-50 active:scale-95 transition-all"
        >
          <div className="bg-emerald-100 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl mb-2 sm:mb-3">
            <Hand className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
          </div>
          <span className="font-bold text-sm sm:text-base text-gray-800">맨손 운동</span>
        </button>

        <button
          onClick={() => setScreen('games')}
          className="flex flex-col items-center justify-center bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md border-b-4 border-amber-500 hover:bg-amber-50 active:scale-95 transition-all"
        >
          <div className="bg-amber-100 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl mb-2 sm:mb-3">
            <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" />
          </div>
          <span className="font-bold text-sm sm:text-base text-gray-800">두뇌 게임</span>
        </button>
      </div>

      <button
        onClick={() => setScreen('wordGame')}
        className="flex items-center justify-center gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md border-b-4 border-purple-500 hover:bg-purple-50 active:scale-95 transition-all"
      >
        <div className="bg-purple-100 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl">
          <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
        </div>
        <span className="font-bold text-sm sm:text-base text-gray-800">단어 게임 (수수께끼)</span>
      </button>

      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
        <h3 className="flex items-center gap-2 font-bold text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
          <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" /> 오늘의 건강상식
        </h3>
        {tipLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> 건강상식을 불러오고 있어요...
          </div>
        ) : (
          <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{healthTip}</p>
        )}
      </div>
    </div>
  );

  const renderList = (items, title, colorClass) => (
    <div className="flex flex-col gap-3 sm:gap-4 animate-slide-in">
      <div className="flex items-center gap-2 mb-1 sm:mb-2">
        <button onClick={() => goBack('home')} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full" aria-label="뒤로가기">
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">{title}</h2>
      </div>

      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => navigateToDetail(item)}
          className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-300 active:scale-[0.98] transition-all text-left"
        >
          <div className="flex-1 min-w-0 mr-3">
            <h3 className="font-bold text-base sm:text-lg text-gray-800">{item.title}</h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{item.description}</p>
          </div>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center ${colorClass} bg-opacity-10`}>
            <Play className={`w-4 h-4 sm:w-5 sm:h-5 ${colorClass.replace('bg-', 'text-')}`} />
          </div>
        </button>
      ))}
    </div>
  );

  const renderWordGame = () => (
    <div className="flex flex-col gap-3 sm:gap-4 animate-slide-in">
      <div className="flex items-center gap-2 mb-1 sm:mb-2">
        <button onClick={() => goBack('home')} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full" aria-label="뒤로가기">
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">단어 게임</h2>
      </div>

      <p className="text-sm sm:text-base text-gray-600 px-1">카테고리를 선택하세요. 수수께끼 힌트를 보고 정답을 맞춰보세요!</p>

      <button onClick={() => startQuiz('fruit')} className="flex items-center gap-4 bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 hover:border-red-300 active:scale-[0.98] transition-all text-left">
        <div className="bg-red-100 p-3 rounded-xl">
          <Apple className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" />
        </div>
        <div>
          <h3 className="font-bold text-base sm:text-lg text-gray-800">과일</h3>
          <p className="text-xs sm:text-sm text-gray-500">맛있는 과일을 맞춰보세요</p>
        </div>
      </button>

      <button onClick={() => startQuiz('animal')} className="flex items-center gap-4 bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 hover:border-orange-300 active:scale-[0.98] transition-all text-left">
        <div className="bg-orange-100 p-3 rounded-xl">
          <Cat className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />
        </div>
        <div>
          <h3 className="font-bold text-base sm:text-lg text-gray-800">동물</h3>
          <p className="text-xs sm:text-sm text-gray-500">귀여운 동물을 맞춰보세요</p>
        </div>
      </button>

      <button onClick={() => startQuiz('object')} className="flex items-center gap-4 bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 hover:border-blue-300 active:scale-[0.98] transition-all text-left">
        <div className="bg-blue-100 p-3 rounded-xl">
          <Lamp className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />
        </div>
        <div>
          <h3 className="font-bold text-base sm:text-lg text-gray-800">사물</h3>
          <p className="text-xs sm:text-sm text-gray-500">생활 속 사물을 맞춰보세요</p>
        </div>
      </button>
    </div>
  );

  const renderWordQuiz = () => {
    const currentQ = activeQuizData[quizIndex];
    const categoryLabel = { fruit: '과일', animal: '동물', object: '사물' }[wordCategory];

    if (quizLoading || !currentQ) {
      return (
        <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          <p className="text-gray-500 font-bold">새로운 문제를 만들고 있어요...</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <button onClick={() => goBack('wordGame')} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full" aria-label="뒤로가기">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">{categoryLabel} 퀴즈</h2>
        </div>

        {/* Progress */}
        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm font-bold text-gray-600">{quizIndex + 1} / 5</span>
            <span className="text-xs sm:text-sm font-bold text-indigo-600">점수: {score}점</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((quizIndex + 1) / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100">
          <div className="bg-purple-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl mb-5 sm:mb-6 border border-purple-100">
            <p className="text-sm sm:text-base text-purple-900 leading-relaxed font-medium text-center mb-3">
              {currentQ.hint}
            </p>
            <div className="flex justify-center">
              <button
                onClick={handleReadQuizHint}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${isReading ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-100'}`}
              >
                {isReading ? (
                  <><Square className="w-3.5 h-3.5 fill-current" /> 멈추기</>
                ) : (
                  <><Volume2 className="w-3.5 h-3.5" /> 문제 듣기</>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:gap-3">
            {shuffledChoices.map((choice) => {
              let btnClass = 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-indigo-50 hover:border-indigo-300';
              if (selectedAnswer !== null) {
                if (choice === currentQ.answer) {
                  btnClass = 'bg-emerald-50 border-emerald-400 text-emerald-800';
                } else if (choice === selectedAnswer) {
                  btnClass = 'bg-red-50 border-red-400 text-red-800';
                } else {
                  btnClass = 'bg-gray-50 border-gray-200 text-gray-400';
                }
              }
              return (
                <button
                  key={choice}
                  onClick={() => handleAnswer(choice)}
                  disabled={selectedAnswer !== null}
                  className={`w-full p-3.5 sm:p-4 rounded-xl border-2 font-bold text-sm sm:text-base transition-all active:scale-[0.98] ${btnClass}`}
                >
                  {choice}
                  {selectedAnswer !== null && choice === currentQ.answer && ' ✓'}
                </button>
              );
            })}
          </div>

          {selectedAnswer !== null && (
            <p className={`mt-4 text-center text-sm sm:text-base font-bold ${selectedAnswer === currentQ.answer ? 'text-emerald-600' : 'text-red-600'}`}>
              {selectedAnswer === currentQ.answer ? '정답입니다!' : `오답! 정답은 "${currentQ.answer}"입니다.`}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderWordResult = () => {
    const isPerfect = score === 5;
    const categoryLabel = { fruit: '과일', animal: '동물', object: '사물' }[wordCategory];

    return (
      <div className="flex flex-col gap-4 sm:gap-6 animate-slide-up items-center text-center">
        {isPerfect && (
          <div className="confetti-container">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="confetti-piece" style={{
                '--x': `${Math.random() * 100 - 50}vw`,
                '--y': `${Math.random() * -80 - 20}vh`,
                '--r': `${Math.random() * 720 - 360}deg`,
                '--delay': `${Math.random() * 0.5}s`,
                '--color': ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'][i % 6],
              }} />
            ))}
          </div>
        )}

        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100 w-full">
          <div className={`mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 ${isPerfect ? 'bg-amber-100' : 'bg-indigo-100'}`}>
            <Trophy className={`w-8 h-8 sm:w-10 sm:h-10 ${isPerfect ? 'text-amber-500' : 'text-indigo-500'}`} />
          </div>

          {isPerfect && (
            <h2 className="text-2xl sm:text-3xl font-black text-amber-500 mb-2 animate-bounce">
              축하합니다!
            </h2>
          )}

          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{categoryLabel} 퀴즈 결과</h3>

          <div className="text-4xl sm:text-5xl font-black text-indigo-600 my-4">
            {score} <span className="text-lg sm:text-xl text-gray-400 font-bold">/ 5</span>
          </div>

          <p className="text-sm sm:text-base text-gray-600">
            {isPerfect ? '모든 문제를 맞추셨어요! 대단해요!' :
             score >= 3 ? '잘하셨어요! 다시 도전해보세요!' :
             '다시 한번 도전해볼까요?'}
          </p>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => { setScreen('wordGame'); setWordCategory(null); }}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base shadow-md hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            다시 하기
          </button>
          <button
            onClick={() => goBack('home')}
            className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base shadow-md border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
            홈으로
          </button>
        </div>
      </div>
    );
  };

  const renderDetail = () => (
    <div className="flex flex-col gap-4 sm:gap-6 animate-slide-up">
      <div className="flex items-center gap-2">
        <button
          onClick={() => goBack(selectedItem.type === 'exercise' ? 'exercises' : 'games')}
          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full"
          aria-label="뒤로가기"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">활동 상세 설명</h2>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100">
        <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${selectedItem.type === 'exercise' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {selectedItem.type === 'exercise' ? '신체 활동' : '인지 활동'}
          </span>

          <button
            onClick={handleReadText}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all ${isReading ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}
          >
            {isReading ? (
              <>
                <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                멈추기
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                설명 듣기
              </>
            )}
          </button>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{selectedItem.title}</h3>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">{selectedItem.description}</p>

        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" /> 따라하기 순서
          </h4>
          {selectedItem.steps.map((step, index) => (
            <div key={index} className="flex gap-2.5 sm:gap-3 items-start bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
              <span className="bg-indigo-600 text-white w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                {index + 1}
              </span>
              <p className="text-sm sm:text-base text-gray-700">{step}</p>
            </div>
          ))}
        </div>

        <div className="bg-indigo-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-indigo-100">
          <h4 className="font-bold text-indigo-800 flex items-center gap-2 mb-1 text-sm sm:text-base">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> 기대 효과
          </h4>
          <p className="text-indigo-700 text-xs sm:text-sm">{selectedItem.benefit}</p>
        </div>
      </div>

      {selectedItem.type === 'game' ? (
        <div className="flex gap-3">
          <button
            onClick={() => goBack('games')}
            className="flex-1 bg-white text-gray-700 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-md border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            돌아가기
          </button>
          <button
            onClick={() => {
              if (selectedItem.id === 'g1') startReverseGame();
              else if (selectedItem.id === 'g2') startStroopGame();
              else if (selectedItem.id === 'g3') startMarketGame();
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-md hover:bg-amber-600 active:scale-[0.98] transition-all"
          >
            <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6" />
            게임 시작
          </button>
        </div>
      ) : (
        <button
          onClick={() => goBack('exercises')}
          className="w-full bg-indigo-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-md hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          확인했습니다
        </button>
      )}
    </div>
  );

  const renderGameResult = (title, scoreVal, total, onRetry, onHome) => (
    <div className="flex flex-col gap-4 sm:gap-6 animate-slide-up items-center text-center">
      {scoreVal === total && (
        <div className="confetti-container">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="confetti-piece" style={{
              '--x': `${Math.random() * 100 - 50}vw`,
              '--y': `${Math.random() * -80 - 20}vh`,
              '--r': `${Math.random() * 720 - 360}deg`,
              '--delay': `${Math.random() * 0.5}s`,
              '--color': ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'][i % 6],
            }} />
          ))}
        </div>
      )}
      <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100 w-full">
        <div className={`mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 ${scoreVal === total ? 'bg-amber-100' : 'bg-indigo-100'}`}>
          <Trophy className={`w-8 h-8 sm:w-10 sm:h-10 ${scoreVal === total ? 'text-amber-500' : 'text-indigo-500'}`} />
        </div>
        {scoreVal === total && <h2 className="text-2xl sm:text-3xl font-black text-amber-500 mb-2 animate-bounce">축하합니다!</h2>}
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{title} 결과</h3>
        <div className="text-4xl sm:text-5xl font-black text-indigo-600 my-4">
          {scoreVal} <span className="text-lg sm:text-xl text-gray-400 font-bold">/ {total}</span>
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          {scoreVal === total ? '모든 문제를 맞추셨어요! 대단해요!' : scoreVal >= Math.ceil(total / 2) ? '잘하셨어요! 다시 도전해보세요!' : '다시 한번 도전해볼까요?'}
        </p>
      </div>
      <div className="flex gap-3 w-full">
        <button onClick={onRetry} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base shadow-md hover:bg-amber-600 active:scale-[0.98] transition-all">
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" /> 다시 하기
        </button>
        <button onClick={onHome} className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base shadow-md border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all">
          <Home className="w-4 h-4 sm:w-5 sm:h-5" /> 홈으로
        </button>
      </div>
    </div>
  );

  const renderPlayReverse = () => {
    if (gameFinished) {
      return renderGameResult('거꾸로 말하기', gameScore, 5, startReverseGame, () => goBack('home'));
    }
    const currentWord = marketPool[gameRound];
    const reversed = currentWord?.split('').reverse().join('');
    return (
      <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <button onClick={() => goBack('games')} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full" aria-label="뒤로가기">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">거꾸로 말하기</h2>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm font-bold text-gray-600">{gameRound + 1} / 5</span>
            <span className="text-xs sm:text-sm font-bold text-indigo-600">점수: {gameScore}점</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${((gameRound + 1) / 5) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100">
          <p className="text-center text-sm text-gray-500 mb-3">이 단어를 거꾸로 입력하거나 말해보세요</p>
          <div className="bg-amber-50 p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-amber-100 mb-5">
            <p className="text-center text-3xl sm:text-4xl font-black text-amber-700 tracking-widest">{currentWord}</p>
          </div>

          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={gameAnswer}
              onChange={(e) => setGameAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && gameAnswer.trim() && !gameFeedback && checkReverseAnswer()}
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
              placeholder="거꾸로 입력..."
              disabled={gameFeedback !== null || isListening}
              className="flex-1 p-3 sm:p-4 rounded-xl border-2 border-gray-200 text-center text-lg sm:text-xl font-bold focus:border-amber-400 focus:outline-none transition-all disabled:bg-gray-50"
            />
            <button
              onClick={startListening}
              disabled={gameFeedback !== null || isListening}
              className={`p-3 sm:p-4 rounded-xl font-bold transition-all active:scale-[0.98] ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="음성 입력"
            >
              {isListening ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
            <button
              onClick={checkReverseAnswer}
              disabled={!gameAnswer.trim() || gameFeedback !== null}
              className="px-4 sm:px-6 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm sm:text-base hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              확인
            </button>
          </div>

          {isListening && (
            <p className="mt-2 text-center text-sm text-purple-600 font-bold animate-pulse">듣고 있어요... 말해주세요!</p>
          )}

          {gameFeedback && (
            <div className={`mt-4 p-3 rounded-xl text-center font-bold text-sm sm:text-base ${gameFeedback === 'correct' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {gameFeedback === 'correct' ? '정답입니다! 👏' : `오답! 정답은 "${reversed}" 입니다.`}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPlayStroop = () => {
    if (gameFinished) {
      return renderGameResult('색깔 인지 게임', gameScore, 5, startStroopGame, () => goBack('home'));
    }
    return (
      <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <button onClick={() => goBack('games')} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full" aria-label="뒤로가기">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">색깔 인지 게임</h2>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm font-bold text-gray-600">{gameRound + 1} / 5</span>
            <span className="text-xs sm:text-sm font-bold text-indigo-600">점수: {gameScore}점</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${((gameRound + 1) / 5) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100">
          <p className="text-center text-sm text-gray-500 mb-2">글자의 <strong>색깔</strong>을 선택하세요 (글자를 읽지 마세요!)</p>
          <div className="bg-gray-50 p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-gray-200 mb-5 flex items-center justify-center">
            <span className="text-4xl sm:text-5xl font-black" style={{ color: stroopQuestion.displayColor }}>
              {stroopQuestion.text}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 sm:gap-3">
            {stroopChoices.map((choice) => {
              let btnClass = 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-amber-50 hover:border-amber-300';
              if (stroopSelected !== null) {
                if (choice === stroopQuestion.correctAnswer) {
                  btnClass = 'bg-emerald-50 border-emerald-400 text-emerald-800';
                } else if (choice === stroopSelected) {
                  btnClass = 'bg-red-50 border-red-400 text-red-800';
                } else {
                  btnClass = 'bg-gray-50 border-gray-200 text-gray-400';
                }
              }
              return (
                <button
                  key={choice}
                  onClick={() => handleStroopAnswer(choice)}
                  disabled={stroopSelected !== null}
                  className={`w-full p-3.5 sm:p-4 rounded-xl border-2 font-bold text-sm sm:text-base transition-all active:scale-[0.98] ${btnClass}`}
                >
                  {choice}
                  {stroopSelected !== null && choice === stroopQuestion.correctAnswer && ' ✓'}
                </button>
              );
            })}
          </div>

          {stroopSelected !== null && (
            <p className={`mt-4 text-center text-sm sm:text-base font-bold ${stroopSelected === stroopQuestion.correctAnswer ? 'text-emerald-600' : 'text-red-600'}`}>
              {stroopSelected === stroopQuestion.correctAnswer ? '정답입니다!' : `오답! 정답은 "${stroopQuestion.correctAnswer}"입니다.`}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderPlayMarket = () => {
    if (gameFinished) {
      return renderGameResult('시장구경 기억하기', gameScore, marketPool.length,
        startMarketGame, () => goBack('home'));
    }
    return (
      <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <button onClick={() => goBack('games')} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full" aria-label="뒤로가기">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">시장구경 기억하기</h2>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm font-bold text-gray-600">단계: {marketLevel}</span>
            <span className="text-xs sm:text-sm font-bold text-amber-600">기억할 물건: {marketItems.length}개</span>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100">
          {marketPhase === 'show' ? (
            <>
              <p className="text-center text-sm text-gray-500 mb-4">시장에 가면 이런 것들이 있어요. 순서를 기억하세요!</p>
              <div className="bg-amber-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-amber-100 mb-5">
                <p className="text-center text-base sm:text-lg font-bold text-amber-800 leading-relaxed">
                  시장에 가면 {marketItems.map((item, i) => (
                    <span key={i}>
                      <strong className={i === marketItems.length - 1 ? 'text-red-600 text-lg sm:text-xl' : ''}>{item}</strong>
                      {i < marketItems.length - 1 ? '도 있고, ' : '도 있고...'}
                    </span>
                  ))}
                </p>
              </div>
              <button
                onClick={startMarketPick}
                className="w-full bg-amber-500 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-md hover:bg-amber-600 active:scale-[0.98] transition-all"
              >
                순서대로 고르기
              </button>
            </>
          ) : (
            <>
              <p className="text-center text-sm text-gray-500 mb-2">시장에서 본 물건을 순서대로 선택하세요!</p>
              <div className="flex gap-2 flex-wrap justify-center mb-4">
                {marketPicked.map((item, i) => (
                  <span key={i} className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-bold">{i + 1}. {item}</span>
                ))}
                {marketPicked.length < marketItems.length && (
                  <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-sm font-bold">{marketPicked.length + 1}. ?</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {marketShuffledPicks.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleMarketPick(item)}
                    disabled={marketPicked.includes(item)}
                    className={`p-3 sm:p-4 rounded-xl border-2 font-bold text-sm sm:text-base transition-all active:scale-[0.98] ${marketPicked.includes(item) ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-800 hover:bg-amber-50 hover:border-amber-300'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen min-h-dvh bg-gray-50 flex justify-center font-sans antialiased text-gray-900">
      <div className="w-full max-w-lg flex flex-col min-h-screen min-h-dvh">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-black text-indigo-900 tracking-tight">BRAIN FIT(두뇌 운동 게임)</h1>
          <Activity className="text-indigo-600 w-5 h-5 sm:w-6 sm:h-6" />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-20">
          {screen === 'home' && renderHome()}
          {screen === 'exercises' && renderList(exercises, '맨손 운동 목록', 'bg-emerald-500')}
          {screen === 'games' && renderList(games, '두뇌 게임 목록', 'bg-amber-500')}
          {screen === 'detail' && renderDetail()}
          {screen === 'wordGame' && renderWordGame()}
          {screen === 'wordQuiz' && renderWordQuiz()}
          {screen === 'wordResult' && renderWordResult()}
          {screen === 'playReverse' && renderPlayReverse()}
          {screen === 'playStroop' && renderPlayStroop()}
          {screen === 'playMarket' && renderPlayMarket()}
        </main>

        {/* Bottom Nav */}
        <nav className="sticky bottom-0 bg-white border-t border-gray-100 flex items-center justify-around px-4 py-2 sm:py-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => goBack('home')}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 ${screen === 'home' ? 'text-indigo-600' : 'text-gray-400'}`}
          >
            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${screen === 'home' ? 'bg-indigo-50' : ''}`}>
              <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold">홈</span>
          </button>
          <button
            onClick={() => goBack('exercises')}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 ${screen === 'exercises' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${screen === 'exercises' ? 'bg-emerald-50' : ''}`}>
              <Hand className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold">운동</span>
          </button>
          <button
            onClick={() => goBack('games')}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 ${screen === 'games' ? 'text-amber-600' : 'text-gray-400'}`}
          >
            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${screen === 'games' ? 'bg-amber-50' : ''}`}>
              <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold">게임</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;
