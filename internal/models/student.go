package models

import "time"

// Student represents a student in the church service database.
type Student struct {
	ID                  string    `json:"id" gorm:"primaryKey;column:id"`
	FullName            string    `json:"fullName" gorm:"column:full_name"`
	NationalID          string    `json:"nationalId" gorm:"column:national_id"`
	Gender              string    `json:"gender" gorm:"column:gender"`
	BirthDate           string    `json:"birthDate" gorm:"column:birth_date"`
	Governorate         string    `json:"governorate" gorm:"column:governorate"`
	Phone               string    `json:"phone" gorm:"column:phone"`
	ParentPhone         string    `json:"parentPhone" gorm:"column:parent_phone"`
	Address             string    `json:"address" gorm:"column:address"`
	Stage               string    `json:"stage" gorm:"column:stage"`
	Grade               string    `json:"grade" gorm:"column:grade"`
	Track               string    `json:"track" gorm:"column:track"`
	UniversityName      string    `json:"universityName" gorm:"column:university_name"`
	Faculty             string    `json:"faculty" gorm:"column:faculty"`
	StudyYears          string    `json:"studyYears" gorm:"column:study_years"`
	UniversityYear      string    `json:"universityYear" gorm:"column:university_year"`
	CathedralStudentID  string    `json:"cathedralStudentId" gorm:"column:cathedral_student_id"`
	CathedralFamilyID   string    `json:"cathedralFamilyId" gorm:"column:cathedral_family_id"`
	AlexandriaStudentID string    `json:"alexandriaStudentId" gorm:"column:alexandria_student_id"`
	AlexandriaFamilyID  string    `json:"alexandriaFamilyId" gorm:"column:alexandria_family_id"`
	PhotoPath           string    `json:"photoPath" gorm:"column:photo_path"`
	DeaconStatus        bool      `json:"deaconStatus" gorm:"column:deacon_status"`
	Notes               string    `json:"notes" gorm:"column:notes"`
	CreatedAt           time.Time `json:"createdAt" gorm:"column:created_at"`
	UpdatedAt           time.Time `json:"updatedAt" gorm:"column:updated_at"`
}

func (Student) TableName() string { return "students" }

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
	Key   string `json:"key" gorm:"primaryKey"`
	Value string `json:"value"`
}

func (ChurchSettings) TableName() string { return "church_settings" }

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
