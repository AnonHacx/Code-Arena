-- Location: supabase/migrations/20250713064900_fix_uuid_issues.sql
-- Fix UUID issues and add demo bot functionality

-- 1. Add demo bot support table
CREATE TABLE public.demo_bots (
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

-- 2. Add demo bot configuration to rooms
ALTER TABLE public.rooms 
ADD COLUMN use_demo_bot BOOLEAN DEFAULT false,
ADD COLUMN demo_bot_id UUID REFERENCES public.demo_bots(id) ON DELETE SET NULL;

-- 3. Create index for demo bot lookups
CREATE INDEX idx_demo_bots_active ON public.demo_bots(is_active);
CREATE INDEX idx_rooms_demo_bot ON public.rooms(demo_bot_id);

-- 4. Enhanced room code generation function (ensure TEXT return)
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
    attempts INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    LOOP
        attempts := attempts + 1;
        
        -- Generate a 6-character alphanumeric code using better randomization
        new_code := upper(
            substr(
                encode(
                    decode(md5(random()::text || clock_timestamp()::text), 'hex'), 
                    'base64'
                ), 
                1, 6
            )
        );
        
        -- Remove any non-alphanumeric characters and ensure 6 chars
        new_code := regexp_replace(new_code, '[^A-Z0-9]', '', 'g');
        
        -- Pad with random chars if too short
        WHILE length(new_code) < 6 LOOP
            new_code := new_code || chr(65 + floor(random() * 26)::int);
        END LOOP;
        
        -- Truncate if too long
        new_code := substr(new_code, 1, 6);
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.rooms WHERE room_code = new_code) INTO code_exists;
        
        -- Exit loop if code is unique or max attempts reached
        IF NOT code_exists OR attempts >= max_attempts THEN
            EXIT;
        END IF;
    END LOOP;
    
    -- If we hit max attempts, append timestamp to ensure uniqueness
    IF code_exists THEN
        new_code := substr(new_code, 1, 4) || to_char(extract(epoch from now())::integer % 100, 'FM00');
    END IF;
    
    RETURN new_code;
END;
$$;

-- 5. Function to get available demo bot
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

-- 6. Function to simulate demo bot activity
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

-- 7. Enable RLS for demo bots
ALTER TABLE public.demo_bots ENABLE ROW LEVEL SECURITY;

-- 8. Demo bots policies (public read access)
CREATE POLICY "public_can_view_demo_bots" ON public.demo_bots FOR SELECT
TO public USING (is_active = true);

-- 9. Insert sample demo bots
DO $$
DECLARE
    bot1_id UUID := gen_random_uuid();
    bot2_id UUID := gen_random_uuid();
    bot3_id UUID := gen_random_uuid();
    bot4_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO public.demo_bots (id, name, username, skill_level, success_rate, response_delay_min, response_delay_max) VALUES
    (bot1_id, 'CodeBot Alpha', 'codebot_alpha', 1400, 0.75, 3000, 10000),
    (bot2_id, 'Logic Master', 'logic_master', 1600, 0.82, 2000, 8000),
    (bot3_id, 'Quick Solver', 'quick_solver', 1200, 0.65, 1500, 6000),
    (bot4_id, 'Python Ninja', 'python_ninja', 1800, 0.90, 4000, 12000);

EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Demo bots already exist, skipping insertion';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting demo bots: %', SQLERRM;
END $$;