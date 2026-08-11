import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import slugify from 'slugify';
import { hash } from 'bcrypt';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readFile } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient({
  log: ['error'],
});

const AVATAR_DIR = join(__dirname, '..', 'public', 'uploads', 'avatar');
const AVATAR_FILES = [
  'default.png',
  ...Array.from({ length: 15 }, (_, index) => `pravatar-${index + 1}.jpeg`),
];

const S3_ENV = [
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
];

/**
 * Seed jalan dari host, jadi endpoint S3 harus di-publish ke loopback lebih dulu
 * oleh stack Compose. Kunci objek sengaja memakai nama berkas aslinya supaya
 * baris pengguna bisa menunjuknya tanpa menunggu hasil unggahan.
 */
async function uploadAvatars() {
  const missing = S3_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });

  for (const file of AVATAR_FILES) {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `avatar/${file}`,
        Body: await readFile(join(AVATAR_DIR, file)),
        ContentType: file.endsWith('.png') ? 'image/png' : 'image/jpeg',
      }),
    );
  }

  console.info(`> upload ${AVATAR_FILES.length} avatar`);
}

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
  const NUMBER_OF_GAMES = 100;
  const NUMBER_OF_USERS = 500;
  const NUMBER_OF_CATEGORIES = 5;

  try {
    // delete all dataset
    await prisma.genre.deleteMany();
    await prisma.bookmarksOnUsers.deleteMany();
    await prisma.game.deleteMany();
    await prisma.user.deleteMany();

    await uploadAvatars();

    /* ADMINISTRATOR */
    // create administrator user
    const createAdministrator = await prisma.user.create({
      data: {
        username: 'administrator',
        password: PASSWORD,
        email: 'admin@example.com',
        avatar: 'avatar/default.png',
        role: 'ADMINISTRATOR',
      },
    });
    console.info('> create administrator');
    console.table(createAdministrator);

    /* GENRE */
    // generate data dummy for genres
    const dataGenres = () => {
      const name = faker.word.noun();
      return {
        name: capitalizeWords(name),
        slug: slugify(name, { lower: true }),
        createdAt: faker.date.between({
          from: '2023-01-01T00:00:00.000Z',
          to: new Date(),
        }),
      };
    };

    const dataGenresDummy: any[] = faker.helpers.multiple(dataGenres, {
      count: NUMBER_OF_CATEGORIES,
    });

    // create data genres
    const createGenres = await prisma.genre.createMany({
      data: dataGenresDummy,
      skipDuplicates: true,
    });

    console.info('> create genres');
    console.table(createGenres);

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
        content: faker.lorem.paragraphs(5, '\n\n'),
        imageUrl: faker.image.url(),
        genreId: genreIds[Math.floor(Math.random() * genreIds.length)], // random genre id
        releaseDate: faker.date.past(),
        userId: adminResult.id, // administrator userId
        createdAt: faker.date.between({
          from: '2023-01-01T00:00:00.000Z',
          to: new Date(),
        }),
      };
    };

    const dataGamesDummy: any[] = faker.helpers.multiple(dataGames, {
      count: NUMBER_OF_GAMES,
    });

    const createGames = await prisma.game.createMany({
      data: dataGamesDummy,
      skipDuplicates: true,
    });

    console.info('> create games');
    console.table(createGames);

    /* USER */
    // generate data dummy for users
    const dataUsers = () => {
      return {
        username: faker.person.firstName(),
        email: faker.internet.email(),
        avatar: `avatar/pravatar-${1 + Math.floor(Math.random() * 15)}.jpeg`,
        password: PASSWORD,
        createdAt: faker.date.between({
          from: '2023-01-01T00:00:00.000Z',
          to: new Date(),
        }),
      };
    };

    const dataUsersDummy: any[] = faker.helpers.multiple(dataUsers, {
      count: NUMBER_OF_USERS,
    });

    const createUsers = await prisma.user.createMany({
      data: dataUsersDummy,
      skipDuplicates: true,
    });

    console.info('> create users');
    console.table(createUsers);

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
        gameBookmark.push({
          gameId: game.id,
          userId: user.id,
          createdAt: faker.date.between({
            from: '2023-01-01T00:00:00.000Z',
            to: new Date(),
          }),
        });
      });
    });

    const createBookmarks = await prisma.bookmarksOnUsers.createMany({
      data: gameBookmark,
      skipDuplicates: true,
    });

    console.info('> create bookmarks');
    console.table(createBookmarks);

    console.log(`Database has been seeded. 🚀`);
  } catch (e) {
    throw e;
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
