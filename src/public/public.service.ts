import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async getAllGames(cursor: string, keyword: string) {
    const LIMIT = 10;
    let cursorOptions: Prisma.GameWhereInput | undefined = undefined;

    if (cursor && cursor != 'undefined') {
      cursor = cursor.trim();
      cursorOptions = {
        createdAt: { lt: new Date(cursor) },
      };
    }

    const getDataAllGames = await this.prisma.game.findMany({
      take: LIMIT + 1,
      where: {
        title: {
          contains: keyword,
          mode: 'insensitive',
        },
        deletedAt: null,
        ...cursorOptions,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        genre: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let nextCursor = null;
    if (getDataAllGames.length > LIMIT) {
      nextCursor = getDataAllGames[LIMIT - 1].createdAt.toISOString();
      getDataAllGames.pop();
    }

    return {
      statusCode: HttpStatus.OK,
      data: getDataAllGames,
      nextCursor: nextCursor,
    };
  }

  async getGenreBySlug(slug: string, cursor: string) {
    slug = slug.trim();
    const LIMIT = 10;

    let cursorOptions: Prisma.GameWhereInput | undefined = undefined;

    if (cursor && cursor != 'undefined') {
      cursor = cursor.trim();
      cursorOptions = {
        createdAt: { lt: new Date(cursor) },
      };
    }

    const getDataGenres = await this.prisma.genre.findMany({
      where: {
        slug: slug,
        deletedAt: null,
        game: {
          some: {
            ...cursorOptions,
          },
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        game: {
          take: LIMIT + 1,
          select: {
            id: true,
            title: true,
            slug: true,
            imageUrl: true,
            createdAt: true,
            genre: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          where: {
            ...cursorOptions,
          },
        },
      },
    });

    let nextCursor = null;
    if (getDataGenres[0].game.length > LIMIT) {
      const lastGame = getDataGenres[getDataGenres.length - 1].game[LIMIT - 1];
      nextCursor = lastGame.createdAt.toISOString();
      getDataGenres[0].game.pop();
    }

    return {
      statusCode: HttpStatus.OK,
      data: getDataGenres,
      nextCursor: nextCursor,
    };
  }

  async getGameBySlug(slug: string) {
    slug = slug.trim();

    const getDataGameBySlug = await this.prisma.game.findFirst({
      where: {
        slug: slug,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        imageUrl: true,
        releaseDate: true,
        genre: {
          select: {
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            bookmarkedBy: true,
          },
        },
        bookmarkedBy: {
          take: 10,
          select: {
            user: {
              select: {
                username: true,
                avatar: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!getDataGameBySlug) {
      throw new NotFoundException();
    }

    return {
      statusCode: HttpStatus.OK,
      data: getDataGameBySlug,
    };
  }
}
