import Room from '../models/Room';
import { CreateRoomDto } from '../types';

class RoomService {
  public async createRoom(roomData: CreateRoomDto, ownerId: string) {
    const room = new Room({
      ...roomData,
      owner: ownerId,
      members: [ownerId],
    });

    await room.save();
    await room.populate('owner', 'username firstName lastName avatar');
    await room.populate('members', 'username firstName lastName avatar');

    return room;
  }

  public async getRoomById(roomId: string) {
    const room = await Room.findById(roomId)
      .populate('owner', 'username firstName lastName avatar')
      .populate('members', 'username firstName lastName avatar');

    if (!room) {
      throw new Error('Room not found');
    }

    return room;
  }

  public async getUserRooms(userId: string) {
    const rooms = await Room.find({ members: userId })
      .populate('owner', 'username firstName lastName avatar')
      .populate('members', 'username firstName lastName avatar')
      .sort({ updatedAt: -1 });

    return rooms;
  }

  public async joinRoom(roomId: string, userId: string) {
    const room = await Room.findById(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.members.includes(userId)) {
      throw new Error('User is already a member of this room');
    }

    room.members.push(userId);
    await room.save();

    await room.populate('owner', 'username firstName lastName avatar');
    await room.populate('members', 'username firstName lastName avatar');

    return room;
  }

  public async leaveRoom(roomId: string, userId: string) {
    const room = await Room.findById(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.owner.toString() === userId) {
      throw new Error('Room owner cannot leave the room');
    }

    if (!room.members.includes(userId)) {
      throw new Error('User is not a member of this room');
    }

    room.members = room.members.filter(memberId => memberId.toString() !== userId);
    await room.save();

    return { message: 'Left room successfully' };
  }

  public async getRoomMembers(roomId: string) {
    const room = await Room.findById(roomId)
      .populate('members', 'username firstName lastName avatar isOnline lastSeen');

    if (!room) {
      throw new Error('Room not found');
    }

    return room.members;
  }

  public async updateRoom(roomId: string, updateData: Partial<CreateRoomDto>, userId: string) {
    const room = await Room.findById(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.owner.toString() !== userId) {
      throw new Error('Only room owner can update the room');
    }

    Object.assign(room, updateData);
    await room.save();

    await room.populate('owner', 'username firstName lastName avatar');
    await room.populate('members', 'username firstName lastName avatar');

    return room;
  }

  public async deleteRoom(roomId: string, userId: string) {
    const room = await Room.findById(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.owner.toString() !== userId) {
      throw new Error('Only room owner can delete the room');
    }

    await Room.findByIdAndDelete(roomId);

    return { message: 'Room deleted successfully' };
  }

  public async searchRooms(query: string, _userId: string) {
    const rooms = await Room.find({
      $and: [
        { isPrivate: false },
        { name: { $regex: query, $options: 'i' } }
      ]
    })
    .populate('owner', 'username firstName lastName avatar')
    .populate('members', 'username firstName lastName avatar')
    .limit(20);

    return rooms;
  }
}

export default new RoomService();
