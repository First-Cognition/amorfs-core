/**
 * Section 15 Nested Structures — fixture tests
 *
 * Covers: depth (two/three/deep/very deep), width (siblings, wide+deep, mixed),
 * association types (bare only, intrinsic/contextual only, mixed same/different levels,
 * bare+associations), content types (implied, expression-only, reference target,
 * empty blocks, multiple expressions), parent-child correctness, item separators
 * in nested context, and edge cases. Implements plan .cursor/plans/15_nested_structure_98d05fb6.plan.md
 *
 * Fixtures: tests/fixtures/nested_structures_cases/ with prefix 15_
 *
 * Grammar: ValueBlock = "[" ValueContent? "]"; ValueContent = ValueItem (ws* itemSep? ws* ValueItem)*;
 * ValueItem = Association | Concept. AST: BaseConcept.children, AssociationConcept.children = [targetConcept].
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
const nestedStructuresCasesDir = join(__dirname, "fixtures", "nested_structures_cases");

function loadFixture(name: string): string {
	return readFileSync(join(nestedStructuresCasesDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

function getFirstChildAsBase(concept: ConceptNode): BaseConcept | null {
	const child = concept.children[0];
	return child?.kind === "base" ? child : null;
}

function getFirstChildAsAssociation(concept: ConceptNode): AssociationConcept | null {
	const child = concept.children[0];
	return child?.kind === "association" ? child : null;
}

/** Traverse a chain of base-concept children by index at each level; returns the node at path. */
function traversePath(root: ConceptNode, path: number[]): ConceptNode | null {
	let current: ConceptNode = root;
	for (const i of path) {
		const child = current.children[i];
		if (!child) return null;
		current = child;
	}
	return current;
}

/** Count concepts along a single deep path (each level one child). */
function depthOfChain(root: ConceptNode): number {
	let d = 0;
	let current: ConceptNode = root;
	while (current.children.length > 0) {
		d += 1;
		current = current.children[0];
	}
	return d;
}

describe("Section 15 Nested Structures (15_)", () => {
	// -------------------------------------------------------------------------
	// 1. Depth (nesting levels)
	// -------------------------------------------------------------------------
	describe("1. Depth (nesting levels)", () => {
		it("15_01_two_levels_single_path: one top-level concept, one child, one leaf; children lengths correct", () => {
			const input = loadFixture("15_01_two_levels_single_path.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(1);
			const level2 = getFirstChildAsBase(root);
			expect(level2).not.toBeNull();
			expect(level2!.children).toHaveLength(1);
			const level3 = getFirstChildAsBase(level2!);
			expect(level3).not.toBeNull();
			expect(level3!.children).toHaveLength(0);
			expect(getFirstExpressionValue(level3!)).toBe("leaf");
		});

		it("15_02_three_levels_chain: a -> b -> c -> x; each level exactly one child", () => {
			const input = loadFixture("15_02_three_levels_chain.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(1);
			const b = getFirstChildAsBase(root);
			expect(b).not.toBeNull();
			expect(b!.children).toHaveLength(1);
			const c = getFirstChildAsBase(b!);
			expect(c).not.toBeNull();
			expect(c!.children).toHaveLength(1);
			const leaf = getFirstChildAsBase(c!);
			expect(leaf).not.toBeNull();
			expect(getFirstExpressionValue(leaf!)).toBe("x");
			expect(leaf!.children).toHaveLength(0);
		});

		it("15_03_deep_chain_five_six_levels: path from root to leaf has 5 or 6 concept nodes", () => {
			const input = loadFixture("15_03_deep_chain_five_six_levels.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const depth = depthOfChain(ast.concepts[0]);
			expect(depth).toBeGreaterThanOrEqual(5);
			expect(depth).toBeLessThanOrEqual(6);
			const leaf = traversePath(ast.concepts[0], [0, 0, 0, 0, 0]);
			expect(leaf).not.toBeNull();
			expect(getFirstExpressionValue(leaf!)).toBe("building");
		});

		it("15_04_very_deep_stress: 10+ levels; parse succeeds; depth correct; leaf reachable", () => {
			const input = loadFixture("15_04_very_deep_stress.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const depth = depthOfChain(ast.concepts[0]);
			expect(depth).toBeGreaterThanOrEqual(10);
			let current: ConceptNode = ast.concepts[0];
			for (let i = 0; i < depth; i++) {
				expect(current.children.length).toBeGreaterThan(0);
				current = current.children[0];
			}
			expect(getFirstExpressionValue(current)).toBe("leaf");
		});
	});

	// -------------------------------------------------------------------------
	// 2. Width (siblings at same level)
	// -------------------------------------------------------------------------
	describe("2. Width (siblings at same level)", () => {
		it("15_05_multiple_siblings_one_level: root has exactly 3 children; order matches; each base with one nested child", () => {
			const input = loadFixture("15_05_multiple_siblings_one_level.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(3);
			expect(getFirstExpressionValue(root.children[0] as BaseConcept)).toBe("a");
			expect(getFirstExpressionValue(root.children[1] as BaseConcept)).toBe("b");
			expect(getFirstExpressionValue(root.children[2] as BaseConcept)).toBe("c");
			expect((root.children[0] as BaseConcept).children).toHaveLength(1);
			expect((root.children[1] as BaseConcept).children).toHaveLength(1);
			expect((root.children[2] as BaseConcept).children).toHaveLength(1);
			expect(getFirstExpressionValue((root.children[0] as BaseConcept).children[0] as BaseConcept)).toBe("x");
			expect(getFirstExpressionValue((root.children[1] as BaseConcept).children[0] as BaseConcept)).toBe("y");
			expect(getFirstExpressionValue((root.children[2] as BaseConcept).children[0] as BaseConcept)).toBe("z");
		});

		it("15_06_wide_and_deep_multiple_branches: sibling count per level matches; no cross-linking", () => {
			const input = loadFixture("15_06_wide_and_deep_multiple_branches.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(2);
			const deptA = root.children[0] as AssociationConcept;
			const deptB = root.children[1] as AssociationConcept;
			expect(deptA.kind).toBe("association");
			expect(deptB.kind).toBe("association");
			const targetA = deptA.children[0] as BaseConcept;
			const targetB = deptB.children[0] as BaseConcept;
			expect(getFirstExpressionValue(targetA)).toBe("dept_a");
			expect(getFirstExpressionValue(targetB)).toBe("dept_b");
			expect(targetA.children.length).toBe(2);
			expect(targetB.children.length).toBe(1);
		});

		it("15_07_mixed_width_single_and_multiple: levels with one child have length 1; multiple match fixture", () => {
			const input = loadFixture("15_07_mixed_width_single_and_multiple.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(1);
			const one = getFirstChildAsBase(root)!;
			expect(one.children).toHaveLength(3);
			const a = one.children[0] as BaseConcept;
			expect(a.children).toHaveLength(1);
			const b = getFirstChildAsBase(a)!;
			expect(b.children).toHaveLength(1);
			expect(getFirstExpressionValue(b.children[0] as BaseConcept)).toBe("leaf");
		});
	});

	// -------------------------------------------------------------------------
	// 3. Association types in nesting
	// -------------------------------------------------------------------------
	describe("3. Association types in nesting", () => {
		it("15_08_nested_bare_concepts_only: all value-block children are kind base; pure tree", () => {
			const input = loadFixture("15_08_nested_bare_concepts_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children.every((c) => c.kind === "base")).toBe(true);
			const b = getFirstChildAsBase(root)!;
			expect(b.children.every((c) => c.kind === "base")).toBe(true);
		});

		it("15_09_nested_intrinsic_only_multiple_levels: each association isIntrinsic true, associationType has_a", () => {
			const input = loadFixture("15_09_nested_intrinsic_only_multiple_levels.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			const assoc1 = getFirstChildAsAssociation(root)!;
			expect(assoc1.kind).toBe("association");
			expect(assoc1.isIntrinsic).toBe(true);
			expect(assoc1.associationType).toBe("has_a");
			const inner = assoc1.children[0] as BaseConcept;
			const assoc2 = getFirstChildAsAssociation(inner)!;
			expect(assoc2.isIntrinsic).toBe(true);
			expect(assoc2.associationType).toBe("has_a");
			expect(getFirstExpressionValue(assoc2.children[0] as BaseConcept)).toBe("b");
			const leaf = getFirstChildAsBase(assoc2.children[0] as BaseConcept);
			expect(getFirstExpressionValue(leaf!)).toBe("x");
		});

		it("15_10_nested_contextual_only_multiple_levels: each association isIntrinsic false", () => {
			const input = loadFixture("15_10_nested_contextual_only_multiple_levels.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			const assoc1 = root.children[0] as AssociationConcept;
			expect(assoc1.isIntrinsic).toBe(false);
			const inner = assoc1.children[0] as BaseConcept;
			const assoc2 = inner.children[0] as AssociationConcept;
			expect(assoc2.isIntrinsic).toBe(false);
		});

		it("15_11_mixed_intrinsic_contextual_same_level: first association intrinsic, second contextual; order preserved", () => {
			const input = loadFixture("15_11_mixed_intrinsic_contextual_same_level.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(2);
			expect((root.children[0] as AssociationConcept).isIntrinsic).toBe(true);
			expect((root.children[1] as AssociationConcept).isIntrinsic).toBe(false);
		});

		it("15_12_mixed_intrinsic_contextual_different_levels: correct isIntrinsic per level", () => {
			const input = loadFixture("15_12_mixed_intrinsic_contextual_different_levels.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			const innerAssoc = root.children[0] as AssociationConcept;
			expect(innerAssoc.isIntrinsic).toBe(true);
			const innerBase = innerAssoc.children[0] as BaseConcept;
			expect(innerBase.children.length).toBe(2);
			expect((innerBase.children[0] as AssociationConcept).isIntrinsic).toBe(false);
			expect((innerBase.children[1] as AssociationConcept).isIntrinsic).toBe(false);
		});

		it("15_13_mixed_bare_and_associations_same_block: first child base (title), second association (author)", () => {
			const input = loadFixture("15_13_mixed_bare_and_associations_same_block.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children[0].kind).toBe("base");
			expect(getFirstExpressionValue(root.children[0] as BaseConcept)).toBe("title");
			expect(root.children[1].kind).toBe("association");
			const authorTarget = (root.children[1] as AssociationConcept).children[0] as BaseConcept;
			expect(getFirstExpressionValue(authorTarget)).toBe("author");
			expect(getFirstExpressionValue(authorTarget.children[0] as BaseConcept)).toBe("Alice");
		});
	});

	// -------------------------------------------------------------------------
	// 4. Content types in nested positions
	// -------------------------------------------------------------------------
	describe("4. Content types in nested positions", () => {
		it("15_14_nested_implied_concept: implied concept as nested item; base with empty/minimal expressions and association children", () => {
			const input = loadFixture("15_14_nested_implied_concept.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(1);
			const implied = root.children[0] as BaseConcept;
			expect(implied.kind).toBe("base");
			expect(implied.children.length).toBe(2);
			expect((implied.children[0] as AssociationConcept).isIntrinsic).toBe(true);
			expect((implied.children[1] as AssociationConcept).isIntrinsic).toBe(false);
		});

		it("15_15_nested_expression_only_concept: association target (tag) has nested expression-only concept (label) with no value block", () => {
			const input = loadFixture("15_15_nested_expression_only_concept.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			const tagAssoc = root.children[0] as AssociationConcept;
			const tagTarget = tagAssoc.children[0] as BaseConcept;
			expect(tagTarget.children).toHaveLength(1);
			const labelConcept = tagTarget.children[0] as BaseConcept;
			expect(labelConcept.children.length).toBe(0);
			expect(labelConcept.expressions.length).toBeGreaterThan(0);
			expect(getFirstExpressionValue(labelConcept)).toBe("label");
		});

		it("15_16_nested_reference_as_association_target: association target's value block contains @ref; references contains key", () => {
			const input = loadFixture("15_16_nested_reference_as_association_target.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const outer = ast.concepts[1] as BaseConcept;
			const refAssoc = outer.children[0] as AssociationConcept;
			expect(refAssoc.children).toHaveLength(1);
			const refTarget = refAssoc.children[0] as BaseConcept;
			expect(refTarget.children).toHaveLength(1);
			const refNode = refTarget.children[0];
			expect(refNode.kind).toBe("reference");
			expect((refNode as ReferenceConcept).referenceKey).toBe("inner");
			expect(ast.references["inner"]).toBeDefined();
		});

		it("15_17_nested_empty_value_blocks: concepts with [] have children.length 0; sibling order preserved", () => {
			const input = loadFixture("15_17_nested_empty_value_blocks.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(2);
			const child = root.children[0] as BaseConcept;
			const sibling = root.children[1] as BaseConcept;
			expect(child.children.length).toBe(0);
			expect(getFirstExpressionValue(sibling)).toBe("sibling");
			expect(getFirstExpressionValue(sibling.children[0] as BaseConcept)).toBe("x");
			expect(sibling.children.length).toBe(1);
		});

		it("15_18_nested_multiple_expressions_levels: at least two levels with expressions.length >= 2", () => {
			const input = loadFixture("15_18_nested_multiple_expressions_levels.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.expressions.length).toBeGreaterThanOrEqual(1);
			const b = getFirstChildAsBase(root)!;
			expect(b.expressions.length).toBeGreaterThanOrEqual(2);
			const c = getFirstChildAsBase(b)!;
			expect(c.expressions.length).toBeGreaterThanOrEqual(2);
			const leaf = getFirstChildAsBase(c)!;
			expect(getFirstExpressionValue(leaf)).toBe("x");
		});
	});

	// -------------------------------------------------------------------------
	// 5. Parent-child and structure correctness
	// -------------------------------------------------------------------------
	describe("5. Parent-child and structure correctness", () => {
		it("15_19_parent_child_chain_verification: explicit traversal root -> child -> grandchild", () => {
			const input = loadFixture("15_19_parent_child_chain_verification.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			const level2 = getFirstChildAsBase(root);
			expect(level2).not.toBeNull();
			expect(getFirstExpressionValue(level2!)).toBe("level2");
			const level3 = getFirstChildAsBase(level2!);
			expect(level3).not.toBeNull();
			expect(getFirstExpressionValue(level3!)).toBe("level3");
			const leaf = getFirstChildAsBase(level3!);
			expect(leaf).not.toBeNull();
			expect(getFirstExpressionValue(leaf!)).toBe("leaf");
		});

		it("15_20_sibling_order_preserved: root children order [first, second, third]", () => {
			const input = loadFixture("15_20_sibling_order_preserved.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(3);
			expect(getFirstExpressionValue(root.children[0] as BaseConcept)).toBe("first");
			expect(getFirstExpressionValue((root.children[1] as AssociationConcept).children[0] as BaseConcept)).toBe("second");
			expect(getFirstExpressionValue((root.children[2] as AssociationConcept).children[0] as BaseConcept)).toBe("third");
		});

		it("15_21_association_single_child_target: every association has children.length === 1", () => {
			const input = loadFixture("15_21_association_single_child_target.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			const assocs = root.children.filter((c): c is AssociationConcept => c.kind === "association");
			expect(assocs.length).toBe(2);
			expect(assocs.every((a) => a.children.length === 1)).toBe(true);
			expect(assocs.every((a) => a.children[0].kind === "base" || a.children[0].kind === "reference")).toBe(true);
		});

		it("15_22_no_cross_linking_two_branches: root.children[0] and root.children[1] are disjoint subtrees", () => {
			const input = loadFixture("15_22_no_cross_linking_two_branches.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			const branchA = (root.children[0] as AssociationConcept).children[0] as BaseConcept;
			const branchB = (root.children[1] as AssociationConcept).children[0] as BaseConcept;
			expect(branchA.children.length).toBe(2);
			expect(branchB.children.length).toBe(2);
			const a1Target = (branchA.children[0] as AssociationConcept).children[0] as BaseConcept;
			const a2Target = (branchA.children[1] as AssociationConcept).children[0] as BaseConcept;
			const b1Target = (branchB.children[0] as AssociationConcept).children[0] as BaseConcept;
			const b2Target = (branchB.children[1] as AssociationConcept).children[0] as BaseConcept;
			expect(getFirstExpressionValue(a1Target.children[0] as BaseConcept)).toBe("x");
			expect(getFirstExpressionValue(a2Target.children[0] as BaseConcept)).toBe("y");
			expect(getFirstExpressionValue(b1Target.children[0] as BaseConcept)).toBe("p");
			expect(getFirstExpressionValue(b2Target.children[0] as BaseConcept)).toBe("q");
		});
	});

	// -------------------------------------------------------------------------
	// 6. Item separators in nested context
	// -------------------------------------------------------------------------
	describe("6. Item separators in nested context", () => {
		it("15_23_comma_separated_nested: sibling count and order correct", () => {
			const input = loadFixture("15_23_comma_separated_nested.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(2);
			expect(getFirstExpressionValue(root.children[0] as BaseConcept)).toBe("b");
			expect(getFirstExpressionValue(root.children[1] as BaseConcept)).toBe("c");
		});

		it("15_24_newline_separated_nested: same structure as comma; sibling count and order correct", () => {
			const input = loadFixture("15_24_newline_separated_nested.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(2);
			expect(getFirstExpressionValue(root.children[0] as BaseConcept)).toBe("b");
			expect(getFirstExpressionValue(root.children[1] as BaseConcept)).toBe("c");
		});

		it("15_25_mixed_comma_newline_nested: all items as siblings; order preserved", () => {
			const input = loadFixture("15_25_mixed_comma_newline_nested.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(3);
			expect(getFirstExpressionValue(root.children[0] as BaseConcept)).toBe("first");
			expect(getFirstExpressionValue(root.children[1] as BaseConcept)).toBe("second");
			expect(getFirstExpressionValue(root.children[2] as BaseConcept)).toBe("third");
		});
	});

	// -------------------------------------------------------------------------
	// 7. Edge and boundary cases
	// -------------------------------------------------------------------------
	describe("7. Edge and boundary cases", () => {
		it("15_26_minimal_nesting_two_levels_one_child: exactly 3 concepts in chain (p, c, leaf)", () => {
			const input = loadFixture("15_26_minimal_nesting_two_levels_one_child.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(getFirstExpressionValue(root)).toBe("p");
			expect(root.children).toHaveLength(1);
			const c = getFirstChildAsBase(root)!;
			expect(getFirstExpressionValue(c)).toBe("c");
			expect(c.children).toHaveLength(1);
			expect(getFirstExpressionValue(getFirstChildAsBase(c)!)).toBe("x");
		});

		it("15_27_single_top_level_deep_only: root has one child; every level one child until leaf", () => {
			const input = loadFixture("15_27_single_top_level_deep_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(1);
			const depth = depthOfChain(root);
			expect(depth).toBe(4);
			expect(getFirstExpressionValue(traversePath(root, [0, 0, 0, 0])!)).toBe("leaf");
		});

		it("15_28_multiple_top_level_each_nested: ast.concepts.length equals top-level count; no cross-linking", () => {
			const input = loadFixture("15_28_multiple_top_level_each_nested.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0] as BaseConcept)).toBe("tree_a");
			expect(getFirstExpressionValue(ast.concepts[1] as BaseConcept)).toBe("tree_b");
			const a2 = traversePath(ast.concepts[0], [0, 0]) as BaseConcept;
			const b2 = traversePath(ast.concepts[1], [0, 0]) as BaseConcept;
			expect(getFirstExpressionValue(a2)).toBe("a2");
			expect(getFirstExpressionValue(b2)).toBe("b2");
		});

		it("15_29_nested_value_block_only_associations: root children all association nodes; nested structure correct", () => {
			const input = loadFixture("15_29_nested_value_block_only_associations.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children).toHaveLength(2);
			expect(root.children.every((c) => c.kind === "association")).toBe(true);
			const firstAssoc = root.children[0] as AssociationConcept;
			expect(firstAssoc.isIntrinsic).toBe(true);
			const inner = firstAssoc.children[0] as BaseConcept;
			expect(inner.children.length).toBe(1);
			expect((inner.children[0] as AssociationConcept).isIntrinsic).toBe(true);
		});
	});
});
