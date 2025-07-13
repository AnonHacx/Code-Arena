-- Add demo bot support to existing schema

-- 1. Create demo_bots table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.demo_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    skill_level INTEGER DEFAULT 1200,
    response_delay_min INTEGER DEFAULT 2000,
    response_delay_max INTEGER DEFAULT 8000,
    success_rate DECIMAL(3,2) DEFAULT 0.70,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add demo bot columns to rooms table if they don't exist
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS use_demo_bot BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS demo_bot_id UUID REFERENCES public.demo_bots(id) ON DELETE SET NULL;

-- 3. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_demo_bots_active ON public.demo_bots(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_demo_bot ON public.rooms(demo_bot_id);

-- 4. Enable RLS for demo_bots if not already enabled
ALTER TABLE public.demo_bots ENABLE ROW LEVEL SECURITY;

-- 5. Create demo bot policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'demo_bots' AND policyname = 'public_can_view_demo_bots') THEN
        CREATE POLICY "public_can_view_demo_bots" ON public.demo_bots FOR SELECT
        TO public USING (is_active = true);
    END IF;
END $$;

-- 6. Insert sample demo bots if they don't exist
DO $$
DECLARE
    bot1_id UUID := gen_random_uuid();
    bot2_id UUID := gen_random_uuid();
    bot3_id UUID := gen_random_uuid();
    bot4_id UUID := gen_random_uuid();
BEGIN
    -- Only insert if no demo bots exist
    IF NOT EXISTS (SELECT 1 FROM public.demo_bots LIMIT 1) THEN
        INSERT INTO public.demo_bots (id, name, username, skill_level, success_rate, response_delay_min, response_delay_max) VALUES
        (bot1_id, 'CodeBot Alpha', 'codebot_alpha', 1400, 0.75, 3000, 10000),
        (bot2_id, 'Logic Master', 'logic_master', 1600, 0.82, 2000, 8000),
        (bot3_id, 'Quick Solver', 'quick_solver', 1200, 0.65, 1500, 6000),
        (bot4_id, 'Python Ninja', 'python_ninja', 1800, 0.90, 4000, 12000);
    END IF;
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Demo bots already exist, skipping insertion';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting demo bots: %', SQLERRM;
END $$;

-- 7. Create or replace the get_available_demo_bot function
CREATE OR REPLACE FUNCTION public.get_available_demo_bot()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bot_id UUID;
BEGIN
    -- Get a random active demo bot
    SELECT id INTO bot_id
    FROM public.demo_bots
    WHERE is_active = true
    ORDER BY random()
    LIMIT 1;
    
    RETURN bot_id;
END;
$$;

-- 8. Create or replace the simulate_demo_bot_progress function
CREATE OR REPLACE FUNCTION public.simulate_demo_bot_progress(room_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bot_data RECORD;
    room_data RECORD;
    progress JSON;
    simulated_attempts INTEGER;
    simulated_tests_passed INTEGER;
    simulated_accuracy DECIMAL;
    time_elapsed INTEGER;
BEGIN
    -- Get room and bot data
    SELECT r.*, db.* INTO room_data
    FROM public.rooms r
    LEFT JOIN public.demo_bots db ON r.demo_bot_id = db.id
    WHERE r.id = room_uuid;
    
    IF NOT FOUND OR room_data.demo_bot_id IS NULL THEN
        RETURN '{"error": "Room or demo bot not found"}'::JSON;
    END IF;
    
    -- Calculate time elapsed since room started
    time_elapsed := COALESCE(
        extract(epoch from (now() - room_data.started_at))::INTEGER, 
        extract(epoch from (now() - room_data.created_at))::INTEGER
    );
    
    -- Simulate bot progress based on time and skill
    simulated_attempts := GREATEST(1, time_elapsed / 120); -- Attempt every 2 minutes
    simulated_tests_passed := LEAST(
        ROUND(simulated_attempts * room_data.success_rate)::INTEGER,
        5 -- Max 5 test cases
    );
    simulated_accuracy := CASE 
        WHEN simulated_attempts > 0 THEN (simulated_tests_passed::DECIMAL / simulated_attempts) * 100
        ELSE 0
    END;
    
    -- Build progress JSON
    progress := json_build_object(
        'id', room_data.demo_bot_id,
        'name', room_data.name,
        'username', room_data.username,
        'isConnected', true,
        'status', CASE 
            WHEN simulated_tests_passed >= 5 THEN 'completed'
            WHEN simulated_attempts > 3 THEN 'testing' ELSE'coding'
        END,
        'attempts', simulated_attempts,
        'testsPassed', simulated_tests_passed,
        'totalTests', 5,
        'timeSpent', time_elapsed,
        'lastActivity', CASE 
            WHEN simulated_tests_passed >= 5 THEN 'Completed challenge!'
            WHEN simulated_attempts > 2 THEN 'Running tests...' ELSE'Writing solution...'
        END,
        'accuracy', simulated_accuracy
    );
    
    RETURN progress;
END;
$$;
