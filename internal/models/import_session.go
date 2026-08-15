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
	ID                  string    `json:"id" gorm:"primaryKey;column:id"`
	SourceFilename      string    `json:"sourceFilename" gorm:"column:source_filename"`
	CreatedAt           time.Time `json:"createdAt" gorm:"column:created_at"`
	TotalRows           int       `json:"totalRows" gorm:"column:total_rows"`
	ImportedCount       int       `json:"importedCount" gorm:"column:imported_count"`
	InitialPendingCount int       `json:"initialPendingCount" gorm:"column:initial_pending_count"`
	PendingCount        int       `json:"pendingCount" gorm:"column:pending_count"`
	Status              string    `json:"status" gorm:"column:status"`
}

func (ImportSession) TableName() string { return "import_sessions" }

// PendingImportRow stores an editable row snapshot until it is resolved or ignored.
type PendingImportRow struct {
	ID                   string     `json:"id" gorm:"primaryKey;column:id"`
	SessionID            string     `json:"sessionId" gorm:"column:session_id"`
	Stage                string     `json:"stage" gorm:"column:stage"`
	IssueType            string     `json:"issueType" gorm:"column:issue_type"`
	RawData              string     `json:"rawData" gorm:"column:raw_data"`
	GroupKey             string     `json:"groupKey" gorm:"column:group_key"`
	SuggestedValue       string     `json:"suggestedValue" gorm:"column:suggested_value"`
	SuggestionConfidence float64    `json:"suggestionConfidence" gorm:"column:suggestion_confidence"`
	ConflictRowID        string     `json:"conflictRowId" gorm:"column:conflict_row_id"`
	Status               string     `json:"status" gorm:"column:status"`
	ResolvedData         string     `json:"resolvedData" gorm:"column:resolved_data"`
	ResolvedAt           *time.Time `json:"resolvedAt,omitempty" gorm:"column:resolved_at"`
	CreatedAt            time.Time  `json:"createdAt" gorm:"column:created_at"`
	UpdatedAt            time.Time  `json:"updatedAt" gorm:"column:updated_at"`
}

func (PendingImportRow) TableName() string { return "pending_import_rows" }

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
