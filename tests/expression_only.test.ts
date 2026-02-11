/**
 * Section 9 Expression-Only Concepts — fixture tests
 *
 * Covers: concept form with expressions but no value block; all expression types
 * (text, quoted, number, iri, datetime); multiple expressions with |; optional
 * metadata and @ref; multiple top-level expression-only; edge cases and mixed
 * documents. Implements plan .cursor/plans/09_expression_only_fdf691d2.plan.md
 *
 * Fixtures: tests/fixtures/expression_only/ with prefix 09_
 *
 * Grammar: Concept = ... | Expressions Metadata? conceptRef? -- expressionOnly.
 * Expression-only has one or more expressions, no value block; children: [].
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
	parse,
	isValid,
	parseOrThrow,
	type ConceptNode,
	type BaseConcept,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const expressionOnlyDir = join(__dirname, "fixtures", "expression_only");

function loadFixture(name: string): string {
	return readFileSync(join(expressionOnlyDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

function assertBaseConcept(
	concept: ConceptNode,
): asserts concept is BaseConcept {
	expect(concept.kind).toBe("base");
}

describe("Section 9 Expression-Only Concepts (09_)", () => {
	// -------------------------------------------------------------------------
	// 1. Minimal expression-only (single expression, no metadata, no ref)
	// -------------------------------------------------------------------------
	describe("1. Minimal expression-only (single expression, no metadata, no ref)", () => {
		it("09_01_single_unquoted_expression: minimal expression-only, one text expression", () => {
			const input = loadFixture(
				"09_01_single_unquoted_expression.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].value).toBe("greeting");
			expect(concept.expressions[0].type).toBe("text");
			expect(concept.children).toHaveLength(0);
			expect(concept.key).toBeNull();
			expect(concept.metadata).toBeNull();
		});

		it("09_02_single_text_multiple_words: single text expression with spaces", () => {
			const input = loadFixture(
				"09_02_single_text_multiple_words.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].value).toBe("New South Wales");
			expect(concept.children).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------------
	// 2. Single expression by type (expression-only form)
	// -------------------------------------------------------------------------
	describe("2. Single expression by type (expression-only form)", () => {
		it("09_03_single_quoted_expression: quoted string with brackets and pipe", () => {
			const input = loadFixture("09_03_single_quoted_expression.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].type).toBe("quoted");
			expect(concept.expressions[0].value).toBe(
				"label with [brackets] and | pipe",
			);
			expect(concept.children).toHaveLength(0);
		});

		it("09_04_single_numeric_expression: standalone number as expression", () => {
			const input = loadFixture("09_04_single_numeric_expression.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].type).toBe("number");
			expect(concept.expressions[0].value).toBe(42);
			expect(concept.children).toHaveLength(0);
		});

		it("09_05_single_negative_numeric: negative number as expression-only", () => {
			const input = loadFixture("09_05_single_negative_numeric.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].type).toBe("number");
			expect(concept.expressions[0].value).toBe(-17);
			expect(concept.children).toHaveLength(0);
		});

		it("09_06_single_iri_expression: IRI as expression-only", () => {
			const input = loadFixture("09_06_single_iri_expression.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].type).toBe("iri");
			expect(concept.expressions[0].value).toBe(
				"http://example.com/resource",
			);
			expect(concept.children).toHaveLength(0);
		});

		it("09_07_single_datetime_expression: full datetime with Z timezone", () => {
			const input = loadFixture(
				"09_07_single_datetime_expression.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].type).toBe("datetime");
			expect(concept.expressions[0].value).toBe("2024-03-15T14:30:00Z");
			expect(concept.children).toHaveLength(0);
		});

		it("09_08_date_only_parsed_as_text: YYYY-MM-DD without T parses as text", () => {
			const input = loadFixture("09_08_date_only_parsed_as_text.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].type).toBe("text");
			expect(concept.expressions[0].value).toBe("1985-03-22");
			expect(concept.children).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------------
	// 3. Multiple expressions (alternatives with |)
	// -------------------------------------------------------------------------
	describe("3. Multiple expressions (alternatives with |)", () => {
		it("09_09_two_expressions: two alternatives, order preserved", () => {
			const input = loadFixture("09_09_two_expressions.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(2);
			expect(concept.expressions[0].value).toBe("state");
			expect(concept.expressions[1].value).toBe("NSW");
			expect(concept.children).toHaveLength(0);
		});

		it("09_10_three_expressions: three alternatives, order and count preserved", () => {
			const input = loadFixture("09_10_three_expressions.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(3);
			expect(concept.expressions[0].value).toBe("a");
			expect(concept.expressions[1].value).toBe("b");
			expect(concept.expressions[2].value).toBe("c");
			expect(concept.children).toHaveLength(0);
		});

		it("09_11_multiple_with_per_expression_metadata: each alternative has language metadata", () => {
			const input = loadFixture(
				"09_11_multiple_with_per_expression_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(2);
			expect(concept.expressions[0].value).toBe("Hello");
			expect(
				concept.expressions[0].language === "en" ||
					concept.expressions[0].metadata?.language === "en",
			).toBe(true);
			expect(concept.expressions[1].value).toBe("Bonjour");
			expect(
				concept.expressions[1].language === "fr" ||
					concept.expressions[1].metadata?.language === "fr",
			).toBe(true);
			expect(concept.children).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------------
	// 4. Expression-only with concept-level metadata
	// -------------------------------------------------------------------------
	describe("4. Expression-only with concept-level metadata", () => {
		it("09_12_with_empty_metadata: trailing empty metadata block {}", () => {
			const input = loadFixture("09_12_with_empty_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].value).toBe("tag");
			expect(concept.children).toHaveLength(0);
			// Empty {} yields null per semantics (Section 11 plan)
			expect(concept.metadata).toBeNull();
		});

		it("09_13_with_language_metadata: trailing language code {en}", () => {
			const input = loadFixture("09_13_with_language_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions[0].value).toBe("title");
			const lang =
				concept.metadata?.language ??
				concept.expressions[0].metadata?.language ??
				concept.expressions[0].language;
			expect(lang).toBe("en");
			expect(concept.children).toHaveLength(0);
		});

		it("09_14_with_temporal_metadata: trailing temporal attribute", () => {
			const input = loadFixture("09_14_with_temporal_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions[0].value).toBe("event");
			const temporal =
				concept.metadata?.temporal ??
				concept.expressions[0].metadata?.temporal;
			expect(temporal).toBeDefined();
			expect(concept.children).toHaveLength(0);
		});

		it("09_15_with_confidence_metadata: trailing confidence ~0.95", () => {
			const input = loadFixture("09_15_with_confidence_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions[0].value).toBe("fact");
			const confidence =
				concept.metadata?.confidence ??
				concept.expressions[0].metadata?.confidence;
			expect(confidence).toBe(0.95);
			expect(concept.children).toHaveLength(0);
		});

		it("09_16_with_importance_metadata: trailing importance +2", () => {
			const input = loadFixture("09_16_with_importance_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions[0].value).toBe("priority");
			const importance =
				concept.metadata?.importance ??
				concept.expressions[0].metadata?.importance;
			expect(importance).toBe(2);
			expect(concept.children).toHaveLength(0);
		});

		it("09_17_with_custom_metadata: trailing key=value in metadata", () => {
			const input = loadFixture("09_17_with_custom_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions[0].value).toBe("tag");
			const custom =
				concept.metadata?.custom ??
				concept.expressions[0].metadata?.custom;
			expect(custom).toBeDefined();
			expect(custom!.source).toBe("manual");
			expect(concept.children).toHaveLength(0);
		});

		it("09_18_with_combined_metadata: language, temporal, confidence, importance", () => {
			const input = loadFixture("09_18_with_combined_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions[0].value).toBe("item");
			const meta = concept.metadata ?? concept.expressions[0].metadata;
			expect(meta).not.toBeNull();
			expect(meta!.language).toBe("en");
			expect(meta!.temporal).toBeDefined();
			expect(meta!.confidence).toBe(0.9);
			expect(meta!.importance).toBe(1);
			expect(concept.children).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------------
	// 5. Expression-only with concept reference (@ref)
	// -------------------------------------------------------------------------
	describe("5. Expression-only with concept reference (@ref)", () => {
		it("09_19_with_ref_only: trailing @identifier, reference registered", () => {
			const input = loadFixture("09_19_with_ref_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].value).toBe("my_concept");
			expect(concept.key).toBe("ref_name");
			expect(concept.children).toHaveLength(0);
			expect(ast.references["ref_name"]).toBeDefined();
			expect(ast.references["ref_name"]).toBe(concept);
		});

		it("09_20_with_metadata_and_ref: metadata then @ref, order preserved", () => {
			const input = loadFixture("09_20_with_metadata_and_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].value).toBe("label");
			const lang =
				concept.metadata?.language ??
				concept.expressions[0].metadata?.language ??
				concept.expressions[0].language;
			expect(lang).toBe("en");
			expect(concept.key).toBe("my_label");
			expect(ast.references["my_label"]).toBeDefined();
			expect(concept.children).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------------
	// 6. Multiple top-level expression-only concepts
	// -------------------------------------------------------------------------
	describe("6. Multiple top-level expression-only concepts", () => {
		it("09_21_two_top_level_expression_only: two lines, order preserved", () => {
			const input = loadFixture(
				"09_21_two_top_level_expression_only.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const first = ast.concepts[0];
			const second = ast.concepts[1];
			assertBaseConcept(first);
			assertBaseConcept(second);
			expect(first.expressions[0].value).toBe("first");
			expect(first.children).toHaveLength(0);
			expect(second.expressions[0].value).toBe("second");
			expect(second.children).toHaveLength(0);
		});

		it("09_22_three_top_level_expression_only: three concepts, count and order preserved", () => {
			const input = loadFixture(
				"09_22_three_top_level_expression_only.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(3);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("a");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("b");
			expect(getFirstExpressionValue(ast.concepts[2])).toBe("c");
			ast.concepts.forEach((c) => {
				assertBaseConcept(c);
				expect(c.expressions).toHaveLength(1);
				expect(c.children).toHaveLength(0);
			});
		});
	});

	// -------------------------------------------------------------------------
	// 7. Edge cases and mixed documents
	// -------------------------------------------------------------------------
	describe("7. Edge cases and mixed documents", () => {
		it("09_23_unicode_expression: non-ASCII in expression, no corruption", () => {
			const input = loadFixture("09_23_unicode_expression.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].value).toBe("温度");
			expect(concept.expressions[0].type).toBe("text");
			expect(concept.children).toHaveLength(0);
		});

		it("09_24_with_comments: comment lines before and after, one concept only", () => {
			const input = loadFixture("09_24_with_comments.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].value).toBe("thing");
			expect(concept.children).toHaveLength(0);
		});

		it("09_25_whitespace_variants: insignificant whitespace, single concept", () => {
			const input = loadFixture("09_25_whitespace_variants.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			assertBaseConcept(concept);
			expect(concept.expressions[0].value).toBe("label");
			expect(concept.children).toHaveLength(0);
		});

		it("09_26_expression_only_then_with_value: first expression-only, second with value block", () => {
			const input = loadFixture(
				"09_26_expression_only_then_with_value.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const first = ast.concepts[0];
			const second = ast.concepts[1];
			assertBaseConcept(first);
			assertBaseConcept(second);
			expect(first.expressions[0].value).toBe("greeting");
			expect(first.children).toHaveLength(0);
			expect(second.expressions[0].value).toBe("title");
			expect(second.children).toHaveLength(1);
			expect(getFirstExpressionValue(second.children[0])).toBe(
				"Hello World",
			);
		});

		it("09_27_with_value_then_expression_only: first with value block, second expression-only", () => {
			const input = loadFixture(
				"09_27_with_value_then_expression_only.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const first = ast.concepts[0];
			const second = ast.concepts[1];
			assertBaseConcept(first);
			assertBaseConcept(second);
			expect(first.children.length).toBeGreaterThanOrEqual(1);
			expect(getFirstExpressionValue(first.children[0])).toBe("Alice");
			expect(second.expressions[0].value).toBe("standalone");
			expect(second.children).toHaveLength(0);
		});

		it("09_28_decimal_scientific_expression: decimal and scientific number as expression-only", () => {
			const input = loadFixture(
				"09_28_decimal_scientific_expression.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const first = ast.concepts[0];
			const second = ast.concepts[1];
			assertBaseConcept(first);
			assertBaseConcept(second);
			expect(first.expressions[0].type).toBe("number");
			expect(first.expressions[0].value).toBe(3.14159);
			expect(first.children).toHaveLength(0);
			expect(second.expressions[0].type).toBe("number");
			expect(second.expressions[0].value).toBe(6.022e23);
			expect(second.children).toHaveLength(0);
		});
	});
});
