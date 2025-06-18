# NestJS Backend

## Testing

This project uses Jest for testing. The test suite includes:

- Unit tests for all services, controllers, and repositories
- Integration tests
- E2E tests
- API tests

### Running Tests

To run the tests, make sure all dependencies are installed:

```bash
pnpm install
```

Then run the tests using:

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run tests in watch mode
pnpm test:watch

# Run e2e tests
pnpm test:e2e

# Run specific test file
pnpm test src/auth/auth.service.spec.ts

# Run tests with verbose output
pnpm test --verbose
```

### Test Structure

Tests are organized by module and follow NestJS conventions:

- `src/**/*.spec.ts` - Unit tests for services, controllers, repositories
- `test/**/*.e2e-spec.ts` - End-to-end tests
- `jest.config.js` - Jest configuration
- `test/jest-e2e.json` - E2E test configuration

#### Service Tests

- `src/auth/auth.service.spec.ts` - Authentication service tests
- `src/articles/articles.service.spec.ts` - Article management tests
- `src/podcasts/podcasts.service.spec.ts` - Podcast service tests
- `src/search/search.service.spec.ts` - Search functionality tests
- `src/search/sync.service.spec.ts` - Data synchronization tests
- `src/milvus/milvus.service.spec.ts` - Vector search tests
- `src/users/users.service.spec.ts` - User management tests

#### Controller Tests

- `src/auth/auth.controller.spec.ts` - Authentication endpoints
- `src/articles/articles.controller.spec.ts` - Article endpoints
- `src/podcasts/podcasts.controller.spec.ts` - Podcast endpoints

#### Repository Tests

- `src/articles/article.repository.spec.ts` - Article data access
- `src/users/users.repository.spec.ts` - User data access

### Writing New Tests

When adding new functionality, corresponding tests should be added:

1. **Service Tests**: Test business logic with mocked dependencies
2. **Controller Tests**: Test HTTP endpoints and request/response handling
3. **Repository Tests**: Test data access layer
4. **E2E Tests**: Test complete application flow

#### Example Service Test Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceName } from './service-name.service';

describe('ServiceName', () => {
    let service: ServiceName;
    let mockDependency: jest.Mocked<DependencyType>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ServiceName,
                {
                    provide: DependencyToken,
                    useValue: {
                        method: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ServiceName>(ServiceName);
        mockDependency = module.get(DependencyToken);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('methodName', () => {
        it('should perform expected behavior', async () => {
            // Arrange
            const input = 'test input';
            const expectedOutput = 'expected result';
            mockDependency.method.mockResolvedValue(expectedOutput);

            // Act
            const result = await service.methodName(input);

            // Assert
            expect(result).toBe(expectedOutput);
            expect(mockDependency.method).toHaveBeenCalledWith(input);
        });

        it('should handle errors appropriately', async () => {
            // Arrange
            const error = new Error('Test error');
            mockDependency.method.mockRejectedValue(error);

            // Act & Assert
            await expect(service.methodName('input')).rejects.toThrow(error);
        });
    });
});
```

#### Example Controller Test Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('ControllerName (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('/endpoint (GET)', () => {
        return request(app.getHttpServer())
            .get('/endpoint')
            .expect(200)
            .expect('Content-Type', /json/);
    });
});
```

### Best Practices

1. **Use fixtures and factories** for test data
2. **Mock external dependencies** (databases, APIs, services)
3. **Test error scenarios** and edge cases
4. **Use descriptive test names** that explain the scenario
5. **Follow AAA pattern** (Arrange, Act, Assert)
6. **Clean up after tests** using `afterEach()` and `afterAll()`
7. **Test both success and failure paths**
8. **Use TypeScript types** for better type safety in tests

### Mocking Strategies

#### Service Dependencies

```typescript
const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
};
```

#### External Services

```typescript
jest.mock('@elastic/elasticsearch', () => ({
    Client: jest.fn().mockImplementation(() => ({
        indices: { exists: jest.fn(), create: jest.fn() },
        bulk: jest.fn(),
        search: jest.fn(),
    })),
}));
```

#### Configuration

```typescript
const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
        const config = {
            DATABASE_URL: 'test-db-url',
            JWT_SECRET: 'test-secret',
        };
        return config[key];
    }),
};
```

### Environment Variables

For testing, the following environment variables should be set:

```env
# Database
DATABASE_URL=postgresql://test:test@localhost:5432/test_db

# JWT
JWT_SECRET=test-secret
JWT_REFRESH_SECRET=test-refresh-secret

# External Services
OPENAI_API_KEY=test-key
ELS_IP=http://localhost:9200
ELS_USERNAME=elastic
ELS_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Milvus
MILVUS_HOST=localhost
MILVUS_PORT=19530
```

For local testing, a `.env.test` file can be created with these values.

### Coverage

The project aims for high test coverage. Coverage reports can be generated with:

```bash
pnpm test:cov
```

This will generate a coverage report showing:

- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

### Continuous Integration

Tests are automatically run in CI/CD pipeline:

- Unit tests on every commit
- E2E tests on pull requests
- Coverage reports generated
- Test results reported to the team

### Debugging Tests

To debug tests, the following approaches can be used:

1. **Use console.log** in test files
2. **Run tests in watch mode** with `pnpm test:watch`
3. **Use debugger statement** and run with `--inspect-brk`
4. **Use Jest's `--verbose` flag** for detailed output
5. **Use `--runInBand`** to run tests sequentially

### Common Issues and Solutions

1. **Mock not working**: Ensure mocks are defined before the module is compiled
2. **Async test failures**: Use `async/await` or return promises
3. **Database connection issues**: Use test database and proper cleanup
4. **Type errors**: Ensure proper TypeScript types for mocks
5. **Test isolation**: Use `beforeEach` to reset mocks and state
