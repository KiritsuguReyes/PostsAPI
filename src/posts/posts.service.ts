import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { RedisCacheService } from '../common/cache/redis-cache.service';

const COLLECTION = 'posts';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    private readonly cache: RedisCacheService,
  ) {}

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const createdPost = new this.postModel(createPostDto);
    const result = await createdPost.save();
    await this.cache.invalidateCollection(COLLECTION);
    return result;
  }

  async findAll(limit?: number): Promise<Post[]> {
    const cap = Math.min(limit ?? 100_000, 100_000);
    const key = `${COLLECTION}:all:${cap}`;
    return this.cache.getOrSet(
      key,
      () => this.postModel.find().sort({ createdAt: -1 }).limit(cap).exec(),
      COLLECTION,
    );
  }

  async getAllLimit(
    page: number = 1, 
    limit: number = 10, 
    search?: string,
    author?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const skip = (page - 1) * limit;
    
    // Construir filtro dinámico
    const filter: any = {};
    
    if (search) {
      // Usa el índice de texto compuesto (title + body) para rendimiento óptimo
      filter.$text = { $search: search };
    }
    
    if (author) {
      filter.author = { $regex: author, $options: 'i' };
    }
    
    // Configurar ordenamiento
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const key = `${COLLECTION}:paginated:${page}:${limit}:${search ?? ''}:${author ?? ''}:${sortBy}:${sortOrder}`;

    return this.cache.getOrSet(
      key,
      async () => {
        // Ejecutar consultas en paralelo para mejor performance
        const [data, total] = await Promise.all([
          this.postModel
            .find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('title body author createdAt updatedAt')
            .exec(),
          this.postModel.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
          data,
          pagination: {
            page,
            limit,
            total,
            pages: totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        };
      },
      COLLECTION,
    );
  }

  async findOne(id: string): Promise<Post> {
    const key = `${COLLECTION}:one:${id}`;
    return this.cache.getOrSet(
      key,
      async () => {
        const post = await this.postModel.findById(id).exec();
        if (!post) throw new NotFoundException(`Post with ID ${id} not found`);
        return post;
      },
      COLLECTION,
    );
  }

  async update(id: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const updatedPost = await this.postModel
      .findByIdAndUpdate(id, updatePostDto, { new: true, runValidators: true })
      .exec();

    if (!updatedPost) throw new NotFoundException(`Post with ID ${id} not found`);
    await this.cache.invalidateCollection(COLLECTION);
    return updatedPost;
  }

  async remove(id: string): Promise<void> {
    const result = await this.postModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Post with ID ${id} not found`);
    await this.cache.invalidateCollection(COLLECTION);
  }

  async createBulk(createPostDtos: CreatePostDto[]): Promise<Post[]> {
    try {
      const result = await this.postModel.insertMany(createPostDtos);
      await this.cache.invalidateCollection(COLLECTION);
      return result;
    } catch (error) {
      throw new BadRequestException('Error creating bulk posts: ' + error.message);
    }
  }
}
