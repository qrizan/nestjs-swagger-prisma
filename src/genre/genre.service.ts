import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import slugify from 'slugify';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class GenreService {
  constructor(private prisma: PrismaService) {}

  async createGenre(data: CreateGenreDto) {
    data.name = sanitizeHtml(data.name).trim();
    data.slug = slugify(data.name, { lower: true });

    const checkGenreExists = await this.prisma.genre.findFirst({
      where: {
        name: data.name,
        deletedAt: null,
      },
    });

    if (checkGenreExists) {
      throw new HttpException('Genre already exist', HttpStatus.FOUND);
    }

    const createData = await this.prisma.genre.create({
      data: data,
    });

    if (createData) {
      return {
        statusCode: HttpStatus.OK,
        message: 'Successfully create genre',
      };
    }
  }

  async getGenres(keyword: string) {
    const getDataAllGenres = await this.prisma.genre.findMany({
      where: {
        name: {
          contains: keyword,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });
    return {
      statusCode: HttpStatus.OK,
      data: getDataAllGenres,
    };
  }

  async deleteGenreById(id: number) {
    const checkGenreExists = await this.prisma.genre.findFirst({
      where: {
        id: Number(id),
        deletedAt: null,
      },
    });

    if (checkGenreExists) {
      const deleteDataGenreById = await this.prisma.genre.update({
        data: { deletedAt: new Date() },
        where: {
          id: Number(id),
        },
      });

      if (deleteDataGenreById) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Successfully delete genre',
        };
      }
    }

    throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
  }
}
