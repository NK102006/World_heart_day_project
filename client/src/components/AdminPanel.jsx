import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ArrowLeft,
  Shield,
  User as UserIcon,
  Stethoscope,
  Sparkles,
  Camera,
  Check,
  Menu,
  Sliders,
  LogOut,
  Download,
  Edit2,
  Building2,
  Calendar,
  Heart,
  AlertCircle
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { ALL_HABITS } from '../constants/habits';
import PosterPromisesOverlay from './PosterPromisesOverlay';
import CustomDropdown from './CustomDropdown';
import { exportToCSV } from '../utils/exportCsv';
import './SuperadminPanel.css';

export default function AdminPanel({ adminAuth, onLoginSuccess, showToast, onLogout }) {
  // Login State (when unauthenticated)
  const [adminName, setAdminName] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState({ name: '', password: '', server: '' });

  // Inbuilt modal form validation error states
  const [addUserErrors, setAddUserErrors] = useState({ employeeId: '', password: '', server: '' });
  const [editUserErrors, setEditUserErrors] = useState({ employeeId: '', password: '', server: '' });
  const [editDoctorErrors, setEditDoctorErrors] = useState({ doctorName: '', clinicName: '', server: '' });

  // Admin Data State
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mobile Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Navigation Flow State: 'employees' | 'doctors' | 'doctordetails'
  const [flowLevel, setFlowLevel] = useState('employees');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // =========================================================================
  // JQUERY DATATABLE CONTROLS: EMPLOYEES (USERS) TABLE
  // =========================================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [empSortKey, setEmpSortKey] = useState('employeeId');
  const [empSortDir, setEmpSortDir] = useState('asc'); // 'asc' | 'desc'

  // =========================================================================
  // JQUERY DATATABLE CONTROLS: DOCTORS TABLE
  // =========================================================================
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorEntriesPerPage, setDoctorEntriesPerPage] = useState(10);
  const [doctorCurrentPage, setDoctorCurrentPage] = useState(1);
  const [doctorSortKey, setDoctorSortKey] = useState('createdAt');
  const [doctorSortDir, setDoctorSortDir] = useState('desc'); // 'asc' | 'desc'

  // =========================================================================
  // MODALS STATE
  // =========================================================================
  // Add User modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserEmpId, setNewUserEmpId] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Edit User modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editEmpId, setEditEmpId] = useState('');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit Doctor modal state
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editDoctorName, setEditDoctorName] = useState('');
  const [editClinicName, setEditClinicName] = useState('');
  const [editDoctorPhotoFile, setEditDoctorPhotoFile] = useState(null);
  const [editDoctorPhotoPreview, setEditDoctorPhotoPreview] = useState('');
  const [editDoctorPromises, setEditDoctorPromises] = useState([]);
  const [editDoctorExtraFields, setEditDoctorExtraFields] = useState({});
  const [savingEditDoctor, setSavingEditDoctor] = useState(false);

  // Dynamic config fields & promises
  const [formFields, setFormFields] = useState([]);
  const [promiseList, setPromiseList] = useState([]);

  // Poster Modal State
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [posterModalDoctor, setPosterModalDoctor] = useState(null);
  const [modalDownloading, setModalDownloading] = useState(false);
  const modalPosterRef = useRef(null);

  // =========================================================================
  // DATA FETCHING & NAVIGATION HANDLERS
  // =========================================================================
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [uRes, dRes, fRes, pRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${adminAuth.token}` } }),
        fetch('/api/admin/doctors', { headers: { Authorization: `Bearer ${adminAuth.token}` } }),
        fetch('/api/config/fields'),
        fetch('/api/config/promises')
      ]);

      if (uRes.status === 401 || dRes.status === 401) {
        if (onLogout) onLogout('admin');
        return;
      }

      const [uData, dData, fData, pData] = await Promise.all([
        uRes.json(),
        dRes.json(),
        fRes.json(),
        pRes.json()
      ]);

      if (uData.success && uData.users) {
        setUsers(uData.users);
      }
      if (dData.success && dData.doctors) {
        setDoctors(dData.doctors);
      }
      if (fData.success && fData.fields) {
        setFormFields(fData.fields);
      }
      if (pData.success && pData.promises) {
        setPromiseList(pData.promises);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeClick = (user) => {
    setSelectedEmployee(user);
    setSelectedDoctor(null);
    setDoctorSearch('');
    setDoctorCurrentPage(1);
    setFlowLevel('doctors');
    setIsMobileMenuOpen(false);
  };

  const handleDoctorClick = (doctor) => {
    setSelectedDoctor(doctor);
    setFlowLevel('doctordetails');
    setIsMobileMenuOpen(false);
  };

  const goToEmployees = () => {
    setFlowLevel('employees');
    setSelectedEmployee(null);
    setSelectedDoctor(null);
    setIsMobileMenuOpen(false);
  };

  const goToDoctors = () => {
    setFlowLevel('doctors');
    setSelectedDoctor(null);
    setIsMobileMenuOpen(false);
  };

  // =========================================================================
  // INITIAL DATA FETCH & POPSTATE NAVIGATION
  // =========================================================================
  useEffect(() => {
    if (adminAuth?.token && adminAuth?.user?.role === 'admin') {
      fetchAdminData();
    }
  }, [adminAuth]);

  // Sync selected references if data changes in background
  useEffect(() => {
    if (selectedEmployee && users.length > 0) {
      const refreshedEmp = users.find((u) => String(u._id) === String(selectedEmployee._id));
      if (
        refreshedEmp &&
        (refreshedEmp.employeeId !== selectedEmployee.employeeId ||
          refreshedEmp.name !== selectedEmployee.name ||
          refreshedEmp.doctorsCount !== selectedEmployee.doctorsCount)
      ) {
        setSelectedEmployee(refreshedEmp);
      }
    }
  }, [users, selectedEmployee]);

  useEffect(() => {
    if (selectedDoctor && doctors.length > 0) {
      const refreshedDoc = doctors.find((d) => String(d._id) === String(selectedDoctor._id));
      if (refreshedDoc && refreshedDoc.doctorName !== selectedDoctor.doctorName) {
        setSelectedDoctor(refreshedDoc);
      }
    }
  }, [doctors, selectedDoctor]);

  // Clear credentials if admin is logged out
  useEffect(() => {
    if (!adminAuth || adminAuth?.user?.role !== 'admin') {
      setAdminName('');
      setPassword('');
    }
  }, [adminAuth]);

  // =========================================================================
  // LOGIN HANDLER
  // =========================================================================
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!adminName.trim()) {
      errs.name = 'Admin Name is required';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errs).length > 0) {
      setLoginErrors(errs);
      return;
    }

    setLoginLoading(true);
    setLoginErrors({ name: '', password: '', server: '' });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: adminName.trim(), password, role: 'admin' })
      });
      const data = await res.json();
      if (data.success) {
        setAdminName('');
        setPassword('');
        setLoginErrors({ name: '', password: '', server: '' });
        onLoginSuccess('admin', data.token, data.user);
        showToast('Admin authenticated successfully', 'success');
      } else {
        setLoginErrors((prev) => ({ ...prev, server: data.message || 'Invalid Admin Name or Password' }));
      }
    } catch (err) {
      setLoginErrors((prev) => ({ ...prev, server: 'Network error during admin login. Please check connection.' }));
    } finally {
      setLoginLoading(false);
    }
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

  // =========================================================================
  // USER CRUD HANDLERS
  // =========================================================================
  const handleCreateUser = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!newUserEmpId.trim()) {
      errs.employeeId = 'Employee ID is required';
    }
    if (!newUserPassword.trim()) {
      errs.password = 'Password is required';
    } else if (newUserPassword.trim().length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errs).length > 0) {
      setAddUserErrors(errs);
      return;
    }

    setCreatingUser(true);
    setAddUserErrors({ employeeId: '', password: '', server: '' });
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuth.token}`
        },
        body: JSON.stringify({
          employeeId: newUserEmpId.trim(),
          password: newUserPassword.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`User "${data.user.employeeId}" registered successfully!`, 'success');
        setNewUserEmpId('');
        setNewUserPassword('');
        setAddUserErrors({ employeeId: '', password: '', server: '' });
        setShowAddModal(false);
        fetchAdminData();
      } else {
        setAddUserErrors((prev) => ({ ...prev, server: data.message || 'Failed to register user' }));
      }
    } catch (err) {
      setAddUserErrors((prev) => ({ ...prev, server: 'Error registering user. Please try again.' }));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (id, empId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete User "${empId}"? All doctors registered by this user will also be deleted.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminAuth.token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'User deleted successfully', 'success');
        fetchAdminData();
        if (selectedEmployee && selectedEmployee._id === id) {
          goToEmployees();
        }
      } else {
        showToast(data.message || 'Error deleting user', 'error');
      }
    } catch (err) {
      showToast('Error deleting user', 'error');
    }
  };

  const openEditUserModal = (user, e) => {
    if (e) e.stopPropagation();
    setEditingUser(user);
    setEditEmpId(user.employeeId || '');
    setEditPassword('');
    setEditUserErrors({ employeeId: '', password: '', server: '' });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!editEmpId.trim()) {
      errs.employeeId = 'Employee ID is required';
    }
    if (editPassword.trim()) {
      if (editPassword.trim().length < 6) {
        errs.password = 'Password must be at least 6 characters';
      }
    }

    if (Object.keys(errs).length > 0) {
      setEditUserErrors(errs);
      return;
    }

    setSavingEdit(true);
    setEditUserErrors({ employeeId: '', password: '', server: '' });
    try {
      const payload = {
        employeeId: editEmpId.trim()
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuth.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Employee "${data.user.employeeId}" updated successfully!`, 'success');
        setShowEditModal(false);
        setEditingUser(null);
        setEditUserErrors({ employeeId: '', password: '', server: '' });
        fetchAdminData();
        if (selectedEmployee && selectedEmployee._id === editingUser._id) {
          setSelectedEmployee((prev) => ({ ...prev, ...data.user }));
        }
      } else {
        setEditUserErrors((prev) => ({ ...prev, server: data.message || 'Failed to update employee' }));
      }
    } catch (err) {
      setEditUserErrors((prev) => ({ ...prev, server: 'Error updating employee' }));
    } finally {
      setSavingEdit(false);
    }
  };

  // =========================================================================
  // DOCTOR CRUD HANDLERS
  // =========================================================================
  const handleDeleteDoctor = async (id, doctorName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete Dr. "${doctorName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/doctors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminAuth.token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Doctor "${doctorName}" deleted successfully`, 'success');
        fetchAdminData();
        if (selectedDoctor && String(selectedDoctor._id) === String(id)) {
          goToDoctors();
        }
      } else {
        showToast(data.message || 'Error deleting doctor', 'error');
      }
    } catch (err) {
      showToast('Error deleting doctor', 'error');
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

  const openEditDoctorModal = (doctor, e) => {
    if (e) e.stopPropagation();
    setEditingDoctor(doctor);
    setEditDoctorName(doctor.doctorName || '');
    setEditClinicName(doctor.clinicName || '');
    setEditDoctorPhotoFile(null);
    setEditDoctorPhotoPreview(doctor.photoUrl || '');
    let parsedExtra = {};
    if (doctor.extraFields) {
      if (typeof doctor.extraFields === 'string') {
        try { parsedExtra = JSON.parse(doctor.extraFields); } catch (e) { parsedExtra = {}; }
      } else if (typeof doctor.extraFields === 'object') {
        parsedExtra = { ...doctor.extraFields };
      }
    }
    (formFields || []).filter(f => !f.isSystem).forEach(f => {
      if (parsedExtra[f.name] === undefined && doctor[f.name] !== undefined) {
        parsedExtra[f.name] = doctor[f.name];
      }
    });
    setEditDoctorExtraFields(parsedExtra);

    const activePromises = promiseList.length > 0 ? promiseList : ALL_HABITS;
    const existingPromises = Array.isArray(doctor.selectedPromises) ? doctor.selectedPromises : [];
    const matchedPromises = activePromises.filter((h) =>
      existingPromises.some((p) => p === h.title || p.startsWith(h.title))
    ).map((h) => h.title);

    setEditDoctorPromises(initialPromises);
    setEditDoctorErrors({ doctorName: '', clinicName: '', server: '' });
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
      if (editDoctorPromises.length >= 10) {
        showToast('You cannot select more than 10 promises (maximum 10 allowed)', 'error');
        return;
      }
      setEditDoctorPromises((prev) => [...prev, habitTitle]);
    }
  };

  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;
    const errs = {};
    const docNameField = formFields.find(f => f.name === 'doctorName');
    if (docNameField && docNameField.required !== false && !editDoctorName.trim()) {
      errs.doctorName = `${docNameField.label || "Doctor's name"} is required`;
    }
    const clinicField = formFields.find(f => f.name === 'clinicName');
    if (clinicField && clinicField.required !== false && !editClinicName.trim()) {
      errs.clinicName = `${clinicField.label || 'Clinic name'} is required`;
    }
    if (editDoctorPromises.length > 10) {
      errs.server = 'You cannot select more than 10 promises';
    }

    if (Object.keys(errs).length > 0) {
      setEditDoctorErrors(errs);
      return;
    }

    setSavingEditDoctor(true);
    setEditDoctorErrors({ doctorName: '', clinicName: '', server: '' });
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

      const res = await fetch(`/api/admin/doctors/${editingDoctor._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminAuth.token}`
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
        setEditDoctorErrors({ doctorName: '', clinicName: '', server: '' });
        fetchAdminData();
        if (selectedDoctor && String(selectedDoctor._id) === String(editingDoctor._id)) {
          setSelectedDoctor((prev) => ({ ...prev, ...data.doctor }));
          if (posterModalDoctor && String(posterModalDoctor._id) === String(editingDoctor._id)) {
            setPosterModalDoctor((prev) => ({ ...prev, ...data.doctor }));
          }
        }
      } else {
        setEditDoctorErrors((prev) => ({ ...prev, server: data.message || 'Failed to update doctor' }));
      }
    } catch (err) {
      setEditDoctorErrors((prev) => ({ ...prev, server: 'Error updating doctor' }));
    } finally {
      setSavingEditDoctor(false);
    }
  };

  // =========================================================================
  // POSTER PREVIEW & DOWNLOAD HANDLERS
  // =========================================================================
  const getPosterModalHabits = (doctor) => {
    const habitsSource = (promiseList && promiseList.length > 0) ? promiseList : ALL_HABITS;
    const targetCount = Math.min(10, habitsSource.length || 10);
    if (!doctor) return habitsSource.slice(0, targetCount);
    const existingPromises = Array.isArray(doctor.selectedPromises) ? doctor.selectedPromises : [];
    if (existingPromises.length === 0) {
      return habitsSource.slice(0, targetCount);
    }
    const matched = habitsSource.filter((h) =>
      existingPromises.some((p) => p === h.title || p.startsWith(h.title) || (typeof p === 'string' && p.includes(h.title)))
    );
    if (matched.length > 0) {
      const remaining = habitsSource.filter((h) => !matched.some((m) => m.id === h.id || m.title === h.title));
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
      if (doctorId && adminAuth?.token) {
        try {
          const res = await fetch(`/api/admin/doctors/${doctorId}/poster`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminAuth.token}`
            },
            body: JSON.stringify({ posterData: image })
          });
          const data = await res.json();
          if (data.success && data.posterUrl) {
            setDoctors((prev) =>
              prev.map((d) => (d._id === doctorId ? { ...d, posterUrl: data.posterUrl } : d))
            );
            if (posterModalDoctor && posterModalDoctor._id === doctorId) {
              setPosterModalDoctor((prev) => ({ ...prev, posterUrl: data.posterUrl }));
            }
            if (selectedDoctor && selectedDoctor._id === doctorId) {
              setSelectedDoctor((prev) => ({ ...prev, posterUrl: data.posterUrl }));
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

    const modalHabits = getPosterModalHabits(posterModalDoctor);

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
            maxWidth: '660px',
            width: '100%',
            maxHeight: '90vh',
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
              <PosterPromisesOverlay doc={posterModalDoctor} fallbackList={promiseList} />
            </div>
          </div>

          {/* Modal Footer: Download Action Button directly below Poster */}
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
  // EXPORT HANDLERS (CSV / EXCEL)
  // =========================================================================
  const handleExportUsers = () => {
    const listToExport = filteredUsers.length > 0 ? filteredUsers : users;
    if (!listToExport || listToExport.length === 0) {
      showToast('No users to export', 'info');
      return;
    }
    const headers = ['Employee ID', 'Admin Name', 'Status', 'Total Doctors', 'Created Date'];
    const rows = listToExport.map((u) => [
      u.employeeId || '',
      adminAuth?.user?.name || 'Admin',
      u.status || 'active',
      u.doctorsCount || 0,
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'
    ]);
    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(`World_Heart_Day_Users_${dateStr}.csv`, headers, rows);
    showToast(`Exported ${rows.length} users successfully!`, 'success');
  };

  const handleExportDoctors = () => {
    const listToExport = filteredDoctors.length > 0
      ? filteredDoctors
      : (selectedEmployee ? doctors.filter((d) => String(d.userId?._id || d.userId) === String(selectedEmployee._id)) : doctors);
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
      'Parent Admin',
      'Registered By (User)',
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
        adminAuth?.user?.name || 'Admin',
        doc.userId?.employeeId || selectedEmployee?.employeeId || 'N/A',
        doc.selectedPromises?.length || 0,
        promisesStr,
        doc.status || 'active',
        doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'
      ];
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(`World_Heart_Day_Doctors_${dateStr}.csv`, headers, rows);
    showToast(`Exported ${rows.length} doctors successfully!`, 'success');
  };

  // =========================================================================
  // STATUS TOGGLE HANDLERS (OPTIMISTIC UI UPDATES)
  // =========================================================================
  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
    setUsers((prev) =>
      prev.map((u) => (u._id === user._id ? { ...u, status: newStatus } : u))
    );
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuth.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User "${user.employeeId || user.name}" ${newStatus === 'active' ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showToast(data.message || 'Failed to update user status', 'error');
        fetchAdminData();
      }
    } catch (err) {
      showToast('Error updating user status', 'error');
      fetchAdminData();
    }
  };

  const handleToggleDoctorStatus = async (doc) => {
    const newStatus = doc.status === 'inactive' ? 'active' : 'inactive';
    setDoctors((prev) =>
      prev.map((d) => (d._id === doc._id ? { ...d, status: newStatus } : d))
    );
    if (selectedDoctor && String(selectedDoctor._id) === String(doc._id)) {
      setSelectedDoctor((prev) => ({ ...prev, status: newStatus }));
    }
    try {
      const res = await fetch(`/api/admin/doctors/${doc._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuth.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Dr. "${doc.doctorName}" ${newStatus === 'active' ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showToast(data.message || 'Failed to update doctor status', 'error');
        fetchAdminData();
      }
    } catch (err) {
      showToast('Error updating doctor status', 'error');
      fetchAdminData();
    }
  };

  // =========================================================================
  // SORT ARROW RENDERER
  // =========================================================================
  const renderSortArrow = (currentKey, columnKey, direction) => {
    if (currentKey !== columnKey) {
      return <ArrowUpDown size={12} className="medportal-sort-icon medportal-sort-inactive" />;
    }
    return direction === 'asc' ? (
      <ArrowUp size={12} className="medportal-sort-icon medportal-sort-active" />
    ) : (
      <ArrowDown size={12} className="medportal-sort-icon medportal-sort-active" />
    );
  };

  // =========================================================================
  // EMPLOYEES DATA FILTERING, SORTING & PAGINATION
  // =========================================================================
  const toggleEmpSort = (key) => {
    if (empSortKey === key) {
      setEmpSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setEmpSortKey(key);
      setEmpSortDir('asc');
    }
    setCurrentPage(1);
  };

  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((u) => (u.employeeId || u.name || '').toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let valA, valB;
      if (empSortKey === 'doctorsCount') {
        valA = a.doctorsCount || 0;
        valB = b.doctorsCount || 0;
      } else {
        valA = (a.employeeId || a.name || '').toLowerCase();
        valB = (b.employeeId || b.name || '').toLowerCase();
      }

      if (valA < valB) return empSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return empSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [users, searchQuery, empSortKey, empSortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / entriesPerPage));
  const currentEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    return filteredUsers.slice(startIndex, startIndex + entriesPerPage);
  }, [filteredUsers, currentPage, entriesPerPage]);

  const startEntryIndex = filteredUsers.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;
  const endEntryIndex = Math.min(currentPage * entriesPerPage, filteredUsers.length);

  // =========================================================================
  // DOCTORS DATA FILTERING, SORTING & PAGINATION (FOR SELECTED EMPLOYEE)
  // =========================================================================
  const toggleDoctorSort = (key) => {
    if (doctorSortKey === key) {
      setDoctorSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDoctorSortKey(key);
      setDoctorSortDir('asc');
    }
    setDoctorCurrentPage(1);
  };

  const isolatedDoctorsForEmployee = useMemo(() => {
    if (!selectedEmployee) return doctors;
    const targetEmpId = String(selectedEmployee._id);
    return doctors.filter((doc) => {
      const docUserId = doc.userId?._id ? String(doc.userId._id) : String(doc.userId || '');
      return docUserId === targetEmpId;
    });
  }, [doctors, selectedEmployee]);

  const filteredDoctors = useMemo(() => {
    let list = [...isolatedDoctorsForEmployee];

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
  }, [isolatedDoctorsForEmployee, doctorSearch, doctorSortKey, doctorSortDir]);

  const totalDoctorPages = Math.max(1, Math.ceil(filteredDoctors.length / doctorEntriesPerPage));
  const currentDoctors = useMemo(() => {
    const start = (doctorCurrentPage - 1) * doctorEntriesPerPage;
    return filteredDoctors.slice(start, start + doctorEntriesPerPage);
  }, [filteredDoctors, doctorCurrentPage, doctorEntriesPerPage]);

  const startDoctorIndex = filteredDoctors.length === 0 ? 0 : (doctorCurrentPage - 1) * doctorEntriesPerPage + 1;
  const endDoctorIndex = Math.min(doctorCurrentPage * doctorEntriesPerPage, filteredDoctors.length);

  // =========================================================================
  // UNAUTHENTICATED STATE: LOGIN SCREEN
  // =========================================================================
  if (!adminAuth?.token || adminAuth?.user?.role !== 'admin') {
    return (
      <div className="medportal-layout" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="medportal-modal-card" style={{ maxWidth: '440px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div className="medportal-brand-icon" style={{ margin: '0 auto 0.75rem auto' }}>
              <Shield size={22} color="#ffffff" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading), Fraunces, serif', fontSize: '1.75rem', color: 'var(--foreground)', margin: 0, fontWeight: 800 }}>
              Admin Portal
            </h2>
            <p style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', margin: '4px 0 0 0', textTransform: 'uppercase' }}>
              Coordinator Management Access
            </p>
          </div>

          <form onSubmit={handleAdminLogin} noValidate>
            {loginErrors.server && (
              <div className="inbuilt-error-alert">
                <AlertCircle size={17} className="error-icon" />
                <span>{loginErrors.server}</span>
              </div>
            )}

            <div className="medportal-form-group">
              <label>Admin Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                className={`medportal-form-control ${loginErrors.name ? 'has-error' : ''}`}
                placeholder="Enter Admin Name"
                autoComplete="off"
                value={adminName}
                onChange={(e) => {
                  setAdminName(e.target.value);
                  if (loginErrors.name || loginErrors.server) {
                    setLoginErrors((prev) => ({ ...prev, name: '', server: '' }));
                  }
                }}
              />
              {loginErrors.name && (
                <div className="inbuilt-field-error">
                  <AlertCircle size={13} />
                  <span>{loginErrors.name}</span>
                </div>
              )}
            </div>

            <div className="medportal-form-group">
              <label>Password <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="password"
                className={`medportal-form-control ${loginErrors.password ? 'has-error' : ''}`}
                placeholder="Minimum 6 characters"
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginErrors.password || loginErrors.server) {
                    setLoginErrors((prev) => ({ ...prev, password: '', server: '' }));
                  }
                }}
              />
              {loginErrors.password && (
                <div className="inbuilt-field-error">
                  <AlertCircle size={13} />
                  <span>{loginErrors.password}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="medportal-btn-submit"
              disabled={loginLoading}
              style={{ width: '100%', padding: '11px', marginTop: '1rem', fontSize: '0.95rem' }}
            >
              {loginLoading ? 'Authenticating...' : 'Sign In as Admin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // AUTHENTICATED STATE: MEDPORTAL ADMIN DASHBOARD
  // =========================================================================
  return (
    <div className="medportal-layout">
      {/* Mobile Top Navigation Bar */}
      <div className="medportal-mobile-topbar">
        <button
          type="button"
          className="medportal-mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="medportal-mobile-brand" onClick={() => { window.location.href = '/'; }}>
          <div className="medportal-brand-icon-sm">
            <Shield size={16} color="#ffffff" />
          </div>
          <div className="medportal-mobile-brand-info">
            <span className="medportal-mobile-brand-title">World Heart Day</span>
            <span className="medportal-mobile-brand-tag">ADMIN</span>
          </div>
        </div>
        <div className="medportal-mobile-user">
          <span className="medportal-pill-superadmin">{adminAuth?.user?.name || 'Admin'}</span>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div className="medportal-sidebar-backdrop" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* 1. LEFT SIDEBAR */}
      <aside className={`medportal-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="medportal-sidebar-header-row">
          <div
            className="medportal-brand"
            onClick={() => { window.location.href = '/'; }}
            style={{ cursor: 'pointer' }}
            title="Go to Home Page"
          >
            <div className="medportal-brand-icon">
              <Shield size={20} color="#ffffff" />
            </div>
            <div className="medportal-brand-text">
              <span className="medportal-brand-title">World Heart Day</span>
              <span className="medportal-brand-subtitle">ADMIN</span>
            </div>
          </div>
          <button
            type="button"
            className="medportal-sidebar-close-btn"
            onClick={() => setIsMobileMenuOpen(false)}
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hierarchical Data Tables Sidebar */}
        <div className="medportal-sidebar-tree">
          <div className="medportal-sidebar-tree-header">Data Tables</div>

          {/* LEVEL 1: Users Table Active */}
          {flowLevel === 'employees' && (
            <div className="medportal-sidebar-tree-item active" title="Users Table">
              <UserIcon size={17} />
              <span>Users</span>
            </div>
          )}

          {/* LEVEL 2: Doctors Table Active (also active when visiting doctor profile) */}
          {(flowLevel === 'doctors' || flowLevel === 'doctordetails') && (
            <>
              <button
                type="button"
                className="medportal-sidebar-tree-item"
                onClick={goToEmployees}
                title="Back to Users table"
              >
                <UserIcon size={17} />
                <span>Users</span>
              </button>
              <div className="medportal-sidebar-tree-connector" style={{ marginLeft: '1.25rem' }} />
              {flowLevel === 'doctordetails' ? (
                <button
                  type="button"
                  className="medportal-sidebar-tree-item active"
                  onClick={goToDoctors}
                  title="Back to Doctors table"
                  style={{ paddingLeft: '1.15rem' }}
                >
                  <Stethoscope size={17} />
                  <span>Doctors</span>
                </button>
              ) : (
                <div className="medportal-sidebar-tree-item active" style={{ paddingLeft: '1.15rem' }}>
                  <Stethoscope size={17} />
                  <span>Doctors</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar Footer with Logout Button */}
        <div className="medportal-sidebar-footer">
          <button
            type="button"
            className="medportal-sidebar-logout-btn"
            onClick={() => {
              setIsMobileMenuOpen(false);
              if (onLogout) onLogout('admin');
            }}
            title="Log out of Admin"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT CANVAS */}
      <main className="medportal-main">
        {/* Watermark SVG */}
        <svg
          className="medportal-watermark"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 200 130 C 180 80 120 70 80 110 C 30 160 30 230 110 300 L 200 370 L 290 300 C 370 230 370 160 320 110 C 280 70 220 80 200 130 Z"
            stroke="#0D9488"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="330" cy="330" r="100" stroke="#0284C7" strokeWidth="3" opacity="0.4" />
        </svg>

        {/* Top Header Row with Title, Pill, and Log out */}
        <div className="medportal-header-area">
          <div className="medportal-top-bar">
            <h1 className="medportal-page-title">
              {flowLevel === 'employees' && 'Users'}
              {flowLevel === 'doctors' && (selectedEmployee ? `Doctors under ${selectedEmployee.employeeId || selectedEmployee.name}` : 'All Enrolled Doctors')}
              {flowLevel === 'doctordetails' && `Doctor Details: Dr. ${selectedDoctor?.doctorName || ''}`}
            </h1>

            <div className="medportal-user-actions">
              <span className="medportal-pill-superadmin">{adminAuth?.user?.name || 'Admin'}</span>
              <button
                type="button"
                className="medportal-btn-logout"
                onClick={() => onLogout && onLogout('admin')}
              >
                Log out
              </button>
            </div>

            {/* Mobile In-line Actions (On the most right and in-line with heading text) */}
            <div className="medportal-mobile-title-actions">
              {flowLevel === 'employees' && (
                <button
                  type="button"
                  className="medportal-btn-add medportal-btn-add-inline"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Add user</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Row: Back buttons / Add CTA */}
          <div
            className="medportal-action-row"
            style={{
              marginTop: '1.25rem',
              justifyContent: flowLevel === 'employees' ? 'flex-end' : 'space-between'
            }}
          >
            {flowLevel !== 'employees' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {flowLevel === 'doctors' && selectedEmployee && (
                  <button type="button" className="medportal-btn-back-flow" onClick={goToEmployees}>
                    <ArrowLeft size={15} />
                    <span>Back to Users</span>
                  </button>
                )}

                {flowLevel === 'doctordetails' && (
                  <button type="button" className="medportal-btn-back-flow" onClick={goToDoctors}>
                    <ArrowLeft size={15} />
                    <span>Back to Doctors</span>
                  </button>
                )}
              </div>
            )}

            {flowLevel === 'employees' && (
              <div className="medportal-action-group">
                <button
                  type="button"
                  className="medportal-btn-add"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Add user</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ===================================================================
            LEVEL 1: EMPLOYEES (USERS) DATATABLE
            =================================================================== */}
        {flowLevel === 'employees' && (
          <div className="medportal-table-card">
            {/* Table Controls (Show entries & Search) */}
            <div className="medportal-table-controls">
              <div className="medportal-entries-selector">
                <span>Show</span>
                <CustomDropdown
                  className="custom-dropdown-compact"
                  value={entriesPerPage}
                  options={[5, 10, 25, 50]}
                  onChange={(val) => {
                    setEntriesPerPage(Number(val));
                    setCurrentPage(1);
                  }}
                />
                <span>entries</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="medportal-btn-export"
                  onClick={handleExportUsers}
                  title="Export Users to CSV / Excel"
                >
                  <Download size={14} />
                  <span>Export Users</span>
                </button>

                <div className="medportal-search-wrap">
                  <span>Search:</span>
                  <input
                    type="text"
                    className="medportal-search-input"
                    placeholder="Search employee ID..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="medportal-table-wrapper">
              <table className="medportal-data-table medportal-table">
                <thead>
                  <tr>
                    <th
                      className="medportal-th-sortable"
                      onClick={() => toggleEmpSort('employeeId')}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="medportal-th-content">
                        <span>EMPLOYEE ID</span>
                        {renderSortArrow(empSortKey, 'employeeId', empSortDir)}
                      </div>
                    </th>
                    <th
                      className="medportal-th-sortable"
                      onClick={() => toggleEmpSort('doctorsCount')}
                      style={{ textAlign: 'center', cursor: 'pointer' }}
                    >
                      <div className="medportal-th-content" style={{ justifyContent: 'center' }}>
                        <span>DOCTORS ENROLLED</span>
                        {renderSortArrow(empSortKey, 'doctorsCount', empSortDir)}
                      </div>
                    </th>
                    <th style={{ textAlign: 'center' }}>ENABLED</th>
                    <th style={{ textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={4} className="medportal-td-empty">
                        Loading users...
                      </td>
                    </tr>
                  )}

                  {!loading && currentEntries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="medportal-td-empty">
                        {searchQuery
                          ? `No users matching "${searchQuery}"`
                          : 'No users registered yet. Click "+ Add user" above to create one.'}
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    currentEntries.map((user) => {
                      const isEnabled = user.status !== 'inactive';

                      return (
                        <tr
                          key={user._id}
                          onClick={() => handleEmployeeClick(user)}
                          className="medportal-clickable-row"
                          title={`Click to view doctors registered by ${user.employeeId || user.name}`}
                        >
                          <td>
                            <span className="medportal-drilldown-link">
                              <UserIcon size={16} color="var(--primary)" />
                              <strong className="medportal-admin-name">{user.employeeId || user.name}</strong>
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--foreground)' }}>
                            {user.doctorsCount || 0} Doctors
                          </td>
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <label className="medportal-switch" title={isEnabled ? 'Enabled - Click to disable' : 'Disabled - Click to enable'}>
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => handleToggleUserStatus(user)}
                              />
                              <span className="medportal-slider" />
                            </label>
                          </td>
                          <td style={{ textAlign: 'center' }} className="medportal-td-action">
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="medportal-pill-edit"
                                onClick={(e) => openEditUserModal(user, e)}
                                title="Edit employee"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="medportal-pill-delete"
                                onClick={(e) => handleDeleteUser(user._id, user.employeeId || user.name, e)}
                                title="Delete employee"
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

            {/* Table Footer: Summary & Pagination */}
            <div className="medportal-table-footer">
              <div className="medportal-pagination-info">
                {filteredUsers.length === 0
                  ? 'Showing 0 to 0 of 0 entries'
                  : `Showing ${startEntryIndex} to ${endEntryIndex} of ${filteredUsers.length} entries`}
              </div>

              <div className="medportal-pagination-nav">
                <button
                  type="button"
                  className="medportal-page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`medportal-page-num ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  className="medportal-page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            LEVEL 2: DOCTORS DATATABLE FOR SELECTED EMPLOYEE
            =================================================================== */}
        {flowLevel === 'doctors' && selectedEmployee && (
          <div className="medportal-table-card">
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

              {/* Data Table */}
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
                    {loading && (
                      <tr>
                        <td colSpan={6} className="medportal-td-empty">
                          Loading doctors for User "{selectedEmployee.employeeId || selectedEmployee.name}"...
                        </td>
                      </tr>
                    )}

                    {!loading && currentDoctors.length === 0 && (
                      <tr>
                        <td colSpan={6} className="medportal-td-empty">
                          {doctorSearch.trim()
                            ? 'No matching doctors found'
                            : `No doctors registered by User "${selectedEmployee.employeeId || selectedEmployee.name}" yet.`}
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      currentDoctors.map((doc) => {
                        const formattedDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A';
                        const promiseCount = doc.selectedPromises?.length || 0;
                        const isEnabled = doc.status !== 'inactive';

                        return (
                          <tr
                            key={doc._id}
                            onClick={() => handleDoctorClick(doc)}
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
                                  title="Edit doctor"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="medportal-pill-delete"
                                  onClick={(e) => handleDeleteDoctor(doc._id, doc.doctorName, e)}
                                  title="Delete doctor"
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
                    : `Showing ${startDoctorIndex} to ${endDoctorIndex} of ${filteredDoctors.length} entries for "${selectedEmployee.employeeId || selectedEmployee.name}"`}
                  {doctorSearch.trim() && ` (filtered from ${isolatedDoctorsForEmployee.length} total)`}
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
        )}

        {/* ===================================================================
            LEVEL 3: DOCTOR DETAILS VIEW (FULL DETAILS & PROMISES)
            =================================================================== */}
        {flowLevel === 'doctordetails' && selectedDoctor && (
          <div className="medportal-doctor-details-card">
            <div className="medportal-doctor-details-grid">
              {/* Left Profile Sidebar */}
              <div className="medportal-doctor-sidebar-profile">
                <img
                  src={getDoctorPhotoUrl(selectedDoctor)}
                  alt={selectedDoctor.doctorName}
                  className="medportal-doctor-avatar-large"
                  onError={(e) => handleDoctorPhotoError(e, selectedDoctor.doctorName)}
                />

                <h2 className="medportal-doctor-name-title">Dr. {selectedDoctor.doctorName}</h2>
                <div className="medportal-doctor-clinic-tag" style={{ marginBottom: '0.2rem' }}>🏥 {selectedDoctor.clinicName || 'Clinic'}</div>

                {/* Prominent Badges for dynamic fields (Degree, Specialization, etc.) */}
                {(() => {
                  const extraFieldsList = getDoctorExtraFields(selectedDoctor);
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
                    <span className="medportal-doctor-meta-label">Parent Admin</span>
                    <span className="medportal-doctor-meta-val">{adminAuth.user.name}</span>
                  </div>

                  <div className="medportal-doctor-meta-item">
                    <span className="medportal-doctor-meta-label">Registered By User</span>
                    <span className="medportal-doctor-meta-val">
                      {selectedEmployee?.employeeId ||
                        selectedEmployee?.name ||
                        selectedDoctor.userId?.employeeId ||
                        'N/A'}
                    </span>
                  </div>

                  <div className="medportal-doctor-meta-item">
                    <span className="medportal-doctor-meta-label">Total Promises</span>
                    <span className="medportal-doctor-meta-val">
                      {selectedDoctor.selectedPromises?.length || 0}
                    </span>
                  </div>

                  <div className="medportal-doctor-meta-item">
                    <span className="medportal-doctor-meta-label">Registered On</span>
                    <span className="medportal-doctor-meta-val">
                      {selectedDoctor.createdAt ? new Date(selectedDoctor.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <div className="medportal-doctor-meta-item">
                    <span className="medportal-doctor-meta-label">Clinic / Hospital</span>
                    <span className="medportal-doctor-meta-val">{selectedDoctor.clinicName || 'N/A'}</span>
                  </div>

                  {/* Additional Form Fields in Doctor Profile */}
                  {getDoctorExtraFields(selectedDoctor).map((f) => (
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
                    onClick={() => openPosterModal(selectedDoctor)}
                  >
                    <Download size={16} />
                    <span>View & Download Poster</span>
                  </button>
                  <button
                    type="button"
                    className="medportal-btn-edit"
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      padding: '0.65rem',
                      borderRadius: '12px',
                      justifyContent: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    onClick={(e) => openEditDoctorModal(selectedDoctor, e)}
                  >
                    <Edit2 size={15} />
                    <span>Edit Doctor Details</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Pledged Promises */}
              <div className="medportal-promises-section">
                <div className="medportal-promises-header">
                  <h3>
                    <Sparkles size={20} color="var(--primary)" />
                    <span>Heart Health Promises Pledged</span>
                  </h3>
                  <span
                    style={{
                      background: 'var(--secondary)',
                      color: 'var(--primary)',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '0.84rem'
                    }}
                  >
                    {selectedDoctor.selectedPromises?.length || 0} Promises
                  </span>
                </div>

                {!selectedDoctor.selectedPromises || selectedDoctor.selectedPromises.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                    No promises selected for this doctor.
                  </div>
                ) : (
                  <div className="medportal-promises-grid">
                    {selectedDoctor.selectedPromises.map((promise, index) => {
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
        )}

      </main>

      {/* =====================================================================
          MODAL: ADD USER
          ===================================================================== */}
      {showAddModal && (
        <div className="medportal-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="medportal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="medportal-modal-header">
              <h3>Add New User</h3>
              <button
                type="button"
                className="medportal-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} noValidate>
              {addUserErrors.server && (
                <div className="inbuilt-error-alert">
                  <AlertCircle size={16} className="error-icon" />
                  <span>{addUserErrors.server}</span>
                </div>
              )}

              <div className="medportal-form-group">
                <label>Employee ID <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  className={`medportal-form-control ${addUserErrors.employeeId ? 'has-error' : ''}`}
                  placeholder="e.g. EMP1005"
                  autoComplete="off"
                  value={newUserEmpId}
                  onChange={(e) => {
                    setNewUserEmpId(e.target.value);
                    if (addUserErrors.employeeId || addUserErrors.server) {
                      setAddUserErrors((prev) => ({ ...prev, employeeId: '', server: '' }));
                    }
                  }}
                />
                {addUserErrors.employeeId && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{addUserErrors.employeeId}</span>
                  </div>
                )}
              </div>

              <div className="medportal-form-group">
                <label>Password <span style={{ color: '#ef4444' }}>*</span> (min. 6 characters)</label>
                <input
                  type="password"
                  className={`medportal-form-control ${addUserErrors.password ? 'has-error' : ''}`}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  value={newUserPassword}
                  onChange={(e) => {
                    setNewUserPassword(e.target.value);
                    if (addUserErrors.password || addUserErrors.server) {
                      setAddUserErrors((prev) => ({ ...prev, password: '', server: '' }));
                    }
                  }}
                />
                {addUserErrors.password && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{addUserErrors.password}</span>
                  </div>
                )}
              </div>

              <div className="medportal-modal-actions">
                <button
                  type="button"
                  className="medportal-btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="medportal-btn-submit"
                  disabled={creatingUser}
                >
                  {creatingUser ? 'Creating...' : '+ Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: EDIT USER
          ===================================================================== */}
      {showEditModal && editingUser && (
        <div className="medportal-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="medportal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="medportal-modal-header">
              <h3>Edit Employee</h3>
              <button
                type="button"
                className="medportal-modal-close"
                onClick={() => setShowEditModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} noValidate>
              {editUserErrors.server && (
                <div className="inbuilt-error-alert">
                  <AlertCircle size={16} className="error-icon" />
                  <span>{editUserErrors.server}</span>
                </div>
              )}

              <div className="medportal-form-group">
                <label>Employee ID <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  className={`medportal-form-control ${editUserErrors.employeeId ? 'has-error' : ''}`}
                  placeholder="e.g. EMP1001"
                  autoComplete="off"
                  value={editEmpId}
                  onChange={(e) => {
                    setEditEmpId(e.target.value);
                    if (editUserErrors.employeeId || editUserErrors.server) {
                      setEditUserErrors((prev) => ({ ...prev, employeeId: '', server: '' }));
                    }
                  }}
                />
                {editUserErrors.employeeId && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{editUserErrors.employeeId}</span>
                  </div>
                )}
              </div>

              <div className="medportal-form-group">
                <label>New Password (min. 6 characters, leave blank to keep current)</label>
                <input
                  type="password"
                  className={`medportal-form-control ${editUserErrors.password ? 'has-error' : ''}`}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  value={editPassword}
                  onChange={(e) => {
                    setEditPassword(e.target.value);
                    if (editUserErrors.password || editUserErrors.server) {
                      setEditUserErrors((prev) => ({ ...prev, password: '', server: '' }));
                    }
                  }}
                />
                {editUserErrors.password && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{editUserErrors.password}</span>
                  </div>
                )}
              </div>

              <div className="medportal-modal-actions">
                <button
                  type="button"
                  className="medportal-btn-cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="medportal-btn-submit"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: EDIT DOCTOR
          ===================================================================== */}
      {showEditDoctorModal && editingDoctor && (
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

            <form onSubmit={handleUpdateDoctor} noValidate>
              {editDoctorErrors.server && (
                <div className="inbuilt-error-alert">
                  <AlertCircle size={16} className="error-icon" />
                  <span>{editDoctorErrors.server}</span>
                </div>
              )}

              <div className="medportal-form-row-2col">
                <div className="medportal-form-group">
                  <label>
                    {formFields.find(f => f.name === 'doctorName')?.label || "Doctor's Name"}
                    {Boolean(formFields.find(f => f.name === 'doctorName')?.required) && <span style={{ color: '#ef4444' }}> *</span>}
                  </label>
                  <input
                    type="text"
                    className={`medportal-form-control ${editDoctorErrors.doctorName ? 'has-error' : ''}`}
                    placeholder="e.g. Ramesh Patel"
                    autoComplete="off"
                    value={editDoctorName}
                    onChange={(e) => {
                      setEditDoctorName(e.target.value);
                      if (editDoctorErrors.doctorName || editDoctorErrors.server) {
                        setEditDoctorErrors(prev => ({ ...prev, doctorName: '', server: '' }));
                      }
                    }}
                  />
                  {editDoctorErrors.doctorName && (
                    <div className="inbuilt-field-error">
                      <AlertCircle size={13} />
                      <span>{editDoctorErrors.doctorName}</span>
                    </div>
                  )}
                </div>

                <div className="medportal-form-group">
                  <label>
                    {formFields.find(f => f.name === 'clinicName')?.label || 'Clinic / Hospital Name'}
                    {Boolean(formFields.find(f => f.name === 'clinicName')?.required) && <span style={{ color: '#ef4444' }}> *</span>}
                  </label>
                  <input
                    type="text"
                    className={`medportal-form-control ${editDoctorErrors.clinicName ? 'has-error' : ''}`}
                    placeholder="e.g. Heart Care Clinic"
                    autoComplete="off"
                    value={editClinicName}
                    onChange={(e) => {
                      setEditClinicName(e.target.value);
                      if (editDoctorErrors.clinicName || editDoctorErrors.server) {
                        setEditDoctorErrors(prev => ({ ...prev, clinicName: '', server: '' }));
                      }
                    }}
                  />
                  {editDoctorErrors.clinicName && (
                    <div className="inbuilt-field-error">
                      <AlertCircle size={13} />
                      <span>{editDoctorErrors.clinicName}</span>
                    </div>
                  )}
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
                    <span>Heart Health Promises: <strong>{editDoctorPromises.length} / 10</strong> selected</span>
                  </div>
                  <div className="medportal-promises-action-chips">
                    <button
                      type="button"
                      className="medportal-chip-btn"
                      onClick={() => setEditDoctorPromises((promiseList.length > 0 ? promiseList : ALL_HABITS).slice(0, 10).map((h) => h.title))}
                    >
                      Pick First 10
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
                  {(promiseList.length > 0 ? promiseList : ALL_HABITS).map((habit) => {
                    const isSelected = editDoctorPromises.includes(habit.title);
                    const isLimitReached = editDoctorPromises.length >= 10 && !isSelected;

                    return (
                      <div
                        key={habit.id}
                        className={`medportal-promise-toggle-item ${isSelected ? 'active' : ''} ${isLimitReached ? 'disabled' : ''}`}
                        onClick={() => toggleDoctorPromise(habit.title)}
                        title={isLimitReached ? 'Maximum 10 promises reached' : ''}
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
      )}
      {renderPosterModal()}
    </div>
  );
}
