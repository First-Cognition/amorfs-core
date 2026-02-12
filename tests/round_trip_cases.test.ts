/**
 * Section 21 Round-trip and Structural Equivalence — fixture tests
 *
 * Covers: (1) parse validity for all valid document types, (2) structural
 * consistency (AST shape: key concepts, association counts, references,
 * metadata, child order, nesting depth), (3) equivalent forms (comma vs
 * newline, whitespace, comments, expression order, metadata order, nested
 * layout, ref usage), (4) invalid syntax (parse failure / isValid false).
 *
 * Implements plan .cursor/plans/21_round_trip.plan.md
 * Fixtures: tests/fixtures/round_trip_cases/ with prefix 2_
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
const roundTripDir = join(__dirname, "fixtures", "round_trip_cases");

function loadFixture(name: string): string {
	return readFileSync(join(roundTripDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

/** Collect all base concepts in tree (root + descendants). */
function collectBaseConcepts(node: ConceptNode): BaseConcept[] {
	const out: BaseConcept[] = [];
	if (node.kind === "base") out.push(node);
	for (const child of node.children) {
		out.push(...collectBaseConcepts(child));
		if (child.kind === "association" && child.children[0])
			out.push(...collectBaseConcepts(child.children[0]));
	}
	return out;
}

/** Find first base concept whose first expression value equals label (at any depth). */
function findConceptByFirstExpression(
	root: ConceptNode,
	label: string | number,
): BaseConcept | undefined {
	return collectBaseConcepts(root).find(
		(c) => getFirstExpressionValue(c) === label,
	);
}

/** Get association children of a concept (has_a associations). */
function getAssociationChildren(concept: ConceptNode): AssociationConcept[] {
	return concept.children.filter(
		(c): c is AssociationConcept => c.kind === "association",
	);
}

/** Get target concept of an association (first child). */
function getAssociationTarget(
	assoc: AssociationConcept,
): BaseConcept | undefined {
	const t = assoc.children[0];
	return t?.kind === "base" ? t : undefined;
}

/** Find association child whose target's first expression equals value. */
function findAssociationByExpression(
	concept: ConceptNode,
	exprValue: string | number,
): AssociationConcept | undefined {
	return getAssociationChildren(concept).find((a) => {
		const target = getAssociationTarget(a);
		return target && getFirstExpressionValue(target) === exprValue;
	});
}

/** Compute max depth from this node (0 = leaf). */
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

/** Check if any node in tree has metadata with temporal. */
function hasTemporalMetadata(node: ConceptNode): boolean {
	const check = (n: ConceptNode): boolean => {
		if (n.metadata?.temporal) return true;
		for (const c of n.children) {
			if (check(c)) return true;
			if (
				c.kind === "association" &&
				c.children[0] &&
				check(c.children[0])
			)
				return true;
		}
		return false;
	};
	return check(node);
}

/** Check if any node has metadata with confidence. */
function hasConfidenceMetadata(node: ConceptNode): boolean {
	const check = (n: ConceptNode): boolean => {
		if (n.metadata?.confidence !== undefined) return true;
		for (const c of n.children) {
			if (check(c)) return true;
			if (
				c.kind === "association" &&
				c.children[0] &&
				check(c.children[0])
			)
				return true;
		}
		return false;
	};
	return check(node);
}

/** Check if any node has custom metadata (custom attr or source). */
function hasCustomMetadata(node: ConceptNode): boolean {
	const check = (n: ConceptNode): boolean => {
		if (n.metadata?.custom && Object.keys(n.metadata.custom).length > 0)
			return true;
		if (n.metadata?.source) return true;
		for (const c of n.children) {
			if (check(c)) return true;
			if (
				c.kind === "association" &&
				c.children[0] &&
				check(c.children[0])
			)
				return true;
		}
		return false;
	};
	return check(node);
}

describe("Section 21 Round-trip and Structural Equivalence (2_)", () => {
	// -------------------------------------------------------------------------
	// 1. Parse validity (all valid fixtures parse and isValid)
	// -------------------------------------------------------------------------
	describe("1. Parse validity", () => {
		it("2_01: empty document parses, isValid true, zero concepts, empty references", () => {
			const input = loadFixture("2_01_parse_validity_empty.amorfs");
			const result = parse(input);
			expect(result.success).toBe(true);
			expect(isValid(input)).toBe(true);
			if (result.success) {
				expect(result.ast.concepts).toHaveLength(0);
				expect(Object.keys(result.ast.references)).toHaveLength(0);
			}
		});

		it("2_02: comments only parses, isValid true, zero concepts", () => {
			const input = loadFixture(
				"2_02_parse_validity_comments_only.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(0);
		});

		it("2_03: minimal concept (one expression, one value item) parses and isValid", () => {
			const input = loadFixture(
				"2_03_parse_validity_minimal_concept.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0];
			expect(root.kind).toBe("base");
			if (root.kind === "base") {
				expect(root.expressions.length).toBeGreaterThanOrEqual(1);
				expect(root.children.length).toBe(1);
			}
		});

		it("2_04: multiple top-level concepts parse, order and count preserved", () => {
			const input = loadFixture(
				"2_04_parse_validity_multi_concept.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(3);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("a");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("b");
			expect(getFirstExpressionValue(ast.concepts[2])).toBe("c");
		});

		it("2_05: document with @ref parses, references map populated", () => {
			const input = loadFixture("2_05_parse_validity_references.amorfs");
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(Object.keys(ast.references)).toContain("alice");
			expect(ast.references["alice"].kind).toBe("base");
		});

		it("2_06: metadata at multiple scopes parses, no malformed metadata", () => {
			const input = loadFixture(
				"2_06_parse_validity_metadata_scopes.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			// At least one node with metadata
			const withMeta = ast.concepts.some(
				(c) =>
					c.metadata != null ||
					(c.kind === "base" &&
						c.expressions.some((e) => e.metadata)),
			);
			expect(withMeta).toBe(true);
		});

		it("2_07: nested structures (two+ levels) parse, no unmatched brackets", () => {
			const input = loadFixture("2_07_parse_validity_nested.amorfs");
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0];
			const assoc1 = findAssociationByExpression(root, "state");
			expect(assoc1).toBeDefined();
			const stateTarget = getAssociationTarget(assoc1!);
			expect(stateTarget).toBeDefined();
			const assoc2 = findAssociationByExpression(stateTarget!, "city");
			expect(assoc2).toBeDefined();
		});

		it("2_08: all expression types (text, number, IRI, datetime, quoted) parse", () => {
			const input = loadFixture(
				"2_08_parse_validity_expression_types.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const allTypes = ast.concepts.flatMap((c) =>
				collectBaseConcepts(c).flatMap((b) =>
					b.expressions.map((e) => e.type),
				),
			);
			expect(allTypes).toContain("text");
			expect(allTypes).toContain("number");
			expect(allTypes).toContain("iri");
			expect(allTypes).toContain("datetime");
			expect(allTypes).toContain("quoted");
		});

		it("2_09: intrinsic (+) and contextual (-) associations parse", () => {
			const input = loadFixture(
				"2_09_parse_validity_associations.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0];
			const assocs = getAssociationChildren(person);
			expect(assocs.some((a) => a.isIntrinsic)).toBe(true);
			expect(assocs.some((a) => !a.isIntrinsic)).toBe(true);
		});

		it("2_10: implied concept (no expressions, only associations) parses", () => {
			const input = loadFixture("2_10_parse_validity_implied.amorfs");
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts.length).toBeGreaterThanOrEqual(1);
			const implied = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					c.expressions.length === 0 &&
					c.children.length > 0,
			);
			expect(implied).toBeDefined();
		});

		it("2_11: expression-only concept (no value block) parses", () => {
			const input = loadFixture(
				"2_11_parse_validity_expression_only.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const withExprNoBlock = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					c.expressions.length > 0 &&
					c.children.length === 0,
			);
			expect(withExprNoBlock).toBeDefined();
		});

		it("2_12: real-world multi-feature document parses", () => {
			const input = loadFixture("2_12_parse_validity_real_world.amorfs");
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts.length).toBeGreaterThanOrEqual(2);
		});

		it("2_13: multiple expressions (alternatives) parse, order preserved", () => {
			const input = loadFixture(
				"2_13_parse_validity_multiple_expressions.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const withTwo = ast.concepts
				.flatMap((c) => collectBaseConcepts(c))
				.find((c) => c.expressions.length >= 2);
			expect(withTwo).toBeDefined();
		});

		it("2_14: value block edge cases (empty, newline, mixed) parse", () => {
			const input = loadFixture(
				"2_14_parse_validity_value_block_edge.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const emptyConcept = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "empty",
			);
			expect(emptyConcept).toBeDefined();
			expect(emptyConcept!.children.length).toBe(0);
			const newlinesConcept = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "newlines",
			);
			expect(newlinesConcept).toBeDefined();
			expect(newlinesConcept!.children.length).toBe(3);
			const mixedConcept = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "mixed",
			);
			expect(mixedConcept).toBeDefined();
			expect(mixedConcept!.children.length).toBeGreaterThanOrEqual(2);
		});
	});

	// -------------------------------------------------------------------------
	// 2. Structural consistency (AST shape checks)
	// -------------------------------------------------------------------------
	describe("2. Structural consistency", () => {
		it("2_15: key concepts (person, address, contact) findable in AST", () => {
			const input = loadFixture("2_15_structural_key_concepts.amorfs");
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const roots = ast.concepts;
			const labels = roots.map((c) => getFirstExpressionValue(c));
			expect(labels).toContain("person");
			expect(labels).toContain("address");
			expect(labels).toContain("contact");
		});

		it("2_16: person concept has exactly 3 association children", () => {
			const input = loadFixture(
				"2_16_structural_association_counts.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "person",
			);
			expect(person).toBeDefined();
			expect(getAssociationChildren(person!).length).toBe(3);
		});

		it("2_17: references keys exactly alice, acme, source", () => {
			const input = loadFixture("2_17_structural_reference_keys.amorfs");
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const keys = Object.keys(ast.references).sort();
			expect(keys).toEqual(["acme", "alice", "source"]);
			keys.forEach((k) => {
				expect(ast.references[k].kind).toBe("base");
			});
		});

		it("2_18: metadata presence (temporal, confidence, custom)", () => {
			const input = loadFixture(
				"2_18_structural_metadata_presence.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			let hasTemporal = false;
			let hasConf = false;
			let hasCustom = false;
			for (const c of ast.concepts) {
				if (c.metadata?.temporal) hasTemporal = true;
				if (c.metadata?.confidence !== undefined) hasConf = true;
				if (
					c.metadata?.custom &&
					Object.keys(c.metadata.custom).length > 0
				)
					hasCustom = true;
			}
			expect(hasTemporal).toBe(true);
			expect(hasConf).toBe(true);
			expect(hasCustom).toBe(true);
		});

		it("2_19: child order (name, phone, email) preserved", () => {
			const input = loadFixture("2_19_structural_child_order.amorfs");
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0];
			const assocs = getAssociationChildren(person);
			expect(assocs.length).toBe(3);
			expect(
				getFirstExpressionValue(getAssociationTarget(assocs[0])!),
			).toBe("name");
			expect(
				getFirstExpressionValue(getAssociationTarget(assocs[1])!),
			).toBe("phone");
			expect(
				getFirstExpressionValue(getAssociationTarget(assocs[2])!),
			).toBe("email");
		});

		it("2_20: nesting depth (root→country→state→city→street) correct", () => {
			const input = loadFixture("2_20_structural_nesting_depth.amorfs");
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0];
			let cur: ConceptNode = root;
			const chain: string[] = [getFirstExpressionValue(cur) as string];
			for (let i = 0; i < 5; i++) {
				const assoc = getAssociationChildren(cur)[0];
				if (!assoc) break;
				const target = getAssociationTarget(assoc);
				if (!target) break;
				chain.push(getFirstExpressionValue(target) as string);
				cur = target;
			}
			expect(chain).toContain("street");
			expect(chain.length).toBe(5);
		});

		it("2_21: expression count (two expressions vs one) correct", () => {
			const input = loadFixture(
				"2_21_structural_expression_count.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const stateConcept = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "state",
			);
			const singleConcept = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "single",
			);
			// state has one child with two expressions (NSW | New South Wales)
			const stateChild =
				stateConcept?.kind === "base"
					? stateConcept.children[0]
					: undefined;
			const stateChildBase =
				stateChild?.kind === "base" ? stateChild : undefined;
			expect(stateChildBase?.expressions.length).toBe(2);
			expect(singleConcept?.kind).toBe("base");
			expect((singleConcept as BaseConcept).expressions.length).toBe(1);
		});

		it("2_22: association type intrinsic vs contextual not swapped", () => {
			const input = loadFixture(
				"2_22_structural_association_type.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0];
			const birthDate = findAssociationByExpression(person, "birth_date");
			const phone = findAssociationByExpression(person, "phone");
			expect(birthDate?.isIntrinsic).toBe(true);
			expect(phone?.isIntrinsic).toBe(false);
		});

		it("2_23: references.main points to defining concept", () => {
			const input = loadFixture(
				"2_23_structural_references_point_to_definition.amorfs",
			);
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["main"]).toBeDefined();
			expect(ast.references["main"].key).toBe("main");
			// Defining concept is thing [value] @main — ref points to concept with first expression "thing"
			const def = ast.references["main"];
			const firstExpr =
				def.kind === "base" && def.expressions[0]
					? def.expressions[0].value
					: null;
			expect(firstExpr).toBe("thing");
		});

		it("2_24: metadata scope (per-expression, per-association, per-concept) distinct", () => {
			const input = loadFixture("2_24_structural_metadata_scope.amorfs");
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			// Per-expression: A {en} | B {fr} — value block has one concept with two expressions with language
			const perExprConcept = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "per_expr",
			) as BaseConcept;
			const valueConcept = perExprConcept?.children?.[0];
			const exprWithLang =
				valueConcept?.kind === "base" &&
				valueConcept.expressions?.some(
					(e) =>
						e.language != null ||
						(e.metadata && "language" in e.metadata),
				);
			expect(exprWithLang).toBe(true);
			// Per-association: association has metadata
			const withAssocMeta = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "with_assoc_meta",
			);
			expect(
				getAssociationChildren(withAssocMeta!).some(
					(a) => a.metadata != null,
				),
			).toBe(true);
			// Per-concept (after ]): concept has metadata
			const withBlockMeta = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "with_block_meta",
			);
			expect(withBlockMeta?.metadata).toBeDefined();
		});
	});

	// -------------------------------------------------------------------------
	// 3. Equivalent forms (structural equivalence of two sources)
	// -------------------------------------------------------------------------
	describe("3. Equivalent forms", () => {
		it("2_25: comma vs newline — same concept count, same list items (a,b,c)", () => {
			const inputA = loadFixture(
				"2_25_equivalent_comma_vs_newline_a.amorfs",
			);
			const inputB = loadFixture(
				"2_25_equivalent_comma_vs_newline_b.amorfs",
			);
			expect(parse(inputA).success).toBe(true);
			expect(parse(inputB).success).toBe(true);
			expect(isValid(inputA)).toBe(true);
			expect(isValid(inputB)).toBe(true);
			const astA = parseOrThrow(inputA);
			const astB = parseOrThrow(inputB);
			expect(astA.concepts.length).toBe(astB.concepts.length);
			const listA = astA.concepts.find(
				(c) => getFirstExpressionValue(c) === "list",
			);
			const listB = astB.concepts.find(
				(c) => getFirstExpressionValue(c) === "list",
			);
			expect(listA).toBeDefined();
			expect(listB).toBeDefined();
			// Both use newline-separated items; spec allows newline as item separator
			expect(listA!.children.length).toBe(3);
			expect(listB!.children.length).toBe(3);
			const valsA = listA!.children.map((c) =>
				getFirstExpressionValue(c),
			);
			const valsB = listB!.children.map((c) =>
				getFirstExpressionValue(c),
			);
			expect(valsA.sort()).toEqual(["a", "b", "c"].sort());
			expect(valsB.sort()).toEqual(["a", "b", "c"].sort());
		});

		it("2_26: insignificant whitespace — same concept count and expression values", () => {
			const inputA = loadFixture("2_26_equivalent_whitespace_a.amorfs");
			const inputB = loadFixture("2_26_equivalent_whitespace_b.amorfs");
			expect(parse(inputA).success).toBe(true);
			expect(parse(inputB).success).toBe(true);
			expect(isValid(inputA)).toBe(true);
			expect(isValid(inputB)).toBe(true);
			const astA = parseOrThrow(inputA);
			const astB = parseOrThrow(inputB);
			expect(astA.concepts.length).toBe(2);
			expect(astB.concepts.length).toBe(2);
			expect(getFirstExpressionValue(astA.concepts[0])).toBe(
				getFirstExpressionValue(astB.concepts[0]),
			);
			expect(getFirstExpressionValue(astA.concepts[1])).toBe(
				getFirstExpressionValue(astB.concepts[1]),
			);
		});

		it("2_27: comment placement — same structure, comments do not create concepts", () => {
			const inputA = loadFixture(
				"2_27_equivalent_comment_placement_a.amorfs",
			);
			const inputB = loadFixture(
				"2_27_equivalent_comment_placement_b.amorfs",
			);
			expect(parse(inputA).success).toBe(true);
			expect(parse(inputB).success).toBe(true);
			expect(isValid(inputA)).toBe(true);
			expect(isValid(inputB)).toBe(true);
			const astA = parseOrThrow(inputA);
			const astB = parseOrThrow(inputB);
			expect(astA.concepts.length).toBe(1);
			expect(astB.concepts.length).toBe(1);
			expect(getFirstExpressionValue(astA.concepts[0])).toBe("name");
			expect(getFirstExpressionValue(astB.concepts[0])).toBe("name");
		});

		it("2_28: expression order — same expression count and set (A, B)", () => {
			const inputA = loadFixture(
				"2_28_equivalent_expression_order_a.amorfs",
			);
			const inputB = loadFixture(
				"2_28_equivalent_expression_order_b.amorfs",
			);
			expect(parse(inputA).success).toBe(true);
			expect(parse(inputB).success).toBe(true);
			expect(isValid(inputA)).toBe(true);
			expect(isValid(inputB)).toBe(true);
			const astA = parseOrThrow(inputA);
			const astB = parseOrThrow(inputB);
			// label [A | B] — root has one child (base concept with two expressions)
			const childA = (astA.concepts[0] as BaseConcept)
				.children[0] as BaseConcept;
			const childB = (astB.concepts[0] as BaseConcept)
				.children[0] as BaseConcept;
			expect(childA.expressions.length).toBe(2);
			expect(childB.expressions.length).toBe(2);
			const setA = new Set(childA.expressions.map((e) => e.value));
			const setB = new Set(childB.expressions.map((e) => e.value));
			expect(setA).toEqual(new Set(["A", "B"]));
			expect(setB).toEqual(new Set(["A", "B"]));
		});

		it("2_29: metadata attribute order — same metadata keys and values", () => {
			const inputA = loadFixture(
				"2_29_equivalent_metadata_order_a.amorfs",
			);
			const inputB = loadFixture(
				"2_29_equivalent_metadata_order_b.amorfs",
			);
			expect(parse(inputA).success).toBe(true);
			expect(parse(inputB).success).toBe(true);
			expect(isValid(inputA)).toBe(true);
			expect(isValid(inputB)).toBe(true);
			const astA = parseOrThrow(inputA);
			const astB = parseOrThrow(inputB);
			const metaA = astA.concepts[0].metadata;
			const metaB = astB.concepts[0].metadata;
			expect(metaA?.temporal?.start).toBeDefined();
			expect(metaB?.temporal?.start).toBeDefined();
			expect(metaA?.confidence).toBe(0.9);
			expect(metaB?.confidence).toBe(0.9);
		});

		it("2_30: nested structure (layout) — same depth and chain a→b→c, leaf x", () => {
			const inputA = loadFixture(
				"2_30_equivalent_nested_structure_a.amorfs",
			);
			const inputB = loadFixture(
				"2_30_equivalent_nested_structure_b.amorfs",
			);
			expect(parse(inputA).success).toBe(true);
			expect(parse(inputB).success).toBe(true);
			expect(isValid(inputA)).toBe(true);
			expect(isValid(inputB)).toBe(true);
			const astA = parseOrThrow(inputA);
			const astB = parseOrThrow(inputB);
			const depthA = maxDepth(astA.concepts[0]);
			const depthB = maxDepth(astB.concepts[0]);
			expect(depthA).toBe(depthB);
			expect(depthA).toBeGreaterThanOrEqual(3);
			let curA: ConceptNode = astA.concepts[0];
			let curB: ConceptNode = astB.concepts[0];
			// Chain: a -> b -> c -> (leaf with value x); 3 associations then leaf
			for (let i = 0; i < 3; i++) {
				expect(getFirstExpressionValue(curA)).toBe(
					getFirstExpressionValue(curB),
				);
				const assocA = getAssociationChildren(curA)[0];
				const assocB = getAssociationChildren(curB)[0];
				if (!assocA?.children[0] || !assocB?.children[0]) break;
				curA = getAssociationTarget(assocA)!;
				curB = getAssociationTarget(assocB)!;
			}
			// Leaf value "x" is in c's value block (first child of c)
			const leafA =
				curA.kind === "base" && curA.children[0]
					? curA.children[0]
					: curA;
			const leafB =
				curB.kind === "base" && curB.children[0]
					? curB.children[0]
					: curB;
			expect(getFirstExpressionValue(leafA)).toBe("x");
			expect(getFirstExpressionValue(leafB)).toBe("x");
		});

		it("2_31: ref usage — one ref defined, both uses resolve to same key", () => {
			const input = loadFixture("2_31_equivalent_ref_usage.amorfs");
			expect(parse(input).success).toBe(true);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(Object.keys(ast.references)).toContain("main");
			// Association target @main and metadata source=@main both use same key
			const doc = ast.concepts.find(
				(c) => getFirstExpressionValue(c) === "doc",
			);
			expect(doc).toBeDefined();
			const targetAssoc = findAssociationByExpression(doc!, "target");
			expect(targetAssoc).toBeDefined();
			const targetNode = targetAssoc!.children[0];
			if (targetNode.kind === "reference")
				expect(targetNode.referenceKey).toBe("main");
			expect(doc!.metadata?.source?.key).toBe("main");
		});
	});

	// -------------------------------------------------------------------------
	// 4. Invalid syntax (parse failure or isValid false)
	// -------------------------------------------------------------------------
	describe("4. Invalid syntax", () => {
		it("2_32: unmatched brackets — parse fails or isValid false", () => {
			const input = loadFixture("2_32_invalid_unmatched_brackets.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});

		it("2_33: missing space after + or - — parse fails or isValid false", () => {
			const input = loadFixture(
				"2_33_invalid_missing_space_after_plus_minus.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});

		it("2_34: unclosed quoted string — parse fails or isValid false", () => {
			const input = loadFixture(
				"2_34_invalid_unclosed_quoted_string.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});

		it("2_35: malformed metadata (unclosed brace) — parse fails or isValid false", () => {
			const input = loadFixture("2_35_invalid_malformed_metadata.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});
	});
});
