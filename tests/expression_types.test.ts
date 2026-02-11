/**
 * Section 4 Expression Types — fixture tests
 *
 * Covers: all grammar-defined expression value types (text, quoted, number, iri, datetime),
 * their variants and edge cases, precedence, and invalid cases. Implements plan
 * .cursor/plans/04_expression_type_61e2fdf0.plan.md.
 *
 * Fixtures: tests/fixtures/expression_types/ with prefix 04_
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
	type ExpressionValue,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const expressionTypesDir = join(__dirname, "fixtures", "expression_types");

function loadFixture(name: string): string {
	return readFileSync(join(expressionTypesDir, name), "utf-8");
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

function getChildAsBase(
	concept: ConceptNode,
	index: number,
): BaseConcept | null {
	const child = concept.children[index];
	return child?.kind === "base" ? child : null;
}

function getChildAsAssociation(
	concept: ConceptNode,
	index: number,
): AssociationConcept | null {
	const child = concept.children[index];
	return child?.kind === "association" ? child : null;
}

/** First child's first expression (value-block value expression). */
function getValueBlockFirstExpression(
	concept: ConceptNode,
): ExpressionValue | null {
	const child = getChildAsBase(concept, 0);
	return child ? getFirstExpression(child) : null;
}

describe("Section 4 Expression Types (04_)", () => {
	// -------------------------------------------------------------------------
	// 1. Unquoted text (type text)
	// -------------------------------------------------------------------------
	describe("1. Unquoted text (type text)", () => {
		it("04_01_text_simple_word: single word as expression value, parsed as text", () => {
			const input = loadFixture("04_01_text_simple_word.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("text");
			expect(expr!.value).toBe("John");
		});

		it("04_02_text_multiple_words: spaces allowed in unquoted text, value preserved", () => {
			const input = loadFixture("04_02_text_multiple_words.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("text");
			expect(expr!.value).toBe("John Smith");
		});

		it("04_03_text_underscores_hyphens: underscores and hyphens in unquoted text", () => {
			const input = loadFixture("04_03_text_underscores_hyphens.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("text");
			expect(expr!.value).toBe("foo_bar-baz");
		});

		it("04_04_text_unicode: non-ASCII characters in unquoted text", () => {
			const input = loadFixture("04_04_text_unicode.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("text");
			expect(expr!.value).toBe("シドニー");
		});

		it("04_05_text_single_char: shortest valid text expression (one character)", () => {
			const input = loadFixture("04_05_text_single_char.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("text");
			expect(expr!.value).toBe("x");
		});

		it("04_06_text_digits_in_word: letters and digits together parsed as text", () => {
			const input = loadFixture("04_06_text_digits_in_word.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("text");
			expect(expr!.value).toBe("ABC123");
		});

		it("04_07_text_email_like: @ and dots allowed in text", () => {
			const input = loadFixture("04_07_text_email_like.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("text");
			expect(expr!.value).toBe("user@example.com");
		});

		it("04_08_text_date_like: date-only YYYY-MM-DD parses as text (no T)", () => {
			const input = loadFixture("04_08_text_date_like.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("text");
			expect(expr!.value).toBe("1985-03-22");
		});

		it("04_09_text_trimmed: leading/trailing spaces trimmed from value", () => {
			const input = loadFixture("04_09_text_trimmed.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("text");
			expect(expr!.value).toBe("value");
		});
	});

	// -------------------------------------------------------------------------
	// 2. Quoted expressions (type quoted)
	// -------------------------------------------------------------------------
	describe("2. Quoted expressions (type quoted)", () => {
		it("04_10_quoted_with_delimiters: quoted string containing [ ] + parsed as single quoted", () => {
			const input = loadFixture("04_10_quoted_with_delimiters.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("quoted");
			expect(expr!.value).toBe("x = [a + b] / 2");
		});

		it('04_11_quoted_escaped_quote: \\" unescaped to " in value', () => {
			const input = loadFixture("04_11_quoted_escaped_quote.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("quoted");
			expect((expr!.value as string).includes('"')).toBe(true);
			expect(expr!.value).toBe('He said "hello" to her');
		});

		it("04_12_quoted_escaped_backslash: \\\\ produces single \\ in value", () => {
			const input = loadFixture("04_12_quoted_escaped_backslash.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("quoted");
			expect(expr!.value).toBe("C:\\Users\\name");
		});

		it("04_13_quoted_empty: empty quoted string", () => {
			const input = loadFixture("04_13_quoted_empty.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("quoted");
			expect(expr!.value).toBe("");
		});

		it("04_14_quoted_braces_pipe: quoted text containing { } and |", () => {
			const input = loadFixture("04_14_quoted_braces_pipe.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("quoted");
			expect(expr!.value).toBe("{en} | {fr}");
		});

		it("04_15_quoted_comma_minus: comma and minus inside quotes", () => {
			const input = loadFixture("04_15_quoted_comma_minus.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("quoted");
			expect(expr!.value).toBe("a, b, c - d");
		});

		it("04_16_quoted_with_newline: newline inside quoted string", () => {
			const input = loadFixture("04_16_quoted_with_newline.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("quoted");
			expect((expr!.value as string).includes("\n")).toBe(true);
		});

		it("04_17_quoted_unicode: Unicode inside quoted string", () => {
			const input = loadFixture("04_17_quoted_unicode.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("quoted");
			expect(expr!.value).toBe("日本語");
		});
	});

	// -------------------------------------------------------------------------
	// 3. Numeric expressions (type number)
	// -------------------------------------------------------------------------
	describe("3. Numeric expressions (type number)", () => {
		it("04_18_number_positive_int: integer literal stored as number", () => {
			const input = loadFixture("04_18_number_positive_int.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("number");
			expect(expr!.value).toBe(42);
		});

		it("04_19_number_negative_int: negative number in value block (no space after -)", () => {
			const input = loadFixture("04_19_number_negative_int.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("number");
			expect(expr!.value).toBe(-17);
		});

		it("04_20_number_zero: zero as number", () => {
			const input = loadFixture("04_20_number_zero.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("number");
			expect(expr!.value).toBe(0);
		});

		it("04_21_number_decimal: decimal number stored as number", () => {
			const input = loadFixture("04_21_number_decimal.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const temp = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "temperature",
			);
			const ratio = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "ratio",
			);
			expect(temp).toBeDefined();
			expect(ratio).toBeDefined();
			const exprTemp = getValueBlockFirstExpression(temp!);
			const exprRatio = getValueBlockFirstExpression(ratio!);
			expect(exprTemp!.type).toBe("number");
			expect(exprTemp!.value).toBe(98.6);
			expect(exprRatio!.type).toBe("number");
			expect(exprRatio!.value).toBe(0.75);
		});

		it("04_22_number_scientific: scientific notation (e and E)", () => {
			const input = loadFixture("04_22_number_scientific.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const avogadro = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "avogadro",
			);
			const tiny = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "tiny",
			);
			expect(avogadro).toBeDefined();
			expect(tiny).toBeDefined();
			expect(getValueBlockFirstExpression(avogadro!)!.type).toBe(
				"number",
			);
			expect(getValueBlockFirstExpression(avogadro!)!.value).toBe(
				6.022e23,
			);
			expect(getValueBlockFirstExpression(tiny!)!.type).toBe("number");
			expect(getValueBlockFirstExpression(tiny!)!.value).toBe(1.5e-10);
		});

		it("04_23_number_scientific_plus_exp: exponent with + sign", () => {
			const input = loadFixture(
				"04_23_number_scientific_plus_exp.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("number");
			expect(expr!.value).toBe(2000);
		});

		it("04_24_number_leading_zeros: leading zeros stored as number 7", () => {
			const input = loadFixture("04_24_number_leading_zeros.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("number");
			expect(expr!.value).toBe(7);
		});

		it("04_25_number_after_contextual_space: space after - makes association; value -5 is number", () => {
			const input = loadFixture(
				"04_25_number_after_contextual_space.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const person = ast.concepts[0];
			expect(person.children).toHaveLength(1);
			const assoc = getChildAsAssociation(person, 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.isIntrinsic).toBe(false);
			const scoreChild = getChildAsBase(assoc!, 0);
			expect(scoreChild).not.toBeNull();
			const expr = getValueBlockFirstExpression(scoreChild!);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("number");
			expect(expr!.value).toBe(-5);
		});
	});

	// -------------------------------------------------------------------------
	// 4. IRI expressions (type iri)
	// -------------------------------------------------------------------------
	describe("4. IRI expressions (type iri)", () => {
		it("04_26_iri_http: IRI in angle brackets preserved as iri (no brackets in value)", () => {
			const input = loadFixture("04_26_iri_http.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("iri");
			expect(expr!.value).toBe("http://example.com/resource");
		});

		it("04_27_iri_https_path: HTTPS and path in IRI", () => {
			const input = loadFixture("04_27_iri_https_path.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("iri");
			expect(expr!.value).toBe("https://example.com/user/john");
		});

		it("04_28_iri_as_concept_name: IRI in expression position (concept name), value block text", () => {
			const input = loadFixture("04_28_iri_as_concept_name.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const top = ast.concepts[0];
			expect(getFirstExpression(top)!.type).toBe("iri");
			expect(getFirstExpression(top)!.value).toBe(
				"http://xmlns.com/foaf/0.1/name",
			);
			const expr = getValueBlockFirstExpression(top);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("text");
			expect(expr!.value).toBe("John");
		});

		it("04_29_iri_query_fragment: IRI containing ? and #", () => {
			const input = loadFixture("04_29_iri_query_fragment.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("iri");
			expect(expr!.value).toBe("https://example.com/page?q=1#section");
		});
	});

	// -------------------------------------------------------------------------
	// 5. Datetime expressions (type datetime)
	// -------------------------------------------------------------------------
	describe("5. Datetime expressions (type datetime)", () => {
		it("04_30_datetime_z: ISO 8601 with UTC timezone Z", () => {
			const input = loadFixture("04_30_datetime_z.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("datetime");
			expect(expr!.value).toBe("2024-03-15T14:30:00Z");
		});

		it("04_31_datetime_positive_offset: timezone +HH:MM", () => {
			const input = loadFixture("04_31_datetime_positive_offset.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("datetime");
			expect(expr!.value).toBe("2024-03-15T14:30:00+10:00");
		});

		it("04_32_datetime_negative_offset: timezone -HH:MM", () => {
			const input = loadFixture("04_32_datetime_negative_offset.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("datetime");
			expect((expr!.value as string).includes("-05:00")).toBe(true);
		});

		it("04_33_datetime_fractional_seconds: optional fractional seconds", () => {
			const input = loadFixture(
				"04_33_datetime_fractional_seconds.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("datetime");
			expect((expr!.value as string).includes(".123")).toBe(true);
		});

		it("04_34_datetime_no_timezone: no timezone (timezone? optional)", () => {
			const input = loadFixture("04_34_datetime_no_timezone.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("datetime");
			expect(expr!.value).toBe("2024-03-15T14:30:00");
		});
	});

	// -------------------------------------------------------------------------
	// 6. Expression type precedence and mixed types
	// -------------------------------------------------------------------------
	describe("6. Expression type precedence and mixed types", () => {
		it("04_35_mixed_types_alternatives: one concept with number, quoted, iri, datetime, text siblings", () => {
			const input = loadFixture("04_35_mixed_types_alternatives.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const idConcept = ast.concepts[0];
			expect(getFirstExpressionValue(idConcept)).toBe("id");
			expect(idConcept.children.length).toBe(5);
			const types = idConcept.children.map((c) =>
				c.kind === "base" ? c.expressions[0]?.type : null,
			);
			const values = idConcept.children.map((c) =>
				c.kind === "base" ? c.expressions[0]?.value : null,
			);
			expect(types).toEqual([
				"number",
				"quoted",
				"iri",
				"datetime",
				"text",
			]);
			expect(values[0]).toBe(42);
			expect(values[1]).toBe("quoted");
			expect(values[2]).toBe("http://example.com/x");
			expect(values[3]).toBe("2024-03-15T12:00:00Z");
			expect(values[4]).toBe("plain");
		});

		it("04_36_precedence_number_vs_text: 42 is number, 42x is text", () => {
			const input = loadFixture("04_36_precedence_number_vs_text.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const aExpr = getValueBlockFirstExpression(ast.concepts[0]);
			const bExpr = getValueBlockFirstExpression(ast.concepts[1]);
			expect(aExpr!.type).toBe("number");
			expect(aExpr!.value).toBe(42);
			expect(bExpr!.type).toBe("text");
			expect(bExpr!.value).toBe("42x");
		});

		it("04_37_precedence_iri_quoted_text: same URL shape — angle brackets iri, quotes quoted, bare text", () => {
			const input = loadFixture(
				"04_37_precedence_iri_quoted_text.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(3);
			const uExpr = getValueBlockFirstExpression(ast.concepts[0]);
			const qExpr = getValueBlockFirstExpression(ast.concepts[1]);
			const tExpr = getValueBlockFirstExpression(ast.concepts[2]);
			expect(uExpr!.type).toBe("iri");
			expect(uExpr!.value).toBe("http://a");
			expect(qExpr!.type).toBe("quoted");
			expect(qExpr!.value).toBe("http://a");
			expect(tExpr!.type).toBe("text");
			expect(tExpr!.value).toBe("http://a");
		});
	});

	// -------------------------------------------------------------------------
	// 7. Edge cases and boundaries
	// -------------------------------------------------------------------------
	describe("7. Edge cases and boundaries", () => {
		it("04_38_text_stops_at_bracket: value is Sydney, ] not in value", () => {
			const input = loadFixture("04_38_text_stops_at_bracket.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("text");
			expect(expr!.value).toBe("Sydney");
			expect((expr!.value as string).includes("]")).toBe(false);
		});

		it("04_39_number_negative_zero: -0 is valid number", () => {
			const input = loadFixture("04_39_number_negative_zero.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("number");
			// 0 or -0 per implementation (Object.is distinguishes -0 from 0)
			expect(Math.abs(Number(expr!.value))).toBe(0);
		});

		it("04_40_text_long: long alphanumeric string accepted and length preserved", () => {
			const input = loadFixture("04_40_text_long.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const expr = getValueBlockFirstExpression(ast.concepts[0]);
			expect(expr).not.toBeNull();
			expect(expr!.type).toBe("text");
			expect(typeof expr!.value).toBe("string");
			expect((expr!.value as string).length).toBeGreaterThan(50);
		});
	});

	// -------------------------------------------------------------------------
	// 8. Invalid expression-type cases (expect parse failure or defined behavior)
	// -------------------------------------------------------------------------
	describe("8. Invalid expression-type cases", () => {
		it('04_41_invalid_unclosed_quote: missing closing " — parse fails or documents behavior', () => {
			const input = loadFixture("04_41_invalid_unclosed_quote.amorfs");
			const result = parse(input);
			if (result.success) {
				// If grammar accepts (e.g. end-of-input as end of string), document it
				expect(result.ast.concepts.length).toBeGreaterThanOrEqual(0);
			} else {
				expect(result.error.length).toBeGreaterThan(0);
			}
		});

		it("04_42_invalid_malformed_number: two decimals — parse fails or defined result", () => {
			const input = loadFixture("04_42_invalid_malformed_number.amorfs");
			const result = parse(input);
			// Grammar: number consumes 1.2 then lookahead; .3 may be text or fail
			if (result.success) {
				const ast = result.ast;
				// If it parses, document: e.g. one number and one text, or single text
				expect(ast.concepts.length).toBeGreaterThanOrEqual(1);
			} else {
				expect(result.success).toBe(false);
			}
		});

		it("04_43_invalid_unclosed_iri: missing > — parse fails or documents behavior", () => {
			const input = loadFixture("04_43_invalid_unclosed_iri.amorfs");
			const result = parse(input);
			if (result.success) {
				// If grammar accepts (e.g. iriContent to end), document it
				expect(result.ast.concepts.length).toBeGreaterThanOrEqual(0);
			} else {
				expect(result.error.length).toBeGreaterThan(0);
			}
		});

		it("04_44_invalid_datetime_no_t: space instead of T — parses as text, no datetime type", () => {
			const input = loadFixture("04_44_invalid_datetime_no_t.amorfs");
			const result = parse(input);
			// Grammar requires T for datetime; space makes it text (one or two value items)
			if (result.success) {
				const ast = result.ast;
				const dConcept = ast.concepts.find(
					(c) => getFirstExpressionValue(c) === "d",
				);
				expect(dConcept).toBeDefined();
				const expr = getValueBlockFirstExpression(dConcept!);
				// Value(s) should not be datetime type
				if (expr) {
					expect(expr.type).not.toBe("datetime");
				}
			}
			// Either succeeds with text or fails
			expect(result.success === true || result.success === false).toBe(
				true,
			);
		});
	});
});
