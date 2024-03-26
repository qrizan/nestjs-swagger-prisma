import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from 'src/profile/dto/update-user.dto';
import * as sanitizeHtml from 'sanitize-html';
import { hash } from 'bcrypt';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getUserProfile(id: string) {
    const getDataUserById = await this.prisma.user.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        bookmarks: {
          select: {
            game: {
              select: {
                id: true,
                title: true,
                slug: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!getDataUserById) {
      throw new NotFoundException();
    }

    return {
      statusCode: HttpStatus.OK,
      data: getDataUserById,
    };
  }

  async updateUser(id: string, data: UpdateUserDto) {
    data.username ? (data.username = sanitizeHtml(data.username).trim()) : null;
    data.email ? (data.email = sanitizeHtml(data.email).trim()) : null;
    data.password
      ? (data.password = await hash(sanitizeHtml(data.password).trim(), 12))
      : null;

    const checkUserExists = await this.prisma.user.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
    });

    if (checkUserExists) {
      const updateDataUserById = await this.prisma.user.update({
        data: data,
        where: {
          id: id,
        },
      });

      if (updateDataUserById) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Successfully update profile',
        };
      }
    }

    throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
  }

  async deleteUser(id: string) {
    const checkUserExists = await this.prisma.user.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
    });

    if (checkUserExists) {
      const deleteDataUserById = await this.prisma.user.update({
        data: { deletedAt: new Date() },
        where: {
          id: id,
        },
      });

      if (deleteDataUserById) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Successfully deleted profile',
        };
      }
    }

    throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
  }

  async uploadAvatar(id: string, avatar) {
    const checkUserExists = await this.prisma.user.findFirst({
      where: {
        id: id,
      },
    });
    if (checkUserExists) {
      const updateAvatar = await this.prisma.user.update({
        data: {
          avatar: avatar,
        },
        where: {
          id: id,
        },
      });
      if (updateAvatar) {
        return {
          statusCode: 200,
          message: 'Successfully upload avatar',
        };
      }
    }
    throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
  }
}
