import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BookmarkService {
  constructor(private prisma: PrismaService) {}

  async toggleBookmark(userId: string, gameId: string) {
    gameId = gameId.trim();

    const checkUserExists = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!checkUserExists) {
      throw new UnauthorizedException();
    }

    const checkBookmarkExists = await this.prisma.bookmarksOnUsers.findFirst({
      where: {
        userId: userId,
        gameId: gameId,
      },
    });

    let bookmarkGame;

    if (checkBookmarkExists) {
      await this.prisma.bookmarksOnUsers.delete({
        where: {
          id: checkBookmarkExists.id,
        },
      });

      bookmarkGame = 'Succesfully delete';
    } else {
      await this.prisma.bookmarksOnUsers.create({
        data: {
          userId: userId,
          gameId: gameId,
        },
      });

      bookmarkGame = 'Succesfully added';
    }

    return {
      statusCode: HttpStatus.OK,
      message: bookmarkGame,
    };
  }
}
