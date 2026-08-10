export namespace models {
	
	export class NIDData {
	    nationalId: string;
	    valid: boolean;
	    birthDate: string;
	    gender: string;
	    governorate: string;
	    age: number;
	    error?: string;
	
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

}

