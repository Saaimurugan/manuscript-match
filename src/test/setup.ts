import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
vi.mock('../lib/config', () => ({
  default: {
    apiBaseUrl: 'http://localhost:3001',
    apiTimeout: 30000,
    maxFileSize: 10485760,
    supportedFileTypes: ['pdf', 'docx', 'doc'],
    enableDevTools: true,
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('sessionStorage', sessionStorageMock);

// Mock window.location
const locationMock = {
  href: 'http://localhost:8080',
  origin: 'http://localhost:8080',
  pathname: '/',
  search: '',
  hash: '',
  reload: vi.fn(),
  assign: vi.fn(),
  replace: vi.fn(),
};
vi.stubGlobal('location', locationMock);

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock File and FileReader
global.File = class MockFile {
  constructor(
    public chunks: BlobPart[],
    public name: string,
    public options?: FilePropertyBag
  ) {}
  
  get size() { return 1024; }
  get type() { return this.options?.type || 'application/pdf'; }
  get lastModified() { return Date.now(); }
  
  arrayBuffer() { return Promise.resolve(new ArrayBuffer(1024)); }
  text() { return Promise.resolve('mock file content'); }
  stream() { return new ReadableStream(); }
  slice() { return new Blob(); }
} as any;

global.FileReader = class MockFileReader {
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  readyState: number = 0;
  
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  
  readAsText() {
    this.result = 'mock file content';
    this.readyState = 2;
    if (this.onload) {
      this.onload({} as ProgressEvent<FileReader>);
    }
  }
  
  readAsDataURL() {
    this.result = 'data:application/pdf;base64,mock-data';
    this.readyState = 2;
    if (this.onload) {
      this.onload({} as ProgressEvent<FileReader>);
    }
  }
  
  readAsArrayBuffer() {
    this.result = new ArrayBuffer(1024);
    this.readyState = 2;
    if (this.onload) {
      this.onload({} as ProgressEvent<FileReader>);
    }
  }
  
  abort() {
    this.readyState = 2;
  }
  
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
} as any;

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});