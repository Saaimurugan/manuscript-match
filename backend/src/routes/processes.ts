import { Router } from 'express';
import { ProcessController } from '../controllers/ProcessController';
import { authenticate } from '../middleware/auth';
import { uploadSingle, handleUploadError } from '../middleware/upload';

const router = Router();
const processController = new ProcessController();

// Apply authentication middleware to all routes
router.use(authenticate);

// Process management routes
router.post('/', processController.createProcess);
router.get('/', processController.getProcesses);
router.get('/stats', processController.getProcessStats);
router.get('/:id', processController.getProcess);
router.put('/:id', processController.updateProcess);
router.put('/:id/step', processController.updateProcessStep);
router.delete('/:id', processController.deleteProcess);

// Manuscript processing routes
router.post('/:id/upload', uploadSingle, handleUploadError, processController.uploadManuscript);
router.get('/:id/metadata', processController.getMetadata);
router.put('/:id/metadata', processController.updateMetadata);

// Author and affiliation management routes
router.get('/:id/authors', processController.getAuthors);
router.put('/:id/authors', processController.updateAuthors);
router.get('/:id/affiliations', processController.getAffiliations);
router.put('/:id/affiliations', processController.updateAffiliations);

// Keyword enhancement routes
router.post('/:id/keywords/enhance', processController.enhanceKeywords);
router.get('/:id/keywords', processController.getKeywords);
router.put('/:id/keywords/selection', processController.updateKeywordSelection);

// Database search routes
router.post('/:id/search', processController.initiateSearch);
router.get('/:id/search/status', processController.getSearchStatus);

// Manual reviewer search routes
router.post('/:id/search/manual/name', processController.searchReviewersByName);
router.post('/:id/search/manual/email', processController.searchReviewersByEmail);

// Manual reviewer management routes
router.post('/:id/reviewers/add', processController.addManualReviewer);
router.delete('/:id/reviewers/:authorId', processController.removeManualReviewer);
router.get('/:id/candidates', processController.getCandidateReviewers);

// Author validation routes
router.post('/:id/validate', processController.validateAuthors);
router.get('/:id/validation/results', processController.getValidationResults);

// Recommendation and filtering routes
router.get('/:id/candidates', processController.getCandidates);
router.get('/:id/recommendations', processController.getRecommendations);
router.get('/:id/recommendations/filters', processController.getRecommendationFilters);

// Shortlist management routes
router.post('/:id/shortlist', processController.createShortlist);
router.get('/:id/shortlists', processController.getShortlists);
router.get('/:id/export/:format', processController.exportShortlist);

export default router;