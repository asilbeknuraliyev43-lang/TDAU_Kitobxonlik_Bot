import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { X, Award, Download, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../../services/telegram.js';
import confetti from 'canvas-confetti';

interface CertificateGeneratorModalProps {
  onClose: () => void;
}

export const CertificateGeneratorModal: React.FC<CertificateGeneratorModalProps> = ({
  onClose,
}) => {
  const { user, coinBalance, updateCoinBalance, refreshUserData, showToast } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [studentName, setStudentName] = useState(user?.full_name || 'Avazbek Komiljonovich');
  const [achievement, setAchievement] = useState('Kitobxonlik va Intellektual viktorinalar faoli');
  const [certGenerated, setCertGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateCertificateCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1200;
    canvas.height = 840;

    // Background Gradient (Luxurious Royal & Sky Blue / Gold frame)
    const bgGradient = ctx.createLinearGradient(0, 0, 1200, 840);
    bgGradient.addColorStop(0, '#FFFFFF');
    bgGradient.addColorStop(0.5, '#F0F7FF');
    bgGradient.addColorStop(1, '#E0EFFF');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1200, 840);

    // Elegant Outer Border
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#0284C7';
    ctx.strokeRect(30, 30, 1140, 780);

    // Inner Gold Line
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#EAB308';
    ctx.strokeRect(45, 45, 1110, 750);

    // Header Title
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KITOBXON LOYIHASI', 600, 130);

    ctx.fillStyle = '#0284C7';
    ctx.font = 'bold 50px serif';
    ctx.fillText('SERTIFIKAT', 600, 205);

    ctx.fillStyle = '#64748B';
    ctx.font = 'italic 22px sans-serif';
    ctx.fillText('Ushbu rasmiy sertifikat taqdim etiladi:', 600, 270);

    // Student Name
    ctx.fillStyle = '#0369A1';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(studentName.toUpperCase(), 600, 350);

    // Underline
    ctx.beginPath();
    ctx.moveTo(350, 375);
    ctx.lineTo(850, 375);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#EAB308';
    ctx.stroke();

    // Achievement text
    ctx.fillStyle = '#334155';
    ctx.font = '22px sans-serif';
    ctx.fillText(achievement, 600, 440);
    ctx.fillText('Kitob mutolaasi, testlar va tanlovlarda faol ishtiroki uchun tasdiqlanadi.', 600, 480);

    // Bottom Badges & Signatures
    const dateStr = new Date().toLocaleDateString('uz-UZ');
    ctx.fillStyle = '#64748B';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Berilgan sana: ${dateStr}`, 100, 720);
    ctx.fillText('ID: KBX-' + Math.random().toString(36).substring(2, 8).toUpperCase(), 100, 750);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Loyixa Rahbariyati', 1100, 720);
    ctx.font = 'italic 18px sans-serif';
    ctx.fillStyle = '#0284C7';
    ctx.fillText('Kitobxon Community', 1100, 750);

    setCertGenerated(true);
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setGenerating(true);
      triggerHaptic('medium');
      await api.generateCertificate('Rasmiy Kitobxonlik Sertifikati', achievement);

      const link = document.createElement('a');
      link.download = `Sertifikat_${studentName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      triggerHaptic('success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      showToast('Sertifikat muvaffaqiyatli saqlandi!', 'success');
      refreshUserData();
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in text-slate-800">
      <div className="bg-white w-full max-w-md rounded-3xl border border-blue-100 shadow-2xl p-5 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Sertifikat Generatori</h3>
              <p className="text-[10px] text-slate-400">Rasmiy tasdiqlangan QR-kodli sertifikat</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Sertifikatdagi Ism Familiya
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Yutuq matni
            </label>
            <input
              type="text"
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
            />
          </div>

          <button
            onClick={generateCertificateCanvas}
            className="w-full py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sertifikatni Ko‘rish</span>
          </button>
        </div>

        {/* Canvas Display */}
        <div className="relative aspect-[1200/840] w-full rounded-2xl overflow-hidden shadow-md border border-blue-200 bg-slate-100 flex items-center justify-center">
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
          {!certGenerated && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-slate-400 p-4 text-center">
              <Award className="w-8 h-8 text-slate-300 mb-1" />
              <span>Sertifikatni yaratish uchun yuqoridagi tugmani bosing</span>
            </div>
          )}
        </div>

        {certGenerated && (
          <button
            onClick={handleDownload}
            disabled={generating}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{generating ? 'Yuklanmoqda...' : 'Sertifikatni Yuklab Olish (PNG)'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
