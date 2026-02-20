
-- Queue table to manage remix jobs one at a time
CREATE TABLE public.remix_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'processing', 'done', 'error')),
  source_repo TEXT NOT NULL,
  target_repo TEXT NOT NULL,
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS but allow public access (no auth in this app)
ALTER TABLE public.remix_queue ENABLE ROW LEVEL SECURITY;

-- Public read access (to check queue position)
CREATE POLICY "Anyone can view queue" ON public.remix_queue FOR SELECT USING (true);

-- Public insert (to join queue)
CREATE POLICY "Anyone can join queue" ON public.remix_queue FOR INSERT WITH CHECK (true);

-- Public update (to update status)
CREATE POLICY "Anyone can update queue" ON public.remix_queue FOR UPDATE USING (true);

-- Index for fast queue position lookups
CREATE INDEX idx_remix_queue_status_created ON public.remix_queue (status, created_at);

-- Auto-cleanup: delete completed entries older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_old_queue_entries()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.remix_queue 
  WHERE status IN ('done', 'error') 
  AND finished_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER cleanup_queue_on_insert
AFTER INSERT ON public.remix_queue
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_queue_entries();
