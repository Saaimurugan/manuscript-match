-- Create tables for storing research data
CREATE TABLE public.research_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  authors TEXT[],
  abstract TEXT,
  keywords TEXT[],
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.research_papers ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for Python API)
CREATE POLICY "Public read access for research papers" 
ON public.research_papers 
FOR SELECT 
USING (true);

CREATE POLICY "Public insert access for research papers" 
ON public.research_papers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update access for research papers" 
ON public.research_papers 
FOR UPDATE 
USING (true);

-- Create table for reviewer data
CREATE TABLE public.reviewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  institution TEXT,
  expertise TEXT[],
  h_index INTEGER,
  publications_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviewers ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Public read access for reviewers" 
ON public.reviewers 
FOR SELECT 
USING (true);

CREATE POLICY "Public insert access for reviewers" 
ON public.reviewers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update access for reviewers" 
ON public.reviewers 
FOR UPDATE 
USING (true);

-- Create function for timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_research_papers_updated_at
BEFORE UPDATE ON public.research_papers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviewers_updated_at
BEFORE UPDATE ON public.reviewers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();