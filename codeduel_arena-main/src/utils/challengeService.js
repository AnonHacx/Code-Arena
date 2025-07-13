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
      // Get challenge test cases
      const challengeResult = await this.getChallengeById(challengeId);
      if (!challengeResult.success) {
        return challengeResult;
      }

      const challenge = challengeResult.data;
      const testCases = challenge.test_cases || [];

      // Simulate code execution (replace with actual execution service)
      const results = await this.simulateCodeExecution(code, testCases, challenge);

      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: 'Failed to execute code' };
    }
  }

  // Simulate code execution (replace with actual code execution service)
  async simulateCodeExecution(code, testCases, challenge) {
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const results = {
      success: false,
      executionTime: Math.floor(Math.random() * 500) + 100,
      testCases: [],
      error: null,
      totalPassed: 0,
      totalTests: testCases.length
    };

    // Basic code validation
    if (!code.trim()) {
      results.error = "Code is empty";
      return results;
    }

    if (!code.includes('def ')) {
      results.error = "Function definition not found";
      return results;
    }

    // Extract function name from challenge signature
    const functionName = challenge.function_signature?.split('(')[0]?.replace('def ', '')?.trim();
    if (functionName && !code.includes(functionName)) {
      results.error = `Function '${functionName}' not found in code`;
      return results;
    }

    // Simulate test case execution
    let passedCount = 0;
    results.testCases = testCases.map((testCase, index) => {
      // Simulate different success rates based on code quality indicators
      let successProbability = 0.3; // Base probability

      // Improve probability based on code patterns
      if (code.includes('return')) successProbability += 0.2;
      if (code.includes('for ') || code.includes('while ')) successProbability += 0.15;
      if (code.includes('if ')) successProbability += 0.1;
      if (code.includes('len(')) successProbability += 0.1;
      if (code.includes('range(')) successProbability += 0.1;
      if (code.split('\n').length > 5) successProbability += 0.1; // Longer code might be more complete

      // First test case has higher probability to encourage users
      if (index === 0) successProbability += 0.2;

      // Later test cases are harder
      successProbability = Math.max(0.1, successProbability - (index * 0.1));

      const passed = Math.random() < successProbability;
      if (passed) passedCount++;

      return {
        passed,
        input: testCase.input,
        expected: testCase.expected,
        actual: passed ? testCase.expected : this.generateIncorrectOutput(testCase.expected),
        executionTime: Math.floor(Math.random() * 50) + 10
      };
    });

    results.totalPassed = passedCount;
    results.success = passedCount === testCases.length;

    // Add random errors for failed executions
    if (!results.success && Math.random() < 0.3) {
      const errors = [
        "IndentationError: expected an indented block",
        "NameError: name \'undefined_variable\' is not defined",
        "TypeError: unsupported operand type(s)",
        "IndexError: list index out of range",
        "ValueError: invalid literal for int()",
        "RecursionError: maximum recursion depth exceeded"
      ];
      results.error = errors[Math.floor(Math.random() * errors.length)];
    }

    return results;
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