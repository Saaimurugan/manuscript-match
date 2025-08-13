import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { FileUpload } from "@/components/upload/FileUpload";
import { DataExtraction } from "@/components/extraction/DataExtraction";
import { ReviewerSearch } from "@/components/search/ReviewerSearch";
import { ReviewerResults } from "@/components/results/ReviewerResults";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LogOut, FileText, Search, Users, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  username: string;
}

interface ExtractedData {
  title: string;
  abstract: string;
  keywords: string[];
  authors: Array<{
    name: string;
    affiliation: string;
    email?: string;
  }>;
  headings: string[];
}

interface Reviewer {
  id: string;
  name: string;
  email?: string;
  affiliation: string;
  country: string;
  publicationCount: number;
  recentPublications: string[];
  expertise: string[];
  database: string;
  matchScore: number;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [primaryKeywords, setPrimaryKeywords] = useState<string[]>([]);
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const { toast } = useToast();

  const handleLogin = (credentials: { username: string; password: string }) => {
    // In a real app, this would validate against a backend
    setUser({ username: credentials.username });
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentStep(1);
    setUploadedFile(null);
    setExtractedData(null);
    setPrimaryKeywords([]);
    setSecondaryKeywords([]);
    setReviewers([]);
  };

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    
    // Simulate data extraction
    const mockData: ExtractedData = {
      title: "Machine Learning Applications in Biomedical Research: A Comprehensive Review",
      abstract: "This comprehensive review examines the current state and future prospects of machine learning applications in biomedical research. We analyze various ML techniques including deep learning, ensemble methods, and natural language processing as applied to clinical diagnosis, drug discovery, and personalized medicine. Our findings indicate significant potential for ML to transform healthcare delivery and research methodologies.",
      keywords: ["machine learning", "biomedical research", "deep learning", "clinical diagnosis", "drug discovery"],
      authors: [
        { name: "Dr. Sarah Johnson", affiliation: "Stanford University Medical Center", email: "s.johnson@stanford.edu" },
        { name: "Prof. Michael Chen", affiliation: "MIT Computer Science Lab", email: "m.chen@mit.edu" },
        { name: "Dr. Emily Rodriguez", affiliation: "Johns Hopkins Medical School" }
      ],
      headings: ["Introduction", "Literature Review", "Methodology", "Machine Learning Techniques", "Applications in Clinical Diagnosis", "Drug Discovery Applications", "Results and Discussion", "Future Directions", "Conclusion"]
    };
    
    setExtractedData(mockData);
    setPrimaryKeywords(mockData.keywords.slice(0, 3));
    setSecondaryKeywords(mockData.keywords.slice(3));
    setCurrentStep(2);
  };

  const handleKeywordsChange = (primary: string[], secondary: string[]) => {
    setPrimaryKeywords(primary);
    setSecondaryKeywords(secondary);
  };

  const handleSearch = (keywords: string[], databases: string[]) => {
    // Simulate reviewer search results
    const mockReviewers: Reviewer[] = [
      {
        id: "1",
        name: "Dr. Jennifer Walsh",
        email: "j.walsh@harvard.edu",
        affiliation: "Harvard Medical School",
        country: "United States",
        publicationCount: 23,
        recentPublications: [
          "Deep learning approaches for medical image analysis (2023)",
          "Machine learning in clinical decision support systems (2022)",
          "Automated diagnosis using neural networks (2023)"
        ],
        expertise: ["machine learning", "medical imaging", "neural networks", "clinical AI"],
        database: "pubmed",
        matchScore: 92
      },
      {
        id: "2", 
        name: "Prof. David Kumar",
        affiliation: "University of Oxford",
        country: "United Kingdom",
        publicationCount: 31,
        recentPublications: [
          "Ensemble methods for biomedical classification (2023)",
          "Drug discovery through AI-driven molecular analysis (2022)"
        ],
        expertise: ["drug discovery", "ensemble methods", "molecular analysis"],
        database: "sciencedirect",
        matchScore: 88
      },
      {
        id: "3",
        name: "Dr. Maria Gonzalez",
        email: "m.gonzalez@ucl.ac.uk",
        affiliation: "University College London",
        country: "United Kingdom", 
        publicationCount: 18,
        recentPublications: [
          "Natural language processing in clinical text mining (2023)",
          "Personalized medicine through machine learning (2022)"
        ],
        expertise: ["natural language processing", "personalized medicine", "clinical text mining"],
        database: "pubmed",
        matchScore: 85
      }
    ];
    
    setReviewers(mockReviewers);
    setCurrentStep(3);
  };

  const handleExport = () => {
    toast({
      title: "Export successful",
      description: "Reviewer data has been exported to CSV format.",
    });
  };

  const getStepProgress = () => {
    return ((currentStep - 1) / 2) * 100;
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-academic-light">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ScholarFinder</h1>
                <p className="text-xs text-muted-foreground">Academic Peer Reviewer Discovery</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {user.username}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Research Workflow Progress</CardTitle>
              <span className="text-sm text-muted-foreground">Step {currentStep} of 3</span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={getStepProgress()} className="mb-4" />
            <div className="flex justify-between text-sm">
              <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <FileText className="w-4 h-4" />
                <span>Upload & Extract</span>
              </div>
              <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <Search className="w-4 h-4" />
                <span>Search Reviewers</span>
              </div>
              <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                <Users className="w-4 h-4" />
                <span>Review Results</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="space-y-8">
          {currentStep === 1 && (
            <FileUpload 
              onFileUpload={handleFileUpload}
              uploadedFile={uploadedFile}
            />
          )}

          {currentStep === 2 && extractedData && (
            <div className="space-y-8">
              <DataExtraction 
                data={extractedData}
                fileName={uploadedFile?.name || "manuscript.docx"}
              />
              <ReviewerSearch
                primaryKeywords={primaryKeywords}
                secondaryKeywords={secondaryKeywords}
                onKeywordsChange={handleKeywordsChange}
                onSearch={handleSearch}
              />
            </div>
          )}

          {currentStep === 3 && reviewers.length > 0 && (
            <ReviewerResults 
              reviewers={reviewers}
              onExport={handleExport}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
