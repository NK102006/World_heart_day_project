import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ArrowLeft,
  Heart,
  Crown,
  Shield,
  User as UserIcon,
  Stethoscope,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Building,
  RefreshCw,
  Sparkles,
  Camera,
  Check,
  Sliders,
  Edit2,
  Trash2,
  RotateCcw,
  FileText,
  Menu,
  LogOut,
  Download,
  Building2,
  AlertCircle
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { ALL_HABITS } from '../constants/habits';
import PosterPromisesOverlay from './PosterPromisesOverlay';
import CustomDropdown from './CustomDropdown';
import { exportToCSV } from '../utils/exportCsv';
import './SuperadminPanel.css';

// Helper: auto-generate key from first two words of field label without space
const deriveKeyFromLabel = (labelStr) => {
  if (!labelStr) return '';
  const rawWords = labelStr.trim().split(/\s+/).filter(Boolean);
  const cleanWords = rawWords
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);
  if (cleanWords.length === 0) return '';
  if (cleanWords.length === 1) return cleanWords[0];
  return `${cleanWords[0]}${cleanWords[1]}`;
};

export default function SuperadminPanel({ superadminAuth, onLoginSuccess, showToast, onLogout }) {
  // Login form state (when unauthenticated)
  const [superadminName, setSuperadminName] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState({ name: '', password: '', server: '' });

  // Inbuilt form validation error states for modals
  const [addAdminErrors, setAddAdminErrors] = useState({ name: '', password: '', server: '' });
  const [editAdminErrors, setEditAdminErrors] = useState({ name: '', password: '', server: '' });
  const [addUserErrors, setAddUserErrors] = useState({ employeeId: '', password: '', adminId: '', server: '' });
  const [editUserErrors, setEditUserErrors] = useState({ employeeId: '', password: '', adminId: '', server: '' });
  const [editDoctorErrors, setEditDoctorErrors] = useState({ doctorName: '', clinicName: '', server: '' });
  const [fieldModalErrors, setFieldModalErrors] = useState({ label: '', name: '', server: '' });
  const [promiseModalErrors, setPromiseModalErrors] = useState({ title: '', desc: '', server: '' });

  // =========================================================================
  // HIERARCHICAL FLOW NAVIGATION STATE:
  // admins (onclick) -> users (onclick) -> doctor (onclick) -> doctordetails
  // =========================================================================
  const [flowLevel, setFlowLevel] = useState('admins'); // 'admins' | 'users' | 'doctors' | 'doctordetails'
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Mobile Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Raw Database Records (synced from MongoDB)
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [stats, setStats] = useState({ totalAdmins: 0, totalUsers: 0, totalDoctors: 0 });
  const [loading, setLoading] = useState(false);

  // =========================================================================
  // JQUERY DATATABLE CONTROLS: ADMINS TABLE
  // =========================================================================
  const [adminSearch, setAdminSearch] = useState('');
  const [adminEntriesPerPage, setAdminEntriesPerPage] = useState(10);
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);
  const [adminSortKey, setAdminSortKey] = useState('name');
  const [adminSortDir, setAdminSortDir] = useState('asc'); // 'asc' | 'desc'

  // =========================================================================
  // JQUERY DATATABLE CONTROLS: USERS TABLE
  // =========================================================================
  const [userSearch, setUserSearch] = useState('');
  const [userEntriesPerPage, setUserEntriesPerPage] = useState(10);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userSortKey, setUserSortKey] = useState('employeeId');
  const [userSortDir, setUserSortDir] = useState('asc');

  // =========================================================================
  // JQUERY DATATABLE CONTROLS: DOCTORS TABLE
  // =========================================================================
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorEntriesPerPage, setDoctorEntriesPerPage] = useState(10);
  const [doctorCurrentPage, setDoctorCurrentPage] = useState(1);
  const [doctorSortKey, setDoctorSortKey] = useState('doctorName');
  const [doctorSortDir, setDoctorSortDir] = useState('asc');

  // =========================================================================
  // MODALS STATE
  // =========================================================================
  // Add Admin modal
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Edit Admin modal
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [savingEditAdmin, setSavingEditAdmin] = useState(false);

  // Add User modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmpId, setNewUserEmpId] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserAdminId, setNewUserAdminId] = useState('');
  const [addingUser, setAddingUser] = useState(false);

  // Edit User modal
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserEmpId, setEditUserEmpId] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserAdminId, setEditUserAdminId] = useState('');
  const [savingEditUser, setSavingEditUser] = useState(false);

  // Edit Doctor modal
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editDoctorName, setEditDoctorName] = useState('');
  const [editClinicName, setEditClinicName] = useState('');
  const [editDoctorPhotoFile, setEditDoctorPhotoFile] = useState(null);
  const [editDoctorPhotoPreview, setEditDoctorPhotoPreview] = useState('');
  const [editDoctorPromises, setEditDoctorPromises] = useState([]);
  const [editDoctorExtraFields, setEditDoctorExtraFields] = useState({});
  const [savingEditDoctor, setSavingEditDoctor] = useState(false);

  // =========================================================================
  // DYNAMIC CONFIGURATION STATE: FORM FIELDS & PROMISES
  // =========================================================================
  const [formFields, setFormFields] = useState([]);
  const [fieldSearch, setFieldSearch] = useState('');
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [addingField, setAddingField] = useState(false);

  const [showEditFieldModal, setShowEditFieldModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editFieldLabel, setEditFieldLabel] = useState('');
  const [editFieldType, setEditFieldType] = useState('text');
  const [editFieldPlaceholder, setEditFieldPlaceholder] = useState('');
  const [editFieldRequired, setEditFieldRequired] = useState(false);
  const [editFieldOptions, setEditFieldOptions] = useState('');
  const [editFieldOrder, setEditFieldOrder] = useState(1);
  const [savingEditField, setSavingEditField] = useState(false);

  const [promiseList, setPromiseList] = useState([]);
  const [promiseSearch, setPromiseSearch] = useState('');

  // Poster Modal State
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [posterModalDoctor, setPosterModalDoctor] = useState(null);
  const [modalDownloading, setModalDownloading] = useState(false);
  const modalPosterRef = useRef(null);
  const [showAddPromiseModal, setShowAddPromiseModal] = useState(false);
  const [newPromiseTitle, setNewPromiseTitle] = useState('');
  const [newPromiseDesc, setNewPromiseDesc] = useState('');
  const [newPromiseIcon, setNewPromiseIcon] = useState('❤️');
  const [newPromiseOrder, setNewPromiseOrder] = useState(1);
  const [addingPromise, setAddingPromise] = useState(false);

  const [showEditPromiseModal, setShowEditPromiseModal] = useState(false);
  const [editingPromise, setEditingPromise] = useState(null);
  const [editPromiseTitle, setEditPromiseTitle] = useState('');
  const [editPromiseDesc, setEditPromiseDesc] = useState('');
  const [editPromiseIcon, setEditPromiseIcon] = useState('❤️');
  const [editPromiseOrder, setEditPromiseOrder] = useState(1);
  const [savingEditPromise, setSavingEditPromise] = useState(false);

  // =========================================================================
  // DATA FETCHING & SYNCHRONIZATION (Ensures No Data Loss)
  // =========================================================================
  useEffect(() => {
    if (superadminAuth?.token && superadminAuth?.user?.role === 'superadmin') {
      fetchAllData();
    }
  }, [superadminAuth]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${superadminAuth.token}` };

      const [adminsRes, usersRes, docsRes, hierRes, fieldsRes, promisesRes] = await Promise.all([
        fetch('/api/superadmin/admins', { headers }),
        fetch('/api/superadmin/users', { headers }),
        fetch('/api/superadmin/doctors', { headers }),
        fetch('/api/superadmin/hierarchy', { headers }),
        fetch('/api/superadmin/config/fields', { headers }),
        fetch('/api/superadmin/config/promises', { headers })
      ]);

      if (adminsRes.status === 401 || usersRes.status === 401) {
        if (onLogout) onLogout('superadmin');
        return;
      }

      const [adminsData, usersData, docsData, hierData, fieldsData, promisesData] = await Promise.all([
        adminsRes.json(),
        usersRes.json(),
        docsRes.json(),
        hierRes.json(),
        fieldsRes.json(),
        promisesRes.json()
      ]);

      if (fieldsData.success && fieldsData.fields) {
        setFormFields(fieldsData.fields);
      }

      if (promisesData.success && promisesData.promises) {
        setPromiseList(promisesData.promises);
      }

      if (adminsData.success && adminsData.admins) {
        setAdmins(adminsData.admins);
        // Sync selectedAdmin reference without data loss
        setSelectedAdmin((prev) => {
          if (!prev) return null;
          return adminsData.admins.find((a) => String(a._id) === String(prev._id)) || prev;
        });
      }

      if (usersData.success && usersData.users) {
        setUsers(usersData.users);
        // Sync selectedUser reference without data loss
        setSelectedUser((prev) => {
          if (!prev) return null;
          return usersData.users.find((u) => String(u._id) === String(prev._id)) || prev;
        });
      }

      if (docsData.success && docsData.doctors) {
        setDoctors(docsData.doctors);
        // Sync selectedDoctor reference without data loss
        setSelectedDoctor((prev) => {
          if (!prev) return null;
          return docsData.doctors.find((d) => String(d._id) === String(prev._id)) || prev;
        });
      }

      if (hierData.success && hierData.stats) {
        setStats(hierData.stats);
      }
    } catch (err) {
      console.error('Error fetching Superadmin data:', err);
      showToast('Error syncing with database', 'error');
    } finally {
      setLoading(false);
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
  // FLOW NAVIGATION HANDLERS:
  // admins(onclick) -> users(onclick) -> doctor(onclick) -> doctordetails
  // =========================================================================
  const handleAdminClick = (admin) => {
    setSelectedAdmin(admin);
    setSelectedUser(null);
    setSelectedDoctor(null);
    setUserCurrentPage(1);
    setUserSearch('');
    setFlowLevel('users');
    setIsMobileMenuOpen(false);
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setSelectedDoctor(null);
    setDoctorCurrentPage(1);
    setDoctorSearch('');
    setFlowLevel('doctors');
    setIsMobileMenuOpen(false);
  };

  const handleDoctorClick = (doctor) => {
    setSelectedDoctor(doctor);
    setFlowLevel('doctordetails');
    setIsMobileMenuOpen(false);
  };

  // Breadcrumb / Step-back navigation
  const goToAdmins = () => {
    setFlowLevel('admins');
    setSelectedAdmin(null);
    setSelectedUser(null);
    setSelectedDoctor(null);
    setIsMobileMenuOpen(false);
  };

  const goToUsers = () => {
    setFlowLevel('users');
    setSelectedUser(null);
    setSelectedDoctor(null);
    setIsMobileMenuOpen(false);
  };

  const goToDoctors = () => {
    setFlowLevel('doctors');
    setSelectedDoctor(null);
    setIsMobileMenuOpen(false);
  };

  // Clear credentials if superadmin is logged out
  useEffect(() => {
    if (!superadminAuth || superadminAuth?.user?.role !== 'superadmin') {
      setSuperadminName('');
      setPassword('');
    }
  }, [superadminAuth]);

  // =========================================================================
  // LOGIN HANDLER
  // =========================================================================
  const handleSuperadminLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!superadminName.trim()) {
      errs.name = 'Superadmin Name is required';
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
        body: JSON.stringify({ name: superadminName.trim(), password, role: 'superadmin' })
      });
      const data = await res.json();
      if (data.success) {
        setSuperadminName('');
        setPassword('');
        setLoginErrors({ name: '', password: '', server: '' });
        onLoginSuccess('superadmin', data.token, data.user);
        showToast('Superadmin authenticated successfully', 'success');
      } else {
        setLoginErrors((prev) => ({ ...prev, server: data.message || 'Invalid Superadmin Name or Password' }));
      }
    } catch (err) {
      setLoginErrors((prev) => ({ ...prev, server: 'Network error during superadmin login. Please check connection.' }));
    } finally {
      setLoginLoading(false);
    }
  };

  // =========================================================================
  // ADMIN CRUD HANDLERS
  // =========================================================================
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!newAdminName.trim()) {
      errs.name = 'Admin Name is required';
    }
    if (!newAdminPassword.trim()) {
      errs.password = 'Password is required';
    } else if (newAdminPassword.trim().length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errs).length > 0) {
      setAddAdminErrors(errs);
      return;
    }

    setAddingAdmin(true);
    setAddAdminErrors({ name: '', password: '', server: '' });
    try {
      const res = await fetch('/api/superadmin/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify({
          name: newAdminName.trim(),
          password: newAdminPassword.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Admin "${data.admin.name}" created successfully!`, 'success');
        setNewAdminName('');
        setNewAdminPassword('');
        setAddAdminErrors({ name: '', password: '', server: '' });
        setShowAddAdminModal(false);
        fetchAllData();
      } else {
        setAddAdminErrors((prev) => ({ ...prev, server: data.message || 'Failed to create admin' }));
      }
    } catch (err) {
      setAddAdminErrors((prev) => ({ ...prev, server: 'Error creating admin. Please check connection.' }));
    } finally {
      setAddingAdmin(false);
    }
  };

  const openEditAdminModal = (admin, e) => {
    if (e) e.stopPropagation();
    setEditingAdmin(admin);
    setEditAdminName(admin.name || '');
    setEditAdminPassword('');
    setEditAdminErrors({ name: '', password: '', server: '' });
    setShowEditAdminModal(true);
  };

  const handleSaveEditAdmin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!editAdminName.trim()) {
      errs.name = 'Admin Name is required';
    }
    if (editAdminPassword.trim()) {
      if (editAdminPassword.trim().length < 6) {
        errs.password = 'Password must be at least 6 characters';
      }
    }

    if (Object.keys(errs).length > 0) {
      setEditAdminErrors(errs);
      return;
    }

    setSavingEditAdmin(true);
    setEditAdminErrors({ name: '', password: '', server: '' });
    try {
      const bodyPayload = { name: editAdminName.trim() };
      if (editAdminPassword.trim()) {
        bodyPayload.password = editAdminPassword.trim();
      }

      const res = await fetch(`/api/superadmin/admins/${editingAdmin._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Admin "${editAdminName}" updated successfully!`, 'success');
        setShowEditAdminModal(false);
        setEditingAdmin(null);
        setEditAdminErrors({ name: '', password: '', server: '' });
        fetchAllData();
      } else {
        setEditAdminErrors((prev) => ({ ...prev, server: data.message || 'Failed to update admin' }));
      }
    } catch (err) {
      setEditAdminErrors((prev) => ({ ...prev, server: 'Error updating admin. Please check connection.' }));
    } finally {
      setSavingEditAdmin(false);
    }
  };

  const handleDeleteAdmin = async (id, adminName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete Admin "${adminName}"? This will delete associated users and doctors.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/superadmin/admins/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superadminAuth.token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Admin deleted successfully', 'success');
        if (selectedAdmin && String(selectedAdmin._id) === String(id)) {
          setSelectedAdmin(null);
          setFlowLevel('admins');
        }
        fetchAllData();
      } else {
        showToast(data.message || 'Error deleting admin', 'error');
      }
    } catch (err) {
      showToast('Error deleting admin', 'error');
    }
  };

  // =========================================================================
  // USER CRUD HANDLERS
  // =========================================================================
  const openAddUserModal = (targetAdminId = '') => {
    const adminIdToUse = targetAdminId || selectedAdmin?._id || (admins.length > 0 ? admins[0]._id : '');
    setNewUserAdminId(adminIdToUse);
    setNewUserEmpId('');
    setNewUserPassword('');
    setAddUserErrors({ employeeId: '', password: '', adminId: '', server: '' });
    setShowAddUserModal(true);
  };

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
    if (!newUserAdminId) {
      errs.adminId = 'Parent Admin is required';
    }

    if (Object.keys(errs).length > 0) {
      setAddUserErrors(errs);
      return;
    }

    setAddingUser(true);
    setAddUserErrors({ employeeId: '', password: '', adminId: '', server: '' });
    try {
      const res = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify({
          employeeId: newUserEmpId.trim(),
          password: newUserPassword.trim(),
          adminId: newUserAdminId
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'User created successfully', 'success');
        setNewUserEmpId('');
        setNewUserPassword('');
        setAddUserErrors({ employeeId: '', password: '', adminId: '', server: '' });
        setShowAddUserModal(false);
        fetchAllData();
      } else {
        setAddUserErrors((prev) => ({ ...prev, server: data.message || 'Failed to create user' }));
      }
    } catch (err) {
      setAddUserErrors((prev) => ({ ...prev, server: 'Error creating user. Please check connection.' }));
    } finally {
      setAddingUser(false);
    }
  };

  const openEditUserModal = (user, e) => {
    if (e) e.stopPropagation();
    setEditingUser(user);
    setEditUserEmpId(user.employeeId || user.name || '');
    setEditUserPassword('');
    setEditUserAdminId(user.adminId?._id || user.adminId || '');
    setEditUserErrors({ employeeId: '', password: '', adminId: '', server: '' });
    setShowEditUserModal(true);
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!editUserEmpId.trim()) {
      errs.employeeId = 'Employee ID is required';
    }
    if (editUserPassword.trim()) {
      if (editUserPassword.trim().length < 6) {
        errs.password = 'Password must be at least 6 characters';
      }
    }
    if (!editUserAdminId) {
      errs.adminId = 'Parent Admin is required';
    }

    if (Object.keys(errs).length > 0) {
      setEditUserErrors(errs);
      return;
    }

    setSavingEditUser(true);
    setEditUserErrors({ employeeId: '', password: '', adminId: '', server: '' });
    try {
      const bodyPayload = {
        employeeId: editUserEmpId.trim(),
        adminId: editUserAdminId
      };
      if (editUserPassword.trim()) {
        bodyPayload.password = editUserPassword.trim();
      }

      const res = await fetch(`/api/superadmin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (data.success) {
        showToast(`User "${editUserEmpId}" updated successfully!`, 'success');
        setShowEditUserModal(false);
        setEditingUser(null);
        setEditUserErrors({ employeeId: '', password: '', adminId: '', server: '' });
        fetchAllData();
      } else {
        setEditUserErrors((prev) => ({ ...prev, server: data.message || 'Failed to update user' }));
      }
    } catch (err) {
      setEditUserErrors((prev) => ({ ...prev, server: 'Error updating user. Please check connection.' }));
    } finally {
      setSavingEditUser(false);
    }
  };

  const handleDeleteUser = async (id, empId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete User "${empId}"? Associated doctor records will also be removed.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/superadmin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superadminAuth.token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'User deleted successfully', 'success');
        if (selectedUser && String(selectedUser._id) === String(id)) {
          setSelectedUser(null);
          setFlowLevel('users');
        }
        fetchAllData();
      } else {
        showToast(data.message || 'Error deleting user', 'error');
      }
    } catch (err) {
      showToast('Error deleting user', 'error');
    }
  };

  // =========================================================================
  // DOCTOR DELETE HANDLER
  // =========================================================================
  const handleDeleteDoctor = async (id, doctorName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete Doctor record for "Dr. ${doctorName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/superadmin/doctors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superadminAuth.token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Doctor record deleted successfully', 'success');
        if (selectedDoctor && String(selectedDoctor._id) === String(id)) {
          setSelectedDoctor(null);
          setFlowLevel('doctors');
        }
        fetchAllData();
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

    const initialPromises = (matchedPromises.length > 0 ? matchedPromises : existingPromises).slice(0, 10);
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
    if (docNameField && docNameField.enabled !== false && docNameField.required !== false && !editDoctorName.trim()) {
      errs.doctorName = `${docNameField.label || "Doctor's name"} is required`;
    }
    const clinicField = formFields.find(f => f.name === 'clinicName');
    if (clinicField && clinicField.enabled !== false && clinicField.required !== false && !editClinicName.trim()) {
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

      const res = await fetch(`/api/superadmin/doctors/${editingDoctor._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${superadminAuth.token}`
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
        fetchAllData();
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
      if (doctorId && superadminAuth?.token) {
        try {
          const res = await fetch(`/api/superadmin/doctors/${doctorId}/poster`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${superadminAuth.token}`
            },
            body: JSON.stringify({ posterData: image })
          });
          const data = await res.json();
          if (data.success && data.posterUrl) {
            setDoctorList((prev) =>
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
  const handleExportAdmins = () => {
    const listToExport = filteredAdmins.length > 0 ? filteredAdmins : adminList;
    if (!listToExport || listToExport.length === 0) {
      showToast('No admins to export', 'info');
      return;
    }
    const headers = ['Admin Name', 'Status', 'Total Users', 'Total Doctors', 'Created Date'];
    const rows = listToExport.map((adm) => [
      adm.name || '',
      adm.status || 'active',
      adm.usersCount || 0,
      adm.doctorsCount || 0,
      adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : 'N/A'
    ]);
    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(`World_Heart_Day_Admins_${dateStr}.csv`, headers, rows);
    showToast(`Exported ${rows.length} admins successfully!`, 'success');
  };

  const handleExportUsers = () => {
    const listToExport = filteredUsers.length > 0 ? filteredUsers : userList;
    if (!listToExport || listToExport.length === 0) {
      showToast('No users to export', 'info');
      return;
    }
    const headers = ['Employee ID', 'Parent Admin', 'Status', 'Total Doctors', 'Created Date'];
    const rows = listToExport.map((u) => [
      u.employeeId || '',
      u.adminId?.name || selectedAdmin?.name || 'N/A',
      u.status || 'active',
      u.doctorsCount || 0,
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'
    ]);
    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(`World_Heart_Day_Users_${dateStr}.csv`, headers, rows);
    showToast(`Exported ${rows.length} users successfully!`, 'success');
  };

  const handleExportDoctors = () => {
    const listToExport = filteredDoctors.length > 0 ? filteredDoctors : doctorList;
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
        doc.adminId?.name || selectedAdmin?.name || 'N/A',
        doc.userId?.employeeId || selectedUser?.employeeId || 'N/A',
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
  // DYNAMIC CONFIGURATION HANDLERS: FORM FIELDS & PROMISES
  // =========================================================================
  const openAddFieldModal = () => {
    setNewFieldLabel('');
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldPlaceholder('');
    setNewFieldRequired(false);
    setNewFieldOptions('');
    setFieldModalErrors({ label: '', name: '', server: '' });
    setShowAddFieldModal(true);
  };

  const openAddPromiseModal = () => {
    setNewPromiseTitle('');
    setNewPromiseDesc('');
    setNewPromiseIcon('❤️');
    setNewPromiseOrder((promiseList.length || 0) + 1);
    setPromiseModalErrors({ title: '', desc: '', server: '' });
    setShowAddPromiseModal(true);
  };

  const handleCreateField = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!newFieldLabel.trim()) {
      errs.label = 'Field label is required';
    }
    const derivedKey = (newFieldName && newFieldName.trim()) || deriveKeyFromLabel(newFieldLabel.trim());
    if (!derivedKey) {
      errs.server = 'Could not derive a valid key identifier from field label';
    }
    if (Object.keys(errs).length > 0) {
      setFieldModalErrors(errs);
      return;
    }
    setAddingField(true);
    setFieldModalErrors({ label: '', name: '', server: '' });
    try {
      const res = await fetch('/api/superadmin/config/fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify({
          name: derivedKey,
          label: newFieldLabel.trim(),
          type: newFieldType,
          placeholder: '',
          required: newFieldRequired,
          options: newFieldOptions ? newFieldOptions.split(',').map((s) => s.trim()).filter(Boolean) : []
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Field "${data.field.label}" created successfully!`, 'success');
        setShowAddFieldModal(false);
        setNewFieldLabel('');
        setNewFieldName('');
        setNewFieldType('text');
        setNewFieldPlaceholder('');
        setNewFieldRequired(false);
        setNewFieldOptions('');
        setFieldModalErrors({ label: '', name: '', server: '' });
        fetchAllData();
      } else {
        setFieldModalErrors((prev) => ({ ...prev, server: data.message || 'Error creating field' }));
      }
    } catch (err) {
      setFieldModalErrors((prev) => ({ ...prev, server: 'Error creating field' }));
    } finally {
      setAddingField(false);
    }
  };

  const openEditFieldModal = (field) => {
    setEditingField(field);
    setEditFieldLabel(field.label || '');
    setEditFieldType(field.type || 'text');
    setEditFieldPlaceholder(field.placeholder || '');
    setEditFieldRequired(Boolean(field.required));
    setEditFieldOptions(Array.isArray(field.options) ? field.options.join(', ') : '');
    setEditFieldOrder(field.order || 1);
    setFieldModalErrors({ label: '', name: '', server: '' });
    setShowEditFieldModal(true);
  };

  const handleUpdateField = async (e) => {
    e.preventDefault();
    if (!editingField) return;
    if (!editFieldLabel.trim()) {
      setFieldModalErrors({ label: 'Field label is required', name: '', server: '' });
      return;
    }
    setSavingEditField(true);
    setFieldModalErrors({ label: '', name: '', server: '' });
    try {
      const res = await fetch(`/api/superadmin/config/fields/${editingField._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify({
          label: editFieldLabel.trim(),
          type: editFieldType,
          placeholder: '',
          required: editFieldRequired,
          options: editFieldOptions ? editFieldOptions.split(',').map((s) => s.trim()).filter(Boolean) : [],
          order: editFieldOrder
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Field "${data.field.label}" updated successfully!`, 'success');
        setShowEditFieldModal(false);
        setEditingField(null);
        setFieldModalErrors({ label: '', name: '', server: '' });
        fetchAllData();
      } else {
        setFieldModalErrors((prev) => ({ ...prev, server: data.message || 'Error updating field' }));
      }
    } catch (err) {
      setFieldModalErrors((prev) => ({ ...prev, server: 'Error updating field' }));
    } finally {
      setSavingEditField(false);
    }
  };

  const handleDeleteField = async (field) => {
    if (!window.confirm(`Are you sure you want to delete the field "${field.label}" (${field.name})? This will remove this field from doctor onboarding.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/superadmin/config/fields/${field._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superadminAuth.token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Field deleted successfully', 'success');
        fetchAllData();
      } else {
        showToast(data.message || 'Error deleting field', 'error');
      }
    } catch (err) {
      showToast('Error deleting field', 'error');
    }
  };

  const handleCreatePromise = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!newPromiseTitle.trim()) {
      errs.title = 'Promise title is required';
    }
    if (Object.keys(errs).length > 0) {
      setPromiseModalErrors(errs);
      return;
    }
    setAddingPromise(true);
    setPromiseModalErrors({ title: '', desc: '', server: '' });
    try {
      const res = await fetch('/api/superadmin/config/promises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify({
          title: newPromiseTitle.trim(),
          desc: newPromiseDesc.trim(),
          icon: newPromiseIcon.trim() || '❤️',
          order: newPromiseOrder
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Promise "${data.promise.title}" added successfully!`, 'success');
        setShowAddPromiseModal(false);
        setNewPromiseTitle('');
        setNewPromiseDesc('');
        setNewPromiseIcon('❤️');
        setPromiseModalErrors({ title: '', desc: '', server: '' });
        fetchAllData();
      } else {
        setPromiseModalErrors((prev) => ({ ...prev, server: data.message || 'Error creating promise' }));
      }
    } catch (err) {
      setPromiseModalErrors((prev) => ({ ...prev, server: 'Error creating promise' }));
    } finally {
      setAddingPromise(false);
    }
  };

  const openEditPromiseModal = (promise) => {
    setEditingPromise(promise);
    setEditPromiseTitle(promise.title || '');
    setEditPromiseDesc(promise.desc || '');
    setEditPromiseIcon(promise.icon || '❤️');
    setEditPromiseOrder(promise.order || 1);
    setPromiseModalErrors({ title: '', desc: '', server: '' });
    setShowEditPromiseModal(true);
  };

  const handleUpdatePromise = async (e) => {
    e.preventDefault();
    if (!editingPromise) return;
    if (!editPromiseTitle.trim()) {
      setPromiseModalErrors({ title: 'Promise title is required', desc: '', server: '' });
      return;
    }
    setSavingEditPromise(true);
    setPromiseModalErrors({ title: '', desc: '', server: '' });
    try {
      const res = await fetch(`/api/superadmin/config/promises/${editingPromise._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify({
          title: editPromiseTitle.trim(),
          desc: editPromiseDesc.trim(),
          icon: editPromiseIcon.trim() || '❤️',
          order: editPromiseOrder
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Promise "${data.promise.title}" updated successfully!`, 'success');
        setShowEditPromiseModal(false);
        setEditingPromise(null);
        setPromiseModalErrors({ title: '', desc: '', server: '' });
        fetchAllData();
      } else {
        setPromiseModalErrors((prev) => ({ ...prev, server: data.message || 'Error updating promise' }));
      }
    } catch (err) {
      setPromiseModalErrors((prev) => ({ ...prev, server: 'Error updating promise' }));
    } finally {
      setSavingEditPromise(false);
    }
  };

  const handleDeletePromise = async (promise) => {
    if (!window.confirm(`Are you sure you want to delete the promise "${promise.title}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/superadmin/config/promises/${promise._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superadminAuth.token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Promise deleted successfully', 'success');
        fetchAllData();
      } else {
        showToast(data.message || 'Error deleting promise', 'error');
      }
    } catch (err) {
      showToast('Error deleting promise', 'error');
    }
  };

  // =========================================================================
  // STATUS & ENABLED TOGGLE HANDLERS (OPTIMISTIC UI UPDATES)
  // =========================================================================
  const handleToggleAdminStatus = async (admin) => {
    const newStatus = admin.status === 'inactive' ? 'active' : 'inactive';
    setAdmins((prev) =>
      prev.map((a) => (a._id === admin._id ? { ...a, status: newStatus } : a))
    );
    try {
      const res = await fetch(`/api/superadmin/admins/${admin._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Admin "${admin.name}" ${newStatus === 'active' ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showToast(data.message || 'Failed to update admin status', 'error');
        fetchAllData();
      }
    } catch (err) {
      showToast('Error updating admin status', 'error');
      fetchAllData();
    }
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
    setUsers((prev) =>
      prev.map((u) => (u._id === user._id ? { ...u, status: newStatus } : u))
    );
    try {
      const res = await fetch(`/api/superadmin/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User "${user.employeeId || user.name}" ${newStatus === 'active' ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showToast(data.message || 'Failed to update user status', 'error');
        fetchAllData();
      }
    } catch (err) {
      showToast('Error updating user status', 'error');
      fetchAllData();
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
      const res = await fetch(`/api/superadmin/doctors/${doc._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Dr. "${doc.doctorName}" ${newStatus === 'active' ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showToast(data.message || 'Failed to update doctor status', 'error');
        fetchAllData();
      }
    } catch (err) {
      showToast('Error updating doctor status', 'error');
      fetchAllData();
    }
  };

  const handleToggleFieldEnabled = async (field) => {
    const newEnabled = field.enabled === false ? true : false;
    setFormFields((prev) =>
      prev.map((f) => (f._id === field._id ? { ...f, enabled: newEnabled } : f))
    );
    try {
      const res = await fetch(`/api/superadmin/config/fields/${field._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify({ enabled: newEnabled })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Field "${field.label}" ${newEnabled ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showToast(data.message || 'Failed to update field', 'error');
        fetchAllData();
      }
    } catch (err) {
      showToast('Error updating field', 'error');
      fetchAllData();
    }
  };

  const handleTogglePromiseEnabled = async (promise) => {
    const newEnabled = promise.enabled === false ? true : false;
    setPromiseList((prev) =>
      prev.map((p) => (p._id === promise._id ? { ...p, enabled: newEnabled } : p))
    );
    try {
      const res = await fetch(`/api/superadmin/config/promises/${promise._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminAuth.token}`
        },
        body: JSON.stringify({ enabled: newEnabled })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Promise "${promise.title}" ${newEnabled ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showToast(data.message || 'Failed to update promise', 'error');
        fetchAllData();
      }
    } catch (err) {
      showToast('Error updating promise', 'error');
      fetchAllData();
    }
  };

  const filteredFields = useMemo(() => {
    if (!fieldSearch.trim()) return formFields;
    const q = fieldSearch.toLowerCase().trim();
    return formFields.filter((f) => (f.label || '').toLowerCase().includes(q) || (f.name || '').toLowerCase().includes(q));
  }, [formFields, fieldSearch]);

  const filteredPromises = useMemo(() => {
    if (!promiseSearch.trim()) return promiseList;
    const q = promiseSearch.toLowerCase().trim();
    return promiseList.filter((p) => (p.title || '').toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q));
  }, [promiseList, promiseSearch]);

  // =========================================================================
  // JQUERY DATATABLE FILTER & SORT LOGIC: ADMINS TABLE (LEVEL 1)
  // =========================================================================
  const toggleAdminSort = (key) => {
    if (adminSortKey === key) {
      setAdminSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setAdminSortKey(key);
      setAdminSortDir('asc');
    }
  };

  const filteredAdmins = useMemo(() => {
    let list = [...admins];

    if (adminSearch.trim()) {
      const q = adminSearch.toLowerCase().trim();
      list = list.filter((adm) => (adm.name || '').toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let valA = a[adminSortKey];
      let valB = b[adminSortKey];

      if (adminSortKey === 'usersCount') {
        valA = a.usersCount !== undefined ? a.usersCount : (a.users?.length || 0);
        valB = b.usersCount !== undefined ? b.usersCount : (b.users?.length || 0);
        return adminSortDir === 'asc' ? valA - valB : valB - valA;
      }
      if (adminSortKey === 'doctorsCount') {
        valA = a.doctorsCount || 0;
        valB = b.doctorsCount || 0;
        return adminSortDir === 'asc' ? valA - valB : valB - valA;
      }

      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
      return adminSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return list;
  }, [admins, adminSearch, adminSortKey, adminSortDir]);

  const totalAdminPages = Math.max(1, Math.ceil(filteredAdmins.length / adminEntriesPerPage));
  const currentAdmins = useMemo(() => {
    const startIndex = (adminCurrentPage - 1) * adminEntriesPerPage;
    return filteredAdmins.slice(startIndex, startIndex + adminEntriesPerPage);
  }, [filteredAdmins, adminCurrentPage, adminEntriesPerPage]);

  const startAdminIndex = filteredAdmins.length === 0 ? 0 : (adminCurrentPage - 1) * adminEntriesPerPage + 1;
  const endAdminIndex = Math.min(adminCurrentPage * adminEntriesPerPage, filteredAdmins.length);

  // =========================================================================
  // JQUERY DATATABLE FILTER & SORT LOGIC: USERS TABLE (LEVEL 2)
  // STRICT DATA ISOLATION: ONLY USERS BELONGING TO SELECTED ADMIN
  // =========================================================================
  const toggleUserSort = (key) => {
    if (userSortKey === key) {
      setUserSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setUserSortKey(key);
      setUserSortDir('asc');
    }
  };

  const isolatedUsersForAdmin = useMemo(() => {
    if (!selectedAdmin) return users;
    const targetAdminId = String(selectedAdmin._id);
    return users.filter((u) => {
      const uAdminId = String(u.adminId?._id || u.adminId || '');
      return uAdminId === targetAdminId;
    });
  }, [users, selectedAdmin]);

  const filteredUsers = useMemo(() => {
    let list = [...isolatedUsersForAdmin];

    if (userSearch.trim()) {
      const q = userSearch.toLowerCase().trim();
      list = list.filter((u) => (u.employeeId || u.name || '').toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (userSortKey === 'doctorsCount') {
        const valA = a.doctorsCount || 0;
        const valB = b.doctorsCount || 0;
        return userSortDir === 'asc' ? valA - valB : valB - valA;
      }
      const valA = (a.employeeId || a.name || '').toLowerCase();
      const valB = (b.employeeId || b.name || '').toLowerCase();
      return userSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return list;
  }, [isolatedUsersForAdmin, userSearch, userSortKey, userSortDir]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / userEntriesPerPage));
  const currentUsers = useMemo(() => {
    const startIndex = (userCurrentPage - 1) * userEntriesPerPage;
    return filteredUsers.slice(startIndex, startIndex + userEntriesPerPage);
  }, [filteredUsers, userCurrentPage, userEntriesPerPage]);

  const startUserIndex = filteredUsers.length === 0 ? 0 : (userCurrentPage - 1) * userEntriesPerPage + 1;
  const endUserIndex = Math.min(userCurrentPage * userEntriesPerPage, filteredUsers.length);

  // =========================================================================
  // JQUERY DATATABLE FILTER & SORT LOGIC: DOCTORS TABLE (LEVEL 3)
  // STRICT DATA ISOLATION: ONLY DOCTORS BELONGING TO SELECTED USER
  // =========================================================================
  const toggleDoctorSort = (key) => {
    if (doctorSortKey === key) {
      setDoctorSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDoctorSortKey(key);
      setDoctorSortDir('asc');
    }
  };

  const isolatedDoctorsForUser = useMemo(() => {
    if (!selectedUser) {
      if (selectedAdmin) {
        const targetAdminId = String(selectedAdmin._id);
        const adminUserIds = new Set(
          users.filter((u) => String(u.adminId?._id || u.adminId || '') === targetAdminId).map((u) => String(u._id))
        );
        return doctors.filter((doc) => {
          const dUserId = String(doc.userId?._id || doc.userId || '');
          return adminUserIds.has(dUserId);
        });
      }
      return doctors;
    }
    const targetUserId = String(selectedUser._id);
    return doctors.filter((doc) => {
      const dUserId = String(doc.userId?._id || doc.userId || '');
      return dUserId === targetUserId;
    });
  }, [doctors, selectedUser, selectedAdmin, users]);

  const filteredDoctors = useMemo(() => {
    let list = [...isolatedDoctorsForUser];

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
        return doctorSortDir === 'asc' ? valA - valB : valB - valA;
      }
      if (doctorSortKey === 'createdAt') {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
        return doctorSortDir === 'asc' ? valA - valB : valB - valA;
      }

      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
      return doctorSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return list;
  }, [isolatedDoctorsForUser, doctorSearch, doctorSortKey, doctorSortDir]);

  const totalDoctorPages = Math.max(1, Math.ceil(filteredDoctors.length / doctorEntriesPerPage));
  const currentDoctors = useMemo(() => {
    const startIndex = (doctorCurrentPage - 1) * doctorEntriesPerPage;
    return filteredDoctors.slice(startIndex, startIndex + doctorEntriesPerPage);
  }, [filteredDoctors, doctorCurrentPage, doctorEntriesPerPage]);

  const startDoctorIndex = filteredDoctors.length === 0 ? 0 : (doctorCurrentPage - 1) * doctorEntriesPerPage + 1;
  const endDoctorIndex = Math.min(doctorCurrentPage * doctorEntriesPerPage, filteredDoctors.length);

  // Helper render sort arrow
  const renderSortArrow = (currentKey, targetKey, dir) => {
    if (currentKey !== targetKey) {
      return <ArrowUpDown size={13} opacity={0.4} />;
    }
    return dir === 'asc' ? <ArrowUp size={13} color="var(--primary)" /> : <ArrowDown size={13} color="var(--primary)" />;
  };

  // =========================================================================
  // UNAUTHENTICATED STATE: LOGIN SCREEN
  // =========================================================================
  if (!superadminAuth?.token || superadminAuth?.user?.role !== 'superadmin') {
    return (
      <div className="medportal-layout" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="medportal-modal-card" style={{ maxWidth: '440px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div className="medportal-brand-icon" style={{ margin: '0 auto 0.75rem auto' }}>
              <Heart size={20} fill="#ffffff" color="#ffffff" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading), Fraunces, serif', fontSize: '1.75rem', color: 'var(--foreground)', margin: 0, fontWeight: 800 }}>
              Superadmin Portal
            </h2>
            <p style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', margin: '4px 0 0 0', textTransform: 'uppercase' }}>
              Hierarchical Control Access
            </p>
          </div>

          <form onSubmit={handleSuperadminLogin} noValidate>
            {loginErrors.server && (
              <div className="inbuilt-error-alert">
                <AlertCircle size={17} className="error-icon" />
                <span>{loginErrors.server}</span>
              </div>
            )}

            <div className="medportal-form-group">
              <label>Superadmin Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                className={`medportal-form-control ${loginErrors.name ? 'has-error' : ''}`}
                placeholder="Enter Superadmin Name"
                autoComplete="off"
                value={superadminName}
                onChange={(e) => {
                  setSuperadminName(e.target.value);
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
                placeholder="••••••••"
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
              {loginLoading ? 'Authenticating...' : 'Sign In as Superadmin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // AUTHENTICATED STATE: MEDPORTAL SUPERADMIN DASHBOARD
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
            <Heart size={16} fill="#ffffff" color="#ffffff" />
          </div>
          <div className="medportal-mobile-brand-info">
            <span className="medportal-mobile-brand-title">World Heart Day</span>
            <span className="medportal-mobile-brand-tag">SUPERADMIN</span>
          </div>
        </div>
        <div className="medportal-mobile-user">
          <span className="medportal-pill-superadmin">Superadmin</span>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div className="medportal-sidebar-backdrop" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* =====================================================================
          1. LEFT SIDEBAR (RESPONSIVE DRAWER ON MOBILE)
          ===================================================================== */}
      <aside className={`medportal-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="medportal-sidebar-header-row">
          <div
            className="medportal-brand"
            onClick={() => { window.location.href = '/'; }}
            style={{ cursor: 'pointer' }}
            title="Go to Home Page"
          >
            <div className="medportal-brand-icon">
              <Heart size={20} fill="#ffffff" color="#ffffff" />
            </div>
            <div className="medportal-brand-text">
              <span className="medportal-brand-title">World Heart Day</span>
              <span className="medportal-brand-subtitle">SUPERADMIN</span>
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

          {/* LEVEL 1: Admins Table Active */}
          {flowLevel === 'admins' && (
            <div className="medportal-sidebar-tree-item active" title="Admins Table">
              <Shield size={17} />
              <span>Admins</span>
            </div>
          )}

          {/* LEVEL 2: Users Table Active under selectedAdmin */}
          {flowLevel === 'users' && (
            <>
              <button
                type="button"
                className="medportal-sidebar-tree-item"
                onClick={goToAdmins}
                title="Back to Admins table"
              >
                <Shield size={17} />
                <span>Admins</span>
              </button>
              <div className="medportal-sidebar-tree-connector" style={{ marginLeft: '1.25rem' }} />
              <div className="medportal-sidebar-tree-item active" style={{ paddingLeft: '1.15rem' }}>
                <UserIcon size={17} />
                <span title={selectedAdmin ? `Users under ${selectedAdmin.name}` : 'Users'}>
                  Users
                </span>
              </div>
            </>
          )}

          {/* LEVEL 3: Doctors Table Active (also active when visiting doctor profile) */}
          {(flowLevel === 'doctors' || flowLevel === 'doctordetails') && (
            <>
              <button
                type="button"
                className="medportal-sidebar-tree-item"
                onClick={goToAdmins}
                title="Back to Admins table"
              >
                <Shield size={17} />
                <span>Admins</span>
              </button>
              <div className="medportal-sidebar-tree-connector" style={{ marginLeft: '1.25rem' }} />
              <button
                type="button"
                className="medportal-sidebar-tree-item"
                onClick={goToUsers}
                title={`Back to Users under ${selectedAdmin?.name || 'Admin'}`}
                style={{ paddingLeft: '1.15rem' }}
              >
                <UserIcon size={17} />
                <span title={selectedAdmin ? `Users under ${selectedAdmin.name}` : 'Users'}>
                  Users
                </span>
              </button>
              <div className="medportal-sidebar-tree-connector" style={{ marginLeft: '1.75rem' }} />
              {flowLevel === 'doctordetails' ? (
                <button
                  type="button"
                  className="medportal-sidebar-tree-item active"
                  onClick={goToDoctors}
                  title="Back to Doctors table"
                  style={{ paddingLeft: '1.65rem' }}
                >
                  <Stethoscope size={17} />
                  <span>Doctors</span>
                </button>
              ) : (
                <div className="medportal-sidebar-tree-item active" style={{ paddingLeft: '1.65rem' }}>
                  <Stethoscope size={17} />
                  <span>Doctors</span>
                </div>
              )}
            </>
          )}

          {/* Dynamic Settings view: provide Admins link to return to Data Tables */}
          {(flowLevel === 'formfields' || flowLevel === 'promises') && (
            <button
              type="button"
              className="medportal-sidebar-tree-item"
              onClick={goToAdmins}
              title="Back to Admins table"
            >
              <Shield size={17} />
              <span>Admins</span>
            </button>
          )}

          <div className="medportal-sidebar-tree-header" style={{ marginTop: '1.75rem' }}>Dynamic Settings</div>

          {/* Form Fields Builder */}
          <button
            type="button"
            className={`medportal-sidebar-tree-item ${flowLevel === 'formfields' ? 'active' : ''}`}
            onClick={() => { setFlowLevel('formfields'); setIsMobileMenuOpen(false); }}
            title="Manage Doctor Form Fields"
          >
            <Sliders size={17} />
            <span>Form Fields</span>
          </button>

          {/* Promises / Habits Management */}
          <button
            type="button"
            className={`medportal-sidebar-tree-item ${flowLevel === 'promises' ? 'active' : ''}`}
            onClick={() => { setFlowLevel('promises'); setIsMobileMenuOpen(false); }}
            title="Manage Heart Promises & Habits"
          >
            <Sparkles size={17} />
            <span>Heart Promises</span>
          </button>
        </div>

        {/* Sidebar Footer with Logout Button */}
        <div className="medportal-sidebar-footer">
          <button
            type="button"
            className="medportal-sidebar-logout-btn"
            onClick={() => {
              setIsMobileMenuOpen(false);
              if (onLogout) onLogout('superadmin');
            }}
            title="Log out of Superadmin"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* =====================================================================
          2. MAIN CONTENT CANVAS
          ===================================================================== */}
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

        {/* Top Header Row with Breadcrumb & User Actions */}
        <div className="medportal-header-area">
          <div className="medportal-top-bar">
            <div className="medportal-header-left">
              {/* Dynamic Page Heading */}
              <h1 className="medportal-page-title">
                {flowLevel === 'admins' && 'Admins'}
                {flowLevel === 'users' && (selectedAdmin ? `Users under ${selectedAdmin.name}` : 'All Enrolled Users')}
                {flowLevel === 'doctors' && (selectedUser ? `Doctors under ${selectedUser.employeeId || selectedUser.name}` : (selectedAdmin ? `Doctors under ${selectedAdmin.name}` : 'All Enrolled Doctors'))}
                {flowLevel === 'doctordetails' && `Doctor Details: Dr. ${selectedDoctor?.doctorName || ''}`}
                {flowLevel === 'formfields' && 'Doctor Form Fields Configuration'}
                {flowLevel === 'promises' && 'Heart Promises & Habits Management'}
              </h1>
            </div>

            {/* Top Right: Superadmin pill & Log out */}
            <div className="medportal-user-actions">
              <span className="medportal-pill-superadmin">Superadmin</span>
              <button
                type="button"
                className="medportal-btn-logout"
                onClick={() => onLogout && onLogout('superadmin')}
              >
                Logout
              </button>
            </div>

            {/* Mobile In-line Actions (On the most right and in-line with heading text) */}
            <div className="medportal-mobile-title-actions">
              {flowLevel === 'admins' && (
                <button
                  type="button"
                  className="medportal-btn-add medportal-btn-add-inline"
                  onClick={() => setShowAddAdminModal(true)}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Add admin</span>
                </button>
              )}

              {flowLevel === 'users' && (
                <button
                  type="button"
                  className="medportal-btn-add medportal-btn-add-inline"
                  onClick={() => openAddUserModal(selectedAdmin?._id)}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Add user</span>
                </button>
              )}

              {flowLevel === 'formfields' && (
                <button
                  type="button"
                  className="medportal-btn-add medportal-btn-add-inline"
                  onClick={openAddFieldModal}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Add field</span>
                </button>
              )}

              {flowLevel === 'promises' && (
                <button
                  type="button"
                  className="medportal-btn-add medportal-btn-add-inline"
                  onClick={openAddPromiseModal}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Add promise</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Row: Back buttons + Add Admin / Add Field / Add Promise */}
          <div className="medportal-action-row" style={{ marginTop: '1.25rem', justifyContent: flowLevel === 'admins' ? 'flex-end' : 'space-between' }}>
            {flowLevel !== 'admins' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {flowLevel === 'users' && (
                  <button type="button" className="medportal-btn-back-flow" onClick={goToAdmins}>
                    <ArrowLeft size={15} />
                    <span>Back to Admins</span>
                  </button>
                )}

                {flowLevel === 'doctors' && (
                  <button type="button" className="medportal-btn-back-flow" onClick={goToUsers}>
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

                {(flowLevel === 'formfields' || flowLevel === 'promises') && (
                  <button type="button" className="medportal-btn-back-flow" onClick={goToAdmins}>
                    <ArrowLeft size={15} />
                    <span>Back to Admins</span>
                  </button>
                )}
              </div>
            )}

            {/* Action CTA Buttons */}
            <div className="medportal-action-group">
              {flowLevel === 'admins' && (
                <button
                  type="button"
                  className="medportal-btn-add"
                  onClick={() => setShowAddAdminModal(true)}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Add admin</span>
                </button>
              )}

              {flowLevel === 'users' && (
                <button
                  type="button"
                  className="medportal-btn-add"
                  onClick={() => openAddUserModal(selectedAdmin?._id)}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Add user to {selectedAdmin?.name}</span>
                </button>
              )}

              {flowLevel === 'formfields' && (
                <button
                  type="button"
                  className="medportal-btn-add"
                  onClick={openAddFieldModal}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Add form field</span>
                </button>
              )}

              {flowLevel === 'promises' && (
                <button
                  type="button"
                  className="medportal-btn-add"
                  onClick={openAddPromiseModal}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Add promise</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===================================================================
            LEVEL 1: ADMINS JQUERY DATATABLE
            Flow: Admins (onclick) -> Users
            =================================================================== */}
        {flowLevel === 'admins' && (
          <div className="medportal-table-card">
            {/* Table Controls (Show entries & Search) */}
            <div className="medportal-table-controls">
              <div className="medportal-entries-selector">
                <span>Show</span>
                <CustomDropdown
                  className="custom-dropdown-compact"
                  value={adminEntriesPerPage}
                  options={[5, 10, 25, 50]}
                  onChange={(val) => {
                    setAdminEntriesPerPage(Number(val));
                    setAdminCurrentPage(1);
                  }}
                />
                <span>entries</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="medportal-btn-export"
                  onClick={handleExportAdmins}
                  title="Export Admins to CSV / Excel"
                >
                  <Download size={14} />
                  <span>Export Admins</span>
                </button>

                <div className="medportal-search-wrap">
                  <span>Search:</span>
                  <input
                    type="text"
                    className="medportal-search-input"
                    value={adminSearch}
                    onChange={(e) => {
                      setAdminSearch(e.target.value);
                      setAdminCurrentPage(1);
                    }}
                    placeholder="Search admin name..."
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
                      onClick={() => toggleAdminSort('name')}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="medportal-th-content">
                        <span>ADMIN</span>
                        {renderSortArrow(adminSortKey, 'name', adminSortDir)}
                      </div>
                    </th>
                    <th
                      className="medportal-th-sortable"
                      onClick={() => toggleAdminSort('usersCount')}
                      style={{ textAlign: 'center', cursor: 'pointer' }}
                    >
                      <div className="medportal-th-content" style={{ justifyContent: 'center' }}>
                        <span>USERS</span>
                        {renderSortArrow(adminSortKey, 'usersCount', adminSortDir)}
                      </div>
                    </th>
                    <th
                      className="medportal-th-sortable"
                      onClick={() => toggleAdminSort('doctorsCount')}
                      style={{ textAlign: 'center', cursor: 'pointer' }}
                    >
                      <div className="medportal-th-content" style={{ justifyContent: 'center' }}>
                        <span>DOCTORS</span>
                        {renderSortArrow(adminSortKey, 'doctorsCount', adminSortDir)}
                      </div>
                    </th>
                    <th style={{ textAlign: 'center' }}>ENABLED</th>
                    <th style={{ textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="medportal-td-empty">
                        Loading admins from database...
                      </td>
                    </tr>
                  )}

                  {!loading && currentAdmins.length === 0 && (
                    <tr>
                      <td colSpan={5} className="medportal-td-empty">
                        {adminSearch.trim() ? 'No matching admins found' : 'No admins found. Click "+ Add admin" above.'}
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    currentAdmins.map((admin) => {
                      const empCount = admin.usersCount !== undefined ? admin.usersCount : (admin.users?.length || 0);
                      const docCount = admin.doctorsCount !== undefined ? admin.doctorsCount : 0;
                      const isEnabled = admin.status !== 'inactive';

                      return (
                        <tr
                          key={admin._id}
                          onClick={() => handleAdminClick(admin)}
                          className="medportal-clickable-row"
                          title={`Click to view users under ${admin.name}`}
                        >
                          <td className="medportal-td-admin">
                            <span className="medportal-drilldown-link">
                              <Shield size={16} color="var(--primary)" />
                              <strong>{admin.name}</strong>
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--foreground)' }}>
                            {empCount} Users
                          </td>
                          <td style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                            {docCount} Doctors
                          </td>
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <label className="medportal-switch" title={isEnabled ? 'Enabled - Click to disable' : 'Disabled - Click to enable'}>
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => handleToggleAdminStatus(admin)}
                              />
                              <span className="medportal-slider" />
                            </label>
                          </td>
                          <td className="medportal-td-action" style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="medportal-pill-edit"
                                onClick={(e) => openEditAdminModal(admin, e)}
                                title="Edit admin"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="medportal-pill-delete"
                                onClick={(e) => handleDeleteAdmin(admin._id, admin.name, e)}
                                title="Delete admin"
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
                {filteredAdmins.length === 0
                  ? 'Showing 0 to 0 of 0 entries'
                  : `Showing ${startAdminIndex} to ${endAdminIndex} of ${filteredAdmins.length} entries`}
                {adminSearch.trim() && ` (filtered from ${admins.length} total)`}
              </div>

              <div className="medportal-pagination-nav">
                <button
                  type="button"
                  className="medportal-page-btn"
                  disabled={adminCurrentPage <= 1}
                  onClick={() => setAdminCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>

                {Array.from({ length: totalAdminPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`medportal-page-num ${adminCurrentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setAdminCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  className="medportal-page-btn"
                  disabled={adminCurrentPage >= totalAdminPages}
                  onClick={() => setAdminCurrentPage((p) => Math.min(totalAdminPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            LEVEL 2: USERS JQUERY DATATABLE (STRICT DATA ISOLATION: SELECTED ADMIN ONLY)
            Flow: Users (onclick) -> Doctors
            =================================================================== */}
        {flowLevel === 'users' && selectedAdmin && (
          <div className="medportal-table-card">
            {/* Table Controls */}
            <div className="medportal-table-controls">
              <div className="medportal-entries-selector">
                <span>Show</span>
                <CustomDropdown
                  className="custom-dropdown-compact"
                  value={userEntriesPerPage}
                  options={[5, 10, 25, 50]}
                  onChange={(val) => {
                    setUserEntriesPerPage(Number(val));
                    setUserCurrentPage(1);
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
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserCurrentPage(1);
                    }}
                    placeholder="Search employee ID..."
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
                      onClick={() => toggleUserSort('employeeId')}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="medportal-th-content">
                        <span>USER (EMPLOYEE ID)</span>
                        {renderSortArrow(userSortKey, 'employeeId', userSortDir)}
                      </div>
                    </th>
                    <th
                      className="medportal-th-sortable"
                      onClick={() => toggleUserSort('doctorsCount')}
                      style={{ textAlign: 'center', cursor: 'pointer' }}
                    >
                      <div className="medportal-th-content" style={{ justifyContent: 'center' }}>
                        <span>DOCTORS / POSTERS</span>
                        {renderSortArrow(userSortKey, 'doctorsCount', userSortDir)}
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
                        Loading users for Admin "{selectedAdmin.name}"...
                      </td>
                    </tr>
                  )}

                  {!loading && currentUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="medportal-td-empty">
                        {userSearch.trim()
                          ? 'No matching users found under this admin'
                          : `No users registered under "${selectedAdmin.name}". Click "+ Add user to ${selectedAdmin.name}" to create one.`}
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    currentUsers.map((user) => {
                      const docCount = user.doctorsCount !== undefined ? user.doctorsCount : 0;
                      const isEnabled = user.status !== 'inactive';

                      return (
                        <tr
                          key={user._id}
                          onClick={() => handleUserClick(user)}
                          className="medportal-clickable-row"
                          title={`Click to view doctors registered by ${user.employeeId || user.name}`}
                        >
                          <td className="medportal-td-admin">
                            <span className="medportal-drilldown-link">
                              <UserIcon size={16} color="var(--primary)" />
                              <strong>{user.employeeId || user.name}</strong>
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--foreground)' }}>
                            {docCount} Doctors
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
                          <td className="medportal-td-action" style={{ textAlign: 'center' }}>
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

            {/* Pagination & Info Footer */}
            <div className="medportal-pagination-footer">
              <div className="medportal-pagination-info">
                {filteredUsers.length === 0
                  ? 'Showing 0 to 0 of 0 entries'
                  : `Showing ${startUserIndex} to ${endUserIndex} of ${filteredUsers.length} entries under "${selectedAdmin.name}"`}
                {userSearch.trim() && ` (filtered from ${isolatedUsersForAdmin.length} total)`}
              </div>

              <div className="medportal-pagination-nav">
                <button
                  type="button"
                  className="medportal-page-btn"
                  disabled={userCurrentPage <= 1}
                  onClick={() => setUserCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>

                {Array.from({ length: totalUserPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`medportal-page-num ${userCurrentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setUserCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  className="medportal-page-btn"
                  disabled={userCurrentPage >= totalUserPages}
                  onClick={() => setUserCurrentPage((p) => Math.min(totalUserPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            LEVEL 3: DOCTORS JQUERY DATATABLE (STRICT DATA ISOLATION: SELECTED USER ONLY)
            Flow: Doctor (onclick) -> DoctorDetails
            =================================================================== */}
        {flowLevel === 'doctors' && selectedUser && (
          <div className="medportal-table-card">
            {/* Table Controls */}
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
                    value={doctorSearch}
                    onChange={(e) => {
                      setDoctorSearch(e.target.value);
                      setDoctorCurrentPage(1);
                    }}
                    placeholder="Search doctor or clinic..."
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
                        Loading doctors for User "{selectedUser.employeeId || selectedUser.name}"...
                      </td>
                    </tr>
                  )}

                  {!loading && currentDoctors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="medportal-td-empty">
                        {doctorSearch.trim()
                          ? 'No matching doctors found'
                          : `No doctors registered by User "${selectedUser.employeeId || selectedUser.name}" yet.`}
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
                            <span style={{ background: '#ecfdf5', color: '#047857', padding: '3px 10px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700 }}>
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
                  : `Showing ${startDoctorIndex} to ${endDoctorIndex} of ${filteredDoctors.length} entries for "${selectedUser.employeeId || selectedUser.name}"`}
                {doctorSearch.trim() && ` (filtered from ${isolatedDoctorsForUser.length} total)`}
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
            LEVEL 4: DOCTOR DETAILS VIEW (FULL DETAILS & PROMISES)
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
                    <span className="medportal-doctor-meta-val">{selectedAdmin?.name || selectedDoctor.adminId?.name || 'N/A'}</span>
                  </div>

                  <div className="medportal-doctor-meta-item">
                    <span className="medportal-doctor-meta-label">Registered By User</span>
                    <span className="medportal-doctor-meta-val">{selectedUser?.employeeId || selectedDoctor.userId?.employeeId || 'N/A'}</span>
                  </div>

                  <div className="medportal-doctor-meta-item">
                    <span className="medportal-doctor-meta-label">Total Promises</span>
                    <span className="medportal-doctor-meta-val">{selectedDoctor.selectedPromises?.length || 0}</span>
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

              {/* Right Column: 10 Selected Promises */}
              <div className="medportal-promises-section">
                <div className="medportal-promises-header">
                  <h3>
                    <Sparkles size={20} color="var(--primary)" />
                    <span>Heart Health Promises Pledged</span>
                  </h3>
                  <span style={{ background: 'var(--secondary)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '9999px', fontWeight: 700, fontSize: '0.84rem' }}>
                    {selectedDoctor.selectedPromises?.length || 0} Promises
                  </span>
                </div>

                {(!selectedDoctor.selectedPromises || selectedDoctor.selectedPromises.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                    No promises selected for this doctor.
                  </div>
                ) : (
                  <div className="medportal-promises-grid">
                    {selectedDoctor.selectedPromises.map((promise, index) => {
                      // Check if promise is string or contains title/description
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

        {/* ===================================================================
            DYNAMIC CONFIGURATION: FORM FIELDS JQUERY DATATABLE
            =================================================================== */}
        {flowLevel === 'formfields' && (
          <div className="medportal-table-card">
            <div className="medportal-table-controls">
              <div className="medportal-entries-selector">
                <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                  Configured Form Fields ({formFields.length})
                </span>
              </div>
              <div className="medportal-search-wrap">
                <span>Search:</span>
                <input
                  type="text"
                  className="medportal-search-input"
                  placeholder="Filter fields..."
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="medportal-table-wrapper">
              <table className="medportal-table">
                <thead>
                  <tr>
                    <th>FIELD LABEL</th>
                    <th>FIELD KEY (ID)</th>
                    <th>INPUT TYPE</th>
                    <th style={{ textAlign: 'center' }}>REQUIRED</th>
                    <th style={{ textAlign: 'center' }}>ENABLED</th>
                    <th style={{ textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFields.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="medportal-td-empty">
                        No form fields match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredFields.map((field) => (
                      <tr key={field._id || field.name}>
                        <td>
                          <strong>{field.label}</strong>
                        </td>
                        <td>
                          <span className="medportal-key-chip">{field.name}</span>
                        </td>
                        <td>
                          <span className={`medportal-badge-type ${field.type}`}>
                            {field.type}
                          </span>
                          {field.options && field.options.length > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              {field.options.join(', ')}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`medportal-badge-req ${field.required ? 'required' : 'optional'}`}>
                            {field.required ? 'Required' : 'Optional'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <label className="medportal-switch" title={field.enabled !== false ? 'Enabled - Click to disable' : 'Disabled - Click to enable'}>
                            <input
                              type="checkbox"
                              checked={field.enabled !== false}
                              onChange={() => handleToggleFieldEnabled(field)}
                            />
                            <span className="medportal-slider" />
                          </label>
                        </td>
                        <td className="medportal-td-action" style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="medportal-pill-edit"
                              onClick={() => openEditFieldModal(field)}
                              title={`Edit ${field.label}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="medportal-pill-delete"
                              onClick={() => handleDeleteField(field)}
                              title={`Delete ${field.label}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================
            DYNAMIC CONFIGURATION: PROMISES JQUERY DATATABLE
            =================================================================== */}
        {flowLevel === 'promises' && (
          <div className="medportal-table-card">
            <div className="medportal-table-controls">
              <div className="medportal-entries-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                  Configured Heart Promises ({promiseList.length})
                </span>
              </div>
              <div className="medportal-search-wrap">
                <span>Search:</span>
                <input
                  type="text"
                  className="medportal-search-input"
                  placeholder="Filter promises..."
                  value={promiseSearch}
                  onChange={(e) => setPromiseSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="medportal-table-wrapper medportal-table-wrapper-scrollable">
              <table className="medportal-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>ICON</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>ID</th>
                    <th>PROMISE TITLE</th>
                    <th>DESCRIPTION</th>
                    <th style={{ textAlign: 'center' }}>ENABLED</th>
                    <th style={{ textAlign: 'center', width: '140px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPromises.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="medportal-td-empty">
                        No promises match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredPromises.map((promise) => (
                      <tr key={promise._id || promise.id}>
                        <td style={{ textAlign: 'center', fontSize: '1.4rem' }}>
                          {promise.icon || '❤️'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          #{promise.id}
                        </td>
                        <td>
                          <strong>{promise.title}</strong>
                        </td>
                        <td style={{ color: 'var(--muted-foreground)', fontSize: '0.88rem' }}>
                          {promise.desc || 'No description'}
                        </td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <label className="medportal-switch" title={promise.enabled !== false ? 'Enabled - Click to disable' : 'Disabled - Click to enable'}>
                            <input
                              type="checkbox"
                              checked={promise.enabled !== false}
                              onChange={() => handleTogglePromiseEnabled(promise)}
                            />
                            <span className="medportal-slider" />
                          </label>
                        </td>
                        <td className="medportal-td-action" style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="medportal-pill-edit"
                              onClick={() => openEditPromiseModal(promise)}
                              title={`Edit ${promise.title}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="medportal-pill-delete"
                              onClick={() => handleDeletePromise(promise)}
                              title={`Delete ${promise.title}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          MODAL 1: ADD ADMIN
          ===================================================================== */}
      {showAddAdminModal && (
        <div className="medportal-modal-backdrop" onClick={() => setShowAddAdminModal(false)}>
          <div className="medportal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="medportal-modal-header">
              <h3>Create New Admin</h3>
              <button
                type="button"
                className="medportal-modal-close"
                onClick={() => setShowAddAdminModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} noValidate>
              {addAdminErrors.server && (
                <div className="inbuilt-error-alert">
                  <AlertCircle size={16} className="error-icon" />
                  <span>{addAdminErrors.server}</span>
                </div>
              )}

              <div className="medportal-form-group">
                <label>Admin Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  className={`medportal-form-control ${addAdminErrors.name ? 'has-error' : ''}`}
                  placeholder="e.g. admin20"
                  value={newAdminName}
                  onChange={(e) => {
                    setNewAdminName(e.target.value);
                    if (addAdminErrors.name || addAdminErrors.server) {
                      setAddAdminErrors(prev => ({ ...prev, name: '', server: '' }));
                    }
                  }}
                  autoComplete="off"
                />
                {addAdminErrors.name && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{addAdminErrors.name}</span>
                  </div>
                )}
              </div>

              <div className="medportal-form-group">
                <label>Password <span style={{ color: '#ef4444' }}>*</span> (min. 6 characters)</label>
                <input
                  type="password"
                  className={`medportal-form-control ${addAdminErrors.password ? 'has-error' : ''}`}
                  placeholder="••••••••"
                  value={newAdminPassword}
                  onChange={(e) => {
                    setNewAdminPassword(e.target.value);
                    if (addAdminErrors.password || addAdminErrors.server) {
                      setAddAdminErrors(prev => ({ ...prev, password: '', server: '' }));
                    }
                  }}
                />
                {addAdminErrors.password && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{addAdminErrors.password}</span>
                  </div>
                )}
              </div>

              <div className="medportal-modal-actions">
                <button
                  type="button"
                  className="medportal-btn-cancel"
                  onClick={() => setShowAddAdminModal(false)}
                  disabled={addingAdmin}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="medportal-btn-submit"
                  disabled={addingAdmin}
                >
                  {addingAdmin ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: EDIT ADMIN
          ===================================================================== */}
      {showEditAdminModal && editingAdmin && (
        <div className="medportal-modal-backdrop" onClick={() => setShowEditAdminModal(false)}>
          <div className="medportal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="medportal-modal-header">
              <h3>Edit Admin "{editingAdmin.name}"</h3>
              <button
                type="button"
                className="medportal-modal-close"
                onClick={() => setShowEditAdminModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditAdmin} noValidate>
              {editAdminErrors.server && (
                <div className="inbuilt-error-alert">
                  <AlertCircle size={16} className="error-icon" />
                  <span>{editAdminErrors.server}</span>
                </div>
              )}

              <div className="medportal-form-group">
                <label>Admin Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  className={`medportal-form-control ${editAdminErrors.name ? 'has-error' : ''}`}
                  value={editAdminName}
                  onChange={(e) => {
                    setEditAdminName(e.target.value);
                    if (editAdminErrors.name || editAdminErrors.server) {
                      setEditAdminErrors(prev => ({ ...prev, name: '', server: '' }));
                    }
                  }}
                />
                {editAdminErrors.name && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{editAdminErrors.name}</span>
                  </div>
                )}
              </div>

              <div className="medportal-form-group">
                <label>New Password (min. 6 characters, leave blank to keep current)</label>
                <input
                  type="password"
                  className={`medportal-form-control ${editAdminErrors.password ? 'has-error' : ''}`}
                  placeholder="Leave empty to keep existing password"
                  value={editAdminPassword}
                  onChange={(e) => {
                    setEditAdminPassword(e.target.value);
                    if (editAdminErrors.password || editAdminErrors.server) {
                      setEditAdminErrors(prev => ({ ...prev, password: '', server: '' }));
                    }
                  }}
                />
                {editAdminErrors.password && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{editAdminErrors.password}</span>
                  </div>
                )}
              </div>

              <div className="medportal-modal-actions">
                <button
                  type="button"
                  className="medportal-btn-cancel"
                  onClick={() => setShowEditAdminModal(false)}
                  disabled={savingEditAdmin}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="medportal-btn-submit"
                  disabled={savingEditAdmin}
                >
                  {savingEditAdmin ? 'Saving...' : 'Update Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: ADD USER (CAN ASSIGN TO ANY ADMIN OR PRESELECTED ADMIN)
          ===================================================================== */}
      {showAddUserModal && (
        <div className="medportal-modal-backdrop" onClick={() => setShowAddUserModal(false)}>
          <div className="medportal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="medportal-modal-header">
              <h3>Create New User (Employee)</h3>
              <button
                type="button"
                className="medportal-modal-close"
                onClick={() => setShowAddUserModal(false)}
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
                <label>Assign to Parent Admin <span style={{ color: '#ef4444' }}>*</span></label>
                <CustomDropdown
                  value={newUserAdminId}
                  placeholder={admins.length === 0 ? 'No Admins available' : 'Select an Admin...'}
                  options={admins.map((adm) => ({ value: adm._id, label: adm.name }))}
                  onChange={(val) => {
                    setNewUserAdminId(val);
                    if (addUserErrors.adminId || addUserErrors.server) {
                      setAddUserErrors(prev => ({ ...prev, adminId: '', server: '' }));
                    }
                  }}
                />
                {addUserErrors.adminId && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{addUserErrors.adminId}</span>
                  </div>
                )}
              </div>

              <div className="medportal-form-group">
                <label>User Employee ID <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  className={`medportal-form-control ${addUserErrors.employeeId ? 'has-error' : ''}`}
                  placeholder="e.g. AGM001"
                  value={newUserEmpId}
                  onChange={(e) => {
                    setNewUserEmpId(e.target.value);
                    if (addUserErrors.employeeId || addUserErrors.server) {
                      setAddUserErrors(prev => ({ ...prev, employeeId: '', server: '' }));
                    }
                  }}
                  autoComplete="off"
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
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={(e) => {
                    setNewUserPassword(e.target.value);
                    if (addUserErrors.password || addUserErrors.server) {
                      setAddUserErrors(prev => ({ ...prev, password: '', server: '' }));
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
                  onClick={() => setShowAddUserModal(false)}
                  disabled={addingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="medportal-btn-submit"
                  disabled={addingUser || admins.length === 0}
                >
                  {addingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: EDIT USER
          ===================================================================== */}
      {showEditUserModal && editingUser && (
        <div className="medportal-modal-backdrop" onClick={() => setShowEditUserModal(false)}>
          <div className="medportal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="medportal-modal-header">
              <h3>Edit User "{editingUser.employeeId || editingUser.name}"</h3>
              <button
                type="button"
                className="medportal-modal-close"
                onClick={() => setShowEditUserModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} noValidate>
              {editUserErrors.server && (
                <div className="inbuilt-error-alert">
                  <AlertCircle size={16} className="error-icon" />
                  <span>{editUserErrors.server}</span>
                </div>
              )}

              <div className="medportal-form-group">
                <label>User Employee ID <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  className={`medportal-form-control ${editUserErrors.employeeId ? 'has-error' : ''}`}
                  value={editUserEmpId}
                  onChange={(e) => {
                    setEditUserEmpId(e.target.value);
                    if (editUserErrors.employeeId || editUserErrors.server) {
                      setEditUserErrors(prev => ({ ...prev, employeeId: '', server: '' }));
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
                <label>Parent Admin <span style={{ color: '#ef4444' }}>*</span></label>
                <CustomDropdown
                  value={editUserAdminId}
                  placeholder="Select an Admin..."
                  options={admins.map((adm) => ({ value: adm._id, label: adm.name }))}
                  onChange={(val) => {
                    setEditUserAdminId(val);
                    if (editUserErrors.adminId || editUserErrors.server) {
                      setEditUserErrors(prev => ({ ...prev, adminId: '', server: '' }));
                    }
                  }}
                />
                {editUserErrors.adminId && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{editUserErrors.adminId}</span>
                  </div>
                )}
              </div>

              <div className="medportal-form-group">
                <label>New Password (min. 6 characters, leave blank to keep current)</label>
                <input
                  type="password"
                  className={`medportal-form-control ${editUserErrors.password ? 'has-error' : ''}`}
                  placeholder="Leave empty to keep existing password"
                  value={editUserPassword}
                  onChange={(e) => {
                    setEditUserPassword(e.target.value);
                    if (editUserErrors.password || editUserErrors.server) {
                      setEditUserErrors(prev => ({ ...prev, password: '', server: '' }));
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
                  onClick={() => setShowEditUserModal(false)}
                  disabled={savingEditUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="medportal-btn-submit"
                  disabled={savingEditUser}
                >
                  {savingEditUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: EDIT DOCTOR
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
                    {Boolean(formFields.find(f => f.name === 'doctorName')?.enabled !== false && formFields.find(f => f.name === 'doctorName')?.required) && <span style={{ color: '#ef4444' }}> *</span>}
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
                    {Boolean(formFields.find(f => f.name === 'clinicName')?.enabled !== false && formFields.find(f => f.name === 'clinicName')?.required) && <span style={{ color: '#ef4444' }}> *</span>}
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

      {/* =====================================================================
          MODAL 4: ADD CUSTOM FORM FIELD
          ===================================================================== */}
      {showAddFieldModal && (
        <div className="medportal-modal-backdrop" onClick={() => setShowAddFieldModal(false)}>
          <div className="medportal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="medportal-modal-header">
              <h3>Add Doctor Form Field</h3>
              <button
                type="button"
                className="medportal-modal-close"
                onClick={() => setShowAddFieldModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateField} noValidate>
              {fieldModalErrors.server && (
                <div className="inbuilt-error-alert">
                  <AlertCircle size={16} className="error-icon" />
                  <span>{fieldModalErrors.server}</span>
                </div>
              )}

              <div className="medportal-form-group">
                <label>Field Label *</label>
                <input
                  type="text"
                  className={`medportal-form-control ${fieldModalErrors.label ? 'has-error' : ''}`}
                  placeholder="e.g. Doctor Specialization"
                  value={newFieldLabel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewFieldLabel(val);
                    setNewFieldName(deriveKeyFromLabel(val));
                    if (fieldModalErrors.label || fieldModalErrors.server) {
                      setFieldModalErrors(prev => ({ ...prev, label: '', server: '' }));
                    }
                  }}
                />
                {fieldModalErrors.label && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{fieldModalErrors.label}</span>
                  </div>
                )}
              </div>

              <div className="medportal-form-row-2col">
                <div className="medportal-form-group">
                  <label>Input Type *</label>
                  <CustomDropdown
                    value={newFieldType}
                    options={[
                      { value: 'text', label: 'Text Input' },
                      { value: 'textarea', label: 'Multi-line Textarea' },
                      { value: 'number', label: 'Numeric Input' },
                      { value: 'select', label: 'Dropdown Select' },
                      { value: 'file', label: 'File Input' }
                    ]}
                    onChange={(val) => setNewFieldType(val)}
                  />
                </div>

                <div className="medportal-form-group">
                  <label>Required Field?</label>
                  <div style={{ display: 'flex', alignItems: 'center', height: '42px', gap: '0.65rem' }}>
                    <input
                      type="checkbox"
                      id="newFieldRequiredCheck"
                      checked={newFieldRequired}
                      onChange={(e) => setNewFieldRequired(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="newFieldRequiredCheck" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>
                      Mark as Mandatory (*)
                    </label>
                  </div>
                </div>
              </div>

              {newFieldType === 'select' && (
                <div className="medportal-form-group">
                  <label>Options (comma separated)</label>
                  <input
                    type="text"
                    className="medportal-form-control"
                    placeholder="e.g. Cardiology, Neurology, General Medicine, Pediatrics"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                  />
                </div>
              )}

              <div className="medportal-modal-actions">
                <button
                  type="button"
                  className="medportal-btn-cancel"
                  onClick={() => setShowAddFieldModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="medportal-btn-submit"
                  disabled={addingField}
                >
                  {addingField ? 'Creating Field...' : 'Add Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: EDIT FORM FIELD
          ===================================================================== */}
      {showEditFieldModal && editingField && (
        <div className="medportal-modal-backdrop" onClick={() => setShowEditFieldModal(false)}>
          <div className="medportal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="medportal-modal-header">
              <div>
                <h3>Edit Form Field: {editingField.label}</h3>
                <span className="medportal-key-chip" style={{ marginTop: '4px' }}>Key: {editingField.name}</span>
              </div>
              <button
                type="button"
                className="medportal-modal-close"
                onClick={() => setShowEditFieldModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateField} noValidate>
              {fieldModalErrors.server && (
                <div className="inbuilt-error-alert">
                  <AlertCircle size={16} className="error-icon" />
                  <span>{fieldModalErrors.server}</span>
                </div>
              )}

              <div className="medportal-form-group">
                <label>Field Label *</label>
                <input
                  type="text"
                  className={`medportal-form-control ${fieldModalErrors.label ? 'has-error' : ''}`}
                  value={editFieldLabel}
                  onChange={(e) => {
                    setEditFieldLabel(e.target.value);
                    if (fieldModalErrors.label || fieldModalErrors.server) {
                      setFieldModalErrors(prev => ({ ...prev, label: '', server: '' }));
                    }
                  }}
                />
                {fieldModalErrors.label && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{fieldModalErrors.label}</span>
                  </div>
                )}
              </div>

              <div className="medportal-form-group">
                <label>Input Type</label>
                <CustomDropdown
                  value={editFieldType}
                  options={[
                    { value: 'text', label: 'Text Input' },
                    { value: 'textarea', label: 'Multi-line Textarea' },
                    { value: 'number', label: 'Numeric Input' },
                    { value: 'select', label: 'Dropdown Select' },
                    { value: 'file', label: 'File Input' },
                    ...(editingField.type === 'photo' ? [{ value: 'photo', label: 'Photo Uploader' }] : [])
                  ]}
                  onChange={(val) => setEditFieldType(val)}
                />
              </div>

              <div className="medportal-form-group">
                <label>Required Field?</label>
                <div style={{ display: 'flex', alignItems: 'center', height: '42px', gap: '0.65rem' }}>
                  <input
                    type="checkbox"
                    id="editFieldRequiredCheck"
                    checked={editFieldRequired}
                    onChange={(e) => setEditFieldRequired(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="editFieldRequiredCheck" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>
                    Mark as Mandatory (*)
                  </label>
                </div>
              </div>

              {editFieldType === 'select' && (
                <div className="medportal-form-group">
                  <label>Options (comma separated)</label>
                  <input
                    type="text"
                    className="medportal-form-control"
                    placeholder="e.g. Cardiology, Neurology, General Medicine"
                    value={editFieldOptions}
                    onChange={(e) => setEditFieldOptions(e.target.value)}
                  />
                </div>
              )}

              <div className="medportal-modal-actions">
                <button
                  type="button"
                  className="medportal-btn-cancel"
                  onClick={() => setShowEditFieldModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="medportal-btn-submit"
                  disabled={savingEditField}
                >
                  {savingEditField ? 'Saving Changes...' : 'Save Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 6: ADD PROMISE / HABIT
          ===================================================================== */}
      {showAddPromiseModal && (
        <div className="medportal-modal-backdrop" onClick={() => setShowAddPromiseModal(false)}>
          <div className="medportal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="medportal-modal-header">
              <h3>Add Heart Promise / Pledge</h3>
              <button
                type="button"
                className="medportal-modal-close"
                onClick={() => setShowAddPromiseModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePromise} noValidate>
              {promiseModalErrors.server && (
                <div className="inbuilt-error-alert">
                  <AlertCircle size={16} className="error-icon" />
                  <span>{promiseModalErrors.server}</span>
                </div>
              )}

              <div className="medportal-form-group">
                <label>Promise Icon / Emoji *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: 'var(--secondary, #f8fafc)',
                      border: '1px solid var(--border, #e2e8f0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      flexShrink: 0
                    }}
                  >
                    {newPromiseIcon || '❤️'}
                  </div>
                  <input
                    type="text"
                    className="medportal-form-control"
                    placeholder="Enter icon or emoji (e.g. ❤️, 🩺, 🏃, 💊)"
                    value={newPromiseIcon}
                    onChange={(e) => setNewPromiseIcon(e.target.value)}
                  />
                </div>
              </div>

              <div className="medportal-form-group">
                <label>Promise Title *</label>
                <input
                  type="text"
                  className={`medportal-form-control ${promiseModalErrors.title ? 'has-error' : ''}`}
                  placeholder="e.g. Daily Blood Pressure Tracking"
                  value={newPromiseTitle}
                  onChange={(e) => {
                    setNewPromiseTitle(e.target.value);
                    if (promiseModalErrors.title || promiseModalErrors.server) {
                      setPromiseModalErrors(prev => ({ ...prev, title: '', server: '' }));
                    }
                  }}
                />
                {promiseModalErrors.title && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{promiseModalErrors.title}</span>
                  </div>
                )}
              </div>

              <div className="medportal-form-group">
                <label>Promise Description / Pledge Text</label>
                <textarea
                  className="medportal-form-control"
                  placeholder="e.g. I promise to monitor and record my BP readings weekly to prevent silent hypertension."
                  value={newPromiseDesc}
                  onChange={(e) => setNewPromiseDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="medportal-form-group">
                <label>Display Order Sequence</label>
                <input
                  type="number"
                  min="1"
                  className="medportal-form-control"
                  value={newPromiseOrder}
                  onChange={(e) => setNewPromiseOrder(Number(e.target.value))}
                />
              </div>

              <div className="medportal-modal-actions">
                <button
                  type="button"
                  className="medportal-btn-cancel"
                  onClick={() => setShowAddPromiseModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="medportal-btn-submit"
                  disabled={addingPromise}
                >
                  {addingPromise ? 'Adding Promise...' : 'Add Promise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 7: EDIT PROMISE / HABIT
          ===================================================================== */}
      {showEditPromiseModal && editingPromise && (
        <div className="medportal-modal-backdrop" onClick={() => setShowEditPromiseModal(false)}>
          <div className="medportal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="medportal-modal-header">
              <h3>Edit Promise #{editingPromise.id}</h3>
              <button
                type="button"
                className="medportal-modal-close"
                onClick={() => setShowEditPromiseModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdatePromise} noValidate>
              {promiseModalErrors.server && (
                <div className="inbuilt-error-alert">
                  <AlertCircle size={16} className="error-icon" />
                  <span>{promiseModalErrors.server}</span>
                </div>
              )}

              <div className="medportal-form-group">
                <label>Promise Icon / Emoji *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: 'var(--secondary, #f8fafc)',
                      border: '1px solid var(--border, #e2e8f0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      flexShrink: 0
                    }}
                  >
                    {editPromiseIcon || '❤️'}
                  </div>
                  <input
                    type="text"
                    className="medportal-form-control"
                    placeholder="Enter icon or emoji (e.g. ❤️, 🩺, 🏃, 💊)"
                    value={editPromiseIcon}
                    onChange={(e) => setEditPromiseIcon(e.target.value)}
                  />
                </div>
              </div>

              <div className="medportal-form-group">
                <label>Promise Title *</label>
                <input
                  type="text"
                  className={`medportal-form-control ${promiseModalErrors.title ? 'has-error' : ''}`}
                  value={editPromiseTitle}
                  onChange={(e) => {
                    setEditPromiseTitle(e.target.value);
                    if (promiseModalErrors.title || promiseModalErrors.server) {
                      setPromiseModalErrors(prev => ({ ...prev, title: '', server: '' }));
                    }
                  }}
                />
                {promiseModalErrors.title && (
                  <div className="inbuilt-field-error">
                    <AlertCircle size={13} />
                    <span>{promiseModalErrors.title}</span>
                  </div>
                )}
              </div>

              <div className="medportal-form-group">
                <label>Promise Description / Pledge Text</label>
                <textarea
                  className="medportal-form-control"
                  value={editPromiseDesc}
                  onChange={(e) => setEditPromiseDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="medportal-form-group">
                <label>Display Order Sequence</label>
                <input
                  type="number"
                  min="1"
                  className="medportal-form-control"
                  value={editPromiseOrder}
                  onChange={(e) => setEditPromiseOrder(Number(e.target.value))}
                />
              </div>

              <div className="medportal-modal-actions">
                <button
                  type="button"
                  className="medportal-btn-cancel"
                  onClick={() => setShowEditPromiseModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="medportal-btn-submit"
                  disabled={savingEditPromise}
                >
                  {savingEditPromise ? 'Saving Changes...' : 'Save Promise'}
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
