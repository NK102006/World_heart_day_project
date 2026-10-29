import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Stethoscope,
  Building2,
  UploadCloud,
  User,
  CheckCircle2,
  Sparkles,
  Image as ImageIcon,
  Heart,
  ArrowRight,
  ArrowLeft,
  Download,
  Check,
  RefreshCw,
  Award,
  Calendar,
  Activity,
  Crop,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Plus,
  X,
  Camera,
  Edit2,
  Trash2,
  Shield
} from 'lucide-react';
import html2canvas from 'html2canvas';
import PhotoAdjusterCanvas from './PhotoAdjusterCanvas';
import CustomDropdown from './CustomDropdown';
import { exportToCSV } from '../utils/exportCsv';
import PosterPromisesOverlay from './PosterPromisesOverlay';
import './SuperadminPanel.css';

// The 20 Heart-Healthy Habits / Promises based on World Heart Day 2026 Guidelines
const ALL_HABITS = [
  { id: 1, title: 'Take Medicines on Time', desc: 'I will never skip my daily heart, BP, or diabetes medications.', icon: '💊' },
  { id: 2, title: 'Cut Down on Salt', desc: 'I promise to reduce salty snacks and extra salt in my meals.', icon: '🧂' },
  { id: 3, title: 'Cut Sugary Drinks', desc: 'I promise to reduce soft drinks, packaged sweet drinks, and extra sugar in tea or coffee.', icon: '🥤' },
  { id: 4, title: 'Avoid Trans Fats', desc: 'I will limit processed foods and choose healthy cooking oils.', icon: '🥑' },
  { id: 5, title: 'Never Ignore Symptoms', desc: 'I will seek medical help immediately for chest pain or breathlessness.', icon: '🚨' },
  { id: 6, title: 'Digital Detox Before Bed', desc: 'I will put away screens at night for deeper, heart-healing rest.', icon: '📵' },
  { id: 7, title: 'Eat Fiber-Rich Foods', desc: 'I will eat fresh fruits, vegetables, and whole grains every day.', icon: '🥗' },
  { id: 8, title: 'Post-Meal Stroll', desc: 'I will take a 10-minute walk after dinner to aid metabolism.', icon: '🚶' },
  { id: 9, title: 'Active Weekends', desc: 'I will choose outdoor sports, cycling, or nature walks on weekends.', icon: '🚴' },
  { id: 10, title: 'Read Food Labels', desc: 'I will read food packets to avoid hidden sodium and bad fats.', icon: '🏷️' },
  { id: 11, title: 'I will stay active', desc: 'I will exercise regularly and keep my heart strong.', icon: '🏃‍♂️' },
  { id: 12, title: 'I will eat healthy', desc: 'I will choose nutritious, balanced meals for a healthy heart.', icon: '🥦' },
  { id: 13, title: 'I will maintain a healthy weight', desc: 'I will keep my weight in check to reduce strain on my heart.', icon: '⚖️' },
  { id: 14, title: 'I will say no to tobacco', desc: 'I will avoid tobacco in any form to protect my heart.', icon: '🚭' },
  { id: 15, title: 'I will monitor my blood pressure', desc: 'I will keep my blood pressure in control.', icon: '💓' },
  { id: 16, title: 'I will keep my cholesterol in check', desc: 'I will get regular check-ups and follow healthy habits.', icon: '🩺' },
  { id: 17, title: 'I will keep my blood sugar in control', desc: 'I will manage my blood sugar to protect my heart.', icon: '🩸' },
  { id: 18, title: 'I will manage stress', desc: 'I will take time to relax, meditate and care for my mental well-being.', icon: '🧘' },
  { id: 19, title: 'I will sleep well', desc: 'I will get enough quality sleep and let my heart rest and heal.', icon: '😴' },
  { id: 20, title: 'Limit Alcohol', desc: 'I promise not to start drinking for heart health, and to limit alcohol if I already drink.', icon: '🍷' }
];

export default function HomePage({
  userAuth,
  superadminAuth,
  onLoginSuccess,
  showToast,
  onLogout,
  userPortalView = 'onboarding',
  setUserPortalView
}) {
  // Login form state (1. Employee ID, 2. Password)
  const [employeeId, setEmployeeId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Wizard Step: 1 = Doctor Details, 2 = Select 10 Habits, 3 = Poster Preview & Download
  const [currentStep, setCurrentStep] = useState(1);

  // Handle Back button click: only moves between wizard steps or closes history. NEVER logs out!
  const handleTopBack = () => {
    if (showPosterModal) {
      setShowPosterModal(false);
      setPosterModalDoctor(null);
    } else if (showEditDoctorModal) {
      setShowEditDoctorModal(false);
    } else if (selectedDoctorDetail) {
      setSelectedDoctorDetail(null);
    } else if (userPortalView === 'doctors') {
      if (setUserPortalView) setUserPortalView('onboarding');
    } else if (showDoctorHistory) {
      setShowDoctorHistory(false);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  // Step 1 Form state (3 inputs)
  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [rawPhotoSrc, setRawPhotoSrc] = useState(null);
  const [isAdjustingPhoto, setIsAdjustingPhoto] = useState(false);
  const [photoAdjustSettings, setPhotoAdjustSettings] = useState({ zoomPercent: 0, pan: { x: 0, y: 0 }, rotation: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [savingDoctor, setSavingDoctor] = useState(false);

  // Inbuilt form validation errors state
  const [loginErrors, setLoginErrors] = useState({ employeeId: '', password: '', server: '' });
  const [doctorErrors, setDoctorErrors] = useState({ doctorName: '', photo: '', clinicName: '', server: '' });
  const [habitError, setHabitError] = useState('');

  // Active Doctor data returned after save
  const [activeDoctor, setActiveDoctor] = useState(null);

  // Step 2 Habits selection state (10 habits)
  const [selectedHabitIds, setSelectedHabitIds] = useState([]);
  const [savingPromises, setSavingPromises] = useState(false);

  // Step 3 Poster & Download state
  const [downloading, setDownloading] = useState(false);
  const posterRef = useRef(null);

  // Registered doctors list under this user
  const [myDoctors, setMyDoctors] = useState([]);
  const [showDoctorHistory, setShowDoctorHistory] = useState(false);

  // JQuery DataTable state for "All Doctors" under this employee
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorEntriesPerPage, setDoctorEntriesPerPage] = useState(10);
  const [doctorCurrentPage, setDoctorCurrentPage] = useState(1);
  const [doctorSortKey, setDoctorSortKey] = useState('createdAt');
  const [doctorSortDir, setDoctorSortDir] = useState('desc'); // 'asc' | 'desc'
  const [selectedDoctorDetail, setSelectedDoctorDetail] = useState(null);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Edit Doctor Modal State
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editDoctorName, setEditDoctorName] = useState('');
  const [editClinicName, setEditClinicName] = useState('');
  const [editDoctorPhotoFile, setEditDoctorPhotoFile] = useState(null);
  const [editDoctorPhotoPreview, setEditDoctorPhotoPreview] = useState('');
  const [editDoctorPromises, setEditDoctorPromises] = useState([]);
  const [editDoctorExtraFields, setEditDoctorExtraFields] = useState({});
  const [savingEditDoctor, setSavingEditDoctor] = useState(false);

  // Dynamic Fields & Promises Configurations
  const [formFields, setFormFields] = useState([]);
  const [promisesList, setPromisesList] = useState([]);
  const [configsLoaded, setConfigsLoaded] = useState(false);
  const [extraFieldValues, setExtraFieldValues] = useState({});
  const [customFieldErrors, setCustomFieldErrors] = useState({});

  const activeHabits = useMemo(() => (promisesList.length > 0 ? promisesList : ALL_HABITS), [promisesList]);
  const targetHabitsCount = Math.min(10, activeHabits.length || 10);

  // View Poster Modal State
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [posterModalDoctor, setPosterModalDoctor] = useState(null);
  const [modalDownloading, setModalDownloading] = useState(false);
  const modalPosterRef = useRef(null);

  // Blur navbar and disable background interaction when edit doctor modal or poster modal is open
  useEffect(() => {
    if (showEditDoctorModal || showPosterModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showEditDoctorModal, showPosterModal]);

  const toggleDoctorSort = (key) => {
    if (doctorSortKey === key) {
      setDoctorSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDoctorSortKey(key);
      setDoctorSortDir('asc');
    }
    setDoctorCurrentPage(1);
  };

  const renderSortArrow = (currentSortKey, columnKey, sortDirection) => {
    if (currentSortKey !== columnKey) {
      return <ArrowUpDown size={13} style={{ opacity: 0.35, marginLeft: '4px' }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={13} style={{ color: 'var(--primary-red)', marginLeft: '4px' }} />
    ) : (
      <ArrowDown size={13} style={{ color: 'var(--primary-red)', marginLeft: '4px' }} />
    );
  };

  const getDoctorPhotoUrl = (doc) => {
    if (!doc) return '/assets/placeholder-doctor.png';
    const raw = typeof doc === 'string' ? doc : (doc.photoUrl || doc.photo || doc.extraFields?.photo);
    if (!raw || typeof raw !== 'string' || !raw.trim()) return '/assets/placeholder-doctor.png';
    const trimmed = raw.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  };

  const handleDoctorPhotoError = (e, name) => {
    if (!e.target.dataset.triedFallback) {
      e.target.dataset.triedFallback = '1';
      e.target.src = '/assets/placeholder-doctor.png';
    } else if (!e.target.dataset.triedAvatar) {
      e.target.dataset.triedAvatar = '1';
      e.target.src =
        'https://ui-avatars.com/api/?name=' +
        encodeURIComponent(name || 'Doctor') +
        '&background=e63946&color=fff';
    }
  };

  // Extract all dynamic custom fields data for a doctor (both configured and stored)
  const getDoctorExtraFields = (doc) => {
    if (!doc) return [];
    let extra = {};
    if (doc.extraFields) {
      if (typeof doc.extraFields === 'string') {
        try {
          extra = JSON.parse(doc.extraFields);
        } catch (e) {
          extra = {};
        }
      } else if (typeof doc.extraFields === 'object') {
        extra = doc.extraFields;
      }
    }

    const result = [];
    const handledKeys = new Set();
    const systemKeys = new Set([
      'status',
      '_id',
      'id',
      'createdat',
      'updatedat',
      'adminid',
      'userid',
      '__v',
      'doctorname',
      'clinicname',
      'photo',
      'photourl',
      'selectedpromises',
      'extrafields'
    ]);

    // 1. Process all custom fields configured in the registration form in their defined order
    const configuredCustomFields = (formFields || []).filter((f) => !f.isSystem);
    configuredCustomFields.forEach((f) => {
      const fNameLower = (f.name || '').toLowerCase();
      const fLabelLower = (f.label || '').toLowerCase();
      if (systemKeys.has(fNameLower)) return;

      // Find value in extraFields by name, by label, case-insensitively, or directly on doc
      let val = null;
      if (extra && typeof extra === 'object') {
        if (extra[f.name] !== undefined) {
          val = extra[f.name];
        } else if (extra[f.label] !== undefined) {
          val = extra[f.label];
        } else {
          const matchedKey = Object.keys(extra).find(
            (k) => k.toLowerCase() === fNameLower || k.toLowerCase() === fLabelLower
          );
          if (matchedKey) val = extra[matchedKey];
        }
      }

      if ((val === null || val === undefined || String(val).trim() === '') && doc[f.name] !== undefined) {
        val = doc[f.name];
      }

      handledKeys.add(f.name);
      if (extra && typeof extra === 'object') {
        Object.keys(extra).forEach((k) => {
          if (k.toLowerCase() === fNameLower || k.toLowerCase() === fLabelLower) {
            handledKeys.add(k);
          }
        });
      }

      if (val !== null && val !== undefined && String(val).trim() !== '') {
        result.push({
          name: f.name,
          label: f.label || f.name,
          value: String(val),
          type: f.type || 'text'
        });
      }
    });

    // 2. Also process any other extra fields on the doctor that weren't in the active configuration
    if (extra && typeof extra === 'object') {
      Object.entries(extra).forEach(([k, v]) => {
        if (!systemKeys.has(k.toLowerCase()) && !handledKeys.has(k) && v !== undefined && v !== null && String(v).trim() !== '') {
          const matched = (formFields || []).find(
            (f) => (f.name || '').toLowerCase() === k.toLowerCase() || (f.label || '').toLowerCase() === k.toLowerCase()
          );
          result.push({
            name: k,
            label: matched?.label || k,
            value: String(v),
            type: matched?.type || 'text'
          });
        }
      });
    }

    return result;
  };

  const filteredDoctors = useMemo(() => {
    let list = [...myDoctors];

    if (doctorSearch.trim()) {
      const q = doctorSearch.toLowerCase().trim();
      list = list.filter((doc) => {
        const dName = (doc.doctorName || '').toLowerCase();
        const cName = (doc.clinicName || '').toLowerCase();
        return dName.includes(q) || cName.includes(q);
      });
    }

    list.sort((a, b) => {
      let valA = a[doctorSortKey];
      let valB = b[doctorSortKey];

      if (doctorSortKey === 'promises') {
        valA = a.selectedPromises?.length || 0;
        valB = b.selectedPromises?.length || 0;
      } else if (doctorSortKey === 'createdAt') {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return doctorSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return doctorSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [myDoctors, doctorSearch, doctorSortKey, doctorSortDir]);

  const totalDoctorPages = Math.max(1, Math.ceil(filteredDoctors.length / doctorEntriesPerPage));
  const currentDoctors = useMemo(() => {
    const start = (doctorCurrentPage - 1) * doctorEntriesPerPage;
    return filteredDoctors.slice(start, start + doctorEntriesPerPage);
  }, [filteredDoctors, doctorCurrentPage, doctorEntriesPerPage]);

  const startDoctorIndex = filteredDoctors.length === 0 ? 0 : (doctorCurrentPage - 1) * doctorEntriesPerPage + 1;
  const endDoctorIndex = Math.min(doctorCurrentPage * doctorEntriesPerPage, filteredDoctors.length);

  // Ensure all temporary wizard session storage is removed on initial mount
  useEffect(() => {
    try {
      sessionStorage.removeItem('whd_current_step');
      sessionStorage.removeItem('whd_active_doctor');
      sessionStorage.removeItem('whd_selected_habit_ids');
    } catch {}
  }, []);

  const fileInputRef = useRef(null);

  // Fetch dynamic configurations (fields & promises) on initial mount
  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const [fRes, pRes] = await Promise.all([
        fetch('/api/config/fields'),
        fetch('/api/config/promises')
      ]);
      const [fData, pData] = await Promise.all([fRes.json(), pRes.json()]);
      if (fData.success && fData.fields) {
        setFormFields(fData.fields);
      }
      if (pData.success && pData.promises) {
        setPromisesList(pData.promises);
      }
    } catch (err) {
      console.error('Error fetching dynamic configs in HomePage:', err);
    } finally {
      setConfigsLoaded(true);
    }
  };

  // Fetch doctors and refresh dynamic field configs if logged in
  useEffect(() => {
    if (userAuth?.token) {
      fetchMyDoctors();
      fetchConfigs();
    }
  }, [userAuth?.token, userPortalView]);

  // Scroll to top whenever step, view, or auth changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep, userAuth, userPortalView]);

  const fetchMyDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await fetch('/api/user/doctors', {
        headers: { Authorization: `Bearer ${userAuth.token}` }
      });
      if (res.status === 401) {
        if (onLogout) onLogout('user');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setMyDoctors(data.doctors || []);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const openEditDoctorModal = (doctor, e) => {
    if (e) e.stopPropagation();
    setEditingDoctor(doctor);
    setEditDoctorName(doctor.doctorName || '');
    setEditClinicName(doctor.clinicName || '');
    setEditDoctorPhotoFile(null);
    let parsedExtra = {};
    if (doctor.extraFields) {
      if (typeof doctor.extraFields === 'string') {
        try { parsedExtra = JSON.parse(doctor.extraFields); } catch (e) { parsedExtra = {}; }
      } else if (typeof doctor.extraFields === 'object') {
        parsedExtra = { ...doctor.extraFields };
      }
    }
    // Also include any top-level properties matching configured custom fields
    (formFields || []).filter(f => !f.isSystem).forEach(f => {
      if (parsedExtra[f.name] === undefined && doctor[f.name] !== undefined) {
        parsedExtra[f.name] = doctor[f.name];
      }
    });
    setEditDoctorExtraFields(parsedExtra);

    const existingPromises = Array.isArray(doctor.selectedPromises) ? doctor.selectedPromises : [];
    const matchedPromises = activeHabits.filter((h) =>
      existingPromises.some((p) => p === h.title || p.startsWith(h.title))
    ).map((h) => h.title);

    const initialPromises = (matchedPromises.length > 0 ? matchedPromises : existingPromises).slice(0, targetHabitsCount);
    setEditDoctorPromises(initialPromises);
    setShowEditDoctorModal(true);
  };

  const handleDoctorPhotoSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }
    setEditDoctorPhotoFile(file);
    setEditDoctorPhotoPreview(URL.createObjectURL(file));
  };

  const handleResetDoctorPhoto = () => {
    setEditDoctorPhotoFile(null);
    setEditDoctorPhotoPreview(editingDoctor?.photoUrl || '');
  };

  const toggleDoctorPromise = (habitTitle) => {
    if (editDoctorPromises.includes(habitTitle)) {
      setEditDoctorPromises((prev) => prev.filter((t) => t !== habitTitle));
    } else {
      if (editDoctorPromises.length >= targetHabitsCount) {
        showToast(`You cannot select more than ${targetHabitsCount} promises (maximum ${targetHabitsCount} allowed)`, 'error');
        return;
      }
      setEditDoctorPromises((prev) => [...prev, habitTitle]);
    }
  };

  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;
    const docNameField = formFields.find(f => f.name === 'doctorName');
    if (docNameField && docNameField.required !== false && !editDoctorName.trim()) {
      showToast(`${docNameField.label || "Doctor's name"} is required`, 'error');
      return;
    }
    const clinicField = formFields.find(f => f.name === 'clinicName');
    if (clinicField && clinicField.required !== false && !editClinicName.trim()) {
      showToast(`${clinicField.label || 'Clinic name'} is required`, 'error');
      return;
    }
    if (editDoctorPromises.length > targetHabitsCount) {
      showToast(`You cannot select more than ${targetHabitsCount} promises`, 'error');
      return;
    }

    setSavingEditDoctor(true);
    try {
      const formData = new FormData();
      formData.append('doctorName', editDoctorName.trim());
      formData.append('clinicName', editClinicName.trim());
      if (editDoctorPhotoFile) {
        formData.append('photo', editDoctorPhotoFile);
      } else if (editDoctorPhotoPreview) {
        formData.append('photoUrl', editDoctorPhotoPreview);
      }
      formData.append('selectedPromises', JSON.stringify(editDoctorPromises));
      formData.append('extraFields', JSON.stringify(editDoctorExtraFields));
      Object.keys(editDoctorExtraFields).forEach((k) => {
        formData.append(k, editDoctorExtraFields[k]);
      });

      const res = await fetch(`/api/user/doctors/${editingDoctor._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${userAuth.token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Dr. "${data.doctor.doctorName}" updated successfully!`, 'success');
        setShowEditDoctorModal(false);
        setEditingDoctor(null);
        setEditDoctorPhotoFile(null);
        setEditDoctorPhotoPreview('');
        fetchMyDoctors();
        if (selectedDoctorDetail && String(selectedDoctorDetail._id) === String(editingDoctor._id)) {
          setSelectedDoctorDetail((prev) => ({ ...prev, ...data.doctor }));
        }
        if (activeDoctor && String(activeDoctor._id) === String(editingDoctor._id)) {
          setActiveDoctor((prev) => ({ ...prev, ...data.doctor }));
        }
      } else {
        showToast(data.message || 'Failed to update doctor', 'error');
      }
    } catch (err) {
      console.error('Update doctor error:', err);
      showToast('Failed to connect to server to update doctor', 'error');
    } finally {
      setSavingEditDoctor(false);
    }
  };

  const handleDeleteDoctor = async (id, doctorName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete Dr. "${doctorName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/user/doctors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userAuth.token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Doctor "${doctorName}" deleted successfully`, 'success');
        fetchMyDoctors();
        if (selectedDoctorDetail && String(selectedDoctorDetail._id) === String(id)) {
          setSelectedDoctorDetail(null);
        }
        if (activeDoctor && String(activeDoctor._id) === String(id)) {
          setActiveDoctor(null);
        }
        if (editingDoctor && String(editingDoctor._id) === String(id)) {
          setShowEditDoctorModal(false);
          setEditingDoctor(null);
        }
        if (posterModalDoctor && String(posterModalDoctor._id) === String(id)) {
          setShowPosterModal(false);
          setPosterModalDoctor(null);
        }
      } else {
        showToast(data.message || 'Error deleting doctor', 'error');
      }
    } catch (err) {
      console.error('Error deleting doctor:', err);
      showToast('Error deleting doctor', 'error');
    }
  };

  const handleToggleDoctorStatus = async (doc) => {
    const newStatus = doc.status === 'inactive' ? 'active' : 'inactive';
    setMyDoctors((prev) =>
      prev.map((d) => (d._id === doc._id ? { ...d, status: newStatus } : d))
    );
    if (selectedDoctorDetail && String(selectedDoctorDetail._id) === String(doc._id)) {
      setSelectedDoctorDetail((prev) => ({ ...prev, status: newStatus }));
    }
    if (activeDoctor && String(activeDoctor._id) === String(doc._id)) {
      setActiveDoctor((prev) => ({ ...prev, status: newStatus }));
    }
    try {
      const res = await fetch(`/api/user/doctors/${doc._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAuth.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Dr. "${doc.doctorName}" ${newStatus === 'active' ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showToast(data.message || 'Failed to update doctor status', 'error');
        fetchMyDoctors();
      }
    } catch (err) {
      showToast('Error updating doctor status', 'error');
      fetchMyDoctors();
    }
  };

  const renderEditDoctorModal = () => {
    if (!showEditDoctorModal || !editingDoctor) return null;

    return (
      <div className="medportal-modal-backdrop" onClick={() => setShowEditDoctorModal(false)}>
        <div className="medportal-modal-card medportal-modal-card-doctor-edit" onClick={(e) => e.stopPropagation()}>
          <div className="medportal-modal-header">
            <div>
              <h3>Edit Doctor</h3>
              <p className="medportal-modal-subheading">Update doctor details, photo and heart promises</p>
            </div>
            <button
              type="button"
              className="medportal-modal-close"
              onClick={() => setShowEditDoctorModal(false)}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleUpdateDoctor}>
            <div className="medportal-form-row-2col">
              <div className="medportal-form-group">
                <label>
                  {formFields.find(f => f.name === 'doctorName')?.label || "Doctor's Name"}
                  {Boolean(formFields.find(f => f.name === 'doctorName')?.required) && ' *'}
                </label>
                <input
                  type="text"
                  className="medportal-form-control"
                  placeholder="e.g. Ramesh Patel"
                  autoComplete="off"
                  value={editDoctorName}
                  onChange={(e) => setEditDoctorName(e.target.value)}
                  required={Boolean(formFields.find(f => f.name === 'doctorName')?.required)}
                />
              </div>

              <div className="medportal-form-group">
                <label>
                  {formFields.find(f => f.name === 'clinicName')?.label || 'Clinic / Hospital Name'}
                  {Boolean(formFields.find(f => f.name === 'clinicName')?.required) && ' *'}
                </label>
                <input
                  type="text"
                  className="medportal-form-control"
                  placeholder="e.g. Heart Care Clinic"
                  autoComplete="off"
                  value={editClinicName}
                  onChange={(e) => setEditClinicName(e.target.value)}
                  required={Boolean(formFields.find(f => f.name === 'clinicName')?.required)}
                />
              </div>
            </div>

            {/* Photo Field */}
            <div className="medportal-form-group">
              <label>Doctor Photo</label>
              <div className="medportal-doctor-photo-edit-box">
                <div className="medportal-doctor-photo-preview-wrap">
                  {editDoctorPhotoPreview ? (
                    <img
                      src={editDoctorPhotoPreview}
                      alt={editDoctorName || 'Doctor'}
                      className="medportal-doctor-edit-avatar"
                      onError={(e) => {
                        e.target.src =
                          'https://ui-avatars.com/api/?name=' +
                          encodeURIComponent(editDoctorName || 'Doctor') +
                          '&background=e63946&color=fff&size=200';
                      }}
                    />
                  ) : (
                    <div className="medportal-doctor-no-avatar">
                      <Camera size={24} />
                    </div>
                  )}
                </div>
                <div className="medportal-doctor-photo-info">
                  <div className="medportal-doctor-photo-actions-row">
                    <label className="medportal-btn-file-label">
                      <Camera size={14} />
                      <span>{editDoctorPhotoFile ? 'Replace Photo' : 'Upload New Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleDoctorPhotoSelect}
                      />
                    </label>
                    {editDoctorPhotoFile && (
                      <button
                        type="button"
                        className="medportal-btn-sm-revert"
                        onClick={handleResetDoctorPhoto}
                      >
                        Revert
                      </button>
                    )}
                  </div>
                  <span className="medportal-photo-hint-text">
                    {editDoctorPhotoFile
                      ? `Selected: ${editDoctorPhotoFile.name}`
                      : 'JPG, PNG, WEBP recommended (Max 5MB)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Custom Fields */}
            {formFields.filter((f) => !f.isSystem).map((field) => (
              <div className="medportal-form-group" key={field.name}>
                <label>{field.label} {field.required && '*'}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    className="medportal-form-control"
                    placeholder={field.placeholder || `Enter ${field.label}`}
                    value={editDoctorExtraFields[field.name] || ''}
                    onChange={(e) => setEditDoctorExtraFields((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    rows={2}
                  />
                ) : field.type === 'select' ? (
                  <CustomDropdown
                    placeholder={`-- Select ${field.label} --`}
                    value={editDoctorExtraFields[field.name] || ''}
                    options={(field.options || []).map((opt) => ({ value: opt, label: opt }))}
                    onChange={(val) => setEditDoctorExtraFields((prev) => ({ ...prev, [field.name]: val }))}
                  />
                ) : field.type === 'file' ? (
                  <div>
                    {editDoctorExtraFields[field.name] && typeof editDoctorExtraFields[field.name] === 'string' && (
                      <div style={{ marginBottom: '6px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64748b' }}>Current file:</span>
                        <a
                          href={editDoctorExtraFields[field.name]}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#0284c7', textDecoration: 'underline', wordBreak: 'break-all' }}
                        >
                          {editDoctorExtraFields[field.name].split('/').pop()}
                        </a>
                      </div>
                    )}
                    <input
                      type="file"
                      className="medportal-form-control"
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) {
                          setEditDoctorExtraFields((prev) => ({ ...prev, [field.name]: f }));
                        }
                      }}
                    />
                    {editDoctorExtraFields[field.name] && typeof editDoctorExtraFields[field.name] === 'object' && editDoctorExtraFields[field.name].name && (
                      <span style={{ fontSize: '0.8rem', color: '#0d9488', marginTop: '4px', display: 'block' }}>
                        Selected: {editDoctorExtraFields[field.name].name}
                      </span>
                    )}
                  </div>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    className="medportal-form-control"
                    placeholder={field.placeholder || `Enter ${field.label}`}
                    value={editDoctorExtraFields[field.name] || ''}
                    onChange={(e) => setEditDoctorExtraFields((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            {/* Promises Field */}
            <div className="medportal-form-group">
              <div className="medportal-promises-edit-header">
                <div className="medportal-promises-count-badge">
                  <Sparkles size={14} />
                  <span>Heart Health Promises: <strong>{editDoctorPromises.length} / {targetHabitsCount}</strong> selected</span>
                </div>
                <div className="medportal-promises-action-chips">
                  <button
                    type="button"
                    className="medportal-chip-btn"
                    onClick={() => setEditDoctorPromises(activeHabits.slice(0, targetHabitsCount).map((h) => h.title))}
                  >
                    Pick First {targetHabitsCount}
                  </button>
                  {editDoctorPromises.length > 0 && (
                    <button
                      type="button"
                      className="medportal-chip-btn clear"
                      onClick={() => setEditDoctorPromises([])}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="medportal-promises-scroll-grid">
                {activeHabits.map((habit) => {
                  const isSelected = editDoctorPromises.includes(habit.title);
                  const isLimitReached = editDoctorPromises.length >= targetHabitsCount && !isSelected;

                  return (
                    <div
                      key={habit.id}
                      className={`medportal-promise-toggle-item ${isSelected ? 'active' : ''} ${isLimitReached ? 'disabled' : ''}`}
                      onClick={() => toggleDoctorPromise(habit.title)}
                      title={isLimitReached ? `Maximum ${targetHabitsCount} promises reached` : ''}
                    >
                      <div className={`medportal-promise-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={13} />}
                      </div>
                      <span className="medportal-habit-icon">{habit.icon}</span>
                      <div className="medportal-habit-text">
                        <span className="medportal-habit-title">#{habit.id} {habit.title}</span>
                        <span className="medportal-habit-desc">{habit.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="medportal-modal-actions">
              <button
                type="button"
                className="medportal-btn-cancel"
                onClick={() => setShowEditDoctorModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="medportal-btn-submit"
                disabled={savingEditDoctor}
              >
                {savingEditDoctor ? 'Saving Changes...' : 'Save Doctor Details'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const getPosterModalHabits = (doctor) => {
    const habitsSource = activeHabits.length > 0 ? activeHabits : ALL_HABITS;
    const targetCount = Math.min(10, habitsSource.length || 10);
    if (!doctor) return habitsSource.slice(0, targetCount);
    const existingPromises = Array.isArray(doctor.selectedPromises) ? doctor.selectedPromises : [];
    if (existingPromises.length === 0) {
      return habitsSource.slice(0, targetCount);
    }
    const matched = habitsSource.filter((h) =>
      existingPromises.some((p) => p === h.title || p.startsWith(h.title))
    );
    if (matched.length > 0) {
      const remaining = habitsSource.filter((h) => !matched.some((m) => m.id === h.id));
      return [...matched, ...remaining].slice(0, targetCount);
    }
    return existingPromises.slice(0, targetCount).map((p, idx) => ({
      id: idx + 1,
      title: typeof p === 'string' && p.includes(' - ') ? p.split(' - ')[0] : p,
      desc: typeof p === 'string' && p.includes(' - ') ? p.split(' - ')[1] : ''
    }));
  };

  const openPosterModal = (doctor, e) => {
    if (e) e.stopPropagation();
    setPosterModalDoctor(doctor);
    setShowPosterModal(true);
  };

  const closePosterModal = () => {
    setShowPosterModal(false);
    setPosterModalDoctor(null);
  };

  // Download World Heart Day Official Poster (High-Resolution 764 × 1024 base scaled at 2x = 1528 × 2048 HD)
  const downloadAsInstagramPost = async (sourceElement, filename, doctorId) => {
    if (!sourceElement) return;

    // 1. Create a dedicated off-screen sandbox container fixed at 764x1024 px (Exact poster ratio)
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0px';
    container.style.left = '-9999px';
    container.style.width = '764px';
    container.style.height = '1024px';
    container.style.zIndex = '-9999';
    container.style.overflow = 'hidden';
    container.style.background = '#ffffff';
    container.style.margin = '0px';
    container.style.padding = '0px';
    container.style.boxSizing = 'border-box';

    // 2. Deep clone the poster DOM element and apply 764x1024 styles
    const clone = sourceElement.cloneNode(true);
    clone.id = 'poster-download-clone';
    clone.className = (sourceElement.className || '') + ' poster-download-clone';
    clone.style.width = '764px';
    clone.style.minWidth = '764px';
    clone.style.maxWidth = '764px';
    clone.style.height = '1024px';
    clone.style.minHeight = '1024px';
    clone.style.maxHeight = '1024px';
    clone.style.aspectRatio = '764 / 1024';
    clone.style.borderRadius = '0px';
    clone.style.boxShadow = 'none';
    clone.style.margin = '0px';
    clone.style.padding = '0px';
    clone.style.transform = 'none';
    clone.style.top = '0px';
    clone.style.left = '0px';

    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }

      // Wait for all images in clone to be fully loaded and decoded
      const imgs = Array.from(clone.querySelectorAll('img'));
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete && img.naturalWidth > 0) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              setTimeout(resolve, 500);
            })
        )
      );

      // Brief tick for full DOM reflow & text layout
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 3. Render directly at high resolution (scale: 2) using html2canvas
      const canvas = await html2canvas(clone, {
        width: 764,
        height: 1024,
        scale: 2, // 2x scale = 1528x2048 HD
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        windowWidth: 764,
        windowHeight: 1024
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = filename;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Poster downloaded successfully!', 'success');

      // Save poster path to server asynchronously
      if (doctorId && userAuth?.token) {
        try {
          const res = await fetch(`/api/user/doctors/${doctorId}/poster`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userAuth.token}`
            },
            body: JSON.stringify({ posterData: image })
          });
          const data = await res.json();
          if (data.success && data.posterUrl) {
            setMyDoctors((prev) =>
              prev.map((d) => (d._id === doctorId ? { ...d, posterUrl: data.posterUrl } : d))
            );
            if (activeDoctor && activeDoctor._id === doctorId) {
              setActiveDoctor((prev) => ({ ...prev, posterUrl: data.posterUrl }));
            }
            if (posterModalDoctor && posterModalDoctor._id === doctorId) {
              setPosterModalDoctor((prev) => ({ ...prev, posterUrl: data.posterUrl }));
            }
            if (selectedDoctorDetail && selectedDoctorDetail._id === doctorId) {
              setSelectedDoctorDetail((prev) => ({ ...prev, posterUrl: data.posterUrl }));
            }
          }
        } catch (postErr) {
          console.error('Error saving poster to server:', postErr);
        }
      }
    } catch (err) {
      console.error('Download poster error:', err);
      showToast('Failed to generate image download. Please try again.', 'error');
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  };

  const handleDownloadModalPoster = async () => {
    if (!modalPosterRef.current || !posterModalDoctor) return;

    setModalDownloading(true);
    showToast('Rendering Official World Heart Day Poster...', 'info');

    try {
      const safeDocName = (posterModalDoctor.doctorName || 'Doctor').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `World_Heart_Day_2026_Poster_${safeDocName}.png`;
      await downloadAsInstagramPost(modalPosterRef.current, filename, posterModalDoctor._id);
    } catch (err) {
      console.error('Download modal poster error:', err);
      showToast('Failed to generate image download. Please try again.', 'error');
    } finally {
      setModalDownloading(false);
    }
  };

  const renderPosterModal = () => {
    if (!showPosterModal || !posterModalDoctor) return null;

    return (
      <div
        className="medportal-modal-backdrop"
        onClick={closePosterModal}
        style={{
          overflowY: 'auto',
          padding: '1.5rem 1rem',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center'
        }}
      >
        <div
          className="medportal-modal-card medportal-modal-card-poster-scroll"
          style={{
            maxWidth: '640px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
            padding: '1.25rem 1.25rem 1.75rem',
            borderRadius: '20px',
            background: '#ffffff',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            margin: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Sticky Bar with Close (X) button */}
          <div
            style={{
              position: 'sticky',
              top: '0px',
              zIndex: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginBottom: '0.75rem',
              pointerEvents: 'none'
            }}
          >
            <button
              type="button"
              onClick={closePosterModal}
              style={{
                pointerEvents: 'auto',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                color: '#1e293b',
                transition: 'all 0.2s ease'
              }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Official Image-Based Poster with Coordinates Form Info */}
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '1.5rem' }}>
            <div
              ref={modalPosterRef}
              className="image-poster-canvas"
            >
              {/* Clean Official Poster Template */}
              <img
                src="/assets/world_heart_day_poster_clean.jpg"
                alt="World Heart Day 2026 Poster"
                className="poster-base-img"
              />

              {/* Form Info Overlaid by Coordinates: Doctor Photo Aperture */}
              <div className="poster-coord-photo-wrap">
                <img
                  src={getDoctorPhotoUrl(posterModalDoctor)}
                  alt={posterModalDoctor.doctorName}
                  crossOrigin="anonymous"
                  onError={(e) => handleDoctorPhotoError(e, posterModalDoctor.doctorName)}
                />
              </div>

              {/* Form Info Overlaid by Coordinates: Doctor Details */}
              <div className="poster-coord-details">
                <div className="poster-coord-name">
                  {(() => {
                    const rawName = (posterModalDoctor.doctorName || '').trim();
                    return rawName.toLowerCase().startsWith('dr') ? rawName : `Dr. ${rawName}`;
                  })()}
                </div>
                {(() => {
                  const extraList = getDoctorExtraFields(posterModalDoctor);
                  if (extraList.length === 0) return null;
                  return (
                    <div className="poster-coord-quals">
                      {extraList.slice(0, 3).map((f, i) => (
                        <div key={i} className="poster-coord-qual-item" title={f.value}>
                          {f.value}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="poster-coord-clinic">
                  {posterModalDoctor.clinicName || 'Heart Care Clinic'}
                </div>
              </div>

              {/* Overlaid 10 Selected Promises */}
              <PosterPromisesOverlay doc={posterModalDoctor} fallbackList={activeHabits} />
            </div>
          </div>

          {/* Modal Footer: Only Download Action Button directly below Poster */}
          <div
            style={{
              paddingTop: '1rem',
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
              borderTop: '1px solid var(--border)'
            }}
          >
            <button
              type="button"
              className="btn-primary btn-download-poster"
              style={{
                padding: '0.9rem 2.75rem',
                fontSize: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.65rem',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(225, 29, 72, 0.3)'
              }}
              disabled={modalDownloading}
              onClick={handleDownloadModalPoster}
            >
              <Download size={20} />
              <span>{modalDownloading ? 'Rendering Poster...' : 'Download Poster'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };


  // =========================================================================
  // EXPORT DOCTORS (CSV / EXCEL)
  // =========================================================================
  const handleExportDoctors = () => {
    const listToExport = filteredDoctors.length > 0 ? filteredDoctors : myDoctors;
    if (!listToExport || listToExport.length === 0) {
      showToast('No doctors to export', 'info');
      return;
    }

    // Identify all additional field columns across configured formFields and exported doctors
    const fieldColsMap = new Map();
    const systemKeys = new Set([
      'doctorname',
      'clinicname',
      'photo',
      'photourl',
      'poster',
      'posterurl',
      'status',
      'createdat',
      'updatedat',
      'adminid',
      'userid',
      'selectedpromises',
      'extrafields',
      '_id',
      '__v'
    ]);
    (formFields || []).filter((f) => !f.isSystem).forEach((f) => {
      const fNameLower = (f.name || '').toLowerCase();
      if (f.name && !systemKeys.has(fNameLower)) {
        fieldColsMap.set(f.name, f.label || f.name);
      }
    });
    listToExport.forEach((doc) => {
      const extraList = getDoctorExtraFields(doc);
      extraList.forEach((item) => {
        const itemLower = (item.name || '').toLowerCase();
        if (!systemKeys.has(itemLower) && !fieldColsMap.has(item.name)) {
          fieldColsMap.set(item.name, item.label || item.name);
        }
      });
    });
    const extraCols = Array.from(fieldColsMap.entries()).map(([name, label]) => ({ name, label }));

    const getPosterFullPath = (doc) => {
      if (!doc || !doc.posterUrl) return '';
      if (doc.posterUrl.startsWith('http://') || doc.posterUrl.startsWith('https://')) {
        return doc.posterUrl;
      }
      const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:5000';
      return `${origin}${doc.posterUrl.startsWith('/') ? '' : '/'}${doc.posterUrl}`;
    };

    const headers = [
      'Doctor Name',
      'Clinic / Hospital Name',
      ...extraCols.map((c) => c.label),
      'Poster',
      'Registered By (Employee)',
      'Total Promises',
      'Selected Promises',
      'Status',
      'Created Date'
    ];

    const rows = listToExport.map((doc) => {
      const extraList = getDoctorExtraFields(doc);
      const extraMap = {};
      extraList.forEach((item) => {
        extraMap[item.name] = item.value;
        extraMap[item.label] = item.value;
      });
      const promisesStr = (doc.selectedPromises || [])
        .map((p) => (typeof p === 'string' && p.includes(' - ') ? p.split(' - ')[0] : p))
        .join('\n');
      return [
        doc.doctorName || '',
        doc.clinicName || '',
        ...extraCols.map((c) => (extraMap[c.name] !== undefined ? extraMap[c.name] : (extraMap[c.label] || ''))),
        getPosterFullPath(doc),
        userAuth?.user?.employeeId || 'N/A',
        doc.selectedPromises?.length || 0,
        promisesStr,
        doc.status || 'active',
        doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'
      ];
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(`World_Heart_Day_My_Doctors_${dateStr}.csv`, headers, rows);
    showToast(`Exported ${rows.length} doctors successfully!`, 'success');
  };

  // Clear credentials and wizard data if user is logged out
  useEffect(() => {
    if (!userAuth || userAuth?.user?.role !== 'user') {
      setEmployeeId('');
      setLoginPassword('');
      setDoctorName('');
      setClinicName('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setRawPhotoSrc(null);
      setIsAdjustingPhoto(false);
      setSelectedHabitIds([]);
      setActiveDoctor(null);
      setCurrentStep(1);
    }
  }, [userAuth]);

  // Handle user login (1. Employee ID, 2. Password)
  const handleUserLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!employeeId.trim()) errs.employeeId = 'Employee ID is required';
    if (!loginPassword) {
      errs.password = 'Password is required';
    } else if (loginPassword.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errs).length > 0) {
      setLoginErrors(errs);
      return;
    }

    setLoginLoading(true);
    setLoginErrors({ employeeId: '', password: '', server: '' });

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employeeId.trim(), password: loginPassword, role: 'user' })
      });
      const data = await res.json();
      if (data.success) {
        // Clear login inputs immediately so credentials are not retained in state upon logout
        setEmployeeId('');
        setLoginPassword('');
        onLoginSuccess('user', data.token, data.user);
        showToast(`Welcome back, ${data.user.employeeId || 'User'}!`, 'success');
      } else {
        setLoginErrors((prev) => ({ ...prev, server: data.message || 'Login failed. Please check your credentials.' }));
      }
    } catch (err) {
      setLoginErrors((prev) => ({ ...prev, server: 'Network error during login. Please check connection.' }));
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle photo selection - opens the interactive canvas adjuster
  const handlePhotoChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setDoctorErrors((prev) => ({ ...prev, photo: 'Please select a valid image file (JPEG, PNG, WEBP)' }));
      return;
    }
    setDoctorErrors((prev) => ({ ...prev, photo: '' }));
    const reader = new FileReader();
    reader.onload = (e) => {
      setRawPhotoSrc(e.target.result);
      setPhotoAdjustSettings({ zoomPercent: 0, pan: { x: 0, y: 0 }, rotation: 0 });
      setIsAdjustingPhoto(true);
    };
    reader.readAsDataURL(file);
  };

  // Callback when user confirms framing on canvas
  const handleApplyAdjustedPhoto = ({ dataUrl, file, settings }) => {
    setPhotoPreview(dataUrl);
    setPhotoFile(file);
    if (settings) {
      setPhotoAdjustSettings(settings);
    }
    setIsAdjustingPhoto(false);
    setDoctorErrors((prev) => ({ ...prev, photo: '' }));
    showToast('Doctor photograph framed & saved!', 'success');
  };

  const handleCancelAdjustPhoto = () => {
    setIsAdjustingPhoto(false);
  };

  const handleReopenAdjuster = () => {
    if (rawPhotoSrc || photoPreview) {
      if (!rawPhotoSrc && photoPreview) {
        setRawPhotoSrc(photoPreview);
      }
      setIsAdjustingPhoto(true);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoChange(e.dataTransfer.files[0]);
    }
  };

  // Step 1: Save Doctor & Next
  const handleSaveAndNext = async (e) => {
    e.preventDefault();

    const newErrors = {};
    const newCustomErrors = {};

    const activeFieldsList = configsLoaded ? formFields : (formFields.length > 0 ? formFields : [
      { name: 'doctorName', label: "Doctor's Full Name", required: true, isSystem: true },
      { name: 'photo', label: "Doctor Photograph", required: true, isSystem: true },
      { name: 'clinicName', label: "Clinic / Hospital Name", required: true, isSystem: true }
    ]);

    const docNameField = activeFieldsList.find(f => f.name === 'doctorName');
    if (docNameField && docNameField.required !== false && !doctorName.trim()) {
      newErrors.doctorName = `Please enter ${docNameField.label || "the doctor's full name"}`;
    }

    const photoField = activeFieldsList.find(f => f.name === 'photo');
    if (photoField && photoField.required !== false && !photoFile && !photoPreview) {
      newErrors.photo = `Please upload and frame ${photoField.label || 'the doctor photograph'}`;
    }

    const clinicField = activeFieldsList.find(f => f.name === 'clinicName');
    if (clinicField && clinicField.required !== false && !clinicName.trim()) {
      newErrors.clinicName = `Please enter ${clinicField.label || 'the clinic or hospital name'}`;
    }

    activeFieldsList.filter(f => !f.isSystem).forEach(f => {
      if (f.required) {
        const val = extraFieldValues[f.name];
        if (val === undefined || val === null || String(val).trim() === '') {
          newCustomErrors[f.name] = `${f.label} is required`;
        }
      }
    });

    if (Object.keys(newErrors).length > 0 || Object.keys(newCustomErrors).length > 0) {
      setDoctorErrors(newErrors);
      setCustomFieldErrors(newCustomErrors);
      return;
    }

    setSavingDoctor(true);
    setDoctorErrors({ doctorName: '', photo: '', clinicName: '', server: '' });
    setCustomFieldErrors({});

    const formData = new FormData();
    formData.append('doctorName', doctorName.trim());
    formData.append('clinicName', clinicName.trim());
    if (photoFile) {
      formData.append('photo', photoFile);
    } else if (photoPreview) {
      formData.append('photoUrl', photoPreview);
    }
    formData.append('extraFields', JSON.stringify(extraFieldValues));
    Object.keys(extraFieldValues).forEach((k) => {
      formData.append(k, extraFieldValues[k]);
    });

    try {
      const res = await fetch('/api/user/doctors', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userAuth.token}`
        },
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        showToast(`Doctor details saved! Now select ${targetHabitsCount} heart promises.`, 'success');
        setActiveDoctor(data.doctor);
        fetchMyDoctors();
        // Advance to Step 2
        setCurrentStep(2);
      } else {
        setDoctorErrors((prev) => ({ ...prev, server: data.message || 'Failed to save doctor details. Please try again.' }));
      }
    } catch (err) {
      setDoctorErrors((prev) => ({ ...prev, server: 'Server error while saving doctor. Please try again.' }));
    } finally {
      setSavingDoctor(false);
    }
  };

  // Step 2: Toggle Habit selection (up to targetHabitsCount)
  const toggleHabit = (id) => {
    setHabitError('');
    if (selectedHabitIds.includes(id)) {
      setSelectedHabitIds((prev) => prev.filter((item) => item !== id));
    } else {
      if (selectedHabitIds.length >= targetHabitsCount) {
        setHabitError(`You can select a maximum of ${targetHabitsCount} habits. Deselect one first to choose another.`);
        return;
      }
      setSelectedHabitIds((prev) => [...prev, id]);
    }
  };

  // Helper: Auto-select first targetHabitsCount
  const handleSelectFirst10 = () => {
    setHabitError('');
    setSelectedHabitIds(activeHabits.slice(0, targetHabitsCount).map(h => h.id));
    showToast(`Selected first ${targetHabitsCount} evidence-based heart promises!`, 'info');
  };

  // Helper: Clear selection
  const handleClearHabits = () => {
    setHabitError('');
    setSelectedHabitIds([]);
  };

  // Step 2: Save Habits and Proceed to Step 3 (Poster Preview)
  const handleProceedToPoster = async () => {
    if (selectedHabitIds.length !== targetHabitsCount) {
      setHabitError(`Please select exactly ${targetHabitsCount} habits before proceeding. (Currently selected: ${selectedHabitIds.length}/${targetHabitsCount})`);
      return;
    }
    setHabitError('');

    if (!activeDoctor?._id) {
      setCurrentStep(3);
      return;
    }

    setSavingPromises(true);
    try {
      const chosenHabitTitles = activeHabits.filter((h) => selectedHabitIds.includes(h.id)).map((h) => h.title);
      const res = await fetch(`/api/user/doctors/${activeDoctor._id}/promises`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAuth.token}`
        },
        body: JSON.stringify({ selectedPromises: chosenHabitTitles })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${targetHabitsCount} Habits saved! Generating your custom poster.`, 'success');
        if (data.doctor) {
          setActiveDoctor(data.doctor);
        }
      }
    } catch (err) {
      console.error('Error saving promises:', err);
    } finally {
      setSavingPromises(false);
      setCurrentStep(3);
    }
  };

  // Step 3: Download Poster as PNG Image in World Heart Day Official Resolution
  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;

    setDownloading(true);
    showToast('Rendering Official World Heart Day Poster...', 'info');

    try {
      const safeDocName = (doctorName || activeDoctor?.doctorName || 'Doctor').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `World_Heart_Day_2026_Poster_${safeDocName}.png`;
      await downloadAsInstagramPost(posterRef.current, filename, activeDoctor?._id);
    } catch (err) {
      console.error('Download error:', err);
      showToast('Failed to generate image download. Please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // Reset to create another poster
  const handleStartNewPoster = () => {
    try {
      sessionStorage.removeItem('whd_active_doctor');
      sessionStorage.removeItem('whd_current_step');
      sessionStorage.removeItem('whd_selected_habit_ids');
    } catch {}
    setDoctorName('');
    setClinicName('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setRawPhotoSrc(null);
    setIsAdjustingPhoto(false);
    setSelectedHabitIds([]);
    setExtraFieldValues({});
    setCustomFieldErrors({});
    setActiveDoctor(null);
    setDoctorErrors({ doctorName: '', photo: '', clinicName: '', server: '' });
    setHabitError('');
    setCurrentStep(1);
  };

  // Pick an existing doctor from history to view/edit poster
  const handleSelectDoctorFromHistory = (doc) => {
    setActiveDoctor(doc);
    setDoctorName(doc.doctorName);
    setClinicName(doc.clinicName);
    setPhotoPreview(doc.photoUrl);
    setExtraFieldValues(doc.extraFields || {});
    if (doc.selectedPromises && doc.selectedPromises.length === targetHabitsCount) {
      const ids = activeHabits.filter((h) => doc.selectedPromises.includes(h.title)).map((h) => h.id);
      setSelectedHabitIds(ids.length === targetHabitsCount ? ids : activeHabits.slice(0, targetHabitsCount).map((h) => h.id));
      setCurrentStep(3);
    } else {
      setSelectedHabitIds([]);
      setCurrentStep(2);
    }
    if (setUserPortalView) {
      setUserPortalView('onboarding');
    }
    setSelectedDoctorDetail(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Selected habits list for poster display
  const selectedHabitObjects = activeHabits.filter((h) => selectedHabitIds.includes(h.id));

  if (!userAuth?.token || userAuth?.user?.role !== 'user') {
    return (
      <div className="auth-grid">
        <div className="glass-card auth-card pharma-card rounded-2xl relative overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 mb-6 -mx-10 -mt-10" style={{ width: 'calc(100% + 5rem)' }}></div>
          <div className="auth-header">
            <h3 className="font-display font-extrabold text-slate-900">Doctor Campaign Login</h3>
            <p className="text-slate-500 text-xs mt-1">Enter your assigned Pharma Employee ID and credentials</p>
          </div>

          <form onSubmit={handleUserLogin} noValidate>
            {loginErrors.server && (
              <div className="inbuilt-error-alert">
                <AlertCircle size={17} className="error-icon" />
                <span>{loginErrors.server}</span>
              </div>
            )}

            <div className="form-group">
              <label>1. Employee ID <span className="required">*</span></label>
              <div className={`input-icon-wrap ${loginErrors.employeeId ? 'has-error' : ''}`}>
                <span className="icon">🪪</span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Employee ID"
                  autoComplete="off"
                  value={employeeId}
                  onChange={(e) => {
                    setEmployeeId(e.target.value);
                    if (loginErrors.employeeId || loginErrors.server) {
                      setLoginErrors((prev) => ({ ...prev, employeeId: '', server: '' }));
                    }
                  }}
                />
              </div>
              {loginErrors.employeeId && (
                <div className="inbuilt-field-error">
                  <AlertCircle size={13} />
                  <span>{loginErrors.employeeId}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>2. Password <span className="required">*</span></label>
              <div className={`input-icon-wrap ${loginErrors.password ? 'has-error' : ''}`}>
                <span className="icon">🔒</span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  autoComplete="new-password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginErrors.password || loginErrors.server) {
                      setLoginErrors((prev) => ({ ...prev, password: '', server: '' }));
                    }
                  }}
                />
              </div>
              {loginErrors.password && (
                <div className="inbuilt-field-error">
                  <AlertCircle size={13} />
                  <span>{loginErrors.password}</span>
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Sign In as User'} <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // USER IS LOGGED IN: VIEW "ALL DOCTORS" JQUERY DATATABLE FLOW
  // =========================================================================
  if (userPortalView === 'doctors') {
    return (
      <div className="home-wizard-page" style={{ maxWidth: '1240px', margin: '0 auto', width: '100%', padding: '1.25rem 0.75rem' }}>
        {selectedDoctorDetail ? (
          /* LEVEL 3: DOCTOR DETAILS VIEW (FULL DETAILS & PROMISES) */
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
              <button
                type="button"
                className="btn-top-back"
                onClick={() => setSelectedDoctorDetail(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1rem', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
              >
                <ArrowLeft size={16} />
                <span>Back to All Doctors</span>
              </button>
            </div>

            <div className="medportal-doctor-details-card" style={{ background: '#fff', borderRadius: '16px', border: '1px solid #BAE6FD', position: 'relative', overflow: 'hidden', padding: '1.75rem', boxShadow: '0 10px 30px -5px rgba(2, 132, 199, 0.10)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #0D9488 0%, #0284C7 50%, #1E40AF 100%)', zIndex: 5 }} />
              <div className="medportal-doctor-details-grid">
                {/* Left Profile Sidebar */}
                <div className="medportal-doctor-sidebar-profile">
                  <img
                    src={getDoctorPhotoUrl(selectedDoctorDetail)}
                    alt={selectedDoctorDetail.doctorName}
                    className="medportal-doctor-avatar-large"
                    onError={(e) => handleDoctorPhotoError(e, selectedDoctorDetail.doctorName)}
                  />

                  <h2 className="medportal-doctor-name-title">Dr. {selectedDoctorDetail.doctorName}</h2>
                  <div className="medportal-doctor-clinic-tag" style={{ marginBottom: '0.2rem' }}>🏥 {selectedDoctorDetail.clinicName || 'Clinic'}</div>

                  {/* Prominent Badges for dynamic fields (Degree, Specialization, etc.) */}
                  {(() => {
                    const extraFieldsList = getDoctorExtraFields(selectedDoctorDetail);
                    if (extraFieldsList.length === 0) return null;
                    return (
                      <div className="medportal-doctor-badges-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'center', marginTop: '0.15rem', marginBottom: '0.85rem' }}>
                        {extraFieldsList.map((f) => (
                          <span
                            key={f.name}
                            style={{
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                            }}
                          >
                            <span>{f.name.toLowerCase().includes('degree') ? '🎓' : f.name.toLowerCase().includes('spec') ? '🩺' : '✨'}</span>
                            <span>{f.label}: <strong>{f.value}</strong></span>
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="medportal-doctor-meta-list">
                    <div className="medportal-doctor-meta-item">
                      <span className="medportal-doctor-meta-label">Registered By Employee</span>
                      <span className="medportal-doctor-meta-val">
                        {userAuth?.user?.employeeId || 'N/A'}
                      </span>
                    </div>

                    <div className="medportal-doctor-meta-item">
                      <span className="medportal-doctor-meta-label">Total Promises</span>
                      <span className="medportal-doctor-meta-val">
                        {selectedDoctorDetail.selectedPromises?.length || 0} Pledges
                      </span>
                    </div>

                    <div className="medportal-doctor-meta-item">
                      <span className="medportal-doctor-meta-label">Registered On</span>
                      <span className="medportal-doctor-meta-val">
                        {selectedDoctorDetail.createdAt ? new Date(selectedDoctorDetail.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>

                    <div className="medportal-doctor-meta-item">
                      <span className="medportal-doctor-meta-label">Clinic / Hospital</span>
                      <span className="medportal-doctor-meta-val">{selectedDoctorDetail.clinicName || 'N/A'}</span>
                    </div>

                    {/* Additional Form Fields in Doctor Profile */}
                    {getDoctorExtraFields(selectedDoctorDetail).map((f) => (
                      <div className="medportal-doctor-meta-item" key={f.name}>
                        <span className="medportal-doctor-meta-label">{f.label}</span>
                        <span className="medportal-doctor-meta-val" style={{ fontWeight: 700, color: 'var(--foreground)' }}>
                          {f.type === 'file' || (typeof f.value === 'string' && f.value.startsWith('/uploads/')) ? (
                            <a
                              href={f.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#0284c7',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#f0f9ff',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #bae6fd',
                                fontSize: '0.82rem'
                              }}
                            >
                              📎 View / Download File
                            </a>
                          ) : (
                            f.value
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '1.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <button
                      type="button"
                      className="btn-nav-all-doctors"
                      style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', borderRadius: '12px' }}
                      onClick={() => openPosterModal(selectedDoctorDetail)}
                    >
                      <Download size={16} />
                      <span>View & Download Poster</span>
                    </button>
                    <button
                      type="button"
                      className="medportal-btn-edit"
                      style={{ width: '100%', textAlign: 'center', padding: '0.65rem', borderRadius: '12px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      onClick={(e) => openEditDoctorModal(selectedDoctorDetail, e)}
                    >
                      <Edit2 size={15} />
                      <span>Edit Doctor Details</span>
                    </button>
                    <button
                      type="button"
                      className="medportal-btn-delete"
                      style={{ width: '100%', textAlign: 'center', padding: '0.65rem', borderRadius: '12px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      onClick={(e) => handleDeleteDoctor(selectedDoctorDetail._id, selectedDoctorDetail.doctorName, e)}
                    >
                      <Trash2 size={15} />
                      <span>Delete Doctor</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Pledged Promises */}
                <div className="medportal-promises-section">
                  <div className="medportal-promises-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
                      <Sparkles size={20} color="var(--primary-red)" />
                      <span>Heart Health Promises Pledged</span>
                    </h3>
                    <span
                      style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontWeight: 700,
                        fontSize: '0.84rem'
                      }}
                    >
                      {selectedDoctorDetail.selectedPromises?.length || 0} Promises
                    </span>
                  </div>

                  {!selectedDoctorDetail.selectedPromises || selectedDoctorDetail.selectedPromises.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                      No promises selected for this doctor yet.
                    </div>
                  ) : (
                    <div className="medportal-promises-grid" style={{ marginTop: '1.25rem' }}>
                      {selectedDoctorDetail.selectedPromises.map((promise, index) => {
                        const hasDash = typeof promise === 'string' && promise.includes(' - ');
                        const title = hasDash ? promise.split(' - ')[0] : promise;
                        const desc = hasDash ? promise.split(' - ')[1] : '';

                        return (
                          <div key={index} className="medportal-promise-card-item">
                            <div className="medportal-promise-num-badge">{index + 1}</div>
                            <div>
                              <div className="medportal-promise-text-title">{title}</div>
                              {desc && <div className="medportal-promise-text-sub">{desc}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* LEVEL 2: JQUERY DOCTORS DATATABLE FLOW */
          <div style={{ width: '100%' }}>
            {/* DataTable Card */}
            <div className="medportal-table-card pharma-card rounded-2xl overflow-hidden" style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              {/* Controls */}
              <div className="medportal-table-controls">
                <div className="medportal-entries-selector">
                  <span>Show</span>
                  <CustomDropdown
                    className="custom-dropdown-compact"
                    value={doctorEntriesPerPage}
                    options={[5, 10, 25, 50]}
                    onChange={(val) => {
                      setDoctorEntriesPerPage(Number(val));
                      setDoctorCurrentPage(1);
                    }}
                  />
                  <span>entries</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="medportal-btn-export"
                    onClick={handleExportDoctors}
                    title="Export Doctors to CSV / Excel"
                  >
                    <Download size={14} />
                    <span>Export Doctors</span>
                  </button>

                  <div className="medportal-search-wrap">
                    <span>Search:</span>
                    <input
                      type="text"
                      className="medportal-search-input"
                      placeholder="Search doctor or clinic..."
                      value={doctorSearch}
                      onChange={(e) => {
                        setDoctorSearch(e.target.value);
                        setDoctorCurrentPage(1);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Table Wrapper */}
              <div className="medportal-table-wrapper">
                <table className="medportal-table">
                  <thead>
                    <tr>
                      <th
                        className="medportal-th-sortable"
                        onClick={() => toggleDoctorSort('doctorName')}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="medportal-th-content">
                          <span>DOCTOR NAME</span>
                          {renderSortArrow(doctorSortKey, 'doctorName', doctorSortDir)}
                        </div>
                      </th>
                      <th
                        className="medportal-th-sortable"
                        onClick={() => toggleDoctorSort('clinicName')}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="medportal-th-content">
                          <span>CLINIC NAME</span>
                          {renderSortArrow(doctorSortKey, 'clinicName', doctorSortDir)}
                        </div>
                      </th>
                      <th
                        className="medportal-th-sortable"
                        onClick={() => toggleDoctorSort('promises')}
                        style={{ textAlign: 'center', cursor: 'pointer' }}
                      >
                        <div className="medportal-th-content" style={{ justifyContent: 'center' }}>
                          <span>PROMISES</span>
                          {renderSortArrow(doctorSortKey, 'promises', doctorSortDir)}
                        </div>
                      </th>
                      <th
                        className="medportal-th-sortable"
                        onClick={() => toggleDoctorSort('createdAt')}
                        style={{ textAlign: 'center', cursor: 'pointer' }}
                      >
                        <div className="medportal-th-content" style={{ justifyContent: 'center' }}>
                          <span>DATE CREATED</span>
                          {renderSortArrow(doctorSortKey, 'createdAt', doctorSortDir)}
                        </div>
                      </th>
                      <th style={{ textAlign: 'center' }}>ENABLED</th>
                      <th style={{ textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingDoctors && (
                      <tr>
                        <td colSpan={6} className="medportal-td-empty">
                          Loading registered doctors...
                        </td>
                      </tr>
                    )}

                    {!loadingDoctors && currentDoctors.length === 0 && (
                      <tr>
                        <td colSpan={6} className="medportal-td-empty" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                          {doctorSearch.trim() ? (
                            <div>No matching doctors found for "{doctorSearch}".</div>
                          ) : (
                            <div>
                              <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#64748b' }}>
                                No doctors registered under this employee yet.
                              </p>
                              <button
                                type="button"
                                className="btn-nav-all-doctors"
                                onClick={() => {
                                  if (setUserPortalView) setUserPortalView('onboarding');
                                  setCurrentStep(1);
                                }}
                              >
                                <Plus size={15} />
                                <span>Register Your First Doctor</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}

                    {!loadingDoctors &&
                      currentDoctors.map((doc) => {
                        const formattedDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A';
                        const promiseCount = doc.selectedPromises?.length || 0;
                        const isEnabled = doc.status !== 'inactive';

                        return (
                          <tr
                            key={doc._id}
                            onClick={() => setSelectedDoctorDetail(doc)}
                            className="medportal-clickable-row"
                            title={`Click to view full details for Dr. ${doc.doctorName}`}
                          >
                            <td className="medportal-td-admin">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <img
                                  src={getDoctorPhotoUrl(doc)}
                                  alt={doc.doctorName}
                                  className="medportal-doctor-thumb"
                                  onError={(e) => handleDoctorPhotoError(e, doc.doctorName)}
                                />
                                <div>
                                  <span className="medportal-drilldown-link">
                                    <strong>Dr. {doc.doctorName}</strong>
                                  </span>
                                  {(() => {
                                    const extraList = getDoctorExtraFields(doc);
                                    if (extraList.length === 0) return null;
                                    return (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '2px' }}>
                                        {extraList.map((f) => (
                                          <span
                                            key={f.name}
                                            style={{
                                              fontSize: '0.70rem',
                                              color: '#0369a1',
                                              background: '#f0f9ff',
                                              border: '1px solid #bae6fd',
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                              fontWeight: 600
                                            }}
                                          >
                                            {f.value}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                                {doc.clinicName || 'Clinic'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  background: '#ecfdf5',
                                  color: '#047857',
                                  padding: '3px 10px',
                                  borderRadius: '10px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700
                                }}
                              >
                                {promiseCount} Pledges
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                              {formattedDate}
                            </td>
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <label className="medportal-switch" title={isEnabled ? 'Enabled - Click to disable' : 'Disabled - Click to enable'}>
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={() => handleToggleDoctorStatus(doc)}
                                />
                                <span className="medportal-slider" />
                              </label>
                            </td>
                            <td className="medportal-td-action" style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  className="medportal-pill-edit"
                                  onClick={(e) => openEditDoctorModal(doc, e)}
                                  title={`Edit Dr. ${doc.doctorName}`}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="medportal-pill-delete"
                                  onClick={(e) => handleDeleteDoctor(doc._id, doc.doctorName, e)}
                                  title={`Delete Dr. ${doc.doctorName}`}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Pagination & Info Footer */}
              <div className="medportal-pagination-footer">
                <div className="medportal-pagination-info">
                  {filteredDoctors.length === 0
                    ? 'Showing 0 to 0 of 0 entries'
                    : `Showing ${startDoctorIndex} to ${endDoctorIndex} of ${filteredDoctors.length} entries for "${userAuth?.user?.employeeId}"`}
                  {doctorSearch.trim() && ` (filtered from ${myDoctors.length} total)`}
                </div>

                <div className="medportal-pagination-nav">
                  <button
                    type="button"
                    className="medportal-page-btn"
                    disabled={doctorCurrentPage <= 1}
                    onClick={() => setDoctorCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalDoctorPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      className={`medportal-page-num ${doctorCurrentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setDoctorCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="medportal-page-btn"
                    disabled={doctorCurrentPage >= totalDoctorPages}
                    onClick={() => setDoctorCurrentPage((p) => Math.min(totalDoctorPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {renderEditDoctorModal()}
        {renderPosterModal()}
      </div>
    );
  }

  // =========================================================================
  // USER IS LOGGED IN: SHOW CENTERED WIZARD BOX
  // =========================================================================
  return (
    <div className="home-wizard-page">
      {/* Top Left Back Button: only shown if there is a previous step to navigate back to */}
      {(currentStep > 1 || showDoctorHistory) && (
        <div className="top-back-row">
          <button
            type="button"
            className="btn-top-back"
            onClick={handleTopBack}
            title={
              showDoctorHistory
                ? 'Back to Onboarding'
                : currentStep === 3
                  ? 'Back to Edit Promises'
                  : 'Back to Doctor Information'
            }
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </div>
      )}

      <div className={`wizard-outer-wrapper ${currentStep === 1 || currentStep === 2
          ? 'details-step-wrapper'
          : currentStep === 3
            ? 'poster-step-wrapper'
            : ''
        }`}>


        {/* Expandable History Drawer if user wants to see previously saved doctors */}
        {showDoctorHistory && myDoctors.length > 0 && (
          <div className="history-drawer-card glass-card">
            <div className="history-header">
              <h4>Previously Registered Doctors ({myDoctors.length})</h4>
              <span className="history-hint">Click on any doctor to view or re-generate their poster</span>
            </div>
            <div className="history-grid">
              {myDoctors.map((doc) => (
                <div
                  key={doc._id}
                  className="history-doc-item"
                  onClick={() => handleSelectDoctorFromHistory(doc)}
                >
                  <img
                    src={getDoctorPhotoUrl(doc)}
                    alt={doc.doctorName}
                    onError={(e) => handleDoctorPhotoError(e, doc.doctorName)}
                  />
                  <div>
                    <strong>{doc.doctorName}</strong>
                    <p>{doc.clinicName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep !== 3 ? (
          <div className={`wizard-center-box glass-card details-card pharma-card rounded-2xl relative overflow-hidden ${currentStep === 1 ? 'doctor-details-active' : 'promises-step-active'}`}>
            <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 mb-6 -mx-8 -mt-8" style={{ width: 'calc(100% + 4rem)' }}></div>
            {/* =================================================================
              STEP 1: DOCTOR DETAILS FORM
              ================================================================= */}
            {currentStep === 1 && (
              <div className="step-content-pane">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200/70">
                    <i className="ph-fill ph-shield-check text-teal-600 text-xs"></i>
                    Step 1 of 2 • Registration
                  </span>
                </div>
                <div className="step-headline">
                  <h3 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">Doctor Information</h3>
                  <p>Enter the doctor's details and upload their photograph to feature on the personalized World Heart Day clinical pledge poster.</p>
                </div>

                <form onSubmit={handleSaveAndNext} noValidate>
                  {doctorErrors.server && (
                    <div className="inbuilt-error-alert">
                      <AlertCircle size={17} className="error-icon" />
                      <span>{doctorErrors.server}</span>
                    </div>
                  )}

                  {/* Dynamic Form Fields */}
                  {(configsLoaded ? formFields : (formFields.length > 0 ? formFields : [
                    { name: 'doctorName', label: "Doctor's Full Name", placeholder: "e.g. Dr. Sneha Roy, MD (Cardiology)", required: true, isSystem: true },
                    { name: 'photo', label: "Doctor Photograph", placeholder: "Upload or drag & drop doctor photograph", required: true, isSystem: true },
                    { name: 'clinicName', label: "Clinic / Hospital Name", placeholder: "e.g. Heart Care Clinic", required: true, isSystem: true }
                  ])).map((field, index) => {
                    if (field.name === 'doctorName') {
                      return (
                        <div className="form-group" key="field-doctorName">
                          <label>
                            <span className="badge-step-digit">{index + 1}</span> {field.label || "Doctor's Full Name"} {field.required !== false && <span className="required">*</span>}
                          </label>
                          <div className={`input-icon-wrap ${doctorErrors.doctorName ? 'has-error' : ''}`}>
                            <span className="icon"><Stethoscope size={18} /></span>
                            <input
                              type="text"
                              className="form-control"
                              placeholder={field.placeholder || "e.g. Dr. Sneha Roy, MD (Cardiology)"}
                              value={doctorName}
                              onChange={(e) => {
                                setDoctorName(e.target.value);
                                if (doctorErrors.doctorName || doctorErrors.server) {
                                  setDoctorErrors((prev) => ({ ...prev, doctorName: '', server: '' }));
                                }
                              }}
                            />
                          </div>
                          {doctorErrors.doctorName && (
                            <div className="inbuilt-field-error">
                              <AlertCircle size={14} />
                              <span>{doctorErrors.doctorName}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (field.name === 'photo') {
                      return (
                        <div className="form-group" key="field-photo">
                          <label>
                            <span className="badge-step-digit">{index + 1}</span> {field.label || "Doctor Photograph"} {field.required !== false && <span className="required">*</span>}
                          </label>

                          {!photoPreview ? (
                            <div
                              className={`photo-uploader-box ${isDragOver ? 'dragover' : ''} ${doctorErrors.photo ? 'has-error' : ''}`}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            >
                              <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={(e) => handlePhotoChange(e.target.files[0])}
                                style={{ display: 'none' }}
                              />
                              <div className="upload-placeholder-content">
                                <div className="upload-icon-circle">
                                  <UploadCloud size={28} />
                                </div>
                                <h4>Click or drag &amp; drop Doctor Photo</h4>
                                <p>Supports high-resolution JPEG, PNG or WEBP</p>
                              </div>
                            </div>
                          ) : (
                            <div className="photo-preview-wrapper-box">
                              <div className="doctor-preview-circle">
                                <img src={photoPreview} alt="Doctor Preview" />
                              </div>
                              <div className="photo-preview-details">
                                <span className="photo-status-badge">
                                  <Check size={13} /> Photo Framed
                                </span>
                                <div className="photo-preview-actions">
                                  <button
                                    type="button"
                                    className="btn-adjust-photo"
                                    onClick={handleReopenAdjuster}
                                  >
                                    <Crop size={14} /> Adjust / Crop Photo
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-change-photo"
                                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                  >
                                    Change Photo
                                  </button>
                                  <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={(e) => handlePhotoChange(e.target.files[0])}
                                    style={{ display: 'none' }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {isAdjustingPhoto && rawPhotoSrc && (
                            <PhotoAdjusterCanvas
                              imageSrc={rawPhotoSrc}
                              initialSettings={photoAdjustSettings}
                              onApply={handleApplyAdjustedPhoto}
                              onCancel={handleCancelAdjustPhoto}
                            />
                          )}
                          {doctorErrors.photo && (
                            <div className="inbuilt-field-error">
                              <AlertCircle size={14} />
                              <span>{doctorErrors.photo}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (field.name === 'clinicName') {
                      return (
                        <div className="form-group" key="field-clinicName">
                          <label>
                            <span className="badge-step-digit">{index + 1}</span> {field.label || "Clinic / Hospital Name"} {field.required !== false && <span className="required">*</span>}
                          </label>
                          <div className={`input-icon-wrap ${doctorErrors.clinicName ? 'has-error' : ''}`}>
                            <span className="icon"><Building2 size={18} /></span>
                            <input
                              type="text"
                              className="form-control"
                              placeholder={field.placeholder || "e.g. Apollo Heart & Vascular Institute"}
                              value={clinicName}
                              onChange={(e) => {
                                setClinicName(e.target.value);
                                if (doctorErrors.clinicName || doctorErrors.server) {
                                  setDoctorErrors((prev) => ({ ...prev, clinicName: '', server: '' }));
                                }
                              }}
                            />
                          </div>
                          {doctorErrors.clinicName && (
                            <div className="inbuilt-field-error">
                              <AlertCircle size={14} />
                              <span>{doctorErrors.clinicName}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Custom Dynamic Field
                    return (
                      <div className="form-group" key={`custom-field-${field.name}`}>
                        <label>
                          <span className="badge-step-digit">{index + 1}</span> {field.label} {field.required && <span className="required">*</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            className={`form-control ${customFieldErrors[field.name] ? 'has-error' : ''}`}
                            placeholder={field.placeholder || `Enter ${field.label}`}
                            value={extraFieldValues[field.name] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setExtraFieldValues((prev) => ({ ...prev, [field.name]: val }));
                              if (customFieldErrors[field.name]) {
                                setCustomFieldErrors((prev) => ({ ...prev, [field.name]: '' }));
                              }
                            }}
                            rows={3}
                            style={{ width: '100%', borderRadius: '12px', padding: '0.75rem 1rem' }}
                          />
                        ) : field.type === 'select' ? (
                          <CustomDropdown
                            className={customFieldErrors[field.name] ? 'has-error' : ''}
                            placeholder={`-- Select ${field.label} --`}
                            value={extraFieldValues[field.name] || ''}
                            options={(field.options || []).map((opt) => ({ value: opt, label: opt }))}
                            onChange={(val) => {
                              setExtraFieldValues((prev) => ({ ...prev, [field.name]: val }));
                              if (customFieldErrors[field.name]) {
                                setCustomFieldErrors((prev) => ({ ...prev, [field.name]: '' }));
                              }
                            }}
                          />
                        ) : field.type === 'file' ? (
                          <div className={`file-upload-dynamic-wrap ${customFieldErrors[field.name] ? 'has-error' : ''}`}>
                            <input
                              type="file"
                              id={`custom-file-${field.name}`}
                              className="form-control"
                              style={{ padding: '0.5rem 0.75rem', borderRadius: '12px' }}
                              onChange={(e) => {
                                const f = e.target.files && e.target.files[0];
                                if (f) {
                                  setExtraFieldValues((prev) => ({ ...prev, [field.name]: f }));
                                  if (customFieldErrors[field.name]) {
                                    setCustomFieldErrors((prev) => ({ ...prev, [field.name]: '' }));
                                  }
                                }
                              }}
                            />
                            {extraFieldValues[field.name] && typeof extraFieldValues[field.name] === 'object' && extraFieldValues[field.name].name && (
                              <div style={{ fontSize: '0.82rem', color: '#0d9488', marginTop: '6px', fontWeight: 600 }}>
                                Selected: {extraFieldValues[field.name].name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={`input-icon-wrap ${customFieldErrors[field.name] ? 'has-error' : ''}`}>
                            <span className="icon"><Sparkles size={18} /></span>
                            <input
                              type={field.type === 'number' ? 'number' : 'text'}
                              className="form-control"
                              placeholder={field.placeholder || `Enter ${field.label}`}
                              value={extraFieldValues[field.name] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setExtraFieldValues((prev) => ({ ...prev, [field.name]: val }));
                                if (customFieldErrors[field.name]) {
                                  setCustomFieldErrors((prev) => ({ ...prev, [field.name]: '' }));
                                }
                              }}
                            />
                          </div>
                        )}
                        {customFieldErrors[field.name] && (
                          <div className="inbuilt-field-error">
                            <AlertCircle size={14} />
                            <span>{customFieldErrors[field.name]}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Action Button: Save & Next */}
                  <div className="step-actions-footer">
                    <button
                      type="submit"
                      className="btn-primary btn-save-next"
                      disabled={savingDoctor}
                    >
                      {savingDoctor ? 'Saving Doctor...' : 'Save & Next'} <ArrowRight size={18} />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* =================================================================
              STEP 2: HABITS LISTED (SELECT TARGET HABITS)
              ================================================================= */}
            {currentStep === 2 && (
              <div className="step-content-pane">
                <div className="step-headline step-headline-with-actions" style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <div className="headline-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <h3 style={{ margin: 0 }}>Select {targetHabitsCount} Heart Promises</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {selectedHabitIds.length} / {targetHabitsCount} Selected
                      </span>
                    </div>
                    <p style={{ marginTop: '0.35rem' }}>
                      Doctor: <strong>{doctorName || activeDoctor?.doctorName}</strong> • {clinicName || activeDoctor?.clinicName}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {selectedHabitIds.length > 0 && (
                      <button type="button" className="btn-chip secondary" onClick={handleClearHabits}>
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {habitError && (
                  <div className="inbuilt-status-error" style={{ marginBottom: '1.25rem' }}>
                    <AlertCircle size={15} />
                    <span>{habitError}</span>
                  </div>
                )}

                {/* Grid of the Habits */}
                <div className="habits-selection-grid">
                  {activeHabits.map((habit) => {
                    const isSelected = selectedHabitIds.includes(habit.id);
                    return (
                      <div
                        key={habit.id}
                        className={`habit-card-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleHabit(habit.id)}
                      >
                        <div className="habit-card-header">
                          <span className="habit-icon">{habit.icon}</span>
                          <div className={`habit-checkbox ${isSelected ? 'checked' : ''}`}>
                            {isSelected ? <Check size={14} /> : null}
                          </div>
                        </div>
                        <h4>
                          <span className="habit-num">#{habit.id}</span> {habit.title}
                        </h4>
                        <p>{habit.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation Action */}
                <div className="step-actions-footer">
                  <button
                    type="button"
                    className="btn-primary btn-save-next"
                    disabled={selectedHabitIds.length !== targetHabitsCount || savingPromises}
                    onClick={handleProceedToPoster}
                  >
                    {savingPromises ? (
                      'Saving Promises...'
                    ) : (
                      <>
                        <span>Selected ({selectedHabitIds.length} / {targetHabitsCount})</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ===================================================================
             STEP 3: POSTER PREVIEW & DOWNLOAD BUTTON (NO OUTER CARD)
             =================================================================== */
          <div className="poster-preview-standalone" key="step-3-poster-preview">

            {/* THE DIGITAL POSTER CANVAS FRAME (EXPORTABLE VIA HTML2CANVAS) */}
            <div className="poster-export-wrapper">
              <div
                ref={posterRef}
                id="world-heart-day-poster"
                className="image-poster-canvas"
              >
                {/* Clean Official Poster Template */}
                <img
                  src="/assets/world_heart_day_poster_clean.jpg"
                  alt="World Heart Day 2026 Poster"
                  className="poster-base-img"
                />

                {/* Form Info Overlaid by Coordinates: Doctor Photo Aperture */}
                <div className="poster-coord-photo-wrap">
                  <img
                    src={photoPreview || getDoctorPhotoUrl(activeDoctor)}
                    alt={doctorName || activeDoctor?.doctorName}
                    crossOrigin="anonymous"
                    onError={(e) => handleDoctorPhotoError(e, doctorName || activeDoctor?.doctorName)}
                  />
                </div>

                {/* Form Info Overlaid by Coordinates: Doctor Details */}
                <div className="poster-coord-details">
                  <div className="poster-coord-name">
                    {(() => {
                      const rawName = (doctorName || activeDoctor?.doctorName || 'Doctor Name').trim();
                      return rawName.toLowerCase().startsWith('dr') ? rawName : `Dr. ${rawName}`;
                    })()}
                  </div>
                  {(() => {
                    const docForExtra = activeDoctor || { extraFields: extraFieldValues };
                    const extraList = getDoctorExtraFields(docForExtra);
                    if (extraList.length === 0) return null;
                    return (
                      <div className="poster-coord-quals">
                        {extraList.slice(0, 3).map((f, i) => (
                          <div key={i} className="poster-coord-qual-item" title={f.value}>
                            {f.value}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="poster-coord-clinic">
                    {clinicName || activeDoctor?.clinicName || 'Heart Care Clinic'}
                  </div>
                </div>

                {/* Overlaid 10 Selected Promises */}
                <PosterPromisesOverlay doc={activeDoctor} selectedHabitIds={selectedHabitIds} fallbackList={activeHabits} />
              </div>
            </div>

            {/* ===============================================================
              DOWNLOAD BUTTON RIGHT BELOW THE POSTER
              =============================================================== */}
            <div className="poster-download-action-bar">
              <button
                type="button"
                className="btn-primary btn-download-poster"
                disabled={downloading}
                onClick={handleDownloadPoster}
              >
                <Download size={20} />
                <span>{downloading ? 'Rendering Poster...' : 'Download Poster'}</span>
              </button>
            </div>
          </div>
        )}
        {renderEditDoctorModal()}
        {renderPosterModal()}
      </div>
    </div>
  );
}
