/**
 * Performance Optimization Components
 * 
 * Exports all performance optimization components for the test reporting system.
 */

export { 
  StreamingProcessor,
  type StreamingProcessorConfig,
  type ProcessingStats
} from './StreamingProcessor';

export { 
  TemplateCache,
  ScopedTemplateCache,
  type TemplateEntry,
  type CacheStats,
  type TemplateCacheConfig
} from './TemplateCache';

export { 
  ParallelProcessor,
  ProcessingPool,
  type ParallelProcessingConfig,
  type ProcessingTask,
  type ProcessingResult,
  type ResourceUsage
} from './ParallelProcessor';

export { 
  ProgressIndicator,
  SubProgressIndicator,
  MultiStageProgress,
  type ProgressConfig,
  type ProgressState,
  type ProgressUpdate
} from './ProgressIndicator';

export { 
  OptimizedFileIO,
  type FileIOConfig,
  type WriteOperation,
  type ReadOperation,
  type FileStats
} from './OptimizedFileIO';