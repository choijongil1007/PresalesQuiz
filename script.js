
/**
 * PreSales Quiz Application Logic with Firebase
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
                alert("불러올 문제가 없습니다. 관리자에게 문의해주세요.");
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
