---
name: react-learn
description: Core React fundamentals from react.dev/learn including components, JSX, state, props, hooks, and Thinking in React methodology. Use when building React components, structuring UIs, managing state, passing props, or when the user mentions React, JSX, useState, or component architecture.
---

# React Fundamentals

Reference for core React concepts from [react.dev/learn](https://react.dev/learn). Covers ~80% of daily React usage.

## Components and Nesting

React apps are made of **components**—pieces of UI with their own logic and appearance. Components are JavaScript functions that return markup.

```js
function MyButton() {
  return <button>I'm a button</button>;
}

export default function MyApp() {
  return (
    <div>
      <h1>Welcome to my app</h1>
      <MyButton />
    </div>
  );
}
```

**Rules:**
- Component names must start with a **capital letter** (HTML tags are lowercase)
- `export default` specifies the main component in the file

## JSX

JSX is optional but widely used. Stricter than HTML:

- Close all tags: `<br />` not `<br>`
- Return a single parent—wrap multiple elements in `<div>...</div>` or `<>...</>` (Fragment)

```js
function AboutPage() {
  return (
    <>
      <h1>About</h1>
      <p>Hello there.<br />How do you do?</p>
    </>
  );
}
```

## Styling

- Use `className` for CSS classes (not `class`)
- Inline styles: `style={{ width: user.imageSize, height: user.imageSize }}`—outer `{}` is JSX, inner `{}` is a JS object

## Displaying Data

Curly braces `{}` escape into JavaScript inside JSX:

```js
<h1>{user.name}</h1>
<img src={user.imageUrl} alt={'Photo of ' + user.name} />
```

## Conditional Rendering

Use standard JavaScript—no special syntax:

```js
// if/else
let content = isLoggedIn ? <AdminPanel /> : <LoginForm />;

// Ternary inside JSX
<div>{isLoggedIn ? <AdminPanel /> : <LoginForm />}</div>

// Short-circuit when no else branch
<div>{isLoggedIn && <AdminPanel />}</div>
```

## Rendering Lists

Use `map()` and provide a unique `key` for each item:

```js
const listItems = products.map(product => (
  <li key={product.id}>{product.title}</li>
));
return <ul>{listItems}</ul>;
```

**Keys:** Use a stable unique ID from your data (e.g. `product.id`). React uses keys to track insertions, deletions, and reorders.

## Events

Pass handler functions—do not call them. React invokes them on user interaction.

```js
function MyButton() {
  function handleClick() {
    alert('You clicked me!');
  }
  return <button onClick={handleClick}>Click me</button>;
}
```

## State (useState)

State lets a component remember information and re-render when it changes.

```js
import { useState } from 'react';

function MyButton() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
  }

  return (
    <button onClick={handleClick}>
      Clicked {count} times
    </button>
  );
}
```

- `useState(0)` returns `[currentValue, setterFunction]`
- Convention: `[something, setSomething]`
- Each component instance has its own state

## Hooks Rules

- Functions starting with `use` are **Hooks**
- Call Hooks only at the **top level** of components (or other Hooks)—not inside conditions or loops
- To use state conditionally, extract a component and put the Hook there

## Sharing Data Between Components

**Lifting state up:** Move state to the closest common parent so siblings can share it.

1. Move state from child into parent
2. Pass state and setter down as props
3. Child reads props and calls parent's handler

```js
export default function MyApp() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
  }

  return (
    <div>
      <MyButton count={count} onClick={handleClick} />
      <MyButton count={count} onClick={handleClick} />
    </div>
  );
}

function MyButton({ count, onClick }) {
  return (
    <button onClick={onClick}>
      Clicked {count} times
    </button>
  );
}
```

**Props** = data passed from parent to child. **State** = component's memory, changes over time.

---

# Thinking in React

Five steps for building UIs from [react.dev/learn/thinking-in-react](https://react.dev/learn/thinking-in-react):

## Step 1: Break the UI into a Component Hierarchy

- Draw boxes around components in the mockup
- Name them (PascalCase)
- Consider: design layers, CSS selectors, separation of concerns
- Arrange into a hierarchy (children inside parents)

## Step 2: Build a Static Version

- Build components that render data **without interactivity**
- Pass data via **props** only—no state yet
- Build top-down or bottom-up
- One-way data flow: data flows from parent to child

## Step 3: Find Minimal UI State

Identify the **minimal** set of changing data. Ask for each piece:

- Can it be computed from existing state/props? → Not state
- Passed from parent? → Not state
- Unchanged over time? → Not state

What remains is state. Keep it DRY—compute derived values, don't store them.

## Step 4: Identify Where State Lives

For each piece of state:

1. Find every component that renders based on that state
2. Find their **closest common parent**
3. State lives in that parent (or a new component above it)

## Step 5: Add Inverse Data Flow

- Controlled inputs need `value` + `onChange`
- Pass setter functions down as props (e.g. `onFilterTextChange={setFilterText}`)
- Child calls parent's setter on user input

```js
<input
  value={filterText}
  onChange={(e) => onFilterTextChange(e.target.value)}
/>
```

---

## Quick Reference

| Concept | Pattern |
|---------|---------|
| Component | `function Name() { return <... /> }` |
| Props | `function Child({ prop1, prop2 }) { ... }` |
| State | `const [val, setVal] = useState(initial)` |
| Event | `onClick={handler}` (pass function, don't call) |
| List | `items.map(item => <li key={item.id}>...</li>)` |
| Conditional | `{condition && <Component />}` or `{a ? b : c}` |

## Additional Resources

- Full examples and API reference: [reference.md](reference.md)
- React docs: [react.dev](https://react.dev)
- Tutorial: [Tic-Tac-Toe](https://react.dev/learn/tutorial-tic-tac-toe)
