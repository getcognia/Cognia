export interface OrganizationSearchCitation {
  index: number
  documentName?: string
  pageNumber?: number
  memoryId: string
  url?: string
  sourceType?: string
}

export interface VisibleOrganizationSearchCitation
  extends OrganizationSearchCitation {
  indices: number[]
}

export function getVisibleOrganizationSearchCitations(
  input?: OrganizationSearchCitation[] | null
): VisibleOrganizationSearchCitation[]
