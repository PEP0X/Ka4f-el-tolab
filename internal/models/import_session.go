package models

import "time"

const (
	ImportSessionActive    = "active"
	ImportSessionCompleted = "completed"
	ImportSessionDiscarded = "discarded"

	PendingRowPending  = "pending"
	PendingRowResolved = "resolved"
	PendingRowIgnored  = "ignored"
)

// ImportSession persists the unresolved portion of one Excel import.
type ImportSession struct {
	ID                  string    `json:"id"`
	SourceFilename      string    `json:"sourceFilename"`
	CreatedAt           time.Time `json:"createdAt"`
	TotalRows           int       `json:"totalRows"`
	ImportedCount       int       `json:"importedCount"`
	InitialPendingCount int       `json:"initialPendingCount"`
	PendingCount        int       `json:"pendingCount"`
	Status              string    `json:"status"`
}

// PendingImportRow stores an editable row snapshot until it is resolved or ignored.
type PendingImportRow struct {
	ID                   string     `json:"id"`
	SessionID            string     `json:"sessionId"`
	Stage                string     `json:"stage"`
	IssueType            string     `json:"issueType"`
	RawData              string     `json:"rawData"`
	GroupKey             string     `json:"groupKey"`
	SuggestedValue       string     `json:"suggestedValue"`
	SuggestionConfidence float64    `json:"suggestionConfidence"`
	ConflictRowID        string     `json:"conflictRowId"`
	Status               string     `json:"status"`
	ResolvedData         string     `json:"resolvedData"`
	ResolvedAt           *time.Time `json:"resolvedAt,omitempty"`
	CreatedAt            time.Time  `json:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt"`
}

// PendingImportRowView is the renderer DTO.
type PendingImportRowView struct {
	ID                   string    `json:"id"`
	SessionID            string    `json:"sessionId"`
	Stage                string    `json:"stage"`
	IssueType            string    `json:"issueType"`
	Row                  ImportRow `json:"row"`
	GroupKey             string    `json:"groupKey"`
	RawGrade             string    `json:"rawGrade"`
	SuggestedValue       string    `json:"suggestedValue"`
	SuggestionConfidence float64   `json:"suggestionConfidence"`
	ConflictRowID        string    `json:"conflictRowId"`
	Status               string    `json:"status"`
}

// PendingImportSummary aggregates active sessions for the UI badge.
type PendingImportSummary struct {
	Sessions     []ImportSession `json:"sessions"`
	PendingCount int             `json:"pendingCount"`
}

// StudentValidation is returned during live correction of one pending row.
type StudentValidation struct {
	Valid   bool    `json:"valid"`
	Message string  `json:"message,omitempty"`
	Student Student `json:"student"`
}
