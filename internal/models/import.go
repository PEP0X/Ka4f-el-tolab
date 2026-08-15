package models

// ImportIssue is an actionable validation, review, or duplicate message.
type ImportIssue struct {
	Kind    string `json:"kind"`
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ImportRow is one editable source row. Student contains the normalized values.
type ImportRow struct {
	ID                   string        `json:"id"`
	Sheet                string        `json:"sheet"`
	RowNumber            int           `json:"rowNumber"`
	Student              Student       `json:"student"`
	Status               string        `json:"status"`
	Issues               []ImportIssue `json:"issues"`
	RawGrade             string        `json:"rawGrade"`
	GradeSuggestion      string        `json:"gradeSuggestion"`
	SuggestionConfidence float64       `json:"suggestionConfidence"`
	GroupKey             string        `json:"groupKey"`
	DuplicateOf          string        `json:"duplicateOf"`
	Existing             *Student      `json:"existing,omitempty"`
}

// ImportSheet describes one recognized sheet in the workbook.
type ImportSheet struct {
	Name      string `json:"name"`
	Stage     string `json:"stage"`
	RowsFound int    `json:"rowsFound"`
	Warning   string `json:"warning,omitempty"`
}

// ImportPreview is the in-memory review result; creating it never writes to SQLite.
type ImportPreview struct {
	SessionID      string        `json:"sessionId"`
	SourceFilename string        `json:"sourceFilename"`
	Sheets         []ImportSheet `json:"sheets"`
	Rows           []ImportRow   `json:"rows"`
	Ready          int           `json:"ready"`
	Review         int           `json:"review"`
	Errors         int           `json:"errors"`
	Duplicate      int           `json:"duplicate"`
	New            int           `json:"new"`
	Updates        int           `json:"updates"`
}

// Recalculate recomputes the summary counters from the current row statuses.
func (p *ImportPreview) Recalculate() {
	p.Ready, p.Review, p.Errors, p.Duplicate, p.New, p.Updates = 0, 0, 0, 0, 0, 0
	for _, row := range p.Rows {
		if row.Existing == nil && (row.Status == "ready" || row.Status == "review") {
			p.New++
		}
		switch row.Status {
		case "ready":
			p.Ready++
		case "review":
			p.Review++
		case "error":
			p.Errors++
		case "duplicate", "fuzzy_duplicate":
			p.Duplicate++
		case "update":
			p.Updates++
		}
	}
}

// CommitPreviewResult is the unified response when committing an Excel preview.
type CommitPreviewResult struct {
	Session     ImportSession     `json:"session"`
	BatchResult ImportBatchResult `json:"batchResult"`
}
