// Exports centralizados para componentes de contratos

export { ContractEditor } from "./ContractEditor";
export type { ContractEditorRef } from "./ContractEditor";
export { ContractPreview } from "./ContractPreview";
export { ContractEditorToolbar } from "./ContractEditorToolbar";
export { VariableAutocomplete } from "./VariableAutocomplete";
export { VariableBadge } from "./VariableBadge";
export { CotizacionBlock } from "./CotizacionBlock";
export { CondicionesComercialesBlock } from "./CondicionesComercialesBlock";
export { ContractTemplateCard } from "./ContractTemplate";
export { ContractTemplatesTable } from "./ContractTemplatesTable";
export type { ContractTemplateProps } from "./ContractTemplate";
export type { ContractTemplatesTableProps } from "./ContractTemplatesTable";

export type {
  ContractVariable,
  CotizacionRenderData,
  CondicionesComercialesData,
  ParsedVariable,
} from "./types";

export {
  parseVariables,
  getVariableAtCursor,
  filterVariables,
  normalizeVariableKey,
  formatVariable,
} from "./utils/variable-utils";

export {
  renderCotizacionBlock,
  renderCondicionesComercialesBlock,
} from "./utils/contract-renderer";

