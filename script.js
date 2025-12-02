/**
 * PreSales Quiz Application Logic with Firebase
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Replace with your actual Firebase Configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let db;
try {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
} catch (e) {
    console.error("Firebase Initialization Error. Please check your config in script.js", e);
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
                alert("데이터베이스에 문제가 없거나, Firebase 설정이 올바르지 않습니다.\n콘솔에서 window.uploadInitialData()를 실행하여 데이터를 초기화하세요.");
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
            alert("문제를 불러오는데 실패했습니다. 네트워크 연결이나 설정을 확인해주세요.");
            this.resetToMenu();
        }
    },

    fetchQuestions: async function(type) {
        if (!db) return;

        // Query Firestore for all questions of the selected type
        // Since we need to pick 5 RANDOM questions, and the dataset is small (25 items),
        // we fetch all for the type and shuffle in memory.
        const q = query(collection(db, "questions"), where("type", "==", type));
        const querySnapshot = await getDocs(q);
        
        const allQuestions = [];
        querySnapshot.forEach((doc) => {
            allQuestions.push(doc.data());
        });

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

        // Check correct
        if (selectedIndex === currentQ.correct) {
            this.score += 20;
            selectedBtn.classList.remove('border-slate-200', 'hover:border-blue-500', 'hover:bg-blue-50');
            selectedBtn.classList.add('bg-green-100', 'border-green-500');
        } else {
            selectedBtn.classList.remove('border-slate-200', 'hover:border-blue-500', 'hover:bg-blue-50');
            selectedBtn.classList.add('bg-red-100', 'border-red-500');
            
            // Highlight correct one
            const correctBtn = buttons[currentQ.correct];
            correctBtn.classList.remove('border-slate-200', 'hover:border-blue-500', 'hover:bg-blue-50', 'opacity-50');
            correctBtn.classList.add('bg-green-50', 'border-green-400');
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
                clearInterval(interval);
            } else {
                currentDisplay += 1;
            }
            this.ui.scoreText.innerText = currentDisplay;
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
// Run window.uploadInitialData() in the console to populate DB
window.uploadInitialData = async function() {
    if (!db) {
        console.error("Firebase not initialized. Check config.");
        return;
    }
    
    // Original Data
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
        { q: "프리세일즈가 ‘해석자’로 불리는 이유는?", a: ["용어를 많이 알고 있어서","데이터를 직접 분석해서","고객 맥락에 맞춘 설명이 필요하기 때문에","개발팀을 대신하기 때문에"], correct: 2 },
        { q: "BANT에서 판단이 가장 어려운 요소는?", a: ["예산","의사결정권","필요성","일정"], correct: 2 },
        { q: "Authority 판단 시 주의해야 할 점은?", a: ["직급이 낮다","회의에 자주 나온다","영향력을 가진 챔피언인지 여부","이메일을 많이 보낸다"], correct: 2 },
        { q: "고려 단계의 대표 문제는?", a: ["검색 부족","기능 비교 어려움","설정 복잡","채택 어려움"], correct: 1 },
        { q: "평가 단계의 터치포인트는?", a: ["블로그","가격 페이지","기술 문서·무료 체험","안내 이메일"], correct: 2 },
        { q: "PoC에서 가장 위험한 상황은?", a: ["고객이 적극적이다","기간이 짧다","평가 기준이 없다","경쟁사가 많다"], correct: 2 }
    ];

    const data200 = [
        { q: "솔루션 맵의 전략적 가치는?", a: ["문서를 보기 좋게 한다","제품 설명 시간을 줄인다","경쟁 구도를 기반으로 전략을 짤 수 있다","가격표를 만들 수 있다"], correct: 2 },
        { q: "MEDDPICC 중 프리세일즈 기여도가 높은 영역은?", a: ["계약 절차","가격 산정","Pain과 기준 정의","인사 체계"], correct: 2 },
        { q: "확장 단계에서의 적절한 활동은?", a: ["가격 협상","도입 검증","추가 기능 소개 및 성과 연계 제안","설정 가이드 제공"], correct: 2 },
        { q: "디스커버리에서 비효율적인 질문은?", a: ["상황 질문","개방형 질문","5 Why","예/아니오 질문"], correct: 3 },
        { q: "고객 여정과 정렬해야 하는 이유는?", a: ["회사 규정 때문","영업이 요구해서","구매는 단계별 경험에 의해 크게 좌우되기 때문","문서 형식 때문"], correct: 2 },
        { q: "제안서가 고객 혜택 중심이어야 하는 이유는?", a: ["장표가 줄어서","기술 설명이 어려워서","고객은 ‘자신이 얻는 변화’를 기준으로 판단하기 때문","경쟁사가 그렇게 해서"], correct: 2 },
        { q: "PoC가 실패하는 흔한 이유는?", a: ["일정이 길어서","담당자가 많아서","기준 없이 체험 위주로 진행되기 때문","기능이 너무 많아서"], correct: 2 },
        { q: "C레벨 자료의 핵심 포인트는?", a: ["문서를 화려하게 한다","기술 세부 설명을 많이 넣는다","전략적 가치만 빠르게 전달한다","장표 수를 늘린다"], correct: 2 },
        { q: "인수인계 실패의 주요 결과는?", a: ["문서가 많아진다","일정이 늘어난다","초기 대응 품질이 떨어진다","계약이 늘어난다"], correct: 2 },
        { q: "사례 제공의 핵심 가치는?", a: ["브랜드 홍보","시장 점유율 자랑","고객의 심리적 안전 확보","가격 인상 근거"], correct: 2 },
        { q: "데모에서 재설명이 필요한 이유는?", a: ["시간을 맞추기 위해","반복을 위해","핵심 메시지를 다시 구조화해 각인시키기 위해","문서를 늘리기 위해"], correct: 2 },
        { q: "PoC 기준 명확화가 중요한 이유는?", a: ["문서를 줄이려고","일정 관리를 위해","기술 승리 전략을 세우려면 필요하기 때문","팀장이 원해서"], correct: 2 },
        { q: "고객이 “우리 문제는 단순하다”라고 말할 때 해석은?", a: ["그대로 믿는다","기능 설명을 먼저 한다","문제 이면의 복잡성을 점검한다","가격을 먼저 제시한다"], correct: 2 },
        { q: "특정 기능 요구가 반복될 때 우선 행동은?", a: ["로드맵 설명","가격 안내","기능이 해결하려는 Pain 파악","경쟁사 비교"], correct: 2 },
        { q: "고객 시나리오 데모가 중요한 이유는?", a: ["화면이 예뻐서","기능을 많이 보여줄 수 있어서","고객이 자신의 상황에서 가치 판단을 하기 때문","장표 수를 줄일 수 있어서"], correct: 2 },
        { q: "STAR에서 면접자가 강조해야 하는 부분은?", a: ["상황","과제","행동 + 결과","팀 구조"], correct: 2 },
        { q: "JD 분석 시 가장 중요한 항목은?", a: ["복지","근무지","반복되는 핵심 요구 역량","지원 마감일"], correct: 2 },
        { q: "커뮤니티 활동이 좋은 이유는?", a: ["채용 정보 때문","이벤트 참여 때문","선배 프리세일즈의 사고 방식을 빠르게 흡수할 수 있어서","회사 홍보 때문"], correct: 2 },
        { q: "전환 시 가장 어려운 “언어” 변화는?", a: ["UI 용어","코딩 용어","기술 중심에서 가치 중심으로의 전환","문서 템플릿"], correct: 2 },
        { q: "고객이 기능을 강하게 요구할 때 우선순위는?", a: ["가격 설명","경쟁사 비교","요구 기능의 목적과 Pain 확인","로드맵 소개"], correct: 2 },
        { q: "AI 시대에 프리세일즈의 역할이 강화되는 이유는?", a: ["문서 작성이 줄어서","영업 인력이 줄어서","고객은 ‘해석’과 ‘맥락화’가 필요하기 때문","시스템이 복잡해져서"], correct: 2 },
        { q: "AI가 있어도 프리세일즈가 필요한 이유는?", a: ["AI가 데모를 못 해서","구매에는 신뢰·관계·설득이 필요해서","PoC가 늘어서","기능 설명이 어려워서"], correct: 1 },
        { q: "프리세일즈 성장에 가장 효과적인 접근은?", a: ["문서를 꾸미는 것","제품 기능 암기","실전 데모·시나리오 반복 연습","가격표 학습"], correct: 2 },
        { q: "“제품만 좋으면 팔린다”가 위험한 이유는?", a: ["경쟁사 때문","기능 격차가 줄어서","구매는 관계·리스크·선택 비용이 포함된 의사결정이기 때문","UI가 중요해서"], correct: 2 },
        { q: "AI 시대 프리세일즈가 가져야 할 조합은?", a: ["개발 + 디자인","마케팅 + 운영","컨설팅 관점 + 아키텍처 관점","HR + 기획"], correct: 2 }
    ];

    const batchPromises = [];
    console.log("Starting Upload...");
    
    // Upload 100
    for(const q of data100) {
        batchPromises.push(addDoc(collection(db, "questions"), { ...q, type: "100" }));
    }
    // Upload 200
    for(const q of data200) {
        batchPromises.push(addDoc(collection(db, "questions"), { ...q, type: "200" }));
    }

    try {
        await Promise.all(batchPromises);
        console.log("Upload Complete! 50 questions added.");
        alert("데이터 업로드가 완료되었습니다!");
    } catch(e) {
        console.error("Upload Failed", e);
        alert("업로드 실패. 콘솔을 확인하세요.");
    }
};