## Games Catalog API

#### users diagram

![administrator](screenshots/administrator.png
)
![user](screenshots/user.png
)
![public](screenshots/public.png
)

### setup

#### install dependencies
> $ cd nestjs-swagger-prisma

> $ pnpm install

#### JWT configuration
- generat secret key
> $ openssl rand -base64 32
- jwt config file
> src/utils/jwt.config.ts
```
export const jwtConfig = {
  secret: '<JWT_SECRET_KEY>'
};
```

#### database configuration
> cp .env.example .env

- example 

```
DATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"
```

#### database generate and migration
> $ pnpm prisma generate

> $ pnpm prisma migrate dev --name init

#### database seeder
- example data
> prisma/seed.ts

- running seed
> $ npx prisma db seed

#### running application
> $ pnpm run start:dev

#### database interface

- open prisma studio
> $ npx prisma studio

```
check URL: http://localhost:5555/
```

![prisma-studio](screenshots/prisma-studio.png
)


#### API documentation
```
check URL: http://localhost:3000/openapi#/
```
![api-documentation](screenshots/api-documentation.png
)

#### code documentation
- generate documentation
> $ npx @compodoc/compodoc -p tsconfig.json -s

```
check URL: http://127.0.0.1:8080 
```

![code-documentation](screenshots/code-documentation.png
)
