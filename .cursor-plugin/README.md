# CIAMS Asset Manager Plugin

Cursor plugin for building the **Construction Inventory & Asset Management System (CIAMS)** React Native app. Provides skills and commands for consistent development with Firebase, NativeWind, Redux, and the CIAMS design system.

## Target Users

- Developers building the CIAMS asset-manager React Native app
- Teams using Expo, Firebase Web SDK, and NativeWind

## Components

### Skills

| Skill | Description |
|-------|-------------|
| **ciams-design-system** | Industrial-grade UI components with NativeWind: colors, typography, cards, forms, touch targets |
| **firebase-react-native** | Firebase Web SDK in React Native: Auth, Firestore, Cloud Storage patterns |
| **thinking-in-react-native** | "Thinking in React" methodology adapted for mobile: component hierarchy, state placement |
| **react-native-standards** | Coding standards: functional components, TypeScript, StyleSheet, folder structure |

### Commands

| Command | Description |
|---------|-------------|
| **plan-feature-implementation** | Analyzes app architecture with 4 subagents and produces a step-by-step implementation plan |

## Structure

Plugin is at **project root** level:

```
asset-manager/                    ← project root (open this as workspace)
├── .cursor-plugin/
│   ├── plugin.json
│   ├── README.md
│   ├── LICENSE
│   └── CHANGELOG.md
├── commands/
│   └── plan-feature-implementation.md
├── skills/
│   ├── ciams-design-system/SKILL.md
│   ├── firebase-react-native/SKILL.md
│   ├── thinking-in-react-native/SKILL.md
│   └── react-native-standards/SKILL.md
└── asset-manager/                ← React Native app
    ├── src/
    ├── App.tsx
    └── ...
```

## Installation

**Local use**: Open the project root (`asset-manager/`) as your Cursor workspace so the plugin is auto-discovered.

**Marketplace**: Install from the Cursor plugin marketplace (when published).

## License

MIT
