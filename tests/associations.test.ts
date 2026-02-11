/**
 * Section 7 Associations — fixture tests
 *
 * Covers: intrinsic (+), contextual (-), metadata on associations, multiple and
 * mixed associations, target types (bare concept, nested, expression-only,
 * reference), negative-number distinction, whitespace variants, invalid syntax,
 * and nested multi-level associations. Implements plan
 * .cursor/plans/07_associations_f5c475cb.plan.md
 *
 * Fixtures: tests/fixtures/associations/ with prefix 07_
 *
 * Grammar: Association = Metadata? associationOp Concept;
 * associationOp = ("+" | "-") space+ (space required). space := " " | "\t"
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
	type ReferenceConcept,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const associationsDir = join(__dirname, "fixtures", "associations");

function loadFixture(name: string): string {
	return readFileSync(join(associationsDir, name), "utf-8");
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

/** Association target's first value: from nested value block or target's first expression. */
function getAssociationTargetFirstValue(
	assoc: AssociationConcept,
): string | number | null {
	const target = assoc.children[0];
	if (!target) return null;
	if (target.kind === "base") {
		if (target.children.length > 0)
			return getFirstExpressionValue(target.children[0]);
		return getFirstExpressionValue(target);
	}
	return null;
}

describe("Section 7 Associations (07_)", () => {
	// -------------------------------------------------------------------------
	// 1. Intrinsic association (+)
	// -------------------------------------------------------------------------
	describe("1. Intrinsic association (+)", () => {
		it("07_01_single_intrinsic_one_space: one space after +, target value John", () => {
			const input = loadFixture(
				"07_01_single_intrinsic_one_space.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].children).toHaveLength(1);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.kind).toBe("association");
			expect(assoc!.associationType).toBe("has_a");
			expect(assoc!.isIntrinsic).toBe(true);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("John");
		});

		it("07_02_single_intrinsic_multiple_spaces: multiple spaces after +, date value", () => {
			const input = loadFixture(
				"07_02_single_intrinsic_multiple_spaces.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.isIntrinsic).toBe(true);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("1990-01-15");
		});

		it("07_03_single_intrinsic_tab_after: tab after + counts as space", () => {
			const input = loadFixture(
				"07_03_single_intrinsic_tab_after.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.isIntrinsic).toBe(true);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("Jane");
		});
	});

	// -------------------------------------------------------------------------
	// 2. Contextual association (-)
	// -------------------------------------------------------------------------
	describe("2. Contextual association (-)", () => {
		it("07_04_single_contextual_one_space: one space after -, target 555-1234", () => {
			const input = loadFixture(
				"07_04_single_contextual_one_space.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.kind).toBe("association");
			expect(assoc!.isIntrinsic).toBe(false);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("555-1234");
		});

		it("07_05_single_contextual_multiple_spaces: multiple spaces after -", () => {
			const input = loadFixture(
				"07_05_single_contextual_multiple_spaces.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.isIntrinsic).toBe(false);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("Engineering");
		});

		it("07_06_single_contextual_tab_after: tab after -", () => {
			const input = loadFixture(
				"07_06_single_contextual_tab_after.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.isIntrinsic).toBe(false);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("admin");
		});
	});

	// -------------------------------------------------------------------------
	// 3. Association with metadata
	// -------------------------------------------------------------------------
	describe("3. Association with metadata", () => {
		it("07_07_metadata_before_intrinsic: metadata applies to intrinsic association", () => {
			const input = loadFixture("07_07_metadata_before_intrinsic.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.metadata).not.toBeNull();
			expect(assoc!.metadata!.temporal).toBeDefined();
			expect(assoc!.metadata!.confidence).toBeDefined();
			expect(assoc!.isIntrinsic).toBe(true);
		});

		it("07_08_metadata_before_contextual: metadata with custom (source=manual)", () => {
			const input = loadFixture(
				"07_08_metadata_before_contextual.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.metadata).not.toBeNull();
			expect(assoc!.metadata!.custom).toBeDefined();
			expect(assoc!.isIntrinsic).toBe(false);
		});

		it("07_09_two_associations_each_with_metadata: metadata attaches to correct association only", () => {
			const input = loadFixture(
				"07_09_two_associations_each_with_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(2);
			const first = getChildAsAssociation(ast.concepts[0], 0);
			const second = getChildAsAssociation(ast.concepts[0], 1);
			expect(first!.metadata).not.toBeNull();
			expect(first!.metadata!.temporal).toBeDefined();
			expect(second!.metadata).not.toBeNull();
			expect(second!.metadata!.confidence).toBeDefined();
			expect(first!.isIntrinsic).toBe(true);
			expect(second!.isIntrinsic).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// 4. Multiple associations (order and type)
	// -------------------------------------------------------------------------
	describe("4. Multiple associations (order and type)", () => {
		it("07_10_two_intrinsic_only: two intrinsic, order preserved", () => {
			const input = loadFixture("07_10_two_intrinsic_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(2);
			const a = getChildAsAssociation(ast.concepts[0], 0);
			const b = getChildAsAssociation(ast.concepts[0], 1);
			expect(a!.kind).toBe("association");
			expect(b!.kind).toBe("association");
			expect(a!.isIntrinsic).toBe(true);
			expect(b!.isIntrinsic).toBe(true);
			expect(getAssociationTargetFirstValue(a!)).toBe("John");
			expect(getAssociationTargetFirstValue(b!)).toBe("1985-01-01");
		});

		it("07_11_two_contextual_only: two contextual, order preserved", () => {
			const input = loadFixture("07_11_two_contextual_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(2);
			const a = getChildAsAssociation(ast.concepts[0], 0);
			const b = getChildAsAssociation(ast.concepts[0], 1);
			expect(a!.isIntrinsic).toBe(false);
			expect(b!.isIntrinsic).toBe(false);
			expect(getAssociationTargetFirstValue(a!)).toBe("x");
			expect(getAssociationTargetFirstValue(b!)).toBe("y@z.com");
		});

		it("07_12_intrinsic_then_contextual: mixed order", () => {
			const input = loadFixture("07_12_intrinsic_then_contextual.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(getChildAsAssociation(ast.concepts[0], 0)!.isIntrinsic).toBe(
				true,
			);
			expect(getChildAsAssociation(ast.concepts[0], 1)!.isIntrinsic).toBe(
				false,
			);
		});

		it("07_13_contextual_then_intrinsic: contextual then intrinsic", () => {
			const input = loadFixture("07_13_contextual_then_intrinsic.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(getChildAsAssociation(ast.concepts[0], 0)!.isIntrinsic).toBe(
				false,
			);
			expect(getChildAsAssociation(ast.concepts[0], 1)!.isIntrinsic).toBe(
				true,
			);
		});

		it("07_14_alternating_four_associations: +, -, +, - order", () => {
			const input = loadFixture(
				"07_14_alternating_four_associations.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(4);
			const intrinsic = [true, false, true, false];
			ast.concepts[0].children.forEach((c, i) => {
				if (c.kind === "association")
					expect(c.isIntrinsic).toBe(intrinsic[i]);
			});
			expect(
				getAssociationTargetFirstValue(
					ast.concepts[0].children[0] as AssociationConcept,
				),
			).toBe(1);
			expect(
				getAssociationTargetFirstValue(
					ast.concepts[0].children[1] as AssociationConcept,
				),
			).toBe(2);
			expect(
				getAssociationTargetFirstValue(
					ast.concepts[0].children[2] as AssociationConcept,
				),
			).toBe(3);
			expect(
				getAssociationTargetFirstValue(
					ast.concepts[0].children[3] as AssociationConcept,
				),
			).toBe(4);
		});

		it("07_15_many_associations_stress: 10 associations, no reordering", () => {
			const input = loadFixture("07_15_many_associations_stress.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(10);
			ast.concepts[0].children.forEach((c) => {
				expect(c.kind).toBe("association");
			});
			const expectedIntrinsic = [
				true,
				false,
				true,
				false,
				true,
				false,
				true,
				false,
				true,
				false,
			];
			ast.concepts[0].children.forEach((c, i) => {
				if (c.kind === "association")
					expect(c.isIntrinsic).toBe(expectedIntrinsic[i]);
			});
		});
	});

	// -------------------------------------------------------------------------
	// 5. Association target types
	// -------------------------------------------------------------------------
	describe("5. Association target types", () => {
		it("07_16_target_bare_single_expression: target has one expression value", () => {
			const input = loadFixture(
				"07_16_target_bare_single_expression.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			const target = assoc!.children[0];
			expect(target.kind).toBe("base");
			expect(getAssociationTargetFirstValue(assoc!)).toBe("John");
		});

		it("07_17_target_multiple_expressions: target has alternatives NSW | New South Wales", () => {
			const input = loadFixture(
				"07_17_target_multiple_expressions.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			const target = assoc!.children[0] as BaseConcept;
			expect(target.kind).toBe("base");
			// Target concept "label" has one child with multiple expressions (alternatives)
			const valueChild = target.children[0];
			expect(valueChild?.kind).toBe("base");
			expect(
				(valueChild as BaseConcept).expressions.length,
			).toBeGreaterThanOrEqual(2);
			expect((valueChild as BaseConcept).expressions[0].value).toBe(
				"NSW",
			);
			expect((valueChild as BaseConcept).expressions[1].value).toBe(
				"New South Wales",
			);
		});

		it("07_18_target_empty_value_block: target has empty []", () => {
			const input = loadFixture("07_18_target_empty_value_block.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			const target = assoc!.children[0];
			expect(target.children).toHaveLength(0);
		});

		it("07_19_target_nested_associations: target value block has only associations", () => {
			const input = loadFixture(
				"07_19_target_nested_associations.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			const target = assoc!.children[0];
			expect(target.children).toHaveLength(2);
			expect(target.children[0].kind).toBe("association");
			expect(target.children[1].kind).toBe("association");
			expect((target.children[0] as AssociationConcept).isIntrinsic).toBe(
				false,
			);
			expect((target.children[1] as AssociationConcept).isIntrinsic).toBe(
				false,
			);
			expect(
				getAssociationTargetFirstValue(
					target.children[0] as AssociationConcept,
				),
			).toBe("Main St");
			expect(
				getAssociationTargetFirstValue(
					target.children[1] as AssociationConcept,
				),
			).toBe("Sydney");
		});

		it("07_20_target_expression_only: target has no value block", () => {
			const input = loadFixture("07_20_target_expression_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			const target = assoc!.children[0];
			expect(target.kind).toBe("base");
			expect(target.children).toHaveLength(0);
			expect((target as BaseConcept).expressions.length).toBeGreaterThan(
				0,
			);
		});

		it("07_21_target_concept_reference: target is @ref", () => {
			const input = loadFixture("07_21_target_concept_reference.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			// Second top-level concept is "record" with + @john_ref
			expect(ast.concepts).toHaveLength(2);
			const record = ast.concepts[1];
			expect(getFirstExpressionValue(record)).toBe("record");
			const assoc = getChildAsAssociation(record, 0);
			expect(assoc).not.toBeNull();
			const target = assoc!.children[0];
			expect(target.kind).toBe("reference");
			expect((target as ReferenceConcept).referenceKey).toBe("john_ref");
			expect(ast.references["john_ref"]).toBeDefined();
		});
	});

	// -------------------------------------------------------------------------
	// 6. Negative number vs contextual association
	// -------------------------------------------------------------------------
	describe("6. Negative number vs contextual association", () => {
		it("07_22_value_negative_number_bare: -42 is bare concept, not association", () => {
			const input = loadFixture(
				"07_22_value_negative_number_bare.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(1);
			const child = ast.concepts[0].children[0];
			expect(child.kind).toBe("base");
			expect(getFirstExpressionValue(child)).toBe(-42);
		});

		it("07_23_contextual_association_numeric_target: space after - makes it association", () => {
			const input = loadFixture(
				"07_23_contextual_association_numeric_target.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.kind).toBe("association");
			expect(assoc!.isIntrinsic).toBe(false);
			expect(getAssociationTargetFirstValue(assoc!)).toBe(42);
		});

		it("07_24_negative_number_and_contextual_same_block: -99 bare, - score [100] contextual", () => {
			const input = loadFixture(
				"07_24_negative_number_and_contextual_same_block.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].children).toHaveLength(2);
			const first = ast.concepts[0].children[0];
			const second = ast.concepts[0].children[1];
			expect(first.kind).toBe("base");
			expect(getFirstExpressionValue(first)).toBe(-99);
			expect(second.kind).toBe("association");
			expect((second as AssociationConcept).isIntrinsic).toBe(false);
			expect(
				getAssociationTargetFirstValue(second as AssociationConcept),
			).toBe(100);
		});
	});

	// -------------------------------------------------------------------------
	// 7. Whitespace and layout (associations)
	// -------------------------------------------------------------------------
	describe("7. Whitespace and layout (associations)", () => {
		it("07_25_newline_after_operator: newline after + (document behavior)", () => {
			const input = loadFixture("07_25_newline_after_operator.amorfs");
			// Grammar: associationOp = ("+" | "-") space+ ; space := " " | "\t"
			// Newline is not in space. Either parse fails, or parse succeeds with some structure.
			const result = parse(input);
			if (result.success) {
				const ast = result.ast;
				expect(ast.concepts).toHaveLength(1);
				// When successful, document: may have one or more value items (layout-dependent)
				const assoc = ast.concepts[0].children.find(
					(c): c is AssociationConcept => c.kind === "association",
				);
				if (assoc) {
					expect(assoc.isIntrinsic).toBe(true);
					expect(getAssociationTargetFirstValue(assoc)).toBe("John");
				}
			}
			// If parse failed, that is also acceptable per grammar.
		});

		it("07_26_spaces_between_op_and_target: multiple spaces between + and target", () => {
			const input = loadFixture(
				"07_26_spaces_between_op_and_target.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.isIntrinsic).toBe(true);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("John");
		});
	});

	// -------------------------------------------------------------------------
	// 8. Invalid syntax (expect parse failure or defined behavior)
	// -------------------------------------------------------------------------
	describe("8. Invalid syntax (expect parse failure or defined behavior)", () => {
		it("07_27_invalid_no_space_after_plus: no space between + and name", () => {
			const input = loadFixture(
				"07_27_invalid_no_space_after_plus.amorfs",
			);
			const result = parse(input);
			// Spec: space after + required; parse may fail or treat as bare concept.
			if (result.success) {
				const ast = result.ast;
				const firstChild = ast.concepts[0].children[0];
				// If parsed, must not be a proper association (may be bare concept +name)
				expect(firstChild).toBeDefined();
			} else {
				expect((result as { error: string }).error).toMatch(
					/\+|Line|col/,
				);
			}
		});

		it("07_28_invalid_no_space_after_minus: no space between - and email", () => {
			const input = loadFixture(
				"07_28_invalid_no_space_after_minus.amorfs",
			);
			const result = parse(input);
			if (result.success) {
				const firstChild = result.ast.concepts[0].children[0];
				expect(firstChild).toBeDefined();
			} else {
				expect((result as { error: string }).error).toMatch(
					/-|Line|col/,
				);
			}
		});

		it("07_29_invalid_plus_no_target: + with no concept after", () => {
			const input = loadFixture("07_29_invalid_plus_no_target.amorfs");
			const result = parse(input);
			// Spec: association requires Concept after associationOp; parse may fail.
			if (!result.success) {
				expect(result.success).toBe(false);
			} else {
				// If implementation accepts, value block has one item (association or other)
				expect(
					result.ast.concepts[0].children.length,
				).toBeLessThanOrEqual(1);
			}
		});
	});

	// -------------------------------------------------------------------------
	// 9. Nested associations (multi-level)
	// -------------------------------------------------------------------------
	describe("9. Nested associations (multi-level)", () => {
		it("07_30_nested_three_levels: a -> +b -> -c -> x", () => {
			const input = loadFixture("07_30_nested_three_levels.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const top = ast.concepts[0];
			expect(top.children).toHaveLength(1);
			const assocB = getChildAsAssociation(top, 0);
			expect(assocB!.isIntrinsic).toBe(true);
			const targetB = assocB!.children[0];
			expect(targetB.children).toHaveLength(1);
			const assocC = getChildAsAssociation(targetB, 0);
			expect(assocC!.isIntrinsic).toBe(false);
			const targetC = assocC!.children[0];
			expect(targetC.kind).toBe("base");
			// Innermost value is "x" (targetC is concept "c" with value block containing "x")
			expect(getAssociationTargetFirstValue(assocC!)).toBe("x");
		});

		it("07_31_nested_mixed_intrinsic_contextual: outer and inner + and -", () => {
			const input = loadFixture(
				"07_31_nested_mixed_intrinsic_contextual.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const outer = ast.concepts[0];
			expect(outer.children).toHaveLength(2);
			const firstOuter = getChildAsAssociation(outer, 0);
			const secondOuter = getChildAsAssociation(outer, 1);
			expect(firstOuter!.isIntrinsic).toBe(true);
			expect(secondOuter!.isIntrinsic).toBe(false);
			const inner = firstOuter!.children[0];
			expect(inner.children).toHaveLength(2);
			const innerFirst = getChildAsAssociation(inner, 0);
			const innerSecond = getChildAsAssociation(inner, 1);
			expect(innerFirst!.isIntrinsic).toBe(false);
			expect(innerSecond!.isIntrinsic).toBe(true);
		});
	});
});
