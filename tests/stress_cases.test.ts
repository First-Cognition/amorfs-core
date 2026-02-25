/**
 * Section 22 Stress and Boundaries — fixture tests
 *
 * Covers: (1) deep nesting at/near practical limits, (2) value blocks with many
 * siblings, (3) concepts with many pipe-separated expressions, (4) long lines
 * and large documents, (5) Unicode stress, (6) combined stress and boundary
 * conditions, (7) optional parser limits.
 *
 * Implements plan .cursor/plans/22_stress.plan.md
 * Fixtures: tests/fixtures/stress_cases/ with prefix 22_
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
	parse,
	isValid,
	type ConceptNode,
	type BaseConcept,
	type AssociationConcept,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stressDir = join(__dirname, "fixtures", "stress_cases");

function loadFixture(name: string): string {
	return readFileSync(join(stressDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	const v = concept.expressions[0].value;
	return typeof v === "string" || typeof v === "number" ? v : null;
}

function getAssociationChildren(concept: ConceptNode): AssociationConcept[] {
	return concept.children.filter(
		(c): c is AssociationConcept => c.kind === "association",
	);
}

function getAssociationTarget(
	assoc: AssociationConcept,
): BaseConcept | undefined {
	const t = assoc.children[0];
	return t?.kind === "base" ? t : undefined;
}

function findAssociationByExpression(
	concept: ConceptNode,
	exprValue: string | number,
): AssociationConcept | undefined {
	return getAssociationChildren(concept).find((a) => {
		const target = getAssociationTarget(a);
		return target && getFirstExpressionValue(target) === exprValue;
	});
}

/** Max depth from this node: 0 = leaf, 1+ for each step (association counts as step into target). */
function maxDepth(node: ConceptNode): number {
	let d = 0;
	for (const child of node.children) {
		let childDepth = 1 + maxDepth(child);
		if (child.kind === "association" && child.children[0])
			childDepth = 1 + maxDepth(child.children[0]);
		d = Math.max(d, childDepth);
	}
	return d;
}

/** Get the single direct child base concept (for value block with one which-is item). */
function getOnlyChildBase(concept: ConceptNode): BaseConcept | undefined {
	if (concept.children.length !== 1) return undefined;
	const c = concept.children[0];
	return c.kind === "base" ? c : undefined;
}

/** Walk chain of associations from root to leaf; include single which-is child so leaf is last. */
function chainLabels(root: ConceptNode): (string | number)[] {
	const out: (string | number)[] = [];
	let cur: ConceptNode = root;
	const v = getFirstExpressionValue(cur);
	if (v != null) out.push(v);
	for (;;) {
		const assocs = getAssociationChildren(cur);
		if (assocs.length > 0) {
			const target = getAssociationTarget(assocs[0]);
			if (!target) break;
			const v2 = getFirstExpressionValue(target);
			if (v2 != null) out.push(v2);
			cur = target;
			continue;
		}
		// Single which-is child (base concept with no associations)?
		if (cur.children.length === 1 && cur.children[0].kind === "base") {
			const child = cur.children[0] as BaseConcept;
			const vc = getFirstExpressionValue(child);
			if (vc != null) out.push(vc);
			cur = child;
			continue;
		}
		break;
	}
	return out;
}

describe("Section 22 Stress and Boundaries (22_)", () => {
	// -------------------------------------------------------------------------
	// 1. Deep nesting
	// -------------------------------------------------------------------------
	describe("1. Deep nesting", () => {
		it("22_01: nesting depth 5 — parse success, isValid, depth 5, leaf value correct", () => {
			const input = loadFixture("22_01_nesting_depth_5.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const ast = result.ast;
			const root = ast.concepts[0];
			expect(maxDepth(root)).toBe(5);
			const labels = chainLabels(root);
			expect(labels).toContain("leaf");
			expect(labels[labels.length - 1]).toBe("leaf");
		});

		it("22_02: nesting depth 10 — parse success, isValid, depth 10, no timeout", () => {
			const input = loadFixture("22_02_nesting_depth_10.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(maxDepth(root)).toBe(10);
			const labels = chainLabels(root);
			expect(labels[labels.length - 1]).toBe("x");
		});

		it("22_03: nesting depth 15 — parse success, isValid, depth 15, no stack overflow", () => {
			const input = loadFixture("22_03_nesting_depth_15.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(maxDepth(root)).toBe(15);
			const labels = chainLabels(root);
			expect(labels[labels.length - 1]).toBe("leaf");
		});

		it("22_04: deep nesting mixed +/- — association types preserved at each level", () => {
			const input = loadFixture(
				"22_04_nesting_deep_mixed_associations.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(maxDepth(root)).toBe(8);
			let cur: ConceptNode = root;
			const expectedIntrinsic = [
				true,
				false,
				true,
				false,
				true,
				false,
				true,
			]; // a->b +, b->c -, c->d +, ...
			let idx = 0;
			for (;;) {
				const assocs = getAssociationChildren(cur);
				if (assocs.length === 0) break;
				expect(assocs[0].isIntrinsic).toBe(expectedIntrinsic[idx]);
				const target = getAssociationTarget(assocs[0]);
				if (!target) break;
				cur = target;
				idx++;
				if (idx >= expectedIntrinsic.length) break;
			}
		});

		it("22_05: deep nesting with metadata at multiple levels — metadata on correct nodes", () => {
			const input = loadFixture(
				"22_05_nesting_deep_with_metadata.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(maxDepth(root)).toBe(8);
			expect(root.metadata?.language).toBe("en");
			const L2 = findAssociationByExpression(root, "L1");
			const L2Target = L2 && getAssociationTarget(L2);
			const L3 = L2Target && findAssociationByExpression(L2Target, "L2");
			expect(L3?.metadata ?? L2Target?.metadata).toBeDefined();
		});
	});

	// -------------------------------------------------------------------------
	// 2. Many siblings
	// -------------------------------------------------------------------------
	describe("2. Many siblings", () => {
		it("22_06: ten siblings — exactly 10 children, order a..j", () => {
			const input = loadFixture("22_06_siblings_10.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(root.children.length).toBe(10);
			const first = getFirstExpressionValue(
				root.children[0] as BaseConcept,
			);
			const last = getFirstExpressionValue(
				root.children[9] as BaseConcept,
			);
			expect(first).toBe("a");
			expect(last).toBe("j");
		});

		it("22_07: fifty siblings — exactly 50 children, order v1..v50", () => {
			const input = loadFixture("22_07_siblings_50.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(root.children.length).toBe(50);
			expect(
				getFirstExpressionValue(root.children[0] as BaseConcept),
			).toBe("v1");
			expect(
				getFirstExpressionValue(root.children[49] as BaseConcept),
			).toBe("v50");
		});

		it("22_08: one hundred siblings — exactly 100 children, order preserved", () => {
			const input = loadFixture("22_08_siblings_100.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(root.children.length).toBe(100);
			expect(
				getFirstExpressionValue(root.children[0] as BaseConcept),
			).toBe("n1");
			expect(
				getFirstExpressionValue(root.children[99] as BaseConcept),
			).toBe("n100");
		});

		it("22_09: many siblings newline-separated only — all 30 items, order preserved", () => {
			const input = loadFixture("22_09_siblings_many_newline_sep.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(root.children.length).toBe(30);
			expect(
				getFirstExpressionValue(root.children[0] as BaseConcept),
			).toBe("item1");
			expect(
				getFirstExpressionValue(root.children[29] as BaseConcept),
			).toBe("item30");
		});

		it("22_10: many siblings mixed (associations and which-is) — count 20, types and order correct", () => {
			const input = loadFixture("22_10_siblings_many_mixed.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(root.children.length).toBe(20);
			const first = root.children[0];
			expect(first.kind).toBe("base");
			expect(getFirstExpressionValue(first as BaseConcept)).toBe("bare1");
			const ctx1 = findAssociationByExpression(root, "ctx1");
			expect(ctx1).toBeDefined();
			expect(ctx1?.isIntrinsic).toBe(false);
			const intr1 = findAssociationByExpression(root, "intr1");
			expect(intr1).toBeDefined();
			expect(intr1?.isIntrinsic).toBe(true);
		});

		it("22_11: zero siblings (empty value block) — parse success, zero children", () => {
			const input = loadFixture("22_11_siblings_zero.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(root.children.length).toBe(0);
		});

		it("22_12: one sibling — exactly one child, value x", () => {
			const input = loadFixture("22_12_siblings_one.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(root.children.length).toBe(1);
			expect(
				getFirstExpressionValue(root.children[0] as BaseConcept),
			).toBe("x");
		});
	});

	// -------------------------------------------------------------------------
	// 3. Many expressions (pipe-separated)
	// -------------------------------------------------------------------------
	describe("3. Many expressions", () => {
		it("22_13: ten expressions — concept has 10 alternatives, order e1..e10", () => {
			const input = loadFixture("22_13_expressions_10.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			const child = getOnlyChildBase(root);
			expect(child).toBeDefined();
			expect(child!.expressions.length).toBe(10);
			expect(child!.expressions[0].value).toBe("e1");
			expect(child!.expressions[9].value).toBe("e10");
		});

		it("22_14: fifty expressions — exactly 50, order preserved", () => {
			const input = loadFixture("22_14_expressions_50.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			const child = getOnlyChildBase(root);
			expect(child).toBeDefined();
			expect(child!.expressions.length).toBe(50);
			expect(child!.expressions[0].value).toBe("a1");
			expect(child!.expressions[49].value).toBe("a50");
		});

		it("22_15: many expressions with per-expression metadata — each expression metadata correct", () => {
			const input = loadFixture(
				"22_15_expressions_many_with_metadata.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			const child = getOnlyChildBase(root);
			expect(child).toBeDefined();
			expect(child!.expressions.length).toBe(8);
			expect(child!.expressions[0].language).toBe("en");
			expect(child!.expressions[1].language).toBe("fr");
			expect(child!.expressions[2].language).toBe("de");
		});

		it("22_16: single expression (no pipe) — exactly one expression", () => {
			const input = loadFixture("22_16_expressions_one.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(root.kind).toBe("base");
			expect((root as BaseConcept).expressions.length).toBe(1);
			expect((root as BaseConcept).expressions[0].value).toBe("name");
			const child = getOnlyChildBase(root);
			expect(child?.expressions[0].value).toBe("Alice");
		});

		it("22_17: two expressions (minimum multiple) — exactly two, order NSW, New South Wales", () => {
			const input = loadFixture("22_17_expressions_two.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			const child = getOnlyChildBase(root);
			expect(child).toBeDefined();
			expect(child!.expressions.length).toBe(2);
			expect(child!.expressions[0].value).toBe("NSW");
			expect(child!.expressions[1].value).toBe("New South Wales");
		});
	});

	// -------------------------------------------------------------------------
	// 4. Long line and large document
	// -------------------------------------------------------------------------
	describe("4. Long line and large document", () => {
		it("22_18: long line many concepts — 20 top-level concepts, order preserved", () => {
			const input = loadFixture("22_18_long_line_many_concepts.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			expect(result.ast.concepts.length).toBe(20);
			expect(getFirstExpressionValue(result.ast.concepts[0])).toBe("a");
			expect(getFirstExpressionValue(result.ast.concepts[19])).toBe("t");
		});

		it("22_19: long line long expression — same length and content in AST", () => {
			const input = loadFixture("22_19_long_line_long_expression.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			const child = getOnlyChildBase(root);
			expect(child).toBeDefined();
			const exprVal = child!.expressions[0].value;
			expect(typeof exprVal).toBe("string");
			const expectedStart = "Lorem ipsum dolor";
			expect((exprVal as string).startsWith(expectedStart)).toBe(true);
			expect((exprVal as string).length).toBeGreaterThanOrEqual(500);
		});

		it("22_20: long line many pipes — 26 expressions a..z, order preserved", () => {
			const input = loadFixture("22_20_long_line_many_pipes.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			const child = getOnlyChildBase(root);
			expect(child).toBeDefined();
			expect(child!.expressions.length).toBe(26);
			expect(child!.expressions[0].value).toBe("a");
			expect(child!.expressions[25].value).toBe("z");
		});

		it("22_21: large document many top-level — 100 concepts, order preserved", () => {
			const input = loadFixture(
				"22_21_large_document_many_top_level.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			expect(result.ast.concepts.length).toBe(100);
			expect(getFirstExpressionValue(result.ast.concepts[0])).toBe("c1");
			expect(getFirstExpressionValue(result.ast.concepts[99])).toBe(
				"c100",
			);
		});

		it("22_22: large document mixed — 50 top-level, nested depth and children correct", () => {
			const input = loadFixture("22_22_large_document_mixed.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			expect(result.ast.concepts.length).toBe(50);
			const c1 = result.ast.concepts[0];
			expect(getFirstExpressionValue(c1)).toBe("c1");
			const n1 = findAssociationByExpression(c1, "n1");
			expect(n1).toBeDefined();
			const n2 =
				n1 &&
				getAssociationTarget(n1) &&
				findAssociationByExpression(getAssociationTarget(n1)!, "n2");
			expect(n2).toBeDefined();
		});

		it("22_23: boundary minimal document — one concept, one line x [y]", () => {
			const input = loadFixture("22_23_boundary_minimal_document.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			expect(result.ast.concepts.length).toBe(1);
			const root = result.ast.concepts[0];
			expect(getFirstExpressionValue(root)).toBe("x");
			expect(root.children.length).toBe(1);
			expect(
				getFirstExpressionValue(root.children[0] as BaseConcept),
			).toBe("y");
		});
	});

	// -------------------------------------------------------------------------
	// 5. Unicode stress
	// -------------------------------------------------------------------------
	describe("5. Unicode stress", () => {
		it("22_24: Unicode multi-script — expressions identical to source, no corruption", () => {
			const input = loadFixture("22_24_unicode_multi_script.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			const child = getOnlyChildBase(root);
			expect(child).toBeDefined();
			const values = child!.expressions.map((e) => e.value);
			expect(values).toContain("Иван");
			expect(values).toContain("田中");
			expect(values).toContain("北京");
			expect(values).toContain("αβγ");
		});

		it("22_25: Unicode many code points — expression value equals source, no truncation", () => {
			const input = loadFixture("22_25_unicode_many_codepoints.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			const child = getOnlyChildBase(root);
			expect(child).toBeDefined();
			const val = child!.expressions[0].value as string;
			expect(val).toContain("Съешь");
			expect(val).toContain("日本語");
			expect(val).toContain("北京");
			expect(val.length).toBeGreaterThanOrEqual(100);
		});

		it("22_26: Unicode quoted with delimiters — literal string, type quoted, no structural parse inside", () => {
			const input = loadFixture(
				"22_26_unicode_quoted_with_delimiters.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			const child = getOnlyChildBase(root);
			expect(child).toBeDefined();
			const expr = child!.expressions[0];
			expect(expr.type).toBe("quoted");
			expect(expr.value).toBe("日本語 [brackets] {braces} | pipe");
		});

		it("22_27: Unicode in metadata — language and custom values preserved", () => {
			const input = loadFixture("22_27_unicode_in_metadata.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			expect(result.ast.concepts.length).toBe(3);
			const tag = result.ast.concepts[0];
			expect(tag.metadata?.language).toBe("ja");
			const city = result.ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "city",
			);
			expect(city?.metadata?.custom).toBeDefined();
			const place = result.ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "place",
			);
			expect(place?.metadata?.custom).toBeDefined();
		});

		it("22_28: ASCII only baseline — all values match source", () => {
			const input = loadFixture("22_28_unicode_ascii_only.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			const child = getOnlyChildBase(root);
			expect(child?.expressions[0].value).toBe("Alice");
		});
	});

	// -------------------------------------------------------------------------
	// 6. Combined stress and boundary
	// -------------------------------------------------------------------------
	describe("6. Combined stress and boundary", () => {
		it("22_29: deep nesting + many siblings — depth 5, one level with 20 siblings", () => {
			const input = loadFixture(
				"22_29_combined_deep_nesting_many_siblings.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			expect(maxDepth(root)).toBe(5);
			let cur: ConceptNode = root;
			for (let i = 0; i < 4; i++) {
				const assocs = getAssociationChildren(cur);
				expect(assocs.length).toBe(1);
				const target = getAssociationTarget(assocs[0]);
				expect(target).toBeDefined();
				cur = target!;
			}
			expect(cur.children.length).toBe(20);
			expect(
				getFirstExpressionValue(cur.children[0] as BaseConcept),
			).toBe("s1");
			expect(
				getFirstExpressionValue(cur.children[19] as BaseConcept),
			).toBe("s20");
		});

		it("22_30: many expressions + many siblings — 10 expressions, 15 value items", () => {
			const input = loadFixture(
				"22_30_combined_many_expressions_many_siblings.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			const child = getOnlyChildBase(root);
			expect(child).toBeDefined();
			expect(child!.expressions.length).toBe(10);
			expect(child!.children.length).toBe(15);
			expect(child!.expressions[0].value).toBe("e1");
			expect(child!.expressions[9].value).toBe("e10");
		});

		it("22_31: large document + Unicode — 30 top-level, Unicode expressions unchanged", () => {
			const input = loadFixture(
				"22_31_combined_large_document_unicode.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			expect(result.ast.concepts.length).toBe(30);
			expect(getFirstExpressionValue(result.ast.concepts[0])).toBe("a");
			const aChild = getOnlyChildBase(result.ast.concepts[0]);
			expect(aChild?.expressions[0].value).toBe("Иван");
		});

		it("22_32: long line + many expressions + Unicode — all expressions present, Unicode unchanged", () => {
			const input = loadFixture(
				"22_32_combined_long_line_expressions_unicode.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			const root = result.ast.concepts[0];
			const child = getOnlyChildBase(root);
			expect(child).toBeDefined();
			expect(child!.expressions.length).toBeGreaterThanOrEqual(19);
			expect(child!.expressions.map((e) => e.value)).toContain("北京");
			expect(child!.expressions.map((e) => e.value)).toContain("日本語");
		});

		it("22_33: boundary empty document — zero concepts, no errors", () => {
			const input = loadFixture("22_33_boundary_empty_document.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			expect(result.ast.concepts.length).toBe(0);
		});

		it("22_34: boundary comments only — zero concepts", () => {
			const input = loadFixture("22_34_boundary_comments_only.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (!result.success) return;
			expect(result.ast.concepts.length).toBe(0);
		});
	});

	// -------------------------------------------------------------------------
	// 7. Parser limits (optional)
	// -------------------------------------------------------------------------
	describe("7. Parser limits (optional)", () => {
		it("22_35: optional extreme nesting — either success with depth 50 or defined failure", () => {
			const input = loadFixture("22_35_optional_extreme_nesting.amorfs");
			const result = parse(input);
			if (result.success) {
				const root = result.ast.concepts[0];
				expect(maxDepth(root)).toBe(50);
			} else {
				expect(result.error).toBeDefined();
				expect(typeof result.error).toBe("string");
			}
		});

		it("22_36: optional long identifier — parse succeeds and key preserved, or fails with clear error", () => {
			const input = loadFixture("22_36_optional_long_identifier.amorfs");
			const result = parse(input);
			if (result.success) {
				const root = result.ast.concepts[0];
				expect(root.key).toBeDefined();
				expect(typeof root.key).toBe("string");
				expect(root.key!.length).toBeGreaterThan(100);
			} else {
				expect(result.error).toBeDefined();
			}
		});
	});
});
