import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthPanel, type AuthFormState, type AuthMode } from './components/AuthPanel';
import { RollForm } from './components/RollForm';
import { RollDetailPanel } from './components/RollDetailPanel';
import { RollTable } from './components/RollTable';
import {
  createRollUpload,
  createRoll,
  deleteRoll as apiDeleteRoll,
  deleteRollUpload,
  getSession,
  isRollOwner,
  listRollActivity,
  listRollUploads,
  listRolls,
  login,
  register,
  updateRoll,
} from './lib/api';
import type { AuthSession, FilmRoll, RollActivity, RollDraft, RollStatus, RollUpload, User } from './types';

const TOKEN_KEY = 'film-roll-tracker-token';

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialDraft(): RollDraft {
  return {
    title: '',
    camera: '',
    lens: '',
    filmStock: '',
    iso: '400',
    status: 'loaded',
    dateLoaded: todayValue(),
    notes: '',
  };
}

function createInitialAuthForm(): AuthFormState {
  return {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatAuthError(message: string, mode: AuthMode) {
  if (mode !== 'login') {
    return message;
  }

  if (message.includes('8 character') || message.includes('Validation failed')) {
    return 'Invalid email or password.';
  }

  return message;
}

type RollValidationErrors = Partial<Record<keyof RollDraft, string>>;

function validateRollDraft(draft: RollDraft): RollValidationErrors {
  const errors: RollValidationErrors = {};

  if (!draft.title.trim()) {
    errors.title = 'Roll title is required.';
  }

  if (!draft.camera.trim()) {
    errors.camera = 'Camera is required.';
  }

  if (!draft.lens.trim()) {
    errors.lens = 'Lens is required.';
  }

  if (!draft.filmStock.trim()) {
    errors.filmStock = 'Film stock is required.';
  }

  if (!draft.iso.trim()) {
    errors.iso = 'ISO is required.';
  } else if (!/^\d+$/.test(draft.iso.trim())) {
    errors.iso = 'ISO must be a whole number.';
  } else if (Number(draft.iso) <= 0) {
    errors.iso = 'ISO must be greater than 0.';
  }

  if (!draft.dateLoaded.trim()) {
    errors.dateLoaded = 'Date loaded is required.';
  }

  return errors;
}

const landingDemoMetrics = [
  { label: 'Loaded rolls', value: '6 loaded', percent: 25, tone: 'gold' },
  { label: 'Developed rolls', value: '16 developed', percent: 67, tone: 'sage' },
  { label: 'Scanned rolls', value: '8 scanned', percent: 33, tone: 'clay' },
  { label: 'Private access', value: 'JWT protected', percent: 100, tone: 'gold' },
] as const;

const landingDemoBadges = ['24 rolls logged', '3 camera bodies', '5 film stocks', 'Owners-only edits'];

function formatCount(value: number, noun: string) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

function hashString(value: string) {
  return [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
}

function svgDataUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createCameraIconSrc(name: string) {
  const hue = hashString(name) % 360;

  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">
      <g fill="none" stroke="#111827" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M43 63h31l13-19h68l13 19h29c13 0 23 10 23 23v43c0 13-10 23-23 23H43c-13 0-23-10-23-23V86c0-13 10-23 23-23Z" fill="hsl(${hue} 18% 93%)"/>
        <path d="M83 52h73" />
        <path d="M42 82h35" />
        <circle cx="125" cy="106" r="34" fill="#ffffff" />
        <circle cx="125" cy="106" r="19" fill="hsl(${hue} 24% 82%)" />
        <path d="M181 86h18" />
      </g>
    </svg>
  `);
}

function normalizeCameraName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const cameraOptions = [
  { name: 'Canon AE-1', imageSrc: '/cameras/canon-ae-1-cutout.png' },
  { name: 'Canon AF35ML', imageSrc: '/cameras/canon-af35ml-cutout.png' },
  { name: 'Canon Super Sure Shot', imageSrc: '/cameras/canon-af35ml-cutout.png' },
  { name: 'Mamiya 645', imageSrc: '/cameras/mamiya-645-cutout.png' },
  { name: 'Nikon FM2', imageSrc: '/cameras/nikon-fm2-cutout.png' },
  { name: 'Olympus XA', imageSrc: '/cameras/olympus-xa-cutout.png' },
  { name: 'Pentax K1000', imageSrc: '/cameras/pentax-k1000-cutout.png' },
] as const;

const cameraImageMap: Record<string, string> = Object.fromEntries(
  cameraOptions.map((camera) => [normalizeCameraName(camera.name), camera.imageSrc]),
);

function getCameraImageSrc(name: string) {
  return cameraImageMap[normalizeCameraName(name)] ?? createCameraIconSrc(name);
}

function getCameraMatch(name: string) {
  const normalizedName = normalizeCameraName(name);

  if (!normalizedName) {
    return null;
  }

  return (
    cameraOptions.find((camera) => normalizeCameraName(camera.name) === normalizedName) ??
    cameraOptions.find((camera) => normalizeCameraName(camera.name).startsWith(normalizedName)) ??
    cameraOptions.find((camera) => normalizeCameraName(camera.name).includes(normalizedName)) ??
    null
  );
}

function normalizeFilmStockName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function createFilmStockIconSrc(name: string) {
  const hue = hashString(name) % 360;

  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 150">
      <g fill="none" stroke="#111827" stroke-width="6" stroke-linejoin="round">
        <path d="M31 37h128v76H31z" fill="hsl(${hue} 34% 91%)"/>
        <path d="M31 57h128" />
        <path d="M31 93h128" />
        <path d="M49 37v76M141 37v76" />
      </g>
      <rect x="61" y="63" width="68" height="24" rx="5" fill="hsl(${hue} 48% 70%)" />
      <path d="M71 76h48" stroke="#111827" stroke-width="5" stroke-linecap="round" />
    </svg>
  `);
}

const filmStockOptions: ReadonlyArray<{ name: string; imageSrc?: string }> = [
  { name: 'Cinestill 800T' },
  { name: 'Fujifilm 400' },
  { name: 'Ilford Delta 3200' },
  { name: 'Ilford HP5 Plus', imageSrc: '/film-stocks/ilford-hp5-plus-cutout.png' },
  { name: 'Ilford XP2 Super' },
  { name: 'Kodak ColorPlus 200' },
  { name: 'Kodak Ektar 100', imageSrc: '/film-stocks/kodak-ektar-100-cutout.png' },
  { name: 'Kodak Gold 200', imageSrc: '/film-stocks/kodak-gold-200-cutout.png' },
  { name: 'Kodak Portra 160' },
  { name: 'Kodak Portra 400', imageSrc: '/film-stocks/kodak-portra-400-cutout.png' },
  { name: 'Kodak Portra 800' },
  { name: 'Kodak Tri-X 400' },
  { name: 'Lomography Color Negative 400' },
];

function getFilmStockMatch(name: string) {
  const normalizedName = normalizeFilmStockName(name);

  if (!normalizedName) {
    return null;
  }

  return (
    filmStockOptions.find((filmStock) => normalizeFilmStockName(filmStock.name) === normalizedName) ??
    filmStockOptions.find((filmStock) => normalizeFilmStockName(filmStock.name).startsWith(normalizedName)) ??
    filmStockOptions.find((filmStock) => normalizeFilmStockName(filmStock.name).includes(normalizedName)) ??
    null
  );
}

export default function App() {
  const [appLoading, setAppLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [rolls, setRolls] = useState<FilmRoll[]>([]);
  const [draft, setDraft] = useState<RollDraft>(createInitialDraft);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RollStatus | 'all'>('all');
  const [cameraFilter, setCameraFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [authForm, setAuthForm] = useState<AuthFormState>(createInitialAuthForm);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [rollLoading, setRollLoading] = useState(false);
  const [rollError, setRollError] = useState<string | null>(null);
  const [rollErrors, setRollErrors] = useState<RollValidationErrors>({});
  const [selectedRollId, setSelectedRollId] = useState<string | null>(null);
  const [selectedRollActivity, setSelectedRollActivity] = useState<RollActivity[]>([]);
  const [selectedRollUploads, setSelectedRollUploads] = useState<RollUpload[]>([]);
  const [rollDetailLoading, setRollDetailLoading] = useState(false);
  const [rollDetailError, setRollDetailError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const authNoticeTimerRef = useRef<number | null>(null);

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setSessionUser(null);
    setRolls([]);
    setDraft(createInitialDraft());
    setEditingId(null);
    setAuthError(null);
    setAuthNotice(null);
    setRollError(null);
    setRollErrors({});
    setRollDetailError(null);
    setSelectedRollId(null);
    setSelectedRollActivity([]);
    setSelectedRollUploads([]);
    setUploadError(null);
    setUploadFile(null);
    setUploadPreviewUrl(null);
    setUploadLoading(false);
    setSelectedCamera(null);
  };

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!token || sessionUser) {
        if (active) {
          setAppLoading(false);
        }
        return;
      }

      try {
        const [session, userRolls] = await Promise.all([getSession(token), listRolls(token)]);

        if (!active) {
          return;
        }

        if (!session.user) {
          clearSession();
          return;
        }

        setSessionUser(session.user);
        setRolls(userRolls);
      } catch {
        if (active) {
          clearSession();
        }
      } finally {
        if (active) {
          setAppLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [sessionUser, token]);

  useEffect(() => {
    return () => {
      if (authNoticeTimerRef.current) {
        window.clearTimeout(authNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!uploadFile) {
      setUploadPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(uploadFile);
    setUploadPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [uploadFile]);

  useEffect(() => {
    if (!sessionUser) {
      return;
    }

    if (rolls.length === 0) {
      setSelectedRollId(null);
      return;
    }

    setSelectedRollId((current) => {
      if (current && rolls.some((roll) => roll.id === current)) {
        return current;
      }

      return rolls[0]?.id ?? null;
    });
  }, [rolls, sessionUser]);

  useEffect(() => {
    let active = true;

    if (!token || !selectedRollId || !sessionUser) {
      setSelectedRollActivity([]);
      setSelectedRollUploads([]);
      setRollDetailLoading(false);
      return () => {
        active = false;
      };
    }

    void refreshRollWorkspace(token, selectedRollId, active);

    return () => {
      active = false;
    };
  }, [selectedRollId, sessionUser, token]);

  const handleAuthFieldChange = (field: keyof AuthFormState, value: string) => {
    setAuthForm((current) => ({
      ...current,
      [field]: value,
    }));
    setAuthError(null);
  };

  const handleAuthModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthError(null);
  };

  const authCanSubmit = useMemo(() => {
    const email = authForm.email.trim();
    const password = authForm.password;
    const name = authForm.name.trim();
    const emailIsValid = isValidEmail(email);

    if (authMode === 'register') {
      return Boolean(name) && emailIsValid && password.length >= 8 && password === authForm.confirmPassword;
    }

    return emailIsValid && Boolean(password);
  }, [authForm.confirmPassword, authForm.email, authForm.name, authForm.password, authMode]);

  const authEmailError = useMemo(() => {
    const email = authForm.email.trim();

    if (!email) {
      return null;
    }

    return isValidEmail(email) ? null : 'Please enter a valid email address.';
  }, [authForm.email]);

  const handleAuthSubmit = async () => {
    const email = authForm.email.trim();
    const password = authForm.password;
    const name = authForm.name.trim();

    if (authMode === 'register') {
      if (!name) {
        setAuthError('Please enter your name.');
        return;
      }
    } else {
      if (!password) {
        setAuthError('Please enter your password.');
        return;
      }
    }

    if (!email) {
      setAuthError('Please enter your email.');
      return;
    }

    if (!isValidEmail(email)) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8 && authMode === 'register') {
      setAuthError('Password must be at least 8 characters.');
      return;
    }

    if (authMode === 'register' && password !== authForm.confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      const session: AuthSession =
        authMode === 'register'
          ? await register({
              name,
              email,
              password,
            })
          : await login({
              email,
              password,
            });
      localStorage.setItem(TOKEN_KEY, session.token);
      setToken(session.token);
      setSessionUser(session.user);
      setAuthForm(createInitialAuthForm());
      setDraft(createInitialDraft());
      setEditingId(null);
      setAppLoading(false);
      setAuthNotice(authMode === 'register' ? 'Account created. Welcome to your dashboard.' : 'Logged in. Welcome back.');

      if (authNoticeTimerRef.current) {
        window.clearTimeout(authNoticeTimerRef.current);
      }

      authNoticeTimerRef.current = window.setTimeout(() => {
        setAuthNotice(null);
        authNoticeTimerRef.current = null;
      }, 2800);

      try {
        setRolls(await listRolls(session.token));
      } catch {
        setRollError('Signed in, but we could not load your rolls yet.');
      }

      setAuthLoading(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to authenticate.';
      setAuthError(formatAuthError(message, authMode));
      setAuthLoading(false);
    } finally {
      setAppLoading(false);
    }
  };

  const handleLogout = () => {
    if (authNoticeTimerRef.current) {
      window.clearTimeout(authNoticeTimerRef.current);
      authNoticeTimerRef.current = null;
    }
    clearSession();
    setAuthError(null);
    setRollError(null);
    setAuthForm(createInitialAuthForm());
    setAuthMode('login');
  };

  const cameraGrid = useMemo(() => {
    const grouped = new Map<
      string,
      {
        camera: string;
        rolls: FilmRoll[];
        filmStocks: Array<{ name: string; count: number }>;
      }
    >();

    for (const roll of rolls) {
      const existing = grouped.get(roll.camera) ?? {
        camera: roll.camera,
        rolls: [],
        filmStocks: [],
      };

      existing.rolls.push(roll);
      grouped.set(roll.camera, existing);
    }

    return [...grouped.values()]
      .map((cameraItem) => {
        const stockCounts = new Map<string, number>();

        for (const roll of cameraItem.rolls) {
          stockCounts.set(roll.filmStock, (stockCounts.get(roll.filmStock) ?? 0) + 1);
        }

        return {
          ...cameraItem,
          filmStocks: [...stockCounts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
      })
      .sort((a, b) => a.camera.localeCompare(b.camera));
  }, [rolls]);

  const visibleRolls = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rolls.filter((roll) => {
      const matchesStatus = statusFilter === 'all' || roll.status === statusFilter;
      const matchesCamera = cameraFilter === 'all' || roll.camera === cameraFilter;
      const matchesStock = stockFilter === 'all' || roll.filmStock === stockFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [roll.title, roll.camera, roll.lens, roll.filmStock, roll.notes].join(' ').toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesCamera && matchesStock && matchesQuery;
    });
  }, [cameraFilter, query, rolls, stockFilter, statusFilter]);

  const selectedCameraMatch = getCameraMatch(draft.camera);
  const cameraPreviewSrc = selectedCameraMatch?.imageSrc ?? (draft.camera.trim() ? getCameraImageSrc(draft.camera) : null);
  const cameraPreviewLabel = selectedCameraMatch?.name ?? draft.camera.trim();
  const selectedFilmStockMatch = getFilmStockMatch(draft.filmStock);
  const filmStockPreviewLabel = selectedFilmStockMatch?.name ?? draft.filmStock.trim();
  const filmStockPreviewSrc =
    selectedFilmStockMatch?.imageSrc ?? (filmStockPreviewLabel ? createFilmStockIconSrc(filmStockPreviewLabel) : null);

  const handleFieldChange = (field: keyof RollDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setRollErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    setRollError(null);
  };

  const resetDraft = () => {
    setEditingId(null);
    setDraft(createInitialDraft());
    setRollError(null);
    setRollErrors({});
  };

  const requireToken = () => {
    if (!token || !sessionUser) {
      throw new Error('You need to sign in again.');
    }

    return token;
  };

  const refreshRollWorkspace = async (tokenValue: string, rollId: string, active = true) => {
    setRollDetailLoading(true);
    setRollDetailError(null);

    try {
      const [activity, uploads] = await Promise.all([listRollActivity(tokenValue, rollId), listRollUploads(tokenValue, rollId)]);

      if (active) {
        setSelectedRollActivity(activity);
        setSelectedRollUploads(uploads);
      }
    } catch {
      if (active) {
        setSelectedRollActivity([]);
        setSelectedRollUploads([]);
        setRollDetailError('Unable to load uploads and activity for this roll.');
      }
    } finally {
      if (active) {
        setRollDetailLoading(false);
      }
    }
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;

        if (typeof result === 'string') {
          resolve(result);
          return;
        }

        reject(new Error('Unable to read the selected file.'));
      };

      reader.onerror = () => {
        reject(new Error('Unable to read the selected file.'));
      };

      reader.readAsDataURL(file);
    });

  const buildRollPayload = (current: RollDraft) => ({
    title: current.title.trim(),
    camera: current.camera.trim(),
    lens: current.lens.trim(),
    filmStock: current.filmStock.trim(),
    iso: current.iso,
    status: current.status,
    dateLoaded: current.dateLoaded,
    notes: current.notes.trim(),
  });

  const handleSubmit = async () => {
    const currentToken = requireToken();
    const validationErrors = validateRollDraft(draft);

    if (Object.keys(validationErrors).length > 0) {
      setRollErrors(validationErrors);
      setRollError('Please fix the highlighted fields.');
      return;
    }

    setRollLoading(true);
    setRollError(null);
    setRollErrors({});

    try {
      const payload = buildRollPayload(draft);

      if (editingId) {
        const existingRoll = rolls.find((roll) => roll.id === editingId);

        if (!existingRoll) {
          throw new Error('Roll not found.');
        }

        if (!isRollOwner(existingRoll, sessionUser?.id)) {
          throw new Error('You can only edit your own rolls.');
        }

        const updatedRoll = await updateRoll(currentToken, editingId, payload);
        setRolls((current) => current.map((roll) => (roll.id === editingId ? updatedRoll : roll)));
        setSelectedRollId(updatedRoll.id);
        void refreshRollWorkspace(currentToken, updatedRoll.id);
      } else {
        const createdRoll = await createRoll(currentToken, payload);
        setRolls((current) => [createdRoll, ...current]);
        setSelectedRollId(createdRoll.id);
        void refreshRollWorkspace(currentToken, createdRoll.id);
      }

      resetDraft();
    } catch (error) {
      setRollError(error instanceof Error ? error.message : 'Unable to save this roll.');
    } finally {
      setRollLoading(false);
    }
  };

  const handleEdit = (roll: FilmRoll) => {
    if (!isRollOwner(roll, sessionUser?.id)) {
      setRollError('You can only edit your own rolls.');
      return;
    }

    setEditingId(roll.id);
    setSelectedRollId(roll.id);
    setDraft({
      title: roll.title,
      camera: roll.camera,
      lens: roll.lens,
      filmStock: roll.filmStock,
      iso: String(roll.iso),
      status: roll.status,
      dateLoaded: roll.dateLoaded,
      notes: roll.notes,
    });
    setRollError(null);

    window.requestAnimationFrame(() => {
      document.getElementById('roll-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const updateStatus = async (id: string, status: RollStatus) => {
    const currentToken = requireToken();
    const targetRoll = rolls.find((roll) => roll.id === id);

    if (!targetRoll) {
      return;
    }

    if (!isRollOwner(targetRoll, sessionUser?.id)) {
      setRollError('You can only edit your own rolls.');
      return;
    }

    setRollError(null);

    try {
      const updatedRoll = await updateRoll(currentToken, id, {
        title: targetRoll.title,
        camera: targetRoll.camera,
        lens: targetRoll.lens,
        filmStock: targetRoll.filmStock,
        iso: String(targetRoll.iso),
        status,
        dateLoaded: targetRoll.dateLoaded,
        notes: targetRoll.notes,
      });

      setRolls((current) => current.map((roll) => (roll.id === id ? updatedRoll : roll)));
      setSelectedRollId(updatedRoll.id);
      void refreshRollWorkspace(currentToken, updatedRoll.id);
    } catch (error) {
      setRollError(error instanceof Error ? error.message : 'Unable to update this roll.');
    }
  };

  const deleteRoll = async (id: string) => {
    const currentToken = requireToken();
    const targetRoll = rolls.find((roll) => roll.id === id);

    if (!targetRoll) {
      return;
    }

    if (!isRollOwner(targetRoll, sessionUser?.id)) {
      setRollError('You can only delete your own rolls.');
      return;
    }

    setRollError(null);

    try {
      await apiDeleteRoll(currentToken, id);
      setRolls((current) => current.filter((roll) => roll.id !== id));
      if (editingId === id) {
        resetDraft();
      }

      if (selectedRollId === id) {
        const remainingRoll = rolls.find((roll) => roll.id !== id) ?? null;
        setSelectedRollId(remainingRoll?.id ?? null);
      }
    } catch (error) {
      setRollError(error instanceof Error ? error.message : 'Unable to delete this roll.');
    }
  };

  const selectedRoll = useMemo(
    () => rolls.find((roll) => roll.id === selectedRollId) ?? null,
    [rolls, selectedRollId],
  );

  const handleSelectRoll = (roll: FilmRoll) => {
    setSelectedRollId(roll.id);
    setRollDetailError(null);
    setUploadError(null);
    setUploadFile(null);
    setUploadPreviewUrl(null);
  };

  const handleUploadFileChange = (file: File | null) => {
    setUploadFile(file);
    setUploadError(null);
  };

  const handleUploadSubmit = async () => {
    const currentToken = requireToken();

    if (!selectedRoll) {
      setUploadError('Select a roll before uploading a preview.');
      return;
    }

    if (!uploadFile) {
      setUploadError('Choose a file to upload.');
      return;
    }

    setUploadLoading(true);
    setUploadError(null);

    try {
      const fileUrl = await readFileAsDataUrl(uploadFile);
      await createRollUpload(currentToken, selectedRoll.id, {
        fileName: uploadFile.name,
        fileType: uploadFile.type || 'application/octet-stream',
        fileSize: uploadFile.size,
        fileUrl,
      });

      setUploadFile(null);
      setUploadPreviewUrl(null);
      void refreshRollWorkspace(currentToken, selectedRoll.id);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to upload this preview.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    const currentToken = requireToken();

    if (!selectedRoll) {
      return;
    }

    setUploadError(null);

    try {
      await deleteRollUpload(currentToken, selectedRoll.id, uploadId);
      void refreshRollWorkspace(currentToken, selectedRoll.id);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to delete this upload.');
    }
  };

  if (appLoading) {
    return (
      <div className="app-shell">
        <main className="app">
          <section className="panel auth-panel auth-panel--loading">
            <p className="eyebrow">Film Roll Tracker</p>
            <h1>Loading your workspace</h1>
            <p className="hero__lede">Restoring your session and roll library.</p>
          </section>
        </main>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="app-shell">
        <main className="landing-shell">
          <section className="landing-hero panel">
            <img className="landing-hero__image" src="/hero.jpg" alt="" aria-hidden="true" />
            <div className="landing-hero__overlay" />
            <div className="landing-hero__content">
              <header className="landing-header">
                <span className="landing-brand">Film Roll Tracker</span>
                <button
                  className="primary-button landing-signup-button"
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Sign up / Log in
                </button>
              </header>

              <div className="landing-hero__center">
                <h1>Film Roll Tracker</h1>
                <p className="landing-hero__subtitle">
                  Track every roll and organize your shooting history.
                </p>
              </div>
            </div>
          </section>
          <section className="landing-split">
            <div className="landing-split__grid app">
              <aside className="panel landing-demo" aria-label="Demo stats">
                <div className="section-heading">
                  <p className="eyebrow">Demo stats</p>
                  <h2>See what the app can track</h2>
                  <p>
                    This example shows the kind of roll history, workflow tracking, and analytics a logged-in user can
                    manage inside their own account.
                  </p>
                </div>

                <div className="landing-demo__progress">
                  {landingDemoMetrics.map((metric) => (
                    <article key={metric.label} className={`demo-progress demo-progress--${metric.tone}`}>
                      <div className="demo-progress__row">
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                      </div>
                      <div className="demo-progress__track" aria-hidden="true">
                        <div className="demo-progress__fill" style={{ width: `${metric.percent}%` }} />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="landing-demo__badges" aria-label="Example highlights">
                  {landingDemoBadges.map((badge) => (
                    <span key={badge} className="demo-badge">
                      {badge}
                    </span>
                  ))}
                </div>
              </aside>

              <div className="landing-auth-column" id="signup">
                <AuthPanel
                  mode={authMode}
                  form={authForm}
                  loading={authLoading}
                  error={authError}
                  emailError={authEmailError}
                  canSubmit={authCanSubmit}
                  onModeChange={handleAuthModeChange}
                  onFieldChange={handleAuthFieldChange}
                  onSubmit={() => {
                    void handleAuthSubmit();
                  }}
                />
              </div>
            </div>
          </section>
        </main>
        <footer className="app-footer">
          Developed by{' '}
          <a href="https://myke.nyc" target="_blank" rel="noreferrer">
            Michael Ramrez
          </a>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="app">
        {authNotice ? <p className="dashboard-notice">{authNotice}</p> : null}
        <header className="hero panel">
          <button className="ghost-button hero__logout" type="button" onClick={handleLogout}>
            Log out
          </button>
          <div className="hero__copy">
            <p className="eyebrow">Welcome back, {sessionUser.name}!</p>
            <h1>Film Roll Tracker</h1>
            <p className="hero__lede">Follow the life cycle of each roll, from loaded, shots remaining, developed, then scanned.</p>

            <div className="hero__actions">
              <a className="primary-button" href="#roll-form">
                Add a roll
              </a>
              <a className="secondary-button" href="#roll-library">
                View library
              </a>
            </div>
          </div>
        </header>

        {/*
        <section className="camera-shelf" aria-label="Your cameras and film stocks">
          {cameraGrid.length > 0 ? (
            cameraGrid.map((cameraItem) => {
              const isExpanded = selectedCamera === cameraItem.camera;

              return (
                <article className={`camera-card${isExpanded ? ' camera-card--expanded' : ''}`} key={cameraItem.camera}>
                  <button
                    className="camera-card__button"
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => {
                      setSelectedCamera((current) => (current === cameraItem.camera ? null : cameraItem.camera));
                      setCameraFilter(cameraItem.camera);
                      setStockFilter('all');
                      setQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    <img className="camera-card__image" src={getCameraImageSrc(cameraItem.camera)} alt="" aria-hidden="true" />
                    <span className="camera-card__name">{cameraItem.camera}</span>
                    <span className="camera-card__meta">{formatCount(cameraItem.rolls.length, 'roll')}</span>
                  </button>

                  {isExpanded ? (
                    <div className="film-stock-grid" aria-label={`${cameraItem.camera} film stocks`}>
                      {cameraItem.filmStocks.map((filmStock) => (
                        <button
                          className="film-stock-card"
                          key={filmStock.name}
                          type="button"
                          onClick={() => {
                            setCameraFilter(cameraItem.camera);
                            setStockFilter(filmStock.name);
                            setQuery('');
                            setStatusFilter('all');
                            document.getElementById('roll-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        >
                          <img className="film-stock-card__image" src={createFilmStockIconSrc(filmStock.name)} alt="" aria-hidden="true" />
                          <span>{filmStock.name}</span>
                          <small>{formatCount(filmStock.count, 'roll')}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <article className="camera-shelf__empty">
              <p className="eyebrow">No cameras yet</p>
              <h2>Add your first roll to start your camera grid.</h2>
            </article>
          )}
        </section>
        */}

        {cameraFilter !== 'all' || stockFilter !== 'all' || statusFilter !== 'all' || query ? (
          <div className="library-filter-note">
            <span>
              Showing {visibleRolls.length} of {rolls.length} rolls
              {cameraFilter !== 'all' ? ` for ${cameraFilter}` : ''}
              {stockFilter !== 'all' ? ` with ${stockFilter}` : ''}.
            </span>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setCameraFilter('all');
                setStockFilter('all');
                setStatusFilter('all');
                setQuery('');
              }}
            >
              Show all
            </button>
          </div>
        ) : null}

        {rollError ? <p className="panel-note panel-note--error">{rollError}</p> : null}

        <RollForm
          draft={draft}
          mode={editingId ? 'edit' : 'create'}
          loading={rollLoading}
          errors={rollErrors}
          cameraOptions={cameraOptions}
          cameraPreviewSrc={cameraPreviewSrc}
          cameraPreviewLabel={cameraPreviewLabel}
          filmStockOptions={filmStockOptions}
          filmStockPreviewSrc={filmStockPreviewSrc}
          filmStockPreviewLabel={filmStockPreviewLabel}
          onFieldChange={handleFieldChange}
          onStatusChange={(value) => handleFieldChange('status', value)}
          onSubmit={() => {
            void handleSubmit();
          }}
          onCancel={resetDraft}
        />

        <RollTable
          rolls={visibleRolls}
          currentUserId={sessionUser.id}
          selectedRollId={selectedRollId}
          onEdit={handleEdit}
          onStatusChange={(id, status) => {
            void updateStatus(id, status);
          }}
          onDelete={(id) => {
            void deleteRoll(id);
          }}
          onSelect={handleSelectRoll}
        />

        <RollDetailPanel
          roll={selectedRoll}
          activity={selectedRollActivity}
          uploads={selectedRollUploads}
          loading={rollDetailLoading}
          uploadLoading={uploadLoading}
          error={rollDetailError}
          uploadError={uploadError}
          selectedFileName={uploadFile?.name ?? null}
          selectedFilePreviewUrl={uploadPreviewUrl}
          onFileChange={handleUploadFileChange}
          onUpload={() => {
            void handleUploadSubmit();
          }}
          onDeleteUpload={(uploadId) => {
            void handleDeleteUpload(uploadId);
          }}
        />
      </main>
      <footer className="app-footer">
        Developed by{' '}
        <a href="https://myke.nyc" target="_blank" rel="noreferrer">
          Michael Ramrez
        </a>
      </footer>
    </div>
  );
}
