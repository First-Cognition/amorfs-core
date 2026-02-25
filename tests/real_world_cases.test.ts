/**
 * Section 18 Real-World Style Documents — fixture tests
 *
 * Covers: business card/contact (minimal, full, with @ref, with metadata, multiple),
 * person with semantic vocabulary (FOAF/schema, nested, intrinsic/contextual, IRI),
 * multilingual product (expressions, price nested, mixed associations, description),
 * provenance (source definitions, metadata source=@ref, association ref targets, full),
 * combined real-world (card+product, person+provenance, full integration),
 * edge and stress (minimal contact, implied concept, Unicode, dense siblings, comments).
 *
 * Implements plan .cursor/plans/18_real_world_9954d68c.plan.md
 * Fixtures: tests/fixtures/real_world_cases/ with prefix 18_
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
	type ConceptRef,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const realWorldCasesDir = join(__dirname, "fixtures", "real_world_cases");

function loadFixture(name: string): string {
	return readFileSync(join(realWorldCasesDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

/** Find association whose target concept has first expression equal to label (e.g. 'contact', 'role'). */
function findAssociationByExpression(
	concept: ConceptNode,
	label: string,
): AssociationConcept | undefined {
	return concept.children.find(
		(ch): ch is AssociationConcept =>
			ch.kind === "association" &&
			ch.associationType === "has_a" &&
			ch.children.length > 0 &&
			ch.children[0].kind === "base" &&
			getFirstExpressionValue(ch.children[0]) === label,
	);
}

function getAssociationTarget(
	assoc: AssociationConcept,
): BaseConcept | undefined {
	const target = assoc.children[0];
	return target?.kind === "base" ? target : undefined;
}

/** Find a base concept anywhere under root that has first expression equal to value. */
function findConceptByFirstExpression(
	root: ConceptNode,
	value: string | number,
): BaseConcept | undefined {
	if (root.kind === "base" && getFirstExpressionValue(root) === value)
		return root;
	for (const ch of root.children) {
		const found = findConceptByFirstExpression(ch, value);
		if (found) return found;
	}
	return undefined;
}

describe("Section 18 Real-World Style Documents (18_)", () => {
	// -------------------------------------------------------------------------
	// 1. Business card / contact
	// -------------------------------------------------------------------------
	describe("1. Business card / contact", () => {
		it("18_01: minimal business card — single person, one role, one contact", () => {
			const input = loadFixture("18_01_business_card_minimal.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const card = ast.concepts[0] as BaseConcept;
			expect(card.kind).toBe("base");
			expect(card.expressions.length).toBeGreaterThanOrEqual(1);
			const hasA = card.children.filter(
				(c): c is AssociationConcept =>
					c.kind === "association" && c.associationType === "has_a",
			);
			expect(hasA.length).toBeGreaterThanOrEqual(2);
			const roleAssoc = findAssociationByExpression(card, "role");
			const contactAssoc = findAssociationByExpression(card, "contact");
			expect(roleAssoc).toBeDefined();
			expect(contactAssoc).toBeDefined();
			const contactTarget = getAssociationTarget(contactAssoc!);
			expect(contactTarget).toBeDefined();
			expect(contactTarget!.children.length).toBeGreaterThanOrEqual(1);
			const emailAssoc = findAssociationByExpression(
				contactTarget!,
				"email",
			);
			expect(emailAssoc).toBeDefined();
		});

		it("18_02: full business card — name, role (multilingual), contact, address", () => {
			const input = loadFixture("18_02_business_card_full.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const card = ast.concepts[0] as BaseConcept;
			const roleAssoc = findAssociationByExpression(card, "role");
			const contactAssoc = findAssociationByExpression(card, "contact");
			const addressAssoc = findAssociationByExpression(card, "address");
			expect(roleAssoc).toBeDefined();
			expect(contactAssoc).toBeDefined();
			expect(addressAssoc).toBeDefined();
			const contactTarget = getAssociationTarget(contactAssoc!);
			expect(
				findAssociationByExpression(contactTarget!, "email"),
			).toBeDefined();
			expect(
				findAssociationByExpression(contactTarget!, "phone"),
			).toBeDefined();
			const addressTarget = getAssociationTarget(addressAssoc!);
			expect(
				findAssociationByExpression(addressTarget!, "city"),
			).toBeDefined();
			expect(
				card.expressions.some((e) => e.value === "Alan Turing") ||
					card.children.some(
						(c) =>
							c.kind === "base" &&
							(c as BaseConcept).expressions.some(
								(e) => e.value === "Alan Turing",
							),
					),
			).toBe(true);
			const streetAssoc = findAssociationByExpression(
				addressTarget!,
				"street",
			);
			const cityAssoc = findAssociationByExpression(
				addressTarget!,
				"city",
			);
			expect(streetAssoc).toBeDefined();
			expect(cityAssoc).toBeDefined();
			const cityLabelNode = getAssociationTarget(cityAssoc!);
			const cityValueNode = cityLabelNode!.children.find(
				(c) => c.kind === "base",
			) as BaseConcept | undefined;
			expect(getFirstExpressionValue(cityValueNode!)).toBe(
				"Buckinghamshire",
			);
		});

		it("18_03: business card with concept reference (@ref)", () => {
			const input = loadFixture("18_03_business_card_with_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["card_ref"]).toBeDefined();
			expect(ast.references["org_ref"]).toBeDefined();
			const cardConcept = ast.concepts.find(
				(c) =>
					c.kind === "base" && (c as BaseConcept).key === "card_ref",
			) as BaseConcept | undefined;
			expect(cardConcept).toBeDefined();
			const employerAssoc = findAssociationByExpression(
				cardConcept!,
				"employer",
			);
			expect(employerAssoc).toBeDefined();
			const employerLabelNode = employerAssoc!.children[0];
			expect(employerLabelNode.kind).toBe("base");
			const refChild = employerLabelNode.children[0];
			expect(refChild.kind).toBe("reference");
			expect((refChild as ReferenceConcept).referenceKey).toBe("org_ref");
		});

		it("18_04: business card with metadata (temporal, confidence, language)", () => {
			const input = loadFixture(
				"18_04_business_card_with_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const card = ast.concepts[0] as BaseConcept;
			const roleAssoc = findAssociationByExpression(card, "role");
			const contactAssoc = findAssociationByExpression(card, "contact");
			const addressAssoc = findAssociationByExpression(card, "address");
			expect(roleAssoc).toBeDefined();
			expect(contactAssoc).toBeDefined();
			expect(addressAssoc).toBeDefined();
			const contactTarget = getAssociationTarget(contactAssoc!);
			const emailAssoc = findAssociationByExpression(
				contactTarget!,
				"email",
			);
			expect(emailAssoc).toBeDefined();
		});

		it("18_05: multiple top-level business cards", () => {
			const input = loadFixture("18_05_business_cards_multiple.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const cards = ast.concepts.filter(
				(c) => c.kind === "base",
			) as BaseConcept[];
			expect(cards.length).toBe(2);
			expect(getFirstExpressionValue(cards[0])).toBe("business card");
			expect(getFirstExpressionValue(cards[1])).toBe("business card");
			expect(
				findAssociationByExpression(cards[0], "contact"),
			).toBeDefined();
			expect(
				findAssociationByExpression(cards[0], "address"),
			).toBeDefined();
			expect(
				findAssociationByExpression(cards[1], "contact"),
			).toBeDefined();
			expect(
				findAssociationByExpression(cards[1], "address"),
			).toBeDefined();
		});
	});

	// -------------------------------------------------------------------------
	// 2. Person with semantic vocabulary
	// -------------------------------------------------------------------------
	describe("2. Person with semantic vocabulary", () => {
		it("18_06: person with FOAF/schema multiple expressions per label", () => {
			const input = loadFixture(
				"18_06_person_semantic_vocabulary.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const person = ast.concepts[0] as BaseConcept;
			const nameAssoc = findAssociationByExpression(person, "name");
			const emailAssoc = findAssociationByExpression(person, "email");
			const worksForAssoc = findAssociationByExpression(
				person,
				"works for",
			);
			expect(nameAssoc).toBeDefined();
			expect(emailAssoc).toBeDefined();
			expect(worksForAssoc).toBeDefined();
			const nameTarget = getAssociationTarget(nameAssoc!);
			expect(nameTarget).toBeDefined();
			expect(nameTarget!.expressions.length).toBeGreaterThanOrEqual(2);
			const worksForTarget = getAssociationTarget(worksForAssoc!);
			expect(
				findAssociationByExpression(worksForTarget!, "name"),
			).toBeDefined();
			expect(
				findAssociationByExpression(worksForTarget!, "url"),
			).toBeDefined();
		});

		it("18_07: person with nested vocabulary (works for with schema:name inside)", () => {
			const input = loadFixture("18_07_person_nested_vocabulary.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			const worksForAssoc = findAssociationByExpression(
				person,
				"works for",
			);
			expect(worksForAssoc).toBeDefined();
			const worksForTarget = getAssociationTarget(worksForAssoc!);
			expect(worksForTarget).toBeDefined();
			const innerNameAssoc = findAssociationByExpression(
				worksForTarget!,
				"name",
			);
			const innerUrlAssoc = findAssociationByExpression(
				worksForTarget!,
				"url",
			);
			expect(innerNameAssoc).toBeDefined();
			expect(innerUrlAssoc).toBeDefined();
			const urlTarget = getAssociationTarget(innerUrlAssoc!);
			expect(urlTarget).toBeDefined();
			const urlValue = urlTarget!.children.find(
				(c) => c.kind === "base",
			) as BaseConcept | undefined;
			expect(
				urlValue?.expressions[0]?.type === "iri" ||
					(urlValue &&
						String(urlValue.expressions[0]?.value).startsWith(
							"http",
						)),
			).toBe(true);
		});

		it("18_08: person with intrinsic (+) and contextual (-) associations", () => {
			const input = loadFixture(
				"18_08_person_intrinsic_contextual.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			const birthDateAssoc = findAssociationByExpression(
				person,
				"birth date",
			);
			const nationalityAssoc = findAssociationByExpression(
				person,
				"nationality",
			);
			const jobTitleAssoc = findAssociationByExpression(
				person,
				"job title",
			);
			const emailAssoc = findAssociationByExpression(person, "email");
			expect(birthDateAssoc).toBeDefined();
			expect(birthDateAssoc!.isIntrinsic).toBe(true);
			expect(nationalityAssoc).toBeDefined();
			expect(nationalityAssoc!.isIntrinsic).toBe(true);
			expect(jobTitleAssoc).toBeDefined();
			expect(jobTitleAssoc!.isIntrinsic).toBe(false);
			expect(emailAssoc).toBeDefined();
			expect(emailAssoc!.isIntrinsic).toBe(false);
		});

		it("18_09: person with IRI expressions (homepage, sameAs)", () => {
			const input = loadFixture("18_09_person_iri_expressions.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			const homepageAssoc = findAssociationByExpression(
				person,
				"homepage",
			);
			const sameAsAssoc = findAssociationByExpression(person, "same as");
			expect(homepageAssoc).toBeDefined();
			expect(sameAsAssoc).toBeDefined();
			const homepageTarget = getAssociationTarget(homepageAssoc!);
			const sameAsTarget = getAssociationTarget(sameAsAssoc!);
			const homepageValue = homepageTarget?.children.find(
				(c) => c.kind === "base",
			) as BaseConcept | undefined;
			const sameAsValue = sameAsTarget?.children.find(
				(c) => c.kind === "base",
			) as BaseConcept | undefined;
			expect(
				homepageValue?.expressions[0]?.type === "iri" ||
					(homepageValue &&
						String(homepageValue.expressions[0]?.value).includes(
							"w3.org",
						)),
			).toBe(true);
			expect(
				sameAsValue?.expressions[0]?.type === "iri" ||
					(sameAsValue &&
						String(sameAsValue.expressions[0]?.value).includes(
							"dbpedia",
						)),
			).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 3. Multilingual product
	// -------------------------------------------------------------------------
	describe("3. Multilingual product", () => {
		it("18_10: product with multiple expressions per concept (en/fr/ja)", () => {
			const input = loadFixture(
				"18_10_product_multilingual_expressions.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const product = ast.concepts[0] as BaseConcept;
			const productNameNode = product.children.find(
				(c) => c.kind === "base",
			) as BaseConcept | undefined;
			expect(
				(productNameNode?.expressions.length ??
					product.expressions.length) >= 2 ||
					product.children.some(
						(c) =>
							c.kind === "base" &&
							(c as BaseConcept).expressions.length >= 2,
					),
			).toBe(true);
			const descAssoc = findAssociationByExpression(
				product,
				"description",
			);
			expect(descAssoc).toBeDefined();
			const descTarget = getAssociationTarget(descAssoc!);
			const descValueNode = descTarget!.children.find(
				(c) => c.kind === "base",
			) as BaseConcept | undefined;
			expect(
				(descValueNode?.expressions.length ??
					descTarget!.expressions.length) >= 2,
			).toBe(true);
			expect(
				descTarget!.expressions.some((e) =>
					String(e.value).includes("多機能"),
				) ||
					descValueNode?.expressions.some((e) =>
						String(e.value).includes("多機能"),
					),
			).toBe(true);
		});

		it("18_11: product with nested associations (price: amount + currency)", () => {
			const input = loadFixture("18_11_product_price_nested.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const product = ast.concepts[0] as BaseConcept;
			const priceAssoc = findAssociationByExpression(product, "price");
			expect(priceAssoc).toBeDefined();
			const priceTarget = getAssociationTarget(priceAssoc!);
			const amountAssoc = findAssociationByExpression(
				priceTarget!,
				"amount",
			);
			const currencyAssoc = findAssociationByExpression(
				priceTarget!,
				"currency",
			);
			expect(amountAssoc).toBeDefined();
			expect(currencyAssoc).toBeDefined();
			expect(amountAssoc!.isIntrinsic).toBe(true);
			expect(currencyAssoc!.isIntrinsic).toBe(true);
			const amountTarget = getAssociationTarget(amountAssoc!);
			const amountValueNode = amountTarget!.children.find(
				(c) => c.kind === "base",
			) as BaseConcept | undefined;
			expect(
				amountValueNode?.expressions[0]?.value ??
					amountTarget!.expressions[0]?.value,
			).toBe(299);
		});

		it("18_12: product with mixed intrinsic (price) and contextual (features)", () => {
			const input = loadFixture(
				"18_12_product_mixed_associations.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const product = ast.concepts[0] as BaseConcept;
			const priceAssoc = findAssociationByExpression(product, "price");
			const featuresAssoc = findAssociationByExpression(
				product,
				"features",
			);
			expect(priceAssoc).toBeDefined();
			expect(featuresAssoc).toBeDefined();
			expect(featuresAssoc!.isIntrinsic).toBe(false);
			const priceTarget = getAssociationTarget(priceAssoc!);
			expect(
				findAssociationByExpression(priceTarget!, "amount")!
					.isIntrinsic,
			).toBe(true);
			const featuresTarget = getAssociationTarget(featuresAssoc!);
			expect(
				findAssociationByExpression(featuresTarget!, "heart rate"),
			).toBeDefined();
			expect(
				findAssociationByExpression(featuresTarget!, "gps"),
			).toBeDefined();
			expect(
				findAssociationByExpression(featuresTarget!, "water resistant"),
			).toBeDefined();
		});

		it("18_13: product with description as multi-expression block", () => {
			const input = loadFixture(
				"18_13_product_description_multilingual.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const product = ast.concepts[0] as BaseConcept;
			const descAssoc = findAssociationByExpression(
				product,
				"description",
			);
			expect(descAssoc).toBeDefined();
			const descTarget = getAssociationTarget(descAssoc!);
			const descValueNode = descTarget!.children.find(
				(c) => c.kind === "base",
			) as BaseConcept | undefined;
			expect(
				(descValueNode?.expressions.length ??
					descTarget!.expressions.length) >= 2,
			).toBe(true);
			expect(
				descTarget!.expressions.some((e) =>
					String(e.value).includes("多機能"),
				) ||
					descValueNode?.expressions.some((e) =>
						String(e.value).includes("多機能"),
					),
			).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 4. Provenance
	// -------------------------------------------------------------------------
	describe("4. Provenance", () => {
		it("18_14: source definitions with @ref (sensor, process)", () => {
			const input = loadFixture(
				"18_14_provenance_source_definitions.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["temp_sensor"]).toBeDefined();
			expect(ast.references["auto_collection"]).toBeDefined();
			const sensorConcept = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					(c as BaseConcept).key === "temp_sensor",
			);
			const processConcept = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					(c as BaseConcept).key === "auto_collection",
			);
			expect(ast.references["temp_sensor"]).toBe(sensorConcept);
			expect(ast.references["auto_collection"]).toBe(processConcept);
			expect(Object.keys(ast.references).length).toBe(2);
		});

		it("18_15: concept with source=@ref and confidence/temporal metadata", () => {
			const input = loadFixture(
				"18_15_provenance_metadata_source_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["temp_sensor"]).toBeDefined();
			const readingConcept = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c as BaseConcept) === "reading",
			) as BaseConcept;
			expect(readingConcept).toBeDefined();
			expect(readingConcept.metadata?.source).toBeDefined();
			expect((readingConcept.metadata!.source as ConceptRef).key).toBe(
				"temp_sensor",
			);
			expect(readingConcept.metadata!.confidence).toBe(0.95);
			expect(readingConcept.metadata!.importance).toBe(1);
		});

		it("18_16: concept with association targets as @ref (measured_by, collected_via)", () => {
			const input = loadFixture(
				"18_16_provenance_association_ref_targets.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["temp_sensor"]).toBeDefined();
			expect(ast.references["auto_collection"]).toBeDefined();
			const reading = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c as BaseConcept) === "reading",
			) as BaseConcept;
			const measuredByAssoc = findAssociationByExpression(
				reading,
				"measured_by",
			);
			const collectedViaAssoc = findAssociationByExpression(
				reading,
				"collected_via",
			);
			expect(measuredByAssoc).toBeDefined();
			expect(collectedViaAssoc).toBeDefined();
			const measuredByLabelNode = measuredByAssoc!.children[0];
			const collectedViaLabelNode = collectedViaAssoc!.children[0];
			const measuredByRef = measuredByLabelNode.children[0];
			const collectedViaRef = collectedViaLabelNode.children[0];
			expect(measuredByRef.kind).toBe("reference");
			expect((measuredByRef as ReferenceConcept).referenceKey).toBe(
				"temp_sensor",
			);
			expect(collectedViaRef.kind).toBe("reference");
			expect((collectedViaRef as ReferenceConcept).referenceKey).toBe(
				"auto_collection",
			);
		});

		it("18_17: full provenance document (sources + business-card with metadata)", () => {
			const input = loadFixture("18_17_provenance_full.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["temp_sensor"]).toBeDefined();
			expect(ast.references["data_team"]).toBeDefined();
			const card = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c as BaseConcept) ===
						"business_card",
			) as BaseConcept;
			expect(card).toBeDefined();
			expect(card.metadata?.source).toBeDefined();
			expect((card.metadata!.source as ConceptRef).key).toBe(
				"temp_sensor",
			);
			expect(card.metadata?.custom?.author).toBeDefined();
			expect(findAssociationByExpression(card, "contact")).toBeDefined();
			expect(findAssociationByExpression(card, "address")).toBeDefined();
		});
	});

	// -------------------------------------------------------------------------
	// 5. Combined real-world (multi-domain)
	// -------------------------------------------------------------------------
	describe("5. Combined real-world (multi-domain)", () => {
		it("18_18: document mixing business card and product", () => {
			const input = loadFixture("18_18_combined_card_and_product.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts.length).toBeGreaterThanOrEqual(2);
			const card = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c as BaseConcept) ===
						"business card",
			) as BaseConcept;
			const product = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c as BaseConcept) === "product",
			) as BaseConcept;
			expect(card).toBeDefined();
			expect(product).toBeDefined();
			expect(findAssociationByExpression(card, "contact")).toBeDefined();
			expect(findAssociationByExpression(card, "address")).toBeDefined();
			expect(findAssociationByExpression(product, "price")).toBeDefined();
			expect(
				findAssociationByExpression(product, "features"),
			).toBeDefined();
		});

		it("18_19: person (semantic vocabulary) + provenance (source=@ref)", () => {
			const input = loadFixture(
				"18_19_combined_person_provenance.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["official_db"]).toBeDefined();
			const person = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c as BaseConcept) === "person",
			) as BaseConcept;
			expect(person).toBeDefined();
			expect(findAssociationByExpression(person, "name")).toBeDefined();
			expect(findAssociationByExpression(person, "email")).toBeDefined();
			expect(person.metadata?.source).toBeDefined();
			expect((person.metadata!.source as ConceptRef).key).toBe(
				"official_db",
			);
		});

		it("18_20: full integration (card + @ref + vocabulary + multilingual + provenance)", () => {
			const input = loadFixture("18_20_combined_full_integration.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["acme"]).toBeDefined();
			const card = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c as BaseConcept) ===
						"business card",
			) as BaseConcept;
			expect(card).toBeDefined();
			expect(findAssociationByExpression(card, "contact")).toBeDefined();
			expect(findAssociationByExpression(card, "address")).toBeDefined();
			const hasMultilingual =
				card.expressions.some(
					(e) =>
						typeof e.value === "string" &&
						(e.value.includes("金") || e.value.includes("Kim")),
				) ||
				card.children.some(
					(c) =>
						c.kind === "base" &&
						(c as BaseConcept).expressions.some(
							(e) =>
								typeof e.value === "string" &&
								(e.value.includes("金") ||
									e.value.includes("Kim")),
						),
				);
			expect(hasMultilingual).toBe(true);
			expect(card.metadata?.source).toBeDefined();
			expect((card.metadata!.source as ConceptRef).key).toBe("acme");
		});
	});

	// -------------------------------------------------------------------------
	// 6. Edge and stress (real-world style)
	// -------------------------------------------------------------------------
	describe("6. Edge and stress (real-world style)", () => {
		it("18_21: minimal real-world — single contact-like concept", () => {
			const input = loadFixture("18_21_edge_minimal_contact.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const contact = ast.concepts[0] as BaseConcept;
			expect(contact.expressions.length).toBeGreaterThanOrEqual(1);
			expect(contact.children.length).toBeGreaterThanOrEqual(1);
			const emailAssoc = findAssociationByExpression(contact, "email");
			expect(emailAssoc).toBeDefined();
			const emailLabelNode = getAssociationTarget(emailAssoc!);
			const emailValueNode = emailLabelNode!.children.find(
				(c) => c.kind === "base",
			) as BaseConcept | undefined;
			expect(getFirstExpressionValue(emailValueNode!)).toBe("a@b.com");
		});

		it("18_22: real-world with implied concept (address with no main expression)", () => {
			const input = loadFixture(
				"18_22_edge_implied_in_real_world.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const card = ast.concepts[0] as BaseConcept;
			const addressAssoc = findAssociationByExpression(card, "address");
			expect(addressAssoc).toBeDefined();
			const addressTarget = getAssociationTarget(addressAssoc!);
			expect(addressTarget).toBeDefined();
			expect(addressTarget!.children.length).toBeGreaterThan(0);
			expect(
				findAssociationByExpression(addressTarget!, "street"),
			).toBeDefined();
			const cityAssoc = findAssociationByExpression(
				addressTarget!,
				"city",
			);
			expect(cityAssoc).toBeDefined();
			const cityLabelNode = getAssociationTarget(cityAssoc!);
			const cityValueNode = cityLabelNode!.children.find(
				(c) => c.kind === "base",
			) as BaseConcept | undefined;
			expect(getFirstExpressionValue(cityValueNode!)).toBe("Boston");
		});

		it("18_23: real-world with Unicode in names and labels", () => {
			const input = loadFixture("18_23_edge_unicode_labels.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const card = ast.concepts[0] as BaseConcept;
			expect(
				!!findConceptByFirstExpression(card, "陈博士") ||
					card.children.some(
						(c) =>
							c.kind === "base" &&
							(c as BaseConcept).expressions.some((e) =>
								String(e.value).includes("陈"),
							),
					),
			).toBe(true);
			expect(findConceptByFirstExpression(card, "温度")).toBeDefined();
			expect(
				findConceptByFirstExpression(card, "スマートウォッチ") ||
					findConceptByFirstExpression(card, "product"),
			).toBeDefined();
		});

		it("18_24: dense real-world — many siblings (contact/address lines)", () => {
			const input = loadFixture("18_24_edge_dense_siblings.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const card = ast.concepts[0] as BaseConcept;
			const hasA = card.children.filter(
				(c): c is AssociationConcept =>
					c.kind === "association" && c.associationType === "has_a",
			);
			expect(hasA.length).toBeGreaterThanOrEqual(10);
			expect(findAssociationByExpression(card, "email")).toBeDefined();
			expect(findAssociationByExpression(card, "phone")).toBeDefined();
			expect(findAssociationByExpression(card, "city")).toBeDefined();
			expect(findAssociationByExpression(card, "country")).toBeDefined();
		});

		it("18_25: real-world with comments and section headers", () => {
			const input = loadFixture("18_25_edge_comments_headers.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const card = ast.concepts[0] as BaseConcept;
			expect(getFirstExpressionValue(card)).toBe("business card");
			expect(findAssociationByExpression(card, "role")).toBeDefined();
			const contactAssoc = findAssociationByExpression(card, "contact");
			expect(contactAssoc).toBeDefined();
			const contactTarget = getAssociationTarget(contactAssoc!);
			const emailAssoc = findAssociationByExpression(
				contactTarget!,
				"email",
			);
			const emailLabelNode = getAssociationTarget(emailAssoc!);
			const emailValueNode = emailLabelNode!.children.find(
				(c) => c.kind === "base",
			) as BaseConcept | undefined;
			expect(getFirstExpressionValue(emailValueNode!)).toBe(
				"jane@example.com",
			);
		});
	});
});
