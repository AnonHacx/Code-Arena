-- Location: supabase/migrations/20250713063638_codeduel_multiplayer.sql

-- 1. Types and Enums
CREATE TYPE public.user_role AS ENUM ('player', 'admin');
CREATE TYPE public.room_status AS ENUM ('waiting', 'active', 'completed', 'cancelled');
CREATE TYPE public.battle_status AS ENUM ('coding', 'testing', 'completed', 'failed');
CREATE TYPE public.challenge_difficulty AS ENUM ('easy', 'medium', 'hard');

-- 2. Core Tables
-- User profiles table (intermediary for auth relationships)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role public.user_role DEFAULT 'player'::public.user_role,
    total_battles INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    rating INTEGER DEFAULT 1200,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Challenges table
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    difficulty public.challenge_difficulty NOT NULL,
    time_limit INTEGER NOT NULL DEFAULT 900, -- 15 minutes in seconds
    description TEXT NOT NULL,
    function_signature TEXT NOT NULL,
    examples JSONB NOT NULL DEFAULT '[]'::jsonb,
    constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_complexity JSONB,
    test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
    solution_template TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT NOT NULL UNIQUE,
    host_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
    status public.room_status DEFAULT 'waiting'::public.room_status,
    max_participants INTEGER DEFAULT 2,
    current_participants INTEGER DEFAULT 1,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    winner_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Room participants table
CREATE TABLE public.room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_host BOOLEAN DEFAULT false,
    status public.battle_status DEFAULT 'coding'::public.battle_status,
    current_code TEXT DEFAULT '',
    attempts INTEGER DEFAULT 0,
    tests_passed INTEGER DEFAULT 0,
    total_tests INTEGER DEFAULT 0,
    accuracy DECIMAL(5,2) DEFAULT 0.00,
    completion_time INTEGER, -- Time taken to complete in seconds
    last_activity TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id)
);

-- Code submissions table
CREATE TABLE public.code_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language TEXT DEFAULT 'python',
    execution_time INTEGER,
    test_results JSONB DEFAULT '[]'::jsonb,
    is_successful BOOLEAN DEFAULT false,
    error_message TEXT,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Essential Indexes
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX idx_rooms_room_code ON public.rooms(room_code);
CREATE INDEX idx_rooms_host_id ON public.rooms(host_id);
CREATE INDEX idx_rooms_status ON public.rooms(status);
CREATE INDEX idx_room_participants_room_id ON public.room_participants(room_id);
CREATE INDEX idx_room_participants_user_id ON public.room_participants(user_id);
CREATE INDEX idx_code_submissions_room_id ON public.code_submissions(room_id);
CREATE INDEX idx_code_submissions_user_id ON public.code_submissions(user_id);

-- 4. RLS Setup
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;

-- 5. Helper Functions
CREATE OR REPLACE FUNCTION public.is_room_participant(room_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = room_uuid AND rp.user_id = auth.uid()
)
$$;

CREATE OR REPLACE FUNCTION public.is_room_host(room_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_uuid AND r.host_id = auth.uid()
)
$$;

CREATE OR REPLACE FUNCTION public.can_access_submission(submission_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.code_submissions cs
    WHERE cs.id = submission_uuid AND (
        cs.user_id = auth.uid() OR
        public.is_room_participant(cs.room_id)
    )
)
$$;

-- Function for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, username, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'player'::public.user_role)
  );  
  RETURN NEW;
END;
$$;

-- Function to generate unique room codes
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a 6-character alphanumeric code
        new_code := upper(substr(md5(random()::text), 1, 6));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.rooms WHERE room_code = new_code) INTO code_exists;
        
        -- Exit loop if code is unique
        IF NOT code_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_code;
END;
$$;

-- Function to update room participant count
CREATE OR REPLACE FUNCTION public.update_room_participant_count()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.rooms 
        SET current_participants = current_participants + 1
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.rooms 
        SET current_participants = current_participants - 1
        WHERE id = OLD.room_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Function to update user stats after battle
CREATE OR REPLACE FUNCTION public.update_user_battle_stats()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    is_winner BOOLEAN;
BEGIN
    -- Check if this room completion resulted in a win for this user
    SELECT (winner_id = NEW.winner_id) INTO is_winner
    FROM public.rooms 
    WHERE id = NEW.id;
    
    -- Update user stats for all participants
    UPDATE public.user_profiles 
    SET 
        total_battles = total_battles + 1,
        wins = CASE WHEN user_profiles.id = NEW.winner_id THEN wins + 1 ELSE wins END,
        losses = CASE WHEN user_profiles.id != NEW.winner_id THEN losses + 1 ELSE losses END,
        rating = CASE 
            WHEN user_profiles.id = NEW.winner_id THEN rating + 25 
            ELSE GREATEST(rating - 15, 0) 
        END
    WHERE id IN (
        SELECT user_id FROM public.room_participants WHERE room_id = NEW.id
    );
    
    RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for room participant count
CREATE TRIGGER on_room_participant_change
  AFTER INSERT OR DELETE ON public.room_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_room_participant_count();

-- Trigger for battle completion stats
CREATE TRIGGER on_room_completion
  AFTER UPDATE OF winner_id ON public.rooms
  FOR EACH ROW 
  WHEN (OLD.winner_id IS NULL AND NEW.winner_id IS NOT NULL)
  EXECUTE FUNCTION public.update_user_battle_stats();

-- 6. RLS Policies
-- User profiles policies
CREATE POLICY "public_can_view_profiles" ON public.user_profiles FOR SELECT
TO public USING (true);

CREATE POLICY "users_manage_own_profile" ON public.user_profiles FOR ALL
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Challenges policies (public read access)
CREATE POLICY "public_can_view_challenges" ON public.challenges FOR SELECT
TO public USING (is_active = true);

-- Rooms policies
CREATE POLICY "public_can_view_active_rooms" ON public.rooms FOR SELECT
TO public USING (status IN ('waiting', 'active'));

CREATE POLICY "authenticated_can_create_rooms" ON public.rooms FOR INSERT
TO authenticated WITH CHECK (auth.uid() = host_id);

CREATE POLICY "hosts_manage_rooms" ON public.rooms FOR ALL
TO authenticated USING (public.is_room_host(id)) WITH CHECK (public.is_room_host(id));

-- Room participants policies
CREATE POLICY "participants_view_room_data" ON public.room_participants FOR SELECT
TO authenticated USING (public.is_room_participant(room_id));

CREATE POLICY "authenticated_can_join_rooms" ON public.room_participants FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "participants_update_own_data" ON public.room_participants FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Code submissions policies
CREATE POLICY "participants_view_submissions" ON public.code_submissions FOR SELECT
TO authenticated USING (public.can_access_submission(id));

CREATE POLICY "users_create_own_submissions" ON public.code_submissions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- 7. Sample Data
DO $$
DECLARE
    challenge1_id UUID := gen_random_uuid();
    challenge2_id UUID := gen_random_uuid();
    challenge3_id UUID := gen_random_uuid();
BEGIN
    -- Sample challenges
    INSERT INTO public.challenges (id, title, difficulty, description, function_signature, examples, constraints, test_cases, solution_template) VALUES
    (
        challenge1_id,
        'Pyramid Generator',
        'medium'::public.challenge_difficulty,
        'Create a function that generates a pyramid pattern using asterisks (*). The pyramid should have n levels, where each level contains an odd number of asterisks centered on the line.',
        'def pyramid_generator(n):',
        '[
            {
                "input": "pyramid_generator(3)",
                "output": "[\"  *  \", \" *** \", \"*****\"]",
                "explanation": "A 3-level pyramid with each level centered and containing 1, 3, and 5 asterisks respectively."
            },
            {
                "input": "pyramid_generator(1)",
                "output": "[\"*\"]",
                "explanation": "A single level pyramid contains just one asterisk."
            }
        ]'::jsonb,
        '[
            "1 ≤ n ≤ 20",
            "Each level must be properly centered",
            "Use asterisks (*) for the pyramid structure",
            "Return a list of strings representing each level"
        ]'::jsonb,
        '[
            {"input": 1, "expected": ["*"]},
            {"input": 2, "expected": [" * ", "***"]},
            {"input": 3, "expected": ["  *  ", " *** ", "*****"]},
            {"input": 4, "expected": ["   *   ", "  ***  ", " ***** ", "*******"]},
            {"input": 5, "expected": ["    *    ", "   ***   ", "  *****  ", " ******* ", "*********"]}
        ]'::jsonb,
        'def pyramid_generator(n):
    """
    Generate a pyramid pattern with n levels
    Args:
        n (int): Number of levels in the pyramid
    Returns:
        list: List of strings representing each level
    """
    # Your code here
    pass'
    ),
    (
        challenge2_id,
        'Two Sum',
        'easy'::public.challenge_difficulty,
        'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        'def two_sum(nums, target):',
        '[
            {
                "input": "two_sum([2,7,11,15], 9)",
                "output": "[0,1]",
                "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
            }
        ]'::jsonb,
        '[
            "Each input would have exactly one solution",
            "You may not use the same element twice",
            "You can return the answer in any order"
        ]'::jsonb,
        '[
            {"input": {"nums": [2,7,11,15], "target": 9}, "expected": [0,1]},
            {"input": {"nums": [3,2,4], "target": 6}, "expected": [1,2]},
            {"input": {"nums": [3,3], "target": 6}, "expected": [0,1]}
        ]'::jsonb,
        'def two_sum(nums, target):
    """
    Find two numbers that add up to target
    Args:
        nums (List[int]): Array of integers
        target (int): Target sum
    Returns:
        List[int]: Indices of the two numbers
    """
    # Your code here
    pass'
    ),
    (
        challenge3_id,
        'Palindrome Check',
        'easy'::public.challenge_difficulty,
        'Write a function that checks if a given string is a palindrome. A palindrome reads the same forward and backward.',
        'def is_palindrome(s):',
        '[
            {
                "input": "is_palindrome(\"racecar\")",
                "output": "True",
                "explanation": "The string reads the same forwards and backwards."
            },
            {
                "input": "is_palindrome(\"hello\")",
                "output": "False",
                "explanation": "The string does not read the same forwards and backwards."
            }
        ]'::jsonb,
        '[
            "Consider only alphanumeric characters",
            "Ignore case sensitivity",
            "Empty string is considered a palindrome"
        ]'::jsonb,
        '[
            {"input": "racecar", "expected": true},
            {"input": "hello", "expected": false},
            {"input": "A man a plan a canal Panama", "expected": true},
            {"input": "", "expected": true},
            {"input": "race a car", "expected": false}
        ]'::jsonb,
        'def is_palindrome(s):
    """
    Check if a string is a palindrome
    Args:
        s (str): Input string
    Returns:
        bool: True if palindrome, False otherwise
    """
    # Your code here
    pass'
    );

EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key error: %', SQLERRM;
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint error: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error: %', SQLERRM;
END $$;