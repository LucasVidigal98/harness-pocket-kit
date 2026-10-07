# Spring Boot architecture reference

## Dependency direction

```text
HTTP / Messaging
       ↓
Presentation adapter → Application use case → Domain
                              ↓                 ↑
                         outbound port ← Infrastructure adapter
```

Spring configuration connects outbound ports to adapters. Domain and application policy should not depend on Spring MVC, JPA, a database driver, or vendor SDKs.

## Example feature layout

Follow the project's package convention and omit unused layers:

```text
src/main/java/com/example/service/
  ServiceApplication.java
  shared/                         # only code genuinely shared across features
  users/
    domain/
      User.java
      UserRepository.java          # domain-owned persistence contract
    application/
      CreateUser.java              # use case
    presentation/
      http/
        UserController.java
        CreateUserRequest.java      # transport DTO
    infrastructure/
      persistence/
        UserJpaEntity.java          # only if persistence is selected
        JpaUserRepository.java
      SpringUserRepositoryAdapter.java
```

An application use case may depend on `UserRepository`; a Spring `@Configuration` class or feature configuration binds that port to the selected adapter. Keep Spring annotations out of domain types. Choose JPA only when the project needs a relational persistence adapter; Initializr offers other integrations as metadata-backed options.

## Boundary checks

- Domain tests need no Spring context or database.
- Use-case tests can pass a small in-memory fake implementing the port.
- Adapter tests verify mapping and integration behavior at the relevant boundary.
- Web tests verify validation, HTTP behavior, and transport mapping.
- Avoid test infrastructure and abstractions that do not protect a real boundary.
