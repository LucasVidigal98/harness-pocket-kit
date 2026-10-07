# Architecture reference

## Dependency direction

```text
HTTP / Messaging
       ↓
Presentation adapter → Application use case → Domain
                              ↓                 ↑
                         outbound port ← Infrastructure adapter
```

The application/domain define capabilities they need (ports); infrastructure implements those capabilities (adapters). Nest module wiring connects the port token to the implementation. The domain does not know NestJS, a database, a vendor SDK, HTTP, or provider tokens.

## Suggested feature layout

The exact folder names and aliases should follow the user's answers. A reasonable default is:

```text
src/
  app.module.ts
  main.ts
  shared/                         # only cross-cutting code used by multiple features
  modules/
    users/
      domain/
        entities/
        value-objects/
        errors/
        repositories/             # domain-owned outbound ports
      application/
        use-cases/
        ports/                    # other outbound capabilities, if needed
        dto/                      # application commands/results, not HTTP DTOs
      presentation/
        http/
          users.controller.ts
          dto/                    # request/response validation and transport types
      infrastructure/
        persistence/              # only if persistence is selected
          schemas/
          mappers/
          mongo-user.repository.ts # illustrative name; database is optional
        tokens.ts
      users.module.ts
```

A small feature may omit empty layers. Prefer feature-local adapters for feature-specific logic. Shared infrastructure may own reusable client/connection lifecycle while feature adapters own feature-specific queries and mapping.

## Port, adapter, and Nest binding

Domain contract (plain TypeScript, no decorators):

```ts
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
```

Define the token in a stable composition location, usually near the feature module or infrastructure wiring:

```ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
```

An application use case may receive the port via Nest injection:

```ts
@Injectable()
export class GetUser {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  execute(id: string): Promise<User | null> {
    return this.users.findById(id);
  }
}
```

If the project requires application classes to be entirely framework-free, keep the use case plain and provide a Nest factory/provider in the composition module. Choose one convention consistently.

Module binding:

```ts
@Module({
  providers: [
    GetUser,
    SelectedUserRepositoryAdapter,
    {
      provide: USER_REPOSITORY,
      useExisting: SelectedUserRepositoryAdapter,
    },
  ],
  exports: [GetUser],
})
export class UsersModule {}
```

Use `useExisting` when the adapter should be one instance; use `useClass` when duplicate instantiation is intended and safe. The concrete adapter is a placeholder for the user's chosen infrastructure, not a requirement to use a database.

## Alias configuration example

Example for a single-context project with a `src` root; adapt to the chosen directory scope and installed toolchain. In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@presentation/*": ["src/presentation/*"],
      "@shared/*": ["src/shared/*"]
    }
  }
}
```

If the chosen structure is `src/modules/users/...`, configure feature-scoped mappings such as `@users/domain/*` → `src/modules/users/domain/*`. A tsconfig `paths` mapping helps TypeScript resolve imports but may not rewrite emitted JavaScript imports. Configure the selected test runner and runtime/build resolver as needed, and verify actual execution. Avoid adding a runtime alias package until the app's execution path requires one.

## Infrastructure adapter pattern

For any selected external technology:

1. Define a port owned by domain/application describing the needed capability in business terms.
2. Implement that port in infrastructure using the selected library/client.
3. Map external representations to domain types at the adapter boundary.
4. Hide vendor types, client errors, query syntax, and lifecycle details from the core.
5. Bind the port token to the adapter in a Nest module.
6. Test core behavior with a fake port; test adapter mapping and external behavior separately where useful.

Example generic adapter shape:

```ts
@Injectable()
export class ExternalUserRepository implements UserRepository {
  constructor(private readonly client: SelectedDataClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.client.findUser(id);
    return record ? UserMapper.toDomain(record) : null;
  }

  async save(user: User): Promise<void> {
    await this.client.saveUser(UserMapper.toExternal(user));
  }
}
```

This is illustrative pseudocode; generate concrete adapters only after the user chooses an actual integration. Keep SDK-specific types and mapping out of the port and domain.

## Testing boundaries

- Domain tests verify invariants without Nest testing modules or external clients.
- Use-case tests inject a small fake for each port and verify orchestration/error behavior.
- Adapter tests verify mapping and integration behavior against an appropriate test boundary.
- HTTP tests verify validation, status codes, and transport mapping.
- Avoid tests that only restate trivial constructors or mock every line without checking behavior.
