# Amorfs Parser Test Suites

This directory contains the test suite for the **Amorfs** parser. Tests are organized as fixture-driven suites: each suite loads `.amorfs` files from a corresponding `fixtures/` subfolder and asserts parse results, validity, and AST shape.

## Running tests

```bash
npm test
```

Run a specific suite:

```bash
npx vitest run tests/document_structure.test.ts
npx vitest run tests/identifiers.test.ts
```

## Test suite summary

| Suite | Fixtures | Description |
|-------|----------|-------------|
| **document_structure.test.ts** | `fixtures/document_structure/` (prefix `01_`) | Empty/minimal documents, whitespace-only, comments-only, single/multiple concepts, mixed top-level, leading/trailing whitespace and comments. |
| **comments.test.ts** | `fixtures/comments/` | Comments (`#` and `//`), placement (before/after/between concepts), interaction with structure. |
| **basic_concepts.test.ts** | `fixtures/basic_concepts/` (prefix `03_`) | Minimal concepts, value blocks, case sensitivity, base vs association, intrinsic (+) vs contextual (-), expression–concept linkage, metadata, expression-only boundary, nesting. |
| **expression_types.test.ts** | `fixtures/expression_types/` (prefix `04_`) | All expression value types: text, quoted string, number, IRI, datetime; variants, precedence, invalid cases. |
| **multiple_expressions.test.ts** | `fixtures/multiple_expressions/` (prefix `05_`) | Pipe-separated expressions, synonyms, per-expression metadata, mixed types, expression-only and value-block contexts. |
| **value_blocks.test.ts** | `fixtures/value_blocks/` (prefix `06_`) | Empty blocks, single/multiple items, comma vs newline separation, mixed concepts and associations, order, nesting, invalid syntax. |
| **implicit_block.test.ts** | `fixtures/implicit_block/` | Implicit value block: title line + association lines (-/+) at top level only; equivalence with explicit `Title [ - A, - B ]`, boundary and edge cases. |
| **associations.test.ts** | `fixtures/associations/` (prefix `07_`) | Intrinsic (+), contextual (-), metadata on associations, multiple/mixed associations, target types (bare, nested, expression-only, reference), negative-number distinction. |
| **implied_concepts.test.ts** | `fixtures/implied_concepts/` (prefix `08_`) | Implied concepts (no expressions before value block), single/multiple associations, metadata and `@ref`, nested implied, empty implied, item separation. |
| **expression_only.test.ts** | `fixtures/expression_only/` (prefix `09_`) | Concepts with expressions but no value block; all expression types; multiple expressions with `|`; optional metadata and `@ref`. |
| **concept_references.test.ts** | `fixtures/concept_references/` (prefix `10_`) | Definition with `@identifier`, standalone `@ref`, reference as association target, reference in custom metadata, forward reference, references map. |
| **metadata.test.ts** | `fixtures/metadata/` (prefix `11_`) | Metadata kinds (language, temporal, confidence, importance, custom); scopes (per-expression, per-association, per-concept); combined and empty metadata. |
| **whitespace_lexical.test.ts** | `fixtures/whitespace_lexical/` (prefix `12_`) | Required space after `+`/`-`, insignificant whitespace, UTF-8/Unicode, newline variants (`\n`, `\r\n`, `\r`), lexical edge cases. |
| **identifiers.test.ts** | `fixtures/identifiers/` (prefix `13_`) | Valid identifier formation, reference names in every position, custom attribute keys, case sensitivity, invalid cases (leading digit/hyphen, empty after `@`). |
| **grammar_edge_cases.test.ts** | `fixtures/grammar_edge_cases/` (prefix `14_`) | Structural delimiters in text vs quoted strings, number lookahead, date vs datetime, empty metadata block, quoted-string and IRI edge cases, boundary failures. |
| **nested_structures_cases.test.ts** | `fixtures/nested_structures_cases/` (prefix `15_`) | Nesting depth and width, association types at different levels, content types (implied, expression-only, reference target), parent–child correctness, item separators. |
| **metadata_multiscope_cases.test.ts** | `fixtures/metadata_multiscope_cases/` (prefix `16_`) | Metadata at expression, association, and concept scopes; single/two/three scopes; nested metadata at multiple levels. |
| **references_cases.test.ts** | `fixtures/references_cases/` (prefix `17_`) | Full reference usage: definition (value block + `@ref`, expression-only + `@ref`), standalone refs, ref as association target, ref in custom metadata, forward refs. |
| **real_world_cases.test.ts** | `fixtures/real_world_cases/` (prefix `18_`) | Real-world style documents: business card/contact, person (FOAF/schema), multilingual product, provenance, combined and edge cases. |
| **semantic_cases.test.ts** | `fixtures/semantic_cases/` (prefix `19_`) | Semantic Web: vocabulary-style expressions (FOAF, Dublin Core, Schema.org, SKOS, OWL), IRIs in associations, references in a semantic graph. |
| **unit_measurements_cases.test.ts** | `fixtures/unit_measurements_cases/` (prefix `20_`) | Value/unit as associations, numeric value types, unit expressions (synonyms, compound, Unicode), precision/uncertainty, nested measurements. |
| **round_trip_cases.test.ts** | `fixtures/round_trip_cases/` (prefix `2_`) | Parse validity, structural consistency (AST shape, keys, associations, references, metadata), equivalent forms (comma vs newline, whitespace, ref usage), invalid syntax. |
| **stress_cases.test.ts** | `fixtures/stress_cases/` (prefix `22_`) | Deep nesting, many siblings in value blocks, many pipe-separated expressions, long lines and large documents, Unicode stress, boundary conditions. |
| **fixtures.test.ts** | `fixtures/*.amorfs` (root) | High-level integration tests for specific documents (e.g. `business_card.amorfs`): validity, parse success, and expected AST content (concepts, associations, nested structure). |

## Fixture layout

- **Root:** `fixtures/` holds both subfolders (one per suite) and a few standalone `.amorfs` files used by `fixtures.test.ts`.
- **Per-suite:** Each suite (e.g. `identifiers.test.ts`) reads from `fixtures/<suite_name>/` (e.g. `fixtures/identifiers/`).
- **Naming:** Many fixture sets use numeric prefixes (`01_`, `03_`, … `22_`) matching the section numbers in the parser/grammar plans; filenames are `NN_*.amorfs`.

## Shared pattern

Suites typically:

1. Load fixture content with `readFileSync` from the suite’s fixture directory.
2. Use `parse()`, `isValid()`, and `parseOrThrow()` from `../src/index.js`.
3. Assert success/failure, AST shape (concepts, associations, expressions, metadata, references), and sometimes structural equivalence between equivalent inputs.

Plans that drove fixture design live under `.cursor/plans/` (e.g. `13_identifiers_*.plan.md`, `21_round_trip.plan.md`, `implicit_value_block_syntax_a455ba1a.plan.md`).
