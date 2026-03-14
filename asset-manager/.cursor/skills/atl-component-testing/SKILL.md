---
name: atl-component-testing
description: Write Angular Testing Library (ATL) component tests for the estata-frontend-rental-management project. Tests individual component features and user-facing behaviors using render(), screen queries, and userEvent. Covers signal inputs, standalone vs declared components, dependency injection, Transloco mocking, reactive forms, dialog interactions, and the incremental one-test-at-a-time workflow. Use when testing Angular components, writing component spec files, or when the user mentions ATL, render(), screen queries, component features, user interactions, or component behavior tests.
---

# ATL Component Testing — estata-frontend-rental-management

## Core Principle

> Test what the user sees and does — not implementation details.

Query by role, label, and visible text. Use `data-testid` only as a last resort.

---

## Workflow (Always Follow This)

1. **Read** the component `.ts` and template file in full
2. **List** every user-facing feature/behavior — present it to the user
3. **Confirm** the list before writing any tests
4. **Write one test** — start with "should render"
5. **Run it**: `npx jest <path-to-spec> --no-coverage`
6. **Only when it passes**, write the next test

---

## Setup Template

```typescript
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  async function setup(props?: Partial<{ label: string }>) {
    const user = userEvent.setup();
    const { fixture } = await render(MyComponent, {
      componentInputs: { label: props?.label ?? 'Default' },
      providers: [
        { provide: MyService, useValue: myServiceMock },
      ],
    });
    return { user, fixture, component: fixture.componentInstance };
  }

  it('should render', async () => {
    await setup();
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });
});
```

Extract a `setup()` helper — it keeps `beforeEach` logic reusable and allows per-test variation.

---

## render() Options Reference

| Option | When to use |
|--------|-------------|
| `componentInputs` | Signal inputs (`input()`, `input.required()`) |
| `componentProperties` | Decorator-based `@Input()` |
| `providers` | Inject mocked services |
| `imports` | Extra modules needed (e.g. `ReactiveFormsModule`) |
| `declarations` | Non-standalone child components |
| `detectChanges: false` | Defer initial render (set inputs before first CD) |

---

## Standalone vs Declared

```typescript
// Standalone component
await render(MyComponent, { componentInputs: { ... } });

// Declared (non-standalone) component
await render(MyComponent, {
  declarations: [MyComponent],
  imports: [SharedModule],
});
```

---

## Screen Queries

Prefer queries in this priority order:

```typescript
// 1. Semantic role (best)
screen.getByRole('button', { name: /save/i });
screen.getByRole('heading', { name: /rental unit/i });
screen.getByRole('checkbox', { name: /active/i });
screen.getByRole('textbox', { name: /email/i });

// 2. Label text
screen.getByLabelText(/first name/i);

// 3. Visible text
screen.getByText(/no data found/i);

// 4. Placeholder
screen.getByPlaceholderText(/search/i);

// 5. Test ID (last resort — add data-testid to template)
screen.getByTestId('clear-button');
```

### Variants

| Prefix | Behavior |
|--------|----------|
| `getBy*` | Throws if not found — use when element must exist |
| `queryBy*` | Returns `null` if not found — use for "should not exist" |
| `findBy*` | Returns a Promise — use for async/delayed elements |
| `getAllBy*` / `queryAllBy*` / `findAllBy*` | Multiple elements |

---

## User Interactions

Always use `userEvent` over `fireEvent` — it simulates real browser behavior:

```typescript
const user = userEvent.setup();

// Click
await user.click(screen.getByRole('button', { name: /submit/i }));

// Type (appends to existing value)
await user.type(screen.getByRole('textbox', { name: /name/i }), 'John');

// Clear and type
await user.clear(screen.getByRole('textbox'));
await user.type(screen.getByRole('textbox'), 'New value');

// Select option
await user.selectOptions(screen.getByRole('combobox'), 'option-value');

// Keyboard
await user.keyboard('{Enter}');
await user.tab();
```

---

## Testing Signal Inputs

```typescript
it('shows correct count from input', async () => {
  await render(MyComponent, {
    componentInputs: { items: [{ id: '1' }, { id: '2' }] },
  });
  expect(screen.getByText('2 items')).toBeInTheDocument();
});
```

For required inputs, always provide a value — missing required signals throw at render time.

---

## Testing Outputs / EventEmitters

```typescript
it('emits when button clicked', async () => {
  const user = userEvent.setup();
  const { fixture } = await render(MyComponent);
  const spy = jest.spyOn(fixture.componentInstance.myOutput, 'emit');

  await user.click(screen.getByRole('button', { name: /confirm/i }));

  expect(spy).toHaveBeenCalledWith(expectedValue);
});
```

---

## Testing Reactive Forms

```typescript
it('submits form with entered values', async () => {
  const saveSpy = jest.fn().mockReturnValue(of(null));
  const user = userEvent.setup();

  await render(MyFormComponent, {
    imports: [ReactiveFormsModule],
    providers: [{ provide: MyService, useValue: { save: saveSpy } }],
  });

  await user.type(screen.getByLabelText(/name/i), 'Test Name');
  await user.click(screen.getByRole('button', { name: /save/i }));

  expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test Name' }));
});

it('shows error when required field is empty', async () => {
  const user = userEvent.setup();
  await render(MyFormComponent, { imports: [ReactiveFormsModule] });

  await user.click(screen.getByRole('button', { name: /save/i }));

  expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
});
```

---

## Testing Conditional Rendering

```typescript
// Element should exist
it('shows alert when there is an error', async () => {
  const { fixture } = await render(MyComponent, {
    componentInputs: { hasError: true },
  });
  expect(screen.getByRole('alert')).toBeInTheDocument();
});

// Element should NOT exist
it('hides alert by default', async () => {
  await render(MyComponent, { componentInputs: { hasError: false } });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
```

---

## Testing @if / @for (Angular control flow)

`render()` calls `detectChanges()` automatically after events. For signal-driven conditional rendering, update the signal and call `fixture.detectChanges()`:

```typescript
it('shows list when items are loaded', async () => {
  const { fixture, component } = await setup();
  component.items.set([{ id: '1', name: 'Unit A' }]);
  fixture.detectChanges();
  expect(screen.getByText('Unit A')).toBeInTheDocument();
});
```

---

## Transloco Setup

**Option 1 — minimal mock** (default; use when tests assert on behavior, not translated text)

```typescript
import { TranslocoService } from '@jsverse/transloco';

const translocoMock = {
  translate: jest.fn((key: string) => key),
  selectTranslate: jest.fn((key: string) => of(key)),
  getActiveLang: jest.fn(() => 'en-gb'),
  langChanges$: of('en-gb'),
};

await render(MyComponent, {
  providers: [{ provide: TranslocoService, useValue: translocoMock }],
});
```

**Option 2 — `TranslocoTestingModule`** (use when a test must assert on real translated labels, e.g. `screen.getByText('Save')`)

```typescript
import { getTranslocoModule } from '@shared/mock-services/transloco-testing.module';

await render(MyComponent, {
  imports: [getTranslocoModule()],
});
```

For components with a lazy-loaded `TRANSLOCO_SCOPE` (e.g. `'rental'`), add the scoped translations:

```typescript
import rentalEn from 'src/assets/i18n/rental/en-gb.json';
import rentalNb from 'src/assets/i18n/rental/nb.json';

await render(MyComponent, {
  imports: [
    getTranslocoModule({
      langs: { 'rental/en-gb': rentalEn, 'rental/nb': rentalNb },
    }),
  ],
});
```

> `getTranslocoModule()` ships the three root language files (`en-gb`, `nb`, `sv`) and sets `defaultLang: 'en-gb'`.
> Available scope folders: `communication`, `rental`, `settings`, `dashboard`, `fdv`, `tools`, `devHelper`.

---

## Mocking Dialog Interactions

```typescript
import { DialogServiceMock } from '@shared/mock-services/dialog-service.mock';
import { DialogService } from '@shared/services/dialog.service';

await render(MyComponent, {
  providers: [{ provide: DialogService, useClass: DialogServiceMock }],
});

// Verify dialog was opened
const dialogService = TestBed.inject(DialogService);
expect(dialogService.openComponent).toHaveBeenCalledWith(
  ExpectedDialogComponent,
  expect.objectContaining({ data: expectedData })
);
```

---

## Async / Loading States

```typescript
it('shows spinner while loading', async () => {
  const dataSubject = new BehaviorSubject<Item[]>([]);
  await render(MyComponent, {
    providers: [{ provide: MyService, useValue: { items$: dataSubject.asObservable() } }],
  });

  expect(screen.getByRole('progressbar')).toBeInTheDocument();

  dataSubject.next([{ id: '1', name: 'Item' }]);
  // findBy* waits for async DOM update
  expect(await screen.findByText('Item')).toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});
```

---

## Querying Within a Scope

```typescript
import { within } from '@testing-library/angular';

it('each card shows the correct label', async () => {
  await render(MyListComponent, {
    componentInputs: { items: [{ id: '1', name: 'Unit A' }, { id: '2', name: 'Unit B' }] },
  });
  const cards = screen.getAllByRole('article');
  expect(within(cards[0]).getByText('Unit A')).toBeInTheDocument();
  expect(within(cards[1]).getByText('Unit B')).toBeInTheDocument();
});
```

---

## Feature List Template

When listing features for a component, use this structure:

```
## [ComponentName] Features

### Rendering
- [ ] Renders without errors
- [ ] Shows [element] when [condition]
- [ ] Hides [element] when [condition]

### Inputs
- [ ] Displays value from [input name]
- [ ] Required input throws without a value

### User Interactions
- [ ] Clicking [button] calls [service method]
- [ ] Typing in [field] updates form value
- [ ] Submitting form with invalid data shows error

### Outputs
- [ ] Emits [event] with [value] when [action]

### State / Loading
- [ ] Shows spinner while data loads
- [ ] Shows empty state when list is empty
- [ ] Shows error message when request fails
```

---

## Additional Resources

- For service, pipe, and utility tests: see [jest-unit-testing skill](../jest-unit-testing/SKILL.md)
- Existing ATL example: `src/app/shared/components/search/search.component.spec.ts`
- Mock services: `src/app/shared/mock-services/`
- ATL docs: https://testing-library.com/docs/angular-testing-library/api
