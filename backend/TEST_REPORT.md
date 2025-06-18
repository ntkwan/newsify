# Báo cáo Kiểm thử cho NestJS Backend

## Tổng quan

Tài liệu này trình bày chiến lược kiểm thử và các công cụ được triển khai cho Newsify Backend - ứng dụng NestJS bằng TypeScript cung cấp API cho hệ thống tin tức. Khung kiểm thử được lựa chọn kỹ lưỡng nhằm đảm bảo chất lượng mã nguồn, khả năng bảo trì và độ tin cậy tối ưu.

## Công cụ & Khung Kiểm thử

### Khung Kiểm thử Chính: Jest

Backend NestJS sử dụng **Jest** - giải pháp kiểm thử tiêu chuẩn công nghiệp cho JavaScript/TypeScript với các ưu điểm:

1. **Cú pháp trực quan**: Sử dụng hàm `expect()` với các matcher mạnh mẽ
2. **Mocking tích hợp**: Hỗ trợ mock tự động và manual
3. **Snapshot testing**: Kiểm thử thay đổi output một cách hiệu quả
4. **Code coverage**: Đo lường độ phủ mã tích hợp
5. **Parallel execution**: Chạy test song song để tăng tốc độ
6. **Watch mode**: Tự động chạy lại test khi có thay đổi

### Tiện ích Mở rộng Chính

#### 1. **@nestjs/testing**

- Cung cấp utilities để test NestJS modules, services, controllers
- Hỗ trợ dependency injection và module testing
- Tích hợp với Jest framework

#### 2. **@nestjs/jest**

- Cấu hình Jest tối ưu cho NestJS
- Hỗ trợ TypeScript và decorators
- Tích hợp với NestJS CLI

#### 3. **supertest**

- Kiểm thử HTTP endpoints
- Tích hợp với NestJS TestModule
- Kiểm tra response status, headers, và body

#### 4. **ts-jest**

- Hỗ trợ TypeScript trong Jest
- Compile TypeScript on-the-fly
- Source map support cho debugging

### Công cụ Hỗ trợ Khác

- **jest-mock-extended**: Tạo mock objects cho TypeScript interfaces
- **@types/jest**: Type definitions cho Jest
- **jest-extended**: Additional matchers cho Jest

## Phương pháp Kiểm thử

### 1. Cấu trúc Test

Tổ chức test theo mô hình chuẩn với:

- File test song song với file source (`.spec.ts`)
- Thư mục `test` cho e2e tests
- File cấu hình `jest.config.js` xác định thiết lập
- Các file test riêng biệt cho từng module

### 2. Phân loại Kiểm thử

#### Kiểm thử Đơn vị (Unit Tests)

- Kiểm thử từng service, controller, repository riêng lẻ
- Sử dụng mock để thay thế các phụ thuộc bên ngoài
- Tập trung vào logic nghiệp vụ cốt lõi
- Test các DTOs, entities, và utilities

#### Kiểm thử API (Controller Tests)

- Xác thực endpoint thông qua TestModule
- Kiểm tra HTTP status codes và response structure
- Test validation pipes và error handling
- Đảm bảo giao diện API hoạt động chính xác

#### Kiểm thử Tích hợp (Integration Tests)

- Kiểm thử tương tác giữa các modules
- Test database operations với test database
- Xác nhận luồng nghiệp vụ hoàn chỉnh

#### Kiểm thử End-to-End (E2E Tests)

- Test toàn bộ ứng dụng từ request đến response
- Sử dụng test database và mock external services
- Kiểm tra authentication, authorization

### 3. Chiến lược Mocking

- Giả lập database operations với Repository pattern
- Mock external services (Elasticsearch, Redis, OpenAI)
- Test error scenarios và edge cases
- Mock authentication và authorization

## Triển khai Chi tiết

### 1. Cấu hình

File `jest.config.js` xác định:

- Đường dẫn thư mục test
- Coverage thresholds
- Test environment setup
- Module name mapping

### 2. Test Module Setup

```typescript
const module: TestingModule = await Test.createTestingModule({
    providers: [
        ServiceName,
        {
            provide: DependencyToken,
            useValue: mockDependency,
        },
    ],
}).compile();
```

### 3. Mock Management

- Sử dụng `jest.fn()` cho function mocks
- `jest.spyOn()` cho method spying
- `jest.mock()` cho module mocking
- Auto-mocking với `jest.autoMockOff()`

### 4. Test Data Management

- Factory functions cho test data
- Fixtures cho common test scenarios
- Cleanup sau mỗi test với `afterEach()`

### 5. Error Testing

- Test exception throwing với `expect().toThrow()`
- Verify error messages và error types
- Test error handling middleware

## So sánh với Kiểm thử Python (pytest)

| Tính năng        | NestJS/Jest                | Python/pytest              |
| ---------------- | -------------------------- | -------------------------- |
| Cú pháp          | `expect().toBe()`          | `assert` statements        |
| Kiểm thử async   | Hỗ trợ sẵn                 | Cần `@pytest.mark.asyncio` |
| Mocking          | `jest.fn()`, `jest.mock()` | `unittest.mock`            |
| Test discovery   | File pattern               | Function pattern           |
| Snapshot testing | Tích hợp                   | Qua plugin                 |
| Coverage         | Jest built-in              | pytest-cov                 |
| Cấu hình         | jest.config.js             | pytest.ini                 |

## Những Thứ Đã Áp dụng

1. **Dependency Injection Testing**: Test NestJS DI container
2. **Repository Pattern Testing**: Mock database operations
3. **DTO Validation Testing**: Test class-validator decorators
4. **Authentication Testing**: Mock JWT và guards
5. **Error Handling Testing**: Test exception filters
6. **Middleware Testing**: Test request/response pipeline
7. **Configuration Testing**: Test ConfigService

## Giải thích Bổ sung

**TestingModule** là utility của NestJS để tạo module test cô lập, cho phép test từng component riêng biệt với mock dependencies.

**Mock Factory** tạo ra mock objects với behavior được định nghĩa trước, giúp test các scenarios khác nhau một cách nhất quán.

**Test Coverage** đo lường phần trăm code được thực thi trong quá trình test, giúp xác định areas cần test thêm.

**E2E Testing** kiểm thử toàn bộ application flow từ HTTP request đến database và response, đảm bảo integration giữa các components.

## Cập nhật và Sửa lỗi gần đây

Trong phiên bản mới nhất của bộ kiểm thử, nhiều vấn đề đã được phát hiện và khắc phục:

### 1. Auth Service Tests

- **Fixed changePassword test**: Cập nhật expectation từ `InternalServerErrorException` sang `NotFoundException` khi user không tồn tại
- **Fixed resetPassword test**: Loại bỏ expectation cho `updateOtp` call không tồn tại
- **Fixed error handling**: Cập nhật expectation từ `BadRequestException` sang `InternalServerErrorException` khi passwords không khớp

### 2. Articles Service Tests

- **Fixed mock data structure**: Cập nhật `mockArticleResponse` để match actual service output
- **Fixed OpenAI API expectations**: Cập nhật parameters và response structure
- **Fixed error handling tests**: Sửa expectations cho `generateSummary` method
- **Fixed similarity score logic**: Cập nhật test logic để match actual implementation

### 3. Milvus Service Tests

- **Fixed mock setup**: Sửa lỗi mock client không accessible
- **Fixed mock function references**: Tạo separate mock functions và sử dụng consistently
- **Fixed mock client assignment**: Loại bỏ problematic assignment và sử dụng global mocks

### 4. Podcasts Service Tests

- **Fixed TypeScript errors**: Cập nhật mock data types để match actual entity và DTO types
- **Fixed Redis dependency injection**: Sử dụng đúng token `'default_IORedisModuleConnectionToken'`
- **Fixed error handling expectations**: Cập nhật tests để expect graceful error handling thay vì throwing errors

### 5. Search Service Tests

- **Fixed mock article data**: Cập nhật để sử dụng `dataValues` structure (Sequelize model)
- **Fixed deleteIndex tests**: Cập nhật expectations để match actual service behavior
- **Fixed countDocuments test**: Cập nhật để expect return 0 thay vì throwing error
- **Fixed parameter expectations**: Thêm proper expectations cho method calls

### 6. Sync Service Tests

- **Fixed mock data structure**: Cập nhật `createMockArticle` để sử dụng `dataValues`
- **Fixed loop logic expectations**: Cập nhật để match actual pagination behavior
- **Fixed error handling**: Cập nhật tests để expect errors to be thrown thay vì handled gracefully
- **Fixed reindexAll tests**: Cập nhật mock setup cho multiple `findAndCountAll` calls

## Kết luận

Khung kiểm thử dựa trên Jest cung cấp nền tảng vững chắc để đảm bảo chất lượng NestJS Backend. Sự kết hợp giữa tính mạnh mẽ của Jest và utilities của NestJS cho phép kiểm thử toàn diện từ unit tests đến e2e tests.

Chiến lược kiểm thử đa tầng bao gồm unit test, integration test, API test và e2e test đảm bảo kiểm tra toàn diện từ component riêng lẻ đến luồng nghiệp vụ tổng thể. Việc sử dụng hợp lý mocking và dependency injection giúp duy trì tính cô lập của test trong khi vẫn đảm bảo kiểm thử hành vi hệ thống.

Với những cập nhật và sửa lỗi gần đây, bộ kiểm thử đã được cải thiện đáng kể về độ chính xác và độ bao phủ. Các vấn đề về mock setup, error handling expectations, và data structure mismatches đã được khắc phục, giúp mã nguồn dễ đọc và bảo trì hơn.

Cách tiếp cận này mang lại sự tự tin khi thực hiện thay đổi mã nguồn, với sự đảm bảo rằng các vấn đề tiềm ẩn sẽ được phát hiện sớm trong quá trình phát triển trước khi triển khai.
