package models

import "time"

// Student represents a student in the church service database.
type Student struct {
	ID                  string    `json:"id"`
	FamilyHead          string    `json:"familyHead"`
	FullName            string    `json:"fullName"`
	NationalID          string    `json:"nationalId"`
	Gender              string    `json:"gender"`
	BirthDate           string    `json:"birthDate"`
	Governorate         string    `json:"governorate"`
	Phone               string    `json:"phone"`
	ParentPhone         string    `json:"parentPhone"`
	Address             string    `json:"address"`
	Stage               string    `json:"stage"`
	Grade               string    `json:"grade"`
	SchoolName          string    `json:"schoolName"`
	Track               string    `json:"track"`
	UniversityName      string    `json:"universityName"`
	Faculty             string    `json:"faculty"`
	StudyYears          string    `json:"studyYears"`
	UniversityYear      string    `json:"universityYear"`
	ChurchFamilyID      string    `json:"churchFamilyId"`
	CathedralStudentID  string    `json:"cathedralStudentId"`
	CathedralFamilyID   string    `json:"cathedralFamilyId"`
	AlexandriaStudentID string    `json:"alexandriaStudentId"`
	AlexandriaFamilyID  string    `json:"alexandriaFamilyId"`
	PhotoPath           string    `json:"photoPath"`
	DeaconStatus        bool      `json:"deaconStatus"`
	Notes               string    `json:"notes"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

// ImportBatchResult describes the committed result of an Excel import.
type ImportBatchResult struct {
	Inserted int `json:"inserted"`
	Updated  int `json:"updated"`
}

// StageCount represents count per church educational stage.
type StageCount struct {
	Stage string `json:"stage"`
	Count int    `json:"count"`
}

// ChurchSettings stores key-value system configuration.
type ChurchSettings struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// NIDData represents parsed details from Egyptian National ID.
type NIDData struct {
	NationalID       string `json:"nationalId"`
	Valid            bool   `json:"valid"`
	BirthDate        string `json:"birthDate"`
	Gender           string `json:"gender"`
	Governorate      string `json:"governorate"`
	Age              int    `json:"age"`
	Error            string `json:"error,omitempty"`
	ChecksumValid    bool   `json:"checksumValid"`
	ExpectedChecksum int    `json:"expectedChecksum"`
	AgeMismatch      bool   `json:"ageMismatch"`
	StageWarning     string `json:"stageWarning,omitempty"`
	SuggestedID      string `json:"suggestedId,omitempty"`
}
