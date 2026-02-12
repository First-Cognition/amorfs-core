/**
 * Section 14 Grammar and Lexical Edge Cases — fixture tests
 *
 * Covers: structural delimiters in text vs quoted strings, delimiter vs
 * structuralDelimiter token boundaries, number lookahead, date vs datetime
 * branching, empty metadata block, quoted-string and IRI edge cases, and
 * boundary failure cases. Implements plan .cursor/plans/14_grammar_edge_cases_f32f3468.plan.md
 *
 * Fixtures: tests/fixtures/grammar_edge_cases/ with prefix 14_
 *
 * Grammar: structuralDelimiter = "[" | "]" | "{" | "}" | "|" | "@" | newline;
 * delimiter adds "<" | ">" | ","; number = "-"? digit+ ("." digit+)? exponent? &(space | delimiter | end);
 * ExpressionValue order: iri | quotedString | datetime | number | text.
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
	type ExpressionValue,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const grammarEdgeCasesDir = join(__dirname, "fixtures", "grammar_edge_cases");

function loadFixture(name: string): string {
	return readFileSync(join(grammarEdgeCasesDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

function getFirstExpression(concept: ConceptNode): ExpressionValue | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0];
}

function getFirstChildAsBase(concept: ConceptNode): BaseConcept | null {
	const child = concept.children[0];
	return child?.kind === "base" ? child : null;
}

describe("Section 14 Grammar and Lexical Edge Cases (14_)", () => {
	// -------------------------------------------------------------------------
	// 1. Structural delimiters in unquoted text (text ends at delimiter)
	// -------------------------------------------------------------------------
	describe("1. Structural delimiters in unquoted text", () => {
		it("14_01_text_ends_before_bracket_open: unquoted expression ends at [; [ starts value block", () => {
			const input = loadFixture("14_01_text_ends_before_bracket_open.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions).toHaveLength(1);
			expect(getFirstExpression(concept)?.value).toBe("label");
			expect(getFirstExpression(concept)?.type).toBe("text");
			expect(concept.children).toHaveLength(1);
		});

		it("14_02_text_ends_before_bracket_close: inner expression ends at ]; ] closes value block", () => {
			const input = loadFixture("14_02_text_ends_before_bracket_close.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner).not.toBeNull();
			expect(getFirstExpressionValue(inner!)).toBe("x");
			expect(getFirstExpression(inner!)?.type).toBe("text");
		});

		it("14_03_text_ends_before_brace_open: unquoted expression ends at {; { starts metadata", () => {
			const input = loadFixture("14_03_text_ends_before_brace_open.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(getFirstExpressionValue(concept)).toBe("term");
			expect(concept.expressions[0].metadata?.language).toBe("en");
			expect(concept.children).toHaveLength(1);
		});

		it("14_04_text_ends_before_brace_close: metadata content ends at }; no } in expression", () => {
			const input = loadFixture("14_04_text_ends_before_brace_close.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(getFirstExpressionValue(concept)).toBe("key");
			expect(concept.metadata?.language).toBe("en");
			const inner = getFirstChildAsBase(concept);
			expect(getFirstExpressionValue(inner!)).toBe("value");
		});

		it("14_05_text_ends_before_pipe: first expression ends at |; second is B; value block has one child", () => {
			const input = loadFixture("14_05_text_ends_before_pipe.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions).toHaveLength(2);
			expect(concept.expressions[0].value).toBe("A");
			expect(concept.expressions[1].value).toBe("B");
			expect(concept.children).toHaveLength(1);
		});

		it("14_06_text_ends_at_newline: newline is structural delimiter; expressions do not span lines", () => {
			const input = loadFixture("14_06_text_ends_at_newline.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("first");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("second");
			expect(getFirstChildAsBase(ast.concepts[0])?.expressions[0].value).toBe("a");
			expect(getFirstChildAsBase(ast.concepts[1])?.expressions[0].value).toBe("b");
		});

		it("14_07_delimiters_inside_quoted: quoted strings may contain [ ] { } | as literal content", () => {
			const input = loadFixture("14_07_delimiters_inside_quoted.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const formulaChild = getFirstChildAsBase(ast.concepts[0]);
			const metaChild = getFirstChildAsBase(ast.concepts[1]);
			expect(formulaChild?.expressions[0].value).toBe("x = [a + b] / 2");
			expect(formulaChild?.expressions[0].type).toBe("quoted");
			expect(metaChild?.expressions[0].value).toBe("{en} | {fr}");
			expect(metaChild?.expressions[0].type).toBe("quoted");
		});
	});

	// -------------------------------------------------------------------------
	// 2. Delimiter list (structuralDelimiter vs delimiter; token boundaries)
	// -------------------------------------------------------------------------
	describe("2. Delimiter list (structuralDelimiter vs delimiter)", () => {
		it("14_08_comma_in_unquoted_text: comma not in structuralDelimiter; a,b is single text expression", () => {
			const input = loadFixture("14_08_comma_in_unquoted_text.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].value).toBe("a,b");
			expect(concept.expressions[0].type).toBe("text");
			expect(concept.children).toHaveLength(1);
		});

		it("14_09_angle_brackets_in_text: < and > not in structuralDelimiter; a<b>c parsed as single text", () => {
			const input = loadFixture("14_09_angle_brackets_in_text.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner).not.toBeNull();
			expect(inner!.expressions).toHaveLength(1);
			expect(inner!.expressions[0].type).toBe("text");
			expect(inner!.expressions[0].value).toBe("a<b>c");
		});

		it("14_10_comma_item_separator: comma in value block separates items; three siblings (numbers so comma is delimiter)", () => {
			const input = loadFixture("14_10_comma_item_separator.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.children).toHaveLength(3);
			expect(getFirstExpression(concept.children[0])?.value).toBe(1);
			expect(getFirstExpression(concept.children[0])?.type).toBe("number");
			expect(getFirstExpression(concept.children[1])?.value).toBe(2);
			expect(getFirstExpression(concept.children[1])?.type).toBe("number");
			expect(getFirstExpression(concept.children[2])?.value).toBe(3);
			expect(getFirstExpression(concept.children[2])?.type).toBe("number");
		});

		it("14_11_space_before_delimiter: space between expression and [; expression value has no trailing space", () => {
			const input = loadFixture("14_11_space_before_delimiter.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions[0].value).toBe("word");
			expect(concept.expressions[0].type).toBe("text");
		});
	});

	// -------------------------------------------------------------------------
	// 3. Numbers and lookahead
	// -------------------------------------------------------------------------
	describe("3. Numbers and lookahead", () => {
		it("14_12_number_followed_by_space: number 42 followed by space; lookahead accepts number", () => {
			const input = loadFixture("14_12_number_followed_by_space.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].value).toBe(42);
			expect(inner?.expressions[0].type).toBe("number");
		});

		it("14_13_number_followed_by_bracket_close: number 42 at end of value block; lookahead sees ]", () => {
			const input = loadFixture("14_13_number_followed_by_bracket_close.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].value).toBe(42);
			expect(inner?.expressions[0].type).toBe("number");
		});

		it("14_14_number_followed_by_comma: two numbers 42 and 17; comma as item separator", () => {
			const input = loadFixture("14_14_number_followed_by_comma.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.children).toHaveLength(2);
			expect(getFirstExpression(concept.children[0])?.value).toBe(42);
			expect(getFirstExpression(concept.children[0])?.type).toBe("number");
			expect(getFirstExpression(concept.children[1])?.value).toBe(17);
			expect(getFirstExpression(concept.children[1])?.type).toBe("number");
		});

		it("14_15_number_followed_by_newline: number at end of line; lookahead sees newline", () => {
			const input = loadFixture("14_15_number_followed_by_newline.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const firstInner = getFirstChildAsBase(ast.concepts[0]);
			const secondInner = getFirstChildAsBase(ast.concepts[1]);
			expect(firstInner?.expressions[0].value).toBe(42);
			expect(firstInner?.expressions[0].type).toBe("number");
			expect(secondInner?.expressions[0].value).toBe(1);
			expect(secondInner?.expressions[0].type).toBe("number");
		});

		it("14_16_digits_then_letters_text: 42abc not followed by space/delimiter; parsed as text", () => {
			const input = loadFixture("14_16_digits_then_letters_text.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].value).toBe("42abc");
			expect(inner?.expressions[0].type).toBe("text");
		});

		it("14_17_negative_number_lookahead: -10 with space after; parsed as number", () => {
			const input = loadFixture("14_17_negative_number_lookahead.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].value).toBe(-10);
			expect(inner?.expressions[0].type).toBe("number");
		});

		it("14_18_scientific_lookahead: 1.5e-10 followed by space; parsed as number", () => {
			const input = loadFixture("14_18_scientific_lookahead.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].type).toBe("number");
			expect(inner?.expressions[0].value).toBeCloseTo(1.5e-10);
		});

		it("14_19_number_at_end: expression-only concept with single numeric expression; number followed by end", () => {
			const input = loadFixture("14_19_number_at_end.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].value).toBe(42);
			expect(concept.expressions[0].type).toBe("number");
			expect(concept.children).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------------
	// 4. Date vs datetime
	// -------------------------------------------------------------------------
	describe("4. Date vs datetime", () => {
		it("14_20_date_only_metadata: metadata temporal with date only (YYYY-MM-DD)", () => {
			const input = loadFixture("14_20_date_only_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.metadata?.temporal?.start).toBe("2024-03-15");
		});

		it("14_21_datetime_metadata: metadata temporal with full datetime and timezone", () => {
			const input = loadFixture("14_21_datetime_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.metadata?.temporal?.start).toBe("2024-03-15T14:30:00Z");
		});

		it("14_22_date_only_expression_as_text: date-only in expression position parsed as text", () => {
			const input = loadFixture("14_22_date_only_expression_as_text.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].value).toBe("2024-03-15");
			expect(inner?.expressions[0].type).toBe("text");
		});

		it("14_23_datetime_expression: full datetime in expression; type datetime", () => {
			const input = loadFixture("14_23_datetime_expression.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].value).toBe("2024-03-15T14:30:00Z");
			expect(inner?.expressions[0].type).toBe("datetime");
		});

		it("14_24_temporal_range_metadata: temporal range start/end in metadata", () => {
			const input = loadFixture("14_24_temporal_range_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
			expect(concept.metadata?.temporal?.end).toBe("2024-12-31");
		});
	});

	// -------------------------------------------------------------------------
	// 5. Empty metadata block
	// -------------------------------------------------------------------------
	describe("5. Empty metadata block", () => {
		it("14_25_empty_metadata_block: {} is valid; concept has metadata null, no parse error", () => {
			const input = loadFixture("14_25_empty_metadata_block.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.metadata).toBeNull();
		});
	});

	// -------------------------------------------------------------------------
	// 6. Quoted string edge cases
	// -------------------------------------------------------------------------
	describe("6. Quoted string edge cases", () => {
		it("14_26_empty_quoted_string: empty string between quotes; type quoted, value ''", () => {
			const input = loadFixture("14_26_empty_quoted_string.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].value).toBe("");
			expect(inner?.expressions[0].type).toBe("quoted");
		});

		it("14_27_escaped_quote_in_quoted: backslash-escape for \"; value unescaped", () => {
			const input = loadFixture("14_27_escaped_quote_in_quoted.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].value).toBe('He said "hi"');
			expect(inner?.expressions[0].type).toBe("quoted");
		});

		it("14_28_escaped_backslash_in_quoted: \\\\ becomes single \\ in value", () => {
			const input = loadFixture("14_28_escaped_backslash_in_quoted.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].value).toBe("C:\\Users\\x");
			expect(inner?.expressions[0].type).toBe("quoted");
		});

		it("14_29_newline_inside_quoted: newline allowed inside quoted string", () => {
			const input = loadFixture("14_29_newline_inside_quoted.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].value).toContain("line1");
			expect(inner?.expressions[0].value).toContain("line2");
			expect(String(inner?.expressions[0].value)).toMatch(/\n/);
			expect(inner?.expressions[0].type).toBe("quoted");
		});
	});

	// -------------------------------------------------------------------------
	// 7. IRI edge cases
	// -------------------------------------------------------------------------
	describe("7. IRI edge cases", () => {
		it("14_30_iri_with_internal_space: IRI content may contain spaces; preserved", () => {
			const input = loadFixture("14_30_iri_with_internal_space.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].type).toBe("iri");
			expect(inner?.expressions[0].value).toBe("http://example.com/with space");
		});

		it("14_31_iri_empty_content: <> with nothing between; type iri, value ''", () => {
			const input = loadFixture("14_31_iri_empty_content.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].type).toBe("iri");
			expect(inner?.expressions[0].value).toBe("");
		});
	});

	// -------------------------------------------------------------------------
	// 8. Boundary / invalid cases (must fail or defined behavior)
	// -------------------------------------------------------------------------
	describe("8. Boundary / invalid cases", () => {
		it("14_32_invalid_unclosed_quoted: missing closing \"; parse fails (no ] so value block and quote both unclosed)", () => {
			const input = loadFixture("14_32_invalid_unclosed_quoted.amorfs");
			expect(isValid(input)).toBe(false);
			const result = parse(input);
			expect(result.success).toBe(false);
		});

		it("14_33_invalid_unclosed_metadata: missing closing }; parse fails", () => {
			const input = loadFixture("14_33_invalid_unclosed_metadata.amorfs");
			expect(isValid(input)).toBe(false);
			const result = parse(input);
			expect(result.success).toBe(false);
		});

		it("14_34_invalid_unclosed_value_block: missing closing ]; parse fails", () => {
			const input = loadFixture("14_34_invalid_unclosed_value_block.amorfs");
			expect(isValid(input)).toBe(false);
			const result = parse(input);
			expect(result.success).toBe(false);
		});

		it("14_35_invalid_double_decimal: 1.2.3 not valid number; parsed as text", () => {
			const input = loadFixture("14_35_invalid_double_decimal.amorfs");
			// Grammar number rule does not allow two dots; falls through to text
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const inner = getFirstChildAsBase(ast.concepts[0]);
			expect(inner?.expressions[0].type).toBe("text");
			expect(inner?.expressions[0].value).toBe("1.2.3");
		});
	});
});
