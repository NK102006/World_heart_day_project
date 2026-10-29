import React, { useState, useEffect } from 'react';
import PharmaAtmosphere from './PharmaAtmosphere';

const INITIAL_PROMISES = [
  { id: 1, title: 'Take Medicines on Time', desc: 'I will never skip my daily heart, BP, or diabetes medications.', icon: 'ph-pill', iconBg: 'bg-teal-50 text-teal-600 border-teal-200' },
  { id: 2, title: 'Cut Down on Salt', desc: 'I promise to reduce salty snacks and extra salt in my meals.', icon: 'ph-grains-slash', iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
  { id: 3, title: 'Cut Sugary Drinks', desc: 'I promise to reduce soft drinks, packaged sweet drinks, and extra sugar in tea or coffee.', icon: 'ph-cup-soda', iconBg: 'bg-blue-50 text-blue-600 border-blue-200' },
  { id: 4, title: 'Avoid Trans Fats', desc: 'I will limit processed foods and choose healthy cooking oils.', icon: 'ph-avocado', iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { id: 5, title: 'Never Ignore Symptoms', desc: 'I will seek medical help immediately for chest pain or breathlessness.', icon: 'ph-siren', iconBg: 'bg-amber-50 text-amber-600 border-amber-200' },
  { id: 6, title: 'Digital Detox Before Bed', desc: 'I will put away screens at night for deeper, heart-healing rest.', icon: 'ph-moon-stars', iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  { id: 7, title: '30 Mins Daily Brisk Walk', desc: 'I commit to regular cardiovascular exercise at least 5 days a week.', icon: 'ph-sneaker-move', iconBg: 'bg-teal-50 text-teal-600 border-teal-200' },
  { id: 8, title: 'Quit Tobacco & Smoking', desc: 'I pledge to stay away from active and passive smoking for arterial health.', icon: 'ph-prohibit', iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
  { id: 9, title: 'Monitor BP & Lipids Regularly', desc: 'I will check my blood pressure, cholesterol, and blood sugar periodically.', icon: 'ph-activity', iconBg: 'bg-blue-50 text-blue-600 border-blue-200' },
  { id: 10, title: 'Practice Daily Stress Relief', desc: 'I will use mindfulness and breathing exercises to keep cortisol levels low.', icon: 'ph-flower-lotus', iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { id: 11, title: 'Eat Fiber-Rich Whole Foods', desc: 'I will include fresh vegetables, fruits, and whole grains in every meal.', icon: 'ph-leaf', iconBg: 'bg-teal-50 text-teal-600 border-teal-200' },
  { id: 12, title: 'Maintain Optimal Body Weight', desc: 'I will strive to maintain a healthy BMI and waist-to-hip ratio.', icon: 'ph-scales', iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200' }
];

const INITIAL_DOCTORS = [
  { id: 101, name: 'Dr. Sneha Roy', clinic: 'Apollo Heart Institute & Cardiocare', pledges: 10, date: '10/23/2026', enabled: true, avatar: 'https://placehold.co/80x80/0d9488/ffffff?text=SR' },
  { id: 102, name: 'Dr. Rajeshwar Mehta', clinic: 'Fortis Escorts Heart Centre', pledges: 10, date: '10/23/2026', enabled: true, avatar: 'https://placehold.co/80x80/0284c7/ffffff?text=RM' },
  { id: 103, name: 'Dr. Ananya Deshmukh', clinic: 'Narayana Health City Clinic', pledges: 0, date: '10/23/2026', enabled: false, avatar: 'https://placehold.co/80x80/475569/ffffff?text=AD' },
  { id: 104, name: 'Dr. Vikramaditya Patel', clinic: 'CIMS Hospital Cardiology Wing', pledges: 10, date: '10/22/2026', enabled: true, avatar: 'https://placehold.co/80x80/1e40af/ffffff?text=VP' },
  { id: 105, name: 'Dr. Meera Krishnan', clinic: 'Medanta The Medicity Heart Clinic', pledges: 10, date: '10/21/2026', enabled: true, avatar: 'https://placehold.co/80x80/0f766e/ffffff?text=MK' },
  { id: 106, name: 'Dr. Siddharth Verma', clinic: 'Max Super Speciality Hospital', pledges: 10, date: '10/21/2026', enabled: true, avatar: 'https://placehold.co/80x80/0369a1/ffffff?text=SV' },
  { id: 107, name: 'Dr. Nandini Kulkarni', clinic: 'Zydus Heart & Vascular Institute', pledges: 10, date: '10/20/2026', enabled: true, avatar: 'https://placehold.co/80x80/0d9488/ffffff?text=NK' }
];

export default function PharmaPortalPreview() {
  const [currentView, setCurrentView] = useState('step1'); // 'step1' | 'step2' | 'directory'
  const [docName, setDocName] = useState('Dr. Sneha Roy, MD (Cardiology)');
  const [clinicName, setClinicName] = useState('Apollo Heart Institute & Cardiocare');
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [selectedPromises, setSelectedPromises] = useState(new Set([1, 2, 4, 5]));
  const [doctorsList, setDoctorsList] = useState(INITIAL_DOCTORS);
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [sortField, setSortField] = useState('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Floating Palette & Customizer Drawers
  const [showPaletteModal, setShowPaletteModal] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [blueDepth, setBlueDepth] = useState(42);
  const [dotsOpacity, setDotsOpacity] = useState(14);
  const [dotSize, setDotSize] = useState(1.25);
  const [watermarkOpacity, setWatermarkOpacity] = useState(55);

  // Toasts
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Sync background scales
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--dot-opacity', (dotsOpacity / 100).toFixed(2));
    root.style.setProperty('--dot-opacity-secondary', ((dotsOpacity * 0.72) / 100).toFixed(2));
    root.style.setProperty('--dot-size', `${dotSize}px`);
    root.style.setProperty('--watermark-opacity', (watermarkOpacity / 100).toFixed(2));
  }, [dotsOpacity, dotSize, watermarkOpacity]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedAvatarUrl(event.target.result);
      setUploadedFileName(file.name);
      showToast('Doctor photograph uploaded!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const loadSampleAvatar = () => {
    setUploadedAvatarUrl('https://placehold.co/120x120/0d9488/ffffff?text=Dr.+Roy');
    setUploadedFileName('dr_sneha_roy_cardiology.png');
    showToast('Sample clinical portrait loaded', 'info');
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!docName.trim()) {
      showToast('Please enter doctor name', 'error');
      return;
    }
    showToast(`Saved details for ${docName}`, 'success');
    setCurrentView('step2');
  };

  const togglePromise = (id) => {
    setSelectedPromises((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 10) {
          showToast('Maximum 10 Heart Promises can be selected', 'info');
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const quickSelectTen = () => {
    setSelectedPromises(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    showToast('10 Heart Promises selected!', 'success');
  };

  const clearAllPromises = () => {
    setSelectedPromises(new Set());
  };

  const completePromiseSelection = () => {
    if (selectedPromises.size === 0) {
      showToast('Please select at least 1 Heart Promise (or click Auto-Select 10)', 'info');
      return;
    }
    const newDoc = {
      id: Date.now(),
      name: docName,
      clinic: clinicName || 'Heart Care Clinic',
      pledges: selectedPromises.size,
      date: new Date().toLocaleDateString(),
      enabled: true,
      avatar: uploadedAvatarUrl || 'https://placehold.co/80x80/0d9488/ffffff?text=DR'
    };
    setDoctorsList([newDoc, ...doctorsList]);
    showToast(`${docName} registered with ${selectedPromises.size} Heart Pledges!`, 'success');
    setCurrentView('directory');
  };

  const handleSort = (field) => {
    const isAsc = sortField === field ? !sortAsc : true;
    setSortField(field);
    setSortAsc(isAsc);
    setDoctorsList((prev) => {
      return [...prev].sort((a, b) => {
        let valA = a[field];
        let valB = b[field];
        if (typeof valA === 'string') {
          return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return isAsc ? valA - valB : valB - valA;
      });
    });
  };

  const toggleDoctorEnabled = (id) => {
    setDoctorsList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d))
    );
    showToast('Doctor status toggled', 'info');
  };

  const deleteDoctor = (id) => {
    setDoctorsList((prev) => prev.filter((d) => d.id !== id));
    showToast('Doctor removed', 'info');
  };

  const editDoctor = (doc) => {
    setDocName(doc.name);
    setClinicName(doc.clinic);
    setUploadedAvatarUrl(doc.avatar);
    setCurrentView('step1');
    showToast(`Editing ${doc.name}`, 'info');
  };

  const filteredDoctors = doctorsList.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.clinic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedDoctors = filteredDoctors.slice(0, entriesPerPage);
  const promisePercent = Math.min(100, Math.round((selectedPromises.size / 10) * 100));

  return (
    <div className="min-h-screen flex flex-col relative bg-medical-grid text-slate-800">
      <PharmaAtmosphere />

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setCurrentView('step1')}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <i className="ph-fill ph-heartbeat text-2xl"></i>
            </div>
            <div>
              <h1 className="font-display font-extrabold text-slate-900 text-lg leading-tight tracking-tight">World Heart Day</h1>
              <p className="font-script text-teal-600 text-base leading-none mt-0.5">My Heart. My Promise.</p>
            </div>
          </div>

          {/* Nav pills */}
          <nav className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
            <button
              onClick={() => setCurrentView('step1')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentView === 'step1' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${currentView === 'step1' ? 'bg-teal-600 text-white' : 'bg-slate-300 text-slate-700'}`}>1</span>
              Doctor Info
            </button>
            <button
              onClick={() => setCurrentView('step2')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentView === 'step2' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${currentView === 'step2' ? 'bg-teal-600 text-white' : 'bg-slate-300 text-slate-700'}`}>2</span>
              Select 10 Promises
            </button>
            <button
              onClick={() => setCurrentView('directory')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentView === 'directory' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="ph-bold ph-users-three text-sm"></i>
              All Doctors Table
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCurrentView(currentView === 'directory' ? 'step1' : 'directory')}
              className="btn-pharma-primary text-white text-xs font-semibold px-4 py-2.5 rounded-full flex items-center gap-1.5 cursor-pointer"
            >
              <i className={`ph-bold ${currentView === 'directory' ? 'ph-plus-circle' : 'ph-stethoscope'} text-sm`}></i>
              <span>{currentView === 'directory' ? 'Register Doctor' : 'All Doctors'}</span>
            </button>

            <div className="flex items-center bg-slate-100/90 border border-slate-200/90 rounded-full p-1 pl-3.5 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-700 tracking-wide">EMP1001</span>
              </div>
              <button
                onClick={() => showToast('Session active (Preview mode)', 'info')}
                className="bg-white hover:bg-slate-50 text-slate-700 hover:text-teal-700 border border-slate-200/90 rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <i className="ph-bold ph-sign-out text-teal-600"></i>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col items-center justify-center">
        {/* Step 1: Doctor Information */}
        {currentView === 'step1' && (
          <section className="w-full max-w-lg transition-all duration-300">
            <div className="pharma-card rounded-2xl overflow-hidden relative">
              <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600"></div>

              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200/70">
                    <i className="ph-fill ph-shield-check text-teal-600 text-xs"></i>
                    Step 1 of 2 • Registration
                  </span>
                </div>

                <h2 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">Doctor Information</h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-relaxed">
                  Enter the doctor's details and upload their photograph to feature on the personalized World Heart Day clinical pledge poster.
                </p>

                <form onSubmit={handleStep1Submit} className="mt-6 space-y-5">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 text-white text-[11px] flex items-center justify-center font-bold shadow-xs">1</span>
                      <span>Doctor's Full Name <span className="text-teal-600">*</span></span>
                    </label>
                    <div className="relative">
                      <i className="ph-duotone ph-stethoscope absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-600 text-lg"></i>
                      <input
                        type="text"
                        required
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        placeholder="e.g. Dr. Sneha Roy, MD (Cardiology)"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 hover:bg-white focus:bg-white text-slate-800 text-sm rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 text-white text-[11px] flex items-center justify-center font-bold shadow-xs">2</span>
                      <span>Doctor Photograph <span className="text-teal-600">*</span></span>
                    </label>

                    <label
                      htmlFor="preview-photo-input"
                      className="group cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-cyan-300/90 hover:border-teal-500 bg-gradient-to-b from-cyan-50/40 to-teal-50/30 hover:from-cyan-50/70 hover:to-teal-50/60 rounded-2xl p-6 transition-all text-center relative overflow-hidden"
                    >
                      <input
                        type="file"
                        id="preview-photo-input"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />

                      {!uploadedAvatarUrl ? (
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-xs">
                            <i className="ph-duotone ph-cloud-arrow-up text-2xl"></i>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-teal-800 transition-colors">
                            Click or drag & drop Doctor Photo
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Supports high-resolution JPEG, PNG or WEBP (Max 5MB)
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="relative">
                            <img
                              src={uploadedAvatarUrl}
                              alt="Doctor Preview"
                              className="w-16 h-16 rounded-full object-cover border-2 border-teal-500 shadow-md"
                            />
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow">
                              <i className="ph-bold ph-check"></i>
                            </span>
                          </div>
                          <p className="text-xs font-bold text-teal-800 mt-2">{uploadedFileName || 'doctor_portrait.jpg'}</p>
                          <span className="text-[11px] text-cyan-600 font-medium mt-0.5">Click to replace photograph</span>
                        </div>
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 text-white text-[11px] flex items-center justify-center font-bold shadow-xs">3</span>
                      <span>Clinic / Hospital Name <span className="text-teal-600">*</span></span>
                    </label>
                    <div className="relative">
                      <i className="ph-duotone ph-buildings absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-600 text-lg"></i>
                      <input
                        type="text"
                        required
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder="e.g. Apollo Heart & Vascular Institute"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 hover:bg-white focus:bg-white text-slate-800 text-sm rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="btn-pharma-primary w-full py-3.5 px-6 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Save & Next</span>
                      <i className="ph-bold ph-arrow-right"></i>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* Step 2: Select 10 Heart Promises */}
        {currentView === 'step2' && (
          <section className="w-full max-w-3xl transition-all duration-300">
            <div className="w-full flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentView('step1')}
                className="bg-white/90 hover:bg-white text-slate-700 hover:text-teal-700 border border-slate-200/90 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <i className="ph-bold ph-arrow-left text-teal-600"></i>
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={clearAllPromises}
                  className="bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="pharma-card rounded-2xl overflow-hidden relative">
              <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500"></div>

              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Select 10 Heart Promises</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {selectedPromises.size} / 10 Selected
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                      <i className="ph-fill ph-user-circle text-teal-600 text-base"></i>
                      <span>Doctor: <strong className="text-slate-800">{docName}</strong> • <span className="text-cyan-700 font-medium">{clinicName}</span></span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70 self-start sm:self-auto">
                    <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full transition-all duration-300" style={{ width: `${promisePercent}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-teal-700">{promisePercent}%</span>
                  </div>
                </div>

                {/* 2-Column Promises Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5 max-h-[410px] overflow-y-auto pr-1.5 custom-scroll">
                  {INITIAL_PROMISES.map((item) => {
                    const isSelected = selectedPromises.has(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => togglePromise(item.id)}
                        className={`group cursor-pointer rounded-xl p-4 transition-all duration-200 border text-left flex flex-col justify-between relative select-none ${
                          isSelected
                            ? 'bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/80 border-teal-500 shadow-md shadow-teal-500/10 ring-1 ring-teal-500/50'
                            : 'bg-white/90 hover:bg-white border-slate-200/90 hover:border-cyan-300 shadow-2xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div className={`w-9 h-9 rounded-lg border ${item.iconBg} flex items-center justify-center text-lg`}>
                              <i className={`ph-duotone ${item.icon}`}></i>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                isSelected ? 'bg-teal-600 text-white shadow-xs scale-105' : 'border-2 border-slate-300 group-hover:border-teal-400 bg-white'
                              }`}
                            >
                              {isSelected && <i className="ph-bold ph-check text-[11px]"></i>}
                            </div>
                          </div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                            <span className="text-teal-600 font-extrabold mr-1">#{item.id}</span>
                            {item.title}
                          </h3>
                          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={completePromiseSelection}
                    className="btn-pharma-primary w-full py-3.5 px-6 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{selectedPromises.size === 10 ? `Complete & Generate Pledge (${selectedPromises.size} / 10)` : `Selected (${selectedPromises.size} / 10)`}</span>
                    <i className="ph-bold ph-arrow-right"></i>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Step 3: All Doctors Directory */}
        {currentView === 'directory' && (
          <section className="w-full max-w-6xl transition-all duration-300">
            {/* Table Card */}
            <div className="pharma-card rounded-2xl overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600"></div>

              <div className="p-5 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-2.5 text-xs font-medium text-slate-600">
                    <span>Show</span>
                    <select
                      value={entriesPerPage}
                      onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <span>entries</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 sm:flex-initial flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Search:</span>
                      <div className="relative w-full sm:w-64">
                        <i className="ph-bold ph-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search doctor or clinic..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-50/90 focus:bg-white rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 text-xs text-slate-800 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => setCurrentView('step1')}
                      className="btn-pharma-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="ph-bold ph-plus-circle text-sm"></i>
                      <span>Register Doctor</span>
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200/90">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 via-cyan-50/40 to-teal-50/40 border-b border-slate-200/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                        <th onClick={() => handleSort('name')} className="py-3.5 px-4 cursor-pointer hover:text-teal-700 transition-colors">
                          Doctor Name <i className="ph-bold ph-arrows-down-up text-[10px] ml-0.5 text-slate-400"></i>
                        </th>
                        <th onClick={() => handleSort('clinic')} className="py-3.5 px-4 cursor-pointer hover:text-teal-700 transition-colors">
                          Clinic Name <i className="ph-bold ph-arrows-down-up text-[10px] ml-0.5 text-slate-400"></i>
                        </th>
                        <th onClick={() => handleSort('pledges')} className="py-3.5 px-4 cursor-pointer hover:text-teal-700 transition-colors">
                          Promises <i className="ph-bold ph-arrows-down-up text-[10px] ml-0.5 text-slate-400"></i>
                        </th>
                        <th onClick={() => handleSort('date')} className="py-3.5 px-4 cursor-pointer hover:text-teal-700 transition-colors">
                          Date Created <i className="ph-bold ph-arrow-down text-[10px] ml-0.5 text-teal-600"></i>
                        </th>
                        <th className="py-3.5 px-4">Enabled</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm bg-white/70">
                      {displayedDoctors.map((doc) => (
                        <tr key={doc.id} className="hover:bg-cyan-50/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img src={doc.avatar} alt={doc.name} className="w-9 h-9 rounded-full object-cover border border-teal-200 shadow-2xs" />
                              <div>
                                <p className="font-bold text-slate-800 text-xs sm:text-sm">{doc.name}</p>
                                <p className="text-[11px] text-teal-600 font-medium">Cardiology Specialist</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs sm:text-sm text-slate-600 font-medium">{doc.clinic}</td>
                          <td className="py-3.5 px-4">
                            {doc.pledges > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {doc.pledges} Pledges
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                0 Pledges
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">{doc.date}</td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => toggleDoctorEnabled(doc.id)}
                              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                                doc.enabled ? 'bg-teal-600 justify-end' : 'bg-slate-300 justify-start'
                              }`}
                            >
                              <span className="w-5 h-5 rounded-full bg-white shadow-xs"></span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => editDoctor(doc)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200/80 transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteDoctor(doc.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 text-xs text-slate-500">
                  <p>Showing 1 to {displayedDoctors.length} of {filteredDoctors.length} entries for <strong className="text-slate-700">"EMP1001"</strong></p>
                  <div className="flex items-center gap-1.5">
                    <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 font-semibold cursor-not-allowed">Previous</button>
                    <button className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-bold shadow-xs">1</button>
                    <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold transition-colors cursor-pointer">Next</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Floating Theme Customizer Button & Drawer - Hidden per user request */}
      <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
        <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
          {showCustomizer && (
            <div className="w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden mb-2.5 transition-all">
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 px-4 py-3 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <i className="ph-fill ph-sliders-horizontal text-teal-400 text-base"></i>
                  <div>
                    <h4 className="font-display font-bold text-xs tracking-wide">Theme Settings / Export CSS</h4>
                    <p className="text-[10px] text-slate-300">Live background & token scales</p>
                  </div>
                </div>
                <button onClick={() => setShowCustomizer(false)} className="text-slate-300 hover:text-white p-1 rounded-lg">
                  <i className="ph-bold ph-x text-sm"></i>
                </button>
              </div>

              <div className="p-4 space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Grid Dots (`--dot-opacity`)</label>
                    <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[11px]">{dotsOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={dotsOpacity}
                    onChange={(e) => setDotsOpacity(Number(e.target.value))}
                    className="w-full pharma-slider"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Dot Size (`--dot-size`)</label>
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{dotSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={dotSize}
                    onChange={(e) => setDotSize(Number(e.target.value))}
                    className="w-full pharma-slider"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Watermark (`--watermark-opacity`)</label>
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{watermarkOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                    className="w-full pharma-slider"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowCustomizer(!showCustomizer)}
            className="bg-slate-900/90 hover:bg-teal-900 text-white backdrop-blur-md px-4 py-2 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700/80 cursor-pointer transition-all hover:scale-105"
          >
            <i className="ph-bold ph-code text-teal-400 text-sm"></i>
            <span>Theme Settings</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
          <div className="bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
            <i className={`ph-fill ${toastMessage.type === 'success' ? 'ph-check-circle text-teal-400' : 'ph-info text-cyan-400'} text-base`}></i>
            <span>{toastMessage.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
