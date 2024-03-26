import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async getAllGames() {
    const getDataAllGames = await this.prisma.game.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      statusCode: HttpStatus.OK,
      data: getDataAllGames,
    };
  }

  async getGenreBySlug(slug: string) {
    const getDataGenres = await this.prisma.genre.findMany({
      where: {
        slug: slug,
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        game: {
          select: {
            id: true,
            title: true,
            slug: true,
            imageUrl: true,
          },
        },
      },
    });

    return {
      statusCode: HttpStatus.OK,
      data: getDataGenres,
    };
  }

  async getGameBySlug(slug: string) {
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
