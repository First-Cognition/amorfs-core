import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
	parse,
	isValid,
	parseOrThrow,
	type ConceptNode,
	type ReferenceConcept,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const documentStructureDir = join(__dirname, "fixtures", "document_structure");

function loadFixture(name: string): string {
	return readFileSync(join(documentStructureDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

describe("Document structure", () => {
	// --- 1. Empty and minimal documents ---
	describe("1. Empty and minimal documents", () => {
		it("01_01_empty: empty document parses and has zero concepts", () => {
			const input = loadFixture("01_01_empty.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(0);
			expect(isValid(input)).toBe(true);
		});

		it("01_02_whitespace_only: whitespace-only document parses and has zero concepts", () => {
			const input = loadFixture("01_02_whitespace_only.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(0);
			expect(isValid(input)).toBe(true);
		});
	});

	// --- 2. Comments only (no concepts) ---
	describe("2. Comments only (no concepts)", () => {
		it("01_03_comments_only_single: single full-line comment yields zero concepts", () => {
			const input = loadFixture("01_03_comments_only_single.amorfs");
			expect(parse(input).success).toBe(true);
			expect(parseOrThrow(input).concepts).toHaveLength(0);
			expect(isValid(input)).toBe(true);
		});

		it("01_04_comments_only_multiple: multiple full-line comments yield zero concepts", () => {
			const input = loadFixture("01_04_comments_only_multiple.amorfs");
			expect(parse(input).success).toBe(true);
			expect(parseOrThrow(input).concepts).toHaveLength(0);
			expect(isValid(input)).toBe(true);
		});
	});

	// --- 3. Single top-level concept ---
	describe("3. Single top-level concept", () => {
		it("01_05_single_concept: one concept with value block", () => {
			const input = loadFixture("01_05_single_concept.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(isValid(input)).toBe(true);
		});

		it("01_06_single_expression_only: one expression-only concept (no value block)", () => {
			const input = loadFixture("01_06_single_expression_only.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].kind).toBe("base");
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("greeting");
			expect(isValid(input)).toBe(true);
		});

		it("01_07_single_reference: one top-level concept reference", () => {
			const input = loadFixture("01_07_single_reference.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const ref = ast.concepts[0] as ReferenceConcept;
			expect(ref.kind).toBe("reference");
			expect(ref.referenceKey).toBe("myref");
			expect(isValid(input)).toBe(true);
		});
	});

	// --- 4. Multiple top-level concepts (order and count) ---
	describe("4. Multiple top-level concepts (order and count)", () => {
		it("01_08_two_concepts: two concepts at document root, order preserved", () => {
			const input = loadFixture("01_08_two_concepts_comma.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("country");
			expect(isValid(input)).toBe(true);
		});

		it("01_09_two_concepts_newline: two concepts newline-separated, order preserved", () => {
			const input = loadFixture("01_09_two_concepts_newline.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("country");
			expect(isValid(input)).toBe(true);
		});

		it("01_10_three_concepts: three concepts, order and count preserved", () => {
			const input = loadFixture("01_10_three_concepts.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(3);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("a");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("b");
			expect(getFirstExpressionValue(ast.concepts[2])).toBe("c");
			expect(isValid(input)).toBe(true);
		});

		it("01_11_mixed_top_level: mixed concept types at top level, order preserved", () => {
			const input = loadFixture("01_11_mixed_top_level.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(3);
			// First: value block (label [value])
			expect(ast.concepts[0].kind).toBe("base");
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("label");
			// Second: expression-only (standalone_expr)
			expect(ast.concepts[1].kind).toBe("base");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe(
				"standalone_expr",
			);
			// Third: reference (@ref)
			expect(ast.concepts[2].kind).toBe("reference");
			expect((ast.concepts[2] as ReferenceConcept).referenceKey).toBe(
				"ref",
			);
			expect(isValid(input)).toBe(true);
		});
	});

	// --- 5. Whitespace between top-level items ---
	describe("5. Whitespace between top-level items", () => {
		it("01_12_whitespace_multiple_newlines: multiple newlines between two concepts", () => {
			const input = loadFixture(
				"01_12_whitespace_multiple_newlines.amorfs",
			);
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("country");
			expect(isValid(input)).toBe(true);
		});

		it("01_13_whitespace_spaces_tabs: spaces and tabs between concepts", () => {
			const input = loadFixture("01_13_whitespace_spaces_tabs.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("country");
			expect(isValid(input)).toBe(true);
		});

		it("01_14_whitespace_leading_trailing: leading and trailing whitespace, single concept", () => {
			const input = loadFixture(
				"01_14_whitespace_leading_trailing.amorfs",
			);
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(isValid(input)).toBe(true);
		});
	});

	// --- 6. Comments and concepts (structure only) ---
	describe("6. Comments and concepts (structure only)", () => {
		it("01_15_comments_before_after: comments before and after a single concept", () => {
			const input = loadFixture("01_15_comments_before_after.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(isValid(input)).toBe(true);
		});

		it("01_16_comments_between: comments between two concepts, order preserved", () => {
			const input = loadFixture("01_16_comments_between.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("city");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("country");
			expect(isValid(input)).toBe(true);
		});

		it("01_17_comments_and_concepts_order: many comments and concepts, concept order preserved", () => {
			const input = loadFixture(
				"01_17_comments_and_concepts_order.amorfs",
			);
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(3);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("concept_a");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("concept_b");
			expect(getFirstExpressionValue(ast.concepts[2])).toBe("concept_c");
			expect(isValid(input)).toBe(true);
		});
	});
});
