import React from 'react';
import { ALL_HABITS } from '../constants/habits';

export function getPosterPromisesList(doc, selectedHabitIds, fallbackList) {
  const habitsSource = (fallbackList && fallbackList.length > 0) ? fallbackList : ALL_HABITS;
  const targetCount = 10;

  // 1. If selectedHabitIds are provided (e.g. active selection during wizard step)
  if (selectedHabitIds && selectedHabitIds.length > 0) {
    const list = selectedHabitIds
      .map((id) =>
        habitsSource.find((h) => h.id === id || h.id == id || h._id === id) ||
        ALL_HABITS.find((h) => h.id === id || h.id == id)
      )
      .filter(Boolean);
    if (list.length > 0) return list.slice(0, targetCount);
  }

  // 2. If doctor object has selectedPromises saved in database
  if (doc && doc.selectedPromises && doc.selectedPromises.length > 0) {
    const list = doc.selectedPromises.map((p, idx) => {
      const pTitle = typeof p === 'string' ? p.trim() : (p?.title || '').trim();
      const matched = habitsSource.find((h) =>
        (h.title && h.title.trim() === pTitle) ||
        (h.title && h.title.trim().toLowerCase() === pTitle.toLowerCase()) ||
        h.id === p ||
        h.id == p ||
        h.id === pTitle ||
        h._id === p
      ) || ALL_HABITS.find((h) =>
        (h.title && h.title.trim() === pTitle) ||
        (h.title && h.title.trim().toLowerCase() === pTitle.toLowerCase()) ||
        h.id === p ||
        h.id == p
      );
      if (matched) return matched;
      return {
        id: idx + 1,
        title: pTitle,
        desc: typeof p === 'object' && p?.desc ? p.desc : '',
        icon: typeof p === 'object' && p?.icon ? p.icon : '❤️'
      };
    }).filter(Boolean);
    if (list.length > 0) return list.slice(0, targetCount);
  }

  // 3. Fallback to default first 10 habits
  return habitsSource.slice(0, targetCount);
}

export default function PosterPromisesOverlay({ doc, selectedHabitIds, fallbackList }) {
  const promises = getPosterPromisesList(doc, selectedHabitIds, fallbackList);

  return (
    <div className="poster-coord-promises-container">
      {promises.map((promise, index) => {
        const iconOrImg = promise.image || promise.icon || '❤️';
        const isImg = typeof iconOrImg === 'string' && (
          iconOrImg.startsWith('http://') ||
          iconOrImg.startsWith('https://') ||
          iconOrImg.startsWith('/') ||
          iconOrImg.startsWith('data:') ||
          iconOrImg.endsWith('.png') ||
          iconOrImg.endsWith('.jpg') ||
          iconOrImg.endsWith('.svg')
        );

        return (
          <div
            key={promise.id || index}
            className={`poster-coord-slot slot-col-${index % 2 === 0 ? 'left' : 'right'} slot-row-${Math.floor(index / 2)} slot-promise-${index + 1}`}
          >
            <div className="poster-slot-inner">
              <div className="poster-slot-icon-box">
                {isImg ? (
                  <img src={iconOrImg} alt="" className="poster-slot-icon-img" crossOrigin="anonymous" />
                ) : (
                  <span className="poster-slot-icon">{iconOrImg}</span>
                )}
              </div>
              <div className="poster-slot-divider" />
              <div className="poster-slot-content">
                <div className="poster-slot-title">{promise.title}</div>
                {promise.desc && <div className="poster-slot-desc">{promise.desc}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
