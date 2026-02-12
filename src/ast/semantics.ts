/**
 * Ohm Semantic Actions for building Amorfs AST
 */

import type { AmorfsActionDict } from "../grammar/amorfs.ohm-bundle.js";
import type {
	IterationNode,
	NonterminalNode,
	TerminalNode,
} from "ohm-js";
import type {
	AmorfsAST,
	ConceptNode,
	BaseConcept,
	AssociationConcept,
	ExpressionValue,
	Metadata,
	ConceptRef,
} from "./types.js";

/** Union of all possible values returned by semantic action eval() */
export type SemanticEvalResult =
	| AmorfsAST
	| ConceptNode
	| ConceptNode[]
	| ExpressionValue
	| ExpressionValue[]
	| Metadata
	| Partial<Metadata>
	| ConceptRef
	| string
	| SemanticEvalResult[]
	| undefined
	| null;

// Context for collecting references during parsing
interface ParseContext {
	references: Record<string, ConceptNode>;
}

// Helper to merge metadata
function mergeMetadata(items: Partial<Metadata>[]): Metadata | null {
	if (items.length === 0) return null;

	const result: Metadata = {};

	for (const item of items) {
		if (item.language) result.language = item.language;
		if (item.confidence !== undefined) result.confidence = item.confidence;
		if (item.importance !== undefined) result.importance = item.importance;
		if (item.temporal) {
			result.temporal = { ...result.temporal, ...item.temporal };
		}
		if (item.source) result.source = item.source;
		if (item.custom) {
			result.custom = { ...result.custom, ...item.custom };
		}
	}

	return Object.keys(result).length > 0 ? result : null;
}

export function createSemanticActions(
	ctx: ParseContext,
): AmorfsActionDict<SemanticEvalResult> {
	// Implementation arity matches the grammar; generated .d.ts may use different arg counts
	return {
		Document(
			_ws1: IterationNode,
			topLevelList: IterationNode,
			_ws2: IterationNode,
		): AmorfsAST {
			const concepts: ConceptNode[] = [];

			for (const item of topLevelList.children) {
				const result = item.children[0].eval();
				if (result && typeof result === "object" && "kind" in result) {
					concepts.push(result as ConceptNode);
				}
				// Comments return undefined, skip them
			}

			return {
				concepts,
				references: ctx.references,
			} as AmorfsAST;
		},

		TopLevel(node: NonterminalNode): SemanticEvalResult {
			return node.eval();
		},

		Concept_withValue(
			expressionsOpt: IterationNode,
			valueBlock: NonterminalNode,
			metadataOpt: IterationNode,
			conceptRefOpt: IterationNode,
		): BaseConcept {
			const expressions: ExpressionValue[] =
				expressionsOpt.children.length > 0
					? (expressionsOpt.children[0].eval() as ExpressionValue[])
					: [];

			const children: ConceptNode[] = valueBlock.eval() as ConceptNode[];
			const metadata: Metadata | null =
				metadataOpt.children.length > 0
					? (metadataOpt.children[0].eval() as Metadata)
					: null;
			const conceptRefResult =
				conceptRefOpt.children.length > 0
					? (conceptRefOpt.children[0].eval() as ConceptRef)
					: null;
			const key: string | null = conceptRefResult
				? conceptRefResult.key
				: null;

			const concept: BaseConcept = {
				kind: "base",
				key,
				expressions,
				children,
				metadata,
			};

			// Register reference if present
			if (key) {
				ctx.references[key] = concept;
			}

			return concept;
		},

		Concept_expressionOnly(
			expressions: NonterminalNode,
			_ws: IterationNode,
			metadataOpt: IterationNode,
			conceptRefOpt: IterationNode,
		): BaseConcept {
			const exprs: ExpressionValue[] =
				expressions.eval() as ExpressionValue[];
			const metadata: Metadata | null =
				metadataOpt.children.length > 0
					? (metadataOpt.children[0].eval() as Metadata)
					: null;
			const conceptRefResult =
				conceptRefOpt.children.length > 0
					? (conceptRefOpt.children[0].eval() as ConceptRef)
					: null;
			const key: string | null = conceptRefResult
				? conceptRefResult.key
				: null;

			const concept: BaseConcept = {
				kind: "base",
				key,
				expressions: exprs,
				children: [],
				metadata,
			};

			// Register reference if present
			if (key) {
				ctx.references[key] = concept;
			}

			return concept;
		},

		Concept_reference(conceptRef: NonterminalNode): ConceptNode {
			const ref: ConceptRef = conceptRef.eval() as ConceptRef;

			return {
				kind: "reference",
				key: null,
				referenceKey: ref.key,
				children: [],
				metadata: null,
			} satisfies ConceptNode;
		},

		// Top-level only: implicit value block (same AST as Concept_withValue with block content)
		TopLevelConcept_withImplicitValue(
			expressions: NonterminalNode,
			implicitBlock: NonterminalNode,
			_ws: IterationNode,
			metadataOpt: IterationNode,
			conceptRefOpt: IterationNode,
		): BaseConcept {
			const expressionsList: ExpressionValue[] =
				expressions.eval() as ExpressionValue[];
			const children: ConceptNode[] = implicitBlock.eval() as ConceptNode[];
			const metadata: Metadata | null =
				metadataOpt.children.length > 0
					? (metadataOpt.children[0].eval() as Metadata)
					: null;
			const conceptRefResult =
				conceptRefOpt.children.length > 0
					? (conceptRefOpt.children[0].eval() as ConceptRef)
					: null;
			const key: string | null = conceptRefResult
				? conceptRefResult.key
				: null;

			const concept: BaseConcept = {
				kind: "base",
				key,
				expressions: expressionsList,
				children,
				metadata,
			};

			if (key) {
				ctx.references[key] = concept;
			}

			return concept;
		},

		// ImplicitBlock = (newline space* Association)+
		// Ohm parses as: newline, space*, (Association)+ — so 3 args; collect all Association nodes
		ImplicitBlock(
			_newline: NonterminalNode,
			_space: IterationNode,
			associationIter: IterationNode,
		): ConceptNode[] {
			const children: ConceptNode[] = [];
			for (const assocNode of associationIter.children) {
				children.push(assocNode.eval() as ConceptNode);
			}
			return children;
		},

		ValueBlock(
			_open: TerminalNode,
			_ws1: IterationNode,
			valueContentOpt: IterationNode,
			_ws2: IterationNode,
			_close: TerminalNode,
		): ConceptNode[] {
			if (valueContentOpt.children.length === 0) {
				return [];
			}
			return valueContentOpt.children[0].eval();
		},

		// ValueContent = ws* ValueItem (ws* itemSep? ws* ValueItem)*
		// Args: _leadingWs, firstItem, ws*, itemSep?, ws*, ValueItem*
		ValueContent(
			_leadingWs: NonterminalNode,
			firstItem: NonterminalNode,
			_ws1: IterationNode,
			_itemSep: IterationNode,
			_ws2: IterationNode,
			restItems: IterationNode,
		): ConceptNode[] {
			const result: ConceptNode[] = [];

			// Process first item
			const first = firstItem.eval();
			if (first) {
				result.push(first as ConceptNode);
			}

			// Process rest items
			for (const valueItem of restItems.children) {
				const item = valueItem.eval();
				if (item) {
					result.push(item as ConceptNode);
				}
			}

			return result;
		},

		ValueItem(node: NonterminalNode): SemanticEvalResult {
			return node.eval();
		},

		ValueItem_conceptNegativeNumSpace(
			_minus: TerminalNode,
			_space: NonterminalNode,
			_digit: NonterminalNode,
			concept: NonterminalNode,
		): SemanticEvalResult {
			return concept.eval();
		},

		ValueItem_conceptNegativeNum(
			_minus: TerminalNode,
			_digit: NonterminalNode,
			concept: NonterminalNode,
		): SemanticEvalResult {
			return concept.eval();
		},

		ValueItem_conceptPositiveNum(
			_plus: TerminalNode,
			_digit: NonterminalNode,
			concept: NonterminalNode,
		): SemanticEvalResult {
			return concept.eval();
		},

		Association(
			metadataOpt: IterationNode,
			associationOp: NonterminalNode,
			_ws: NonterminalNode,
			concept: NonterminalNode,
		): AssociationConcept {
			const op = associationOp.sourceString.trim();
			const isIntrinsic = op === "+";
			const metadata: Metadata | null =
				metadataOpt.children.length > 0
					? (metadataOpt.children[0].eval() as Metadata)
					: null;

			const targetConcept = concept.eval() as ConceptNode;

			const assoc: AssociationConcept = {
				kind: "association",
				key: null,
				associationType: "has_a",
				isIntrinsic,
				children: [targetConcept],
				metadata,
			};

			return assoc;
		},

		// Expressions = Expression (ws* "|" ws* Expression)*
		// Args: firstExpr, ws*, "|"*, ws*, Expression*
		Expressions(
			firstExpr: NonterminalNode,
			_ws1: IterationNode,
			_pipes: IterationNode,
			_ws2: IterationNode,
			restExprs: IterationNode,
		): ExpressionValue[] {
			const result: ExpressionValue[] = [];
			result.push(firstExpr.eval() as ExpressionValue);

			// restExprs is an IterationNode containing all the repeated Expressions
			for (const expr of restExprs.children) {
				result.push(expr.eval() as ExpressionValue);
			}

			return result;
		},

		Expression(
			exprValue: NonterminalNode,
			metadataOpt: IterationNode,
		): ExpressionValue {
			const expr = exprValue.eval() as ExpressionValue;

			if (metadataOpt.children.length > 0) {
				const metadata =
					metadataOpt.children[0].eval() as Metadata | null;
				expr.metadata = metadata ?? undefined;
				// Also set language shorthand if present in metadata
				if (metadata?.language) {
					expr.language = metadata.language;
				}
			}

			return expr;
		},

		ExpressionValue(node: NonterminalNode): SemanticEvalResult {
			return node.eval();
		},

		iri(
			_open: TerminalNode,
			content: NonterminalNode,
			_close: TerminalNode,
		): ExpressionValue {
			return {
				value: content.sourceString,
				type: "iri",
			} as ExpressionValue;
		},

		quotedString(
			_open: TerminalNode,
			content: NonterminalNode,
			_close: TerminalNode,
		): ExpressionValue {
			// Unescape the string content
			const raw = content.sourceString;
			const unescaped = raw.replace(/\\(.)/g, "$1");
			return {
				value: unescaped,
				type: "quoted",
			} as ExpressionValue;
		},

		datetime(
			date: NonterminalNode,
			_t: TerminalNode,
			time: NonterminalNode,
			timezoneOpt: IterationNode,
		): ExpressionValue {
			const tz =
				timezoneOpt.children.length > 0
					? timezoneOpt.children[0].sourceString
					: "";
			return {
				value: `${date.sourceString}T${time.sourceString}${tz}`,
				type: "datetime",
			} as ExpressionValue;
		},

		// number = "-"? digit+ ("." digit+)? exponent? &(space | delimiter | end)
		// Args: sign?, digits+, "."?, decimal_digits?, exponent?, lookahead
		number(
			this: NonterminalNode,
			_sign: IterationNode,
			_digits: IterationNode,
			_dot: IterationNode,
			_decimalDigits: IterationNode,
			_exponent: IterationNode,
			_lookahead: NonterminalNode,
		): ExpressionValue {
			const numStr = this.sourceString.trim();
			return {
				value: parseFloat(numStr),
				type: "number",
			} as ExpressionValue;
		},

		text(this: NonterminalNode, _chars: IterationNode): ExpressionValue {
			return {
				value: this.sourceString.trim(),
				type: "text",
			} as ExpressionValue;
		},

		Metadata(
			_open: TerminalNode,
			_ws1: IterationNode,
			contentOpt: IterationNode,
			_ws2: IterationNode,
			_close: TerminalNode,
		): Metadata | null {
			if (contentOpt.children.length === 0) {
				return null;
			}
			return contentOpt.children[0].eval();
		},

		// MetadataContent = MetadataItem (ws* MetadataItem)*
		// Args: firstItem, ws*, MetadataItem*
		MetadataContent(
			firstItem: NonterminalNode,
			_ws: IterationNode,
			restItems: IterationNode,
		): Metadata | null {
			const items: Partial<Metadata>[] = [];
			items.push(firstItem.eval() as Partial<Metadata>);

			// restItems is an IterationNode containing all repeated MetadataItems
			for (const item of restItems.children) {
				items.push(item.eval() as Partial<Metadata>);
			}

			return mergeMetadata(items);
		},

		MetadataItem(node: NonterminalNode): SemanticEvalResult {
			return node.eval();
		},

		languageCode(
			letter1: NonterminalNode,
			letter2: NonterminalNode,
		): Partial<Metadata> {
			return {
				language: letter1.sourceString + letter2.sourceString,
			} as Partial<Metadata>;
		},

		confidence(
			_tilde: TerminalNode,
			value: NonterminalNode,
		): Partial<Metadata> {
			return {
				confidence: parseFloat(value.sourceString),
			} as Partial<Metadata>;
		},

		importance(
			sign: TerminalNode,
			digits: IterationNode,
		): Partial<Metadata> {
			const val = parseInt(digits.sourceString, 10);
			return {
				importance: sign.sourceString === "+" ? val : -val,
			} as Partial<Metadata>;
		},

		temporal(node: NonterminalNode): Partial<Metadata> {
			return {
				temporal: { start: node.sourceString },
			} as Partial<Metadata>;
		},

		temporalRange_startEnd(
			startDate: NonterminalNode,
			_slash: TerminalNode,
			endDateOpt: IterationNode,
		): Partial<Metadata> {
			const result: Partial<Metadata> = {
				temporal: { start: startDate.sourceString },
			};
			if (endDateOpt.children.length > 0) {
				result.temporal!.end = endDateOpt.children[0].sourceString;
			}
			return result;
		},

		temporalRange_endOnly(
			_slash: TerminalNode,
			endDate: NonterminalNode,
		): Partial<Metadata> {
			return {
				temporal: { end: endDate.sourceString },
			} as Partial<Metadata>;
		},

		customAttribute(
			key: NonterminalNode,
			_eq: TerminalNode,
			valueNode: NonterminalNode,
		): Partial<Metadata> {
			const keyStr = key.sourceString;
			const value = valueNode.eval();

			// Handle 'source' as first-class metadata when value is a ConceptRef
			if (
				keyStr === "source" &&
				typeof value === "object" &&
				"type" in value &&
				value.type === "reference"
			) {
				return {
					source: value as ConceptRef,
				} as Partial<Metadata>;
			}

			return {
				custom: { [keyStr]: value },
			} as Partial<Metadata>;
		},

		conceptRef(
			_at: TerminalNode,
			identifier: NonterminalNode,
		): ConceptRef {
			return {
				type: "reference",
				key: identifier.sourceString,
			} as ConceptRef;
		},

		attrValue(this: NonterminalNode, _chars: IterationNode): string {
			return this.sourceString;
		},

		Comment(
			_hash: TerminalNode,
			_content: IterationNode,
			_end: NonterminalNode,
		): undefined {
			// Comments don't produce AST nodes
			return undefined;
		},

		identifier(
			this: NonterminalNode,
			_first: NonterminalNode | TerminalNode,
			_rest: IterationNode,
		): string {
			return this.sourceString;
		},

		_iter(...children: NonterminalNode[]): SemanticEvalResult[] {
			return children.map((c) => c.eval());
		},

		_terminal(this: TerminalNode): string {
			return this.sourceString;
		},
	} as unknown as AmorfsActionDict<SemanticEvalResult>;
}
