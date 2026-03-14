import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { RedisCacheService } from '../common/cache/redis-cache.service';

const COLLECTION = 'users';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly cache: RedisCacheService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const createdUser = new this.userModel(createUserDto);
      const result = await createdUser.save();
      await this.cache.invalidateCollection(COLLECTION);
      return result;
    } catch (error) {
      // Captura la race condition de escrituras concurrentes (duplicate key MongoDB)
      if (error.code === 11000) {
        throw new ConflictException('El usuario con este email ya existe');
      }
      throw error;
    }
  }

  async findAll(limit?: number): Promise<User[]> {
    const cap = Math.min(limit ?? 100_000, 100_000);
    const key = `${COLLECTION}:all:${cap}`;
    return this.cache.getOrSet(
      key,
      () => this.userModel.find().select('-password').sort({ createdAt: -1 }).limit(cap).exec(),
      COLLECTION,
    );
  }

  async findOne(id: string): Promise<User> {
    const key = `${COLLECTION}:one:${id}`;
    return this.cache.getOrSet(
      key,
      async () => {
        const user = await this.userModel.findById(id).select('-password').exec();
        if (!user) throw new NotFoundException(`User with ID ${id} not found`);
        return user;
      },
      COLLECTION,
    );
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (user && await user.comparePassword(password)) {
      const { password: _, ...result } = user.toObject();
      return result as User;
    }
    return null;
  }
}
