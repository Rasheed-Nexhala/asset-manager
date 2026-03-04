/**
 * Global Firebase mocks for Jest.
 * Prevents loading real Firebase ESM modules which Jest cannot parse.
 * Tests that need custom Firebase behavior can override these mocks.
 */

const mockSnapshot = (docs = []) => ({
  docs,
  size: docs.length,
  empty: docs.length === 0,
  forEach: (fn) => docs.forEach(fn),
});

const mockBatch = () => ({
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
});

const mockDb = {};
const mockStorage = {};
const mockFunctions = {};

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => mockDb),
  connectFirestoreEmulator: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  getDocs: jest.fn().mockResolvedValue(mockSnapshot()),
  getDocsFromServer: jest.fn().mockResolvedValue(mockSnapshot()),
  getCountFromServer: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
  addDoc: jest.fn().mockResolvedValue({ id: 'mock-id' }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  serverTimestamp: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
  writeBatch: jest.fn(() => mockBatch()),
  runTransaction: jest.fn((_db, fn) => {
    const mockTransaction = {
      get: jest.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    return fn(mockTransaction);
  }),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date(), seconds: 0, nanoseconds: 0 })),
    fromDate: jest.fn((d) => ({ toDate: () => d, seconds: 0, nanoseconds: 0 })),
  },
  Unsubscribe: Function,
  QuerySnapshot: Object,
  DocumentSnapshot: Object,
  QueryConstraint: Object,
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => mockStorage),
  connectStorageEmulator: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn().mockResolvedValue({}),
  getDownloadURL: jest.fn().mockResolvedValue('https://mock-url'),
  deleteObject: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => {
  const mockAuth = {
    currentUser: null,
    onAuthStateChanged: jest.fn(() => () => {}),
  };
  return {
    initializeAuth: jest.fn(() => mockAuth),
    getAuth: jest.fn(() => mockAuth),
    browserLocalPersistence: {},
    connectAuthEmulator: jest.fn(),
    setPersistence: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => mockFunctions),
  connectFunctionsEmulator: jest.fn(),
  httpsCallable: jest.fn(() => jest.fn().mockResolvedValue({ data: {} })),
}));
