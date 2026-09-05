import React, { useState, useEffect, useRef } from 'react';
import { Book } from '../../types/index.js';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import {
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Clock,
  Volume2,
  VolumeX,
  Lock,
  Sparkles,
  Headphones,
  CheckCircle2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Type,
  FileText,
  RotateCcw,
  Sun,
  Moon,
  Compass,
  ArrowDown,
} from 'lucide-react';
import { triggerHaptic } from '../../services/telegram.js';
import { playAmbientSound, stopAmbientSound, SoundType } from '../../utils/audio.js';
import confetti from 'canvas-confetti';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface InAppReaderProps {
  book: Book;
  onClose: () => void;
}

type ReaderTheme = 'ivory' | 'white' | 'dark' | 'mint';

export const InAppReader: React.FC<InAppReaderProps> = ({ book, onClose }) => {
  const { coinBalance, updateCoinBalance, refreshUserData, showToast, setActiveTab } = useApp();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(book.pages_count || 100);
  const [isUnlocked, setIsUnlocked] = useState(book.is_unlocked === 1);
  const [unlocking, setUnlocking] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  // PDF.js State
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [zoomMultiplier, setZoomMultiplier] = useState(1.0);
  const [pageText, setPageText] = useState('');
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Timer state
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Themes: 'ivory' (Klassik qog'oz) | 'white' (Yorqin) | 'dark' (Tungi) | 'mint' (Zangori)
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('ivory');
  const [readerMode, setReaderMode] = useState<'pdf' | 'text'>('pdf');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');

  // Ambient Sound
  const [ambientSound, setAmbientSound] = useState<SoundType>('off');
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  // TTS Speech
  const [isSpeaking, setIsSpeaking] = useState(false);

  const previewLimit = book.preview_pages || 50;
  const unlockCost = book.unlock_price_coins || 150;

  // 1. Load PDF Document
  useEffect(() => {
    let isMounted = true;
    if (book.pdf_url) {
      setPdfLoading(true);
      setPdfError(false);

      const loadingTask = pdfjsLib.getDocument({
        url: book.pdf_url,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
      });

      loadingTask.promise
        .then((pdf) => {
          if (!isMounted) return;
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setPdfLoading(false);
        })
        .catch((err) => {
          console.warn('PDF.js loading failed:', err);
          if (!isMounted) return;
          setPdfError(true);
          setPdfLoading(false);
          setReaderMode('text');
        });
    } else {
      setReaderMode('text');
      setPdfLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [book.pdf_url]);

  // 2. Render Page to Canvas with 100% Perfect Vertical & Horizontal Auto-Fit
  useEffect(() => {
    let renderTask: any = null;

    if (pdfDoc && readerMode === 'pdf' && canvasRef.current) {
      setPdfLoading(true);

      pdfDoc
        .getPage(currentPage)
        .then(async (page: any) => {
          // Extract text for TTS
          try {
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map((item: any) => item.str).join(' ');
            setPageText(textItems);
          } catch (_) {
            setPageText('');
          }

          const canvas = canvasRef.current;
          if (!canvas) return;
          const context = canvas.getContext('2d');
          if (!context) return;

          // 1. Get natural dimensions of the PDF page
          const unscaledViewport = page.getViewport({ scale: 1.0 });

          // 2. Determine container available width (fit width without overflow)
          const availableWidth = containerRef.current
            ? Math.max(300, containerRef.current.clientWidth - 24)
            : Math.max(300, window.innerWidth - 32);

          // 3. Optimal scale so the page fits the full vertical screen neatly
          const autoFitScale = (availableWidth / unscaledViewport.width) * zoomMultiplier;
          const viewport = page.getViewport({ scale: autoFitScale });

          // 4. Supersampling (2x or Retina pixelRatio) for crystal-clear Uzbek font rendering
          const pixelRatio = Math.max(window.devicePixelRatio || 1, 2);

          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };

          renderTask = page.render(renderContext);
          return renderTask.promise;
        })
        .then(() => {
          setPdfLoading(false);
          // Scroll smoothly to top of page on change
          if (containerRef.current) {
            containerRef.current.scrollTop = 0;
          }
        })
        .catch((err: any) => {
          if (err?.name !== 'RenderingCancelledException') {
            console.warn('Page render error:', err);
          }
          setPdfLoading(false);
        });
    }

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoomMultiplier, readerMode]);

  // Window resize handler for dynamic recalculation
  useEffect(() => {
    const handleResize = () => {
      // Trigger re-render by setting current zoom state
      setZoomMultiplier((prev) => prev);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track session timer
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSecondsSpent((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Clean up ambient audio and TTS on exit
  useEffect(() => {
    return () => {
      stopAmbientSound();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleClose = async () => {
    try {
      if (secondsSpent >= 5) {
        await api.recordReadingSession(book.id, currentPage, secondsSpent);
        refreshUserData();
      }
    } catch (_) {}
    stopAmbientSound();
    onClose();
  };

  const handleSoundChange = (type: SoundType) => {
    setAmbientSound(type);
    playAmbientSound(type, 0.3);
    triggerHaptic('light');
  };

  // Turn page with paywall verification
  const handleNextPage = () => {
    if (currentPage >= totalPages) return;

    if (!isUnlocked && currentPage >= previewLimit) {
      triggerHaptic('warning');
      setShowPaywallModal(true);
      return;
    }

    triggerHaptic('light');
    setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage <= 1) return;
    triggerHaptic('light');
    setCurrentPage((prev) => prev - 1);
  };

  // Unlock book via Coins
  const handleUnlockBook = async () => {
    if (coinBalance < unlockCost) {
      showToast(`Coin yetarli emas! Sizda: ${coinBalance} Coin (Kerak: ${unlockCost} Coin)`, 'warning');
      return;
    }

    try {
      setUnlocking(true);
      triggerHaptic('medium');
      const res = await api.unlockBook(book.id);
      setIsUnlocked(true);
      updateCoinBalance(res.newBalance);
      setShowPaywallModal(false);
      triggerHaptic('success');
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });
      showToast(res.message, 'success');
      refreshUserData();
      setCurrentPage((prev) => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Xaridda xatolik yuz berdi', 'error');
    } finally {
      setUnlocking(false);
    }
  };

  // Text to Speech
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      showToast('Brauzeringiz ovozda o‘qishni qo‘llab-quvvatlamaydi', 'warning');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToRead = pageText || book.sample_content || book.description || book.title;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Theme styling rules
  const themeClasses = {
    ivory: {
      bg: 'bg-[#F9F6F0]',
      text: 'text-[#2D241E]',
      header: 'bg-[#F9F6F0]/95 border-[#E6DEC8]',
      card: 'bg-[#FFFDF9] border-[#E8DFC8] shadow-md',
      canvasWrapper: 'bg-[#FFFDF9] border-[#E5DAC4]',
      footer: 'bg-[#F9F6F0]/95 border-[#E6DEC8]',
    },
    white: {
      bg: 'bg-[#F8FAFC]',
      text: 'text-[#0F172A]',
      header: 'bg-white/95 border-slate-200',
      card: 'bg-white border-slate-200 shadow-md',
      canvasWrapper: 'bg-white border-slate-200',
      footer: 'bg-white/95 border-slate-200',
    },
    dark: {
      bg: 'bg-[#0B0F19]',
      text: 'text-slate-100',
      header: 'bg-[#0B0F19]/95 border-slate-800 text-white',
      card: 'bg-[#131B2E] border-slate-800 text-slate-100 shadow-md',
      canvasWrapper: 'bg-[#1E293B] border-slate-800 filter invert hue-rotate-180 brightness-95',
      footer: 'bg-[#0B0F19]/95 border-slate-800 text-white',
    },
    mint: {
      bg: 'bg-[#F0FDF4]',
      text: 'text-[#064E3B]',
      header: 'bg-[#F0FDF4]/95 border-emerald-200',
      card: 'bg-[#F7FEFA] border-emerald-200 shadow-md',
      canvasWrapper: 'bg-[#F7FEFA] border-emerald-200',
      footer: 'bg-[#F0FDF4]/95 border-emerald-200',
    },
  };

  const currentTheme = themeClasses[readerTheme];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col font-sans select-none animate-fade-in ${currentTheme.bg} ${currentTheme.text}`}
    >
      {/* 1. Top Navigation Bar with Stopwatch & Controls */}
      <header
        className={`px-3.5 py-2.5 border-b flex items-center justify-between backdrop-blur-md sticky top-0 z-30 transition-colors ${currentTheme.header} shadow-xs`}
      >
        <button
          onClick={handleClose}
          className="p-2 rounded-2xl hover:bg-black/5 active:scale-95 transition-all text-slate-600 dark:text-slate-300"
          title="Chiqish"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live Stopwatch Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-xs shadow-xs">
          <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span className="font-mono">{formatTimer(secondsSpent)}</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {/* Zoom controls if in PDF mode */}
          {readerMode === 'pdf' && (
            <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-xl p-0.5 mr-1">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setZoomMultiplier((s) => Math.max(0.8, Number((s - 0.15).toFixed(2))));
                }}
                className="p-1.5 hover:text-blue-600 active:scale-90 transition-transform"
                title="Kichraytirish"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setZoomMultiplier(1.0);
                }}
                className="px-1 text-[10px] font-black font-mono hover:text-blue-600"
                title="100% Moslash"
              >
                {Math.round(zoomMultiplier * 100)}%
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setZoomMultiplier((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))));
                }}
                className="p-1.5 hover:text-blue-600 active:scale-90 transition-transform"
                title="Kattalashtirish"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Ambient Sound Trigger */}
          <button
            onClick={() => setShowAudioMenu(!showAudioMenu)}
            className={`p-2 rounded-2xl transition-colors ${
              ambientSound !== 'off'
                ? 'bg-blue-600 text-white'
                : 'hover:bg-black/5 text-slate-600 dark:text-slate-300'
            }`}
            title="Fon ovozi"
          >
            {ambientSound !== 'off' ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* TTS Audio Reader */}
          <button
            onClick={toggleSpeech}
            className={`p-2 rounded-2xl transition-colors ${
              isSpeaking
                ? 'bg-emerald-600 text-white animate-pulse'
                : 'hover:bg-black/5 text-slate-600 dark:text-slate-300'
            }`}
            title="Ovozda eshitish"
          >
            <Headphones className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Ambient Sound Drawer */}
      {showAudioMenu && (
        <div className="bg-white border-b border-blue-100 p-2.5 shadow-lg flex items-center justify-around text-xs animate-scale-up text-slate-700">
          <button
            onClick={() => handleSoundChange('off')}
            className={`px-3 py-1.5 rounded-xl font-bold ${
              ambientSound === 'off' ? 'bg-blue-600 text-white' : 'bg-slate-100'
            }`}
          >
            O‘chirilgan
          </button>
          <button
            onClick={() => handleSoundChange('rain')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 ${
              ambientSound === 'rain' ? 'bg-blue-600 text-white' : 'bg-slate-100'
            }`}
          >
            🌧️ Yomg‘ir
          </button>
          <button
            onClick={() => handleSoundChange('waves')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 ${
              ambientSound === 'waves' ? 'bg-blue-600 text-white' : 'bg-slate-100'
            }`}
          >
            🌊 To‘lqin
          </button>
          <button
            onClick={() => handleSoundChange('forest')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 ${
              ambientSound === 'forest' ? 'bg-blue-600 text-white' : 'bg-slate-100'
            }`}
          >
            🌲 O‘rmon
          </button>
        </div>
      )}

      {/* 2. Main Reading Content Container (Full Vertical Fit) */}
      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 w-full max-w-2xl mx-auto flex flex-col items-center space-y-3"
      >
        {/* Book Info & Page Counter Pill */}
        <div className="text-center w-full pb-1">
          <h2 className="text-sm font-black truncate max-w-sm mx-auto tracking-tight">{book.title}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
              Sahifa {currentPage} / {totalPages}
            </span>
            {!isUnlocked && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> {previewLimit} bet bepul
              </span>
            )}
          </div>
        </div>

        {/* PDF Canvas Frame */}
        {readerMode === 'pdf' ? (
          <div className="relative w-full flex flex-col items-center justify-center min-h-[420px]">
            {pdfLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs rounded-2xl">
                <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs font-bold text-slate-700">Sahifa yuklanmoqda...</span>
              </div>
            )}

            {/* Canvas with ultra-sharp scaling and smooth shadow */}
            <div
              className={`rounded-2xl shadow-xl overflow-hidden border transition-all flex justify-center items-center w-full max-w-full ${currentTheme.canvasWrapper}`}
            >
              <canvas
                ref={canvasRef}
                className="block mx-auto max-w-full h-auto object-contain transition-transform duration-200"
              />
            </div>
          </div>
        ) : (
          /* Text View Fallback */
          <article
            className={`w-full leading-relaxed tracking-normal select-text space-y-4 p-5 rounded-3xl ${currentTheme.card} ${
              fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'
            }`}
          >
            <p className="whitespace-pre-line leading-relaxed font-serif">
              {book.sample_content ||
                `${book.title} kitobining ${currentPage}-sahifasi. Mutolaa inson tafakkurini kengaytiruvchi eng buyuk vositadir.`}
            </p>
          </article>
        )}

        {/* Paywall Banner at Page 10 */}
        {!isUnlocked && currentPage === previewLimit && (
          <div className="w-full p-4 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white shadow-xl space-y-3 mt-3 text-center animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-white/20 mx-auto flex items-center justify-center text-xl backdrop-blur-md">
              🔒
            </div>
            <div>
              <h4 className="font-black text-sm">Dastlabki 10 ta bepul sahifa o‘qildi</h4>
              <p className="text-xs text-blue-100 mt-1">
                Kitobni {totalPages} betgacha oxirigacha o‘qish uchun <b>{unlockCost} Coin</b> evaziga oching.
              </p>
            </div>
            <button
              onClick={handleUnlockBook}
              disabled={unlocking}
              className="w-full py-3.5 rounded-2xl bg-white hover:bg-blue-50 text-blue-800 font-extrabold text-xs shadow-md active:scale-95 transition-all"
            >
              {unlocking ? 'Ochilmoqda...' : `🔓 Kitobni to‘liq ochish (${unlockCost} Coin)`}
            </button>
          </div>
        )}
      </main>

      {/* 3. Bottom Controls & 4-Theme Color Swatches */}
      <footer
        className={`px-3.5 py-2.5 border-t flex items-center justify-between backdrop-blur-md sticky bottom-0 z-30 transition-colors ${currentTheme.footer} shadow-lg`}
      >
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-black/5 hover:bg-black/10 disabled:opacity-40 text-xs font-bold transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Oldingi</span>
        </button>

        {/* 4 Beautiful Theme Swatches */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-black/5">
          {/* Ivory Classic Paper */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setReaderTheme('ivory');
            }}
            className={`w-6 h-6 rounded-full border-2 bg-[#FAF8F5] transition-transform ${
              readerTheme === 'ivory' ? 'scale-110 border-blue-600 ring-2 ring-blue-400' : 'border-[#D9CDB8]'
            }`}
            title="Qog‘oz (Ivory)"
          />

          {/* Crisp Pure White */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setReaderTheme('white');
            }}
            className={`w-6 h-6 rounded-full border-2 bg-white transition-transform ${
              readerTheme === 'white' ? 'scale-110 border-blue-600 ring-2 ring-blue-400' : 'border-slate-300'
            }`}
            title="Oq (Light)"
          />

          {/* Mint Fresh */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setReaderTheme('mint');
            }}
            className={`w-6 h-6 rounded-full border-2 bg-[#E6F9EE] transition-transform ${
              readerTheme === 'mint' ? 'scale-110 border-emerald-600 ring-2 ring-emerald-400' : 'border-emerald-300'
            }`}
            title="Zangori (Mint)"
          />

          {/* Dark OLED */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setReaderTheme('dark');
            }}
            className={`w-6 h-6 rounded-full border-2 bg-[#0B0F19] transition-transform ${
              readerTheme === 'dark' ? 'scale-110 border-blue-500 ring-2 ring-blue-400' : 'border-slate-600'
            }`}
            title="Tun (Dark)"
          />
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-500/25 active:scale-95 transition-all"
        >
          <span>Keyingi</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

      {/* 4. Paywall Modal */}
      {showPaywallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl border border-blue-100 shadow-2xl p-6 space-y-4 animate-scale-up text-center text-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 mx-auto flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/20">
              🔒
            </div>

            <div>
              <h3 className="font-extrabold text-base">To‘liq Kitobni Ochish</h3>
              <p className="text-xs text-slate-500 mt-1">
                Dastlabki <b>{previewLimit} ta bepul sahifa</b> o‘qildi. Kitobni {totalPages} betgacha to‘liq mutolaa qilish uchun:
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">Narxi:</span>
              <span className="font-extrabold text-blue-700 text-sm">🪙 {unlockCost} Coin</span>
            </div>

            <div className="text-[11px] text-slate-500">
              Sizning balansingiz: <b>{coinBalance.toLocaleString()} Coin</b>
            </div>

            {coinBalance >= unlockCost ? (
              <button
                onClick={handleUnlockBook}
                disabled={unlocking}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{unlocking ? 'Ochilmoqda...' : `Ochish va Davom etish (-${unlockCost} Coin)`}</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    handleClose();
                    setActiveTab('cup');
                  }}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all"
                >
                  🏆 Test topshirib Coin ishlash
                </button>
              </div>
            )}

            <button
              onClick={() => setShowPaywallModal(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 pt-1"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
