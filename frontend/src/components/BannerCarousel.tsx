import React, { useState, useEffect } from 'react';
import { Banner } from '../types/index.js';
import { useApp } from '../context/AppContext.js';
import { ChevronRight, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../services/telegram.js';

interface BannerCarouselProps {
  banners: Banner[];
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({ banners }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { setActiveTab } = useApp();

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  const handleBannerClick = (actionUrl?: string) => {
    triggerHaptic('medium');
    if (actionUrl === '#contest') {
      setActiveTab('contest');
    } else if (actionUrl === '#library') {
      setActiveTab('library');
    } else if (actionUrl === '#cup') {
      setActiveTab('cup');
    } else if (actionUrl === '#market') {
      setActiveTab('market');
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-xl border border-cardBorder group">
      {/* Background Image with Gradient Overlay */}
      <div
        className="w-full h-44 bg-cover bg-center transition-all duration-700 transform group-hover:scale-105"
        style={{ backgroundImage: `url(${currentBanner.image_url})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1115] via-[#0F1115]/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        {/* Top Tag */}
        <div className="flex items-center justify-between">
          {currentBanner.badge && (
            <span className="px-2.5 py-1 rounded-full bg-brand-500/90 text-white font-bold text-[11px] backdrop-blur-sm shadow-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {currentBanner.badge}
            </span>
          )}
          <span className="text-[11px] font-semibold text-gray-300 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
            {currentIndex + 1} / {banners.length}
          </span>
        </div>

        {/* Bottom Title & Action */}
        <div>
          <h3 className="font-extrabold text-lg text-white leading-tight drop-shadow-md">
            {currentBanner.title}
          </h3>
          {currentBanner.subtitle && (
            <p className="text-xs text-gray-200 mt-1 line-clamp-1 drop-shadow">
              {currentBanner.subtitle}
            </p>
          )}

          <button
            onClick={() => handleBannerClick(currentBanner.action_url)}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/90 hover:bg-white text-gray-950 font-bold text-xs shadow-lg transition-all active:scale-95"
          >
            <span>Qatnashish</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-2 right-4 flex items-center gap-1.5">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all ${
              idx === currentIndex ? 'w-5 bg-brand-500' : 'w-1.5 bg-gray-500/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
