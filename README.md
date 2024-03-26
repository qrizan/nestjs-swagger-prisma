## Games Catalog API

#### built with

| Tools  |  |
| :--- | :--- |
| Nest JS  | https://nestjs.com  |
| Prisma ORM | https://www.prisma.io  |
| Swagger | https://swagger.io |
| Compodoc | https://compodoc.app |
| etc |  |

#### users diagram

![administrator](screenshots/administrator.png
)
![user](screenshots/user.png
)
![public](screenshots/public.png
)

#### example of use

- administrator

https://github.com/qrizan/react-shadcn-redux

### setup

#### install dependencies
```
cd nestjs-swagger-prisma
pnpm install
```

#### JWT configuration
- generate secret key
```
openssl rand -base64 32
```
- jwt config file
> src/utils/jwt.config.ts
```
export const jwtConfig = {
  secret: '<JWT_SECRET_KEY>'
};
```

#### database configuration
```
copy .env.example .env
```
example 

```
DATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"
```

#### database generate and migration
```
pnpm prisma generate
pnpm prisma migrate dev --name init
```

#### database seeder
- example data
> prisma/seed.ts

- running seed
```
npx prisma db seed
```

#### running application
```
pnpm start:dev
```
> check URL: http://localhost:3000
#### database interface

- open prisma studio
```
npx prisma studio
```

> check URL: http://localhost:5555/

![prisma-studio](screenshots/prisma-studio.png
)


#### API documentation

> check URL: http://localhost:3000/openapi#/

![api-documentation](screenshots/api-documentation.png
)

#### code documentation
- generate documentation
```
npx @compodoc/compodoc -p tsconfig.json -s
```

> check URL: http://127.0.0.1:8080 


![code-documentation](screenshots/code-documentation.png
)
