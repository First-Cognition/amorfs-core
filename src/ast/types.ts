/**
 * AST Types for Amorfs
 */

// Association types
export type AssociationType = 'has_a' | 'which_is';

// Expression value with optional language
export interface ExpressionValue {
  value: string | number;
  type: 'text' | 'number' | 'datetime' | 'iri' | 'quoted';
  language?: string;
  metadata?: Metadata;
}

// Metadata object
export interface Metadata {
  language?: string;
  confidence?: number;
  importance?: number;
  temporal?: {
    start?: string;
    end?: string;
  };
  source?: ConceptRef;
  custom?: Record<string, string | ConceptRef>;
}

// Reference to another concept (used in metadata)
export interface ConceptRef {
  type: 'reference';
  key: string;
}

// ─── Concept Node (discriminated union) ─────────────────────────────

/**
 * Common properties shared by all concept kinds.
 */
interface ConceptBase {
  /**
   * Reference key for this concept, assigned via @identifier syntax.
   * Null unless the concept is explicitly named with @ operator.
   */
  key: string | null;

  /**
   * Metadata for this concept.
   */
  metadata: Metadata | null;

  /**
   * Child concepts (can be empty).
   * Children may be base concepts, association concepts, or referenced concepts.
   */
  children: ConceptNode[];
}

/**
 * A base concept — represents an entity, attribute, or value.
 * Has one or more expressions that name/describe it.
 */
export interface BaseConcept extends ConceptBase {
  kind: 'base';

  /**
   * Expressions that define/name this concept.
   * For `state [NSW]`, the outer concept's expressions would contain "state",
   * and the child base concept's expressions would contain "NSW".
   */
  expressions: ExpressionValue[];
}

/**
 * An association concept — represents a relationship between its parent
 * and the concepts in its children list.
 */
export interface AssociationConcept extends ConceptBase {
  kind: 'association';

  /**
   * The type of association: 'has_a' (via +/-) or 'which_is' (via []).
   */
  associationType: AssociationType;

  /**
   * Whether this is an intrinsic (+) or contextual (-) association.
   * Only meaningful when associationType is 'has_a'.
   */
  isIntrinsic: boolean;
}

/**
 * A referenced concept — refers to another concept by its @key.
 */
export interface ReferenceConcept extends ConceptBase {
  kind: 'reference';

  /**
   * The reference key (the identifier after @).
   */
  referenceKey: string;
}

/**
 * A concept is one of three kinds: base, association, or reference.
 */
export type ConceptNode = BaseConcept | AssociationConcept | ReferenceConcept;

// Root AST node
export interface AmorfsAST {
  concepts: ConceptNode[];
  references: Record<string, ConceptNode>;
}
