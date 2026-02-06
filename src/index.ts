export {
	parse,
	parseOrThrow,
	isValid,
	grammar,
	type ParseResult,
	type ParseError,
	type ParseOutput,
} from './parser/index.js';

// Re-export AST types
export type { 
	AmorfsAST, 
	ConceptNode,
	BaseConcept,
	AssociationConcept,
	ReferenceConcept,
	Metadata, 
	ExpressionValue,
	AssociationType,
	ConceptRef,
} from './ast/types';
