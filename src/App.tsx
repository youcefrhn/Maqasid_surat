/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Search, 
  Heart, 
  Bookmark, 
  Sparkles, 
  Award, 
  PenSquare, 
  RotateCcw, 
  Info, 
  X, 
  ChevronLeft, 
  Moon, 
  Sun, 
  Sliders, 
  Copy, 
  Check, 
  BookMarked, 
  HelpCircle, 
  Send, 
  Smartphone, 
  Share2,
  BookmarkCheck,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle as QuestionIcon
} from 'lucide-react';
import { surahsData, Surah } from './data/surahs';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function App() {
  // Theme & Reading settings
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Navigation states
  const [activeTab, setActiveTab] = useState<'index' | 'quiz' | 'bookmarks' | 'about'>('index');

  // Directory filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [classificationFilter, setClassificationFilter] = useState<'all' | 'مكية' | 'مدنية'>('all');

  // Reading / Detail states
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  
  // LocalStorage Persisted States
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    const saved = localStorage.getItem('bookmarks');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [reflections, setReflections] = useState<Record<number, string>>(() => {
    const saved = localStorage.getItem('reflections');
    return saved ? JSON.parse(saved) : {};
  });

  const [reflectionInput, setReflectionInput] = useState<string>('');

  // AI Chat states
  const [chatMessages, setChatMessages] = useState<Record<number, ChatMessage[]>>({});
  const [currentMessageInput, setCurrentMessageInput] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Copy to clipboard indicator
  const [copiedSurahNum, setCopiedSurahNum] = useState<number | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Quiz States
  const [quizScores, setQuizScores] = useState<{ correct: number; total: number; streak: number }>({
    correct: 0,
    total: 0,
    streak: 0
  });
  const [currentQuestion, setCurrentQuestion] = useState<{
    surah: Surah;
    options: string[];
    correctAnswer: string;
    type: 'surah-to-purpose' | 'purpose-to-surah';
  } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [quizTimer, setQuizTimer] = useState<number>(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // PWA Install Prompt State Simulation
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [showInstallSuccess, setShowInstallSuccess] = useState<boolean>(false);

  // Sync state modifications to localStorage
  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('reflections', JSON.stringify(reflections));
  }, [reflections]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Handle PWA installation trigger
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
    };
  }, []);

  // Timer logic for the Quiz
  useEffect(() => {
    if (activeTab === 'quiz' && currentQuestion && !isAnswerChecked) {
      setQuizTimer(35);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setQuizTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleQuizAnswer(''); // timeout is incorrect
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTab, currentQuestion, isAnswerChecked]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedSurah]);

  // Initialize first Quiz question
  useEffect(() => {
    if (activeTab === 'quiz' && !currentQuestion) {
      generateNextQuestion();
    }
  }, [activeTab]);

  const triggerInstall = async () => {
    if (!deferredPrompt) {
      // If we don't have the real prompt, simulate a beautiful PWA instructions modal
      setShowInstallSuccess(true);
      setTimeout(() => setShowInstallSuccess(false), 5000);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  // Toggle index bookmark
  const toggleBookmark = (num: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarks(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  // Copy text helper
  const handleCopyText = (text: string, num: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedSurahNum(num);
    setTimeout(() => setCopiedSurahNum(null), 2000);
  };

  // Copy AI Message helper
  const handleCopyMessage = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Open Surah and load its reflections/notes
  const handleOpenSurah = (surah: Surah) => {
    setSelectedSurah(surah);
    setReflectionInput(reflections[surah.number] || '');
  };

  // Save current reflections
  const handleSaveReflection = () => {
    if (!selectedSurah) return;
    setReflections(prev => ({
      ...prev,
      [selectedSurah.number]: reflectionInput
    }));
    
    // Add toast or physical feedback
    const originalText = reflectionInput;
    setReflectionInput(reflectionInput);
  };

  // AI Chat Request handler
  const handleSendChatMessage = async () => {
    if (!selectedSurah || !currentMessageInput.trim() || isAiLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: currentMessageInput,
      timestamp: new Date()
    };

    const updatedMessages = [...(chatMessages[selectedSurah.number] || []), userMsg];
    setChatMessages(prev => ({
      ...prev,
      [selectedSurah.number]: updatedMessages
    }));
    
    const messageToSend = currentMessageInput;
    setCurrentMessageInput('');
    setIsAiLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          surahName: selectedSurah.name,
          surahPurpose: selectedSurah.purpose,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: data.text,
          timestamp: new Date()
        };
        setChatMessages(prev => ({
          ...prev,
          [selectedSurah.number]: [...(prev[selectedSurah.number] || []), aiMsg]
        }));
      } else {
        const errAnswer: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: data.error || "عذراً، تعذر الاتصال بالمعلم الرقمي. الرجاء التأكد من تهيئة مفتاح الـ API.",
          timestamp: new Date()
        };
        setChatMessages(prev => ({
          ...prev,
          [selectedSurah.number]: [...(prev[selectedSurah.number] || []), errAnswer]
        }));
      }
    } catch (error) {
      console.error(error);
      const errAnswer: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "نعتذر، واجهنا مشكلة في معالجة طلبك حالياً. الرجاء مراجعة اتصال الإنترنت.",
        timestamp: new Date()
      };
      setChatMessages(prev => ({
        ...prev,
        [selectedSurah.number]: [...(prev[selectedSurah.number] || []), errAnswer]
      }));
    } finally {
      setIsAiLoading(false);
    }
  };

  // Quiz: Generate next beautiful question
  const generateNextQuestion = () => {
    // Select one random Surah
    const randomIndex = Math.floor(Math.random() * surahsData.length);
    const selected = surahsData[randomIndex];
    
    // Choose question type: either 0 (Guess surah from purpose) or 1 (Guess purpose from surah)
    const type = Math.random() > 0.5 ? 'surah-to-purpose' : 'purpose-to-surah';
    
    // Pick 3 random distractor answers
    let distractors: string[] = [];
    while (distractors.length < 3) {
      const distIndex = Math.floor(Math.random() * surahsData.length);
      const distSurah = surahsData[distIndex];
      if (distSurah.number !== selected.number) {
        const option = type === 'surah-to-purpose' ? distSurah.purpose : distSurah.name;
        if (!distractors.includes(option) && option !== "") {
          distractors.push(option);
        }
      }
    }

    const correctAnswer = type === 'surah-to-purpose' ? selected.purpose : selected.name;
    const options = [...distractors, correctAnswer].sort(() => Math.random() - 0.5);

    setCurrentQuestion({
      surah: selected,
      options,
      correctAnswer,
      type
    });
    setSelectedAnswer(null);
    setIsAnswerChecked(false);
  };

  // Quiz option submission
  const handleQuizAnswer = (answer: string) => {
    if (isAnswerChecked) return;
    
    setSelectedAnswer(answer);
    setIsAnswerChecked(true);
    
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = answer === currentQuestion?.correctAnswer;
    
    setQuizScores(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
      streak: isCorrect ? prev.streak + 1 : 0
    }));
  };

  // Help suggestions inside AI chat
  const sendSuggestedPrompt = (suggestion: string) => {
    setCurrentMessageInput(suggestion);
  };

  // Filtering Surahs for search bar
  const filteredSurahs = surahsData.filter(s => {
    const matchesSearch = s.name.includes(searchTerm) || 
                          s.number.toString() === searchTerm ||
                          s.purpose.includes(searchTerm);
    const matchesClass = classificationFilter === 'all' || s.type === classificationFilter;
    return matchesSearch && matchesClass;
  });

  const percentScore = quizScores.total > 0 ? Math.round((quizScores.correct / quizScores.total) * 100) : 0;

  return (
    <div className={`min-h-screen font-tajawal transition-colors duration-300 ${isDarkMode ? 'bg-[#0b1311] text-[#e2e8f0]' : 'bg-[#FAF8F5] text-[#2D2A26]'}`}>
      
      {/* Dynamic PWA Alert bar */}
      {isInstallable && (
        <div className="bg-[#064e3b] text-white px-4 py-2 text-center text-sm font-medium flex justify-between items-center z-50 sticky top-0 border-b border-[#047857]">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#fbbf24]" />
            <span>يمكنك تثبيت هذا التطبيق لقراءة سريعة ومقاصد تفاعلية بدون اتصال إنترنت!</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={triggerInstall}
              className="bg-[#d97706] hover:bg-[#b45309] text-white px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm"
            >
              تثبيت الآن
            </button>
            <button onClick={() => setIsInstallable(false)} className="text-white hover:text-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Real Success message */}
      {showInstallSuccess && (
        <div className="bg-emerald-800 text-white px-6 py-4 fixed top-4 left-4 right-4 md:left-auto md:w-96 rounded-lg shadow-xl border border-emerald-600 z-50 flex flex-col gap-2">
          <div className="flex items-center gap-2 scroll-py-1">
            <Smartphone className="w-5 h-5 text-yellow-400" />
            <span className="font-bold text-base">تعليمات التثبيت:</span>
          </div>
          <p className="text-sm text-emerald-100">
            لتثبيت التطبيق على جهازك، يرجى النقر على زر <span className="underline font-bold">مشاركة</span> في متصفحك (Safari/Chrome)، ثم اختر <span className="underline font-bold">"إضافة إلى الشاشة الرئيسية"</span>.
          </p>
          <button 
            onClick={() => setShowInstallSuccess(false)}
            className="self-end text-xs text-yellow-200 hover:text-white font-medium"
          >
            حسناً
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        
        {/* Header Branding section */}
        <header className="mb-8 border-b border-[#e2ddcf] dark:border-[#1d2d2a] pb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#064e40] text-[#e8c07d] rounded-2xl flex items-center justify-center font-amiri text-2xl font-bold shadow-md border-2 border-[#e8c07d]">
              تفسير
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#064e3b] dark:text-[#38bdf8] font-amiri">
                مقاصد سور القرآن الكريم
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                دليل تفاعلي ميسر للوصول إلى الغايات والمحاور العامة للقرآن من كتاب <span className="font-bold text-[#b45309] dark:text-[#fbbf24]">المختصر في التفسير</span>
              </p>
            </div>
          </div>

          {/* Quick controls panel */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Font settings configizer */}
            <div className="bg-[#f0ede4] dark:bg-[#121f1d] rounded-xl p-1 flex items-center border border-[#e2ddcf] dark:border-[#1d2d2a]">
              <button 
                onClick={() => setFontSize('small')}
                className={`px-2 py-1 text-xs rounded-lg transition-all ${fontSize === 'small' ? 'bg-[#064e3b] text-white font-bold' : 'text-slate-600 dark:text-gray-300 hover:bg-[#e2decb] dark:hover:bg-[#1f312e]'}`}
                title="خط صغير"
              >
                صغير
              </button>
              <button 
                onClick={() => setFontSize('medium')}
                className={`px-2 py-1 text-xs rounded-lg transition-all ${fontSize === 'medium' ? 'bg-[#064e3b] text-white font-bold' : 'text-slate-600 dark:text-gray-300 hover:bg-[#e2decb] dark:hover:bg-[#1f312e]'}`}
                title="خط متوسط"
              >
                متوسط
              </button>
              <button 
                onClick={() => setFontSize('large')}
                className={`px-2 py-1 text-xs rounded-lg transition-all ${fontSize === 'large' ? 'bg-[#064e3b] text-white font-bold' : 'text-slate-600 dark:text-gray-300 hover:bg-[#e2decb] dark:hover:bg-[#1f312e]'}`}
                title="خط كبير"
              >
                كبير
              </button>
            </div>

            {/* Dark & Light mode theme selection buttons */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 rounded-xl bg-[#f0ede4] dark:bg-[#121f1d] hover:bg-[#e2decb] dark:hover:bg-[#1f312e] text-slate-700 dark:text-gray-200 border border-[#e2ddcf] dark:border-[#1d2d2a] flex items-center justify-center transition-all shadow-sm"
              aria-label="تبديل مظهر الصفحة"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
          </div>
        </header>

        {/* Global Navigation Tabs widget */}
        <nav className="mb-6 grid grid-cols-4 gap-1 p-1 bg-[#f0ede4] dark:bg-[#121f1d] rounded-xl border border-[#e2ddcf] dark:border-[#1d2d2a]">
          <button 
            onClick={() => setActiveTab('index')}
            className={`flex flex-col md:flex-row items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'index' ? 'bg-white dark:bg-[#064e40] text-[#064e3b] dark:text-white shadow-sm' : 'text-slate-600 dark:text-gray-300 hover:bg-[#e2decb] dark:hover:bg-[#1f312e]'}`}
          >
            <BookOpen className="w-4 h-4" />
            <span>الفهرس الجامع</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('quiz')}
            className={`flex flex-col md:flex-row items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all relative ${activeTab === 'quiz' ? 'bg-white dark:bg-[#064e40] text-[#064e3b] dark:text-white shadow-sm' : 'text-slate-600 dark:text-gray-300 hover:bg-[#e2decb] dark:hover:bg-[#1f312e]'}`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>حفظ ومقاصد</span>
            {quizScores.streak > 0 && (
              <span className="absolute -top-1 -left-1 bg-amber-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md animate-bounce">
                {quizScores.streak}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab('bookmarks')}
            className={`flex flex-col md:flex-row items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all relative ${activeTab === 'bookmarks' ? 'bg-white dark:bg-[#064e40] text-[#064e3b] dark:text-white shadow-sm' : 'text-slate-600 dark:text-gray-300 hover:bg-[#e2decb] dark:hover:bg-[#1f312e]'}`}
          >
            <BookmarkCheck className="w-4 h-4 text-[#fb5607]" />
            <span>المفضلة والتأملات</span>
            {bookmarks.length > 0 && (
              <span className="absolute -top-1 -left-1 bg-[#fb5607] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {bookmarks.length}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab('about')}
            className={`flex flex-col md:flex-row items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'about' ? 'bg-white dark:bg-[#064e40] text-[#064e3b] dark:text-white shadow-sm' : 'text-slate-600 dark:text-gray-300 hover:bg-[#e2decb] dark:hover:bg-[#1f312e]'}`}
          >
            <Info className="w-4 h-4" />
            <span>حول الكتاب</span>
          </button>
        </nav>

        {/* Tab Content Rendering Container */}
        <main className="min-h-[60vh]">
          
          {/* TAB 1: Total Surah's Purposes Index */}
          {activeTab === 'index' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Complex Responsive Filter board */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-[#121f1d] p-4 rounded-xl shadow-sm border border-[#e2ddcf] dark:border-[#1d2d2a]">
                
                {/* Search query field */}
                <div className="md:col-span-2 relative">
                  <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="ابحث برقم السورة، اسمها، أو كلمات من مقصدها..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#FAF8F5] dark:bg-[#0b1311] text-slate-800 dark:text-slate-100 pr-10 pl-4 py-2.5 rounded-lg border border-[#e2ddcf] dark:border-[#1d2d2a] focus:ring-2 focus:ring-[#047857] focus:outline-none text-sm transition-all"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Meccan vs Medinan filter toggle bar */}
                <div className="flex bg-[#FAF8F5] dark:bg-[#0b1311] rounded-lg border border-[#e2ddcf] dark:border-[#1d2d2a] p-1">
                  <button 
                    onClick={() => setClassificationFilter('all')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${classificationFilter === 'all' ? 'bg-[#064e3b] text-white' : 'text-slate-600 dark:text-gray-300 hover:bg-[#e2decb] dark:hover:bg-[#1f312e]'}`}
                  >
                    الكل ({surahsData.length})
                  </button>
                  <button 
                    onClick={() => setClassificationFilter('مكية')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${classificationFilter === 'مكية' ? 'bg-[#b45309] text-white' : 'text-slate-600 dark:text-gray-300 hover:bg-[#e2decb] dark:hover:bg-[#1f312e]'}`}
                  >
                    مكية ({surahsData.filter(s=>s.type==='مكية').length})
                  </button>
                  <button 
                    onClick={() => setClassificationFilter('مدنية')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${classificationFilter === 'مدنية' ? 'bg-[#047857] text-white' : 'text-slate-600 dark:text-gray-300 hover:bg-[#e2decb] dark:hover:bg-[#1f312e]'}`}
                  >
                    مدنية ({surahsData.filter(s=>s.type==='مدنية').length})
                  </button>
                </div>
              </div>

              {/* Filtering summary stats counter */}
              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-gray-400 px-1">
                <span>يُعرض حالياً {filteredSurahs.length} سورة من أصل 114</span>
                {searchTerm && <span>صفّيت السور لـ "{searchTerm}"</span>}
              </div>

              {/* Dense elegant Surahs list grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSurahs.map((surah) => {
                  const isFav = bookmarks.includes(surah.number);
                  const hasNote = !!reflections[surah.number]?.trim();
                  
                  return (
                    <div 
                      key={surah.number}
                      onClick={() => handleOpenSurah(surah)}
                      className="bg-white dark:bg-[#121f1d] p-5 rounded-2xl hover:shadow-md border border-[#e2ddcf] dark:border-[#1d2d2a] cursor-pointer flex flex-col justify-between transition-all group scale-98 active:scale-95 duration-100"
                    >
                      <div>
                        {/* Title bar of specific Surah */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            {/* Decorated Arabic Numeral Badge */}
                            <div className="w-8 h-8 rounded-lg bg-[#064e40]/10 dark:bg-[#064e40]/50 text-[#064e3b] dark:text-[#38bdf8] flex items-center justify-center font-bold text-xs border border-[#064e40]/20">
                              {surah.number}
                            </div>
                            <h3 className="text-lg font-bold font-amiri text-slate-800 dark:text-stone-100 group-hover:text-[#064e3b] dark:group-hover:text-[#38bdf8] transition-colors">
                              سورة {surah.name}
                            </h3>
                          </div>
                          
                          {/* Meccan/Medinan indicators & actions */}
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${surah.type === 'مكية' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                              {surah.type}
                            </span>
                            
                            {/* Favor / Bookmark button */}
                            <button 
                              onClick={(e) => toggleBookmark(surah.number, e)}
                              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#fb5607] transition-all"
                            >
                              <Heart className={`w-4 items-center justify-center h-4 ${isFav ? 'fill-[#fb5607] text-[#fb5607]' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Surah Purpose string with customizable fonts */}
                        <p className={`text-slate-700 dark:text-slate-300 font-amiri leading-relaxed mb-4 ${fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg font-bold' : 'text-base'}`}>
                          {surah.purpose}
                        </p>
                      </div>

                      {/* Footer item containing metadata */}
                      <div className="flex justify-between items-center text-[11px] text-slate-400 dark:text-gray-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span>عدد الآيات: {surah.verses} | ص: {surah.page}</span>
                        <div className="flex items-center gap-1">
                          {hasNote && (
                            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                              <PenSquare className="w-3 h-3" />
                              تأمل محفوظ
                            </span>
                          )}
                          <div className="flex items-center text-slate-400 group-hover:text-[#064e3b] dark:group-hover:text-[#38bdf8] transition-colors font-medium">
                            <span>عرض التفصيل والدراسة</span>
                            <ChevronLeft className="w-3.5 h-3.5 transform group-hover:translate-x-[-2px] transition-transform" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Search empty state handler */}
              {filteredSurahs.length === 0 && (
                <div className="bg-white dark:bg-[#121f1d] py-12 px-4 rounded-2xl border border-[#e2ddcf] dark:border-[#1d2d2a] text-center max-w-md mx-auto">
                  <BookMarked className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="font-bold text-slate-700 dark:text-stone-200">عذراً، لم نجد أي تطابق!</p>
                  <p className="text-xs text-slate-400 mt-1">راجع كتابة اسم السورة أو الرقم، أو جرب تصفية تصنيف آخر.</p>
                  <button 
                    onClick={() => { setSearchTerm(''); setClassificationFilter('all'); }}
                    className="mt-4 text-xs font-bold text-emerald-600 dark:text-[#38bdf8] underline"
                  >
                    إعادة ضبط الفلتر
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Surah Objectives Memorization Game (Quiz) */}
          {activeTab === 'quiz' && currentQuestion && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              
              {/* Score panel widget */}
              <div className="bg-[#064e3b] dark:bg-[#121f1d] text-white p-5 rounded-2xl shadow-md border-2 border-[#e8c07d] flex flex-col sm:flex-row justify-between items-center gap-4">
                
                <div className="text-center sm:text-right">
                  <h3 className="font-bold text-base md:text-lg text-yellow-300 font-amiri">المُحفّظ والمختبِر الرقمي</h3>
                  <p className="text-xs text-emerald-100">درّب نفسك على استيعاب وحفظ مقاصد القرآن بذكاء وتفاعل</p>
                </div>

                {/* Score Indicators */}
                <div className="flex items-center gap-4">
                  <div className="text-center bg-[#043327] dark:bg-[#0b1311] px-4 py-2 rounded-xl">
                    <span className="block text-[10px] text-gray-300 font-bold">النتيجة</span>
                    <span className="text-lg font-bold tracking-wider">{quizScores.correct} / {quizScores.total}</span>
                    <span className="block text-[9px] text-emerald-300">({percentScore}%)</span>
                  </div>

                  {/* Flame Streak indicator */}
                  <div className="text-center bg-orange-600/30 px-4 py-2 rounded-xl flex items-center gap-1 border border-orange-500/20">
                    <Flame className="w-5 h-5 text-orange-400 fill-orange-400 animate-pulse" />
                    <div>
                      <span className="block text-[10px] text-orange-200 font-bold">التتالي</span>
                      <span className="text-base font-bold">{quizScores.streak}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Question Card Display block */}
              <div className="bg-white dark:bg-[#121f1d] p-6 rounded-2xl shadow-sm border border-[#e2ddcf] dark:border-[#1d2d2a] relative">
                
                {/* Timer line countdown */}
                <div className="h-1 bg-gray-100 dark:bg-stone-800 rounded-full w-full overflow-hidden absolute top-0 left-0 right-0">
                  <div 
                    className={`h-full transition-all duration-1000 ${quizTimer > 10 ? 'bg-emerald-600' : 'bg-rose-500 animate-pulse'}`}
                    style={{ width: `${(quizTimer / 35) * 100}%` }}
                  />
                </div>

                <div className="flex justify-between items-center mb-4 mt-1">
                  <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-stone-800 px-2 py-0.5 rounded-md font-bold">
                    {currentQuestion.type === 'surah-to-purpose' ? 'تحديد المقصد' : 'اسم السورة والهدف'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    تبقي {quizTimer} ثانية
                  </span>
                </div>

                {/* Question Text with special layout */}
                <div className="border-r-4 border-emerald-600 dark:border-[#38bdf8] pr-4 py-1 mb-6">
                  {currentQuestion.type === 'surah-to-purpose' ? (
                    <div>
                      <p className="text-xs text-slate-400">أي من المقاصد التالية يمثّل الغاية العظمى لسورة:</p>
                      <h4 className="text-xl md:text-2xl font-bold font-amiri text-[#064e40] dark:text-[#38bdf8] mt-1">سورة {currentQuestion.surah.name}؟</h4>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-slate-400 font-bold">ما اسم السورة التي جاء من غاياتها ومحاورها الأساسية:</p>
                      <blockquote className="text-base md:text-lg font-amiri leading-relaxed font-bold text-slate-800 dark:text-stone-100 mt-2 bg-[#FAF8F5] dark:bg-[#0b1311] p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        "{currentQuestion.surah.purpose}"
                      </blockquote>
                    </div>
                  )}
                </div>

                {/* Multiple Options Listing grid */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === currentQuestion.correctAnswer;
                    
                    let buttonClass = 'border-[#e2ddcf] dark:border-[#1d2d2a] hover:bg-[#FAF8F5] dark:hover:bg-[#152422] text-slate-700 dark:text-slate-300';
                    let icon = <span className="w-5 h-5 border border-slate-300 dark:border-stone-700 rounded-full text-[10px] flex items-center justify-center font-bold text-slate-400">{idx + 1}</span>;
                    
                    if (isAnswerChecked) {
                      if (isCorrect) {
                        buttonClass = 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-medium';
                        icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />;
                      } else if (isSelected) {
                        buttonClass = 'bg-rose-50 dark:bg-rose-900/25 border-rose-500 text-rose-800 dark:text-rose-400 font-medium';
                        icon = <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />;
                      } else {
                        buttonClass = 'opacity-50 border-gray-100 dark:border-stone-800 text-slate-400';
                      }
                    } else if (isSelected) {
                      buttonClass = 'border-emerald-600 dark:border-[#38bdf8] bg-emerald-50/50 dark:bg-[#064e40]/20 font-medium';
                    }

                    return (
                      <button 
                        key={idx}
                        onClick={() => handleQuizAnswer(option)}
                        disabled={isAnswerChecked}
                        className={`w-full text-right p-4 rounded-xl border flex items-center gap-3 transition-all ${buttonClass}`}
                      >
                        {icon}
                        <span className="text-sm font-amiri leading-loose flex-1">{option}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Feedbacks and Next Actions bar */}
                {isAnswerChecked && (
                  <div className="mt-6 pt-5 border-t border-slate-100 dark:border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-4 animate-slide-up">
                    <div className="flex items-center gap-2">
                      {selectedAnswer === currentQuestion.correctAnswer ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-sm">
                          <CheckCircle2 className="w-5 h-5" />
                          إجابة صحيحة، أحسنت وبارك الله فيك!
                        </span>
                      ) : (
                        <span className="text-rose-500 dark:text-rose-400 font-bold flex items-center gap-1 text-sm">
                          <XCircle className="w-5 h-5" />
                          لقد أخطأت الهدف! الصواب هو المظلل بالأخضر.
                        </span>
                      )}
                    </div>
                    
                    <button 
                      onClick={generateNextQuestion}
                      className="bg-[#064e3b] hover:bg-[#043327] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all focus:outline-none flex items-center gap-1.5 shadow-sm"
                    >
                      <span>السؤال التالي</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Reset Quiz results capability wrapper */}
              <div className="text-center text-xs">
                <button 
                  onClick={() => {
                    setQuizScores({ correct: 0, total: 0, streak: 0 });
                    generateNextQuestion();
                  }}
                  className="text-slate-400 hover:text-slate-600 underline flex items-center gap-1.5 mx-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  إعادة تهيئة الإحصائيات وبدء اختبار جديد
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: Bookmarks, reflections & subjective lists */}
          {activeTab === 'bookmarks' && (
            <div className="space-y-6 animate-fade-in">
              
              <div className="max-w-md mx-auto text-center py-4">
                <BookMarked className="w-12 h-12 text-[#fb5607] mx-auto mb-2" />
                <h2 className="text-xl font-bold font-amiri">المحراب الشخصي والتأملات</h2>
                <p className="text-slate-400 text-xs mt-1">تتبع سورك المفضلة واقرأ ما سطرته من خواطر ورؤى إيمانية أثناء التدبر</p>
              </div>

              {bookmarks.length === 0 ? (
                <div className="bg-white dark:bg-[#121f1d] p-10 rounded-2xl border border-[#e2ddcf] dark:border-[#1d2d2a] text-center max-w-md mx-auto">
                  <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-700 dark:text-stone-300">قائمتك فارغة الآن</p>
                  <p className="text-xs text-slate-400 mt-1">عند تصفحك السور في الفهرس الرئيسي، انقر على رمز القلب لإرسالها إلى محرابك الشخصي للتدبر.</p>
                  <button 
                    onClick={() => setActiveTab('index')}
                    className="mt-4 bg-[#064e3b] text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    تصفح الفهرس الآن
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {surahsData.filter(s => bookmarks.includes(s.number)).map((surah) => {
                    const savedNote = reflections[surah.number];
                    return (
                      <div 
                        key={surah.number}
                        onClick={() => handleOpenSurah(surah)}
                        className="bg-white dark:bg-[#121f1d] p-5 rounded-2xl hover:shadow-md border-2 border-[#fb5607]/20 cursor-pointer flex flex-col justify-between transition-all group scale-98 active:scale-95 duration-100"
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-bold font-amiri text-[#064e40] dark:text-[#38bdf8]">
                              سورة {surah.name} ({surah.number})
                            </h3>
                            <button 
                              onClick={(e) => toggleBookmark(surah.number, e)}
                              className="text-[#fb5607] hover:text-gray-400"
                              title="حذف من المفضلة"
                            >
                              <Heart className="w-4 h-4 fill-[#fb5607]" />
                            </button>
                          </div>

                          <p className="text-slate-600 dark:text-slate-300 font-amiri text-sm leading-relaxed line-clamp-3 mb-4">
                            "{surah.purpose}"
                          </p>

                          {savedNote && (
                            <div className="bg-amber-50/50 dark:bg-stone-800/50 p-3 rounded-lg border-r-2 border-[#b45309] mt-2 mb-4">
                              <span className="block text-[10px] text-[#b45309] font-bold">خاطرة تدبرية مكتوبة:</span>
                              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 font-amiri italic">
                                "{savedNote}"
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-slate-400 pt-3 border-t border-slate-100 dark:border-stone-800">
                          <span>ص: {surah.page} | {surah.type}</span>
                          <span className="text-emerald-600 hover:text-emerald-700 font-bold">اضغط لتدبر وتلخيص</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 4: About book and guidelines */}
          {activeTab === 'about' && (
            <div className="max-w-3xl mx-auto bg-white dark:bg-[#121f1d] p-6 rounded-2xl shadow-sm border border-[#e2ddcf] dark:border-[#1d2d2a] space-y-6 animate-fade-in">
              <div className="text-center pb-4 border-b border-light-divider dark:border-stone-800">
                <Bookmark className="w-12 h-12 text-[#b45309] mx-auto mb-2" />
                <h2 className="text-2xl font-bold font-amiri text-[#064e3b] dark:text-stone-100">حول كتاب المختصر في التفسير</h2>
                <p className="text-xs text-slate-400">فهم عميق وتأصيل علمي رصين لمقاصد السور والآيات</p>
              </div>

              <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-amiri text-justify">
                <p>
                  يعتبر كتاب <span className="font-bold text-[#b45309]">"المختصر في التفسير"</span> المخرج من مركز تفسير للدراسات القرآنية، من أهم المؤلفات العصرية الميسرة التي لاقت قبولاً واسعاً بين العلماء وطلبة العلم وعامة المسلمين في مشارق الأرض ومغاربها.
                </p>
                <p>
                  وقد قام الكتاب بصياغة التفسير صياغة منهجية سهلة، مع التركيز على شرح الكلمات الغريبة وتأصيل المحاور. ومن أبدع ما اشتمل عليه الكتاب هو وضع <span className="font-bold text-[#064e40]">"مقصد السورة"</span> لكل واحدة من سور التنزيل الـ 114 في مطلع بيانه لها. ومقصد السورة يمثّل الغاية العليا والمحور الجامع الذي تدور حوله آياتها الكريمة.
                </p>
                <p className="font-bold underline text-[#064e40] dark:text-stone-100">ميزات هذا التطبيق التقدمي (PWA):</p>
                <ul className="list-disc leading-loose pr-6 space-y-1">
                  <li><span className="font-bold">تصفح سريع وبدون اتصال:</span> يحمل التطبيق كافة البيانات داخلياً مما يجعله يعمل فوراً حتى بدون توفر الإنترنت.</li>
                  <li><span className="font-bold">مُحفِّظ رقمي تفاعلي:</span> اختبار ذكي مدمج ليساعدك في حفظ أهداف السور ومسماها وربطهما ذهنياً.</li>
                  <li><span className="font-bold">مفكرة تأملات وحفظ ذاتي:</span> دوّن خواطرك وتأملاتك المرتبطة بمقصد السورة لحفظها في متصفحك بشكل آمن وخاص.</li>
                  <li><span className="font-bold">المعلم الرقمي المتطور بالذكاء الاصطناعي:</span> ميزة مدمجة تتيح لك محاورة سياق السورة ومقصدها واستيضاح الدروس الإيمانية منها بالاعتماد على ذكاء Gemini المتطور من جوجل.</li>
                </ul>
              </div>

              <div className="bg-[#FAF8F5] dark:bg-[#0b1311] p-4 rounded-xl text-xs text-slate-500 flex items-center justify-between border border-[#e2ddcf] dark:border-[#1d2d2a] flex-col sm:flex-row gap-4">
                <div>
                  <p className="font-bold text-[#064e3b] dark:text-stone-300">حقوق الطبع والاستخراج:</p>
                  <p className="mt-1 leading-relaxed">المادة العلمية مستخرجة من كتاب المختصر في التفسير الصادر عن مركز تفسير للدراسات القرآنية. ومرتبة لتسهيل الحفظ الممنهج.</p>
                </div>
                <div className="bg-emerald-800 text-white font-bold px-3 py-1 bg-[#064e3b] rounded-lg shadow-sm whitespace-nowrap">
                  إصدار هجري 1447هـ / 2026م
                </div>
              </div>
            </div>
          )}

        </main>

        {/* Global Footer info bar */}
        <footer className="mt-12 text-center text-xs text-slate-400 dark:text-gray-500 border-t border-slate-200 dark:border-[#1d2d2a] pt-6">
          <p>تطبيق مقاصد سور القرآن الكريم © {new Date().getFullYear()} م - مستخرج بالكامل من كتاب المختصر في التفسير</p>
          <p className="mt-1 text-[10px] text-amber-600 font-bold dark:text-yellow-500">تم التطوير بأسلوب ويب تقدمي PWA ليعمل بسلاسة دون اتصال بالإنترنت</p>
        </footer>

      </div>

      {/* DETAILED OVERLAY DIALOG FOR SELECTED SURAH AND STUDY COMPANION */}
      {selectedSurah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in overflow-y-auto">
          
          <div className="bg-[#FAF8F5] dark:bg-[#0c1412] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border-2 border-[#e8c07d] overflow-hidden flex flex-col animate-scale-up">
            
            {/* Header section of specific overlay sheet */}
            <div className="bg-[#064e3b] dark:bg-[#121f1d] text-white p-5 flex justify-between items-center border-b-2 border-[#e8c07d]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#e8c07d] text-[#064e3b] font-bold text-xs uppercase px-2 py-0.5 rounded-md font-amiri">
                    سورة {selectedSurah.number}
                  </span>
                  <span className="text-[10px] bg-emerald-800 border border-emerald-600 px-2 py-0.5 rounded-full font-bold">
                    {selectedSurah.type}
                  </span>
                </div>
                <h2 className="text-2xl font-bold font-amiri text-[#e8c07d] mt-1">
                  سورة {selectedSurah.name}
                </h2>
              </div>

              {/* Functional Quick sharing & closing icons */}
              <div className="flex items-center gap-2">
                
                {/* Copy purpose button */}
                <button 
                  onClick={(e) => handleCopyText(`سورة ${selectedSurah.name} - مقصدها: ${selectedSurah.purpose}`, selectedSurah.number, e)}
                  className="p-2 rounded-xl bg-emerald-800/50 hover:bg-emerald-800 text-white transition-all relative"
                  title="نسخ مقصد السورة"
                >
                  {copiedSurahNum === selectedSurah.number ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  {copiedSurahNum === selectedSurah.number && (
                    <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                      تم النسخ
                    </span>
                  )}
                </button>

                {/* Bookmark indicator */}
                <button 
                  onClick={() => toggleBookmark(selectedSurah.number)}
                  className={`p-2 rounded-xl bg-emerald-800/50 hover:bg-emerald-800 text-white transition-all`}
                  title="حفظ السورة"
                >
                  <Heart className={`w-5 h-5 ${bookmarks.includes(selectedSurah.number) ? 'fill-[#fb5607] text-[#fb5607]' : ''}`} />
                </button>

                <button 
                  onClick={() => setSelectedSurah(null)}
                  className="p-2 rounded-xl bg-emerald-800/50 hover:bg-[#b91c1c] text-white transition-all"
                  aria-label="إغلاق اللوحة"
                >
                  <X className="w-5 h-5" />
                </button>

              </div>
            </div>

            {/* Split Study Screen content: Right: Book specifications & reflections; Left: Interactive Gemini chatbot */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-[#e2ddcf] dark:divide-[#1d2d2a]">
              
              {/* Box 1: Surah specs and reflection writing */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Stats spec table */}
                <div className="bg-[#f0ede4] dark:bg-[#121f1d] p-4 rounded-xl border border-[#e2ddcf] dark:border-[#1d2d2a]">
                  <h4 className="font-bold text-xs text-slate-400 mb-2 uppercase tracking-wider font-tajawal">تفاصيل ورقم السورة</h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm font-bold font-amiri text-slate-800 dark:text-stone-200">
                    <div className="bg-[#FAF8F5] dark:bg-[#0b1311] p-2 rounded-lg border border-[#e2ddcf]/60 dark:border-[#1d2d2a]">
                      <span className="block text-[10px] text-slate-400 font-tajawal">عدد الآيات</span>
                      <span>{selectedSurah.verses} آيات</span>
                    </div>
                    <div className="bg-[#FAF8F5] dark:bg-[#0b1311] p-2 rounded-lg border border-[#e2ddcf]/60 dark:border-[#1d2d2a]">
                      <span className="block text-[10px] text-slate-400 font-tajawal">موضع الصفحة</span>
                      <span>صفحة {selectedSurah.page}</span>
                    </div>
                    <div className="bg-[#FAF8F5] dark:bg-[#0b1311] p-2 rounded-lg border border-[#e2ddcf]/60 dark:border-[#1d2d2a]">
                      <span className="block text-[10px] text-slate-400 font-tajawal">النوع</span>
                      <span>{selectedSurah.type}</span>
                    </div>
                  </div>
                </div>

                {/* Highly structured displaying of the purpose */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider font-tajawal">مقصد السورة وغايتها كما ورد بالمختصر:</h4>
                  <blockquote className={`text-slate-800 dark:text-stone-100 font-amiri leading-relaxed font-bold border-r-4 border-[#b45309] bg-[#FAF8F5] dark:bg-[#121f1d] p-4 rounded-l-xl ${fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-xl font-bold' : 'text-base'}`}>
                    "{selectedSurah.purpose}"
                  </blockquote>
                </div>

                {/* Reflective input box to save custom findings */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs text-slate-400 font-tajawal">تدوينات وتأملات تدبرية شخصية:</h4>
                    {reflections[selectedSurah.number] !== reflectionInput && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-bold animate-pulse">
                        تعديلات غير محفوظة
                      </span>
                    )}
                  </div>
                  
                  <textarea 
                    value={reflectionInput}
                    onChange={(e) => setReflectionInput(e.target.value)}
                    placeholder="اكتب هنا ما يفيض به تدبرك الشخصي لآيات هذه السورة لتأمل غاياتها ومقاصدها وسياقها العلمي..."
                    className="w-full h-32 bg-[#FAF8F5] dark:bg-[#0b1311] text-slate-800 dark:text-slate-100 p-3 rounded-xl border border-[#e2ddcf] dark:border-[#1d2d2a] focus:ring-2 focus:ring-[#047857] focus:outline-none text-sm font-amiri leading-relaxed"
                  />
                  
                  <button 
                    onClick={handleSaveReflection}
                    className="w-full bg-[#047857] hover:bg-[#065f46] text-white py-2.5 rounded-xl text-xs font-bold font-tajawal shadow-sm transition-all focus:outline-none flex items-center justify-center gap-2"
                  >
                    <PenSquare className="w-4 h-4" />
                    <span>حفظ التأمل في المتصفح</span>
                  </button>
                </div>

              </div>

              {/* Box 2: Companion AI Dialog with Gemini */}
              <div className="p-6 flex flex-col h-[50vh] lg:h-auto overflow-hidden">
                <div className="flex items-center gap-2 text-xs font-bold text-[#064e3b] dark:text-[#38bdf8] mb-3 border-b border-light-divider dark:border-stone-800 pb-2 flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>المعلّم القرآني المساعد (بذكاء Gemini 3.5)</span>
                </div>

                {/* Message list panel */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                  
                  {/* Default greeting */}
                  <div className="bg-emerald-50/70 dark:bg-stone-800/50 p-3.5 rounded-xl border border-emerald-100 dark:border-stone-800 text-xs text-slate-700 dark:text-slate-300 font-amiri leading-relaxed space-y-2">
                    <p className="font-bold text-emerald-800 dark:text-[#38bdf8] font-tajawal flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      مرحباً بك في المحيا التدبري!
                    </p>
                    <p>
                    أنا مرشدك الرقمي حول مضامين السورة. يسعدني الإجابة عما يشغل تفكيرك من وحي مقصد سورة <strong>{selectedSurah.name}</strong> في "المختصر في التفسير".
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <button 
                        onClick={() => sendSuggestedPrompt("كيف أطبق مقصد هذه السورة في حياتي اليومية؟")}
                        className="bg-white dark:bg-[#0b1311] hover:bg-emerald-50 dark:hover:bg-[#152422] text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-stone-800 px-2 py-1 rounded-md transition-all text-right font-tajawal"
                      >
                        كيف أطبق مقصد السورة عملياً؟
                      </button>
                      <button 
                        onClick={() => sendSuggestedPrompt("ما العلاقة بين اسم السورة ومحور مقصدها؟")}
                        className="bg-white dark:bg-[#0b1311] hover:bg-emerald-50 dark:hover:bg-[#152422] text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-stone-800 px-2 py-1 rounded-md transition-all text-right font-tajawal"
                      >
                        ما العلاقة بين اسمها ومقصدها؟
                      </button>
                    </div>
                  </div>

                  {/* Render conversation timeline */}
                  {(chatMessages[selectedSurah.number] || []).map((msg) => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed font-amiri ${
                        msg.sender === 'user' 
                          ? 'bg-[#064e40] text-white rounded-br-none font-bold whitespace-pre-line' 
                          : 'bg-white dark:bg-stone-800 text-slate-800 dark:text-stone-100 border border-slate-100 dark:border-stone-700 rounded-bl-none'
                      }`}>
                        {msg.sender === 'user' ? (
                          msg.text
                        ) : (
                          <>
                            <div className="whitespace-pre-line">{msg.text}</div>
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-stone-700/50 flex justify-between items-center gap-4">
                              <span className="text-[10px] text-slate-400 dark:text-gray-400 font-tajawal">تفسير المعلم الرقمي</span>
                              <button
                                onClick={(e) => handleCopyMessage(msg.text, msg.id, e)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#FAF8F5] dark:bg-[#0b1311] hover:bg-emerald-50 dark:hover:bg-[#152422] border border-slate-200 dark:border-[#1d2d2a] text-[10px] font-bold text-slate-600 dark:text-gray-300 hover:text-[#064e3b] dark:hover:text-[#38bdf8] transition-colors focus:outline-none font-tajawal leading-none cursor-pointer"
                                title="نسخ إجابة المعلم"
                              >
                                {copiedMessageId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-emerald-600 dark:text-emerald-400">تم النسخ</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>نسخ</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Indicator loading state */}
                  {isAiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-stone-800 text-slate-500 p-3 rounded-xl rounded-bl-none border border-light-divider dark:border-stone-700 text-xs flex items-center gap-2">
                        <div className="flex space-x-1 space-x-reverse">
                          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-100"></span>
                          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-200"></span>
                          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-300"></span>
                        </div>
                        <span className="font-tajawal">المعلّم الرقمي يتأمل صياغة تفسير رصين...</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input text message container */}
                <div className="flex gap-2 flex-shrink-0">
                  <input 
                    type="text" 
                    value={currentMessageInput}
                    onChange={(e) => setCurrentMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="اسأل المعلم حول مقاصد ودروس هذه السورة..."
                    className="flex-1 bg-white dark:bg-[#0b1311] text-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs border border-[#e2ddcf] dark:border-[#1d2d2a] focus:ring-2 focus:ring-[#047857] focus:outline-none"
                  />
                  
                  <button 
                    onClick={handleSendChatMessage}
                    disabled={isAiLoading || !currentMessageInput.trim()}
                    className="bg-[#064e3b] dark:bg-[#047857] hover:bg-[#043327] dark:hover:bg-[#065f46] text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 transform rotate-180" />
                  </button>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
