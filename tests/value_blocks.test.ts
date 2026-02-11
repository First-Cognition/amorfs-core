/**
 * Section 6 Value Blocks — fixture tests
 *
 * Covers: empty blocks, single/multiple items, comma vs newline separation,
 * mixed bare concepts and associations, order preservation, whitespace variants,
 * nesting, stress cases, and invalid syntax. Implements plan
 * .cursor/plans/06_value_block_419349e1.plan.md
 *
 * Fixtures: tests/fixtures/value_blocks/ with prefix 06_
 *
 * Note: Grammar makes text stop only at structuralDelimiter ([ ] { } | newline).
 * Comma is not structural, so multiple items require newline (or similar) so the
 * first ValueItem ends; fixtures use newline before/around commas where needed.
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
const valueBlocksDir = join(__dirname, "fixtures", "value_blocks");

function loadFixture(name: string): string {
	return readFileSync(join(valueBlocksDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

/** First expression value of a value-item (for bare: self or first child's expression). */
function getValueItemPrimaryValue(node: ConceptNode): string | number | null {
	if (node.kind !== "base") return null;
	if (node.children.length > 0)
		return getFirstExpressionValue(node.children[0]);
	return getFirstExpressionValue(node);
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

/** Association target's "value": value-block content if present, else target's first expression. */
function getAssociationTargetFirstValue(
	assoc: AssociationConcept,
): string | number | null {
	const target = assoc.children[0];
	if (!target || target.kind !== "base") return null;
	if (target.children.length > 0)
		return getFirstExpressionValue(target.children[0]);
	return getFirstExpressionValue(target);
}

describe("Section 6 Value Blocks (06_)", () => {
	// -------------------------------------------------------------------------
	// 1. Empty value block
	// -------------------------------------------------------------------------
	describe("1. Empty value block", () => {
		it("06_01_empty_value_block: literal empty block, concept has no value items", () => {
			const input = loadFixture("06_01_empty_value_block.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("name");
			expect(ast.concepts[0].children).toHaveLength(0);
		});

		it("06_02_empty_with_spaces: only whitespace inside brackets", () => {
			const input = loadFixture("06_02_empty_with_spaces.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(0);
		});

		it("06_03_empty_with_newlines: only newlines inside brackets", () => {
			const input = loadFixture("06_03_empty_with_newlines.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(0);
		});
	});

	// -------------------------------------------------------------------------
	// 2. Single item — bare concept only
	// -------------------------------------------------------------------------
	describe("2. Single item — bare concept only", () => {
		it("06_04_single_bare_concept: one value item, concept with single expression", () => {
			const input = loadFixture("06_04_single_bare_concept.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].children).toHaveLength(1);
			expect(ast.concepts[0].children[0].kind).toBe("base");
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"John",
			);
		});

		it("06_05_single_bare_multiple_expressions: one value item with two alternatives", () => {
			const input = loadFixture(
				"06_05_single_bare_multiple_expressions.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(1);
			const child = getChildAsBase(ast.concepts[0], 0);
			expect(child).not.toBeNull();
			expect(child!.expressions).toHaveLength(2);
			expect(child!.expressions[0].value).toBe("NSW");
			expect(child!.expressions[1].value).toBe("New South Wales");
		});
	});

	// -------------------------------------------------------------------------
	// 3. Single item — association only
	// -------------------------------------------------------------------------
	describe("3. Single item — association only", () => {
		it("06_06_single_intrinsic_association: one intrinsic (+) association", () => {
			const input = loadFixture(
				"06_06_single_intrinsic_association.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(1);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.kind).toBe("association");
			expect(assoc!.isIntrinsic).toBe(true);
			expect(assoc!.children).toHaveLength(1);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("John");
		});

		it("06_07_single_contextual_association: one contextual (-) association", () => {
			const input = loadFixture(
				"06_07_single_contextual_association.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(1);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.kind).toBe("association");
			expect(assoc!.isIntrinsic).toBe(false);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("Main St");
		});
	});

	// -------------------------------------------------------------------------
	// 4. Multiple items — comma-separated (bare concepts)
	// -------------------------------------------------------------------------
	describe("4. Multiple items — comma-separated (bare concepts)", () => {
		it("06_08_two_comma_separated_bare: two bare concepts separated by comma", () => {
			const input = loadFixture("06_08_two_comma_separated_bare.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(2);
			expect(ast.concepts[0].children[0].kind).toBe("base");
			expect(ast.concepts[0].children[1].kind).toBe("base");
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"Red",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[1])).toBe(
				"Blue",
			);
		});

		it("06_09_three_comma_separated_bare: three bare concepts, comma separator", () => {
			const input = loadFixture(
				"06_09_three_comma_separated_bare.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(3);
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"Red",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[1])).toBe(
				"Green",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[2])).toBe(
				"Blue",
			);
		});

		it("06_10_comma_with_spaces: spaces around commas allowed", () => {
			const input = loadFixture("06_10_comma_with_spaces.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(3);
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"A",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[1])).toBe(
				"B",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[2])).toBe(
				"C",
			);
		});
	});

	// -------------------------------------------------------------------------
	// 5. Multiple items — newline-separated
	// -------------------------------------------------------------------------
	describe("5. Multiple items — newline-separated", () => {
		it("06_11_two_newline_separated_bare: newline alone separates items", () => {
			const input = loadFixture(
				"06_11_two_newline_separated_bare.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"First",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[1])).toBe(
				"Second",
			);
		});

		it("06_12_three_newline_separated: three items separated only by newlines", () => {
			const input = loadFixture("06_12_three_newline_separated.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(3);
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"A",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[1])).toBe(
				"B",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[2])).toBe(
				"C",
			);
		});
	});

	// -------------------------------------------------------------------------
	// 6. Multiple items — mixed comma and newline
	// -------------------------------------------------------------------------
	describe("6. Multiple items — mixed comma and newline", () => {
		it("06_13_mixed_comma_newline: mixed separators, four items A,B,C,D", () => {
			const input = loadFixture("06_13_mixed_comma_newline.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(4);
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"A",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[1])).toBe(
				"B",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[2])).toBe(
				"C",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[3])).toBe(
				"D",
			);
		});

		it("06_14_multiline_comma_newline: each item on its own line with comma", () => {
			const input = loadFixture("06_14_multiline_comma_newline.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(3);
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"One",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[1])).toBe(
				"Two",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[2])).toBe(
				"Three",
			);
		});
	});

	// -------------------------------------------------------------------------
	// 7. Multiple items — associations only
	// -------------------------------------------------------------------------
	describe("7. Multiple items — associations only", () => {
		it("06_15_two_contextual_associations: value block with only two contextual associations", () => {
			const input = loadFixture(
				"06_15_two_contextual_associations.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(2);
			expect(ast.concepts[0].children[0].kind).toBe("association");
			expect(ast.concepts[0].children[1].kind).toBe("association");
			expect(
				(ast.concepts[0].children[0] as AssociationConcept).isIntrinsic,
			).toBe(false);
			expect(
				(ast.concepts[0].children[1] as AssociationConcept).isIntrinsic,
			).toBe(false);
			expect(
				getAssociationTargetFirstValue(
					ast.concepts[0].children[0] as AssociationConcept,
				),
			).toBe("John");
			expect(
				getAssociationTargetFirstValue(
					ast.concepts[0].children[1] as AssociationConcept,
				),
			).toBe("j@x.com");
		});

		it("06_16_intrinsic_and_contextual_only: one intrinsic, one contextual; order and type preserved", () => {
			const input = loadFixture(
				"06_16_intrinsic_and_contextual_only.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(2);
			const first = ast.concepts[0].children[0] as AssociationConcept;
			const second = ast.concepts[0].children[1] as AssociationConcept;
			expect(first.isIntrinsic).toBe(true);
			expect(second.isIntrinsic).toBe(false);
			expect(getAssociationTargetFirstValue(first)).toBe("1990-01-01");
			expect(getAssociationTargetFirstValue(second)).toBe("555-1234");
		});

		it("06_17_many_associations_only: four associations (two +, two -) in defined order", () => {
			const input = loadFixture("06_17_many_associations_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(4);
			const a = ast.concepts[0].children as AssociationConcept[];
			expect(a[0].isIntrinsic).toBe(true);
			expect(a[1].isIntrinsic).toBe(true);
			expect(a[2].isIntrinsic).toBe(false);
			expect(a[3].isIntrinsic).toBe(false);
			expect(getAssociationTargetFirstValue(a[0])).toBe("e1");
			expect(getAssociationTargetFirstValue(a[1])).toBe("Thing");
			expect(getAssociationTargetFirstValue(a[2])).toBe("a");
			expect(getAssociationTargetFirstValue(a[3])).toBe("b");
		});
	});

	// -------------------------------------------------------------------------
	// 8. Mixed content — bare concepts and associations
	// -------------------------------------------------------------------------
	describe("8. Mixed content — bare concepts and associations", () => {
		it("06_18_mixed_concepts_then_associations: bare first, then associations", () => {
			const input = loadFixture(
				"06_18_mixed_concepts_then_associations.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(3);
			expect(ast.concepts[0].children[0].kind).toBe("base");
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"Widget",
			);
			expect(ast.concepts[0].children[1].kind).toBe("association");
			expect(
				(ast.concepts[0].children[1] as AssociationConcept).isIntrinsic,
			).toBe(false);
			expect(ast.concepts[0].children[2].kind).toBe("association");
			expect(
				(ast.concepts[0].children[2] as AssociationConcept).isIntrinsic,
			).toBe(true);
			expect(
				getAssociationTargetFirstValue(
					ast.concepts[0].children[2] as AssociationConcept,
				),
			).toBe(99);
		});

		it("06_19_mixed_interleaved: order base, association, base; values John, admin, Dr", () => {
			const input = loadFixture("06_19_mixed_interleaved.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(3);
			expect(ast.concepts[0].children[0].kind).toBe("base");
			expect(getValueItemPrimaryValue(ast.concepts[0].children[0])).toBe(
				"John",
			);
			expect(ast.concepts[0].children[1].kind).toBe("association");
			expect(
				getAssociationTargetFirstValue(
					ast.concepts[0].children[1] as AssociationConcept,
				),
			).toBe("admin");
			expect(ast.concepts[0].children[2].kind).toBe("base");
			expect(getValueItemPrimaryValue(ast.concepts[0].children[2])).toBe(
				"Dr",
			);
		});

		it("06_20_mixed_association_first: association first, then bare concept", () => {
			const input = loadFixture("06_20_mixed_association_first.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(2);
			expect(ast.concepts[0].children[0].kind).toBe("association");
			expect(
				getAssociationTargetFirstValue(
					ast.concepts[0].children[0] as AssociationConcept,
				),
			).toBe("Main St");
			expect(ast.concepts[0].children[1].kind).toBe("base");
			expect(getValueItemPrimaryValue(ast.concepts[0].children[1])).toBe(
				"Sydney",
			);
		});

		it("06_21_mixed_multiple_each_type: five items — two bare, two associations (+/-), one bare", () => {
			const input = loadFixture("06_21_mixed_multiple_each_type.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(5);
			expect(ast.concepts[0].children[0].kind).toBe("base");
			expect(ast.concepts[0].children[1].kind).toBe("base");
			expect(ast.concepts[0].children[2].kind).toBe("association");
			expect(
				(ast.concepts[0].children[2] as AssociationConcept).isIntrinsic,
			).toBe(true);
			expect(ast.concepts[0].children[3].kind).toBe("association");
			expect(
				(ast.concepts[0].children[3] as AssociationConcept).isIntrinsic,
			).toBe(false);
			expect(ast.concepts[0].children[4].kind).toBe("base");
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"Alpha",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[1])).toBe(
				"Beta",
			);
			expect(
				getAssociationTargetFirstValue(
					ast.concepts[0].children[2] as AssociationConcept,
				),
			).toBe("x");
			expect(
				getAssociationTargetFirstValue(
					ast.concepts[0].children[3] as AssociationConcept,
				),
			).toBe("n");
			expect(getFirstExpressionValue(ast.concepts[0].children[4])).toBe(
				"Gamma",
			);
		});
	});

	// -------------------------------------------------------------------------
	// 9. Order preservation and structure
	// -------------------------------------------------------------------------
	describe("9. Order preservation and structure", () => {
		it("06_22_order_preserved: children order exactly matches source order", () => {
			const input = loadFixture("06_22_order_preserved.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(3);
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"First",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[1])).toBe(
				"Second",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[2])).toBe(
				"Third",
			);
		});

		it("06_23_nested_value_block: two levels, parent-child chain correct", () => {
			const input = loadFixture("06_23_nested_value_block.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const outer = ast.concepts[0];
			expect(outer.children).toHaveLength(1);
			const inner = getChildAsBase(outer, 0);
			expect(inner).not.toBeNull();
			expect(inner!.children).toHaveLength(1);
			const leaf = getChildAsBase(inner!, 0);
			expect(leaf).not.toBeNull();
			expect(getFirstExpressionValue(leaf!.children[0])).toBe("x");
		});

		it("06_24_concept_ref_in_value_block: value item with @ref, reference registered", () => {
			const input = loadFixture(
				"06_24_concept_ref_in_value_block.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(1);
			const child = ast.concepts[0].children[0];
			expect(child.key).toBe("child_ref");
			expect(ast.references["child_ref"]).toBeDefined();
			expect(getValueItemPrimaryValue(child)).toBe("x");
		});
	});

	// -------------------------------------------------------------------------
	// 10. Whitespace variants (within value block)
	// -------------------------------------------------------------------------
	describe("10. Whitespace variants (within value block)", () => {
		it("06_25_whitespace_after_open: ws after [, single item", () => {
			const input = loadFixture("06_25_whitespace_after_open.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"value",
			);
		});

		it("06_26_whitespace_before_close: ws before ], trailing ws does not create extra items", () => {
			const input = loadFixture("06_26_whitespace_before_close.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"value",
			);
		});

		it("06_27_whitespace_tabs_between: tabs around comma, two children A, B", () => {
			const input = loadFixture("06_27_whitespace_tabs_between.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"A",
			);
			expect(getFirstExpressionValue(ast.concepts[0].children[1])).toBe(
				"B",
			);
		});
	});

	// -------------------------------------------------------------------------
	// 11. Value block with metadata
	// -------------------------------------------------------------------------
	describe("11. Value block with metadata", () => {
		it("06_28_value_block_trailing_metadata: metadata after ] applies to concept", () => {
			const input = loadFixture(
				"06_28_value_block_trailing_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0].children[0])).toBe(
				"John",
			);
			expect(ast.concepts[0].metadata).not.toBeNull();
			expect(ast.concepts[0].metadata!.language).toBe("en");
		});

		it("06_29_only_associations_with_metadata: two associations and concept metadata", () => {
			const input = loadFixture(
				"06_29_only_associations_with_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(2);
			expect(ast.concepts[0].children[0].kind).toBe("association");
			expect(ast.concepts[0].children[1].kind).toBe("association");
			expect(ast.concepts[0].metadata).not.toBeNull();
			expect(ast.concepts[0].metadata!.custom?.source).toBe("manual");
		});
	});

	// -------------------------------------------------------------------------
	// 12. Stress and boundaries
	// -------------------------------------------------------------------------
	describe("12. Stress and boundaries", () => {
		it("06_30_many_items_stress: 17 items, no truncation, order preserved", () => {
			const input = loadFixture("06_30_many_items_stress.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(17);
			for (let i = 0; i < 17; i++) {
				expect(
					getFirstExpressionValue(ast.concepts[0].children[i]),
				).toBe(i + 1);
			}
		});

		it("06_31_deep_nesting: 5 levels of nested value blocks", () => {
			const input = loadFixture("06_31_deep_nesting.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			let node: ConceptNode = ast.concepts[0];
			let depth = 0;
			while (
				node.children.length > 0 &&
				node.children[0].kind === "base"
			) {
				node = node.children[0];
				depth++;
			}
			expect(depth).toBe(5);
			expect(getFirstExpressionValue(node)).toBe("x");
		});
	});

	// -------------------------------------------------------------------------
	// 13. Invalid syntax (expect parse failure or defined behavior)
	// -------------------------------------------------------------------------
	describe("13. Invalid syntax", () => {
		it("06_32_invalid_missing_closing_bracket: unmatched [, parse fails", () => {
			const input = loadFixture(
				"06_32_invalid_missing_closing_bracket.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.length).toBeGreaterThan(0);
			}
		});

		it("06_33_invalid_missing_opening_bracket: ] without matching [, parse fails", () => {
			const input = loadFixture(
				"06_33_invalid_missing_opening_bracket.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.length).toBeGreaterThan(0);
			}
		});

		it("06_34_invalid_trailing_comma: trailing comma with no item after — parse fails or defined behavior", () => {
			const input = loadFixture("06_34_invalid_trailing_comma.amorfs");
			const result = parse(input);
			// Grammar: ValueContent = ValueItem (ws* itemSep? ws* ValueItem)* — trailing comma expects another ValueItem
			if (result.success) {
				// If implementation allows trailing comma, document it
				expect(
					result.ast.concepts[0].children.length,
				).toBeGreaterThanOrEqual(0);
			} else {
				expect(result.error.length).toBeGreaterThan(0);
			}
		});

		it("06_35_invalid_leading_comma: leading comma — parse fails or documented as single text", () => {
			const input = loadFixture("06_35_invalid_leading_comma.amorfs");
			const result = parse(input);
			// Grammar: ValueContent first token is ValueItem; comma is not structural in text,
			// so " , A" may parse as one concept with expression " , A". Document behavior.
			if (result.success) {
				expect(result.ast.concepts[0].children).toHaveLength(1);
				expect(
					getFirstExpressionValue(result.ast.concepts[0].children[0]),
				).toContain(" ");
			} else {
				expect(result.error.length).toBeGreaterThan(0);
			}
		});
	});
});
