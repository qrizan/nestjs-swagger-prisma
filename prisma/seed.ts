import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import slugify from 'slugify';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const capitalizeWords = (str) => {
    const wordsArray = str.split(' ');
    const capitalizedWordsArray = wordsArray.map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1),
    );
    const capitalizedString = capitalizedWordsArray.join(' ');
    return capitalizedString;
  };

  const PASSWORD = await hash('Password123!', 12);
  const NUMBER_OF_GAMES = 30;
  const NUMBER_OF_USERS = 10;
  const GENRES = [
    {
      name: 'Action',
      slug: 'action',
    },
    {
      name: 'First-Person Shooter',
      slug: 'first-person-shooter',
    },
    {
      name: 'Third-Person Shooter',
      slug: 'third-person-shooter',
    },
  ];

  try {
    // delete all dataset
    await prisma.genre.deleteMany();
    await prisma.user.deleteMany();
    await prisma.game.deleteMany();
    await prisma.boorkmarksOnUsers.deleteMany();

    /* ADMINISTRATOR */
    // create administrator user
    await prisma.user.create({
      data: {
        username: 'administrator',
        password: PASSWORD,
        email: 'admin@example.com',
        role: 'ADMINISTRATOR',
      },
    });

    /* GENRE */

    // create data genres
    await prisma.genre.createMany({
      data: GENRES,
      skipDuplicates: true,
    });

    /* GAMES */
    // collect genre id
    const genresResult = await prisma.genre.findMany({
      select: {
        id: true,
      },
    });
    const genreIds = genresResult.map((item) => item.id);

    // get administrator data to identify userId
    const adminResult = await prisma.user.findFirst({
      where: {
        role: 'ADMINISTRATOR',
      },
    });

    // generate data dummy for games
    const dataGames = () => {
      const title = faker.lorem.words(5);
      return {
        title: capitalizeWords(title),
        slug: slugify(title, { lower: true }),
        content: faker.lorem.paragraphs(5, '<br/>'),
        imageUrl: faker.image.url(),
        genreId: genreIds[Math.floor(Math.random() * genreIds.length)], // random genre id
        releaseDate: faker.date.past(),
        userId: adminResult.id, // administrator userId
      };
    };

    const dataGamesDummy: any[] = faker.helpers.multiple(dataGames, {
      count: NUMBER_OF_GAMES,
    });

    await prisma.game.createMany({
      data: dataGamesDummy,
      skipDuplicates: true,
    });

    /* USER */
    // generate data dummy for users
    const dataUsers = () => {
      return {
        username: faker.person.firstName(),
        email: faker.internet.email(),
        avatar: '/uploads/avatar/default.png',
        password: PASSWORD,
      };
    };

    const dataUsersDummy: any[] = faker.helpers.multiple(dataUsers, {
      count: NUMBER_OF_USERS,
    });

    await prisma.user.createMany({
      data: dataUsersDummy,
      skipDuplicates: true,
    });

    /* BOOKMARK */

    // collect user ids
    const usersResult = await prisma.user.findMany({
      where: {
        role: 'USER',
      },
      select: {
        id: true,
      },
    });

    // collect game ids
    const gamesResult = await prisma.game.findMany({
      select: {
        id: true,
      },
    });

    // generate shuffle users for bookmarking purpose
    const getUsersRandom = (arr) => {
      const shuffled = [...arr].sort(() => 0.5 - Math.random());
      const randomNumber = Math.floor(Math.random() * usersResult.length);

      return shuffled.slice(0, randomNumber);
    };

    // generate bookmark data
    const gameBookmark = [];
    await gamesResult.map((game) => {
      getUsersRandom(usersResult).map((user) => {
        gameBookmark.push({ gameId: game.id, userId: user.id });
      });
    });

    await prisma.boorkmarksOnUsers.createMany({
      data: gameBookmark,
      skipDuplicates: true,
    });

    console.log(`Database has been seeded. 🚀`);
  } catch (e) {
    throw Error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });