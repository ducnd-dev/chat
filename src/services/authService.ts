import jwt from 'jsonwebtoken';
import User from '../models/User';
import { CreateUserDto, LoginDto, AuthPayload } from '../types';

class AuthService {
  private generateToken(payload: AuthPayload): string {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn } as any);
  }

  public async register(userData: CreateUserDto) {
    const existingUser = await User.findOne({
      $or: [
        { email: userData.email },
        { username: userData.username }
      ]
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }    const user = new User(userData);
    await user.save();

    const tokenPayload: AuthPayload = {
      userId: (user._id as any).toString(),
      username: user.username,
      email: user.email,
    };

    const token = this.generateToken(tokenPayload);

    return {
      user: user.toJSON(),
      token,
    };
  }

  public async login(loginData: LoginDto) {
    const user = await User.findOne({ email: loginData.email });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await user.comparePassword(loginData.password);
    
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const tokenPayload: AuthPayload = {
      userId: (user._id as any).toString(),
      username: user.username,
      email: user.email,
    };

    const token = this.generateToken(tokenPayload);

    return {
      user: user.toJSON(),
      token,
    };
  }

  public async logout(userId: string) {
    const user = await User.findById(userId);
    
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }

    return { message: 'Logged out successfully' };
  }

  public async getUserProfile(userId: string) {
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  public async updateUserProfile(userId: string, updateData: Partial<CreateUserDto>) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await User.findOne({ username: updateData.username });
      if (existingUser) {
        throw new Error('Username already exists');
      }
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ email: updateData.email });
      if (existingUser) {
        throw new Error('Email already exists');
      }
    }

    Object.assign(user, updateData);
    await user.save();

    return user.toJSON();
  }

  public async searchUsers(query: string, currentUserId: string) {
    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } },
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } },
          ]
        }
      ]
    })
    .select('-password')
    .limit(20);

    return users;
  }
}

export default new AuthService();
