import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, Check, X, Move } from 'lucide-react';

/**
 * PhotoAdjusterCanvas (Popup Modal)
 * Provides an interactive modal popup canvas to pan, zoom, rotate and frame
 * a doctor photograph inside the circular poster mask.
 * Default zoom starts at 0%.
 */
export default function PhotoAdjusterCanvas({
  imageSrc,
  initialSettings = { zoomPercent: 0, pan: { x: 0, y: 0 }, rotation: 0 },
  onApply,
  onCancel
}) {
  const canvasRef = useRef(null);
  const [loadedImg, setLoadedImg] = useState(null);
  // Default zoom is 0%
  const [zoomPercent, setZoomPercent] = useState(initialSettings?.zoomPercent ?? 0);
  const [pan, setPan] = useState(initialSettings?.pan || { x: 0, y: 0 });
  const [rotation, setRotation] = useState(initialSettings?.rotation || 0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const CANVAS_SIZE = 260; // Size of displayed interactive canvas
  const CIRCLE_RADIUS = 100; // Radius of circular cropping frame

  // Prevent background scrolling while modal is open & add Escape key listener
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  // Load Image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLoadedImg(img);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Compute effective scale: Base coverage scale * (1 + (zoomPercent / 100) * 2)
  // At zoomPercent = 0 (default), scale is exactly baseScale (0% additional magnification)
  // At zoomPercent = 100, scale is baseScale * 3.0
  const getEffectiveScale = useCallback(() => {
    if (!loadedImg) return 1;
    const minDim = Math.min(loadedImg.width, loadedImg.height);
    const baseScale = (CIRCLE_RADIUS * 2) / minDim;
    return baseScale * (1 + (zoomPercent / 100) * 2);
  }, [loadedImg, zoomPercent]);

  // Render on canvas whenever image, zoomPercent, pan, or rotation changes
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImg) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Internal resolution scaled for retina sharpness
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    ctx.scale(dpr, dpr);

    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    const CX = W / 2;
    const CY = H / 2;
    const scale = getEffectiveScale();

    // Background fill
    ctx.fillStyle = '#0b132b';
    ctx.fillRect(0, 0, W, H);

    // Save context for transformed image rendering
    ctx.save();
    ctx.translate(CX + pan.x, CY + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(loadedImg, -loadedImg.width / 2, -loadedImg.height / 2);
    ctx.restore();

    // Semi-transparent dark overlay outside the circle
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    // Draw counter-clockwise circle to cut out the viewport
    ctx.arc(CX, CY, CIRCLE_RADIUS, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fill();
    ctx.restore();

    // Circular guideline border (vibrant crimson dashed)
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.restore();

    // Subtle center alignment crosshairs
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CX - 12, CY);
    ctx.lineTo(CX + 12, CY);
    ctx.moveTo(CX, CY - 12);
    ctx.lineTo(CX, CY + 12);
    ctx.stroke();
    ctx.restore();
  }, [loadedImg, pan, rotation, getEffectiveScale]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer drag events (Mouse & Touch unified)
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset adjustments to 0% zoom and center pan
  const handleReset = () => {
    setZoomPercent(0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // Export high-resolution cropped square image (600x600)
  const handleApply = () => {
    if (!loadedImg) return;

    const OUTPUT_SIZE = 600;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = OUTPUT_SIZE;
    offCanvas.height = OUTPUT_SIZE;
    const offCtx = offCanvas.getContext('2d');

    const scaleFactor = OUTPUT_SIZE / (CIRCLE_RADIUS * 2);
    const finalScale = getEffectiveScale() * scaleFactor;

    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    offCtx.save();
    offCtx.translate(
      OUTPUT_SIZE / 2 + pan.x * scaleFactor,
      OUTPUT_SIZE / 2 + pan.y * scaleFactor
    );
    offCtx.rotate((rotation * Math.PI) / 180);
    offCtx.scale(finalScale, finalScale);
    offCtx.drawImage(loadedImg, -loadedImg.width / 2, -loadedImg.height / 2);
    offCtx.restore();

    offCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const adjustedFile = new File([blob], 'doctor_adjusted.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        const dataUrl = offCanvas.toDataURL('image/jpeg', 0.95);
        onApply({
          dataUrl,
          file: adjustedFile,
          settings: { zoomPercent, pan, rotation }
        });
      },
      'image/jpeg',
      0.95
    );
  };

  return createPortal(
    <div className="photo-adjuster-modal-backdrop" onClick={onCancel}>
      <div
        className="photo-adjuster-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Adjust Doctor Photograph"
      >
        {/* Modal Top Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h3>Adjust Doctor Photograph</h3>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onCancel}
            title="Close popup (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Instructions */}
        <p className="modal-instructions">
          <Move size={13} /> Click &amp; drag photo to center face inside circle
        </p>

        {/* Interactive Canvas Viewport */}
        <div
          className="adjuster-canvas-container"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Click and drag to position the doctor photo"
        >
          <canvas
            ref={canvasRef}
            style={{
              width: `${CANVAS_SIZE}px`,
              height: `${CANVAS_SIZE}px`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          />
        </div>

        {/* Controls Bar */}
        <div className="adjuster-controls">
          {/* Zoom Controls starting at 0% default */}
          <div className="adjuster-slider-group">
            <span className="slider-label">Zoom</span>
            <button
              type="button"
              className="btn-icon-control"
              onClick={() => setZoomPercent((prev) => Math.max(0, prev - 5))}
              title="Zoom out"
              disabled={zoomPercent <= 0}
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={zoomPercent}
              onChange={(e) => setZoomPercent(Number(e.target.value))}
              className="adjuster-range-slider"
            />
            <button
              type="button"
              className="btn-icon-control"
              onClick={() => setZoomPercent((prev) => Math.min(100, prev + 5))}
              title="Zoom in"
              disabled={zoomPercent >= 100}
            >
              <ZoomIn size={16} />
            </button>
            <span className="zoom-percentage-text">{zoomPercent}%</span>
          </div>

          {/* Action Tool Buttons */}
          <div className="adjuster-tools-row">
            <button
              type="button"
              className="btn-tool-chip"
              onClick={handleRotate}
              title="Rotate 90 degrees clockwise"
            >
              <RotateCw size={14} /> Rotate 90°
            </button>
            <button
              type="button"
              className="btn-tool-chip secondary"
              onClick={handleReset}
              title="Reset position and set zoom to 0%"
            >
              <RotateCcw size={14} /> Reset to 0%
            </button>
          </div>
        </div>

        {/* Bottom Confirmation Buttons */}
        <div className="adjuster-actions-footer">
          <button
            type="button"
            className="btn-secondary btn-cancel-adjust"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary btn-apply-adjust"
            onClick={handleApply}
          >
            <Check size={16} /> Apply &amp; Save Photo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
