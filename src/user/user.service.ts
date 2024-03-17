import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUsers(page: number, keyword: string) {
    const limit = 5;
    const offset = Number(page ? (page - 1) * limit : 0);

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        skip: offset,
        take: limit,
        where: {
          username: {
            contains: keyword,
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

    page = Number(page ? page : 1);
    return {
      statusCode: HttpStatus.OK,
      data: { page, limit, total, users },
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
