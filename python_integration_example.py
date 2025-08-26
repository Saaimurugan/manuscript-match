"""
Example Python code to connect to ScholarFinder via Supabase API
Install required package: pip install requests
"""

import requests
import json

# Your Supabase project details
SUPABASE_URL = "https://ofutrsieokzfvypdoeen.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdXRyc2llb2t6ZnZ5cGRvZWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxOTQ0OTcsImV4cCI6MjA3MTc3MDQ5N30.N7elAdkxhFxBkgjHZqxilwd-IfuudQK1fyA-87W2Axw"

# API endpoints
PAPERS_API = f"{SUPABASE_URL}/functions/v1/api-papers"
REVIEWERS_API = f"{SUPABASE_URL}/functions/v1/api-reviewers"

# Headers for API requests
headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json"
}

class ScholarFinderAPI:
    def __init__(self):
        self.headers = headers
        self.papers_url = PAPERS_API
        self.reviewers_url = REVIEWERS_API
    
    # ============= RESEARCH PAPERS METHODS =============
    
    def get_papers(self):
        """Get all research papers"""
        response = requests.get(self.papers_url, headers=self.headers)
        return response.json()
    
    def create_paper(self, title, authors, abstract, keywords, metadata=None):
        """Create a new research paper"""
        data = {
            "title": title,
            "authors": authors,  # List of author names
            "abstract": abstract,
            "keywords": keywords,  # List of keywords
            "metadata": metadata or {}
        }
        response = requests.post(self.papers_url, headers=self.headers, json=data)
        return response.json()
    
    def update_paper(self, paper_id, **kwargs):
        """Update an existing research paper"""
        data = {"id": paper_id, **kwargs}
        response = requests.put(self.papers_url, headers=self.headers, json=data)
        return response.json()
    
    def delete_paper(self, paper_id):
        """Delete a research paper"""
        data = {"id": paper_id}
        response = requests.delete(self.papers_url, headers=self.headers, json=data)
        return response.json()
    
    # ============= REVIEWERS METHODS =============
    
    def get_reviewers(self):
        """Get all reviewers"""
        response = requests.get(self.reviewers_url, headers=self.headers)
        return response.json()
    
    def create_reviewer(self, name, email=None, institution=None, expertise=None, 
                       h_index=None, publications_count=None, metadata=None):
        """Create a new reviewer"""
        data = {
            "name": name,
            "email": email,
            "institution": institution,
            "expertise": expertise or [],  # List of expertise areas
            "h_index": h_index,
            "publications_count": publications_count,
            "metadata": metadata or {}
        }
        response = requests.post(self.reviewers_url, headers=self.headers, json=data)
        return response.json()
    
    def create_reviewers_batch(self, reviewers_list):
        """Create multiple reviewers at once"""
        response = requests.post(self.reviewers_url, headers=self.headers, json=reviewers_list)
        return response.json()
    
    def update_reviewer(self, reviewer_id, **kwargs):
        """Update an existing reviewer"""
        data = {"id": reviewer_id, **kwargs}
        response = requests.put(self.reviewers_url, headers=self.headers, json=data)
        return response.json()
    
    def delete_reviewer(self, reviewer_id):
        """Delete a reviewer"""
        data = {"id": reviewer_id}
        response = requests.delete(self.reviewers_url, headers=self.headers, json=data)
        return response.json()


# ============= EXAMPLE USAGE =============

if __name__ == "__main__":
    # Initialize API client
    api = ScholarFinderAPI()
    
    # Example 1: Create a research paper
    print("Creating a research paper...")
    paper = api.create_paper(
        title="Deep Learning for Natural Language Processing",
        authors=["John Doe", "Jane Smith"],
        abstract="This paper explores the application of deep learning techniques in NLP...",
        keywords=["deep learning", "NLP", "transformers", "BERT"],
        metadata={"conference": "ACL 2024", "doi": "10.1234/example"}
    )
    print(f"Created paper: {json.dumps(paper, indent=2)}")
    
    # Example 2: Create a reviewer
    print("\nCreating a reviewer...")
    reviewer = api.create_reviewer(
        name="Dr. Emily Johnson",
        email="emily.johnson@university.edu",
        institution="Stanford University",
        expertise=["machine learning", "computer vision", "deep learning"],
        h_index=45,
        publications_count=127,
        metadata={"google_scholar_id": "abc123", "orcid": "0000-0002-1234-5678"}
    )
    print(f"Created reviewer: {json.dumps(reviewer, indent=2)}")
    
    # Example 3: Batch create reviewers
    print("\nBatch creating reviewers...")
    reviewers_batch = [
        {
            "name": "Dr. Michael Chen",
            "email": "m.chen@mit.edu",
            "institution": "MIT",
            "expertise": ["robotics", "AI", "control systems"],
            "h_index": 38,
            "publications_count": 95
        },
        {
            "name": "Prof. Sarah Williams",
            "email": "s.williams@oxford.ac.uk",
            "institution": "Oxford University",
            "expertise": ["NLP", "computational linguistics", "semantics"],
            "h_index": 52,
            "publications_count": 168
        }
    ]
    batch_result = api.create_reviewers_batch(reviewers_batch)
    print(f"Batch created: {json.dumps(batch_result, indent=2)}")
    
    # Example 4: Get all papers
    print("\nFetching all papers...")
    papers = api.get_papers()
    print(f"Total papers: {len(papers.get('data', []))}")
    
    # Example 5: Get all reviewers
    print("\nFetching all reviewers...")
    reviewers = api.get_reviewers()
    print(f"Total reviewers: {len(reviewers.get('data', []))}")