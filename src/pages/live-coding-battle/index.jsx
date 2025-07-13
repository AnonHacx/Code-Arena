import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import ChallengePanel from './components/ChallengePanel';
import CodeEditor from './components/CodeEditor';
import OpponentProgress from './components/OpponentProgress';
import CompetitionStatus from './components/CompetitionStatus';
import roomService from '../../utils/roomService';
import challengeService from '../../utils/challengeService';

const LiveCodingBattle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const [challengePanelVisible, setChallengePanelVisible] = useState(false);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResults, setExecutionResults] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomChannel, setRoomChannel] = useState(null);

  // Competition status
  const [competitionStatus, setCompetitionStatus] = useState({
    isActive: false,
    timeRemaining: 900, // 15 minutes
    winner: null,
    finalTime: null
  });

  // User stats
  const [userStats, setUserStats] = useState({
    attempts: 0,
    testsPassed: 0,
    totalTests: 0,
    codeLines: 0,
    accuracy: 0,
    lastSubmission: null
  });

  // Opponent data
  const [opponent, setOpponent] = useState(null);

  // Get room state from navigation or create demo room
  useEffect(() => {
    const initializeRoom = async () => {
      try {
        setLoading(true);
        setError(null);

        const roomState = location.state;
        
        if (roomState?.roomData) {
          // Load existing room
          await loadRoomData(roomState.roomData);
        } else if (roomState?.roomCode) {
          // Join room by code
          await loadRoomByCode(roomState.roomCode);
        } else {
          // Load demo challenge for preview mode
          await loadDemoChallenge();
        }
      } catch (err) {
        setError('Failed to load battle data');
        console.log('Initialize room error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeRoom();
  }, [location.state]);

  // Load room data by room object
  const loadRoomData = async (room) => {
    try {
      setRoomData(room);

      // Get full room details
      const roomResult = await roomService.getRoomDetails(room.id);
      if (roomResult.success) {
        const fullRoomData = roomResult.data;
        setRoomData(fullRoomData);
        
        // Load challenge and set up room
        await setupRoomChallenge(fullRoomData);
        setupRoomSubscription(fullRoomData.id);
        updateCompetitionStatus(fullRoomData);
        setupOpponentData(fullRoomData);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Load room by code
  const loadRoomByCode = async (roomCode) => {
    try {
      const joinResult = await roomService.joinRoom(roomCode);
      if (joinResult.success) {
        await loadRoomData(joinResult.data);
      } else {
        throw new Error(joinResult.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Setup challenge for room
  const setupRoomChallenge = async (room) => {
    if (room.status !== 'active') return; // Only load challenge if room is active
    // Get challenge
    if (room.challenge_id) {
      const challengeResult = await challengeService.getChallengeById(room.challenge_id);
      if (challengeResult.success) {
        setChallenge(challengeResult.data);
        setUserStats(prev => ({ ...prev, totalTests: challengeResult.data.test_cases?.length || 5 }));
        setCode(challengeResult.data.solution_template || '');
      }
    } else {
      // Get random challenge if none assigned
      const challengeResult = await challengeService.getRandomChallenge();
      if (challengeResult.success) {
        setChallenge(challengeResult.data);
        setUserStats(prev => ({ ...prev, totalTests: challengeResult.data.test_cases?.length || 5 }));
        setCode(challengeResult.data.solution_template || '');
        
        // Update room with challenge
        if (user?.id === room.host_id) {
          await roomService.startBattle(room.id, challengeResult.data.id);
          // Fetch updated room data
          const updatedRoom = await roomService.getRoomDetails(room.id);
          if (updatedRoom.success) {
            setRoomData(updatedRoom.data);
          }
        }
      }
    }
  };

  // Update competition status
  const updateCompetitionStatus = (room) => {
    if (room.status === 'active' && room.started_at) {
      const startTime = new Date(room.started_at).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 900 - elapsed); // 15 minutes total
      
      setCompetitionStatus({
        isActive: true,
        timeRemaining: remaining,
        winner: room.winner_id,
        finalTime: room.completed_at ? elapsed : null
      });
    } else if (room.status === 'waiting') {
      setCompetitionStatus({
        isActive: false,
        timeRemaining: 900,
        winner: null,
        finalTime: null
      });
    }
  };

  // Setup opponent data
  const setupOpponentData = async (room) => {
    const participants = room.participants || [];
    
    if (room.use_demo_bot && room.demo_bot_id) {
      // Handle demo bot opponent
      const demoBotProgress = await roomService.getDemoBotProgress(room.id);
      if (demoBotProgress.success) {
        setOpponent(demoBotProgress.data);
      } else {
        // Fallback demo bot data
        setOpponent({
          id: room.demo_bot_id,
          name: room.demo_bot?.name || 'Demo Bot',
          username: room.demo_bot?.username || 'demo_bot',
          isConnected: true,
          status: 'coding',
          attempts: 1,
          testsPassed: 2,
          totalTests: 5,
          timeSpent: 300,
          lastActivity: 'Writing solution...',
          isBot: true
        });
      }
    } else {
      // Handle human opponent
      const opponentParticipant = participants.find(p => p.user_id !== user?.id);
      if (opponentParticipant) {
        setOpponent({
          id: opponentParticipant.user_id,
          name: opponentParticipant.user?.full_name || 'Opponent',
          username: opponentParticipant.user?.username || 'opponent',
          isConnected: true,
          status: opponentParticipant.status,
          attempts: opponentParticipant.attempts,
          testsPassed: opponentParticipant.tests_passed,
          totalTests: opponentParticipant.total_tests,
          timeSpent: opponentParticipant.completion_time || 0,
          lastActivity: new Date(opponentParticipant.last_activity).toLocaleString(),
          isBot: false
        });
      }
    }
  };

  // Load demo challenge for preview
  const loadDemoChallenge = async () => {
    try {
      const challengeResult = await challengeService.getRandomChallenge();
      if (challengeResult.success) {
        setChallenge(challengeResult.data);
        setUserStats(prev => ({ ...prev, totalTests: challengeResult.data.test_cases?.length || 5 }));
        setCode(challengeResult.data.solution_template || '');
        
        // Set demo opponent
        setOpponent({
          id: 'demo_opponent',
          name: 'Demo Opponent',
          username: 'demo_user',
          isConnected: true,
          status: 'coding',
          attempts: 1,
          testsPassed: 2,
          totalTests: challengeResult.data.test_cases?.length || 5,
          timeSpent: 300,
          lastActivity: 'Writing solution...',
          isBot: true
        });

        setCompetitionStatus({
          isActive: true,
          timeRemaining: 847,
          winner: null,
          finalTime: null
        });
      }
    } catch (err) {
      setError('Failed to load demo challenge');
    }
  };

  // Set up real-time room subscription
  const setupRoomSubscription = (roomId) => {
    const channel = roomService.subscribeToRoom(roomId, async (payload) => {
      // Handle real-time updates
      if (payload.table === 'rooms') {
        setRoomData(prev => ({ ...prev, ...payload.new }));
        updateCompetitionStatus({ ...roomData, ...payload.new });
      } else if (payload.table === 'room_participants') {
        // Refresh room data to get updated participants
        const roomResult = await roomService.getRoomDetails(roomId);
        if (roomResult.success) {
          setRoomData(roomResult.data);
          setupOpponentData(roomResult.data);
        }
      }
    });

    setRoomChannel(channel);
  };

  // Timer countdown effect
  useEffect(() => {
    if (competitionStatus.isActive && competitionStatus.timeRemaining > 0) {
      const timer = setInterval(() => {
        setCompetitionStatus(prev => ({
          ...prev,
          timeRemaining: Math.max(0, prev.timeRemaining - 1)
        }));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [competitionStatus.isActive, competitionStatus.timeRemaining]);

  // Update demo bot progress periodically
  useEffect(() => {
    if (roomData?.use_demo_bot && roomData?.id && competitionStatus.isActive) {
      const updateBotProgress = async () => {
        const botProgress = await roomService.getDemoBotProgress(roomData.id);
        if (botProgress.success) {
          setOpponent(prev => ({ ...prev, ...botProgress.data }));
        }
      };

      // Update every 30 seconds
      const interval = setInterval(updateBotProgress, 30000);
      return () => clearInterval(interval);
    }
  }, [roomData?.use_demo_bot, roomData?.id, competitionStatus.isActive]);

  // Start battle when room is full and you are the host
  useEffect(() => {
    if (
      roomData &&
      roomData.status === 'waiting' &&
      roomData.participants?.length === roomData.max_participants &&
      user?.id === roomData.host_id
    ) {
      // Host should start the battle
      const start = async () => {
        // Pick a challenge if not already assigned
        let challengeId = roomData.challenge_id;
        if (!challengeId) {
          const challengeResult = await challengeService.getRandomChallenge();
          if (challengeResult.success) {
            challengeId = challengeResult.data.id;
          }
        }
        await roomService.startBattle(roomData.id, challengeId);
      };
      start();
    }
  }, [roomData, user]);

  // React to room status changes to load challenge
  useEffect(() => {
    if (roomData && roomData.status === 'active') {
      setupRoomChallenge(roomData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomData?.status]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (roomChannel) {
        roomService.unsubscribeFromRoom(roomChannel);
      }
    };
  }, [roomChannel]);

  const handleCodeSubmission = async () => {
    if (!code.trim() || !challenge) return;

    setIsSubmitting(true);
    
    try {
      // Execute code against challenge test cases
      const executionResult = await challengeService.executeCode(challenge.id, code);
      
      if (executionResult.success) {
        const results = executionResult.data;
        setExecutionResults(results);
        
        // Update user stats
        setUserStats(prev => ({
          ...prev,
          attempts: prev.attempts + 1,
          testsPassed: results.totalPassed,
          accuracy: Math.round((results.totalPassed / results.totalTests) * 100),
          codeLines: code.split('\n').length,
          lastSubmission: {
            success: results.success,
            time: 'Just now'
          }
        }));

        // Update room participant progress if in a real room
        if (roomData) {
          await roomService.updateParticipantProgress(roomData.id, {
            current_code: code,
            attempts: userStats.attempts + 1,
            tests_passed: results.totalPassed,
            total_tests: results.totalTests,
            accuracy: Math.round((results.totalPassed / results.totalTests) * 100),
            status: results.success ? 'completed' : 'coding'
          });

          // Submit code
          await challengeService.submitCode(roomData.id, challenge.id, code, results);

          // Check for victory
          if (results.success) {
            setCompetitionStatus(prev => ({
              ...prev,
              winner: user?.id,
              finalTime: 900 - prev.timeRemaining,
              isActive: false
            }));

            // Update room as completed
            await roomService.completeBattle(roomData.id, user?.id);
          }
        } else {
          // Demo mode victory
          if (results.success) {
            setCompetitionStatus(prev => ({
              ...prev,
              winner: 'user',
              finalTime: 900 - prev.timeRemaining,
              isActive: false
            }));
          }
        }
      } else {
        setExecutionResults({
          success: false,
          error: executionResult.error,
          testCases: [],
          executionTime: 0
        });
      }
    } catch (error) {
      setExecutionResults({
        success: false,
        error: 'Failed to execute code. Please try again.',
        testCases: [],
        executionTime: 0
      });
      console.log('Code execution error:', error);
    }

    setIsSubmitting(false);
  };

  const handleRestartRequest = () => {
    navigate('/');
  };

  const handleFileUpload = (fileContent) => {
    setCode(fileContent);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading battle...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-error mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="text-primary hover:underline"
            >
              Return to Rooms
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-16 h-screen flex flex-col">
        {/* Room Info Banner */}
        {roomData && (
          <div className="bg-surface/50 border-b border-border px-4 py-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className="text-muted-foreground">Room:</span>
                <span className="font-mono font-bold text-foreground">{roomData.room_code}</span>
                {roomData.use_demo_bot && (
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                    Practice Mode
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${
                  roomData.status === 'active' ? 'text-green-500' :
                  roomData.status === 'waiting' ? 'text-yellow-500' : 'text-gray-500'
                }`}>
                  {roomData.status.charAt(0).toUpperCase() + roomData.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        )}
        {roomData && roomData.status === 'waiting' && (
          <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-center">
            <span className="font-mono font-bold">Room Code: {roomData.room_code}</span>
            <span className="ml-4 text-muted-foreground">Share this code with your opponent to join!</span>
          </div>
        )}

        {/* Mobile Competition Status Bar */}
        <div className="lg:hidden p-4 border-b border-border bg-card">
          <CompetitionStatus
            competitionStatus={competitionStatus}
            userStats={userStats}
            onRestartRequest={handleRestartRequest}
          />
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Coding Area */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Panel - Code Editor */}
            <div className="flex-1 flex flex-col p-4 min-w-0">
              {/* Desktop Competition Status */}
              <div className="hidden lg:block mb-4">
                <CompetitionStatus
                  competitionStatus={competitionStatus}
                  userStats={userStats}
                  onRestartRequest={handleRestartRequest}
                />
              </div>

              {/* Code Editor */}
              <div className="flex-1 min-h-0">
                <CodeEditor
                  code={code}
                  onCodeChange={setCode}
                  onSubmit={handleCodeSubmission}
                  isSubmitting={isSubmitting}
                  executionResults={executionResults}
                  onFileUpload={handleFileUpload}
                />
              </div>
            </div>

            {/* Right Panel - Opponent Progress (Desktop) */}
            <div className="hidden lg:block w-80 p-4 border-l border-border bg-surface/30">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  Opponent Status
                </h2>
                {opponent ? (
                  <OpponentProgress
                    opponent={opponent}
                    competitionStatus={competitionStatus}
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>Waiting for opponent...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Challenge Panel */}
          {challenge && roomData?.status === 'active' && (
            <ChallengePanel
              isVisible={challengePanelVisible}
              onToggle={() => setChallengePanelVisible(!challengePanelVisible)}
              challenge={challenge}
            />
          )}
        </div>

        {/* Mobile Opponent Progress */}
        <div className="lg:hidden p-4 border-t border-border bg-surface/30">
          {opponent ? (
            <OpponentProgress
              opponent={opponent}
              competitionStatus={competitionStatus}
            />
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <p>Waiting for opponent...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveCodingBattle;