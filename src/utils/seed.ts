import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Room from '../models/Room';
import Message from '../models/Message';

dotenv.config();

const sampleUsers = [
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Smith',
    avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=6C5CE7&color=fff',
  },
  {
    username: 'bob_wilson',
    email: 'bob@example.com',
    password: 'password123',
    firstName: 'Bob',
    lastName: 'Wilson',
    avatar: 'https://ui-avatars.com/api/?name=Bob+Wilson&background=A29BFE&color=fff',
  },
  {
    username: 'alice_brown',
    email: 'alice@example.com',
    password: 'password123',
    firstName: 'Alice',
    lastName: 'Brown',
    avatar: 'https://ui-avatars.com/api/?name=Alice+Brown&background=FD79A8&color=fff',
  },
];

const sampleRooms = [
  {
    name: 'General Discussion',
    description: 'A place for general conversations and discussions',
    isPrivate: false,
  },
  {
    name: 'Tech Talk',
    description: 'Discuss the latest in technology and programming',
    isPrivate: false,
  },
  {
    name: 'Random',
    description: 'Random conversations and off-topic discussions',
    isPrivate: false,
  },
  {
    name: 'Private Team',
    description: 'Private room for team discussions',
    isPrivate: true,
  },
];

const sampleMessages = [
  'Hello everyone! Welcome to our chat room.',
  'How is everyone doing today?',
  'Just finished working on a new project. Really excited about it!',
  'Does anyone have experience with TypeScript?',
  'The weather is beautiful today!',
  'What are your plans for the weekend?',
  'I just learned about a cool new JavaScript feature.',
  'Anyone interested in discussing the latest tech trends?',
  'Good morning! Hope everyone has a great day.',
  'Just wanted to say hi to everyone here.',
];

class Seeder {
  private async connectToDatabase(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatdb';
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB for seeding');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  private async clearDatabase(): Promise<void> {
    try {
      await Promise.all([
        Message.deleteMany({}),
        Room.deleteMany({}),
        User.deleteMany({}),
      ]);
      console.log('🧹 Cleared existing data');
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      throw error;
    }
  }

  private async seedUsers(): Promise<any[]> {
    try {
      const users = await User.insertMany(sampleUsers);
      console.log(`👥 Created ${users.length} users`);
      return users;
    } catch (error) {
      console.error('❌ Failed to seed users:', error);
      throw error;
    }
  }

  private async seedRooms(users: any[]): Promise<any[]> {
    try {
      const roomsWithOwners = sampleRooms.map((room, index) => ({
        ...room,
        owner: users[index % users.length]._id,
        members: users.slice(0, Math.ceil(users.length / 2)).map(user => user._id),
      }));

      const rooms = await Room.insertMany(roomsWithOwners);
      console.log(`🏠 Created ${rooms.length} rooms`);
      return rooms;
    } catch (error) {
      console.error('❌ Failed to seed rooms:', error);
      throw error;
    }
  }

  private async seedMessages(users: any[], rooms: any[]): Promise<void> {
    try {
      const messages = [];
      
      for (const room of rooms) {
        const numMessages = Math.floor(Math.random() * 10) + 5; // 5-15 messages per room
        
        for (let i = 0; i < numMessages; i++) {
          const randomUser = users[Math.floor(Math.random() * users.length)];
          const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
          
          messages.push({
            content: randomMessage,
            sender: randomUser._id,
            room: room._id,
            messageType: 'text',
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time within last week
          });
        }
      }

      await Message.insertMany(messages);
      console.log(`💬 Created ${messages.length} messages`);
    } catch (error) {
      console.error('❌ Failed to seed messages:', error);
      throw error;
    }
  }

  public async run(): Promise<void> {
    try {
      console.log('🌱 Starting database seeding...\n');
      
      await this.connectToDatabase();
      await this.clearDatabase();
      
      const users = await this.seedUsers();
      const rooms = await this.seedRooms(users);
      await this.seedMessages(users, rooms);
      
      console.log('\n✅ Database seeding completed successfully!');
      console.log('\n📊 Summary:');
      console.log(`   Users: ${users.length}`);
      console.log(`   Rooms: ${rooms.length}`);
      console.log(`   Messages: Created in all rooms`);
      
      console.log('\n🔐 Sample Login Credentials:');
      sampleUsers.forEach(user => {
        console.log(`   Email: ${user.email} | Password: ${user.password}`);
      });
      
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      await mongoose.connection.close();
      console.log('\n📤 Database connection closed');
    }
  }
}

if (require.main === module) {
  const seeder = new Seeder();
  seeder.run()
    .then(() => {
      console.log('\n🎉 Seeding process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seeding process failed:', error);
      process.exit(1);
    });
}

export default Seeder;
