import supabase from './supabase';

class ChallengeService {
  // Get all active challenges
  async getChallenges() {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return {
          success: false,
          error: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.'
        };
      }
      return { success: false, error: 'Failed to load challenges' };
    }
  }

  // Get challenge by ID
  async getChallengeById(challengeId) {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .eq('is_active', true)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return {
          success: false,
          error: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.'
        };
      }
      return { success: false, error: 'Failed to load challenge' };
    }
  }

  // Get random challenge by difficulty
  async getRandomChallenge(difficulty = null) {
    try {
      let query = supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true);

      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No challenges found' };
      }

      // Return random challenge
      const randomIndex = Math.floor(Math.random() * data.length);
      return { success: true, data: data[randomIndex] };
    } catch (error) {
      return { success: false, error: 'Failed to load random challenge' };
    }
  }

  // Execute code against test cases
  async executeCode(challengeId, code, language = 'python') {
    try {
      const challengeResult = await this.getChallengeById(challengeId);
      if (!challengeResult.success) {
        return challengeResult;
      }

      const challenge = challengeResult.data;
      const testCases = challenge.test_cases || [];

      // Use Piston for real execution
      const results = await this.executePythonWithPiston(code, testCases);

      return results;
    } catch (error) {
      return { success: false, error: 'Failed to execute code' };
    }
  }

  async executePythonWithPiston(code, testCases) {
    const results = {
      success: false,
      executionTime: 0,
      testCases: [],
      error: null,
      totalPassed: 0,
      totalTests: testCases.length
    };

    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      // Add delay between requests (except for the first one)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 250)); // 250ms delay
      }

      const payload = {
        language: "python3",
        version: "3.10.0",
        files: [{ name: "solution.py", content: code }],
        stdin: String(testCase.input)  // Convert to string
      };

      try {
        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await response.json();

        const actual = data.run?.output?.trim();
        const expected = testCase.expected;

        // Convert string output to boolean for comparison
        let actualBool;
        if (actual === "True") actualBool = true;
        else if (actual === "False") actualBool = false;
        else actualBool = actual; // fallback

        const passed = actualBool === expected;
        if (passed) passedCount++;

        results.testCases.push({
          passed,
          input: testCase.input,
          expected: testCase.expected,
          actual,
          executionTime: data.run?.time || 0
        });
      } catch (err) {
        results.testCases.push({
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          actual: "",
          executionTime: 0,
          error: err.message
        });
      }
    }

    results.totalPassed = passedCount;
    results.success = passedCount === testCases.length;
    return { success: true, data: results };
  }

  // Generate plausible incorrect output for failed test cases
  generateIncorrectOutput(expected) {
    if (Array.isArray(expected)) {
      // Return array with wrong length or values
      if (expected.length > 0) {
        return expected.slice(0, -1); // Remove last element
      }
      return [expected[0], "wrong_value"];
    }
    
    if (typeof expected === 'number') {
      return expected + Math.floor(Math.random() * 10) - 5;
    }
    
    if (typeof expected === 'string') {
      return expected + "_wrong";
    }
    
    if (typeof expected === 'boolean') {
      return !expected;
    }
    
    return "incorrect_output";
  }

  // Submit code for a room
  async submitCode(roomId, challengeId, code, executionResults) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('code_submissions')
        .insert({
          room_id: roomId,
          user_id: user.id,
          challenge_id: challengeId,
          code: code,
          execution_time: executionResults.executionTime,
          test_results: executionResults.testCases,
          is_successful: executionResults.success,
          error_message: executionResults.error
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to submit code' };
    }
  }
}

export default new ChallengeService();