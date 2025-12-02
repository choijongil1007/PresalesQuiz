
/**
 * PreSales Quiz Application Logic with Firebase
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBGffkIfIGTAdtqcJHjozZrawpmyDiXN9g",
    authDomain: "presalesquiz.firebaseapp.com",
    projectId: "presalesquiz",
    storageBucket: "presalesquiz.firebasestorage.app",
    messagingSenderId: "500807721378",
    appId: "1:500807721378:web:ef1f02c38faa54a72352fb",
    measurementId: "G-X08W37H3EY"
};

// Initialize Firebase
let db;
try {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    console.log("Firebase initialized successfully");
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}

// --- Application Logic ---
const app = {
    // State
    currentType: null, // '100' or '200'
    userName: '',
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    
    // UI References
    ui: {
        pageTitle: document.getElementById('page-title'),
        userDisplay: document.getElementById('user-display'),
        displayName: document.getElementById('display-name'),
        
        viewWelcome: document.getElementById('view-welcome'),
        viewInput: document.getElementById('view-input'),
        viewLoading: document.getElementById('view-loading'),
        viewQuiz: document.getElementById('view-quiz'),
        viewResult: document.getElementById('view-result'),
        
        usernameInput: document.getElementById('username-input'),
        
        qCurrent: document.getElementById('q-current'),
        progressBar: document.getElementById('progress-bar'),
        questionText: document.getElementById('question-text'),
        optionsContainer: document.getElementById('options-container'),
        
        resultName: document.getElementById('result-name'),
        scoreText: document.getElementById('score-text'),
        
        btn100: document.getElementById('btn-100'),
        btn200: document.getElementById('btn-200')
    },

    // Initialization
    init: function() {
        this.resetToMenu();
    },

    // Navigation Methods
    resetToMenu: function() {
        this.currentType = null;
        this.hideAllViews();
        this.ui.viewWelcome.classList.remove('hidden');
        this.ui.pageTitle.innerText = "PreSales Training";
        this.ui.userDisplay.classList.add('hidden');
        this.updateActiveMenu(null);
    },

    selectQuiz: function(type) {
        this.currentType = type;
        this.hideAllViews();
        this.ui.viewInput.classList.remove('hidden');
        this.ui.pageTitle.innerText = `${type} Quiz 시작`;
        this.updateActiveMenu(type);
        this.ui.usernameInput.value = '';
        this.ui.usernameInput.focus();
    },

    startQuiz: async function() {
        const name = this.ui.usernameInput.value.trim();
        if (!name) {
            alert("이름을 입력해주세요.");
            return;
        }
        
        // Show Loading
        this.ui.viewInput.classList.add('hidden');
        this.ui.viewLoading.classList.remove('hidden');

        try {
            this.userName = name;
            this.ui.displayName.innerText = name;
            this.ui.userDisplay.classList.remove('hidden');
            
            // Fetch from Firebase
            await this.fetchQuestions(this.currentType);
            
            if (this.questions.length === 0) {
                alert("불러올 문제가 없습니다. 관리자에게 문의하여 데이터를 초기화해주세요.\n(좌측 하단 'DB 데이터 업로드' 버튼)");
                this.resetToMenu();
                return;
            }

            this.currentQuestionIndex = 0;
            this.score = 0;
            
            this.hideAllViews();
            this.ui.viewQuiz.classList.remove('hidden');
            this.renderQuestion();

        } catch (error) {
            console.error("Error starting quiz:", error);
            
            let msg = "문제를 불러오는데 실패했습니다.";
            if (error.message && error.message.includes("permission-denied")) {
                msg += "\n(오류: 데이터베이스 접근 권한이 없거나 DB가 생성되지 않았습니다.)";
            } else if (error.code === "unavailable") {
                msg += "\n(오류: 네트워크 연결을 확인해주세요.)";
            }
            
            alert(msg);
            this.resetToMenu();
        }
    },

    fetchQuestions: async function(type) {
        if (!db) {
            throw new Error("Database not initialized");
        }

        // Query Firestore for all questions of the selected type
        const q = query(collection(db, "questions"), where("type", "==", type));
        const querySnapshot = await getDocs(q);
        
        const allQuestions = [];
        querySnapshot.forEach((doc) => {
            allQuestions.push(doc.data());
        });

        if (allQuestions.length === 0) {
            console.warn(`No questions found for type ${type}`);
            this.questions = [];
            return;
        }

        // Randomly select 5
        this.questions = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 5);
    },

    renderQuestion: function() {
        const q = this.questions[this.currentQuestionIndex];
        
        // UI Updates
        this.ui.qCurrent.innerText = this.currentQuestionIndex + 1;
        const progressPercent = ((this.currentQuestionIndex) / 5) * 100;
        this.ui.progressBar.style.width = `${progressPercent}%`;
        
        this.ui.questionText.innerText = q.q;
        this.ui.optionsContainer.innerHTML = '';

        q.a.forEach((optionText, idx) => {
            const btn = document.createElement('button');
            btn.className = "w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group relative";
            
            const content = `
                <div class="flex items-start">
                    <span class="flex-shrink-0 h-6 w-6 rounded-full border border-slate-300 group-hover:border-blue-500 mr-3 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:text-blue-500 transition-colors">
                        ${String.fromCharCode(65 + idx)}
                    </span>
                    <span class="text-slate-700 group-hover:text-slate-900 font-medium">${optionText}</span>
                </div>
            `;
            btn.innerHTML = content;
            btn.onclick = () => this.handleAnswer(idx);
            this.ui.optionsContainer.appendChild(btn);
        });
    },

    handleAnswer: function(selectedIndex) {
        const currentQ = this.questions[this.currentQuestionIndex];
        
        // Visual feedback
        const buttons = this.ui.optionsContainer.children;
        const selectedBtn = buttons[selectedIndex];
        
        // Disable all buttons
        for (let btn of buttons) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        // Check correct (API uses 0-based index)
        if (selectedIndex === currentQ.correct) {
            this.score += 20;
            selectedBtn.classList.remove('border-slate-200', 'hover:border-blue-500', 'hover:bg-blue-50');
            selectedBtn.classList.add('bg-green-100', 'border-green-500');
        } else {
            selectedBtn.classList.remove('border-slate-200', 'hover:border-blue-500', 'hover:bg-blue-50');
            selectedBtn.classList.add('bg-red-100', 'border-red-500');
            
            // Highlight correct one
            const correctBtn = buttons[currentQ.correct];
            if (correctBtn) {
                correctBtn.classList.remove('border-slate-200', 'hover:border-blue-500', 'hover:bg-blue-50', 'opacity-50');
                correctBtn.classList.add('bg-green-50', 'border-green-400');
            }
        }

        // Wait then move next
        setTimeout(() => {
            this.currentQuestionIndex++;
            if (this.currentQuestionIndex < 5) {
                this.renderQuestion();
            } else {
                this.showResult();
            }
        }, 1000);
    },

    showResult: function() {
        this.hideAllViews();
        this.ui.viewResult.classList.remove('hidden');
        this.ui.resultName.innerText = this.userName;
        
        // Animate score
        let currentDisplay = 0;
        const interval = setInterval(() => {
            if (currentDisplay >= this.score) {
                currentDisplay = this.score;
                this.ui.scoreText.innerText = this.score;
                clearInterval(interval);
            } else {
                currentDisplay += 1;
                this.ui.scoreText.innerText = currentDisplay;
            }
        }, 20);
        
        this.ui.progressBar.style.width = '100%';
    },

    // Helper: Utility
    hideAllViews: function() {
        this.ui.viewWelcome.classList.add('hidden');
        this.ui.viewInput.classList.add('hidden');
        this.ui.viewLoading.classList.add('hidden');
        this.ui.viewQuiz.classList.add('hidden');
        this.ui.viewResult.classList.add('hidden');
    },

    updateActiveMenu: function(type) {
        // Reset styles
        const inactiveClass = "hover:bg-slate-800";
        const activeClass = "bg-slate-800 ring-2 ring-blue-500";
        
        this.ui.btn100.classList.remove(...activeClass.split(' '));
        this.ui.btn200.classList.remove(...activeClass.split(' '));
        
        if (type === '100') {
            this.ui.btn100.classList.add(...activeClass.split(' '));
        } else if (type === '200') {
            this.ui.btn200.classList.add(...activeClass.split(' '));
        }
    }
};

// Expose app to window for HTML event handlers
window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// --- Utility: Seed Data to Firebase ---
window.uploadInitialData = async function() {
    if (!db) {
        console.error("Firebase not initialized.");
        alert("Firebase 오류: 콘솔 설정을 확인해주세요.");
        return;
    }

    if (!confirm("총 70개(100Quiz: 20개, 200Quiz: 50개)의 문제를 데이터베이스에 업로드하시겠습니까?\n(기존 데이터는 유지되며 추가됩니다. 중복 방지를 위해 기존 DB를 비우거나 주의하세요)")) {
        return;
    }

    // Level 100 Data (Existing)
    const data100 = [
        { q: "프리세일즈의 핵심 역할은?", a: ["기능 요구사항만 전달하는 역할","기술 문제만 해결하는 역할","고객 의사결정을 돕는 기술·비즈니스 조율 역할","계약 이후 운영을 담당하는 역할"], correct: 2 },
        { q: "‘기술 대표’라는 표현의 의미는?", a: ["제품 로드맵을 결정하는 사람","사내 기술 총괄 책임자","고객의 기술적 신뢰 형성을 주도하는 역할","기술 문서를 관리하는 역할"], correct: 2 },
        { q: "프리세일즈 수요가 증가한 핵심 이유는?", a: ["영업 인력이 줄어서","기술 문서가 늘어서","기술 환경이 복잡해져 고객이 해석 도움을 필요로 해서","SaaS 가격이 높아져서"], correct: 2 },
        { q: "HBR 분석이 의미하는 핵심 포인트는?", a: ["문서 품질 향상","프리세일즈 교육 증가","기술 활동이 매출 지표에 직접 영향을 준다는 점","개발 속도 개선"], correct: 2 },
        { q: "프리세일즈 온보딩에 시간이 걸리는 이유는?", a: ["문서 작업 때문에","사내 절차가 복잡해서","산업·제품·경쟁 구도를 모두 이해해야 해서","실습 시간이 많아서"], correct: 2 },
        { q: "영업과 프리세일즈의 차이는?", a: ["기능 설명 vs 가격 협상","제품 소개 vs 프로젝트 수행","기술적 승리 vs 계약 성사","문서 작성 vs 세금 처리"], correct: 2 },
        { q: "사후 조직과 역할이 겹치는 이유는?", a: ["개발팀이 부족해서","고객 미팅이 많아서","구매 여정 후반부까지 신뢰 연결이 필요해서","조직 구조가 단순해서"], correct: 2 },
        { q: "스타트업 프리세일즈의 특징은?", a: ["역할이 매우 제한적이다","계약 이후는 참여하지 않는다","제품 개선부터 기술 대응까지 영역이 넓다","고객 미팅이 거의 없다"], correct: 2 },
        { q: "프리세일즈의 영향도가 중요한 이유는?", a: ["문서를 많이 써서","가격 협상에 참여해서","기술적 판단이 구매 결정에 영향을 주기 때문에","팀장이 참여해서"], correct: 2 },
        { q: "프리세일즈가 기술 + 판매 역할을 하는 이유는?", a: ["기능을 많이 알아서","코드를 수정할 수 있어서","기술 기반 설득력이 구매 결정에 작용하기 때문에","영업 인원이 적어서"], correct: 2 },
        { q: "전문성과 커뮤니케이션이 동시에 중요한 이유는?", a: ["문서를 많이 작성하기 때문","영업과 협업이 많아서","기술 내용을 고객 맞춤 형태로 전달해야 해서","개발팀을 대신해야 해서"], correct: 2 },
        { q: "SPIN이 초기 미팅에 적합한 이유는?", a: ["기능 설명에 좋다","가격 논의에 좋다","고객의 문제 인식을 확장시키기 좋다","장표 만들기 쉽다"], correct: 2 },
        { q: "피라미드 구조가 고위층에 적합한 이유는?", a: ["화려해서","데이터가 많아서","결론 중심으로 빠르게 판단할 수 있어서","작성이 간단해서"], correct: 2 },
        { q: "기술 회의에서 가장 어려운 단계는?", a: ["상황 설명","문제 제기","해결책 제시","성공 장면 제시"], correct: 2 },
        { q: "TL;DR 방식의 핵심 가치는?", a: ["문장 수를 줄인다","미팅 시간을 줄인다","핵심 메시지를 한 번에 이해하게 한다","장표 수를 줄인다"], correct: 2 },
        { q: "기능 미지원 시 올바른 접근은?", a: ["가능하다고 말한다","다른 기능을 먼저 설명한다","미지원 사실을 명확히 알리고 대안을 제시한다","답변을 피한다"], correct: 2 },
        { q: "데모 ‘Show’ 단계의 역할은?", a: ["기능 나열","가격 안내","이해한 내용을 시각적으로 확인시키는 것","장표 설명"], correct: 2 },
        { q: "경청이 중요한 이유는?", a: ["말실수를 줄여서","기능을 더 잘 설명하기 위해","숨겨진 Pain을 파악하기 위해","미팅 시간을 늘리기 위해"], correct: 2 },
        { q: "문서 작성의 본질적 효과는?", a: ["문장력을 높인다","장표를 빠르게 만든다","사고를 구조화해 전략을 명확히 한다","고객에게 잘 보인다"], correct: 2 },
        { q: "프리세일즈가 ‘해석자’로 불리는 이유는?", a: ["용어를 많이 알고 있어서","데이터를 직접 분석해서","고객 맥락에 맞춘 설명이 필요하기 때문에","개발팀을 대신하기 때문에"], correct: 2 }
    ];

    // Level 200 Data (New 50 Questions)
    const data200 = [
        { q: "프리세일즈의 본질적 역할을 가장 정확하게 설명한 것은?", a: ["기술팀이 구현할 기능 요구사항을 수집·정리하는 역할", "고객의 문제를 기술·비즈니스 관점에서 재해석해 ‘구매 결정’을 앞당기는 역할", "제품의 기능을 가장 정확히 설명하는 역할", "영업의 부족한 기술 지식을 채워주는 역할"], correct: 1 },
        { q: "프리세일즈가 ‘기술 대표’로 불리는 이유 중 가장 적절한 것은?", a: ["사내 기술의 총 책임자이기 때문", "제품 개발 방향을 직접 결정하기 때문", "영업 과정에서 회사의 기술 신뢰도를 대표해 고객의 불확실성을 줄이기 때문", "기술 문서를 가장 많이 작성하기 때문"], correct: 2 },
        { q: "프리세일즈 인력 수요가 증가한 가장 핵심적인 배경은?", a: ["고객이 기술 문서를 선호하기 때문", "SaaS·AI 기반 환경이 복잡해져 고객이 ‘설명’이 아닌 ‘해석’을 필요로 하기 때문", "영업 인력이 감소했기 때문", "개발자 인건비가 증가했기 때문"], correct: 1 },
        { q: "HBR의 프리세일즈 효과 분석에서 특히 주목해야 하는 해석은?", a: ["프리세일즈가 계약서를 대신 검토해준다", "기술 활동이 실제 매출 지표(전환율, 수익률)에 영향을 준다는 량적 증거가 확보되었다", "PoC 기간이 단축된다", "프리세일즈는 영업보다 더 중요한 역할이다"], correct: 1 },
        { q: "글로벌 통계를 볼 때 프리세일즈 팀 온보딩에 평균 6개월이 걸리는 이유로 가장 적절한 것은?", a: ["문서 템플릿이 복잡해서", "고객 산업·제품·경쟁 구도를 모두 이해해야 하며 제품 단건 설명이 아니라 ‘문맥 기반 해석’ 능력이 필요하기 때문", "교육 프로그램이 부족해서", "영업과 협업 경험이 필요해서"], correct: 1 },
        { q: "프리세일즈와 영업의 경계를 설명할 때 가장 적절한 표현은?", a: ["프리세일즈는 PoC, 영업은 제안서만 담당", "프리세일즈는 기술적 승리를, 영업은 계약 성사를 이끈다", "둘 다 고객 미팅만 한다", "영업은 기술을 다루지 않는다"], correct: 1 },
        { q: "프리세일즈가 사후 팀(CSM, Support)과 역할이 일부 겹치는 이유는?", a: ["고객 여정 상 ‘평가→온보딩’이 끊김 없이 이어지고, 신뢰를 이어주는 핵심 연결점 역할을 하기 때문", "담당자가 부족해서", "조직 구조가 명확하지 않아서", "영업이 요청해서"], correct: 0 },
        { q: "스타트업 단계의 프리세일즈에게 요구되는 역량이 가장 넓은 이유는?", a: ["제품이 단순해서", "고객이 까다롭지 않아서", "Pre/PostSales가 구분되지 않아 제품 개선·컨설팅·세일즈 지원까지 초기 전 과정이 하나로 연결되어 있기 때문", "영업 지원이 적기 때문"], correct: 2 },
        { q: "프리세일즈의 가장 중요한 평가지표가 “영향도(influence)“인 이유는?", a: ["직접적인 매출 목표가 없기 때문", "고객의 의사결정 과정에 기술·신뢰·전략 관점을 제공하여 전체 승률을 변화시키기 때문", "자료를 많이 만들어서", "데모를 하기 때문"], correct: 1 },
        { q: "프리세일즈가 “기술력 + 판매력의 조합”으로 평가받는 이유는?", a: ["영업보다 코딩을 잘해서", "개발보다 고객을 잘 만나서", "기술 전문성을 기반으로 고객의 구매 의사결정에 직접적 영향을 주기 때문", "가격 협상에 참여해서"], correct: 2 },
        { q: "‘전문성’과 ‘커뮤니케이션’이 동시에 5/5로 평가되는 이유는?", a: ["문서를 많이 만들어야 해서", "기술 내용을 고객에게 맞게 재해석하는 ‘번역 능력’이 직무의 핵심이기 때문", "영업이 부족해서", "프레젠테이션을 자주 해서"], correct: 1 },
        { q: "SPIN 모델이 초기 고객 미팅에서 효과적인 이유는?", a: ["기능 설명에 강해서", "문제 인식이 낮은 고객에게 ‘문제의 심각성’을 스스로 인지하게 하기 때문", "가격 협상에 유리해서", "문서 작성에 적합해서"], correct: 1 },
        { q: "피라미드 구조가 C레벨 제안에 적합한 핵심 이유는?", a: ["데이터가 많아 보이기 때문", "결론을 먼저 제시해야 고위 의사결정자가 빠르게 판단할 수 있기 때문", "기술 용어를 많이 담을 수 있어서", "장표 수를 늘릴 수 있어서"], correct: 1 },
        { q: "기술 회의 5막 구조(And–But–Therefore–If–Then)에서 실제 프리세일즈가 어려움을 가장 많이 겪는 부분은?", a: ["And", "But", "Therefore", "Then"], correct: 2 },
        { q: "TL;DR가 프리세일즈 커뮤니케이션에서 특히 유용한 이유는?", a: ["문서를 줄일 수 있어서", "고객이 의사결정자일수록 ‘처리 가능한 인지 부하’를 최소화해야 하기 때문", "영어 표현이어서", "회사에서 권장해서"], correct: 1 },
        { q: "고객이 “지원하나요?”라고 묻는 기능을 지원하지 않을 때 솔직히 인정해야 하는 근본적 이유는?", a: ["시간을 아끼려고", "기능이 조만간 출시되니까", "관계 기반의 비즈니스에서 ‘신뢰 가속’을 만드는 행동이기 때문", "기능을 부정하면 PoC를 안 하기 때문"], correct: 2 },
        { q: "데모 Show 단계가 중요한 이유는?", a: ["보기 좋기 때문", "고객이 ‘머리로 이해한 것’을 ‘시각적으로 검증’해 인지 부조화를 줄여주기 때문", "정해진 절차라서", "영업이 요구해서"], correct: 1 },
        { q: "고객의 말을 듣는 능력이 프리세일즈 핵심 역량인 이유는?", a: ["고객이 화를 내기 때문", "고객의 Hidden Pain이 직접적으로 언급되지 않는 경우가 많기 때문", "데모 순서를 알아내려고", "PoC 조건을 맞추려고"], correct: 1 },
        { q: "문서 작성 능력이 프리세일즈에서 중요한 더 깊은 이유는?", a: ["깔끔한 문서가 신뢰를 준다", "문제 → 해결책 → 가치 구조로 정리하는 과정에서 전략적 사고가 훈련되기 때문", "회사 규정 때문이다", "팀장이 좋아한다"], correct: 1 },
        { q: "프리세일즈가 “기술 설명자”가 아니라 “맥락 해석자”인 이유는?", a: ["고객이 기술을 싫어해서", "고객이 기능보다 ‘문제 해결과 비즈니스 가치’를 기준으로 구매를 결정하기 때문", "기능 설명은 영업이 하기 때문", "개발팀이 지원하지 않기 때문"], correct: 1 },
        { q: "BANT 분석에서 가장 현실적으로 판단하기 어려운 요소는?", a: ["Budget", "Authority", "Need", "Timeline"], correct: 2 },
        { q: "Authority 판단 시 가장 오해하기 쉬운 신호는?", a: ["직급", "서류 결재자", "실제 영향력 행사자(Champion 여부)", "담당자의 연차"], correct: 2 },
        { q: "고객 여정에서 “기능 비교가 어려움, 가격 불확실성”이 주요 문제로 등장하는 단계는?", a: ["인식", "고려", "평가", "갱신"], correct: 1 },
        { q: "“무료 체험 환경, 기술 문서, 실시간 채팅”이 주요 터치포인트로 등장하는 고객 여정 단계는?", a: ["인식", "고려", "평가", "온보딩"], correct: 2 },
        { q: "PoC 시작 시 가장 위험한 신호는?", a: ["고객이 PoC를 빠르게 원한다", "PoC 평가 기준이 모호하거나 존재하지 않는다", "고객 담당자가 적극적이다", "일정이 촉박하다"], correct: 1 },
        { q: "솔루션 맵을 만드는 목적 중 전략적으로 가장 중요한 것은?", a: ["고객의 기술 스택을 보기 좋게 정리하기 위해", "경쟁사 점유 구도 파악을 통해 '기술적 승리 전략'을 설계하기 위해", "문서 템플릿을 맞추기 위해", "제품 홍보를 위해"], correct: 1 },
        { q: "MEDDPICC 중 프리세일즈가 가장 깊게 기여하는 항목은?", a: ["Champion", "Economic Buyer", "Identify Pain / Decision Criteria", "Paper Process"], correct: 2 },
        { q: "고객 여정에서 '확장(Expansion)' 단계에 적절한 프리세일즈 행동은?", a: ["신규 기능 데모 + 비즈니스 KPI 기반 업셀 기회 발굴", "가격 협상", "PoC 재수행", "경쟁사 분석"], correct: 0 },
        { q: "디스커버리에서 가장 위험한 질문 방식은?", a: ["열린 질문", "5 Why", "예/아니오 질문", "상황 질문"], correct: 2 },
        { q: "프리세일즈가 고객 여정 전체와 정렬해야 하는 이유는?", a: ["회사 규정 때문", "고객의 구매 의사결정은 논리적이 아니라 ‘여정 기반 경험’에 의해 크게 영향을 받기 때문", "영업이 요청해서", "PoC 때문"], correct: 1 },
        { q: "제안서에서 ‘고객 혜택 중심’이 중요한 이유는?", a: ["문서가 간단해져서", "고객은 스펙이 아니라 “나에게 어떤 변화가 일어나는가”를 기준으로 판단하기 때문", "경쟁사 대비 시각적 우위를 확보하기 위해", "장표 수를 줄이기 위해"], correct: 1 },
        { q: "PoC 목적을 오해한 경우 발생하기 쉬운 문제는?", a: ["PoC 기간 단축", "평가 기준 없이 ‘기능 체험’ 수준으로 흘러 기술 승리와 무관한 결과가 나옴", "고객 만족도 증가", "계약 확률 증가"], correct: 1 },
        { q: "C레벨 자료에서 장표 수를 10장 내외로 유지해야 하는 핵심적 이유는?", a: ["시간이 없어서", "기술 정보를 자세히 보면 혼동하기 때문", "고위 의사결정자의 관심은 ‘전략적 가치’에 집중되어 있고 정보량이 많을수록 설득력이 떨어지기 때문", "회사 가이드 때문"], correct: 2 },
        { q: "Sales→Delivery 인수인계가 제대로 되지 않을 때 가장 빈번하게 발생하는 문제는?", a: ["문서 분량 증가", "컨설턴트의 초반 시간 과소비 및 고객 신뢰 저하", "계약 해지", "PoC 실패"], correct: 1 },
        { q: "사례 제공의 본질적 가치는 무엇인가?", a: ["제품이 좋다는 홍보", "고객이 ‘우리 같은 회사도 성공했구나’라는 심리적 안전을 확보하는 것", "가격을 높이기 위해", "이벤트 참여 유도"], correct: 1 },
        { q: "데모에서 ‘재설명(Tell)’이 중요한 이유는?", a: ["길어 보이기 위해", "고객이 방금 본 내용을 구조화해 기억하게 하기 때문", "장표 수를 늘리기 위해", "의무 절차라서"], correct: 1 },
        { q: "PoC 평가 기준 중 ‘핵심 기능을 구현하지 못하면 탈락인가?’ 질문이 중요한 이유는?", a: ["PoC 문서가 필요해서", "PoC가 ‘체험’이 아닌 ‘공식 평가 절차’임을 명확히 해야 기술 승리 전략이 수립되기 때문", "컨설턴트가 좋아해서", "일정 조율을 위해"], correct: 1 },
        { q: "고객이 “우리 문제는 단순하다”라고 말할 때 프리세일즈가 취할 바람직한 관점은?", a: ["그대로 믿는다", "문제가 단순해 보일수록 실제로는 복잡한 의사결정 구조가 숨어 있을 가능성이 높다", "기능 중심 설명으로 전환한다", "PoC를 바로 제안한다"], correct: 1 },
        { q: "고객이 특정 기능을 집요하게 요구할 때 프리세일즈가 제일 먼저 해야 할 일은?", a: ["지원 여부 확인", "그 기능이 해결하려는 ‘진짜 Pain’을 파악", "비용 설명", "기능 우선순위 제시"], correct: 1 },
        { q: "기술 데모에서 ‘고객 맥락 기반 시나리오’를 사용하는 이유는?", a: ["화면 전환이 보기 좋아서", "고객이 기능이 아니라 “우리 상황에서 어떻게 쓰는가”로 판단하기 때문", "스토리 구성이 쉽기 때문", "시간 끌기"], correct: 1 },
        { q: "STAR 기법에서 프리세일즈 면접 시 가장 강조해야 하는 부분은?", a: ["Situation", "Task", "Action + Result", "배경 설명"], correct: 2 },
        { q: "프리세일즈 전환을 위한 JD 분석에서 가장 먼저 확인해야 할 항목은?", a: ["우대사항", "복지", "공통적으로 반복되는 핵심 역량", "근무지"], correct: 2 },
        { q: "프리세일즈 커뮤니티 참여가 커리어 성장에 중요한 이유는?", a: ["채용 공고를 많이 얻기 위해", "선배 프리세일즈의 사고·표현·문맥을 빠르게 습득할 수 있기 때문", "홍보를 위해", "인증을 받기 위해"], correct: 1 },
        { q: "기술 직무에서 프리세일즈로 전환할 때 가장 어려운 ‘언어 전환’은 무엇인가?", a: ["사내 커뮤니케이션", "기술 중심에서 ‘의사결정 중심’ 언어로 전환", "영어 문서 작성", "코드 리뷰"], correct: 1 },
        { q: "고객이 “이 기능이 꼭 필요합니다”라고 주장할 때 프리세일즈가 해야 할 최적의 대응은?", a: ["바로 로드맵 설명", "기능 지원 여부만 설명", "그 기능이 해결하려는 ‘업무 흐름’과 ‘가치’를 먼저 밝혀내기", "가격 인하 제안"], correct: 2 },
        { q: "AI 시대에 프리세일즈의 경쟁력이 더 중요해지는 이유는?", a: ["AI가 데모를 대신하기 때문에", "고객은 AI가 주는 정보보다 ‘맥락 기반 해석’과 ‘전략적 조언’을 원하기 때문", "영업 인력이 줄어서", "문서 작성이 쉬워져서"], correct: 1 },
        { q: "AI가 기술 분석을 돕더라도 프리세일즈 역할이 사라지지 않는 이유는?", a: ["AI가 PoC를 못 해서", "고객과의 신뢰·설득·관계·감정은 완전 자동화가 불가능하기 때문", "회사 정책", "기술 검증 단계가 줄어들어서"], correct: 1 },
        { q: "프리세일즈가 빠르게 성장하는 가장 확실한 방법은?", a: ["문서 템플릿 모으기", "매주 1번 실전 데모·시나리오 연습", "사내 규정 숙지", "기능 암기"], correct: 1 },
        { q: "‘제품만 좋으면 팔린다’는 오해가 위험한 이유는?", a: ["기능 비교가 쉬워서", "의사결정은 기능보다 ‘관계·신뢰·대안 리스크·변경 비용’ 등 복합 요인에 의해 결정되기 때문", "영업이 기능 설명을 잘해서", "가격 경쟁이 심해서"], correct: 1 },
        { q: "AI 시대 프리세일즈가 가져야 할 이상적 조합은?", a: ["기술 전문성 + 기능 시연 능력", "비즈니스 컨설팅 관점 + 솔루션 아키텍처 설계 능력", "개발 능력 + 마케팅 능력", "UI 디자인 + 영업 능력"], correct: 1 }
    ];

    try {
        const batchPromises = [];
        
        // Upload Level 100
        console.log("Uploading 100 Quiz...");
        data100.forEach(item => {
            batchPromises.push(addDoc(collection(db, "questions"), {
                ...item,
                type: "100"
            }));
        });

        // Upload Level 200
        console.log("Uploading 200 Quiz...");
        data200.forEach(item => {
            batchPromises.push(addDoc(collection(db, "questions"), {
                ...item,
                type: "200"
            }));
        });

        await Promise.all(batchPromises);
        console.log("All data uploaded successfully!");
        alert("데이터 업로드가 완료되었습니다! 이제 퀴즈를 시작할 수 있습니다.");
    } catch (e) {
        console.error("Error adding documents: ", e);
        alert("업로드 중 오류가 발생했습니다. 권한 설정이나 인터넷 연결을 확인해주세요.");
    }
};
