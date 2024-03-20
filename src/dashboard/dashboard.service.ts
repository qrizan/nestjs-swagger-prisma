import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { monthShortNames } from 'src/utils/utils';

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
    const getBookmarksCount = await this.prisma.bookmarksOnUsers.count();
    const getGenresCount = await this.prisma.genre.count({
      where: {
        deletedAt: null,
      },
    });

    const getBookmarked = await this.prisma.$queryRaw(
      Prisma.sql`SELECT 
          date_trunc('month', gs.month) AS month,
          COALESCE(COUNT("BMO"."createdAt"), 0) AS count
      FROM 
          generate_series(
              date_trunc('month', CURRENT_DATE - INTERVAL '11 month'),
              date_trunc('month', CURRENT_DATE),
              INTERVAL '1 month'
          ) AS gs(month)
      LEFT JOIN 
          "BookmarksOnUsers" as "BMO"
      ON 
          date_trunc('month', "BMO"."createdAt") = gs.month
      GROUP BY 
          month
      ORDER BY 
          month;`,
    );

    const bookmarkedLastYear = Object.values(getBookmarked).map(
      function (item) {
        return {
          month: monthShortNames[item.month.getMonth()],
          count: parseInt(item.count.toString()), // handle BigInt
        };
      },
    );

    return {
      users: getUsersCount,
      games: getGamesCount,
      categories: getGenresCount,
      bookmarks: getBookmarksCount,
      latestUser: getUsers,
      gamesBookmarked: bookmarkedLastYear,
    };
  }
}
