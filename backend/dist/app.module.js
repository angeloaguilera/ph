"use strict";
// backend/app.module.ts
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const graphql_1 = require("@nestjs/graphql");
const path_1 = require("path");
const core_1 = require("@nestjs/core");
const apollo_1 = require("@nestjs/apollo");
const graphql_type_json_1 = __importDefault(require("graphql-type-json"));
// Módulos propios
const database_module_1 = require("./database/database.module");
const finance_module_1 = require("./finance/finance.module");
// Guards
const api_key_guard_1 = require("./auth/api-key.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            database_module_1.DatabaseModule,
            finance_module_1.FinanceModule,
            // GraphQL con Apollo v4 + NestJS v10 + Express 5
            graphql_1.GraphQLModule.forRoot({
                driver: apollo_1.ApolloDriver,
                // Code-first: genera schema desde decoradores
                autoSchemaFile: (0, path_1.join)(process.cwd(), 'schema.gql'),
                sortSchema: true,
                // --- Registro correcto del scalar JSON para code-first ---
                // En mode "code-first" hay que mapear el tipo (por ejemplo Object) al scalar.
                // buildSchemaOptions es pasado a la construcción del schema de type-graphql.
                buildSchemaOptions: {
                    // scalarsMap: cada elemento mapea un "type" TS a un scalar GraphQL
                    scalarsMap: [
                        // Mapea el tipo TS `Object` (o `any`) al scalar GraphQLJSON
                        { type: Object, scalar: graphql_type_json_1.default },
                    ],
                },
                // playground deshabilitado en prod; introspection activada por si la necesitas
                playground: false,
                introspection: true,
                // context para resolver headers, auth, etc.
                context: ({ req }) => ({ req }),
            }),
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: api_key_guard_1.ApiKeyGuard,
            },
        ],
    })
], AppModule);
