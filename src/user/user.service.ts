import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUsers(page: number, keyword?: string) {
    const LIMIT = 10;
    const offset = ((Number(page) || 1) - 1) * LIMIT;

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({
        where: {
          username: {
            contains: keyword,
            mode: 'insensitive',
          },
          deletedAt: null,
        },
      }),
      this.prisma.user.findMany({
        skip: offset,
        take: LIMIT,
        where: {
          username: {
            contains: keyword,
            mode: 'insensitive',
          },
          deletedAt: null,
        },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          role: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
    ]);

    page = page && page > 0 ? Number(page) : 1;
    return {
      statusCode: HttpStatus.OK,
      data: users,
      pagination: { page, LIMIT, total },
    };
  }

  async getUserById(id: string) {
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
        role: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    return {
      statusCode: HttpStatus.OK,
      data: getDataUserById,
    };
  }
}
