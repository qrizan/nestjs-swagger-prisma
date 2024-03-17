import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class BookmarkService {
  constructor(private prisma: PrismaService) {}

  async toggleBookmark(userId: string, gameId: string) {
    gameId = sanitizeHtml(gameId).trim();

    const checkBookmarkExists = await this.prisma.boorkmarksOnUsers.findFirst({
      where: {
        userId: userId,
        gameId: gameId,
      },
    });

    let bookmarkGame;

    if (checkBookmarkExists) {
      await this.prisma.boorkmarksOnUsers.delete({
        where: {
          id: checkBookmarkExists.id,
        },
      });

      bookmarkGame = 'Succesfully delete';
    } else {
      await this.prisma.boorkmarksOnUsers.create({
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
