# amorfs-core

A TypeScript parser for the Amorfs data format - a universal, concept-based data representation system that separates abstract concepts from their physical expressions while maintaining semantic relationships through structured associations.

## What is Amorfs?

Amorfs is a data format designed to address fundamental limitations in traditional data formats by:

- **Eliminating orphaned data**: Reuniting data with contextual metadata in self-describing structures
- **Enabling universal compatibility**: Allowing seamless data exchange between applications without custom integration
- **Supporting rich semantics**: Capturing nuanced relationships and context that traditional formats cannot represent
- **Maintaining language agnosticism**: Representing concepts independently of their linguistic expressions
- **Including data presentation**: Capturing style and layout data as first-class citizens

## Installation

```bash
npm install amorfs-core
# or
pnpm add amorfs-core
# or
yarn add amorfs-core
```

## Quick Start

```typescript
import { parse, parseOrThrow, isValid } from 'amorfs-core';

// Validate syntax
const input = `
person [John Smith
  + birth_date [1985-07-15]
  - employer [Acme Corp]
]
`;

if (isValid(input)) {
  const ast = parseOrThrow(input);
  console.log(ast.concepts[0].parameter[0].value); // "person"
}
```

## API Reference

### `parse(input: string): ParseResult`

Parses Amorfs text and returns a result object indicating success or failure.

```typescript
const result = parse(input);

if (result.success) {
  console.log(result.ast); // AmorfsAST
} else {
  console.error(result.error); // ParseError with message, line, column
}
```

### `parseOrThrow(input: string): AmorfsAST`

Parses Amorfs text and returns the AST directly. Throws an error if parsing fails.

```typescript
try {
  const ast = parseOrThrow(input);
  // Work with ast...
} catch (error) {
  console.error('Parse error:', error.message);
}
```

### `isValid(input: string): boolean`

Quick validation check - returns `true` if the input is valid Amorfs syntax.

```typescript
if (isValid(input)) {
  // Safe to parse
}
```

## Amorfs Syntax

### Basic Concepts

A concept consists of a parameter (name) and optional value/children:

```amorfs
# Simple concept with value
city [Sydney]

# Concept with nested associations
person [John Smith
  - email [john@example.com]
  - phone [555-1234]
]
```

### Association Types

- **Intrinsic (`+`)**: Unchanging, identifying characteristics
- **Contextual (`-`)**: Circumstantial, context-dependent attributes

```amorfs
person [John Smith
  + birth_date [1985-07-15]    # Intrinsic - always true
  - employer [Acme Corp]       # Contextual - may change
]
```

### Multiple Expressions (Synonyms)

Use `|` to define alternative expressions for the same concept:

```amorfs
# Synonyms
state [NSW | New South Wales]

# Multilingual
greeting [Hello {en} | Bonjour {fr} | Hola {es}]
```

### Metadata

Attach metadata using `{}` blocks:

```amorfs
# Language metadata
product [Smart Watch {en} | Montre Intelligente {fr}]

# Confidence and temporal metadata
measurement [42.5 {~0.95 2024-03-15}]

# Custom metadata
data [value] {source=@database ~0.8}
```

### Concept References

Create reusable references with `@identifier`:

```amorfs
# Define a concept with reference
source [NASA Database] @nasa_db

# Use the reference
fact [Earth orbits Sun
  - source [@nasa_db]
]
```

### Expression Types

```amorfs
# Text
name [John Smith]

# Numeric
age [42]
price [299.99]

# Quoted (for special characters)
note ["Text with [brackets] inside"]

# IRI (URLs)
homepage [<https://example.com>]

# DateTime
created [2024-03-15T14:30:00Z]
```

### Nested Structures

```amorfs
country [Australia
  - state [NSW
    - city [Sydney
      - suburb [Newington]
    ]
  ]
]
```

### Comments

```amorfs
# This is a comment
person [John Smith]  # Inline comment
```

## AST Structure

The parser produces an Abstract Syntax Tree with the following structure:

```typescript
interface AmorfsAST {
  concepts: ConceptNode[];           // Top-level concepts
  references: Record<string, ConceptNode>;  // Named references (@key)
}

interface ConceptNode {
  key: string | null;                // Reference key (@identifier)
  isReference: boolean;              // True if this is a @reference
  parameter: ExpressionValue[];      // Parameter expressions (before [)
  children: ChildAssociation[];      // Child associations
  metadata: Metadata | null;         // Attached metadata
}

interface ChildAssociation {
  associationType: 'has_a' | 'which_is';
  isIntrinsic: boolean;              // true for +, false for -
  concept: ConceptNode;
  metadata?: Metadata;
}

interface ExpressionValue {
  value: string | number;
  type: 'text' | 'number' | 'datetime' | 'iri' | 'quoted';
  language?: string;
  metadata?: Metadata;
}

interface Metadata {
  language?: string;                 // ISO 639-1 code (en, fr, etc.)
  confidence?: number;               // 0.0 to 1.0
  importance?: number;               // Positive or negative
  temporal?: { start?: string; end?: string };
  source?: ConceptRef;
  custom?: Record<string, string | ConceptRef>;
}
```

## Examples

### Business Card

```amorfs
business card [
  Alan Turing
  - role [mathematician {en} | mathématicien {fr}]
  - contact [
    - email [alan@turing.com]
    - phone [07949 212255]
  ]
  - address [
    - street {en} | rue {fr} [Bletchley Park]
    - city [Buckinghamshire]
  ]
]
```

### Multilingual Product

```amorfs
product [
  Smart Watch {en} | Montre Intelligente {fr} | スマートウォッチ {ja}
  - description [
    A versatile wearable device {en} |
    Un appareil portable polyvalent {fr} |
    多機能なウェアラブルデバイス {ja}
  ]
  - price [
    + amount [299]
    + currency [USD | $ {en}]
  ]
  - features [
    - heart rate [yes]
    - gps [yes]
    - water resistant [50m]
  ]
]
```

### Research Paper with Provenance

```amorfs
source_database [NASA Scientific Database
  - url [<https://science.nasa.gov/>]
  - credibility [high]
] @nasa_source

data_scientist [Sarah Chen
  - email [sarah@example.com]
] @sarah

research_paper [Stellar Analysis 2024
  - author [@sarah]
  - primary_source [@nasa_source]
  - data [stellar measurements]
]
```

## Working with the AST

```typescript
import { parseOrThrow, type ConceptNode } from 'amorfs-core';

const input = `
person [John Smith
  + birth_date [1985-07-15]
  - employer [Acme Corp]
]
`;

const ast = parseOrThrow(input);

// Get the first concept
const person = ast.concepts[0];
console.log(person.parameter[0].value); // "person"

// Find value (which_is association)
const nameAssoc = person.children.find(c => c.associationType === 'which_is');
console.log(nameAssoc?.concept.parameter[0].value); // "John Smith"

// Find attributes (has_a associations)
const birthDate = person.children.find(
  c => c.associationType === 'has_a' && 
       c.concept.parameter[0]?.value === 'birth_date'
);
console.log(birthDate?.isIntrinsic); // true

// Helper function to get parameter value
function getParameterValue(concept: ConceptNode): string | number | null {
  return concept.parameter[0]?.value ?? null;
}

// Helper to find child by parameter name
function findChild(concept: ConceptNode, name: string) {
  return concept.children.find(
    c => c.associationType === 'has_a' && 
         getParameterValue(c.concept) === name
  );
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Watch mode for tests
pnpm test:watch

# Lint
pnpm lint
```

## License

MIT

## Related

- [Amorfs Specification](https://github.com/firstcognition/amorfs-spec) - Full format specification
- [First Cognition](https://firstcognition.com) - The company behind Amorfs
