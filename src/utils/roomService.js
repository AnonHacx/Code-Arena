import supabase from './supabase';

class RoomService {
  // Create a new room
  async createRoom(challengeId = null, useDemoBot = false) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Generate room code using the database function
      const { data: roomCode, error: codeError } = await supabase.rpc('generate_room_code');
      
      if (codeError) {
        return { success: false, error: `Failed to generate room code: ${codeError.message}` };
      }

      if (!roomCode) {
        return { success: false, error: 'Failed to generate room code' };
      }

      // Get demo bot if requested
      let demoBotId = null;
      if (useDemoBot) {
        const { data: botId, error: botError } = await supabase.rpc('get_available_demo_bot');
        if (botError) {
          // Log but don't fail room creation console.log('Failed to get demo bot:', botError.message);
        } else {
          demoBotId = botId;
        }
      }

      // Create room with proper data types
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({
          room_code: roomCode,
          host_id: user.id,
          challenge_id: challengeId,
          use_demo_bot: useDemoBot,
          demo_bot_id: demoBotId
          // Do NOT set current_participants here!
        })
        .select()
        .single();

      if (roomError) {
        return { success: false, error: `Failed to create room: ${roomError.message}` };
      }

      // Add host as participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomData.id, // UUID
          user_id: user.id, // UUID
          is_host: true
        });

      if (participantError) {
        // Clean up room if participant insertion fails
        await supabase.from('rooms').delete().eq('id', roomData.id);
        return { success: false, error: `Failed to add host as participant: ${participantError.message}` };
      }

      // If using demo bot, add bot as participant
      if (useDemoBot && demoBotId) {
        const { error: botParticipantError } = await supabase
          .from('room_participants')
          .insert({
            room_id: roomData.id,
            user_id: demoBotId, // Demo bot ID as user
            is_host: false,
            status: 'coding' // Demo bot starts coding
          });

        if (botParticipantError) {
          console.log('Failed to add demo bot as participant:', botParticipantError.message);
          // Don't fail the room creation, just log the error
        }
      }

      return { success: true, data: roomData };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return {
          success: false,
          error: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.'
        };
      }
      return { success: false, error: `Failed to create room: ${error.message}` };
    }
  }

  // Join an existing room
  async joinRoom(roomCode) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Ensure room code is properly formatted (6 characters, uppercase)
      const formattedRoomCode = roomCode.toUpperCase().trim();
      if (formattedRoomCode.length !== 6) {
        return { success: false, error: 'Room code must be 6 characters long' };
      }

      // Find room by code
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', formattedRoomCode)
        .eq('status', 'waiting')
        .single();

      if (roomError) {
        if (roomError.code === 'PGRST116') {
          return { success: false, error: 'Room not found or already started' };
        }
        return { success: false, error: roomError.message };
      }

      // Check if user is already in room
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomData.id)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        return { success: false, error: 'You are already in this room' };
      }

      // Check if room is full (accounting for demo bot)
      const actualMaxParticipants = roomData.use_demo_bot ? roomData.max_participants : roomData.max_participants;
      if (roomData.current_participants >= actualMaxParticipants) {
        return { success: false, error: 'Room is full' };
      }

      // Add user as participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomData.id,
          user_id: user.id,
          is_host: false
        });

      if (participantError) {
        return { success: false, error: participantError.message };
      }

      return { success: true, data: roomData };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return {
          success: false,
          error: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.'
        };
      }
      return { success: false, error: 'Failed to join room' };
    }
  }

  // Get room details with participants
  async getRoomDetails(roomId) {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          challenge:challenges(*),
          participants:room_participants(
            *,
            user:user_profiles(id, username, full_name, avatar_url, rating)
          ),
          demo_bot:demo_bots(*)
        `)
        .eq('id', roomId)
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
      return { success: false, error: 'Failed to get room details' };
    }
  }

  // Get demo bot progress simulation
  async getDemoBotProgress(roomId) {
    try {
      const { data, error } = await supabase.rpc('simulate_demo_bot_progress', {
        room_uuid: roomId
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to get demo bot progress' };
    }
  }

  // Start battle in room
  async startBattle(roomId, challengeId) {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .update({
          status: 'active',
          challenge_id: challengeId,
          started_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to start battle' };
    }
  }

  // Update participant progress
  async updateParticipantProgress(roomId, updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('room_participants')
        .update({
          ...updates,
          last_activity: new Date().toISOString()
        })
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to update progress' };
    }
  }

  // Complete battle
  async completeBattle(roomId, winnerId) {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .update({
          status: 'completed',
          winner_id: winnerId,
          completed_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to complete battle' };
    }
  }

  // Subscribe to room changes
  subscribeToRoom(roomId, callback) {
    const channel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`
        },
        callback
      )
      .subscribe();

    return channel;
  }

  // Unsubscribe from room changes
  unsubscribeFromRoom(channel) {
    supabase.removeChannel(channel);
  }

  // Get recent rooms for user
  async getRecentRooms(userId, limit = 5) {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          rooms(
            id,
            room_code,
            status,
            created_at,
            completed_at,
            use_demo_bot,
            challenges(title, difficulty),
            winner:user_profiles(username)
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data?.map(item => item.room) || [] };
    } catch (error) {
      return { success: false, error: 'Failed to get recent rooms' };
    }
  }
}

export default new RoomService();