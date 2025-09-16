// Test fixtures for consistent test data across the test suite

export const testUsers = {
  regularUser: {
    email: 'user@test.com',
    password: 'testpassword123'
  },
  adminUser: {
    email: 'admin@test.com',
    password: 'adminpassword123'
  },
  secondUser: {
    email: 'user2@test.com',
    password: 'testpassword456'
  }
};

export const testProcesses = {
  basicProcess: {
    title: 'Test Manuscript Analysis',
    metadata: {
      manuscriptTitle: 'A Study on Machine Learning Applications',
      authors: [
        { name: 'John Doe', email: 'john.doe@university.edu' },
        { name: 'Jane Smith', email: 'jane.smith@research.org' }
      ],
      abstract: 'This study explores various applications of machine learning in academic research.',
      keywords: ['machine learning', 'research', 'applications'],
      primaryFocusAreas: ['Computer Science', 'Artificial Intelligence'],
      secondaryFocusAreas: ['Data Science', 'Statistics']
    }
  },
  medicalProcess: {
    title: 'Medical Research Analysis',
    metadata: {
      manuscriptTitle: 'Clinical Trial Results for New Treatment',
      authors: [
        { name: 'Dr. Sarah Johnson', email: 'sarah.johnson@hospital.edu' },
        { name: 'Dr. Michael Brown', email: 'michael.brown@medical.org' }
      ],
      abstract: 'Results from a randomized controlled trial of a new medical treatment.',
      keywords: ['clinical trial', 'treatment', 'medical research'],
      primaryFocusAreas: ['Medicine', 'Clinical Research'],
      secondaryFocusAreas: ['Pharmacology', 'Statistics']
    }
  }
};

export const testAuthors = {
  validAuthor: {
    name: 'Dr. Alice Johnson',
    email: 'alice.johnson@university.edu',
    publicationCount: 45,
    clinicalTrials: 8,
    retractions: 0,
    researchAreas: ['Machine Learning', 'Computer Vision'],
    meshTerms: ['Algorithms', 'Image Processing']
  },
  authorWithRetractions: {
    name: 'Dr. Bob Wilson',
    email: 'bob.wilson@research.org',
    publicationCount: 67,
    clinicalTrials: 12,
    retractions: 2,
    researchAreas: ['Natural Language Processing', 'AI'],
    meshTerms: ['Language Models', 'Deep Learning']
  },
  lowPublicationAuthor: {
    name: 'Dr. Charlie Davis',
    email: 'charlie.davis@college.edu',
    publicationCount: 3,
    clinicalTrials: 0,
    retractions: 0,
    researchAreas: ['Computer Science'],
    meshTerms: ['Programming']
  },
  highImpactAuthor: {
    name: 'Prof. Diana Martinez',
    email: 'diana.martinez@institute.org',
    publicationCount: 120,
    clinicalTrials: 25,
    retractions: 0,
    researchAreas: ['Biomedical Engineering', 'Medical Devices'],
    meshTerms: ['Bioengineering', 'Medical Technology']
  }
};

export const testAffiliations = {
  university: {
    institutionName: 'Stanford University',
    department: 'Computer Science Department',
    address: 'Stanford, CA 94305',
    country: 'United States'
  },
  researchInstitute: {
    institutionName: 'MIT Research Laboratory',
    department: 'Computer Science and Artificial Intelligence Laboratory',
    address: 'Cambridge, MA 02139',
    country: 'United States'
  },
  hospital: {
    institutionName: 'Johns Hopkins Hospital',
    department: 'Department of Medicine',
    address: 'Baltimore, MD 21287',
    country: 'United States'
  },
  internationalUniversity: {
    institutionName: 'University of Oxford',
    department: 'Department of Computer Science',
    address: 'Oxford OX1 3QD',
    country: 'United Kingdom'
  }
};

export const testKeywords = {
  computerScience: [
    'machine learning',
    'artificial intelligence',
    'deep learning',
    'neural networks',
    'computer vision',
    'natural language processing'
  ],
  medicine: [
    'clinical trial',
    'randomized controlled trial',
    'medical treatment',
    'patient outcomes',
    'healthcare',
    'medical research'
  ],
  biology: [
    'molecular biology',
    'genetics',
    'protein structure',
    'cell biology',
    'biochemistry',
    'bioinformatics'
  ]
};

export const testMeshTerms = {
  computerScience: [
    'Algorithms',
    'Computer Science',
    'Machine Learning',
    'Artificial Intelligence',
    'Data Mining'
  ],
  medicine: [
    'Clinical Trials as Topic',
    'Treatment Outcome',
    'Randomized Controlled Trials as Topic',
    'Therapeutics',
    'Medical Research'
  ],
  biology: [
    'Molecular Biology',
    'Genetics',
    'Proteins',
    'Cell Biology',
    'Biochemistry'
  ]
};

export const testSearchStrings = {
  pubmed: {
    computerScience: '("machine learning"[MeSH Terms] OR "artificial intelligence"[MeSH Terms]) AND ("algorithms"[MeSH Terms])',
    medicine: '("clinical trials as topic"[MeSH Terms] OR "treatment outcome"[MeSH Terms]) AND ("therapeutics"[MeSH Terms])'
  },
  elsevier: {
    computerScience: 'TITLE-ABS-KEY("machine learning" OR "artificial intelligence") AND TITLE-ABS-KEY("algorithms")',
    medicine: 'TITLE-ABS-KEY("clinical trial" OR "treatment outcome") AND TITLE-ABS-KEY("therapeutics")'
  }
};

export const testValidationRules = {
  publicationThreshold: {
    minimum: 5,
    recommended: 10,
    preferred: 20
  },
  retractionThreshold: {
    maximum: 0,
    warning: 1,
    exclude: 3
  },
  conflictRules: {
    sameInstitution: true,
    coAuthorExclusion: true,
    recentCollaboration: 24 // months
  }
};

export const testExportFormats = {
  csv: {
    headers: ['Name', 'Email', 'Affiliation', 'Country', 'Publications', 'Clinical Trials', 'Retractions'],
    delimiter: ',',
    encoding: 'utf8'
  },
  xlsx: {
    sheetName: 'Reviewer Recommendations',
    headers: ['Name', 'Email', 'Affiliation', 'Country', 'Publications', 'Clinical Trials', 'Retractions', 'Research Areas']
  },
  word: {
    template: 'reviewer-profile',
    includeProfiles: true,
    includeMetrics: true
  }
};

export const testApiResponses = {
  success: {
    status: 'success',
    message: 'Operation completed successfully'
  },
  error: {
    validation: {
      status: 'error',
      type: 'VALIDATION_ERROR',
      message: 'Invalid input data'
    },
    authentication: {
      status: 'error',
      type: 'AUTHENTICATION_ERROR',
      message: 'Authentication required'
    },
    authorization: {
      status: 'error',
      type: 'AUTHORIZATION_ERROR',
      message: 'Insufficient permissions'
    },
    notFound: {
      status: 'error',
      type: 'NOT_FOUND',
      message: 'Resource not found'
    }
  }
};

export const testPerformanceThresholds = {
  responseTime: {
    fast: 100, // ms
    acceptable: 500, // ms
    slow: 1000 // ms
  },
  throughput: {
    minimum: 10, // requests per second
    target: 50, // requests per second
    maximum: 100 // requests per second
  },
  memory: {
    baseline: 50, // MB
    warning: 100, // MB
    critical: 200 // MB
  }
};