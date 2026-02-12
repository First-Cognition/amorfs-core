/**
 * Implicit value block syntax — fixture tests
 *
 * Covers: concept title line followed by newline and one or more association
 * lines (-/+) parsing as equivalent to explicit "Title [ - A, - B ]".
 * Implements plan .cursor/plans/implicit_value_block_syntax_a455ba1a.plan.md
 *
 * Fixtures: tests/fixtures/implicit_block/
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
const implicitBlockDir = join(__dirname, "fixtures", "implicit_block");

function loadFixture(name: string): string {
	return readFileSync(join(implicitBlockDir, name), "utf-8");
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

function getAssociationTargetFirstValue(
	assoc: AssociationConcept,
): string | number | null {
	const target = assoc.children[0];
	if (!target || target.kind !== "base") return null;
	if (target.children.length > 0)
		return target.children[0].kind === "base"
			? getFirstExpressionValue(target.children[0])
			: getFirstExpressionValue(target);
	return getFirstExpressionValue(target);
}

describe("Implicit value block syntax", () => {
	describe("1. One title + one association line", () => {
		it("01_one_title_one_association: parses as one base concept with one association child", () => {
			const input = loadFixture("01_one_title_one_association.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(getFirstExpressionValue(c)).toBe("Your Data");
			expect(c.children).toHaveLength(1);
			const assoc = getChildAsAssociation(c, 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.isIntrinsic).toBe(false);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("Your Name");
		});
	});

	describe("2. One title + multiple association lines", () => {
		it("02_one_title_multiple_associations: plan example — Name and Email", () => {
			const input = loadFixture("02_one_title_multiple_associations.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(getFirstExpressionValue(c)).toBe("Your Data");
			expect(c.children).toHaveLength(2);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(c, 0)!)).toBe(
				"Your Name",
			);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(c, 1)!)).toBe(
				"youremail@address.com",
			);
		});
	});

	describe("3. Leading space before -/+", () => {
		it("03_leading_space_before_association: optional space before - and +", () => {
			const input = loadFixture("03_leading_space_before_association.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(getFirstExpressionValue(c)).toBe("Contact");
			expect(c.children).toHaveLength(2);
			const a0 = getChildAsAssociation(c, 0);
			const a1 = getChildAsAssociation(c, 1);
			expect(a0!.isIntrinsic).toBe(false);
			expect(a1!.isIntrinsic).toBe(true);
			expect(getAssociationTargetFirstValue(a0!)).toBe("555-1234");
			expect(getAssociationTargetFirstValue(a1!)).toBe("a@b.com");
		});
	});

	describe("4. With metadata and conceptRef", () => {
		it("04_with_metadata: concept metadata after implicit block", () => {
			const input = loadFixture("04_with_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.metadata).not.toBeNull();
			expect(c.metadata!.language).toBe("en");
			expect(c.children).toHaveLength(2);
		});

		it("05_with_concept_ref: @ref after implicit block, reference registered", () => {
			const input = loadFixture("05_with_concept_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("profile_ref");
			expect(ast.references["profile_ref"]).toBeDefined();
			expect(c.children).toHaveLength(2);
		});
	});

	describe("5. Equivalence with explicit value block", () => {
		it("implicit and explicit produce same AST: one concept, two associations", () => {
			const explicit =
				'Your Data [ - Name [Your Name], - Email ["youremail@address.com"] ]';
			const implicit = loadFixture("02_one_title_multiple_associations.amorfs");

			const astExplicit = parseOrThrow(explicit);
			const astImplicit = parseOrThrow(implicit);

			expect(astExplicit.concepts).toHaveLength(1);
			expect(astImplicit.concepts).toHaveLength(1);

			const cE = astExplicit.concepts[0] as BaseConcept;
			const cI = astImplicit.concepts[0] as BaseConcept;

			expect(getFirstExpressionValue(cE)).toBe(getFirstExpressionValue(cI));
			expect(cE.children.length).toBe(cI.children.length);
			expect(cE.children[0].kind).toBe(cI.children[0].kind);
			expect(cE.children[1].kind).toBe(cI.children[1].kind);
			expect(getAssociationTargetFirstValue(cE.children[0] as AssociationConcept)).toBe(
				getAssociationTargetFirstValue(cI.children[0] as AssociationConcept),
			);
			expect(getAssociationTargetFirstValue(cE.children[1] as AssociationConcept)).toBe(
				getAssociationTargetFirstValue(cI.children[1] as AssociationConcept),
			);
		});
	});

	describe("6. Boundary: implicit block followed by next top-level concept", () => {
		it("06_boundary_next_concept: two top-level concepts, second not absorbed", () => {
			const input = loadFixture("06_boundary_next_concept.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const first = ast.concepts[0] as BaseConcept;
			const second = ast.concepts[1] as BaseConcept;
			expect(getFirstExpressionValue(first)).toBe("First Concept");
			expect(first.children).toHaveLength(2);
			expect(getFirstExpressionValue(second)).toBe("Second Concept");
			expect(second.children).toHaveLength(1);
		});
	});

	describe("7. Edge: line without -/+ starts new concept", () => {
		it("07_edge_non_association_starts_new_concept: Your Data, - Name [x], then Other Concept", () => {
			const input = loadFixture(
				"07_edge_non_association_starts_new_concept.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("Your Data");
			expect(ast.concepts[0].children).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("Other Concept");
			expect(ast.concepts[1].children).toHaveLength(0);
		});
	});

	describe("8. Intrinsic and contextual", () => {
		it("08_intrinsic_and_contextual: + and - associations in order", () => {
			const input = loadFixture("08_intrinsic_and_contextual.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.children).toHaveLength(2);
			expect(getChildAsAssociation(c, 0)!.isIntrinsic).toBe(true);
			expect(getChildAsAssociation(c, 1)!.isIntrinsic).toBe(false);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(c, 0)!)).toBe(
				"1990-01-01",
			);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(c, 1)!)).toBe(
				"555-1234",
			);
		});
	});
});
