import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import slugify from 'slugify';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  async createGame(userId: string, data: CreateGameDto) {
    data.title = sanitizeHtml(data.title.trim());
    data.slug = slugify(data.title, { lower: true });
    data.content = sanitizeHtml(data.content);
    data.userId = userId;

    const checkGameExists = await this.prisma.game.findFirst({
      where: {
        title: data.title,
        deletedAt: null,
      },
    });

    if (checkGameExists) {
      throw new HttpException('Title already exist', HttpStatus.FOUND);
    }

    const createData = await this.prisma.game.create({
      data: data,
    });

    if (createData) {
      return {
        statusCode: HttpStatus.OK,
        message: 'Successfully create game',
      };
    }
  }

  async getGames(page: number, keyword: string) {
    const limit = 10;
    const offset = ((Number(page) || 1) - 1) * limit;

    const [total, games] = await this.prisma.$transaction([
      this.prisma.game.count({
        where: {
          title: {
            contains: keyword,
            mode: 'insensitive',
          },
          deletedAt: null,
        },
      }),
      this.prisma.game.findMany({
        skip: offset,
        take: limit,
        where: {
          title: {
            contains: keyword,
            mode: 'insensitive',
          },
          deletedAt: null,
        },
        select: {
          id: true,
          slug: true,
          title: true,
          imageUrl: true,
          genre: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              username: true,
            },
          },
          _count: {
            select: {
              bookmarkedBy: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    page = page && page > 0 ? Number(page) : 1;
    return {
      statusCode: HttpStatus.OK,
      data: games,
      pagination: { page, limit, total },
    };
  }

  async getGameById(id: string) {
    const getDataGameById = await this.prisma.game.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
    });

    if (!getDataGameById) {
      throw new NotFoundException();
    }

    return {
      statusCode: HttpStatus.OK,
      data: getDataGameById,
    };
  }

  async updateGameById(userId: string, id: string, data: UpdateGameDto) {
    data.title ? (data.title = sanitizeHtml(data.title).trim()) : null;
    data.slug ? (data.slug = slugify(data.title, { lower: true })) : null;
    data.content ? (data.content = sanitizeHtml(data.content)) : null;
    data.userId = userId;

    const checkGameExists = await this.prisma.game.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
    });

    if (checkGameExists) {
      const updateDataGameById = await this.prisma.game.update({
        data: data,
        where: {
          id: id,
        },
      });

      if (updateDataGameById) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Successfully update game',
        };
      }
    }

    throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
  }

  async deleteGameById(id: string) {
    const checkGameExists = await this.prisma.game.findFirst({
      where: {
        id: id,
      },
    });

    if (checkGameExists) {
      const deleteDataGameById = await this.prisma.game.update({
        data: { deletedAt: new Date() },
        where: {
          id: id,
        },
      });

      if (deleteDataGameById) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Successfully delete game',
        };
      }
    }

    throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
  }
}
