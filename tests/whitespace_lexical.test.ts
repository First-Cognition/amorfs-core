/**
 * Section 12 Whitespace and Lexical — fixture tests
 *
 * Covers: required space after +/-, insignificant whitespace, UTF-8/Unicode,
 * newline variants (\n, \r\n, \r), lexical edge cases, and invalid must-fail
 * cases. Implements plan .cursor/plans/12_whitespace_lexical.plan.md
 *
 * Fixtures: tests/fixtures/whitespace_lexical/ with prefix 12_
 *
 * Grammar: associationOp = ("+" | "-") space+; space := " " | "\t";
 * newline = "\r\n" | "\n" | "\r"; ws = space | newline
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
const whitespaceLexicalDir = join(__dirname, "fixtures", "whitespace_lexical");

function loadFixture(name: string): string {
	return readFileSync(join(whitespaceLexicalDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

function getChildAsAssociation(
	concept: ConceptNode,
	index: number,
): AssociationConcept | null {
	const child = concept.children[index];
	return child?.kind === "association" ? child : null;
}

function getChildAsBase(
	concept: ConceptNode,
	index: number,
): BaseConcept | null {
	const child = concept.children[index];
	return child?.kind === "base" ? child : null;
}

describe("Section 12 Whitespace and Lexical (12_)", () => {
	// -------------------------------------------------------------------------
	// 1. Required space after + and - (association operators)
	// -------------------------------------------------------------------------
	describe("1. Required space after + and - (association operators)", () => {
		it("12_01_plus_no_space_fail: + immediately followed by token, no space — parse fails", () => {
			const input = loadFixture("12_01_plus_no_space_fail.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});

		it("12_02_minus_no_space_fail: - immediately followed by token, no space — parse fails", () => {
			const input = loadFixture("12_02_minus_no_space_fail.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});

		it("12_03_plus_single_space: one space after +, intrinsic association — parse succeeds", () => {
			const input = loadFixture("12_03_plus_single_space.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.isIntrinsic).toBe(true);
		});

		it("12_04_minus_single_space: one space after -, contextual association — parse succeeds", () => {
			const input = loadFixture("12_04_minus_single_space.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.isIntrinsic).toBe(false);
		});

		it("12_05_plus_multiple_spaces: two or more spaces after + — parse succeeds", () => {
			const input = loadFixture("12_05_plus_multiple_spaces.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.isIntrinsic).toBe(true);
		});

		it("12_06_minus_tab: tab after - counts as space — parse succeeds", () => {
			const input = loadFixture("12_06_minus_tab.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.isIntrinsic).toBe(false);
		});

		it("12_07_negative_number_not_association: -42 in expression, not contextual association — parse succeeds", () => {
			const input = loadFixture(
				"12_07_negative_number_not_association.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const child = getChildAsBase(ast.concepts[0], 0);
			expect(child).not.toBeNull();
			expect(getFirstExpressionValue(child!)).toBe(-10);
		});
	});

	// -------------------------------------------------------------------------
	// 2. Insignificant whitespace (parse succeeds, AST equivalent)
	// -------------------------------------------------------------------------
	describe("2. Insignificant whitespace (parse succeeds, AST equivalent)", () => {
		it("12_08_spaces_before_value_block: multiple spaces between expression and [ — parse succeeds", () => {
			const input = loadFixture("12_08_spaces_before_value_block.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("name");
			const child = getChildAsBase(ast.concepts[0], 0);
			expect(child).not.toBeNull();
			expect(getFirstExpressionValue(child!)).toBe("John");
		});

		it("12_09_newlines_between_concepts: one or more newlines between top-level concepts — parse succeeds", () => {
			const input = loadFixture("12_09_newlines_between_concepts.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("a");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("b");
		});

		it("12_10_spaces_around_pipe: spaces before and after | in expressions — parse succeeds", () => {
			const input = loadFixture("12_10_spaces_around_pipe.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const child = getChildAsBase(ast.concepts[0], 0) as BaseConcept;
			expect(child).not.toBeNull();
			expect(child.expressions).toHaveLength(2);
			expect(child.expressions[0].value).toBe("NSW");
			expect(child.expressions[1].value).toBe("New South Wales");
		});

		it("12_11_ws_inside_value_block: spaces and newlines around items and commas — parse succeeds", () => {
			const input = loadFixture("12_11_ws_inside_value_block.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].children).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0].children[0] as BaseConcept)).toBe("a");
			expect(getFirstExpressionValue(ast.concepts[0].children[1] as BaseConcept)).toBe("b");
		});

		it("12_12_ws_inside_metadata: spaces inside metadata block — parse succeeds", () => {
			const input = loadFixture("12_12_ws_inside_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].metadata).not.toBeNull();
			expect(ast.concepts[0].metadata!.language).toBe("en");
			expect(ast.concepts[0].metadata!.confidence).toBe(0.9);
		});

		it("12_13_leading_trailing_document_ws: leading and trailing document whitespace — parse succeeds", () => {
			const input = loadFixture(
				"12_13_leading_trailing_document_ws.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("name");
		});

		it("12_14_newline_as_item_sep: newline separates value block items without comma — parse succeeds", () => {
			const input = loadFixture("12_14_newline_as_item_sep.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].children).toHaveLength(3);
		});

		it("12_15_empty_value_block_ws: empty value block with only spaces inside [] — parse succeeds", () => {
			const input = loadFixture("12_15_empty_value_block_ws.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].children).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------------
	// 3. UTF-8 and Unicode
	// -------------------------------------------------------------------------
	describe("3. UTF-8 and Unicode", () => {
		it("12_16_unicode_unquoted: non-ASCII in unquoted expression — parse succeeds, value preserved", () => {
			const input = loadFixture("12_16_unicode_unquoted.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const child = getChildAsBase(ast.concepts[0], 0);
			expect(child).not.toBeNull();
			expect(getFirstExpressionValue(child!)).toBe("Sydney シドニー");
		});

		it("12_17_unicode_quoted: Unicode inside quoted string — parse succeeds, value intact", () => {
			const input = loadFixture("12_17_unicode_quoted.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const child = getChildAsBase(ast.concepts[0], 0);
			expect(child).not.toBeNull();
			expect((child as BaseConcept).expressions[0].value).toBe(
				"Café résumé — 日本語",
			);
		});

		it("12_18_unicode_identifier_ref: concept reference with identifier — parse succeeds", () => {
			const input = loadFixture("12_18_unicode_identifier_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].key).toBe("tokyo_ref");
		});

		it("12_19_unicode_emoji: emoji or symbol in text expression — parse succeeds, value preserved", () => {
			const input = loadFixture("12_19_unicode_emoji.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const child = getChildAsBase(ast.concepts[0], 0);
			expect(child).not.toBeNull();
			expect(getFirstExpressionValue(child!)).toBe("😀");
		});

		it("12_20_unicode_mixed_ascii: mixed ASCII and non-ASCII in single expression — parse succeeds", () => {
			const input = loadFixture("12_20_unicode_mixed_ascii.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const child = getChildAsBase(ast.concepts[0], 0);
			expect(child).not.toBeNull();
			expect(getFirstExpressionValue(child!)).toBe(
				"temperature 温度",
			);
		});
	});

	// -------------------------------------------------------------------------
	// 4. Newline variants
	// -------------------------------------------------------------------------
	describe("4. Newline variants", () => {
		it("12_21_newline_unix: Unix newline (\\n only) between lines — parse succeeds", () => {
			const input = loadFixture("12_21_newline_unix.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("a");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("b");
		});

		it("12_22_newline_crlf: Windows newline (\\r\\n) between lines — parse succeeds", () => {
			const input = loadFixture("12_22_newline_crlf.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("a");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("b");
		});

		it("12_23_newline_cr: old Mac newline (\\r only) — parse succeeds", () => {
			const input = loadFixture("12_23_newline_cr.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("a");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("b");
		});

		it("12_24_newline_mixed: mixed newline variants in same document — parse succeeds, four concepts", () => {
			const input = loadFixture("12_24_newline_mixed.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(4);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("a");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("b");
			expect(getFirstExpressionValue(ast.concepts[2])).toBe("c");
			expect(getFirstExpressionValue(ast.concepts[3])).toBe("d");
		});

		it("12_25_comment_newline: newline terminates comment line — parse succeeds, one concept", () => {
			const input = loadFixture("12_25_comment_newline.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("name");
		});

		it("12_26_newline_value_block_items: newlines separate value block items — parse succeeds, two items", () => {
			const input = loadFixture(
				"12_26_newline_value_block_items.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].children).toHaveLength(2);
		});
	});

	// -------------------------------------------------------------------------
	// 5. Lexical edge cases
	// -------------------------------------------------------------------------
	describe("5. Lexical edge cases", () => {
		it("12_27_tab_and_space: tabs and spaces where ws allowed — parse succeeds", () => {
			const input = loadFixture("12_27_tab_and_space.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("name");
			expect(getFirstExpressionValue(ast.concepts[0].children[0] as BaseConcept)).toBe("John");
		});

		it("12_28_empty_lines_between: multiple consecutive newlines between concepts — parse succeeds, exactly two concepts", () => {
			const input = loadFixture("12_28_empty_lines_between.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("a");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("b");
		});

		it("12_29_minimal_whitespace: minimal or no optional whitespace — parse succeeds", () => {
			const input = loadFixture("12_29_minimal_whitespace.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].children).toHaveLength(1);
			expect(ast.concepts[0].children[0].children).toHaveLength(1);
		});

		it("12_30_document_only_ws: document with only spaces, tabs, newlines — parse succeeds, zero concepts", () => {
			const input = loadFixture("12_30_document_only_ws.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(0);
		});

		it("12_31_comments_only_ws: comment-only lines with various newlines — parse succeeds, zero concepts", () => {
			const input = loadFixture("12_31_comments_only_ws.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(0);
		});

		it("12_32_plus_space_then_newline: space then newline after + — parse succeeds, intrinsic association", () => {
			const input = loadFixture(
				"12_32_plus_space_then_newline.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.isIntrinsic).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 6. Invalid / must-fail cases (lexical)
	// -------------------------------------------------------------------------
	describe("6. Invalid / must-fail cases (lexical)", () => {
		it("12_33_plus_newline_only_fail: + followed only by newline, no space — parse fails", () => {
			const input = loadFixture("12_33_plus_newline_only_fail.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});

		it("12_34_minus_newline_only_fail: - followed only by newline, no space — parse fails", () => {
			const input = loadFixture("12_34_minus_newline_only_fail.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});
	});
});
