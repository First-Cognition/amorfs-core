/**
 * Section 5 Multiple Expressions — fixture tests
 *
 * Covers: synonyms, pipe-separated alternatives, per-expression metadata,
 * mixed types, whitespace variants, expression-only and value-block contexts,
 * edge cases, and invalid syntax. Implements plan
 * .cursor/plans/05_multiple_expression.plan.md.
 *
 * Fixtures: tests/fixtures/multiple_expressions/ with prefix 05_
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
	type AssociationConcept,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const multipleExpressionsDir = join(
	__dirname,
	"fixtures",
	"multiple_expressions",
);

function loadFixture(name: string): string {
	return readFileSync(join(multipleExpressionsDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

function getChildAsBase(
	concept: ConceptNode,
	index: number,
): BaseConcept | null {
	const child = concept.children[index];
	return child?.kind === "base" ? child : null;
}

/** First child base concept (for value-block value). */
function getValueBlockChild(concept: ConceptNode): BaseConcept | null {
	return getChildAsBase(concept, 0);
}

describe("Section 5 Multiple Expressions (05_)", () => {
	// -------------------------------------------------------------------------
	// 1. Two alternatives (synonyms)
	// -------------------------------------------------------------------------
	describe("1. Two alternatives (synonyms)", () => {
		it("05_01_two_text_synonyms: two expressions, order preserved", () => {
			const input = loadFixture("05_01_two_text_synonyms.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const top = ast.concepts[0];
			expect(top.kind).toBe("base");
			const child = getValueBlockChild(top);
			expect(child).not.toBeNull();
			expect(child!.kind).toBe("base");
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("NSW");
			expect(child!.expressions[1].value).toBe("New South Wales");
		});

		it("05_02_two_alternatives_no_space: no space around pipe", () => {
			const input = loadFixture("05_02_two_alternatives_no_space.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("A");
			expect(child!.expressions[1].value).toBe("B");
		});

		it("05_03_two_alternatives_spaced_pipe: space both sides of pipe", () => {
			const input = loadFixture(
				"05_03_two_alternatives_spaced_pipe.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("left");
			expect(child!.expressions[1].value).toBe("right");
		});
	});

	// -------------------------------------------------------------------------
	// 2. Three or more alternatives
	// -------------------------------------------------------------------------
	describe("2. Three or more alternatives", () => {
		it("05_04_three_alternatives: three synonyms in order", () => {
			const input = loadFixture("05_04_three_alternatives.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(3);
			expect(child!.expressions[0].value).toBe("Red");
			expect(child!.expressions[1].value).toBe("Crimson");
			expect(child!.expressions[2].value).toBe("Scarlet");
		});

		it("05_05_four_alternatives: four expressions in order", () => {
			const input = loadFixture("05_05_four_alternatives.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(4);
			expect(child!.expressions[0].value).toBe("Australia");
			expect(child!.expressions[1].value).toBe("AU");
			expect(child!.expressions[2].value).toBe("AUS");
			expect(child!.expressions[3].value).toBe("Oz");
		});

		it("05_06_many_alternatives: eight alternatives, no truncation", () => {
			const input = loadFixture("05_06_many_alternatives.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(8);
			["a", "b", "c", "d", "e", "f", "g", "h"].forEach((v, i) => {
				expect(child!.expressions[i].value).toBe(v);
			});
		});
	});

	// -------------------------------------------------------------------------
	// 3. Per-expression metadata
	// -------------------------------------------------------------------------
	describe("3. Per-expression metadata", () => {
		it("05_07_per_expression_language: each alternative has language", () => {
			const input = loadFixture("05_07_per_expression_language.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(3);
			expect(child!.expressions[0].value).toBe("Hello");
			expect(child!.expressions[0].language).toBe("en");
			expect(child!.expressions[1].value).toBe("Bonjour");
			expect(child!.expressions[1].language).toBe("fr");
			expect(child!.expressions[2].value).toBe("こんにちは");
			expect(child!.expressions[2].language).toBe("ja");
		});

		it("05_08_metadata_first_only: first has metadata, second none", () => {
			const input = loadFixture("05_08_metadata_first_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].language).toBe("en");
			expect(child!.expressions[1].language).toBeUndefined();
			expect(child!.expressions[1].metadata).toBeUndefined();
		});

		it("05_09_metadata_second_only: second has metadata, first none", () => {
			const input = loadFixture("05_09_metadata_second_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].language).toBeUndefined();
			expect(child!.expressions[1].value).toBe("rue");
			expect(child!.expressions[1].language).toBe("fr");
		});

		it("05_10_per_expression_mixed_metadata: lang, temporal, confidence", () => {
			const input = loadFixture(
				"05_10_per_expression_mixed_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(3);
			expect(child!.expressions[0].value).toBe("A");
			expect(child!.expressions[0].language).toBe("en");
			expect(child!.expressions[1].value).toBe("B");
			expect(child!.expressions[1].metadata?.temporal).toBeDefined();
			expect(child!.expressions[2].value).toBe("C");
			expect(child!.expressions[2].metadata?.confidence).toBe(0.9);
		});
	});

	// -------------------------------------------------------------------------
	// 4. Mixed expression types
	// -------------------------------------------------------------------------
	describe("4. Mixed expression types", () => {
		it("05_11_mixed_text_number: number and text", () => {
			const input = loadFixture("05_11_mixed_text_number.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].type).toBe("number");
			expect(child!.expressions[0].value).toBe(42);
			expect(child!.expressions[1].type).toBe("text");
			expect(child!.expressions[1].value).toBe("forty-two");
		});

		it("05_12_mixed_text_iri: text and IRI", () => {
			const input = loadFixture("05_12_mixed_text_iri.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].type).toBe("text");
			expect(child!.expressions[0].value).toBe("ABC123");
			expect(child!.expressions[1].type).toBe("iri");
			expect(child!.expressions[1].value).toBe(
				"https://example.com/id/abc123",
			);
		});

		it("05_13_mixed_text_quoted: text and quoted with pipe inside", () => {
			const input = loadFixture("05_13_mixed_text_quoted.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].type).toBe("text");
			expect(child!.expressions[0].value).toBe("plain");
			expect(child!.expressions[1].type).toBe("quoted");
			expect(child!.expressions[1].value).toBe("quoted with | pipe");
		});

		it("05_14_mixed_text_datetime: text and datetime", () => {
			const input = loadFixture("05_14_mixed_text_datetime.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].type).toBe("text");
			expect(child!.expressions[0].value).toBe("Meeting");
			expect(child!.expressions[1].type).toBe("datetime");
			expect(child!.expressions[1].value).toBe("2024-01-15T10:00:00Z");
		});

		it("05_15_mixed_multiple_types: five types in order", () => {
			const input = loadFixture("05_15_mixed_multiple_types.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(5);
			expect(child!.expressions[0].type).toBe("text");
			expect(child!.expressions[0].value).toBe("one");
			expect(child!.expressions[1].type).toBe("number");
			expect(child!.expressions[1].value).toBe(2);
			expect(child!.expressions[2].type).toBe("quoted");
			expect(child!.expressions[2].value).toBe("three");
			expect(child!.expressions[3].type).toBe("iri");
			expect(child!.expressions[3].value).toBe("http://example.com/four");
			expect(child!.expressions[4].type).toBe("datetime");
			expect(child!.expressions[4].value).toBe("2025-01-01T12:00:00Z");
		});
	});

	// -------------------------------------------------------------------------
	// 5. Whitespace and layout
	// -------------------------------------------------------------------------
	describe("5. Whitespace and layout", () => {
		it("05_16_newline_after_pipe: newline between pipe and second expr", () => {
			const input = loadFixture("05_16_newline_after_pipe.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("First");
			expect(child!.expressions[1].value).toBe("Second");
		});

		it("05_17_multiple_spaces_around_pipe: extra spaces", () => {
			const input = loadFixture(
				"05_17_multiple_spaces_around_pipe.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("a");
			expect(child!.expressions[1].value).toBe("b");
		});

		it("05_18_tab_around_pipe: tab as whitespace", () => {
			const input = loadFixture("05_18_tab_around_pipe.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("a");
			expect(child!.expressions[1].value).toBe("b");
		});
	});

	// -------------------------------------------------------------------------
	// 6. Pipe inside quoted string (literal)
	// -------------------------------------------------------------------------
	describe("6. Pipe inside quoted string", () => {
		it("05_19_quoted_contains_pipe: one quoted expression, pipe literal", () => {
			const input = loadFixture("05_19_quoted_contains_pipe.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(1);
			expect(child!.expressions[0].type).toBe("quoted");
			expect(child!.expressions[0].value).toBe("a | b");
		});

		it("05_20_two_quoted_alternatives: two quoted exprs, pipe outside", () => {
			const input = loadFixture("05_20_two_quoted_alternatives.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].type).toBe("quoted");
			expect(child!.expressions[0].value).toBe("x");
			expect(child!.expressions[1].type).toBe("quoted");
			expect(child!.expressions[1].value).toBe("y");
		});
	});

	// -------------------------------------------------------------------------
	// 7. Expression-only concept with multiple expressions
	// -------------------------------------------------------------------------
	describe("7. Expression-only with multiple expressions", () => {
		it("05_21_expression_only_two_alternatives: no value block, two exprs", () => {
			const input = loadFixture(
				"05_21_expression_only_two_alternatives.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.kind).toBe("base");
			expect(concept.expressions).toHaveLength(2);
			expect(concept.expressions[0].value).toBe("alias");
			expect(concept.expressions[1].value).toBe("alternate_name");
			expect(concept.children).toHaveLength(0);
		});

		it("05_22_expression_only_with_metadata: two exprs with language", () => {
			const input = loadFixture(
				"05_22_expression_only_with_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.expressions).toHaveLength(2);
			expect(concept.expressions[0].value).toBe("Hello");
			expect(concept.expressions[0].language).toBe("en");
			expect(concept.expressions[1].value).toBe("Bonjour");
			expect(concept.expressions[1].language).toBe("fr");
		});

		it("05_23_expression_only_with_ref: two exprs and @ref", () => {
			// Fixture uses metadata {en} before @my_ref so ref is parsed (not consumed as text)
			const input = loadFixture("05_23_expression_only_with_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.key).toBe("my_ref");
			expect(concept.expressions).toHaveLength(2);
			expect(concept.expressions[0].value).toBe("alias");
			expect(concept.expressions[1].value).toBe("alternate_name");
			expect(concept.expressions[1].language).toBe("en");
		});
	});

	// -------------------------------------------------------------------------
	// 8. Concept with value block and reference
	// -------------------------------------------------------------------------
	describe("8. Value block with reference", () => {
		it("05_24_value_block_with_ref: multiple exprs, value block, @ref", () => {
			const input = loadFixture("05_24_value_block_with_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.key).toBe("person");
			const child = getValueBlockChild(concept);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("John");
			expect(child!.expressions[1].value).toBe("Johnny");
		});
	});

	// -------------------------------------------------------------------------
	// 9. Nested and structural contexts
	// -------------------------------------------------------------------------
	describe("9. Nested and structural contexts", () => {
		it("05_25_nested_child_multiple_expressions: child has two exprs", () => {
			const input = loadFixture(
				"05_25_nested_child_multiple_expressions.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("state");
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("NSW");
			expect(child!.expressions[1].value).toBe("New South Wales");
		});

		it("05_26_nested_two_levels: innermost has multiple exprs", () => {
			const input = loadFixture("05_26_nested_two_levels.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("country");
			const australia = getValueBlockChild(ast.concepts[0]);
			expect(australia!.expressions[0].value).toBe("Australia");
			const codes = getValueBlockChild(australia!);
			expect(codes!.expressions).toHaveLength(2);
			expect(codes!.expressions[0].value).toBe("AU");
			expect(codes!.expressions[1].value).toBe("AUS");
		});

		it("05_27_value_block_mixed_item_with_alternatives: concept then association", () => {
			const input = loadFixture(
				"05_27_value_block_mixed_item_with_alternatives.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("person");
			const nameChild = ast.concepts[0].children[0] as BaseConcept;
			expect(nameChild.kind).toBe("base");
			expect(nameChild.expressions[0].value).toBe("name");
			// Value of "name" is a concept with two expressions (John | Johnny)
			const nameValue = getValueBlockChild(nameChild);
			expect(nameValue!.expressions).toHaveLength(2);
			expect(nameValue!.expressions[0].value).toBe("John");
			expect(nameValue!.expressions[1].value).toBe("Johnny");
			const secondChild = ast.concepts[0].children[1];
			expect(secondChild.kind).toBe("association");
			const roleTarget = (secondChild as AssociationConcept).children[0];
			expect(roleTarget.kind).toBe("base");
			// Association is - role [admin]; target concept is "role", its value is "admin"
			const adminValue = getValueBlockChild(roleTarget);
			expect(adminValue).not.toBeNull();
			expect(getFirstExpressionValue(adminValue!)).toBe("admin");
		});
	});

	// -------------------------------------------------------------------------
	// 10. Unicode and vocabulary-style
	// -------------------------------------------------------------------------
	describe("10. Unicode and vocabulary-style", () => {
		it("05_28_unicode_alternatives: non-ASCII in alternatives", () => {
			const input = loadFixture("05_28_unicode_alternatives.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("Sydney");
			expect(child!.expressions[1].value).toBe("シドニー");
		});

		it("05_29_unicode_with_language: Unicode with per-expression language", () => {
			const input = loadFixture("05_29_unicode_with_language.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("Sydney");
			expect(child!.expressions[1].value).toBe("シドニー");
			expect(child!.expressions[1].language).toBe("ja");
		});

		it("05_30_vocabulary_style: human term | vocabulary term", () => {
			const input = loadFixture("05_30_vocabulary_style.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("name");
			expect(child!.expressions[1].value).toBe("foaf:name");
		});
	});

	// -------------------------------------------------------------------------
	// 11. Edge cases (boundaries)
	// -------------------------------------------------------------------------
	describe("11. Edge cases", () => {
		it("05_31_single_expression_no_pipe: one expression, no pipe", () => {
			const input = loadFixture("05_31_single_expression_no_pipe.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(1);
			expect(child!.expressions[0].value).toBe("only");
		});

		it("05_32_duplicate_value_allowed: same value twice", () => {
			const input = loadFixture("05_32_duplicate_value_allowed.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("x");
			expect(child!.expressions[1].value).toBe("x");
		});

		it("05_33_long_alternative_values: no truncation", () => {
			const input = loadFixture("05_33_long_alternative_values.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const child = getValueBlockChild(ast.concepts[0]);
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("short");
			expect(child!.expressions[1].value).toBe(
				"This is a very long alternative value that could go on for many words to ensure the parser does not truncate or limit expression length in any way",
			);
		});
	});

	// -------------------------------------------------------------------------
	// 12. Invalid syntax (expect parse failure)
	// -------------------------------------------------------------------------
	describe("12. Invalid syntax", () => {
		it("05_34_invalid_trailing_pipe: parse fails", () => {
			const input = loadFixture("05_34_invalid_trailing_pipe.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeDefined();
			}
		});

		it("05_35_invalid_leading_pipe: parse fails", () => {
			const input = loadFixture("05_35_invalid_leading_pipe.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeDefined();
			}
		});

		it("05_36_invalid_consecutive_pipes: parse fails", () => {
			const input = loadFixture("05_36_invalid_consecutive_pipes.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeDefined();
			}
		});

		it("05_37_invalid_empty_block_pipe: parse fails or defined behavior", () => {
			const input = loadFixture("05_37_invalid_empty_block_pipe.amorfs");
			const result = parse(input);
			// Grammar may accept [ | ] as one concept with empty expressions or fail
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeDefined();
			}
		});
	});
});
