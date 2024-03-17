import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const getUsers = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      take: 5,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const getUsersCount = await this.prisma.user.count({
      where: {
        deletedAt: null,
      },
    });
    const getGamesCount = await this.prisma.game.count({
      where: {
        deletedAt: null,
      },
    });
    const getBookmarksCount = await this.prisma.boorkmarksOnUsers.count();
    const getGenresCount = await this.prisma.genre.count({
      where: {
        deletedAt: null,
      },
    });

    const getGamesBookmarked = await this.prisma.game.findMany({
      where: {
        deletedAt: null,
      },
      take: 10,
      include: {
        _count: {
          select: {
            bookmarkedBy: true,
          },
        },
      },
      orderBy: {
        bookmarkedBy: {
          _count: 'desc',
        },
      },
    });

    const bookmarkedTopTen = getGamesBookmarked.map(function (item) {
      return {
        title: item.title,
        count: item._count.bookmarkedBy,
      };
    });

    return {
      users: getUsersCount,
      games: getGamesCount,
      categories: getGenresCount,
      bookmarks: getBookmarksCount,
      latestUser: getUsers,
      gamesBookmarked: bookmarkedTopTen,
    };
  }
}
