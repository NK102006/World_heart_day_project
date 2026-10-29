import React, { useState, useEffect } from 'react';

export default function PharmaThemeDrawer({ showToast }) {
  const [showCustomizer, setShowCustomizer] = useState(false);

  const [blueDepth, setBlueDepth] = useState(42);
  const [dotsOpacity, setDotsOpacity] = useState(22);
  const [dotSize, setDotSize] = useState(1.4);
  const [watermarkOpacity, setWatermarkOpacity] = useState(55);

  const lerpColor = (hexA, hexB, t) => {
    const a = parseInt(hexA.slice(1), 16);
    const b = parseInt(hexB.slice(1), 16);
    const r1 = (a >> 16) & 255, g1 = (a >> 8) & 255, b1 = a & 255;
    const r2 = (b >> 16) & 255, g2 = (b >> 8) & 255, b2 = b & 255;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const bl = Math.round(b1 + (b2 - b1) * t);
    return '#' + [r, g, bl].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const applyScales = (blueVal, dotsVal, sizeVal, particleVal) => {
    const t = blueVal / 100;
    const stop1 = lerpColor('#F0F7FF', '#C4DDF8', t);
    const stop2 = lerpColor('#E1EFFF', '#AECDF3', t);
    const stop3 = lerpColor('#CCE4FD', '#97BAED', t);

    const primaryDotOpacity = (dotsVal / 100).toFixed(2);
    const secondaryDotOpacity = ((dotsVal * 0.72) / 100).toFixed(2);
    const watermarkOp = (particleVal / 100).toFixed(2);

    const root = document.documentElement;
    root.style.setProperty('--bg-top', stop1);
    root.style.setProperty('--bg-mid', stop2);
    root.style.setProperty('--bg-bot', stop3);
    root.style.setProperty('--dot-opacity', primaryDotOpacity);
    root.style.setProperty('--dot-opacity-secondary', secondaryDotOpacity);
    root.style.setProperty('--dot-size', `${sizeVal}px`);
    root.style.setProperty('--watermark-opacity', watermarkOp);
  };

  const handleSliderChange = (type, val) => {
    let b = blueDepth;
    let d = dotsOpacity;
    let s = dotSize;
    let w = watermarkOpacity;

    if (type === 'blue') {
      b = val;
      setBlueDepth(val);
    } else if (type === 'dots') {
      d = val;
      setDotsOpacity(val);
    } else if (type === 'size') {
      s = val;
      setDotSize(val);
    } else if (type === 'watermark') {
      w = val;
      setWatermarkOpacity(val);
    }

    applyScales(b, d, s, w);
  };

  const applyPreset = (b, d, s, w, label) => {
    setBlueDepth(b);
    setDotsOpacity(d);
    setDotSize(s);
    setWatermarkOpacity(w);
    applyScales(b, d, s, w);
    if (showToast) showToast(`Applied Preset: ${label}`, 'info');
  };

  const copyCssSettings = () => {
    const rootStyles = getComputedStyle(document.documentElement);
    const stop1 = rootStyles.getPropertyValue('--bg-top').trim() || '#DBEBFC';
    const stop2 = rootStyles.getPropertyValue('--bg-mid').trim() || '#C9E0FA';
    const stop3 = rootStyles.getPropertyValue('--bg-bot').trim() || '#B9D6F6';
    const op1 = rootStyles.getPropertyValue('--dot-opacity').trim() || '0.22';
    const op2 = rootStyles.getPropertyValue('--dot-opacity-secondary').trim() || '0.16';
    const size = rootStyles.getPropertyValue('--dot-size').trim() || '1.4px';
    const water = rootStyles.getPropertyValue('--watermark-opacity').trim() || '0.55';

    const cssSnippet = `:root {
  --bg-top: ${stop1};
  --bg-mid: ${stop2};
  --bg-bot: ${stop3};
  --dot-opacity: ${op1};
  --dot-opacity-secondary: ${op2};
  --dot-size: ${size};
  --watermark-opacity: ${water};
}

.bg-medical-grid {
  background-color: var(--bg-bot);
  background-image:
    radial-gradient(rgba(30, 64, 175, var(--dot-opacity)) var(--dot-size), transparent var(--dot-size)),
    radial-gradient(rgba(13, 148, 136, var(--dot-opacity-secondary)) var(--dot-size), transparent var(--dot-size)),
    linear-gradient(135deg, var(--bg-top) 0%, var(--bg-mid) 50%, var(--bg-bot) 100%);
  background-size: 28px 28px, 28px 28px, 100% 100%;
  background-position: 0 0, 14px 14px, 0 0;
  background-attachment: fixed;
}`;

    navigator.clipboard.writeText(cssSnippet);
    if (showToast) showToast('Copied clean :root & background CSS!', 'success');
  };

  useEffect(() => {
    applyScales(blueDepth, dotsOpacity, dotSize, watermarkOpacity);
  }, []);

  return (
    <>
      {/* Theme Settings & Grid Dots Button / Drawer - Hidden per user request */}
      <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
        <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
          {showCustomizer && (
            <div className="w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden mb-2.5 transition-all duration-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 px-4 py-3 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <i className="ph-fill ph-sliders-horizontal text-teal-400 text-base"></i>
                  <div>
                    <h4 className="font-display font-bold text-xs tracking-wide">Theme Settings & Background Dots</h4>
                    <p className="text-[10px] text-slate-300">Live adjustment of grid dots & blue depth</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomizer(false)}
                  className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Minimize"
                >
                  <i className="ph-bold ph-x text-sm"></i>
                </button>
              </div>

              {/* Presets */}
              <div className="px-4 pt-3 pb-2 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(22, 10, 1.0, 35, 'Subtle & Soft')}
                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200/90 transition-all cursor-pointer shadow-2xs"
                >
                  Subtle & Soft
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(42, 22, 1.4, 55, 'Locked Default')}
                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 transition-all cursor-pointer shadow-2xs"
                >
                  Locked Default
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(75, 32, 1.8, 75, 'Deep Pharma')}
                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-white hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 border border-slate-200/90 transition-all cursor-pointer shadow-2xs"
                >
                  Deep Pharma
                </button>
              </div>

              {/* Sliders */}
              <div className="p-4 space-y-3 text-xs">
                {/* Blue Depth */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full border border-slate-300 inline-block bg-sky-200"></span>
                      <span>1. Blue BG Depth</span>
                    </label>
                    <span className="font-mono font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded text-[11px]">
                      {blueDepth}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={blueDepth}
                    onChange={(e) => handleSliderChange('blue', parseFloat(e.target.value))}
                    className="w-full pharma-slider"
                  />
                </div>

                {/* Dots Opacity */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      2. Background Grid Dots Opacity
                    </label>
                    <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[11px]">
                      {(dotsOpacity / 100).toFixed(2)} ({dotsOpacity}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={dotsOpacity}
                    onChange={(e) => handleSliderChange('dots', parseFloat(e.target.value))}
                    className="w-full pharma-slider"
                  />
                </div>

                {/* Dot Size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      3. Dot Size
                    </label>
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                      {dotSize.toFixed(2)}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={dotSize}
                    onChange={(e) => handleSliderChange('size', parseFloat(e.target.value))}
                    className="w-full pharma-slider"
                  />
                </div>

                {/* Watermark / Particles Opacity */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      4. Watermark & Particles
                    </label>
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                      {(watermarkOpacity / 100).toFixed(2)} ({watermarkOpacity}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={watermarkOpacity}
                    onChange={(e) => handleSliderChange('watermark', parseFloat(e.target.value))}
                    className="w-full pharma-slider"
                  />
                </div>

                {/* Live Preview Box */}
                <div className="pt-1">
                  <pre className="bg-slate-900 text-teal-300 font-mono text-[10px] p-2.5 rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
{`:root {
  --bg-top: var(--bg-top);
  --bg-mid: var(--bg-mid);
  --bg-bot: var(--bg-bot);
  --dot-opacity: ${(dotsOpacity / 100).toFixed(2)};
  --dot-size: ${dotSize}px;
  --watermark-opacity: ${(watermarkOpacity / 100).toFixed(2)};
}`}
                  </pre>
                </div>

                {/* Copy button */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-500">Live Matrix Grid</span>
                  <button
                    type="button"
                    onClick={copyCssSettings}
                    className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <i className="ph-bold ph-copy"></i>
                    <span>Copy Clean CSS</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Minimized Floating Pill Button */}
          <button
            type="button"
            onClick={() => setShowCustomizer((prev) => !prev)}
            className="bg-slate-900/90 hover:bg-teal-900 text-white backdrop-blur-md px-4 py-2 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700/80 cursor-pointer transition-all hover:scale-105"
          >
            <i className="ph-bold ph-sliders-horizontal text-teal-400 text-sm"></i>
            <span>Theme Settings / Grid Dots</span>
          </button>
        </div>
      </div>
    </>
  );
}
