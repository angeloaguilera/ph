// backend/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { APP_GUARD } from '@nestjs/core';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import GraphQLJSON from 'graphql-type-json';
import { Request } from 'express';

// Módulos propios
import { DatabaseModule } from './database/database.module';
import { FinanceModule } from './finance/finance.module';

// Guards
import { ApiKeyGuard } from './auth/api-key.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    DatabaseModule,

    FinanceModule,

    // GraphQL con Apollo v4 + NestJS v10 + Express 5
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,

      // Code-first: genera schema desde decoradores
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,

      // --- Registro correcto del scalar JSON para code-first ---
      // En mode "code-first" hay que mapear el tipo (por ejemplo Object) al scalar.
      // buildSchemaOptions es pasado a la construcción del schema de type-graphql.
      buildSchemaOptions: {
        // scalarsMap: cada elemento mapea un "type" TS a un scalar GraphQL
        scalarsMap: [
          // Mapea el tipo TS `Object` (o `any`) al scalar GraphQLJSON
          { type: Object, scalar: GraphQLJSON },
        ],
      },

      // playground deshabilitado en prod; introspection activada por si la necesitas
      playground: false,
      introspection: true,

      // context para resolver headers, auth, etc.
      context: ({ req }: { req: Request }) => ({ req }),
    }),
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
