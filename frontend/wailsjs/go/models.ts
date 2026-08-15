export namespace models {
	
	export class ImportBatchResult {
	    inserted: number;
	    updated: number;
	
	    static createFrom(source: any = {}) {
	        return new ImportBatchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.inserted = source["inserted"];
	        this.updated = source["updated"];
	    }
	}
	export class ImportSession {
	    id: string;
	    sourceFilename: string;
	    // Go type: time
	    createdAt: any;
	    totalRows: number;
	    importedCount: number;
	    initialPendingCount: number;
	    pendingCount: number;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new ImportSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.sourceFilename = source["sourceFilename"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.totalRows = source["totalRows"];
	        this.importedCount = source["importedCount"];
	        this.initialPendingCount = source["initialPendingCount"];
	        this.pendingCount = source["pendingCount"];
	        this.status = source["status"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CommitPreviewResult {
	    session: ImportSession;
	    batchResult: ImportBatchResult;
	
	    static createFrom(source: any = {}) {
	        return new CommitPreviewResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.session = this.convertValues(source["session"], ImportSession);
	        this.batchResult = this.convertValues(source["batchResult"], ImportBatchResult);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class ImportIssue {
	    kind: string;
	    field: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new ImportIssue(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.field = source["field"];
	        this.message = source["message"];
	    }
	}
	export class Student {
	    id: string;
	    fullName: string;
	    nationalId: string;
	    gender: string;
	    birthDate: string;
	    governorate: string;
	    phone: string;
	    parentPhone: string;
	    address: string;
	    stage: string;
	    grade: string;
	    track: string;
	    universityName: string;
	    faculty: string;
	    studyYears: string;
	    universityYear: string;
	    cathedralStudentId: string;
	    cathedralFamilyId: string;
	    alexandriaStudentId: string;
	    alexandriaFamilyId: string;
	    photoPath: string;
	    deaconStatus: boolean;
	    notes: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Student(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.fullName = source["fullName"];
	        this.nationalId = source["nationalId"];
	        this.gender = source["gender"];
	        this.birthDate = source["birthDate"];
	        this.governorate = source["governorate"];
	        this.phone = source["phone"];
	        this.parentPhone = source["parentPhone"];
	        this.address = source["address"];
	        this.stage = source["stage"];
	        this.grade = source["grade"];
	        this.track = source["track"];
	        this.universityName = source["universityName"];
	        this.faculty = source["faculty"];
	        this.studyYears = source["studyYears"];
	        this.universityYear = source["universityYear"];
	        this.cathedralStudentId = source["cathedralStudentId"];
	        this.cathedralFamilyId = source["cathedralFamilyId"];
	        this.alexandriaStudentId = source["alexandriaStudentId"];
	        this.alexandriaFamilyId = source["alexandriaFamilyId"];
	        this.photoPath = source["photoPath"];
	        this.deaconStatus = source["deaconStatus"];
	        this.notes = source["notes"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ImportRow {
	    id: string;
	    sheet: string;
	    rowNumber: number;
	    student: Student;
	    status: string;
	    issues: ImportIssue[];
	    rawGrade: string;
	    gradeSuggestion: string;
	    suggestionConfidence: number;
	    groupKey: string;
	    duplicateOf: string;
	    existing?: Student;
	
	    static createFrom(source: any = {}) {
	        return new ImportRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.sheet = source["sheet"];
	        this.rowNumber = source["rowNumber"];
	        this.student = this.convertValues(source["student"], Student);
	        this.status = source["status"];
	        this.issues = this.convertValues(source["issues"], ImportIssue);
	        this.rawGrade = source["rawGrade"];
	        this.gradeSuggestion = source["gradeSuggestion"];
	        this.suggestionConfidence = source["suggestionConfidence"];
	        this.groupKey = source["groupKey"];
	        this.duplicateOf = source["duplicateOf"];
	        this.existing = this.convertValues(source["existing"], Student);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ImportSheet {
	    name: string;
	    stage: string;
	    rowsFound: number;
	    warning?: string;
	
	    static createFrom(source: any = {}) {
	        return new ImportSheet(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.stage = source["stage"];
	        this.rowsFound = source["rowsFound"];
	        this.warning = source["warning"];
	    }
	}
	export class ImportPreview {
	    sessionId: string;
	    sourceFilename: string;
	    sheets: ImportSheet[];
	    rows: ImportRow[];
	    ready: number;
	    review: number;
	    errors: number;
	    duplicate: number;
	    new: number;
	    updates: number;
	
	    static createFrom(source: any = {}) {
	        return new ImportPreview(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessionId = source["sessionId"];
	        this.sourceFilename = source["sourceFilename"];
	        this.sheets = this.convertValues(source["sheets"], ImportSheet);
	        this.rows = this.convertValues(source["rows"], ImportRow);
	        this.ready = source["ready"];
	        this.review = source["review"];
	        this.errors = source["errors"];
	        this.duplicate = source["duplicate"];
	        this.new = source["new"];
	        this.updates = source["updates"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	export class NIDData {
	    nationalId: string;
	    valid: boolean;
	    birthDate: string;
	    gender: string;
	    governorate: string;
	    age: number;
	    error?: string;
	    checksumValid: boolean;
	    expectedChecksum: number;
	    ageMismatch: boolean;
	    stageWarning?: string;
	    suggestedId?: string;
	
	    static createFrom(source: any = {}) {
	        return new NIDData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.nationalId = source["nationalId"];
	        this.valid = source["valid"];
	        this.birthDate = source["birthDate"];
	        this.gender = source["gender"];
	        this.governorate = source["governorate"];
	        this.age = source["age"];
	        this.error = source["error"];
	        this.checksumValid = source["checksumValid"];
	        this.expectedChecksum = source["expectedChecksum"];
	        this.ageMismatch = source["ageMismatch"];
	        this.stageWarning = source["stageWarning"];
	        this.suggestedId = source["suggestedId"];
	    }
	}
	export class PendingImportRowView {
	    id: string;
	    sessionId: string;
	    stage: string;
	    issueType: string;
	    row: ImportRow;
	    groupKey: string;
	    rawGrade: string;
	    suggestedValue: string;
	    suggestionConfidence: number;
	    conflictRowId: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new PendingImportRowView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.sessionId = source["sessionId"];
	        this.stage = source["stage"];
	        this.issueType = source["issueType"];
	        this.row = this.convertValues(source["row"], ImportRow);
	        this.groupKey = source["groupKey"];
	        this.rawGrade = source["rawGrade"];
	        this.suggestedValue = source["suggestedValue"];
	        this.suggestionConfidence = source["suggestionConfidence"];
	        this.conflictRowId = source["conflictRowId"];
	        this.status = source["status"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PendingImportSummary {
	    sessions: ImportSession[];
	    pendingCount: number;
	
	    static createFrom(source: any = {}) {
	        return new PendingImportSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessions = this.convertValues(source["sessions"], ImportSession);
	        this.pendingCount = source["pendingCount"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class StudentValidation {
	    valid: boolean;
	    message?: string;
	    student: Student;
	
	    static createFrom(source: any = {}) {
	        return new StudentValidation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.valid = source["valid"];
	        this.message = source["message"];
	        this.student = this.convertValues(source["student"], Student);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

