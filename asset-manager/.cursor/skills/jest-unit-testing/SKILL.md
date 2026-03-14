---
name: jest-unit-testing
description: Write Jest-based unit tests for Angular services, pipes, utilities, and components in the estata-frontend-rental-management project. Covers the incremental one-test-at-a-time workflow, mock service patterns, dependency resolution for inject()-based services, Akita/Elf store mocking, RxJS observable mocking, and MSW for HTTP. Use when writing unit tests, creating test files, testing business logic, testing services, testing pipes, or when the user mentions Jest, spec files, TestBed, or unit testing.
---

# Jest Unit Testing — estata-frontend-rental-management

## Workflow (Always Follow This)

For every component or service:

1. **Read** the source file in full
2. **List** every testable feature/behavior and present it to the user
3. **Confirm** the list before writing any code
4. **Write one test** — start with "should create" / "should instantiate"
5. **Run it**: `npx jest <relative-path-to-spec> --no-coverage`
6. **Only when it passes**, write the next test
7. Never write multiple tests in advance

---

## Running Tests

```bash
# Single file (always use this while writing tests)
npx jest src/app/shared/components/search/search.component.spec.ts --no-coverage

# Watch mode for a file
npx jest src/app/shared/components/search/search.component.spec.ts --no-coverage --watch

# All tests
npm test
```

---

## Test File Location

Place spec files next to the source file:
```
some.component.ts
some.component.spec.ts   ← here
```

---

## Choosing the Right Testing Style

| Situation | Style |
|-----------|-------|
| Component UI behavior, user interactions, DOM | Angular Testing Library (`render()`) |
| Component method logic, state, outputs | `TestBed.createComponent()` |
| Service, pipe, utility | Plain Jest (`new MyService()` or `TestBed.inject()`) |

---

## TestBed Setup Templates

### Standalone Component
```typescript
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { MyComponent } from './my.component';

// For Angular Testing Library style (UI/interactions)
const { fixture } = await render(MyComponent, {
  providers: [
    { provide: MyService, useClass: MyServiceMock },
  ],
});

// For class-level testing
await TestBed.configureTestingModule({
  imports: [MyComponent],
  providers: [
    { provide: MyService, useClass: MyServiceMock },
  ],
}).compileComponents();
const fixture = TestBed.createComponent(MyComponent);
```

### Declared (Non-Standalone) Component
```typescript
await TestBed.configureTestingModule({
  declarations: [MyComponent],
  providers: [
    { provide: MyService, useClass: MyServiceMock },
  ],
  schemas: [NO_ERRORS_SCHEMA], // shallow render child components
}).compileComponents();
```

---

## Dependency Resolution Patterns

### Services using `inject()`
Provide via `providers` array in `TestBed`:
```typescript
providers: [
  { provide: MyService, useClass: MyServiceMock },
  // or inline jest mock:
  { provide: MyService, useValue: { getData: jest.fn().mockReturnValue(of([])) } },
]
```

### FormBuilder
Provide the real one — no need to mock:
```typescript
import { ReactiveFormsModule } from '@angular/forms';
// imports: [ReactiveFormsModule]
// FormBuilder is available automatically
```

### Router
```typescript
import { provideRouter } from '@angular/router';
providers: [provideRouter([])]
// or
import { RouterTestingModule } from '@angular/router/testing';
imports: [RouterTestingModule]
```

### ActivatedRoute
```typescript
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

providers: [
  {
    provide: ActivatedRoute,
    useValue: {
      params: of({ id: 'test-id' }),
      queryParams: of({}),
      paramMap: of({ get: (key: string) => 'test-id' }),
      snapshot: { params: { id: 'test-id' }, data: {} },
    },
  },
]
```

### TranslocoService

**Option 1 — minimal mock** (default; use when tests assert on logic, not translated text)
```typescript
import { TranslocoService } from '@jsverse/transloco';

providers: [
  {
    provide: TranslocoService,
    useValue: {
      translate: jest.fn((key: string) => key),
      selectTranslate: jest.fn((key: string) => of(key)),
      langChanges$: of('en-gb'),
      getActiveLang: jest.fn(() => 'en-gb'),
    },
  },
]
```

**Option 2 — `TranslocoTestingModule`** (use when a test must assert on real translated labels)
```typescript
import { getTranslocoModule } from '@shared/mock-services/transloco-testing.module';

// In TestBed:
imports: [getTranslocoModule()]

// For components with a lazy-loaded TRANSLOCO_SCOPE (e.g. 'rental'):
import rentalEn from 'src/assets/i18n/rental/en-gb.json';
import rentalNb from 'src/assets/i18n/rental/nb.json';

imports: [
  getTranslocoModule({
    langs: { 'rental/en-gb': rentalEn, 'rental/nb': rentalNb },
  })
]
```
> `getTranslocoModule()` ships the three root language files (`en-gb`, `nb`, `sv`) and sets `defaultLang: 'en-gb'`.
> Available scope folders: `communication`, `rental`, `settings`, `dashboard`, `fdv`, `tools`, `devHelper`.

### DialogService (mock already exists)
```typescript
import { DialogServiceMock } from '@shared/mock-services/dialog-service.mock';
import { DialogService } from '@shared/services/dialog.service';

providers: [{ provide: DialogService, useClass: DialogServiceMock }]
```

### DestroyRef
```typescript
import { DestroyRef } from '@angular/core';

providers: [
  { provide: DestroyRef, useValue: { onDestroy: jest.fn() } }
]
```

### Location (Angular)
```typescript
import { Location } from '@angular/common';

providers: [
  { provide: Location, useValue: { back: jest.fn(), path: jest.fn(() => '/') } }
]
```

---

## Mock Service Pattern

Create mock classes in `src/app/shared/mock-services/` for reusable mocks:

```typescript
// src/app/shared/mock-services/my.service.mock.ts
import { of } from 'rxjs';
import { MyModel } from '@modules/my/my.model';

export class MyServiceMock {
  getData = jest.fn().mockReturnValue(of<MyModel[]>([]));
  saveData = jest.fn().mockReturnValue(of(null));
}
```

For one-off mocks inside a spec file:
```typescript
const myServiceMock = {
  getData: jest.fn().mockReturnValue(of([])),
  saveData: jest.fn().mockReturnValue(of(null)),
};
providers: [{ provide: MyService, useValue: myServiceMock }]
```

---

## Akita Store / Repository Mocking

```typescript
import { BehaviorSubject } from 'rxjs';

const mockData = { id: '1', name: 'Test' };
const activeItem$ = new BehaviorSubject(mockData);

const myRepositoryMock = {
  activeItem$: activeItem$.asObservable(),
  selectAll: jest.fn().mockReturnValue(of([mockData])),
};

providers: [{ provide: MyRepository, useValue: myRepositoryMock }]
```

---

## Elf Store Mocking

```typescript
const myStoreMock = {
  unreadCount$: new BehaviorSubject(0).asObservable(),
  select: jest.fn().mockReturnValue(of(null)),
};
```

---

## Pipe Testing (Pure Jest — No TestBed)

```typescript
import { DdMmYYYYDatePipe } from './dd-mm-yyyy-date.pipe';

describe('DdMmYYYYDatePipe', () => {
  let pipe: DdMmYYYYDatePipe;

  beforeEach(() => {
    pipe = new DdMmYYYYDatePipe();
  });

  it('formats a date correctly', () => {
    expect(pipe.transform(new Date('2024-01-15'))).toBe('15.01.2024');
  });

  it('returns empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });
});
```

For pipes with service injection, use `TestBed.inject()`:
```typescript
TestBed.configureTestingModule({
  providers: [MyPipe, { provide: SomeService, useValue: mockService }]
});
const pipe = TestBed.inject(MyPipe);
```

---

## Service Testing

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MyService],
    });
    service = TestBed.inject(MyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should fetch data', () => {
    service.getData().subscribe(data => {
      expect(data).toEqual([]);
    });
    const req = httpMock.expectOne('/api/data');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
```

---

## Utility / Helper Testing

```typescript
import { groupMessagesByTime } from './message-time-grouping.util';

describe('groupMessagesByTime', () => {
  it('groups messages from the same day', () => {
    const messages = [/* ... */];
    const result = groupMessagesByTime(messages);
    expect(result).toHaveLength(1);
  });
});
```

---

## Signal / Computed Testing

```typescript
it('computed value updates when input changes', () => {
  component.items = [{ id: '1', checked: true }, { id: '2', checked: false }];
  fixture.detectChanges();
  expect(component.selectedCount()).toBe(1);
});
```

---

## Input/Output Testing

```typescript
it('emits on button click', async () => {
  const emitSpy = jest.spyOn(component.myOutput, 'emit');
  const button = screen.getByRole('button', { name: /save/i });
  await userEvent.click(button);
  expect(emitSpy).toHaveBeenCalledWith(expectedValue);
});
```

---

## Path Aliases

Use these throughout test files (configured in `jest.config` and `tsconfig.spec.json`):

| Alias | Path |
|-------|------|
| `@app/*` | `src/app/*` |
| `@shared/*` | `src/app/shared/*` |
| `@modules/*` | `src/app/modules/*` |
| `@rental/*` | `src/app/modules/rental/*` |
| `@core/*` | `src/app/core/*` |
| `@layout/*` | `src/app/layout/*` |
| `@mocks/*` | `src/mocks/*` |

---

## Additional Reference

- For mock service examples, see `src/app/shared/mock-services/`
- For MSW HTTP handlers, see `src/mocks/mock-handlers.ts`
- For existing test examples, see `src/app/shared/components/select/select.component.spec.ts` (TestBed style) and `src/app/shared/components/search/search.component.spec.ts` (ATL style)
