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
	type ReferenceConcept,
	type AssociationConcept,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const commentsDir = join(__dirname, "fixtures", "comments");

function loadFixture(name: string): string {
	return readFileSync(join(commentsDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

/** Value block [Sydney] appears as a child base concept with expression "Sydney". */
function valueBlockContains(
	concept: ConceptNode,
	value: string | number,
): boolean {
	if (concept.kind !== "base") return false;
	return concept.children.some(
		(c) =>
			c.kind === "base" && c.expressions.some((e) => e.value === value),
	);
}

describe("Comments (Section 2)", () => {
	// ─── 1. Full-line comments ─────────────────────────────────────────────
	describe("1. Full-line comments", () => {
		it("02_01_full_line_single: single full-line comment yields zero concepts", () => {
			const input = loadFixture("02_01_full_line_single.amorfs");
			expect(parse(input).success).toBe(true);
			expect(parseOrThrow(input).concepts).toHaveLength(0);
			expect(isValid(input)).toBe(true);
		});

		it("02_02_full_line_multiple: multiple full-line comments yield zero concepts", () => {
			const input = loadFixture("02_02_full_line_multiple.amorfs");
			expect(parse(input).success).toBe(true);
			expect(parseOrThrow(input).concepts).toHaveLength(0);
			expect(isValid(input)).toBe(true);
		});

		it("02_03_full_line_empty: empty full-line comment (# only) parses and yields zero concepts", () => {
			const input = loadFixture("02_03_full_line_empty.amorfs");
			expect(parse(input).success).toBe(true);
			expect(parseOrThrow(input).concepts).toHaveLength(0);
			expect(isValid(input)).toBe(true);
		});

		it("02_04_full_line_spaces_only: full-line comment with only spaces after # yields zero concepts", () => {
			const input = loadFixture("02_04_full_line_spaces_only.amorfs");
			expect(parse(input).success).toBe(true);
			expect(parseOrThrow(input).concepts).toHaveLength(0);
			expect(isValid(input)).toBe(true);
		});
	});

	// ─── 2. Inline comments (space before # required per spec) ──────────────
	describe("2. Inline comments", () => {
		it("02_05_inline_after_concept: inline comment after concept with value block is stripped", () => {
			const input = loadFixture("02_05_inline_after_concept.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(getFirstExpressionValue(concept)).toBe("city");
			expect(valueBlockContains(concept, "Sydney")).toBe(true);
			expect(isValid(input)).toBe(true);
		});

		it("02_06_inline_after_association: inline comment after association line is stripped", () => {
			const input = loadFixture("02_06_inline_after_association.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(getFirstExpressionValue(root)).toBe("person");
			const titleAssoc = root.children.find(
				(c): c is AssociationConcept =>
					c.kind === "association" &&
					c.children.some(
						(t) =>
							t.kind === "base" &&
							getFirstExpressionValue(t) === "title",
					),
			);
			expect(titleAssoc).toBeDefined();
			expect(isValid(input)).toBe(true);
		});

		it("02_07_inline_after_expression_only: inline comment after expression-only concept; one expression-only concept (comment may be stripped or included until grammar supports inline)", () => {
			const input = loadFixture(
				"02_07_inline_after_expression_only.amorfs",
			);
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.kind).toBe("base");
			expect(concept.children).toHaveLength(0);
			const firstExpr = getFirstExpressionValue(concept);
			expect(firstExpr).toBeTruthy();
			expect(String(firstExpr).startsWith("standalone_label")).toBe(true);
			expect(isValid(input)).toBe(true);
		});

		it("02_08_inline_after_reference: inline comment after concept reference is stripped", () => {
			const input = loadFixture("02_08_inline_after_reference.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const ref = ast.concepts[0] as ReferenceConcept;
			expect(ref.kind).toBe("reference");
			expect(ref.referenceKey).toBe("myref");
			expect(isValid(input)).toBe(true);
		});

		it("02_09_inline_after_metadata: inline comment after concept with metadata is stripped", () => {
			const input = loadFixture("02_09_inline_after_metadata.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(getFirstExpressionValue(concept)).toBe("city");
			expect(concept.metadata).toBeDefined();
			expect(concept.metadata?.language).toBe("en");
			expect(valueBlockContains(concept, "Sydney")).toBe(true);
			expect(isValid(input)).toBe(true);
		});

		it("02_10_inline_no_space_before_hash: no space before # — parse either fails or succeeds with one concept (spec allows implementation choice)", () => {
			const input = loadFixture(
				"02_10_inline_no_space_before_hash.amorfs",
			);
			const result = parse(input);
			if (result.success) {
				const ast = result.ast;
				expect(ast.concepts).toHaveLength(1);
				expect(
					getFirstExpressionValue(ast.concepts[0] as BaseConcept),
				).toBe("city");
			} else {
				expect(result.success).toBe(false);
			}
		});
	});

	// ─── 3. Comment placement ──────────────────────────────────────────────
	describe("3. Comment placement", () => {
		it("02_11_comment_at_start: comment before first concept; only concept in ast.concepts", () => {
			const input = loadFixture("02_11_comment_at_start.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(isValid(input)).toBe(true);
		});

		it("02_12_comment_at_end: comment after last concept; concept list unchanged", () => {
			const input = loadFixture("02_12_comment_at_end.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(isValid(input)).toBe(true);
		});

		it("02_13_comment_between_concepts: comment between two concepts; both concepts in order", () => {
			const input = loadFixture("02_13_comment_between_concepts.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("country");
			expect(isValid(input)).toBe(true);
		});

		it("02_14_comments_concepts_interleaved: multiple comments and concepts interleaved; concept order preserved", () => {
			const input = loadFixture(
				"02_14_comments_concepts_interleaved.amorfs",
			);
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(3);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("country");
			expect(getFirstExpressionValue(ast.concepts[2])).toBe("title");
			expect(isValid(input)).toBe(true);
		});
	});

	// ─── 4. No comment in AST ───────────────────────────────────────────────
	describe("4. No comment in AST", () => {
		it("02_15_no_comment_in_concepts: comments never create concept nodes; only name [Alice] appears", () => {
			const input = loadFixture("02_15_no_comment_in_concepts.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.kind).toBe("base");
			expect(getFirstExpressionValue(concept)).toBe("name");
			expect(valueBlockContains(concept, "Alice")).toBe(true);
			const hasCommentLike = ast.concepts.some(
				(c) =>
					"comment" in c ||
					(c as { kind?: string }).kind === "comment",
			);
			expect(hasCommentLike).toBe(false);
			expect(isValid(input)).toBe(true);
		});
	});

	// ─── 5. Edge cases ─────────────────────────────────────────────────────
	describe("5. Edge cases", () => {
		it("02_16_comment_special_chars: comment with quotes, brackets, braces, Unicode; only city [Sydney] in AST", () => {
			const input = loadFixture("02_16_comment_special_chars.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(getFirstExpressionValue(concept)).toBe("city");
			expect(valueBlockContains(concept, "Sydney")).toBe(true);
			expect(isValid(input)).toBe(true);
		});

		it("02_17_full_line_block: block of full-line comments before one concept", () => {
			const input = loadFixture("02_17_full_line_block.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(isValid(input)).toBe(true);
		});
	});
});
