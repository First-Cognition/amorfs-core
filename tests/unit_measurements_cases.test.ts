/**
 * Section 20 Units and Measurements — fixture tests
 *
 * Covers: value/unit as associations (intrinsic/contextual), numeric value types,
 * unit expressions (synonyms, compound, Unicode, quoted, metadata), precision/uncertainty,
 * metadata scopes, nested measurements, and edge cases.
 *
 * Implements plan .cursor/plans/20_unit.plan.md
 * Fixtures: tests/fixtures/unit_measurements_cases/ with prefix 20_
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
const unitCasesDir = join(__dirname, "fixtures", "unit_measurements_cases");

function loadFixture(name: string): string {
	return readFileSync(join(unitCasesDir, name), "utf-8");
}

/** Find association whose target concept's first expression value matches label. */
function findAssociationByLabel(
	concept: ConceptNode,
	firstLabelValue: string,
): AssociationConcept | undefined {
	return concept.children.find(
		(ch): ch is AssociationConcept =>
			ch.kind === "association" &&
			ch.children[0]?.kind === "base" &&
			(ch.children[0] as BaseConcept).expressions[0]?.value ===
				firstLabelValue,
	) as AssociationConcept | undefined;
}

/** Get the inner value concept from a value/unit association (target may have one child holding the value). */
function getTargetValueConcept(assoc: AssociationConcept): BaseConcept | null {
	const target = assoc.children[0];
	if (target?.kind !== "base") return null;
	// Value/unit associations: target has expressions (label) and often one child with the actual value
	if (target.children.length > 0 && target.children[0].kind === "base")
		return target.children[0] as BaseConcept;
	return target;
}

/** Get numeric value from a value association (first expression of the value concept). */
function getNumericValue(assoc: AssociationConcept): number | null {
	const valueConcept = getTargetValueConcept(assoc);
	if (!valueConcept || valueConcept.expressions.length === 0) return null;
	const expr = valueConcept.expressions[0];
	if (expr.type !== "number") return null;
	return typeof expr.value === "number" ? expr.value : null;
}

/** Get all expression values (for unit synonyms or value alternatives) from an association target. */
function getTargetExpressionValues(
	assoc: AssociationConcept,
): (string | number)[] {
	const valueConcept = getTargetValueConcept(assoc);
	if (!valueConcept) return [];
	return valueConcept.expressions.map((e) => e.value);
}

/** Get first expression type from target value concept. */
function getTargetFirstExpressionType(
	assoc: AssociationConcept,
): string | null {
	const valueConcept = getTargetValueConcept(assoc);
	if (!valueConcept || valueConcept.expressions.length === 0) return null;
	return valueConcept.expressions[0].type;
}

describe("Section 20 Units and Measurements (20_)", () => {
	// -------------------------------------------------------------------------
	// 1. Value and unit as associations (structure)
	// -------------------------------------------------------------------------
	describe("1. Value and unit as associations (structure)", () => {
		it("20_01: minimal — value and unit both contextual", () => {
			const input = loadFixture("20_01_value_unit_contextual.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.kind).toBe("base");
			const assocs = root.children.filter(
				(c): c is AssociationConcept => c.kind === "association",
			);
			expect(assocs).toHaveLength(2);
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(valueAssoc).toBeDefined();
			expect(unitAssoc).toBeDefined();
			expect(valueAssoc!.isIntrinsic).toBe(false);
			expect(unitAssoc!.isIntrinsic).toBe(false);
			expect(getNumericValue(valueAssoc!)).toBe(1.5);
			expect(getTargetExpressionValues(unitAssoc!)).toContain("meters");
		});

		it("20_02: value intrinsic, unit contextual", () => {
			const input = loadFixture(
				"20_02_value_intrinsic_unit_contextual.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(valueAssoc).toBeDefined();
			expect(unitAssoc).toBeDefined();
			expect(valueAssoc!.isIntrinsic).toBe(true);
			expect(unitAssoc!.isIntrinsic).toBe(false);
			expect(getNumericValue(valueAssoc!)).toBe(42);
			expect(getTargetFirstExpressionType(valueAssoc!)).toBe("number");
			expect(getTargetExpressionValues(unitAssoc!)).toContain("kg");
		});

		it("20_03: value contextual, unit intrinsic", () => {
			const input = loadFixture(
				"20_03_value_contextual_unit_intrinsic.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(valueAssoc).toBeDefined();
			expect(unitAssoc).toBeDefined();
			expect(valueAssoc!.isIntrinsic).toBe(false);
			expect(unitAssoc!.isIntrinsic).toBe(true);
			expect(getNumericValue(valueAssoc!)).toBe(100);
			expect(getTargetExpressionValues(unitAssoc!)).toContain("percent");
		});

		it("20_04: value and unit both intrinsic", () => {
			const input = loadFixture("20_04_value_unit_intrinsic.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(valueAssoc).toBeDefined();
			expect(unitAssoc).toBeDefined();
			expect(valueAssoc!.isIntrinsic).toBe(true);
			expect(unitAssoc!.isIntrinsic).toBe(true);
			expect(getNumericValue(valueAssoc!)).toBe(3.14);
			expect(getTargetExpressionValues(unitAssoc!)).toContain("radians");
		});

		it("20_05: value only (no unit)", () => {
			const input = loadFixture("20_05_value_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(valueAssoc).toBeDefined();
			expect(unitAssoc).toBeUndefined();
			expect(getTargetFirstExpressionType(valueAssoc!)).toBe("number");
			expect(getNumericValue(valueAssoc!)).toBe(7);
		});

		it("20_06: unit only (no value)", () => {
			const input = loadFixture("20_06_unit_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(valueAssoc).toBeUndefined();
			expect(unitAssoc).toBeDefined();
			expect(getTargetExpressionValues(unitAssoc!)).toContain("meters");
		});
	});

	// -------------------------------------------------------------------------
	// 2. Numeric value types
	// -------------------------------------------------------------------------
	describe("2. Numeric value types", () => {
		it("20_07: integer value", () => {
			const input = loadFixture("20_07_value_integer.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(valueAssoc).toBeDefined();
			expect(unitAssoc).toBeDefined();
			expect(getTargetFirstExpressionType(valueAssoc!)).toBe("number");
			expect(getNumericValue(valueAssoc!)).toBe(42);
			expect(getTargetExpressionValues(unitAssoc!)).toContain("items");
		});

		it("20_08: decimal value", () => {
			const input = loadFixture("20_08_value_decimal.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(getNumericValue(valueAssoc!)).toBe(1.75);
			expect(getTargetFirstExpressionType(valueAssoc!)).toBe("number");
			expect(getTargetExpressionValues(unitAssoc!)).toContain("meters");
		});

		it("20_09: scientific notation value", () => {
			const input = loadFixture("20_09_value_scientific.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(getTargetFirstExpressionType(valueAssoc!)).toBe("number");
			expect(getNumericValue(valueAssoc!)).toBe(6.022e23);
			expect(getTargetExpressionValues(unitAssoc!)).toContain("per mole");
		});

		it("20_10: negative numeric value", () => {
			const input = loadFixture("20_10_value_negative.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(valueAssoc!.isIntrinsic).toBe(false);
			expect(getNumericValue(valueAssoc!)).toBe(-10);
			expect(getTargetFirstExpressionType(valueAssoc!)).toBe("number");
			expect(getTargetExpressionValues(unitAssoc!)).toContain("Celsius");
		});

		it("20_11: zero value", () => {
			const input = loadFixture("20_11_value_zero.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(getNumericValue(valueAssoc!)).toBe(0);
			expect(getTargetFirstExpressionType(valueAssoc!)).toBe("number");
			expect(getTargetExpressionValues(unitAssoc!)).toContain("meters");
		});
	});

	// -------------------------------------------------------------------------
	// 3. Unit expressions
	// -------------------------------------------------------------------------
	describe("3. Unit expressions", () => {
		it("20_12: single expression unit", () => {
			const input = loadFixture("20_12_unit_single.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(valueAssoc).toBeDefined();
			const unitValues = getTargetExpressionValues(unitAssoc!);
			expect(unitValues).toHaveLength(1);
			expect(unitValues[0]).toBe("meters");
		});

		it("20_13: unit synonyms", () => {
			const input = loadFixture("20_13_unit_synonyms.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const unitAssoc = findAssociationByLabel(root, "unit");
			const unitValues = getTargetExpressionValues(unitAssoc!);
			expect(unitValues).toContain("meters");
			expect(unitValues).toContain("m");
			expect(unitValues.length).toBeGreaterThanOrEqual(2);
		});

		it("20_14: unit with language metadata", () => {
			const input = loadFixture("20_14_unit_language.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const unitAssoc = findAssociationByLabel(root, "unit");
			const valueConcept = getTargetValueConcept(unitAssoc!);
			expect(valueConcept).toBeDefined();
			const hasEn = valueConcept!.expressions.some(
				(e) => e.metadata?.language === "en" || e.language === "en",
			);
			expect(hasEn).toBe(true);
			expect(
				getNumericValue(findAssociationByLabel(root, "value")!),
			).toBe(98.6);
		});

		it("20_15: compound unit", () => {
			const input = loadFixture("20_15_unit_compound.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const unitAssoc = findAssociationByLabel(root, "unit");
			const unitValues = getTargetExpressionValues(unitAssoc!);
			expect(
				unitValues.some(
					(v) =>
						String(v).includes("km/h") ||
						String(v).includes("kilometers per hour"),
				),
			).toBe(true);
			expect(
				getNumericValue(findAssociationByLabel(root, "value")!),
			).toBe(60);
		});

		it("20_16: Unicode in unit", () => {
			const input = loadFixture("20_16_unit_unicode.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const unitAssoc = findAssociationByLabel(root, "unit");
			const unitValues = getTargetExpressionValues(unitAssoc!);
			expect(unitValues.some((v) => String(v).includes("mol"))).toBe(
				true,
			);
			expect(
				getNumericValue(findAssociationByLabel(root, "value")!),
			).toBe(1);
		});

		it("20_17: quoted unit", () => {
			const input = loadFixture("20_17_unit_quoted.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const unitAssoc = findAssociationByLabel(root, "unit");
			const valueConcept = getTargetValueConcept(unitAssoc!);
			expect(valueConcept).toBeDefined();
			const quotedExpr = valueConcept!.expressions.find(
				(e) => e.type === "quoted",
			);
			expect(quotedExpr).toBeDefined();
			expect(quotedExpr!.value).toBe("m/s");
			expect(
				getNumericValue(findAssociationByLabel(root, "value")!),
			).toBe(3);
		});
	});

	// -------------------------------------------------------------------------
	// 4. Additional measurement associations
	// -------------------------------------------------------------------------
	describe("4. Additional measurement associations", () => {
		it("20_18: measurement with precision", () => {
			const input = loadFixture("20_18_measurement_precision.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			const precisionAssoc = findAssociationByLabel(root, "precision");
			expect(valueAssoc).toBeDefined();
			expect(unitAssoc).toBeDefined();
			expect(precisionAssoc).toBeDefined();
			expect(getNumericValue(valueAssoc!)).toBe(12.345);
			expect(getNumericValue(precisionAssoc!)).toBe(0.001);
			expect(getTargetFirstExpressionType(precisionAssoc!)).toBe(
				"number",
			);
		});

		it("20_19: measurement with uncertainty and confidence", () => {
			const input = loadFixture("20_19_measurement_uncertainty.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const uncertaintyAssoc = findAssociationByLabel(
				root,
				"uncertainty",
			);
			expect(uncertaintyAssoc).toBeDefined();
			const uncertaintyConcept = getTargetValueConcept(uncertaintyAssoc!);
			expect(uncertaintyConcept).toBeDefined();
			const hasConfidence =
				uncertaintyConcept!.expressions.some(
					(e) => e.metadata?.confidence === 0.95,
				) || uncertaintyConcept!.metadata?.confidence === 0.95;
			expect(hasConfidence).toBe(true);
			expect(
				getNumericValue(findAssociationByLabel(root, "value")!),
			).toBe(5.2);
			expect(
				getTargetExpressionValues(
					findAssociationByLabel(root, "unit")!,
				),
			).toContain("cm");
		});

		it("20_20: full measurement (value, unit, precision, uncertainty)", () => {
			const input = loadFixture("20_20_measurement_full.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			const precisionAssoc = findAssociationByLabel(root, "precision");
			const uncertaintyAssoc = findAssociationByLabel(
				root,
				"uncertainty",
			);
			expect(valueAssoc).toBeDefined();
			expect(unitAssoc).toBeDefined();
			expect(precisionAssoc).toBeDefined();
			expect(uncertaintyAssoc).toBeDefined();
			expect(getNumericValue(valueAssoc!)).toBe(12.345);
			expect(getTargetFirstExpressionType(valueAssoc!)).toBe("number");
			expect(
				getTargetExpressionValues(unitAssoc!).length,
			).toBeGreaterThanOrEqual(1);
			expect(getNumericValue(precisionAssoc!)).toBe(0.001);
			expect(getNumericValue(uncertaintyAssoc!)).toBe(0.002);
		});

		it("20_21: measurement with custom attribute", () => {
			const input = loadFixture("20_21_measurement_custom_attr.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			const methodAssoc = findAssociationByLabel(root, "method");
			expect(valueAssoc).toBeDefined();
			expect(unitAssoc).toBeDefined();
			expect(methodAssoc).toBeDefined();
			expect(getNumericValue(valueAssoc!)).toBe(25);
			expect(getTargetExpressionValues(methodAssoc!)).toContain(
				"calibrated",
			);
		});
	});

	// -------------------------------------------------------------------------
	// 5. Metadata on measurements
	// -------------------------------------------------------------------------
	describe("5. Metadata on measurements", () => {
		it("20_22: metadata on measurement concept", () => {
			const input = loadFixture("20_22_metadata_on_concept.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.metadata).toBeDefined();
			expect(root.metadata?.temporal?.start).toBe("2024-01-15");
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(getNumericValue(valueAssoc!)).toBe(1);
			expect(getTargetExpressionValues(unitAssoc!)).toContain("m");
		});

		it("20_23: metadata on value association", () => {
			const input = loadFixture("20_23_metadata_on_value_assoc.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			expect(valueAssoc!.metadata).toBeDefined();
			expect(valueAssoc!.metadata?.confidence).toBe(0.99);
			expect(getNumericValue(valueAssoc!)).toBe(3.14);
		});

		it("20_24: metadata on unit association (or unit concept)", () => {
			const input = loadFixture("20_24_metadata_on_unit_assoc.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const unitAssoc = findAssociationByLabel(root, "unit");
			const unitTarget = unitAssoc!.children[0];
			expect(unitTarget?.kind).toBe("base");
			const hasMeta =
				(unitAssoc!.metadata &&
					Object.keys(unitAssoc!.metadata).length > 0) ||
				((unitTarget as BaseConcept).metadata &&
					Object.keys((unitTarget as BaseConcept).metadata!).length >
						0);
			expect(hasMeta).toBe(true);
			expect(
				getNumericValue(findAssociationByLabel(root, "value")!),
			).toBe(10);
		});

		it("20_25: temporal on measurement concept", () => {
			const input = loadFixture("20_25_metadata_temporal.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.metadata?.temporal?.start).toBe("2024-03-15");
			expect(
				getNumericValue(findAssociationByLabel(root, "value")!),
			).toBe(72);
			expect(
				getTargetExpressionValues(
					findAssociationByLabel(root, "unit")!,
				),
			).toContain("°F");
		});

		it("20_26: confidence on value expression", () => {
			const input = loadFixture("20_26_metadata_confidence_value.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const valueConcept = getTargetValueConcept(valueAssoc!);
			expect(valueConcept).toBeDefined();
			const exprWithConf = valueConcept!.expressions.find(
				(e) => e.metadata?.confidence === 0.95,
			);
			expect(exprWithConf).toBeDefined();
			expect(exprWithConf!.value).toBe(42.5);
			expect(findAssociationByLabel(root, "unit")).toBeDefined();
		});

		it("20_27: combined metadata (temporal + confidence on concept)", () => {
			const input = loadFixture("20_27_metadata_combined.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.metadata?.temporal?.start).toBe("2024-01-01");
			expect(root.metadata?.confidence).toBe(0.9);
			expect(
				getNumericValue(findAssociationByLabel(root, "value")!),
			).toBe(10);
			expect(
				getTargetExpressionValues(
					findAssociationByLabel(root, "unit")!,
				),
			).toContain("kg");
		});
	});

	// -------------------------------------------------------------------------
	// 6. Nested and composite measurements
	// -------------------------------------------------------------------------
	describe("6. Nested and composite measurements", () => {
		it("20_28: nested measurement (measurement as association target)", () => {
			const input = loadFixture("20_28_nested_measurement.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const lengthAssoc = findAssociationByLabel(root, "length");
			const widthAssoc = findAssociationByLabel(root, "width");
			expect(lengthAssoc).toBeDefined();
			expect(widthAssoc).toBeDefined();
			const lengthTarget = lengthAssoc!.children[0] as BaseConcept;
			const widthTarget = widthAssoc!.children[0] as BaseConcept;
			expect(
				getNumericValue(findAssociationByLabel(lengthTarget, "value")!),
			).toBe(5);
			expect(
				getTargetExpressionValues(
					findAssociationByLabel(lengthTarget, "unit")!,
				),
			).toContain("m");
			expect(
				getNumericValue(findAssociationByLabel(widthTarget, "value")!),
			).toBe(3);
			expect(
				getTargetExpressionValues(
					findAssociationByLabel(widthTarget, "unit")!,
				),
			).toContain("m");
		});

		it("20_29: multiple sibling measurements", () => {
			const input = loadFixture("20_29_sibling_measurements.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const minAssoc = findAssociationByLabel(root, "min");
			const maxAssoc = findAssociationByLabel(root, "max");
			expect(minAssoc).toBeDefined();
			expect(maxAssoc).toBeDefined();
			const minTarget = minAssoc!.children[0] as BaseConcept;
			const maxTarget = maxAssoc!.children[0] as BaseConcept;
			expect(
				getNumericValue(findAssociationByLabel(minTarget, "value")!),
			).toBe(0);
			expect(
				getNumericValue(findAssociationByLabel(maxTarget, "value")!),
			).toBe(100);
		});

		it("20_30: implied measurement (implied concept with value and unit)", () => {
			const input = loadFixture("20_30_implied_measurement.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const quantityAssoc = findAssociationByLabel(root, "quantity");
			expect(quantityAssoc).toBeDefined();
			const quantityTarget = quantityAssoc!.children[0] as BaseConcept;
			expect(
				getNumericValue(
					findAssociationByLabel(quantityTarget, "value")!,
				),
			).toBe(7);
			expect(
				getTargetExpressionValues(
					findAssociationByLabel(quantityTarget, "unit")!,
				),
			).toContain("items");
		});
	});

	// -------------------------------------------------------------------------
	// 7. Edge and boundary cases
	// -------------------------------------------------------------------------
	describe("7. Edge and boundary cases", () => {
		it("20_31: many synonyms on unit", () => {
			const input = loadFixture("20_31_edge_many_unit_synonyms.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const unitAssoc = findAssociationByLabel(root, "unit");
			const unitValues = getTargetExpressionValues(unitAssoc!);
			expect(unitValues).toContain("meters");
			expect(unitValues).toContain("m");
			expect(unitValues).toContain("metre");
			expect(unitValues).toContain("metres");
			expect(unitValues.length).toBeGreaterThanOrEqual(4);
			expect(findAssociationByLabel(root, "value")).toBeDefined();
		});

		it("20_32: measurement with @ref", () => {
			const input = loadFixture("20_32_edge_measurement_with_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.key).toBe("weight_ref");
			expect(ast.references["weight_ref"]).toBeDefined();
			expect(ast.references["weight_ref"]).toBe(root);
			expect(
				getNumericValue(findAssociationByLabel(root, "value")!),
			).toBe(2);
			expect(
				getTargetExpressionValues(
					findAssociationByLabel(root, "unit")!,
				),
			).toContain("kg");
		});

		it("20_33: value with multiple alternatives", () => {
			const input = loadFixture("20_33_edge_value_alternatives.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const valueAssoc = findAssociationByLabel(root, "value");
			const valueConcept = getTargetValueConcept(valueAssoc!);
			expect(valueConcept!.expressions.length).toBeGreaterThanOrEqual(1);
			expect(
				getTargetExpressionValues(
					findAssociationByLabel(root, "unit")!,
				),
			).toContain("m");
		});

		it("20_34: implied root with value and unit", () => {
			const input = loadFixture(
				"20_34_edge_implied_root_value_unit.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			expect(root.children.length).toBeGreaterThanOrEqual(2);
			const valueAssoc = findAssociationByLabel(root, "value");
			const unitAssoc = findAssociationByLabel(root, "unit");
			expect(valueAssoc).toBeDefined();
			expect(unitAssoc).toBeDefined();
			expect(getNumericValue(valueAssoc!)).toBe(0);
			expect(getTargetExpressionValues(unitAssoc!)).toContain("unknown");
		});

		it("20_35: unit with custom metadata on unit concept", () => {
			const input = loadFixture("20_35_edge_unit_custom_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts[0] as BaseConcept;
			const unitAssoc = findAssociationByLabel(root, "unit");
			const unitTarget = unitAssoc!.children[0] as BaseConcept;
			expect(unitTarget.metadata?.custom?.source).toBe("SI");
			expect(findAssociationByLabel(root, "value")).toBeDefined();
			expect(
				getNumericValue(findAssociationByLabel(root, "value")!),
			).toBe(5);
		});
	});
});
